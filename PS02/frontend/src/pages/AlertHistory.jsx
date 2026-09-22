import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  AlertTriangle,
  Flame,
  ShieldAlert,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Clock,
  Radio,
  SlidersHorizontal,
  CheckCheck,
  Calendar,
  Layers,
  Thermometer,
  Zap,
} from 'lucide-react';
import { alertsAPI } from '../services/api';

export default function AlertHistory() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState({ text: '', type: 'info' });

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [nodeFilter, setNodeFilter] = useState('ALL');

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await alertsAPI.getAll();
      setAlerts(res?.data || []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
      showMsg('Failed to load alert history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 6000); // Polling every 6s
    return () => clearInterval(interval);
  }, []);

  const showMsg = (text, type = 'info') => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg({ text: '', type: 'info' }), 4000);
  };

  // Status transition handlers
  const handleUpdateStatus = async (id, status) => {
    try {
      await alertsAPI.update(id, { status });
      showMsg(`Alert marked as ${status}`, 'success');
      setAlerts((prev) =>
        prev.map((a) => (a._id === id ? { ...a, status } : a))
      );
    } catch (err) {
      showMsg(`Failed to update alert: ${err.message}`, 'error');
    }
  };

  const handleDeleteAlert = async (id) => {
    if (!window.confirm('Delete this alert record from history?')) return;
    try {
      await alertsAPI.delete(id);
      showMsg('Alert deleted successfully', 'info');
      setAlerts((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      showMsg(`Failed to delete alert: ${err.message}`, 'error');
    }
  };

  const handleAcknowledgeAll = async () => {
    try {
      const res = await alertsAPI.acknowledgeAll();
      showMsg(res?.message || 'All active alerts acknowledged', 'success');
      fetchAlerts();
    } catch (err) {
      showMsg(`Failed to acknowledge alerts: ${err.message}`, 'error');
    }
  };

  // Node list extraction for filter
  const nodeOptions = useMemo(() => {
    const set = new Set(alerts.map((a) => a.nodeId).filter(Boolean));
    return Array.from(set).sort();
  }, [alerts]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = alerts.length;
    const activeCritical = alerts.filter((a) => a.status === 'Active' && a.severity === 'Critical').length;
    const activeWarning = alerts.filter((a) => a.status === 'Active' && a.severity === 'Warning').length;
    const totalActive = alerts.filter((a) => a.status === 'Active').length;
    const acknowledged = alerts.filter((a) => a.status === 'Acknowledged').length;
    const resolved = alerts.filter((a) => a.status === 'Resolved').length;
    return { total, activeCritical, activeWarning, totalActive, acknowledged, resolved };
  }, [alerts]);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        alert.nodeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.alertType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.value?.toLowerCase().includes(searchTerm.toLowerCase());

      // Severity filter
      const matchesSeverity =
        severityFilter === 'ALL' || alert.severity?.toUpperCase() === severityFilter;

      // Status filter
      const matchesStatus =
        statusFilter === 'ALL' || alert.status?.toUpperCase() === statusFilter;

      // Node filter
      const matchesNode =
        nodeFilter === 'ALL' || alert.nodeId?.toUpperCase() === nodeFilter;

      return matchesSearch && matchesSeverity && matchesStatus && matchesNode;
    });
  }, [alerts, searchTerm, severityFilter, statusFilter, nodeFilter]);

  const formatTime = (ts) => {
    if (!ts) return '-';
    const date = new Date(ts);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={22} color="var(--accent-teal)" />
            <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Alert History & Incident Log
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Auditable log of WBGT threshold breaches, extreme temperature alarms, and ISO 7243 compliance actions
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {stats.totalActive > 0 && (
            <button
              onClick={handleAcknowledgeAll}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              title="Acknowledge all pending active alarms"
            >
              <CheckCheck size={14} />
              <span>Acknowledge All Active ({stats.totalActive})</span>
            </button>
          )}

          <button
            onClick={fetchAlerts}
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refresh alert log"
          >
            <RefreshCw size={12} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionMsg.text && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '4px',
            background: actionMsg.type === 'error' ? '#FDF2F2' : actionMsg.type === 'success' ? '#F0FDF4' : '#EBF4F4',
            border: `1px solid ${actionMsg.type === 'error' ? '#F87171' : actionMsg.type === 'success' ? '#86EFAC' : '#B2D8D8'}`,
            color: actionMsg.type === 'error' ? '#991B1B' : actionMsg.type === 'success' ? '#166534' : '#173B5A',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          {actionMsg.text}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
        }}
      >
        <div className="card" style={{ borderLeft: '4px solid var(--accent-teal)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Total Incidents Logged
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#173B5A', marginTop: '4px' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
            Full mesh network audit history
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #DC2626', background: stats.activeCritical > 0 ? '#FFF5F5' : '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase' }}>
              Active Critical Alarms
            </span>
            {stats.activeCritical > 0 && (
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#DC2626', animation: 'pulse 1.2s infinite' }} />
            )}
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#DC2626', marginTop: '4px' }}>
            {stats.activeCritical}
          </div>
          <div style={{ fontSize: '11px', color: '#991B1B', marginTop: '2px' }}>
            WBGT &gt;= 31°C or Temp &gt;= 40°C
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #EA580C' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#EA580C', textTransform: 'uppercase' }}>
            Active Warning Alerts
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#EA580C', marginTop: '4px' }}>
            {stats.activeWarning}
          </div>
          <div style={{ fontSize: '11px', color: '#9A3412', marginTop: '2px' }}>
            WBGT &gt;= 28.5°C or High Surface Temp
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #16A34A' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#16A34A', textTransform: 'uppercase' }}>
            Acknowledged / Cleared
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#16A34A', marginTop: '4px' }}>
            {stats.acknowledged + stats.resolved}
          </div>
          <div style={{ fontSize: '11px', color: '#15803D', marginTop: '2px' }}>
            {stats.acknowledged} Acknowledged • {stats.resolved} Resolved
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
            <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search by Node ID, message, or metric..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                border: '1px solid #D1D5DB',
                borderRadius: '4px',
                fontSize: '12px',
              }}
            />
          </div>

          {/* Severity Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>Severity:</span>
            {['ALL', 'CRITICAL', 'WARNING'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`btn btn-sm ${severityFilter === sev ? 'btn-primary' : 'btn-outline'}`}
                style={{
                  fontSize: '10px',
                  padding: '3px 8px',
                  fontWeight: 700,
                  borderColor: severityFilter === sev ? undefined : '#CBD5E1',
                }}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>Status:</span>
            {['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-outline'}`}
                style={{
                  fontSize: '10px',
                  padding: '3px 8px',
                  fontWeight: 700,
                  borderColor: statusFilter === st ? undefined : '#CBD5E1',
                }}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Node Filter */}
          {nodeOptions.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>Node:</span>
              <select
                value={nodeFilter}
                onChange={(e) => setNodeFilter(e.target.value)}
                style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontWeight: 600,
                }}
              >
                <option value="ALL">All Nodes</option>
                {nodeOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Alerts Table / Feed */}
      <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Incident Feed
            </span>
            <span style={{ fontSize: '11px', color: '#64748B' }}>
              Showing {filteredAlerts.length} of {alerts.length} records
            </span>
          </div>

          {(searchTerm || severityFilter !== 'ALL' || statusFilter !== 'ALL' || nodeFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSeverityFilter('ALL');
                setStatusFilter('ALL');
                setNodeFilter('ALL');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-teal)',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {loading && alerts.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B' }}>
            <RefreshCw size={28} className="spin" style={{ margin: '0 auto 10px', display: 'block', color: 'var(--accent-teal)' }} />
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>Loading alert history...</div>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B' }}>
            <CheckCircle2 size={36} color="#16A34A" style={{ margin: '0 auto 10px', display: 'block' }} />
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>
              No Alerts Matching Current Criteria
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              All nodes operating within normal heat risk parameters, or filters yielded no matches.
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', width: '135px', verticalAlign: 'middle' }}>Status</th>
                  <th style={{ textAlign: 'center', width: '110px', verticalAlign: 'middle' }}>Severity</th>
                  <th style={{ textAlign: 'left', width: '115px', verticalAlign: 'middle' }}>Node</th>
                  <th style={{ textAlign: 'left', minWidth: '165px', verticalAlign: 'middle' }}>Incident Type</th>
                  <th style={{ textAlign: 'center', width: '135px', verticalAlign: 'middle' }}>Recorded Value</th>
                  <th style={{ textAlign: 'left', minWidth: '240px', verticalAlign: 'middle' }}>Context Message</th>
                  <th style={{ textAlign: 'left', width: '155px', verticalAlign: 'middle' }}>Timestamp</th>
                  <th style={{ textAlign: 'right', width: '145px', verticalAlign: 'middle' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert) => {
                  const isCritical = alert.severity === 'Critical';
                  const isActive = alert.status === 'Active';
                  const isAck = alert.status === 'Acknowledged';
                  const isResolved = alert.status === 'Resolved';

                  return (
                    <tr
                      key={alert._id}
                      style={{
                        background: isActive
                          ? isCritical
                            ? '#FFF9F9'
                            : '#FFFDF5'
                          : undefined,
                      }}
                    >
                      {/* Status */}
                      <td style={{ textAlign: 'left', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: isActive
                              ? isCritical
                                ? '#FEE2E2'
                                : '#FEF3C7'
                              : isAck
                              ? '#E0F2FE'
                              : '#F0FDF4',
                            color: isActive
                              ? isCritical
                                ? '#991B1B'
                                : '#92400E'
                              : isAck
                              ? '#0369A1'
                              : '#15803D',
                            border: `1px solid ${
                              isActive
                                ? isCritical
                                  ? '#FCA5A5'
                                  : '#FCD34D'
                                : isAck
                                ? '#BAE6FD'
                                : '#BBF7D0'
                            }`,
                          }}
                        >
                          {isActive && (
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: isCritical ? '#DC2626' : '#EA580C',
                                animation: 'pulse 1.2s infinite',
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <span>{alert.status?.toUpperCase()}</span>
                        </span>
                      </td>

                      {/* Severity */}
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            minWidth: '70px',
                            textAlign: 'center',
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: isCritical ? '#DC2626' : '#EA580C',
                            color: '#FFFFFF',
                            textTransform: 'uppercase',
                            letterSpacing: '0.4px',
                          }}
                        >
                          {alert.severity}
                        </span>
                      </td>

                      {/* Node */}
                      <td style={{ textAlign: 'left', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '12px',
                            color: 'var(--text-primary)',
                            background: '#F1F5F9',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: '1px solid #E2E8F0',
                          }}
                        >
                          {alert.nodeId}
                        </span>
                      </td>

                      {/* Incident Type */}
                      <td style={{ textAlign: 'left', verticalAlign: 'middle' }}>
                        <span style={{ fontWeight: 700, color: '#1E293B', fontSize: '12px' }}>
                          {alert.alertType}
                        </span>
                      </td>

                      {/* Recorded Value */}
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        {alert.value ? (
                          <span
                            style={{
                              display: 'inline-block',
                              fontWeight: 800,
                              fontSize: '12px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: isCritical ? '#FEE2E2' : '#F8FAFC',
                              color: isCritical ? '#DC2626' : '#0F172A',
                              border: `1px solid ${isCritical ? '#FCA5A5' : '#CBD5E1'}`,
                              fontFamily: 'monospace',
                            }}
                          >
                            {alert.value}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '12px' }}>—</span>
                        )}
                      </td>

                      {/* Context Message */}
                      <td
                        style={{
                          textAlign: 'left',
                          verticalAlign: 'middle',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          minWidth: '240px',
                          maxWidth: '380px',
                          fontSize: '12px',
                          lineHeight: 1.5,
                          color: '#334155',
                        }}
                      >
                        {alert.message}
                      </td>

                      {/* Timestamp */}
                      <td style={{ textAlign: 'left', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={11} color="#64748B" />
                            <span>{timeAgo(alert.timestamp)}</span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#64748B', paddingLeft: '15px' }}>
                            {formatTime(alert.timestamp)}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', gap: '5px', alignItems: 'center', justifyContent: 'flex-end' }}>
                          {isActive && (
                            <button
                              onClick={() => handleUpdateStatus(alert._id, 'Acknowledged')}
                              className="btn btn-outline btn-sm"
                              style={{
                                fontSize: '10px',
                                padding: '3px 8px',
                                color: 'var(--accent-teal)',
                                borderColor: '#B2D8D8',
                                fontWeight: 700,
                              }}
                              title="Mark as Acknowledged"
                            >
                              Ack
                            </button>
                          )}

                          {!isResolved && (
                            <button
                              onClick={() => handleUpdateStatus(alert._id, 'Resolved')}
                              className="btn btn-outline btn-sm"
                              style={{
                                fontSize: '10px',
                                padding: '3px 8px',
                                color: '#16A34A',
                                borderColor: '#86EFAC',
                                fontWeight: 700,
                              }}
                              title="Mark as Resolved"
                            >
                              Resolve
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteAlert(alert._id)}
                            className="btn btn-outline btn-sm"
                            style={{
                              fontSize: '10px',
                              padding: '3px 7px',
                              color: '#DC2626',
                              borderColor: '#FCA5A5',
                            }}
                            title="Delete alert from log"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
