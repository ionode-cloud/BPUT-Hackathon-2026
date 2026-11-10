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
    <div className="pe-container">
      {/* ════ TOP HEADER & LIVE STATUS ════ */}
      <div className="tab-control-banner">
        <div className="banner-left-info">
          <div className="engine-status-pill">
            <span className="pulse-dot-small" style={{ background: counts.P1 > 0 ? '#ef4444' : '#10b981' }} />
            <span>Priority Engine · Automated Anomaly Triage &amp; SLA Directives</span>
          </div>
          <p className="banner-subtext">
            {timeStr} &bull; {rawItems.length} ranked operational action{rawItems.length === 1 ? '' : 's'} scored across {areas.length} facility subsystem{areas.length === 1 ? '' : 's'}.
          </p>
        </div>
        <div className="banner-right-actions">
          <button
            type="button"
            className="btn-action"
            onClick={() => setShowTable(prev => !prev)}
          >
            <MdTableRows size={16} />
            <span>{showTable ? 'Hide Triage Table' : 'Show Triage Table'}</span>
            {showTable ? <MdKeyboardArrowUp size={16} /> : <MdKeyboardArrowDown size={16} />}
          </button>
        </div>
      </div>

      {/* ════ TOP 4 SEVERITY COUNTS CARDS (LIVE COUNTS FROM API) ════ */}
      <div className="pe-kpi-grid">
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
              className={`pe-kpi-card ${isSelected ? 'is-selected' : ''}`}
              onClick={() => {
                setLevelFilter(prev => (prev === card.level ? 'all' : card.level));
                setTablePage(1);
              }}
              style={{
                borderColor: isSelected ? style.color : undefined,
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
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 7 }}>
                  {style.subtext}
                </div>
              </div>

              <div className="pe-kpi-count">
                {card.count}
              </div>
            </div>
          );
        })}
      </div>

      {/* ════ TWO-COLUMN MAIN SECTION: ALL REAL CARDS SHOWN ════ */}
      <div className="pe-main-grid">
        {/* ── LEFT COLUMN: RANKED ACTIONS (REAL LIVE ITEMS ONLY) ── */}
        <div>
          <div className="pe-section-header">
            <div className="pe-section-title">
              <span>Ranked actions &middot; {filteredItems.length} open</span>
              {levelFilter !== 'all' && (
                <button
                  type="button"
                  className="pe-clear-filter-btn"
                  onClick={() => {
                    setLevelFilter('all');
                    setTablePage(1);
                  }}
                >
                  Clear {levelFilter} filter &times;
                </button>
              )}
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="card" style={{ padding: '36px 24px', textAlign: 'center' }}>
              <MdCheckCircleOutline size={40} color="#16a34a" style={{ marginBottom: 10 }} />
              <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                All Systems Normal
              </h4>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                No active priority actions or anomaly alerts requiring operator intervention in this category.
              </p>
            </div>
          ) : (
            <div className="pe-actions-list">
              {filteredItems.map((item, idx) => {
                const levelStyle = getLevelBadgeStyle(item.level);

                return (
                  <div
                    key={item.rank || idx}
                    className="pe-action-card"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    {/* Black Circle Rank Badge */}
                    <div className="pe-rank-circle">
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
                            padding: '2px 10px',
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {levelStyle.text}
                        </span>

                        {item.area && (
                          <span
                            style={{
                              background: '#f1f5f9',
                              color: '#334155',
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
                          <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>
                            Score {item.score}
                          </span>
                        )}
                      </div>

                      {/* Action Title */}
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 750,
                          color: 'var(--text)',
                          margin: '0 0 12px',
                          lineHeight: 1.35,
                        }}
                      >
                        {item.title}
                      </div>

                      {/* Action Key-Value Details */}
                      <div className="pe-action-details">
                        <span className="pe-detail-label">Do</span>
                        <span style={{ color: '#1e293b' }}>{item.action || '-'}</span>

                        <span className="pe-detail-label">Check</span>
                        <span style={{ color: '#334155' }}>{item.check || '-'}</span>

                        <span className="pe-detail-label">Owner</span>
                        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{item.owner || '-'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: STATUS BY AREA (REAL API AREAS ONLY) ── */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <h3 style={{ marginBottom: 16 }}>
            <span>Status by area</span>
            <span className="card-tag">{areas.length} Areas</span>
          </h3>

          {areas.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
              No area breakdown data in live stream.
            </p>
          ) : (
            <div className="pe-area-list">
              {areas.map((a, idx) => {
                const isOk = !a.level || a.level.toUpperCase() === 'OK';
                const levelStyle = getLevelBadgeStyle(a.level);
                const scorePct = Math.min(100, Math.max(0, a.score || 0));

                return (
                  <div key={a.area || idx} className="pe-area-item">
                    {/* Top row: Area name + Badge */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <div style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--text)' }}>
                        {a.area}
                      </div>

                      {isOk ? (
                        <span
                          style={{
                            background: '#dcfce7',
                            color: '#15803d',
                            borderRadius: 9999,
                            padding: '2px 9px',
                            fontSize: 11,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
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
                            padding: '2px 9px',
                            fontSize: 11,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {a.level}
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="pe-area-bar-track">
                      <div
                        className="pe-area-bar-fill"
                        style={{
                          width: isOk ? '100%' : `${scorePct}%`,
                          background: isOk ? '#16a34a' : levelStyle.barColor,
                        }}
                      />
                    </div>

                    {/* Subtext under bar */}
                    <div
                      style={{
                        fontSize: 12,
                        color: isOk ? '#94a3b8' : '#475569',
                        lineHeight: 1.35,
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
        <div className="card" style={{ padding: '20px 22px', marginBottom: 24 }}>
          <div className="pe-section-header" style={{ marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 750, color: 'var(--text)' }}>
                Priority Action Triage Matrix Table
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
                Real-time operational directives, assigned field owners, and verification checklists scored across AI anomaly feeds.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
              <span style={{ marginRight: 2 }}>Items per page:</span>
              {[5, 10, 20].map(sz => (
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

          <div style={{ overflowX: 'auto' }}>
            <table className="pe-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Level</th>
                  <th>Area</th>
                  <th>Score</th>
                  <th>Action Title</th>
                  <th>Directive (Do)</th>
                  <th>Checklist</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTableItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '28px 12px', textAlign: 'center', color: 'var(--muted)' }}>
                      No open actions matching the current filter.
                    </td>
                  </tr>
                ) : (
                  paginatedTableItems.map((it, idx) => {
                    const style = getLevelBadgeStyle(it.level);

                    return (
                      <tr key={it.rank || idx}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: '#0f172a',
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
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              background: style.bg,
                              color: style.color,
                              padding: '3px 9px',
                              borderRadius: 9999,
                              fontWeight: 700,
                              fontSize: 11,
                              display: 'inline-block',
                            }}
                          >
                            {style.text}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              background: '#f1f5f9',
                              color: '#334155',
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 600,
                              display: 'inline-block',
                            }}
                          >
                            {it.area}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontWeight: 700, color: 'var(--text)' }}>
                          {it.score ?? '-'}
                        </td>
                        <td style={{ minWidth: 160, fontWeight: 650, color: 'var(--text)' }}>
                          {it.title}
                        </td>
                        <td style={{ minWidth: 200, color: '#334155', lineHeight: 1.45 }}>
                          {it.action}
                        </td>
                        <td style={{ minWidth: 180, color: 'var(--muted)', fontSize: 12, lineHeight: 1.45 }}>
                          {it.check}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--text)' }}>
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
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Showing{' '}
              <strong>
                {filteredItems.length === 0 ? 0 : (tablePage - 1) * tablePageSize + 1}&ndash;
                {Math.min(filteredItems.length, tablePage * tablePageSize)}
              </strong>{' '}
              of <strong>{filteredItems.length}</strong> actions (Page {tablePage} of {totalTablePages})
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

      {/* ════ BOTTOM SCHEMA SIGNATURE BOX ════ */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          fontFamily: 'monospace',
          fontSize: 11.5,
          color: 'var(--muted)',
          lineHeight: 1.7,
          maxWidth: 640,
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
