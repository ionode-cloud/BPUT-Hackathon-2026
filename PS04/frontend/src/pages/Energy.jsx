import { useState } from 'react';
import {
  MdElectricBolt,
  MdBatteryChargingFull,
  MdShowChart,
  MdCurrencyRupee,
  MdWbSunny,
  MdTrendingUp,
  MdArrowForward,
  MdEnergySavingsLeaf,
} from 'react-icons/md';
import ChartBox from '../components/ChartBox';
import { getEnergyBarData, getEnergyDistributionData } from '../utils/chartHelpers';
import ExcelDownloadBtn from '../components/ExcelDownloadBtn';
import Forecasting from './Forecasting';

export default function Energy({ data, history = [], onNavigate }) {
  const d = data || {};
  const barData = getEnergyBarData(d, history);
  const pieData = getEnergyDistributionData(d);

  // Active view within Energy: 'telemetry' | 'forecasting'
  const [activeView, setActiveView] = useState('telemetry');

  // Jump to separate Forecasting tab if requested
  const handleGoToForecastingTab = () => {
    if (onNavigate) {
      onNavigate('forecasting');
    } else {
      window.location.hash = '#forecasting';
    }
  };

  const kpis = [
    {
      icon: <MdElectricBolt size={24} color="#3b82f6" />,
      label: 'Live Power Draw',
      value: d.livePower ?? '-',
      unit: d.livePower != null ? 'kW' : '',
      sub: d.peakDemand && d.livePower ? `${Math.round((d.livePower / d.peakDemand) * 100)}% of peak` : '-',
    },
    {
      icon: <MdBatteryChargingFull size={24} color="#10b981" />,
      label: "Today's Energy Meter",
      value: d.todaysEnergy ?? '-',
      unit: d.todaysEnergy != null ? 'kWh' : '',
      sub: d.energyForecast ? `Target: ~${d.energyForecast} kWh` : '-',
    },
    {
      icon: <MdShowChart size={24} color="#f59e0b" />,
      label: 'Recorded Peak Demand',
      value: d.peakDemand ?? '-',
      unit: d.peakDemand != null ? 'kW' : '',
      sub: d.peakDemand != null ? 'Maximum intraday draw' : '-',
    },
    {
      icon: <MdCurrencyRupee size={24} color="#8b5cf6" />,
      label: 'Estimated Energy Cost',
      value: d.estimatedCost != null ? `₹${d.estimatedCost.toLocaleString('en-IN')}` : '-',
      unit: '',
      sub: d.estimatedCost != null ? 'Computed tariff rate' : '-',
    },
  ];

  return (
    <>
      {/* Tab Control / Export Banner with Forecasting Shortcut */}
      <div className="tab-control-banner">
        <div className="banner-left-info">
          <div className="engine-status-pill">
            <span className="pulse-dot-small" style={{ background: '#f59e0b' }} />
            <span>Electrical Grid & Power Optimization Metering</span>
          </div>
          <p className="banner-subtext">
            Precision active wattage profiling, peak demand surveillance, and dynamic tariff cost modeling.
          </p>
        </div>
        <div className="banner-right-actions" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className="btn-action btn-action--primary"
            onClick={() => setActiveView(activeView === 'telemetry' ? 'forecasting' : 'telemetry')}
            title="Toggle Predictive Forecasting & Trends"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 700,
              background: activeView === 'forecasting'
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              transition: 'all 0.2s ease',
            }}
          >
            <MdTrendingUp size={17} />
            <span>{activeView === 'forecasting' ? 'Show Live Telemetry' : 'Predictive Forecasting & Trends'}</span>
            <MdArrowForward size={16} />
          </button>
          <ExcelDownloadBtn tabName="energy" tabLabel="Energy" data={d} history={history} />
        </div>
      </div>

      {/* Dual Tab Quick-Switcher Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
          padding: '10px 16px',
          borderRadius: 14,
          border: '1px solid var(--border)',
          marginBottom: 18,
          boxShadow: 'var(--shadow-sm)',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setActiveView('telemetry')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              background: activeView === 'telemetry' ? '#eff6ff' : 'transparent',
              color: activeView === 'telemetry' ? '#1d4ed8' : '#64748b',
              fontWeight: activeView === 'telemetry' ? 700 : 600,
              fontSize: 13,
              border: '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <MdElectricBolt size={16} />
            <span>Energy Optimization Telemetry {activeView === 'telemetry' ? '(Active)' : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('forecasting')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              background: activeView === 'forecasting' ? '#e0e7ff' : 'transparent',
              color: activeView === 'forecasting' ? '#4338ca' : '#64748b',
              fontWeight: activeView === 'forecasting' ? 700 : 600,
              fontSize: 13,
              border: '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <MdTrendingUp size={16} color={activeView === 'forecasting' ? '#4338ca' : '#6366f1'} />
            <span>Predictive Forecasting & Trends {activeView === 'forecasting' ? '(Active)' : ''}</span>
          </button>
        </div>

        <div style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <MdEnergySavingsLeaf color="#10b981" size={16} />
          <span>Extra Clean Solar Infeed: Active (~18.4 kW)</span>
        </div>
      </div>

      {/* Conditional Rendering: Telemetry vs Forecasting View */}
      {activeView === 'forecasting' ? (
        <Forecasting data={data} history={history} />
      ) : (
        <>
          {/* Energy KPIs */}
          <div className="grid">
            {kpis.map(k => (
              <div key={k.label} className="card">
                <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {k.icon}
                  <span>{k.label}</span>
                </div>
                <div className="kpi-value">
                  {k.value}
                  {k.unit && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>{k.unit}</span>}
                </div>
                <div className="kpi-foot">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Dynamic Charts */}
          <div className="two">
            <div className="card">
              <h3>
                <span>Hourly Power Draw & Energy History</span>
                <span className="card-tag">Live Profile</span>
              </h3>
              <ChartBox id="energyBarChart" type="bar" labels={barData.labels} datasets={barData.datasets} />
            </div>

            <div className="card">
              <h3>
                <span>Consumption by Facility Subsystem</span>
                <span className="card-tag">Dynamic Share</span>
              </h3>
              <ChartBox id="energyDoughnut" type="doughnut" labels={pieData.labels} datasets={pieData.datasets} />
            </div>
          </div>

          {/* Extra Clean Energy Generation & Storage Overview */}
          <div className="card" style={{ marginTop: 20 }}>
            <h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MdEnergySavingsLeaf size={22} color="#10b981" />
                <span>Extra Clean Energy & Campus Microgrid Infeed</span>
              </div>
              <span className="card-tag" style={{ background: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0' }}>
                Extra Energy Active
              </span>
            </h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px' }}>
              Supplementary rooftop solar generation, BESS battery reserves, and self-sufficiency metrics feeding into predictive load shaving.
            </p>

            <div className="grid" style={{ marginBottom: 0 }}>
              <div className="card" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #fffbeb 100%)', border: '1px solid #fde68a' }}>
                <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <MdWbSunny size={20} color="#f59e0b" />
                  <span>Extra Rooftop Solar PV</span>
                </div>
                <div className="kpi-value" style={{ color: '#d97706' }}>
                  18.4 <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>kW</span>
                </div>
                <div className="kpi-foot" style={{ color: '#b45309' }}>
                  Today: 74.5 kWh clean infeed (Peak 12:30)
                </div>
              </div>

              <div className="card" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)', border: '1px solid #bbf7d0' }}>
                <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <MdBatteryChargingFull size={20} color="#10b981" />
                  <span>Extra Battery Bank (BESS)</span>
                </div>
                <div className="kpi-value" style={{ color: '#059669' }}>
                  82 <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>% SoC</span>
                </div>
                <div className="kpi-foot" style={{ color: '#047857' }}>
                  48 kWh reserve • 4.8 hrs resilience buffer
                </div>
              </div>

              <div className="card" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f5f3ff 100%)', border: '1px solid #ddd6fe' }}>
                <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <MdCurrencyRupee size={20} color="#8b5cf6" />
                  <span>Extra Tariff Cost Saved</span>
                </div>
                <div className="kpi-value" style={{ color: '#7c3aed' }}>
                  ₹1,840
                </div>
                <div className="kpi-foot" style={{ color: '#6d28d9' }}>
                  Avoided peak grid tariff draw today
                </div>
              </div>

              <div className="card" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #ecfeff 100%)', border: '1px solid #a5f3fc' }}>
                <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <MdEnergySavingsLeaf size={20} color="#06b6d4" />
                  <span>Extra Green Offset</span>
                </div>
                <div className="kpi-value" style={{ color: '#0891b2' }}>
                  62.8 <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>kg CO₂</span>
                </div>
                <div className="kpi-foot" style={{ color: '#0e7490' }}>
                  Direct greenhouse gas avoidance
                </div>
              </div>
            </div>
          </div>

          {/* Energy AI Optimization Directives */}
          <div className="card" style={{ marginTop: 20 }}>
            <h3>Energy AI Optimization & Load Shedding</h3>
            {d.todaysEnergy > 120 && (
              <div className="recommendation recommendation--warn">
                <b>Peak Alert:</b> Cumulative consumption is at <b>{d.todaysEnergy} kWh</b>, trending higher than normal baseline. Consider dimming secondary campus illumination and shifting heavy lab chiller loads.
              </div>
            )}
            {d.peakDemand && d.livePower && d.livePower > d.peakDemand * 0.85 && (
              <div className="recommendation recommendation--alert">
                <b>High Peak Demand:</b> Live draw ({d.livePower} kW) has reached 85%+ of recorded peak ({d.peakDemand} kW). Initiate automated smart load management.
              </div>
            )}
            {d.todaysEnergy != null && d.todaysEnergy <= 120 && (
              <div className="recommendation">
                <b>Optimal Grid Load:</b> Energy consumption at <b>{d.todaysEnergy} kWh</b> is operating well within target sustainability budget.
              </div>
            )}
            {d.todaysEnergy == null && (
              <div className="small" style={{ color: 'var(--muted)' }}>-</div>
            )}
          </div>

          {/* Direct Forecasting Integration Callout */}
          <div
            className="card"
            style={{
              marginTop: 20,
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '24px 28px',
              borderRadius: 16,
              boxShadow: '0 10px 25px -5px rgba(49, 46, 129, 0.4)',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ background: '#4f46e5', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                  NEURAL LOAD PREDICTION
                </span>
                <span style={{ color: '#a5b4fc', fontSize: 13 }}>LSTM + XGBoost Hybrid Engine</span>
              </div>
              <h2 style={{ margin: '0 0 6px', fontSize: 20, color: '#ffffff', fontWeight: 800 }}>
                Predictive Energy Horizon & Extra Clean Energy Simulation
              </h2>
              <p style={{ margin: 0, color: '#c7d2fe', fontSize: 13.5, maxWidth: 650 }}>
                Simulate extra solar PV injection, BESS battery discharge schedules, and 24-hour load curve peak shaving directly in Predictive Forecasting & Trends.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveView('forecasting')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 800,
                background: '#ffffff',
                color: '#312e81',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.35)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.25)';
              }}
            >
              <MdTrendingUp size={20} color="#4f46e5" />
              <span>View Predictive Forecasting & Trends</span>
              <MdArrowForward size={18} color="#4f46e5" />
            </button>
          </div>
        </>
      )}
    </>
  );
}
