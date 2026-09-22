import React from 'react';
import { Cpu, TrendingUp, Clock } from 'lucide-react';

export default function PredictionPanel({ predictionData }) {
  const current = predictionData?.current;
  const forecasts = predictionData?.forecasts || [];

  const defaultHorizonSteps = [
    { horizon: '+15 min' },
    { horizon: '+30 min' },
    { horizon: '+45 min' },
    { horizon: '+60 min' },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <Cpu size={16} />
          <span>Short-Horizon Heat Prediction</span>
        </div>
        <span className="card-subtitle">
          Autoregressive Thermal-Inertia Model • Arduino UNO Q
        </span>
      </div>

      <div className="prediction-panel">
        {/* Meta Bar */}
        <div className="prediction-meta-bar">
          <div className="prediction-engine-tag">
            <span className="sidebar-edge-dot" />
            <span>Engine: Qualcomm Dragonwing QRB2210 Linux (Zero Cloud APIs)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ color: '#8A8A8A' }}>
              Current Temp: <strong style={{ color: '#173B5A' }}>{current?.temperature != null ? `${current.temperature}°C` : '-'}</strong>
            </span>
            <span style={{ color: '#8A8A8A' }}>
              Current WBGT: <strong style={{ color: '#173B5A' }}>{current?.wbgt != null ? `${current.wbgt}°C` : '-'}</strong>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: predictionData?.riskTrend ? '#D96C6C' : '#8A8A8A', fontWeight: 700 }}>
              <TrendingUp size={14} />
              <span>Trend: {predictionData?.riskTrend || '-'}</span>
            </span>
          </div>
        </div>

        {/* Prediction Steps */}
        <div className="prediction-grid">
          {forecasts.length > 0 ? (
            forecasts.map((f, i) => {
              const isDangerous = f.riskLevel === 'Dangerous';
              return (
                <div
                  key={i}
                  className={`prediction-step-card ${isDangerous ? 'active-step' : ''}`}
                >
                  <div className="prediction-horizon-label">
                    <Clock size={11} style={{ display: 'inline', marginRight: '4px' }} />
                    {f.horizon}
                  </div>
                  <div className="prediction-temp">{f.predictedTemp}°C</div>
                  <div className="prediction-wbgt">WBGT: {f.predictedWbgt}°C</div>
                  <div style={{ marginTop: '8px' }}>
                    <span
                      className={`status-badge ${f.riskLevel?.toLowerCase() || 'moderate'}`}
                      style={{ fontSize: '10px' }}
                    >
                      {f.riskLevel}
                    </span>
                  </div>
                  <div className="prediction-delta">{f.heatDelta} rise</div>
                </div>
              );
            })
          ) : (
            defaultHorizonSteps.map((step, i) => (
              <div key={i} className="prediction-step-card">
                <div className="prediction-horizon-label">
                  <Clock size={11} style={{ display: 'inline', marginRight: '4px' }} />
                  {step.horizon}
                </div>
                <div className="prediction-temp">-</div>
                <div className="prediction-wbgt">WBGT: -</div>
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#8A8A8A' }}>-</span>
                </div>
                <div className="prediction-delta" style={{ color: '#8A8A8A' }}>Awaiting telemetry</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
