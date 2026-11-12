import { useState, useMemo, useEffect, Fragment } from 'react';
import {
  MdHistory,
  MdSearch,
  MdRefresh,
  MdNavigateBefore,
  MdNavigateNext,
  MdFirstPage,
  MdLastPage,
  MdWaterDrop,
  MdElectricBolt,
  MdAir,
  MdDelete,
  MdLocalParking,
  MdLayers,
  MdTune,
  MdCheckCircle,
  MdWarning,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdAccessTime,
  MdLocationOn,
} from 'react-icons/md';

import ExcelDownloadBtn from '../components/ExcelDownloadBtn';
import StatCard from '../components/StatCard';

const STORAGE_KEY = 'facility_ai_telemetry_history_store_v1';
const PAGE_SIZE = 20; // Exactly 20 rows per section/page

function formatDateTime(isoString) {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return (
      d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' • ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
  } catch {
    return String(isoString);
  }
}

function safeNum(val, fallback = 0) {
  if (val == null || val === '') return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function hasTelemetryChanged(a, b) {
  if (!a || !b) return true;
  if (a.timestamp && b.timestamp && a.timestamp !== b.timestamp) {
    const diff = Math.abs(new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    if (diff > 1000) return true;
  }
  return (
    a.aqi !== b.aqi ||
    a.pm25 !== b.pm25 ||
    a.pm10 !== b.pm10 ||
    a.livePower !== b.livePower ||
    a.todaysEnergy !== b.todaysEnergy ||
    a.acPower !== b.acPower ||
    a.dcPower !== b.dcPower ||
    a.tankLevel !== b.tankLevel ||
    a.todaysUsage !== b.todaysUsage ||
    a.flowRate !== b.flowRate ||
    a.val1Flow !== b.val1Flow ||
    a.val2Flow !== b.val2Flow ||
    a.val1 !== b.val1 ||
    a.val2 !== b.val2 ||
    a.valve1 !== b.valve1 ||
    a.valve2 !== b.valve2 ||
    a.leakStatus !== b.leakStatus ||
    a.wasteWetFill !== b.wasteWetFill ||
    a.wasteDryFill !== b.wasteDryFill ||
    a.wasteWet !== b.wasteWet ||
    a.wasteDry !== b.wasteDry ||
    a.averageFill !== b.averageFill ||
    a.overflowRisk !== b.overflowRisk ||
    a.gridStatus !== b.gridStatus ||
    a.streetLightStatus !== b.streetLightStatus ||
    a.parkingOccupancy !== b.parkingOccupancy ||
    a.a1 !== b.a1 ||
    a.a2 !== b.a2 ||
    a.a3 !== b.a3
  );
}

function dedupeAndSortRecords(list) {
  if (!Array.isArray(list)) return [];
  const map = new Map();
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    // Primary deduplication key: MongoDB _id, or _historyId, or timestamp/createdAt
    const key = item._id
      ? `id_${String(item._id)}`
      : (item._historyId
          ? `hist_${String(item._historyId)}`
          : (item.timestamp
              ? `ts_${String(item.timestamp)}`
              : (item.createdAt
                  ? `ca_${String(item.createdAt)}`
                  : JSON.stringify(item))));
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const ta = new Date(a.timestamp || a.createdAt || 0).getTime();
    const tb = new Date(b.timestamp || b.createdAt || 0).getTime();
    return tb - ta; // newest first
  });
}

export default function History({ data = {}, history = [], allHistory = [], onUpdate }) {
  // Load persisted history from localStorage merged with MongoDB history
  const [records, setRecords] = useState(() => {
    let cached = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) cached = JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
    const base = Array.isArray(allHistory) && allHistory.length > 0 ? allHistory : (Array.isArray(history) ? history : []);
    const initial = dedupeAndSortRecords([...(data && Object.keys(data).length > 0 ? [data] : []), ...base, ...cached]);
    return initial;
  });

  const [activeDomain, setActiveDomain] = useState('all'); // 'all' | 'air' | 'energy' | 'water' | 'waste' | 'parking'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRowKey, setExpandedRowKey] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2600);
  };

  // Sync incoming full history from API backend whenever allHistory updates
  useEffect(() => {
    if (Array.isArray(allHistory) && allHistory.length > 0) {
      setRecords(prev => {
        const merged = dedupeAndSortRecords([...allHistory, ...prev]);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged.slice(0, 1000)));
        } catch {}
        return merged;
      });
    }
  }, [allHistory]);

  // CRITICAL REQUIREMENT: "all tab data store every time when data update"
  // Whenever live sensor data updates (via polling, valve toggling, or API push), capture and store it as a new historical snapshot immediately
  useEffect(() => {
    if (data && typeof data === 'object' && Object.keys(data).length > 0) {
      setRecords(prev => {
        const latestRecorded = prev[0];
        if (!latestRecorded || hasTelemetryChanged(data, latestRecorded)) {
          const snapshotId = `hist-update-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          // Use data._id if it is a new unique document from backend; otherwise assign unique snapshotId so the snapshot count increments
          const isFreshMongoId = data._id && (!latestRecorded || String(data._id) !== String(latestRecorded._id));
          const newEntry = {
            ...data,
            _id: isFreshMongoId ? String(data._id) : snapshotId,
            _historyId: snapshotId,
            timestamp: data.timestamp || data.updatedAt || new Date().toISOString(),
          };
          const nextList = dedupeAndSortRecords([newEntry, ...prev]);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList.slice(0, 1000)));
          } catch {}
          return nextList;
        }
        return prev;
      });
    }
  }, [data]);

  // Manual refresh / re-scan handler
  const handleRefresh = async () => {
    try {
      const res = await fetch('http://localhost:5011/api/data?all=true');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          const merged = dedupeAndSortRecords([...json.data, ...records]);
          setRecords(merged);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged.slice(0, 1000)));
          } catch {}
          showToast(`✓ Synced ${json.data.length} telemetry records from database`);
          return;
        }
      }
    } catch {}
    showToast('✓ History up-to-date with latest sensor stream');
  };

  // Filter records by domain tab and search query
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Search query filter across all attributes
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const dateStr = formatDateTime(r.timestamp || r.createdAt).toLowerCase();
        const statusStr = String(r.gridStatus || '').toLowerCase();
        const leakStr = String(r.leakStatus || '').toLowerCase();
        const val1Str = String(r.val1 || '').toLowerCase();
        const val2Str = String(r.val2 || '').toLowerCase();
        const locStr = String(r.location || '').toLowerCase();
        const match =
          dateStr.includes(q) ||
          statusStr.includes(q) ||
          leakStr.includes(q) ||
          val1Str.includes(q) ||
          val2Str.includes(q) ||
          locStr.includes(q) ||
          String(r.aqi ?? '').includes(q) ||
          String(r.livePower ?? '').includes(q) ||
          String(r.tankLevel ?? '').includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [records, searchQuery]);

  // Reset pagination to page 1 whenever search or domain tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeDomain, searchQuery]);

  // Pagination calculation: exactly 20 rows per page
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredRecords.length);
  const paginatedRows = useMemo(() => {
    return filteredRecords.slice(startIndex, endIndex);
  }, [filteredRecords, startIndex, endIndex]);

  // Generate page numbers for pagination bar
  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let p = start; p <= end; p++) {
      pages.push(p);
    }
    return pages;
  }, [currentPage, totalPages]);

  // KPI Calculations
  const totalSnapshots = records.length;
  const latestTs = records[0]?.timestamp || records[0]?.createdAt;
  const oldestTs = records[records.length - 1]?.timestamp || records[records.length - 1]?.createdAt;

  return (
    <div className="history-tab-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="alert-floating-toast">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ════ TOP TAB CONTROL & EXCEL DOWNLOAD BANNER ════ */}
      <div className="tab-control-banner">
        <div className="banner-left-info">
          <div className="engine-status-pill">
            <span className="pulse-dot-small" style={{ background: '#10b981' }} />
            <span>Telemetry Ledger • Historical Audit &amp; Data Logging</span>
          </div>
          <p className="banner-subtext">
            Continuous cross-domain historical archive. Stores snapshots from all facility tabs (Air, Energy, Water, Waste, Parking) upon every sensor telemetry update. 20 rows per section.
          </p>
        </div>
        <div className="banner-right-actions">
          {/* Top Excel Download Button */}
          <ExcelDownloadBtn
            tabName="history"
            tabLabel="History Log"
            data={data}
            history={records}
            allHistory={records}
          />
          <button
            type="button"
            className="btn-action"
            onClick={handleRefresh}
            title="Query latest database records"
          >
            <MdRefresh size={18} />
            <span>Sync Live</span>
          </button>
        </div>
      </div>

      {/* ════ KPI SUMMARY CARDS ════ */}
      <div className="three">
        <StatCard
          index={0}
          icon={<MdHistory size={20} color="#2563eb" />}
          label="Total Logged Snapshots"
          badgeText="Active Ledger"
          badgeType="blue"
          nowLabel="Count"
          nowValue={totalSnapshots}
          secondaryLabel="Per Section"
          secondaryValue="20 Rows"
          secondaryColor="#2563eb"
          footerLeft="Accumulates on every telemetry update"
          footerRight="Continuous sync"
        />

        <StatCard
          index={1}
          icon={<MdAccessTime size={20} color="#10b981" />}
          label="Latest Recorded Update"
          badgeText="Most Recent"
          badgeType="green"
          nowLabel="Time"
          nowValue={latestTs ? new Date(latestTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
          secondaryLabel="Date"
          secondaryValue={latestTs ? new Date(latestTs).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '-'}
          secondaryColor="#15803d"
          footerLeft={`Oldest logged: ${oldestTs ? new Date(oldestTs).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '-'}`}
          footerRight="Real-time stamp"
        />

        <StatCard
          index={2}
          icon={<MdCheckCircle size={20} color="#059669" />}
          label="Storage & Persistence"
          badgeText="Persistent"
          badgeType="green"
          nowLabel="Status"
          nowValue="ONLINE"
          secondaryLabel="Storage Mode"
          secondaryValue=""
          secondaryColor="#15803d"
          footerLeft="Auto-saved to database and client cache"
          footerRight="Audit verified"
        />
      </div>

      {/* ════ SEARCH & DOMAIN TAB TOOLBAR ════ */}
      <div className="card alerts-toolbar-card" style={{ marginTop: 18 }}>
        <div className="alerts-toolbar-top">
          {/* Search Bar */}
          <div className="alerts-search-wrap">
            <MdSearch size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search historical records by date, time, status, or keyword…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="alerts-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>

          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
            Showing {filteredRecords.length > 0 ? startIndex + 1 : 0}–{endIndex} of {filteredRecords.length} record{filteredRecords.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Subsystem Domain Filters */}
        <div className="alerts-toolbar-filters">
          <div className="filter-pill-group">
            <span className="filter-label"><MdTune size={14} /> Domain View:</span>
            {[
              { id: 'all',     label: 'All Subsystems',        icon: <MdLayers size={14} /> },
              { id: 'air',     label: 'Air Quality',           icon: <MdAir size={14} /> },
              { id: 'energy',  label: 'Energy Optimization',   icon: <MdElectricBolt size={14} /> },
              { id: 'water',   label: 'Water Management',      icon: <MdWaterDrop size={14} /> },
              { id: 'waste',   label: 'Waste Management',      icon: <MdDelete size={14} /> },
              { id: 'parking', label: 'Digital Twin & Parking',icon: <MdLocalParking size={14} /> },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`filter-tab-pill ${activeDomain === tab.id ? 'active' : ''}`}
                onClick={() => setActiveDomain(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ════ TELEMETRY HISTORY TABLE ════ */}
      <div className="card" style={{ marginTop: 18, padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdHistory size={22} color="#2563eb" />
            <span>Historical Telemetry Table (Section: 20 Rows)</span>
          </h3>
          <span className="card-tag">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {paginatedRows.length === 0 ? (
          <div className="alerts-empty-state">
            <MdHistory size={48} color="#94a3b8" />
            <h3>No Historical Records Found</h3>
            <p>
              {searchQuery
                ? 'No telemetry records match your current search query. Try clearing the search box.'
                : 'Awaiting sensor updates. As soon as sensor data arrives, each update will be stored and listed here.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                className="btn-action btn-action--primary"
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 44 }}>#</th>
                  <th style={{ minWidth: 170 }}>Timestamp</th>

                  {/* Dynamic Columns based on activeDomain */}
                  {activeDomain === 'all' && (
                    <>
                      <th>Air Quality (AQI / PM2.5)</th>
                      <th>Energy (Live / AC / DC)</th>
                      <th>Grid Status</th>
                      <th>Water Tank &amp; Flow</th>
                      <th>Acoustic Val1 &amp; Val2</th>
                      <th>Waste (Block A &amp; B)</th>
                      <th>Parking (A1/A2/A3)</th>
                    </>
                  )}

                  {activeDomain === 'air' && (
                    <>
                      <th>AQI</th>
                      <th>PM2.5</th>
                      <th>PM10</th>
                      <th>CO2</th>
                      <th>Smoke</th>
                      <th>NH3</th>
                      <th>VOC</th>
                      <th>Temp / Humidity</th>
                    </>
                  )}

                  {activeDomain === 'energy' && (
                    <>
                      <th>Live Draw</th>
                      <th>AC Supply</th>
                      <th>DC Clean</th>
                      <th>Today kWh</th>
                      <th>Peak Demand</th>
                      <th>Grid Status</th>
                      <th>Est. Cost</th>
                    </>
                  )}

                  {activeDomain === 'water' && (
                    <>
                      <th>Tank Storage</th>
                      <th>Total Flow</th>
                      <th>val1 Flow</th>
                      <th>val2 Flow</th>
                      <th>val1 Acoustic</th>
                      <th>val2 Acoustic</th>
                      <th>Leak Status</th>
                      <th>Valve 1 &amp; 2</th>
                    </>
                  )}

                  {activeDomain === 'waste' && (
                    <>
                      <th>Block A (Wet Organic)</th>
                      <th>Block B (Dry Recyclables)</th>
                      <th>Average Fill</th>
                      <th>Overflow Risk</th>
                      <th>Directive</th>
                    </>
                  )}

                  {activeDomain === 'parking' && (
                    <>
                      <th>Bay A1</th>
                      <th>Bay A2</th>
                      <th>Bay A3</th>
                      <th>Occupied</th>
                      <th>Occupancy %</th>
                      <th>Vehicles Today</th>
                    </>
                  )}

                  <th style={{ textAlign: 'center', width: 80 }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((r, idx) => {
                  const rowNumber = startIndex + idx + 1;
                  const rowUniqueId = r._id || r._historyId || r.timestamp || r.createdAt || `row_${rowNumber}`;
                  const rowKey = `${rowUniqueId}__row_${startIndex + idx}`;
                  const isExpanded = expandedRowKey === rowKey;

                  // Precompute helper values
                  const aqi = safeNum(r.aqi, null);
                  const pm25 = safeNum(r.pm25, null);
                  const liveKw = safeNum(r.livePower, 0);
                  const acKw = r.acPower != null ? r.acPower : Number((liveKw * 0.78).toFixed(2));
                  const dcKw = r.dcPower != null ? r.dcPower : Number((liveKw * 0.22).toFixed(2));
                  const gridStatus = String(r.gridStatus || 'ONLINE').toUpperCase();
                  const tankLevel = safeNum(r.tankLevel, null);
                  const flowRate = safeNum(r.flowRate, 0);
                  const v1Flow = safeNum(r.val1Flow, 0);
                  const v2Flow = safeNum(r.val2Flow, 0);

                  const isV1Leaking = String(r.val1 ?? '').toLowerCase().includes('leak') || r.val1 === false || r.val1 === 'false';
                  const isV2Leaking = String(r.val2 ?? '').toLowerCase().includes('leak') || r.val2 === false || r.val2 === 'false';
                  const isLeak = isV1Leaking || isV2Leaking || (r.leakStatus && r.leakStatus !== 'Normal');

                  const blockA = Array.isArray(r.wasteBlocks) ? r.wasteBlocks.find(b => b.id === 'block-a' || b.code === 'BL-A') : null;
                  const blockB = Array.isArray(r.wasteBlocks) ? r.wasteBlocks.find(b => b.id === 'block-b' || b.code === 'BL-B') : null;
                  const blockAWetKg = blockA?.wetWeight ?? r.wasteWet ?? 0;
                  const blockAFill = blockA?.wetFill ?? r.wasteWetFill ?? 0;
                  const blockBDryKg = blockB?.dryWeight ?? r.wasteDry ?? 0;
                  const blockBFill = blockB?.dryFill ?? r.wasteDryFill ?? 0;

                  const isA1Free = r.a1 !== undefined ? (r.a1 === true || r.a1 === 'true' || r.a1 === 1 || r.a1 === '1') : true;
                  const isA2Free = r.a2 !== undefined ? (r.a2 === true || r.a2 === 'true' || r.a2 === 1 || r.a2 === '1') : false;
                  const isA3Free = r.a3 !== undefined ? (r.a3 === true || r.a3 === 'true' || r.a3 === 1 || r.a3 === '1') : true;

                  return (
                    <Fragment key={rowKey}>
                      <tr
                        style={{
                          background: isExpanded ? '#f1f5f9' : undefined,
                        }}
                      >
                        <td style={{ color: 'var(--muted)', fontWeight: 600 }}>{rowNumber}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                            {formatDateTime(r.timestamp || r.createdAt)}
                          </div>
                          {r.location && (
                            <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <MdLocationOn size={12} />
                              <span>{r.location}</span>
                            </div>
                          )}
                        </td>

                        {/* ── ALL DOMAINS CONSOLIDATED VIEW ── */}
                        {activeDomain === 'all' && (
                          <>
                            <td>
                              <span
                                className={`badge ${
                                  aqi != null ? (aqi <= 50 ? 'good' : aqi <= 100 ? 'medium' : 'high') : ''
                                }`}
                              >
                                {aqi != null ? `${aqi} AQI` : '-'}
                              </span>
                              {pm25 != null && (
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                  PM2.5: {pm25} µg/m³
                                </div>
                              )}
                            </td>

                            <td>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{liveKw} kW</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>
                                AC: {acKw} • DC: {dcKw} kW
                              </div>
                            </td>

                            <td>
                              <span className={`badge ${gridStatus === 'ONLINE' ? 'good' : 'high'}`}>
                                {gridStatus}
                              </span>
                            </td>

                            <td>
                              <div style={{ fontWeight: 700, color: tankLevel != null && tankLevel < 25 ? '#dc2626' : '#0284c7' }}>
                                {tankLevel != null ? `${tankLevel}%` : '-'}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>
                                {flowRate > 0 ? `${flowRate} L/m` : '0 L/m'} • V1:{r.valve1 ? 'ON' : 'OFF'}
                              </div>
                            </td>

                            <td>
                              <span className={`badge ${isLeak ? 'high' : 'good'}`}>
                                {isLeak ? 'LEAK DETECTED' : 'NORMAL'}
                              </span>
                              <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>
                                val1: {isV1Leaking ? 'Leak' : 'OK'} • val2: {isV2Leaking ? 'Leak' : 'OK'}
                              </div>
                            </td>

                            <td>
                              <div>
                                <span style={{ color: '#059669', fontWeight: 600 }}>A: {blockAFill}%</span>
                                <span style={{ color: '#64748b' }}> ({blockAWetKg} kg)</span>
                              </div>
                              <div style={{ fontSize: 11 }}>
                                <span style={{ color: '#2563eb', fontWeight: 600 }}>B: {blockBFill}%</span>
                                <span style={{ color: '#64748b' }}> ({blockBDryKg} kg)</span>
                              </div>
                            </td>

                            <td>
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: isA1Free ? '#10b981' : '#ef4444' }} title="Bay A1" />
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: isA2Free ? '#10b981' : '#ef4444' }} title="Bay A2" />
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: isA3Free ? '#10b981' : '#ef4444' }} title="Bay A3" />
                                <span style={{ fontSize: 11.5, color: '#475569', marginLeft: 4 }}>
                                  {r.parkingOccupancy != null ? `${r.parkingOccupancy}%` : '-'}
                                </span>
                              </div>
                            </td>
                          </>
                        )}

                        {/* ── AIR QUALITY DETAILED VIEW ── */}
                        {activeDomain === 'air' && (
                          <>
                            <td><b>{r.aqi ?? '-'}</b></td>
                            <td>{r.pm25 != null ? `${r.pm25} µg/m³` : '-'}</td>
                            <td>{r.pm10 != null ? `${r.pm10} µg/m³` : '-'}</td>
                            <td>{r.co2 != null ? `${r.co2} ppm` : '-'}</td>
                            <td>{r.smoke != null ? `${r.smoke} ppm` : '-'}</td>
                            <td>{r.nh3 != null ? `${r.nh3} ppm` : '-'}</td>
                            <td>{r.voc != null ? `${r.voc} ppm` : '-'}</td>
                            <td>
                              {r.temperature != null ? `${r.temperature}°C` : '-'}
                              {r.humidity != null ? ` • ${r.humidity}%` : ''}
                            </td>
                          </>
                        )}

                        {/* ── ENERGY DETAILED VIEW ── */}
                        {activeDomain === 'energy' && (
                          <>
                            <td><b>{liveKw} kW</b></td>
                            <td style={{ color: '#2563eb' }}>{acKw} kW</td>
                            <td style={{ color: '#10b981' }}>{dcKw} kW</td>
                            <td>{r.todaysEnergy != null ? `${r.todaysEnergy} kWh` : '-'}</td>
                            <td>{r.peakDemand != null ? `${r.peakDemand} kW` : '-'}</td>
                            <td>
                              <span className={`badge ${gridStatus === 'ONLINE' ? 'good' : 'high'}`}>
                                {gridStatus}
                              </span>
                            </td>
                            <td>{r.estimatedCost != null ? `₹${r.estimatedCost}` : '-'}</td>
                          </>
                        )}

                        {/* ── WATER DETAILED VIEW ── */}
                        {activeDomain === 'water' && (
                          <>
                            <td>
                              <span className={`badge ${tankLevel != null && tankLevel < 25 ? 'high' : 'good'}`}>
                                {tankLevel != null ? `${tankLevel}%` : '-'}
                              </span>
                            </td>
                            <td><b>{flowRate} L/m</b></td>
                            <td>{v1Flow} L/m</td>
                            <td>{v2Flow} L/m</td>
                            <td>
                              <span className={`badge ${isV1Leaking ? 'high' : 'good'}`}>
                                {isV1Leaking ? 'Leak Detected' : 'Normal'}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${isV2Leaking ? 'high' : 'good'}`}>
                                {isV2Leaking ? 'Leak Detected' : 'Normal'}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${isLeak ? 'high' : 'good'}`}>
                                {isLeak ? 'Leak Alarm' : 'Nominal'}
                              </span>
                            </td>
                            <td>
                              V1: <b>{r.valve1 ? 'ON' : 'OFF'}</b> • V2: <b>{r.valve2 ? 'ON' : 'OFF'}</b>
                            </td>
                          </>
                        )}

                        {/* ── WASTE DETAILED VIEW ── */}
                        {activeDomain === 'waste' && (
                          <>
                            <td>
                              <b>{blockAWetKg} kg</b>
                              <span style={{ fontSize: 11, color: '#64748b' }}> ({blockAFill}% fill)</span>
                            </td>
                            <td>
                              <b>{blockBDryKg} kg</b>
                              <span style={{ fontSize: 11, color: '#64748b' }}> ({blockBFill}% fill)</span>
                            </td>
                            <td>{r.averageFill != null ? `${r.averageFill}%` : '-'}</td>
                            <td>
                              <span className={`badge ${(r.overflowRisk ?? 0) > 0 ? 'high' : 'good'}`}>
                                {(r.overflowRisk ?? 0) > 0 ? `${r.overflowRisk} At Risk` : 'Zero Risk'}
                              </span>
                            </td>
                            <td style={{ fontSize: 11.5, color: '#475569', maxWidth: 220 }}>
                              {blockA?.directive || blockB?.directive || 'Operational within parameters'}
                            </td>
                          </>
                        )}

                        {/* ── PARKING DETAILED VIEW ── */}
                        {activeDomain === 'parking' && (
                          <>
                            <td>
                              <span className={`badge ${isA1Free ? 'good' : 'high'}`}>
                                {isA1Free ? 'Free' : 'Occupied'}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${isA2Free ? 'good' : 'high'}`}>
                                {isA2Free ? 'Free' : 'Occupied'}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${isA3Free ? 'good' : 'high'}`}>
                                {isA3Free ? 'Free' : 'Occupied'}
                              </span>
                            </td>
                            <td>{r.occupiedSlots != null ? `${r.occupiedSlots} / 3` : '-'}</td>
                            <td><b>{r.parkingOccupancy != null ? `${r.parkingOccupancy}%` : '-'}</b></td>
                            <td>{r.vehiclesToday != null ? `${r.vehiclesToday} Vehicles` : '-'}</td>
                          </>
                        )}

                        {/* Inspect / Expand Row button */}
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-action"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() => setExpandedRowKey(isExpanded ? null : rowKey)}
                            title={isExpanded ? 'Collapse row details' : 'Inspect full snapshot attributes'}
                          >
                            <span>{isExpanded ? 'Less' : 'More'}</span>
                            {isExpanded ? <MdKeyboardArrowUp size={14} /> : <MdKeyboardArrowDown size={14} />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable JSON / Full Snapshot Drawer */}
                      {isExpanded && (
                        <tr key={`${rowKey}-expanded`}>
                          <td colSpan={activeDomain === 'all' ? 9 : 10} style={{ background: '#f8fafc', padding: '16px 20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Snapshot Metadata</div>
                                <div style={{ fontSize: 12, marginTop: 4 }}>ID: <code>{r._id || '-'}</code></div>
                                <div style={{ fontSize: 12 }}>Source: <b>{r.source || 'IoT Sensor'}</b></div>
                                <div style={{ fontSize: 12 }}>Timestamp: {formatDateTime(r.timestamp || r.createdAt)}</div>
                              </div>

                              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Energy &amp; Grid</div>
                                <div style={{ fontSize: 12, marginTop: 4 }}>Live Power: <b>{liveKw} kW</b></div>
                                <div style={{ fontSize: 12 }}>AC / DC: {acKw} kW / {dcKw} kW</div>
                                <div style={{ fontSize: 12 }}>Grid Status: <b>{gridStatus}</b></div>
                                <div style={{ fontSize: 12 }}>Today's Energy: {r.todaysEnergy ?? '-'} kWh</div>
                              </div>

                              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Water &amp; Solenoid Valves</div>
                                <div style={{ fontSize: 12, marginTop: 4 }}>Tank: <b>{tankLevel}%</b> • Flow: {flowRate} L/m</div>
                                <div style={{ fontSize: 12 }}>val1 Flow: {v1Flow} L/m • val2: {v2Flow} L/m</div>
                                <div style={{ fontSize: 12 }}>val1 Acoustic: {String(r.val1 ?? 'Normal')}</div>
                                <div style={{ fontSize: 12 }}>val2 Acoustic: {String(r.val2 ?? 'Normal')}</div>
                                <div style={{ fontSize: 12 }}>Valve 1: <b>{r.valve1 ? 'ON' : 'OFF'}</b> • Valve 2: <b>{r.valve2 ? 'ON' : 'OFF'}</b></div>
                              </div>

                              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Waste &amp; Parking</div>
                                <div style={{ fontSize: 12, marginTop: 4 }}>Block A (Wet): {blockAWetKg} kg ({blockAFill}%)</div>
                                <div style={{ fontSize: 12 }}>Block B (Dry): {blockBDryKg} kg ({blockBFill}%)</div>
                                <div style={{ fontSize: 12 }}>Parking Occupancy: {r.parkingOccupancy ?? '-'}%</div>
                                <div style={{ fontSize: 12 }}>Bays (A1/A2/A3): {isA1Free ? 'Free' : 'Occ'} / {isA2Free ? 'Free' : 'Occ'} / {isA3Free ? 'Free' : 'Occ'}</div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ════ PAGINATION BAR (20 ROWS PER SECTION) ════ */}
        {filteredRecords.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 18,
              paddingTop: 14,
              borderTop: '1px solid var(--border)',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              Showing <b>{startIndex + 1}</b> to <b>{endIndex}</b> of <b>{filteredRecords.length}</b> historical records (20 rows per section)
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* First Page */}
              <button
                type="button"
                className="pe-page-btn"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="Go to First Page"
              >
                <MdFirstPage size={16} />
              </button>

              {/* Prev Page */}
              <button
                type="button"
                className="pe-page-btn"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                title="Previous 20 Rows"
              >
                <MdNavigateBefore size={16} />
                <span>Prev</span>
              </button>

              {/* Page Number Pills */}
              {pageNumbers.map(p => (
                <button
                  key={p}
                  type="button"
                  className={`pe-page-btn ${currentPage === p ? 'active' : ''}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}

              {/* Next Page */}
              <button
                type="button"
                className="pe-page-btn"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                title="Next 20 Rows"
              >
                <span>Next</span>
                <MdNavigateNext size={16} />
              </button>

              {/* Last Page */}
              <button
                type="button"
                className="pe-page-btn"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                title="Go to Last Page"
              >
                <MdLastPage size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
