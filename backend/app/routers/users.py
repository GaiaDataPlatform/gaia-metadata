from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from ..database import get_db
from ..models.user import User
from ..schemas.user import UserCreate, UserUpdate, UserOut
from ..core.auth import get_password_hash, require_admin, get_current_user

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=List[UserOut])
async def list_users(db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(select(User).order_by(User.username))
    return result.scalars().all()

@router.post("/", response_model=UserOut, status_code=201)
async def create_user(payload: UserCreate, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    exists = await db.execute(select(User).where(User.username == payload.username))
    if exists.scalar_one_or_none():
        raise HTTPException(400, "Username già esistente")
    user = User(
        username=payload.username, email=payload.email, full_name=payload.full_name,
        role=payload.role, hashed_password=get_password_hash(payload.password)
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.patch("/{user_id}", response_model=UserOut)
async def update_user(user_id: int, payload: UserUpdate, db: AsyncSession = Depends(get_db),
                      current=Depends(require_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Utente non trovato")
    for field, val in payload.model_dump(exclude_none=True).items():
        if field == "password":
            setattr(user, "hashed_password", get_password_hash(val))
        else:
            setattr(user, field, val)
    await db.commit()
    await db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db), current=Depends(require_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Utente non trovato")
    await db.delete(user)
    await db.commit()
