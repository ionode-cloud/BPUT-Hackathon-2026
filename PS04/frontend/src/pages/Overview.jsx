import { MdDelete, MdOpacity, MdAir, MdScience, MdGrain } from 'react-icons/md';
import ChartBox from '../components/ChartBox';
import { getOverviewChartData } from '../utils/chartHelpers';
import ExcelDownloadBtn from '../components/ExcelDownloadBtn';

export default function Overview({ data, history = [] }) {
  const d = data || {};
  const chartData = getOverviewChartData(d, history);

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
      {/* Tab Control / Export Banner */}
      <div className="tab-control-banner">
        <div className="banner-left-info">
          <div className="engine-status-pill">
            <span className="pulse-dot-small" />
            <span>Campus Cross-Domain Overview Telemetry</span>
          </div>
          <p className="banner-subtext">
            Integrated sustainability scorecards, live power & water draw curves, and multi-zone sensor health.
          </p>
        </div>
        <div className="banner-right-actions">
          <ExcelDownloadBtn tabName="overview" tabLabel="Overview" data={d} history={history} />
        </div>
      </div>

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

      {/* Real-time Energy & Water Trends Graph (Full Width) */}
      <div className="card card-full">
        <h3>
          <span>Real-time Energy & Water Trends</span>
          <span className="card-tag">Live Sensor Feed</span>
        </h3>
        <ChartBox id="overviewChart" type="line" labels={chartData.labels} datasets={chartData.datasets} />
      </div>

      {/* Alerts and Scorecard */}
      <div className="two">
        <div className="card">
          <h3>Active Alerts</h3>
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
      </div>
    </>
  );
}
