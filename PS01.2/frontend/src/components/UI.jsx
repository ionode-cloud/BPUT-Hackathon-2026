import { useState } from 'react';
import { X, RefreshCw } from 'lucide-react';

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

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  // Register setter
  if (!toastSetters.includes(setToasts)) toastSetters.push(setToasts);

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            onClick={() => remove(t.id)}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Loading state ─────────────────────────────
export function LoadingState({ text = 'Loading...' }) {
  return (
    <div className="loading-overlay">
      <div className="spinner" />
      <span>{text}</span>
    </div>
  );
}

// ── Error state ───────────────────────────────
export function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state">
      <h3>⚠ Failed to load data</h3>
      <p>{message}</p>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────
export function EmptyState({ title = 'No data', description = '' }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  );
}

// ── Protruding Stat Card (Mockup Style) ───────
export function ProtrudingStatCard({ icon: Icon, label, value, color = 'blue', sub }) {
  const colorMap = {
    blue: { bg: 'stat-card-blue', iconColor: 'var(--color-primary)' },
    pink: { bg: 'stat-card-pink', iconColor: 'var(--color-accent-pink)' },
    amber: { bg: 'stat-card-amber', iconColor: 'var(--color-accent-amber)' },
    green: { bg: 'stat-card-green', iconColor: '#10B981' },
    purple: { bg: 'stat-card-purple', iconColor: '#7C5CFC' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`stat-card-protruding ${c.bg}`}>
      <div className="stat-tab-badge">
        <Icon size={22} color={c.iconColor} />
      </div>
      <div className="stat-metric-number">
        {value ?? '—'}
      </div>
      <div className="stat-divider-line" />
      <div className="stat-card-label">
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 11, opacity: 0.9, marginTop: 4, fontWeight: 600 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ── Standard Stat card ────────────────────────
export function StatCard({ icon: Icon, label, value, color = '#4F75FE', sub }) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value ?? '—'}</div>
        </div>
        <div className="stat-icon" style={{ background: `${color}18`, border: `1px solid ${color}35` }}>
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
    safe:      'badge-safe',
    moderate:  'badge-moderate',
    dangerous: 'badge-danger',
    unknown:   'badge-offline',
    offline:   'badge-offline',
    online:    'badge-online',
    CRITICAL:  'badge-critical',
    WARNING:   'badge-warning',
    INFO:      'badge-info',
    active:    'badge-danger',
    resolved:  'badge-offline',
    acknowledged: 'badge-warning',
  };
  const labels = {
    safe: 'Safe', moderate: 'Moderate', dangerous: 'Dangerous',
    unknown: 'No Data', offline: 'Offline', online: 'Online',
    CRITICAL: 'Critical', WARNING: 'Warning', INFO: 'Info',
    active: 'Active', resolved: 'Resolved', acknowledged: 'Acknowledged',
  };
  const dotColors = {
    safe: '#10B981', moderate: '#FFAE33', dangerous: '#FF5376',
    unknown: '#94A3B8', offline: '#94A3B8', online: '#10B981',
    CRITICAL: '#FF5376', WARNING: '#FFAE33', INFO: '#4F75FE',
    active: '#FF5376', resolved: '#94A3B8', acknowledged: '#FFAE33',
  };
  return (
    <span className={`badge ${map[status] || 'badge-offline'}`}>
      <span className="status-dot" style={{ background: dotColors[status] || '#94A3B8' }} />
      {labels[status] || status}
    </span>
  );
}
