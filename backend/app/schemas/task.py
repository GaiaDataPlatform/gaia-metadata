from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime
from ..models.task import TaskStatus
from .instrument import InstrumentCategoryOut, OperationTemplateOut

class TaskOperationCreate(BaseModel):
    operation_template_id: int
    lat: Optional[float] = None
    lon: Optional[float] = None
    extra_data: Optional[Dict[str, Any]] = None

class TaskOperationOut(BaseModel):
    id: int
    task_id: int
    operation_template_id: int
    operation_template: OperationTemplateOut
    event_time: datetime
    lat: Optional[float] = None
    lon: Optional[float] = None
    extra_data: Optional[Dict[str, Any]] = None
    operator: Optional[str] = None
    nmea_sentence: Optional[str] = None
    nmea_sent: bool
    created_at: datetime
    class Config:
        from_attributes = True

class TaskCreate(BaseModel):
    cruise_id: int
    category_id: int
    lat_start: Optional[float] = None
    lon_start: Optional[float] = None
    extra_data: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

class TaskAbort(BaseModel):
    notes: Optional[str] = None

class TaskOut(BaseModel):
    id: int
    cruise_id: int
    category_id: int
    category: InstrumentCategoryOut
    status: TaskStatus
    started_at: datetime
    ended_at: Optional[datetime] = None
    lat_start: Optional[float] = None
    lon_start: Optional[float] = None
    lat_end: Optional[float] = None
    lon_end: Optional[float] = None
    extra_data: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    created_by: Optional[str] = None
    operations: List[TaskOperationOut] = []
    class Config:
        from_attributes = True
