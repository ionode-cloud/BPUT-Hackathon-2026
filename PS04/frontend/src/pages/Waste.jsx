import { MdDelete, MdWarning, MdRecycling } from 'react-icons/md';
import ChartBox from '../components/ChartBox';
import { getWasteTrendData, getWasteBinDistribution } from '../utils/chartHelpers';

export default function Waste({ data, history = [] }) {
  const d = data || {};
  const trendData = getWasteTrendData(d, history);
  const binData = getWasteBinDistribution(d);

  const fillPct = d.averageFill ?? 0;
  const hasOverflow = (d.overflowRisk ?? 0) > 0;

  return (
    <>
      {/* Waste KPIs */}
      <div className="grid">
        <div className="card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdDelete size={20} color="#3b82f6" />
            <span>Monitored Smart Bins</span>
          </div>
          <div className="kpi-value">{d.totalBins ?? '-'}</div>
          <div className="kpi-foot">{d.totalBins != null ? 'Ultrasound fill sensors active' : '-'}</div>
        </div>

        <div className="card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdRecycling size={20} color="#f59e0b" />
            <span>Average Bin Fill Level</span>
          </div>
          <div className="kpi-value">
            {d.averageFill ?? '-'}
            {d.averageFill != null && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>%</span>}
          </div>
          <div className="progress">
            <i
              style={{
                width: `${fillPct}%`,
                background: fillPct > 80 ? 'var(--red)' : fillPct > 60 ? 'var(--orange)' : 'var(--primary)',
              }}
            />
          </div>
        </div>

        <div className="card">
          <div className="kpi-label">Cumulative Waste Collected</div>
          <div className="kpi-value">
            {d.wasteCollected ?? '-'}
            {d.wasteCollected != null && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>kg</span>}
          </div>
          <div className="kpi-foot">{d.wasteCollected != null ? "Cleared in today's runs" : '-'}</div>
        </div>

        <div className="card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdWarning size={20} color={hasOverflow ? '#ef4444' : '#10b981'} />
            <span>Overflow Risk Bins</span>
          </div>
          <div
            className="kpi-value"
            style={{ color: hasOverflow ? 'var(--red)' : d.overflowRisk != null ? 'var(--green)' : 'var(--text)' }}
          >
            {d.overflowRisk != null ? `${d.overflowRisk} units` : '-'}
          </div>
          <div className="kpi-foot" style={{ color: hasOverflow ? 'var(--red)' : 'var(--green)' }}>
            {d.overflowRisk != null
              ? (hasOverflow ? `Overflow in ~${d.overflowPrediction ?? '-'} hrs` : 'No overflow hazards')
              : '-'}
          </div>
        </div>
      </div>

      {/* Dynamic Graphs */}
      <div className="two">
        <div className="card">
          <h3>
            <span>Waste Fill Level & Generation Trend</span>
            <span className="card-tag">Dynamic</span>
          </h3>
          <ChartBox id="wasteTrendChart" type="line" labels={trendData.labels} datasets={trendData.datasets} />
        </div>

        <div className="card">
          <h3>
            <span>Bin Status & Capacity Distribution</span>
            <span className="card-tag">{d.totalBins != null ? `${d.totalBins} Total` : '-'}</span>
          </h3>
          <ChartBox id="wasteBinDoughnut" type="doughnut" labels={binData.labels} datasets={binData.datasets} />
        </div>
      </div>

      {/* Waste Audit & AI Scheduling */}
      <div className="card">
        <h3>Smart Sanitation & Route Optimization</h3>
        <table>
          <thead>
            <tr>
              <th>Sanitation Indicator</th>
              <th>Current Reading</th>
              <th>Status</th>
              <th>Action Plan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Campus Bin Network</td>
              <td><b>{d.totalBins != null ? `${d.totalBins} bins` : '-'}</b></td>
              <td><span className={`badge ${d.totalBins != null ? 'good' : ''}`}>{d.totalBins != null ? 'Operational' : '-'}</span></td>
              <td>{d.totalBins != null ? 'Battery & telemetry signal healthy' : '-'}</td>
            </tr>
            <tr>
              <td>Average Fill Ratio</td>
              <td><b>{d.averageFill != null ? `${d.averageFill}%` : '-'}</b></td>
              <td>
                <span className={`badge ${d.averageFill != null ? (fillPct > 80 ? 'high' : fillPct > 60 ? 'medium' : 'good') : ''}`}>
                  {d.averageFill != null ? (fillPct > 80 ? 'Critical' : fillPct > 60 ? 'Moderate' : 'Normal') : '-'}
                </span>
              </td>
              <td>{d.averageFill != null ? (fillPct > 70 ? 'Advance collection by 2 hours' : 'Regular pickup interval') : '-'}</td>
            </tr>
            <tr>
              <td>Overflow Imminent</td>
              <td><b>{d.overflowRisk != null ? `${d.overflowRisk} bin(s)` : '-'}</b></td>
              <td>
                <span className={`badge ${d.overflowRisk != null ? (hasOverflow ? 'high' : 'good') : ''}`}>
                  {d.overflowRisk != null ? (hasOverflow ? 'Alert' : 'Clear') : '-'}
                </span>
              </td>
              <td>{d.overflowRisk != null ? (hasOverflow ? `Predicted overflow in ${d.overflowPrediction ?? '-'}h` : 'No immediate hazard') : '-'}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 16 }}>
          {hasOverflow ? (
            <div className="recommendation recommendation--alert">
              <b>AI Dispatch Priority:</b> {d.overflowRisk} bin(s) reaching critical 90%+ volume. Smart truck route optimized for Gate 3 & Canteen hubs.
            </div>
          ) : d.averageFill != null ? (
            <div className="recommendation">
              <b>Sanitation Status Normal:</b> Fill levels are running at {d.averageFill}%. Next automated collection scheduled per timetable.
            </div>
          ) : (
            <div className="small" style={{ color: 'var(--muted)' }}>-</div>
          )}
        </div>
      </div>
    </>
  );
}
