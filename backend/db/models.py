from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    role = Column(String(20), nullable=False) # 'Analista', 'Lider', 'Auditor', 'Admin'
    password_hash = Column(String(255), nullable=False)
    two_fa_secret = Column(String(255))
    is_active = Column(Boolean, default=True)
    creado_en = Column(DateTime, default=datetime.utcnow)
    avatar_url = Column(String(512), nullable=True)
    session_id = Column(String(36), nullable=True)
    date_of_birth = Column(Date, nullable=True)

    comments = relationship("TicketComment", back_populates="owner")
    form_submissions = relationship("FormSubmission", back_populates="enviado_por")

class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(Integer, primary_key=True, index=True)
    ticket_uid = Column(String(20), unique=True, nullable=False, index=True)
    estado = Column(String(50), nullable=False, index=True)
    severidad = Column(String(50), nullable=False, index=True)
    resumen = Column(String(255), nullable=False)
    descripcion = Column(Text)
    impacto = Column(Text)
    causa_raiz = Column(Text)
    creado_en = Column(DateTime, default=datetime.utcnow, index=True)
    actualizado_en = Column(DateTime, onupdate=datetime.utcnow, index=True) # Added index
    cerrado_en = Column(DateTime)
    reportado_por_id = Column(Integer, ForeignKey("users.id"), index=True)
    asignado_a_id = Column(Integer, ForeignKey("users.id"), index=True)
    sla_vencimiento = Column(DateTime)
    categoria = Column(String(100), index=True)
    platform = Column(String(100), index=True, nullable=True)
    resolucion = Column(Text)
    rule_name = Column(String(255), nullable=True)
    rule_description = Column(Text, nullable=True)
    rule_remediation = Column(Text, nullable=True)
    raw_logs = Column(Text, nullable=True)

    comments = relationship("TicketComment", back_populates="ticket")

class TicketComment(Base):
    __tablename__ = "ticket_comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True) # Added index
    
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False, index=True) # Added index
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True) # Added index

    ticket = relationship("Ticket", back_populates="comments")
    owner = relationship("User", back_populates="comments")

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), index=True) # Added index
    fuente = Column(String(50), index=True) # Added index
    vendor = Column(String(50), index=True) # Added index
    producto = Column(String(50), index=True) # Added index
    tipo_evento = Column(String(100), index=True) # Added index
    severidad = Column(String(50), index=True) # Added index
    ip_origen = Column(String(45), index=True) # Added index
    ip_destino = Column(String(45), index=True) # Added index
    host_name = Column(String(255), index=True) # Added index
    usuario_afectado = Column(String(100), index=True) # Added index
    firma_id = Column(String(100), index=True) # Added index
    descripcion = Column(Text)
    raw_log = Column(Text)
    recibido_en = Column(DateTime, default=datetime.utcnow, index=True) # Added index
    correlacion_id = Column(String(100), index=True) # Added index

class Evidence(Base):
    __tablename__ = "evidence"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False, index=True) # Added index
    nombre_archivo = Column(String(255), nullable=False)
    ruta_almacenamiento = Column(String(512), nullable=False)
    hash_sha256 = Column(String(64), nullable=False)
    creado_en = Column(DateTime, default=datetime.utcnow, index=True) # Added index
    subido_por_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True) # Added index

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    entidad = Column(String(50), index=True) # Added index
    entidad_id = Column(Integer, nullable=True, index=True) # Added index
    actor_id = Column(Integer, ForeignKey("users.id"), index=True) # Added index
    accion = Column(String(100), nullable=False, index=True) # Added index
    detalle = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True) # Added index

class FormTemplate(Base):
    __tablename__ = "form_templates"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(255), nullable=False, index=True) # Added index
    descripcion = Column(Text)
    definicion_json = Column(Text, nullable=False) # Storing JSON as a string
    creado_en = Column(DateTime, default=datetime.utcnow, index=True) # Added index
    creado_por_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True) # Added index

    submissions = relationship("FormSubmission", back_populates="template")


class FormSubmission(Base):
    __tablename__ = "form_submissions"
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("form_templates.id"), nullable=False, index=True) # Added index
    datos_json = Column(Text, nullable=False) # Storing JSON as a string
    enviado_en = Column(DateTime, default=datetime.utcnow, index=True) # Added index
    enviado_por_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True) # Added index

    template = relationship("FormTemplate", back_populates="submissions")
    enviado_por = relationship("User", back_populates="form_submissions")

class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False, index=True) # Added index
    descripcion = Column(Text)

class Subgroup(Base):
    __tablename__ = "subgroups"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False, index=True) # Added index
    descripcion = Column(Text)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False, index=True) # Added index

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True) # Added index
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, index=True) # Added index
    created_at = Column(DateTime, default=datetime.utcnow, index=True) # Added index
    link = Column(String(512), nullable=True)

class Setting(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True) # Added index
    value = Column(String(255), nullable=False)