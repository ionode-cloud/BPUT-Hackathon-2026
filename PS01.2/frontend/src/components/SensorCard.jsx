import {
  Thermometer, Droplets, Wind, Activity, Gauge, Flame, AlertCircle
} from 'lucide-react';
import {
  getStatus, STATUS_COLORS, STATUS_LABELS, formatValue,
  DEFAULT_THRESHOLDS, getThresholdPercentage, timeAgo
} from '../utils/thresholds';

const SENSOR_ICONS = {
  temperature: Thermometer,
  humidity: Droplets,
  pm25: Wind,
  pm10: Wind,
  co2: Activity,
  co: Activity,
  no2: Gauge,
  so2: Gauge,
  o3: Gauge,
  voc: AlertCircle,
  nh3: AlertCircle,
  smoke: Flame,
};

const STATUS_THEMES = {
  safe: {
    tabBg: '#ECFDF5',
    iconColor: '#10B981',
    borderColor: '#A7F3D0',
    meterGrad: 'linear-gradient(90deg, #34D399, #10B981)',
    glow: 'rgba(16, 185, 129, 0.18)',
  },
  moderate: {
    tabBg: '#FFFBEB',
    iconColor: '#F59E0B',
    borderColor: '#FDE68A',
    meterGrad: 'linear-gradient(90deg, #FCD34D, #FFAE33)',
    glow: 'rgba(255, 174, 51, 0.2)',
  },
  dangerous: {
    tabBg: '#FFF1F2',
    iconColor: '#FF5376',
    borderColor: '#FECDD3',
    meterGrad: 'linear-gradient(90deg, #FDA4AF, #FF5376)',
    glow: 'rgba(255, 83, 118, 0.22)',
  },
  unknown: {
    tabBg: '#F8FAFC',
    iconColor: '#94A3B8',
    borderColor: '#E2E8F0',
    meterGrad: 'linear-gradient(90deg, #CBD5E1, #94A3B8)',
    glow: 'transparent',
  },
};

export default function SensorCard({
  sensorType,
  value,
  unit,
  timestamp,
  spec,
  thresholds = DEFAULT_THRESHOLDS
}) {
  const t = spec || thresholds[sensorType] || DEFAULT_THRESHOLDS[sensorType] || {};
  const key = sensorType || spec?.key;
  const status = getStatus(key, value, thresholds);
  const sc = STATUS_COLORS[status] || STATUS_COLORS.unknown;
  const theme = STATUS_THEMES[status] || STATUS_THEMES.unknown;
  const label = STATUS_LABELS[status] || 'No Data';
  const displayValue = formatValue(value, unit || t?.unit);
  const pct = getThresholdPercentage(key, value, thresholds);

  const Icon = SENSOR_ICONS[key] || Activity;

  const safeRangeText = t?.safeText || (t?.safeMin !== undefined ? `${t.safeMin}–${t.safeMax}` : 'Optimal');
  const dangerRangeText = t?.dangerousText || (t?.dangerousMin !== undefined ? `>${t.dangerousMin}` : 'High Risk');

  return (
    <div className="overview-sensor-card">
      {/* Top Protruding Tab */}
      <div
        className="sensor-card-tab"
        style={{
          background: theme.tabBg,
          borderColor: theme.borderColor,
          boxShadow: `0 4px 12px ${theme.glow}`
        }}
        title={`${t?.name || 'Sensor'} icon`}
      >
        <Icon size={18} color={theme.iconColor} />
      </div>

      {/* Header with Title & Status Pill */}
      <div className="sensor-card-header">
        <div style={{ paddingLeft: 42 }}>
          <div className="sensor-name">
            {t?.name || t?.displayName || (sensorType ? sensorType.toUpperCase() : 'Sensor')}
          </div>
          {t?.sensor && (
            <span className="sensor-hardware-tag">
              {t.sensor}
            </span>
          )}
        </div>

        <span
          className="sensor-status-pill"
          style={{
            background: sc.bg,
            color: sc.text,
            borderColor: sc.border,
          }}
        >
          <span className="status-dot" style={{ background: sc.dot }} />
          {label}
        </span>
      </div>

      {/* Measurement Value Display */}
      <div className="sensor-metric-display">
        <span className="sensor-val-num" style={{ color: sc.text }}>
          {displayValue.split(' ')[0]}
        </span>
        <span className="sensor-val-unit">
          {unit || t?.unit}
        </span>
      </div>

      {/* Calibrated Threshold Meter Bar */}
      <div className="sensor-meter-container">
        <div className="sensor-meter-track">
          <div
            className="sensor-meter-fill"
            style={{
              width: `${Math.min(Math.max(pct, 5), 100)}%`,
              background: theme.meterGrad,
            }}
          />
        </div>
        <div className="sensor-meter-limits">
          <span>Safe: {safeRangeText}</span>
          <span>Danger: {dangerRangeText}</span>
        </div>
      </div>

      {/* Timestamp footer */}
      {timestamp && (
        <div className="sensor-card-footer">
          <span className="sensor-live-dot" />
          <span>Updated {timeAgo(timestamp)}</span>
        </div>
      )}
    </div>
  );
}
