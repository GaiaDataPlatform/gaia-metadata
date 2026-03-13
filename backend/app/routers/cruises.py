from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date
import io

from ..database import get_db
from ..models.cruise import Cruise, CruiseStatus
from ..schemas.cruise import CruiseCreate, CruiseRead, CruiseUpdate
from ..core.auth import require_role, get_current_user
from ..models.user import User, UserRole
from ..services.export import cruise_to_json, tasks_to_csv

router = APIRouter(prefix="/cruises", tags=["cruises"])


@router.get("/", response_model=list[CruiseRead])
async def list_cruises(db: AsyncSession = Depends(get_db),
                       _=Depends(get_current_user)):
    result = await db.execute(select(Cruise).order_by(Cruise.start_date.desc()))
    return result.scalars().all()


@router.get("/active", response_model=CruiseRead | None)
async def get_active_cruise(db: AsyncSession = Depends(get_db),
                             _=Depends(get_current_user)):
    """
    Returns the active cruise. Priority:
    1. A cruise manually set to status=active
    2. A planned cruise whose date range includes today (auto-activation)
    """
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
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(cruise, k, v)
    await db.commit()
    await db.refresh(cruise)
    return cruise


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
    content = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(_io.StringIO(content))
    created, skipped = 0, 0
    for row in reader:
        code = row.get("code", "").strip()
        if not code:
            continue
        existing = await db.execute(select(Cruise).where(Cruise.code == code))
        if existing.scalar_one_or_none():
            skipped += 1
            continue
        def pd(v):
            v = v.strip() if v else ""
            return date.fromisoformat(v) if v else None
        cruise = Cruise(
            code=code,
            name=row.get("name", "").strip() or code,
            start_date=pd(row.get("start_date")),
            end_date=pd(row.get("end_date")),
            port_departure=row.get("port_departure", "").strip() or None,
            port_arrival=row.get("port_arrival", "").strip() or None,
            chief_scientist=row.get("chief_scientist", "").strip() or None,
            chief_scientist_email=row.get("chief_scientist_email", "").strip() or None,
        )
        db.add(cruise)
        created += 1
    await db.commit()
    return {"created": created, "skipped": skipped}


@router.get("/{cruise_id}/export/csv")
async def export_tasks_csv(cruise_id: int, db: AsyncSession = Depends(get_db),
                            _=Depends(get_current_user)):
    result = await db.execute(select(Cruise).where(Cruise.id == cruise_id))
    cruise = result.scalar_one_or_none()
    if not cruise:
        raise HTTPException(status_code=404, detail="Cruise not found")
    content = await tasks_to_csv(db, cruise_id)
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
    content = await cruise_to_json(db, cruise)
    return StreamingResponse(
        io.StringIO(content),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={cruise.code}.json"}
    )
