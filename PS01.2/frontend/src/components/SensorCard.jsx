import {
  Thermometer, Droplets, Wind, Activity, Gauge, Flame, AlertCircle
} from 'lucide-react';
import {
  getStatus, STATUS_COLORS, STATUS_LABELS, formatValue,
  DEFAULT_THRESHOLDS, getThresholdPercentage, timeAgo
} from '../utils/thresholds';

const SENSOR_ICONS = {
  temperature: Thermometer,
  humidity:    Droplets,
  pm25:        Wind,
  pm10:        Wind,
  co2:         Activity,
  co:          Activity,
  no2:         Gauge,
  so2:         Gauge,
  o3:          Gauge,
  voc:         AlertCircle,
  nh3:         AlertCircle,
  smoke:       Flame,
};

/* Status → CSS class for the left slab color */
const STATUS_CLASS = {
  safe:      'sc-safe',
  moderate:  'sc-moderate',
  dangerous: 'sc-dangerous',
  unknown:   'sc-unknown',
};

export default function SensorCard({
  sensorType,
  value,
  unit,
  timestamp,
  spec,
  thresholds = DEFAULT_THRESHOLDS
}) {
  const t            = spec || thresholds[sensorType] || DEFAULT_THRESHOLDS[sensorType] || {};
  const key          = sensorType || spec?.key;
  const status       = getStatus(key, value, thresholds);
  const sc           = STATUS_COLORS[status] || STATUS_COLORS.unknown;
  const label        = STATUS_LABELS[status] || 'No Data';
  const displayValue = formatValue(value, unit || t?.unit);
  const pct          = getThresholdPercentage(key, value, thresholds);
  const slabClass    = STATUS_CLASS[status] || 'sc-unknown';

  const Icon = SENSOR_ICONS[key] || Activity;

  // Meter gradient per status
  const meterGrads = {
    safe:      'linear-gradient(90deg, #6EE7B7, #10B981, #059669)',
    moderate:  'linear-gradient(90deg, #FCD34D, #F59E0B)',
    dangerous: 'linear-gradient(90deg, #FDA4AF, #F43F5E, #E11D48)',
    unknown:   'linear-gradient(90deg, #D1D5DB, #9CA3AF)',
  };
  const meterGlow = {
    safe:      'rgba(16,185,129,0.25)',
    moderate:  'rgba(245,158,11,0.25)',
    dangerous: 'rgba(244,63,94,0.28)',
    unknown:   'transparent',
  };

  const safeRangeText   = t?.safeText    || (t?.safeMin    !== undefined ? `${t.safeMin}–${t.safeMax}` : 'Optimal');
  const dangerRangeText = t?.dangerousText || (t?.dangerousMin !== undefined ? `>${t.dangerousMin}` : 'High Risk');

  // Split the display value into number and unit
  const numPart  = displayValue.split(' ')[0];
  const unitPart = unit || t?.unit || '';

  return (
    <div className={`overview-sensor-card ${slabClass}`}>

      {/* ── Left colored slab: icon + value ─────── */}
      <div className="sensor-card-tab">
        {/* Icon circle */}
        <div className="sensor-icon-circle">
          <Icon size={18} color="#FFFFFF" />
        </div>

        {/* Value */}
        <div style={{ textAlign: 'center' }}>
          <div className="sensor-val-num">{numPart}</div>
          <div className="sensor-val-unit">{unitPart}</div>
        </div>
      </div>

      {/* ── Right white panel: name + status + meter ── */}
      <div className="sensor-card-header">

        {/* Top row: name + status pill */}
        <div className="sensor-card-top-row">
          <div>
            <div className="sensor-name">
              {t?.name || t?.displayName || (sensorType ? sensorType.toUpperCase() : 'Sensor')}
            </div>
            {t?.sensor && (
              <span className="sensor-hardware-tag">{t.sensor}</span>
            )}
          </div>

          <span
            className="sensor-status-pill"
            style={{
              background:  sc.bg,
              color:       sc.text,
              borderColor: sc.border,
            }}
          >
            <span className="status-dot" style={{ background: sc.dot }} />
            {label}
          </span>
        </div>

        {/* Meter bar */}
        <div className="sensor-meter-container">
          <div className="sensor-meter-track">
            <div
              className="sensor-meter-fill"
              style={{
                width:      `${Math.min(Math.max(pct, value !== null && value !== undefined ? 4 : 0), 100)}%`,
                background: meterGrads[status] || meterGrads.unknown,
                boxShadow:  `0 0 8px ${meterGlow[status] || 'transparent'}`,
              }}
            />
          </div>
          <div className="sensor-meter-limits">
            <span>Safe: {safeRangeText}</span>
            <span style={{ color: '#F43F5E' }}>Danger: {dangerRangeText}</span>
          </div>
        </div>

        {/* Footer: live timestamp */}
        {timestamp && (
          <div className="sensor-card-footer">
            <span className="sensor-live-dot" />
            <span>Updated {timeAgo(timestamp)}</span>
          </div>
        )}

      </div>
    </div>
  );
}
