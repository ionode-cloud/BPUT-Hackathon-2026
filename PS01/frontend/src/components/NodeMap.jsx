import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin, Maximize2, Minimize2, Layers, Radio,
  Activity, ExternalLink, Edit3, Copy, Check,
  Compass, Wifi, WifiOff, Star, X, Eye, ShieldCheck,
  ChevronRight, RefreshCw, Zap
} from 'lucide-react';
import { timeAgo } from '../utils/thresholds';

/**
 * Base map tile layer provider: OpenStreetMap
 */
const OSM_TILE_CONFIG = {
  name: 'OpenStreetMap',
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  options: {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
};


/**
 * Creates custom animated marker HTML for nodes
 */
function createNodeDivIcon(node, isSelected = false) {
  const isMaster = Boolean(node.isMaster);
  const isOnline = node.status === 'online';
  const statusClass = isMaster ? 'pin-master' : isOnline ? 'pin-online' : 'pin-offline';
  const selectedClass = isSelected ? 'pin-selected' : '';

  const html = `
    <div class="node-map-marker ${statusClass} ${selectedClass}">
      <div class="marker-pulse"></div>
      <div class="marker-core">
        ${isMaster ? '<span class="marker-star">★</span>' : `<span class="marker-num">${node.nodeNumber || '•'}</span>`}
      </div>
      <div class="marker-stem"></div>
      <div class="marker-label">${node.name || node.nodeId}</div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html,
    iconSize: [42, 50],
    iconAnchor: [21, 46],
    popupAnchor: [0, -44],
  });
}

/**
 * Creates custom marker icon for Coordinate Picker mode
 */
function createPickerDivIcon() {
  const html = `
    <div class="picker-map-marker">
      <div class="picker-pulse"></div>
      <div class="picker-core">📍</div>
      <div class="picker-stem"></div>
      <div class="picker-label">Selected GPS Location</div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html,
    iconSize: [38, 48],
    iconAnchor: [19, 44],
    popupAnchor: [0, -40],
  });
}

export default function NodeMap({
  nodes = [],
  selectedNodeId = null,
  onSelectNode = null,
  onEditNode = null,
  isPickerMode = false,
  pickerCoords = null,
  onPickCoords = null,
  height = '440px',
}) {
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersGroupRef = useRef(null);
  const coverageGroupRef = useRef(null);
  const meshGroupRef = useRef(null);
  const pickerMarkerRef = useRef(null);

  // Local interactive states
  const [showCoverage, setShowCoverage] = useState(true);
  const [showMesh, setShowMesh] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [selectedNodeData, setSelectedNodeData] = useState(null);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up existing Leaflet instance if bound
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Safeguard for React StrictMode duplicate initialization
    if (mapContainerRef.current._leaflet_id) {
      delete mapContainerRef.current._leaflet_id;
    }

    const defaultCenter = [20.2961, 85.8245];
    const defaultZoom = 13;

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: false, // We'll add custom positioned zoom control
      attributionControl: true,
      maxBoundsViscosity: 0.8,
    });

    // Add zoom control top-left
    L.control.zoom({ position: 'topleft' }).addTo(map);

    // Set OpenStreetMap as the only base tile layer
    const tileLayer = L.tileLayer(OSM_TILE_CONFIG.url, OSM_TILE_CONFIG.options).addTo(map);
    tileLayerRef.current = tileLayer;

    // Layer groups for overlay management
    coverageGroupRef.current = L.layerGroup().addTo(map);
    meshGroupRef.current = L.layerGroup().addTo(map);
    markersGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Trigger size invalidation after mount
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Run once on mount


  // 3. Handle Map Clicks in Picker Mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e) => {
      if (isPickerMode && onPickCoords) {
        onPickCoords({
          lat: parseFloat(e.latlng.lat.toFixed(6)),
          lng: parseFloat(e.latlng.lng.toFixed(6)),
        });
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isPickerMode, onPickCoords]);

  // 4. Update Node Markers & Overlays
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || isPickerMode) return;

    const markersGroup = markersGroupRef.current;
    const coverageGroup = coverageGroupRef.current;
    const meshGroup = meshGroupRef.current;

    if (!markersGroup || !coverageGroup || !meshGroup) return;

    markersGroup.clearLayers();
    coverageGroup.clearLayers();
    meshGroup.clearLayers();

    const validNodes = nodes.filter(
      (n) => n.latitude != null && n.longitude != null && !isNaN(n.latitude) && !isNaN(n.longitude)
    );

    const masterNode = validNodes.find((n) => n.isMaster) || validNodes[0];
    const latLngBounds = [];

    validNodes.forEach((node) => {
      const lat = Number(node.latitude);
      const lng = Number(node.longitude);
      latLngBounds.push([lat, lng]);

      const isSelected = selectedNodeId === node.nodeId;
      const isMaster = Boolean(node.isMaster);
      const isOnline = node.status === 'online';

      // ── A. Coverage Range Radii ─────────────────────────────
      if (showCoverage) {
        const radiusMeters = isMaster ? 750 : 420;
        const color = isMaster ? '#059669' : isOnline ? '#10B981' : '#F43F5E';
        const fillOpacity = isMaster ? 0.14 : 0.08;

        const circle = L.circle([lat, lng], {
          radius: radiusMeters,
          color,
          weight: 1.5,
          opacity: 0.6,
          fillColor: color,
          fillOpacity,
          dashArray: isMaster ? undefined : '4, 4',
        });
        coverageGroup.addLayer(circle);
      }

      // ── B. IoT Mesh Telemetry Links to Master ──────────────
      if (showMesh && masterNode && !isMaster) {
        const mLat = Number(masterNode.latitude);
        const mLng = Number(masterNode.longitude);

        const distanceMeters = Math.round(map.distance([mLat, mLng], [lat, lng]));
        const distanceLabel = distanceMeters > 1000
          ? `${(distanceMeters / 1000).toFixed(2)} km`
          : `${distanceMeters} m`;

        const polyline = L.polyline([[mLat, mLng], [lat, lng]], {
          color: isOnline ? '#059669' : '#94A3B8',
          weight: 2,
          opacity: isOnline ? 0.75 : 0.45,
          className: 'airsense-mesh-line',
        });

        polyline.bindTooltip(
          `Telemetry Link: ${node.name || node.nodeId} ⇄ Master (${distanceLabel})`,
          { direction: 'top', className: 'mesh-link-tooltip', sticky: true }
        );

        meshGroup.addLayer(polyline);
      }

      // ── C. Marker Creation ─────────────────────────────────
      const icon = createNodeDivIcon(node, isSelected);
      const marker = L.marker([lat, lng], {
        icon,
        zIndexOffset: isMaster ? 200 : isSelected ? 300 : 50,
      });

      const lr = node.latestReading;
      const popupHtml = `
        <div class="node-map-popup">
          <div class="popup-header">
            <div class="popup-title-wrap">
              <h4 class="popup-title">${node.name || `Node ${node.nodeNumber}`}</h4>
              <span class="popup-node-id">${node.nodeId}</span>
            </div>
            ${isMaster ? '<span class="popup-badge-master">★ MASTER</span>' : ''}
            <span class="popup-badge-status ${isOnline ? 'status-online' : 'status-offline'}">
              ${isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <div class="popup-location-row">
            <span class="popup-loc-icon">📍</span>
            <span class="popup-loc-text">${node.location || 'Station Location'}</span>
          </div>

          <div class="popup-coords-row">
            <code>${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E</code>
          </div>

          <div class="popup-metrics-grid">
            <div class="metric-pill">
              <span class="metric-key">Temp</span>
              <span class="metric-val" style="color: #F43F5E">${lr?.temperature != null ? `${lr.temperature}°C` : '—'}</span>
            </div>
            <div class="metric-pill">
              <span class="metric-key">Humidity</span>
              <span class="metric-val" style="color: #0EA5E9">${lr?.humidity != null ? `${lr.humidity}%` : '—'}</span>
            </div>
            <div class="metric-pill">
              <span class="metric-key">PM2.5</span>
              <span class="metric-val" style="color: #10B981">${lr?.pm25 != null ? `${lr.pm25}` : '—'}</span>
            </div>
            <div class="metric-pill">
              <span class="metric-key">CO₂</span>
              <span class="metric-val" style="color: #8B5CF6">${lr?.co2 != null ? `${lr.co2}` : '—'}</span>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        minWidth: 260,
        maxWidth: 320,
        className: 'airsense-leaflet-popup',
      });

      marker.on('click', () => {
        setSelectedNodeData(node);
        if (onSelectNode) onSelectNode(node);
      });

      markersGroup.addLayer(marker);
    });

    // Auto fit bounds on initial load if not actively focused
    if (latLngBounds.length > 0 && !selectedNodeId) {
      if (latLngBounds.length === 1) {
        map.setView(latLngBounds[0], 14);
      } else {
        map.fitBounds(latLngBounds, { padding: [55, 55], maxZoom: 16 });
      }
    }
  }, [nodes, selectedNodeId, showCoverage, showMesh, isPickerMode, onSelectNode]);

  // 5. Sync Selected Node prop to local card state & smooth flyTo
  useEffect(() => {
    if (!selectedNodeId) {
      setSelectedNodeData(null);
      return;
    }

    const node = nodes.find((n) => n.nodeId === selectedNodeId);
    if (node) {
      setSelectedNodeData(node);
      const map = mapInstanceRef.current;
      if (map && node.latitude != null && node.longitude != null) {
        map.flyTo([Number(node.latitude), Number(node.longitude)], 15, {
          duration: 1.0,
        });
      }
    }
  }, [selectedNodeId, nodes]);

  // 6. Handle Picker Marker in Picker Mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isPickerMode) return;

    if (pickerCoords && pickerCoords.lat && pickerCoords.lng) {
      const latLng = [Number(pickerCoords.lat), Number(pickerCoords.lng)];

      if (!pickerMarkerRef.current) {
        const marker = L.marker(latLng, {
          icon: createPickerDivIcon(),
          draggable: true,
          zIndexOffset: 1000,
        }).addTo(map);

        marker.on('dragend', (e) => {
          const pos = e.target.getLatLng();
          if (onPickCoords) {
            onPickCoords({
              lat: parseFloat(pos.lat.toFixed(6)),
              lng: parseFloat(pos.lng.toFixed(6)),
            });
          }
        });

        pickerMarkerRef.current = marker;
      } else {
        pickerMarkerRef.current.setLatLng(latLng);
      }
      map.setView(latLng, 14);
    } else {
      if (pickerMarkerRef.current) {
        pickerMarkerRef.current.remove();
        pickerMarkerRef.current = null;
      }
    }
  }, [isPickerMode, pickerCoords, onPickCoords]);

  // 7. Invalidate size on Height or Fullscreen Change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [height, isFullscreen]);

  // Helper: Fit all nodes on the map
  const handleFitAll = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const validNodes = nodes.filter(
      (n) => n.latitude != null && n.longitude != null && !isNaN(n.latitude) && !isNaN(n.longitude)
    );

    if (validNodes.length > 0) {
      const bounds = validNodes.map((n) => [Number(n.latitude), Number(n.longitude)]);
      if (bounds.length === 1) {
        map.setView(bounds[0], 14);
      } else {
        map.fitBounds(bounds, { padding: [55, 55], maxZoom: 16 });
      }
    } else {
      map.setView([20.2961, 85.8245], 13);
    }
  };

  // Helper: Fly to specific node
  const handleFocusNode = (node) => {
    setSelectedNodeData(node);
    if (onSelectNode) onSelectNode(node);
    const map = mapInstanceRef.current;
    if (map && node.latitude != null && node.longitude != null) {
      map.flyTo([Number(node.latitude), Number(node.longitude)], 15.5, {
        duration: 0.9,
      });
    }
  };

  // Helper: Copy coordinates to clipboard
  const handleCopyCoords = (lat, lng) => {
    const text = `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
    navigator.clipboard?.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const validNodesWithCoords = nodes.filter(
    (n) => n.latitude != null && n.longitude != null && !isNaN(n.latitude) && !isNaN(n.longitude)
  );

  return (
    <div
      className={`node-map-wrapper ${isFullscreen ? 'airsense-map-fullscreen' : ''}`}
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: isFullscreen ? 0 : 20,
        overflow: 'hidden',
        border: isFullscreen ? 'none' : '1.5px solid var(--color-border)',
        boxShadow: isFullscreen ? 'none' : 'var(--shadow-card)',
        background: '#FFFFFF',
        transition: 'all 0.25s ease',
      }}
    >
      {/* ── Top Map Header & Controls Strip ───────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 18px',
          background: '#FFFFFF',
          borderBottom: '1px solid var(--color-border)',
          flexWrap: 'wrap',
          gap: 12,
          zIndex: 10,
          position: 'relative',
        }}
      >
        {/* Left: Map title & live status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
            }}
          >
            <Compass size={18} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-heading)', display: 'flex', alignItems: 'center', gap: 8 }}>
              Geo-Spatial Telemetry Map
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 999,
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#059669',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                LIVE GPS
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 1 }}>
              {validNodesWithCoords.length} of {nodes.length} stations mapped with GPS telemetry
            </div>
          </div>
        </div>

        {/* Right: Interactive Tools & View Layer Switcher */}
        {!isPickerMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* OpenStreetMap Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#F1F5F9',
                padding: '5px 12px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                fontSize: 11.5,
                fontWeight: 700,
                color: 'var(--color-heading)',
              }}
              title="Base map powered by OpenStreetMap"
            >
              <span style={{ fontSize: 13 }}>🌍</span>
              <span>OpenStreetMap</span>
            </div>


            {/* Overlays Toggles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={() => setShowCoverage(!showCoverage)}
                className={`btn btn-sm ${showCoverage ? 'btn-primary' : 'btn-secondary'}`}
                title="Toggle Station RF Coverage Radii"
                style={{
                  padding: '5px 10px',
                  fontSize: 11,
                  borderRadius: 8,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Radio size={12} />
                <span>Radius</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMesh(!showMesh)}
                className={`btn btn-sm ${showMesh ? 'btn-primary' : 'btn-secondary'}`}
                title="Toggle Star-Mesh Telemetry Links to Master"
                style={{
                  padding: '5px 10px',
                  fontSize: 11,
                  borderRadius: 8,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Zap size={12} />
                <span>Mesh</span>
              </button>
            </div>

            {/* Fit All */}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleFitAll}
              title="Recenter and fit all stations in view"
              style={{
                padding: '5px 11px',
                fontSize: 11.5,
                fontWeight: 700,
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Maximize2 size={13} /> Fit All
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'View Map Fullscreen'}
              style={{
                padding: '5px 10px',
                fontSize: 11.5,
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              {isFullscreen ? 'Exit' : 'Full'}
            </button>
          </div>
        )}
      </div>

      {/* ── Station Quick-Focus Ribbon ─────────────────────────────── */}
      {!isPickerMode && validNodesWithCoords.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 18px',
            background: '#F8FAFC',
            borderBottom: '1px solid var(--color-border)',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            zIndex: 9,
            position: 'relative',
          }}
        >
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-text-label)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Quick Focus:
          </span>

          <button
            type="button"
            onClick={handleFitAll}
            style={{
              background: !selectedNodeData ? 'rgba(16, 185, 129, 0.15)' : '#FFFFFF',
              color: !selectedNodeData ? '#059669' : 'var(--color-text-secondary)',
              border: `1px solid ${!selectedNodeData ? 'rgba(16, 185, 129, 0.35)' : 'var(--color-border)'}`,
              borderRadius: 6,
              padding: '3px 9px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.15s ease',
            }}
          >
            All Stations ({validNodesWithCoords.length})
          </button>

          {validNodesWithCoords.map((n) => {
            const isCurr = selectedNodeData?.nodeId === n.nodeId;
            return (
              <button
                key={n.nodeId}
                type="button"
                onClick={() => handleFocusNode(n)}
                style={{
                  background: isCurr ? 'rgba(16, 185, 129, 0.18)' : '#FFFFFF',
                  color: isCurr ? '#059669' : 'var(--color-text-secondary)',
                  border: `1px solid ${isCurr ? '#059669' : 'var(--color-border)'}`,
                  borderRadius: 6,
                  padding: '3px 9px',
                  fontSize: 11,
                  fontWeight: isCurr ? 800 : 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: isCurr ? '0 2px 6px rgba(16, 185, 129, 0.18)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: n.isMaster ? '#059669' : n.status === 'online' ? '#10B981' : '#F43F5E',
                  }}
                />
                <span>{n.name || n.nodeId}</span>
                {n.isMaster && <span style={{ color: '#D97706', fontSize: 10 }}>★</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Main Map Canvas Container ──────────────────────────────── */}
      <div
        ref={mapContainerRef}
        className="node-map-canvas"
        style={{
          width: '100%',
          height: isFullscreen ? 'calc(100vh - 110px)' : height,
          zIndex: 1,
          background: '#E2E8F0',
        }}
      />

      {/* ── Floating Station Telemetry HUD Card ───────────────────── */}
      {!isPickerMode && selectedNodeData && (
        <div className="node-floating-hud">
          <div className="node-floating-hud-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--color-heading)' }}>
                  {selectedNodeData.name || selectedNodeData.nodeId}
                </h4>
                {selectedNodeData.isMaster && (
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      color: '#FFFFFF',
                      fontSize: 9,
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: 999,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    ★ MASTER
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 10.5, fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-text-label)' }}>
                  {selectedNodeData.nodeId}
                </span>
                <span style={{ color: 'var(--color-border)' }}>•</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                  {selectedNodeData.location || 'Station Node'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedNodeData(null)}
              style={{
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                width: 26,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
              }}
              title="Close Station Card"
            >
              <X size={14} />
            </button>
          </div>

          {/* GPS Coordinates & Copy */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F8FAFC',
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              marginBottom: 10,
              fontSize: 11,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={12} color="#059669" />
              <code style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-heading)' }}>
                {Number(selectedNodeData.latitude).toFixed(5)}° N, {Number(selectedNodeData.longitude).toFixed(5)}° E
              </code>
            </div>

            <button
              type="button"
              onClick={() => handleCopyCoords(selectedNodeData.latitude, selectedNodeData.longitude)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: copiedCoords ? '#059669' : 'var(--color-text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10.5,
                fontWeight: 700,
              }}
              title="Copy GPS coordinates"
            >
              {copiedCoords ? <Check size={12} /> : <Copy size={12} />}
              {copiedCoords ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Real-time Telemetry Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 6,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: '6px 4px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-label)', textTransform: 'uppercase' }}>
                Temp
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#F43F5E', marginTop: 2 }}>
                {selectedNodeData.latestReading?.temperature != null ? `${selectedNodeData.latestReading.temperature}°C` : '—'}
              </div>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: '6px 4px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-label)', textTransform: 'uppercase' }}>
                Humidity
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#0EA5E9', marginTop: 2 }}>
                {selectedNodeData.latestReading?.humidity != null ? `${selectedNodeData.latestReading.humidity}%` : '—'}
              </div>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: '6px 4px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-label)', textTransform: 'uppercase' }}>
                PM2.5
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#10B981', marginTop: 2 }}>
                {selectedNodeData.latestReading?.pm25 != null ? selectedNodeData.latestReading.pm25 : '—'}
              </div>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: '6px 4px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-label)', textTransform: 'uppercase' }}>
                CO₂
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#8B5CF6', marginTop: 2 }}>
                {selectedNodeData.latestReading?.co2 != null ? selectedNodeData.latestReading.co2 : '—'}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
              Signal: {timeAgo(selectedNodeData.lastSeen)}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {onEditNode && (
                <button
                  type="button"
                  onClick={() => onEditNode(selectedNodeData)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    padding: '4px 9px',
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 7,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Edit3 size={11} /> Edit
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate(`/sensors?node=${selectedNodeData.nodeId}`)}
                className="btn btn-primary btn-sm"
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 7,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>Telemetry</span>
                <ChevronRight size={11} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Picker Mode Floating Ribbon ───────────────────────────── */}
      {isPickerMode && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.90)',
            color: '#FFFFFF',
            padding: '7px 18px',
            borderRadius: 999,
            fontSize: 11.5,
            fontWeight: 700,
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
          }}
        >
          <MapPin size={13} color="#10B981" />
          <span>Click anywhere or drag the pin to set GPS Latitude & Longitude</span>
        </div>
      )}
    </div>
  );
}
