from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form, Request
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from typing import Any, Optional, List
from datetime import datetime

from api import deps
from db.models import User, Notification
from schemas.ticket import PaginatedTicketResponse, TicketInDB, TicketCreate, TicketUpdate
from schemas.ticket_comment import TicketCommentCreate, TicketComment
from services.ticket_service import ticket_service
from repositories.ticket_comment_repository import ticket_comment_repository

import asyncio
import json
from api.routers.websockets import manager

router = APIRouter()

async def create_notification(db: Session, user_id: int, message: str, link: Optional[str] = None):
    notification = Notification(user_id=user_id, message=message, link=link)
    db.add(notification)
    db.commit()
    db.refresh(notification)

    # WebSocket notification
    notification_data = {
        "type": "notification",
        "data": {
            "id": notification.id,
            "message": notification.message,
            "link": notification.link,
            "read": notification.is_read,
            "created_at": notification.created_at.isoformat()
        }
    }
    await manager.send_to_user(json.dumps(notification_data), user_id)
    
    return notification

@router.post("/", response_model=TicketInDB, summary="Create a new ticket", description="Creates a new support ticket with the provided details and optional file attachments. The current authenticated user will be set as the reporter.")
async def create_ticket(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    estado: str = Form(..., description="Current status of the ticket (e.g., 'Nuevo', 'En Progreso', 'Resuelto', 'Cerrado')."),
    severidad: str = Form(..., description="Severity level of the ticket (e.g., 'Baja', 'Media', 'Alta', 'Crítica')."),
    resumen: str = Form(..., description="A brief summary or title of the ticket."),
    descripcion: Optional[str] = Form(None, description="Detailed description of the issue or request."),
    impacto: Optional[str] = Form(None, description="Impact level of the ticket."),
    causa_raiz: Optional[str] = Form(None, description="Identified root cause of the issue."),
    asignado_a_id: Optional[int] = Form(None, description="ID of the user assigned to the ticket."),
    sla_vencimiento: Optional[datetime] = Form(None, description="Service Level Agreement (SLA) due date."),
    categoria: Optional[str] = Form(None, description="Category of the ticket (e.g., 'Incidente', 'Solicitud')."),
    files: List[UploadFile] = File([], description="Optional files to attach as evidence to the ticket.")
) -> Any:
    """
    Create new ticket.
    """
    ticket_in = TicketCreate(
        estado=estado,
        severidad=severidad,
        resumen=resumen,
        descripcion=descripcion,
        impacto=impacto,
        causa_raiz=causa_raiz,
        reportado_por_id=current_user.id,
        asignado_a_id=asignado_a_id,
        sla_vencimiento=sla_vencimiento,
        categoria=categoria
    )
    ticket = await ticket_service.create_ticket(db=db, ticket_data=ticket_in, files=files, current_user_id=current_user.id)

    # Notify assigned user if any
    if ticket.asignado_a_id:
        assigned_user = db.query(User).filter(User.id == ticket.asignado_a_id).first()
        if assigned_user:
                            message = f"Se te ha asignado un nuevo ticket: {ticket.resumen} (ID: {ticket.ticket_uid})"
                            link = f"/tickets/{ticket.id}"
                            await create_notification(db, assigned_user.id, message, link)    
    # Notify the reporter that their ticket has been created
    message = f"Tu ticket '{ticket.resumen}' (ID: {ticket.ticket_uid}) ha sido creado."
    link = f"/tickets/{ticket.id}"
    await create_notification(db, current_user.id, message, link)

    return ticket

@router.get("/", response_model=PaginatedTicketResponse, summary="Retrieve a list of tickets", description="Retrieves a paginated list of tickets, with extensive filtering, sorting, and search capabilities. Users can filter by status, severity, category, assigned user, reporter, and search across multiple ticket fields.")
def read_tickets(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    assigned_to_me: Optional[bool] = False,
    severity: Optional[str] = None,
    created_by_me: Optional[bool] = False,
    category: Optional[str] = None,
    search: Optional[str] = None,
    reportado_por_id: Optional[int] = None,
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve tickets.
    """
    assigned_to_me_id = current_user.id if assigned_to_me else None
    created_by_me_id = current_user.id if created_by_me else None

    tickets, total_count = ticket_service.get_paginated_tickets(
        db,
        skip=skip,
        limit=limit,
        status=status,
        assigned_to_me_id=assigned_to_me_id,
        severity=severity,
        created_by_me_id=created_by_me_id,
        category=category,
        search=search,
        reportado_por_id=reportado_por_id,
        sort_by=sort_by,
        sort_order=sort_order,
        start_date=start_date,
        end_date=end_date,
    )
    return JSONResponse(content=jsonable_encoder({"total_count": total_count, "tickets": tickets}))


from fastapi.responses import JSONResponse # Import JSONResponse

@router.get("/categories", summary="Get ticket categories", description="Retrieves the list of available ticket categories.")
def get_ticket_categories():
    """
    Get all ticket categories.
    """
    return JSONResponse(content=["FortiEMS", "FortiSIEM", "FortiSandbox", "FortiAnalyzer", "Instalaciones", "GENERAL", "ESET", "ESET BIENESTAR"])


@router.get("/{ticket_id}", response_model=TicketInDB, summary="Get a single ticket by ID", description="Retrieves the detailed information for a specific ticket, including its comments and evidence, identified by its unique ID.")
def read_ticket(
    ticket_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    ticket = ticket_service.get_ticket(db, ticket_id=ticket_id, current_user_id=current_user.id)
    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found",
        )
    return ticket


@router.put("/{ticket_id}", response_model=TicketInDB, summary="Update an existing ticket", description="Updates the details of an existing ticket. Users with 'Admin' or 'Lider' roles have full update permissions, while other roles may have restricted update capabilities (e.g., cannot change status or assignee).")
async def update_ticket(
    ticket_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    estado: Optional[str] = Form(None, description="Current status of the ticket (e.g., 'Nuevo', 'En Progreso', 'Resuelto', 'Cerrado')."),
    severidad: Optional[str] = Form(None, description="Severity level of the ticket (e.g., 'Baja', 'Media', 'Alta', 'Crítica')."),
    resumen: Optional[str] = Form(None, description="A brief summary or title of the ticket."),
    descripcion: Optional[str] = Form(None, description="Detailed description of the issue or request."),
    impacto: Optional[str] = Form(None, description="Impact level of the ticket."),
    causa_raiz: Optional[str] = Form(None, description="Identified root cause of the issue."),
    asignado_a_id: Optional[int] = Form(None, description="ID of the user assigned to the ticket."),
    sla_vencimiento: Optional[datetime] = Form(None, description="Service Level Agreement (SLA) due date."),
    categoria: Optional[str] = Form(None, description="Category of the ticket (e.g., 'Incidente', 'Solicitud')."),
    resolucion: Optional[str] = Form(None, description="Resolution details for the ticket."),
    rule_name: Optional[str] = Form(None),
    rule_description: Optional[str] = Form(None),
    rule_remediation: Optional[str] = Form(None),
    raw_logs: Optional[str] = Form(None),
    creado_en: Optional[datetime] = Form(None),
    files: List[UploadFile] = File([], description="Optional files to attach as evidence to the ticket.")
) -> Any:
    """
    Update a ticket.
    """
    ticket = ticket_service.get_ticket(db, ticket_id=ticket_id, current_user_id=current_user.id)
    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found",
        )
    
    old_assigned_to_id = ticket.asignado_a_id
    old_estado = ticket.estado

    # Create a dictionary of update data, excluding None values
    update_data = {
        k: v for k, v in {
            "estado": estado,
            "severidad": severidad,
            "resumen": resumen,
            "descripcion": descripcion,
            "impacto": impacto,
            "causa_raiz": causa_raiz,
            "asignado_a_id": asignado_a_id,
            "sla_vencimiento": sla_vencimiento,
            "categoria": categoria,
            "resolucion": resolucion,
            "rule_name": rule_name,
            "rule_description": rule_description,
            "rule_remediation": rule_remediation,
            "raw_logs": raw_logs,
            "creado_en": creado_en,
        }.items() if v is not None
    }
    
    ticket_in = TicketUpdate(**update_data)

    updated_ticket = ticket_service.update_ticket(db=db, ticket_id=ticket_id, ticket_in=ticket_in, current_user=current_user, files=files)
    
    if not updated_ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found after update attempt",
        )

    # Notify if assigned user changed
    if updated_ticket.asignado_a_id and updated_ticket.asignado_a_id != old_assigned_to_id:
        assigned_user = db.query(User).filter(User.id == updated_ticket.asignado_a_id).first()
        if assigned_user:
            message = f"Se te ha asignado el ticket: {updated_ticket.resumen} (ID: {updated_ticket.ticket_uid})"
            link = f"/tickets/{updated_ticket.id}"
            await create_notification(db, assigned_user.id, message, link)
    
    # Notify reporter and assignee if status changed
    if updated_ticket.estado != old_estado:
        # Notify reporter
        if updated_ticket.reportado_por_id:
            reporter_user = db.query(User).filter(User.id == updated_ticket.reportado_por_id).first()
            if reporter_user:
                message = f"El estado de tu ticket '{updated_ticket.resumen}' (ID: {updated_ticket.ticket_uid}) ha cambiado a '{updated_ticket.estado}'."
                link = f"/tickets/{updated_ticket.id}"
                await create_notification(db, reporter_user.id, message, link)
        
        # Notify assignee (if different from reporter and not already notified for assignment change)
        if updated_ticket.asignado_a_id and updated_ticket.asignado_a_id != updated_ticket.reportado_por_id:
            assigned_user = db.query(User).filter(User.id == updated_ticket.asignado_a_id).first()
            if assigned_user:
                message = f"El estado del ticket '{updated_ticket.resumen}' (ID: {updated_ticket.ticket_uid}) asignado a ti ha cambiado a '{updated_ticket.estado}'."
                link = f"/tickets/{updated_ticket.id}"
                await create_notification(db, assigned_user.id, message, link)
    
    return updated_ticket


@router.post("/{ticket_id}/comments", response_model=TicketComment, status_code=status.HTTP_201_CREATED, summary="Add a new comment to a ticket", description="Adds a new comment to a specified ticket. The comment is associated with the current authenticated user.")
async def create_ticket_comment(
    ticket_id: int,
    comment_in: TicketCommentCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create a new comment for a specific ticket.
    """
    try:
        ticket = ticket_service.get_ticket(db, ticket_id=ticket_id, current_user_id=current_user.id)
        if not ticket:
            raise HTTPException(
                status_code=404,
                detail="Ticket not found",
            )
        
        comment = ticket_comment_repository.create_comment(
            db=db,
            obj_in=comment_in,
            user_id=current_user.id,
            ticket_id=ticket_id
        )

        # Notify assigned user if different from commenter
        if ticket.asignado_a_id and ticket.asignado_a_id != current_user.id:
            assigned_user = db.query(User).filter(User.id == ticket.asignado_a_id).first()
            if assigned_user:
                message = f"Se ha añadido un nuevo comentario al ticket '{ticket.resumen}' (ID: {ticket.ticket_uid}) que te ha sido asignado."
                link = f"/tickets/{ticket.id}"
                await create_notification(db, assigned_user.id, message, link)
        
        # Notify reporter if different from commenter and assignee
        if ticket.reportado_por_id and ticket.reportado_por_id != current_user.id and ticket.reportado_por_id != ticket.asignado_a_id:
            reporter_user = db.query(User).filter(User.id == ticket.reportado_por_id).first()
            if reporter_user:
                message = f"Se ha añadido un nuevo comentario a tu ticket '{ticket.resumen}' (ID: {ticket.ticket_uid})."
                link = f"/tickets/{ticket.id}"
                await create_notification(db, reporter_user.id, message, link)

        return comment
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al crear el comentario: {e}")

@router.get("/{ticket_id}/comments", response_model=List[TicketComment], summary="Retrieve comments for a ticket", description="Retrieves all comments associated with a specific ticket, ordered by creation date.")
def get_ticket_comments(
    ticket_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> List[TicketComment]:
    """
    Retrieve all comments for a specific ticket.
    """
    ticket = ticket_service.get_ticket(db, ticket_id=ticket_id, current_user_id=current_user.id)
    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found",
        )
    
    comments = ticket_comment_repository.get_comments_by_ticket_id(db=db, ticket_id=ticket_id)
    return [TicketComment.from_orm(c) for c in comments]

@router.post("/test-fortisiem", status_code=status.HTTP_200_OK, summary="Receive FortiSIEM incident data", description="Endpoint to receive incident data from FortiSIEM via webhook. This endpoint processes the incoming XML data and can be extended to automatically create or update tickets based on the incident details.")
async def receive_fortisiem_incident(
    request: Request,
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Receive FortiSIEM incident data via webhook.
    """
    try:
        body = await request.body()
        xml_data = body.decode("utf-8")
        print(f"Received FortiSIEM incident (XML): {xml_data}")

        # TODO: Parse XML data and create a ticket
        # For now, just acknowledge receipt
        return {"message": "FortiSIEM incident received successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing FortiSIEM incident: {e}")


@router.put("/{ticket_id}/remediate", response_model=TicketInDB, summary="Assign and set ticket to 'In Progress'", description="Assigns the specified ticket to the current authenticated user and sets its status to 'En Progreso' (In Progress), indicating the user is taking action to remediate the issue.")
async def remediate_ticket(
    ticket_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Assign a ticket to the current user for remediation and set status to 'En Progreso'.
    """
    ticket = ticket_service.get_ticket(db, ticket_id=ticket_id, current_user_id=current_user.id)
    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found",
        )

    # Prepare the update data
    ticket_in = TicketUpdate(
        asignado_a_id=current_user.id,
        estado="En Progreso"
    )
    
    # Use the existing update service
    updated_ticket = ticket_service.update_ticket(db=db, ticket_id=ticket_id, ticket_in=ticket_in, current_user=current_user, files=[])
    
    return updated_ticket


@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a ticket", description="Deletes a specific ticket identified by its ID. This action is typically restricted to users with appropriate permissions (e.g., 'Admin').")
def delete_ticket(
    ticket_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Delete a ticket.
    """
    ticket = ticket_service.delete_ticket(db=db, ticket_id=ticket_id, current_user_id=current_user.id)
    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found",
        )
    return


from fastapi.responses import JSONResponse # Import JSONResponse

# ... (rest of the file)


