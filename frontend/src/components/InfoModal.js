import React from 'react';
import './InfoModal.css'; // Create this CSS file for styling

const InfoModal = ({ title, content, onClose }) => {
  return (
    <div className="info-modal-overlay" onClick={onClose} data-testid="info-modal-overlay">
      <div className="info-modal-content" onClick={(e) => e.stopPropagation()} data-testid="info-modal-content">
        <div className="info-modal-header">
          <h5 className="info-modal-title">{title}</h5>
          <button type="button" className="close" onClick={onClose}>
            <span>&times;</span>
          </button>
        </div>
        <div className="info-modal-body">
          <pre>{content}</pre> {/* Use <pre> for pre-formatted text like raw logs */}
        </div>
        <div className="info-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
