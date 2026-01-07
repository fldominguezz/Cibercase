import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api';
import EditUserModal from './EditUserModal'; // Import the modal
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPen, faKey, faTrash, faUserPlus, faShieldHalved } from '@fortawesome/free-solid-svg-icons';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: 'Analista',
        date_of_birth: ''
    });
    const [successMessage, setSuccessMessage] = useState('');
    const [editingUser, setEditingUser] = useState(null); // State for the user being edited

    const fetchUsers = useCallback(async () => {
        try {
            // Ensure endpoint is correct, assuming it's /users/ from previous context
            const data = await apiFetch('/users/');
            setUsers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [apiFetch]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage('');
        try {
            await apiFetch('/users/', {
                method: 'POST',
                body: JSON.stringify(formData),
            });
            setSuccessMessage('Usuario creado exitosamente.');
            setIsFormVisible(false);
            setFormData({ username: '', first_name: '', last_name: '', email: '', password: '', role: 'Analista', date_of_birth: '' });
            fetchUsers(); // Refresh the user list
        } catch (err) {
            let errorMessage = err.message || 'Ocurrió un error desconocido.';
            setError(errorMessage);
        }
    };
    
    const handleEditClick = (user) => {
        setEditingUser(user);
    };

    const handleDelete = async (userId) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) {
            try {
                await apiFetch(`/admin/users/${userId}`, { method: 'DELETE' });
                setSuccessMessage('Usuario eliminado exitosamente.');
                fetchUsers(); // Refresh
            } catch (err) {
                setError(err.message || 'Error al eliminar el usuario.');
            }
        }
    };

    const handleResetPassword = async (userId) => {
        if (window.confirm('¿Estás seguro de que deseas restablecer la contraseña de este usuario? La nueva contraseña será "Seguridad1601#".')) {
            try {
                await apiFetch(`/admin/users/${userId}/reset-password`, { method: 'POST' });
                setSuccessMessage('Contraseña restablecida exitosamente.');
            } catch (err) {
                setError(err.message || 'Error al restablecer la contraseña.');
            }
        }
    };

    const handleForcePasswordChange = async (userId, currentForceStatus) => {
        const newForceStatus = !currentForceStatus;
        const confirmMessage = newForceStatus 
            ? '¿Estás seguro de que deseas forzar el cambio de contraseña para este usuario en el próximo inicio de sesión?'
            : '¿Estás seguro de que deseas desactivar el cambio de contraseña forzado para este usuario?';

        if (window.confirm(confirmMessage)) {
            try {
                await apiFetch(`/admin/users/${userId}/force-password-change?force=${newForceStatus}`, { method: 'PUT' });
                setSuccessMessage(`Cambio de contraseña forzado ${newForceStatus ? 'activado' : 'desactivado'} exitosamente.`);
                fetchUsers(); // Refresh the user list
            } catch (err) {
                setError(err.message || 'Error al actualizar el estado de cambio de contraseña forzado.');
            }
        }
    };

    const handleUserUpdated = () => {
        setEditingUser(null);
        setSuccessMessage('Usuario actualizado exitosamente.');
        fetchUsers();
    };

    if (isLoading) return <p>Cargando usuarios...</p>;

    return (
        <div className="user-management container mt-4">
            <h2 className="mb-4">Gestión de Usuarios</h2>

            {error && <div className="alert alert-danger mb-3" role="alert">{error}</div>}
            {successMessage && <div className="alert alert-success mb-3">{successMessage}</div>}
            
            {!isFormVisible && (
                <button onClick={() => setIsFormVisible(true)} className="btn btn-primary mb-3">
                    <FontAwesomeIcon icon={faUserPlus} className="me-2" />
                    Crear Nuevo Usuario
                </button>
            )}
            
            {isFormVisible && (
                 <div className="card mb-4">
                    <div className="card-header">
                        <h4 className="mb-0">Crear Usuario</h4>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                           <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="first_name" className="form-label">Nombre</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="first_name"
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleInputChange}
                                        placeholder="Ingrese el nombre"
                                        required
                                    />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="last_name" className="form-label">Apellido</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="last_name"
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleInputChange}
                                        placeholder="Ingrese el apellido"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="username" className="form-label">Nombre de Usuario</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="username"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        placeholder="Ingrese el nombre de usuario"
                                        required
                                    />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="email" className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="Ingrese el email"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="password" className="form-label">Contraseña</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        id="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        placeholder="Ingrese la contraseña"
                                        required
                                    />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="role" className="form-label">Rol</label>
                                    <select
                                        className="form-select"
                                        id="role"
                                        name="role"
                                        value={formData.role}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="Analista">Analista</option>
                                        <option value="Lider">Lider</option>
                                        <option value="Auditor">Auditor</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="date_of_birth" className="form-label">Fecha de Nacimiento</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        id="date_of_birth"
                                        name="date_of_birth"
                                        value={formData.date_of_birth}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="d-flex justify-content-end mt-3">
                                <button type="submit" className="btn btn-success me-2">Guardar Usuario</button>
                                <button type="button" onClick={() => { setIsFormVisible(false); setError(null); setSuccessMessage(''); }} className="btn btn-secondary">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="card">
                <div className="card-header">
                    <h4 className="mb-0">Lista de Usuarios</h4>
                </div>
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre de Usuario</th>
                                    <th>Nombre</th>
                                    <th>Apellido</th>
                                    <th>Email</th>
                                    <th>Rol</th>
                                    <th>Activo</th>
                                    <th style={{ minWidth: '280px' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td>{user.id}</td>
                                        <td>{user.username}</td>
                                        <td>{user.first_name}</td>
                                        <td>{user.last_name}</td>
                                        <td>{user.email}</td>
                                        <td>{user.role.name}</td>
                                        <td>{user.is_active ? 'Sí' : 'No'}</td>
                                        <td>
                                            <button className="btn btn-sm btn-info me-2" title="Edit" onClick={() => handleEditClick(user)}>
                                                <FontAwesomeIcon icon={faUserPen} />
                                            </button>
                                            <button className="btn btn-sm btn-warning me-2" title="Reset Password" onClick={() => handleResetPassword(user.id)}>
                                                <FontAwesomeIcon icon={faKey} />
                                            </button>
                                            <button 
                                                className={`btn btn-sm me-2 ${user.force_password_change ? 'btn-danger' : 'btn-success'}`} 
                                                title={user.force_password_change ? 'Desactivar Cambio de Contraseña Forzado' : 'Forzar Cambio de Contraseña en Próximo Inicio de Sesión'}
                                                onClick={() => handleForcePasswordChange(user.id, user.force_password_change)}
                                            >
                                                <FontAwesomeIcon icon={faShieldHalved} />
                                            </button>
                                            <button className="btn btn-sm btn-danger" title="Delete" onClick={() => handleDelete(user.id)}>
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onUserUpdated={handleUserUpdated}
                />
            )}
        </div>
    );
};

export default UserManagement;
