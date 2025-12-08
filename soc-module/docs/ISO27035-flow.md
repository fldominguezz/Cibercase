# Flujo de Gestión de Incidentes (ISO/IEC 27035)

Este documento describe el flujo de gestión de incidentes siguiendo las fases de la norma ISO/IEC 27035.

## 1. Planificación y Preparación

- **Políticas y Procedimientos:** Definición de políticas de seguridad de la información y procedimientos de gestión de incidentes.
- **Roles y Responsabilidades:** Asignación de roles (SOC Analyst, SOC Lead, DFIR) y sus responsabilidades.
- **Recursos:** Identificación y provisión de herramientas (SIEM, SOAR, Ticketing), personal y capacitación.
- **Comunicación:** Establecimiento de canales de comunicación interna y externa.

## 2. Detección y Reporte

- **Fuentes de Alerta:**
    - **Syslog:** Recepción de logs de FortiSIEM, FortiGate, FortiEDR.
    - **Webhooks:** Recepción de alertas de Automation Stitches de FortiGate.
    - **REST API:** (TODO) Polling de FortiSIEM/FAZ.
- **Normalización:** Parseo y normalización de eventos a un esquema común (`event_raw` en la DB).
- **Detección:** Identificación de eventos que superan umbrales o coinciden con reglas de correlación.
- **Reporte:** Creación automática de `EventRaw` y posterior procesamiento para generar `Incident` en el sistema de tickets.

## 3. Evaluación y Decisión

- **Clasificación:** Categorización del incidente (Malware, Phishing, etc.) y subcategorización.
- **Priorización:** Asignación de criticidad (Sev1-Sev4) y prioridad (P1-P4) basada en impacto y urgencia.
- **Cálculo de SLA:** Determinación de los tiempos de respuesta y resolución (`due_at`) según la política de SLA.
- **Análisis Inicial:** Verificación de la validez del incidente, eliminación de falsos positivos.

## 4. Respuesta al Incidente

- **Asignación:** Asignación automática del incidente a un analista o grupo (N1, N2, N3, DFIR) según reglas predefinidas.
- **Contención:** Implementación de medidas para limitar el alcance y el impacto del incidente (ej. bloqueo de IP, aislamiento de host).
- **Erradicación:** Eliminación de la causa raíz del incidente (ej. eliminación de malware, parcheo de vulnerabilidad).
- **Recuperación:** Restauración de los sistemas y servicios afectados a su estado operativo normal.
- **Runbooks y Playbooks:** Utilización de guías predefinidas para la respuesta a tipos específicos de incidentes.

## 5. Lecciones Aprendidas

- **Análisis Post-Incidente:** Revisión del incidente, incluyendo la causa raíz, la efectividad de la respuesta y el impacto.
- **Identificación de Mejoras:** Identificación de áreas de mejora en políticas, procedimientos, herramientas y capacitación.
- **Actualización de Documentación:** Actualización de runbooks, playbooks y políticas.
- **Reporte:** Generación de informes para la dirección y otras partes interesadas.

## Flujo de Datos Personales (Ley 25.326 / AAIP Disposición 47/2018)

- **Detección de Datos Personales:** Si un incidente involucra datos personales (`is_personal_data_affected = true`).
- **Checklist:** Disparo de un checklist específico para evaluar el alcance y las medidas de mitigación.
- **Informe DPO/Legal:** Generación de informe para el Responsable de Protección de Datos (DPO) o el equipo legal.
- **Notificación:** Preparación de plantillas de notificación a los titulares de datos y a la AAIP (si corresponde).
- **Retención Extendida:** Marcar evidencia para retención extendida y aplicar restricciones de acceso.
