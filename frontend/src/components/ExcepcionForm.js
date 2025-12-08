import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';

const ExcepcionForm = () => {
  const navigate = useNavigate();
  const [solicitante, setSolicitante] = useState('');
  const [sistema, setSistema] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [duracion, setDuracion] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const form_data = {
      solicitante,
      sistema_afectado: sistema,
      justificacion,
      duracion_de_la_excepcion: duracion,
    };

    const payload = {
      form_name: 'Solicitud de Excepción',
      form_data: form_data,
    };

    try {
      const response = await apiFetch('/forms/submit', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      alert('Ticket creado con éxito!');
      navigate(`/tickets/${response.ticket_id}`);
    } catch (err) {
      setError(`Error al crear el ticket: ${err.message}`);
      alert(`Error al crear el ticket: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const formStyle = {
    padding: '20px',
    maxWidth: '800px',
    margin: '40px auto',
    border: '1px solid #ddd',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    fontFamily: 'sans-serif'
  };

  const inputStyle = {
    width: '100%',
    padding: '8px',
    margin: '6px 0 12px',
    boxSizing: 'border-box',
    border: '1px solid #ccc',
    borderRadius: '4px'
  };

  const buttonStyle = {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px'
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <h2>Solicitud de Excepción</h2>
      
      <label>Solicitante (Nombre y Apellido):</label>
      <input 
        type="text" 
        style={inputStyle} 
        value={solicitante} 
        onChange={(e) => setSolicitante(e.target.value)} 
      />

      <label>Sistema/Aplicación/Activo afectado:</label>
      <input 
        type="text" 
        style={inputStyle} 
        value={sistema} 
        onChange={(e) => setSistema(e.target.value)} 
      />

      <label>Justificación técnica y de negocio:</label>
      <textarea 
        style={{...inputStyle, height: '150px'}} 
        value={justificacion} 
        onChange={(e) => setJustificacion(e.target.value)} 
      />

      <label>Duración de la excepción (Ej: 30 días, Indefinido):</label>
      <input 
        type="text" 
        style={inputStyle} 
        value={duracion} 
        onChange={(e) => setDuracion(e.target.value)} 
      />

      <button type="submit" style={buttonStyle}>Generar Ticket</button>
    </form>
  );
};

export default ExcepcionForm;
