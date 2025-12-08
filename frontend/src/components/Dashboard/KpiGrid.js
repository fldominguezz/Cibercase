import React from 'react';
import { motion } from 'framer-motion';

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

const KpiGrid = ({ kpiData, onNavigate }) => {
  const {
    totalTickets,
    myAssignedTicketsCount,
    avgResolutionTime,
    avgResponseTime,
  } = kpiData;

  return (
    <motion.div variants={itemVariants} className="kpi-grid">
      <div className="kpi-card" onClick={() => onNavigate('all', 'true')}>
        <div className="kpi-value">{totalTickets}</div>
        <div className="kpi-label">Total de Tickets</div>
      </div>
      <div className="kpi-card" onClick={() => onNavigate('assignedToMe', 'true')}>
        <div className="kpi-value">{myAssignedTicketsCount}</div>
        <div className="kpi-label">Mis Tickets Asignados</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-value">{avgResolutionTime}</div>
        <div className="kpi-label">Tiempo Promedio de Resolución</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-value">{avgResponseTime}</div>
        <div className="kpi-label">Tiempo Promedio de Respuesta</div>
      </div>
    </motion.div>
  );
};

export default KpiGrid;
