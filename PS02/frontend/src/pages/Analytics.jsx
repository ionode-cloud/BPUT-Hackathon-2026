import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import HeatStressChart from '../components/HeatStressChart';
import { LineChart as LineChartIcon, RefreshCw, Radio } from 'lucide-react';

export default function Analytics() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState('MASTER-01');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await dashboardAPI.getHeatStress({ nodeId: selectedNode, limit: 24 });
      setData(res?.data || []);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedNode]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Node Filter Bar */}
      <div className="card" style={{ padding: '12px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-teal)' }}>
              CHART TELEMETRY STREAM:
            </span>
            {['MASTER-01', 'SLAVE-01', 'SLAVE-02'].map((id) => (
              <button
                key={id}
                onClick={() => setSelectedNode(id)}
                className={`btn ${selectedNode === id ? 'btn-primary' : 'btn-outline'} btn-sm`}
              >
                <Radio size={12} />
                <span>{id}</span>
              </button>
            ))}
          </div>

          <button onClick={fetchData} className="btn btn-outline btn-sm">
            <RefreshCw size={12} />
            <span>Refresh Analytics</span>
          </button>
        </div>
      </div>

      {/* Grid of all 7 Trends */}
      <div className="grid-2">
        {/* 1. Temperature Trend */}
        <HeatStressChart
          title="1. Temperature Trend (BME688)"
          data={data}
          primaryKey="temperature"
          primaryName="Ambient Temp"
          primaryUnit="°C"
          height={210}
        />

        {/* 2. WBGT Trend */}
        <HeatStressChart
          title="2. WBGT Trend (Wet Bulb Globe Temp)"
          data={data}
          primaryKey="wbgt"
          primaryName="WBGT Index"
          primaryUnit="°C"
          secondaryKey="heatIndex"
          secondaryName="Heat Index"
          secondaryUnit="°C"
          height={210}
        />

        {/* 3. Heat Index Trend */}
        <HeatStressChart
          title="3. Heat Index Trend (NOAA Equation)"
          data={data}
          primaryKey="heatIndex"
          primaryName="Heat Index"
          primaryUnit="°C"
          height={210}
        />

        {/* 4. Humidity Trend */}
        <HeatStressChart
          title="4. Humidity Trend (%RH)"
          data={data}
          primaryKey="humidity"
          primaryName="Relative Humidity"
          primaryUnit="%RH"
          height={210}
        />

        {/* 5. Radiant Temperature Trend */}
        <HeatStressChart
          title="5. Radiant Temperature Trend (DS18B20 Black Globe)"
          data={data}
          primaryKey="radiantHeat"
          primaryName="Mean Radiant Temp"
          primaryUnit="°C"
          height={210}
        />

        {/* 6. Wind Speed Trend */}
        <HeatStressChart
          title="6. Wind Speed Trend (Anemometer)"
          data={data}
          primaryKey="windSpeed"
          primaryName="Wind Speed"
          primaryUnit="m/s"
          height={210}
        />
      </div>

      {/* 7. Surface Temperature Trend (Full Width) */}
      <HeatStressChart
        title="7. Surface Temperature Trend (MLX90640 32x24 Thermal Array)"
        data={data}
        primaryKey="surfaceTemperature"
        primaryName="Roof / Wall Surface Temp"
        primaryUnit="°C"
        secondaryKey="radiantHeat"
        secondaryName="Radiant Heat Proxy"
        secondaryUnit="°C"
        height={220}
      />
    </div>
  );
}
