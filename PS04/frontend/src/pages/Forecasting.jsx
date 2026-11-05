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

function formatVal(v) {
  if (v == null || isNaN(v)) return '-';
  const num = Number(v);
  if (Number.isInteger(num)) return String(num);
  return num.toFixed(num < 1 ? 2 : 1);
}

// Mini SVG Curve Component with Shaded Confidence Envelope & Now Dot
function ForecastChart({ nowVal, points = [] }) {
  if (!points || points.length === 0) {
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

  const allY = [nowVal];
  points.forEach(p => {
    if (p.value != null && !isNaN(p.value)) allY.push(Number(p.value));
    if (p.lower != null && !isNaN(p.lower)) allY.push(Number(p.lower));
    if (p.upper != null && !isNaN(p.upper)) allY.push(Number(p.upper));
  });

  let minY = Math.min(...allY);
  let maxY = Math.max(...allY);
  if (maxY === minY) {
    maxY += 1;
    minY -= 1;
  }
  const rangeY = maxY - minY;

  const getY = val => {
    const norm = (val - minY) / rangeY;
    return padTop + chartHeight * (1 - norm);
  };

  const nowX = 14;
  const nowY = getY(nowVal);

  const startX = 40;
  const endX = svgWidth - 10;
  const stepX = points.length > 1 ? (endX - startX) / (points.length - 1) : 0;

  const upperCoords = [];
  const lowerCoords = [];
  const lineCoords = [];

  points.forEach((p, idx) => {
    const x = startX + idx * stepX;
    const yVal = getY(p.value != null ? Number(p.value) : nowVal);
    const yUpper = getY(p.upper != null ? Number(p.upper) : (p.value ?? nowVal));
    const yLower = getY(p.lower != null ? Number(p.lower) : (p.value ?? nowVal));

    upperCoords.push(`${x.toFixed(1)},${yUpper.toFixed(1)}`);
    lowerCoords.unshift(`${x.toFixed(1)},${yLower.toFixed(1)}`);
    lineCoords.push(`${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yVal.toFixed(1)}`);
  });

  const polygonPoints = [...upperCoords, ...lowerCoords].join(' ');
  const linePath = lineCoords.join(' ');
  const firstPointY = points.length > 0 ? getY(points[0].value != null ? Number(points[0].value) : nowVal) : nowY;

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
    return rawForecasts.map(f => {
      const points = Array.isArray(f.points) ? f.points : [];
      const lastPt = points.length > 0 ? points[points.length - 1] : null;
      const nowVal = f.latest_value != null ? Number(f.latest_value) : 0;
      const finalVal = lastPt?.value != null ? Number(lastPt.value) : nowVal;
      const diff = +(finalVal - nowVal).toFixed(2);
      const changeStr = `${diff >= 0 ? '+' : ''}${diff}`;
      const lowerStr = lastPt?.lower != null ? Number(lastPt.lower).toFixed(1) : '0.0';
      const upperStr = lastPt?.upper != null ? Number(lastPt.upper).toFixed(1) : '0.0';

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
        stale_minutes: f.stale_minutes != null ? Math.round(f.stale_minutes) : null,
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
        return `Updated ${d.getDate()} Nov, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()} IST · every 5 min`;
      } catch (e) {}
    }
    return 'Live API Feed · Real-time Stream';
  }, [ai.generated_at, data?.timestamp]);

  // Real freshness minutes computed from generated_at or stale_minutes
  const staleMin = useMemo(() => {
    if (allForecasts[0]?.stale_minutes != null) {
      return allForecasts[0].stale_minutes;
    }
    if (ai.generated_at) {
      try {
        const diffMs = Date.now() - new Date(ai.generated_at).getTime();
        return Math.max(0, Math.round(diffMs / 60000));
      } catch (e) {}
    }
    return 0;
  }, [allForecasts, ai.generated_at]);

  // Real skipped channels from API
  const skippedList = Array.isArray(ai.skipped) ? ai.skipped : [];

  return (
    <div style={{ padding: '4px 0 32px' }}>
      {/* ════ TOP HEADER & LIVE STATUS ════ */}
      

      {/* ════ ZERO DATA STATE (IF API HAS NOT LOGGED FORECASTS YET) ════ */}
      {allForecasts.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: '48px 24px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            marginBottom: 28,
          }}
        >
          <MdSignalCellularAlt size={48} color="#94a3b8" style={{ marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#111827' }}>
            No AI Forecast Data Available
          </h3>
          <p style={{ margin: 0, fontSize: 13.5, color: '#64748b', maxWidth: 540, marginLeft: 'auto', marginRight: 'auto' }}>
            Awaiting periodic LSTM telemetry ingestion from <code>http://localhost:5011/api/data</code>. When your forecasting background worker posts <code>aiForecasting.forecasts</code>, all channels will populate automatically here without any dummy data.
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
                  key={item.channel || idx}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#4b5563' }}>
                  <span>Rows per page:</span>
                  {[5, 10, 15, 30].map(sz => (
                    <button
                      key={sz}
                      onClick={() => {
                        setTablePageSize(sz);
                        setTablePage(1);
                      }}
                      style={{
                        border: tablePageSize === sz ? '1px solid #111827' : '1px solid #e5e7eb',
                        background: tablePageSize === sz ? '#111827' : '#ffffff',
                        color: tablePageSize === sz ? '#ffffff' : '#374151',
                        borderRadius: 6,
                        padding: '3px 9px',
                        fontSize: 11.5,
                        fontWeight: tablePageSize === sz ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* The Data Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>#</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Stream</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Sensor Label</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Now</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>In 30 Min</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Change</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>95% Range (+30m)</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Model Status</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Freshness</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTableItems.map((row, idx) => {
                      const globalIdx = (tablePage - 1) * tablePageSize + idx + 1;
                      const isPositive = row.rawDiff >= 0;
                      const isBeats = Boolean(row.model?.beats_naive);

                      return (
                        <tr
                          key={row.channel || idx}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '12px 12px', color: '#64748b' }}>{globalIdx}</td>
                          <td style={{ padding: '12px 12px' }}>
                            <span
                              style={{
                                background: '#f1f5f9',
                                color: '#334155',
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              {row.stream.replace('gateway_', '').toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '12px 12px', fontWeight: 600, color: '#0f172a' }}>
                            {row.label}
                            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>{row.channel}</div>
                          </td>
                          <td style={{ padding: '12px 12px', fontWeight: 700, color: '#111827' }}>
                            {formatVal(row.latest_value)}
                          </td>
                          <td style={{ padding: '12px 12px', fontWeight: 700, color: '#15803d' }}>
                            {formatVal(row.finalValue)}
                          </td>
                          <td style={{ padding: '12px 12px' }}>
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
                          <td style={{ padding: '12px 12px', color: '#475569' }}>
                            {row.rangeAt30}
                          </td>
                          <td style={{ padding: '12px 12px' }}>
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
                          <td style={{ padding: '12px 12px', color: '#64748b', fontSize: 11.5 }}>
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
                    {Math.min(filteredForecasts.length, (tablePage - 1) * tablePageSize + 1)}–
                    {Math.min(filteredForecasts.length, tablePage * tablePageSize)}
                  </strong>{' '}
                  of <strong>{filteredForecasts.length}</strong> channels (Page {tablePage} of {totalTablePages})
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => setTablePage(p => Math.max(1, p - 1))}
                    disabled={tablePage === 1}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      border: '1px solid #e5e7eb',
                      background: tablePage === 1 ? '#f9fafb' : '#ffffff',
                      color: tablePage === 1 ? '#9ca3af' : '#111827',
                      borderRadius: 6,
                      padding: '5px 10px',
                      fontSize: 12,
                      cursor: tablePage === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <MdNavigateBefore size={16} />
                    <span>Prev</span>
                  </button>

                  {Array.from({ length: totalTablePages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setTablePage(p)}
                      style={{
                        border: p === tablePage ? '1px solid #111827' : '1px solid #e5e7eb',
                        background: p === tablePage ? '#111827' : '#ffffff',
                        color: p === tablePage ? '#ffffff' : '#374151',
                        borderRadius: 6,
                        width: 28,
                        height: 28,
                        fontSize: 11.5,
                        fontWeight: p === tablePage ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    onClick={() => setTablePage(p => Math.min(totalTablePages, p + 1))}
                    disabled={tablePage === totalTablePages}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      border: '1px solid #e5e7eb',
                      background: tablePage === totalTablePages ? '#f9fafb' : '#ffffff',
                      color: tablePage === totalTablePages ? '#9ca3af' : '#111827',
                      borderRadius: 6,
                      padding: '5px 10px',
                      fontSize: 12,
                      cursor: tablePage === totalTablePages ? 'not-allowed' : 'pointer',
                    }}
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
          {skippedList.length > 0 && (
            <p style={{ fontSize: 12.5, color: '#6b7280', margin: 0, lineHeight: 1.55 }}>
              Not shown:{' '}
              {skippedList
                .map(s => `${s.channel ? s.channel.replace('_', ' ') : 'Channel'} (${s.reason || 'model not trained yet'})`)
                .join(', ')}
              . It is listed under skipped in the live data.
            </p>
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
