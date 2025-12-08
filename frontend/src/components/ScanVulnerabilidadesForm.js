import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';

const ScanVulnerabilidadesForm = () => {
  const navigate = useNavigate();
  const [activos, setActivos] = useState('');
  const [tipoScan, setTipoScan] = useState('No intrusivo');
  const [fechaDeseada, setFechaDeseada] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const form_data = {
      activos_a_escanear: activos,
      tipo_de_scan: tipoScan,
      fecha_deseada: fechaDeseada,
      justificacion,
    };

    const payload = {
      form_name: 'Solicitud de Scan de Vulnerabilidades',
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
      <h2>Solicitud de Scan de Vulnerabilidades</h2>
      
      <label>Activos a escanear (IPs, rangos, URLs, etc.):</label>
      <textarea 
        style={{...inputStyle, height: '100px'}} 
        value={activos} 
        onChange={(e) => setActivos(e.target.value)} 
        placeholder="Ej: 192.168.1.0/24, www.example.com"
      />

      <label>Tipo de Scan:</label>
      <select style={inputStyle} value={tipoScan} onChange={(e) => setTipoScan(e.target.value)}>
        <option value="No intrusivo">No intrusivo (descubrimiento y versiones)</option>
        <option value="Intrusivo">Intrusivo (con exploits de prueba)</option>
        <option value="Completo">Completo (Intrusivo + políticas y credenciales)</option>
      </select>

      <label>Fecha deseada para el escaneo:</label>
      <input 
        type="date" 
        style={inputStyle} 
        value={fechaDeseada} 
        onChange={(e) => setFechaDeseada(e.target.value)} 
      />

      <label>Justificación / Motivo del escaneo:</label>
      <textarea 
        style={{...inputStyle, height: '100px'}} 
        value={justificacion} 
        onChange={(e) => setJustificacion(e.target.value)} 
      />

      <button type="submit" style={buttonStyle}>Generar Ticket</button>
    </form>
  );
};

export default ScanVulnerabilidadesForm;
