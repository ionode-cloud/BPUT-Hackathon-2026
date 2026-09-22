import { MdWaterDrop, MdSpeed, MdWarningAmber, MdWater } from 'react-icons/md';
import ChartBox from '../components/ChartBox';
import { getWaterTrendData, getTankStorageData } from '../utils/chartHelpers';

export default function Water({ data, history = [] }) {
  const d = data || {};
  const trendData = getWaterTrendData(d, history);
  const tankData = getTankStorageData(d);

  const tankLevel = d.tankLevel ?? 0;
  const isLeaking = d.leakStatus && d.leakStatus !== 'Normal';

  return (
    <>
      {/* Primary KPI Row */}
      <div className="grid">
        <div className="card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MdWater size={20} color="#0284c7" />
            <span>Main Tank Reserve</span>
          </div>
          <div className="kpi-value">
            {d.tankLevel ?? '-'}
            {d.tankLevel != null && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>%</span>}
          </div>
          <div className="progress">
            <i
              style={{
                width: `${tankLevel}%`,
                background: tankLevel < 25 ? 'var(--red)' : tankLevel < 50 ? 'var(--orange)' : '#0284c7',
              }}
            />
          </div>
        </div>

        <div className="card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MdWaterDrop size={20} color="#3b82f6" />
            <span>Today's Total Consumption</span>
          </div>
          <div className="kpi-value">
            {d.todaysUsage != null ? d.todaysUsage.toLocaleString('en-IN') : '-'}
            {d.todaysUsage != null && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>L</span>}
          </div>
          <div className={`kpi-foot ${d.todaysUsage > 3000 ? 'warn' : ''}`}>
            {d.todaysUsage != null
              ? (d.todaysUsage > 3000 ? 'Higher than baseline quota' : 'Normal campus consumption')
              : '-'}
          </div>
        </div>

        <div className="card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MdSpeed size={20} color="#10b981" />
            <span>Current Flow Rate</span>
          </div>
          <div className="kpi-value">
            {d.flowRate ?? '-'}
            {d.flowRate != null && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>L/min</span>}
          </div>
          <div className={`kpi-foot ${d.flowRate > 20 ? 'warn' : ''}`}>
            {d.flowRate != null
              ? (d.flowRate > 20 ? 'High velocity detected' : 'Steady hydraulic pressure')
              : '-'}
          </div>
        </div>

        <div className="card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MdWarningAmber size={20} color={isLeaking ? '#ef4444' : '#10b981'} />
            <span>Acoustic Leak Detection</span>
          </div>
          <div
            className="kpi-value"
            style={{ color: isLeaking ? 'var(--red)' : d.leakStatus ? 'var(--green)' : 'var(--text)', fontSize: 26 }}
          >
            {d.leakStatus ?? '-'}
          </div>
          <div className="kpi-foot" style={{ color: isLeaking ? 'var(--red)' : 'var(--green)' }}>
            {d.leakStatus != null
              ? (isLeaking ? 'Pressure drop detected!' : 'All pipes integrity intact')
              : '-'}
          </div>
        </div>
      </div>

      {/* Dynamic Visualizations */}
      <div className="two">
        <div className="card">
          <h3>
            <span>Water Consumption & Flow Rate Timeline</span>
            <span className="card-tag">Telemetry</span>
          </h3>
          <ChartBox id="waterTrendChart" type="line" labels={trendData.labels} datasets={trendData.datasets} />
        </div>

        <div className="card">
          <h3>
            <span>Reservoir Capacity Breakdown</span>
            <span className="card-tag">{d.tankLevel != null ? `${d.tankLevel}% Fill` : '-'}</span>
          </h3>
          <ChartBox id="waterTankDoughnut" type="doughnut" labels={tankData.labels} datasets={tankData.datasets} />
        </div>
      </div>

      {/* Asset Audit and AI Diagnostics */}
      <div className="card">
        <h3>Hydraulic Diagnostics & Conservation Directives</h3>
        <table>
          <thead>
            <tr>
              <th>Hydraulic Metric</th>
              <th>Sensor Reading</th>
              <th>Operational Status</th>
              <th>Safety Recommendation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Main Storage Tank</td>
              <td><b>{d.tankLevel != null ? `${d.tankLevel}%` : '-'}</b></td>
              <td>
                <span className={`badge ${d.tankLevel != null ? (tankLevel < 25 ? 'high' : tankLevel < 50 ? 'medium' : 'good') : ''}`}>
                  {d.tankLevel != null ? (tankLevel < 25 ? 'Critical Level' : tankLevel < 50 ? 'Medium' : 'Sufficient') : '-'}
                </span>
              </td>
              <td>{d.tankLevel != null ? (tankLevel < 30 ? 'Initiate raw water transfer pump' : 'Capacity healthy') : '-'}</td>
            </tr>
            <tr>
              <td>Line Flow Velocity</td>
              <td><b>{d.flowRate != null ? `${d.flowRate} L/min` : '-'}</b></td>
              <td>
                <span className={`badge ${d.flowRate != null ? (d.flowRate > 20 ? 'medium' : 'good') : ''}`}>
                  {d.flowRate != null ? (d.flowRate > 20 ? 'Heavy Flow' : 'Standard') : '-'}
                </span>
              </td>
              <td>{d.flowRate != null ? (d.flowRate > 20 ? 'Inspect washroom solenoid valves' : 'Flow rates balanced') : '-'}</td>
            </tr>
            <tr>
              <td>Pressure & Leak Sensor</td>
              <td><b>{d.leakStatus ?? '-'}</b></td>
              <td>
                <span className={`badge ${d.leakStatus != null ? (isLeaking ? 'high' : 'good') : ''}`}>
                  {d.leakStatus != null ? (isLeaking ? 'Alarm' : 'Nominal') : '-'}
                </span>
              </td>
              <td>{d.leakStatus != null ? (isLeaking ? 'Dispatch plumber to block valve #4' : 'Zero pressure loss') : '-'}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 16 }}>
          {isLeaking ? (
            <div className="recommendation recommendation--alert">
              <b>Emergency Water Alert:</b> Acoustic anomaly confirmed ({d.leakStatus}). Automatic shutoff valve armed for branch pipeline B.
            </div>
          ) : d.tankLevel != null ? (
            <div className="recommendation">
              <b>Hydraulic System Healthy:</b> Tank holding {d.tankLevel}% with average delivery flow of {d.flowRate ?? '-'} L/min.
            </div>
          ) : (
            <div className="small" style={{ color: 'var(--muted)' }}>-</div>
          )}
        </div>
      </div>
    </>
  );
}
