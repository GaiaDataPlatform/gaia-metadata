from sqlalchemy import Column, Integer, String, Boolean, JSON, ForeignKey, Enum as SAEnum
from sqlalchemy import DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from ..database import Base

class TaskType(str, enum.Enum):
    point = "point"
    transect = "transect"

class InstrumentCategory(Base):
    __tablename__ = "instrument_categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    task_type = Column(SAEnum(TaskType), default=TaskType.point, nullable=False)
    extra_fields = Column(JSON, nullable=True)  # list of {name, label, type, required}
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    color = Column(String(7), default="#0099CC")
    icon = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    operations = relationship("OperationTemplate", back_populates="category",
                              order_by="OperationTemplate.sort_order", lazy="selectin",
                              cascade="all, delete-orphan")

class OperationTemplate(Base):
    __tablename__ = "operation_templates"
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("instrument_categories.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(50), nullable=False)
    display_name = Column(String(100), nullable=False)
    sort_order = Column(Integer, default=0)
    is_final = Column(Boolean, default=False)
    extra_fields = Column(JSON, nullable=True)  # list of {name, label, type, required}
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    category = relationship("InstrumentCategory", back_populates="operations")
