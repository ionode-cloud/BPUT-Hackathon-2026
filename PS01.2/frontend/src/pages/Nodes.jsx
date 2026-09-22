import { useState, useEffect, useCallback } from 'react';
import {
  Radio, Plus, RefreshCw, Trash2, CheckCircle,
  Clock, MapPin, Database, Cpu, X, Star,
  Edit3, Map, Grid, Layers, Compass, Crosshair, Navigation
} from 'lucide-react';
import { nodesAPI } from '../services/api';
import socket from '../services/socket';
import { LoadingState, ErrorState, ProtrudingStatCard } from '../components/UI';
import { timeAgo } from '../utils/thresholds';
import NodeMap from '../components/NodeMap';

export default function Nodes() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // View mode: 'split' (Map + Cards), 'grid' (Cards only), 'map' (Full Map)
  const [viewMode, setViewMode] = useState('split');
  const [selectedMapNodeId, setSelectedMapNodeId] = useState(null);

  // Add Node Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [newNodeId, setNewNodeId] = useState('');
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeLocation, setNewNodeLocation] = useState('');
  const [newNodeLat, setNewNodeLat] = useState('');
  const [newNodeLng, setNewNodeLng] = useState('');
  const [addShowMiniMap, setAddShowMiniMap] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Edit Node Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [editNodeName, setEditNodeName] = useState('');
  const [editNodeLocation, setEditNodeLocation] = useState('');
  const [editNodeLat, setEditNodeLat] = useState('');
  const [editNodeLng, setEditNodeLng] = useState('');
  const [editNodeStatus, setEditNodeStatus] = useState('online');
  const [editShowMiniMap, setEditShowMiniMap] = useState(false);
  const [editModalError, setEditModalError] = useState(null);

  const fetchNodes = useCallback(async () => {
    try {
      const res = await nodesAPI.getAll();
      setNodes(res.data.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 15000);
    return () => clearInterval(interval);
  }, [fetchNodes]);

  // Socket.IO real-time sync
  useEffect(() => {
    const onNodeCreated = (newNode) => {
      setNodes((prev) => {
        const exists = prev.some((n) => n.nodeId === newNode.nodeId);
        if (exists) return prev;
        return [...prev, newNode];
      });
    };

    const onNodeUpdated = (updatedNode) => {
      setNodes((prev) =>
        prev.map((n) => (n.nodeId === updatedNode.nodeId ? { ...n, ...updatedNode } : n))
      );
    };

    const onMasterChanged = (payload) => {
      setNodes((prev) =>
        prev.map((n) => ({
          ...n,
          isMaster: n.nodeId === payload.nodeId,
        }))
      );
    };

    const onNodeDeleted = (payload) => {
      setNodes((prev) => prev.filter((n) => n.nodeId !== payload.nodeId));
      if (payload.newMasterNodeId) {
        setNodes((prev) =>
          prev.map((n) => ({
            ...n,
            isMaster: n.nodeId === payload.newMasterNodeId,
          }))
        );
      }
    };

    const onNewReading = (reading) => {
      if (!reading?.nodeId) return;
      setNodes((prev) =>
        prev.map((n) => {
          if (n.nodeId === reading.nodeId) {
            return {
              ...n,
              lastSeen: reading.timestamp || new Date(),
              totalReadings: (n.totalReadings || 0) + 1,
              latestReading: {
                timestamp: reading.timestamp,
                temperature: reading.temperature,
                humidity: reading.humidity,
                pm25: reading.pm25,
                co2: reading.co2,
              },
            };
          }
          return n;
        })
      );
    };

    socket.on('node_created', onNodeCreated);
    socket.on('node_updated', onNodeUpdated);
    socket.on('master_node_changed', onMasterChanged);
    socket.on('node_deleted', onNodeDeleted);
    socket.on('new_reading', onNewReading);

    return () => {
      socket.off('node_created', onNodeCreated);
      socket.off('node_updated', onNodeUpdated);
      socket.off('master_node_changed', onMasterChanged);
      socket.off('node_deleted', onNodeDeleted);
      socket.off('new_reading', onNewReading);
    };
  }, []);

  // Set Master Node
  const handleSetMaster = async (nodeId, nodeName) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      await nodesAPI.setMaster(nodeId);
      setNodes((prev) =>
        prev.map((n) => ({
          ...n,
          isMaster: n.nodeId === nodeId,
        }))
      );
      setActionMessage(`${nodeName} (${nodeId}) is now set as Master Node.`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      alert(`Failed to set master node: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Node
  const handleDeleteNode = async (nodeId, nodeName) => {
    if (!window.confirm(`Are you sure you want to delete ${nodeName} (${nodeId}) and all of its associated sensor readings?`)) {
      return;
    }
    setActionLoading(true);
    try {
      await nodesAPI.delete(nodeId);
      await fetchNodes();
      setActionMessage(`${nodeName} (${nodeId}) has been deleted.`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      alert(`Failed to delete node: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Node Modal
  const handleOpenEdit = (node) => {
    setEditingNode(node);
    setEditNodeName(node.name || '');
    setEditNodeLocation(node.location || '');
    setEditNodeLat(node.latitude != null ? String(node.latitude) : '');
    setEditNodeLng(node.longitude != null ? String(node.longitude) : '');
    setEditNodeStatus(node.status || 'online');
    setEditShowMiniMap(false);
    setEditModalError(null);
    setEditModalOpen(true);
  };

  // Submit Edit Node
  const handleEditNodeSubmit = async (e) => {
    e.preventDefault();
    setEditModalError(null);
    try {
      const latVal = editNodeLat !== '' && editNodeLat !== null && !isNaN(Number(editNodeLat)) ? Number(editNodeLat) : null;
      const lngVal = editNodeLng !== '' && editNodeLng !== null && !isNaN(Number(editNodeLng)) ? Number(editNodeLng) : null;

      const res = await nodesAPI.update(editingNode.nodeId, {
        name: editNodeName.trim(),
        location: editNodeLocation.trim(),
        status: editNodeStatus,
        latitude: latVal,
        longitude: lngVal,
      });

      const updated = res.data.node;
      setNodes((prev) =>
        prev.map((n) => (n.nodeId === editingNode.nodeId ? { ...n, ...updated } : n))
      );

      setEditModalOpen(false);
      setActionMessage(`Node ${editingNode.name || editingNode.nodeId} updated successfully.`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      setEditModalError(err.message);
    }
  };

  // Submit Add Node
  const handleCreateNodeSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);
    try {
      const latVal = newNodeLat !== '' && newNodeLat !== null && !isNaN(Number(newNodeLat)) ? Number(newNodeLat) : null;
      const lngVal = newNodeLng !== '' && newNodeLng !== null && !isNaN(Number(newNodeLng)) ? Number(newNodeLng) : null;

      await nodesAPI.create({
        nodeId: newNodeId.trim().toUpperCase(),
        name: newNodeName.trim(),
        location: newNodeLocation.trim(),
        latitude: latVal,
        longitude: lngVal,
      });

      setModalOpen(false);
      setNewNodeId('');
      setNewNodeName('');
      setNewNodeLocation('');
      setNewNodeLat('');
      setNewNodeLng('');
      setAddShowMiniMap(false);
      await fetchNodes();
      setActionMessage('New node registered successfully with coordinates.');
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      setModalError(err.message);
    }
  };

  // GPS Geolocation Helper
  const handleGetDeviceLocation = (setLat, setLng) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your current browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
      },
      (err) => {
        alert(`Could not fetch GPS coordinates: ${err.message}`);
      }
    );
  };

  // Quick coordinate presets
  const applyPresetCoords = (lat, lng, loc, setLat, setLng, setLoc) => {
    setLat(String(lat));
    setLng(String(lng));
    if (setLoc && loc) setLoc(loc);
  };

  if (loading && nodes.length === 0) return <LoadingState text="Loading node registry..." />;
  if (error && nodes.length === 0) return <ErrorState message={error} onRetry={fetchNodes} />;

  const masterNode = nodes.find((n) => n.isMaster);
  const onlineCount = nodes.filter((n) => n.status === 'online').length;
  const nodesWithCoords = nodes.filter(
    (n) => n.latitude !== null && n.longitude !== null && !isNaN(n.latitude) && !isNaN(n.longitude)
  );

  return (
    <div>
      {/* ── Top Metric Summary Strip — Protruding Cards ─────────────── */}
      <div className="protruding-cards-grid-4">
        <ProtrudingStatCard
          icon={Cpu}
          label="REGISTERED NODES"
          value={nodes.length}
          color="blue"
          sub="Active hardware stations"
        />
        <ProtrudingStatCard
          icon={Star}
          label="MASTER STATION"
          value={masterNode ? masterNode.name : 'Auto-detected'}
          color="amber"
          sub={masterNode ? `ID: ${masterNode.nodeId}` : 'Feeding live stream'}
        />
        <ProtrudingStatCard
          icon={Radio}
          label="ONLINE STATUS"
          value={`${onlineCount} / ${nodes.length}`}
          color="green"
          sub={`${Math.round((onlineCount / Math.max(nodes.length, 1)) * 100)}% telemetry online`}
        />
        <ProtrudingStatCard
          icon={MapPin}
          label="GPS MAPPED"
          value={`${nodesWithCoords.length} / ${nodes.length}`}
          color="purple"
          sub="Visible on interactive map"
        />
      </div>

      {/* ── Toolbar & View Switcher ──────────────────────────────────── */}
      <div className="node-mgmt-toolbar">
        <div className="node-mgmt-title-group">
          <div className="node-mgmt-avatar">
            <Radio size={22} />
          </div>
          <div>
            <h2 className="node-mgmt-title">
              Node Network & Geo-Location Management
            </h2>
            <p className="node-mgmt-desc">
              Manage telemetry nodes, update GPS latitude and longitude, designate Master Node, and track stations on live map.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* View Mode Toggle: Split / Map / Cards */}
          <div className="node-view-switch">
            <button
              type="button"
              className={`node-view-switch-btn ${viewMode === 'split' ? 'active' : ''}`}
              onClick={() => setViewMode('split')}
            >
              <Layers size={13} /> Split View
            </button>
            <button
              type="button"
              className={`node-view-switch-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
            >
              <Map size={13} /> Map View
            </button>
            <button
              type="button"
              className={`node-view-switch-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid size={13} /> Cards View
            </button>
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setNewNodeId(`NODE-${String(nodes.length + 1).padStart(2, '0')}`);
              setNewNodeName(`Node ${nodes.length + 1}`);
              setNewNodeLocation('Monitoring Station');
              setNewNodeLat('20.2961');
              setNewNodeLng('85.8245');
              setModalError(null);
              setAddShowMiniMap(false);
              setModalOpen(true);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <Plus size={15} /> Add New Node
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={fetchNodes}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div className="node-action-toast">
          <CheckCircle size={17} color="#059669" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* ── Node Cards Grid (1st: Station Cards) ──────────────────── */}
      {/* ── Node Cards Grid (1st: Station Cards) ──────────────────── */}
      {viewMode !== 'map' && (
        nodes.length === 0 ? (
          <div className="node-empty-state">
            <div className="node-empty-icon-ring">
              <Radio size={32} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-heading)', marginBottom: 8 }}>
              No Telemetry Nodes Registered Yet
            </h3>
            <p
              style={{
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                maxWidth: 480,
                margin: '0 auto 20px',
                lineHeight: 1.6,
              }}
            >
              Deploy and register sensor stations with GPS latitude & longitude coordinates to monitor environmental telemetry in real time.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setNewNodeId('NODE-01');
                  setNewNodeName('Node 1');
                  setNewNodeLocation('Main Station');
                  setNewNodeLat('20.2961');
                  setNewNodeLng('85.8245');
                  setModalError(null);
                  setModalOpen(true);
                }}
              >
                <Plus size={15} /> Add First Node
              </button>
              <button className="btn btn-secondary" onClick={fetchNodes}>
                <RefreshCw size={13} /> Check Live Stream
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
              gap: 22,
              marginBottom: 28,
            }}
          >
            {nodes.map((node) => {
              const isCurrentMaster = node.isMaster;
              const lr = node.latestReading;
              const hasCoords = node.latitude !== null && node.longitude !== null && !isNaN(node.latitude) && !isNaN(node.longitude);
              const isSelectedOnMap = selectedMapNodeId === node.nodeId;

              return (
                <div
                  key={node.nodeId}
                  className={`node-station-card ${isCurrentMaster ? 'is-master' : ''} ${isSelectedOnMap ? 'is-selected' : ''}`}
                >
                  {/* Card Top: Avatar, Name, ID, Master Pill, Status Pill */}
                  <div>
                    <div className="node-station-card-top">
                      <div className="node-station-info-left">
                        <div className={`node-station-icon-badge ${node.status === 'online' ? 'online' : 'offline'}`}>
                          <Radio size={20} />
                        </div>
                        <div className="node-station-names">
                          <div className="node-station-name-row">
                            <span className="node-station-name-text">
                              {node.name || `Node ${node.nodeNumber}`}
                            </span>
                            {isCurrentMaster && (
                              <span className="node-station-master-pill">
                                <Star size={10} /> MASTER NODE
                              </span>
                            )}
                          </div>
                          <span className="node-station-id-text">
                            ID: {node.nodeId}
                          </span>
                        </div>
                      </div>

                      <div className={`node-station-status-pill ${node.status === 'online' ? 'online' : 'offline'}`}>
                        <span className="node-station-status-dot" />
                        {node.status === 'online' ? 'ONLINE' : 'OFFLINE'}
                      </div>
                    </div>

                    {/* Master Telemetry Strip */}
                    {isCurrentMaster ? (
                      <div className="node-station-master-banner active">
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <Radio size={14} color="#059669" /> Active Telemetry Source
                        </span>
                        <span style={{ fontSize: 10, background: '#10B981', color: '#FFFFFF', padding: '2px 8px', borderRadius: 999, fontWeight: 800 }}>
                          LIVE STREAM
                        </span>
                      </div>
                    ) : (
                      <div className="node-station-master-banner inactive">
                        <span>Secondary Station</span>
                        <button
                          type="button"
                          className="node-set-master-btn"
                          onClick={() => handleSetMaster(node.nodeId, node.name)}
                          disabled={actionLoading}
                        >
                          <Star size={11} /> Set as Master
                        </button>
                      </div>
                    )}

                    {/* Live Sensor Metrics Preview */}
                    <div className="node-telemetry-quad">
                      <div className="node-telemetry-quad-header">
                        <span>Latest Telemetry Reading:</span>
                        {lr?.timestamp && (
                          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 500 }}>
                            {timeAgo(lr.timestamp)}
                          </span>
                        )}
                      </div>
                      <div className="node-telemetry-quad-grid">
                        <div className="node-telemetry-chip">
                          <div className="node-telemetry-key">Temp</div>
                          <div className="node-telemetry-val" style={{ color: '#F43F5E' }}>
                            {lr?.temperature != null ? `${lr.temperature}°C` : '—'}
                          </div>
                        </div>
                        <div className="node-telemetry-chip">
                          <div className="node-telemetry-key">Humidity</div>
                          <div className="node-telemetry-val" style={{ color: '#0EA5E9' }}>
                            {lr?.humidity != null ? `${lr.humidity}%` : '—'}
                          </div>
                        </div>
                        <div className="node-telemetry-chip">
                          <div className="node-telemetry-key">PM2.5</div>
                          <div className="node-telemetry-val" style={{ color: '#10B981' }}>
                            {lr?.pm25 != null ? `${lr.pm25}` : '—'}
                          </div>
                        </div>
                        <div className="node-telemetry-chip">
                          <div className="node-telemetry-key">CO₂</div>
                          <div className="node-telemetry-val" style={{ color: '#8B5CF6' }}>
                            {lr?.co2 != null ? `${lr.co2}` : '—'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Node Meta Details */}
                    <div className="node-meta-rows">
                      <div className="node-meta-row-item">
                        <span className="label">
                          <MapPin size={13} color="var(--color-text-label)" /> Location
                        </span>
                        <span className="val">{node.location || 'Station'}</span>
                      </div>

                      <div className="node-meta-row-item">
                        <span className="label">
                          <Compass size={13} color="var(--color-text-label)" /> Coordinates
                        </span>
                        {hasCoords ? (
                          <button
                            type="button"
                            className="node-coords-tag"
                            onClick={() => {
                              setSelectedMapNodeId(node.nodeId);
                              if (viewMode === 'grid') setViewMode('split');
                              document.getElementById('node-map-section')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            title="Click to view on Map"
                          >
                            <MapPin size={10} /> {Number(node.latitude).toFixed(4)}°, {Number(node.longitude).toFixed(4)}°
                          </button>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontSize: 11, fontStyle: 'italic' }}>
                            Coordinates Not Set
                          </span>
                        )}
                      </div>

                      <div className="node-meta-row-item">
                        <span className="label">
                          <Database size={13} color="var(--color-text-label)" /> Records
                        </span>
                        <span className="val">{node.totalReadings || 0}</span>
                      </div>

                      <div className="node-meta-row-item">
                        <span className="label">
                          <Clock size={13} color="var(--color-text-label)" /> Last Signal
                        </span>
                        <span className="val" style={{ fontWeight: 500 }}>{timeAgo(node.lastSeen)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="node-card-action-bar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <button
                        type="button"
                        className="node-btn-edit"
                        onClick={() => handleOpenEdit(node)}
                        title="Edit Node, Location, and Coordinates"
                      >
                        <Edit3 size={12} /> Edit
                      </button>

                      {hasCoords && (
                        <button
                          type="button"
                          className="node-btn-locate"
                          onClick={() => {
                            setSelectedMapNodeId(node.nodeId);
                            if (viewMode === 'grid') setViewMode('split');
                            document.getElementById('node-map-section')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          title="Locate on Map"
                        >
                          <Navigation size={12} /> Locate
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      className="node-btn-delete"
                      onClick={() => handleDeleteNode(node.nodeId, node.name)}
                      disabled={actionLoading}
                      title="Delete this node and its telemetry"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Geo-Spatial Map Section (2nd: Map View) ─────────────────── */}
      {(viewMode === 'split' || viewMode === 'map') && (
        <div id="node-map-section" style={{ marginBottom: 30, marginTop: viewMode === 'split' ? 12 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
              }}
            >
              <Map size={17} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-heading)', margin: 0 }}>
                Interactive Geo-Spatial Station Map
              </h3>
              <span className="text-xs text-muted" style={{ fontWeight: 500 }}>
                Live GPS positioning & interactive coverage telemetry of all deployed nodes
              </span>
            </div>
          </div>

          <NodeMap
            nodes={nodes}
            selectedNodeId={selectedMapNodeId}
            onSelectNode={(node) => setSelectedMapNodeId(node.nodeId)}
            onEditNode={handleOpenEdit}
            height={viewMode === 'map' ? '580px' : '440px'}
          />
        </div>
      )}

      {/* ── Add Node Modal ───────────────────────────────────────────── */}
      {/* ── Add Node Modal ───────────────────────────────────────────── */}
      {modalOpen && (
        <div className="node-modal-backdrop">
          <div className="node-modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(16, 185, 129, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#059669',
                  }}
                >
                  <Plus size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-heading)', margin: 0 }}>
                    Register New Sensor Node
                  </h3>
                  <p className="text-xs text-muted" style={{ marginTop: 2 }}>
                    Add a new station with GPS latitude & longitude to your environmental network.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {modalError && (
              <div
                style={{
                  background: 'rgba(244, 63, 94, 0.12)',
                  border: '1px solid rgba(244, 63, 94, 0.35)',
                  color: '#b91c1c',
                  borderRadius: 10,
                  padding: '10px 14px',
                  marginBottom: 16,
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateNodeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Node ID (e.g., NODE-04, SENSOR-04)</label>
                <input
                  type="text"
                  className="form-input"
                  value={newNodeId}
                  onChange={(e) => setNewNodeId(e.target.value.toUpperCase())}
                  placeholder="NODE-04"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Node Label / Display Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  placeholder="Node 4 - Chemistry Lab"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Installation Location</label>
                <input
                  type="text"
                  className="form-input"
                  value={newNodeLocation}
                  onChange={(e) => setNewNodeLocation(e.target.value)}
                  placeholder="Main Station, Lab 1, Outdoor North Wing"
                />
              </div>

              {/* Coordinates Section */}
              <div className="node-gps-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                    <MapPin size={14} color="#059669" /> Geographic Coordinates (GPS)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleGetDeviceLocation(setNewNodeLat, setNewNodeLng)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 9px',
                      color: '#059669',
                    }}
                  >
                    <Crosshair size={12} /> My GPS
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                      Latitude (-90 to 90)
                    </span>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      value={newNodeLat}
                      onChange={(e) => setNewNodeLat(e.target.value)}
                      placeholder="e.g. 20.2961"
                      min="-90"
                      max="90"
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                      Longitude (-180 to 180)
                    </span>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      value={newNodeLng}
                      onChange={(e) => setNewNodeLng(e.target.value)}
                      placeholder="e.g. 85.8245"
                      min="-180"
                      max="180"
                    />
                  </div>
                </div>

                {/* Presets & Map Picker Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 10.5, color: 'var(--color-text-label)', fontWeight: 600 }}>Presets:</span>
                    <button
                      type="button"
                      className="node-city-chip"
                      onClick={() => applyPresetCoords(20.2961, 85.8245, 'Central Station', setNewNodeLat, setNewNodeLng, setNewNodeLocation)}
                    >
                      Bhubaneswar Central
                    </button>
                    <button
                      type="button"
                      className="node-city-chip"
                      onClick={() => applyPresetCoords(22.2536, 84.9012, 'BPUT Campus Rourkela', setNewNodeLat, setNewNodeLng, setNewNodeLocation)}
                    >
                      BPUT Rourkela
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAddShowMiniMap(!addShowMiniMap)}
                    style={{
                      fontSize: 11,
                      color: '#059669',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 700,
                      textDecoration: 'underline',
                    }}
                  >
                    {addShowMiniMap ? 'Hide Map Picker' : '🗺️ Pick on Map'}
                  </button>
                </div>

                {/* Embedded Mini Map Picker */}
                {addShowMiniMap && (
                  <div style={{ marginTop: 12, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                    <NodeMap
                      isPickerMode={true}
                      pickerCoords={{
                        lat: newNodeLat ? parseFloat(newNodeLat) : 20.2961,
                        lng: newNodeLng ? parseFloat(newNodeLng) : 85.8245,
                      }}
                      onPickCoords={(c) => {
                        setNewNodeLat(String(c.lat));
                        setNewNodeLng(String(c.lng));
                      }}
                      height="220px"
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
                  Register Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Node Modal ──────────────────────────────────────────── */}
      {editModalOpen && editingNode && (
        <div className="node-modal-backdrop">
          <div className="node-modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(16, 185, 129, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#059669',
                  }}
                >
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-heading)', margin: 0 }}>
                    Edit Node Configuration
                  </h3>
                  <p className="text-xs text-muted" style={{ marginTop: 2 }}>
                    Update station name, location, online status, and GPS coordinates.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {editModalError && (
              <div
                style={{
                  background: 'rgba(244, 63, 94, 0.12)',
                  border: '1px solid rgba(244, 63, 94, 0.35)',
                  color: '#b91c1c',
                  borderRadius: 10,
                  padding: '10px 14px',
                  marginBottom: 16,
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                {editModalError}
              </div>
            )}

            <form onSubmit={handleEditNodeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Readonly Node ID */}
              <div className="form-group">
                <label className="form-label">Node ID</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingNode.nodeId}
                  disabled
                  style={{ background: '#F8FAFC', color: 'var(--color-text-secondary)', cursor: 'not-allowed', fontFamily: 'monospace', fontWeight: 600 }}
                />
              </div>

              {/* Node Name */}
              <div className="form-group">
                <label className="form-label">Station Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editNodeName}
                  onChange={(e) => setEditNodeName(e.target.value)}
                  placeholder="e.g. Node 1"
                  required
                />
              </div>

              {/* Location */}
              <div className="form-group">
                <label className="form-label">Installation Location</label>
                <input
                  type="text"
                  className="form-input"
                  value={editNodeLocation}
                  onChange={(e) => setEditNodeLocation(e.target.value)}
                  placeholder="e.g. Station East, Laboratory 2"
                />
              </div>

              {/* Status Select */}
              <div className="form-group">
                <label className="form-label">Operational Status</label>
                <select
                  className="form-input"
                  value={editNodeStatus}
                  onChange={(e) => setEditNodeStatus(e.target.value)}
                >
                  <option value="online">Online (Active stream)</option>
                  <option value="offline">Offline (Standby)</option>
                  <option value="warning">Warning (Requires inspection)</option>
                </select>
              </div>

              {/* Coordinates Section */}
              <div className="node-gps-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                    <MapPin size={14} color="#059669" /> GPS Coordinates (Latitude & Longitude)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleGetDeviceLocation(setEditNodeLat, setEditNodeLng)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 9px',
                      color: '#059669',
                    }}
                  >
                    <Crosshair size={12} /> My GPS
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                      Latitude (-90 to 90)
                    </span>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      value={editNodeLat}
                      onChange={(e) => setEditNodeLat(e.target.value)}
                      placeholder="e.g. 20.2961"
                      min="-90"
                      max="90"
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                      Longitude (-180 to 180)
                    </span>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      value={editNodeLng}
                      onChange={(e) => setEditNodeLng(e.target.value)}
                      placeholder="e.g. 85.8245"
                      min="-180"
                      max="180"
                    />
                  </div>
                </div>

                {/* Presets & Mini Map Picker */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 10.5, color: 'var(--color-text-label)', fontWeight: 600 }}>Presets:</span>
                    <button
                      type="button"
                      className="node-city-chip"
                      onClick={() => applyPresetCoords(20.2961, 85.8245, null, setEditNodeLat, setEditNodeLng, null)}
                    >
                      Bhubaneswar (20.2961, 85.8245)
                    </button>
                    <button
                      type="button"
                      className="node-city-chip"
                      onClick={() => applyPresetCoords(22.2536, 84.9012, null, setEditNodeLat, setEditNodeLng, null)}
                    >
                      BPUT Rourkela (22.2536, 84.9012)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditShowMiniMap(!editShowMiniMap)}
                    style={{
                      fontSize: 11,
                      color: '#059669',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 700,
                      textDecoration: 'underline',
                    }}
                  >
                    {editShowMiniMap ? 'Hide Map Picker' : '🗺️ Pick on Map'}
                  </button>
                </div>

                {/* Mini Map Picker */}
                {editShowMiniMap && (
                  <div style={{ marginTop: 12, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                    <NodeMap
                      isPickerMode={true}
                      pickerCoords={{
                        lat: editNodeLat ? parseFloat(editNodeLat) : 20.2961,
                        lng: editNodeLng ? parseFloat(editNodeLng) : 85.8245,
                      }}
                      onPickCoords={(c) => {
                        setEditNodeLat(String(c.lat));
                        setEditNodeLng(String(c.lng));
                      }}
                      height="220px"
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setEditModalOpen(false)}
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
