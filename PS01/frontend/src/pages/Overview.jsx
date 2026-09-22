import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Wind, RefreshCw, Clock, Radio, ArrowRight, AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { dashboardAPI, readingsAPI, nodesAPI } from '../services/api';
import socket from '../services/socket';
import { LoadingState, ErrorState } from '../components/UI';
import SensorCard from '../components/SensorCard';
import { useAlerts } from '../context/AlertContext';
import {
  SENSOR_SPEC_TABLE, getStatus, STATUS_COLORS, STATUS_LABELS,
  formatValue, getThresholdPercentage, timeAgo
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
  const { activeAlertsCount, isSocketConnected } = useAlerts();

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
      // 1. Fetch current Master Node
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
          history.map((r) => ({
            time: new Date(r.timestamp).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            co2: r.co2,
            pm25: r.pm25,
            temperature: r.temperature,
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
            co2: curLatest.co2,
            pm25: curLatest.pm25,
            temperature: curLatest.temperature,
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

  // ── Socket.IO Real-Time Listener ────────────────────────────
  useEffect(() => {
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    const onNewReading = (reading) => {
      // If we are scoped to a master node, filter out readings from other nodes
      if (masterNodeRef.current?.nodeId && reading.nodeId && reading.nodeId !== masterNodeRef.current.nodeId) {
        return;
      }

      setLatestReading(reading);
      setLastRefresh(new Date());
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 2000);

      // Append point to trend chart
      setTrendData((prev) => {
        const point = {
          time: new Date(reading.timestamp || Date.now()).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          co2: reading.co2,
          pm25: reading.pm25,
          temperature: reading.temperature,
        };
        const next = [...prev, point];
        return next.slice(-25);
      });

      // Update total readings count in summary
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

    const onDeleteReading = () => {
      fetchData();
    };

    const onMasterNodeChanged = (newNode) => {
      setMasterNode(newNode);
      fetchData();
    };

    const onNodeDeleted = () => {
      fetchData();
    };

    const onNodeCreated = () => {
      fetchData();
    };

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
          border: '1px solid #F1E9C8',
          borderRadius: 16,
          padding: '12px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: '#FFFBEA',
              border: '1px solid #F4D35E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8A6D00',
              flexShrink: 0
            }}
          >
            <Radio size={19} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: '#8A8A8A'
                }}
              >
                Active Master Node Data Stream
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  background: '#62C89B1A',
                  color: '#248255',
                  border: '1px solid #62C89B55',
                  padding: '2px 8px',
                  borderRadius: 999
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#62C89B',
                    boxShadow: '0 0 6px #62C89B'
                  }}
                />
                LIVE FEEDS
              </span>
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: '#343434',
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <span>{masterNode?.name || (masterNode ? `Node ${masterNode.nodeNumber}` : 'Auto-detected Master')}</span>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#8A8A8A',
                  background: '#FFFDF3',
                  padding: '1px 7px',
                  borderRadius: 6,
                  border: '1px solid #F1E9C8'
                }}
              >
                {masterNode?.nodeId || 'GLOBAL'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#8A8A8A', display: 'none', md: 'inline' }}>
            All metrics & charts below reflect this node
          </span>
          <Link
            to="/nodes"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 10,
              background: '#F4D35E',
              color: '#343434',
              fontSize: 12,
              fontWeight: 700,
              textDecoration: 'none',
              border: '1px solid #E5C44B',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease'
            }}
          >
            Manage Nodes
            <ArrowRight size={14} />
          </Link>
          {activeAlertsCount > 0 && (
            <Link
              to="/alerts"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 13px',
                borderRadius: 10,
                background: '#FFF5F5',
                color: '#b91c1c',
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'none',
                border: '1px solid #E87878',
                boxShadow: '0 1px 3px rgba(232, 120, 120, 0.1)',
                transition: 'all 0.15s ease'
              }}
              title="View Active Environmental Alerts tab"
            >
              <AlertTriangle size={14} color="#b91c1c" />
              <span>{activeAlertsCount} Active {activeAlertsCount === 1 ? 'Alert' : 'Alerts'}</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── Live Sensor Telemetry Channels Grid ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-heading)' }}>
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
          gap: '16px',
          marginBottom: '24px',
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

      {/* ── Mid Section: Large Full-Width Analytics Chart Card ── */}
      <div className="chart-container mb-6" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="chart-header">
          <div>
            <span className="chart-title">Real-Time Environmental Trend</span>
            <p className="text-xs text-muted" style={{ marginTop: 2 }}>
              Live trajectory of CO₂ (ppm), PM2.5 (µg/m³), and Temperature (°C)
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <Clock size={12} color="var(--color-text-label)" />
            {lastRefresh ? `Updated ${timeAgo(lastRefresh)}` : 'Live'}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 260 }}>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="co2Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8586D9" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8586D9" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="pm25Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#65C99B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#65C99B" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F5B84B" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#F5B84B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#F1E9C8" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#8A8A8A', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#F1E9C8' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#8A8A8A', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#FFFFFF',
                    border: '1px solid #F1E9C8',
                    borderRadius: 12,
                    boxShadow: '0 4px 16px rgba(210, 190, 100, 0.12)',
                    fontSize: 12,
                    color: '#343434',
                  }}
                  cursor={{ stroke: '#F4D35E', strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="pm25"
                  stroke="#65C99B"
                  fill="url(#pm25Grad)"
                  name="PM2.5 (µg/m³)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#65C99B', strokeWidth: 1 }}
                  activeDot={{ r: 6 }}
                />
                <Area
                  type="monotone"
                  dataKey="co2"
                  stroke="#8586D9"
                  fill="url(#co2Grad)"
                  name="CO₂ (ppm)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#8586D9', strokeWidth: 1 }}
                  activeDot={{ r: 6 }}
                />
                <Area
                  type="monotone"
                  dataKey="temperature"
                  stroke="#F5B84B"
                  fill="url(#tempGrad)"
                  name="Temperature (°C)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#F5B84B', strokeWidth: 1 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: 200,
                color: 'var(--color-text-muted)',
                fontSize: 13,
              }}
            >
              Awaiting telemetry points to render trend graph...
            </div>
          )}
        </div>
      </div>

      {/* ── Real-Time Sensor Details Table ──────────────────────────── */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-heading)' }}>
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
                <th style={{ color: '#1e7e53' }}>Safe / Good</th>
                <th style={{ color: '#9a6700' }}>Moderate / Average</th>
                <th style={{ color: '#b91c1c' }}>Dangerous / Unhealthy</th>
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
                      <span className="font-mono text-sm" style={{ color: '#9a6700', fontWeight: 600 }}>
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
                    <td style={{ color: '#1e7e53', fontSize: 12, fontWeight: 600 }}>
                      {ref.safeText}
                    </td>
                    <td style={{ color: '#9a6700', fontSize: 12, fontWeight: 600 }}>
                      {ref.moderateText}
                    </td>
                    <td style={{ color: '#b91c1c', fontSize: 12, fontWeight: 600 }}>
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
