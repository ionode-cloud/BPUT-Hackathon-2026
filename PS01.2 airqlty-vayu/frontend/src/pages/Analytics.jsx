import { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine
} from 'recharts';
import { Radio, RefreshCw, Activity, BarChart2, Thermometer, Droplets, Layers, Grid } from 'lucide-react';
import { readingsAPI } from '../services/api';
import socket from '../services/socket';
import { LoadingState, ErrorState, ProtrudingStatCard } from '../components/UI';
import { useNodes } from '../context/NodeContext';
import { TIME_RANGES } from '../utils/thresholds';

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#FFFFFF',
    border: '1.5px solid #D1FAE5',
    borderRadius: 14,
    boxShadow: '0 10px 30px rgba(5,150,105,0.14)',
    fontSize: 12,
    color: '#064E3B',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  cursor: { stroke: '#10B981', strokeOpacity: 0.4, strokeWidth: 1.5 },
};

export default function Analytics() {
  const { nodes, selectedNodeId, selectedNode, setSelectedNodeId, loadingNodes } = useNodes();
  const [timeRange, setTimeRange] = useState('24h');
  const [layoutMode, setLayoutMode] = useState('matrix'); // 'matrix' (Hero + Satellites) or 'grid' (2x2)
  const [heroStream, setHeroStream] = useState('co2'); // 'co2', 'pm', 'toxins', 'climate'
  const [history,   setHistory]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  const fetchData = useCallback(async () => {
    if (!selectedNodeId) { setHistory([]); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const range = TIME_RANGES.find(r => r.value === timeRange);
      const from  = new Date(Date.now() - (range?.hours || 24) * 3600000).toISOString();
      let res = await readingsAPI.getHistory({ from, limit: 300, nodeId: selectedNodeId });
      if (!res.data?.data || res.data.data.length === 0)
        res = await readingsAPI.getHistory({ limit: 100, nodeId: selectedNodeId });
      const rawData = res.data?.data || [];

      const formatted = rawData.map(r => ({
        time: new Date(r.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        timestamp: r.timestamp,
        co2:         r.co2         != null ? Number(r.co2)         : null,
        co:          r.co          != null ? Number(r.co)          : null,
        pm25:        r.pm25        != null ? Number(r.pm25)        : null,
        pm10:        r.pm10        != null ? Number(r.pm10)        : null,
        no2:         r.no2         != null ? Number(r.no2)         : null,
        so2:         r.so2         != null ? Number(r.so2)         : null,
        o3:          r.o3          != null ? Number(r.o3)          : null,
        temperature: r.temperature != null ? Number(r.temperature) : null,
        humidity:    r.humidity    != null ? Number(r.humidity)    : null,
        voc:         r.voc         != null ? Number(r.voc)         : null,
        nh3:         r.nh3         != null ? Number(r.nh3)         : null,
      }));
      setHistory(formatted);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedNodeId, timeRange]);

  useEffect(() => {
    if (selectedNodeId) fetchData(); else setHistory([]);
  }, [selectedNodeId, fetchData]);

  useEffect(() => {
    if (!selectedNodeId) return;
    const handleNewReading = r => {
      if (r.nodeId && r.nodeId !== selectedNodeId) return;
      const point = {
        time: new Date(r.timestamp || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
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
      setHistory(prev => [...prev, point].slice(-300));
    };
    const handleDelete = () => fetchData();
    socket.on('new_reading', handleNewReading);
    socket.on('delete_reading', handleDelete);
    return () => { socket.off('new_reading', handleNewReading); socket.off('delete_reading', handleDelete); };
  }, [selectedNodeId, fetchData]);

  const calcStats = key => {
    const vals = history.map(r => r[key]).filter(v => v !== null && !isNaN(v));
    if (vals.length === 0) return { min: '—', max: '—', avg: '—' };
    return {
      min: Math.min(...vals).toFixed(1),
      max: Math.max(...vals).toFixed(1),
      avg: (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1),
    };
  };

  const co2Stats  = calcStats('co2');
  const pm25Stats = calcStats('pm25');
  const tempStats = calcStats('temperature');
  const humStats  = calcStats('humidity');

  return (
    <div>
      {/* ── Node Selector Banner ──────────────────────────────────────── */}
      <div className="node-selector-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingLeft: 8 }}>
          <div className="node-selector-icon">
            <Radio size={19} />
          </div>
          <div>
            <div className="node-selector-label">Telemetry Node</div>
            <div className="node-selector-title">
              {selectedNode
                ? `${selectedNode.name} (${selectedNode.nodeId})`
                : 'Select a Node to View Analytics'}
              {selectedNode?.isMaster && (
                <span className="node-master-badge">★ Master</span>
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
            onChange={e => setSelectedNodeId(e.target.value)}
            className="node-select-control"
          >
            <option value="">-- Choose a Node --</option>
            {nodes.map(n => (
              <option key={n.nodeId} value={n.nodeId}>
                {n.name} ({n.nodeId}){n.isMaster ? ' — ★ Master' : ''}
              </option>
            ))}
          </select>
          {selectedNodeId && (
            <button onClick={fetchData} className="btn btn-secondary btn-sm" title="Refresh analytics data">
              <RefreshCw size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Conditional: No node / loading / error ───────────────────── */}
      {loadingNodes ? (
        <LoadingState text="Loading node analytics..." />
      ) : !selectedNodeId ? (
        <div className="empty-prompt-card">
          <div className="empty-prompt-icon">
            <Radio size={28} />
          </div>
          <h3 className="empty-prompt-title">Select a Node to View Analytics</h3>
          <p className="empty-prompt-desc">
            Please select a telemetry node from the dropdown above to inspect historical trends, statistical averages, and multi-channel charts.
          </p>
          {nodes.length > 0 && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {nodes.map(n => (
                <button
                  key={n.nodeId}
                  onClick={() => setSelectedNodeId(n.nodeId)}
                  className="btn btn-secondary btn-sm"
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
          {/* Controls row */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12,
            animation: 'fadeInUp 0.35s ease both',
          }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-heading)' }}>
                {selectedNode ? `${selectedNode.name} (${selectedNode.nodeId})` : 'Node'} — Environmental Analytics
              </h2>
              <p className="text-xs text-muted" style={{ marginTop: 3 }}>
                Visual trajectory of gas concentrations, particulates, and climate conditions for this node
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* Layout Switcher: Hero Matrix vs Comparative Grid */}
              <div className="node-view-switch">
                <button
                  type="button"
                  className={`node-view-switch-btn ${layoutMode === 'matrix' ? 'active' : ''}`}
                  onClick={() => setLayoutMode('matrix')}
                  title="Hero Matrix (Panoramic Hero + Satellite Deck)"
                >
                  <Layers size={13} /> Hero Matrix
                </button>
                <button
                  type="button"
                  className={`node-view-switch-btn ${layoutMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setLayoutMode('grid')}
                  title="Comparative 2x2 Grid View"
                >
                  <Grid size={13} /> Grid View
                </button>
              </div>

              {/* Time range pill tabs */}
              <div className="time-range-tabs">
                {TIME_RANGES.map(r => (
                  <button
                    key={r.value}
                    onClick={() => setTimeRange(r.value)}
                    className={`time-tab ${timeRange === r.value ? 'active' : ''}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* KPI Stats Strip */}
          <div className="protruding-cards-grid-4">
            <ProtrudingStatCard icon={Activity}   label="CO₂ PPM"      value={co2Stats.avg ?? '—'}                color="blue"  sub={`Min: ${co2Stats.min} · Max: ${co2Stats.max}`} />
            <ProtrudingStatCard icon={BarChart2}  label="PM2.5 DENSITY" value={pm25Stats.avg ?? '—'}               color="pink"  sub={`Min: ${pm25Stats.min} · Max: ${pm25Stats.max}`} />
            <ProtrudingStatCard icon={Thermometer} label="TEMPERATURE"  value={tempStats.avg ? `${tempStats.avg}°C` : '—'} color="amber" sub={`Min: ${tempStats.min} · Max: ${tempStats.max}`} />
            <ProtrudingStatCard icon={Droplets}   label="HUMIDITY"      value={humStats.avg ? `${humStats.avg}%` : '—'}    color="green" sub={`Min: ${humStats.min} · Max: ${humStats.max}`} />
          </div>

          {/* ── GRAPH LAYOUT 1: HERO MATRIX (Panoramic Primary + 3 Satellites) ── */}
          {layoutMode === 'matrix' ? (
            <div>
              {/* Primary Hero Panoramic Chart */}
              <div className="analytics-hero-card">
                <div className="analytics-hero-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="chart-label chart-label-mint" style={{ margin: 0 }}>PRIMARY TELEMETRY MATRIX</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 999 }}>
                        {timeRange.toUpperCase()} WINDOW
                      </span>
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-heading)', margin: 0 }}>
                      {heroStream === 'co2' && 'CO₂ Gas Dispersion & Concentration Trajectory'}
                      {heroStream === 'pm' && 'Particulate Matter Mass Concentration (PM2.5 & PM10)'}
                      {heroStream === 'toxins' && 'Multi-Toxin Spectrum Trajectory (NO₂, SO₂, O₃, CO)'}
                      {heroStream === 'climate' && 'Ambient Weather & Micro-Climate Conditions'}
                    </h3>
                    <div className="graph-stats-row" style={{ marginTop: 8 }}>
                      {heroStream === 'co2' && (
                        <>
                          <span className="graph-stat-badge"><span className="key">AVG:</span> <span className="val">{co2Stats.avg} ppm</span></span>
                          <span className="graph-stat-badge"><span className="key">PEAK:</span> <span className="val" style={{ color: '#E11D48' }}>{co2Stats.max} ppm</span></span>
                          <span className="graph-stat-badge"><span className="key">LOW:</span> <span className="val" style={{ color: '#059669' }}>{co2Stats.min} ppm</span></span>
                        </>
                      )}
                      {heroStream === 'pm' && (
                        <>
                          <span className="graph-stat-badge"><span className="key">AVG:</span> <span className="val">{pm25Stats.avg} µg/m³</span></span>
                          <span className="graph-stat-badge"><span className="key">PEAK:</span> <span className="val" style={{ color: '#E11D48' }}>{pm25Stats.max} µg/m³</span></span>
                          <span className="graph-stat-badge"><span className="key">LOW:</span> <span className="val" style={{ color: '#059669' }}>{pm25Stats.min} µg/m³</span></span>
                        </>
                      )}
                      {heroStream === 'toxins' && (
                        <>
                          <span className="graph-stat-badge"><span className="key">SPECTRUM:</span> <span className="val">4 Active Sensors</span></span>
                          <span className="graph-stat-badge"><span className="key">TYPE:</span> <span className="val">Electrochemical</span></span>
                        </>
                      )}
                      {heroStream === 'climate' && (
                        <>
                          <span className="graph-stat-badge"><span className="key">TEMP AVG:</span> <span className="val">{tempStats.avg}°C</span></span>
                          <span className="graph-stat-badge"><span className="key">HUM AVG:</span> <span className="val">{humStats.avg}%</span></span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Hero Stream Parameter Switcher */}
                  <div className="hero-param-selector">
                    <button
                      type="button"
                      className={`hero-param-chip ${heroStream === 'co2' ? 'active' : ''}`}
                      onClick={() => setHeroStream('co2')}
                    >
                      CO₂ Gas
                    </button>
                    <button
                      type="button"
                      className={`hero-param-chip ${heroStream === 'pm' ? 'active' : ''}`}
                      onClick={() => setHeroStream('pm')}
                    >
                      Particulates
                    </button>
                    <button
                      type="button"
                      className={`hero-param-chip ${heroStream === 'toxins' ? 'active' : ''}`}
                      onClick={() => setHeroStream('toxins')}
                    >
                      Toxic Gases
                    </button>
                    <button
                      type="button"
                      className={`hero-param-chip ${heroStream === 'climate' ? 'active' : ''}`}
                      onClick={() => setHeroStream('climate')}
                    >
                      Climate
                    </button>
                  </div>
                </div>

                <div style={{ height: 310 }}>
                  <ResponsiveContainer width="100%" height={310}>
                    {heroStream === 'co2' ? (
                      <AreaChart data={history}>
                        <defs>
                          <linearGradient id="heroCo2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#059669" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#ECFDF5" strokeDasharray="4 4" vertical={false} />
                        <XAxis dataKey="time" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#D1FAE5' }} interval="preserveStartEnd" />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} />
                        <Tooltip {...TOOLTIP_STYLE} />
                        <ReferenceLine y={1000} stroke="#10B981" strokeDasharray="4 4" label={{ value: 'Safe (1000)', fill: '#047857', fontSize: 10 }} />
                        <ReferenceLine y={2000} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: 'Moderate (2000)', fill: '#B45309', fontSize: 10 }} />
                        <Area type="natural" dataKey="co2" stroke="#059669" fill="url(#heroCo2)" name="CO₂ (ppm)" strokeWidth={3} dot={{ r: 2, fill: '#059669' }} activeDot={{ r: 6, fill: '#059669', stroke: '#FFFFFF', strokeWidth: 2 }} />
                      </AreaChart>
                    ) : heroStream === 'pm' ? (
                      <AreaChart data={history}>
                        <defs>
                          <linearGradient id="heroPm25" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#F43F5E" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="heroPm10" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#10B981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#ECFDF5" strokeDasharray="4 4" vertical={false} />
                        <XAxis dataKey="time" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#D1FAE5' }} interval="preserveStartEnd" />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} />
                        <Tooltip {...TOOLTIP_STYLE} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        <Area type="natural" dataKey="pm25" stroke="#F43F5E" fill="url(#heroPm25)" name="PM2.5 (µg/m³)" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 6 }} />
                        <Area type="natural" dataKey="pm10" stroke="#10B981" fill="url(#heroPm10)" name="PM10 (µg/m³)"  strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                      </AreaChart>
                    ) : heroStream === 'toxins' ? (
                      <LineChart data={history}>
                        <CartesianGrid stroke="#ECFDF5" strokeDasharray="4 4" vertical={false} />
                        <XAxis dataKey="time" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#D1FAE5' }} interval="preserveStartEnd" />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} />
                        <Tooltip {...TOOLTIP_STYLE} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        <Line type="monotone" dataKey="no2" stroke="#7C3AED" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 5 }} name="NO₂ (ppb)" />
                        <Line type="monotone" dataKey="so2" stroke="#F59E0B" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 5 }} name="SO₂ (ppb)" />
                        <Line type="monotone" dataKey="o3"  stroke="#10B981" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 5 }} name="O₃ (ppb)"  />
                        <Line type="monotone" dataKey="co"  stroke="#F43F5E" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 5 }} name="CO (ppm)"  />
                      </LineChart>
                    ) : (
                      <AreaChart data={history}>
                        <defs>
                          <linearGradient id="heroTemp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="heroHum" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#059669" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#ECFDF5" strokeDasharray="4 4" vertical={false} />
                        <XAxis dataKey="time" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#D1FAE5' }} interval="preserveStartEnd" />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} />
                        <Tooltip {...TOOLTIP_STYLE} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        <Area type="natural" dataKey="temperature" stroke="#F59E0B" fill="url(#heroTemp)" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 5 }} name="Temperature (°C)" />
                        <Area type="natural" dataKey="humidity"    stroke="#059669" fill="url(#heroHum)"  strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 5 }} name="Humidity (%RH)" />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 3-Column Satellite Stream Deck */}
              <div className="analytics-satellite-grid">
                {heroStream !== 'co2' && (
                  <div className="chart-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div className="chart-label chart-label-mint">GAS TELEMETRY</div>
                        <div className="chart-card-title">CO₂ (Carbon Dioxide)</div>
                      </div>
                      <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#059669', fontSize: 10 }}>ppm</span>
                    </div>
                    <div style={{ height: 180 }}>
                      <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={history}>
                          <defs>
                            <linearGradient id="satCo2" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#ECFDF5" strokeDasharray="4 4" vertical={false} />
                          <XAxis dataKey="time" tick={{ fill: '#9CA3AF', fontSize: 9 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fill: '#9CA3AF', fontSize: 9 }} tickLine={false} axisLine={false} />
                          <Tooltip {...TOOLTIP_STYLE} />
                          <Area type="natural" dataKey="co2" stroke="#059669" fill="url(#satCo2)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="CO₂" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {heroStream !== 'pm' && (
                  <div className="chart-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div className="chart-label chart-label-rose">AIR PARTICULATES</div>
                        <div className="chart-card-title">Particulates (PM2.5 & PM10)</div>
                      </div>
                      <span className="badge" style={{ background: 'rgba(244,63,94,0.1)', color: '#E11D48', fontSize: 10 }}>µg/m³</span>
                    </div>
                    <div style={{ height: 180 }}>
                      <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={history}>
                          <defs>
                            <linearGradient id="satPm" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#ECFDF5" strokeDasharray="4 4" vertical={false} />
                          <XAxis dataKey="time" tick={{ fill: '#9CA3AF', fontSize: 9 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fill: '#9CA3AF', fontSize: 9 }} tickLine={false} axisLine={false} />
                          <Tooltip {...TOOLTIP_STYLE} />
                          <Area type="natural" dataKey="pm25" stroke="#F43F5E" fill="url(#satPm)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="PM2.5" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {heroStream !== 'toxins' && (
                  <div className="chart-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div className="chart-label chart-label-violet">ENVIRONMENTAL TOXINS</div>
                        <div className="chart-card-title">Toxic Gases (NO₂, SO₂, CO)</div>
                      </div>
                      <span className="badge" style={{ background: 'rgba(139,92,246,0.1)', color: '#7C3AED', fontSize: 10 }}>ppb</span>
                    </div>
                    <div style={{ height: 180 }}>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={history}>
                          <CartesianGrid stroke="#ECFDF5" strokeDasharray="4 4" vertical={false} />
                          <XAxis dataKey="time" tick={{ fill: '#9CA3AF', fontSize: 9 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fill: '#9CA3AF', fontSize: 9 }} tickLine={false} axisLine={false} />
                          <Tooltip {...TOOLTIP_STYLE} />
                          <Line type="monotone" dataKey="no2" stroke="#7C3AED" strokeWidth={2} dot={false} activeDot={{ r: 3 }} name="NO₂" />
                          <Line type="monotone" dataKey="so2" stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 3 }} name="SO₂" />
                          <Line type="monotone" dataKey="co"  stroke="#F43F5E" strokeWidth={2} dot={false} activeDot={{ r: 3 }} name="CO" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {heroStream !== 'climate' && (
                  <div className="chart-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div className="chart-label chart-label-amber">CLIMATE TELEMETRY</div>
                        <div className="chart-card-title">Ambient Conditions (Temp & RH)</div>
                      </div>
                      <span className="badge" style={{ background: 'rgba(245,158,11,0.1)', color: '#B45309', fontSize: 10 }}>°C / %</span>
                    </div>
                    <div style={{ height: 180 }}>
                      <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={history}>
                          <defs>
                            <linearGradient id="satTemp" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#ECFDF5" strokeDasharray="4 4" vertical={false} />
                          <XAxis dataKey="time" tick={{ fill: '#9CA3AF', fontSize: 9 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fill: '#9CA3AF', fontSize: 9 }} tickLine={false} axisLine={false} />
                          <Tooltip {...TOOLTIP_STYLE} />
                          <Area type="natural" dataKey="temperature" stroke="#F59E0B" fill="url(#satTemp)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Temp" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ── GRAPH LAYOUT 2: COMPARATIVE 2×2 GRID ── */
            <div className="charts-grid">
              {/* Chart 1: CO₂ */}
              <div className="chart-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div className="chart-label chart-label-mint">GAS TELEMETRY</div>
                    <div className="chart-card-title">CO₂ (Carbon Dioxide) Trajectory</div>
                    <div className="chart-card-sub">Infrared gas sensor continuous readings (ppm)</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#047857', background: 'rgba(5,150,105,0.10)', border: '1px solid rgba(5,150,105,0.2)', padding: '3px 10px', borderRadius: 999 }}>ppm</span>
                </div>
                <div className="chart-area-wrap">
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="anCo2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#059669" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#ECFDF5" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="time" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#D1FAE5' }} interval="preserveStartEnd" />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <ReferenceLine y={1000} stroke="#10B981" strokeDasharray="4 4" label={{ value: 'Safe (1000)', fill: '#047857', fontSize: 10 }} />
                      <ReferenceLine y={2000} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: 'Moderate (2000)', fill: '#B45309', fontSize: 10 }} />
                      <Area type="natural" dataKey="co2" stroke="#059669" fill="url(#anCo2)" name="CO₂ (ppm)" strokeWidth={2.5} dot={{ r: 2, fill: '#059669' }} activeDot={{ r: 5, fill: '#059669', stroke: '#ECFDF5', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: PM2.5 & PM10 */}
              <div className="chart-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div className="chart-label chart-label-rose">AIR PARTICULATES</div>
                    <div className="chart-card-title">Particulate Matter (PM2.5 &amp; PM10)</div>
                    <div className="chart-card-sub">Laser optical dust sensor (µg/m³)</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#BE123C', background: 'rgba(244,63,94,0.10)', border: '1px solid rgba(244,63,94,0.2)', padding: '3px 10px', borderRadius: 999 }}>µg/m³</span>
                </div>
                <div className="chart-area-wrap">
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="anPm25" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#F43F5E" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="anPm10" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#059669" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#ECFDF5" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="time" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#D1FAE5' }} interval="preserveStartEnd" />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      <Area type="natural" dataKey="pm25" stroke="#F43F5E" fill="url(#anPm25)" name="PM2.5 (µg/m³)" strokeWidth={2.5} dot={{ r: 2, fill: '#F43F5E' }} activeDot={{ r: 5 }} />
                      <Area type="natural" dataKey="pm10" stroke="#059669" fill="url(#anPm10)" name="PM10 (µg/m³)"  strokeWidth={2}   dot={{ r: 2, fill: '#059669' }} activeDot={{ r: 5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Toxic Gases */}
              <div className="chart-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div className="chart-label chart-label-violet">ENVIRONMENTAL TOXINS</div>
                    <div className="chart-card-title">Toxic Gases (NO₂, SO₂, O₃, CO)</div>
                    <div className="chart-card-sub">Electrochemical &amp; metal oxide gas sensors</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#6D28D9', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', padding: '3px 10px', borderRadius: 999 }}>ppb</span>
                </div>
                <div className="chart-area-wrap">
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={history}>
                      <CartesianGrid stroke="#ECFDF5" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="time" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#D1FAE5' }} interval="preserveStartEnd" />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      <Line type="monotone" dataKey="no2" stroke="#7C3AED" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} name="NO₂ (ppb)" />
                      <Line type="monotone" dataKey="so2" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} name="SO₂ (ppb)" />
                      <Line type="monotone" dataKey="o3"  stroke="#059669" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} name="O₃ (ppb)"  />
                      <Line type="monotone" dataKey="co"  stroke="#F43F5E" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} name="CO (ppm)"  />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 4: Climate Conditions */}
              <div className="chart-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div className="chart-label chart-label-amber">CLIMATE TELEMETRY</div>
                    <div className="chart-card-title">Climate Conditions (Temp &amp; Humidity)</div>
                    <div className="chart-card-sub">Ambient weather parameters (°C and % RH)</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#B45309', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.2)', padding: '3px 10px', borderRadius: 999 }}>°C / %</span>
                </div>
                <div className="chart-area-wrap">
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="anTemp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.30} />
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="anHum" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#059669" stopOpacity={0.20} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#ECFDF5" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="time" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#D1FAE5' }} interval="preserveStartEnd" />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      <Area type="natural" dataKey="temperature" stroke="#F59E0B" fill="url(#anTemp)" strokeWidth={2.5} dot={{ r: 2, fill: '#F59E0B' }} activeDot={{ r: 4 }} name="Temperature (°C)" />
                      <Area type="natural" dataKey="humidity"    stroke="#059669" fill="url(#anHum)"  strokeWidth={2.5} dot={{ r: 2, fill: '#059669' }} activeDot={{ r: 4 }} name="Humidity (%RH)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
