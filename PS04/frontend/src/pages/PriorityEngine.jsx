import { useState, useMemo } from 'react';
import {
  MdTune,
  MdWaterDrop,
  MdAir,
  MdElectricBolt,
  MdDelete,
  MdCheckCircle,
  MdPlayArrow,
  MdRefresh,
  MdCrisisAlert,
  MdSpeed,
  MdShield,
  MdTimer,
} from 'react-icons/md';
import ChartBox from '../components/ChartBox';
import ExcelDownloadBtn from '../components/ExcelDownloadBtn';

export default function PriorityEngine({ data = {}, history = [], onUpdate }) {
  const d = data || {};

  // Interactive Priority Weight Tuning (summing to 100%)
  const [weights, setWeights] = useState({
    water: 35,
    air: 30,
    energy: 20,
    waste: 15,
  });

  // Action status state for interactive operator triggers
  const [actionStatuses, setActionStatuses] = useState({
    act_water: null, // null | 'triggering' | 'executed'
    act_gas: null,
    act_energy: null,
    act_waste: null,
    act_misting: null,
  });

  const handleWeightChange = (key, val) => {
    setWeights(prev => ({
      ...prev,
      [key]: Number(val),
    }));
  };

  const resetWeights = () => {
    setWeights({
      water: 35,
      air: 30,
      energy: 20,
      waste: 15,
    });
  };

  // Derive dynamic prioritized incidents based on real sensor data and user weights
  const queue = useMemo(() => {
    const items = [];

    // 1. Water System Priority
    const isLeak = d.leakStatus === 'Leak Detected' || d.leakStatus === 'LEAK_DETECTED';
    const isValveOpen = Boolean(d.valve1);
    const waterScore = Math.min(100, Math.round((isLeak ? 70 : 20) + (isValveOpen ? 15 : 0) + (weights.water * 0.4)));

    items.push({
      id: 'act_water',
      rank: 1,
      domain: 'Water Management',
      icon: <MdWaterDrop size={20} color="#0284c7" />,
      domainColor: '#0284c7',
      title: isLeak ? 'Acoustic Pipe Leak & Pressure Anomaly' : 'Hydraulic Flow & Tank Inflow',
      location: 'Science Quad Annex • Zone 3',
      actuator: 'Primary Solenoid Valve 1',
      severity: isLeak ? 'CRITICAL' : 'OPTIMIZATION',
      score: waterScore,
      slaMinutes: isLeak ? 2 : 60,
      currentAction: isLeak && isValveOpen ? 'Shutoff Valve 1' : isValveOpen ? 'Monitor Flow' : 'Keep Isolated',
      canActuateValve: true,
      description: isLeak
        ? 'Ultrasonic acoustic anomaly detected on main distribution loop. Immediate solenoid shutoff recommended to avert flooding.'
        : 'Reservoir operating within calibrated parameters. Solenoid maintains steady flow.',
    });

    // 2. Air / Chemical Gas Hazard Priority
    const highNh3 = (d.nh3 ?? 8) > 20;
    const highPm25 = (d.pm25 ?? 18) > 35;
    const airScore = Math.min(100, Math.round((highNh3 ? 60 : 15) + (highPm25 ? 20 : 10) + (weights.air * 0.4)));

    items.push({
      id: 'act_gas',
      rank: 2,
      domain: 'Air Quality',
      icon: <MdAir size={20} color="#10b981" />,
      domainColor: '#10b981',
      title: highNh3 ? 'Ammonia (NH3) Vapor Spike in Science Wing' : 'Indoor Chemical & Particulate Balance',
      location: 'Chemistry Lab B • Building 4',
      actuator: 'HVAC Fume Extraction Scrubber #2',
      severity: highNh3 ? 'HIGH' : highPm25 ? 'MEDIUM' : 'NORMAL',
      score: airScore,
      slaMinutes: highNh3 ? 5 : 30,
      currentAction: highNh3 ? 'Activate Emergency Scrubbers' : 'Routine Air Exchange',
      canActuateValve: false,
      description: highNh3
        ? `Toxic NH3 vapor measured at ${d.nh3} ppm (Threshold: 25 ppm). Forced evacuation ventilation protocol staged.`
        : `Atmospheric AQI is ${d.aqi ?? 42} with PM2.5 at ${d.pm25 ?? 18} µg/m³. Optimal atmospheric equilibrium.`,
    });

    // 3. Electrical Grid Overload Priority
    const highPower = (d.livePower ?? 18.4) > 25;
    const highEnergy = (d.todaysEnergy ?? 142) > 180;
    const energyScore = Math.min(100, Math.round((highPower ? 55 : 20) + (highEnergy ? 20 : 5) + (weights.energy * 0.4)));

    items.push({
      id: 'act_energy',
      rank: 3,
      domain: 'Energy Grid',
      icon: <MdElectricBolt size={20} color="#f59e0b" />,
      domainColor: '#f59e0b',
      title: highPower ? 'Substation Peak Demand Load-Shedding' : 'Tariff Curtailment & Power Factor Balancing',
      location: 'Main Substation Bus B • Campus Feeder #1',
      actuator: 'Chiller Compressors 2 & 3',
      severity: highPower ? 'HIGH' : 'MEDIUM',
      score: energyScore,
      slaMinutes: 15,
      currentAction: highPower ? 'Shed Non-Essential Chillers' : 'Optimize Power Factor',
      canActuateValve: false,
      description: highPower
        ? `Instantaneous load is ${d.livePower} kW approaching contract ceiling. Dynamic tariff curtailment advised.`
        : `Live draw stable at ${d.livePower ?? 18.4} kW. Power factor is ${d.powerFactor ?? 0.96}.`,
    });

    // 4. Waste Overflow Logistics Priority
    const atRisk = (d.overflowRisk ?? 0) > 0;
    const wasteScore = Math.min(100, Math.round((atRisk ? 50 : 15) + (weights.waste * 0.4)));

    items.push({
      id: 'act_waste',
      rank: 4,
      domain: 'Waste Logistics',
      icon: <MdDelete size={20} color="#9333ea" />,
      domainColor: '#9333ea',
      title: atRisk ? 'Cafeteria & Library Bin Overflow Threat' : 'Campus Sanitation Route Optimization',
      location: 'Student Dining Commons & Hostels',
      actuator: 'Autonomous Electric Cart Route #2',
      severity: atRisk ? 'MEDIUM' : 'LOW',
      score: wasteScore,
      slaMinutes: 30,
      currentAction: atRisk ? 'Dispatch Evacuation Cart' : 'Standby Sanitation',
      canActuateValve: false,
      description: atRisk
        ? `${d.overflowRisk} bin unit(s) exceed 80% capacity. Predicted overflow in ~${d.overflowPrediction ?? 4.2} hours.`
        : `Average bin fill is ${d.averageFill ?? 54}%. All smart sonar bins operating within capacity.`,
    });

    // Sort descending by calculated score
    return items.sort((a, b) => b.score - a.score).map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [d, weights]);

  // Handle interactive action trigger
  const handleTriggerAction = (item) => {
    setActionStatuses(prev => ({ ...prev, [item.id]: 'triggering' }));

    setTimeout(() => {
      setActionStatuses(prev => ({ ...prev, [item.id]: 'executed' }));

      // If it's the water valve item, physically toggle the valve via onUpdate!
      if (item.canActuateValve && onUpdate) {
        onUpdate({ valve1: false, leakStatus: 'Leak Isolated' });
      }
    }, 700);
  };

  // Priority Radar Chart Data
  const priorityChartData = {
    labels: queue.map(q => q.domain),
    datasets: [
      {
        label: 'Calculated Priority Score (0-100)',
        data: queue.map(q => q.score),
        backgroundColor: 'rgba(99, 102, 241, 0.25)',
        borderColor: '#6366f1',
        borderWidth: 2.5,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#ffffff',
        pointRadius: 5,
      },
    ],
  };

  return (
    <div className="priority-engine-page">
      {/* Top Action & Export Banner */}
      <div className="tab-control-banner">
        <div className="banner-left-info">
          <div className="engine-status-pill">
            <span className="pulse-dot-small" />
            <span>Autonomous Priority Engine • Closed-Loop Level 3</span>
          </div>
          <p className="banner-subtext">
            Multi-factor telemetry ranking dynamically prioritizing facility directives by risk score, SLA urgency, and actuator impact.
          </p>
        </div>

        <div className="banner-right-actions">
          <ExcelDownloadBtn
            tabName="priority"
            tabLabel="Priority Engine"
            data={d}
            history={history}
            extraData={{ weights, queue }}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid">
        <div className="card">
          <div className="kpi-label">Highest Priority Incident</div>
          <div className="kpi-value" style={{ color: queue[0]?.severity === 'CRITICAL' ? '#ef4444' : '#2563eb' }}>
            {queue[0]?.score ?? 96}
            <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>/100</span>
          </div>
          <div className="kpi-foot">
            <b>{queue[0]?.domain}:</b> {queue[0]?.title}
          </div>
        </div>

        <div className="card">
          <div className="kpi-label">Active Directives in Queue</div>
          <div className="kpi-value">{queue.length}</div>
          <div className="kpi-foot" style={{ color: 'var(--green)' }}>
            ✓ 100% Monitored by Edge Rule Engine
          </div>
        </div>

        <div className="card">
          <div className="kpi-label">Mean Time to Mitigation (MTTM)</div>
          <div className="kpi-value">
            1.8 <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>mins</span>
          </div>
          <div className="kpi-foot">
            Autonomous Cyber-Physical Actuation
          </div>
        </div>

        <div className="card">
          <div className="kpi-label">Decision SLA Compliance</div>
          <div className="kpi-value">99.4%</div>
          <div className="kpi-foot" style={{ color: 'var(--green)' }}>
            ★ Zero Overdue Directives
          </div>
        </div>
      </div>

      {/* Dynamic Weight Tuning & Priority Radar */}
      <div className="two" style={{ marginTop: 20 }}>
        {/* Weight Sliders */}
        <div className="card">
          <h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdTune size={20} color="#6366f1" />
              <span>Multi-Factor Priority Weight Calibration</span>
            </div>
            <button
              type="button"
              className="btn-action btn-action--sm"
              onClick={resetWeights}
              title="Reset weights to default calibration"
            >
              <MdRefresh size={14} />
              <span>Reset</span>
            </button>
          </h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px' }}>
            Adjust operational domain weighting to tune real-time triage scoring across campus facilities.
          </p>

          <div className="weight-sliders-stack">
            <div className="slider-group">
              <div className="slider-header">
                <span><MdWaterDrop color="#0284c7" /> Water Damage & Leak Weight</span>
                <b>{weights.water}%</b>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                value={weights.water}
                onChange={e => handleWeightChange('water', e.target.value)}
              />
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <span><MdAir color="#10b981" /> Toxic Gas & Chemical Hazard Weight</span>
                <b>{weights.air}%</b>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                value={weights.air}
                onChange={e => handleWeightChange('air', e.target.value)}
              />
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <span><MdElectricBolt color="#f59e0b" /> Power Overload & Fire Hazard Weight</span>
                <b>{weights.energy}%</b>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                value={weights.energy}
                onChange={e => handleWeightChange('energy', e.target.value)}
              />
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <span><MdDelete color="#9333ea" /> Sanitation Overflow & SLA Weight</span>
                <b>{weights.waste}%</b>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                value={weights.waste}
                onChange={e => handleWeightChange('waste', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Priority Radar */}
        <div className="card">
          <h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MdSpeed size={20} color="#6366f1" />
              <span>Real-Time Domain Risk Profile</span>
            </div>
            <span className="card-tag">Dynamic Radar</span>
          </h3>
          <ChartBox
            id="priorityRadarChart"
            type="radar"
            labels={priorityChartData.labels}
            datasets={priorityChartData.datasets}
          />
        </div>
      </div>

      {/* Live Prioritized Action Queue */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdCrisisAlert size={20} color="#ef4444" />
            <span>Live Prioritized Action Queue & Actuator Directives</span>
          </div>
          <span className="card-tag">Automated Dispatch</span>
        </h3>

        <div className="priority-queue-table-wrap">
          <table className="priority-queue-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Rank</th>
                <th>Subsystem Domain</th>
                <th>Detected Incident & Location</th>
                <th>Urgency</th>
                <th>Priority Score</th>
                <th>SLA Target</th>
                <th>Target Actuator</th>
                <th style={{ textAlign: 'right' }}>Operator Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.map(item => {
                const status = actionStatuses[item.id];
                const isExecuted = status === 'executed';
                const isTriggering = status === 'triggering';

                return (
                  <tr key={item.id} className={isExecuted ? 'row-executed' : ''}>
                    <td>
                      <span className="rank-badge">#{item.rank}</span>
                    </td>
                    <td>
                      <div className="domain-cell">
                        <span className="domain-icon-box" style={{ color: item.domainColor }}>
                          {item.icon}
                        </span>
                        <span className="domain-name">{item.domain}</span>
                      </div>
                    </td>
                    <td>
                      <div className="incident-title">{item.title}</div>
                      <div className="incident-meta">{item.location}</div>
                      <div className="incident-desc">{item.description}</div>
                    </td>
                    <td>
                      <span className={`urgency-pill urgency-${item.severity.toLowerCase()}`}>
                        {item.severity}
                      </span>
                    </td>
                    <td>
                      <div className="score-meter-wrap">
                        <span className="score-number">{item.score}</span>
                        <div className="score-meter-bar">
                          <div
                            className="score-meter-fill"
                            style={{
                              width: `${item.score}%`,
                              background: item.score >= 80 ? '#ef4444' : item.score >= 60 ? '#f59e0b' : '#3b82f6',
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="sla-pill">
                        <MdTimer size={14} />
                        <span>{item.slaMinutes} mins</span>
                      </div>
                    </td>
                    <td>
                      <code className="actuator-tag">{item.actuator}</code>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className={`queue-action-btn ${isExecuted ? 'btn-executed' : ''}`}
                        onClick={() => handleTriggerAction(item)}
                        disabled={isTriggering || isExecuted}
                        title={`Execute action: ${item.currentAction}`}
                      >
                        {isExecuted ? (
                          <>
                            <MdCheckCircle size={15} color="#10b981" />
                            <span>Executed</span>
                          </>
                        ) : isTriggering ? (
                          <span>Actuating…</span>
                        ) : (
                          <>
                            <MdPlayArrow size={15} />
                            <span>{item.currentAction}</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
