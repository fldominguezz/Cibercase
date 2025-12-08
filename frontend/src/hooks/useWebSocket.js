import { useEffect, useState, useRef } from 'react';

const useWebSocket = (url) => {
  const [message, setMessage] = useState(null);
  const ws = useRef(null);

  // Obtener el token fuera del useEffect para que pueda ser una dependencia
  const token = localStorage.getItem('token'); 

  useEffect(() => {
    // Solo intentar conectar si hay un token
    if (!token) {
      console.log('No token available for WebSocket connection.');
      // Asegurarse de cerrar cualquier conexión existente si el token desaparece
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
      return; // No intentar conectar sin token
    }

    let wsUrl = url;
    wsUrl = `${url}?token=${token}`; // Siempre adjuntar el token si existe

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.current.onmessage = (event) => {
      setMessage(JSON.parse(event.data));
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
    };
  }, [url, token]); // Añadir token a las dependencias

  return [message, setMessage];
};

export default useWebSocket;