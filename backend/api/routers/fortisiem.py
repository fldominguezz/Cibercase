from datetime import datetime
from datetime import timezone, timedelta
from fastapi import APIRouter, Request, HTTPException, status, Depends
from fastapi.responses import PlainTextResponse
import logging
import xml.etree.ElementTree as ET
import re
import json
from typing import List, Optional

from sqlalchemy.orm import Session
from db.session import SessionLocal # Importar SessionLocal en lugar de get_db
from schemas.ticket import TicketCreate
from repositories.ticket_repository import ticket_repository
from repositories.audit_log_repository import audit_log_repository
from schemas.audit import AuditLogBase
from db.models import User
import pytz

router = APIRouter()
logger = logging.getLogger(__name__)

# Definir la dependencia get_db
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        
ARGENTINA_TIMEZONE = pytz.timezone('America/Argentina/Buenos_Aires')

def _map_category_from_rule_name(rule_name: str) -> str:
    """
    Intenta mapear una categoría basada en palabras clave en el nombre de la regla.
    """
    if not rule_name:
        return "N/A"

    rule_name_lower = rule_name.lower()
    
    # Mapeo de palabras clave a categorías
    category_map = {
        "brute force": "Security / Brute-Force",
        "bruteforce": "Security / Brute-Force",
        "login failed": "Security / Authentication",
        "failed login": "Security / Authentication",
        "port scan": "Security / Discovery",
        "scan": "Security / Discovery",
        "malware": "Security / Malicious Code",
        "virus": "Security / Malicious Code",
        "trojan": "Security / Malicious Code",
        "exploit": "Security / Exploit",
        "vulnerability": "Security / Exploit",
        "lateral movement": "Security / Lateral Movement",
        "policy violation": "Policy / Violation",
        "web access": "Web / Access",
        "denial of service": "Availability / DoS",
        "dos": "Availability / DoS",
    }

    for keyword, category in category_map.items():
        if keyword in rule_name_lower:
            return category
            
    return "General" # Categoria por defecto si no se encuentra mapeo


def _parse_fortisiem_xml(xml_string: str):
    """
    Parsea el XML de FortiSIEM y extrae la información relevante.
    """
    # Extract raw_log_content using regex
    raw_log_content = "" # Default empty
    raw_events_match = re.search(r'<rawEvents>(.*?)</rawEvents>', xml_string, re.DOTALL)
    if raw_events_match:
        raw_log_content = raw_events_match.group(1).strip()
        # Remove the rawEvents tag and its content from the XML string for ET.fromstring
        xml_string_for_parsing = re.sub(r'<rawEvents>.*?</rawEvents>', '', xml_string, flags=re.DOTALL)
    else:
        xml_string_for_parsing = xml_string # If no rawEvents, parse the original string

    logger.info(f"XML string for parsing (after rawEvents removal): \n{xml_string_for_parsing}")

    try:
        root = ET.fromstring(xml_string_for_parsing)
        
        incident_id = root.get('incidentId', 'N/A')
        severity = root.get('severity', 'N/A')
        rule_name = root.findtext('name', 'N/A')
        description = root.findtext('description', 'No description provided.')
        remediation = root.findtext('remediation', '')
        incident_category = root.get('incidentCategory', 'N/A') # FIX: Was findtext, should be get for attribute
        display_time = root.findtext('displayTime', None) # Extraer displayTime
        
        source_ip = 'N/A'
        source_host = 'N/A'
        destination_ip = 'N/A'
        firewall_action = 'N/A' # Default for FortiSIEM XML

        incident_target = root.find('incidentTarget')
        if incident_target is not None:
            for entry in incident_target.findall('entry'):
                if entry.get('name') == 'Host IP':
                    source_ip = entry.text
                elif entry.get('name') == 'Host Name':
                    source_host = entry.text
                elif entry.get('name') == 'Destination IP': # Assuming a "Destination IP" entry might exist
                    destination_ip = entry.text

        return {
            "incident_id": incident_id,
            "severity_num": severity,
            "rule_name": rule_name,
            "source_ip": source_ip,
            "source_host": source_host,
            "destination_ip": destination_ip, # Include destination_ip
            "firewall_action": firewall_action, # Include firewall_action
            "incident_category": incident_category,
            "description": description,
            "remediation": remediation,
            "raw_log": raw_log_content,
            "display_time": display_time,
        }
    except ET.ParseError as e:
        logger.error(f"Error al parsear XML de FortiSIEM: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato XML inválido: {e}"
        )

def _parse_fortigate_log(log_string: str):
    """
    Parsea un log de FortiGate en formato key-value, mejorado para manejar variaciones.
    """
    logger.info(f"Parsing FortiGate log: {log_string[:200]}...")
    
    log_dict = {}
    # Regex mejorado para encontrar key="value" (con comillas) o key=value (sin comillas)
    pattern = re.compile(r'(\w+)=("([^"]*)"|([^\s"]+))')
    matches = pattern.findall(log_string)
    for key, _, quoted_val, unquoted_val in matches:
        log_dict[key] = quoted_val if quoted_val else unquoted_val

    # Regex para encontrar [key]=value (formato específico de FortiSIEM)
    pattern_bracketed = re.compile(r'\[(\w+)\]=([^,\]]+)')
    matches_bracketed = pattern_bracketed.findall(log_string)
    for key, value in matches_bracketed:
        log_dict[key] = value.strip()

    # Mapear a la misma estructura que _parse_fortisiem_xml
    return {
        "incident_id": log_dict.get("logid", "N/A"),
        "severity_str": log_dict.get("level", "informational"),
        "rule_name": log_dict.get("profile", log_dict.get("msg", log_dict.get("phLogDetail", "N/A"))),
        "source_ip": log_dict.get("srcip", "N/A"),
        "source_host": log_dict.get("devname", log_dict.get("hostname", "N/A")),
        "destination_ip": log_dict.get("dstip", "N/A"),
        "firewall_action": log_dict.get("action", "N/A"),
        "incident_category": log_dict.get("catdesc", "N/A"),
        "description": log_dict.get("msg", log_dict.get("phLogDetail", "No description provided.")),
        "url": log_dict.get("url", "N/A"),
        "hostname": log_dict.get("hostname", "N/A"),
        "user": log_dict.get("user", "N/A"),
        "sentbyte": log_dict.get("sentbyte", "N/A"),
        "rcvdbyte": log_dict.get("rcvdbyte", "N/A"),
        "policyid": log_dict.get("policyid", "N/A"),
        "remediation": "",
        "raw_log": log_string,
    }

def extract_datetime_from_log(raw_log_content: str, current_year: int, fortisiem_display_time: Optional[str] = None) -> Optional[datetime]:
    """
    Extrae la fecha y hora de un string de log, intentando varios formatos.
    Prioriza fortisiem_display_time si se proporciona.
    """
    if fortisiem_display_time:
        try:
            time_str_without_tz = fortisiem_display_time.replace("ART", "").strip()
            naive_dt = datetime.strptime(time_str_without_tz, "%a %b %d %H:%M:%S %Y")
            localized_dt = ARGENTINA_TIMEZONE.localize(naive_dt, is_dst=None)
            return localized_dt.astimezone(timezone.utc)
        except ValueError:
            logger.warning(f"No se pudo parsear fortisiem_display_time: {fortisiem_display_time}. Intentando otros formatos.")

    # Unificar la búsqueda de fecha y hora para formatos con y sin comillas
    date_match = re.search(r'date="?(\d{4}-\d{2}-\d{2})"?', raw_log_content)
    time_match = re.search(r'time="?(\d{2}:\d{2}:\d{2})"?', raw_log_content)
    
    if date_match and time_match:
        combined_datetime_str = f"{date_match.group(1)} {time_match.group(1)}"
        try:
            naive_dt = datetime.strptime(combined_datetime_str, "%Y-%m-%d %H:%M:%S")
            localized_dt = ARGENTINA_TIMEZONE.localize(naive_dt, is_dst=None)
            return localized_dt.astimezone(timezone.utc)
        except ValueError:
            logger.warning(f"No se pudo parsear el formato YYYY-MM-DD HH:MM:SS: {combined_datetime_str}")

    month_day_time_match = re.search(r'([A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})', raw_log_content)
    if month_day_time_match:
        dt_str = f"{month_day_time_match.group(1)} {current_year}"
        try:
            naive_dt = datetime.strptime(dt_str, "%b %d %H:%M:%S %Y")
            localized_dt = ARGENTINA_TIMEZONE.localize(naive_dt, is_dst=None)
            return localized_dt.astimezone(timezone.utc)
        except ValueError:
            logger.warning(f"No se pudo parsear el formato Month Day HH:MM:SS: {dt_str}")

    return None

def parse_raw_log_content(raw_log_content: str) -> dict:
    is_xml = raw_log_content.strip().startswith('<')
    incident_info = {}
    severity_name = "Baja"

    if is_xml:
        incident_info = _parse_fortisiem_xml(raw_log_content)
        severity_num = int(incident_info.get('severity_num', 0))
        if severity_num >= 7:
            severity_name = "Crítica"
        elif severity_num >= 5:
            severity_name = "Alta"
        elif severity_num >= 3:
            severity_name = "Media"
        
        if incident_info.get('source_host') == 'N/A' and incident_info.get('raw_log'):
            hostname_match = re.search(r'\[hostName\]=([^,\]]+)', incident_info['raw_log'])
            if hostname_match:
                incident_info['source_host'] = hostname_match.group(1).strip()
    else:
        incident_info = _parse_fortigate_log(raw_log_content)
        severity_str = incident_info.get('severity_str', 'informational').lower()
        if severity_str in ['critical', 'alert', 'emergency']:
            severity_name = "Crítica"
        elif severity_str in ['high', 'error']:
            severity_name = "Alta"
        elif severity_str in ['medium', 'warning']:
            severity_name = "Media"

    incident_info['severity_name'] = severity_name
    event_description = incident_info.get('description', 'Descripción no disponible.')
    
    details = {
        "ID de Incidente": incident_info.get("incident_id"),
        "Regla Disparada": incident_info.get("rule_name"),
        "Categoría": incident_info.get("incident_category"),
        "Dispositivo Afectado": incident_info.get("source_host"),
        "IP Origen": incident_info.get("source_ip"),
        "IP Destino": incident_info.get("destination_ip"),
        "Usuario": incident_info.get("user"),
        "URL": incident_info.get("url"),
        "Hostname": incident_info.get("hostname"),
        "Acción de Firewall": incident_info.get("firewall_action"),
        "ID de Política": incident_info.get("policyid"),
        "Bytes Enviados": incident_info.get("sentbyte"),
        "Bytes Recibidos": incident_info.get("rcvdbyte"),
        "Remediación Sugerida": incident_info.get("remediation")
    }

    formatted_description = f"**Descripción del Evento:**\n{event_description}\n\n**Detalles Técnicos:**\n"
    for key, value in details.items():
        if value and str(value).strip() and str(value).strip() not in ['N/A', '']:
            formatted_description += f"**{key}:** {value}\n"

    incident_info['detailed_description'] = formatted_description.strip()
    return incident_info



@router.post("/fortisiem-incident", status_code=status.HTTP_200_OK)
async def receive_fortisiem_incident(request: Request, db: Session = Depends(get_db)):
    """
    Endpoint para recibir incidentes de FortiSIEM (XML) o FortiGate (key-value),
    parsearlos y crear un ticket.
    """
    try:
        body = await request.body()
        data = body.decode('utf-8')
        logger.info(f"Incidente recibido:\n{data[:1000]}") # Log first 1000 chars

        incident_data = parse_raw_log_content(data)
        
        admin_user = db.query(User).filter(User.email == "admin@example.com").first()
        creator_user_id = admin_user.id if admin_user else 1

        current_year = datetime.now().year
        created_at_from_log = extract_datetime_from_log(
            incident_data['raw_log'],
            current_year,
            fortisiem_display_time=incident_data.get('display_time')
        )
        
        final_created_at = created_at_from_log if created_at_from_log else datetime.now(timezone.utc)
        
        # Lógica para determinar la categoría
        category = incident_data.get("incident_category")
        if not category or category == "N/A":
            category = _map_category_from_rule_name(incident_data.get("rule_name", ""))

        ticket_create = TicketCreate(
            resumen=incident_data['rule_name'],
            descripcion=incident_data['detailed_description'],
            severidad=incident_data['severity_name'],
            estado="Nuevo",
            platform="FortiSIEM",
            categoria=category, # Usar la categoría determinada
            raw_logs=incident_data['raw_log'],
            reportado_por_id=creator_user_id,
            rule_name=incident_data['rule_name'],
            rule_description=incident_data.get('description', ''),
            rule_remediation=incident_data.get('remediation', ''),
            dispositivo_afectado=incident_data.get('source_host', 'N/A'),
            creado_en=final_created_at
        )

        new_ticket = ticket_repository.create_with_owner(db=db, obj_in=ticket_create, current_user_id=creator_user_id)

        audit_log_repository.create(db, obj_in=AuditLogBase(
            entidad="Ticket",
            entidad_id=new_ticket.id,
            actor_id=creator_user_id,
            accion="Creación de Ticket (SIEM)",
            detalle=json.dumps({
                "resumen": new_ticket.resumen,
                "source": "FortiSIEM/FortiGate"
            })
        ))

        logger.info(f"Ticket creado exitosamente con ID: {new_ticket.id}")

        return PlainTextResponse(f"Incidente recibido y ticket {new_ticket.id} creado.", status_code=status.HTTP_200_OK)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al procesar incidente: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno del servidor al procesar el incidente: {e}"
        )
