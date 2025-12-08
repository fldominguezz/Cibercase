from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import pytz

# Define Argentina timezone
ARGENTINA_TIMEZONE = pytz.timezone('America/Argentina/Buenos_Aires')

# Custom datetime encoder for Pydantic models
def convert_utc_to_argentina_time(dt: datetime) -> str:
    if dt.tzinfo is None: # Naive datetime, assume UTC
        utc_dt = pytz.utc.localize(dt)
    else:
        utc_dt = dt.astimezone(pytz.utc)
    return utc_dt.astimezone(ARGENTINA_TIMEZONE).strftime('%Y-%m-%d %H:%M:%S %Z%z')


class AlertBase(BaseModel):
    fuente: Optional[str] = None
    vendor: Optional[str] = None
    producto: Optional[str] = None
    tipo_evento: Optional[str] = None
    severidad: Optional[str] = None
    ip_origen: Optional[str] = None
    ip_destino: Optional[str] = None
    host_name: Optional[str] = None
    usuario_afectado: Optional[str] = None
    firma_id: Optional[str] = None
    descripcion: Optional[str] = None
    raw_log: Optional[str] = None
    correlacion_id: Optional[str] = None

class AlertCreate(AlertBase):
    pass

class AlertInDB(AlertBase):
    id: int
    ticket_id: Optional[int] = None
    recibido_en: datetime = Field(json_encoders={datetime: convert_utc_to_argentina_time})

    class Config:
        from_attributes = True
        json_encoders = {datetime: convert_utc_to_argentina_time}
