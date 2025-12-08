# Runbook: Exfiltración de Datos a través de Canales Alternativos (T1048.001)

**MITRE ATT&CK Tactic:** Exfiltration (TA0010)
**MITRE ATT&CK Technique:** Exfiltration Over Alternative Protocol (T1048.001)
**Severidad:** Alta (Sev1/Sev2)
**Prioridad:** P1/P2

---

## 1. Detección

**Indicadores de Compromiso (IOCs):**
- Tráfico de red inusual a destinos externos no autorizados (ej. DNS tunneling, ICMP tunneling, tráfico a puertos no estándar).
- Uso de protocolos no comunes para transferencia de datos (ej. FTP, SCP, SMB a destinos externos).
- Alertas de DLP (Data Loss Prevention) sobre transferencia de archivos sensibles.
- Actividad inusual de usuarios (ej. acceso a archivos fuera de horario, descarga masiva de datos).
- Alertas de EDR/SIEM sobre ejecución de herramientas de exfiltración (ej. `nc`, `socat`, `dnscat2`).

**Fuentes de Detección:**
- SIEM (FortiSIEM, otros)
- Firewall (FortiGate)
- EDR (FortiEDR)
- Proxies web
- Logs de DNS
- Logs de servidores de archivos

## 2. Contención

**Objetivo:** Detener la exfiltración de datos y limitar el daño.

**Pasos:**
1.  **Aislar el sistema comprometido:**
    - Desconectar el host de la red (aislamiento de red en FortiEDR/FortiGate).
    - Bloquear la dirección IP de origen/destino en el firewall.
2.  **Bloquear canales de exfiltración:**
    - Bloquear los puertos y protocolos no autorizados en el firewall/proxy.
    - Actualizar reglas de DLP para prevenir futuras exfiltraciones.
3.  **Suspender cuentas de usuario:**
    - Deshabilitar o suspender las cuentas de usuario involucradas en la exfiltración.
4.  **Captura de tráfico (PCAP):**
    - Si es posible, iniciar una captura de paquetes en el segmento de red afectado para análisis forense.

## 3. Erradicación

**Objetivo:** Eliminar la causa raíz de la exfiltración.

**Pasos:**
1.  **Análisis Forense:**
    - Realizar un análisis forense completo del sistema comprometido para identificar la vulnerabilidad, el malware o la técnica utilizada.
    - Identificar el alcance de los datos exfiltrados.
2.  **Eliminar malware/amenaza:**
    - Eliminar cualquier malware o herramienta de exfiltración encontrada.
    - Parchear vulnerabilidades explotadas.
3.  **Cambio de credenciales:**
    - Forzar el cambio de contraseñas de todas las cuentas comprometidas.
4.  **Reforzar configuraciones:**
    - Revisar y reforzar las configuraciones de seguridad en sistemas y redes.

## 4. Recuperación

**Objetivo:** Restaurar los sistemas y datos a su estado normal.

**Pasos:**
1.  **Restaurar datos:**
    - Si los datos fueron alterados o eliminados, restaurarlos desde backups limpios.
2.  **Reconstruir sistemas:**
    - Si el sistema está gravemente comprometido, reconstruirlo desde una imagen limpia.
3.  **Monitoreo:**
    - Implementar monitoreo adicional para detectar cualquier actividad anómala post-recuperación.
4.  **Verificación:**
    - Confirmar que la exfiltración ha cesado y que los sistemas están operando normalmente.

## 5. Lecciones Aprendidas

**Objetivo:** Prevenir futuros incidentes similares.

**Pasos:**
1.  **Análisis Post-Incidente:**
    - Documentar el incidente, la respuesta y las lecciones aprendidas.
    - Identificar brechas en controles de seguridad, políticas o procedimientos.
2.  **Mejoras:**
    - Implementar mejoras en la seguridad (ej. nuevas reglas de firewall, actualización de DLP, capacitación de usuarios).
    - Actualizar runbooks y playbooks.
3.  **Comunicación:**
    - Compartir las lecciones aprendidas con equipos relevantes.

---

**Artefactos a Recopilar:**
- Logs de firewall, SIEM, EDR, DNS, proxy.
- Capturas de paquetes (PCAP).
- Hashes de archivos sospechosos.
- Imágenes forenses de discos.
- Reportes de análisis de malware/sandbox.
