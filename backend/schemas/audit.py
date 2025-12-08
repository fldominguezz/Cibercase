from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class AuditLogBase(BaseModel):
    entidad: str
    entidad_id: Optional[int]
    accion: str
    detalle: Optional[str] = None
    timestamp: Optional[datetime] = None # Make timestamp optional and remove json_encoders
    actor_id: Optional[int] = None

    class Config:
        orm_mode = True

class AuditLogInDB(AuditLogBase):
    id: int
    class Config:
        orm_mode = True

class AuditLog(AuditLogInDB):
    actor_name: Optional[str] = None
    class Config:
        orm_mode = True

