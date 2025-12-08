import React from 'react';
import './DashboardSkeleton.css';

const DashboardSkeleton = () => {
  return (
    <div className="skeleton-container">
      {/* Skeleton for KPIs */}
      <div className="skeleton-kpi-grid">
        <div className="skeleton skeleton-kpi-card"></div>
        <div className="skeleton skeleton-kpi-card"></div>
        <div className="skeleton skeleton-kpi-card"></div>
        <div className="skeleton skeleton-kpi-card"></div>
      </div>

      {/* Skeleton for Charts */}
      <div className="skeleton-charts-grid">
        <div className="skeleton"></div>
        <div className="skeleton"></div>
        <div className="skeleton"></div>
        <div className="skeleton"></div>
        <div className="skeleton skeleton-table-card"></div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
