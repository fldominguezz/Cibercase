import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';

const InstalacionAvForm = () => {
  const navigate = useNavigate();
  const [lugar, setLugar] = useState(''); // Changed to single string
  const [cantidadEquipos, setCantidadEquipos] = useState(1);
  const [equipos, setEquipos] = useState([{ ip: '', mac: '', hostname: '' }]);
  const [antivirus, setAntivirus] = useState('');
  const [tipoAvFree, setTipoAvFree] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCantidadChange = (e) => {
    let count = parseInt(e.target.value, 10);
    if (isNaN(count) || count < 1) {
      count = 1;
    }
    
    setCantidadEquipos(count);
    
    let newEquipos = [];
    for (let i = 0; i < count; i++) {
      newEquipos.push(equipos[i] || { ip: '', mac: '', hostname: '' });
    }
    setEquipos(newEquipos);
  };

  const handleEquipoChange = (index, field, value) => {
    const newEquipos = [...equipos];
    newEquipos[index][field] = value;
    setEquipos(newEquipos);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    // Convert equipos array to a string for the description
    const equiposString = equipos.map((eq, i) => 
      `Equipo ${i + 1}: IP=${eq.ip}, MAC=${eq.mac}, Hostname=${eq.hostname}`
    ).join('; ');

    const form_data = {
      lugar,
      cantidad_de_equipos: cantidadEquipos,
      detalle_de_equipos: equiposString,
      antivirus_instalado: antivirus,
      ...(antivirus === 'AV FREE' && { tipo_av_free: tipoAvFree }),
      observaciones,
    };

    const payload = {
      form_name: 'Instalación de Antivirus',
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
  
  const fieldsetStyle = {
    border: '1px solid #ccc',
    borderRadius: '4px',
    padding: '10px',
    margin: '20px 0'
  };

  const legendStyle = {
    padding: '0 5px',
    fontWeight: 'bold'
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
      <h2>Instalación de Antivirus</h2>

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Lugar</legend>
        <label>Lugar (División, Dirección, Superintendencia):</label>
        <input 
          type="text" 
          style={inputStyle} 
          value={lugar} 
          onChange={(e) => setLugar(e.target.value)} 
          placeholder="(División, Dirección, Superintendencia)" 
        />
      </fieldset>

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Equipos</legend>
        <label>¿Cuántos equipos?</label>
        <input type="number" min="1" style={inputStyle} value={cantidadEquipos} onChange={handleCantidadChange} />

        {equipos.map((equipo, index) => (
          <div key={index} style={{border: '1px solid #eee', padding: '10px', borderRadius: '4px', marginBottom: '10px'}}>
            <h4>Equipo {index + 1}</h4>
            <label>Dirección IP:</label>
            <input type="text" style={inputStyle} value={equipo.ip} onChange={(e) => handleEquipoChange(index, 'ip', e.target.value)} />
            <label>MAC Address:</label>
            <input type="text" style={inputStyle} value={equipo.mac} onChange={(e) => handleEquipoChange(index, 'mac', e.target.value)} />
            <label>Hostname:</label>
            <input type="text" style={inputStyle} value={equipo.hostname} onChange={(e) => handleEquipoChange(index, 'hostname', e.target.value)} />
          </div>
        ))}
      </fieldset>

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Software</legend>
        <label>Antivirus:</label>
        <select style={inputStyle} value={antivirus} onChange={(e) => setAntivirus(e.target.value)}>
          <option value="">Seleccione una opción</option>
          <option value="FortiEMS">FortiEMS</option>
          <option value="ESET">ESET</option>
          <option value="EDR">EDR</option>
          <option value="AV FREE">AV FREE</option>
        </select>

        {antivirus === 'AV FREE' && (
          <div>
            <label>Especifique qué Antivirus "FREE" instaló:</label>
            <input type="text" style={inputStyle} value={tipoAvFree} onChange={(e) => setTipoAvFree(e.target.value)} />
          </div>
        )}
      </fieldset>

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Finalización</legend>
        <label>Observaciones:</label>
        <textarea style={{...inputStyle, height: '100px'}} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </fieldset>

      <button type="submit" style={buttonStyle}>Generar Ticket</button>
    </form>
  );
};

export default InstalacionAvForm;
