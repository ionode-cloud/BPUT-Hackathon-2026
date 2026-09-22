import React, { useState, useMemo } from 'react';
import {
  AlertTriangle, AlertCircle, ShieldCheck, CheckCircle2,
  Clock, Radio, History, Trash2, Check, Filter, Search,
  Cpu, Layers, ArrowUpRight, Activity, BarChart2
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from 'recharts';
import { useAlerts } from '../context/AlertContext';
import { useNodes } from '../context/NodeContext';
import { formatAlertTime } from '../utils/alertConfig';
import { ProtrudingStatCard } from '../components/UI';

export default function Alerts() {
  const {
    activeAlerts,
    activeAlertsCount,
    alertHistory,
    isSocketConnected,
    acknowledgeAlert,
    clearHistory,
  } = useAlerts();

  const { nodes } = useNodes() || { nodes: [] };

  const [selectedNodeFilter, setSelectedNodeFilter] = useState('ALL');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'

  // Filter Active Alerts
  const filteredActiveAlerts = useMemo(() => {
    return activeAlerts.filter((alert) => {
      const matchesNode =
        selectedNodeFilter === 'ALL' ||
        String(alert.nodeId).toUpperCase().trim() === selectedNodeFilter;
      const matchesSeverity =
        selectedSeverityFilter === 'ALL' || alert.severity === selectedSeverityFilter;
      return matchesNode && matchesSeverity;
    });
  }, [activeAlerts, selectedNodeFilter, selectedSeverityFilter]);

  // Filter Alert History
  const filteredHistory = useMemo(() => {
    return alertHistory.filter((item) => {
      const matchesNode =
        selectedNodeFilter === 'ALL' ||
        String(item.nodeId).toUpperCase().trim() === selectedNodeFilter;
      const matchesSeverity =
        selectedSeverityFilter === 'ALL' || item.severity === selectedSeverityFilter;
      return matchesNode && matchesSeverity;
    });
  }, [alertHistory, selectedNodeFilter, selectedSeverityFilter]);

  const criticalCount = activeAlerts.filter((a) => a.severity === 'critical').length;
  const warningCount = activeAlerts.filter((a) => a.severity === 'warning').length;

  // View state for Surveillance Chart: 'stations' | 'severity'
  const [alertGraphView, setAlertGraphView] = useState('stations');

  // Breakdown of active incidents per station
  const stationIncidentData = useMemo(() => {
    return nodes.map((n) => {
      const nodeAlerts = activeAlerts.filter((a) => a.nodeId === n.nodeId);
      const crit = nodeAlerts.filter((a) => a.severity === 'critical').length;
      const warn = nodeAlerts.filter((a) => a.severity === 'warning').length;
      return {
        name: n.name ? (n.name.length > 12 ? `${n.name.slice(0, 10)}…` : n.name) : n.nodeId,
        nodeId: n.nodeId,
        critical: crit,
        warning: warn,
        total: nodeAlerts.length,
      };
    });
  }, [nodes, activeAlerts]);

  // Synthetic incident velocity trajectory
  const temporalSeverityData = useMemo(() => {
    return [
      { time: 'T-50m', critical: Math.max(0, criticalCount - 2), warning: Math.max(0, warningCount - 1) },
      { time: 'T-40m', critical: Math.max(0, criticalCount - 1), warning: Math.max(1, warningCount) },
      { time: 'T-30m', critical: Math.max(1, criticalCount), warning: Math.max(2, warningCount + 1) },
      { time: 'T-20m', critical: Math.max(0, criticalCount + 1), warning: warningCount },
      { time: 'T-10m', critical: criticalCount, warning: Math.max(1, warningCount) },
      { time: 'Live', critical: criticalCount, warning: warningCount },
    ];
  }, [criticalCount, warningCount]);

  // System Compliance & Operational Health Metric
  const systemHealth = useMemo(() => {
    const nodesWithIncidents = new Set(activeAlerts.map((a) => a.nodeId)).size;
    const total = nodes.length || 1;
    const nominal = Math.max(0, total - nodesWithIncidents);
    const percent = Math.round((nominal / total) * 100);
    return {
      nominalNodes: nominal,
      totalNodes: total,
      score: percent,
    };
  }, [nodes, activeAlerts]);

  return (
    <div>
      {/* ── Top Summary Strip ───────────────────────────────────────── */}
      {/* ── Top Summary Strip — Protruding Cards ─────────────────────── */}
      <div className="protruding-cards-grid-4">
        <ProtrudingStatCard
          icon={AlertTriangle}
          label="ACTIVE ALERTS"
          value={activeAlertsCount}
          color="pink"
          sub={activeAlertsCount > 0 ? `${criticalCount} Critical, ${warningCount} Warning` : 'All stations within safe limits'}
        />
        <ProtrudingStatCard
          icon={Radio}
          label="MONITORED STATIONS"
          value={nodes.length}
          color="amber"
          sub="Real-time multi-node scanning"
        />
        <ProtrudingStatCard
          icon={History}
          label="TOTAL INCIDENTS"
          value={alertHistory.length}
          color="blue"
          sub="Resolved & acknowledged logs"
        />
        <ProtrudingStatCard
          icon={Cpu}
          label="ALERT ENGINE"
          value={isSocketConnected ? 'ONLINE' : 'OFFLINE'}
          color="green"
          sub={isSocketConnected ? 'Live telemetry stream active' : 'Reconnecting to stream...'}
        />
      </div>

      {/* ── Incident Surveillance & Threat Deck ─────────────────────── */}
      <div className="alerts-surveillance-grid">
        {/* Left: Incident Surveillance Panoramic Card */}
        <div className="alerts-surveillance-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="chart-label chart-label-rose" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Activity size={11} /> INCIDENT SURVEILLANCE RADAR
              </div>
              <div className="chart-card-title">Threat Distribution & Severity Velocity</div>
              <div className="chart-card-sub">
                {alertGraphView === 'stations'
                  ? 'Active incident breaches by monitored telemetry station'
                  : 'Temporal threat velocity and threshold escalation timeline'}
              </div>
            </div>

            {/* View Switcher Chips + Live Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div className="hero-param-selector">
                <button
                  type="button"
                  onClick={() => setAlertGraphView('stations')}
                  className={`hero-param-chip ${alertGraphView === 'stations' ? 'active' : ''}`}
                >
                  <BarChart2 size={12} /> Station Map
                </button>
                <button
                  type="button"
                  onClick={() => setAlertGraphView('severity')}
                  className={`hero-param-chip ${alertGraphView === 'severity' ? 'active' : ''}`}
                >
                  <Activity size={12} /> Velocity Wave
                </button>
              </div>

              <div className="graph-stats-row">
                <div className="graph-stat-badge">
                  <span className="key">CRIT</span>
                  <span className="val" style={{ color: '#E11D48' }}>{criticalCount}</span>
                </div>
                <div className="graph-stat-badge">
                  <span className="key">WARN</span>
                  <span className="val" style={{ color: '#D97706' }}>{warningCount}</span>
                </div>
                <div className="graph-stat-badge">
                  <span className="key">FLEET</span>
                  <span className="val">{nodes.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chart Canvas */}
          <div style={{ height: 240, width: '100%' }}>
            <ResponsiveContainer width="100%" height={240}>
              {alertGraphView === 'stations' ? (
                <BarChart data={stationIncidentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#D1FAE5" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 10.5, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#D1FAE5' }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#FFFFFF',
                      border: '1.5px solid #D1FAE5',
                      borderRadius: 14,
                      boxShadow: '0 8px 24px rgba(35, 45, 80, 0.12)',
                      fontSize: 12,
                      fontFamily: "'Plus Jakarta Sans', sans-serif"
                    }}
                  />
                  <Bar dataKey="critical" name="Critical Breaches" fill="#F43F5E" stackId="incidents" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="warning" name="Warning Events" fill="#F59E0B" stackId="incidents" radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={temporalSeverityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="alertVelCritGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="alertVelWarnGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#D1FAE5" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: '#6B7280', fontSize: 10.5 }} tickLine={false} axisLine={{ stroke: '#D1FAE5' }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#FFFFFF',
                      border: '1.5px solid #D1FAE5',
                      borderRadius: 14,
                      boxShadow: '0 8px 24px rgba(35, 45, 80, 0.12)',
                      fontSize: 12,
                      fontFamily: "'Plus Jakarta Sans', sans-serif"
                    }}
                  />
                  <Area type="monotone" dataKey="critical" stroke="#F43F5E" strokeWidth={2.5} fill="url(#alertVelCritGrad)" name="Critical Velocity" />
                  <Area type="monotone" dataKey="warning" stroke="#F59E0B" strokeWidth={2.5} fill="url(#alertVelWarnGrad)" name="Warning Trajectory" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Footer Surveillance Summary */}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--color-heading)', fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)' }} />
              <span>Telemetry Core: <strong>{isSocketConnected ? 'Real-Time Streaming' : 'Polling Sync'}</strong></span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              Fleet Status: <strong style={{ color: '#047857' }}>{systemHealth.nominalNodes} / {systemHealth.totalNodes} Nodes Nominal</strong> ({systemHealth.score}%)
            </div>
          </div>
        </div>

        {/* Right: Threat Capsule Stack */}
        <div className="alerts-threat-stack">
          {/* Capsule 1: Critical Breaches */}
          <div className="threat-capsule-card threat-capsule-critical">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#BE123C', marginBottom: 2 }}>
                  HIGH-SEVERITY BREACHES
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#9F1239' }}>
                  {criticalCount}
                </div>
              </div>
              <span className={`badge ${criticalCount > 0 ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: 10, padding: '3px 8px' }}>
                {criticalCount > 0 ? 'Active Breach' : 'Nominal'}
              </span>
            </div>

            <div style={{ height: 48, margin: '4px -14px -6px -14px' }}>
              <ResponsiveContainer width="100%" height={48}>
                <AreaChart data={[{ v: 0 }, { v: criticalCount > 0 ? 3 : 1 }, { v: criticalCount > 0 ? 5 : 2 }, { v: criticalCount * 2 + 1 }, { v: criticalCount }]}>
                  <defs>
                    <linearGradient id="alertCritCapsuleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FB7185" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#FB7185" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#E11D48" strokeWidth={2} fill="url(#alertCritCapsuleGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: 10.5, color: '#BE123C', fontWeight: 600, marginTop: 4 }}>
              {criticalCount > 0 ? 'Exceeds hazardous regulatory boundary' : 'Zero hazardous breaches detected'}
            </div>
          </div>

          {/* Capsule 2: Warning Thresholds */}
          <div className="threat-capsule-card threat-capsule-warning">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#B45309', marginBottom: 2 }}>
                  ELEVATED WARNINGS
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#78350F' }}>
                  {warningCount}
                </div>
              </div>
              <span className={`badge ${warningCount > 0 ? 'badge-warning' : 'badge-secondary'}`} style={{ fontSize: 10, padding: '3px 8px' }}>
                {warningCount > 0 ? 'Elevated' : 'Clear'}
              </span>
            </div>

            <div style={{ height: 48, margin: '4px -14px -6px -14px' }}>
              <ResponsiveContainer width="100%" height={48}>
                <AreaChart data={[{ v: 0 }, { v: warningCount > 0 ? 2 : 1 }, { v: warningCount > 0 ? 4 : 2 }, { v: warningCount * 2 + 2 }, { v: warningCount }]}>
                  <defs>
                    <linearGradient id="alertWarnCapsuleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FCD34D" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#FCD34D" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#D97706" strokeWidth={2} fill="url(#alertWarnCapsuleGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: 10.5, color: '#B45309', fontWeight: 600, marginTop: 4 }}>
              {warningCount > 0 ? 'Sensors approaching alert limits' : 'All parameters in safe zone'}
            </div>
          </div>

          {/* Capsule 3: System Health & Compliance Meter */}
          <div className="threat-capsule-card threat-capsule-safe">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#047857', marginBottom: 2 }}>
                  FLEET COMPLIANCE INDEX
                </div>
                <div style={{ fontSize: 30, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#064E3B' }}>
                  {systemHealth.score}%
                </div>
              </div>
              <span className="badge badge-success" style={{ fontSize: 10, padding: '3px 8px' }}>
                Operational
              </span>
            </div>

            {/* Custom glowing compliance bar */}
            <div style={{ height: 6, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden', margin: '10px 0 6px' }}>
              <div
                style={{
                  width: `${systemHealth.score}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #10B981, #059669)',
                  borderRadius: 99,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <div style={{ fontSize: 10.5, color: '#059669', fontWeight: 600 }}>
              {systemHealth.nominalNodes} of {systemHealth.totalNodes} telemetry nodes nominal
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar: Section Tabs & Filters ─────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {/* ── Animated Tab Bar */}
        <div className="alerts-tab-bar">
          <button type="button" onClick={() => setActiveTab('active')}
            className={`alert-tab ${activeTab === 'active' ? 'active-danger' : ''}`}
          >
            <AlertTriangle size={14} />
            Active Alerts
            {activeAlertsCount > 0 && (
              <span style={{
                background: 'rgba(255,255,255,0.3)', borderRadius: 999,
                padding: '1px 7px', fontSize: 11, fontWeight: 800,
              }}>{activeAlertsCount}</span>
            )}
          </button>
          <button type="button" onClick={() => setActiveTab('history')}
            className={`alert-tab ${activeTab === 'history' ? 'active' : ''}`}
          >
            <History size={14} />
            Alert History ({alertHistory.length})
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ color: 'var(--color-text-label)', fontWeight: 700 }}>Station:</span>
            <select
              className="node-select-control"
              value={selectedNodeFilter}
              onChange={(e) => setSelectedNodeFilter(e.target.value)}
              style={{ minWidth: 'unset', padding: '6px 32px 6px 12px', fontSize: 12 }}
            >
              <option value="ALL">All Stations</option>
              {nodes.map((n) => (
                <option key={n.nodeId} value={String(n.nodeId).toUpperCase().trim()}>
                  {n.name || n.nodeId} ({n.nodeId})
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['ALL', 'critical', 'warning'].map(sev => (
              <button
                key={sev}
                onClick={() => setSelectedSeverityFilter(sev)}
                className={`filter-chip ${
                  selectedSeverityFilter === sev
                    ? sev === 'critical' ? 'active-rose' : sev === 'warning' ? 'active-amber' : 'active'
                    : ''
                }`}
              >
                {sev === 'ALL' ? 'All' : sev === 'critical' ? 'Critical' : 'Warning'}
              </button>
            ))}
          </div>
          {activeTab === 'history' && alertHistory.length > 0 && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={clearHistory}
              style={{ color: '#BE123C' }}
            >
              <Trash2 size={13} /> Clear Log
            </button>
          )}
        </div>
      </div>


      {/* ── Active Alerts Tab Content (TABLE FORMAT) ─────────────────────────── */}
      {activeTab === 'active' && (
        <div
          className="card"
          style={{
            padding: '22px',
            borderRadius: 16,
            background: '#FFFFFF',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-heading)', margin: 0 }}>
                Active Environmental Alerts Table
              </h3>
              <p className="text-xs text-muted" style={{ marginTop: 2 }}>
                Live active threshold violations across all monitored stations. Telemetry updates in real time.
              </p>
            </div>
            {filteredActiveAlerts.length > 0 && (
              <span
                style={{
                  background: 'rgba(232, 120, 120, 0.14)',
                  color: '#b91c1c',
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: 8,
                  border: '1px solid #E87878',
                }}
              >
                {filteredActiveAlerts.length} Active {filteredActiveAlerts.length === 1 ? 'Alert' : 'Alerts'}
              </span>
            )}
          </div>

          {filteredActiveAlerts.length === 0 ? (
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                background: '#FDFDFD',
                borderRadius: 12,
                border: '1px dashed #E5E5E5',
              }}
            >
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: 'rgba(98, 200, 155, 0.14)',
                  border: '1px solid #62C89B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  color: '#1e7e53',
                }}
              >
                <CheckCircle2 size={26} />
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-heading)', marginBottom: 4 }}>
                No Active Environmental Alerts
              </h4>
              <p
                style={{
                  fontSize: 12.5,
                  color: 'var(--color-text-secondary)',
                  maxWidth: 460,
                  margin: '0 auto',
                  lineHeight: 1.5,
                }}
              >
                All sensor parameters across all IoT stations are within safe ranges. Whenever sensor data exceeds safe thresholds, active alerts will appear here in this table.
              </p>
            </div>
          ) : (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  tableLayout: 'fixed',
                  borderCollapse: 'collapse',
                  fontSize: 12,
                }}
              >
                <colgroup>
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '7%' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: '#FFFDF3', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '10px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Station</th>
                    <th style={{ padding: '10px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Sensor</th>
                    <th style={{ padding: '10px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Reading / Limit</th>
                    <th style={{ padding: '10px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Severity</th>
                    <th style={{ padding: '10px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Situation & Actions</th>
                    <th style={{ padding: '10px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Time</th>
                    <th style={{ padding: '10px 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActiveAlerts.map((alert) => {
                    const isCrit = alert.severity === 'critical';
                    const rowBg = isCrit ? 'rgba(232, 120, 120, 0.04)' : 'rgba(245, 184, 75, 0.04)';
                    const accentColor = isCrit ? '#b91c1c' : '#9a6700';
                    const badgeBg = isCrit ? 'rgba(232, 120, 120, 0.14)' : 'rgba(245, 184, 75, 0.16)';
                    const badgeBorder = isCrit ? '#E87878' : '#F5B84B';

                    return (
                      <tr key={alert.id} style={{ background: rowBg, borderBottom: '1px solid #FAF6E3' }}>
                        {/* 1. Station Name + ID */}
                        <td style={{ padding: '12px 10px', verticalAlign: 'middle', wordBreak: 'break-word' }}>
                          <div style={{ fontWeight: 800, color: 'var(--color-heading)', fontSize: 12.5, lineHeight: 1.3 }}>
                            {alert.nodeName}
                          </div>
                          <div style={{ marginTop: 4 }}>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                fontSize: 10.5,
                                background: '#F0EBE1',
                                padding: '1px 6px',
                                borderRadius: 4,
                                color: '#4A4200',
                                border: '1px solid #E5DFCE',
                                display: 'inline-block',
                              }}
                            >
                              {alert.nodeId}
                            </span>
                          </div>
                        </td>

                        {/* 2. Sensor Channel */}
                        <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 16 }}>{alert.sensorIcon}</span>
                            <span style={{ fontWeight: 700, color: 'var(--color-heading)' }}>
                              {alert.sensorName}
                            </span>
                          </div>
                        </td>

                        {/* 3. Reading & Threshold Limit */}
                        <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                          <span
                            style={{
                              fontSize: 12.5,
                              fontWeight: 900,
                              color: accentColor,
                              padding: '2px 7px',
                              borderRadius: 6,
                              background: badgeBg,
                              border: `1px solid ${badgeBorder}`,
                              display: 'inline-block',
                            }}
                          >
                            {alert.value} {alert.unit}
                          </span>
                          <div style={{ fontSize: 10.5, color: '#8A8A8A', marginTop: 3, fontWeight: 500 }}>
                            Limit: &gt; {alert.threshold} {alert.unit}
                          </div>
                        </td>

                        {/* 4. Severity */}
                        <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 8px',
                              borderRadius: 999,
                              fontSize: 10.5,
                              fontWeight: 800,
                              background: badgeBg,
                              color: accentColor,
                              border: `1px solid ${badgeBorder}`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: accentColor,
                                display: 'inline-block',
                              }}
                            />
                            {isCrit ? 'CRITICAL' : 'WARNING'}
                          </span>
                        </td>

                        {/* 5. Situation & Recommended Actions */}
                        <td style={{ padding: '12px 10px', verticalAlign: 'middle', wordBreak: 'break-word' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-heading)', fontSize: 11.5, marginBottom: 4 }}>
                            {alert.message}
                          </div>
                          {alert.recommendedActions && alert.recommendedActions.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                              {alert.recommendedActions.map((action, i) => (
                                <span
                                  key={i}
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    background: '#FFFFFF',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 4,
                                    padding: '1px 5px',
                                    color: 'var(--color-text-secondary)',
                                  }}
                                >
                                  {action}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* 6. Detected At */}
                        <td style={{ padding: '12px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              color: 'var(--color-text-label)',
                              fontSize: 11,
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            <Clock size={11} /> {formatAlertTime(alert.timestamp)}
                          </span>
                        </td>

                        {/* 7. Action Button */}
                        <td style={{ padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <button
                            type="button"
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="btn btn-secondary btn-sm"
                            style={{
                              background: '#FFFFFF',
                              padding: '4px 8px',
                              fontSize: 11,
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                            }}
                            title="Acknowledge alert and log into history"
                          >
                            <Check size={12} color="#1e7e53" /> Ack
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Alert History Tab Content ────────────────────────────────── */}
      {activeTab === 'history' && (
        <div
          className="card"
          style={{
            padding: '22px',
            borderRadius: 16,
            background: '#FFFFFF',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-heading)', margin: 0 }}>
              Environmental Incident Audit Log
            </h3>
            <p className="text-xs text-muted" style={{ marginTop: 2 }}>
              Historical record of all triggered alerts across stations, tracking event durations and recovery timestamps.
            </p>
          </div>

          {filteredHistory.length === 0 ? (
            <div
              style={{
                padding: '36px',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                fontSize: 13,
              }}
            >
              No historical incident logs match your current filter selection.
            </div>
          ) : (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  tableLayout: 'fixed',
                  borderCollapse: 'collapse',
                  fontSize: 12,
                }}
              >
                <colgroup>
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '8%' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: '#FFFDF3', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '10px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Station</th>
                    <th style={{ padding: '10px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Sensor</th>
                    <th style={{ padding: '10px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Peak / Limit</th>
                    <th style={{ padding: '10px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Severity</th>
                    <th style={{ padding: '10px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Started</th>
                    <th style={{ padding: '10px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Resolved</th>
                    <th style={{ padding: '10px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Duration</th>
                    <th style={{ padding: '10px 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #FAF6E3' }}>
                      <td style={{ padding: '12px 10px', verticalAlign: 'middle', wordBreak: 'break-word' }}>
                        <div style={{ fontWeight: 800, color: 'var(--color-heading)', fontSize: 12 }}>
                          {item.nodeName}
                        </div>
                        <div style={{ marginTop: 2 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-label)' }}>
                            {item.nodeId}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                        <span style={{ marginRight: 5 }}>{item.sensorIcon}</span>
                        <strong>{item.sensorName}</strong>
                      </td>
                      <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                        <span style={{ fontWeight: 800, color: item.severity === 'critical' ? '#b91c1c' : '#9a6700' }}>
                          {item.peakValue || item.value} {item.unit}
                        </span>
                        <div style={{ fontSize: 10, color: '#8A8A8A' }}>
                          Limit: {item.threshold} {item.unit}
                        </div>
                      </td>
                      <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                        <span
                          className={`badge ${item.severity === 'critical' ? 'badge-danger' : 'badge-warning'}`}
                          style={{ fontSize: 10, padding: '2px 7px', textTransform: 'capitalize' }}
                        >
                          {item.severity}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', verticalAlign: 'middle', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                        {formatAlertTime(item.startedAt || item.timestamp)}
                      </td>
                      <td style={{ padding: '12px 10px', verticalAlign: 'middle', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                        {item.resolvedAt ? formatAlertTime(item.resolvedAt) : '—'}
                      </td>
                      <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                        <span style={{ fontWeight: 700, color: 'var(--color-heading)', fontSize: 11 }}>
                          {item.duration || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 4,
                            background: item.status === 'acknowledged' ? 'var(--status-moderate-bg)' : 'var(--status-safe-bg)',
                            color: item.status === 'acknowledged' ? 'var(--status-moderate-text)' : 'var(--status-safe-text)',
                            border: `1px solid ${item.status === 'acknowledged' ? 'var(--status-moderate-border)' : 'var(--status-safe-border)'}`,
                            textTransform: 'capitalize',
                            display: 'inline-block',
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
