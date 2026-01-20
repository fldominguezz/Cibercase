import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { toast } from 'react-toastify';
import { useWebSocketContext, WebSocketProvider } from '../context/WebSocketContext';
import UpdateNotification from './UpdateNotification';
import { apiFetch } from '../api'; // <-- ADDED THIS to fetch user details

const ProtectedLayout = () => {
  const isAuthenticated = !!localStorage.getItem('token');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const location = useLocation();
  const navigate = useNavigate();
  const latestMessage = useWebSocketContext();
  const [currentUser, setCurrentUser] = useState(null); // State to store current user
  const [backendAppVersion, setBackendAppVersion] = useState("Cargando..."); // <-- ADDED THIS STATE

  const fetchCurrentUser = useCallback(async () => {
    try {
      const data = await apiFetch('/auth/me');
      setCurrentUser(data);
    } catch (err) {
      console.error("Failed to fetch current user for UpdateNotification", err);
      // If fetching user fails and they are supposedly authenticated, it might mean token is invalid
      // In a real app, you might want to force logout here
      if (isAuthenticated) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  }, [isAuthenticated, navigate]);

  // <-- ADDED THIS useEffect to fetch backend version
  const fetchBackendAppVersion = useCallback(async () => {
    try {
        const version = await apiFetch('/system/version'); // Use the new endpoint
        setBackendAppVersion(version);
    } catch (err) {
        console.error("Failed to fetch backend application version", err);
        setBackendAppVersion("Error al cargar versión");
    }
  }, []);

  useEffect(() => {
    document.body.className = document.documentElement.className = theme === 'dark' ? 'dark-mode' : 'light-mode';
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme, location.pathname]);

  useEffect(() => {
    // Fetch user on mount and when location changes
    if (isAuthenticated) {
        fetchCurrentUser();
        fetchBackendAppVersion(); // <-- Call to fetch backend version
    }
  }, [isAuthenticated, fetchCurrentUser, fetchBackendAppVersion, location.pathname]); // Depend on isAuthenticated, fetchCurrentUser, and location.pathname

  useEffect(() => {
    if (latestMessage && latestMessage.type === 'notification') {
        toast.info(latestMessage.data.message, {
            onClick: () => {
                if (latestMessage.data.link) {
                    navigate(latestMessage.data.link);
                }
            }
        });
    }
  }, [latestMessage, navigate]);

  const toggleTheme = () => {
    setTheme((curr) => (curr === 'light' ? 'dark' : 'light'));
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (isAuthenticated && !currentUser) {
      return (
          <div className="text-center mt-5">
              <div className="spinner-border" role="status">
                  <span className="visually-hidden">Cargando usuario...</span>
              </div>
          </div>
      );
  }

  return (
    <WebSocketProvider>
      <div className="page-wrapper">
        {currentUser && <UpdateNotification currentUser={currentUser} />} {/* Conditionally render UpdateNotification */}
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        <main className="container-fluid mt-4">
          <Outlet context={{ theme }} />
        </main>
        <footer className="app-footer mt-auto py-3">
          <div className="container-fluid text-center">
            <span className="app-footer-text">Versión: v{backendAppVersion}</span> {/* <-- CHANGED THIS */}
          </div>
        </footer>
      </div>
    </WebSocketProvider>
  );
};

export default ProtectedLayout;
