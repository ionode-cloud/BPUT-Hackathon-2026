import { useState, useTransition } from 'react';
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
import { getWaterTrendData, getTankStorageData } from '../utils/chartHelpers';
import ExcelDownloadBtn from '../components/ExcelDownloadBtn';

export default function Water({ data, history = [], onUpdate }) {
  const d = data || {};
  const trendData = getWaterTrendData(d, history);
  const tankData = getTankStorageData(d);

  const tankLevel = d.tankLevel ?? 0;
  const isLeaking = d.leakStatus && d.leakStatus !== 'Normal';

  // Read current valve state directly from API telemetry
  const apiValve1 = Boolean(d.valve1 ?? false);
  const apiValve2 = Boolean(d.valve2 ?? false);

  // Local optimistic state for instant UI response
  const [localValve1, setLocalValve1] = useState(null);
  const [localValve2, setLocalValve2] = useState(null);
  const [isUpdating1, setIsUpdating1] = useState(false);
  const [isUpdating2, setIsUpdating2] = useState(false);
  const [, startTransition] = useTransition();

  const valve1 = localValve1 !== null ? localValve1 : apiValve1;
  const valve2 = localValve2 !== null ? localValve2 : apiValve2;

  // Toggle or set Valve 1 state
  const handleValve1 = async (targetState) => {
    const nextVal = typeof targetState === 'boolean' ? targetState : !valve1;
    setLocalValve1(nextVal);
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
      // Revert on failure
      setLocalValve1(apiValve1);
    } finally {
      setIsUpdating1(false);
      startTransition(() => {
        setLocalValve1(null);
      });
    }
  };

  // Toggle or set Valve 2 state
  const handleValve2 = async (targetState) => {
    const nextVal = typeof targetState === 'boolean' ? targetState : !valve2;
    setLocalValve2(nextVal);
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
      // Revert on failure
      setLocalValve2(apiValve2);
    } finally {
      setIsUpdating2(false);
      startTransition(() => {
        setLocalValve2(null);
      });
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
        <div className="card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MdWater size={20} color="#0284c7" />
            <span>Main Tank Reserve</span>
          </div>
          <div className="kpi-value">
            {d.tankLevel ?? '-'}
            {d.tankLevel != null && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>%</span>}
          </div>
          <div className="progress">
            <i
              style={{
                width: `${tankLevel}%`,
                background: tankLevel < 25 ? 'var(--red)' : tankLevel < 50 ? 'var(--orange)' : '#0284c7',
              }}
            />
          </div>
        </div>

        <div className="card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MdWaterDrop size={20} color="#3b82f6" />
            <span>Today's Total Consumption</span>
          </div>
          <div className="kpi-value">
            {d.todaysUsage != null ? d.todaysUsage.toLocaleString('en-IN') : '-'}
            {d.todaysUsage != null && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>L</span>}
          </div>
          <div className={`kpi-foot ${d.todaysUsage > 3000 ? 'warn' : ''}`}>
            {d.todaysUsage != null
              ? (d.todaysUsage > 3000 ? 'Higher than baseline quota' : 'Normal campus consumption')
              : '-'}
          </div>
        </div>

        <div className="card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MdSpeed size={20} color="#10b981" />
            <span>Current Flow Rate</span>
          </div>
          <div className="kpi-value">
            {d.flowRate ?? '-'}
            {d.flowRate != null && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>L/min</span>}
          </div>
          <div className={`kpi-foot ${d.flowRate > 20 ? 'warn' : ''}`}>
            {d.flowRate != null
              ? (d.flowRate > 20 ? 'High velocity detected' : 'Steady hydraulic pressure')
              : '-'}
          </div>
        </div>

        <div className="card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MdWarningAmber size={20} color={isLeaking ? '#ef4444' : '#10b981'} />
            <span>Acoustic Leak Detection</span>
          </div>
          <div
            className="kpi-value"
            style={{ color: isLeaking ? 'var(--red)' : d.leakStatus ? 'var(--green)' : 'var(--text)', fontSize: 26 }}
          >
            {d.leakStatus ?? '-'}
          </div>
          <div className="kpi-foot" style={{ color: isLeaking ? 'var(--red)' : 'var(--green)' }}>
            {d.leakStatus != null
              ? (isLeaking ? 'Pressure drop detected!' : 'All pipes integrity intact')
              : '-'}
          </div>
        </div>
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
              <td><b>{d.flowRate != null ? `${d.flowRate} L/min` : '-'}</b></td>
              <td>
                <span className={`badge ${d.flowRate != null ? (d.flowRate > 20 ? 'medium' : 'good') : ''}`}>
                  {d.flowRate != null ? (d.flowRate > 20 ? 'Heavy Flow' : 'Standard') : '-'}
                </span>
              </td>
              <td>{d.flowRate != null ? (d.flowRate > 20 ? 'Inspect washroom solenoid valves' : 'Flow rates balanced') : '-'}</td>
            </tr>
            <tr>
              <td>Pressure & Leak Sensor</td>
              <td><b>{d.leakStatus ?? '-'}</b></td>
              <td>
                <span className={`badge ${d.leakStatus != null ? (isLeaking ? 'high' : 'good') : ''}`}>
                  {d.leakStatus != null ? (isLeaking ? 'Alarm' : 'Nominal') : '-'}
                </span>
              </td>
              <td>{d.leakStatus != null ? (isLeaking ? 'Dispatch plumber to block valve #4' : 'Zero pressure loss') : '-'}</td>
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
          {isLeaking ? (
            <div className="recommendation recommendation--alert">
              <b>Emergency Water Alert:</b> Acoustic anomaly confirmed ({d.leakStatus}). Automatic shutoff valve armed for branch pipeline B.
            </div>
          ) : d.tankLevel != null ? (
            <div className="recommendation">
              <b>Hydraulic System Healthy:</b> Tank holding {d.tankLevel}% with average delivery flow of {d.flowRate ?? '-'} L/min. Valve 1 is {valve1 ? 'ON' : 'OFF'} and Valve 2 is {valve2 ? 'ON' : 'OFF'}.
            </div>
          ) : (
            <div className="small" style={{ color: 'var(--muted)' }}>-</div>
          )}
        </div>
      </div>
    </>
  );
}
