import { MdDelete, MdWarning, MdRecycling } from 'react-icons/md';
import ChartBox from '../components/ChartBox';
import StatCard from '../components/StatCard';
import { getWasteTrendData, getWasteBinDistribution } from '../utils/chartHelpers';
import ExcelDownloadBtn from '../components/ExcelDownloadBtn';

export default function Waste({ data, history = [] }) {
  const d = data || {};
  const trendData = getWasteTrendData(d, history);
  const binData = getWasteBinDistribution(d);

  const fillPct = d.averageFill ?? 0;
  const hasOverflow = (d.overflowRisk ?? 0) > 0;

  return (
    <>
      {/* Tab Control / Export Banner */}
      <div className="tab-control-banner">
        <div className="banner-left-info">
          <div className="engine-status-pill">
            <span className="pulse-dot-small" style={{ background: '#9333ea' }} />
            <span>Smart Sanitation & Waste Logistics Intelligence</span>
          </div>
          <p className="banner-subtext">
            Ultrasound volumetric bin level sensors streaming campus block status with predictive overflow dispatch alerts.
          </p>
        </div>
        <div className="banner-right-actions">
          <ExcelDownloadBtn tabName="waste" tabLabel="Waste" data={d} history={history} />
        </div>
      </div>

      {/* Waste KPIs */}
      <div className="grid">
        <StatCard
          index={0}
          icon={<MdDelete size={18} color="#3b82f6" />}
          label="Monitored Smart Bins"
          badgeText={d.totalBins != null ? 'All Online' : 'No Data'}
          badgeType="green"
          nowLabel="Now"
          nowValue={d.totalBins ?? '-'}
          unit={d.totalBins != null ? ' bins' : ''}
          secondaryLabel="Health"
          secondaryValue="100% Active"
          secondaryColor="#15803d"
          footerLeft={d.totalBins != null ? 'Ultrasound fill sensors active' : '-'}
          footerRight="95% uptime range: 99.8%"
        />

        <StatCard
          index={1}
          icon={<MdRecycling size={18} color="#f59e0b" />}
          label="Average Bin Fill Level"
          badgeText={fillPct > 80 ? 'Overflow Risk' : fillPct > 60 ? 'Elevated' : 'Optimal'}
          badgeType={fillPct > 80 ? 'red' : fillPct > 60 ? 'amber' : 'green'}
          nowLabel="Now"
          nowValue={d.averageFill ?? '-'}
          unit={d.averageFill != null ? '%' : ''}
          secondaryLabel="Target"
          secondaryValue="< 80%"
          secondaryColor={fillPct > 80 ? '#dc2626' : '#15803d'}
          footerLeft={fillPct > 80 ? 'Dispatch collection team' : 'Sufficient container volume'}
          footerRight="Target cap: 80%"
        />

        <StatCard
          index={2}
          icon={<MdRecycling size={18} color="#10b981" />}
          label="Cumulative Waste Collected"
          badgeText={d.wasteCollected != null ? 'Runs Active' : 'No Data'}
          badgeType="green"
          nowLabel="Now"
          nowValue={d.wasteCollected ?? '-'}
          unit={d.wasteCollected != null ? ' kg' : ''}
          secondaryLabel="Daily Target"
          secondaryValue="200 kg"
          secondaryColor="#15803d"
          footerLeft={d.wasteCollected != null ? "Cleared in today's runs" : '-'}
          footerRight="Recycling quota: 75%"
        />

        <StatCard
          index={3}
          icon={<MdWarning size={18} color={hasOverflow ? '#ef4444' : '#10b981'} />}
          label="Overflow Risk Bins"
          badgeText={hasOverflow ? 'Dispatch Required' : 'Zero Hazard'}
          badgeType={hasOverflow ? 'red' : 'green'}
          nowLabel="Now"
          nowValue={d.overflowRisk != null ? d.overflowRisk : 0}
          unit=" units"
          secondaryLabel="Pred. Overflow"
          secondaryValue={d.overflowPrediction != null ? `~${d.overflowPrediction}h` : '> 24h'}
          secondaryColor={hasOverflow ? '#dc2626' : '#15803d'}
          footerLeft={hasOverflow ? `Overflow in ~${d.overflowPrediction ?? '-'} hrs` : 'No overflow hazards'}
          footerRight="Dispatch threshold: 1"
        />
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
