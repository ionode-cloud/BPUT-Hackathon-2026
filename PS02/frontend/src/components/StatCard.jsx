import React from 'react';

export default function StatCard({ label, value, unit, icon: Icon, subtext, statusBadge, statusType }) {
  const hasValue = value !== undefined && value !== null && value !== '';
  const hasBadge = Boolean(statusBadge && statusType);

  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-label">{label}</span>
        {Icon && <Icon size={16} className="stat-icon" />}
      </div>
      <div className="stat-card-body">
        {hasBadge ? (
          <span className={`status-badge ${statusType?.toLowerCase() || 'moderate'}`}>
            {statusBadge}
          </span>
        ) : (
          <>
            <span className="stat-value">{hasValue ? value : '-'}</span>
            {unit && hasValue && <span className="stat-unit">{unit}</span>}
          </>
        )}
      </div>
      {subtext && <div className="stat-subtext">{subtext}</div>}
    </div>
  );
}
