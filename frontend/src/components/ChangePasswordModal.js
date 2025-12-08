import React, { useState } from 'react';
import { apiFetch } from '../api';
import { toast } from 'react-toastify';

const ChangePasswordModal = ({ show, onClose }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas nuevas no coinciden.');
            return;
        }

        if (newPassword.length < 8) {
            setError('La nueva contraseña debe tener al menos 8 caracteres.');
            return;
        }

        setLoading(true);
        try {
            await apiFetch('/users/me/password', {
                method: 'POST',
                body: JSON.stringify({
                    old_password: oldPassword,
                    new_password: newPassword,
                }),
            });
            toast.success('¡Contraseña cambiada con éxito!');
            onClose();
        } catch (err) {
            setError(err.message || 'Ocurrió un error al cambiar la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    if (!show) {
        return null;
    }

    return (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Cambiar Contraseña</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            {error && <div className="alert alert-danger">{error}</div>}
                            
                            <div className="mb-3">
                                <label htmlFor="oldPassword" c lassName="form-label">Contraseña Actual</label>
                                <input 
                                    type="password" 
                                    className="form-control" 
                                    id="oldPassword" 
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    required 
                                />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="newPassword" c lassName="form-label">Contraseña Nueva</label>
                                <input 
                                    type="password" 
                                    className="form-control" 
                                    id="newPassword" 
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required 
                                />
                            </div>

                            <div className="mb-3">
                                <label htmlFor="confirmPassword" c lassName="form-label">Repetir Contraseña Nueva</label>
                                <input 
                                    type="password" 
                                    className="form-control" 
                                    id="confirmPassword" 
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required 
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
