import { useState, useMemo } from 'react';
import {
  MdTableRows,
  MdNavigateBefore,
  MdNavigateNext,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdCheckCircleOutline,
} from 'react-icons/md';

// Styling helper for Priority level badges
function getLevelBadgeStyle(level) {
  switch (level?.toUpperCase()) {
    case 'P1':
      return {
        bg: '#fee2e2',
        color: '#dc2626',
        text: 'P1 · Critical',
        subtext: 'Act now',
        barColor: '#dc2626',
      };
    case 'P2':
      return {
        bg: '#ffedd5',
        color: '#ea580c',
        text: 'P2 · High',
        subtext: 'Act today',
        barColor: '#ea580c',
      };
    case 'P3':
      return {
        bg: '#fef9c3',
        color: '#ca8a04',
        text: 'P3 · Medium',
        subtext: 'Plan this week',
        barColor: '#ca8a04',
      };
    case 'P4':
      return {
        bg: '#e0f2fe',
        color: '#0284c7',
        text: 'P4 · Low',
        subtext: 'Keep an eye on it',
        barColor: '#0284c7',
      };
    default:
      return {
        bg: '#dcfce7',
        color: '#15803d',
        text: 'OK',
        subtext: 'All clear',
        barColor: '#16a34a',
      };
  }
}

export default function PriorityEngine({ data = {} }) {
  const [showTable, setShowTable] = useState(true);
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(5);
  const [levelFilter, setLevelFilter] = useState('all');

  // 100% Real API Ingestion from data.priorityEngine (NO dummy / mock data)
  const pe = data?.priorityEngine || {};
  const counts = pe.counts || { P1: 0, P2: 0, P3: 0, P4: 0 };
  const rawItems = Array.isArray(pe.items) ? pe.items : [];
  const areas = Array.isArray(pe.areas) ? pe.areas : [];
  const site = pe.site || data?.location || 'Campus Facility';

  // Real timestamp from API generated_at or record timestamp
  const timeStr = useMemo(() => {
    const rawTime = pe.generated_at || data?.timestamp;
    if (rawTime) {
      try {
        const d = new Date(rawTime);
        return `Updated ${d.getDate()} Nov, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()} IST · ${site}`;
      } catch (e) { }
    }
    return `Live API Stream · ${site}`;
  }, [pe.generated_at, data?.timestamp, site]);

  // Filter items by level if selected
  const filteredItems = useMemo(() => {
    if (levelFilter === 'all') return rawItems;
    return rawItems.filter(it => it.level?.toUpperCase() === levelFilter.toUpperCase());
  }, [rawItems, levelFilter]);

  // Pagination exclusively for the Table
  const totalTablePages = Math.ceil(filteredItems.length / tablePageSize) || 1;
  const paginatedTableItems = useMemo(() => {
    const start = (tablePage - 1) * tablePageSize;
    return filteredItems.slice(start, start + tablePageSize);
  }, [filteredItems, tablePage, tablePageSize]);

  return (
    <div style={{ padding: '4px 0 32px' }}>
      {/* ════ TOP HEADER & LIVE STATUS ════ */}




      {/* ════ TOP 4 SEVERITY COUNTS CARDS (LIVE COUNTS FROM API) ════ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          { key: 'P1', level: 'P1', count: counts.P1 ?? 0 },
          { key: 'P2', level: 'P2', count: counts.P2 ?? 0 },
          { key: 'P3', level: 'P3', count: counts.P3 ?? 0 },
          { key: 'P4', level: 'P4', count: counts.P4 ?? 0 },
        ].map((card, idx) => {
          const style = getLevelBadgeStyle(card.level);
          const isSelected = levelFilter === card.level;

          return (
            <div
              key={card.key}
              className="ai-forecast-card"
              onClick={() => {
                setLevelFilter(prev => (prev === card.level ? 'all' : card.level));
                setTablePage(1);
              }}
              style={{
                background: '#ffffff',
                border: isSelected ? `2px solid ${style.color}` : '1px solid #e5e7eb',
                borderRadius: 14,
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                cursor: 'pointer',
                animationDelay: `${idx * 0.05}s`,
              }}
              title={`Click to filter by ${card.level}`}
            >
              <div>
                <span
                  style={{
                    background: style.bg,
                    color: style.color,
                    borderRadius: 9999,
                    padding: '3px 10px',
                    fontSize: 11.5,
                    fontWeight: 700,
                    display: 'inline-block',
                  }}
                >
                  {style.text}
                </span>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                  {style.subtext}
                </div>
              </div>

              <div
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                  color: '#111827',
                  lineHeight: 1,
                }}
              >
                {card.count}
              </div>
            </div>
          );
        })}
      </div>

      {/* ════ TWO-COLUMN MAIN SECTION: ALL REAL CARDS SHOWN ════ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)',
          gap: 20,
          alignItems: 'flex-start',
          marginBottom: 32,
        }}
      >
        {/* ── LEFT COLUMN: RANKED ACTIONS (REAL LIVE ITEMS ONLY) ── */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: '#111827',
              }}
            >
              Ranked actions · {filteredItems.length} open
              {levelFilter !== 'all' && (
                <span
                  onClick={() => {
                    setLevelFilter('all');
                    setTablePage(1);
                  }}
                  style={{
                    marginLeft: 10,
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: '#2563eb',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  (Clear filter)
                </span>
              )}
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 16,
                padding: '32px 20px',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <MdCheckCircleOutline size={40} color="#16a34a" style={{ marginBottom: 10 }} />
              <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#111827' }}>
                All Systems Normal
              </h4>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                No active priority actions or anomaly alerts requiring operator intervention in this category.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredItems.map((item, idx) => {
                const levelStyle = getLevelBadgeStyle(item.level);

                return (
                  <div
                    key={item.rank || idx}
                    className="ai-forecast-card"
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 16,
                      padding: '20px 22px',
                      display: 'flex',
                      gap: 18,
                      alignItems: 'flex-start',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      animationDelay: `${idx * 0.05}s`,
                    }}
                  >
                    {/* Black Circle Rank Badge */}
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: '#111827',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 14,
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {item.rank || idx + 1}
                    </div>

                    {/* Action Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Top Badges Row */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flexWrap: 'wrap',
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            background: levelStyle.bg,
                            color: levelStyle.color,
                            borderRadius: 9999,
                            padding: '2px 9px',
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {levelStyle.text}
                        </span>

                        {item.area && (
                          <span
                            style={{
                              background: '#f3f4f6',
                              color: '#374151',
                              borderRadius: 9999,
                              padding: '2px 10px',
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {item.area}
                          </span>
                        )}

                        {item.score != null && (
                          <span style={{ fontSize: 11.5, color: '#6b7280', fontWeight: 500 }}>
                            Score {item.score}
                          </span>
                        )}
                      </div>

                      {/* Action Title */}
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: '#111827',
                          margin: '0 0 14px',
                          lineHeight: 1.3,
                        }}
                      >
                        {item.title}
                      </div>

                      {/* Action Key-Value Details */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '55px 1fr',
                          rowGap: 8,
                          columnGap: 12,
                          fontSize: 12.5,
                          lineHeight: 1.5,
                        }}
                      >
                        <span style={{ color: '#6b7280', fontWeight: 500 }}>Do</span>
                        <span style={{ color: '#1f2937' }}>{item.action || '-'}</span>

                        <span style={{ color: '#6b7280', fontWeight: 500 }}>Check</span>
                        <span style={{ color: '#1f2937' }}>{item.check || '-'}</span>

                        <span style={{ color: '#6b7280', fontWeight: 500 }}>Owner</span>
                        <span style={{ color: '#111827', fontWeight: 500 }}>{item.owner || '-'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: STATUS BY AREA (REAL API AREAS ONLY) ── */}
        <div
          className="ai-forecast-card"
          style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: '20px 22px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            animationDelay: '0.12s',
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#111827',
              marginBottom: 18,
            }}
          >
            Status by area
          </div>

          {areas.length === 0 ? (
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
              No area breakdown data in live stream.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {areas.map((a, idx) => {
                const isOk = !a.level || a.level.toUpperCase() === 'OK';
                const levelStyle = getLevelBadgeStyle(a.level);
                const scorePct = Math.min(100, Math.max(0, a.score || 0));

                return (
                  <div key={a.area || idx}>
                    {/* Top row: Area name + Badge */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#111827' }}>
                        {a.area}
                      </div>

                      {isOk ? (
                        <span
                          style={{
                            background: '#dcfce7',
                            color: '#15803d',
                            borderRadius: 9999,
                            padding: '2px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          OK
                        </span>
                      ) : (
                        <span
                          style={{
                            background: levelStyle.bg,
                            color: levelStyle.color,
                            borderRadius: 9999,
                            padding: '2px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {a.level}
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div
                      style={{
                        height: 5,
                        background: '#f3f4f6',
                        borderRadius: 9999,
                        margin: '6px 0',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: isOk ? '100%' : `${scorePct}%`,
                          background: isOk ? '#16a34a' : levelStyle.barColor,
                          borderRadius: 9999,
                        }}
                      />
                    </div>

                    {/* Subtext under bar */}
                    <div
                      style={{
                        fontSize: 11.5,
                        color: isOk ? '#9ca3af' : '#4b5563',
                        lineHeight: 1.3,
                      }}
                    >
                      {isOk ? 'Nothing to do' : (a.top || 'Active issue reported')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ════ ADDITIONAL TABULAR VIEW WITH PAGINATION (SHOWN BELOW) ════ */}
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
                Priority Action Triage Matrix Table
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>
                Real-time operational directives, assigned field owners, and verification checklists scored across AI anomaly feeds with pagination.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#4b5563' }}>
              <span>Items per page:</span>
              {[5, 10, 20].map(sz => (
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

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Rank</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Level</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Area</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Score</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Action Title</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Directive (Do)</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Checklist</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Owner</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTableItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8' }}>
                      No open actions matching the current filter.
                    </td>
                  </tr>
                ) : (
                  paginatedTableItems.map((it, idx) => {
                    const style = getLevelBadgeStyle(it.level);

                    return (
                      <tr
                        key={it.rank || idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '12px 12px' }}>
                          <span
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: '#111827',
                              color: '#ffffff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 11.5,
                            }}
                          >
                            {it.rank || idx + 1}
                          </span>
                        </td>
                        <td style={{ padding: '12px 12px' }}>
                          <span
                            style={{
                              background: style.bg,
                              color: style.color,
                              padding: '3px 8px',
                              borderRadius: 9999,
                              fontWeight: 700,
                              fontSize: 11,
                            }}
                          >
                            {style.text}
                          </span>
                        </td>
                        <td style={{ padding: '12px 12px' }}>
                          <span
                            style={{
                              background: '#f1f5f9',
                              color: '#334155',
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 600,
                            }}
                          >
                            {it.area}
                          </span>
                        </td>
                        <td style={{ padding: '12px 12px', fontWeight: 700, color: '#111827' }}>
                          {it.score ?? '-'}
                        </td>
                        <td style={{ padding: '12px 12px', fontWeight: 600, color: '#0f172a' }}>
                          {it.title}
                        </td>
                        <td style={{ padding: '12px 12px', color: '#334155', maxWidth: 220 }}>
                          {it.action}
                        </td>
                        <td style={{ padding: '12px 12px', color: '#64748b', maxWidth: 200, fontSize: 11.5 }}>
                          {it.check}
                        </td>
                        <td style={{ padding: '12px 12px', fontWeight: 600, color: '#111827' }}>
                          {it.owner}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Bar */}
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
                {filteredItems.length === 0 ? 0 : (tablePage - 1) * tablePageSize + 1}–
                {Math.min(filteredItems.length, tablePage * tablePageSize)}
              </strong>{' '}
              of <strong>{filteredItems.length}</strong> actions (Page {tablePage} of {totalTablePages})
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

      {/* ════ BOTTOM SCHEMA SIGNATURE BOX ════ */}
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
          maxWidth: 620,
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        <div>record.priorityEngine.counts.P1 / P2 / P3 / P4</div>
        <div>
          record.priorityEngine.items[ ]: .rank .level .score .area .title .action
        </div>
        <div style={{ paddingLeft: 14 }}>.check .owner</div>
        <div>record.priorityEngine.areas[ ]: .area .count .score .level .top</div>
        <div>record.priorityEngine.generated_at &nbsp;.site &nbsp;.item_count</div>
      </div>
    </div>
  );
}
