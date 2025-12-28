from fastapi import UploadFile, HTTPException, status
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
import shutil
import uuid
import hashlib
import json
from datetime import datetime  # Importar datetime

from repositories.ticket_repository import ticket_repository
from repositories.audit_log_repository import audit_log_repository
from db.models import Evidence, User, Ticket
from schemas.ticket import TicketInDB, TicketCreate, TicketUpdate
from schemas.audit import AuditLogBase  # Importar AuditLogBase
from api.routers.websockets import manager  # Importar el manager de websockets


class TicketService:
    def get_paginated_tickets(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        assigned_to_me_id: Optional[int] = None,
        severity: Optional[str] = None,
        created_by_me_id: Optional[int] = None,
        category: Optional[str] = None,
        search: Optional[str] = None,
        reportado_por_id: Optional[int] = None,
        sort_by: Optional[str] = "creado_en",
        sort_order: Optional[str] = "desc",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Tuple[List[TicketInDB], int]:
        """
        Retrieves a paginated list of tickets with optional filtering, sorting, and search capabilities.
        It also enriches ticket data with reporter's name and raw logs from associated alerts.
        """

        # Fetch tickets from the repository with joined details (reporter name, raw logs)
        tickets_with_details, total_count = ticket_repository.get_tickets_with_details(
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

        result = []
        # Process each ticket object to construct the TicketInDB schema
        for ticket_obj, first_name, last_name, raw_log in tickets_with_details:
            ticket_in_db = TicketInDB.from_orm(ticket_obj)

            # Manually format datetimes to ISO string with Z
            if ticket_obj.creado_en:
                ticket_in_db.creado_en = ticket_obj.creado_en.isoformat() + "Z"
            if ticket_obj.actualizado_en:
                ticket_in_db.actualizado_en = (
                    ticket_obj.actualizado_en.isoformat() + "Z"
                )
            if ticket_obj.cerrado_en:
                ticket_in_db.cerrado_en = ticket_obj.cerrado_en.isoformat() + "Z"

            # Assign reporter's full name or default to "Sistema" / "Desconocido"
            if first_name and last_name:
                ticket_in_db.reportado_por_nombre = f"{first_name} {last_name}"
            else:
                ticket_in_db.reportado_por_nombre = (
                    "Sistema" if ticket_obj.reportado_por_id is None else "Desconocido"
                )

            # Attach raw logs and rule details from the associated alert
            ticket_in_db.raw_logs = raw_log
            ticket_in_db.rule_name = ticket_obj.rule_name
            ticket_in_db.rule_description = ticket_obj.rule_description
            ticket_in_db.rule_remediation = ticket_obj.rule_remediation

            result.append(ticket_in_db)

        return result, total_count

    def get_ticket(
        self, db: Session, ticket_id: int, current_user_id: int
    ) -> Optional[TicketInDB]:
        """
        Retrieves a single ticket by its ID, enriching it with reporter's name,
        associated evidence, and raw logs from any linked alert.
        Also, changes status from 'Nuevo' to 'Abierto' if viewed by assignee.
        """
        # Fetch the ticket along with its reporter's first and last name
        ticket_with_reporter = ticket_repository.get_ticket_with_details(
            db, ticket_id=ticket_id
        )

        if not ticket_with_reporter:
            return None

        ticket_obj, first_name, last_name = ticket_with_reporter

        # Change status if it's the first time the assignee sees it
        if ticket_obj.estado == "Nuevo" and ticket_obj.asignado_a_id == current_user_id:
            old_estado = ticket_obj.estado
            ticket_obj.estado = "Abierto"
            db.add(ticket_obj)
            db.commit()
            db.refresh(ticket_obj)

            # Create audit log for the automatic status change
            audit_log_data = AuditLogBase(
                entidad="Ticket",
                entidad_id=ticket_obj.id,
                actor_id=current_user_id,
                accion="Cambio de Estado Automático",
                detalle=json.dumps(
                    {
                        "cambios": {"estado": {"old": old_estado, "new": "Abierto"}},
                        "reason": "Visto por asignado",
                    }
                ),
            )
            audit_log_repository.create(db, obj_in=audit_log_data)

        ticket_in_db = TicketInDB.from_orm(ticket_obj)

        # Manually format datetimes to ISO string with Z
        if ticket_obj.creado_en:
            ticket_in_db.creado_en = ticket_obj.creado_en.isoformat() + "Z"
        if ticket_obj.actualizado_en:
            ticket_in_db.actualizado_en = ticket_obj.actualizado_en.isoformat() + "Z"
        if ticket_obj.cerrado_en:
            ticket_in_db.cerrado_en = ticket_obj.cerrado_en.isoformat() + "Z"

        # Assign reporter's full name or default to "Sistema" / "Desconocido"
        if first_name and last_name:
            ticket_in_db.reportado_por_nombre = f"{first_name} {last_name}"
        else:
            ticket_in_db.reportado_por_nombre = (
                "Sistema" if ticket_obj.reportado_por_id is None else "Desconocido"
            )

        # Retrieve and attach evidence records associated with the ticket
        evidence_records = ticket_repository.get_evidence_for_ticket(
            db, ticket_id=ticket_obj.id
        )
        ticket_in_db.evidencia = [
            {
                "id": ev.id,
                "nombre_archivo": ev.nombre_archivo,
                "ruta_almacenamiento": ev.ruta_almacenamiento,
            }
            for ev in evidence_records
        ]

        # Attach raw logs from the associated alert, if any (assuming it's directly on ticket_obj)
        if ticket_obj.raw_logs:
            ticket_in_db.raw_logs = ticket_obj.raw_logs

        # Attach rule details directly from the ticket object
        ticket_in_db.rule_name = ticket_obj.rule_name
        ticket_in_db.rule_description = ticket_obj.rule_description
        ticket_in_db.rule_remediation = ticket_obj.rule_remediation

        return ticket_in_db

    async def create_ticket(
        self,
        db: Session,
        ticket_data: TicketCreate,
        files: List[UploadFile],
        current_user_id: int,
    ) -> TicketInDB:
        # Create the ticket record in the database
        # This also generates a unique ticket_uid (e.g., TCK-YYYY-NNNNNN)
        created_ticket = ticket_repository.create_with_owner(
            db=db, obj_in=ticket_data, current_user_id=current_user_id
        )

        # Handle file uploads if any evidence files are provided
        for file in files:
            if file.filename:
                # Generate a unique filename to prevent collisions
                file_extension = file.filename.split(".")[-1]
                unique_filename = f"{uuid.uuid4()}.{file_extension}"
                file_path = f"uploads/{unique_filename}"

                # Save the uploaded file to the specified path
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)

                # Calculate SHA256 hash of the uploaded file for integrity verification
                sha256_hash = hashlib.sha256()
                with open(file_path, "rb") as f:
                    # Read file in chunks to handle large files efficiently
                    for byte_block in iter(lambda: f.read(4096), b""):
                        sha256_hash.update(byte_block)

                # Create an Evidence record in the database for the uploaded file
                evidence = Evidence(
                    ticket_id=created_ticket.id,
                    nombre_archivo=file.filename,
                    ruta_almacenamiento=file_path,
                    hash_sha256=sha256_hash.hexdigest(),
                    subido_por_id=current_user_id,
                )
                db.add(evidence)
                db.commit()  # Commit after adding each evidence to ensure it's linked
                db.refresh(evidence)  # Refresh to get the ID

        # Create an audit log entry for the ticket creation
        audit_log_data = AuditLogBase(
            entidad="Ticket",
            entidad_id=created_ticket.id,
            actor_id=current_user_id,
            accion="Creación de Ticket",
            detalle=json.dumps(
                {"resumen": created_ticket.resumen, "estado": created_ticket.estado}
            ),
        )
        audit_log_repository.create(db, obj_in=audit_log_data)

        # Retrieve the full ticket details including reporter name, evidence, and raw logs
        full_ticket = self.get_ticket(
            db, ticket_id=created_ticket.id, current_user_id=current_user_id
        )

        # Broadcast the new ticket information via WebSocket for real-time updates
        if full_ticket:
            import logging

            logging.info(f"Broadcasting new ticket: {full_ticket.id}")
            await manager.broadcast(full_ticket.json())
        return full_ticket

    def _check_ticket_update_permissions(
        self, current_user: User, db_ticket: Ticket, ticket_in: TicketUpdate
    ):
        """
        Helper method to enforce role-based permissions for updating a ticket.
        Raises HTTPException if the current user does not have permission to perform certain updates.
        """
        is_admin_or_lider = current_user.role in ["Admin", "Lider"]
        if not is_admin_or_lider:
            update_data = ticket_in.dict(exclude_unset=True)
            # Prevent non-admin/lider users from changing ticket status
            if "estado" in update_data and update_data["estado"] != db_ticket.estado:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes permisos para cambiar el estado del ticket.",
                )
            # Prevent non-admin/lider users from reassigning the ticket
            if (
                "asignado_a_id" in update_data
                and update_data["asignado_a_id"] != db_ticket.asignado_a_id
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes permisos para reasignar el ticket.",
                )

    def update_ticket(
        self,
        db: Session,
        ticket_id: int,
        ticket_in: TicketUpdate,
        current_user: User,
        files: List[UploadFile],
    ) -> Optional[TicketInDB]:
        try:
            # Retrieve the existing ticket from the database
            db_ticket = ticket_repository.get(db, id=ticket_id)
            if not db_ticket:
                return None

            # Enforce role-based permissions for updating the ticket
            self._check_ticket_update_permissions(current_user, db_ticket, ticket_in)

            # Store old values of the ticket for audit logging purposes
            old_values = {
                c.name: getattr(db_ticket, c.name) for c in db_ticket.__table__.columns
            }

            # Update the ticket record in the database
            updated_ticket_db = ticket_repository.update(
                db, db_obj=db_ticket, obj_in=ticket_in
            )

            # Handle file uploads if any evidence files are provided
            for file in files:
                if file.filename:
                    # Generate a unique filename to prevent collisions
                    file_extension = file.filename.split(".")[-1]
                    unique_filename = f"{uuid.uuid4()}.{file_extension}"
                    file_path = f"uploads/{unique_filename}"

                    # Save the uploaded file to the specified path
                    with open(file_path, "wb") as buffer:
                        shutil.copyfileobj(file.file, buffer)

                    # Calculate SHA256 hash of the uploaded file for integrity verification
                    sha256_hash = hashlib.sha256()
                    with open(file_path, "rb") as f:
                        # Read file in chunks to handle large files efficiently
                        for byte_block in iter(lambda: f.read(4096), b""):
                            sha256_hash.update(byte_block)

                    # Create an Evidence record in the database for the uploaded file
                    evidence = Evidence(
                        ticket_id=updated_ticket_db.id,
                        nombre_archivo=file.filename,
                        ruta_almacenamiento=file_path,
                        hash_sha256=sha256_hash.hexdigest(),
                        subido_por_id=current_user.id,
                    )
                    db.add(evidence)
                    db.commit()  # Commit after adding each evidence to ensure it's linked
                    db.refresh(evidence)  # Refresh to get the ID

            # Create an audit log entry if there were significant changes
            new_values = {
                c.name: getattr(updated_ticket_db, c.name)
                for c in updated_ticket_db.__table__.columns
            }
            # Identify changes by comparing old and new values
            changes = {
                k: {"old": str(old_values[k]), "new": str(new_values[k])}
                for k, v in new_values.items()
                if old_values[k] != new_values[k]
            }

            # Summarize the changed fields for the audit log detail
            summary_of_changes = list(changes.keys())
            if "actualizado_en" in summary_of_changes:
                summary_of_changes.remove(
                    "actualizado_en"
                )  # Exclude 'actualizado_en' as it changes on every update

            if summary_of_changes:  # Only log if there are actual changes
                audit_log_data = AuditLogBase(
                    entidad="Ticket",
                    entidad_id=updated_ticket_db.id,
                    actor_id=current_user.id,
                    accion="Actualización de Ticket",
                    detalle=json.dumps({"cambios": changes}),
                )
                audit_log_repository.create(db, obj_in=audit_log_data)

            # Retrieve the full updated ticket details
            full_ticket = self.get_ticket(
                db, ticket_id=updated_ticket_db.id, current_user_id=current_user.id
            )

            # Broadcast the updated ticket information via WebSocket for real-time updates
            if full_ticket:
                import asyncio

                asyncio.create_task(manager.broadcast(full_ticket.json()))
            return full_ticket
        except Exception as e:
            import traceback

            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"An unexpected error occurred in update_ticket: {e}",
            )

    def delete_ticket(
        self, db: Session, ticket_id: int, current_user_id: int
    ) -> Optional[TicketInDB]:
        # Retrieve the ticket to be deleted to include its summary in the audit log
        ticket_to_delete = self.get_ticket(
            db, ticket_id=ticket_id, current_user_id=current_user_id
        )
        if not ticket_to_delete:
            return None

        # Create an audit log entry before actually deleting the ticket
        audit_log_data = AuditLogBase(
            entidad="Ticket",
            entidad_id=ticket_id,
            actor_id=current_user_id,
            accion="Eliminación de Ticket",
            detalle=json.dumps({"resumen": ticket_to_delete.resumen}),
            timestamp=datetime.utcnow(),
        )
        audit_log_repository.create(db, obj_in=audit_log_data)

        # Proceed with deleting the ticket from the database
        ticket_repository.remove(db, id=ticket_id)
        # Return the object we fetched before deleting, as the actual deletion returns None
        return ticket_to_delete


ticket_service = TicketService()
