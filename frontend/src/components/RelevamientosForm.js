import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';

const RelevamientosForm = () => {
  const navigate = useNavigate();
  const [area, setArea] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const handleSubmit = async (e) => {
    e.preventDefault();

    const form_data = {
      area_a_relevar: area,
      motivo_del_relevamiento: motivo,
      observaciones_adicionales: observaciones,
    };

    const payload = {
      form_name: 'Relevamiento',
      form_data: form_data,
    };

    try {
      await apiFetch('/forms/submit', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      alert('¡Formulario enviado con éxito!');
      navigate('/');
    } catch (err) {
      alert(`Error al enviar el formulario: ${err.message}`);
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
      <h2>Formulario de Relevamiento</h2>
      
      <label>Área/Sector a relevar:</label>
      <input 
        type="text" 
        style={inputStyle} 
        value={area} 
        onChange={(e) => setArea(e.target.value)} 
      />

      <label>Motivo del relevamiento:</label>
      <textarea 
        style={{...inputStyle, height: '100px'}} 
        value={motivo} 
        onChange={(e) => setMotivo(e.target.value)} 
      />

      <label>Observaciones Adicionales:</label>
      <textarea 
        style={{...inputStyle, height: '150px'}} 
        value={observaciones} 
        onChange={(e) => setObservaciones(e.target.value)} 
      />

      <button type="submit" style={buttonStyle}>Generar Ticket</button>
    </form>
  );
};

export default RelevamientosForm;
