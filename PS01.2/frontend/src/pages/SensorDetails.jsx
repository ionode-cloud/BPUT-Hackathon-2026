import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine
} from 'recharts';
import { Trash2, RefreshCw, Radio, Activity, AlertTriangle, Gauge, TrendingUp, TrendingDown, Wind, Thermometer, Droplets, Zap, Sliders, BarChart2 } from 'lucide-react';
import { nodesAPI, readingsAPI } from '../services/api';
import socket from '../services/socket';
import { LoadingState, ErrorState, ProtrudingStatCard } from '../components/UI';
import { useNodes } from '../context/NodeContext';
import {
  SENSOR_SPEC_TABLE, getStatus, STATUS_COLORS, STATUS_LABELS, formatValue, timeAgo, TIME_RANGES
} from '../utils/thresholds';

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#FFFFFF',
    border: '1px solid var(--color-border)',
    borderRadius: 12,
    boxShadow: '0 8px 24px rgba(35, 45, 80, 0.12)',
    fontSize: 12,
    color: '#1E2337',
  },
  cursor: { stroke: 'var(--color-primary)' },
};

export default function SensorDetails() {
  const { nodes, selectedNodeId, selectedNode, setSelectedNodeId, loadingNodes } = useNodes();
  const [selectedSensor, setSelectedSensor] = useState(SENSOR_SPEC_TABLE[0]);
  const [timeRange, setTimeRange]           = useState('24h');
  const [latestData, setLatestData]         = useState(null);
  const [historyData, setHistoryData]       = useState([]);
  const [tableData, setTableData]           = useState([]);
  const [loading, setLoading]               = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError]                   = useState(null);
  const [deletingId, setDeletingId]         = useState(null);
  const [chartMode, setChartMode]           = useState('wave');

  // Compute live statistics for the active history dataset
  const historyStats = useMemo(() => {
    if (!historyData || historyData.length === 0) return { max: '—', min: '—', avg: '—', count: 0 };
    const validVals = historyData.map((d) => d.value).filter((v) => typeof v === 'number' && !isNaN(v));
    if (validVals.length === 0) return { max: '—', min: '—', avg: '—', count: 0 };
    const max = Math.max(...validVals);
    const min = Math.min(...validVals);
    const avg = validVals.reduce((a, b) => a + b, 0) / validVals.length;
    return {
      max: max.toFixed(1),
      min: min.toFixed(1),
      avg: avg.toFixed(1),
      count: historyData.length,
    };
  }, [historyData]);

  // 1. Fetch latest reading for chosen node
  const fetchLatest = useCallback(async () => {
    if (!selectedNodeId) return;
    try {
      const res = await nodesAPI.getLatest({ nodeId: selectedNodeId });
      setLatestData(res.data.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [selectedNodeId]);

  // 2. Fetch history for chart scoped to chosen node
  const fetchHistory = useCallback(async () => {
    if (!selectedNodeId) return;
    setHistoryLoading(true);
    try {
      const range = TIME_RANGES.find((r) => r.value === timeRange);
      const from = new Date(Date.now() - (range?.hours || 24) * 3600000).toISOString();
      let res = await readingsAPI.getHistory({
        sensorType: selectedSensor.key,
        from,
        limit: 200,
        nodeId: selectedNodeId,
      });

      // If no data in strict time window, fallback to latest readings for this node
      if (!res.data?.data || res.data.data.length === 0) {
        res = await readingsAPI.getHistory({
          sensorType: selectedSensor.key,
          limit: 50,
          nodeId: selectedNodeId,
        });
      }

      const list = (res.data.data || []).map((r) => ({
        time: new Date(r.timestamp).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        value: r[selectedSensor.key] !== null ? Number(r[selectedSensor.key]) : null,
        timestamp: r.timestamp,
      }));
      setHistoryData(list);
    } catch {
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedNodeId, selectedSensor.key, timeRange]);

  // 3. Fetch all readings for table scoped to chosen node
  const fetchTableData = useCallback(async () => {
    if (!selectedNodeId) return;
    try {
      const res = await readingsAPI.getAll({ limit: 50, nodeId: selectedNodeId });
      setTableData(res.data.data || []);
    } catch {
      setTableData([]);
    }
  }, [selectedNodeId]);

  const refreshAll = useCallback(async () => {
    if (!selectedNodeId) return;
    setLoading(true);
    await Promise.all([fetchLatest(), fetchHistory(), fetchTableData()]);
    setLoading(false);
  }, [selectedNodeId, fetchLatest, fetchHistory, fetchTableData]);

  useEffect(() => {
    if (selectedNodeId) {
      refreshAll();
    } else {
      setLatestData(null);
      setHistoryData([]);
      setTableData([]);
      setLoading(false);
    }
  }, [selectedNodeId, refreshAll]);

  useEffect(() => {
    if (selectedNodeId) {
      fetchHistory();
    }
  }, [selectedNodeId, fetchHistory]);

  // Socket.IO real-time data sync for selected node
  useEffect(() => {
    if (!selectedNodeId) return;

    const handleNew = (reading) => {
      if (reading.nodeId && reading.nodeId !== selectedNodeId) return;
      setLatestData(reading);
      setTableData((prev) => [reading, ...prev.slice(0, 49)]);

      const val = reading[selectedSensor.key];
      if (val !== null && val !== undefined) {
        const point = {
          time: new Date(reading.timestamp || Date.now()).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          value: Number(val),
          timestamp: reading.timestamp,
        };
        setHistoryData((prev) => [...prev, point].slice(-200));
      }
    };

    const handleUpdate = (reading) => {
      if (reading.nodeId && reading.nodeId !== selectedNodeId) return;
      setLatestData(reading);
      setTableData((prev) => prev.map((item) => (item._id === reading._id ? reading : item)));
      fetchHistory();
    };

    const handleDelete = (payload) => {
      const deletedId = payload?.id || payload;
      setTableData((prev) => prev.filter((item) => item._id !== deletedId));
      fetchLatest();
      fetchHistory();
    };

    socket.on('new_reading', handleNew);
    socket.on('update_reading', handleUpdate);
    socket.on('delete_reading', handleDelete);

    return () => {
      socket.off('new_reading', handleNew);
      socket.off('update_reading', handleUpdate);
      socket.off('delete_reading', handleDelete);
    };
  }, [selectedNodeId, selectedSensor.key, fetchLatest, fetchHistory]);

  // Handle single record deletion
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sensor reading record from MongoDB?')) return;
    setDeletingId(id);
    try {
      await readingsAPI.delete(id);
      setTableData((prev) => prev.filter((r) => r._id !== id));
      fetchLatest();
      fetchHistory();
    } catch (err) {
      alert(`Failed to delete record: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const curVal = latestData ? latestData[selectedSensor.key] : null;
  const status = getStatus(selectedSensor.key, curVal);
  const sc = STATUS_COLORS[status] || STATUS_COLORS.unknown;
  const label = STATUS_LABELS[status] || 'No Data';

  return (
    <div>
      {/* ── Node Selector Banner ─────────────────────────────────────── */}
      <div className="node-selector-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingLeft: 8 }}>
          <div className="node-selector-icon"><Radio size={19} /></div>
          <div>
            <div className="node-selector-label">Telemetry Node</div>
            <div className="node-selector-title">
              {selectedNode ? `${selectedNode.name} (${selectedNode.nodeId})` : 'Select a Node to View Sensors'}
              {selectedNode?.isMaster && <span className="node-master-badge">★ Master</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label htmlFor="node-select-sensors" style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-heading)' }}>Node:</label>
          <select
            id="node-select-sensors"
            value={selectedNodeId}
            onChange={(e) => setSelectedNodeId(e.target.value)}
            className="node-select-control"
          >
            <option value="">-- Choose a Node --</option>
            {nodes.map((n) => (
              <option key={n.nodeId} value={n.nodeId}>
                {n.name} ({n.nodeId}){n.isMaster ? ' — ★ Master' : ''}
              </option>
            ))}
          </select>
          {selectedNodeId && (
            <button onClick={refreshAll} className="btn btn-secondary btn-sm" title="Refresh telemetry">
              <RefreshCw size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Conditional: No node / loading / error ───────────────────── */}
      {loadingNodes ? (
        <LoadingState text="Loading node sensor details..." />
      ) : !selectedNodeId ? (
        <div className="empty-prompt-card">
          <div className="empty-prompt-icon"><Radio size={28} /></div>
          <h3 className="empty-prompt-title">Select a Node to View Sensor Details</h3>
          <p className="empty-prompt-desc">
            Please select a telemetry node from the dropdown above to inspect its live sensor parameters, calibration ranges, and raw readings log.
          </p>
          {nodes.length > 0 && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {nodes.map((n) => (
                <button key={n.nodeId} onClick={() => setSelectedNodeId(n.nodeId)} className="btn btn-secondary btn-sm">
                  <Radio size={13} /> {n.name} ({n.nodeId}) {n.isMaster ? '★' : ''}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : loading && !latestData ? (
        <LoadingState text="Loading node sensor details..." />
      ) : error && !latestData ? (
        <ErrorState message={error} onRetry={refreshAll} />
      ) : (
        <>

      {/* ── Sensor Parameter Pill Tabs ─────────────────────────────── */}
      <div className="sensor-pills-bar">
        <div className="sensor-pills-label">Select Sensor Parameter</div>
        <div className="sensor-pills-row">
          {SENSOR_SPEC_TABLE.map((s) => (
            <button
              key={s.key}
              onClick={() => setSelectedSensor(s)}
              className={`sensor-pill ${selectedSensor.key === s.key ? 'active' : ''}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Top Sensor Protruding Cards (Mockup Design) ────────────── */}
      <div className="protruding-cards-grid">
        <ProtrudingStatCard
          icon={Activity}
          label="CURRENT TELEMETRY"
          value={curVal != null ? `${formatValue(curVal, selectedSensor.unit)} ${selectedSensor.unit}` : '—'}
          color="blue"
          sub={`Sensor Module: ${selectedSensor.sensor}`}
        />
        <ProtrudingStatCard
          icon={AlertTriangle}
          label="STATUS EVALUATION"
          value={label}
          color={status === 'dangerous' ? 'pink' : status === 'moderate' ? 'amber' : 'green'}
          sub="Real-time multi-threshold calibrated"
        />
        <ProtrudingStatCard
          icon={Gauge}
          label="OPTIMAL RANGE"
          value={`${selectedSensor.safeText} ${selectedSensor.unit}`}
          color="amber"
          sub={`Moderate: ${selectedSensor.moderateText} ${selectedSensor.unit}`}
        />
      </div>

      {/* ── Main Detail Card + Overview Row (Panoramic Telemetry Deck) ── */}
      <div className="sensor-telemetry-deck-grid">
        {/* Left: Sensor Specification & Calibration Sidebar */}
        <div className="sensor-spec-sidebar-card">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--color-primary)', marginBottom: 3 }}>
                  HARDWARE PROFILE
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-heading)' }}>
                  {selectedSensor.name}
                </h2>
                <div style={{ fontSize: 11, color: 'var(--color-text-label)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  Chip: {selectedSensor.sensor}
                </div>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: sc.bg,
                  border: `1px solid ${sc.border}`,
                  borderRadius: 999,
                  padding: '4px 12px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: sc.text,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot }} />
                {label}
              </span>
            </div>

            <div style={{ margin: '22px 0 16px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span
                style={{
                  fontSize: 42,
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: curVal !== null && curVal !== undefined ? 'var(--color-heading)' : 'var(--color-text-label)',
                  letterSpacing: '-1px',
                }}
              >
                {formatValue(curVal, selectedSensor.unit)}
              </span>
              <span style={{ fontSize: 16, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                {selectedSensor.unit}
              </span>
            </div>

            {/* Threshold Reference Breakdown */}
            <div style={{ background: '#F8FAFD', border: '1px solid var(--color-border)', borderRadius: 14, padding: '14px', fontSize: 12 }}>
              <div style={{ fontWeight: 800, color: 'var(--color-heading)', marginBottom: 10, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Calibration Threshold Bounds:
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                <span style={{ color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669' }} /> Safe Range
                </span>
                <span style={{ color: 'var(--color-heading)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{selectedSensor.safeText} {selectedSensor.unit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                <span style={{ color: '#D97706', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D97706' }} /> Moderate Range
                </span>
                <span style={{ color: 'var(--color-heading)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{selectedSensor.moderateText} {selectedSensor.unit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#E11D48', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E11D48' }} /> Hazardous Limit
                </span>
                <span style={{ color: 'var(--color-heading)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{selectedSensor.dangerousText} {selectedSensor.unit}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18, fontSize: 11, color: 'var(--color-text-label)', borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
            Live status from <code>/api/nodes/{selectedNodeId}</code> · Real-time synchronized
          </div>
        </div>

        {/* Right: Sensor Trend Chart Observatory */}
        <div className="sensor-chart-panoramic-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="chart-label chart-label-mint" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Activity size={11} /> HISTORICAL TELEMETRY OBSERVATORY
              </div>
              <div className="chart-card-title">{selectedSensor.name} — Trajectory Wave</div>
              <div className="chart-card-sub">Real-time synchronized data points ({historyData.length} records logged)</div>
            </div>

            {/* Quick KPI stats row */}
            <div className="graph-stats-row">
              <div className="graph-stat-badge">
                <span className="key">MAX</span>
                <span className="val" style={{ color: '#E11D48' }}>{historyStats.max}</span>
              </div>
              <div className="graph-stat-badge">
                <span className="key">AVG</span>
                <span className="val" style={{ color: '#059669' }}>{historyStats.avg}</span>
              </div>
              <div className="graph-stat-badge">
                <span className="key">MIN</span>
                <span className="val" style={{ color: '#0EA5E9' }}>{historyStats.min}</span>
              </div>
              <div className="graph-stat-badge">
                <span className="key">SAMPLES</span>
                <span className="val">{historyStats.count}</span>
              </div>
            </div>

            {/* Controls: Chart Mode + Time Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div className="hero-param-selector">
                <button
                  type="button"
                  onClick={() => setChartMode('wave')}
                  className={`hero-param-chip ${chartMode === 'wave' ? 'active' : ''}`}
                  title="Filled Area Waveform"
                >
                  Wave
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('line')}
                  className={`hero-param-chip ${chartMode === 'line' ? 'active' : ''}`}
                  title="Crisp Spline Line"
                >
                  Line
                </button>
              </div>

              <div className="time-range-tabs">
                {TIME_RANGES.map((r) => (
                  <button key={r.value} onClick={() => setTimeRange(r.value)} className={`time-tab ${timeRange === r.value ? 'active' : ''}`}>
                    {r.label.replace('Last ', '')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {historyLoading ? (
            <div style={{ height: 290, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LoadingState text="Loading chart data..." />
            </div>
          ) : historyData.length === 0 ? (
            <div style={{ height: 290, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
              No history readings found for this time window.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={290}>
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="sensorWaveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={status === 'dangerous' ? '#F43F5E' : '#059669'} stopOpacity={0.40} />
                    <stop offset="95%" stopColor={status === 'dangerous' ? '#F43F5E' : '#059669'} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#D1FAE5" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#D1FAE5' }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                {selectedSensor.safeMax && (
                  <ReferenceLine y={selectedSensor.safeMax} stroke="#10B981" strokeDasharray="4 4" label={{ value: 'Safe Limit', fill: '#047857', fontSize: 10 }} />
                )}
                {selectedSensor.moderateMax && (
                  <ReferenceLine y={selectedSensor.moderateMax} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: 'Moderate Limit', fill: '#B45309', fontSize: 10 }} />
                )}
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={status === 'dangerous' ? '#F43F5E' : '#059669'}
                  strokeWidth={3}
                  fill={chartMode === 'wave' ? 'url(#sensorWaveGrad)' : 'transparent'}
                  dot={{ r: 2, fill: status === 'dangerous' ? '#F43F5E' : '#059669' }}
                  activeDot={{ r: 5, fill: status === 'dangerous' ? '#F43F5E' : '#059669', stroke: '#ECFDF5', strokeWidth: 2 }}
                  name={`${selectedSensor.name.split(' (')[0]} (${selectedSensor.unit})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {/* ── Ambient Multi-Stream Correlation Deck ────────────────── */}
          <div className="sensor-correlation-deck">
            <div className="sensor-correlation-chip">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-text-label)', textTransform: 'uppercase' }}>
                  CO₂ Concentration
                </span>
                <span className="badge badge-success" style={{ fontSize: 9.5, padding: '2px 6px' }}>Nominal</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ fontSize: 19, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#064E3B' }}>
                  {latestData?.co2 != null ? latestData.co2 : '—'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>ppm</span>
              </div>
            </div>

            <div className="sensor-correlation-chip">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-text-label)', textTransform: 'uppercase' }}>
                  PM2.5 Particulate
                </span>
                <span className="badge badge-success" style={{ fontSize: 9.5, padding: '2px 6px' }}>Safe</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ fontSize: 19, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#064E3B' }}>
                  {latestData?.pm25 != null ? latestData.pm25 : '—'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>µg/m³</span>
              </div>
            </div>

            <div className="sensor-correlation-chip">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-text-label)', textTransform: 'uppercase' }}>
                  Ambient Climate
                </span>
                <span className="badge badge-secondary" style={{ fontSize: 9.5, padding: '2px 6px' }}>Optimal</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ fontSize: 19, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#064E3B' }}>
                  {latestData?.temperature != null ? `${latestData.temperature}°C` : '—'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  / {latestData?.humidity != null ? `${latestData.humidity}%` : '—'}
                </span>
              </div>
            </div>

            <div className="sensor-correlation-chip">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-text-label)', textTransform: 'uppercase' }}>
                  Smoke / MQ-135
                </span>
                <span className="badge badge-success" style={{ fontSize: 9.5, padding: '2px 6px' }}>Normal</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ fontSize: 19, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#064E3B' }}>
                  {latestData?.smoke != null ? latestData.smoke : (latestData?.mq135 != null ? latestData.mq135 : '—')}
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>ppm</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sensor Readings History Table (GET /api/sensor + DELETE /api/sensor/:id) ── */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-heading)' }}>
            Recent Data Log (<code>GET /api/sensor</code>)
          </h2>
          <p className="text-xs text-muted" style={{ marginTop: 2 }}>
            Browse and manage sensor readings stored in MongoDB. Click delete to remove a record via <code>DELETE /api/sensor/:id</code>.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={refreshAll}>
          <RefreshCw size={13} /> Refresh Log
        </button>
      </div>

      <div className="table-container mb-6">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Selected ({selectedSensor.name.split(' (')[0]})</th>
                <th>CO₂</th>
                <th>PM2.5</th>
                <th>Temp</th>
                <th>Humidity</th>
                <th>Source</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>
                    No readings found in database.
                  </td>
                </tr>
              ) : (
                tableData.map((row) => {
                  const val = row[selectedSensor.key];
                  const st = getStatus(selectedSensor.key, val);
                  const clr = STATUS_COLORS[st] || STATUS_COLORS.unknown;

                  return (
                    <tr key={row._id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {new Date(row.timestamp).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <span
                          className="font-mono"
                          style={{
                            fontWeight: 700,
                            color: val != null ? clr.text : 'var(--color-text-label)',
                          }}
                        >
                          {formatValue(val, selectedSensor.unit)} {selectedSensor.unit}
                        </span>
                      </td>
                      <td className="font-mono text-sm">{row.co2 != null ? `${row.co2} ppm` : '—'}</td>
                      <td className="font-mono text-sm">{row.pm25 != null ? `${row.pm25} µg/m³` : '—'}</td>
                      <td className="font-mono text-sm">{row.temperature != null ? `${row.temperature}°C` : '—'}</td>
                      <td className="font-mono text-sm">{row.humidity != null ? `${row.humidity}%` : '—'}</td>
                      <td>
                        <span style={{
                          fontSize: 10, padding: '3px 9px', borderRadius: 6,
                          background: 'var(--color-primary-dim)',
                          border: '1px solid rgba(5,150,105,0.2)',
                          color: 'var(--color-primary)',
                          fontWeight: 700, textTransform: 'uppercase',
                          fontFamily: 'var(--font-mono)',
                        }}>
                          {row.dataSource || 'iot'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(row._id)}
                          disabled={deletingId === row._id}
                          title="Delete record"
                          className="action-btn action-btn-danger"
                        >
                          <Trash2 size={12} />
                          {deletingId === row._id ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
