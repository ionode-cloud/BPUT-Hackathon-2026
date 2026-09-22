import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #D9D9D9',
          borderRadius: '4px',
          padding: '8px 12px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          fontSize: '11px',
        }}
      >
        <div style={{ color: '#8A8A8A', marginBottom: '4px', fontWeight: 600 }}>{label}</div>
        {payload.map((item, idx) => (
          <div
            key={idx}
            style={{ color: item.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span style={{ width: '8px', height: '8px', backgroundColor: item.color, display: 'inline-block', borderRadius: '2px' }} />
            <span>{item.name}:</span>
            <span>{typeof item.value === 'number' ? item.value.toFixed(1) : item.value} {item.unit || ''}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function HeatStressChart({
  title,
  data = [],
  primaryKey,
  primaryName,
  primaryUnit = '°C',
  secondaryKey,
  secondaryName,
  secondaryUnit = '%',
  height = 240,
  syncId,
}) {
  const formattedData = data.map((d) => ({
    ...d,
    displayTime: d.timestamp
      ? new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.time || '',
  }));

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{title}</div>
        <div className="card-subtitle">24-Hour Telemetry Series</div>
      </div>

      {/* Explicit block div with pixel height — required for ResponsiveContainer to measure */}
      <div style={{ display: 'block', width: '100%', height: `${height}px` }}>
        {formattedData.length === 0 ? (
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#B0B0B0', fontSize: '12px', fontStyle: 'italic',
          }}>
            No telemetry data — POST a reading via API to populate this chart.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData} syncId={syncId} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="#E0E0E0" strokeDasharray="0" vertical={false} horizontal={true} />
              <XAxis
                dataKey="displayTime"
                stroke="#8A8A8A"
                tickLine={false}
                tick={{ fontSize: 10, fill: '#8A8A8A' }}
                dy={5}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#8A8A8A"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: '#8A8A8A' }}
                width={38}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '11px', top: -8 }} />

              <Line
                type="monotone"
                dataKey={primaryKey}
                name={primaryName || primaryKey}
                stroke="#3D8888"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#3D8888', stroke: '#FFFFFF', strokeWidth: 2 }}
                unit={primaryUnit}
                isAnimationActive={false}
              />

              {secondaryKey && (
                <Line
                  type="monotone"
                  dataKey={secondaryKey}
                  name={secondaryName || secondaryKey}
                  stroke="#A8DA65"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#A8DA65', stroke: '#FFFFFF', strokeWidth: 2 }}
                  unit={secondaryUnit}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
