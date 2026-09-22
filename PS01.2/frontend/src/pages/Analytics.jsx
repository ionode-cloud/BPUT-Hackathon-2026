import { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine
} from 'recharts';
import { Radio, RefreshCw, Activity, BarChart2, Thermometer, Droplets } from 'lucide-react';
import { readingsAPI } from '../services/api';
import socket from '../services/socket';
import { LoadingState, ErrorState, ProtrudingStatCard } from '../components/UI';
import { useNodes } from '../context/NodeContext';
import { TIME_RANGES } from '../utils/thresholds';

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
              background: 'var(--color-primary-dim)',
              border: '1px solid var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
              flexShrink: 0,
            }}
          >
            <Radio size={19} />
          </div>
          <div>
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-label)' }}>
              Telemetry Node
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-heading)' }}>
                {selectedNode ? `${selectedNode.name} (${selectedNode.nodeId})` : 'Select a Node to View Analytics'}
              </span>
              {selectedNode?.isMaster && (
                <span
                  style={{
                    background: 'var(--color-primary-dim)',
                    color: 'var(--color-primary)',
                    border: '1px solid var(--color-primary)',
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
              background: 'var(--color-primary-dim)',
              border: '1px solid var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--color-primary)',
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
                border: timeRange === r.value ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                background: timeRange === r.value ? 'var(--color-primary)' : '#FFFFFF',
                color: timeRange === r.value ? '#FFFFFF' : 'var(--color-text-secondary)',
                boxShadow: timeRange === r.value ? '0 2px 8px rgba(79, 117, 254, 0.3)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats Strip — Protruding Cards */}
      <div className="protruding-cards-grid-4">
        <ProtrudingStatCard
          icon={Activity}
          label="CO₂ PPM"
          value={co2Stats.avg ?? '—'}
          color="blue"
          sub={`Min: ${co2Stats.min} · Max: ${co2Stats.max}`}
        />
        <ProtrudingStatCard
          icon={BarChart2}
          label="PM2.5 DENSITY"
          value={pm25Stats.avg ?? '—'}
          color="pink"
          sub={`Min: ${pm25Stats.min} · Max: ${pm25Stats.max}`}
        />
        <ProtrudingStatCard
          icon={Thermometer}
          label="TEMPERATURE"
          value={tempStats.avg ? `${tempStats.avg}°C` : '—'}
          color="amber"
          sub={`Min: ${tempStats.min} · Max: ${tempStats.max}`}
        />
        <ProtrudingStatCard
          icon={Droplets}
          label="HUMIDITY LEVEL"
          value={humStats.avg ? `${humStats.avg}%` : '—'}
          color="green"
          sub={`Min: ${humStats.min} · Max: ${humStats.max}`}
        />
      </div>

      {/* 2x2 Analytics Charts Grid — Mockup Graph Style */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: 22 }}>
        {/* Chart 1: Carbon Dioxide (CO2) */}
        <div className="mockup-main-chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--color-primary)' }}>
                GAS TELEMETRY
              </div>
              <span className="chart-title">CO₂ (Carbon Dioxide) Trajectory</span>
              <p className="text-xs text-muted" style={{ marginTop: 2 }}>Infrared gas sensor continuous readings (ppm)</p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>LOREM IPSUM</span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="anCo2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F75FE" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#4F75FE" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#EDF0F8" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: '#8F97AB', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#E2E6F0' }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#8F97AB', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <ReferenceLine y={1000} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'Safe (1000)', fill: '#059669', fontSize: 10 }} />
              <ReferenceLine y={2000} stroke="#FFAE33" strokeDasharray="3 3" label={{ value: 'Moderate (2000)', fill: '#D97706', fontSize: 10 }} />
              <Area type="natural" dataKey="co2" stroke="#4F75FE" fill="url(#anCo2)" name="CO₂ (ppm)" strokeWidth={2.5} dot={{ r: 2, fill: '#4F75FE' }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Particulate Matter (PM2.5 & PM10) */}
        <div className="mockup-main-chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--color-accent-pink)' }}>
                AIR PARTICULATES
              </div>
              <span className="chart-title">Particulate Matter (PM2.5 & PM10)</span>
              <p className="text-xs text-muted" style={{ marginTop: 2 }}>Laser optical dust sensor (µg/m³)</p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>LOREM IPSUM</span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="anPm25" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF5376" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#FF5376" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="anPm10" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F75FE" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4F75FE" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#EDF0F8" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: '#8F97AB', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#E2E6F0' }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#8F97AB', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              <Area type="natural" dataKey="pm25" stroke="#FF5376" fill="url(#anPm25)" name="PM2.5 (µg/m³)" strokeWidth={2.5} dot={{ r: 2, fill: '#FF5376' }} activeDot={{ r: 5 }} />
              <Area type="natural" dataKey="pm10" stroke="#4F75FE" fill="url(#anPm10)" name="PM10 (µg/m³)" strokeWidth={2} dot={{ r: 2, fill: '#4F75FE' }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3: Toxic Combustion Gases (NO2, SO2, O3, CO) */}
        <div className="mockup-main-chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--color-primary)' }}>
                ENVIRONMENTAL TOXINS
              </div>
              <span className="chart-title">Toxic Gases (NO₂, SO₂, O₃, CO)</span>
              <p className="text-xs text-muted" style={{ marginTop: 2 }}>Electrochemical & metal oxide gas sensors</p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>LOREM IPSUM</span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={history}>
              <CartesianGrid stroke="#EDF0F8" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: '#8F97AB', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#E2E6F0' }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#8F97AB', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              <Line type="monotone" dataKey="no2" stroke="#4F75FE" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} name="NO₂ (ppb)" />
              <Line type="monotone" dataKey="so2" stroke="#FFAE33" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} name="SO₂ (ppb)" />
              <Line type="monotone" dataKey="o3"  stroke="#10B981" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} name="O₃ (ppb)" />
              <Line type="monotone" dataKey="co"  stroke="#FF5376" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} name="CO (ppm)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 4: Temperature & Humidity */}
        <div className="mockup-main-chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--color-accent-amber)' }}>
                CLIMATE TELEMETRY
              </div>
              <span className="chart-title">Climate Conditions (Temp & Humidity)</span>
              <p className="text-xs text-muted" style={{ marginTop: 2 }}>Ambient weather parameters (°C and % RH)</p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>LOREM IPSUM</span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="anTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFAE33" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#FFAE33" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="anHum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#EDF0F8" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: '#8F97AB', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#E2E6F0' }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#8F97AB', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              <Area type="natural" dataKey="temperature" stroke="#FFAE33" fill="url(#anTemp)" strokeWidth={2.5} dot={{ r: 2, fill: '#FFAE33' }} activeDot={{ r: 4 }} name="Temperature (°C)" />
              <Area type="natural" dataKey="humidity" stroke="#10B981" fill="url(#anHum)" strokeWidth={2.5} dot={{ r: 2, fill: '#10B981' }} activeDot={{ r: 4 }} name="Humidity (%RH)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
