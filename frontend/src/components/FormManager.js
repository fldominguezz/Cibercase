import React from 'react';
import { Link } from 'react-router-dom';
import './FormManager.css';

const FormManager = () => {
    return (
        <div className="form-manager">
            <h1>Formularios</h1>
            <div className="predefined-forms-list card" style={{ marginTop: '20px' }}>
                <h2>Formularios Fijos</h2>
                <ul>
                    <li>
                        <Link to="/instalacion-av">Instalación de AV</Link>
                    </li>
                    <li>
                        <Link to="/relevamientos">Relevamientos</Link>
                    </li>
                    <li>
                        <Link to="/solicitudes-excepcion">Solicitudes de excepción</Link>
                    </li>
                    <li>
                        <Link to="/scan-vulnerabilidades">Solicitud de Scan de Vulnerabilidades</Link>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default FormManager;
