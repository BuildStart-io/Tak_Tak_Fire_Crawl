import React from 'react';

export default function MetricCard({ title, value, limit, progressPercent, icon: Icon }) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        <span className="metric-title">{title}</span>
        {Icon && (
          <div className="metric-icon-wrap">
            <Icon size={16} />
          </div>
        )}
      </div>

      <div className="metric-number-row">
        <span className="metric-value">{value}</span>
        {limit && <span className="metric-limit">/{limit}</span>}
      </div>

      <div className="progress-track">
        <div 
          className="progress-fill" 
          style={{ width: `${Math.min(Math.max(progressPercent, 5), 100)}%` }}
        ></div>
      </div>
    </div>
  );
}
