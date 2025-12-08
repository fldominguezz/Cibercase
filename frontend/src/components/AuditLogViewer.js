import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api';
import './AuditLogViewer.css';

const RenderDetails = ({ detalle }) => {
    try {
        const data = JSON.parse(detalle);

        // Special handling for 'Actualización de Ticket'
        if (data.cambios) {
            return (
                <ul>
                    {Object.entries(data.cambios).map(([key, value]) => (
                        <li key={key}>
                            <strong>{key}:</strong>
                            <div className="revert-details">
                                <span className="old-value">Antes: {value.old}</span>
                                <span className="new-value">Ahora: {value.new}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            );
        }

        // Generic object rendering
        return (
            <ul>
                {Object.entries(data).map(([key, value]) => (
                    <li key={key}><strong>{key}:</strong> {String(value)}</li>
                ))}
            </ul>
        );
    } catch (error) {
        // If it's not a JSON string, just display it as is.
        return <span>{detalle}</span>;
    }
};


const AuditLogViewer = () => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAuditLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await apiFetch('/admin/audit-logs/');
            setLogs(data);
        } catch (error) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAuditLogs();
    }, [fetchAuditLogs]);

    const handleRevert = async (logId) => {
        if (window.confirm('¿Estás seguro de que deseas revertir este cambio?')) {
            try {
                const response = await apiFetch(`/admin/audit-logs/${logId}/revert`, {
                    method: 'POST',
                });
                alert(response.message);
                fetchAuditLogs(); // Refresh the logs
            } catch (error) {
                alert(`Error al revertir el cambio: ${error.message}`);
            }
        }
    };

    if (isLoading) return <p>Cargando registros...</p>;
    if (error) return <p>Error: {error}</p>;

    return (
        <div className="audit-log-viewer">
            <h1>Registro de Auditoría Global</h1>
            <div className="logs-list card">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Actor</th>
                            <th>Entidad</th>
                            <th>Entidad ID</th>
                            <th>Acción</th>
                            <th>Detalles</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id}>
                                <td>{new Date(log.timestamp).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'medium', hour12: false })}</td>
                                <td>{log.actor_name || 'Sistema'}</td>
                                <td>{log.entidad}</td>
                                <td>{log.entidad_id}</td>
                                <td><span className="action-badge">{log.accion}</span></td>
                                <td>
                                    <RenderDetails detalle={log.detalle} />
                                </td>
                                <td>
                                    {log.accion === 'Actualización de Ticket' && (
                                        <button 
                                            onClick={() => handleRevert(log.id)}
                                            className="btn btn-warning btn-sm"
                                        >
                                            Revertir
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AuditLogViewer;
