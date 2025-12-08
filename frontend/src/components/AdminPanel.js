import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import './AdminPanel.css';
import UserManagement from './UserManagement';
// import GroupManagement from './GroupManagement';

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
                {/* <button 
                    className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
                    onClick={() => setActiveTab('groups')}
                >
                    Gestionar Grupos
                </button> */}
            </div>
            <div className="admin-content">
                {activeTab === 'users' && <UserManagement />}
                {/* {activeTab === 'groups' && <GroupManagement />} */}
            </div>
        </div>
    );
};

export default AdminPanel;
