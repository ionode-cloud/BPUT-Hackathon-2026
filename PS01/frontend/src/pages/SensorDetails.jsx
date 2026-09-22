import { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine
} from 'recharts';
import { Trash2, RefreshCw, Radio } from 'lucide-react';
import { nodesAPI, readingsAPI } from '../services/api';
import socket from '../services/socket';
import { LoadingState, ErrorState } from '../components/UI';
import { useNodes } from '../context/NodeContext';
import {
  SENSOR_SPEC_TABLE, getStatus, STATUS_COLORS, STATUS_LABELS, formatValue, timeAgo, TIME_RANGES
} from '../utils/thresholds';

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#FFFFFF',
    border: '1px solid #F1E9C8',
    borderRadius: 12,
    boxShadow: '0 4px 16px rgba(210, 190, 100, 0.12)',
    fontSize: 12,
    color: '#343434',
  },
  cursor: { stroke: '#F4D35E' },
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
      {/* ── Top Node Selector Dropdown Bar ──────────────────────────── */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #F1E9C8',
          borderRadius: 16,
          padding: '14px 20px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
              flexShrink: 0,
            }}
          >
            <Radio size={19} />
          </div>
          <div>
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#8A8A8A' }}>
              Telemetry Node
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#343434' }}>
                {selectedNode ? `${selectedNode.name} (${selectedNode.nodeId})` : 'Select a Node to View Sensors'}
              </span>
              {selectedNode?.isMaster && (
                <span
                  style={{
                    background: '#FFF4C2',
                    color: '#6B4E00',
                    border: '1px solid #F4D35E',
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 999,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  ★ Master Node
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label htmlFor="node-select-sensors" style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-heading)' }}>
            Node:
          </label>
          <select
            id="node-select-sensors"
            value={selectedNodeId}
            onChange={(e) => setSelectedNodeId(e.target.value)}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: '1px solid #F1E9C8',
              background: '#FFFDF3',
              fontSize: 13,
              fontWeight: 700,
              color: '#343434',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              outline: 'none',
              minWidth: 200,
            }}
          >
            <option value="">-- Choose a Node --</option>
            {nodes.map((n) => (
              <option key={n.nodeId} value={n.nodeId}>
                {n.name} ({n.nodeId}){n.isMaster ? ' — ★ Master' : ''}
              </option>
            ))}
          </select>
          {selectedNodeId && (
            <button
              onClick={refreshAll}
              className="btn btn-secondary btn-sm"
              title="Refresh telemetry"
              style={{ padding: '8px 12px' }}
            >
              <RefreshCw size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Conditional Render: Prompt if no node selected ──────────── */}
      {loadingNodes ? (
        <LoadingState text="Loading node sensor details..." />
      ) : !selectedNodeId ? (
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #F1E9C8',
            borderRadius: 16,
            padding: '50px 24px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(210, 190, 100, 0.08)',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              background: '#FFFBEA',
              border: '1px solid #F4D35E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#8A6D00',
            }}
          >
            <Radio size={26} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-heading)' }}>
            Select a Node to View Sensor Details
          </h3>
          <p style={{ fontSize: 13.5, color: 'var(--color-text-secondary)', maxWidth: 480, margin: '8px auto 22px', lineHeight: 1.5 }}>
            Please select a telemetry node from the dropdown above to inspect its live sensor parameters, calibration ranges, and raw readings log.
          </p>

          {nodes.length > 0 && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {nodes.map((n) => (
                <button
                  key={n.nodeId}
                  onClick={() => setSelectedNodeId(n.nodeId)}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: 6, fontWeight: 700 }}
                >
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

      {/* ── Sensor Selector Pills ─────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-label)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
          Select Sensor Parameter
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SENSOR_SPEC_TABLE.map((s) => (
            <button
              key={s.key}
              onClick={() => setSelectedSensor(s)}
              style={{
                padding: '7px 14px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: selectedSensor.key === s.key ? 700 : 500,
                border: `1px solid ${selectedSensor.key === s.key ? '#F4D35E' : '#F1E9C8'}`,
                background: selectedSensor.key === s.key ? '#F4D35E' : '#FFFFFF',
                color: selectedSensor.key === s.key ? '#4A4200' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Detail Card + Overview Row ──────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Left: Sensor Information Card */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #F1E9C8',
            borderRadius: 16,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 20px rgba(210, 190, 100, 0.08)',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-heading)' }}>
                  {selectedSensor.name}
                </h2>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-label)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  Sensor Model: {selectedSensor.sensor}
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

            <div style={{ margin: '24px 0 16px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
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
            <div style={{ background: '#FFFDF3', border: '1px solid #F1E9C8', borderRadius: 12, padding: '14px', fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: 'var(--color-heading)', marginBottom: 8 }}>
                Standard Reference Ranges:
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#1e7e53', fontWeight: 600 }}>● Safe / Good:</span>
                <span style={{ color: 'var(--color-heading)', fontWeight: 600 }}>{selectedSensor.safeText} {selectedSensor.unit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#9a6700', fontWeight: 600 }}>● Moderate / Average:</span>
                <span style={{ color: 'var(--color-heading)', fontWeight: 600 }}>{selectedSensor.moderateText} {selectedSensor.unit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#b91c1c', fontWeight: 600 }}>● Dangerous / Unhealthy:</span>
                <span style={{ color: 'var(--color-heading)', fontWeight: 600 }}>{selectedSensor.dangerousText} {selectedSensor.unit}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, fontSize: 11, color: 'var(--color-text-label)' }}>
            Live status from <code>/api/nodes/{selectedNodeId}</code> · Real-time synchronized
          </div>
        </div>

        {/* Right: Sensor Trend Line Chart */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #F1E9C8',
            borderRadius: 16,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(210, 190, 100, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-heading)' }}>
                {selectedSensor.name} — Historical Trend
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                Telemetry data points ({historyData.length} records)
              </div>
            </div>

            {/* Time range selector */}
            <div style={{ display: 'flex', gap: 6 }}>
              {TIME_RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setTimeRange(r.value)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid #F1E9C8',
                    background: timeRange === r.value ? '#F4D35E' : '#FFFFFF',
                    color: timeRange === r.value ? '#4A4200' : 'var(--color-text-muted)',
                  }}
                >
                  {r.label.replace('Last ', '')}
                </button>
              ))}
            </div>
          </div>

          {historyLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LoadingState text="Loading chart data..." />
            </div>
          ) : historyData.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
              No history readings found for this time window.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={historyData}>
                <CartesianGrid stroke="#F1E9C8" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: '#8A8A8A', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#F1E9C8' }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#8A8A8A', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                {selectedSensor.safeMax && (
                  <ReferenceLine y={selectedSensor.safeMax} stroke="#62C89B" strokeDasharray="4 4" label={{ value: 'Safe Limit', fill: '#1e7e53', fontSize: 10 }} />
                )}
                {selectedSensor.moderateMax && (
                  <ReferenceLine y={selectedSensor.moderateMax} stroke="#F5B84B" strokeDasharray="4 4" label={{ value: 'Moderate Limit', fill: '#9a6700', fontSize: 10 }} />
                )}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#65C99B"
                  strokeWidth={2.5}
                  dot={{ r: 2, fill: '#65C99B' }}
                  activeDot={{ r: 5, fill: '#F4D35E' }}
                  name={`${selectedSensor.name.split(' (')[0]} (${selectedSensor.unit})`}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
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
                        <span
                          style={{
                            fontSize: 10,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: '#FFF8D9',
                            border: '1px solid #F1E9C8',
                            color: '#4A4200',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                          }}
                        >
                          {row.dataSource || 'iot'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(row._id)}
                          disabled={deletingId === row._id}
                          title="Delete record via DELETE /api/sensor/:id"
                          style={{
                            background: 'rgba(232, 120, 120, 0.12)',
                            border: '1px solid #E87878',
                            color: '#b91c1c',
                            borderRadius: 6,
                            padding: '4px 8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          <Trash2 size={12} />
                          {deletingId === row._id ? 'Deleting...' : 'Delete'}
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
