# Arquitectura del Sistema: Gestor Inteligente de Tickets para SOC (CiberCase)

Este documento describe la arquitectura de alto nivel del Gestor Inteligente de Tickets para SOC (CiberCase), una solución diseñada para optimizar la gestión de incidentes de seguridad mediante la centralización, enriquecimiento y automatización de alertas. La arquitectura se basa en principios de microservicios y contenerización para asegurar escalabilidad, mantenibilidad y robustez.

## 1. Visión General

CiberCase es una aplicación web de pila completa que integra un backend API RESTful, un frontend interactivo, una base de datos persistente y componentes de comunicación en tiempo real. Está diseñada para procesar alertas de sistemas de gestión de eventos e información de seguridad (SIEM), transformarlas en tickets accionables y presentarlas a los analistas de SOC a través de un dashboard dinámico.

## 2. Componentes Principales

La aplicación se compone de los siguientes módulos y tecnologías clave:

### 2.1. Frontend (React.js)
*   **Tecnología:** Desarrollado con React.js (Create React App).
*   **Propósito:** Proporciona la interfaz de usuario (UI) para la interacción de los analistas de SOC. Incluye el dashboard, la vista de tickets, el analizador de EML y las páginas de administración.
*   **Características:**
    *   Dashboard en tiempo real con KPIs y gráficos interactivos (Chart.js).
    *   Gestión completa del ciclo de vida de los tickets.
    *   Módulo de analizador de EML con integración a VirusTotal.
    *   Comunicación en tiempo real con el backend vía WebSockets.

### 2.2. Backend (FastAPI - Python 3.10)
*   **Tecnología:** Construido con FastAPI, un framework web moderno y rápido para construir APIs con Python.
*   **Propósito:** Actúa como el cerebro de la aplicación, manejando la lógica de negocio, la interacción con la base de datos, la autenticación/autorización y la integración con sistemas externos.
*   **Características:**
    *   API RESTful para la gestión de tickets, usuarios, roles, auditoría y reportes.
    *   Endpoints específicos para la integración con FortiSIEM (recepción de incidentes).
    *   Lógica para el procesamiento y enriquecimiento de alertas de seguridad.
    *   Manejo de WebSockets para la comunicación en tiempo real con el frontend.
    *   Autenticación basada en JWT (JSON Web Tokens).

### 2.3. Base de Datos (PostgreSQL)
*   **Tecnología:** PostgreSQL, un sistema de gestión de bases de datos relacionales de código abierto robusto y confiable.
*   **Propósito:** Almacena toda la información persistente del sistema, incluyendo detalles de tickets, alertas, usuarios, logs de auditoría, etc.

### 2.4. Servidor Web / Proxy Inverso (Nginx)
*   **Tecnología:** Nginx, un servidor web de alto rendimiento y proxy inverso.
*   **Propósito:** Sirve el contenido estático del frontend, actúa como proxy inverso para el backend (enrutando las solicitudes a la API de FastAPI) y maneja las conexiones WebSocket. Proporciona balanceo de carga básico y terminación SSL (si se configura).

### 2.5. Contenerización (Docker y Docker Compose)
*   **Tecnología:** Docker para la creación de contenedores y Docker Compose para la orquestación de múltiples contenedores.
*   **Propósito:** Facilita el desarrollo, despliegue y escalado de la aplicación al empaquetar cada componente en un contenedor aislado con sus dependencias. Docker Compose define y ejecuta la aplicación de múltiples contenedores con una configuración YAML simple.

### 2.6. Integraciones Externas
*   **FortiSIEM:** Sistema SIEM desde el cual se reciben las alertas de seguridad vía un endpoint específico en el backend.
*   **VirusTotal:** Servicio externo utilizado por el analizador de EML para verificar la reputación de hashes, dominios y URLs extraídos de los correos.

### 2.7. Comunicación en Tiempo Real (WebSockets)
*   **Tecnología:** Implementado a través del backend de FastAPI y utilizado por el frontend de React.
*   **Propósito:** Permite que el dashboard del SOC reciba actualizaciones instantáneas sobre nuevos tickets, cambios de estado y otras notificaciones críticas sin necesidad de recargar la página.

## 3. Flujo de Datos Típico

1.  **Recepción de Alertas:** FortiSIEM envía alertas de seguridad (en formato XML) a un endpoint HTTP específico del backend de FastAPI.
2.  **Procesamiento de Alertas:** El backend procesa la alerta, extrae información clave, la enriquece y crea un nuevo ticket en la base de datos PostgreSQL.
3.  **Notificación en Tiempo Real:** El backend utiliza WebSockets para notificar al frontend sobre la creación o actualización de tickets.
4.  **Visualización en Dashboard:** El frontend recibe la notificación WebSocket y actualiza el dashboard en tiempo real, mostrando el nuevo ticket o el cambio de estado.
5.  **Interacción del Analista:** Los analistas utilizan la interfaz de React para ver, editar, asignar y cerrar tickets. Las acciones del analista se comunican al backend vía la API RESTful.
6.  **Análisis de EML:** Un analista puede cargar un archivo EML en el frontend. El frontend envía el archivo al backend, que extrae IOCs y los consulta en VirusTotal. Los resultados se devuelven al frontend para su visualización.

## 4. Diagrama de Arquitectura Conceptual

```
+-------------------+                                                                     +-----------------+
|   FortiSIEM       |                                                                     |   VirusTotal    |
| (Sistema SIEM)    |                                                                     | (Análisis IOCs) |
+---------+---------+                                                                     +--------+--------+
          | (Alertas)                                                                              ^
          | HTTP/S                                                                                 | HTTP/S
          v                                                                                        |
+----------------------------------------------------------------------------------------------------------------+
|                                      Contenedores Docker (Docker Compose)                              |
|                                                                                                                |
|   +--------------------------------------------------------------------+       +------------------------------+  |
|   |                      Nginx (Proxy Inverso / Web Server)            |       |    FastAPI Backend (Python)  |  |
|   |  - Sirve Frontend Estático                                         |<----->|  - Lógica de Negocio         |  |
|   |  - Proxy a Backend API                                             | HTTP/S|  - Gestión de Tickets/Alertas|  |
|   |  - Proxy a WebSockets                                              |       |  - Auth (JWT)                |  |
|   +------------------------------------+-------------------------------+       |  - WebSockets (Servidor)     |  |
|                                        ^                               |       |  - Integración FortiSIEM/VT  |  |
|                                        | HTTP/S                         |       +------------------------------+  |
|                                        v                               |                     |
|   +--------------------------------------------------------------------+                     | SQL
|   |                      React Frontend (Web UI)                       |                     v
|   |  - Dashboard en Tiempo Real                                        |       +------------------------------+  |
|   |  - Vistas de Tickets                                               |       |    PostgreSQL Database       |  |
|   |  - Analizador de EML                                               |<----->|  - Datos de Tickets          |  |
|   |  - WebSockets (Cliente)                                            |       |  - Usuarios, Auditoría       |  |
|   +--------------------------------------------------------------------+       +------------------------------+  |
|                                                                                                                |
+----------------------------------------------------------------------------------------------------------------+
```
