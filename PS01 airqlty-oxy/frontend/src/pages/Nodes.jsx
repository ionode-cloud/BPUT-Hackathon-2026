import { useState, useEffect, useCallback } from 'react';
import {
  Radio, Plus, RefreshCw, Trash2, CheckCircle,
  Clock, MapPin, Database, Cpu, X, Star,
  Edit3, Map, Grid, Layers, Compass, Crosshair, Navigation
} from 'lucide-react';
import { nodesAPI } from '../services/api';
import socket from '../services/socket';
import { LoadingState, ErrorState } from '../components/UI';
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
      {/* ── Top Metric Summary Strip ─────────────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <div>
              <div className="stat-label">Total Nodes Registered</div>
              <div className="stat-value">{nodes.length}</div>
            </div>
            <div className="stat-icon" style={{ background: 'rgba(244, 211, 94, 0.18)', border: '1px solid #F1E9C8' }}>
              <Cpu size={20} color="#4A4200" />
            </div>
          </div>
          <div className="stat-change">Active across network</div>
        </div>

        <div className="stat-card" style={{ border: '1px solid #F4D35E' }}>
          <div className="stat-card-header">
            <div>
              <div className="stat-label">Active Master Node</div>
              <div className="stat-value" style={{ fontSize: 20, color: '#9a6700' }}>
                {masterNode ? `${masterNode.name} (${masterNode.nodeId})` : 'None Assigned'}
              </div>
            </div>
            <div className="stat-icon" style={{ background: 'rgba(244, 211, 94, 0.25)', border: '1px solid #F4D35E' }}>
              <Star size={20} color="#9a6700" />
            </div>
          </div>
          <div className="stat-change" style={{ color: '#9a6700', fontWeight: 600 }}>
            Feeding Live Dashboard
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div>
              <div className="stat-label">Online Status</div>
              <div className="stat-value" style={{ color: '#1e7e53' }}>{onlineCount} / {nodes.length}</div>
            </div>
            <div className="stat-icon" style={{ background: 'rgba(98, 200, 155, 0.14)', border: '1px solid #62C89B' }}>
              <Radio size={20} color="#62C89B" />
            </div>
          </div>
          <div className="stat-change">Connected stations</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div>
              <div className="stat-label">GPS Mapped Stations</div>
              <div className="stat-value" style={{ color: '#7D70D8' }}>
                {nodesWithCoords.length} / {nodes.length}
              </div>
            </div>
            <div className="stat-icon" style={{ background: 'rgba(125, 112, 216, 0.14)', border: '1px solid #7D70D8' }}>
              <MapPin size={20} color="#7D70D8" />
            </div>
          </div>
          <div className="stat-change">Visible on live map</div>
        </div>
      </div>

      {/* ── Toolbar & View Switcher ──────────────────────────────────── */}
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
            Node Network & Geo-Location Management
          </h2>
          <p className="text-xs text-muted" style={{ marginTop: 2 }}>
            Manage telemetry nodes, update GPS latitude and longitude, designate the Master Node, and track stations on the interactive map.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* View Mode Toggle: Split / Map / Cards */}
          <div
            style={{
              display: 'inline-flex',
              background: '#FFFFFF',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: 3,
              gap: 2,
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('split')}
              style={{
                border: 'none',
                background: viewMode === 'split' ? '#F4D35E' : 'transparent',
                color: viewMode === 'split' ? '#4A4200' : 'var(--color-text-secondary)',
                fontWeight: 700,
                fontSize: 11.5,
                padding: '5px 10px',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.15s ease',
              }}
            >
              <Layers size={13} /> Split View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              style={{
                border: 'none',
                background: viewMode === 'map' ? '#F4D35E' : 'transparent',
                color: viewMode === 'map' ? '#4A4200' : 'var(--color-text-secondary)',
                fontWeight: 700,
                fontSize: 11.5,
                padding: '5px 10px',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.15s ease',
              }}
            >
              <Map size={13} /> Map View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                border: 'none',
                background: viewMode === 'grid' ? '#F4D35E' : 'transparent',
                color: viewMode === 'grid' ? '#4A4200' : 'var(--color-text-secondary)',
                fontWeight: 700,
                fontSize: 11.5,
                padding: '5px 10px',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.15s ease',
              }}
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
          >
            <Plus size={14} /> Add New Node
          </button>

          <button className="btn btn-secondary btn-sm" onClick={fetchNodes}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div
          style={{
            background: 'rgba(98, 200, 155, 0.14)',
            border: '1px solid #62C89B',
            color: '#1e7e53',
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 20,
            fontSize: 12.5,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircle size={15} />
          {actionMessage}
        </div>
      )}

      {/* ── Geo-Spatial Map Section (1st: Map View in Split / Map View) ─────────────────── */}
      {(viewMode === 'split' || viewMode === 'map') && (
        <div id="node-map-section" style={{ marginBottom: 28, marginTop: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Map size={16} color="var(--color-heading)" />
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-heading)', margin: 0 }}>
              Interactive Geo-Spatial Station Map
            </h3>
            <span className="text-xs text-muted" style={{ fontWeight: 500 }}>
              (Live GPS coordinates of all deployed nodes)
            </span>
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


      {/* ── Node Cards Grid (2nd: Station Cards) ──────────────────── */}
      {viewMode !== 'map' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Cpu size={16} color="var(--color-heading)" />
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-heading)', margin: 0 }}>
            Deployed Station Registry ({nodes.length} Active Nodes)
          </h3>
        </div>
      )}
{viewMode !== 'map' && (
        nodes.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '50px 24px',
              textAlign: 'center',
              border: '2px dashed #F1E9C8',
              borderRadius: 16,
              background: '#FFFFFF',
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: '50%',
                background: '#FFFBEA',
                border: '1px solid #F4D35E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#8A6D00',
              }}
            >
              <Radio size={28} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-heading)', marginBottom: 8 }}>
              No Nodes Registered Yet
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
              Click below to register your first sensor station with latitude and longitude coordinates.
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
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
              gap: 20,
              marginBottom: 24,
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
                  className="card"
                  style={{
                    padding: '22px',
                    border: isSelectedOnMap
                      ? '2px solid #7D70D8'
                      : isCurrentMaster
                      ? '2px solid #F4D35E'
                      : '1px solid #F1E9C8',
                    borderRadius: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    boxShadow: isSelectedOnMap
                      ? '0 6px 24px rgba(125, 112, 216, 0.22)'
                      : isCurrentMaster
                      ? '0 6px 24px rgba(244, 211, 94, 0.25)'
                      : '0 4px 20px rgba(210, 190, 100, 0.08)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Card Header: Node Name + Status Badge */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-heading)' }}>
                            {node.name || `Node ${node.nodeNumber}`}
                          </span>
                          {isCurrentMaster && (
                            <span
                              style={{
                                background: '#F4D35E',
                                color: '#4A4200',
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: 999,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                              }}
                            >
                              <Star size={10} /> MASTER NODE
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--color-text-label)', marginTop: 2, fontFamily: 'monospace' }}>
                          ID: {node.nodeId}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: 999,
                          background: node.status === 'online' ? 'rgba(98, 200, 155, 0.14)' : 'rgba(232, 120, 120, 0.14)',
                          color: node.status === 'online' ? '#1e7e53' : '#a83232',
                          border: `1px solid ${node.status === 'online' ? '#62C89B' : '#E87878'}`,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: node.status === 'online' ? '#62C89B' : '#E87878',
                          }}
                        />
                        {node.status === 'online' ? 'ONLINE' : 'OFFLINE'}
                      </div>
                    </div>

                    {/* Master Designation Strip */}
                    {isCurrentMaster ? (
                      <div
                        style={{
                          background: '#FFFBEA',
                          border: '1px solid #F4D35E',
                          borderRadius: 10,
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 14,
                          fontSize: 11.5,
                          color: '#4A4200',
                          fontWeight: 700,
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Radio size={13} color="#9a6700" /> Active Telemetry Source for Dashboard
                        </span>
                        <span style={{ fontSize: 10, background: '#F4D35E', padding: '1px 6px', borderRadius: 4 }}>
                          LIVE
                        </span>
                      </div>
                    ) : (
                      <div
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #F1E9C8',
                          borderRadius: 10,
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 14,
                          fontSize: 11.5,
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        <span>Secondary Node</span>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleSetMaster(node.nodeId, node.name)}
                          disabled={actionLoading}
                          style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            background: '#FFF8D9',
                            color: '#4A4200',
                            fontWeight: 700,
                          }}
                        >
                          <Star size={12} /> Set as Master
                        </button>
                      </div>
                    )}

                    {/* Live Sensor Metrics Preview */}
                    <div style={{ background: '#FFFDF3', border: '1px solid #F1E9C8', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-heading)', marginBottom: 8 }}>
                        Latest Sensor Reading:
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, textAlign: 'center' }}>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--color-text-label)' }}>Temp</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#F5B84B' }}>
                            {lr?.temperature != null ? `${lr.temperature}°C` : '—'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--color-text-label)' }}>Humidity</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#5b9fa3' }}>
                            {lr?.humidity != null ? `${lr.humidity}%` : '—'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--color-text-label)' }}>PM2.5</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#62C89B' }}>
                            {lr?.pm25 != null ? `${lr.pm25}` : '—'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--color-text-label)' }}>CO₂</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#7D70D8' }}>
                            {lr?.co2 != null ? `${lr.co2}` : '—'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Node Meta Details including Latitude & Longitude */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 11.5, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={11} color="var(--color-text-label)" /> Location
                        </span>
                        <span style={{ fontWeight: 600, color: 'var(--color-heading)' }}>{node.location || 'Station'}</span>
                      </div>

                      {/* GPS Coordinates Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Compass size={11} color="var(--color-text-label)" /> Latitude & Longitude
                        </span>
                        {hasCoords ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMapNodeId(node.nodeId);
                              if (viewMode === 'grid') setViewMode('split');
                              document.getElementById('node-map-section')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            style={{
                              background: isSelectedOnMap ? '#F4D35E' : '#F7F5FC',
                              border: isSelectedOnMap ? '1px solid #C4A420' : '1px solid #E4E0F4',
                              color: isSelectedOnMap ? '#4A4200' : '#7D70D8',
                              borderRadius: 6,
                              padding: '2px 8px',
                              fontSize: 10.5,
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
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

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Database size={11} color="var(--color-text-label)" /> Total Records
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--color-heading)' }}>{node.totalReadings || 0}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} color="var(--color-text-label)" /> Last Signal
                        </span>
                        <span style={{ fontWeight: 500 }}>{timeAgo(node.lastSeen)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Edit Button + Actions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: 14,
                      borderTop: '1px solid #F1E9C8',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {/* EDIT BUTTON */}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenEdit(node)}
                        style={{
                          padding: '5px 11px',
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          background: '#FFFBEA',
                          border: '1px solid #F4D35E',
                          color: '#4A4200',
                        }}
                        title="Edit Node, Location, and Coordinates"
                      >
                        <Edit3 size={12} /> Edit
                      </button>

                      {hasCoords && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedMapNodeId(node.nodeId);
                            if (viewMode === 'grid') setViewMode('split');
                            document.getElementById('node-map-section')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          style={{
                            padding: '5px 9px',
                            fontSize: 11,
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                          title="Locate on Map"
                        >
                          <Navigation size={11} /> Locate
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteNode(node.nodeId, node.name)}
                      disabled={actionLoading}
                      style={{
                        background: 'none',
                        border: '1px solid rgba(232, 120, 120, 0.4)',
                        color: '#E87878',
                        borderRadius: 8,
                        padding: '5px 10px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
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

      {/* ── Add Node Modal ───────────────────────────────────────────── */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(52, 52, 52, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 520,
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: 24,
              boxShadow: '0 12px 32px rgba(210, 190, 100, 0.25)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-heading)' }}>
                  Register New Sensor Node
                </h3>
                <p className="text-xs text-muted" style={{ marginTop: 2 }}>
                  Add a new station with GPS latitude & longitude to your environmental network.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-label)' }}
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div
                style={{
                  background: 'rgba(232, 120, 120, 0.14)',
                  border: '1px solid #E87878',
                  color: '#b91c1c',
                  borderRadius: 8,
                  padding: '8px 12px',
                  marginBottom: 16,
                  fontSize: 12,
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
              <div style={{ background: '#FFFDF3', border: '1px solid #F1E9C8', borderRadius: 12, padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <MapPin size={13} color="#9a6700" /> Geographic Coordinates (Latitude & Longitude)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleGetDeviceLocation(setNewNodeLat, setNewNodeLng)}
                    style={{
                      background: '#FFF8D9',
                      border: '1px solid #F4D35E',
                      color: '#4A4200',
                      borderRadius: 6,
                      padding: '3px 8px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Crosshair size={11} /> My GPS
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
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
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10.5, color: 'var(--color-text-label)', alignSelf: 'center' }}>Presets:</span>
                    <button
                      type="button"
                      onClick={() => applyPresetCoords(20.2961, 85.8245, 'Central Station', setNewNodeLat, setNewNodeLng, setNewNodeLocation)}
                      style={{ fontSize: 10, padding: '2px 6px', background: '#FFFFFF', border: '1px solid #E4E0F4', borderRadius: 4, cursor: 'pointer' }}
                    >
                      Bhubaneswar Central
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetCoords(22.2536, 84.9012, 'BPUT Campus Rourkela', setNewNodeLat, setNewNodeLng, setNewNodeLocation)}
                      style={{ fontSize: 10, padding: '2px 6px', background: '#FFFFFF', border: '1px solid #E4E0F4', borderRadius: 4, cursor: 'pointer' }}
                    >
                      BPUT Rourkela
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAddShowMiniMap(!addShowMiniMap)}
                    style={{
                      fontSize: 11,
                      color: '#7D70D8',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      textDecoration: 'underline',
                    }}
                  >
                    {addShowMiniMap ? 'Hide Map Picker' : '🗺️ Pick on Map'}
                  </button>
                </div>

                {/* Embedded Mini Map Picker */}
                {addShowMiniMap && (
                  <div style={{ marginTop: 12 }}>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Register Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Node Modal ──────────────────────────────────────────── */}
      {editModalOpen && editingNode && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(52, 52, 52, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 520,
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: 24,
              boxShadow: '0 12px 32px rgba(210, 190, 100, 0.25)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-heading)' }}>
                  Edit Node Configuration
                </h3>
                <p className="text-xs text-muted" style={{ marginTop: 2 }}>
                  Update station name, location, online status, and GPS coordinates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-label)' }}
              >
                <X size={18} />
              </button>
            </div>

            {editModalError && (
              <div
                style={{
                  background: 'rgba(232, 120, 120, 0.14)',
                  border: '1px solid #E87878',
                  color: '#b91c1c',
                  borderRadius: 8,
                  padding: '8px 12px',
                  marginBottom: 16,
                  fontSize: 12,
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
                  style={{ background: '#F8F8F8', color: 'var(--color-text-secondary)', cursor: 'not-allowed', fontFamily: 'monospace' }}
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
              <div style={{ background: '#FFFDF3', border: '1px solid #F1E9C8', borderRadius: 12, padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <MapPin size={13} color="#9a6700" /> GPS Coordinates (Latitude & Longitude)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleGetDeviceLocation(setEditNodeLat, setEditNodeLng)}
                    style={{
                      background: '#FFF8D9',
                      border: '1px solid #F4D35E',
                      color: '#4A4200',
                      borderRadius: 6,
                      padding: '3px 8px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Crosshair size={11} /> My GPS
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
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
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10.5, color: 'var(--color-text-label)', alignSelf: 'center' }}>Presets:</span>
                    <button
                      type="button"
                      onClick={() => applyPresetCoords(20.2961, 85.8245, null, setEditNodeLat, setEditNodeLng, null)}
                      style={{ fontSize: 10, padding: '2px 6px', background: '#FFFFFF', border: '1px solid #E4E0F4', borderRadius: 4, cursor: 'pointer' }}
                    >
                      Bhubaneswar (20.2961, 85.8245)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetCoords(22.2536, 84.9012, null, setEditNodeLat, setEditNodeLng, null)}
                      style={{ fontSize: 10, padding: '2px 6px', background: '#FFFFFF', border: '1px solid #E4E0F4', borderRadius: 4, cursor: 'pointer' }}
                    >
                      BPUT Rourkela (22.2536, 84.9012)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditShowMiniMap(!editShowMiniMap)}
                    style={{
                      fontSize: 11,
                      color: '#7D70D8',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      textDecoration: 'underline',
                    }}
                  >
                    {editShowMiniMap ? 'Hide Map Picker' : '🗺️ Pick on Map'}
                  </button>
                </div>

                {/* Mini Map Picker */}
                {editShowMiniMap && (
                  <div style={{ marginTop: 12 }}>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
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
