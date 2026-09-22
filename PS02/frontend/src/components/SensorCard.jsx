import React from 'react';

export default function SensorCard({
  sensorName,
  value,
  unit,
  status,
  nodeId = 'MASTER-01',
  lastUpdated,
  onActionClick,
  actionLabel,
}) {
  const hasValue = value !== undefined && value !== null && value !== '' && value !== '-';
  const displayValue = hasValue ? value : '-';
  const normalizedStatus = status ? status.toLowerCase() : null;

  return (
    <div className="sensor-card">
      <div>
        <div className="sensor-card-top">
          <span className="sensor-name">{sensorName}</span>
          <span className="sensor-node-tag">{nodeId}</span>
        </div>

        <div className="sensor-val-row">
          <span className="sensor-val">{displayValue}</span>
          {unit && hasValue && <span className="sensor-unit">{unit}</span>}
        </div>
      </div>

      <div>
        <div className="sensor-card-bottom">
          {hasValue && normalizedStatus ? (
            <span className={`status-badge ${normalizedStatus}`}>
              {status}
            </span>
          ) : (
            <span style={{ fontSize: '11px', color: '#8A8A8A' }}>-</span>
          )}
          <span>{hasValue && lastUpdated ? lastUpdated : '-'}</span>
        </div>

        {actionLabel && (
          <div style={{ marginTop: '8px' }}>
            <button
              onClick={onActionClick}
              className="btn btn-outline btn-sm"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {actionLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
