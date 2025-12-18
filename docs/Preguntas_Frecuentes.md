# Preguntas Frecuentes (FAQ) de CiberCase

Este documento recopila preguntas frecuentes y sus respuestas sobre la instalación, uso, desarrollo y aspectos generales de la aplicación CiberCase.

---

## 1. Instalación y Configuración

### P: ¿Cuáles son los requisitos previos para instalar CiberCase?
**R:** Necesitas tener **Docker**, **Docker Compose** y **Git** instalados en tu sistema. Se recomienda un entorno de servidor Linux.

### P: ¿Cómo instalo CiberCase en mi máquina local o servidor?
**R:**
1.  Clona el repositorio: `git clone https://github.com/fldominguezz/CiberCase.git && cd CiberCase`
2.  Crea un archivo `.env` en la raíz del proyecto con las variables de entorno necesarias (ver `README.md` o la guía de configuración).
3.  Levanta la aplicación con Docker Compose: `docker-compose up --build -d`.

### P: ¿Qué variables de entorno necesito configurar en el archivo `.env`?
**R:** Las variables esenciales incluyen:
*   **Configuración de Base de Datos:** `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL`.
*   **Configuración de la Aplicación:** `SECRET_KEY` (generada de forma segura), `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`.
*   **Credenciales del Administrador Inicial:** `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
Consulta el `README.md` para un ejemplo.

### P: ¿Qué debo hacer si tengo problemas al levantar los servicios con Docker Compose?
**R:**
1.  Verifica los logs de los contenedores: `docker-compose logs -f`. Esto te mostrará errores específicos.
2.  Asegúrate de que el servicio Docker esté funcionando en tu sistema.
3.  Revisa la sintaxis de tu archivo `docker-compose.yml` y `docker-compose.env` para errores.
4.  Intenta detener y reconstruir limpiamente: `docker-compose down && docker-compose up --build`.

### P: ¿Por qué el archivo `.env` no debe subirse al repositorio Git?
**R:** El archivo `.env` contiene información sensible como contraseñas, claves secretas y configuraciones específicas de tu entorno. Subirlo a Git expondría estas credenciales, especialmente si el repositorio es público. Siempre asegúrate de que `.env` esté listado en `.gitignore`.

---

## 2. Uso de la Aplicación

### P: ¿Cómo accedo a CiberCase una vez que está desplegado?
**R:** Si estás en desarrollo local, puedes acceder a la interfaz de usuario en `http://localhost:3000`. En un servidor de producción, generalmente será `http://tu_servidor_ip:3000` o un dominio configurado con HTTPS.

### P: ¿Cómo creo un nuevo ticket?
**R:** Desde el frontend, navega a la sección de creación de tickets y rellena el formulario con los detalles del incidente o solicitud. Una vez enviado, se generará un nuevo ticket.

### P: ¿Cómo asigno un ticket a un analista?
**R:** Puedes editar un ticket existente a través de la interfaz de usuario. En el formulario de edición, encontrarás un campo para seleccionar el analista al que deseas asignar el ticket.

### P: ¿Cómo funciona el analizador de EML?
**R:** La aplicación incluye una herramienta para analizar archivos `.eml`. Subes el archivo, el backend lo procesa, extrae información clave como remitente, destinatario, asunto, cuerpo, adjuntos, y también extrae indicadores de compromiso (IOCs) como IPs, URLs y hashes. Estos IOCs pueden ser consultados en servicios de inteligencia de amenazas como VirusTotal para verificar su reputación.

### P: ¿Cómo se integra CiberCase con FortiSIEM?
**R:** CiberCase tiene un endpoint específico en el backend (`/api/v1/fortisiem-incident`) que está diseñado para recibir alertas de FortiSIEM. Configura FortiSIEM para enviar webhooks (generalmente POST requests con datos XML del incidente) a esta URL. El backend parseará la alerta y creará un ticket automáticamente.

### P: ¿Puedo usar CiberCase sin integrar FortiSIEM?
**R:** Sí, absolutamente. CiberCase es una plataforma de gestión de tickets funcional por sí misma. La integración con FortiSIEM es una característica para automatizar la ingestión de alertas, pero puedes crear y gestionar tickets manualmente a través del frontend sin esta integración.

### P: ¿Cómo recibo notificaciones en tiempo real en el dashboard?
**R:** El frontend establece una conexión persistente a través de WebSockets (`/api/v1/notifications/ws`) con el backend. Cuando se crea un nuevo ticket, se asigna uno a tu usuario, se añade un comentario relevante o ocurre un evento crítico, el backend envía una notificación instantánea a través de esta conexión, actualizando el dashboard en tiempo real.

---

## 3. Desarrollo y Contribución

### P: ¿Cómo puedo contribuir al proyecto CiberCase?
**R:** ¡Nos encantaría tu ayuda! Consulta la `Guía de Contribución` en la documentación (`docs/Guia_de_Contribucion.md`) para obtener detalles sobre cómo configurar tu entorno, seguir los estándares de código y el proceso para enviar Pull Requests.

### P: ¿Cómo ejecuto los tests del frontend?
**R:** Navega a la carpeta `frontend/` en tu terminal y ejecuta `npm test`. Esto ejecutará las pruebas unitarias y de integración del frontend.

### P: ¿Por qué el test `Login.test.js` no se ejecuta?
**R:** El archivo `Login.test.js` ha sido temporalmente deshabilitado (eliminado del proyecto) debido a un problema persistente de bajo nivel relacionado con la resolución de *sourcemaps* en el entorno de pruebas de Jest/React Scripts. A pesar de extensivos intentos de depuración y ajustes de configuración, el problema no se pudo resolver de inmediato. Esta es una deuda técnica reconocida que se espera abordar en el futuro. Actualmente, su eliminación permite que el resto del pipeline de CI/CD funcione sin interrupciones.

---

## 4. General

### P: ¿Qué tecnologías principales utiliza CiberCase?
**R:** CiberCase está construido con una pila moderna que incluye: **Python 3.10** y **FastAPI** para el backend, **React.js** para el frontend, **PostgreSQL** como base de datos, **Nginx** como proxy inverso y servidor web, y **Docker/Docker Compose** para la contenerización.

### P: ¿Dónde puedo encontrar más documentación sobre el proyecto?
**R:** Consulta la carpeta `docs/` en la raíz del repositorio. Allí encontrarás la `Arquitectura del Sistema`, `Diseño de la Base de Datos`, `APIs y Endpoints`, `Guía de Contribución`, y otras secciones de interés.
