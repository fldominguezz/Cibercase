import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api';

const GroupManagement = () => {
    const [groups, setGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for the creation form
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [newGroup, setNewGroup] = useState({ nombre: '', descripcion: '' });

    const fetchGroups = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await apiFetch('/admin/groups');
            setGroups(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewGroup(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newGroup.nombre) {
            setError('El nombre del grupo es obligatorio.');
            return;
        }

        try {
            await apiFetch('/admin/groups', {
                method: 'POST',
                body: JSON.stringify(newGroup),
            });
            // Reset form, hide it, and refresh the list
            setNewGroup({ nombre: '', descripcion: '' });
            setIsFormVisible(false);
            fetchGroups();
            setError(null); // Clear previous errors
        } catch (err) {
            setError(err.message);
        }
    };

    if (isLoading) return <p>Cargando grupos...</p>;
    
    return (
        <div className="group-management">
            <h2>Grupos</h2>

            {!isFormVisible && (
                <button onClick={() => setIsFormVisible(true)} className="btn btn-primary mb-3">
                    Crear Nuevo Grupo
                </button>
            )}

            {isFormVisible && (
                <div className="card mb-4">
                    <div className="card-body">
                        <h5 className="card-title">Nuevo Grupo</h5>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label htmlFor="nombre" className="form-label">Nombre</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="nombre"
                                    name="nombre"
                                    value={newGroup.nombre}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label htmlFor="descripcion" className="form-label">Descripción</label>
                                <textarea
                                    className="form-control"
                                    id="descripcion"
                                    name="descripcion"
                                    rows="3"
                                    value={newGroup.descripcion}
                                    onChange={handleInputChange}
                                ></textarea>
                            </div>
                            <button type="submit" className="btn btn-success me-2">Guardar Grupo</button>
                            <button type="button" onClick={() => setIsFormVisible(false)} className="btn btn-secondary">Cancelar</button>
                        </form>
                    </div>
                </div>
            )}

            {error && <div className="alert alert-danger">{error}</div>}

            <div className="groups-list card">
                <div className="card-body">
                    <h5 className="card-title">Grupos Existentes</h5>
                    {groups.length > 0 ? (
                        <ul className="list-group">
                            {groups.map(group => (
                                <li key={group.id} className="list-group-item">
                                    <strong>{group.nombre}</strong>
                                    <p className="mb-0 text-muted">{group.descripcion}</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No hay grupos creados.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GroupManagement;
