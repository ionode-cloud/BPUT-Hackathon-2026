import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Maximize2 } from 'lucide-react';

/**
 * Creates custom HTML pin icon for nodes
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
 * Creates custom pin for coordinate picking mode
 */
function createPickerDivIcon() {
  const html = `
    <div class="picker-map-marker">
      <div class="picker-pulse"></div>
      <div class="picker-core">📍</div>
      <div class="picker-stem"></div>
      <div class="picker-label">Selected Location</div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html,
    iconSize: [36, 44],
    iconAnchor: [18, 40],
    popupAnchor: [0, -38],
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
  height = '420px',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const pickerMarkerRef = useRef(null);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Default center: Odisha / India (e.g. 20.2961, 85.8245)
    const defaultCenter = [20.2961, 85.8245];
    const defaultZoom = 13;

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: true,
      attributionControl: true,
    });

    // CartoDB Voyager tiles (crisp, warm pastel friendly)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
    }).addTo(map);

    mapInstanceRef.current = map;

    // Invalidate size on resize
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Handle map clicks in Picker Mode
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

  // 3. Render / Update Node Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    const validNodesWithCoords = nodes.filter(
      (n) => n.latitude !== null && n.longitude !== null && !isNaN(n.latitude) && !isNaN(n.longitude)
    );

    const latLngBounds = [];

    validNodesWithCoords.forEach((node) => {
      const lat = Number(node.latitude);
      const lng = Number(node.longitude);
      latLngBounds.push([lat, lng]);

      const isSelected = selectedNodeId === node.nodeId;
      const icon = createNodeDivIcon(node, isSelected);
      const marker = L.marker([lat, lng], { icon, zIndexOffset: node.isMaster ? 100 : 10 }).addTo(map);

      // Construct rich popup content
      const lr = node.latestReading;
      const popupHtml = `
        <div class="node-map-popup">
          <div class="popup-header">
            <div class="popup-title-wrap">
              <h4 class="popup-title">${node.name || `Node ${node.nodeNumber}`}</h4>
              <span class="popup-node-id">${node.nodeId}</span>
            </div>
            ${node.isMaster ? '<span class="popup-badge-master">★ MASTER</span>' : ''}
            <span class="popup-badge-status ${node.status === 'online' ? 'status-online' : 'status-offline'}">
              ${node.status === 'online' ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <div class="popup-location-row">
            <span class="popup-loc-icon">📍</span>
            <span class="popup-loc-text">${node.location || 'Monitoring Station'}</span>
          </div>

          <div class="popup-coords-row">
            <code>${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E</code>
          </div>

          <div class="popup-metrics-grid">
            <div class="metric-pill">
              <span class="metric-key">Temp</span>
              <span class="metric-val" style="color: #F5B84B">${lr?.temperature != null ? `${lr.temperature}°C` : '—'}</span>
            </div>
            <div class="metric-pill">
              <span class="metric-key">Humidity</span>
              <span class="metric-val" style="color: #5b9fa3">${lr?.humidity != null ? `${lr.humidity}%` : '—'}</span>
            </div>
            <div class="metric-pill">
              <span class="metric-key">PM2.5</span>
              <span class="metric-val" style="color: #62C89B">${lr?.pm25 != null ? `${lr.pm25}` : '—'}</span>
            </div>
            <div class="metric-pill">
              <span class="metric-key">CO₂</span>
              <span class="metric-val" style="color: #7D70D8">${lr?.co2 != null ? `${lr.co2}` : '—'}</span>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        minWidth: 250,
        maxWidth: 300,
        className: 'airsense-leaflet-popup',
      });

      marker.on('click', () => {
        if (onSelectNode) onSelectNode(node);
      });

      markersRef.current[node.nodeId] = marker;
    });

    // Auto fit bounds if nodes exist and not in active single-node focus
    if (latLngBounds.length > 0 && !selectedNodeId) {
      if (latLngBounds.length === 1) {
        map.setView(latLngBounds[0], 14);
      } else {
        map.fitBounds(latLngBounds, { padding: [45, 45], maxZoom: 16 });
      }
    }
  }, [nodes, selectedNodeId, onSelectNode]);

  // 4. Handle Focus / Selected Node change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedNodeId) return;

    const targetMarker = markersRef.current[selectedNodeId];
    const targetNode = nodes.find((n) => n.nodeId === selectedNodeId);

    if (targetNode && targetNode.latitude != null && targetNode.longitude != null) {
      const targetLatLng = [Number(targetNode.latitude), Number(targetNode.longitude)];
      map.flyTo(targetLatLng, 15, { duration: 1.0 });

      if (targetMarker) {
        setTimeout(() => {
          targetMarker.openPopup();
        }, 500);
      }
    }
  }, [selectedNodeId, nodes]);

  // 6. Handle Picker Marker in Picker Mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isPickerMode && pickerCoords && pickerCoords.lat && pickerCoords.lng) {
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
    } else {
      if (pickerMarkerRef.current) {
        pickerMarkerRef.current.remove();
        pickerMarkerRef.current = null;
      }
    }
  }, [isPickerMode, pickerCoords, onPickCoords]);

  // Recenter helper
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const validNodesWithCoords = nodes.filter(
      (n) => n.latitude !== null && n.longitude !== null && !isNaN(n.latitude) && !isNaN(n.longitude)
    );

    if (validNodesWithCoords.length > 0) {
      const bounds = validNodesWithCoords.map((n) => [Number(n.latitude), Number(n.longitude)]);
      if (bounds.length === 1) {
        map.setView(bounds[0], 14);
      } else {
        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
      }
    } else {
      map.setView([20.2961, 85.8245], 13);
    }
  };

  const nodesWithCoordsCount = nodes.filter(
    (n) => n.latitude != null && n.longitude != null && !isNaN(n.latitude) && !isNaN(n.longitude)
  ).length;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        background: '#FFFFFF',
      }}
    >
      {/* Top Map Header Strip */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 18px',
          background: '#FFFFFF',
          borderBottom: '1px solid var(--color-border)',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(244, 211, 94, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9a6700',
            }}
          >
            <MapPin size={17} />
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--color-heading)' }}>
              Geo-Spatial Node Network Map
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              Showing {nodesWithCoordsCount} of {nodes.length} stations with GPS coordinates
            </div>
          </div>
        </div>

        {/* Legend / Quick controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--color-text-secondary)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', border: '1px solid #2563EB' }}></span>
              Master Station
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-safe)' }}></span>
              Online
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-danger)' }}></span>
              Offline
            </span>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleRecenter}
            title="Recenter and fit all nodes"
            style={{ padding: '4px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <Maximize2 size={12} /> Fit All
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: height,
          zIndex: 1,
        }}
      />

      {/* Picker Mode Instruction Ribbon */}
      {isPickerMode && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(52, 52, 52, 0.88)',
            color: '#FFFFFF',
            padding: '7px 16px',
            borderRadius: 999,
            fontSize: 11.5,
            fontWeight: 600,
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
          }}
        >
          <MapPin size={13} color="var(--color-primary)" />
          Click anywhere on the map or drag the pin to set Latitude & Longitude
        </div>
      )}
    </div>
  );
}
