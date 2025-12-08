import React, { useState } from 'react';
import './EMLScanner.css';

// Helper component for rendering body with VirusTotal links
const BodyRenderer = ({ text }) => {
  const urlRegex = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/g;
  const parts = text.split(urlRegex);

  return (
    <pre className="eml-body-content">
      {parts.map((part, index) => {
        if (part.match(urlRegex)) {
          return <VirusTotalLink key={index} value={part} />;
        }
        return <span key={index}>{part}</span>;
      })}
    </pre>
  );
};

// Helper component for VirusTotal links
const VirusTotalLink = ({ value }) => {
  const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
  const domainRegex = /@([a-zA-Z0-9.-]+)/;
  const urlRegex = /https?:\/\/([a-zA-Z0-9.-]+)/;

  const ipMatch = value.match(ipRegex);
  const domainMatch = value.match(domainRegex);
  const urlMatch = value.match(urlRegex);

  let lookupValue = null;
  let type = null;

  if (ipMatch) {
    lookupValue = ipMatch[0];
    type = 'ip-address';
  } else if (domainMatch) {
    lookupValue = domainMatch[1];
    type = 'domain';
  } else if (urlMatch) {
    lookupValue = urlMatch[1];
    type = 'domain';
  }

  if (!lookupValue) {
    return <span>{value}</span>;
  }

  const url = `https://www.virustotal.com/gui/${type}/${lookupValue}`;

  return (
    <>
      <span>{value}</span>
      <a href={url} target="_blank" rel="noopener noreferrer" className="ms-2" title={`Buscar en VirusTotal: ${lookupValue}`}>
        <i className="fas fa-search text-primary"></i>
      </a>
    </>
  );
};


const EMLScanner = () => {
  const [file, setFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHeaders, setShowHeaders] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setAnalysisResult(null); // Clear previous results
    setError('');
  };

  const handleScan = async () => {
    if (!file) {
      setError('Por favor, seleccione un archivo EML para escanear.');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append('eml_file', file);

    try {
      const response = await fetch('/api/v1/eml/scan', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al escanear el archivo EML.');
      }

      const result = await response.json();
      setAnalysisResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const headersWithVT = [
    "x-feas-client-ip",
    "x-fe-last-public-client-ip",
    "x-sender",
    "x-return-path",
    "return-path",
    "x-envelope-from",
    "x-fe-envelope-from",
    "from"
  ];

  return (
    <div className="eml-scanner-container container mt-4">
      <h1 className="mb-4">Escáner de Archivos EML</h1>

      <div className="card p-4 shadow-sm mb-4">
        <div className="card-body">
          <div dangerouslySetInnerHTML={{ __html: `
            <p>Este escáner analiza archivos EML en busca de posibles amenazas de seguridad, como enlaces maliciosos, adjuntos sospechosos e indicadores de phishing.</p>
            <h6>Detalles del Análisis de Seguridad:</h6>
            <ul>
              <li>
                <strong>Enlaces Maliciosos:</strong>
                <p>Se extraen las URLs presentes en el cuerpo del correo.
                (Actualmente, la detección se basa en un análisis de palabras clave en las URLs. Por ejemplo, se buscan URLs que contengan "login" (a menos que sean de un dominio conocido como legítimo) o "update" (si no pertenecen a un dominio legítimo). Es una implementación básica y se recomienda integrar análisis más robustos, como listas negras o servicios de navegación segura (VirusTotal).)</p>
              </li>
              <li>
                <strong>Adjuntos Sospechosos:</strong>
                <p>Se examinan los nombres de los archivos adjuntos y sus tipos de contenido.
                (Se consideran sospechosos los adjuntos que tienen extensiones de archivo comúnmente asociadas con malware o scripts maliciosos, tales como <code>.exe</code>, <code>.zip</code>, <code>.js</code>, <code>.vbs</code>, <code>.scr</code>, <code>.bat</code>, <code>.cmd</code>, <code>.ps1</code>, <code>.dll</code>, <code>.chm</code>, <code>.hta</code>.)</p>
              </li>
              <li>
                <strong>Indicadores de Phishing:</strong>
                <p>Se analiza el asunto, el cuerpo y los encabezados del correo electrónico.
                (Se buscan varios patrones: palabras clave de urgencia/amenaza -frases como "urgente", "acción requerida", "su cuenta será suspendida", "verifique su cuenta" o "caduca" en el asunto o el cuerpo-; solicitudes de credenciales -términos como "contraseña", "usuario", "credenciales", "iniciar sesión" o "verificar ahora" en el cuerpo-; saludos genéricos -expresiones como "estimado usuario" o "querido cliente" en lugar de un saludo personalizado-; y desajuste de remitente (<code>From</code>/<code>Return-Path</code>) -si la dirección en el encabezado <code>From</code> difiere significativamente de la del <code>Return-Path</code>, podría indicar un intento de suplantación de identidad-.)</p>
              </li>
            </ul>
            <p>Este sistema realiza un análisis basado en patrones y palabras clave. Para una detección más avanzada, se sugiere integrar soluciones de seguridad externas o bases de datos de inteligencia de amenazas.</p>
          ` }} />
        </div>
      </div>

      <div className="card p-4 shadow-sm mb-4">
        <div className="input-group">
          <input type="file" className="form-control" accept=".eml" onChange={handleFileChange} />
          <button className="btn btn-primary" onClick={handleScan} disabled={loading || !file}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span className="ms-2">Escaneando...</span>
              </>
            ) : (
              'Escanear Archivo EML'
            )}
          </button>
        </div>
        {error && <div className="alert alert-danger mt-3">{error}</div>}
      </div>

      {analysisResult && (
        <div className="analysis-result">
          <h2 className="mb-3">Resultado del Análisis</h2>

          {/* EML Details */}
          <div className="card mb-3 shadow-sm">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Detalles del EML</h5>
            </div>
            <div className="card-body">
              <p><strong>De:</strong> {analysisResult.from}</p>
              <p><strong>Para:</strong> {analysisResult.to}</p>
              <p><strong>Asunto:</strong> {analysisResult.subject}</p>
              <p><strong>Fecha:</strong> {analysisResult.date}</p>
              <button className="btn btn-link p-0" onClick={() => setShowHeaders(!showHeaders)}>
                {showHeaders ? 'Ocultar Encabezados' : 'Mostrar Encabezados'}
              </button>
              {showHeaders && (
                <div className="headers-section mt-3 p-3 border rounded">
                  <h6>Encabezados Completos:</h6>
                  <table className="table table-sm table-bordered">
                    <tbody>
                      {Object.entries(analysisResult.headers).map(([key, value]) => (
                        <tr key={key}>
                          <td className="header-key"><strong>{key}</strong></td>
                          <td>
                            {headersWithVT.includes(key.toLowerCase()) ? <VirusTotalLink value={value} /> : value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Security Analysis */}
          <div className="card mb-3 shadow-sm">
            <div className="card-header bg-warning text-dark">
              <h5 className="mb-0">Análisis de Seguridad</h5>
            </div>
            <div className="card-body">
              <h6>Enlaces Maliciosos:</h6>
              {Array.isArray(analysisResult.security_analysis.malicious_links) && analysisResult.security_analysis.malicious_links.length > 0 ? (
                <ul className="list-group mb-3">
                  {analysisResult.security_analysis.malicious_links.map((link, index) => (
                    <li key={index} className="list-group-item list-group-item-danger">
                      <i className="fas fa-exclamation-triangle me-2"></i>{link}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-success"><i className="fas fa-check-circle me-2"></i>No se detectaron enlaces maliciosos obvios.</p>
              )}

              <h6>Adjuntos Sospechosos:</h6>
              {Array.isArray(analysisResult.security_analysis.suspicious_attachments) && analysisResult.security_analysis.suspicious_attachments.length > 0 ? (
                <ul className="list-group mb-3">
                  {analysisResult.security_analysis.suspicious_attachments.map((att, index) => (
                    <li key={index} className="list-group-item list-group-item-warning">
                      <i className="fas fa-paperclip me-2"></i>
                      <strong>{att.filename}</strong> ({att.content_type}) - <span className="text-danger">¡Sospechoso!</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-success"><i className="fas fa-check-circle me-2"></i>No se detectaron adjuntos sospechosos.</p>
              )}

              <h6>Indicadores de Phishing:</h6>
              {Array.isArray(analysisResult.security_analysis.phishing_indicators) && analysisResult.security_analysis.phishing_indicators.length > 0 ? (
                <ul className="list-group mb-3">
                  {analysisResult.security_analysis.phishing_indicators.map((indicator, index) => (
                    <li key={index} className="list-group-item list-group-item-warning">
                      <i className="fas fa-lightbulb me-2"></i>{indicator}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-success"><i className="fas fa-check-circle me-2"></i>No se detectaron indicadores de phishing obvios.</p>
              )}
            </div>
          </div>

          {/* EML Body */}
          <div className="card mb-3 shadow-sm">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">Cuerpo del Correo</h5>
            </div>
            <div className="card-body">
              <BodyRenderer text={analysisResult.body} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EMLScanner;
