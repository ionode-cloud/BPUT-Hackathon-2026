import { useState, useMemo } from 'react';
import {
  MdTrendingUp,
  MdElectricBolt,
  MdWaterDrop,
  MdAir,
  MdDelete,
  MdAutoAwesome,
  MdThermostat,
  MdCalendarMonth,
  MdInsights,
  MdQueryStats,
} from 'react-icons/md';
import ChartBox from '../components/ChartBox';
import ExcelDownloadBtn from '../components/ExcelDownloadBtn';

export default function Forecasting({ data = {}, history = [] }) {
  const d = data || {};

  // Scenario Simulator state
  const [scenario, setScenario] = useState('baseline'); // 'baseline' | 'heatwave' | 'event' | 'storm'

  // Scenario multipliers
  const scenarioConfig = useMemo(() => {
    switch (scenario) {
      case 'heatwave':
        return {
          energyMult: 1.28,
          waterMult: 1.15,
          aqiDelta: 16,
          overflowHours: 3.2,
          name: 'Heatwave (+4°C Ambient)',
          desc: 'High cooling load active across chiller compressors; elevated ozone and particulate inversion.',
        };
      case 'event':
        return {
          energyMult: 1.35,
          waterMult: 1.45,
          aqiDelta: 8,
          overflowHours: 2.1,
          name: 'Campus Event (+40% Footfall)',
          desc: 'Large crowd gathered in auditorium and dining commons; surge in sanitation and water usage.',
        };
      case 'storm':
        return {
          energyMult: 0.88,
          waterMult: 0.75,
          aqiDelta: -14,
          overflowHours: 6.8,
          name: 'Monsoon Heavy Rain Inflow',
          desc: 'Rainwater harvesting charging reservoir; atmospheric scrubbing lowers AQI to pristine levels.',
        };
      default:
        return {
          energyMult: 1.0,
          waterMult: 1.0,
          aqiDelta: 0,
          overflowHours: 4.2,
          name: 'Baseline Standard Operation',
          desc: 'Standard academic and administrative facility schedule with calibrated diurnal cycles.',
        };
    }
  }, [scenario]);

  const projectedEnergy = Math.round((d.energyForecast ?? 158) * scenarioConfig.energyMult);
  const projectedWater = Math.round((d.waterForecast ?? 2650) * scenarioConfig.waterMult);
  const projectedAqi = Math.max(15, Math.round((d.aqi ?? 42) + scenarioConfig.aqiDelta));

  // 24-Hour Projected Load Curve
  const hourlyChartData = useMemo(() => {
    const currentHour = new Date().getHours();
    const labels = [];
    const baselineSeries = [];
    const forecastSeries = [];
    const upperConfidence = [];

    for (let i = 0; i <= 24; i += 2) {
      const h = (currentHour + i) % 24;
      const hStr = `${String(h).padStart(2, '0')}:00`;
      labels.push(hStr);

      const diurnalCurve = Math.sin(((h - 6) / 24) * 2 * Math.PI);
      const baseKw = +(14 + 8 * Math.max(0, diurnalCurve)).toFixed(1);
      const predictedKw = +(baseKw * scenarioConfig.energyMult).toFixed(1);
      const upper = +(predictedKw * 1.12).toFixed(1);

      baselineSeries.push(i === 0 ? (d.livePower ?? baseKw) : baseKw);
      forecastSeries.push(predictedKw);
      upperConfidence.push(upper);
    }

    return {
      labels,
      datasets: [
        {
          label: 'Current / Baseline Power (kW)',
          data: baselineSeries,
          borderColor: '#94a3b8',
          borderDash: [5, 5],
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 3,
        },
        {
          label: `AI Projected Demand (${scenarioConfig.name})`,
          data: forecastSeries,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.18)',
          fill: true,
          borderWidth: 3,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 7,
        },
        {
          label: '95% Confidence Upper Band',
          data: upperConfidence,
          borderColor: 'rgba(99, 102, 241, 0.4)',
          borderDash: [3, 3],
          borderWidth: 1.5,
          fill: false,
          pointRadius: 0,
        },
      ],
    };
  }, [d, scenarioConfig]);

  // 7-Day Trend Chart
  const weeklyTrendData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat (Pred)', 'Sun (Pred)'];
    const actualAndPredKwh = [138, 145, 142, 148, d.todaysEnergy ?? 142, projectedEnergy * 0.9, projectedEnergy * 0.75];
    const waterDemandL = [2750, 2890, 2840, 2920, d.todaysUsage ?? 2840, projectedWater * 0.8, projectedWater * 0.65];

    return {
      labels: days,
      datasets: [
        {
          label: 'Energy Consumption (kWh)',
          data: actualAndPredKwh,
          backgroundColor: '#3b82f6',
          borderRadius: 6,
        },
        {
          label: 'Water Volume (×10 L)',
          data: waterDemandL.map(l => Math.round(l / 10)),
          backgroundColor: '#06b6d4',
          borderRadius: 6,
        },
      ],
    };
  }, [d, projectedEnergy, projectedWater]);

  // Radar scorecard for predictive health
  const radarData = {
    labels: ['Energy Peak Shaving', 'Water Runout Margin', 'Air Quality Stability', 'Waste Evacuation SLA', 'Grid Tariff Economy'],
    datasets: [
      {
        label: 'Model Confidence & Efficiency Score (0-100)',
        data: [
          Math.min(98, Math.round(92 - (scenarioConfig.energyMult - 1) * 40)),
          Math.min(96, Math.round(88 - (scenarioConfig.waterMult - 1) * 35)),
          Math.min(95, Math.round(90 - scenarioConfig.aqiDelta * 0.5)),
          Math.min(94, Math.round(85 + (scenarioConfig.overflowHours > 4 ? 8 : -10))),
          93,
        ],
        backgroundColor: 'rgba(16, 185, 129, 0.22)',
        borderColor: '#10b981',
        borderWidth: 2.5,
        pointBackgroundColor: '#10b981',
        pointRadius: 4,
      },
    ],
  };

  return (
    <div className="forecasting-page">
      {/* Top Banner & Excel Export */}
      <div className="tab-control-banner">
        <div className="banner-left-info">
          <div className="engine-status-pill">
            <span className="pulse-dot-small" style={{ background: '#6366f1' }} />
            <span>Neural Forecasting Engine • LSTM + XGBoost Hybrid</span>
          </div>
          <p className="banner-subtext">
            Continuous 24-hour horizons & 7-day multi-physics projection simulating load spikes, hydraulic depletion, and atmospheric kinetics.
          </p>
        </div>

        <div className="banner-right-actions">
          <ExcelDownloadBtn
            tabName="forecasting"
            tabLabel="Forecasting"
            data={d}
            history={history}
            extraData={{ scenario, scenarioConfig }}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid">
        <div className="card">
          <div className="kpi-label">AI 24h Energy Demand Forecast</div>
          <div className="kpi-value">
            {projectedEnergy}
            <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}> kWh</span>
          </div>
          <div className="kpi-foot" style={{ color: projectedEnergy > (d.todaysEnergy ?? 142) ? '#f59e0b' : 'var(--green)' }}>
            <MdTrendingUp style={{ verticalAlign: 'middle' }} />{' '}
            {projectedEnergy > (d.todaysEnergy ?? 142) ? '▲ Upward surge expected' : '▼ Conserving demand window'}
          </div>
        </div>

        <div className="card">
          <div className="kpi-label">Hydraulic Depletion Horizon</div>
          <div className="kpi-value">
            18.4 <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>hrs</span>
          </div>
          <div className="kpi-foot">
            Projected Demand: {projectedWater.toLocaleString('en-IN')} L Tomorrow
          </div>
        </div>

        <div className="card">
          <div className="kpi-label">Peak AQI Window Forecast</div>
          <div className="kpi-value" style={{ color: projectedAqi > 100 ? '#ef4444' : projectedAqi > 50 ? '#f59e0b' : 'var(--green)' }}>
            {projectedAqi} <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>AQI</span>
          </div>
          <div className="kpi-foot">
            Expected Peak: 14:30 – 17:00 (Diurnal Dust)
          </div>
        </div>

        <div className="card">
          <div className="kpi-label">Next Bin Overflow Countdown</div>
          <div className="kpi-value">
            ~{scenarioConfig.overflowHours} <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>hrs</span>
          </div>
          <div className="kpi-foot" style={{ color: scenarioConfig.overflowHours < 4 ? '#ef4444' : 'var(--green)' }}>
            {scenarioConfig.overflowHours < 4 ? '⚠ Urgent Cart Route Required' : '✓ Safe Sanitation Margin'}
          </div>
        </div>
      </div>

      {/* Scenario Simulator Strip */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdAutoAwesome size={20} color="#6366f1" />
            <span>AI Scenario Simulation Engine</span>
          </div>
          <span className="card-tag">What-If Analysis</span>
        </h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 14px' }}>
          Simulate environmental stress vectors to preview predictive adjustments across campus systems.
        </p>

        <div className="scenario-selector-grid">
          {[
            { id: 'baseline', label: 'Standard Baseline', icon: <MdCalendarMonth size={18} />, color: '#6366f1' },
            { id: 'heatwave', label: 'Heatwave (+4°C)', icon: <MdThermostat size={18} />, color: '#f59e0b' },
            { id: 'event', label: 'Campus Convocation (+40%)', icon: <MdInsights size={18} />, color: '#0284c7' },
            { id: 'storm', label: 'Monsoon Heavy Rain', icon: <MdWaterDrop size={18} />, color: '#10b981' },
          ].map(sc => (
            <button
              key={sc.id}
              type="button"
              className={`scenario-btn ${scenario === sc.id ? 'active' : ''}`}
              onClick={() => setScenario(sc.id)}
            >
              <span className="scenario-btn-icon" style={{ color: sc.color }}>{sc.icon}</span>
              <span className="scenario-btn-label">{sc.label}</span>
            </button>
          ))}
        </div>

        <div className="scenario-active-note">
          <b>Active Scenario Profile:</b> {scenarioConfig.name} — {scenarioConfig.desc}
        </div>
      </div>

      {/* Charts Row */}
      <div className="two" style={{ marginTop: 20 }}>
        <div className="card">
          <h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdTrendingUp size={20} color="#6366f1" />
              <span>24-Hour Projected Electrical Load Curve</span>
            </div>
            <span className="card-tag">Hourly Trend</span>
          </h3>
          <ChartBox
            id="hourlyForecastChart"
            type="line"
            labels={hourlyChartData.labels}
            datasets={hourlyChartData.datasets}
          />
        </div>

        <div className="card">
          <h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdQueryStats size={20} color="#10b981" />
              <span>Multi-System Predictive Efficiency Radar</span>
            </div>
            <span className="card-tag">Index / 100</span>
          </h3>
          <ChartBox
            id="forecastingRadarChart"
            type="radar"
            labels={radarData.labels}
            datasets={radarData.datasets}
          />
        </div>
      </div>

      {/* 7-Day Horizon & Strategic Directives */}
      <div className="two" style={{ marginTop: 20 }}>
        <div className="card">
          <h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdCalendarMonth size={20} color="#3b82f6" />
              <span>7-Day Predictive Consumption Outlook</span>
            </div>
            <span className="card-tag">Weekly Horizon</span>
          </h3>
          <ChartBox
            id="weeklyOutlookChart"
            type="bar"
            labels={weeklyTrendData.labels}
            datasets={weeklyTrendData.datasets}
          />
        </div>

        <div className="card">
          <h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdAutoAwesome size={20} color="#6366f1" />
              <span>Predictive Autonomous Directives</span>
            </div>
            <span className="card-tag">Self-Learning Engine</span>
          </h3>

          <div className="predictive-directives-stack">
            <div className="directive-item">
              <div className="directive-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
                <MdElectricBolt size={20} />
              </div>
              <div className="directive-body">
                <b>Pre-Cool Facilities Before Peak Tariff (11:00 AM)</b>
                <p>Pre-chill central lecture halls to 22°C during solar peak surplus to avoid expensive 14:00 - 17:00 peak grid tariff spikes.</p>
              </div>
            </div>

            <div className="directive-item">
              <div className="directive-icon-wrap" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                <MdWaterDrop size={20} />
              </div>
              <div className="directive-body">
                <b>Nightly Reservoir Refill at Off-Peak (21:30)</b>
                <p>Schedule pump cycle #1 during off-peak power window to recharge overhead tanks for tomorrow's morning surge.</p>
              </div>
            </div>

            <div className="directive-item">
              <div className="directive-icon-wrap" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                <MdAir size={20} />
              </div>
              <div className="directive-body">
                <b>Atmospheric Dust Misting at 14:30</b>
                <p>Deploy perimeter misting cannons 30 minutes before projected diurnal dust peak to suppress particulate migration.</p>
              </div>
            </div>

            <div className="directive-item">
              <div className="directive-icon-wrap" style={{ background: '#f3e8ff', color: '#9333ea' }}>
                <MdDelete size={20} />
              </div>
              <div className="directive-body">
                <b>Dining Commons Bin Evacuation (12:45)</b>
                <p>Pre-dispatch autonomous collection cart prior to lunch rush to prevent cafeteria smart bin overflow.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
