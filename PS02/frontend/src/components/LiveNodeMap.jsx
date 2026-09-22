import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Maximize2, Layers } from 'lucide-react';

export default function LiveNodeMap({
  nodes = [],
  latestReadings = {},
  selectedNodeId,
  onSelectNode,
  onMapClick,
  height = '420px',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const clickMarkerRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    // Default to Bhubaneswar Smart City center
    const defaultCenter = [20.2961, 85.8245];
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 14,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Map click handler for picking coordinates
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      const roundedLat = parseFloat(lat.toFixed(5));
      const roundedLng = parseFloat(lng.toFixed(5));

      // Show temporary pin where clicked
      if (clickMarkerRef.current) {
        map.removeLayer(clickMarkerRef.current);
      }

      const tempIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="width: 14px; height: 14px; border-radius: 50%; background: #EF4444; border: 2px solid #FFFFFF; box-shadow: 0 0 8px rgba(239,68,68,0.8);"></div>
            <div style="background: #111827; color: #FFFFFF; font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 3px; margin-top: 2px; white-space: nowrap;">
              Picked: ${roundedLat}, ${roundedLng}
            </div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 7],
      });

      clickMarkerRef.current = L.marker([roundedLat, roundedLng], { icon: tempIcon }).addTo(map);

      if (onMapClick) {
        onMapClick({ lat: roundedLat, lng: roundedLng });
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // Run once on mount

  // Update Markers when nodes or readings change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old markers
    Object.values(markersRef.current).forEach((marker) => map.removeLayer(marker));
    markersRef.current = {};

    const validCoordinates = [];

    nodes.forEach((node) => {
      const lat = node.latitude ?? 20.2961;
      const lng = node.longitude ?? 85.8245;
      validCoordinates.push([lat, lng]);

      const isSelected = selectedNodeId === node.nodeId;
      const isMaster = node.nodeType === 'master';
      const reading = latestReadings[node.nodeId];
      const risk = reading?.riskLevel || 'Safe';

      let markerBg = '#3D8888'; // Teal
      if (!isMaster) {
        if (node.status === 'offline') markerBg = '#9CA3AF';
        else if (risk === 'Dangerous') markerBg = '#D96C6C';
        else if (risk === 'Moderate') markerBg = '#E7C86A';
        else markerBg = '#4B6E1C';
      }

      const tempDisplay = reading?.temperature != null ? `${reading.temperature}°C` : '-';
      const wbgtDisplay = reading?.wbgt != null ? `${reading.wbgt}°C` : '-';

      const customHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; user-select: none;">
          ${
            isMaster
              ? '<div style="position: absolute; width: 42px; height: 42px; border-radius: 50%; background: #3D8888; opacity: 0.3; animation: pulse 2s infinite; top: -5px;"></div>'
              : ''
          }
          <div style="
            width: ${isSelected ? '36px' : '30px'};
            height: ${isSelected ? '36px' : '30px'};
            border-radius: 50%;
            background: ${markerBg};
            border: ${isSelected ? '3px solid #111827' : '2px solid #FFFFFF'};
            box-shadow: 0 3px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;
            font-size: ${isSelected ? '13px' : '11px'};
            font-weight: 900;
            transition: all 0.2s ease;
          ">
            ${isMaster ? 'M' : 'S'}
          </div>
          <div style="
            margin-top: 3px;
            background: #FFFFFF;
            border: 1px solid #D1D5DB;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 800;
            color: #173B5A;
            white-space: nowrap;
            box-shadow: 0 2px 5px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span>${node.nodeId}</span>
            <span style="color: ${markerBg}; font-weight: 700;">${tempDisplay}</span>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: customHtml,
        iconSize: [50, 56],
        iconAnchor: [25, 28],
        popupAnchor: [0, -28],
      });

      const popupContent = `
        <div style="font-family: inherit; font-size: 12px; color: #1F2937; min-width: 190px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #E5E7EB; padding-bottom: 6px; margin-bottom: 8px;">
            <strong style="font-size: 13px; color: #173B5A;">${node.nodeId}</strong>
            <span style="font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 3px; background: ${
              isMaster ? '#EBF4F4' : '#F3F4F6'
            }; color: ${isMaster ? '#3D8888' : '#4B5563'};">
              ${isMaster ? 'MASTER NODE' : 'SLAVE NODE'}
            </span>
          </div>
          <div style="font-size: 11px; color: #4B5563; margin-bottom: 6px;">
            ${node.nodeName}
          </div>
          <div style="font-size: 10px; color: #6B7280; margin-bottom: 8px;">
            📍 ${node.location}
          </div>
          <div style="background: #F9FAFB; padding: 6px 8px; border-radius: 4px; border: 1px solid #E5E7EB; margin-bottom: 8px; font-size: 11px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span style="color: #6B7280;">Air Temp:</span>
              <strong style="color: #173B5A;">${tempDisplay}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span style="color: #6B7280;">WBGT:</span>
              <strong style="color: ${risk === 'Dangerous' ? '#DC2626' : '#173B5A'};">${wbgtDisplay}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6B7280;">Risk:</span>
              <span style="font-weight: 700; color: ${
                risk === 'Dangerous' ? '#DC2626' : risk === 'Moderate' ? '#D97706' : '#16A34A'
              };">${risk}</span>
            </div>
          </div>
          <div style="font-size: 10px; color: #6B7280; display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>Coords: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°</span>
            <span>Bat: ${node.batteryLevel != null ? `${node.batteryLevel}%` : '-'}</span>
          </div>
          <button
            id="popup-btn-${node.nodeId}"
            style="
              width: 100%;
              background: #3D8888;
              color: #FFFFFF;
              border: none;
              padding: 5px 10px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 700;
              cursor: pointer;
            "
          >
            Select & Manage Node
          </button>
        </div>
      `;

      const marker = L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(popupContent);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`popup-btn-${node.nodeId}`);
        if (btn) {
          btn.onclick = () => {
            if (onSelectNode) onSelectNode(node.nodeId);
          };
        }
      });

      marker.on('click', () => {
        if (onSelectNode) onSelectNode(node.nodeId);
      });

      markersRef.current[node.nodeId] = marker;
    });

    // Auto-fit bounds if nodes exist
    if (validCoordinates.length > 0) {
      try {
        const bounds = L.latLngBounds(validCoordinates);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } catch (err) {
        console.error('FitBounds error:', err);
      }
    }
  }, [nodes, latestReadings, selectedNodeId, onSelectNode]);

  // Handle zooming to selected node
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedNodeId) return;

    const node = nodes.find((n) => n.nodeId === selectedNodeId);
    if (node && node.latitude != null && node.longitude != null) {
      map.flyTo([node.latitude, node.longitude], 15, { duration: 0.8 });
      const marker = markersRef.current[selectedNodeId];
      if (marker) {
        setTimeout(() => marker.openPopup(), 400);
      }
    }
  }, [selectedNodeId, nodes]);

  const fitAllNodes = () => {
    const map = mapInstanceRef.current;
    if (!map || nodes.length === 0) return;
    const coords = nodes
      .filter((n) => n.latitude != null && n.longitude != null)
      .map((n) => [n.latitude, n.longitude]);
    if (coords.length > 0) {
      map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 15 });
    }
  };

  return (
    <div className="card" style={{ padding: '14px', position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={16} color="var(--accent-teal)" />
          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Live Node Spatial Map — Real-Time Telemetry & Geographic Distribution
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: '#6B7280' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3D8888' }} />
              Master
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4B6E1C' }} />
              Safe
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E7C86A' }} />
              Moderate
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D96C6C' }} />
              Dangerous
            </span>
          </div>

          <button onClick={fitAllNodes} className="btn btn-outline btn-sm" title="Center map on all nodes">
            <Maximize2 size={11} />
            <span>Fit All</span>
          </button>
        </div>
      </div>

      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height,
          borderRadius: '6px',
          border: '1px solid #E5E7EB',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
          zIndex: 1,
        }}
      />
      <div style={{ marginTop: '6px', fontSize: '11px', color: '#8A8A8A', display: 'flex', justifyContent: 'space-between' }}>
        <span>💡 Click any map pin to view live telemetry or click anywhere on the map to pick coordinates for new slaves.</span>
        <span>OpenStreetMap Tiles • Local Edge AI</span>
      </div>
    </div>
  );
}
