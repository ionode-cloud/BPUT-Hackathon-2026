import { useState, useMemo } from 'react';
import {
  MdTrendingUp,
  MdElectricBolt,
  MdShowChart,
  MdCurrencyRupee,
  MdAutoAwesome,
  MdThermostat,
  MdCalendarMonth,
  MdInsights,
  MdWbSunny,
  MdBatteryChargingFull,
  MdEnergySavingsLeaf,
  MdNightlight,
  MdCheckCircle,
  MdAccessTime,
  MdSpeed,
} from 'react-icons/md';
import ChartBox from '../components/ChartBox';

export default function Forecasting({ data = {}, history = [] }) {
  const d = data || {};

  // Energy Demand Scenario Simulator: 'baseline' | 'heatwave' | 'event' | 'conservation'
  const [scenario, setScenario] = useState('baseline');

  // Energy Scenario Multipliers & Physics Models
  const scenarioConfig = useMemo(() => {
    switch (scenario) {
      case 'heatwave':
        return {
          energyMult: 1.28,
          peakMult: 1.32,
          costMult: 1.35,
          name: 'Peak Summer Heatwave (+4°C Ambient)',
          desc: 'High cooling load active across chiller compressors; elevated daytime HVAC wattage spikes.',
          tagColor: '#ef4444',
        };
      case 'event':
        return {
          energyMult: 1.35,
          peakMult: 1.40,
          costMult: 1.42,
          name: 'Campus Convocation / Surge Event (+40% Footfall)',
          desc: 'Auditoriums and labs operating at full capacity; surge in stage lighting, AV, and dining commons.',
          tagColor: '#f59e0b',
        };
      case 'conservation':
        return {
          energyMult: 0.72,
          peakMult: 0.68,
          costMult: 0.70,
          name: 'Off-Peak / Weekend Deep Conservation (-28% Draw)',
          desc: 'Low occupancy facility mode; non-essential chiller units and architectural illumination curtailed.',
          tagColor: '#10b981',
        };
      default:
        return {
          energyMult: 1.0,
          peakMult: 1.0,
          costMult: 1.0,
          name: 'Standard Baseline Operational Schedule',
          desc: 'Calibrated diurnal academic and laboratory schedule with normal occupancy profiles.',
          tagColor: '#6366f1',
        };
    }
  }, [scenario]);

  // Telemetry references from Energy Optimization
  const currentLivePower = d.livePower ?? 18.4;
  const currentEnergyMeter = d.todaysEnergy ?? 142;
  const recordedPeakDemand = d.peakDemand ?? 24.8;
  const estimatedCost = d.estimatedCost ?? 1120;
  const baseForecastEnergy = d.energyForecast ?? 158;

  // Extra Solar & BESS Model (25 kW rooftop solar PV + 48 kWh BESS)
  const extraSolarKw = 25;
  const extraSolarDailyKwh = Math.round(extraSolarKw * 4.2); // ~105 kWh clean infeed
  const batteryPeakShaveKw = 8.5; // ~8.5 kW dispatched during peak hours

  // Projected 24-Hour Energy Metrics according to Energy Optimization
  const projectedEnergy = Math.round(baseForecastEnergy * scenarioConfig.energyMult);
  const projectedPeakPower = +(recordedPeakDemand * scenarioConfig.peakMult).toFixed(1);
  const projectedDailyCost = Math.round(
    estimatedCost * (projectedEnergy / Math.max(1, currentEnergyMeter)) * scenarioConfig.costMult
  );
  const netGridProjectedEnergy = Math.max(25, projectedEnergy - Math.round(extraSolarDailyKwh * 0.65));
  const peakShavingHeadroom = Math.max(0, +(projectedPeakPower - (currentLivePower * 0.9)).toFixed(1));
  const estimatedCo2Offset = Math.round(extraSolarDailyKwh * 0.82);

  // 24-Hour Projected Electrical Load Curve with Peak Shaving
  const hourlyChartData = useMemo(() => {
    const currentHour = new Date().getHours();
    const labels = [];
    const baselineSeries = [];
    const forecastDemandSeries = [];
    const solarGenerationSeries = [];
    const netShavedSeries = [];

    for (let i = 0; i <= 24; i += 2) {
      const h = (currentHour + i) % 24;
      const hStr = `${String(h).padStart(2, '0')}:00`;
      labels.push(hStr);

      // Diurnal baseline power curve (peaks around 13:00 - 15:00)
      const diurnalCurve = Math.sin(((h - 6) / 24) * 2 * Math.PI);
      const baseKw = +(14 + 8 * Math.max(0, diurnalCurve)).toFixed(1);
      const predictedDemandKw = +(baseKw * scenarioConfig.energyMult).toFixed(1);

      // Extra Solar PV infeed curve (6:00 to 18:00, peaks at 12:00-13:00)
      let solarKw = 0;
      if (h >= 6 && h <= 18) {
        const solarFactor = Math.sin(((h - 6) / 12) * Math.PI);
        solarKw = +(extraSolarKw * 0.82 * Math.max(0, solarFactor)).toFixed(1);
      }

      // Battery peak shaving during peak tariff hours (16:00 to 21:00)
      let batteryKw = 0;
      if (h >= 16 && h <= 21) {
        batteryKw = batteryPeakShaveKw;
      }

      // Net grid draw after solar and battery peak shaving
      const netKw = +Math.max(2.5, predictedDemandKw - solarKw - batteryKw).toFixed(1);

      baselineSeries.push(i === 0 ? currentLivePower : baseKw);
      forecastDemandSeries.push(predictedDemandKw);
      solarGenerationSeries.push(solarKw);
      netShavedSeries.push(netKw);
    }

    return {
      labels,
      datasets: [
        {
          label: 'Current Live Power (kW)',
          data: baselineSeries,
          borderColor: '#94a3b8',
          borderDash: [5, 5],
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 2,
          fill: false,
        },
        {
          label: `AI Projected Demand (${scenarioConfig.name.split(' ')[0]}) (kW)`,
          data: forecastDemandSeries,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.18)',
          borderWidth: 2.5,
          tension: 0.35,
          pointRadius: 3,
          fill: false,
        },
        {
          label: 'Extra Solar Infeed (kW)',
          data: solarGenerationSeries,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 2,
          fill: true,
        },
        {
          label: 'Net Shaved Grid Demand (kW)',
          data: netShavedSeries,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.22)',
          fill: true,
          borderWidth: 3,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 7,
        },
      ],
    };
  }, [currentLivePower, scenarioConfig, extraSolarKw]);

  // 7-Day Cumulative Energy Outlook Chart
  const weeklyTrendData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat (Pred)', 'Sun (Pred)'];
    const baselineDaily = [
      142,
      148,
      145,
      152,
      currentEnergyMeter,
      Math.round(projectedEnergy * 0.9),
      Math.round(projectedEnergy * 0.78),
    ];
    const cleanInfeedDaily = [
      72,
      75,
      74,
      78,
      extraSolarDailyKwh,
      Math.round(extraSolarDailyKwh * 1.05),
      Math.round(extraSolarDailyKwh * 0.95),
    ];
    const netGridDaily = baselineDaily.map((b, idx) => Math.max(30, Math.round(b - cleanInfeedDaily[idx] * 0.65)));

    return {
      labels: days,
      datasets: [
        {
          label: 'Projected Daily Demand (kWh)',
          data: baselineDaily,
          backgroundColor: '#94a3b8',
          borderRadius: 6,
        },
        {
          label: 'Extra Solar Infeed (kWh)',
          data: cleanInfeedDaily,
          backgroundColor: '#f59e0b',
          borderRadius: 6,
        },
        {
          label: 'Net Shaved Grid Draw (kWh)',
          data: netGridDaily,
          backgroundColor: '#6366f1',
          borderRadius: 6,
        },
      ],
    };
  }, [currentEnergyMeter, projectedEnergy, extraSolarDailyKwh]);

  // 24-Hour Predictive Load & Dynamic Tariff Horizon Schedule
  const hourlySchedule = useMemo(() => {
    return [
      {
        block: '00:00 – 04:00',
        label: 'Night Baseload Window',
        demandKw: +(12.2 * scenarioConfig.energyMult).toFixed(1),
        solarKw: 0.0,
        batteryKw: 0.0,
        netKw: +(12.2 * scenarioConfig.energyMult).toFixed(1),
        tariff: '₹4.50 / kWh',
        tariffTier: 'Off-Peak',
        tierBg: '#ecfdf5',
        tierColor: '#059669',
        status: 'Optimal Off-Peak Grid Draw',
        statusColor: '#10b981',
      },
      {
        block: '04:00 – 08:00',
        label: 'Dawn Transition & Pump Replenishment',
        demandKw: +(14.8 * scenarioConfig.energyMult).toFixed(1),
        solarKw: 3.5,
        batteryKw: 0.0,
        netKw: +Math.max(2, 14.8 * scenarioConfig.energyMult - 3.5).toFixed(1),
        tariff: '₹5.20 / kWh',
        tariffTier: 'Off-Peak',
        tierBg: '#ecfdf5',
        tierColor: '#059669',
        status: 'Early Solar Ramp Initiating',
        statusColor: '#10b981',
      },
      {
        block: '08:00 – 12:00',
        label: 'Academic Morning Surge & Lab Operations',
        demandKw: +(22.5 * scenarioConfig.energyMult).toFixed(1),
        solarKw: 18.2,
        batteryKw: 0.0,
        netKw: +Math.max(2, 22.5 * scenarioConfig.energyMult - 18.2).toFixed(1),
        tariff: '₹8.50 / kWh',
        tariffTier: 'Standard',
        tierBg: '#eff6ff',
        tierColor: '#2563eb',
        status: 'Solar Supplying 80% Load',
        statusColor: '#3b82f6',
      },
      {
        block: '12:00 – 16:00',
        label: 'Midday Solar Surplus & Auditorium Pre-Cooling',
        demandKw: +(24.8 * scenarioConfig.energyMult).toFixed(1),
        solarKw: 24.5,
        batteryKw: 0.0,
        netKw: +Math.max(2, 24.8 * scenarioConfig.energyMult - 24.5).toFixed(1),
        tariff: '₹7.80 / kWh',
        tariffTier: 'Standard',
        tierBg: '#eff6ff',
        tierColor: '#2563eb',
        status: 'Self-Sufficient / Net-Zero Draw',
        statusColor: '#059669',
      },
      {
        block: '16:00 – 20:00',
        label: 'Critical Peak Tariff & BESS Battery Shaving',
        demandKw: +(23.4 * scenarioConfig.energyMult).toFixed(1),
        solarKw: 4.8,
        batteryKw: batteryPeakShaveKw,
        netKw: +Math.max(2, 23.4 * scenarioConfig.energyMult - 4.8 - batteryPeakShaveKw).toFixed(1),
        tariff: '₹11.50 / kWh',
        tariffTier: 'Critical Peak',
        tierBg: '#fef2f2',
        tierColor: '#dc2626',
        status: 'Peak Shaved via 8.5 kW Battery Discharge',
        statusColor: '#f59e0b',
      },
      {
        block: '20:00 – 24:00',
        label: 'Night Curfew & Lighting Dimming',
        demandKw: +(15.1 * scenarioConfig.energyMult).toFixed(1),
        solarKw: 0.0,
        batteryKw: 0.0,
        netKw: +(15.1 * scenarioConfig.energyMult).toFixed(1),
        tariff: '₹5.50 / kWh',
        tariffTier: 'Off-Peak',
        tierBg: '#ecfdf5',
        tierColor: '#059669',
        status: 'Automated 35% Facility Dimming',
        statusColor: '#10b981',
      },
    ];
  }, [scenarioConfig, batteryPeakShaveKw]);

  return (
    <div className="forecasting-page">
      {/* ════ HERO KPI ROW: Energy Optimization Forecasting Telemetry ════ */}
      <div className="grid">
        <div className="card" style={{ borderLeft: '4px solid #6366f1' }}>
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MdElectricBolt size={20} color="#6366f1" />
            <span>24h Projected Energy Demand</span>
          </div>
          <div className="kpi-value" style={{ color: '#4338ca' }}>
            {projectedEnergy}
            <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}> kWh</span>
          </div>
          <div className="kpi-foot">
            Today's Meter: <b>{currentEnergyMeter} kWh</b> • Net Grid: <b>{netGridProjectedEnergy} kWh</b>
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MdShowChart size={20} color="#f59e0b" />
            <span>Predicted Peak Power Draw</span>
          </div>
          <div className="kpi-value" style={{ color: '#d97706' }}>
            {projectedPeakPower}
            <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}> kW</span>
          </div>
          <div className="kpi-foot">
            Recorded Peak: <b>{recordedPeakDemand} kW</b> • Shaving headroom: <b>{peakShavingHeadroom} kW</b>
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MdCurrencyRupee size={20} color="#8b5cf6" />
            <span>Projected Daily Energy Tariff</span>
          </div>
          <div className="kpi-value" style={{ color: '#7c3aed' }}>
            ₹{projectedDailyCost.toLocaleString('en-IN')}
          </div>
          <div className="kpi-foot">
            Today's Cost: <b>₹{estimatedCost.toLocaleString('en-IN')}</b> • Dynamic ToU Rate
          </div>
        </div>

        <div
          className="card"
          style={{
            borderLeft: '4px solid #10b981',
            background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)',
          }}
        >
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MdEnergySavingsLeaf size={20} color="#10b981" />
            <span>Extra Clean Solar Infeed</span>
          </div>
          <div className="kpi-value" style={{ color: '#059669' }}>
            +{extraSolarDailyKwh}
            <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}> kWh</span>
          </div>
          <div className="kpi-foot" style={{ color: '#047857' }}>
            25 kW Rooftop PV • Carbon offset: <b>{estimatedCo2Offset} kg CO₂</b>
          </div>
        </div>
      </div>

      {/* ════ WHAT-IF DEMAND SCENARIO TESTING (ENERGY OPTIMIZATION) ════ */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdAutoAwesome size={20} color="#6366f1" />
            <span>Energy Optimization What-If Scenario Analysis</span>
          </div>
          <span className="card-tag">Dynamic Simulation</span>
        </h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 14px' }}>
          Simulate weather surges, academic schedule variations, and deep conservation windows to preview real-time
          load impact.
        </p>

        <div className="scenario-selector-grid">
          {[
            { id: 'baseline', label: 'Standard Baseline (1.0x)', icon: <MdCalendarMonth size={18} />, color: '#6366f1' },
            { id: 'heatwave', label: 'Summer Peak Heatwave (+28%)', icon: <MdThermostat size={18} />, color: '#ef4444' },
            { id: 'event', label: 'Campus Convocation (+35%)', icon: <MdInsights size={18} />, color: '#f59e0b' },
            { id: 'conservation', label: 'Off-Peak Conservation (-28%)', icon: <MdNightlight size={18} />, color: '#10b981' },
          ].map(sc => (
            <button
              key={sc.id}
              type="button"
              className={`scenario-btn ${scenario === sc.id ? 'active' : ''}`}
              onClick={() => setScenario(sc.id)}
            >
              <span className="scenario-btn-icon" style={{ color: sc.color }}>
                {sc.icon}
              </span>
              <span className="scenario-btn-label">{sc.label}</span>
            </button>
          ))}
        </div>

        <div className="scenario-active-note" style={{ marginTop: 12 }}>
          <b>Active Scenario Profile:</b> {scenarioConfig.name} — {scenarioConfig.desc}
        </div>
      </div>

      {/* ════ DYNAMIC CHARTS: 24h Load Curve & 7-Day Outlook ════ */}
      <div className="two" style={{ marginTop: 20 }}>
        <div className="card">
          <h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdTrendingUp size={20} color="#6366f1" />
              <span>24-Hour Projected Electrical Load Curve & Peak Shaving</span>
            </div>
            <span className="card-tag">Hourly Profile</span>
          </h3>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 10px' }}>
            Multi-curve projection comparing live baseline draw, AI predicted demand surge, solar generation, and net
            shaved grid load.
          </p>
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
              <MdCalendarMonth size={20} color="#3b82f6" />
              <span>7-Day Energy Consumption Outlook & Baseline Target</span>
            </div>
            <span className="card-tag">Weekly Trend</span>
          </h3>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 10px' }}>
            Cumulative intraday consumption history alongside upcoming AI predicted demand and clean solar
            contribution.
          </p>
          <ChartBox
            id="weeklyOutlookChart"
            type="bar"
            labels={weeklyTrendData.labels}
            datasets={weeklyTrendData.datasets}
          />
        </div>
      </div>

      {/* ════ 24-HOUR HOURLY PREDICTIVE LOAD & TARIFF HORIZON TABLE ════ */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdAccessTime size={20} color="#3b82f6" />
            <span>24-Hour Predictive Electrical Load & Dynamic Tariff Horizon</span>
          </div>
          <span className="card-tag">Hourly Telemetry Matrix</span>
        </h3>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 16px' }}>
          High-resolution temporal dispatch model illustrating solar infeed offsets, battery discharge intervals, and
          net utility grid dependencies.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
              textAlign: 'left',
            }}
          >
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 14px' }}>Time Horizon</th>
                <th style={{ padding: '12px 14px' }}>Operational Profile</th>
                <th style={{ padding: '12px 14px' }}>Projected Demand</th>
                <th style={{ padding: '12px 14px' }}>Extra Solar PV</th>
                <th style={{ padding: '12px 14px' }}>BESS Battery Shave</th>
                <th style={{ padding: '12px 14px' }}>Net Grid Draw</th>
                <th style={{ padding: '12px 14px' }}>ToU Tariff Tier</th>
                <th style={{ padding: '12px 14px' }}>Grid Optimization Status</th>
              </tr>
            </thead>
            <tbody>
              {hourlySchedule.map((row, idx) => (
                <tr
                  key={row.block}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: idx % 2 === 0 ? '#ffffff' : '#fcfcfd',
                  }}
                >
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1e293b' }}>{row.block}</td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>{row.label}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#4338ca' }}>{row.demandKw} kW</td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#d97706' }}>
                    {row.solarKw > 0 ? `+${row.solarKw} kW` : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#059669' }}>
                    {row.batteryKw > 0 ? `-${row.batteryKw} kW` : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a' }}>{row.netKw} kW</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: 700,
                        background: row.tierBg,
                        color: row.tierColor,
                      }}
                    >
                      {row.tariffTier} ({row.tariff})
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 12,
                        fontWeight: 600,
                        color: row.statusColor,
                      }}
                    >
                      <MdCheckCircle size={15} />
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ════ ENERGY OPTIMIZATION TREND & PERFORMANCE METRICS ════ */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdSpeed size={20} color="#10b981" />
            <span>Energy Optimization Performance & Self-Sufficiency Trends</span>
          </div>
          <span className="card-tag" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
            Impact Metrics
          </span>
        </h3>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 16px' }}>
          Net efficiency ratings and carbon abatement trends accomplished via predictive load shedding and clean microgrid
          integration.
        </p>

        <div className="grid" style={{ marginBottom: 0 }}>
          <div
            className="card"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)',
              border: '1px solid #bbf7d0',
            }}
          >
            <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <MdEnergySavingsLeaf size={20} color="#10b981" />
              <span>Grid Dependency Reduction</span>
            </div>
            <div className="kpi-value" style={{ color: '#059669' }}>
              -38.5 <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>%</span>
            </div>
            <div className="kpi-foot" style={{ color: '#047857' }}>
              Avoided utility grid import via solar & battery coordination
            </div>
          </div>

          <div
            className="card"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #eff6ff 100%)',
              border: '1px solid #bfdbfe',
            }}
          >
            <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <MdElectricBolt size={20} color="#3b82f6" />
              <span>Peak Demand Shaving Rate</span>
            </div>
            <div className="kpi-value" style={{ color: '#1d4ed8' }}>
              8.5 <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>kW</span>
            </div>
            <div className="kpi-foot" style={{ color: '#1e40af' }}>
              Peak curtailed during 16:00 – 20:00 critical tariff window
            </div>
          </div>

          <div
            className="card"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #faf5ff 100%)',
              border: '1px solid #e9d5ff',
            }}
          >
            <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <MdCurrencyRupee size={20} color="#8b5cf6" />
              <span>Daily Avoided Tariff Cost</span>
            </div>
            <div className="kpi-value" style={{ color: '#7c3aed' }}>
              ₹1,840
            </div>
            <div className="kpi-foot" style={{ color: '#6d28d9' }}>
              Monetary savings through load shifting and self-consumption
            </div>
          </div>

          <div
            className="card"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #ecfeff 100%)',
              border: '1px solid #a5f3fc',
            }}
          >
            <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <MdWbSunny size={20} color="#06b6d4" />
              <span>Net Carbon Abatement</span>
            </div>
            <div className="kpi-value" style={{ color: '#0891b2' }}>
              86.1 <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>kg CO₂</span>
            </div>
            <div className="kpi-foot" style={{ color: '#0e7490' }}>
              Greenhouse gas reduction certified for campus sustainability
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
