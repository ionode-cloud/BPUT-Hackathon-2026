import { useState } from 'react';
import { X, RefreshCw, AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react';

// ── Toast system ──────────────────────────────
let toastId = 0;
let toastSetters = [];

export const toast = (message, type = 'success') => {
  const id = ++toastId;
  toastSetters.forEach(fn => fn(prev => [...prev, { id, message, type }]));
  setTimeout(() => {
    toastSetters.forEach(fn => fn(prev => prev.filter(t => t.id !== id)));
  }, 4000);
};

const TOAST_ICONS = {
  success: CheckCircle,
  error:   AlertTriangle,
  warning: Info,
};

const TOAST_COLORS = {
  success: { icon: '#10B981', border: '#10B981', bg: 'rgba(16,185,129,0.06)' },
  error:   { icon: '#F43F5E', border: '#F43F5E', bg: 'rgba(244,63,94,0.06)'  },
  warning: { icon: '#F59E0B', border: '#F59E0B', bg: 'rgba(245,158,11,0.06)' },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  if (!toastSetters.includes(setToasts)) toastSetters.push(setToasts);
  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <div className="toast-container">
      {toasts.map(t => {
        const Icon = TOAST_ICONS[t.type] || Info;
        const c    = TOAST_COLORS[t.type] || TOAST_COLORS.success;
        return (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            style={{ background: c.bg, borderColor: c.border }}
          >
            <Icon size={16} color={c.icon} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-label)',
                display: 'flex', alignItems: 'center',
                borderRadius: 6, padding: 2,
                transition: 'color 0.15s ease',
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Loading state ─────────────────────────────
export function LoadingState({ text = 'Loading...' }) {
  return (
    <div className="loading-overlay">
      <div style={{ position: 'relative', width: 56, height: 56 }}>
        {/* Outer ring */}
        <div style={{
          position: 'absolute', inset: 0,
          border: '3px solid #D1FAE5',
          borderTopColor: '#059669',
          borderRightColor: '#F43F5E',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        {/* Inner pulse */}
        <div style={{
          position: 'absolute', inset: 10,
          background: 'rgba(16,185,129,0.15)',
          borderRadius: '50%',
          animation: 'pulse 1.4s ease-in-out infinite',
        }} />
        {/* Center dot */}
        <div style={{
          position: 'absolute', inset: 18,
          background: '#10B981',
          borderRadius: '50%',
        }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 14, fontWeight: 700,
          color: 'var(--color-primary)',
          letterSpacing: '0.2px',
        }}>
          {text}
        </div>
        <div style={{
          display: 'flex', gap: 5, justifyContent: 'center', marginTop: 10,
        }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#10B981',
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Error state ───────────────────────────────
export function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state">
      <div style={{
        width: 52, height: 52,
        background: 'rgba(244,63,94,0.12)',
        border: '2px solid rgba(244,63,94,0.25)',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <AlertTriangle size={24} color="#F43F5E" />
      </div>
      <h3>Failed to load data</h3>
      <p>{message}</p>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry} style={{ gap: 6 }}>
          <RefreshCw size={13} /> Retry
        </button>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────
export function EmptyState({ title = 'No data', description = '' }) {
  return (
    <div className="empty-state">
      <div style={{
        width: 52, height: 52,
        background: 'rgba(5,150,105,0.08)',
        border: '2px dashed rgba(5,150,105,0.25)',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Info size={22} color="#059669" />
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  );
}

// ── Premium KPI Stat Card ─────────────────────
export function ProtrudingStatCard({ icon: Icon, label, value, color = 'blue', sub }) {
  const colorClass = {
    blue:   'stat-card-blue',
    pink:   'stat-card-pink',
    amber:  'stat-card-amber',
    green:  'stat-card-green',
    purple: 'stat-card-purple',
  }[color] || 'stat-card-blue';

  const iconColors = {
    blue:   '#047857',
    pink:   '#BE123C',
    amber:  '#B45309',
    green:  '#047857',
    purple: '#6D28D9',
  };

  return (
    <div className={`stat-card-protruding ${colorClass}`}>
      {/* Icon badge */}
      <div className="stat-tab-badge">
        <Icon size={20} color={iconColors[color] || iconColors.blue} />
      </div>

      {/* Big metric */}
      <div className="stat-metric-number">{value ?? '—'}</div>

      {/* Divider */}
      <div className="stat-divider-line" />

      {/* Label */}
      <div className="stat-card-label">{label}</div>

      {/* Sub text */}
      {sub && (
        <div style={{
          fontSize: 11,
          marginTop: 6,
          fontWeight: 600,
          color: 'var(--card-sub-color, #059669)',
          opacity: 0.85,
          lineHeight: 1.4,
          position: 'relative',
          zIndex: 2,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ── Standard Stat card ────────────────────────
export function StatCard({ icon: Icon, label, value, color = '#059669', sub }) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value ?? '—'}</div>
        </div>
        <div className="stat-icon" style={{
          background: `${color}15`,
          border: `1.5px solid ${color}30`,
        }}>
          <Icon size={20} color={color} />
        </div>
      </div>
      {sub && <div className="stat-change">{sub}</div>}
    </div>
  );
}

// ── Status badge ──────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    safe:         'badge-safe',
    moderate:     'badge-moderate',
    dangerous:    'badge-danger',
    unknown:      'badge-offline',
    offline:      'badge-offline',
    online:       'badge-online',
    CRITICAL:     'badge-critical',
    WARNING:      'badge-warning',
    INFO:         'badge-info',
    active:       'badge-danger',
    resolved:     'badge-offline',
    acknowledged: 'badge-warning',
  };
  const labels = {
    safe: 'Safe', moderate: 'Moderate', dangerous: 'Dangerous',
    unknown: 'No Data', offline: 'Offline', online: 'Online',
    CRITICAL: 'Critical', WARNING: 'Warning', INFO: 'Info',
    active: 'Active', resolved: 'Resolved', acknowledged: 'Acknowledged',
  };
  const dotColors = {
    safe: '#10B981', moderate: '#F59E0B', dangerous: '#F43F5E',
    unknown: '#9CA3AF', offline: '#9CA3AF', online: '#10B981',
    CRITICAL: '#F43F5E', WARNING: '#F59E0B', INFO: '#059669',
    active: '#F43F5E', resolved: '#9CA3AF', acknowledged: '#F59E0B',
  };

  return (
    <span className={`badge ${map[status] || 'badge-offline'}`}>
      <span className="status-dot" style={{ background: dotColors[status] || '#9CA3AF' }} />
      {labels[status] || status}
    </span>
  );
}
