from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Any
import secrets
import string
import json

from api import deps
from db.models import User as DBUser, Role as DBRole, Permission as DBPermission, Ticket
from schemas.user import User, UserPasswordUpdate, UserUpdate, UserCreate
from schemas.audit import AuditLogBase, AuditLog
from schemas.ticket import TicketUpdate
from schemas.role import Role, RoleCreate, RoleUpdate
from schemas.permission import Permission
from services.user_service import user_service
from repositories.user_repository import user_repository
from repositories.role_repository import role_repository
from repositories.permission_repository import permission_repository
from core.security import get_password_hash
from repositories.audit_log_repository import audit_log_repository
import socket

from api.routers.fortisiem import parse_raw_log_content

router = APIRouter()

@router.get("/fortisiem-status")
def get_fortisiem_status(current_user: DBUser = Depends(deps.get_current_active_admin)):
    """
    Check the connection status to the FortiSIEM server.
    """
    fortisiem_ip = "10.1.78.10"
    fortisiem_port = 443  # HTTPS port

    try:
        with socket.create_connection((fortisiem_ip, fortisiem_port), timeout=5) as sock:
            return {"status": "online", "details": f"Successfully connected to FortiSIEM at {fortisiem_ip}:{fortisiem_port}"}
    except OSError as e:
        return {"status": "offline", "details": f"Connection to FortiSIEM at {fortisiem_ip}:{fortisiem_port} failed: {e}"}


# Existing Admin User Management
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
    if db_user.email == "admin@example.com" and (
        user_in.is_active is False or (user_in.role and user_in.role.value != "Admin")
    ):
        raise HTTPException(
            status_code=403,
            detail="Cannot deactivate or change the role of the primary admin.",
        )
    
    update_data = user_in.dict(exclude_unset=True)
    if "role" in update_data:
        role_name = update_data.pop("role")
        role = db.query(DBRole).filter(DBRole.name == role_name).first()
        if not role:
            raise HTTPException(status_code=404, detail=f"Role '{role_name}' not found")
        update_data["role_id"] = role.id

    updated_user = user_repository.update(db, db_obj=db_user, obj_in=update_data)

    audit_log_repository.create(
        db,
        obj_in=AuditLogBase(
            entidad="User",
            entidad_id=user_id,
            actor_id=admin_user.id,
            accion="Admin User Update",
            detalle=json.dumps(user_in.dict(exclude_unset=True)),
        ),
    )
    return updated_user

@router.post("/users/", response_model=User, status_code=status.HTTP_201_CREATED)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
    current_user: DBUser = Depends(deps.get_current_active_admin),
):
    """
    Create new user.
    """
    user = user_repository.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    
    create_data = user_in.dict()
    role_name = create_data.pop("role")
    role = db.query(DBRole).filter(DBRole.name == role_name).first()
    if not role:
        raise HTTPException(status_code=404, detail=f"Role '{role_name}' not found")
    create_data["role_id"] = role.id

    user = user_repository.create(db, obj_in=create_data)

    # Create audit log
    audit_log_repository.create(
        db,
        obj_in=AuditLogBase(
            entidad="User",
            entidad_id=user.id,
            actor_id=current_user.id,
            accion="Creación de Usuario",
            detalle=json.dumps(
                {"new_user_email": user.email, "new_user_role": user.role.name}
            ),
        ),
    )

    return user

@router.post("/users/{user_id}/reset-password", response_model=dict)
def admin_reset_user_password(
    user_id: int,
    db: Session = Depends(deps.get_db),
    admin_user: DBUser = Depends(deps.get_current_active_admin),
):
    """
    Reset a user's password to a new, secure random password.
    """
    db_user = user_repository.get(db, id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user.email == admin_user.email:
        raise HTTPException(
            status_code=400,
            detail="Admins cannot reset their own password with this function.",
        )
    alphabet = string.ascii_letters + string.digits
    new_password = "".join(secrets.choice(alphabet) for i in range(16))
    db_user.password_hash = get_password_hash(new_password)
    db.commit()
    audit_log_repository.create(
        db,
        obj_in=AuditLogBase(
            entidad="User",
            entidad_id=user_id,
            actor_id=admin_user.id,
            accion="Admin Password Reset",
            detalle=json.dumps({"target_user_email": db_user.email}),
        ),
    )
    return {"new_password": new_password}

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
    audit_log_repository.create(
        db,
        obj_in=AuditLogBase(
            entidad="User",
            entidad_id=user_id,
            actor_id=admin_user.id,
            accion="Admin User Deletion",
            detalle=json.dumps({"deleted_user_email": deleted_user_email}),
        ),
    )
    return

# Role Management Endpoints
@router.get("/roles", response_model=List[Role])
def get_all_roles(
    db: Session = Depends(deps.get_db),
    current_user: DBUser = Depends(deps.get_current_active_admin),
):
    """
    Retrieve all roles.
    """
    return role_repository.get_multi(db)

@router.post("/roles", response_model=Role, status_code=status.HTTP_201_CREATED)
def create_role(
    role_in: RoleCreate,
    db: Session = Depends(deps.get_db),
    current_user: DBUser = Depends(deps.get_current_active_admin),
):
    """
    Create a new role.
    """
    role = role_repository.get_by_name(db, name=role_in.name)
    if role:
        raise HTTPException(
            status_code=400,
            detail="The role with this name already exists.",
        )
    role = role_repository.create(db, obj_in=role_in)
    return role

@router.put("/roles/{role_id}", response_model=Role)
def update_role(
    role_id: int,
    role_in: RoleUpdate,
    db: Session = Depends(deps.get_db),
    current_user: DBUser = Depends(deps.get_current_active_admin),
):
    """
    Update a role and its permissions.
    """
    role = role_repository.get(db, id=role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    permissions = db.query(DBPermission).filter(DBPermission.id.in_(role_in.permission_ids)).all()
    if len(permissions) != len(role_in.permission_ids):
        raise HTTPException(status_code=404, detail="One or more permissions not found")
    
    update_data = role_in.dict(exclude_unset=True)
    update_data.pop("permission_ids", None)

    role.permissions = permissions
    updated_role = role_repository.update(db, db_obj=role, obj_in=update_data)
    return updated_role

@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(
    role_id: int,
    db: Session = Depends(deps.get_db),
    current_user: DBUser = Depends(deps.get_current_active_admin),
):
    """
    Delete a role.
    """
    role = role_repository.get(db, id=role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Check if any user is assigned to this role
    users_with_role = db.query(DBUser).filter(DBUser.role_id == role_id).count()
    if users_with_role > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete role. {users_with_role} user(s) are assigned to it.")

    role_repository.remove(db, id=role_id)
    return

# Permission Management Endpoints
@router.get("/permissions", response_model=List[Permission])
def get_all_permissions(
    db: Session = Depends(deps.get_db),
    current_user: DBUser = Depends(deps.get_current_active_admin),
):
    """
    Retrieve all permissions.
    """
    return permission_repository.get_multi(db)


# Existing Audit Log and other admin endpoints
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
        logs_with_actors = audit_log_repository.get_multi_with_actor_details(
            db, skip=skip, limit=limit
        )
        response_logs = []
        for log, actor_name in logs_with_actors:
            log_data = AuditLog.from_orm(log)
            log_data.actor_name = actor_name or "Sistema"
            response_logs.append(log_data)
        return response_logs
    except Exception as e:
        print(f"Error in get_audit_logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al recuperar los registros de auditoría: {e}",
        )

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
                parsed_title = incident_data.get("rule_name")
                if parsed_title and parsed_title != "N/A" and parsed_title.strip() != "":
                    ticket.resumen = parsed_title
                    ticket.descripcion = incident_data["detailed_description"]
                    ticket.severidad = incident_data["severity_name"]
                    updated_count += 1
                else:
                    print(f"Skipping ticket {ticket.id} due to unsuccessful parsing of raw_log.")
            except Exception as e:
                print(f"Could not update ticket {ticket.id}: {e}")
    db.commit()
    return {"message": f"Successfully updated {updated_count} tickets."}