import {
  MdElectricBolt,
  MdBatteryChargingFull,
  MdShowChart,
  MdCurrencyRupee,
  MdWbSunny,
  MdEnergySavingsLeaf,
} from 'react-icons/md';
import ChartBox from '../components/ChartBox';
import {
  getEnergyBarData,
  getEnergyDistributionData,
  getAcDcEnergyData,
} from '../utils/chartHelpers';
import ExcelDownloadBtn from '../components/ExcelDownloadBtn';
import StatCard from '../components/StatCard';

export default function Energy({ data, history = [] }) {
  const d = data || {};
  const barData = getEnergyBarData(d, history);
  const pieData = getEnergyDistributionData(d);
  const acDcData = getAcDcEnergyData(d);

  // AC & DC Supply Metrics
  const liveKw = d.livePower ?? 18.4;
  const todayKwh = d.todaysEnergy ?? 142.5;
  const acPower = d.acPower ?? Number((liveKw * 0.78).toFixed(1));
  const acEnergy = d.acEnergy ?? Number((todayKwh * 0.76).toFixed(1));
  const dcPower = d.dcPower ?? Number((liveKw * 0.22).toFixed(1));
  const dcEnergy = d.dcEnergy ?? Number((todayKwh * 0.24).toFixed(1));

  return (
    <>
      {/* Tab Control / Export Banner */}
      <div className="tab-control-banner">
        <div className="banner-left-info">
          <div className="engine-status-pill">
            <span className="pulse-dot-small" style={{ background: '#f59e0b' }} />
            <span>Electrical Grid Sub-Metering: AC Supply & DC Supply Power Profiling</span>
          </div>
          <p className="banner-subtext">
            Separate sub-metering profiling AC supply (mains grid & HVAC loads) and DC supply (rooftop solar PV & battery storage), paired with peak demand surveillance.
          </p>
        </div>
        <div className="banner-right-actions">
          <ExcelDownloadBtn tabName="energy" tabLabel="Energy" data={d} history={history} />
        </div>
      </div>

      {/* Primary Energy KPIs - AC vs DC Supply Breakdown */}
      <div className="grid">
        <StatCard
          label="AC Supply (Mains Grid & HVAC)"
          icon={<MdElectricBolt size={20} color="#2563eb" />}
          badgeText="415V 3-Phase AC"
          badgeType="blue"
          nowLabel="AC Live Draw"
          nowValue={acPower}
          unit=" kW"
          secondaryLabel="AC Today"
          secondaryValue={`${acEnergy} kWh`}
          secondaryColor="#2563eb"
          footerLeft="Feeds chillers, heavy labs & mains ring"
          footerRight="78% of campus load"
          index={0}
        />

        <StatCard
          label="DC Supply (Solar PV & BESS)"
          icon={<MdWbSunny size={20} color="#10b981" />}
          badgeText="380V DC Bus"
          badgeType="green"
          nowLabel="DC Clean Infeed"
          nowValue={dcPower}
          unit=" kW"
          secondaryLabel="DC Today"
          secondaryValue={`${dcEnergy} kWh`}
          secondaryColor="#10b981"
          footerLeft="Feeds BESS battery bank & server DC racks"
          footerRight="22% of campus load"
          index={1}
        />

        <StatCard
          label="Recorded Peak Demand"
          icon={<MdShowChart size={20} color="#f59e0b" />}
          badgeText="Controlled Peak"
          badgeType="amber"
          nowLabel="Max Draw"
          nowValue={d.peakDemand ?? 32.5}
          unit=" kW"
          secondaryLabel="Grid Ceiling"
          secondaryValue="45 kW"
          secondaryColor="#0284c7"
          footerLeft={d.peakDemand != null ? 'Maximum intraday draw' : 'Off-peak window'}
          footerRight="Headroom safe"
          index={2}
        />

        <StatCard
          label="Estimated Utility Cost"
          icon={<MdCurrencyRupee size={20} color="#8b5cf6" />}
          badgeText="Tariff ₹7.5/kWh"
          badgeType="green"
          nowLabel="Computed Cost"
          nowValue={d.estimatedCost != null ? `₹${d.estimatedCost.toLocaleString('en-IN')}` : '₹1,136'}
          secondaryLabel="Avoided Cost"
          secondaryValue="₹1,840"
          secondaryColor="#15803d"
          footerLeft="Solar & peak shaving offset active"
          footerRight="Tariff optimization"
          index={3}
        />
      </div>

      {/* Dynamic Charts: AC/DC Distribution & Hourly Timeline */}
      <div className="two" style={{ marginTop: 20 }}>
        <div className="card">
          <h3>
            <span>AC Supply vs. DC Supply Energy Share</span>
            <span className="card-tag">Sub-Meter Breakdown</span>
          </h3>
          <ChartBox id="energyAcDcDoughnut" type="doughnut" labels={acDcData.labels} datasets={acDcData.datasets} />
        </div>

        <div className="card">
          <h3>
            <span>Hourly Power Draw & Energy History</span>
            <span className="card-tag">Live Profile</span>
          </h3>
          <ChartBox id="energyBarChart" type="bar" labels={barData.labels} datasets={barData.datasets} />
        </div>
      </div>

      {/* Clean Energy Generation & Storage Overview */}
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
              <span>Rooftop Solar PV (DC Generation)</span>
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
              <span>Battery Bank (BESS Reserve)</span>
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
              <span>Green Offset & Avoided CO₂</span>
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
        {(d.todaysEnergy == null || d.todaysEnergy <= 120) && (
          <div className="recommendation">
            <b>Optimal Grid Load:</b> AC and DC supplies operating harmoniously at <b>{d.todaysEnergy ?? 142.5} kWh</b>. Solar DC infeed meeting 24% of diurnal demand.
          </div>
        )}
      </div>
    </>
  );
}
