import os
import sys
import xml.etree.ElementTree as ET
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Boolean,
)
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import pytz

# --- Database Configuration (copied from backend/core/config.py) ---
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://user:password@db:5432/ticketing_db"
)

# --- Timezone Configuration (copied from backend/core/config.py) ---
ARGENTINA_TIMEZONE = pytz.timezone("America/Argentina/Buenos_Aires")

# --- SQLAlchemy Setup (simplified from backend/db/base.py and backend/db/session.py) ---
Base = declarative_base()
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# --- Database Models (simplified from backend/db/models.py for Ticket) ---
class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_uid = Column(String, unique=True, index=True)
    estado = Column(String, default="Nuevo")
    severidad = Column(String, default="Baja")
    resumen = Column(String, index=True)
    descripcion = Column(Text)
    impacto = Column(String, nullable=True)
    causa_raiz = Column(String, nullable=True)
    reportado_por_id = Column(Integer, ForeignKey("users.id"))
    asignado_a_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    sla_vencimiento = Column(DateTime, nullable=True)
    categoria = Column(String, nullable=True)
    resolucion = Column(Text, nullable=True)
    rule_name = Column(String, nullable=True)
    rule_description = Column(Text, nullable=True)
    rule_remediation = Column(Text, nullable=True)
    raw_logs = Column(Text, nullable=True)
    creado_en = Column(DateTime, default=datetime.utcnow)
    actualizado_en = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    cerrado_en = Column(DateTime, nullable=True)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    role = Column(String)
    password_hash = Column(String)
    is_active = Column(Boolean, default=True)


# --- parse_fortisiem_xml function (copied from backend/api/routers/fortisiem.py) ---
def parse_fortisiem_xml(xml_string: str):
    """
    Parsea el XML de FortiSIEM y extrae la información relevante.
    """
    try:
        root = ET.fromstring(xml_string)

        incident_id = root.get("incidentId", "N/A")
        severity = root.get("severity", "N/A")
        rule_name = root.findtext("name", "N/A")
        description = root.findtext("description", "No description provided.")
        remediation = root.findtext("remediation", "")
        incident_category = root.findtext("incidentCategory", "N/A")

        source_ip = "N/A"
        source_host = "N/A"
        incident_target = root.find("incidentTarget")
        if incident_target is not None:
            for entry in incident_target.findall("entry"):
                if entry.get("name") == "Host IP":
                    source_ip = entry.text
                elif entry.get("name") == "Host Name":
                    source_host = entry.text

        return {
            "incident_id": incident_id,
            "severity_num": severity,
            "rule_name": rule_name,
            "source_ip": source_ip,
            "source_host": source_host,
            "incident_category": incident_category,
            "description": description,
            "remediation": remediation,
            "raw_log": xml_string,
        }
    except ET.ParseError as e:
        print(f"Error al parsear XML de FortiSIEM: {e}", file=sys.stderr)
        return None  # Return None on parse error


# --- Main Update Logic ---
def update_all_tickets_from_raw_logs():
    db = SessionLocal()
    updated_count = 0
    try:
        all_tickets = db.query(Ticket).all()
        print(f"Found {len(all_tickets)} tickets in the database.")

        for ticket in all_tickets:
            if ticket.raw_logs:
                incident_info = parse_fortisiem_xml(ticket.raw_logs)
                if incident_info is None:
                    print(
                        f"Skipping ticket {ticket.id} due to XML parse error in raw_logs.",
                        file=sys.stderr,
                    )
                    continue

                # Construct the detailed description
                detailed_description = (
                    f"Incidente FortiSIEM:\n"
                    f"ID de incidente: {incident_info['incident_id']}\n"
                    f"Severidad: {incident_info['severity_num']}\n"
                    f"Regla disparada: {incident_info['rule_name']}\n"
                    f"IP origen: {incident_info['source_ip']}\n"
                    f"Dispositivo Fortinet: {incident_info['source_host']}\n"
                    f"Categoría de incidente: {incident_info['incident_category']}\n"
                    f"Motivo: {incident_info['description']}"
                )

                # Map severity number to a severity name for the ticket
                severity_num = int(incident_info.get("severity_num", 0))
                if severity_num >= 7:
                    severity_name = "Crítica"
                elif severity_num >= 5:
                    severity_name = "Alta"
                elif severity_num >= 3:
                    severity_name = "Media"
                else:
                    severity_name = "Baja"

                ticket.resumen = incident_info["rule_name"]
                ticket.descripcion = detailed_description
                ticket.severidad = severity_name
                ticket.categoria = incident_info["incident_category"]
                ticket.rule_name = incident_info["rule_name"]
                ticket.rule_description = incident_info["description"]
                ticket.rule_remediation = incident_info["remediation"]

                updated_count += 1
                print(f"Updated ticket {ticket.id} (UID: {ticket.ticket_uid})")
            else:
                print(
                    f"Skipping ticket {ticket.id} (UID: {ticket.ticket_uid}) - No raw_logs found."
                )

        db.commit()
        print(f"Successfully updated {updated_count} tickets.")
    except Exception as e:
        db.rollback()
        print(f"An error occurred during ticket update: {e}", file=sys.stderr)
    finally:
        db.close()


if __name__ == "__main__":
    print("Starting ticket update script...")
    update_all_tickets_from_raw_logs()
    print("Script finished.")
