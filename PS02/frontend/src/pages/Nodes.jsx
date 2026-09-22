import React, { useState, useEffect } from 'react';
import { nodesAPI, readingsAPI } from '../services/api';
import LiveNodeMap from '../components/LiveNodeMap';
import {
  Radio,
  MapPin,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  Zap,
  Activity,
  Microchip,
  ChevronDown,
  ChevronUp,
  Thermometer,
  Droplets,
  Wind,
  Sun,
  Flame,
  X,
  Compass,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

// Sensor definitions for expandable sensor grid
const MASTER_SENSORS = [
  { id: 'temperature', label: 'Temperature', key: 'temperature', unit: '°C', sensor: 'BME688', icon: Thermometer, thresholds: [32, 38] },
  { id: 'humidity', label: 'Humidity', key: 'humidity', unit: '%RH', sensor: 'BME688', icon: Droplets, thresholds: [70, 85] },
  { id: 'voc', label: 'VOC Index', key: 'voc', unit: 'IAQ', sensor: 'BME688', icon: Activity, thresholds: [100, 200] },
  { id: 'radiantHeat', label: 'Radiant Heat', key: 'radiantHeat', unit: '°C', sensor: 'DS18B20', icon: Flame, thresholds: [42, 50] },
  { id: 'windSpeed', label: 'Wind Speed', key: 'windSpeed', unit: 'm/s', sensor: 'Anemometer', icon: Wind, thresholds: [] },
  { id: 'windDirection', label: 'Wind Direction', key: 'windDirection', unit: '°', sensor: 'Wind Vane', icon: Compass, thresholds: [] },
  { id: 'lightIntensity', label: 'Solar Load', key: 'lightIntensity', unit: 'lux', sensor: 'BH1750', icon: Sun, thresholds: [60000, 80000] },
  { id: 'surfaceTemperature', label: 'Surface Temp', key: 'surfaceTemperature', unit: '°C', sensor: 'MLX90640', icon: Flame, thresholds: [45, 55] },
  { id: 'heatIndex', label: 'Heat Index', key: 'heatIndex', unit: '°C', sensor: 'Edge AI', icon: Microchip, thresholds: [36, 42] },
  { id: 'wbgt', label: 'WBGT', key: 'wbgt', unit: '°C', sensor: 'Edge AI', icon: Zap, thresholds: [27, 31] },
];

function getSensorStatus(key, value) {
  const sensor = MASTER_SENSORS.find((s) => s.key === key);
  if (!sensor || !sensor.thresholds || sensor.thresholds.length < 2) return 'safe';
  const [warn, danger] = sensor.thresholds;
  if (value >= danger) return 'dangerous';
  if (value >= warn) return 'moderate';
  return 'safe';
}

function SensorGrid({ reading }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginTop: '12px' }}>
      {MASTER_SENSORS.map(({ id, label, key, unit, sensor, icon: Icon }) => {
        const val = reading ? reading[key] : null;
        const hasVal = val !== undefined && val !== null;
        const displayVal = hasVal ? val : '-';
        const statusKey = typeof val === 'number' ? getSensorStatus(key, val) : null;
        const statusColors = {
          safe: { bg: '#F4FAE8', text: '#4B6E1C', border: '#C5ED8D' },
          moderate: { bg: '#FCF7E8', text: '#7D6312', border: '#E7C86A' },
          dangerous: { bg: '#FDF0F0', text: '#8E2323', border: '#D96C6C' },
        };
        const sc = statusKey ? statusColors[statusKey] : null;

        return (
          <div
            key={id}
            style={{
              background: '#FAFAFA',
              border: '1px solid #E5E7EB',
              borderRadius: '4px',
              padding: '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent-teal)', textTransform: 'uppercase' }}>
                {label}
              </span>
              <Icon size={12} color="#8A8A8A" />
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#173B5A', lineHeight: 1 }}>
              {displayVal}
              {hasVal && <span style={{ fontSize: '10px', fontWeight: 500, color: '#8A8A8A', marginLeft: '2px' }}>{unit}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
              <span style={{ fontSize: '9px', color: '#9CA3AF' }}>{sensor}</span>
              {sc ? (
                <span
                  style={{
                    fontSize: '8px',
                    fontWeight: 800,
                    padding: '1px 4px',
                    borderRadius: '2px',
                    background: sc.bg,
                    color: sc.text,
                    border: `1px solid ${sc.border}`,
                  }}
                >
                  {statusKey.toUpperCase()}
                </span>
              ) : (
                <span style={{ fontSize: '9px', color: '#9CA3AF' }}>-</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NodeCard({
  node,
  reading,
  isMaster,
  isExpanded,
  onToggleTelemetry,
  onEdit,
  onDelete,
  onPing,
  onTestTelemetry,
  onFocusMap,
}) {
  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderTop: isMaster ? '4px solid var(--accent-teal)' : '4px solid #94A3B8',
        boxShadow: isMaster ? '0 4px 14px rgba(61,136,136,0.12)' : '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Radio size={16} color="var(--accent-teal)" />
          <span style={{ fontSize: '16px', fontWeight: 800, color: '#173B5A' }}>{node.nodeId}</span>
          {isMaster ? (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '3px',
                background: '#EBF4F4',
                color: 'var(--accent-teal)',
                border: '1px solid #B2D8D8',
              }}
            >
              MASTER NODE
            </span>
          ) : (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '3px',
                background: '#F1F5F9',
                color: '#475569',
                border: '1px solid #CBD5E1',
              }}
            >
              ESP32 SLAVE
            </span>
          )}
        </div>
        <span className={`status-badge ${node.status === 'online' ? 'safe' : 'offline'}`}>
          {node.status}
        </span>
      </div>

      {/* Node Name & Location */}
      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-teal)', marginBottom: '4px' }}>
        {node.nodeName}
      </div>
      <div style={{ fontSize: '12px', color: '#4B5563', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <MapPin size={12} color="#8A8A8A" />
        <span>{node.location}</span>
      </div>

      {/* Coordinates Display Bar */}
      <div
        style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '4px',
          padding: '6px 10px',
          fontSize: '11px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
        }}
      >
        <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Compass size={12} />
          <strong>Coordinates:</strong>
          {node.latitude != null && node.longitude != null
            ? `${node.latitude.toFixed(4)}° N, ${node.longitude.toFixed(4)}° E`
            : 'Coordinates Not Set'}
        </span>
        <button
          onClick={() => onFocusMap(node.nodeId)}
          className="btn btn-outline btn-sm"
          style={{ fontSize: '10px', padding: '1px 6px' }}
          title="Zoom to location on live map below"
        >
          Show on Map
        </button>
      </div>

      {/* Action Buttons Row */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => onPing(node.nodeId)}
          className="btn btn-outline btn-sm"
          style={{ flex: 1, minWidth: '70px', justifyContent: 'center' }}
          title="Send diagnostic ping"
        >
          <Zap size={11} />
          <span>Ping</span>
        </button>
        <button
          onClick={() => onTestTelemetry(node.nodeId)}
          className="btn btn-outline btn-sm"
          style={{ flex: 1, minWidth: '95px', justifyContent: 'center' }}
          title="Generate fresh sensor reading"
        >
          <Activity size={11} />
          <span>Test Reading</span>
        </button>
        <button
          onClick={() => onEdit(node)}
          className="btn btn-outline btn-sm"
          style={{ flex: 1, minWidth: '70px', justifyContent: 'center' }}
          title="Edit location and coordinates"
        >
          <Edit2 size={11} />
          <span>Edit</span>
        </button>
        {!isMaster && (
          <button
            onClick={() => onDelete(node.nodeId)}
            className="btn btn-outline btn-sm"
            style={{ color: '#DC2626', borderColor: '#FCA5A5', minWidth: '40px', justifyContent: 'center' }}
            title="Delete slave node"
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>

      {/* Expandable Sensor Readings - Clicking opens all cards */}
      <button
        onClick={onToggleTelemetry}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '8px 10px',
          background: isExpanded ? '#EBF4F4' : '#F1F5F9',
          border: isExpanded ? '1px solid #B2D8D8' : '1px solid #E2E8F0',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 700,
          color: isExpanded ? 'var(--accent-teal)' : '#173B5A',
          cursor: 'pointer',
        }}
        title="Click to expand/collapse Live Sensor Telemetry on all cards"
      >
        <span>Live Sensor Telemetry ({node.nodeId})</span>
        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {isExpanded && <SensorGrid reading={reading} />}
    </div>
  );
}

export default function Nodes() {
  const [nodes, setNodes] = useState([]);
  const [latestReadings, setLatestReadings] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState({ text: '', type: 'info' });
  const [selectedMapNodeId, setSelectedMapNodeId] = useState('MASTER-01');
  const [allTelemetryOpen, setAllTelemetryOpen] = useState(false);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState(null);

  // New Slave Form State (simplified: without battery, signal, and checkbox)
  const [formData, setFormData] = useState({
    nodeId: '',
    nodeName: '',
    location: '',
    latitude: 20.2975,
    longitude: 85.8265,
  });

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [nodesRes, readingsRes] = await Promise.all([
        nodesAPI.getAll(),
        readingsAPI.getLatest(),
      ]);
      setNodes(nodesRes?.data || []);
      setLatestReadings(readingsRes?.data?.nodes || {});
    } catch (err) {
      console.error('Nodes fetch error:', err);
      showMsg('Failed to load nodes telemetry', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 12000);
    return () => clearInterval(iv);
  }, []);

  const showMsg = (text, type = 'info') => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg({ text: '', type: 'info' }), 5000);
  };

  // Toggle Live Sensor Telemetry across all cards
  const handleToggleAllTelemetry = () => {
    setAllTelemetryOpen((prev) => !prev);
  };

  // Preset coordinates helper for quick adding
  const applyPresetCoords = (lat, lng, name, loc) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      nodeName: prev.nodeName || name,
      location: prev.location || loc,
    }));
  };

  // Handle map click to autofill coordinates in form
  const handleMapClick = ({ lat, lng }) => {
    if (addModalOpen) {
      setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
      showMsg(`Copied map coordinates to Add Slave form: ${lat}, ${lng}`, 'info');
    } else if (editModalOpen && editingNode) {
      setEditingNode((prev) => ({ ...prev, latitude: lat, longitude: lng }));
      showMsg(`Copied map coordinates to Edit form: ${lat}, ${lng}`, 'info');
    } else {
      showMsg(`Selected Map Point: Lat ${lat}, Lng ${lng}. Click "+ Add New Slave" to register here.`, 'info');
    }
  };

  // Add Slave Submission
  const handleCreateSlave = async (e) => {
    e.preventDefault();
    if (!formData.nodeId) {
      showMsg('Node ID is required (e.g. SLAVE-03)', 'error');
      return;
    }

    try {
      const formattedNodeId = formData.nodeId.trim().toUpperCase();
      const payload = {
        nodeId: formattedNodeId,
        nodeName: formData.nodeName.trim() || `${formattedNodeId} Sensor Node`,
        nodeType: 'slave',
        location: formData.location.trim() || 'Bhubaneswar Urban Sector',
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        batteryLevel: 95,
        signalStrength: -65,
        createInitialReading: true,
      };

      await nodesAPI.create(payload);
      showMsg(`Slave node ${formattedNodeId} registered with coordinates & live telemetry!`, 'success');
      setAddModalOpen(false);
      setSelectedMapNodeId(formattedNodeId);
      // Reset form
      setFormData({
        nodeId: '',
        nodeName: '',
        location: '',
        latitude: 20.2975,
        longitude: 85.8265,
      });
      fetchAll();
    } catch (err) {
      showMsg(err.message || 'Failed to create slave node', 'error');
    }
  };

  // Open Edit Node Modal
  const openEditModal = (node) => {
    setEditingNode({
      nodeId: node.nodeId,
      nodeName: node.nodeName,
      location: node.location,
      latitude: node.latitude ?? 20.2961,
      longitude: node.longitude ?? 85.8245,
      status: node.status || 'online',
    });
    setEditModalOpen(true);
  };

  // Edit Node Submission
  const handleUpdateNode = async (e) => {
    e.preventDefault();
    if (!editingNode) return;

    try {
      await nodesAPI.update(editingNode.nodeId, {
        nodeName: editingNode.nodeName,
        location: editingNode.location,
        latitude: parseFloat(editingNode.latitude),
        longitude: parseFloat(editingNode.longitude),
        status: editingNode.status,
      });
      showMsg(`Node ${editingNode.nodeId} updated successfully!`, 'success');
      setEditModalOpen(false);
      fetchAll();
    } catch (err) {
      showMsg(err.message || 'Failed to update node', 'error');
    }
  };

  // Delete Slave Node
  const handleDeleteNode = async (nodeId) => {
    if (!window.confirm(`Delete node ${nodeId} and all its sensor telemetry? This cannot be undone.`)) return;
    try {
      await nodesAPI.delete(nodeId);
      showMsg(`Node ${nodeId} deleted successfully.`, 'info');
      fetchAll();
    } catch (err) {
      showMsg(`Error deleting ${nodeId}: ${err.message}`, 'error');
    }
  };

  // Diagnostic Ping
  const handlePingNode = (nodeId) => {
    const latencies = [14, 18, 22, 27, 31];
    const ms = latencies[Math.floor(Math.random() * latencies.length)];
    showMsg(`Ping ACK: ${nodeId} responded in ${ms}ms via local mesh protocol.`, 'success');
  };

  // Push Test Sensor Reading via PUT /api/nodes/:nodeId
  const handleTestTelemetry = async (nodeId) => {
    try {
      // Simulate extreme heat readings that trigger multiple dangerous alerts
      const baseTemp = Math.round((41.0 + Math.random() * 2.5) * 10) / 10; // 41.0 - 43.5°C
      const baseHum = Math.round(62 + Math.random() * 12); // 62 - 74% RH
      const radHeat = Math.round((48.5 + Math.random() * 3.5) * 10) / 10; // 48.5 - 52.0°C
      const surfTemp = Math.round((51.0 + Math.random() * 4.0) * 10) / 10; // 51.0 - 55.0°C

      const res = await nodesAPI.update(nodeId, {
        temperature: baseTemp,
        humidity: baseHum,
        radiantHeat: radHeat,
        surfaceTemperature: surfTemp,
        voc: Math.round(110 + Math.random() * 50),
        windSpeed: Math.round((1.0 + Math.random() * 1.0) * 10) / 10,
        lightIntensity: Math.round(68000 + Math.random() * 15000),
      });

      const allAlerts = res?.alerts || (res?.alert ? [res.alert] : []);
      if (allAlerts.length > 0) {
        // Trigger all alerts to play one by one in AlertNotificationPopup
        window.dispatchEvent(new CustomEvent('app:alerts-triggered', { detail: allAlerts }));
        showMsg(`⚠️ ${allAlerts.length} dangerous alerts triggered for ${nodeId}! Showing one by one.`, 'error');
      } else {
        showMsg(`PUT /api/nodes/${nodeId}: Telemetry pushed (Temp: ${baseTemp}°C, WBGT calculated).`, 'success');
      }

      fetchAll();
    } catch (err) {
      showMsg(`Failed to push telemetry: ${err.message}`, 'error');
    }
  };

  // Focus map on node
  const handleFocusMap = (nodeId) => {
    setSelectedMapNodeId(nodeId);
    const mapEl = document.getElementById('live-node-map-section');
    if (mapEl) {
      mapEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Sort nodes: master first, then alphabetical slaves
  const sorted = [...nodes].sort((a, b) => {
    if (a.nodeType === 'master') return -1;
    if (b.nodeType === 'master') return 1;
    return a.nodeId.localeCompare(b.nodeId);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Network Nodes & Spatial Management
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Manage MASTER-01 (Arduino UNO Q) and ESP32 Slaves with geographic coordinates and live spatial mapping
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setAddModalOpen(true)}
            className="btn btn-primary btn-sm"
            style={{ fontWeight: 700 }}
          >
            <Plus size={14} />
            <span>Add New Slave</span>
          </button>
          <button onClick={fetchAll} className="btn btn-outline btn-sm">
            <RefreshCw size={12} className={loading ? 'spin' : ''} />
            <span>Refresh Nodes</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {actionMsg.text && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '4px',
            background: actionMsg.type === 'error' ? '#FDF2F2' : actionMsg.type === 'success' ? '#F0FDF4' : '#EBF4F4',
            border: `1px solid ${
              actionMsg.type === 'error' ? '#F87171' : actionMsg.type === 'success' ? '#86EFAC' : '#B2D8D8'
            }`,
            color: actionMsg.type === 'error' ? '#991B1B' : actionMsg.type === 'success' ? '#166534' : '#173B5A',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {actionMsg.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* 1st: Node Cards Section Header with Global Expand/Collapse Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Managed Network Nodes ({sorted.length})
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            MASTER-01 + {sorted.length > 1 ? `${sorted.length - 1} Slaves` : '0 Slaves'}
          </span>
        </div>

        <button
          onClick={handleToggleAllTelemetry}
          className="btn btn-outline btn-sm"
          style={{
            fontSize: '11px',
            fontWeight: 700,
            background: allTelemetryOpen ? '#EBF4F4' : '#FFFFFF',
            borderColor: allTelemetryOpen ? 'var(--accent-teal)' : '#D1D5DB',
            color: allTelemetryOpen ? 'var(--accent-teal)' : '#374151',
          }}
          title="Click to open or collapse Live Sensor Telemetry on all cards"
        >
          <Activity size={13} />
          <span>{allTelemetryOpen ? 'Collapse All Sensor Telemetry' : 'Live Sensor Telemetry (Open All Cards)'}</span>
        </button>
      </div>

      {/* 1st: Node Cards Grid */}
      <div className="grid-3">
        {sorted.map((node) => (
          <NodeCard
            key={node.nodeId}
            node={node}
            reading={latestReadings[node.nodeId]}
            isMaster={node.nodeType === 'master'}
            isExpanded={allTelemetryOpen}
            onToggleTelemetry={handleToggleAllTelemetry}
            onEdit={openEditModal}
            onDelete={handleDeleteNode}
            onPing={handlePingNode}
            onTestTelemetry={handleTestTelemetry}
            onFocusMap={handleFocusMap}
          />
        ))}
      </div>

      {/* 2nd: Interactive Live Map Component */}
      <div id="live-node-map-section">
        <LiveNodeMap
          nodes={nodes}
          latestReadings={latestReadings}
          selectedNodeId={selectedMapNodeId}
          onSelectNode={setSelectedMapNodeId}
          onMapClick={handleMapClick}
          height="400px"
        />
      </div>

      {/* 3rd: Network Health Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Microchip size={16} />
            <span>Node Network Health & Coordinates Table</span>
          </div>
          <span className="card-subtitle">Local Mesh Subnet — Live Georeferenced Status</span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Node ID</th>
                <th>Type</th>
                <th>Location</th>
                <th>Coordinates (Lat, Lng)</th>
                <th>Status</th>
                <th>Last Temp</th>
                <th>WBGT</th>
                <th>Signal</th>
                <th>Battery</th>
                <th>Last Seen</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((node) => {
                const r = latestReadings[node.nodeId];
                return (
                  <tr key={node.nodeId}>
                    <td>
                      <strong style={{ color: 'var(--text-primary)', fontWeight: 800 }}>
                        {node.nodeId}
                      </strong>
                    </td>
                    <td>
                      <span className={`node-type-badge ${node.nodeType}`}>
                        {node.nodeType}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px' }}>{node.location}</td>
                    <td style={{ fontSize: '11px', color: 'var(--accent-teal)', fontWeight: 600 }}>
                      {node.latitude != null && node.longitude != null
                        ? `${node.latitude.toFixed(4)}°, ${node.longitude.toFixed(4)}°`
                        : '-'}
                    </td>
                    <td>
                      <span className={`status-badge ${node.status === 'online' ? 'safe' : 'offline'}`}>
                        {node.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {r?.temperature != null ? `${r.temperature}°C` : '-'}
                    </td>
                    <td
                      style={{
                        fontWeight: 700,
                        color: r?.wbgt >= 31 ? 'var(--status-dangerous)' : 'var(--text-primary)',
                      }}
                    >
                      {r?.wbgt != null ? `${r.wbgt}°C` : '-'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {node.signalStrength != null ? `${node.signalStrength} dBm` : '-'}
                    </td>
                    <td style={{ color: 'var(--status-safe-text)', fontWeight: 700 }}>
                      {node.batteryLevel != null ? `${node.batteryLevel}%` : '-'}
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {node.lastSeen ? new Date(node.lastSeen).toLocaleTimeString() : '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="table-btn-ping"
                          onClick={() => handlePingNode(node.nodeId)}
                          title="Ping node"
                        >
                          Ping
                        </button>
                        <button
                          className="table-btn-ping"
                          style={{ borderColor: '#B2D8D8', color: 'var(--accent-teal)' }}
                          onClick={() => openEditModal(node)}
                          title="Edit coordinates and location"
                        >
                          Edit
                        </button>
                        {node.nodeType !== 'master' && (
                          <button
                            className="table-btn-delete"
                            onClick={() => handleDeleteNode(node.nodeId)}
                            title="Delete node"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Slave Node Modal (Cleaned up: No Battery, No Signal, No Checkbox) */}
      {addModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="var(--accent-teal)" />
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Add New ESP32 Slave Node
                </span>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSlave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Node ID */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Node ID * (e.g. SLAVE-03, SLAVE-04)
                </label>
                <input
                  type="text"
                  required
                  placeholder="SLAVE-03"
                  value={formData.nodeId}
                  onChange={(e) => setFormData({ ...formData, nodeId: e.target.value.toUpperCase() })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                />
              </div>

              {/* Node Name */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Node Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Street Market South Wing Node"
                  value={formData.nodeName}
                  onChange={(e) => setFormData({ ...formData, nodeName: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '13px' }}
                />
              </div>

              {/* Location Description */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Location Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Market Square Corridor C - Entrance Gate"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '13px' }}
                />
              </div>

              {/* Latitude & Longitude Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Latitude * (°N)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="20.2975"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Longitude * (°E)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="85.8265"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '13px', fontWeight: 600 }}
                  />
                </div>
              </div>

              {/* Quick Coordinate Presets */}
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: '4px' }}>
                  QUICK PRESETS (OR CLICK LIVE MAP TO PICK COORDS):
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => applyPresetCoords(20.2995, 85.8290, 'South Market Extension', 'Market South Stalls')}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '10px', padding: '2px 6px' }}
                  >
                    South Market (20.2995, 85.8290)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetCoords(20.2925, 85.8195, 'Hospital Zone Node', 'Ward 12 Relief Center')}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '10px', padding: '2px 6px' }}
                  >
                    Hospital Ward (20.2925, 85.8195)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetCoords(20.3015, 85.8320, 'Railway Station Plaza', 'Main Plaza Pedestrian Way')}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '10px', padding: '2px 6px' }}
                  >
                    Station Plaza (20.3015, 85.8320)
                  </button>
                </div>
              </div>

              {/* Form Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="btn btn-outline btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
                  Save & Register Slave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Node Modal */}
      {editModalOpen && editingNode && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} color="var(--accent-teal)" />
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Edit Node {editingNode.nodeId}
                </span>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateNode} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Node Name
                </label>
                <input
                  type="text"
                  required
                  value={editingNode.nodeName}
                  onChange={(e) => setEditingNode({ ...editingNode, nodeName: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Location Description
                </label>
                <input
                  type="text"
                  required
                  value={editingNode.location}
                  onChange={(e) => setEditingNode({ ...editingNode, location: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Latitude (°N)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editingNode.latitude}
                    onChange={(e) => setEditingNode({ ...editingNode, latitude: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Longitude (°E)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editingNode.longitude}
                    onChange={(e) => setEditingNode({ ...editingNode, longitude: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Node Status
                </label>
                <select
                  value={editingNode.status}
                  onChange={(e) => setEditingNode({ ...editingNode, status: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '13px', background: '#FFFFFF' }}
                >
                  <option value="online">online</option>
                  <option value="warning">warning</option>
                  <option value="offline">offline</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="btn btn-outline btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
