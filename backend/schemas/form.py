from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime

class FormSubmit(BaseModel):
    form_name: str
    form_data: Dict[str, Any]
    template_id: Optional[int] = None # New field to specify template to use

class FormTemplate(BaseModel):
    id: int
    nombre: str
    descripcion: str
    creado_en: datetime
    template_data: Dict[str, Any] = {} # New field to store pre-fill data

    class Config:
        orm_mode = True

class FormTemplateBase(BaseModel):
    nombre: str

class UserOut(BaseModel):
    first_name: str
    last_name: str

class FormSubmissionOut(BaseModel):
    id: int
    enviado_en: datetime
    template: Optional[FormTemplateBase] = None
    enviado_por: UserOut
    
    class Config:
        orm_mode = True
