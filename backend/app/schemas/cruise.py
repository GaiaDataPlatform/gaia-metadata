from pydantic import BaseModel, EmailStr, Field
from datetime import date
from typing import Optional
from ..models.cruise import CruiseStatus


class CruiseBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=32)
    name: str = Field(..., min_length=2, max_length=128)
    start_date: date
    end_date: date
    port_departure: Optional[str] = None
    port_arrival: Optional[str] = None
    chief_scientist: Optional[str] = None
    # Plain str here — no validation on READ/serialization (avoids 500 on dirty DB data)
    chief_scientist_email: Optional[str] = None
    num_participants: Optional[int] = None
    study_area: Optional[str] = None
    description: Optional[str] = None
    participants: Optional[list[dict]] = None


class CruiseCreate(CruiseBase):
    # Override with EmailStr only on CREATE — validates new input
    chief_scientist_email: Optional[EmailStr] = None


class CruiseUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    port_departure: Optional[str] = None
    port_arrival: Optional[str] = None
    chief_scientist: Optional[str] = None
    # Override with EmailStr only on UPDATE — validates new input
    chief_scientist_email: Optional[EmailStr] = None
    num_participants: Optional[int] = None
    study_area: Optional[str] = None
    description: Optional[str] = None
    participants: Optional[list[dict]] = None
    status: Optional[CruiseStatus] = None


class CruiseRead(CruiseBase):
    id: int
    status: CruiseStatus
    # Inherits chief_scientist_email: Optional[str] — no validation, safe for any DB value

    model_config = {"from_attributes": True}
