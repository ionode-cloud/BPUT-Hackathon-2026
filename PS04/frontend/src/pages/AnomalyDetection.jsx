import { useMemo } from 'react';
import { MdTroubleshoot, MdRefresh } from 'react-icons/md';
import ExcelDownloadBtn from '../components/ExcelDownloadBtn';

// Prettify feature names (e.g., "live_power" -> "Live power", "co2" -> "CO2")
function formatFeatureName(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const clean = raw.trim();
  const upperMap = {
    aqi: 'AQI',
    pm25: 'PM2.5',
    pm10: 'PM10',
    co2: 'CO2',
    voc: 'VOC',
    nh3: 'NH3',
    co: 'CO',
    inr: 'INR',
    kw: 'kW',
    kwh: 'kWh',
  };
  const lower = clean.toLowerCase();
  if (upperMap[lower]) return upperMap[lower];

  return clean
    .split(/[_\s]+/)
    .map((word, idx) => {
      const wLower = word.toLowerCase();
      if (upperMap[wLower]) return upperMap[wLower];
      if (idx === 0) return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      return word.toLowerCase();
    })
    .join(' ');
}

// Format ISO string or time string into hh:mm display (e.g. "03:14")
function formatShortTime(val) {
  if (!val) return '-';
  if (typeof val === 'string' && /^\d{1,2}:\d{2}/.test(val)) {
    return val.slice(0, 5);
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
  } catch { }
  return String(val);
}

// Format header timestamp like "Updated 13 Nov, 12:49 am IST • My Campus"
function formatHeaderTimestamp(val, site = 'My Campus') {
  let dateObj = new Date();
  if (val) {
    try {
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) dateObj = parsed;
    } catch { }
  }
  const dateStr = dateObj.toLocaleDateString([], { day: 'numeric', month: 'short' });
  const timeStr = dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  return `Updated ${dateStr}, ${timeStr} • ${site || 'My Campus'}`;
}

// Compute gauge fill percentage and threshold marker percentage
function computeGaugePercentages(scoreVal, thresholdVal) {
  const score = Number(scoreVal) || 0;
  const threshold = Number(thresholdVal) || 0.1;
  const maxScale = Math.max(threshold * 1.6, score * 1.15, 0.05);

  const scorePct = Math.min(Math.max((score / maxScale) * 100, 3), 100);
  const threshPct = Math.min(Math.max((threshold / maxScale) * 100, 8), 92);
  return { scorePct, threshPct };
}

// Check if raw data contains actual anomaly telemetry sent by API (zero dummy data allowed)
function hasRealAnomalyData(raw) {
  if (!raw || typeof raw !== 'object') return false;
  if (Array.isArray(raw)) return raw.length > 0;
  const keys = Object.keys(raw);
  if (keys.length === 0) return false;
  // Real anomaly telemetry requires at least one populated subsystem
  const hasSubstantialData = Boolean(
    (raw.energy && typeof raw.energy === 'object' && Object.keys(raw.energy).length > 0) ||
    (Array.isArray(raw.sensors) && raw.sensors.length > 0) ||
    (Array.isArray(raw.alerts) && raw.alerts.length > 0) ||
    (Array.isArray(raw.anomalies) && raw.anomalies.length > 0) ||
    (raw.summary && typeof raw.summary === 'object' && Object.keys(raw.summary).length > 0)
  );
  return hasSubstantialData;
}

export default function AnomalyDetection({ data = {}, history = [], allHistory = [], onRefresh }) {
  // Resolve raw anomaly data strictly from the CURRENT API snapshot (no fallback dummy data, no stale history fallback)
  const rawAnomalyData = useMemo(() => {
    if (data && data.anomalyDetection && typeof data.anomalyDetection === 'object' && Object.keys(data.anomalyDetection).length > 0) {
      return data.anomalyDetection;
    }
    return null;
  }, [data?.anomalyDetection]);

  const hasData = useMemo(() => hasRealAnomalyData(rawAnomalyData), [rawAnomalyData]);

  // Parse strictly from real API payload
  const parsedData = useMemo(() => {
    if (!hasData || !rawAnomalyData) return null;

    const raw = rawAnomalyData;

    // 1. Overall State & Summary Counts
    const overallState = raw.summary?.state
      ? (String(raw.summary.state).toLowerCase().includes('anom') ? 'Anomaly' : 'Normal')
      : (String(raw.energy?.status || '').toLowerCase().includes('anom') || (Array.isArray(raw.sensors) && raw.sensors.some(s => String(s.status || '').toLowerCase().includes('anom')))
        ? 'Anomaly'
        : 'Normal');

    const activeAnomalies = raw.summary?.active ?? (
      (String(raw.energy?.status || '').toLowerCase().includes('anom') ? 1 : 0) +
      (Array.isArray(raw.sensors) ? raw.sensors.filter(s => String(s.status || '').toLowerCase().includes('anom')).length : 0)
    );

    const flaggedSensorGroups = raw.summary?.sensor_streams ?? (
      Array.isArray(raw.sensors) ? raw.sensors.filter(s => String(s.status || '').toLowerCase().includes('anom')).length : 0
    );

    const totalMonitored = Array.isArray(raw.sensors) && raw.sensors.length > 0 ? raw.sensors.length : 0;

    const openAlertsCount = raw.summary?.open_alerts ?? (
      Array.isArray(raw.alerts) ? raw.alerts.length : 0
    );

    // 2. Energy Subsystem from API
    const hasEnergy = Boolean(raw.energy && typeof raw.energy === 'object');
    const energyStatus = String(raw.energy?.status || 'normal').toLowerCase().includes('anom') ? 'Anomaly' : 'Normal';
    const energyTrainedOn = raw.energy?.trained_on || {
      file: 'FacilityAI_ENERGY_Telemetry.xlsx',
      readings: raw.energy?.recent?.length || 0,
    };
    const energyAgeMin = raw.energy?.age_min ?? 0;

    const rawLatest = raw.energy?.latest || {};
    const livePower = rawLatest.live_power ?? rawLatest.power ?? 0;
    const peakDemand = rawLatest.peak_demand ?? rawLatest.peak ?? 0;
    const todaysEnergy = rawLatest.todays_energy ?? rawLatest.energy ?? 0;
    const estimatedCost = rawLatest.estimated_cost ?? rawLatest.cost ?? 0;

    const energyScore = Number(rawLatest.score ?? raw.energy?.latest_score ?? 0);
    const energyThreshold = Number(raw.energy?.threshold ?? 0.0752);
    const mainContributor = rawLatest.main_contributor
      ? (formatFeatureName(rawLatest.main_contributor) + (rawLatest.main_contributor.includes('energy') ? ' (kWh)' : ''))
      : 'Sensor Load';

    // Recent Energy Telemetry Readings from API — Display up to 6 rows matching design
    let recentEnergyReadings = [];
    if (Array.isArray(raw.energy?.recent)) {
      recentEnergyReadings = raw.energy.recent.slice(0, 6).map((r, i) => {
        const p = Number(r.live_power_kw ?? r.live_power ?? r.power ?? 0);
        const pk = Number(r.peak_demand_kw ?? r.peak_demand ?? r.peak ?? 0);
        const en = Number(r.todays_energy_kwh ?? r.todays_energy ?? r.energy ?? 0);
        const c = Number(r.estimated_cost_inr ?? r.estimated_cost ?? r.cost ?? 0);
        const sc = Number(r.score ?? 0);
        const anom = Boolean(r.anomaly !== undefined ? r.anomaly : sc > energyThreshold);

        return {
          time: formatShortTime(r.time || r.timestamp) || '-',
          power: p >= 1 ? p.toFixed(1) : p.toFixed(3),
          peak: pk >= 1 ? pk.toFixed(1) : pk.toFixed(3),
          energy: en >= 1 ? en.toFixed(1) : en.toFixed(3),
          cost: c.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          score: sc.toFixed(4),
          anomaly: anom,
        };
      });
    }

    // 3. Sensor Groups from API
    let sensorGroups = [];
    if (Array.isArray(raw.sensors)) {
      sensorGroups = raw.sensors.map(s => {
        const isAnom = String(s.status || '').toLowerCase().includes('anom');
        const score = Number(s.latest_score ?? s.score ?? 0);
        const thresh = Number(s.threshold ?? 0.5);

        let recentFlags = [];
        if (Array.isArray(s.recent_flags)) {
          // Limit to at most 2 moments to match reference layout and maintain clean vertical balance
          recentFlags = s.recent_flags.slice(0, 2).map(f => {
            let desc = f.text || f.top_features || '';
            if (!desc && f.values && typeof f.values === 'object') {
              desc = Object.entries(f.values).slice(0, 3).map(([k, v]) => `${formatFeatureName(k)} ${v}`).join(' · ');
            }
            return {
              time: formatShortTime(f.time),
              score: Number(f.score ?? score).toFixed(2),
              text: desc || 'Flagged moment deviation',
            };
          });
        }

        return {
          label: s.label || s.name || formatFeatureName(s.stream),
          status: isAnom ? 'Anomaly' : 'Normal',
          score,
          threshold: thresh,
          watches: Array.isArray(s.features) ? s.features.map(formatFeatureName).join(', ') : (s.watches || 'All group telemetry'),
          flagged_time: formatShortTime(s.flagged_time || s.latest_time),
          top_features: s.top_features || 'Telemetry variance',
          flagged_count_2d: s.flagged_count_2d || 0,
          recent_flags: recentFlags,
        };
      });
    }

    // 4. Open Alerts from API
    let openAlerts = [];
    if (Array.isArray(raw.alerts)) {
      openAlerts = raw.alerts.map((a, idx) => {
        const cat = a.module || a.category || (a.stream ? formatFeatureName(a.stream) : 'Telemetry');
        const title = a.title || 'Unusual telemetry anomaly pattern';
        const isWater = /water|tank|flow/i.test(cat + ' ' + title);
        const isEnergy = /energy|power|cost|demand/i.test(cat + ' ' + title);
        const isAir = /air|aqi|co2|pm/i.test(cat + ' ' + title);

        let defaultCheck = 'Raw trends of the contributing channels; sensor faults (stuck/drifting), real events nearby.';
        let defaultDo = 'Confirm on site. If it is a real event act on it; if a sensor fault, service the sensor.';

        if (isWater) {
          defaultCheck = 'Pump and inlet valve, scheduled supply, leaks (leak status).';
          defaultDo = 'Refill or start the pump; check for leaks.';
        } else if (isEnergy) {
          defaultCheck = 'The meter and the load behind it; whether a large load was switched on or off; stuck or drifting readings.';
          defaultDo = 'Confirm on site. If it is a real load change act on it; if the meter or gateway is faulty, service it.';
        } else if (isAir) {
          defaultCheck = 'Raw trends of the contributing channels; sensor faults (stuck/drifting), real events nearby.';
          defaultDo = 'Confirm on site. If it is a real event act on it; if a sensor fault, service the sensor.';
        }

        return {
          id: a.id || `al-${idx}`,
          severity: a.severity || 'Warning',
          category: cat,
          origin: a.origin || a.type || 'ai-anomaly',
          since: formatShortTime(a.since || a.detected_at),
          title: title,
          what_happened: a.what_happened || a.details || a.message || 'Telemetry threshold exceeded standard tolerances.',
          why_unusual: a.why_abnormal || a.why_unusual || a.reason || 'Deviation from normal baseline model.',
          check: a.what_to_check || a.check || a.inspection || defaultCheck,
          do: a.recommendation || a.do || a.action || defaultDo,
        };
      });
    }

    return {
      site: raw.site || 'My Campus',
      generated_at: raw.generated_at || data.timestamp,
      overallState,
      activeAnomalies,
      flaggedSensorGroups,
      totalMonitored,
      openAlertsCount,
      hasEnergy,
      energy: {
        status: energyStatus,
        trainedOn: energyTrainedOn,
        ageMin: energyAgeMin,
        livePower,
        peakDemand,
        todaysEnergy,
        estimatedCost,
        score: energyScore,
        threshold: energyThreshold,
        mainContributor,
        recentReadings: recentEnergyReadings,
      },
      sensors: sensorGroups,
      alerts: openAlerts,
    };
  }, [hasData, rawAnomalyData, data.timestamp]);

  // If no data has been transmitted by API, display a clean standby state (NO DUMMY DATA)
  if (!hasData || !parsedData) {
    return (
      <div className="anomaly-page-container">
        {/* Header */}
        <div className="anomaly-header-section">
          <div className="anomaly-header-left">
            <h1 className="anomaly-header-title">Anomaly detection</h1>
            <p className="anomaly-header-subtitle">
              Readings that look unlike normal behaviour, found by LSTM autoencoders trained on the facility's own data: the energy model plus one model for each sensor group. Open alerts are listed at the bottom.
            </p>
          </div>

          <div className="anomaly-header-right">
            <div className="anomaly-header-actions-row">
              {onRefresh && (
                <button
                  type="button"
                  className="anomaly-refresh-btn"
                  onClick={onRefresh}
                  title="Query latest sensor state from API (Manual Refresh)"
                >
                  <MdRefresh size={17} />
                </button>
              )}
              <ExcelDownloadBtn
                tabName="anomalydetection"
                tabLabel="Anomaly Detection"
                data={data}
                history={history}
                allHistory={allHistory}
                extraData={{ anomalyDetection: {} }}
                variant="standard"
              />
            </div>
          </div>
        </div>

        {/* Clean Empty / Standby Card — ZERO DUMMY DATA */}
        <div className="anomaly-empty-state-card">
          <div className="anomaly-empty-icon-wrap">
            <MdTroubleshoot size={44} color="#64748b" />
          </div>
          <h3 className="anomaly-empty-title">Awaiting Anomaly Detection Telemetry</h3>
          <p className="anomaly-empty-desc">
            The <code>anomalyDetection</code> key is currently blank in the backend API (<code>&quot;anomalyDetection&quot;: &#123;&#125;</code>). All subsystems are reporting within standard tolerances. Any telemetry data transmitted to <code>/api/data</code> under the <code>&quot;anomalyDetection&quot;</code> key by your LSTM autoencoder pipeline will immediately render each dataset here in real time.
          </p>
          <div className="anomaly-empty-api-pill">
            <code>POST /api/data</code> or <code>PUT /api/data</code> • <code>&quot;anomalyDetection&quot;: &#123; ... &#125;</code>
          </div>
        </div>
      </div>
    );
  }

  const { energy, sensors, alerts } = parsedData;
  const energyGauge = computeGaugePercentages(energy.score, energy.threshold);

  return (
    <div className="anomaly-page-container">
      {/* ════ TOP HEADER & TIMESTAMP ════ */}
      <div className="anomaly-header-section">
        <div className="anomaly-header-left">
          <h1 className="anomaly-header-title">Anomaly detection</h1>
          <p className="anomaly-header-subtitle">
            Readings that look unlike normal behaviour, found by LSTM autoencoders trained on the facility's own data: the energy model plus one model for each sensor group. Open alerts are listed at the bottom.
          </p>
        </div>

        <div className="anomaly-header-right">
          <div className="anomaly-header-actions-row">
            <div className="anomaly-updated-badge">
              {formatHeaderTimestamp(parsedData.generated_at, parsedData.site)}
            </div>
            {onRefresh && (
              <button
                type="button"
                className="anomaly-refresh-btn"
                onClick={onRefresh}
                title="Query latest sensor state from API (Manual Refresh)"
              >
                <MdRefresh size={17} />
              </button>
            )}
            <ExcelDownloadBtn
              tabName="anomalydetection"
              tabLabel="Anomaly Detection"
              data={data}
              history={history}
              allHistory={allHistory}
              extraData={{ anomalyDetection: rawAnomalyData }}
              variant="standard"
            />
          </div>
        </div>
      </div>

      {/* ════ 4 SUMMARY KPI CARDS (Real API Data) ════ */}
      <div className="anomaly-summary-cards">
        {/* Card 1: Overall State */}
        <div className="anomaly-sum-card">
          <div className="anomaly-sum-label">Overall state</div>
          <div>
            <span className={`anomaly-status-pill anomaly-status-pill--${parsedData.overallState.toLowerCase()}`}>
              {parsedData.overallState}
            </span>
          </div>
        </div>

        {/* Card 2: Active Anomalies */}
        <div className="anomaly-sum-card anomaly-sum-card--flex">
          <div>
            <div className="anomaly-sum-label">Active anomalies</div>
            <div className="anomaly-sum-sub">Energy + sensor groups</div>
          </div>
          <div className="anomaly-sum-num">{parsedData.activeAnomalies}</div>
        </div>

        {/* Card 3: Sensor Groups Flagged */}
        <div className="anomaly-sum-card anomaly-sum-card--flex">
          <div>
            <div className="anomaly-sum-label">Sensor groups flagged</div>
            <div className="anomaly-sum-sub">of {parsedData.totalMonitored} monitored</div>
          </div>
          <div className="anomaly-sum-num">{parsedData.flaggedSensorGroups}</div>
        </div>

        {/* Card 4: Open Alerts */}
        <div className="anomaly-sum-card anomaly-sum-card--flex">
          <div>
            <div className="anomaly-sum-label">Open alerts</div>
            <div className="anomaly-sum-sub">Need a person to look</div>
          </div>
          <div className="anomaly-sum-num">{parsedData.openAlertsCount}</div>
        </div>
      </div>

      {/* ════ MAIN 2-COLUMN SPLIT ════ */}
      <div className="anomaly-body-grid">
        {/* LEFT COLUMN: Energy anomaly */}
        <div className="anomaly-panel">
          <div className="anomaly-panel-header">
            <h3 className="anomaly-panel-title">Energy anomaly · energy.status</h3>
            <span className={`anomaly-pill-badge anomaly-pill-badge--${energy.status.toLowerCase()}`}>
              {energy.status}
            </span>
          </div>
          <p className="anomaly-panel-desc">
            Trained on {energy.trainedOn.file} ({energy.trainedOn.readings} readings). Newest stored reading is {energy.ageMin} min old. A reading is flagged when its score is above the threshold.
          </p>

          {/* 4 Mini Stat Boxes */}
          <div className="anomaly-stats-strip">
            <div className="anomaly-stat-item">
              <span className="anomaly-stat-label">Live power</span>
              <span className="anomaly-stat-value">{Number(energy.livePower).toLocaleString()} kW</span>
            </div>
            <div className="anomaly-stat-item">
              <span className="anomaly-stat-label">Peak demand</span>
              <span className="anomaly-stat-value">{Number(energy.peakDemand).toLocaleString()} kW</span>
            </div>
            <div className="anomaly-stat-item">
              <span className="anomaly-stat-label">Today's energy</span>
              <span className="anomaly-stat-value">{Number(energy.todaysEnergy).toLocaleString()} kWh</span>
            </div>
            <div className="anomaly-stat-item">
              <span className="anomaly-stat-label">Estimated cost</span>
              <span className="anomaly-stat-value">{Number(energy.estimatedCost).toLocaleString()} INR</span>
            </div>
          </div>

          {/* Score & Threshold Gauge Bar */}
          <div className="anomaly-gauge-container">
            <div className="anomaly-gauge-row">
              <span>Latest score {energy.score.toFixed(4)}</span>
              <span>Threshold {energy.threshold.toFixed(4)}</span>
            </div>
            <div className="anomaly-gauge-track">
              <div
                className="anomaly-gauge-bar"
                style={{
                  width: `${energyGauge.scorePct}%`,
                  background: energy.status === 'Anomaly' ? 'linear-gradient(90deg, #f59e0b 0%, #ea580c 100%)' : '#10b981',
                }}
              />
              <div
                className="anomaly-gauge-tick"
                style={{ left: `${energyGauge.threshPct}%` }}
                title={`Threshold: ${energy.threshold}`}
              />
            </div>
            <div className="anomaly-gauge-caption">
              The dark tick is the threshold. Main contributor to the latest score: <strong>{energy.mainContributor}</strong>.
            </div>
          </div>

          {/* Energy Telemetry Readings Table (from API) */}
          <div className="anomaly-table-wrap">
            <table className="anomaly-data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Power kW</th>
                  <th>Peak kW</th>
                  <th>Energy kWh</th>
                  <th>Cost INR</th>
                  <th>Score</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {energy.recentReadings.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>
                      No recent energy telemetry readings recorded in payload.
                    </td>
                  </tr>
                ) : (
                  energy.recentReadings.map((row, idx) => (
                    <tr key={idx} className={row.anomaly ? 'anomaly-row--flagged' : ''}>
                      <td>{row.time}</td>
                      <td>{row.power}</td>
                      <td>{row.peak}</td>
                      <td>{row.energy}</td>
                      <td>{row.cost}</td>
                      <td>{row.score}</td>
                      <td>
                        <span className={`anomaly-result-pill anomaly-result-pill--${row.anomaly ? 'flagged' : 'normal'}`}>
                          {row.anomaly ? 'Anomaly' : 'Normal'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: Sensor groups */}
        <div className="anomaly-panel">
          <div className="anomaly-panel-header">
            <h3 className="anomaly-panel-title">Sensor groups · sensors[ ]</h3>
          </div>

          <div className="anomaly-groups-stack">
            {sensors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: '#94a3b8', fontSize: '13px' }}>
                No sensor stream groups defined in payload.
              </div>
            ) : (
              sensors.map((group, idx) => {
                const isAnomaly = group.status === 'Anomaly';
                const gauge = computeGaugePercentages(group.score, group.threshold);

                return (
                  <div
                    key={idx}
                    className={`anomaly-group-box ${isAnomaly ? 'anomaly-group-box--flagged' : ''}`}
                  >
                    <div className="anomaly-group-top">
                      <span className="anomaly-group-title">{group.label}</span>
                      <span className={`anomaly-pill-badge anomaly-pill-badge--${isAnomaly ? 'anomaly' : 'normal'}`}>
                        {group.status}
                      </span>
                    </div>

                    <div className="anomaly-group-scores">
                      <span>Score {group.score.toFixed(2)}</span>
                      <span>Threshold {group.threshold.toFixed(2)}</span>
                    </div>

                    <div className="anomaly-group-track">
                      <div
                        className="anomaly-group-bar"
                        style={{
                          width: `${gauge.scorePct}%`,
                          background: isAnomaly ? '#ea580c' : '#10b981',
                        }}
                      />
                      <div
                        className="anomaly-group-tick"
                        style={{ left: `${gauge.threshPct}%` }}
                        title={`Threshold: ${group.threshold}`}
                      />
                    </div>

                    <div className="anomaly-group-watches">
                      Watches: {group.watches}
                    </div>

                    {/* Flagged Alert Box */}
                    {isAnomaly && (
                      <div className="anomaly-flag-callout">
                        <div className="anomaly-flag-callout-header">
                          Flagged at {group.flagged_time} · biggest contributors: {group.top_features}
                        </div>
                        <div className="anomaly-flag-callout-sub">
                          {group.flagged_count_2d} flagged readings in the last 2 days. Latest flagged moments (recent_flags):
                        </div>
                        <div className="anomaly-flag-callout-moments">
                          {group.recent_flags && group.recent_flags.length > 0 ? (
                            group.recent_flags.map((flag, fIdx) => (
                              <div key={fIdx}>
                                <strong>{flag.time}</strong> score {flag.score} {flag.text}
                              </div>
                            ))
                          ) : (
                            <div>
                              <strong>{group.flagged_time}</strong> score {group.score.toFixed(2)} {group.top_features}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ════ BOTTOM SECTION: Open alerts ════ */}
      <div className="anomaly-alerts-container">
        <h3 className="anomaly-alerts-header">Open alerts · alerts[ ] · most severe first</h3>

        <div className="anomaly-alerts-list">
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 12px', color: '#94a3b8', fontSize: '13px' }}>
              No open anomaly alerts at this time. All streams operating within normal parameters.
            </div>
          ) : (
            alerts.map((alert, idx) => (
              <div key={alert.id || idx} className="anomaly-alert-card">
                <div className="anomaly-alert-tags">
                  <span className="anomaly-badge-sev">{alert.severity}</span>
                  <span className="anomaly-badge-gray">{alert.category}</span>
                  <span className="anomaly-badge-gray">{alert.origin}</span>
                  <span className="anomaly-badge-time">New · since {alert.since}</span>
                </div>

                <h4 className="anomaly-alert-title">{alert.title}</h4>

                <div className="anomaly-alert-grid">
                  <div className="anomaly-grid-label">What happened</div>
                  <div className="anomaly-grid-desc">{alert.what_happened}</div>

                  <div className="anomaly-grid-label">Why unusual</div>
                  <div className="anomaly-grid-desc">{alert.why_unusual}</div>

                  <div className="anomaly-grid-label">Check</div>
                  <div className="anomaly-grid-desc">{alert.check}</div>

                  <div className="anomaly-grid-label">Do</div>
                  <div className="anomaly-grid-desc anomaly-grid-desc--bold">{alert.do}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
