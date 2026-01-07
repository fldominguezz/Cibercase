import React, { useState } from 'react';
import './AdminPanel.css';
import UserManagement from './UserManagement';
import RoleManager from './RoleManager'; // Import RoleManager

const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState('users');
    return (
        <div className="admin-panel">
            <h1>Panel de Administración</h1>

            <div className="admin-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    Gestionar Usuarios
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
                    onClick={() => setActiveTab('roles')}
                >
                    Gestionar Roles
                </button>
            </div>
            <div className="admin-content">
                {activeTab === 'users' && <UserManagement />}
                {activeTab === 'roles' && <RoleManager />}
            </div>
        </div>
    );
};

export default AdminPanel;
