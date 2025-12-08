from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Any

from api import deps
from db.models import User as DBUser # Importar el modelo de usuario de la base de datos
from schemas.user import User, UserCreate, UserPasswordUpdate, UserUpdate
from schemas.audit import AuditLogBase, AuditLog # Importar AuditLog
from schemas.ticket import TicketUpdate
from services.ticket_service import ticket_service
from repositories.user_repository import user_repository
from core.security import get_password_hash
from repositories.audit_log_repository import audit_log_repository
import json
from db.models import Ticket
from api.routers.fortisiem import parse_raw_log_content

router = APIRouter()


@router.put("/users/{user_id}", response_model=User)
def admin_update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(deps.get_db),
    admin_user: DBUser = Depends(deps.get_current_active_admin),
):
    """
    Update a user's details.
    """
    db_user = user_repository.get(db, id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent deactivating or changing the role of the primary admin
    if db_user.email == "admin@example.com" and (user_in.is_active is False or (user_in.role and user_in.role != "Admin")):
         raise HTTPException(status_code=403, detail="Cannot deactivate or change the role of the primary admin.")

    updated_user = user_repository.update(db, db_obj=db_user, obj_in=user_in)

    audit_log_repository.create(db, obj_in=AuditLogBase(
        entidad="User",
        entidad_id=user_id,
        actor_id=admin_user.id,
        accion="Admin User Update",
        detalle=json.dumps(user_in.dict(exclude_unset=True))
    ))
    return updated_user


@router.post("/users/{user_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def admin_reset_user_password(
    user_id: int,
    db: Session = Depends(deps.get_db),
    admin_user: DBUser = Depends(deps.get_current_active_admin),
):
    """
    Reset a user's password to a default value.
    """
    db_user = user_repository.get(db, id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if db_user.email == admin_user.email:
        raise HTTPException(status_code=400, detail="Admins cannot reset their own password with this function.")

    new_password = "Seguridad1601#"
    db_user.password_hash = get_password_hash(new_password)
    db.commit()
    
    audit_log_repository.create(db, obj_in=AuditLogBase(
        entidad="User",
        entidad_id=user_id,
        actor_id=admin_user.id,
        accion="Admin Password Reset",
        detalle=json.dumps({"target_user_email": db_user.email})
    ))
    return

@router.put("/users/{user_id}/password", status_code=status.HTTP_204_NO_CONTENT)
def admin_change_user_password(
    user_id: int,
    password_data: UserPasswordUpdate,
    db: Session = Depends(deps.get_db),
    admin_user: DBUser = Depends(deps.get_current_admin_or_lider_user),
):
    """
    Change a user's password.
    """
    db_user = user_repository.get(db, id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()
    
    audit_log_repository.create(db, obj_in=AuditLogBase(
        entidad="User",
        entidad_id=user_id,
        actor_id=admin_user.id,
        accion="Admin Password Change",
        detalle=json.dumps({"target_user_email": db_user.email})
    ))
    return

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_user(
    user_id: int,
    db: Session = Depends(deps.get_db),
    admin_user: DBUser = Depends(deps.get_current_admin_or_lider_user),
):
    """
    Delete a user.
    """
    db_user = user_repository.get(db, id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    deleted_user_email = db_user.email
    user_repository.remove(db, id=user_id)
    
    audit_log_repository.create(db, obj_in=AuditLogBase(
        entidad="User",
        entidad_id=user_id,
        actor_id=admin_user.id,
        accion="Admin User Deletion",
        detalle=json.dumps({"deleted_user_email": deleted_user_email})
    ))
    return

@router.get("/settings/session_expiration")
def get_session_expiration_settings():
    # Placeholder for session expiration settings
    return {"session_expiration_minutes": 30}

@router.post("/audit-logs/{log_id}/revert", status_code=status.HTTP_200_OK)
def revert_audit_log_change(
    log_id: int,
    db: Session = Depends(deps.get_db),
    current_user: DBUser = Depends(deps.get_current_active_admin),
):
    """
    Revert a change from a specific audit log entry.
    Currently only supports 'Actualización de Ticket'.
    """
    log_entry = audit_log_repository.get(db, id=log_id)
    if not log_entry:
        raise HTTPException(status_code=404, detail="Audit log entry not found")

    if log_entry.entidad != "Ticket" or log_entry.accion != "Actualización de Ticket":
        raise HTTPException(status_code=400, detail="This action cannot be reverted.")

    try:
        print(f"Attempting to revert log {log_id}. Raw detalle: {log_entry.detalle}")
        details = json.loads(log_entry.detalle)
        changes = details.get("cambios", {})

        if not changes or not log_entry.entidad_id:
            raise HTTPException(status_code=400, detail="No changes to revert found in log.")

        # Construct the update schema from the 'old' values more robustly
        revert_data = {}
        for field, data in changes.items():
            if isinstance(data, dict) and "old" in data:
                revert_data[field] = data["old"]
            else:
                print(f"Skipping malformed revert data for field '{field}': {data}")

        if not revert_data:
            raise HTTPException(status_code=400, detail="No valid field data found to revert.")
            
        ticket_update_schema = TicketUpdate(**revert_data)

        # Use the ticket service to apply the update
        updated_ticket = ticket_service.update_ticket(
            db=db,
            ticket_id=log_entry.entidad_id,
            ticket_in=ticket_update_schema,
            current_user=current_user,
            files=[]  # Reverting does not involve file uploads
        )

        if not updated_ticket:
            raise HTTPException(status_code=404, detail="Ticket to update not found.")

        # Create a new audit log for the revert action
        audit_log_repository.create(db, obj_in=AuditLogBase(
            entidad="AuditLog",
            entidad_id=log_id,
            actor_id=current_user.id,
            accion="Reversión de Cambio",
            detalle=f"Se revirtió el cambio del ticket TCK-2025-{log_entry.entidad_id:06} desde el log de auditoría {log_id}"
        ))

        return {"message": f"Successfully reverted changes for ticket TCK-2025-{log_entry.entidad_id:06} from audit log {log_id}"}
    
    except Exception as e:
        print(f"Error reverting audit log {log_id}: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during revert: {e}")


@router.get("/audit-logs/", response_model=List[AuditLog])
def get_audit_logs(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    admin_user: DBUser = Depends(deps.get_current_admin_or_lider_user),
) -> Any:
    """
    Retrieve audit logs with actor names.
    """
    try:
        logs_with_actors = audit_log_repository.get_multi_with_actor_details(db, skip=skip, limit=limit)
        
        response_logs = []
        for log, actor_name in logs_with_actors:
            log_data = AuditLog.from_orm(log)
            log_data.actor_name = actor_name or "Sistema" # Handle cases where actor is None
            response_logs.append(log_data)
            
        return response_logs
    except Exception as e:
        # Log the exception to the console for debugging
        print(f"Error in get_audit_logs: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al recuperar los registros de auditoría: {e}")

@router.post("/tickets/update_summaries", status_code=status.HTTP_200_OK)
def update_ticket_summaries(
    db: Session = Depends(deps.get_db),
    admin_user: DBUser = Depends(deps.get_current_admin_or_lider_user),
):
    """
    Update summaries and descriptions for all tickets based on their raw_logs.
    """
    all_tickets = db.query(Ticket).yield_per(100)
    updated_count = 0

    for ticket in all_tickets:
        if ticket.raw_logs:
            try:
                incident_data = parse_raw_log_content(ticket.raw_logs)

                # Defensive check: Only update if parsing produced a valid title.
                parsed_title = incident_data.get('rule_name')
                if parsed_title and parsed_title != 'N/A' and parsed_title.strip() != '':
                    ticket.resumen = parsed_title
                    ticket.descripcion = incident_data['detailed_description']
                    ticket.severidad = incident_data['severity_name']
                    updated_count += 1
                else:
                    print(f"Skipping ticket {ticket.id} due to unsuccessful parsing of raw_log.")

            except Exception as e:
                # Log the error but continue with other tickets
                print(f"Could not update ticket {ticket.id}: {e}")

    db.commit()

    return {"message": f"Successfully updated {updated_count} tickets."}