import { useState, useMemo, useEffect } from 'react';
import {
  MdTableRows,
  MdNavigateBefore,
  MdNavigateNext,
  MdCheckCircle,
  MdHelpOutline,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdSignalCellularAlt,
} from 'react-icons/md';

function toFinite(v, fallback = 0) {
  if (v == null || v === '') return fallback;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function formatVal(v) {
  if (v == null || v === '') return '-';
  const num = Number(v);
  if (!Number.isFinite(num)) return '-';
  if (Number.isInteger(num)) return String(num);
  return num.toFixed(Math.abs(num) < 1 ? 2 : 1);
}

// Mini SVG Curve Component with Shaded Confidence Envelope & Now Dot
function ForecastChart({ nowVal, points = [] }) {
  const safePoints = Array.isArray(points) ? points.filter(p => p && typeof p === 'object') : [];
  if (safePoints.length === 0) {
    return (
      <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 11 }}>
        No curve points available
      </div>
    );
  }

  const svgWidth = 260;
  const svgHeight = 64;
  const padTop = 8;
  const padBottom = 8;
  const chartHeight = svgHeight - padTop - padBottom;

  const safeNow = toFinite(nowVal, 0);
  const allY = [safeNow];
  safePoints.forEach(p => {
    const pv = toFinite(p.value, null);
    const pl = toFinite(p.lower, null);
    const pu = toFinite(p.upper, null);
    if (pv !== null) allY.push(pv);
    if (pl !== null) allY.push(pl);
    if (pu !== null) allY.push(pu);
  });

  let minY = Math.min(...allY);
  let maxY = Math.max(...allY);
  if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
    minY = 0;
    maxY = 1;
  }
  if (maxY === minY) {
    maxY += 1;
    minY -= 1;
  }
  const rangeY = maxY - minY;

  const getY = val => {
    const n = toFinite(val, safeNow);
    const norm = (n - minY) / rangeY;
    return padTop + chartHeight * (1 - norm);
  };

  const nowX = 14;
  const nowY = getY(safeNow);

  const startX = 40;
  const endX = svgWidth - 10;
  const stepX = safePoints.length > 1 ? (endX - startX) / (safePoints.length - 1) : 0;

  const upperCoords = [];
  const lowerCoords = [];
  const lineCoords = [];

  safePoints.forEach((p, idx) => {
    const x = startX + idx * stepX;
    const pVal = toFinite(p.value, safeNow);
    const yVal = getY(pVal);
    const yUpper = getY(toFinite(p.upper, pVal));
    const yLower = getY(toFinite(p.lower, pVal));

    upperCoords.push(`${x.toFixed(1)},${yUpper.toFixed(1)}`);
    lowerCoords.unshift(`${x.toFixed(1)},${yLower.toFixed(1)}`);
    lineCoords.push(`${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yVal.toFixed(1)}`);
  });

  const polygonPoints = [...upperCoords, ...lowerCoords].join(' ');
  const linePath = lineCoords.join(' ');
  const firstPointY = safePoints.length > 0 ? getY(toFinite(safePoints[0].value, safeNow)) : nowY;

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      style={{ width: '100%', height: 64, display: 'block', overflow: 'visible' }}
    >
      <polygon points={polygonPoints} fill="rgba(34, 197, 94, 0.16)" />
      <line
        x1={nowX}
        y1={nowY}
        x2={startX}
        y2={firstPointY}
        stroke="#111827"
        strokeWidth="1.4"
        strokeDasharray="2,3"
      />
      <circle cx={nowX} cy={nowY} r="3" fill="#111827" />
      <path
        d={linePath}
        fill="none"
        stroke="#15803d"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Forecasting({ data = {} }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [showTable, setShowTable] = useState(true);
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);

  // 100% Real API Ingestion from data.aiForecasting (NO dummy / mock data)
  const ai = data?.aiForecasting || {};
  const rawForecasts = Array.isArray(ai.forecasts) ? ai.forecasts : [];

  // Transform real forecasts directly from live API
  const allForecasts = useMemo(() => {
    return rawForecasts
      .filter(f => f && typeof f === 'object')
      .map(f => {
        const points = Array.isArray(f.points) ? f.points : [];
        const lastPt = points.length > 0 ? points[points.length - 1] : null;
        const nowVal = toFinite(f.latest_value, 0);
        const finalVal = toFinite(lastPt?.value, nowVal);
        const diff = +(finalVal - nowVal).toFixed(2);
        const changeStr = `${diff >= 0 ? '+' : ''}${diff}`;
        const lowerStr = toFinite(lastPt?.lower, finalVal).toFixed(1);
        const upperStr = toFinite(lastPt?.upper, finalVal).toFixed(1);

        return {
          stream: f.stream || 'gateway_air',
          channel: f.channel || 'sensor',
          label: f.label || f.channel || 'Sensor Channel',
          latest_value: nowVal,
          finalValue: finalVal,
          change: changeStr,
          rawDiff: diff,
          rangeAt30: `${lowerStr} to ${upperStr}`,
          model: f.model || { beats_naive: false },
          points: points,
          stale_minutes: f.stale_minutes != null && Number.isFinite(Number(f.stale_minutes))
            ? Math.round(Number(f.stale_minutes))
            : null,
        };
      });
  }, [rawForecasts]);

  // Real stream counts computed dynamically from the API payload
  const totalCount = allForecasts.length;
  const airCount = allForecasts.filter(f => f.stream === 'gateway_air').length;
  const utilCount = allForecasts.filter(f => f.stream === 'gateway_utilities').length;
  const opsCount = allForecasts.filter(f => f.stream === 'gateway_operations').length;

  // Filter items based on active stream tab
  const filteredForecasts = useMemo(() => {
    if (activeFilter === 'air') return allForecasts.filter(f => f.stream === 'gateway_air');
    if (activeFilter === 'utilities') return allForecasts.filter(f => f.stream === 'gateway_utilities');
    if (activeFilter === 'operations') return allForecasts.filter(f => f.stream === 'gateway_operations');
    return allForecasts;
  }, [activeFilter, allForecasts]);

  // Reset table pagination when filter changes
  useEffect(() => {
    setTablePage(1);
  }, [activeFilter]);

  // Pagination for the Table
  const totalTablePages = Math.ceil(filteredForecasts.length / tablePageSize) || 1;
  const paginatedTableItems = useMemo(() => {
    const start = (tablePage - 1) * tablePageSize;
    return filteredForecasts.slice(start, start + tablePageSize);
  }, [filteredForecasts, tablePage, tablePageSize]);

  // Real timestamp from API generated_at or record timestamp
  const timeStr = useMemo(() => {
    const rawTime = ai.generated_at || data?.timestamp;
    if (rawTime) {
      try {
        const d = new Date(rawTime);
        if (!isNaN(d.getTime())) {
          const datePart = d.toLocaleDateString([], { day: 'numeric', month: 'short' });
          const timePart = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
          return `Updated ${datePart}, ${timePart} · every 5 min`;
        }
      } catch (e) {}
    }
    return 'Live API Feed · Real-time Stream';
  }, [ai.generated_at, data?.timestamp]);

  // Real skipped channels from API (deduplicated & grouped cleanly)
  const skippedList = Array.isArray(ai.skipped) ? ai.skipped : [];
  const groupedSkipped = useMemo(() => {
    const groups = new Map();
    skippedList.forEach(s => {
      if (!s || typeof s !== 'object') return;
      const reason = s.reason || 'model not trained yet';
      const label = s.channel ? String(s.channel).replace(/_/g, ' ') : 'Channel';
      if (!groups.has(reason)) groups.set(reason, []);
      groups.get(reason).push(label);
    });
    return Array.from(groups.entries()).map(([reason, channels]) => ({ reason, channels }));
  }, [skippedList]);

  return (
    <div style={{ padding: '4px 0 32px' }}>
      {/* ════ TOP HEADER & LIVE STATUS ════ */}
      <div className="tab-control-banner">
        <div className="banner-left-info">
          <div className="engine-status-pill">
            <span className="pulse-dot-small" style={{ background: allForecasts.length > 0 ? '#10b981' : '#f59e0b' }} />
            <span>LSTM AI Forecasting &bull; 30-Minute Multi-Horizon Prediction</span>
          </div>
          <p className="banner-subtext">
            {timeStr} &bull; {totalCount} active forecast channel{totalCount === 1 ? '' : 's'} ({ai.site || data?.location || 'Campus Facility'}).
          </p>
        </div>
        {totalCount > 0 && (
          <div className="banner-right-actions">
            <button
              type="button"
              className="btn-action"
              onClick={() => setShowTable(prev => !prev)}
            >
              <MdTableRows size={16} />
              <span>{showTable ? 'Hide Telemetry Table' : 'Show Telemetry Table'}</span>
              {showTable ? <MdKeyboardArrowUp size={16} /> : <MdKeyboardArrowDown size={16} />}
            </button>
          </div>
        )}
      </div>

      {/* ════ ZERO DATA STATE (IF API HAS NOT LOGGED FORECASTS YET) ════ */}
      {allForecasts.length === 0 ? (
        <div className="card" style={{ padding: '44px 24px', textAlign: 'center', marginBottom: 24 }}>
          <MdSignalCellularAlt size={46} color="#94a3b8" style={{ marginBottom: 12 }} />
          <h3 style={{ justifyContent: 'center', margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            No AI Forecast Data Available
          </h3>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)', maxWidth: 560, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Awaiting periodic LSTM telemetry predictions from the forecasting worker. Once continuous sensor readings resume, all channels populate automatically.
          </p>
        </div>
      ) : (
        <>
          {/* ════ CATEGORY FILTER PILLS ════ */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 22,
            }}
          >
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `All ${totalCount}` },
                { id: 'air', label: `Air & weather ${airCount}` },
                { id: 'utilities', label: `Utilities ${utilCount}` },
                { id: 'operations', label: `Operations ${opsCount}` },
              ].map(tab => {
                const isActive = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    style={{
                      border: isActive ? '1px solid #111827' : '1px solid #e5e7eb',
                      background: isActive ? '#111827' : '#ffffff',
                      color: isActive ? '#ffffff' : '#1f2937',
                      borderRadius: 9999,
                      padding: '7px 18px',
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Live Channel count indicator */}
            <div style={{ fontSize: 12.5, color: '#64748b' }}>
              Showing all <strong>{filteredForecasts.length}</strong> real-time channels from API
            </div>
          </div>

          {/* ════ ALL CARDS GRID (ALL CARDS SHOWN IN FULL) ════ */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 18,
              marginBottom: 32,
            }}
          >
            {filteredForecasts.map((item, idx) => {
              const isBeatsNaive = Boolean(item.model?.beats_naive);

              return (
                <div
                  key={`${item.stream}-${item.channel}-${idx}`}
                  className="ai-forecast-card"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 16,
                    padding: '18px 20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    animationDelay: `${(idx % 12) * 0.04}s`,
                  }}
                >
                  {/* Header: Label + Badge */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
                      {item.label}
                    </div>
                    {isBeatsNaive ? (
                      <span
                        style={{
                          background: '#dcfce7',
                          color: '#15803d',
                          fontSize: 11,
                          fontWeight: 600,
                          borderRadius: 9999,
                          padding: '3px 10px',
                          display: 'inline-block',
                        }}
                      >
                        Beats baseline
                      </span>
                    ) : (
                      <span
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e5e7eb',
                          color: '#4b5563',
                          fontSize: 11,
                          fontWeight: 500,
                          borderRadius: 9999,
                          padding: '3px 10px',
                          display: 'inline-block',
                        }}
                      >
                        Indicative only
                      </span>
                    )}
                  </div>

                  {/* Values: Now vs In 30 min */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Now</div>
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 700,
                          color: '#111827',
                          lineHeight: 1.1,
                        }}
                      >
                        {formatVal(item.latest_value)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>In 30 min</div>
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 700,
                          color: '#15803d',
                          lineHeight: 1.1,
                        }}
                      >
                        {formatVal(item.finalValue)}
                      </div>
                    </div>
                  </div>

                  {/* Curve Chart */}
                  <div style={{ margin: '4px 0 10px' }}>
                    <ForecastChart nowVal={item.latest_value} points={item.points} />
                  </div>

                  {/* Footer: Change & 95% range */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 11.5,
                      paddingTop: 8,
                      borderTop: '1px solid #f3f4f6',
                    }}
                  >
                    <span style={{ color: '#4b5563', fontWeight: 500 }}>
                      Change {item.change}
                    </span>
                    <span style={{ color: '#6b7280' }}>
                      95% range at +30 min: {item.rangeAt30}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ════ ADDITIONAL DATA TABLE WITH PAGINATION (SHOWN BELOW) ════ */}
          {showTable && (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 16,
                padding: '20px 22px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                marginBottom: 32,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
                    AI Forecast Telemetry Table
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>
                    Real-time tabular breakdown of LSTM predicted values, error thresholds, and 30-min confidence bands with pagination.
                  </p>
                </div>

                {/* Rows Per Page Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
                  <span style={{ marginRight: 2 }}>Rows per page:</span>
                  {[5, 10, 15, 30].map(sz => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => {
                        setTablePageSize(sz);
                        setTablePage(1);
                      }}
                      className={`pe-page-btn ${tablePageSize === sz ? 'active' : ''}`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* The Data Table */}
              <div style={{ overflowX: 'auto' }}>
                <table className="pe-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Stream</th>
                      <th>Sensor Label</th>
                      <th>Now</th>
                      <th>In 30 Min</th>
                      <th>Change</th>
                      <th>95% Range (+30m)</th>
                      <th>Model Status</th>
                      <th>Freshness</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTableItems.map((row, idx) => {
                      const globalIdx = (tablePage - 1) * tablePageSize + idx + 1;
                      const isPositive = row.rawDiff >= 0;
                      const isBeats = Boolean(row.model?.beats_naive);

                      return (
                        <tr key={`${row.stream}-${row.channel}-${idx}`}>
                          <td style={{ color: '#64748b' }}>{globalIdx}</td>
                          <td>
                            <span
                              style={{
                                background: '#f1f5f9',
                                color: '#334155',
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {row.stream.replace('gateway_', '').toUpperCase()}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: '#0f172a' }}>
                            {row.label}
                            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>{row.channel}</div>
                          </td>
                          <td style={{ fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>
                            {formatVal(row.latest_value)}
                          </td>
                          <td style={{ fontWeight: 700, color: '#15803d', whiteSpace: 'nowrap' }}>
                            {formatVal(row.finalValue)}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                color: isPositive ? '#16a34a' : '#dc2626',
                                background: isPositive ? '#f0fdf4' : '#fef2f2',
                                padding: '2px 8px',
                                borderRadius: 9999,
                                fontWeight: 600,
                                fontSize: 11.5,
                              }}
                            >
                              {row.change}
                            </span>
                          </td>
                          <td style={{ color: '#475569', whiteSpace: 'nowrap' }}>
                            {row.rangeAt30}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {isBeats ? (
                              <span
                                style={{
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  borderRadius: 9999,
                                  padding: '2px 8px',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <MdCheckCircle size={12} />
                                <span>Beats baseline</span>
                              </span>
                            ) : (
                              <span
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  color: '#64748b',
                                  borderRadius: 9999,
                                  padding: '2px 8px',
                                  fontSize: 11,
                                  fontWeight: 500,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <MdHelpOutline size={12} />
                                <span>Indicative only</span>
                              </span>
                            )}
                          </td>
                          <td style={{ color: '#64748b', fontSize: 11.5, whiteSpace: 'nowrap' }}>
                            {row.stale_minutes != null ? `${row.stale_minutes}m ago` : 'Live'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination Controls */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                  paddingTop: 16,
                  borderTop: '1px solid #f1f5f9',
                  marginTop: 8,
                }}
              >
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Showing{' '}
                  <strong>
                    {filteredForecasts.length === 0 ? 0 : (tablePage - 1) * tablePageSize + 1}–
                    {Math.min(filteredForecasts.length, tablePage * tablePageSize)}
                  </strong>{' '}
                  of <strong>{filteredForecasts.length}</strong> channels (Page {tablePage} of {totalTablePages})
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    className="pe-page-btn"
                    onClick={() => setTablePage(p => Math.max(1, p - 1))}
                    disabled={tablePage === 1}
                  >
                    <MdNavigateBefore size={16} />
                    <span>Prev</span>
                  </button>

                  {Array.from({ length: totalTablePages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      type="button"
                      className={`pe-page-btn ${p === tablePage ? 'active' : ''}`}
                      onClick={() => setTablePage(p)}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="pe-page-btn"
                    onClick={() => setTablePage(p => Math.min(totalTablePages, p + 1))}
                    disabled={tablePage === totalTablePages}
                  >
                    <span>Next</span>
                    <MdNavigateNext size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ════ BOTTOM EXPLANATION & REAL SCHEMA SIGNATURE BOX ════ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
          alignItems: 'flex-start',
        }}
      >
        {/* Left Explanatory Notes */}
        <div>
          <p style={{ fontSize: 12.5, color: '#4b5563', margin: '0 0 8px', lineHeight: 1.55 }}>
            <strong style={{ fontWeight: 600, color: '#111827' }}>Beats baseline</strong> means the model made smaller errors than "assume nothing changes" on data it had not seen.{' '}
            <strong style={{ fontWeight: 600, color: '#111827' }}>Indicative only</strong> means it did not, so treat the curve as a rough guide.
          </p>
          {groupedSkipped.length > 0 && (
            <div style={{ fontSize: 12.5, color: '#6b7280', margin: 0, lineHeight: 1.55 }}>
              {groupedSkipped.map((grp, i) => (
                <div key={i}>
                  Not shown ({grp.channels.length} {grp.channels.length === 1 ? 'channel' : 'channels'}):{' '}
                  {grp.channels.length <= 4 ? grp.channels.join(', ') : `${grp.channels.slice(0, 3).join(', ')} +${grp.channels.length - 3} more`}{' '}
                  ({grp.reason}).
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Monospace Signature Box */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: '14px 18px',
            fontFamily: 'monospace',
            fontSize: 11,
            color: '#6b7280',
            lineHeight: 1.7,
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div>record.aiForecasting.forecasts[ ]</div>
          <div style={{ paddingLeft: 14 }}>
            .label &nbsp;.latest_value &nbsp;.points[ ].value / .lower / .upper
          </div>
          <div style={{ paddingLeft: 14 }}>
            .model.beats_naive &nbsp;.stream &nbsp;.stale_minutes
          </div>
          <div>
            record.aiForecasting.generated_at &nbsp;.forecast_count &nbsp;.skipped[ ]
          </div>
        </div>
      </div>
    </div>
  );
}
