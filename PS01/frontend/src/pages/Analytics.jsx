import { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine
} from 'recharts';
import { Radio, RefreshCw } from 'lucide-react';
import { readingsAPI } from '../services/api';
import socket from '../services/socket';
import { LoadingState, ErrorState } from '../components/UI';
import { useNodes } from '../context/NodeContext';
import { TIME_RANGES } from '../utils/thresholds';

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

export default function Analytics() {
  const { nodes, selectedNodeId, selectedNode, setSelectedNodeId, loadingNodes } = useNodes();
  const [timeRange, setTimeRange]           = useState('24h');
  const [history, setHistory]               = useState([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState(null);

  const fetchData = useCallback(async () => {
    if (!selectedNodeId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const range = TIME_RANGES.find((r) => r.value === timeRange);
      const from = new Date(Date.now() - (range?.hours || 24) * 3600000).toISOString();

      let res = await readingsAPI.getHistory({ from, limit: 300, nodeId: selectedNodeId });
      // Fallback if strict time window has no readings
      if (!res.data?.data || res.data.data.length === 0) {
        res = await readingsAPI.getHistory({ limit: 100, nodeId: selectedNodeId });
      }
      const rawData = res.data?.data || [];

      const formatted = rawData.map((r) => ({
        time: new Date(r.timestamp).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        timestamp: r.timestamp,
        co2: r.co2 != null ? Number(r.co2) : null,
        co:  r.co  != null ? Number(r.co)  : null,
        pm25: r.pm25 != null ? Number(r.pm25) : null,
        pm10: r.pm10 != null ? Number(r.pm10) : null,
        no2: r.no2 != null ? Number(r.no2) : null,
        so2: r.so2 != null ? Number(r.so2) : null,
        o3:  r.o3  != null ? Number(r.o3)  : null,
        temperature: r.temperature != null ? Number(r.temperature) : null,
        humidity: r.humidity != null ? Number(r.humidity) : null,
        voc: r.voc != null ? Number(r.voc) : null,
        nh3: r.nh3 != null ? Number(r.nh3) : null,
      }));

      setHistory(formatted);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedNodeId, timeRange]);

  useEffect(() => {
    if (selectedNodeId) {
      fetchData();
    } else {
      setHistory([]);
    }
  }, [selectedNodeId, fetchData]);

  // Real-time Socket.IO sync scoped to selected node
  useEffect(() => {
    if (!selectedNodeId) return;

    const handleNewReading = (r) => {
      if (r.nodeId && r.nodeId !== selectedNodeId) return;
      const point = {
        time: new Date(r.timestamp || Date.now()).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        timestamp: r.timestamp,
        co2: r.co2 != null ? Number(r.co2) : null,
        co:  r.co  != null ? Number(r.co)  : null,
        pm25: r.pm25 != null ? Number(r.pm25) : null,
        pm10: r.pm10 != null ? Number(r.pm10) : null,
        no2: r.no2 != null ? Number(r.no2) : null,
        so2: r.so2 != null ? Number(r.so2) : null,
        o3:  r.o3  != null ? Number(r.o3)  : null,
        temperature: r.temperature != null ? Number(r.temperature) : null,
        humidity: r.humidity != null ? Number(r.humidity) : null,
        voc: r.voc != null ? Number(r.voc) : null,
        nh3: r.nh3 != null ? Number(r.nh3) : null,
      };
      setHistory((prev) => [...prev, point].slice(-300));
    };

    const handleDelete = () => fetchData();

    socket.on('new_reading', handleNewReading);
    socket.on('delete_reading', handleDelete);

    return () => {
      socket.off('new_reading', handleNewReading);
      socket.off('delete_reading', handleDelete);
    };
  }, [selectedNodeId, fetchData]);

  // Compute summary stats
  const calcStats = (key) => {
    const vals = history.map((r) => r[key]).filter((v) => v !== null && !isNaN(v));
    if (vals.length === 0) return { min: '—', max: '—', avg: '—' };
    const min = Math.min(...vals).toFixed(1);
    const max = Math.max(...vals).toFixed(1);
    const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
    return { min, max, avg };
  };

  const co2Stats  = calcStats('co2');
  const pm25Stats = calcStats('pm25');
  const tempStats = calcStats('temperature');
  const humStats  = calcStats('humidity');

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
                {selectedNode ? `${selectedNode.name} (${selectedNode.nodeId})` : 'Select a Node to View Analytics'}
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
          <label htmlFor="node-select-analytics" style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-heading)' }}>
            Node:
          </label>
          <select
            id="node-select-analytics"
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
              onClick={fetchData}
              className="btn btn-secondary btn-sm"
              title="Refresh analytics data"
              style={{ padding: '8px 12px' }}
            >
              <RefreshCw size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Conditional Render: Prompt if no node selected ──────────── */}
      {loadingNodes ? (
        <LoadingState text="Loading node analytics..." />
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
            Select a Node to View Analytics
          </h3>
          <p style={{ fontSize: 13.5, color: 'var(--color-text-secondary)', maxWidth: 480, margin: '8px auto 22px', lineHeight: 1.5 }}>
            Please select a telemetry node from the dropdown above to inspect historical trends, statistical averages, and multi-channel charts.
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
      ) : loading && history.length === 0 ? (
        <LoadingState text="Loading environmental analytics..." />
      ) : error && history.length === 0 ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : (
        <>
          {/* Top Controls */}
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
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-heading)' }}>
                {selectedNode ? `${selectedNode.name} (${selectedNode.nodeId})` : 'Node'} — Environmental Analytics
              </h2>
              <p className="text-xs text-muted" style={{ marginTop: 2 }}>
                Visual trajectory of gas concentrations, particulates, and climate conditions for this node
              </p>
            </div>

        {/* Time range selector */}
        <div style={{ display: 'flex', gap: 6 }}>
          {TIME_RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setTimeRange(r.value)}
              style={{
                padding: '6px 14px',
                borderRadius: 9,
                fontSize: 12,
                fontWeight: timeRange === r.value ? 700 : 500,
                cursor: 'pointer',
                border: '1px solid #F1E9C8',
                background: timeRange === r.value ? '#F4D35E' : '#FFFFFF',
                color: timeRange === r.value ? '#4A4200' : 'var(--color-text-secondary)',
                boxShadow: timeRange === r.value ? '0 2px 8px rgba(244, 211, 94, 0.25)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ background: '#FFFFFF', border: '1px solid #F1E9C8', borderRadius: 16, padding: '18px 20px', boxShadow: '0 4px 20px rgba(210, 190, 100, 0.08)' }}>
          <div style={{ fontSize: 11.5, color: 'var(--color-text-label)', fontWeight: 600 }}>CO₂ (ppm)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#7D70D8', margin: '4px 0' }}>Avg: {co2Stats.avg}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Min: {co2Stats.min} · Max: {co2Stats.max}</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #F1E9C8', borderRadius: 16, padding: '18px 20px', boxShadow: '0 4px 20px rgba(210, 190, 100, 0.08)' }}>
          <div style={{ fontSize: 11.5, color: 'var(--color-text-label)', fontWeight: 600 }}>PM2.5 (µg/m³)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#62C89B', margin: '4px 0' }}>Avg: {pm25Stats.avg}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Min: {pm25Stats.min} · Max: {pm25Stats.max}</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #F1E9C8', borderRadius: 16, padding: '18px 20px', boxShadow: '0 4px 20px rgba(210, 190, 100, 0.08)' }}>
          <div style={{ fontSize: 11.5, color: 'var(--color-text-label)', fontWeight: 600 }}>Temperature (°C)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#F5B84B', margin: '4px 0' }}>Avg: {tempStats.avg}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Min: {tempStats.min} · Max: {tempStats.max}</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #F1E9C8', borderRadius: 16, padding: '18px 20px', boxShadow: '0 4px 20px rgba(210, 190, 100, 0.08)' }}>
          <div style={{ fontSize: 11.5, color: 'var(--color-text-label)', fontWeight: 600 }}>Humidity (% RH)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#5b9fa3', margin: '4px 0' }}>Avg: {humStats.avg}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Min: {humStats.min} · Max: {humStats.max}</div>
        </div>
      </div>

      {/* 2x2 Analytics Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: 20 }}>
        {/* Chart 1: Carbon Dioxide (CO2) */}
        <div className="chart-container">
          <div className="chart-header">
            <div>
              <span className="chart-title">CO₂ (Carbon Dioxide) Trajectory</span>
              <p className="text-xs text-muted" style={{ marginTop: 2 }}>Infrared gas sensor readings (ppm)</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="anCo2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7D70D8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7D70D8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F1E9C8" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: '#8A8A8A', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#F1E9C8' }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#8A8A8A', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <ReferenceLine y={1000} stroke="#62C89B" strokeDasharray="3 3" label={{ value: 'Safe (1000)', fill: '#1e7e53', fontSize: 10 }} />
              <ReferenceLine y={2000} stroke="#F5B84B" strokeDasharray="3 3" label={{ value: 'Moderate (2000)', fill: '#9a6700', fontSize: 10 }} />
              <Area type="monotone" dataKey="co2" stroke="#7D70D8" fill="url(#anCo2)" name="CO₂ (ppm)" strokeWidth={2.5} dot={{ r: 2.5, fill: '#7D70D8' }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Particulate Matter (PM2.5 & PM10) */}
        <div className="chart-container">
          <div className="chart-header">
            <div>
              <span className="chart-title">Particulate Matter (PM2.5 & PM10)</span>
              <p className="text-xs text-muted" style={{ marginTop: 2 }}>Laser optical dust sensor (µg/m³)</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="anPm25" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#65C99B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#65C99B" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="anPm10" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8586D9" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8586D9" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F1E9C8" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: '#8A8A8A', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#F1E9C8' }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#8A8A8A', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              <Area type="monotone" dataKey="pm25" stroke="#65C99B" fill="url(#anPm25)" name="PM2.5 (µg/m³)" strokeWidth={2.5} dot={{ r: 2.5, fill: '#65C99B' }} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="pm10" stroke="#8586D9" fill="url(#anPm10)" name="PM10 (µg/m³)" strokeWidth={2.5} dot={{ r: 2.5, fill: '#8586D9' }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3: Toxic Combustion Gases (NO2, SO2, O3, CO) */}
        <div className="chart-container">
          <div className="chart-header">
            <div>
              <span className="chart-title">Toxic Gases (NO₂, SO₂, O₃, CO)</span>
              <p className="text-xs text-muted" style={{ marginTop: 2 }}>Electrochemical & metal oxide gas sensors</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={history}>
              <CartesianGrid stroke="#F1E9C8" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: '#8A8A8A', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#F1E9C8' }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#8A8A8A', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              <Line type="monotone" dataKey="no2" stroke="#8586D9" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} name="NO₂ (ppb)" />
              <Line type="monotone" dataKey="so2" stroke="#EBC94E" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} name="SO₂ (ppb)" />
              <Line type="monotone" dataKey="o3"  stroke="#5b9fa3" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} name="O₃ (ppb)" />
              <Line type="monotone" dataKey="co"  stroke="#E87878" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} name="CO (ppm)" />
              <Line type="monotone" dataKey="voc" stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} name="VOC (ppb)" />
              <Line type="monotone" dataKey="nh3" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} name="NH₃ (ppm)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 4: Temperature & Humidity */}
        <div className="chart-container">
          <div className="chart-header">
            <div>
              <span className="chart-title">Environmental Climate (Temp & Humidity)</span>
              <p className="text-xs text-muted" style={{ marginTop: 2 }}>Ambient weather parameters (°C and % RH)</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={history}>
              <CartesianGrid stroke="#F1E9C8" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: '#8A8A8A', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#F1E9C8' }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#8A8A8A', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              <Line type="monotone" dataKey="temperature" stroke="#F5B84B" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} name="Temperature (°C)" />
              <Line type="monotone" dataKey="humidity" stroke="#65C99B" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} name="Humidity (%RH)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
