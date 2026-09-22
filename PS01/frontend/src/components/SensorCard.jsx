import {
  getStatus, STATUS_COLORS, STATUS_LABELS, formatValue,
  DEFAULT_THRESHOLDS, getThresholdPercentage, timeAgo
} from '../utils/thresholds';

export default function SensorCard({
  sensorType,
  value,
  unit,
  timestamp,
  spec,
  thresholds = DEFAULT_THRESHOLDS
}) {
  const t = spec || thresholds[sensorType] || DEFAULT_THRESHOLDS[sensorType] || {};
  const status = getStatus(sensorType || spec?.key, value, thresholds);
  const sc = STATUS_COLORS[status] || STATUS_COLORS.unknown;
  const label = STATUS_LABELS[status] || 'No Data';
  const displayValue = formatValue(value, unit || t?.unit);
  const pct = getThresholdPercentage(sensorType || spec?.key, value, thresholds);

  const safeRangeText = t?.safeText || (t?.safeMin !== undefined ? `${t.safeMin} – ${t.safeMax} ${unit || t?.unit || ''}` : 'Optimal');
  const dangerRangeText = t?.dangerousText || (t?.dangerousMin !== undefined ? `> ${t.dangerousMin} ${unit || t?.unit || ''}` : 'High Risk');

  return (
    <div className="overview-sensor-card">
      {/* Header with Title & Status Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--color-heading)' }}>
            {t?.name || t?.displayName || (sensorType ? sensorType.toUpperCase() : 'Sensor')}
          </div>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: sc.bg,
            border: `1px solid ${sc.border}`,
            borderRadius: 999,
            padding: '3px 10px',
            fontSize: 10.5,
            fontWeight: 700,
            color: sc.text,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot }} />
          {label}
        </span>
      </div>

      {/* Main Measurement */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '6px 0' }}>
        <span style={{ fontSize: 32, fontWeight: 800, color: sc.text, lineHeight: 1 }}>
          {displayValue.split(' ')[0]}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-label)' }}>
          {unit || t?.unit}
        </span>
      </div>

      {/* Threshold Meter Bar */}
      <div>
        <div
          style={{
            height: 6,
            background: '#F1E9C8',
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: sc.dot,
              borderRadius: 999,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10.5, color: 'var(--color-text-label)' }}>
          <span>Safe: {safeRangeText}</span>
          <span>Danger: {dangerRangeText}</span>
        </div>
      </div>

      {timestamp && (
        <div style={{ fontSize: 10, color: 'var(--color-text-label)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
          Updated {timeAgo(timestamp)}
        </div>
      )}
    </div>
  );
}
