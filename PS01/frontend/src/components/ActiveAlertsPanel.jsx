import React, { useState } from 'react';
import {
  AlertTriangle, AlertCircle, CheckCircle2, ShieldCheck,
  Clock, Radio, ChevronDown, ChevronUp, History, Trash2, Check,
  Wifi, WifiOff
} from 'lucide-react';
import { useAlerts } from '../context/AlertContext';
import { formatAlertTime } from '../utils/alertConfig';

export default function ActiveAlertsPanel() {
  const {
    activeAlerts,
    activeAlertsCount,
    alertHistory,
    isSocketConnected,
    acknowledgeAlert,
    clearHistory,
  } = useAlerts();

  const [showHistory, setShowHistory] = useState(false);

  return (
    <div
      className="card"
      style={{
        padding: '20px',
        marginBottom: 24,
        borderRadius: 16,
        border: activeAlertsCount > 0 ? '1.5px solid #F5B84B' : '1px solid var(--color-border)',
        boxShadow: activeAlertsCount > 0
          ? '0 6px 24px rgba(245, 184, 75, 0.15)'
          : 'var(--shadow-card)',
        background: '#FFFFFF',
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          paddingBottom: 14,
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: activeAlertsCount > 0 ? 'rgba(232, 120, 120, 0.14)' : 'rgba(98, 200, 155, 0.14)',
              border: `1px solid ${activeAlertsCount > 0 ? '#E87878' : '#62C89B'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: activeAlertsCount > 0 ? '#b91c1c' : '#1e7e53',
            }}
          >
            {activeAlertsCount > 0 ? <AlertTriangle size={18} /> : <ShieldCheck size={20} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-heading)', margin: 0 }}>
                Active Environmental Alerts
              </h3>
              <span
                style={{
                  background: activeAlertsCount > 0 ? '#E87878' : '#62C89B',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 999,
                }}
              >
                {activeAlertsCount}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              Real-time multi-node threshold monitoring across all stations
            </div>
          </div>
        </div>

        {/* Right Status Indicators & History Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Socket Connection Status Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 999,
              background: isSocketConnected ? 'rgba(98, 200, 155, 0.14)' : 'rgba(232, 120, 120, 0.14)',
              color: isSocketConnected ? '#1e7e53' : '#a83232',
              border: `1px solid ${isSocketConnected ? '#62C89B' : '#E87878'}`,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: isSocketConnected ? '#62C89B' : '#E87878',
              }}
            />
            {isSocketConnected ? '🟢 Live Stream' : '🔴 Reconnecting...'}
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowHistory(!showHistory)}
            style={{ fontSize: 11, padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <History size={13} />
            Alert History ({alertHistory.length})
            {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Active Alerts Content */}
      <div style={{ paddingTop: 16 }}>
        {activeAlertsCount === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              background: '#FFFDF3',
              borderRadius: 12,
              border: '1px dashed #F1E9C8',
            }}
          >
            <div style={{ color: '#1e7e53', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <CheckCircle2 size={18} />
              All Deployed Stations Operating in Normal Parameters
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '6px 0 0', lineHeight: 1.5 }}>
              No critical or warning thresholds currently breached across any registered IoT node.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {activeAlerts.map((alert) => {
              const isCrit = alert.severity === 'critical';
              const cardBorder = isCrit ? '#E87878' : '#F5B84B';
              const cardBg = isCrit ? '#FFF5F5' : '#FFFDF3';

              return (
                <div
                  key={alert.id}
                  style={{
                    border: `1.5px solid ${cardBorder}`,
                    borderRadius: 12,
                    background: cardBg,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    position: 'relative',
                  }}
                >
                  <div>
                    {/* Header: Node Name + Severity Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: 999,
                            background: isCrit ? '#E87878' : '#F5B84B',
                            color: isCrit ? '#FFFFFF' : '#4A4200',
                            textTransform: 'uppercase',
                            letterSpacing: '0.4px',
                            display: 'inline-block',
                            marginBottom: 4,
                          }}
                        >
                          {isCrit ? 'CRITICAL' : 'WARNING'}
                        </span>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#4A4200' }}>
                          Station: <strong>{alert.nodeName}</strong>
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--color-text-label)', fontFamily: 'monospace' }}>
                          ID: {alert.nodeId}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: isCrit ? '#b91c1c' : '#9a6700' }}>
                          {alert.value} {alert.unit}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--color-text-label)' }}>
                          Limit: {alert.threshold} {alert.unit}
                        </div>
                      </div>
                    </div>

                    {/* Sensor Title & Message */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 18 }}>{alert.sensorIcon}</span>
                      <strong style={{ fontSize: 13, color: 'var(--color-heading)' }}>
                        {alert.title || `${alert.sensorName} Alert`}
                      </strong>
                    </div>

                    <p style={{ fontSize: 11.5, color: 'var(--color-text-secondary)', margin: '0 0 10px', lineHeight: 1.4 }}>
                      {alert.message}
                    </p>

                    {/* Recommended Action Pills */}
                    {alert.recommendedActions && alert.recommendedActions.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-label)', marginBottom: 4, textTransform: 'uppercase' }}>
                          Recommended:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {alert.recommendedActions.map((action, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: 10.5,
                                fontWeight: 600,
                                background: '#FFFFFF',
                                border: '1px solid var(--color-border)',
                                padding: '2px 8px',
                                borderRadius: 6,
                                color: 'var(--color-heading)',
                              }}
                            >
                              {action}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer: Detected Timestamp & Acknowledge Button */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: 8,
                      borderTop: '1px solid rgba(0,0,0,0.06)',
                      fontSize: 10.5,
                      color: 'var(--color-text-label)',
                    }}
                  >
                    <span>
                      Detected: {formatAlertTime(alert.timestamp)}
                    </span>

                    <button
                      type="button"
                      onClick={() => acknowledgeAlert(alert.id)}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-heading)',
                        fontWeight: 700,
                        fontSize: 10.5,
                        padding: '3px 8px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      title="Acknowledge and dismiss active alert"
                    >
                      <Check size={11} color="#1e7e53" /> Acknowledge
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expandable Alert History Section */}
      {showHistory && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-heading)', margin: 0 }}>
                Resolved Alert History
              </h4>
              <span className="text-xs text-muted">
                Audit log of recent recovered or acknowledged environmental threshold events
              </span>
            </div>

            {alertHistory.length > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={clearHistory}
                style={{ fontSize: 11, color: '#E87878', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <Trash2 size={12} /> Clear Log
              </button>
            )}
          </div>

          {alertHistory.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
              No past alert history recorded in this session.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ fontSize: 11.5, width: '100%' }}>
                <thead>
                  <tr>
                    <th>Station</th>
                    <th>Sensor</th>
                    <th>Peak Value</th>
                    <th>Limit</th>
                    <th>Severity</th>
                    <th>Detected</th>
                    <th>Resolved</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {alertHistory.slice(0, 15).map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <strong>{item.nodeName}</strong>
                        <div style={{ fontSize: 10, color: 'var(--color-text-label)', fontFamily: 'monospace' }}>{item.nodeId}</div>
                      </td>
                      <td>
                        <span style={{ marginRight: 5 }}>{item.sensorIcon}</span>
                        {item.sensorName}
                      </td>
                      <td>
                        <strong>{item.peakValue || item.value} {item.unit}</strong>
                      </td>
                      <td>{item.threshold} {item.unit}</td>
                      <td>
                        <span
                          className={`badge ${item.severity === 'critical' ? 'badge-danger' : 'badge-warning'}`}
                          style={{ fontSize: 10, padding: '1px 6px', textTransform: 'capitalize' }}
                        >
                          {item.severity}
                        </span>
                      </td>
                      <td>{formatAlertTime(item.startedAt || item.timestamp)}</td>
                      <td>{item.resolvedAt ? formatAlertTime(item.resolvedAt) : '—'}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--color-heading)' }}>
                          {item.duration || '—'}
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
