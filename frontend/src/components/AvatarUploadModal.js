import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';

const AvatarUploadModal = ({ show, onClose, onUploadSuccess }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!selectedFile) {
            setPreview(null);
            return;
        }

        const objectUrl = URL.createObjectURL(selectedFile);
        setPreview(objectUrl);

        // free memory when ever this component is unmounted
        return () => URL.revokeObjectURL(objectUrl);
    }, [selectedFile]);

    const handleFileChange = (e) => {
        if (!e.target.files || e.target.files.length === 0) {
            setSelectedFile(null);
            return;
        }
        setSelectedFile(e.target.files[0]);
        setError(''); // Clear previous errors
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setError('Por favor, selecciona un archivo.');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            await apiFetch('/users/me/avatar', {
                method: 'POST', // Use POST as defined in the backend
                body: formData,
            });
            onUploadSuccess();
            onClose();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('¿Estás seguro de que quieres eliminar tu foto de perfil?')) {
            try {
                await apiFetch('/users/me/avatar', {
                    method: 'DELETE',
                });
                onUploadSuccess();
                onClose();
            } catch (err) {
                setError(err.message);
            }
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
                        <h5 className="modal-title">Cambiar Foto de Perfil</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        {error && <div className="alert alert-danger">{error}</div>}
                        
                        <div className="mb-3">
                            <label htmlFor="avatarFile" className="form-label">Selecciona una imagen (JPG o PNG)</label>
                            <input 
                                type="file" 
                                className="form-control" 
                                id="avatarFile" 
                                accept="image/jpeg, image/png" 
                                onChange={handleFileChange} 
                            />
                        </div>

                        {preview && (
                            <div className="text-center mb-3">
                                <p>Vista Previa:</p>
                                <img src={preview} alt="Vista previa del avatar" style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover' }} />
                            </div>
                        )}
                    </div>
                    <div className="modal-footer justify-content-between">
                        <button type="button" className="btn btn-danger" onClick={handleDelete}>
                            <i className="fas fa-trash-alt me-2"></i>Eliminar Foto
                        </button>
                        <div>
                            <button type="button" className="btn btn-secondary me-2" onClick={onClose}>Cancelar</button>
                            <button type="button" className="btn btn-primary" onClick={handleUpload} disabled={!selectedFile}>
                                <i className="fas fa-upload me-2"></i>Subir Foto
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AvatarUploadModal;
