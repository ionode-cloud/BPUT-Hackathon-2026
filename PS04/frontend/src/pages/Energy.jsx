import { MdElectricBolt, MdBatteryChargingFull, MdShowChart, MdCurrencyRupee } from 'react-icons/md';
import ChartBox from '../components/ChartBox';
import { getEnergyBarData, getEnergyDistributionData } from '../utils/chartHelpers';

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

      {/* Energy AI Optimization Directives */}
      <div className="card">
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
