# Path: backend/app/schemas/cruise.py
from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import date
from typing import Optional
from ..models.cruise import CruiseStatus


def _empty_str_to_none(v):
    """Coerce empty strings to None so optional fields are truly optional."""
    if isinstance(v, str) and v.strip() == "":
        return None
    return v


class CruiseBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=32)
    name: str = Field(..., min_length=2, max_length=128)
    start_date: date
    end_date: date
    port_departure: Optional[str] = None
    port_arrival: Optional[str] = None
    chief_scientist: Optional[str] = None
    # Plain str on base/read — no validation on serialization (avoids 500 on dirty DB data)
    chief_scientist_email: Optional[str] = None
    num_participants: Optional[int] = None
    study_area: Optional[str] = None
    description: Optional[str] = None
    participants: Optional[list[dict]] = None

    @field_validator("port_departure", "port_arrival", "chief_scientist",
                     "chief_scientist_email", "study_area", "description",
                     mode="before")
    @classmethod
    def coerce_empty_to_none(cls, v):
        return _empty_str_to_none(v)


class CruiseCreate(CruiseBase):
    # EmailStr validates format — but only if not None (empty string → None above)
    chief_scientist_email: Optional[EmailStr] = None

    @field_validator("chief_scientist_email", mode="before")
    @classmethod
    def coerce_email(cls, v):
        return _empty_str_to_none(v)


class CruiseUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=2, max_length=32)
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    port_departure: Optional[str] = None
    port_arrival: Optional[str] = None
    chief_scientist: Optional[str] = None
    chief_scientist_email: Optional[EmailStr] = None
    num_participants: Optional[int] = None
    study_area: Optional[str] = None
    description: Optional[str] = None
    participants: Optional[list[dict]] = None
    status: Optional[CruiseStatus] = None

    @field_validator("port_departure", "port_arrival", "chief_scientist",
                     "chief_scientist_email", "study_area", "description",
                     mode="before")
    @classmethod
    def coerce_empty_to_none(cls, v):
        return _empty_str_to_none(v)


class CruiseRead(CruiseBase):
    id: int
    status: CruiseStatus

    model_config = {"from_attributes": True}

