import { useState } from 'react';
import {
  MdWaterDrop,
  MdSpeed,
  MdWarningAmber,
  MdWater,
  MdCheckCircle,
  MdCancel,
  MdPowerSettingsNew,
} from 'react-icons/md';
import ChartBox from '../components/ChartBox';
import StatCard from '../components/StatCard';
import { getWaterTrendData, getTankStorageData } from '../utils/chartHelpers';
import ExcelDownloadBtn from '../components/ExcelDownloadBtn';

export default function Water({ data, history = [], onUpdate }) {
  const d = data || {};
  const trendData = getWaterTrendData(d, history);
  const tankData = getTankStorageData(d);

  const tankLevel = d.tankLevel ?? 0;
  const isLeaking = d.leakStatus && d.leakStatus !== 'Normal';

  // Val1 & Val2 Acoustic Telemetry (individual status)
  const rawVal1 = d.val1 !== undefined ? d.val1 : (isLeaking ? 'Leak Detected' : 'Normal');
  const rawVal2 = d.val2 !== undefined ? d.val2 : 'Normal';

  const isVal1Leaking =
    rawVal1 === false ||
    rawVal1 === 'false' ||
    rawVal1 === 0 ||
    rawVal1 === '0' ||
    String(rawVal1).toLowerCase().includes('leak');
  const isVal1Ok = !isVal1Leaking;
  const val1StatusText = typeof rawVal1 === 'boolean'
    ? (rawVal1 ? 'Normal' : 'Leak Detected')
    : (rawVal1 === 'true' ? 'Normal' : (rawVal1 === 'false' ? 'Leak Detected' : String(rawVal1)));

  const isVal2Leaking =
    rawVal2 === false ||
    rawVal2 === 'false' ||
    rawVal2 === 0 ||
    rawVal2 === '0' ||
    String(rawVal2).toLowerCase().includes('leak');
  const isVal2Ok = !isVal2Leaking;
  const val2StatusText = typeof rawVal2 === 'boolean'
    ? (rawVal2 ? 'Normal' : 'Leak Detected')
    : (rawVal2 === 'true' ? 'Normal' : (rawVal2 === 'false' ? 'Leak Detected' : String(rawVal2)));

  const anyLeak = isVal1Leaking || isVal2Leaking;

  // Val1 & Val2 Individual Flow Rates (L/m)
  const rawFlow1 = d.val1Flow ?? d.flowRate1;
  const rawFlow2 = d.val2Flow ?? d.flowRate2;
  const hasSplitFlow = rawFlow1 != null || rawFlow2 != null;
  const baseFlow = typeof d.flowRate === 'number' && !isNaN(d.flowRate) ? d.flowRate : 0;
  const val1Flow = rawFlow1 != null ? Number(rawFlow1) : (baseFlow > 0 ? Number((baseFlow * 0.65).toFixed(1)) : 0);
  const val2Flow = rawFlow2 != null ? Number(rawFlow2) : (baseFlow > 0 ? Number((baseFlow * 0.35).toFixed(1)) : 0);
  const totalFlow = Number((val1Flow + val2Flow).toFixed(1));
  const effectiveFlow = hasSplitFlow ? totalFlow : baseFlow;
  const hasFlowData = hasSplitFlow || d.flowRate != null;
  const isHighVelocity = val1Flow > 20 || val2Flow > 20 || effectiveFlow > 25;
  const leakLineLabel = isVal1Leaking && isVal2Leaking
    ? 'val1 & val2'
    : (isVal1Leaking ? 'val1 (Valve 1)' : (isVal2Leaking ? 'val2 (Valve 2)' : 'Main Line'));

  // Read current valve state directly from API telemetry
  const apiValve1 = Boolean(d.valve1 ?? false);
  const apiValve2 = Boolean(d.valve2 ?? false);

  // Persistent valve state controlled strictly by manual user clicks (never auto-turns off or on)
  const [valve1, setValve1] = useState(() => {
    try {
      const saved = localStorage.getItem('facility_actuator_valve1');
      if (saved !== null) return saved === 'true';
    } catch {}
    return apiValve1;
  });

  const [valve2, setValve2] = useState(() => {
    try {
      const saved = localStorage.getItem('facility_actuator_valve2');
      if (saved !== null) return saved === 'true';
    } catch {}
    return apiValve2;
  });

  const [isUpdating1, setIsUpdating1] = useState(false);
  const [isUpdating2, setIsUpdating2] = useState(false);

  // Toggle or set Valve 1 state (Strictly manual: ON/OFF ONLY when clicked)
  const handleValve1 = async (targetState) => {
    const nextVal = typeof targetState === 'boolean' ? targetState : !valve1;
    setValve1(nextVal);
    try {
      localStorage.setItem('facility_actuator_valve1', String(nextVal));
    } catch {}
    setIsUpdating1(true);
    try {
      if (onUpdate) {
        await onUpdate({ valve1: nextVal });
      } else {
        await fetch('http://localhost:5011/api/data', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ valve1: nextVal }),
        });
      }
    } catch (err) {
      console.error('Failed to update Valve 1:', err);
    } finally {
      setIsUpdating1(false);
      // Preserved! Never reset to null or auto-revert to off!
    }
  };

  // Toggle or set Valve 2 state (Strictly manual: ON/OFF ONLY when clicked)
  const handleValve2 = async (targetState) => {
    const nextVal = typeof targetState === 'boolean' ? targetState : !valve2;
    setValve2(nextVal);
    try {
      localStorage.setItem('facility_actuator_valve2', String(nextVal));
    } catch {}
    setIsUpdating2(true);
    try {
      if (onUpdate) {
        await onUpdate({ valve2: nextVal });
      } else {
        await fetch('http://localhost:5011/api/data', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ valve2: nextVal }),
        });
      }
    } catch (err) {
      console.error('Failed to update Valve 2:', err);
    } finally {
      setIsUpdating2(false);
      // Preserved! Never reset to null or auto-revert to off!
    }
  };

  return (
    <>
      {/* Tab Control / Export Banner */}
      <div className="tab-control-banner">
        <div className="banner-left-info">
          <div className="engine-status-pill">
            <span className="pulse-dot-small" style={{ background: '#0284c7' }} />
            <span>Hydraulic Telemetry & Remote Solenoid Isolation</span>
          </div>
          <p className="banner-subtext">
            Ultrasonic tank reservoir monitoring, acoustic leak detection, and 2-way remote solenoid valve actuation.
          </p>
        </div>
        <div className="banner-right-actions">
          <ExcelDownloadBtn tabName="water" tabLabel="Water" data={d} history={history} />
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid">
        <StatCard
          index={0}
          icon={<MdWater size={18} color="#0284c7" />}
          label="Main Tank Reserve"
          badgeText={tankLevel < 25 ? 'Low Reserve' : tankLevel < 50 ? 'Moderate' : 'Optimal Reserve'}
          badgeType={tankLevel < 25 ? 'red' : tankLevel < 50 ? 'amber' : 'green'}
          nowLabel="Now"
          nowValue={d.tankLevel ?? '-'}
          unit={d.tankLevel != null ? '%' : ''}
          secondaryLabel="In 30 min"
          secondaryValue={d.tankLevel != null ? `${Math.max(0, (tankLevel - 1.2)).toFixed(1)}%` : '-'}
          secondaryColor={tankLevel < 25 ? '#dc2626' : '#15803d'}
          footerLeft={tankLevel < 25 ? 'Refill pump required' : 'Sufficient head pressure'}
          footerRight="Safe range: > 25%"
        />

        <StatCard
          index={1}
          icon={<MdWaterDrop size={18} color="#3b82f6" />}
          label="Today's Total Consumption"
          badgeText={d.todaysUsage > 3000 ? 'High Usage' : 'Normal Quota'}
          badgeType={d.todaysUsage > 3000 ? 'amber' : 'green'}
          nowLabel="Now"
          nowValue={d.todaysUsage != null ? d.todaysUsage.toLocaleString('en-IN') : '-'}
          unit={d.todaysUsage != null ? 'L' : ''}
          secondaryLabel="Daily Quota"
          secondaryValue="5,000 L"
          secondaryColor="#15803d"
          footerLeft={d.todaysUsage != null ? (d.todaysUsage > 3000 ? 'Higher than baseline quota' : 'Normal campus consumption') : '-'}
          footerRight="Max quota: 5,000 L"
        />

        <StatCard
          index={2}
          icon={<MdSpeed size={18} color={isHighVelocity ? '#f59e0b' : '#10b981'} />}
          label="Current Flow Rate"
          badgeText={isHighVelocity ? 'High Velocity' : (effectiveFlow > 0 ? 'Steady Flow' : 'Nominal Flow')}
          badgeType={isHighVelocity ? 'amber' : 'green'}
          nowValue={effectiveFlow}
          footerLeft={isHighVelocity ? 'High velocity detected' : 'Steady hydraulic pressure'}
          footerRight="Line Limit: 35 L/m"
        >
          {/* Two Sub-Widgets: val1 and val2 showing individual flow rates in L/m */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '2px 0 8px' }}>
            {/* val1 Flow Rate Sub-Widget */}
            <div
              style={{
                background: val1Flow > 20 ? '#fffbeb' : '#f0fdf4',
                border: `1.5px solid ${val1Flow > 20 ? '#fcd34d' : '#86efac'}`,
                borderRadius: 12,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                boxShadow: val1Flow > 20 ? '0 1px 3px rgba(245, 158, 11, 0.08)' : '0 1px 3px rgba(16, 185, 129, 0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  val1
                </span>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: val1Flow > 20 ? '#f59e0b' : '#10b981',
                    boxShadow: val1Flow > 20 ? '0 0 6px rgba(245, 158, 11, 0.6)' : '0 0 6px rgba(16, 185, 129, 0.6)',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 850,
                  color: val1Flow > 20 ? '#b45309' : '#0f172a',
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                }}
              >
                {val1Flow}{' '}
                <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>L/m</span>
              </div>
              <div style={{ fontSize: 10.5, color: val1Flow > 20 ? '#b45309' : '#059669', fontWeight: 600 }}>
                {val1Flow > 20 ? 'High Velocity' : (val1Flow > 0 ? 'Active Flow' : 'Zero Flow • Idle')}
              </div>
            </div>

            {/* val2 Flow Rate Sub-Widget */}
            <div
              style={{
                background: val2Flow > 20 ? '#fffbeb' : '#f0fdf4',
                border: `1.5px solid ${val2Flow > 20 ? '#fcd34d' : '#86efac'}`,
                borderRadius: 12,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                boxShadow: val2Flow > 20 ? '0 1px 3px rgba(245, 158, 11, 0.08)' : '0 1px 3px rgba(16, 185, 129, 0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  val2
                </span>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: val2Flow > 20 ? '#f59e0b' : '#10b981',
                    boxShadow: val2Flow > 20 ? '0 0 6px rgba(245, 158, 11, 0.6)' : '0 0 6px rgba(16, 185, 129, 0.6)',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 850,
                  color: val2Flow > 20 ? '#b45309' : '#0f172a',
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                }}
              >
                {val2Flow}{' '}
                <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>L/m</span>
              </div>
              <div style={{ fontSize: 10.5, color: val2Flow > 20 ? '#b45309' : '#059669', fontWeight: 600 }}>
                {val2Flow > 20 ? 'High Velocity' : (val2Flow > 0 ? 'Active Flow' : 'Zero Flow • Idle')}
              </div>
            </div>
          </div>
        </StatCard>

        <StatCard
          index={3}
          icon={<MdWarningAmber size={18} color={anyLeak ? '#ef4444' : '#10b981'} />}
          label="Acoustic Leak Detection"
          badgeText={anyLeak ? (isVal1Leaking && isVal2Leaking ? '2 Leaks Detected' : (isVal1Leaking ? 'val1 Leaking' : 'val2 Leaking')) : 'All Intact'}
          badgeType={anyLeak ? 'red' : 'green'}
          footerLeft={anyLeak ? 'Acoustic pipe rupture detected!' : 'val1 & val2 integrity intact'}
          footerRight="Dual Acoustic Grid"
        >
          {/* Two Sub-Widgets: val1 and val2 showing individual status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '2px 0 8px' }}>
            {/* val1 Sub-Widget */}
            <div
              style={{
                background: isVal1Ok ? '#f0fdf4' : '#fef2f2',
                border: `1.5px solid ${isVal1Ok ? '#86efac' : '#fca5a5'}`,
                borderRadius: 12,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                boxShadow: isVal1Ok ? '0 1px 3px rgba(16, 185, 129, 0.08)' : '0 1px 3px rgba(239, 68, 68, 0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  val1
                </span>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: isVal1Ok ? '#10b981' : '#ef4444',
                    boxShadow: isVal1Ok ? '0 0 6px rgba(16, 185, 129, 0.6)' : '0 0 6px rgba(239, 68, 68, 0.6)',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 850,
                  color: isVal1Ok ? '#15803d' : '#dc2626',
                  letterSpacing: '-0.01em',
                }}
              >
                {val1StatusText}
              </div>
              <div style={{ fontSize: 10.5, color: isVal1Ok ? '#059669' : '#b91c1c', fontWeight: 600 }}>
                {isVal1Ok ? 'No Leak • Intact' : 'Acoustic Alert'}
              </div>
            </div>

            {/* val2 Sub-Widget */}
            <div
              style={{
                background: isVal2Ok ? '#f0fdf4' : '#fef2f2',
                border: `1.5px solid ${isVal2Ok ? '#86efac' : '#fca5a5'}`,
                borderRadius: 12,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                boxShadow: isVal2Ok ? '0 1px 3px rgba(16, 185, 129, 0.08)' : '0 1px 3px rgba(239, 68, 68, 0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  val2
                </span>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: isVal2Ok ? '#10b981' : '#ef4444',
                    boxShadow: isVal2Ok ? '0 0 6px rgba(16, 185, 129, 0.6)' : '0 0 6px rgba(239, 68, 68, 0.6)',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 850,
                  color: isVal2Ok ? '#15803d' : '#dc2626',
                  letterSpacing: '-0.01em',
                }}
              >
                {val2StatusText}
              </div>
              <div style={{ fontSize: 10.5, color: isVal2Ok ? '#059669' : '#b91c1c', fontWeight: 600 }}>
                {isVal2Ok ? 'No Leak • Intact' : 'Acoustic Alert'}
              </div>
            </div>
          </div>
        </StatCard>
      </div>

      {/* ════ Water Valve Actuator Controls (Valve 1 & Valve 2) ════ */}
      <div className="card valve-panel">
        <div className="valve-header-row">
          <div className="valve-header-title">
            <MdPowerSettingsNew size={22} color="var(--primary)" />
            <span>Water Actuator & Valve Management</span>
          </div>
        </div>

        <div className="valve-grid">
          {/* ── Valve 1 Card ── */}
          <div className={`valve-card ${valve1 ? 'valve-card--on' : 'valve-card--off'}`}>
            <div className="valve-card-top">
              <div className="valve-info">
                <div className="valve-icon-box">
                  <MdWater />
                </div>
                <div>
                  <div className="valve-name">Valve 1</div>
                  <div className="valve-sub">Main Supply Pipeline • Solenoid Valve #1</div>
                </div>
              </div>
              <div className={`valve-status-pill ${valve1 ? 'on' : 'off'}`}>
                {valve1 ? <MdCheckCircle size={14} /> : <MdCancel size={14} />}
                <span>{valve1 ? 'ON' : 'OFF'}</span>
              </div>
            </div>

            <div className="valve-actions-row">
              {/* Explicit ON / OFF Buttons */}
              <div className="valve-btn-group">
                <button
                  type="button"
                  className={`valve-btn ${valve1 ? 'active-on' : ''}`}
                  onClick={() => handleValve1(true)}
                  disabled={isUpdating1}
                  id="valve1-on-btn"
                >
                  <MdCheckCircle size={15} />
                  <span>ON</span>
                </button>
                <button
                  type="button"
                  className={`valve-btn ${!valve1 ? 'active-off' : ''}`}
                  onClick={() => handleValve1(false)}
                  disabled={isUpdating1}
                  id="valve1-off-btn"
                >
                  <MdCancel size={15} />
                  <span>OFF</span>
                </button>
              </div>

              {/* Master Slider Toggle */}
              <button
                type="button"
                className={`valve-toggle-switch ${valve1 ? 'on' : ''}`}
                onClick={() => handleValve1(!valve1)}
                disabled={isUpdating1}
                title={`Toggle Valve 1 ${valve1 ? 'OFF' : 'ON'}`}
                aria-label="Toggle Valve 1"
                id="valve1-toggle-switch"
              >
                <div className="valve-toggle-thumb" />
              </button>
            </div>
          </div>

          {/* ── Valve 2 Card ── */}
          <div className={`valve-card ${valve2 ? 'valve-card--on' : 'valve-card--off'}`}>
            <div className="valve-card-top">
              <div className="valve-info">
                <div className="valve-icon-box">
                  <MdWaterDrop />
                </div>
                <div>
                  <div className="valve-name">Valve 2</div>
                  <div className="valve-sub">Auxiliary Branch Pipeline • Solenoid Valve #2</div>
                </div>
              </div>
              <div className={`valve-status-pill ${valve2 ? 'on' : 'off'}`}>
                {valve2 ? <MdCheckCircle size={14} /> : <MdCancel size={14} />}
                <span>{valve2 ? 'ON' : 'OFF'}</span>
              </div>
            </div>

            <div className="valve-actions-row">
              {/* Explicit ON / OFF Buttons */}
              <div className="valve-btn-group">
                <button
                  type="button"
                  className={`valve-btn ${valve2 ? 'active-on' : ''}`}
                  onClick={() => handleValve2(true)}
                  disabled={isUpdating2}
                  id="valve2-on-btn"
                >
                  <MdCheckCircle size={15} />
                  <span>ON</span>
                </button>
                <button
                  type="button"
                  className={`valve-btn ${!valve2 ? 'active-off' : ''}`}
                  onClick={() => handleValve2(false)}
                  disabled={isUpdating2}
                  id="valve2-off-btn"
                >
                  <MdCancel size={15} />
                  <span>OFF</span>
                </button>
              </div>

              {/* Master Slider Toggle */}
              <button
                type="button"
                className={`valve-toggle-switch ${valve2 ? 'on' : ''}`}
                onClick={() => handleValve2(!valve2)}
                disabled={isUpdating2}
                title={`Toggle Valve 2 ${valve2 ? 'OFF' : 'ON'}`}
                aria-label="Toggle Valve 2"
                id="valve2-toggle-switch"
              >
                <div className="valve-toggle-thumb" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Visualizations */}
      <div className="two">
        <div className="card">
          <h3>
            <span>Water Consumption & Flow Rate Timeline</span>
            <span className="card-tag">Telemetry</span>
          </h3>
          <ChartBox id="waterTrendChart" type="line" labels={trendData.labels} datasets={trendData.datasets} />
        </div>

        <div className="card">
          <h3>
            <span>Reservoir Capacity Breakdown</span>
            <span className="card-tag">{d.tankLevel != null ? `${d.tankLevel}% Fill` : '-'}</span>
          </h3>
          <ChartBox id="waterTankDoughnut" type="doughnut" labels={tankData.labels} datasets={tankData.datasets} />
        </div>
      </div>

      {/* Asset Audit and AI Diagnostics */}
      <div className="card">
        <h3>Hydraulic Diagnostics & Conservation Directives</h3>
        <table>
          <thead>
            <tr>
              <th>Hydraulic Metric</th>
              <th>Sensor Reading</th>
              <th>Operational Status</th>
              <th>Safety Recommendation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Main Storage Tank</td>
              <td><b>{d.tankLevel != null ? `${d.tankLevel}%` : '-'}</b></td>
              <td>
                <span className={`badge ${d.tankLevel != null ? (tankLevel < 25 ? 'high' : tankLevel < 50 ? 'medium' : 'good') : ''}`}>
                  {d.tankLevel != null ? (tankLevel < 25 ? 'Critical Level' : tankLevel < 50 ? 'Medium' : 'Sufficient') : '-'}
                </span>
              </td>
              <td>{d.tankLevel != null ? (tankLevel < 30 ? 'Initiate raw water transfer pump' : 'Capacity healthy') : '-'}</td>
            </tr>
            <tr>
              <td>Line Flow Velocity</td>
              <td><b>{hasFlowData ? `${effectiveFlow} L/min` : '-'}</b></td>
              <td>
                <span className={`badge ${hasFlowData ? (isHighVelocity ? 'medium' : 'good') : ''}`}>
                  {hasFlowData ? (isHighVelocity ? 'Heavy Flow' : 'Standard') : '-'}
                </span>
              </td>
              <td>{hasFlowData ? (isHighVelocity ? 'Inspect washroom solenoid valves' : 'Flow rates balanced') : '-'}</td>
            </tr>
            <tr>
              <td>Pressure &amp; Leak Sensor</td>
              <td><b>{anyLeak ? `Leak Detected (${leakLineLabel})` : `Normal (val1: ${val1StatusText}, val2: ${val2StatusText})`}</b></td>
              <td>
                <span className={`badge ${anyLeak ? 'high' : 'good'}`}>
                  {anyLeak ? 'Alarm' : 'Nominal'}
                </span>
              </td>
              <td>{anyLeak ? `Isolate ${leakLineLabel} and inspect pipeline` : 'Zero pressure loss'}</td>
            </tr>
            <tr>
              <td>Solenoid Valve 1</td>
              <td>
                <b>{valve1 ? 'ON' : 'OFF'}</b>
              </td>
              <td>
                <span className={`badge ${valve1 ? 'good' : 'medium'}`}>
                  {valve1 ? 'Open / Flowing' : 'Closed / Isolated'}
                </span>
              </td>
              <td>{valve1 ? 'Main intake active • telemetry verified' : 'Main pipeline shut off by operator'}</td>
            </tr>
            <tr>
              <td>Solenoid Valve 2</td>
              <td>
                <b>{valve2 ? 'ON' : 'OFF'}</b>
              </td>
              <td>
                <span className={`badge ${valve2 ? 'good' : 'medium'}`}>
                  {valve2 ? 'Open / Flowing' : 'Closed / Isolated'}
                </span>
              </td>
              <td>{valve2 ? 'Branch intake active • telemetry verified' : 'Auxiliary pipeline shut off by operator'}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 16 }}>
          {anyLeak ? (
            <div className="recommendation recommendation--alert">
              <b>Emergency Water Alert:</b> Acoustic anomaly confirmed on {leakLineLabel}. Close corresponding solenoid valve to prevent water loss.
            </div>
          ) : d.tankLevel != null ? (
            <div className="recommendation">
              <b>Hydraulic System Healthy:</b> Tank holding {d.tankLevel}% with delivery flow of {hasFlowData ? effectiveFlow : '-'} L/min. Valve 1 is {valve1 ? 'ON' : 'OFF'} and Valve 2 is {valve2 ? 'ON' : 'OFF'}.
            </div>
          ) : (
            <div className="small" style={{ color: 'var(--muted)' }}>-</div>
          )}
        </div>
      </div>
    </>
  );
}
