# Diseño de la Base de Datos: CiberCase

Este documento detalla el esquema de la base de datos PostgreSQL utilizada por la aplicación CiberCase, incluyendo las tablas, sus columnas, tipos de datos, restricciones y relaciones.

## 1. Diagrama de Entidad-Relación (Conceptual)

```mermaid
erDiagram
    USERS ||--o{ TICKET_COMMENTS : "has"
    USERS ||--o{ FORM_SUBMISSIONS : "submits"
    USERS ||--o{ TICKETS : "reported_by"
    USERS ||--o{ TICKETS : "assigned_to"
    USERS ||--o{ AUDIT_LOGS : "performed_by"
    USERS ||--o{ FORM_TEMPLATES : "created_by"
    USERS ||--o{ EVIDENCE : "uploaded_by"
    USERS ||--o{ NOTIFICATIONS : "receives"

    TICKETS ||--o{ TICKET_COMMENTS : "has"
    TICKETS ||--o{ ALERTS : "is_associated_with"
    TICKETS ||--o{ EVIDENCE : "has"

    FORM_TEMPLATES ||--o{ FORM_SUBMISSIONS : "has"

    GROUPS ||--o{ SUBGROUPS : "has"

    USERS {
        INTEGER id PK
        VARCHAR(50) username UNIQUE
        VARCHAR(100) first_name
        VARCHAR(100) last_name
        VARCHAR(100) email UNIQUE
        VARCHAR(20) role
        VARCHAR(255) password_hash
        VARCHAR(255) two_fa_secret
        BOOLEAN is_active
        DATETIME creado_en
        VARCHAR(512) avatar_url
        VARCHAR(36) session_id
        DATE date_of_birth
    }

    TICKETS {
        INTEGER id PK
        VARCHAR(20) ticket_uid UNIQUE
        VARCHAR(50) estado
        VARCHAR(50) severidad
        VARCHAR(255) resumen
        TEXT descripcion
        TEXT impacto
        TEXT causa_raiz
        DATETIME creado_en
        DATETIME actualizado_en
        DATETIME cerrado_en
        INTEGER reportado_por_id FK "REFERENCES USERS(id)"
        INTEGER asignado_a_id FK "REFERENCES USERS(id)"
        DATETIME sla_vencimiento
        VARCHAR(100) categoria
        VARCHAR(100) platform
        TEXT resolucion
        VARCHAR(255) rule_name
        TEXT rule_description
        TEXT rule_remediation
        TEXT raw_logs
    }

    TICKET_COMMENTS {
        INTEGER id PK
        TEXT content
        DATETIME created_at
        INTEGER ticket_id FK "REFERENCES TICKETS(id)"
        INTEGER user_id FK "REFERENCES USERS(id)"
    }

    ALERTS {
        INTEGER id PK
        INTEGER ticket_id FK "REFERENCES TICKETS(id)"
        VARCHAR(50) fuente
        VARCHAR(50) vendor
        VARCHAR(50) producto
        VARCHAR(100) tipo_evento
        VARCHAR(50) severidad
        VARCHAR(45) ip_origen
        VARCHAR(45) ip_destino
        VARCHAR(255) host_name
        VARCHAR(100) usuario_afectado
        VARCHAR(100) firma_id
        TEXT descripcion
        TEXT raw_log
        DATETIME recibido_en
        VARCHAR(100) correlacion_id
    }

    EVIDENCE {
        INTEGER id PK
        INTEGER ticket_id FK "REFERENCES TICKETS(id)"
        VARCHAR(255) nombre_archivo
        VARCHAR(512) ruta_almacenamiento
        VARCHAR(64) hash_sha256
        DATETIME creado_en
        INTEGER subido_por_id FK "REFERENCES USERS(id)"
    }

    AUDIT_LOGS {
        INTEGER id PK
        VARCHAR(50) entidad
        INTEGER entidad_id
        INTEGER actor_id FK "REFERENCES USERS(id)"
        VARCHAR(100) accion
        TEXT detalle
        DATETIME timestamp
    }

    FORM_TEMPLATES {
        INTEGER id PK
        VARCHAR(255) nombre UNIQUE
        TEXT descripcion
        TEXT definicion_json
        DATETIME creado_en
        INTEGER creado_por_id FK "REFERENCES USERS(id)"
    }

    FORM_SUBMISSIONS {
        INTEGER id PK
        INTEGER template_id FK "REFERENCES FORM_TEMPLATES(id)"
        TEXT datos_json
        DATETIME enviado_en
        INTEGER enviado_por_id FK "REFERENCES USERS(id)"
    }

    GROUPS {
        INTEGER id PK
        VARCHAR(100) nombre UNIQUE
        TEXT descripcion
    }

    SUBGROUPS {
        INTEGER id PK
        VARCHAR(100) nombre
        TEXT descripcion
        INTEGER group_id FK "REFERENCES GROUPS(id)"
    }

    NOTIFICATIONS {
        INTEGER id PK
        INTEGER user_id FK "REFERENCES USERS(id)"
        TEXT message
        BOOLEAN is_read
        DATETIME created_at
        VARCHAR(512) link
    }

    SETTINGS {
        INTEGER id PK
        VARCHAR(100) key UNIQUE
        VARCHAR(255) value
    }
```

## 2. Descripción de Tablas

### USERS
Representa a los usuarios del sistema (analistas, líderes, auditores, administradores).
*   **`id`**: Identificador único del usuario (clave primaria).
*   **`username`**: Nombre de usuario (único).
*   **`first_name`**: Nombre.
*   **`last_name`**: Apellido.
*   **`email`**: Correo electrónico (único).
*   **`role`**: Rol del usuario ('Analista', 'Lider', 'Auditor', 'Admin').
*   **`password_hash`**: Hash de la contraseña.
*   **`two_fa_secret`**: Secreto para la autenticación de dos factores (opcional).
*   **`is_active`**: Indica si la cuenta está activa.
*   **`creado_en`**: Fecha y hora de creación del usuario.
*   **`avatar_url`**: URL del avatar del usuario.
*   **`session_id`**: ID de sesión actual (para seguimiento).
*   **`date_of_birth`**: Fecha de nacimiento.

### TICKETS
Almacena la información de los tickets de seguridad generados o gestionados.
*   **`id`**: Identificador único del ticket (clave primaria).
*   **`ticket_uid`**: Identificador único del ticket en formato legible (ej. TCK-2025-000001).
*   **`estado`**: Estado actual del ticket (ej. 'Nuevo', 'Abierto', 'En Proceso', 'Cerrado').
*   **`severidad`**: Nivel de severidad (ej. 'Crítica', 'Alta', 'Media', 'Baja', 'Informativa').
*   **`resumen`**: Breve resumen del incidente.
*   **`descripcion`**: Descripción detallada del incidente.
*   **`impacto`**: Impacto del incidente.
*   **`causa_raiz`**: Causa raíz identificada.
*   **`creado_en`**: Fecha y hora de creación.
*   **`actualizado_en`**: Última fecha y hora de actualización.
*   **`cerrado_en`**: Fecha y hora de cierre.
*   **`reportado_por_id`**: ID del usuario que reportó el ticket (clave foránea a `USERS.id`).
*   **`asignado_a_id`**: ID del usuario asignado al ticket (clave foránea a `USERS.id`).
*   **`sla_vencimiento`**: Fecha y hora de vencimiento del SLA.
*   **`categoria`**: Categoría del ticket.
*   **`platform`**: Plataforma de origen (ej. FortiSIEM, FortiGate).
*   **`resolucion`**: Descripción de la resolución del ticket.
*   **`rule_name`**: Nombre de la regla que generó la alerta (si aplica).
*   **`rule_description`**: Descripción de la regla.
*   **`rule_remediation`**: Pasos de remediación sugeridos por la regla.
*   **`raw_logs`**: Logs en formato crudo asociados al incidente.

### TICKET_COMMENTS
Almacena los comentarios asociados a cada ticket.
*   **`id`**: Identificador único del comentario (clave primaria).
*   **`content`**: Contenido del comentario.
*   **`created_at`**: Fecha y hora de creación del comentario.
*   **`ticket_id`**: ID del ticket al que pertenece el comentario (clave foránea a `TICKETS.id`).
*   **`user_id`**: ID del usuario que hizo el comentario (clave foránea a `USERS.id`).

### ALERTS
Almacena los detalles de las alertas recibidas de SIEM u otras fuentes.
*   **`id`**: Identificador único de la alerta (clave primaria).
*   **`ticket_id`**: ID del ticket asociado a esta alerta (clave foránea a `TICKETS.id`).
*   **`fuente`**: Fuente de la alerta (ej. FortiSIEM).
*   **`vendor`**: Proveedor del dispositivo/sistema.
*   **`producto`**: Producto específico.
*   **`tipo_evento`**: Tipo de evento de seguridad.
*   **`severidad`**: Severidad reportada por la fuente.
*   **`ip_origen`**: Dirección IP de origen.
*   **`ip_destino`**: Dirección IP de destino.
*   **`host_name`**: Nombre del host afectado.
*   **`usuario_afectado`**: Usuario involucrado en el evento.
*   **`firma_id`**: ID de la firma/regla de la alerta.
*   **`descripcion`**: Descripción de la alerta.
*   **`raw_log`**: Log crudo de la alerta.
*   **`recibido_en`**: Fecha y hora de recepción de la alerta.
*   **`correlacion_id`**: ID de correlación si múltiples alertas están relacionadas.

### EVIDENCE
Almacena información sobre las evidencias adjuntas a los tickets.
*   **`id`**: Identificador único de la evidencia (clave primaria).
*   **`ticket_id`**: ID del ticket al que se adjuntó la evidencia (clave foránea a `TICKETS.id`).
*   **`nombre_archivo`**: Nombre original del archivo.
*   **`ruta_almacenamiento`**: Ruta donde se almacena la evidencia.
*   **`hash_sha256`**: Hash SHA256 del archivo para integridad y búsqueda.
*   **`creado_en`**: Fecha y hora de subida.
*   **`subido_por_id`**: ID del usuario que subió la evidencia (clave foránea a `USERS.id`).

### AUDIT_LOGS
Registra todas las acciones significativas realizadas en el sistema para fines de auditoría.
*   **`id`**: Identificador único del log de auditoría (clave primaria).
*   **`entidad`**: Entidad afectada (ej. 'Ticket', 'User').
*   **`entidad_id`**: ID de la entidad afectada.
*   **`actor_id`**: ID del usuario que realizó la acción (clave foránea a `USERS.id`).
*   **`accion`**: Descripción de la acción realizada (ej. 'CREATE_TICKET', 'UPDATE_USER').
*   **`detalle`**: Detalles adicionales en formato JSON (ej. cambios específicos).
*   **`timestamp`**: Fecha y hora de la acción.

### FORM_TEMPLATES
Define las plantillas para formularios dinámicos que se pueden asociar a tickets o procesos.
*   **`id`**: Identificador único de la plantilla (clave primaria).
*   **`nombre`**: Nombre de la plantilla (único).
*   **`descripcion`**: Descripción de la plantilla.
*   **`definicion_json`**: Definición del formulario en formato JSON (ej. esquema de un formulario dinámico).
*   **`creado_en`**: Fecha y hora de creación.
*   **`creado_por_id`**: ID del usuario que creó la plantilla (clave foránea a `USERS.id`).

### FORM_SUBMISSIONS
Almacena las instancias de formularios completados basados en `FORM_TEMPLATES`.
*   **`id`**: Identificador único del envío del formulario (clave primaria).
*   **`template_id`**: ID de la plantilla de formulario utilizada (clave foránea a `FORM_TEMPLATES.id`).
*   **`datos_json`**: Datos enviados en formato JSON.
*   **`enviado_en`**: Fecha y hora del envío.
*   **`enviado_por_id`**: ID del usuario que envió el formulario (clave foránea a `USERS.id`).

### GROUPS
Define grupos de usuarios dentro de la organización.
*   **`id`**: Identificador único del grupo (clave primaria).
*   **`nombre`**: Nombre del grupo (único).
*   **`descripcion`**: Descripción del grupo.

### SUBGROUPS
Define subgrupos dentro de los grupos principales.
*   **`id`**: Identificador único del subgrupo (clave primaria).
*   **`nombre`**: Nombre del subgrupo.
*   **`descripcion`**: Descripción del subgrupo.
*   **`group_id`**: ID del grupo al que pertenece el subgrupo (clave foránea a `GROUPS.id`).

### NOTIFICATIONS
Almacena las notificaciones para los usuarios.
*   **`id`**: Identificador único de la notificación (clave primaria).
*   **`user_id`**: ID del usuario al que se dirige la notificación (clave foránea a `USERS.id`).
*   **`message`**: Contenido del mensaje.
*   **`is_read`**: Indica si la notificación ha sido leída.
*   **`created_at`**: Fecha y hora de creación de la notificación.
*   **`link`**: Enlace asociado a la notificación.

### SETTINGS
Almacena configuraciones clave-valor del sistema.
*   **`id`**: Identificador único de la configuración (clave primaria).
*   **`key`**: Clave de la configuración (única).
*   **`value`**: Valor de la configuración.
