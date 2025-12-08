import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useWebSocketContext } from '../context/WebSocketContext';
import { toast } from 'react-toastify';
import { apiFetch, readTickets, getTicketComments, createTicketComment, remediateTicket } from '../api';
import Avatar from './Avatar';
import './Tickets.css';
import { useModal } from '../context/ModalContext'; // Import useModal

const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'America/Argentina/Buenos_Aires'
    };
    return new Intl.DateTimeFormat('es-AR', options).format(date);
};

const Tickets = () => {
    const { ticketId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const latestMessage = useWebSocketContext();
    const { openTicketModal, closeTicketModal, openInfoModal } = useModal(); // Use modal context

    const [singleTicket, setSingleTicket] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterSeverity, setFilterSeverity] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterAssignedTo, setFilterAssignedTo] = useState('');
    const [filterReportedBy, setFilterReportedBy] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('creado_en');
    const [sortOrder, setSortOrder] = useState('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalTicketsCount, setTotalTicketsCount] = useState(0);

    const [categories, setCategories] = useState([]);
    const [resolutionText, setResolutionText] = useState('');
    const [evidenceFiles, setEvidenceFiles] = useState([]);
    const [newEvidenceFiles, setNewEvidenceFiles] = useState([]);

    const [currentUser, setCurrentUser] = useState(null);
    const [editingTicketId, setEditingTicketId] = useState(null);
    const [editedTicketData, setEditedTicketData] = useState(null);

    const TICKET_STATUSES = ['Nuevo', 'Abierto', 'En Progreso', 'Resuelto', 'Cerrado', 'Pendiente'];
    
    const fetchInitialData = useCallback(async () => {
        if (!users.length) setIsLoading(true);
        try {
            const [usersData, categoriesData, currentUserData] = await Promise.all([
                apiFetch('/users/').catch(() => []),
                apiFetch('/tickets/categories').catch(() => []),
                apiFetch('/auth/me').catch(() => null)
            ]);
            setUsers(usersData.map(user => ({ id: user.id, nombre: user.first_name + ' ' + user.last_name })));
            setCategories(categoriesData);
            setCurrentUser(currentUserData);
        } catch (error) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [users.length]);

    const fetchSingleTicket = useCallback(async (id) => {
        setIsLoading(true);
        try {
            const data = await apiFetch(`/tickets/${id}`);
            setSingleTicket(data);
            setResolutionText(data.resolucion || '');
            setEvidenceFiles(data.evidencia || []);
        } catch (error) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchTicketComments = useCallback(async (id) => {
        try {
            const data = await getTicketComments(id);
            setComments(data);
        } catch (error) {
            setError(error.message);
        }
    }, []);

    const handleLocalCloseModal = () => {
        closeTicketModal(); // Close the global modal
        fetchFilteredTickets(); // Then refresh tickets
    };

    const handleRemediate = async (ticketId) => {
        try {
            await remediateTicket(ticketId);
            toast.success('Ticket remediado con éxito y asignado a ti.');
            fetchFilteredTickets();
        } catch (err) {
            toast.error(`Error al remediar el ticket: ${err.message}`);
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        try {
            await createTicketComment(ticketId, newComment);
            setNewComment('');
            fetchTicketComments(ticketId);
        } catch (error) {
            setError(error.message);
        }
    };

    const fetchFilteredTickets = useCallback(async () => {
        setIsLoading(true);
        try {
            const queryParams = new URLSearchParams(location.search);
            const apiParams = {
                skip: (currentPage - 1) * pageSize,
                limit: pageSize,
                status: filterStatus || queryParams.get('status') || '',
                severity: filterSeverity || queryParams.get('severity') || '',
                category: filterCategory || queryParams.get('category') || '',
                assigned_to_id: filterAssignedTo || '',
                reportado_por_id: filterReportedBy || queryParams.get('reportado_por_id') || '',
                search: searchTerm || queryParams.get('search') || '',
                sort_by: sortBy,
                sort_order: sortOrder,
                start_date: filterStartDate,
                end_date: filterEndDate,
                assignedToMe: queryParams.get('assignedToMe') === 'true',
            };

            const data = await readTickets(apiParams);
            setTickets(data.tickets);
            setTotalTicketsCount(data.total_count);
        } catch (error) {
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [location.search, currentPage, pageSize, filterStatus, filterSeverity, filterCategory, filterAssignedTo, filterReportedBy, searchTerm, sortBy, sortOrder, filterStartDate, filterEndDate]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        if (!isLoading) {
            if (ticketId && ticketId !== 'undefined') {
                fetchSingleTicket(ticketId);
                fetchTicketComments(ticketId);
            } else {
                fetchFilteredTickets();
            }
        }
    }, [ticketId, fetchSingleTicket, fetchTicketComments, fetchFilteredTickets, isLoading]);
    
    useEffect(() => {
        if (latestMessage) {
            if (ticketId && latestMessage.id === parseInt(ticketId)) {
                setSingleTicket(prevTicket => ({ ...prevTicket, ...latestMessage }));
            } else if (!ticketId) {
                fetchFilteredTickets();
            }
        }
    }, [latestMessage, ticketId, fetchFilteredTickets]);

    const handleEditClick = (ticket) => {
        setEditingTicketId(ticket.id);
        setEditedTicketData({
          estado: ticket.estado,
          asignado_a_id: ticket.asignado_a_id,
        });
    };

    const handleSaveClick = async (ticketId) => {
        try {
            const formData = new FormData();
            if (editedTicketData.estado) {
                formData.append('estado', editedTicketData.estado);
            }
            if (editedTicketData.asignado_a_id) {
                formData.append('asignado_a_id', editedTicketData.asignado_a_id);
            } else {
                 formData.append('asignado_a_id', '');
            }
            
            await apiFetch(`/tickets/${ticketId}`, {
                method: 'PUT',
                body: formData,
            });

            setEditingTicketId(null);
            setEditedTicketData(null);
            toast.success("Ticket actualizado con éxito.");
            handleLocalCloseModal(); // Refresh tickets after save
        } catch (err) {
            toast.error(`Error al guardar el ticket: ${err.message}`);
        }
    };

    const handleCancelClick = () => {
        setEditingTicketId(null);
        setEditedTicketData(null);
    };

    const handleStatusChange = (e) => {
        setEditedTicketData(prevData => ({ ...prevData, estado: e.target.value }));
    };

    const handleAssigneeChange = (e) => {
        setEditedTicketData(prevData => ({ ...prevData, asignado_a_id: e.target.value === "" ? null : parseInt(e.target.value) }));
    };

    const [showResolutionConfirmModal, setShowResolutionConfirmModal] = useState(false);

    const handleUpdateResolutionAndEvidence = async (e) => {
        e.preventDefault();
        setShowResolutionConfirmModal(true);
    };

    const confirmResolution = async () => {
        setShowResolutionConfirmModal(false);
        const data = new FormData();
        data.append('resolucion', resolutionText);
        data.append('estado', 'Resuelto');
        newEvidenceFiles.forEach(file => data.append('files', file));
        try {
            await apiFetch(`/tickets/${ticketId}`, { method: 'PUT', body: data });
            setNewEvidenceFiles([]);
            fetchSingleTicket(ticketId);
        } catch (error) {
            setError(error.message);
        }
    };

    const handleNewEvidenceFileChange = (e) => {
        setNewEvidenceFiles(Array.from(e.target.files));
    };
    
    const handleRemoveNewEvidenceFile = (fileToRemove) => {
        setNewEvidenceFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
    };

    const handleRemoveEvidence = async (evidenceId) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta evidencia?')) {
            try {
                await apiFetch(`/evidence/${evidenceId}`, { method: 'DELETE' });
                fetchSingleTicket(ticketId);
            } catch (error) {
                setError(error.message);
            }
        }
    };

    if (isLoading && !users.length) return <div className="text-center mt-5"><div className="spinner-border" role="status"><span className="visually-hidden">Cargando...</span></div></div>;
    if (error) return <p className="text-center text-danger mt-5">Error: {error}</p>;

    if (ticketId) {
        if (!singleTicket) return <p className="text-center mt-5">Ticket no encontrado.</p>;
        const assignedUser = users.find(u => u.id === singleTicket.asignado_a_id);
        const reportedByUser = users.find(u => u.id === singleTicket.reportado_por_id);

        return (
            <div className="single-ticket-view container mt-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h2>Detalles del Ticket: {singleTicket.ticket_uid}</h2>
                    <button onClick={() => navigate('/tickets')} className="btn btn-secondary">Volver al Gestor de Tickets</button>
                </div>
                <div className="card shadow-sm mb-4"><div className="card-header">Información del Ticket</div><div className="card-body"><div className="row mb-2"><div className="col-md-6"><strong>Título:</strong> {singleTicket.resumen}</div><div className="col-md-6"><strong>Estado:</strong> <span className={`badge bg-${singleTicket.estado === 'Nuevo' ? 'primary' : singleTicket.estado === 'En Progreso' ? 'warning' : singleTicket.estado === 'Resuelto' ? 'success' : 'secondary'}`}>{singleTicket.estado}</span></div></div><div className="row mb-2"><div className="col-md-6"><strong>Severidad:</strong> <span className={`badge bg-${singleTicket.severidad === 'Baja' ? 'info' : singleTicket.severidad === 'Media' ? 'warning' : singleTicket.severidad === 'Alta' ? 'danger' : 'dark'}`}>{singleTicket.severidad}</span></div><div className="col-md-6"><strong>Categoría:</strong> {singleTicket.categoria || 'N/A'}</div></div><div className="row mb-2"><div className="col-md-6"><strong>Reportado por:</strong> {reportedByUser?.nombre || 'N/A'}</div><div className="col-md-6"><strong>Asignado a:</strong> {assignedUser?.nombre || 'Sin asignar'}</div></div><div className="row mb-2"><div className="col-md-6"><strong>Creado en:</strong> {formatDateTime(singleTicket.creado_en)}</div><div className="col-md-6"><strong>Última actualización:</strong> {formatDateTime(singleTicket.actualizado_en)}</div></div><div className="row mb-2"><div className="col-12" style={{ whiteSpace: 'pre-wrap' }}><strong>Descripción:</strong> {singleTicket.descripcion || 'N/A'}</div></div></div></div>
                <div className="card shadow-sm mb-4"><div className="card-header">Sección de Resolución</div><div className="card-body"><form onSubmit={handleUpdateResolutionAndEvidence}><div className="form-group mb-3"><label htmlFor="resolutionText">Resolución</label><textarea id="resolutionText" className="form-control" rows="5" value={resolutionText} onChange={(e) => setResolutionText(e.target.value)}></textarea></div><div className="form-group mb-3"><label>Evidencia Existente</label>{evidenceFiles.length > 0 ? (<ul className="list-group">{evidenceFiles.map(file => (<li key={file.id} className="list-group-item d-flex justify-content-between align-items-center"><a href={`/api/v1/tickets/${ticketId}/evidence/${file.id}`} target="_blank" rel="noopener noreferrer">{file.file_name}</a><button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemoveEvidence(file.id)}>Eliminar</button></li>))}</ul>) : (<p>No hay evidencia adjunta.</p>)}</div><div className="form-group mb-3"><label htmlFor="newEvidenceFiles">Adjuntar Nueva Evidencia</label><input type="file" id="newEvidenceFiles" className="form-control" multiple onChange={handleNewEvidenceFileChange} /> {newEvidenceFiles.length > 0 && (<div className="selected-files-list mt-2">{newEvidenceFiles.map((file, index) => (<div key={index} className="selected-file-item"><span>{file.name}</span><button type="button" onClick={() => handleRemoveNewEvidenceFile(file)} className="remove-file-btn">X</button></div>))}</div>)}</div><button type="submit" className="btn btn-primary">Guardar Resolución y Evidencia</button></form></div></div>
                <div className="card shadow-sm mb-4"><div className="card-header">Comentarios</div><div className="card-body">{comments.length > 0 ? (<ul className="list-group mb-3">{comments.map(comment => (<li key={comment.id} className="list-group-item d-flex align-items-start"><div className="me-3"><Avatar user={comment.owner} /></div><div className="flex-grow-1"><div className="d-flex justify-content-between"><strong>{comment.owner?.first_name} {comment.owner?.last_name}</strong><small className="text-muted">{formatDateTime(comment.created_at)}</small></div><p className="mb-0 mt-1">{comment.content}</p></div></li>))}</ul>) : (<p>No hay comentarios para este ticket.</p>)}<form onSubmit={handleCommentSubmit}><div className="form-group mb-3"><label htmlFor="newComment">Añadir Comentario</label><textarea id="newComment" className="form-control" rows="3" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Escribe tu comentario aquí..." required></textarea></div><button type="submit" className="btn btn-primary">Enviar Comentario</button></form></div></div>
                {showResolutionConfirmModal && (<div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}><div className="modal-dialog modal-dialog-centered"><div className="modal-content"><div className="modal-header"><h5 className="modal-title">Confirmar Resolución</h5><button type="button" className="btn-close" onClick={() => setShowResolutionConfirmModal(false)}></button></div><div className="modal-body"><p>¿Estás seguro de que resolviste el ticket?</p><p><strong>Se cambiará el estado del ticket a "Resuelto".</strong></p></div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowResolutionConfirmModal(false)}>Cancelar</button><button type="button" className="btn btn-primary" onClick={confirmResolution}>Confirmar</button></div></div></div></div>)}
            </div>
        );
    }
    
    if (location.pathname === '/tickets-filtered' || location.pathname === '/tickets') {
        const TICKET_SEVERITIES = ['Baja', 'Media', 'Alta', 'Crítica', 'Desconocida'];

        const handleFilterChange = (e) => {
            const { name, value } = e.target;
            if (name === "filterStatus") setFilterStatus(value);
            else if (name === "filterSeverity") setFilterSeverity(value);
            else if (name === "filterCategory") setFilterCategory(value);
            else if (name === "filterAssignedTo") setFilterAssignedTo(value);
            else if (name === "filterReportedBy") setFilterReportedBy(value);
            else if (name === "filterStartDate") setFilterStartDate(value);
            else if (name === "filterEndDate") setFilterEndDate(value);
            else if (name === "searchTerm") setSearchTerm(value);
            setCurrentPage(1);
        };
        
        const handleSearchSubmit = (e) => {
            e.preventDefault();
            fetchFilteredTickets();
        };

        const handleSortChange = (column) => {
            setSortBy(column);
            setSortOrder(sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc');
        };

        const handlePageChange = (newPage) => setCurrentPage(newPage);
        const handlePageSizeChange = (e) => {
            setPageSize(Number(e.target.value));
            setCurrentPage(1);
        };

        const totalPages = Math.ceil(totalTicketsCount / pageSize);

        return (
            <div className="filtered-tickets-view container-fluid mt-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h2>Gestor de Tickets</h2>
                    <div>
                        <button onClick={() => navigate('/create-ticket')} className="btn btn-primary me-2">Crear Ticket</button>
                        <button onClick={fetchFilteredTickets} className="btn btn-outline-secondary">Refrescar</button>
                    </div>
                </div>

                <div className="card shadow-sm mb-4 p-3">
                    <h5 className="card-title">Filtros y Búsqueda</h5>
                    <div className="row g-3 align-items-center">
                        <div className="col-md-12"><form onSubmit={handleSearchSubmit}><div className="input-group"><input type="text" className="form-control" placeholder="Buscar por título, descripción, UID..." name="searchTerm" value={searchTerm} onChange={handleFilterChange} /><button className="btn btn-primary" type="submit">🔍</button></div></form></div>
                        <div className="col-md-2"><select className="form-select" name="filterStatus" value={filterStatus} onChange={handleFilterChange}><option value="">Estado</option>{TICKET_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                        <div className="col-md-2"><select className="form-select" name="filterSeverity" value={filterSeverity} onChange={handleFilterChange}><option value="">Severidad</option>{TICKET_SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                        <div className="col-md-2"><select className="form-select" name="filterCategory" value={filterCategory} onChange={handleFilterChange}><option value="">Plataforma</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                        <div className="col-md-2"><select className="form-select" name="filterAssignedTo" value={filterAssignedTo} onChange={handleFilterChange}><option value="">Asignado a</option>{users.map(user => <option key={user.id} value={user.id}>{user.nombre}</option>)}</select></div>
                        <div className="col-md-2"><input type="date" className="form-control" name="filterStartDate" value={filterStartDate} onChange={handleFilterChange} title="Fecha de Inicio"/></div>
                        <div className="col-md-2"><input type="date" className="form-control" name="filterEndDate" value={filterEndDate} onChange={handleFilterChange} title="Fecha de Fin"/></div>
                    </div>
                </div>

                <div className="card shadow-sm mb-4">
                    <div className="card-body">
                        <div className="table-responsive">
                            <table className="table table-hover table-striped">
                                <thead className="table-light">
                                    <tr>
                                        <th scope="col" onClick={() => handleSortChange('ticket_uid')}>UID</th>
                                        <th scope="col" onClick={() => handleSortChange('resumen')}>Titulo</th>
                                        <th scope="col" onClick={() => handleSortChange('estado')}>Estado</th>
                                        <th scope="col">Asignado A</th>
                                        <th scope="col" onClick={() => handleSortChange('creado_en')}>Fecha/Hora Creación</th>
                                        <th scope="col" style={{width: '35%'}}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tickets.length > 0 ? tickets.map(ticket => (
                                        <tr key={ticket.id}>
                                            <td>{ticket.ticket_uid}</td>
                                            <td>{ticket.resumen}</td>
                                            <td>
                                                {editingTicketId === ticket.id ? (
                                                  <select className="form-select form-select-sm" value={editedTicketData?.estado || ticket.estado} onChange={handleStatusChange}>
                                                    {TICKET_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                                                  </select>
                                                ) : (<span className={`badge bg-${ticket.estado === 'Nuevo' ? 'primary' : ticket.estado === 'Abierto' ? 'info' : ticket.estado === 'En Progreso' ? 'warning' : ticket.estado === 'Resuelto' ? 'success' : 'secondary'}`}>{ticket.estado}</span>)}
                                            </td>
                                            <td>
                                                {editingTicketId === ticket.id ? (
                                                  <select className="form-select form-select-sm" value={editedTicketData?.asignado_a_id || ticket.asignado_a_id || ''} onChange={handleAssigneeChange}>
                                                    <option value="">Sin Asignar</option>
                                                    {users.map(user => <option key={user.id} value={user.id}>{user.nombre}</option>)}
                                                  </select>
                                                ) : (users.find(u => u.id === ticket.asignado_a_id)?.nombre || 'N/A')}
                                            </td>
                                            <td>{formatDateTime(ticket.creado_en)}</td>
                                            <td>
                                                {editingTicketId === ticket.id ? (
                                                    <>
                                                        <button onClick={() => handleSaveClick(ticket.id)} className="btn btn-sm btn-success me-1">Guardar</button>
                                                        <button onClick={handleCancelClick} className="btn btn-sm btn-secondary">Cancelar</button>
                                                    </>
                                                ) : (
                                                    <div className="btn-group" role="group">
                                                        <button onClick={() => openTicketModal(ticket.id)} className="btn btn-sm btn-info">Ver</button>
                                                        {(currentUser?.role === 'Admin' || currentUser?.role === 'Lider') && <button onClick={() => handleEditClick(ticket)} className="btn btn-sm btn-warning">Editar</button>}
                                                        {ticket.asignado_a_id === currentUser?.id ? 
                                                            <button onClick={() => navigate(`/tickets/${ticket.id}`)} className="btn btn-sm btn-primary">Continuar Trabajo</button>
                                                            : !ticket.asignado_a_id && <button onClick={() => remediateTicket(ticket.id)} className="btn btn-sm btn-success">Remediar</button>
                                                        }
                                                        {ticket.raw_logs && <button onClick={() => openInfoModal('Raw Logs', ticket.raw_logs)} className="btn btn-sm btn-secondary">Ver Raw</button>}
                                                        {ticket.rule_name && <button onClick={() => openInfoModal({ nombre: ticket.rule_name, descripcion: ticket.rule_description, remediacion: ticket.rule_remediation })} className="btn btn-sm btn-secondary">Ver Regla</button>}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="6" className="text-center">No hay tickets que coincidan con los filtros.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-3">
                            <div><select className="form-select form-select-sm" value={pageSize} onChange={handlePageSizeChange} style={{ width: 'auto' }}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select></div>
                            <nav>
                                <ul className="pagination pagination-sm mb-0">
                                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}><button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>Anterior</button></li>
                                    <li className="page-item disabled"><span className="page-link">Página {currentPage} de {totalPages}</span></li>
                                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}><button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>Siguiente</button></li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default Tickets;