from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime, timezone
from ..database import get_db
from ..models.task import Task, TaskOperation, TaskStatus
from ..models.cruise import Cruise, CruiseStatus
from ..models.instrument import InstrumentCategory, OperationTemplate
from ..schemas.task import TaskCreate, TaskOut, TaskOperationCreate, TaskOperationOut, TaskAbort
from ..core.auth import get_current_user
from ..models.user import User
from ..services.nmea import build_pgbev, send_nmea
from ..services.position import get_live_position

router = APIRouter(prefix="/tasks", tags=["tasks"])

async def _load_task(db, task_id):
    result = await db.execute(
        select(Task).where(Task.id == task_id)
        .options(selectinload(Task.cruise), selectinload(Task.category),
                 selectinload(Task.operations).selectinload(TaskOperation.operation_template))
    )
    return result.scalar_one_or_none()

@router.get("/cruise/{cruise_id}", response_model=List[TaskOut])
async def list_tasks(cruise_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(
        select(Task).where(Task.cruise_id == cruise_id)
        .options(selectinload(Task.category),
                 selectinload(Task.operations).selectinload(TaskOperation.operation_template))
        .order_by(Task.started_at.desc())
    )
    return result.scalars().all()

@router.get("/cruise/{cruise_id}/active", response_model=List[TaskOut])
async def list_active_tasks(cruise_id: int, db: AsyncSession = Depends(get_db),
                             _=Depends(get_current_user)):
    result = await db.execute(
        select(Task).where(Task.cruise_id == cruise_id, Task.status == TaskStatus.active)
        .options(selectinload(Task.category),
                 selectinload(Task.operations).selectinload(TaskOperation.operation_template))
        .order_by(Task.started_at)
    )
    return result.scalars().all()

@router.post("/", response_model=TaskOut, status_code=201)
async def start_task(payload: TaskCreate, db: AsyncSession = Depends(get_db),
                     current: User = Depends(get_current_user)):
    # Validate cruise
    cruise_result = await db.execute(select(Cruise).where(Cruise.id == payload.cruise_id))
    cruise = cruise_result.scalar_one_or_none()
    if not cruise:
        raise HTTPException(404, "Campagna non trovata")
    if cruise.status != CruiseStatus.active:
        raise HTTPException(400, "La campagna non è attiva")

    # Validate category
    cat_result = await db.execute(
        select(InstrumentCategory).where(InstrumentCategory.id == payload.category_id)
    )
    cat = cat_result.scalar_one_or_none()
    if not cat:
        raise HTTPException(404, "Strumento non trovato")

    # Auto-fetch position if not provided
    lat, lon = payload.lat_start, payload.lon_start
    if lat is None or lon is None:
        lat, lon = await get_live_position()

    task = Task(
        cruise_id=payload.cruise_id,
        category_id=payload.category_id,
        lat_start=lat, lon_start=lon,
        extra_data=payload.extra_data,
        notes=payload.notes,
        created_by=current.username,
        status=TaskStatus.active
    )
    db.add(task)
    await db.flush()

    # Send START NMEA
    sentence = build_pgbev(
        cruise=cruise.code, type_=cat.name, task="TASK",
        event="START", operator=current.username
    )
    sent = send_nmea(sentence)

    await db.commit()
    return await _load_task(db, task.id)

@router.post("/{task_id}/operations", response_model=TaskOut)
async def add_operation(task_id: int, payload: TaskOperationCreate,
                         db: AsyncSession = Depends(get_db),
                         current: User = Depends(get_current_user)):
    task = await _load_task(db, task_id)
    if not task:
        raise HTTPException(404, "Task non trovato")
    if task.status != TaskStatus.active:
        raise HTTPException(400, "Il task non è attivo")

    # Validate operation belongs to task category
    op_result = await db.execute(
        select(OperationTemplate).where(
            OperationTemplate.id == payload.operation_template_id,
            OperationTemplate.category_id == task.category_id
        )
    )
    op_template = op_result.scalar_one_or_none()
    if not op_template:
        raise HTTPException(404, "Operazione non valida per questo strumento")

    # Auto-fetch position
    lat, lon = payload.lat, payload.lon
    if lat is None or lon is None:
        lat, lon = await get_live_position()

    # Build NMEA sentence
    sentence = build_pgbev(
        cruise=task.cruise.code,
        type_=task.category.name,
        task=op_template.name,
        event=op_template.name,
        operator=current.username
    )
    sent = send_nmea(sentence)

    op = TaskOperation(
        task_id=task_id,
        operation_template_id=payload.operation_template_id,
        lat=lat, lon=lon,
        extra_data=payload.extra_data,
        operator=current.username,
        nmea_sentence=sentence,
        nmea_sent=sent,
        event_time=datetime.now(timezone.utc)
    )
    db.add(op)

    # Auto-close task if this is the final operation
    if op_template.is_final:
        task.status = TaskStatus.completed
        task.ended_at = datetime.now(timezone.utc)
        if task.category.task_type == "transect":
            task.lat_end = lat
            task.lon_end = lon
        # Send END NMEA
        end_sentence = build_pgbev(
            cruise=task.cruise.code, type_=task.category.name,
            task="TASK", event="END", operator=current.username
        )
        send_nmea(end_sentence)

    await db.commit()
    return await _load_task(db, task_id)

@router.post("/{task_id}/abort", response_model=TaskOut)
async def abort_task(task_id: int, payload: TaskAbort = TaskAbort(),
                      db: AsyncSession = Depends(get_db),
                      current: User = Depends(get_current_user)):
    task = await _load_task(db, task_id)
    if not task:
        raise HTTPException(404, "Task non trovato")
    if task.status != TaskStatus.active:
        raise HTTPException(400, "Il task non è attivo")

    task.status = TaskStatus.aborted
    task.ended_at = datetime.now(timezone.utc)
    if payload.notes:
        task.notes = (task.notes or "") + f" [ABORT: {payload.notes}]"

    # Send ABORT NMEA
    sentence = build_pgbev(
        cruise=task.cruise.code, type_=task.category.name,
        task="TASK", event="ABORT", operator=current.username
    )
    send_nmea(sentence)

    await db.commit()
    return await _load_task(db, task_id)

@router.get("/{task_id}", response_model=TaskOut)
async def get_task(task_id: int, db: AsyncSession = Depends(get_db),
                   _=Depends(get_current_user)):
    task = await _load_task(db, task_id)
    if not task:
        raise HTTPException(404, "Task non trovato")
    return task
