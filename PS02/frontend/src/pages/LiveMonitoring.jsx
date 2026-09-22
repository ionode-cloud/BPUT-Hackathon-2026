import React, { useState, useEffect } from 'react';
import { readingsAPI, nodesAPI } from '../services/api';
import SensorCard from '../components/SensorCard';
import { RefreshCw, Radio, Server, Layers } from 'lucide-react';

export default function LiveMonitoring() {
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState('MASTER-01');
  const [loading, setLoading] = useState(true);
  const [latestData, setLatestData] = useState(null);

  const fetchLatest = async () => {
    try {
      setLoading(true);
      const [nodesRes, readingsRes] = await Promise.all([
        nodesAPI.getAll(),
        readingsAPI.getLatest(),
      ]);
      const fetchedNodes = nodesRes?.data || [];
      setNodes(fetchedNodes);
      setLatestData(readingsRes?.data?.nodes || {});
      if (fetchedNodes.length > 0) {
        setSelectedNode((prev) => {
          const exists = fetchedNodes.some((n) => n.nodeId === prev);
          return exists ? prev : fetchedNodes[0].nodeId;
        });
      }
    } catch (err) {
      console.error('Failed to fetch latest readings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatest();
    const interval = setInterval(fetchLatest, 10000);
    return () => clearInterval(interval);
  }, []);

  const currentReading = latestData?.[selectedNode] || {};

  const getStatusForValue = (type, val) => {
    if (val === undefined || val === null) return null;
    if (type === 'temp') {
      if (val < 32) return 'Safe';
      if (val <= 38) return 'Moderate';
      return 'Dangerous';
    }
    if (type === 'wbgt') {
      if (val < 27) return 'Safe';
      if (val <= 31) return 'Moderate';
      return 'Dangerous';
    }
    if (type === 'hi') {
      if (val < 35) return 'Safe';
      if (val <= 41) return 'Moderate';
      return 'Dangerous';
    }
    if (type === 'voc') {
      if (val < 100) return 'Safe';
      if (val <= 200) return 'Moderate';
      return 'Dangerous';
    }
    if (type === 'surf') {
      if (val < 42) return 'Safe';
      if (val <= 50) return 'Moderate';
      return 'Dangerous';
    }
    return null;
  };

  const timeStr = currentReading?.timestamp
    ? new Date(currentReading.timestamp).toLocaleTimeString()
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Node Selector Bar */}
      <div className="card" style={{ padding: '12px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-teal)' }}>
              MONITORED NODE:
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {nodes.map((node) => (
                <button
                  key={node.nodeId}
                  onClick={() => setSelectedNode(node.nodeId)}
                  className={`btn ${selectedNode === node.nodeId ? 'btn-primary' : 'btn-outline'} btn-sm`}
                >
                  <Radio size={12} />
                  <span>{node.nodeId}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Hardware Set: BME688 • DS18B20 • Anemometer • BH1750 • MLX90640
            </span>
            <button onClick={fetchLatest} className="btn btn-outline btn-sm">
              <RefreshCw size={12} />
              <span>Poll</span>
            </button>
          </div>
        </div>
      </div>

      {/* 10 Core Sensor Cards */}
      <div className="sensor-cards-grid">
        {/* 1. Temperature */}
        <SensorCard
          sensorName="Temperature (BME688)"
          value={currentReading.temperature}
          unit="°C"
          status={getStatusForValue('temp', currentReading.temperature)}
          nodeId={selectedNode}
          lastUpdated={timeStr}
        />

        {/* 2. Humidity */}
        <SensorCard
          sensorName="Humidity (BME688)"
          value={currentReading.humidity}
          unit="%RH"
          status={currentReading.humidity != null ? (currentReading.humidity > 70 ? 'Moderate' : 'Safe') : null}
          nodeId={selectedNode}
          lastUpdated={timeStr}
        />

        {/* 3. VOC Index */}
        <SensorCard
          sensorName="VOC / Gas Index (BME688)"
          value={currentReading.voc}
          unit="IAQ"
          status={getStatusForValue('voc', currentReading.voc)}
          nodeId={selectedNode}
          lastUpdated={timeStr}
        />

        {/* 4. Radiant Heat */}
        <SensorCard
          sensorName="Radiant Heat (DS18B20)"
          value={currentReading.radiantHeat}
          unit="°C"
          status={currentReading.radiantHeat != null ? (currentReading.radiantHeat > 45 ? 'Dangerous' : 'Moderate') : null}
          nodeId={selectedNode}
          lastUpdated={timeStr}
        />

        {/* 5. Wind Speed */}
        <SensorCard
          sensorName="Wind Speed (Anemometer)"
          value={currentReading.windSpeed}
          unit="m/s"
          status={currentReading.windSpeed != null ? (currentReading.windSpeed < 1.0 ? 'Moderate' : 'Safe') : null}
          nodeId={selectedNode}
          lastUpdated={timeStr}
        />

        {/* 6. Wind Direction */}
        <SensorCard
          sensorName="Wind Direction (Vane)"
          value={currentReading.windDirection}
          unit="°"
          status={currentReading.windDirection != null ? 'Safe' : null}
          nodeId={selectedNode}
          lastUpdated={timeStr}
        />

        {/* 7. Light Intensity */}
        <SensorCard
          sensorName="Solar Load (BH1750)"
          value={currentReading.lightIntensity}
          unit="lux"
          status={currentReading.lightIntensity != null ? (currentReading.lightIntensity > 60000 ? 'Dangerous' : 'Safe') : null}
          nodeId={selectedNode}
          lastUpdated={timeStr}
        />

        {/* 8. Surface Temperature (MLX90640) */}
        <SensorCard
          sensorName="Surface Temp (MLX90640)"
          value={currentReading.surfaceTemperature}
          unit="°C"
          status={getStatusForValue('surf', currentReading.surfaceTemperature)}
          nodeId={selectedNode}
          lastUpdated={timeStr}
        />

        {/* 9. Heat Index */}
        <SensorCard
          sensorName="Heat Index (Edge AI)"
          value={currentReading.heatIndex}
          unit="°C"
          status={getStatusForValue('hi', currentReading.heatIndex)}
          nodeId={selectedNode}
          lastUpdated={timeStr}
        />

        {/* 10. WBGT */}
        <SensorCard
          sensorName="WBGT (Wet Bulb Globe)"
          value={currentReading.wbgt}
          unit="°C"
          status={getStatusForValue('wbgt', currentReading.wbgt)}
          nodeId={selectedNode}
          lastUpdated={timeStr}
        />
      </div>
    </div>
  );
}
