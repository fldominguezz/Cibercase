import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { apiFetch, getNotifications, getUnreadNotificationsCount, markNotificationAsRead } from '../api';
import Avatar from './Avatar';
import AvatarUploadModal from './AvatarUploadModal';
import ChangePasswordModal from './ChangePasswordModal'; // Import the new modal
import './Navbar.css';

const Navbar = ({ theme, toggleTheme }) => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false); // New state for password modal
  
  // Notification states
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [notificationError, setNotificationError] = useState(null);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const data = await apiFetch('/auth/me');
      setCurrentUser(data);
    } catch (err) {
      console.error("Failed to fetch user", err);
      handleLogout();
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      setNotificationError(null);
      const count = await getUnreadNotificationsCount();
      setUnreadCount(count);
      const notifs = await getNotifications();
      setNotifications(notifs);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
      setNotificationError("Error al cargar notificaciones. Revisa la conexión o el servidor.");
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
    fetchNotifications();

    const notificationInterval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(notificationInterval);
  }, [fetchCurrentUser, fetchNotifications]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleUploadSuccess = () => {
    fetchCurrentUser();
  };

  const handleNotificationClick = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container-fluid">
          <NavLink className="navbar-brand" to="/">CiberCase</NavLink>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <NavLink className="nav-link" to="/">Dashboard</NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/tickets">Tickets</NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/auditoria">Auditoría</NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/forms">Formularios</NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/eml-scanner">Escaner EML</NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/admin">Administración</NavLink>
              </li>
            </ul>
            <div className="d-flex align-items-center">
              <button 
                onClick={toggleTheme} 
                className="btn btn-link nav-link text-white me-3"
              >
                {theme === 'light' ? <i className="fas fa-moon"></i> : <i className="fas fa-sun"></i>}
              </button>

              <div className="nav-item dropdown me-3">
                {/* ... Notification dropdown ... */}
              </div>

              <div className="profile-section">
                <Avatar user={currentUser} onClick={() => setIsDropdownVisible(!isDropdownVisible)} />
                {isDropdownVisible && (
                  <div className="dropdown-menu dropdown-menu-end show">
                    <button className="dropdown-item" onClick={() => { setIsAvatarModalOpen(true); setIsDropdownVisible(false); }}>Cambiar Foto</button>
                    <button className="dropdown-item" onClick={() => { setIsPasswordModalOpen(true); setIsDropdownVisible(false); }}>Cambiar Contraseña</button>
                    <hr className="dropdown-divider" />
                    <button className="dropdown-item" onClick={handleLogout}>Cerrar Sesión</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <AvatarUploadModal 
        show={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      <ChangePasswordModal
        show={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  );
};

export default Navbar;
