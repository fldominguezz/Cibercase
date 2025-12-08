import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import './TicketModal.css'; // Re-use existing modal CSS for form elements, adjust container later
import './CreateTicketPage.css'; // New CSS for page-specific layout

const CreateTicketPage = ({ initialData }) => { // initialData might still be useful for templates
  const navigate = useNavigate(); // Initialize useNavigate hook

  const [formData, setFormData] = useState({
    resumen: '',
    descripcion: '',
    estado: 'Nuevo',
    severidad: 'Media',
    categoria: 'FortiEMS', // Default to one of the new platform options
    asignado_a_id: '', // Will be an ID, not a name
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]); // For assignee dropdown
  const [selectedFiles, setSelectedFiles] = useState([]); // For file attachments
  const [categories, setCategories] = useState([]);

  // Fetch users and categories
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const fetchedUsers = await apiFetch('/users/');
        setUsers(fetchedUsers);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Error al cargar usuarios para asignación.");
      }
    };
    const fetchCategories = async () => {
      try {
        const fetchedCategories = await apiFetch('/tickets/categories');
        setCategories(fetchedCategories);
      } catch (err) {
        console.error("Error fetching categories:", err);
        setError("Error al cargar las categorías.");
      }
    };
    fetchUsers();
    fetchCategories();
  }, []);

  // Populate form data from initialData (template)
  useEffect(() => {
    if (initialData) {
      setFormData(prevData => ({
        ...prevData,
        ...initialData,
        // Ensure asignado_a_id is a string for select value
        asignado_a_id: initialData.asignado_a_id ? String(initialData.asignado_a_id) : '',
      }));
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Prepare data for API call
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        // Convert asignado_a_id to int or null before appending
        if (key === 'asignado_a_id' && formData[key]) {
          data.append(key, parseInt(formData[key]));
        } else if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
          data.append(key, formData[key]);
        }
      });

      selectedFiles.forEach(file => {
        data.append('files', file); // Append each file with the name 'files'
      });

      const response = await apiFetch('/tickets/', {
        method: 'POST',
        body: data,
      });

      if (response && response.id) { // Assuming the backend returns the created ticket with an 'id'
        navigate('/tickets'); // Redirect to tickets list on success
      } else {
        setError('Error desconocido al crear el ticket.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const handleRemoveFile = (fileToRemove) => {
    setSelectedFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
  };

  const TICKET_STATUSES = ['Nuevo', 'En Progreso', 'Resuelto', 'Cerrado', 'Pendiente'];
  const TICKET_SEVERITIES = ['Baja', 'Media', 'Alta', 'Crítica', 'Desconocida'];


  return (
    <div className="create-ticket-page-container"> {/* New container for the page */}
      <div className="card"> {/* Re-using card styling */}
        <div className="card-header">
          <h5 className="card-title">Crear Nuevo Ticket</h5>
        </div>
        <div className="card-body">
          {loading && <p>Creando ticket...</p>}
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="resumen" className="form-label">Resumen</label>
              <input
                type="text"
                className="form-control"
                id="resumen"
                name="resumen"
                value={formData.resumen}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="descripcion" className="form-label">Descripción</label>
              <textarea
                className="form-control"
                id="descripcion"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                rows="5"
              ></textarea>
            </div>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor="estado" className="form-label">Estado</label>
                <select
                  className="form-select"
                  id="estado"
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                >
                  {TICKET_STATUSES.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6 mb-3">
                <label htmlFor="severidad" className="form-label">Severidad</label>
                <select
                  className="form-select"
                  id="severidad"
                  name="severidad"
                  value={formData.severidad}
                  onChange={handleChange}
                >
                  {TICKET_SEVERITIES.map(severity => (
                    <option key={severity} value={severity}>{severity}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label htmlFor="categoria" className="form-label">Plataformas</label>
              <select
                className="form-select"
                id="categoria"
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
              >
                {categories.map(platform => (
                  <option key={platform} value={platform}>{platform}</option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label htmlFor="asignado_a_id" className="form-label">Asignar a</label>
              <select
                className="form-select"
                id="asignado_a_id"
                name="asignado_a_id"
                value={formData.asignado_a_id}
                onChange={handleChange}
              >
                <option value="">Sin Asignar</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.first_name} {user.last_name}</option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label htmlFor="files" className="form-label">Adjuntar Archivos</label>
              <input
                type="file"
                className="form-control"
                id="files"
                name="files"
                multiple
                onChange={handleFileChange}
              />
              {selectedFiles.length > 0 && (
                <div className="selected-files-list mt-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="selected-file-item">
                      <span>{file.name}</span>
                      <button type="button" onClick={() => handleRemoveFile(file)} className="btn btn-sm btn-danger ms-2">X</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="d-flex justify-content-end"> {/* Align buttons to the right */}
              <button type="button" className="btn btn-secondary me-2" onClick={() => navigate('/tickets')}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creando...' : 'Crear Ticket'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTicketPage;