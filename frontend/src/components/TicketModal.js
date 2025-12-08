import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import './TicketModal.css'; // Import the CSS file

const TicketModal = ({ ticketId, onClose }) => {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTicketDetails = async () => {
      if (!ticketId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await apiFetch(`/tickets/${ticketId}`);
        setTicket(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTicketDetails();
  }, [ticketId]);

  if (!ticketId) {
    return null; // Don't render modal if no ticketId is provided
  }

  return (
    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog">
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Detalles del Ticket</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {loading && <p>Cargando detalles del ticket...</p>}
            {error && <div className="alert alert-danger">{error}</div>}
            {ticket && (
              <div>
                <p><strong>UID:</strong> {ticket.ticket_uid}</p>
                <p><strong>Título:</strong> {ticket.resumen}</p>


                <div className="ticket-description" style={{ whiteSpace: 'pre-wrap' }}>
                  {ticket.descripcion.split('**').map((part, index) => {
                    return index % 2 === 1 ? <strong key={index}>{part}</strong> : part;
                  })}
                </div>

                <p><strong>Estado:</strong> <span className={`badge ${ticket.estado === 'Abierto' ? 'bg-danger' : 'bg-success'}`}>{ticket.estado}</span></p>
                <p><strong>Severidad:</strong> {ticket.severidad}</p>
                <p><strong>Reportado por:</strong> {ticket.reportado_por_nombre || 'N/A'}</p>
                <p><strong>Asignado a:</strong> {ticket.asignado_a_nombre || 'N/A'}</p>
                <p><strong>Fecha de Creación:</strong> {new Date(ticket.creado_en).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'medium', hour12: false })}</p>

                {ticket.evidencias && ticket.evidencias.length > 0 && (
                  <div className="mt-3">
                    <h6>Evidencias:</h6>
                    <ul className="list-group">
                      {ticket.evidencias.map(evidence => (
                        <li key={evidence.id} className="list-group-item">
                          <a href={`/api/v1/tickets/${ticket.id}/evidence/${evidence.id}`} target="_blank" rel="noopener noreferrer">{evidence.file_name}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketModal;
