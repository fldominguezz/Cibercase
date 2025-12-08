# Documentación del Frontend

El frontend es una Single Page Application (SPA) construida con React. Es la cara visible de la aplicación, consumiendo la API del backend para mostrar datos y permitir la interacción del usuario.

## Stack Tecnológico

-   **Librería:** React 18
-   **Enrutamiento:** `react-router-dom`
-   **Gráficos:** `chart.js` y `react-chartjs-2`
-   **Estilos:** Bootstrap 5 y archivos CSS personalizados.
-   **Llamadas a API:** `fetch` API nativa.

## Estructura de Componentes

El directorio `src/` contiene todos los componentes, organizados por funcionalidad:

```
src/
├── api/              # Módulo centralizado para las llamadas a la API del backend
│   └── api.js
├── assets/           # Imágenes, fuentes y otros archivos estáticos
├── components/       # Componentes reutilizables (botones, modales, etc.)
├── contexts/         # Contextos de React para el estado global (ej. AuthContext)
├── pages/            # Componentes que representan una página completa (Home, Login, Tickets)
├── styles/           # Archivos CSS globales y específicos de componentes
├── App.js            # Componente raíz que gestiona el enrutamiento
└── index.js          # Punto de entrada de la aplicación React
```

### Componentes Principales (`pages/`)

-   **`Login.js`**: Maneja la autenticación del usuario.
-   **`Home.js`**: El dashboard principal. Muestra KPIs, gráficos y listas de tickets.
-   **`Tickets.js`**: Muestra la lista completa de tickets, con filtros y paginación. Permite ver el detalle de un ticket.
-   **`TicketDetail.js`**: Vista detallada de un ticket individual, con su historial y alertas asociadas.
-   **`AdminPanel.js`**: Panel de administración para gestionar usuarios y otras configuraciones del sistema.

## Gestión de Estado

La aplicación utiliza una combinación de:
1.  **Estado Local (`useState`, `useReducer`):** Para el estado que pertenece a un único componente.
2.  **Context API (`useContext`):** Para el estado global que necesita ser compartido entre componentes, como la información del usuario autenticado (`AuthContext`).

## Interacción con la API

Toda la comunicación con el backend está centralizada en el módulo `src/api/api.js`. Este módulo exporta funciones para cada endpoint (ej. `login`, `readTickets`, `createTicket`), manejando la autenticación (adjuntando el token JWT) y el formato de las respuestas.

## Desarrollo Local

1.  **Instalar dependencias:**
    ```bash
    cd frontend/
    npm install
    ```

2.  **Iniciar el servidor de desarrollo:**
    Esto levantará la aplicación en `http://localhost:3000` con hot-reloading.
    ```bash
    npm start
    ```
    *Nota: Se espera que el backend esté corriendo en `http://localhost` para que las llamadas a la API funcionen.*

## Ejecución de Pruebas

Para ejecutar las pruebas del frontend:
```bash
npm test
```
