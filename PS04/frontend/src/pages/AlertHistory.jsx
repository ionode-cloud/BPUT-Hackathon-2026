import { useState, useMemo, useEffect } from 'react';
import {
  MdWarning,
  MdCheckCircle,
  MdDeleteSweep,
  MdDelete,
  MdAir,
  MdElectricBolt,
  MdWaterDrop,
  MdShield,
  MdSearch,
  MdRefresh,
  MdDoneAll,
  MdAccessTime,
  MdLocationOn,
  MdNotificationsActive,
  MdHealthAndSafety,
  MdTune,
} from 'react-icons/md';

import {
  loadPersistedAlerts,
  markAlertSolved,
  clearAlert,
  markAllAlertsSolved,
  clearAllAlerts,
  resetDefaultAlerts,
} from '../utils/alertEngine';
import ExcelDownloadBtn from '../components/ExcelDownloadBtn';

const SYSTEM_ICONS = {
  water:  <MdWaterDrop size={22} color="#0284c7" />,
  air:    <MdAir size={22} color="#0d9488" />,
  energy: <MdElectricBolt size={22} color="#f59e0b" />,
  waste:  <MdDelete size={22} color="#ea580c" />,
  safety: <MdShield size={22} color="#6366f1" />,
};

const SYSTEM_BADGE_CLASSES = {
  water:  'badge-system-water',
  air:    'badge-system-air',
  energy: 'badge-system-energy',
  waste:  'badge-system-waste',
  safety: 'badge-system-safety',
};

function formatAlertTime(isoString) {
  if (!isoString) return 'Just now';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
      ' • ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export default function AlertHistory({ data }) {
  // Load initial alerts from localStorage merged with live sensor telemetry
  const [alerts, setAlerts] = useState(() => loadPersistedAlerts(data));
  const [selectedSystem, setSelectedSystem] = useState('all'); // 'all' | 'air' | 'energy' | 'water' | 'waste'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'solved'
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);

  // Sync new incoming live sensor data into alerts list
  useEffect(() => {
    if (data) {
      const fresh = loadPersistedAlerts(data);
      setAlerts(fresh);
    }
  }, [data]);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 2800);
  };

  // Action 1: Solved handler
  const handleToggleSolved = (id, title) => {
    const updated = markAlertSolved(alerts, id);
    setAlerts(updated);
    const target = updated.find(a => a.id === id);
    if (target && target.status === 'solved') {
      showToast(`✓ Marked as Solved: "${title.slice(0, 36)}..."`);
    } else {
      showToast(`Reopened alert: "${title.slice(0, 36)}..."`);
    }
  };

  // Action 2: Clear handler
  const handleClearAlert = (id, title) => {
    const updated = clearAlert(alerts, id);
    setAlerts(updated);
    showToast(`🗑️ Cleared: "${title.slice(0, 36)}..."`);
  };

  // Bulk actions
  const handleSolveAll = () => {
    if (alerts.length === 0) return;
    const updated = markAllAlertsSolved(alerts);
    setAlerts(updated);
    showToast('✓ All active alerts marked as Solved & Mitigated!');
  };

  const handleClearAll = () => {
    if (alerts.length === 0) return;
    if (window.confirm('Are you sure you want to clear all high alert incident records?')) {
      const updated = clearAllAlerts();
      setAlerts(updated);
      showToast('🗑️ All alert records cleared from history.');
    }
  };

  const handleResetDefaults = () => {
    const fresh = resetDefaultAlerts(data);
    setAlerts(fresh);
    showToast('🔄 Reloaded standard high alert incident dataset.');
  };

  // Compute summary KPI counts
  const totalCount = alerts.length;
  const activeCount = alerts.filter(a => a.status !== 'solved').length;
  const solvedCount = alerts.filter(a => a.status === 'solved').length;
  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL' && a.status !== 'solved').length;

  // Filtered alerts list
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      // System filter
      if (selectedSystem !== 'all' && alert.system !== selectedSystem) {
        return false;
      }
      // Status filter
      if (statusFilter === 'active' && alert.status === 'solved') {
        return false;
      }
      if (statusFilter === 'solved' && alert.status !== 'solved') {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = alert.title?.toLowerCase().includes(q);
        const matchesLocation = alert.location?.toLowerCase().includes(q);
        const matchesMetric = alert.metric?.toLowerCase().includes(q);
        const matchesSystem = alert.systemLabel?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesLocation && !matchesMetric && !matchesSystem) {
          return false;
        }
      }
      return true;
    });
  }, [alerts, selectedSystem, statusFilter, searchQuery]);

  return (
    <div className="alerts-container">
      {/* Toast Notification */}
      {notification && (
        <div className="alert-floating-toast">
          <span>{notification}</span>
        </div>
      )}

      {/* Tab Control / Export Banner */}
      <div className="tab-control-banner">
        <div className="banner-left-info">
          <div className="engine-status-pill">
            <span className="pulse-dot-small" style={{ background: '#ef4444' }} />
            <span>Cross-System Incident Triage & High Alert Log</span>
          </div>
          <p className="banner-subtext">
            Continuous cross-cutting anomaly surveillance: pipe leaks, chemical spikes, substation overload, and bin overflow.
          </p>
        </div>
        <div className="banner-right-actions">
          <ExcelDownloadBtn tabName="alerts" tabLabel="Alert History" alerts={alerts} />
        </div>
      </div>

      {/* ════ KPI Summary Cards ════ */}
      <div className="grid">
        <div className="card alert-kpi-card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdNotificationsActive size={20} color="#ef4444" />
            <span>Active High Alerts</span>
          </div>
          <div className="kpi-value" style={{ color: activeCount > 0 ? '#ef4444' : 'var(--text)' }}>
            {activeCount}
          </div>
          <div className="kpi-foot">
            {activeCount > 0 ? (
              <span style={{ color: '#ef4444', fontWeight: 600 }}>
                {criticalCount} Critical • Requires Operator Action
              </span>
            ) : (
              <span style={{ color: '#10b981', fontWeight: 600 }}>
                ✓ Zero Unresolved Anomalies
              </span>
            )}
          </div>
        </div>

        <div className="card alert-kpi-card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdCheckCircle size={20} color="#10b981" />
            <span>Solved & Mitigated</span>
          </div>
          <div className="kpi-value" style={{ color: '#10b981' }}>
            {solvedCount}
          </div>
          <div className="kpi-foot">
            Resolved anomalies logged in facility audit
          </div>
        </div>

        <div className="card alert-kpi-card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdHealthAndSafety size={20} color="#3b82f6" />
            <span>Total Logged Alerts</span>
          </div>
          <div className="kpi-value">
            {totalCount}
          </div>
          <div className="kpi-foot">
            Historical incidents across Air, Energy, Water, Waste
          </div>
        </div>

        <div className="card alert-kpi-card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdShield size={20} color={activeCount > 0 ? '#f59e0b' : '#10b981'} />
            <span>Telemetry Protection</span>
          </div>
          <div className="kpi-value" style={{ fontSize: 22, paddingTop: 4 }}>
            {activeCount > 2 ? 'ELEVATED' : activeCount > 0 ? 'MONITORED' : 'OPTIMAL'}
          </div>
          <div className="kpi-foot">
            Continuous real-time IoT threshold surveillance
          </div>
        </div>
      </div>

      {/* ════ Search, Filter & Action Toolbar ════ */}
      <div className="card alerts-toolbar-card">
        <div className="alerts-toolbar-top">
          {/* Search Bar */}
          <div className="alerts-search-wrap">
            <MdSearch size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search alerts by metric, title, or campus location…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="alerts-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>

          {/* Action Buttons: Solved All & Clear All */}
          <div className="alerts-actions-group">
            <button
              type="button"
              className="btn-action alert-btn-solve-all"
              onClick={handleSolveAll}
              disabled={alerts.length === 0 || activeCount === 0}
              title="Mark all unresolved alerts as Solved"
            >
              <MdDoneAll size={16} />
              <span>Solve All</span>
            </button>

            <button
              type="button"
              className="btn-action alert-btn-clear-all"
              onClick={handleClearAll}
              disabled={alerts.length === 0}
              title="Clear all alert incidents from history"
            >
              <MdDeleteSweep size={18} />
              <span>Clear All</span>
            </button>

            <button
              type="button"
              className="btn-action"
              onClick={handleResetDefaults}
              title="Reload standard sample & live alerts"
            >
              <MdRefresh size={16} />
              <span>Reload Sample</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="alerts-toolbar-filters">
          {/* System Filters */}
          <div className="filter-pill-group">
            <span className="filter-label"><MdTune size={14} /> System:</span>
            {[
              { id: 'all',    label: 'All Systems' },
              { id: 'water',  label: 'Water' },
              { id: 'air',    label: 'Air Quality' },
              { id: 'energy', label: 'Energy' },
              { id: 'waste',  label: 'Waste' },
            ].map(sys => (
              <button
                key={sys.id}
                type="button"
                className={`filter-tab-pill ${selectedSystem === sys.id ? 'active' : ''}`}
                onClick={() => setSelectedSystem(sys.id)}
              >
                {sys.label}
              </button>
            ))}
          </div>

          {/* Status Filters */}
          <div className="filter-pill-group">
            <span className="filter-label">Status:</span>
            {[
              { id: 'all',    label: `All (${totalCount})` },
              { id: 'active', label: `Active (${activeCount})` },
              { id: 'solved', label: `Solved (${solvedCount})` },
            ].map(st => (
              <button
                key={st.id}
                type="button"
                className={`filter-tab-pill ${statusFilter === st.id ? 'active' : ''}`}
                onClick={() => setStatusFilter(st.id)}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ════ Alert List ════ */}
      <div className="alerts-list">
        {filteredAlerts.length === 0 ? (
          <div className="card alerts-empty-state">
            <div className="empty-icon-wrap">
              <MdCheckCircle size={54} color="#10b981" />
            </div>
            <h3>No High Priority Alerts Found</h3>
            <p>
              {searchQuery || selectedSystem !== 'all' || statusFilter !== 'all'
                ? 'No alert records match your current filter and search query. Try clearing filters.'
                : 'All campus IoT systems (Air, Energy, Water, Waste) are currently operating within nominal safety thresholds.'}
            </p>
            {(searchQuery || selectedSystem !== 'all' || statusFilter !== 'all') && (
              <button
                type="button"
                className="btn-action btn-action--primary"
                onClick={() => {
                  setSelectedSystem('all');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
              >
                Reset Filters
              </button>
            )}
            {alerts.length === 0 && (
              <button
                type="button"
                className="btn-action btn-action--primary"
                onClick={handleResetDefaults}
                style={{ marginTop: 12 }}
              >
                <MdRefresh size={16} />
                <span>Load Live & Demo Alert Incidents</span>
              </button>
            )}
          </div>
        ) : (
          filteredAlerts.map(alert => {
            const isSolved = alert.status === 'solved';
            const isCritical = alert.severity === 'CRITICAL';

            return (
              <div
                key={alert.id}
                className={`alert-card ${isSolved ? 'is-solved' : isCritical ? 'is-critical' : 'is-high'}`}
              >
                {/* Left Colored Severity Indicator Bar */}
                <div className={`alert-edge-bar ${isSolved ? 'bar-solved' : isCritical ? 'bar-critical' : 'bar-high'}`} />

                <div className="alert-card-inner">
                  {/* Top Row: System Tag, Severity Badge, Time */}
                  <div className="alert-card-header">
                    <div className="alert-meta-left">
                      <div className="alert-icon-avatar">
                        {SYSTEM_ICONS[alert.system] || <MdWarning size={20} color="#f59e0b" />}
                      </div>

                      <div className="alert-system-tags">
                        <span className={`alert-system-pill ${SYSTEM_BADGE_CLASSES[alert.system] || ''}`}>
                          {alert.systemLabel || 'Facility System'}
                        </span>

                        <span className={`alert-severity-badge ${isSolved ? 'sev-solved' : isCritical ? 'sev-critical' : 'sev-high'}`}>
                          {isSolved ? '✓ SOLVED' : isCritical ? 'CRITICAL ALERT' : 'HIGH ALERT'}
                        </span>
                      </div>
                    </div>

                    <div className="alert-meta-right">
                      <span className="alert-timestamp">
                        <MdAccessTime size={14} />
                        <span>{formatAlertTime(alert.timestamp)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Middle Content: Title, Location, Metrics */}
                  <div className="alert-body">
                    <h3 className="alert-title">{alert.title}</h3>

                    <div className="alert-location-line">
                      <MdLocationOn size={16} color="#64748b" />
                      <span>{alert.location || 'Campus Facilities'}</span>
                    </div>

                    {/* Metric Comparison Strip */}
                    <div className="alert-metrics-strip">
                      <div className="metric-box trigger-value">
                        <span className="metric-box-label">Triggered Telemetry</span>
                        <span className="metric-box-val">{alert.value}</span>
                      </div>

                      <div className="metric-box safe-threshold">
                        <span className="metric-box-label">Safe Normal Baseline</span>
                        <span className="metric-box-val">{alert.threshold}</span>
                      </div>

                      <div className="metric-box telemetry-key">
                        <span className="metric-box-label">Monitored Sensor</span>
                        <span className="metric-box-val">{alert.metric}</span>
                      </div>
                    </div>

                    {/* Operational Directive / Action Note */}
                    <div className="alert-recommendation">
                      <strong>Automated Directive:</strong> {alert.recommendation}
                    </div>

                    {/* Solved Timestamp if resolved */}
                    {isSolved && alert.solvedAt && (
                      <div className="alert-solved-notice">
                        <MdCheckCircle size={15} color="#10b981" />
                        <span>Mitigated and confirmed resolved at {formatAlertTime(alert.solvedAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Row: Actions (Two Buttons: Solved & Clear) */}
                  <div className="alert-card-footer">
                    <div className="alert-action-buttons">
                      {/* Action Button 1: Solved */}
                      <button
                        type="button"
                        className={`alert-action-btn btn-solved ${isSolved ? 'is-active-solved' : ''}`}
                        onClick={() => handleToggleSolved(alert.id, alert.title)}
                        title={isSolved ? 'Mark as Unresolved / Reopen' : 'Mark incident as Solved and mitigated'}
                      >
                        <MdCheckCircle size={16} />
                        <span>{isSolved ? '✓ Solved (Reopen)' : 'Solved'}</span>
                      </button>

                      {/* Action Button 2: Clear */}
                      <button
                        type="button"
                        className="alert-action-btn btn-clear"
                        onClick={() => handleClearAlert(alert.id, alert.title)}
                        title="Dismiss and clear this alert incident from history"
                      >
                        <MdDelete size={16} />
                        <span>Clear</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
