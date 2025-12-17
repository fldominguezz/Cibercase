from pydantic import BaseModel, validator
from typing import Dict, Any, Optional
from datetime import datetime
import json

class FormSubmit(BaseModel):
    form_name: str
    form_data: Dict[str, Any]
    template_id: Optional[int] = None

class FormTemplate(BaseModel):
    id: int
    nombre: str
    descripcion: str
    creado_en: datetime
    template_data: Dict[str, Any] = {}

    class Config:
        orm_mode = True

class FormTemplateBase(BaseModel):
    nombre: str
    class Config:
        orm_mode = True

class UserOut(BaseModel):
    first_name: str
    last_name: str
    class Config:
        orm_mode = True

class FormSubmissionOut(BaseModel):
    id: int
    enviado_en: datetime
    form_data: Dict[str, Any]
    template: Optional[FormTemplateBase] = None
    enviado_por: UserOut
    
    @validator('form_data', pre=True, always=True)
    def parse_json_data(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return {} # Return empty dict if JSON is malformed
        return v

    class Config:
        orm_mode = True
        fields = {'form_data': {'alias': 'datos_json'}}
