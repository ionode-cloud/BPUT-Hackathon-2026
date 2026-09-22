import { MdBuild, MdPrecisionManufacturing, MdTrendingUp, MdCheckCircle } from 'react-icons/md';
import ChartBox from '../components/ChartBox';
import { getAssetStatusData, getAssetUtilizationData } from '../utils/chartHelpers';

export default function Assets({ data, history = [] }) {
  const d = data || {};
  const statusData = getAssetStatusData(d);
  const utilData = getAssetUtilizationData(d, history);

  const utilPct = d.utilization ?? 0;
  const maintenancePending = (d.maintenanceDue ?? 0) > 0;

  return (
    <>
      {/* Assets KPIs */}
      <div className="grid">
        <div className="card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdPrecisionManufacturing size={20} color="#3b82f6" />
            <span>Monitored Machinery</span>
          </div>
          <div className="kpi-value">{d.totalEquipment ?? '-'}</div>
          <div className="kpi-foot">{d.totalEquipment != null ? 'Connected IoT asset telemetry' : '-'}</div>
        </div>

        <div className="card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdCheckCircle size={20} color="#10b981" />
            <span>Active Operating Units</span>
          </div>
          <div className="kpi-value">{d.activeEquipment ?? '-'}</div>
          <div className="kpi-foot">
            {d.totalEquipment != null && d.activeEquipment != null
              ? `${d.totalEquipment - d.activeEquipment} standby / idle units`
              : '-'}
          </div>
        </div>

        <div className="card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdTrendingUp size={20} color="#6366f1" />
            <span>Facility Utilization Index</span>
          </div>
          <div className="kpi-value">
            {d.utilization ?? '-'}
            {d.utilization != null && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>%</span>}
          </div>
          <div className="progress">
            <i
              style={{
                width: `${utilPct}%`,
                background: utilPct > 90 ? 'var(--orange)' : 'var(--primary)',
              }}
            />
          </div>
        </div>

        <div className="card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdBuild size={20} color={maintenancePending ? '#f59e0b' : '#10b981'} />
            <span>Preventive Maintenance Due</span>
          </div>
          <div
            className="kpi-value"
            style={{ color: maintenancePending ? 'var(--orange)' : d.maintenanceDue != null ? 'var(--green)' : 'var(--text)' }}
          >
            {d.maintenanceDue != null ? `${d.maintenanceDue} units` : '-'}
          </div>
          <div className="kpi-foot" style={{ color: maintenancePending ? 'var(--orange)' : 'var(--green)' }}>
            {d.maintenanceDue != null
              ? (maintenancePending ? 'Service ticket recommended' : 'All equipment certified')
              : '-'}
          </div>
        </div>
      </div>

      {/* Dynamic Graphs */}
      <div className="two">
        <div className="card">
          <h3>
            <span>Machinery Utilization Profile</span>
            <span className="card-tag">Real-Time Load</span>
          </h3>
          <ChartBox id="assetUtilizationChart" type="bar" labels={utilData.labels} datasets={utilData.datasets} />
        </div>

        <div className="card">
          <h3>
            <span>Equipment Status Distribution</span>
            <span className="card-tag">{d.totalEquipment != null ? `${d.totalEquipment} Total Units` : '-'}</span>
          </h3>
          <ChartBox id="assetStatusDoughnut" type="doughnut" labels={statusData.labels} datasets={statusData.datasets} />
        </div>
      </div>

      {/* Asset Audit Table */}
      <div className="card">
        <h3>Asset Health & Predictive Maintenance Schedule</h3>
        <table>
          <thead>
            <tr>
              <th>Equipment Category</th>
              <th>Deployed</th>
              <th>Operating Status</th>
              <th>Maintenance State</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Active Operating Machinery</td>
              <td><b>{d.activeEquipment != null ? `${d.activeEquipment} units` : '-'}</b></td>
              <td><span className={`badge ${d.activeEquipment != null ? 'good' : ''}`}>{d.activeEquipment != null ? 'Active' : '-'}</span></td>
              <td>{d.utilization != null ? `Running at ${d.utilization}% facility utilization` : '-'}</td>
            </tr>
            <tr>
              <td>Idle / Standby Units</td>
              <td>
                <b>
                  {d.totalEquipment != null && d.activeEquipment != null
                    ? `${Math.max(0, d.totalEquipment - d.activeEquipment - (d.maintenanceDue || 0))} units`
                    : '-'}
                </b>
              </td>
              <td><span className={`badge ${d.totalEquipment != null ? 'good' : ''}`}>{d.totalEquipment != null ? 'Standby' : '-'}</span></td>
              <td>Ready for dynamic load shedding</td>
            </tr>
            <tr>
              <td>Preventive Maintenance Due</td>
              <td><b>{d.maintenanceDue != null ? `${d.maintenanceDue} units` : '-'}</b></td>
              <td>
                <span className={`badge ${d.maintenanceDue != null ? (maintenancePending ? 'high' : 'good') : ''}`}>
                  {d.maintenanceDue != null ? (maintenancePending ? 'Due' : 'Certified') : '-'}
                </span>
              </td>
              <td>
                {d.maintenanceDue != null
                  ? (maintenancePending ? `${d.maintenanceDue} unit(s) flagged for service` : 'All certified')
                  : '-'}
              </td>
            </tr>
            <tr>
              <td>Total Monitored Fleet</td>
              <td><b>{d.totalEquipment != null ? `${d.totalEquipment} units` : '-'}</b></td>
              <td><span className={`badge ${d.totalEquipment != null ? 'good' : ''}`}>{d.totalEquipment != null ? 'Online' : '-'}</span></td>
              <td>Real-time IoT gateway connected</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 16 }}>
          {maintenancePending ? (
            <div className="recommendation recommendation--warn">
              <b>Maintenance Directive:</b> {d.maintenanceDue} equipment unit(s) exceeded scheduled operational cycles. Technician dispatch queued.
            </div>
          ) : d.utilization != null ? (
            <div className="recommendation">
              <b>High Asset Reliability:</b> Facility utilization is balanced at {d.utilization}%. Zero critical maintenance bottlenecks.
            </div>
          ) : (
            <div className="small" style={{ color: 'var(--muted)' }}>-</div>
          )}
        </div>
      </div>
    </>
  );
}
