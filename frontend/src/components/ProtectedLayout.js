import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'; // Import useNavigate
import Navbar from './Navbar';
import { toast } from 'react-toastify'; // Import toast
import { useWebSocketContext, WebSocketProvider } from '../context/WebSocketContext'; // Import WebSocketProvider

const ProtectedLayout = () => {
  const isAuthenticated = !!localStorage.getItem('token');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const location = useLocation();
  const navigate = useNavigate(); // Initialize useNavigate
  const latestMessage = useWebSocketContext(); // Get latest message from WebSocket context

  useEffect(() => {
    document.body.className = document.documentElement.className = theme === 'dark' ? 'dark-mode' : 'light-mode';
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme, location.pathname]);

  useEffect(() => {
    if (latestMessage && latestMessage.type === 'notification') {
        toast.info(latestMessage.data.message, {
            onClick: () => {
                if (latestMessage.data.link) {
                    navigate(latestMessage.data.link); // Use navigate for internal routing
                }
            }
        });
    }
  }, [latestMessage, navigate]); // Depend on latestMessage and navigate

  const toggleTheme = () => {
    setTheme((curr) => (curr === 'light' ? 'dark' : 'light'));
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <WebSocketProvider>
      <div className="page-wrapper">
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        <main className="container-fluid mt-4">
          <Outlet context={{ theme }} />
        </main>
        <footer className="app-footer mt-auto py-3">
          <div className="container-fluid text-center">
            <span className="app-footer-text">Versión: v2.1</span>
          </div>
        </footer>
      </div>
    </WebSocketProvider>
  );
};

export default ProtectedLayout;
