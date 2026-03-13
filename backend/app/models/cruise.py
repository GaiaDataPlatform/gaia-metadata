from sqlalchemy import Column, Integer, String, DateTime, Date, Text, JSON, ForeignKey, Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from ..database import Base

class CruiseStatus(str, enum.Enum):
    planned = "planned"
    active = "active"
    completed = "completed"

class Cruise(Base):
    __tablename__ = "cruises"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    status = Column(SAEnum(CruiseStatus), default=CruiseStatus.planned, nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    port_departure = Column(String(100), nullable=True)
    port_arrival = Column(String(100), nullable=True)
    chief_scientist = Column(String(100), nullable=True)
    chief_scientist_email = Column(String(100), nullable=True)
    # SeaDataNet CSR fields
    description = Column(Text, nullable=True)
    study_area = Column(String(200), nullable=True)
    num_participants = Column(Integer, nullable=True)
    participants = Column(JSON, nullable=True)  # [{name, institution, role}]
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    tasks = relationship("Task", back_populates="cruise", lazy="selectin")
