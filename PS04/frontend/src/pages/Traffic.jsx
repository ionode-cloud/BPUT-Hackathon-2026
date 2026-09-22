import { MdDirectionsCar, MdLocalParking, MdAccessTime, MdTraffic } from 'react-icons/md';
import ChartBox from '../components/ChartBox';
import { getTrafficFlowData, getParkingDistribution } from '../utils/chartHelpers';

export default function Traffic({ data, history = [] }) {
  const d = data || {};
  const flowData = getTrafficFlowData(d, history);
  const parkingData = getParkingDistribution(d);

  const occupancyPct = d.parkingOccupancy ?? 0;
  const isCongested = (d.avgWaitingTime ?? 0) > 8;

  return (
    <>
      {/* Traffic & Parking KPIs */}
      <div className="grid">
        <div className="card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdLocalParking size={20} color="#6366f1" />
            <span>Parking Bay Occupancy</span>
          </div>
          <div className="kpi-value">
            {d.parkingOccupancy ?? '-'}
            {d.parkingOccupancy != null && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>%</span>}
          </div>
          <div className="progress">
            <i
              style={{
                width: `${occupancyPct}%`,
                background: occupancyPct > 85 ? 'var(--red)' : occupancyPct > 65 ? 'var(--orange)' : 'var(--primary)',
              }}
            />
          </div>
        </div>

        <div className="card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdDirectionsCar size={20} color="#3b82f6" />
            <span>Occupied / Total Slots</span>
          </div>
          <div className="kpi-value">
            {d.occupiedSlots ?? '-'}
            <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>
              /{d.totalSlots ?? '-'}
            </span>
          </div>
          <div className="kpi-foot">
            {d.totalSlots != null && d.occupiedSlots != null ? `${d.totalSlots - d.occupiedSlots} bays available` : '-'}
          </div>
        </div>

        <div className="card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdTraffic size={20} color="#10b981" />
            <span>Vehicles Logged Today</span>
          </div>
          <div className="kpi-value">
            {d.vehiclesToday != null ? d.vehiclesToday.toLocaleString('en-IN') : '-'}
          </div>
          <div className="kpi-foot">{d.vehiclesToday != null ? 'ANPR entry & exit gates' : '-'}</div>
        </div>

        <div className="card">
          <div className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdAccessTime size={20} color="#f59e0b" />
            <span>Average Gate Wait Time</span>
          </div>
          <div className="kpi-value">
            {d.avgWaitingTime ?? '-'}
            {d.avgWaitingTime != null && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}> min</span>}
          </div>
          <div className={`kpi-foot ${isCongested ? 'bad' : d.avgWaitingTime != null ? 'good' : ''}`}>
            {d.avgWaitingTime != null
              ? (isCongested ? 'Queues forming at Gate 1' : 'Smooth vehicular throughput')
              : '-'}
          </div>
        </div>
      </div>

      {/* Dynamic Visualizations */}
      <div className="two">
        <div className="card">
          <h3>
            <span>Vehicular Inflow & Traffic Movement</span>
            <span className="card-tag">Live Sensor Log</span>
          </h3>
          <ChartBox id="trafficFlowChart" type="line" labels={flowData.labels} datasets={flowData.datasets} />
        </div>

        <div className="card">
          <h3>
            <span>Smart Parking Allocation</span>
            <span className="card-tag">{d.parkingOccupancy != null ? `${d.parkingOccupancy}% Filled` : '-'}</span>
          </h3>
          <ChartBox id="parkingDoughnut" type="doughnut" labels={parkingData.labels} datasets={parkingData.datasets} />
        </div>
      </div>

      {/* Traffic Diagnostics */}
      <div className="card">
        <h3>Mobility Management & Gate Automation</h3>
        <table>
          <thead>
            <tr>
              <th>Checkpoint / Parameter</th>
              <th>Live Telemetry</th>
              <th>Status</th>
              <th>Guidance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Campus Parking Lots</td>
              <td><b>{d.parkingOccupancy != null ? `${d.parkingOccupancy}% occupied` : '-'}</b></td>
              <td>
                <span className={`badge ${d.parkingOccupancy != null ? (occupancyPct > 85 ? 'high' : occupancyPct > 65 ? 'medium' : 'good') : ''}`}>
                  {d.parkingOccupancy != null ? (occupancyPct > 85 ? 'Congested' : occupancyPct > 65 ? 'Moderate' : 'Available') : '-'}
                </span>
              </td>
              <td>{d.parkingOccupancy != null ? (occupancyPct > 85 ? 'Divert visitors to South Lot' : 'All entrances clear') : '-'}</td>
            </tr>
            <tr>
              <td>Barrier Wait Interval</td>
              <td><b>{d.avgWaitingTime != null ? `${d.avgWaitingTime} minutes` : '-'}</b></td>
              <td>
                <span className={`badge ${d.avgWaitingTime != null ? (isCongested ? 'high' : 'good') : ''}`}>
                  {d.avgWaitingTime != null ? (isCongested ? 'Slow Transit' : 'Fast Flow') : '-'}
                </span>
              </td>
              <td>{d.avgWaitingTime != null ? (isCongested ? 'Enable dual-lane RFID clearance' : 'RFID processing normal') : '-'}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 16 }}>
          {occupancyPct > 85 ? (
            <div className="recommendation recommendation--alert">
              <b>Traffic Divert:</b> Parking capacity critical ({occupancyPct}%). Dynamic LED boards updated to guide approaching cars to Secondary Lot B.
            </div>
          ) : d.parkingOccupancy != null ? (
            <div className="recommendation">
              <b>Traffic Flowing Optimally:</b> Average entry wait time is {d.avgWaitingTime ?? '-'} min with {d.totalSlots && d.occupiedSlots ? d.totalSlots - d.occupiedSlots : '-'} free slots.
            </div>
          ) : (
            <div className="small" style={{ color: 'var(--muted)' }}>-</div>
          )}
        </div>
      </div>
    </>
  );
}
