from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey, Enum as SAEnum, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from ..database import Base

class TaskStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    aborted = "aborted"

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    cruise_id = Column(Integer, ForeignKey("cruises.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("instrument_categories.id"), nullable=False)
    status = Column(SAEnum(TaskStatus), default=TaskStatus.active, nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    lat_start = Column(Float, nullable=True)
    lon_start = Column(Float, nullable=True)
    lat_end = Column(Float, nullable=True)
    lon_end = Column(Float, nullable=True)
    extra_data = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(String(50), nullable=True)
    cruise = relationship("Cruise", back_populates="tasks")
    category = relationship("InstrumentCategory", lazy="selectin")
    operations = relationship("TaskOperation", back_populates="task",
                              order_by="TaskOperation.created_at", lazy="selectin",
                              cascade="all, delete-orphan")

class TaskOperation(Base):
    __tablename__ = "task_operations"
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    operation_template_id = Column(Integer, ForeignKey("operation_templates.id"), nullable=False)
    event_time = Column(DateTime(timezone=True), server_default=func.now())
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    extra_data = Column(JSON, nullable=True)
    operator = Column(String(50), nullable=True)
    nmea_sentence = Column(String(250), nullable=True)
    nmea_sent = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    task = relationship("Task", back_populates="operations")
    operation_template = relationship("OperationTemplate", lazy="selectin")
