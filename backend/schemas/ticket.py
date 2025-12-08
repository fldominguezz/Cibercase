from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
import pytz

# Define UTC timezone
UTC_TIMEZONE = pytz.utc

# Custom datetime encoder for Pydantic models to ensure UTC with 'Z' suffix
def convert_to_utc_iso_z(dt: datetime) -> str:
    if dt.tzinfo is None: # Naive datetime, assume it's already UTC
        utc_dt = pytz.utc.localize(dt)
    else:
        utc_dt = dt.astimezone(pytz.utc)
    return utc_dt.isoformat(timespec='microseconds').replace('+00:00', 'Z')


class TicketBase(BaseModel):
    estado: str
    severidad: str
    resumen: str
    descripcion: Optional[str] = None
    impacto: Optional[str] = None
    causa_raiz: Optional[str] = None
    reportado_por_id: Optional[int] = None
    asignado_a_id: Optional[int] = None
    sla_vencimiento: Optional[datetime] = None
    categoria: Optional[str] = None
    platform: Optional[str] = None
    resolucion: Optional[str] = None
    rule_name: Optional[str] = None
    rule_description: Optional[str] = None
    rule_remediation: Optional[str] = None
    raw_logs: Optional[str] = None
    creado_en: Optional[datetime] = None # Add creado_en here

class TicketCreate(TicketBase):
    pass

class TicketUpdate(BaseModel):
    estado: Optional[str] = None
    severidad: Optional[str] = None
    resumen: Optional[str] = None
    descripcion: Optional[str] = None
    impacto: Optional[str] = None
    causa_raiz: Optional[str] = None
    reportado_por_id: Optional[int] = None
    asignado_a_id: Optional[int] = None
    sla_vencimiento: Optional[datetime] = None
    categoria: Optional[str] = None
    platform: Optional[str] = None
    resolucion: Optional[str] = None
    rule_name: Optional[str] = None
    rule_description: Optional[str] = None
    rule_remediation: Optional[str] = None
    raw_logs: Optional[str] = None
    creado_en: Optional[datetime] = None

class TicketInDB(TicketBase):
    id: int
    ticket_uid: str
    creado_en: datetime
    actualizado_en: Optional[datetime] = None
    cerrado_en: Optional[datetime] = None
    reportado_por_nombre: Optional[str] = None
    evidencia: List[Dict] = []
    raw_logs: Optional[str] = None
    source_host: Optional[str] = None
    destination_ip: Optional[str] = None
    firewall_action: Optional[str] = None
    platform: Optional[str] = None

    class Config:
        orm_mode = True
        json_encoders = {
            datetime: convert_to_utc_iso_z
        }

class PaginatedTicketResponse(BaseModel):
    total_count: int
    tickets: List[TicketInDB]
