# Contexto de Negocio y Dominio: Gestor Inteligente de Tickets para SOC (CiberCase)

Este documento proporciona una visión general del entorno de negocio y el dominio de seguridad informática en el que opera la aplicación CiberCase. Entender este contexto es fundamental para comprender el propósito y la funcionalidad del sistema.

## 1. ¿Qué es un SOC (Security Operations Center)?

Un **Centro de Operaciones de Seguridad (SOC)** es una instalación centralizada que aloja un equipo de expertos en seguridad de la información responsables de monitorear, detectar, analizar y responder a incidentes de ciberseguridad. Su propósito principal es proteger a una organización contra amenazas, vulnerabilidades e incidentes de seguridad.

Las funciones principales de un SOC incluyen:
*   **Monitoreo y Detección:** Vigilancia continua de redes, sistemas y aplicaciones para identificar actividades anómalas o indicadores de compromiso.
*   **Análisis de Amenazas:** Investigación de alertas para determinar su veracidad, alcance e impacto.
*   **Respuesta a Incidentes:** Ejecución de planes y procedimientos para contener, erradicar y recuperar sistemas afectados por incidentes de seguridad.
*   **Gestión de Vulnerabilidades:** Identificación y mitigación proactiva de debilidades de seguridad.

## 2. Ciclo de Vida de la Gestión de Incidentes de Seguridad

La gestión de incidentes de seguridad es un proceso estructurado que un SOC sigue para manejar eventos de seguridad de manera efectiva. Aunque hay varias metodologías (ej. NIST, SANS), CiberCase apoya las siguientes fases:

1.  **Preparación:** Establecimiento de políticas, planes, herramientas y equipos.
2.  **Detección y Análisis:** Identificación de un evento y determinación si es un incidente de seguridad real. Aquí es donde CiberCase recibe alertas y crea tickets.
3.  **Contención, Erradicación y Recuperación:** Acciones para limitar el daño, eliminar la causa raíz y restaurar los sistemas a la normalidad. CiberCase ayuda en la asignación y seguimiento de estas acciones.
4.  **Actividad Post-Incidente:** Lecciones aprendidas, mejoras de procesos, comunicación. CiberCase contribuye con el registro y la auditoría.

## 3. Roles Clave en un SOC y su Apoyo en CiberCase

CiberCase está diseñado para facilitar las tareas de los siguientes roles:

*   **Analista de Seguridad (Nivel 1/2):**
    *   **Función:** Monitorea las herramientas de seguridad, clasifica y tria las alertas, investiga incidentes y ejecuta los primeros pasos de respuesta.
    *   **Apoyo de CiberCase:**
        *   Dashboard en tiempo real para visualizar nuevas alertas y el estado general.
        *   Listado de tickets, filtrado y búsqueda para gestionar su carga de trabajo.
        *   Funcionalidad para añadir comentarios y evidencas a los tickets durante la investigación.
        *   Analizador de EML para investigar correos de phishing.

*   **Líder de SOC / Cazador de Amenazas (Threat Hunter):**
    *   **Función:** Supervisa el rendimiento del SOC, maneja escalamientos, realiza análisis avanzados de amenazas, optimiza reglas de detección.
    *   **Apoyo de CiberCase:**
        *   Vistas de reportes y métricas para evaluar el rendimiento y las tendencias.
        *   Capacidad de actualizar y asignar tickets de mayor severidad.
        *   Acceso a logs de auditoría para revisión.

*   **Auditor:**
    *   **Función:** Revisa el cumplimiento de políticas, verifica los procesos de gestión de incidentes y audita los registros de seguridad.
    *   **Apoyo de CiberCase:**
        *   Módulo de logs de auditoría para rastrear todas las acciones importantes en el sistema.

*   **Administrador del Sistema:**
    *   **Función:** Gestiona usuarios, roles, configuraciones del sistema, mantenimiento.
    *   **Apoyo de CiberCase:**
        *   Funcionalidades administrativas (creación/edición de usuarios, restablecimiento de contraseñas, gestión de plantillas de formularios).

## 4. Conceptos Clave del Dominio

*   **Ticket:** Es la representación formal de un incidente de seguridad, una solicitud o un problema que requiere atención. Un ticket tiene un ciclo de vida, un estado, una severidad y es asignado a un analista.
*   **Alerta:** Una notificación generada automáticamente por una herramienta de seguridad (ej. un SIEM) cuando detecta una actividad sospechosa o una violación de política. Una alerta puede dar origen a uno o más tickets.
*   **Severidad:** Indica el nivel de impacto potencial o actual de un incidente. Típicamente categorizada como Baja, Media, Alta, Crítica.
*   **Estado del Ticket:** Describe la fase actual del ticket en el proceso de gestión de incidentes (ej. Nuevo, Abierto, En Progreso, Resuelto, Cerrado).
*   **SLA (Service Level Agreement):** Un acuerdo que define los tiempos objetivo de respuesta y resolución para diferentes tipos y severidades de tickets.
*   **IOCs (Indicators of Compromise):** Son artefactos forenses (ej. hashes de archivos, IPs maliciosas, URLs, nombres de dominio) que indican que un sistema ha sido comprometido.
*   **SIEM (Security Information and Event Management):** Es una solución de software que agrega y analiza datos de seguridad generados por dispositivos de red y aplicaciones. Permite la detección de amenazas y el cumplimiento normativo.

## 5. Integración con SIEM (FortiSIEM)

CiberCase se integra con FortiSIEM, lo que permite la ingestión automática de alertas de seguridad. Esto es crucial porque:
*   **Automatización:** Reduce la carga de trabajo manual de los analistas al crear tickets a partir de alertas de forma automática.
*   **Centralización:** Todas las alertas relevantes se consolidan en un único sistema de gestión de tickets, proporcionando una vista unificada de los incidentes.
*   **Eficiencia:** Agiliza el proceso de detección y respuesta al asegurar que las alertas se conviertan rápidamente en tickets accionables.

## 6. Análisis Forense de EML

El correo electrónico sigue siendo uno de los principales vectores de ataque para el phishing, el malware y otras amenazas. La herramienta de análisis de EML en CiberCase permite a los analistas:
*   **Inspeccionar Correos Sospechosos:** Desglosar la estructura de un correo electrónico sospechoso para examinar sus cabeceras, contenido y adjuntos.
*   **Extracción de IOCs:** Extraer automáticamente IPs, URLs, hashes de archivos para una investigación más profunda.
*   **Integración con Inteligencia de Amenazas:** Usar servicios como VirusTotal para verificar la reputación de los IOCs extraídos, acelerando la identificación de amenazas conocidas.
