from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import date
import io, json

from ..database import get_db
from ..models.cruise import Cruise, CruiseStatus
from ..models.task import Task, TaskOperation
from ..schemas.cruise import CruiseCreate, CruiseRead, CruiseUpdate
from ..core.auth import require_role, get_current_user
from ..models.user import User, UserRole
from ..services.export import cruise_to_json, tasks_to_csv

router = APIRouter(prefix="/cruises", tags=["cruises"])


async def _load_tasks_for_export(db: AsyncSession, cruise_id: int):
    """Load tasks with all relationships needed by export functions."""
    result = await db.execute(
        select(Task)
        .where(Task.cruise_id == cruise_id)
        .options(
            selectinload(Task.cruise),
            selectinload(Task.category),
            selectinload(Task.operations).selectinload(TaskOperation.operation_template),
        )
        .order_by(Task.started_at)
    )
    return result.scalars().all()


@router.get("/", response_model=list[CruiseRead])
async def list_cruises(db: AsyncSession = Depends(get_db),
                       _=Depends(get_current_user)):
    result = await db.execute(select(Cruise).order_by(Cruise.start_date.asc()))
    return result.scalars().all()


@router.get("/active", response_model=CruiseRead | None)
async def get_active_cruise(db: AsyncSession = Depends(get_db),
                             _=Depends(get_current_user)):
    # 1. Explicitly active
    result = await db.execute(
        select(Cruise).where(Cruise.status == CruiseStatus.active).limit(1)
    )
    cruise = result.scalar_one_or_none()
    if cruise:
        return cruise

    # 2. Auto-activate by date
    today = date.today()
    result = await db.execute(
        select(Cruise).where(
            Cruise.status == CruiseStatus.planned,
            Cruise.start_date <= today,
            Cruise.end_date >= today
        ).order_by(Cruise.start_date.desc()).limit(1)
    )
    cruise = result.scalar_one_or_none()
    if cruise:
        cruise.status = CruiseStatus.active
        await db.commit()
        await db.refresh(cruise)
        return cruise

    return None


@router.post("/", response_model=CruiseRead, status_code=status.HTTP_201_CREATED)
async def create_cruise(payload: CruiseCreate, db: AsyncSession = Depends(get_db),
                        current_user: User = Depends(require_role(UserRole.admin, UserRole.capo_missione))):
    existing = await db.execute(select(Cruise).where(Cruise.code == payload.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Cruise code '{payload.code}' already exists")
    cruise = Cruise(**payload.model_dump())
    db.add(cruise)
    await db.commit()
    await db.refresh(cruise)
    return cruise


@router.get("/{cruise_id}", response_model=CruiseRead)
async def get_cruise(cruise_id: int, db: AsyncSession = Depends(get_db),
                     _=Depends(get_current_user)):
    result = await db.execute(select(Cruise).where(Cruise.id == cruise_id))
    cruise = result.scalar_one_or_none()
    if not cruise:
        raise HTTPException(status_code=404, detail="Cruise not found")
    return cruise


@router.patch("/{cruise_id}", response_model=CruiseRead)
async def update_cruise(cruise_id: int, payload: CruiseUpdate,
                        db: AsyncSession = Depends(get_db),
                        current_user: User = Depends(require_role(UserRole.admin, UserRole.capo_missione))):
    result = await db.execute(select(Cruise).where(Cruise.id == cruise_id))
    cruise = result.scalar_one_or_none()
    if not cruise:
        raise HTTPException(status_code=404, detail="Cruise not found")
    data = payload.model_dump(exclude_unset=True)
    # If code is being changed, check uniqueness
    if "code" in data and data["code"] != cruise.code:
        dup = await db.execute(select(Cruise).where(Cruise.code == data["code"]))
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=409, detail=f"Cruise code '{data['code']}' already exists")
    for k, v in data.items():
        setattr(cruise, k, v)
    await db.commit()
    await db.refresh(cruise)
    return cruise


@router.delete("/{cruise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cruise(cruise_id: int, db: AsyncSession = Depends(get_db),
                        current_user: User = Depends(require_role(UserRole.admin))):
    result = await db.execute(select(Cruise).where(Cruise.id == cruise_id))
    cruise = result.scalar_one_or_none()
    if not cruise:
        raise HTTPException(status_code=404, detail="Cruise not found")
    if cruise.status == CruiseStatus.active:
        raise HTTPException(status_code=400, detail="Cannot delete an active cruise. Complete it first.")
    await db.delete(cruise)
    await db.commit()


@router.post("/{cruise_id}/activate", response_model=CruiseRead)
async def activate_cruise(cruise_id: int, db: AsyncSession = Depends(get_db),
                           current_user: User = Depends(require_role(UserRole.admin, UserRole.capo_missione))):
    active = await db.execute(select(Cruise).where(Cruise.status == CruiseStatus.active))
    if active.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Another cruise is already active. Complete it first.")
    result = await db.execute(select(Cruise).where(Cruise.id == cruise_id))
    cruise = result.scalar_one_or_none()
    if not cruise:
        raise HTTPException(status_code=404, detail="Cruise not found")
    cruise.status = CruiseStatus.active
    await db.commit()
    await db.refresh(cruise)
    return cruise


@router.post("/{cruise_id}/complete", response_model=CruiseRead)
async def complete_cruise(cruise_id: int, db: AsyncSession = Depends(get_db),
                           current_user: User = Depends(require_role(UserRole.admin, UserRole.capo_missione))):
    result = await db.execute(select(Cruise).where(Cruise.id == cruise_id))
    cruise = result.scalar_one_or_none()
    if not cruise:
        raise HTTPException(status_code=404, detail="Cruise not found")
    if cruise.status != CruiseStatus.active:
        raise HTTPException(status_code=400, detail="Only active cruises can be completed")
    cruise.status = CruiseStatus.completed
    await db.commit()
    await db.refresh(cruise)
    return cruise


@router.post("/import/csv", status_code=status.HTTP_201_CREATED)
async def import_cruises_csv(file: UploadFile = File(...),
                              db: AsyncSession = Depends(get_db),
                              current_user: User = Depends(require_role(UserRole.admin))):
    import csv, io as _io
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv")
    try:
        content = (await file.read()).decode("utf-8-sig")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read file — check encoding (UTF-8 expected)")

    reader = csv.DictReader(_io.StringIO(content))
    required_cols = {"code", "name", "start_date", "end_date"}
    if reader.fieldnames is None or not required_cols.issubset(set(reader.fieldnames)):
        missing = required_cols - set(reader.fieldnames or [])
        raise HTTPException(status_code=422,
                            detail=f"Missing required CSV columns: {', '.join(sorted(missing))}")

    created, skipped, errors = 0, 0, []

    def parse_date(v: str, col: str, row_num: int):
        v = v.strip() if v else ""
        if not v:
            raise ValueError(f"Row {row_num}: '{col}' is empty")
        try:
            return date.fromisoformat(v)
        except ValueError:
            raise ValueError(f"Row {row_num}: '{col}' = '{v}' is not a valid date (expected YYYY-MM-DD)")

    for row_num, row in enumerate(reader, start=2):
        code = row.get("code", "").strip()
        if not code:
            errors.append(f"Row {row_num}: empty code, skipped")
            skipped += 1
            continue
        try:
            start_date = parse_date(row.get("start_date", ""), "start_date", row_num)
            end_date   = parse_date(row.get("end_date",   ""), "end_date",   row_num)
        except ValueError as e:
            errors.append(str(e))
            skipped += 1
            continue

        existing = await db.execute(select(Cruise).where(Cruise.code == code))
        if existing.scalar_one_or_none():
            errors.append(f"Row {row_num}: code '{code}' already exists, skipped")
            skipped += 1
            continue

        cruise = Cruise(
            code=code,
            name=row.get("name", "").strip() or code,
            start_date=start_date,
            end_date=end_date,
            port_departure=row.get("port_departure", "").strip() or None,
            port_arrival=row.get("port_arrival", "").strip() or None,
            chief_scientist=row.get("chief_scientist", "").strip() or None,
            chief_scientist_email=row.get("chief_scientist_email", "").strip() or None,
        )
        db.add(cruise)
        created += 1

    await db.commit()

    response = {"created": created, "skipped": skipped}
    if errors:
        response["errors"] = errors
    # If nothing was created and there are errors, return 422 so the frontend can show them
    if created == 0 and errors:
        raise HTTPException(status_code=422, detail={"created": 0, "skipped": skipped, "errors": errors})
    return response


@router.get("/{cruise_id}/export/csv")
async def export_tasks_csv(cruise_id: int, db: AsyncSession = Depends(get_db),
                            _=Depends(get_current_user)):
    result = await db.execute(select(Cruise).where(Cruise.id == cruise_id))
    cruise = result.scalar_one_or_none()
    if not cruise:
        raise HTTPException(status_code=404, detail="Cruise not found")
    tasks = await _load_tasks_for_export(db, cruise_id)
    content = tasks_to_csv(tasks)
    return StreamingResponse(
        io.StringIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={cruise.code}_tasks.csv"}
    )


@router.get("/{cruise_id}/export/json")
async def export_cruise_json(cruise_id: int, db: AsyncSession = Depends(get_db),
                              _=Depends(get_current_user)):
    result = await db.execute(select(Cruise).where(Cruise.id == cruise_id))
    cruise = result.scalar_one_or_none()
    if not cruise:
        raise HTTPException(status_code=404, detail="Cruise not found")
    tasks = await _load_tasks_for_export(db, cruise_id)
    data = cruise_to_json(cruise, tasks)
    content = json.dumps(data, indent=2, ensure_ascii=False)
    return StreamingResponse(
        io.StringIO(content),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={cruise.code}.json"}
    )
