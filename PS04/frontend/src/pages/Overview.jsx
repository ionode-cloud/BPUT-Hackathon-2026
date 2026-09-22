import { MdWarning, MdDelete, MdOpacity, MdElectricBolt, MdAir, MdScience, MdGrain } from 'react-icons/md';
import ChartBox from '../components/ChartBox';
import { getOverviewChartData } from '../utils/chartHelpers';

export default function Overview({ data, history = [] }) {
  const d = data || {};
  const chartData = getOverviewChartData(d, history);

  // Live Facility Zones derived from real sensor parameters
  const zones = [
    { name: 'Academic Block', stat: d.aqi != null ? `AQI: ${d.aqi}` : '-', pct: d.aqi ?? 0, color: d.aqi > 100 ? 'var(--orange)' : 'var(--primary)' },
    { name: 'Health Center', stat: d.pm25 != null ? `PM2.5: ${d.pm25} µg/m³` : '-', pct: Math.min((d.pm25 ?? 0) * 1.5, 100), color: d.pm25 > 35 ? 'var(--orange)' : 'var(--green)' },
    { name: 'Environmental & Chemistry Lab', stat: d.nh3 != null ? `NH3: ${d.nh3} ppm • VOC: ${d.voc ?? '-'} ppm` : '-', pct: Math.min(((d.nh3 ?? 0) / 25) * 100, 100), color: (d.nh3 > 25 || d.voc > 0.5) ? 'var(--orange)' : 'var(--green)' },
    { name: 'Smart Parking', stat: d.parkingOccupancy != null ? `${d.parkingOccupancy}% occupied` : '-', pct: d.parkingOccupancy ?? 0, color: d.parkingOccupancy > 80 ? 'var(--red)' : 'var(--primary)' },
    { name: 'Industrial Substation', stat: d.livePower != null ? `Live: ${d.livePower} kW` : '-', pct: d.utilization ?? 0, color: 'var(--primary)' },
    { name: 'Main Reservoir', stat: d.tankLevel != null ? `${d.tankLevel}% capacity` : '-', pct: d.tankLevel ?? 0, color: d.tankLevel < 30 ? 'var(--red)' : 'var(--green)' },
    { name: 'Waste Processing Zone', stat: d.averageFill != null ? `Avg fill: ${d.averageFill}%` : '-', pct: d.averageFill ?? 0, color: d.averageFill > 75 ? 'var(--red)' : 'var(--primary)' },
  ];

  // Dynamic Sustainability Scorecard
  const energyEff = d.todaysEnergy ? Math.min(Math.round((1 - d.todaysEnergy / 220) * 100 + 40), 100) : 0;
  const waterEff = d.todaysUsage ? Math.min(Math.round((1 - d.todaysUsage / 5000) * 100 + 30), 100) : 0;
  const wasteEff = d.averageFill ? Math.max(100 - d.averageFill, 15) : 0;
  const safetyEff = d.safetyScore ?? 0;

  const scorecard = [
    { label: 'Energy Efficiency', val: d.todaysEnergy != null ? `${energyEff}/100` : '-', pct: energyEff, color: 'var(--primary)' },
    { label: 'Water Conservation', val: d.todaysUsage != null ? `${waterEff}/100` : '-', pct: waterEff, color: 'var(--green)' },
    { label: 'Waste Management', val: d.averageFill != null ? `${wasteEff}/100` : '-', pct: wasteEff, color: 'var(--orange)' },
    { label: 'Safety Rating', val: d.safetyScore != null ? `${safetyEff}/100` : '-', pct: safetyEff, color: 'var(--primary)' },
  ];

  return (
    <>
      {/* KPI Row */}
      <div className="grid">
        <div className="card">
          <div className="kpi-label">Sustainability Score</div>
          <div className="kpi-value">
            {d.sustainabilityScore ?? '-'}
            {d.sustainabilityScore != null && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>/100</span>}
          </div>
          <div className="kpi-foot">
            {d.sustainabilityScore != null
              ? (d.sustainabilityScore >= 80 ? '★ Excellent rating' : d.sustainabilityScore >= 60 ? '✓ Good standing' : 'Needs attention')
              : '-'}
          </div>
        </div>

        <div className="card">
          <div className="kpi-label">Air Quality Index (AQI)</div>
          <div className="kpi-value">{d.aqi ?? '-'}</div>
          <div className={`kpi-foot ${d.aqi > 100 ? 'bad' : d.aqi > 50 ? 'warn' : ''}`}>
            {d.aqi != null
              ? `${d.aqi > 200 ? 'Very Poor' : d.aqi > 100 ? 'Unhealthy' : d.aqi > 50 ? 'Moderate' : 'Good Quality'} • Continuous monitoring`
              : '-'}
          </div>
        </div>

        <div className="card">
          <div className="kpi-label">Today's Energy Usage</div>
          <div className="kpi-value">
            {d.todaysEnergy ?? '-'}
            {d.todaysEnergy != null && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>kWh</span>}
          </div>
          <div className="kpi-foot">
            {d.peakDemand != null ? `Peak demand: ${d.peakDemand} kW` : '-'}
          </div>
        </div>

        <div className="card">
          <div className="kpi-label">Water Consumption</div>
          <div className="kpi-value">
            {d.todaysUsage != null ? d.todaysUsage.toLocaleString('en-IN') : '-'}
            {d.todaysUsage != null && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>L</span>}
          </div>
          <div className={`kpi-foot ${d.todaysUsage > 3000 ? 'warn' : ''}`}>
            {d.todaysUsage != null
              ? (d.todaysUsage > 3000 ? 'High consumption' : 'Within normal quota')
              : '-'}
          </div>
        </div>
      </div>

      {/* Dynamic Graph + Live Zones */}
      <div className="two">
        <div className="card">
          <h3>
            <span>Real-time Energy & Water Trends</span>
            <span className="card-tag">Live Sensor Feed</span>
          </h3>
          <ChartBox id="overviewChart" type="line" labels={chartData.labels} datasets={chartData.datasets} />
        </div>

        <div className="card">
          <h3>
            <span>Live Facility Zones</span>
            <span className="card-tag">{zones.length} Zones Active</span>
          </h3>
          <div className="map">
            {zones.map(z => (
              <div key={z.name} className="zone">
                <strong>{z.name}</strong>
                <span>{z.stat}</span>
                <div className="progress">
                  <i style={{ width: `${z.pct}%`, background: z.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts, Scorecard, and Recommendations */}
      <div className="three">
        <div className="card">
          <h3>Active Facility Alerts</h3>
          {d.pm25 > 35 && (
            <div className="alert">
              <div className="alert-icon"><MdAir size={22} color="#f59e0b" /></div>
              <div>
                <b>Elevated PM2.5 — {d.pm25} µg/m³</b><br />
                <span className="small">Filter checks recommended</span>
              </div>
            </div>
          )}
          {d.overflowRisk > 0 && (
            <div className="alert">
              <div className="alert-icon"><MdDelete size={22} color="#ef4444" /></div>
              <div>
                <b>{d.overflowRisk} bin(s) at overflow risk</b><br />
                <span className="small">Collection advised within {d.overflowPrediction ?? '-'} hrs</span>
              </div>
            </div>
          )}
          {d.leakStatus && d.leakStatus !== 'Normal' && (
            <div className="alert">
              <div className="alert-icon"><MdOpacity size={22} color="#ef4444" /></div>
              <div>
                <b>Water alert: {d.leakStatus}</b><br />
                <span className="small">Check flow rate ({d.flowRate ?? '-'} L/min)</span>
              </div>
            </div>
          )}
          {d.nh3 > 25 && (
            <div className="alert">
              <div className="alert-icon"><MdScience size={22} color="#ef4444" /></div>
              <div>
                <b>Ammonia Hazard: {d.nh3} ppm</b><br />
                <span className="small">Chemical fume alert; activate exhaust system</span>
              </div>
            </div>
          )}
          {d.voc > 0.5 && (
            <div className="alert">
              <div className="alert-icon"><MdGrain size={22} color="#f59e0b" /></div>
              <div>
                <b>Elevated VOC: {d.voc} ppm</b><br />
                <span className="small">Volatile organic vapor density high</span>
              </div>
            </div>
          )}
          {(!d.pm25 || d.pm25 <= 35) && (!d.overflowRisk || d.overflowRisk === 0) && (!d.leakStatus || d.leakStatus === 'Normal') && (!d.nh3 || d.nh3 <= 25) && (!d.voc || d.voc <= 0.5) && (
            <div className="small" style={{ padding: '16px 0', color: 'var(--green)', fontWeight: 600 }}>
              {d.sustainabilityScore != null ? '✔ All environmental systems operating within safe thresholds' : '-'}
            </div>
          )}
        </div>

        <div className="card">
          <h3>Sustainability Breakdown</h3>
          {scorecard.map(s => (
            <div key={s.label} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span className="small">{s.label}</span>
                <b>{s.val}</b>
              </div>
              <div className="progress">
                <i style={{ width: `${s.pct}%`, background: s.color }} />
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>AI Advisory & Directives</h3>
          {d.todaysEnergy > 120 && (
            <div className="recommendation recommendation--warn">
              <b>HVAC Advisory:</b> Consumption at {d.todaysEnergy} kWh. Adjust thermostat in zones with low occupancy.
            </div>
          )}
          {d.overflowRisk > 0 && (
            <div className="recommendation recommendation--alert">
              <b>Waste Dispatch:</b> {d.overflowRisk} bin(s) near full capacity. Prioritize route A collection.
            </div>
          )}
          {d.tankLevel < 35 && d.tankLevel != null && (
            <div className="recommendation recommendation--alert">
              <b>Water Reserve:</b> Tank at {d.tankLevel}%. Trigger auxiliary borehole pump.
            </div>
          )}
          {d.sustainabilityScore != null && (!d.todaysEnergy || d.todaysEnergy <= 120) && (!d.overflowRisk || d.overflowRisk === 0) && (
            <div className="recommendation">
              <b>Optimal Operation:</b> Facility power and water consumption are operating within green efficiency benchmarks.
            </div>
          )}
          {d.sustainabilityScore == null && (
            <div className="small" style={{ color: 'var(--muted)' }}>-</div>
          )}
        </div>
      </div>
    </>
  );
}
