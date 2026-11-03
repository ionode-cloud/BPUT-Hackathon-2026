import {
  MdElectricBolt,
  MdBatteryChargingFull,
  MdShowChart,
  MdCurrencyRupee,
  MdWbSunny,
  MdEnergySavingsLeaf,
} from 'react-icons/md';
import ChartBox from '../components/ChartBox';
import { getEnergyBarData, getEnergyDistributionData } from '../utils/chartHelpers';
import ExcelDownloadBtn from '../components/ExcelDownloadBtn';

export default function Energy({ data, history = [] }) {
  const d = data || {};
  const barData = getEnergyBarData(d, history);
  const pieData = getEnergyDistributionData(d);

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
      {/* Tab Control / Export Banner */}
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
        <div className="banner-right-actions">
          <ExcelDownloadBtn tabName="energy" tabLabel="Energy" data={d} history={history} />
        </div>
      </div>
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
    </>
  );
}
