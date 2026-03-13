from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
from ..models.instrument import TaskType

class ExtraFieldDef(BaseModel):
    name: str
    label: str
    type: str = "text"  # text, number, textarea
    required: bool = False
    unit: Optional[str] = None

class OperationTemplateBase(BaseModel):
    name: str
    display_name: str
    sort_order: int = 0
    is_final: bool = False
    extra_fields: Optional[List[ExtraFieldDef]] = None

class OperationTemplateCreate(OperationTemplateBase):
    pass

class OperationTemplateOut(OperationTemplateBase):
    id: int
    category_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class InstrumentCategoryBase(BaseModel):
    name: str
    display_name: str
    task_type: TaskType = TaskType.point
    extra_fields: Optional[List[ExtraFieldDef]] = None
    color: str = "#0099CC"
    icon: Optional[str] = None
    sort_order: int = 0

class InstrumentCategoryCreate(InstrumentCategoryBase):
    operations: Optional[List[OperationTemplateCreate]] = None

class InstrumentCategoryUpdate(BaseModel):
    display_name: Optional[str] = None
    task_type: Optional[TaskType] = None
    extra_fields: Optional[List[ExtraFieldDef]] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None

class InstrumentCategoryOut(InstrumentCategoryBase):
    id: int
    is_active: bool
    operations: List[OperationTemplateOut] = []
    created_at: datetime
    class Config:
        from_attributes = True
