import { MdShield, MdError, MdTimer, MdHealthAndSafety } from 'react-icons/md';
import ChartBox from '../components/ChartBox';
import { getSafetyTrendData, getIncidentDistribution } from '../utils/chartHelpers';

export default function Safety({ data, history = [] }) {
  const d = data || {};
  const trendData = getSafetyTrendData(d, history);
  const incidentData = getIncidentDistribution(d);

  const safetyScore = d.safetyScore ?? 0;
  const hasOpenIncidents = (d.openIncidents ?? 0) > 0;
  const slowResponse = (d.avgResponse ?? 0) > 10;

  return (
    <>
      {/* Safety KPIs */}
      <div className="grid">
        <div className="card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdShield size={20} color="#10b981" />
            <span>Campus Safety Score</span>
          </div>
          <div className="kpi-value">
            {d.safetyScore ?? '-'}
            {d.safetyScore != null && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>/100</span>}
          </div>
          <div className="progress">
            <i
              style={{
                width: `${safetyScore}%`,
                background: safetyScore < 50 ? 'var(--red)' : safetyScore < 75 ? 'var(--orange)' : 'var(--green)',
              }}
            />
          </div>
        </div>

        <div className="card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdHealthAndSafety size={20} color="#3b82f6" />
            <span>Incidents Logged Today</span>
          </div>
          <div className="kpi-value">{d.incidentsToday ?? '-'}</div>
          <div className="kpi-foot">{d.incidentsToday != null ? 'Safety dispatch & surveillance' : '-'}</div>
        </div>

        <div className="card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdError size={20} color={hasOpenIncidents ? '#ef4444' : '#10b981'} />
            <span>Active Open Incidents</span>
          </div>
          <div
            className="kpi-value"
            style={{ color: hasOpenIncidents ? 'var(--red)' : d.openIncidents != null ? 'var(--green)' : 'var(--text)' }}
          >
            {d.openIncidents ?? '-'}
          </div>
          <div className="kpi-foot" style={{ color: hasOpenIncidents ? 'var(--red)' : 'var(--green)' }}>
            {d.openIncidents != null
              ? (hasOpenIncidents ? 'Rapid response deployed' : 'Zero active emergencies')
              : '-'}
          </div>
        </div>

        <div className="card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdTimer size={20} color="#f59e0b" />
            <span>Average Response Speed</span>
          </div>
          <div className="kpi-value">
            {d.avgResponse ?? '-'}
            {d.avgResponse != null && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}> min</span>}
          </div>
          <div className={`kpi-foot ${slowResponse ? 'bad' : d.avgResponse != null ? 'good' : ''}`}>
            {d.avgResponse != null
              ? (slowResponse ? 'Exceeding target 8 min SLA' : 'Rapid emergency dispatch')
              : '-'}
          </div>
        </div>
      </div>

      {/* Dynamic Visualizations */}
      <div className="two">
        <div className="card">
          <h3>
            <span>Safety Index & Incident History</span>
            <span className="card-tag">Chronological Log</span>
          </h3>
          <ChartBox id="safetyTrendChart" type="line" labels={trendData.labels} datasets={trendData.datasets} />
        </div>

        <div className="card">
          <h3>
            <span>Incident Status Breakdown</span>
            <span className="card-tag">{d.incidentsToday != null ? `${d.incidentsToday} Total Logged` : '-'}</span>
          </h3>
          <ChartBox id="incidentDoughnut" type="doughnut" labels={incidentData.labels} datasets={incidentData.datasets} />
        </div>
      </div>

      {/* Safety Audit */}
      <div className="card">
        <h3>Emergency Operations Center Audit</h3>
        <table>
          <thead>
            <tr>
              <th>Safety Protocol</th>
              <th>Current Metric</th>
              <th>Status</th>
              <th>Response Protocol</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Campus Fire & Smoke Alarms</td>
              <td>Smoke: <b>{d.smoke != null ? `${d.smoke} ppm` : '-'}</b></td>
              <td>
                <span className={`badge ${d.smoke != null ? ((d.smoke ?? 0) > 50 ? 'high' : 'good') : ''}`}>
                  {d.smoke != null ? ((d.smoke ?? 0) > 50 ? 'Alert' : 'Normal') : '-'}
                </span>
              </td>
              <td>{d.smoke != null ? 'Sensors armed in all 4 sectors' : '-'}</td>
            </tr>
            <tr>
              <td>Chemical & Toxic Vapor (NH3 / VOC)</td>
              <td>
                NH3: <b>{d.nh3 != null ? `${d.nh3} ppm` : '-'}</b> • VOC: <b>{d.voc != null ? `${d.voc} ppm` : '-'}</b>
              </td>
              <td>
                <span className={`badge ${(d.nh3 != null && d.nh3 > 25) || (d.voc != null && d.voc > 1.0) ? 'high' : (d.nh3 != null && d.nh3 > 15) || (d.voc != null && d.voc > 0.5) ? 'medium' : d.nh3 != null || d.voc != null ? 'good' : ''}`}>
                  {(d.nh3 != null && d.nh3 > 25) || (d.voc != null && d.voc > 1.0)
                    ? 'Hazard Alert'
                    : (d.nh3 != null && d.nh3 > 15) || (d.voc != null && d.voc > 0.5)
                    ? 'Elevated'
                    : d.nh3 != null || d.voc != null
                    ? 'Safe'
                    : '-'}
                </span>
              </td>
              <td>
                {(d.nh3 != null && d.nh3 > 25) || (d.voc != null && d.voc > 1.0)
                  ? 'Activate scrubber & lab isolation'
                  : 'Multi-gas detectors operational'}
              </td>
            </tr>
            <tr>
              <td>Security Escalations</td>
              <td><b>{d.openIncidents != null ? `${d.openIncidents} unresolved` : '-'}</b></td>
              <td>
                <span className={`badge ${d.openIncidents != null ? (hasOpenIncidents ? 'high' : 'good') : ''}`}>
                  {d.openIncidents != null ? (hasOpenIncidents ? 'Active Dispatch' : 'Clear') : '-'}
                </span>
              </td>
              <td>{d.openIncidents != null ? (hasOpenIncidents ? 'Patrol team en route' : 'Routine surveillance') : '-'}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 16 }}>
          {hasOpenIncidents ? (
            <div className="recommendation recommendation--alert">
              <b>Urgent Security Escalation:</b> {d.openIncidents} open event(s) logged. Safety score lowered to {d.safetyScore}/100 until resolution.
            </div>
          ) : d.safetyScore != null ? (
            <div className="recommendation">
              <b>High Safety Standing:</b> Safety score at {d.safetyScore}/100 with avg emergency response of {d.avgResponse ?? '-'} minutes.
            </div>
          ) : (
            <div className="small" style={{ color: 'var(--muted)' }}>-</div>
          )}
        </div>
      </div>
    </>
  );
}
