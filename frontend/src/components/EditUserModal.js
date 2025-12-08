import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';

const EditUserModal = ({ user, onClose, onUserUpdated }) => {
    const [formData, setFormData] = useState({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        role: 'Analista',
        date_of_birth: '',
        is_active: true
    });
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username || '',
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || '',
                role: user.role || 'Analista',
                date_of_birth: user.date_of_birth ? user.date_of_birth.split('T')[0] : '', // Format date for input
                is_active: user.is_active === undefined ? true : user.is_active,
                session_duration_minutes: user.session_duration_minutes || 30, // Default to 30 if not set
            });
        }
    }, [user]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const dataToUpdate = {
            ...formData,
            session_duration_minutes: parseInt(formData.session_duration_minutes, 10) || null,
        };

        try {
            await apiFetch(`/admin/users/${user.id}`, {
                method: 'PUT',
                body: JSON.stringify(dataToUpdate),
            });
            onUserUpdated(); // This will trigger a refresh and close the modal
        } catch (err) {
            const errorMessage = err.message || 'Error al actualizar el usuario.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="modal" tabIndex="-1" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Editar Usuario: {user.username}</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        {error && <div className="alert alert-danger">{error}</div>}
                        <form onSubmit={handleSubmit}>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="edit-first_name" className="form-label">Nombre</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="edit-first_name"
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="edit-last_name" className="form-label">Apellido</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="edit-last_name"
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="edit-username" className="form-label">Nombre de Usuario</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="edit-username"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="edit-email" className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        id="edit-email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="edit-role" className="form-label">Rol</label>
                                    <select
                                        className="form-select"
                                        id="edit-role"
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
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="edit-session_duration_minutes" className="form-label">Duración de Sesión (minutos)</label>
                                    <select
                                        className="form-select"
                                        id="edit-session_duration_minutes"
                                        name="session_duration_minutes"
                                        value={formData.session_duration_minutes}
                                        onChange={handleInputChange}
                                    >
                                        <option value="30">30 Minutos</option>
                                        <option value="60">1 Hora</option>
                                        <option value="360">6 Horas</option>
                                        <option value="720">12 Horas</option>
                                        <option value="1440">24 Horas</option>
                                    </select>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="edit-date_of_birth" className="form-label">Fecha de Nacimiento</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        id="edit-date_of_birth"
                                        name="date_of_birth"
                                        value={formData.date_of_birth}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </div>
                             <div className="mb-3 form-check">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="edit-is_active"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleInputChange}
                                />
                                <label className="form-check-label" htmlFor="edit-is_active">Activo</label>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                                    {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditUserModal;
