from fastapi import APIRouter, Depends, HTTPException, status
import json
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from datetime import datetime, timezone

from schemas.form import FormSubmit, FormTemplate, FormSubmissionOut
from schemas.ticket import TicketCreate
from services.ticket_service import ticket_service
from api.deps import get_db, get_current_user
from db.models import User
from repositories.form_repository import form_repository

router = APIRouter()

# Hardcoded form templates
form_templates_db = [
    {
        "id": 1,
        "nombre": "Instalación de Antivirus",
        "descripcion": "Formulario para registrar la instalación de software antivirus en equipos.",
        "creado_en": datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
        "template_data": {
            "resumen": "Instalación de Antivirus en equipo de usuario",
            "descripcion": "Se requiere la instalación del software antivirus estándar en el equipo del usuario. Por favor, contactar al usuario para coordinar.",
            "severidad": "Baja",
            "categoria": "Instalaciones",
            "impacto": "Bajo",
            "causa_raiz": "Nueva adquisición de equipo",
            "asignado_a_id": None # Se asignará manualmente o por otra lógica
        }
    },
    {
        "id": 2,
        "nombre": "Relevamiento",
        "descripcion": "Formulario para documentar relevamientos de seguridad en áreas o sectores.",
        "creado_en": datetime(2025, 1, 1, 12, 1, 0, tzinfo=timezone.utc),
        "template_data": {
            "resumen": "Relevamiento de seguridad en [Área/Sector]",
            "descripcion": "Realizar un relevamiento exhaustivo de la infraestructura de seguridad en el área/sector especificado. Incluir inventario de activos, configuración de dispositivos y cumplimiento de políticas.",
            "severidad": "Media",
            "categoria": "Auditoría",
            "impacto": "Medio",
            "causa_raiz": "Auditoría programada",
            "asignado_a_id": None
        }
    },
    {
        "id": 3,
        "nombre": "Solicitud de Excepción",
        "descripcion": "Formulario para solicitar excepciones a políticas de seguridad.",
        "creado_en": datetime(2025, 1, 1, 12, 2, 0, tzinfo=timezone.utc),
        "template_data": {
            "resumen": "Solicitud de excepción a política de seguridad: [Nombre de la Política]",
            "descripcion": "Se solicita una excepción a la política de seguridad [Nombre de la Política] por el siguiente motivo: [Justificación]. La duración de la excepción será de [Período].",
            "severidad": "Alta",
            "categoria": "Gestión de Riesgos",
            "impacto": "Alto",
            "causa_raiz": "Requerimiento de negocio específico",
            "asignado_a_id": None
        }
    },
    {
        "id": 4,
        "nombre": "Solicitud de Scan de Vulnerabilidades",
        "descripcion": "Formulario para solicitar un escaneo de vulnerabilidades en activos de la red.",
        "creado_en": datetime(2025, 1, 1, 12, 3, 0, tzinfo=timezone.utc),
        "template_data": {
            "resumen": "Solicitud de escaneo de vulnerabilidades para [Activo/IP]",
            "descripcion": "Realizar un escaneo de vulnerabilidades en el activo/dirección IP [Activo/IP] para identificar posibles debilidades. Reportar los hallazgos y recomendaciones.",
            "severidad": "Media",
            "categoria": "Gestión de Vulnerabilidades",
            "impacto": "Medio",
            "causa_raiz": "Solicitud proactiva de seguridad",
            "asignado_a_id": None
        }
    }
]

@router.get("/templates/", response_model=List[FormTemplate])
def read_form_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve a list of form templates.
    """
    return form_templates_db

@router.get("/submissions/")
def read_form_submissions(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve a list of form submissions.
    """
    submissions = form_repository.list_submissions(db=db, skip=skip, limit=limit)
    
    # Manual serialization to bypass Pydantic issues
    results = []
    for sub in submissions:
        form_data = {}
        try:
            if sub.datos_json:
                form_data = json.loads(sub.datos_json)
        except json.JSONDecodeError:
            form_data = {"error": "Failed to decode JSON data."}

        results.append({
            "id": sub.id,
            "enviado_en": sub.enviado_en,
            "form_data": form_data,
            "template": {
                "nombre": sub.template.nombre if sub.template else "Formulario Genérico"
            },
            "enviado_por": {
                "first_name": sub.enviado_por.first_name if sub.enviado_por else "Usuario",
                "last_name": sub.enviado_por.last_name if sub.enviado_por else "Desconocido"
            }
        })
    return results

@router.post("/submit")
async def submit_form(
    *,
    db: Session = Depends(get_db),
    form_in: FormSubmit,
    current_user: User = Depends(get_current_user)
):
    """
    Submit a form and save it as a submission. Does not create a ticket.
    """
    try:
        # Now that template_id is nullable, we can always create a submission.
        submission = form_repository.create_submission(db=db, form_in=form_in, user_id=current_user.id)
        return {"message": "Form submitted successfully", "submission_id": submission.id}
    except Exception as e:
        # A more specific log would be good here, but for now, re-raise.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit form: {str(e)}"
        )