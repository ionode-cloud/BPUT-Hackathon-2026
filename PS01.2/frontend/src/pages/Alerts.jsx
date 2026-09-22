import React, { useState, useMemo } from 'react';
import {
  AlertTriangle, AlertCircle, ShieldCheck, CheckCircle2,
  Clock, Radio, History, Trash2, Check, Filter, Search,
  Cpu, Layers, ArrowUpRight
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

      {/* ── Mockup Dual Wave Cards for Incidents Trajectory ──────────── */}
      <div className="mockup-main-grid">
        <div className="mockup-main-chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--color-accent-pink)' }}>
                INCIDENT TRAJECTORY
              </div>
              <span className="chart-title">Station Alert Activity Distribution</span>
              <p className="text-xs text-muted" style={{ marginTop: 2 }}>Breakdown of active warnings and critical threshold events by monitored station</p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>LOREM IPSUM</span>
          </div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={nodes.map((n, i) => {
                const count = activeAlerts.filter(a => a.nodeId === n.nodeId).length;
                return { name: n.nodeId, count: count > 0 ? count : (i % 2 === 0 ? 1 : 0) };
              })}>
                <CartesianGrid stroke="#EDF0F8" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#8F97AB', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#E2E6F0' }} />
                <YAxis tick={{ fill: '#8F97AB', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#FFFFFF',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="count" name="Incidents" radius={[6, 6, 0, 0]}>
                  {nodes.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#FF5376' : '#4F75FE'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mockup-wave-cards-stack">
          <div className="mockup-wave-card">
            <div className="mockup-wave-header">
              <div>
                <div className="mockup-wave-title">CRITICAL BREACHES</div>
                <div className="mockup-wave-val">{criticalCount}</div>
              </div>
              <div className="mockup-wave-tag">ACTIVE SEVERITY</div>
            </div>
            <div style={{ height: 75, margin: '0 -22px -14px -22px' }}>
              <ResponsiveContainer width="100%" height={75}>
                <AreaChart data={[
                  { v: 0 }, { v: criticalCount > 0 ? 2 : 1 }, { v: criticalCount > 0 ? 4 : 1 }, { v: criticalCount * 2 + 1 }, { v: criticalCount }
                ]}>
                  <defs>
                    <linearGradient id="alertCritWave" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF5376" stopOpacity={0.88} />
                      <stop offset="100%" stopColor="#FF5376" stopOpacity={0.88} />
                    </linearGradient>
                  </defs>
                  <Area type="natural" dataKey="v" stroke="#FF5376" strokeWidth={2.5} fill="url(#alertCritWave)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mockup-wave-card">
            <div className="mockup-wave-header">
              <div>
                <div className="mockup-wave-title">WARNING EVENTS</div>
                <div className="mockup-wave-val">{warningCount}</div>
              </div>
              <div className="mockup-wave-tag">ACTIVE SEVERITY</div>
            </div>
            <div style={{ height: 75, margin: '0 -22px -14px -22px' }}>
              <ResponsiveContainer width="100%" height={75}>
                <AreaChart data={[
                  { v: 0 }, { v: warningCount > 0 ? 3 : 2 }, { v: warningCount > 0 ? 5 : 2 }, { v: warningCount * 2 + 2 }, { v: warningCount }
                ]}>
                  <defs>
                    <linearGradient id="alertWarnWave" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFAE33" stopOpacity={0.88} />
                      <stop offset="100%" stopColor="#FFAE33" stopOpacity={0.88} />
                    </linearGradient>
                  </defs>
                  <Area type="natural" dataKey="v" stroke="#FFAE33" strokeWidth={2.5} fill="url(#alertWarnWave)" />
                </AreaChart>
              </ResponsiveContainer>
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
        {/* Section View Tabs: Active vs History */}
        <div
          style={{
            display: 'inline-flex',
            background: '#FFFFFF',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            padding: 3,
            gap: 2,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            style={{
              border: 'none',
              background: activeTab === 'active' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'active' ? '#FFFFFF' : 'var(--color-text-secondary)',
              fontWeight: 800,
              fontSize: 12,
              padding: '6px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <AlertTriangle size={14} />
            Active Alerts ({activeAlertsCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              border: 'none',
              background: activeTab === 'history' ? 'var(--color-primary)' : 'transparent',
              color: activeTab === 'history' ? '#FFFFFF' : 'var(--color-text-secondary)',
              fontWeight: 800,
              fontSize: 12,
              padding: '6px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <History size={14} />
            Alert History ({alertHistory.length})
          </button>
        </div>

        {/* Filters by Station and Severity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Station Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ color: 'var(--color-text-label)', fontWeight: 600 }}>Station:</span>
            <select
              className="form-input"
              value={selectedNodeFilter}
              onChange={(e) => setSelectedNodeFilter(e.target.value)}
              style={{ padding: '5px 10px', fontSize: 11.5, borderRadius: 8 }}
            >
              <option value="ALL">All Stations</option>
              {nodes.map((n) => (
                <option key={n.nodeId} value={String(n.nodeId).toUpperCase().trim()}>
                  {n.name || n.nodeId} ({n.nodeId})
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ color: 'var(--color-text-label)', fontWeight: 600 }}>Severity:</span>
            <select
              className="form-input"
              value={selectedSeverityFilter}
              onChange={(e) => setSelectedSeverityFilter(e.target.value)}
              style={{ padding: '5px 10px', fontSize: 11.5, borderRadius: 8 }}
            >
              <option value="ALL">All Severities</option>
              <option value="critical">Critical Only</option>
              <option value="warning">Warning Only</option>
            </select>
          </div>

          {activeTab === 'history' && alertHistory.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={clearHistory}
              style={{ color: '#E87878', padding: '5px 10px', fontSize: 11.5 }}
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
