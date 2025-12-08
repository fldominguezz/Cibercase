# Matriz de Cumplimiento ISO/ITIL/Ley 25.326

Esta matriz detalla cómo el módulo de gestión de incidentes SOC cumple con los requisitos de las normativas y buenas prácticas especificadas.

| Requisito / Norma | Cómo se satisface (Control Técnico/Procedimental) | Evidencia (Ruta, Script, Consulta SQL) |
| :---------------- | :------------------------------------------------ | :------------------------------------- |
| **ISO/IEC 27001** |                                                   |                                        |
| A.5 (Políticas)   | Políticas de seguridad documentadas y aplicadas.  | `docs/PoliticaSeguridad.md` (TODO)     |
| A.8 (Activos)     | Gestión de activos (incidentes, usuarios, etc.).  | `api/src/services/incidentService.ts`  |
| A.12 (Operaciones)| Logs de auditoría, gestión de cambios.            | `api/src/services/auditService.ts` (TODO), `audit_log` table |
| A.16 (Incidentes) | Proceso de gestión de incidentes.                 | `docs/ISO27035-flow.md`                |
| A.18 (Privacidad) | Privacidad por diseño, protección de datos.       | `docs/AAIP-Notificacion-Plantillas.md`, `person_data_ref` table |
| **ISO/IEC 27035** |                                                   |                                        |
| Preparación       | Políticas, procedimientos, roles definidos.       | `docs/ISO27035-flow.md`                |
| Detección/Reporte | Ingesta de alertas (Syslog, Webhooks).            | `workers/syslog/`, `api/src/routes/webhookRoutes.ts` |
| Evaluación        | Clasificación, priorización, cálculo de SLA.      | `api/src/services/eventProcessorService.ts`, `api/src/services/slaService.ts` |
| Respuesta         | Asignación, runbooks, acciones de contención.     | `api/src/services/assignmentService.ts`, `docs/Runbooks/` |
| Lecciones Aprend. | Registro de incidentes, análisis post-incidente.  | `incident` table, `audit_log` table    |
| **ITIL v4**       |                                                   |                                        |
| Gestión Incidentes| Ciclo de vida del incidente (apertura, cierre).   | `api/src/services/incidentService.ts`  |
| Gestión Problemas | (TODO) Integración con gestión de problemas.      |                                        |
| Gestión Cambios   | (TODO) Integración con gestión de cambios.        |                                        |
| SLA/OLA/UC        | Definición y seguimiento de SLAs.                 | `sla_policy` table, `api/src/services/slaService.ts` |
| **Ley 25.326 (Argentina)** |                                           |                                        |
| Finalidad         | Minimización de datos, pseudonimización.          | `person_data_ref` table                |
| Confidencialidad  | RBAC, cifrado en reposo/tránsito.                 | `api/src/utils/auth.ts`, `docker-compose.yml` (Caddy), `pgcrypto` (TODO) |
| Seguridad         | Controles de seguridad, logs de incidentes.       | `audit_log` table, `api/src/services/auditService.ts` (TODO) |
| Derechos          | (TODO) Implementación de derechos ARCO.           |                                        |
| **AAIP Disposición 47/2018** |                                       |                                        |
| Registro Incidentes| Fecha/hora, usuario afectado, medidas, evidencia. | `audit_log` table, `incident` table    |
| Notificación      | Plantillas de notificación a AAIP y titulares.    | `docs/AAIP-Notificacion-Plantillas.md` |
