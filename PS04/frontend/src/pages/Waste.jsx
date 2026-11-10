import {
  MdWarning,
  MdRecycling,
} from 'react-icons/md';
import ChartBox from '../components/ChartBox';
import StatCard from '../components/StatCard';
import {
  getWasteTrendData,
  getDryWetBlockData,
} from '../utils/chartHelpers';
import ExcelDownloadBtn from '../components/ExcelDownloadBtn';

function formatBlockName(name, id, code) {
  if (id === 'block-a' || code === 'BL-A') return 'Block A';
  if (id === 'block-b' || code === 'BL-B') return 'Block B';
  return String(name || 'Block').replace(/\s*\(.*?\)\s*/g, '').trim();
}

function getBlockDirective(block) {
  if (block.directive) return block.directive;
  const maxFill = Math.max(block.wetFill ?? 0, block.dryFill ?? 0);
  if (maxFill > 80) return 'High fill surge! Dispatch sanitation collection immediately.';
  if (maxFill > 60) return 'Approaching capacity. Schedule collection in next sweep.';
  return 'Operating within optimal capacity.';
}

export default function Waste({ data, history = [] }) {
  const d = data || {};
  const trendData = getWasteTrendData(d, history);
  const dryWetBlockChart = getDryWetBlockData(d);

  // Live backend wasteBlocks filtered to Block A and Block B only (zero dummy fallback data)
  const blocks = Array.isArray(d.wasteBlocks)
    ? d.wasteBlocks
        .filter((b) => b && (b.id === 'block-a' || b.id === 'block-b' || b.code === 'BL-A' || b.code === 'BL-B'))
        .map((b) => ({
          ...b,
          name: formatBlockName(b.name, b.id, b.code),
        }))
    : [];

  const blockA = blocks.find((b) => b.id === 'block-a' || b.code === 'BL-A') || null;
  const blockB = blocks.find((b) => b.id === 'block-b' || b.code === 'BL-B') || null;
  const overflowBlocks = blocks.filter((b) => (b.wetFill ?? 0) > 80 || (b.dryFill ?? 0) > 80);
  const overflowCount = overflowBlocks.length > 0 ? overflowBlocks.length : (d.overflowRisk ?? 0);
  const hasOverflow = overflowCount > 0;
  const avgCompliance = blocks.length > 0
    ? (blocks.reduce((acc, b) => acc + (b.complianceScore ?? 90), 0) / blocks.length).toFixed(1)
    : '0.0';

  const totalDryKg = d.wasteDry != null ? d.wasteDry : Number(blocks.reduce((acc, b) => acc + (b.dryWeight || 0), 0).toFixed(1));
  const totalWetKg = d.wasteWet != null ? d.wasteWet : Number(blocks.reduce((acc, b) => acc + (b.wetWeight || 0), 0).toFixed(1));
  const dryFillAvg = d.wasteDryFill != null ? d.wasteDryFill : (blockB?.dryFill ?? 0);
  const wetFillAvg = d.wasteWetFill != null ? d.wasteWetFill : (blockA?.wetFill ?? 0);

  return (
    <>
      {/* Tab Control / Export Banner */}
      <div className="tab-control-banner">
        <div className="banner-left-info">
          <div className="engine-status-pill">
            <span className="pulse-dot-small" style={{ background: '#9333ea' }} />
            <span>Smart Sanitation: Dry & Wet Waste Segregation (Block-Wise Intelligence)</span>
          </div>
          <p className="banner-subtext">
            Ultrasound sonar bin transducers monitoring segregated Dry (recyclables) vs. Wet (organic) streams across all campus blocks.
          </p>
        </div>
        <div className="banner-right-actions">
          <ExcelDownloadBtn tabName="waste" tabLabel="Waste" data={d} history={history} />
        </div>
      </div>

      {/* Waste KPIs - 3 AI-Forecast Styled Cards */}
      <div className="three">
        <StatCard
          index={0}
          icon={<MdRecycling size={20} color="#10b981" />}
          label="Block A"
          badgeText={wetFillAvg > 75 ? 'Rapid Fill Rate' : 'Optimal Rate'}
          badgeType={wetFillAvg > 75 ? 'red' : 'green'}
          nowLabel="Weight"
          nowValue={totalWetKg}
          unit=" kg"
          secondaryLabel="Avg Fill"
          secondaryValue={`${wetFillAvg}%`}
          secondaryColor={wetFillAvg > 75 ? '#dc2626' : '#10b981'}
          footerLeft="Block A smart bin telemetry"
          footerRight="Sonar & weight cells active"
        />

        <StatCard
          index={1}
          icon={<MdRecycling size={20} color="#2563eb" />}
          label="Block B"
          badgeText={`${dryFillAvg}% Avg Fill`}
          badgeType={dryFillAvg > 75 ? 'amber' : 'blue'}
          nowLabel="Weight"
          nowValue={totalDryKg}
          unit=" kg"
          secondaryLabel="Avg Fill"
          secondaryValue={`${dryFillAvg}%`}
          secondaryColor="#2563eb"
          footerLeft="Block B smart bin telemetry"
          footerRight="Target: 100% recycling"
        />

        <StatCard
          index={2}
          icon={<MdWarning size={20} color={hasOverflow ? '#ef4444' : '#10b981'} />}
          label="Overflow Risk Bins"
          badgeText={hasOverflow ? `${overflowBlocks[0]?.code || 'Bin'} Warning` : 'Zero Hazard'}
          badgeType={hasOverflow ? 'red' : 'green'}
          nowLabel="At-Risk"
          nowValue={overflowCount}
          unit=" bin(s)"
          secondaryLabel="Pred. Overflow"
          secondaryValue={d.overflowPrediction != null ? `~${d.overflowPrediction}h` : '< 3.5h'}
          secondaryColor={hasOverflow ? '#dc2626' : '#15803d'}
          footerLeft={hasOverflow ? `${overflowBlocks[0]?.name || 'Block'} bin exceeds 80%` : 'Block A & B within safe limits'}
          footerRight="Priority dispatch"
        />
      </div>

      {/* Dynamic Graphs (Block comparison & generation trend) */}
      <div className="two" style={{ marginTop: 20 }}>
        <div className="card">
          <h3>
            <span>Block-Wise Dry vs. Wet Fill Comparison</span>
            <span className="card-tag">Multi-Zone Segregation</span>
          </h3>
          <ChartBox
            id="wasteDryWetBar"
            type="bar"
            labels={dryWetBlockChart.labels}
            datasets={dryWetBlockChart.datasets}
          />
        </div>

        <div className="card">
          <h3>
            <span>Waste Fill Level & Generation Trend</span>
            <span className="card-tag">Time-Series</span>
          </h3>
          <ChartBox
            id="wasteTrendChart"
            type="line"
            labels={trendData.labels}
            datasets={trendData.datasets}
          />
        </div>
      </div>

      {/* Waste Audit & AI Dispatch Directives */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3>Smart Sanitation & Autonomous Route Dispatch</h3>
        <table>
          <thead>
            <tr>
              <th>Campus Block & Zone</th>
              <th>Dry Waste (kg / %)</th>
              <th>Wet Waste (kg / %)</th>
              <th>Segregation Score</th>
              <th>Current Status</th>
              <th>Operational Directive</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((b) => {
              const maxFill = Math.max(b.wetFill ?? 0, b.dryFill ?? 0);
              return (
                <tr key={b.id}>
                  <td>
                    <b>{b.name}</b>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Code: {b.code} • Cleared: {b.lastCollection}</div>
                  </td>
                  <td>
                    <span style={{ color: '#2563eb', fontWeight: 700 }}>{b.dryWeight} kg</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}> ({b.dryFill}% fill)</span>
                  </td>
                  <td>
                    <span style={{ color: '#059669', fontWeight: 700 }}>{b.wetWeight} kg</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}> ({b.wetFill}% fill)</span>
                  </td>
                  <td>
                    <span className="badge good">{b.complianceScore}% Accuracy</span>
                  </td>
                  <td>
                    <span className={`badge ${maxFill > 80 ? 'high' : maxFill > 60 ? 'medium' : 'good'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td>{getBlockDirective(b)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: 16 }}>
          {overflowBlocks.length > 0 ? (
            <div className="recommendation recommendation--alert">
              <b>AI Urgent Dispatch Alert:</b> {overflowBlocks[0].name} waste bin is at <b>{Math.max(overflowBlocks[0].wetFill ?? 0, overflowBlocks[0].dryFill ?? 0)}%</b> capacity. Automated route directive dispatched to Sanitation Vehicle 02 to prevent odor buildup and bacterial decomposition.
            </div>
          ) : (
            <div className="recommendation">
              <b>Campus Sanitation Optimal:</b> Block A and Block B operating within safe threshold parameters. Segregation compliance running at {avgCompliance}% across monitored blocks.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
