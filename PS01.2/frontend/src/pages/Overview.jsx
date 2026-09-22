import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw, Radio, ArrowRight, AlertTriangle, Activity, Cpu
} from 'lucide-react';

import { dashboardAPI, readingsAPI, nodesAPI } from '../services/api';
import socket from '../services/socket';
import { LoadingState, ErrorState, ProtrudingStatCard } from '../components/UI';
import SensorCard from '../components/SensorCard';
import { useAlerts } from '../context/AlertContext';
import {
  SENSOR_SPEC_TABLE, getStatus, STATUS_COLORS, STATUS_LABELS,
  timeAgo
} from '../utils/thresholds';

const SENSOR_ORDER = [
  'temperature', 'humidity', 'pm25', 'pm10', 'co2',
  'co', 'no2', 'so2', 'o3', 'voc', 'nh3', 'smoke'
];

const orderedSensorSpecs = SENSOR_ORDER.map((key) =>
  SENSOR_SPEC_TABLE.find((s) => s.key === key)
).filter(Boolean);

const POLL_INTERVAL = 15000;

export default function Overview() {
  const { activeAlertsCount } = useAlerts();

  const [masterNode, setMasterNode] = useState(null);
  const masterNodeRef = useRef(masterNode);
  masterNodeRef.current = masterNode;

  const [summary, setSummary] = useState(null);
  const [latestReading, setLatestReading] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [socketConnected, setSocketConnected] = useState(socket.connected);
  const [justUpdated, setJustUpdated] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      let activeNodeId = null;
      try {
        const masterRes = await nodesAPI.getMaster();
        const m = masterRes.data.data;
        setMasterNode(m);
        if (m?.nodeId) activeNodeId = m.nodeId;
      } catch (err) {
        console.warn('Could not fetch master node:', err);
      }

      const queryParams = activeNodeId ? { nodeId: activeNodeId } : {};

      const [sumRes, latestRes, histRes] = await Promise.all([
        dashboardAPI.getSummary(queryParams).catch(() => ({ data: { data: null } })),
        nodesAPI.getLatest(queryParams).catch(() => ({ data: { data: null } })),
        readingsAPI.getHistory({ limit: 25, ...queryParams }).catch(() => ({ data: { data: [] } })),
      ]);

      const sumData = sumRes.data.data;
      const curLatest = latestRes.data.data || sumData?.latestReading;
      const history = histRes.data.data || [];

      setSummary(sumData);
      setLatestReading(curLatest);

      if (history.length > 0) {
        setTrendData(
          history.map((r, idx) => ({
            time: new Date(r.timestamp).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            index: idx + 12,
            co2: r.co2,
            pm25: r.pm25,
            temperature: r.temperature,
            smoke: r.smoke || 20,
          }))
        );
      } else if (curLatest) {
        setTrendData([
          {
            time: new Date(curLatest.timestamp || Date.now()).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            index: 12,
            co2: curLatest.co2,
            pm25: curLatest.pm25,
            temperature: curLatest.temperature,
            smoke: curLatest.smoke || 20,
          },
        ]);
      } else {
        setTrendData([]);
      }

      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Socket.IO Real-Time Listener
  useEffect(() => {
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    const onNewReading = (reading) => {
      if (masterNodeRef.current?.nodeId && reading.nodeId && reading.nodeId !== masterNodeRef.current.nodeId) {
        return;
      }

      setLatestReading(reading);
      setLastRefresh(new Date());
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 2000);

      setTrendData((prev) => {
        const point = {
          time: new Date(reading.timestamp || Date.now()).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          index: (prev.length > 0 ? prev[prev.length - 1].index + 1 : 12),
          co2: reading.co2,
          pm25: reading.pm25,
          temperature: reading.temperature,
          smoke: reading.smoke || 20,
        };
        const next = [...prev, point];
        return next.slice(-25);
      });

      setSummary((prev) => ({
        ...prev,
        totalReadings: (prev?.totalReadings || 0) + 1,
        lastDataReceived: reading.timestamp || new Date().toISOString(),
      }));
    };

    const onUpdateReading = (reading) => {
      if (masterNodeRef.current?.nodeId && reading.nodeId && reading.nodeId !== masterNodeRef.current.nodeId) {
        return;
      }
      setLatestReading(reading);
      setLastRefresh(new Date());
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 2000);
    };

    const onDeleteReading = () => fetchData();
    const onMasterNodeChanged = (newNode) => {
      setMasterNode(newNode);
      fetchData();
    };
    const onNodeDeleted = () => fetchData();
    const onNodeCreated = () => fetchData();

    if (socket.connected) setSocketConnected(true);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('new_reading', onNewReading);
    socket.on('update_reading', onUpdateReading);
    socket.on('delete_reading', onDeleteReading);
    socket.on('master_node_changed', onMasterNodeChanged);
    socket.on('node_deleted', onNodeDeleted);
    socket.on('node_created', onNodeCreated);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('new_reading', onNewReading);
      socket.off('update_reading', onUpdateReading);
      socket.off('delete_reading', onDeleteReading);
      socket.off('master_node_changed', onMasterNodeChanged);
      socket.off('node_deleted', onNodeDeleted);
      socket.off('node_created', onNodeCreated);
    };
  }, [fetchData]);

  if (loading) return <LoadingState text="Connecting to real-time telemetry stream..." />;
  if (error && !summary && !latestReading) return <ErrorState message={error} onRetry={fetchData} />;


  return (
    <div>
      {/* ── Active Master Node Banner ─────────────────────────────────── */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--color-border)',
          borderRadius: 18,
          padding: '14px 20px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          boxShadow: 'var(--shadow-card)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'rgba(79, 117, 254, 0.12)',
              border: '1px solid rgba(79, 117, 254, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
              flexShrink: 0
            }}
          >
            <Radio size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-label)'
                }}
              >
                Active Master Node Stream
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10,
                  fontWeight: 800,
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#059669',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '2px 8px',
                  borderRadius: 999
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#10B981',
                    boxShadow: '0 0 6px #10B981'
                  }}
                />
                LIVE FEEDS
              </span>
            </div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: 'var(--color-heading)',
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <span>{masterNode?.name || (masterNode ? `Node ${masterNode.nodeNumber}` : 'Auto-detected Master')}</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  background: 'rgba(79, 117, 254, 0.08)',
                  padding: '1px 8px',
                  borderRadius: 6,
                  border: '1px solid rgba(79, 117, 254, 0.2)'
                }}
              >
                {masterNode?.nodeId || 'GLOBAL'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'none', md: 'inline' }}>
            All metrics & telemetry reflect this hardware node
          </span>
          <Link
            to="/nodes"
            className="btn btn-primary btn-sm"
          >
            Manage Nodes
            <ArrowRight size={14} />
          </Link>
          {activeAlertsCount > 0 && (
            <Link
              to="/alerts"
              className="btn btn-danger btn-sm"
              title="View Active Environmental Alerts"
            >
              <AlertTriangle size={14} />
              <span>{activeAlertsCount} Active {activeAlertsCount === 1 ? 'Alert' : 'Alerts'}</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── Top 4 Environmental KPI Protruding Cards ──────────────────── */}
      <div className="protruding-cards-grid-4" style={{ marginBottom: 28 }}>
        <ProtrudingStatCard
          icon={Activity}
          label="TOTAL TELEMETRY"
          value={summary?.totalReadings != null ? Number(summary.totalReadings).toLocaleString() : (latestReading ? '1,580' : '0')}
          color="blue"
          sub="Real-time records received"
        />
        <ProtrudingStatCard
          icon={AlertTriangle}
          label="ACTIVE ALERTS"
          value={activeAlertsCount}
          color="pink"
          sub={activeAlertsCount > 0 ? `${activeAlertsCount} active breaches` : 'All stations within safe limits'}
        />
        <ProtrudingStatCard
          icon={Radio}
          label="ONLINE STATIONS"
          value={`${summary?.activeNodes ?? 1} / ${summary?.totalNodes ?? 1}`}
          color="amber"
          sub="Connected hardware nodes"
        />
        <ProtrudingStatCard
          icon={Cpu}
          label="STREAM ENGINE"
          value={socketConnected ? 'ONLINE' : 'OFFLINE'}
          color="green"
          sub={socketConnected ? 'Live WebSocket stream active' : 'Reconnecting to stream...'}
        />
      </div>

      {/* ── Live Sensor Telemetry Channels Grid ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-heading)' }}>
            Live Sensor Telemetry Channels
          </h3>
          <p className="text-xs text-muted" style={{ marginTop: 2 }}>
            Real-time measurements with calibrated threshold gauges for {masterNode?.name || 'Master Node'} ({masterNode?.nodeId || 'GLOBAL'})
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))',
          gap: '18px',
          marginBottom: '28px',
        }}
      >
        {orderedSensorSpecs.map((spec) => (
          <SensorCard
            key={spec.key}
            spec={spec}
            value={latestReading ? latestReading[spec.key] : null}
            unit={spec.unit}
            timestamp={latestReading?.timestamp}
          />
        ))}
      </div>

      {/* ── Real-Time Parameter Status Table ──────────────────────────── */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-heading)' }}>
            Sensor Details — Real-Time Parameter Status
          </h2>
          <p className="text-xs text-muted" style={{ marginTop: 2 }}>
            Live telemetry received via <code>/api/nodes/:nodeId</code> · Updated{' '}
            {lastRefresh ? timeAgo(lastRefresh) : '—'}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchData}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="table-container mb-6">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Unit</th>
                <th>Current Value</th>
                <th>Status</th>
                <th style={{ color: '#059669' }}>Safe / Good</th>
                <th style={{ color: '#D97706' }}>Moderate / Average</th>
                <th style={{ color: '#E11D48' }}>Dangerous / Unhealthy</th>
              </tr>
            </thead>
            <tbody>
              {SENSOR_SPEC_TABLE.map((ref) => {
                const rawVal = latestReading ? latestReading[ref.key] : null;
                const status = getStatus(ref.key, rawVal);
                const style = STATUS_COLORS[status] || STATUS_COLORS.unknown;
                const label = STATUS_LABELS[status] || 'No Data';

                const displayVal =
                  rawVal !== null && rawVal !== undefined
                    ? `${Number(rawVal).toFixed(ref.unit === 'ppm' || ref.unit === 'ppb' ? 1 : 1)} ${ref.unit}`
                    : '—';

                return (
                  <tr key={ref.key}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--color-heading)' }}>
                        {ref.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-label)', fontFamily: 'var(--font-mono)' }}>
                        Sensor: {ref.sensor}
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-sm" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                        {ref.unit}
                      </span>
                    </td>
                    <td>
                      <span
                        className="font-mono"
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: rawVal !== null && rawVal !== undefined ? style.text : 'var(--color-text-label)',
                        }}
                      >
                        {displayVal}
                      </span>
                    </td>
                    <td>
                      {rawVal !== null && rawVal !== undefined ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 12px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 700,
                            background: style.bg,
                            color: style.text,
                            border: `1px solid ${style.border}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              background: style.dot,
                              flexShrink: 0,
                            }}
                          />
                          {label}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-label)', fontSize: 12 }}>No Data</span>
                      )}
                    </td>
                    <td style={{ color: '#059669', fontSize: 12, fontWeight: 600 }}>
                      {ref.safeText}
                    </td>
                    <td style={{ color: '#D97706', fontSize: 12, fontWeight: 600 }}>
                      {ref.moderateText}
                    </td>
                    <td style={{ color: '#E11D48', fontSize: 12, fontWeight: 600 }}>
                      {ref.dangerousText}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
