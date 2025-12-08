import React, { createContext, useContext, useCallback } from 'react';
import useWebSocket from '../hooks/useWebSocket';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  // Replace with your backend WebSocket URL
  const WS_URL = process.env.NODE_ENV === 'production' 
    ? `wss://${window.location.host}/api/v1/ws/tickets`
    : `ws://backend:8000/api/v1/ws/tickets`;

  const [latestMessage, setLatestMessage] = useWebSocket(WS_URL);

  const consumeMessage = useCallback(() => {
    setLatestMessage(null);
  }, [setLatestMessage]);

  const contextValue = {
    latestMessage,
    consumeMessage
  };

  console.log("WebSocketProvider latestMessage:", latestMessage);

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  return useContext(WebSocketContext);
};