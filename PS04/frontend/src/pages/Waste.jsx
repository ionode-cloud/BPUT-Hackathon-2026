import { useState } from 'react';
import {
  MdDelete,
  MdWarning,
  MdRecycling,
  MdApartment,
  MdRestaurant,
  MdLocalHotel,
  MdMenuBook,
  MdScience,
  MdCheckCircle,
  MdAccessTime,
  MdFilterList,
} from 'react-icons/md';
import ChartBox from '../components/ChartBox';
import StatCard from '../components/StatCard';
import {
  getWasteTrendData,
  getWasteBinDistribution,
  getDryWetBlockData,
} from '../utils/chartHelpers';
import ExcelDownloadBtn from '../components/ExcelDownloadBtn';

export default function Waste({ data, history = [] }) {
  const d = data || {};
  const trendData = getWasteTrendData(d, history);
  const binData = getWasteBinDistribution(d);
  const dryWetBlockChart = getDryWetBlockData(d);

  const [activeFilter, setActiveFilter] = useState('all');

  const fillPct = d.averageFill ?? 0;
  const hasOverflow = (d.overflowRisk ?? 0) > 0;

  // Block-wise data with dry/wet breakdown
  const blocks = Array.isArray(d.wasteBlocks) && d.wasteBlocks.length > 0
    ? d.wasteBlocks
    : [
        {
          id: 'block-a',
          name: 'Block A (Academic & Lecture Theatres)',
          category: 'academic',
          code: 'BL-A',
          icon: <MdMenuBook size={20} color="#2563eb" />,
          dryFill: 42,
          wetFill: 28,
          dryWeight: 26.5,
          wetWeight: 9.8,
          status: 'Optimal',
          complianceScore: 94,
          lastCollection: '2h ago',
          directive: 'Paper & packaging bins optimal. Next sweep at 16:30.',
        },
        {
          id: 'block-b',
          name: 'Block B (Hostel Towers & Residential)',
          category: 'hostels',
          code: 'BL-B',
          icon: <MdLocalHotel size={20} color="#8b5cf6" />,
          dryFill: 68,
          wetFill: 62,
          dryWeight: 42.0,
          wetWeight: 38.5,
          status: 'Moderate',
          complianceScore: 88,
          lastCollection: '3h ago',
          directive: 'Hostel block common bins at 65% capacity. Dispatch in evening run.',
        },
        {
          id: 'block-c',
          name: 'Block C (Central Library & Administration)',
          category: 'academic',
          code: 'BL-C',
          icon: <MdApartment size={20} color="#0284c7" />,
          dryFill: 36,
          wetFill: 18,
          dryWeight: 19.5,
          wetWeight: 5.2,
          status: 'Optimal',
          complianceScore: 96,
          lastCollection: '1h ago',
          directive: '96% segregation accuracy. Paper shredder container healthy.',
        },
        {
          id: 'block-d',
          name: 'Block D (Campus Canteen & Food Courts)',
          category: 'canteen',
          code: 'BL-D',
          icon: <MdRestaurant size={20} color="#f59e0b" />,
          dryFill: 58,
          wetFill: 88,
          dryWeight: 31.0,
          wetWeight: 59.5,
          status: 'Wet Overflow Risk',
          complianceScore: 82,
          lastCollection: '4h ago',
          directive: 'High wet organic surge! Automatic collection truck dispatch recommended.',
        },
        {
          id: 'block-e',
          name: 'Block E (R&D Labs & Technical Complex)',
          category: 'labs',
          code: 'BL-E',
          icon: <MdScience size={20} color="#059669" />,
          dryFill: 52,
          wetFill: 24,
          dryWeight: 23.0,
          wetWeight: 7.5,
          status: 'Optimal',
          complianceScore: 91,
          lastCollection: '2h ago',
          directive: 'E-waste & consumable cartridges segregated per ISO protocol.',
        },
      ];

  const filteredBlocks = blocks.filter((b) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'academic') return b.category === 'academic';
    if (activeFilter === 'hostels') return b.category === 'hostels';
    if (activeFilter === 'canteen') return b.category === 'canteen';
    if (activeFilter === 'labs') return b.category === 'labs';
    return true;
  });

  const totalDryKg = d.wasteDry != null ? d.wasteDry : blocks.reduce((acc, b) => acc + (b.dryWeight || 0), 0).toFixed(1);
  const totalWetKg = d.wasteWet != null ? d.wasteWet : blocks.reduce((acc, b) => acc + (b.wetWeight || 0), 0).toFixed(1);
  const dryFillAvg = d.wasteDryFill != null ? d.wasteDryFill : Math.round(blocks.reduce((acc, b) => acc + (b.dryFill || 0), 0) / blocks.length);
  const wetFillAvg = d.wasteWetFill != null ? d.wasteWetFill : Math.round(blocks.reduce((acc, b) => acc + (b.wetFill || 0), 0) / blocks.length);

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

      {/* Waste KPIs - 4 AI-Forecast Styled Cards */}
      <div className="grid">
        <StatCard
          index={0}
          icon={<MdDelete size={20} color="#3b82f6" />}
          label="Monitored Smart Bins"
          badgeText={d.totalBins != null ? 'All Hubs Online' : 'Active'}
          badgeType="green"
          nowLabel="Campus Bins"
          nowValue={d.totalBins ?? 12}
          unit=" units"
          secondaryLabel="Active Blocks"
          secondaryValue="5 Blocks"
          secondaryColor="#2563eb"
          footerLeft="Sonar level & weight cells active"
          footerRight="Block A–E coverage"
        />

        <StatCard
          index={1}
          icon={<MdRecycling size={20} color="#2563eb" />}
          label="Dry Waste (Recyclables)"
          badgeText={`${dryFillAvg}% Avg Fill`}
          badgeType={dryFillAvg > 75 ? 'amber' : 'blue'}
          nowLabel="Dry Weight"
          nowValue={totalDryKg}
          unit=" kg"
          secondaryLabel="Dry Avg Fill"
          secondaryValue={`${dryFillAvg}%`}
          secondaryColor="#2563eb"
          footerLeft="Paper, plastics, cardboard sorted"
          footerRight="Target: 100% recycling"
        />

        <StatCard
          index={2}
          icon={<MdRecycling size={20} color="#10b981" />}
          label="Wet Waste (Organic)"
          badgeText={wetFillAvg > 75 ? 'Rapid Fill Rate' : 'Optimal Rate'}
          badgeType={wetFillAvg > 75 ? 'red' : 'green'}
          nowLabel="Wet Weight"
          nowValue={totalWetKg}
          unit=" kg"
          secondaryLabel="Wet Avg Fill"
          secondaryValue={`${wetFillAvg}%`}
          secondaryColor={wetFillAvg > 75 ? '#dc2626' : '#10b981'}
          footerLeft="Food court & hostel organic bio-feed"
          footerRight="Biogas feed conversion"
        />

        <StatCard
          index={3}
          icon={<MdWarning size={20} color={hasOverflow ? '#ef4444' : '#10b981'} />}
          label="Overflow Risk Bins"
          badgeText={hasOverflow ? 'Canteen Warning' : 'Zero Hazard'}
          badgeType={hasOverflow ? 'red' : 'green'}
          nowLabel="At-Risk"
          nowValue={d.overflowRisk != null ? d.overflowRisk : 1}
          unit=" bin(s)"
          secondaryLabel="Pred. Overflow"
          secondaryValue={d.overflowPrediction != null ? `~${d.overflowPrediction}h` : '< 3.5h'}
          secondaryColor={hasOverflow ? '#dc2626' : '#15803d'}
          footerLeft={hasOverflow ? 'Canteen wet bin exceeds 85%' : 'All blocks within safe limits'}
          footerRight="Priority dispatch"
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          Block-Wise Waste Segregation Matrix (Dry vs. Wet Breakdown)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdApartment size={22} color="#7c3aed" />
              <span>Campus Block-Wise Waste Segregation & Fill Status</span>
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
              Real-time telemetry showing segregated Dry (Blue) vs. Wet (Green) container levels for each campus zone.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="filter-pill-group">
            <span className="filter-label"><MdFilterList size={14} /> Filter:</span>
            <button
              type="button"
              className={`filter-tab-pill ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All Blocks ({blocks.length})
            </button>
            <button
              type="button"
              className={`filter-tab-pill ${activeFilter === 'academic' ? 'active' : ''}`}
              onClick={() => setActiveFilter('academic')}
            >
              Academic & Admin
            </button>
            <button
              type="button"
              className={`filter-tab-pill ${activeFilter === 'hostels' ? 'active' : ''}`}
              onClick={() => setActiveFilter('hostels')}
            >
              Hostel Towers
            </button>
            <button
              type="button"
              className={`filter-tab-pill ${activeFilter === 'canteen' ? 'active' : ''}`}
              onClick={() => setActiveFilter('canteen')}
            >
              Canteen & Food
            </button>
            <button
              type="button"
              className={`filter-tab-pill ${activeFilter === 'labs' ? 'active' : ''}`}
              onClick={() => setActiveFilter('labs')}
            >
              Technical Labs
            </button>
          </div>
        </div>

        {/* Block Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 16 }}>
          {filteredBlocks.map((b) => {
            const isCritical = b.wetFill > 80 || b.dryFill > 80;
            const isWarn = b.wetFill > 60 || b.dryFill > 60;
            const badgeBg = isCritical ? '#fee2e2' : isWarn ? '#fef3c7' : '#dcfce7';
            const badgeColor = isCritical ? '#dc2626' : isWarn ? '#b45309' : '#15803d';

            return (
              <div
                key={b.id}
                style={{
                  background: '#ffffff',
                  border: isCritical ? '1.5px solid #fca5a5' : '1px solid var(--border-card)',
                  borderRadius: 16,
                  padding: '16px 18px',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Left accent strip */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: 4,
                    background: isCritical
                      ? '#ef4444'
                      : isWarn
                      ? '#f59e0b'
                      : 'linear-gradient(180deg, #3b82f6 0%, #10b981 100%)',
                  }}
                />

                {/* Card Top */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ padding: 6, borderRadius: 8, background: '#f1f5f9' }}>
                      {b.icon}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 750, color: 'var(--text)' }}>
                        {b.name}
                      </h4>
                      <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
                        Code: {b.code} • Cleared: {b.lastCollection}
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      background: badgeBg,
                      color: badgeColor,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 999,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {b.status}
                  </span>
                </div>

                {/* Dual Gauges: Dry vs Wet */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  {/* Dry Waste Gauge */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                        Dry Waste (Recyclables)
                      </span>
                      <span style={{ fontWeight: 800, color: 'var(--text)' }}>
                        {b.dryFill}% <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)' }}>({b.dryWeight} kg)</span>
                      </span>
                    </div>
                    <div style={{ height: 7, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, b.dryFill)}%`,
                          height: '100%',
                          background: b.dryFill > 80 ? '#ef4444' : '#3b82f6',
                          borderRadius: 999,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Wet Waste Gauge */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                        Wet Waste (Organic)
                      </span>
                      <span style={{ fontWeight: 800, color: 'var(--text)' }}>
                        {b.wetFill}% <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)' }}>({b.wetWeight} kg)</span>
                      </span>
                    </div>
                    <div style={{ height: 7, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, b.wetFill)}%`,
                          height: '100%',
                          background: b.wetFill > 80 ? '#ef4444' : b.wetFill > 60 ? '#f59e0b' : '#10b981',
                          borderRadius: 999,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer: Compliance & Directive */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5 }}>
                  <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                    <MdCheckCircle size={14} color="#10b981" />
                    Segregation: <b>{b.complianceScore}% Score</b>
                  </span>
                  <span style={{ color: 'var(--muted)', fontSize: 11 }}>
                    Total: {(b.dryWeight + b.wetWeight).toFixed(1)} kg
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                  💡 {b.directive}
                </div>
              </div>
            );
          })}
        </div>
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
            {blocks.map((b) => (
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
                  <span className={`badge ${b.wetFill > 80 ? 'high' : b.wetFill > 60 ? 'medium' : 'good'}`}>
                    {b.status}
                  </span>
                </td>
                <td>{b.directive}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 16 }}>
          {hasOverflow || blocks.some((b) => b.wetFill > 80) ? (
            <div className="recommendation recommendation--alert">
              <b>AI Urgent Dispatch Alert:</b> Block D (Campus Canteen) wet waste bin is at 88% capacity. Automated route directive dispatched to Sanitation Vehicle 02 to prevent odor buildup and bacterial decomposition.
            </div>
          ) : (
            <div className="recommendation">
              <b>Campus Sanitation Optimal:</b> All 5 blocks operating within safe threshold parameters. Segregation compliance running at 91.2% campus-wide.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
