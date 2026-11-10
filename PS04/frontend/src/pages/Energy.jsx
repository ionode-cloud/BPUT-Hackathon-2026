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
    </>
  );
}
