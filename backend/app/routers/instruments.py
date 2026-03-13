from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from ..database import get_db
from ..models.instrument import InstrumentCategory, OperationTemplate
from ..schemas.instrument import (
    InstrumentCategoryCreate, InstrumentCategoryUpdate, InstrumentCategoryOut,
    OperationTemplateCreate, OperationTemplateOut
)
from ..core.auth import get_current_user, require_admin

router = APIRouter(prefix="/instruments", tags=["instruments"])

@router.get("/", response_model=List[InstrumentCategoryOut])
async def list_instruments(db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(
        select(InstrumentCategory).where(InstrumentCategory.is_active == True)
        .order_by(InstrumentCategory.sort_order, InstrumentCategory.name)
    )
    return result.scalars().all()

@router.get("/all", response_model=List[InstrumentCategoryOut])
async def list_all_instruments(db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(
        select(InstrumentCategory).order_by(InstrumentCategory.sort_order, InstrumentCategory.name)
    )
    return result.scalars().all()

@router.get("/{cat_id}", response_model=InstrumentCategoryOut)
async def get_instrument(cat_id: int, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    result = await db.execute(select(InstrumentCategory).where(InstrumentCategory.id == cat_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(404, "Strumento non trovato")
    return cat

@router.post("/", response_model=InstrumentCategoryOut, status_code=201)
async def create_instrument(payload: InstrumentCategoryCreate,
                             db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    exists = await db.execute(select(InstrumentCategory).where(InstrumentCategory.name == payload.name))
    if exists.scalar_one_or_none():
        raise HTTPException(400, f"Strumento {payload.name!r} già esistente")
    ops = payload.operations or []
    cat_data = payload.model_dump(exclude={"operations"})
    cat = InstrumentCategory(**cat_data)
    db.add(cat)
    await db.flush()
    for op in ops:
        db.add(OperationTemplate(category_id=cat.id, **op.model_dump()))
    await db.commit()
    await db.refresh(cat)
    return cat

@router.patch("/{cat_id}", response_model=InstrumentCategoryOut)
async def update_instrument(cat_id: int, payload: InstrumentCategoryUpdate,
                             db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(select(InstrumentCategory).where(InstrumentCategory.id == cat_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(404, "Strumento non trovato")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(cat, field, val)
    await db.commit()
    await db.refresh(cat)
    return cat

@router.delete("/{cat_id}", status_code=204)
async def delete_instrument(cat_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(select(InstrumentCategory).where(InstrumentCategory.id == cat_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(404, "Strumento non trovato")
    await db.delete(cat)
    await db.commit()

# -- Operations --
@router.post("/{cat_id}/operations", response_model=OperationTemplateOut, status_code=201)
async def add_operation(cat_id: int, payload: OperationTemplateCreate,
                         db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(select(InstrumentCategory).where(InstrumentCategory.id == cat_id))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Strumento non trovato")
    op = OperationTemplate(category_id=cat_id, **payload.model_dump())
    db.add(op)
    await db.commit()
    await db.refresh(op)
    return op

@router.patch("/{cat_id}/operations/{op_id}", response_model=OperationTemplateOut)
async def update_operation(cat_id: int, op_id: int, payload: OperationTemplateCreate,
                            db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(
        select(OperationTemplate).where(OperationTemplate.id == op_id, OperationTemplate.category_id == cat_id)
    )
    op = result.scalar_one_or_none()
    if not op:
        raise HTTPException(404, "Operazione non trovata")
    for field, val in payload.model_dump().items():
        setattr(op, field, val)
    await db.commit()
    await db.refresh(op)
    return op

@router.delete("/{cat_id}/operations/{op_id}", status_code=204)
async def delete_operation(cat_id: int, op_id: int, db: AsyncSession = Depends(get_db),
                            _=Depends(require_admin)):
    result = await db.execute(
        select(OperationTemplate).where(OperationTemplate.id == op_id, OperationTemplate.category_id == cat_id)
    )
    op = result.scalar_one_or_none()
    if not op:
        raise HTTPException(404, "Operazione non trovata")
    await db.delete(op)
    await db.commit()
