import { MdElectricBolt, MdAir, MdDelete, MdAutoAwesome, MdWaterDrop } from 'react-icons/md';
import ChartBox from '../components/ChartBox';
import { getAIForecastComparisonData, getAISustainabilityScorecard } from '../utils/chartHelpers';

export default function AIInsights({ data, history = [] }) {
  const d = data || {};
  const forecastData = getAIForecastComparisonData(d);
  const scorecardData = getAISustainabilityScorecard(d);

  const hasData = d && (d.energyForecast != null || d.todaysEnergy != null || d.aqi != null);

  const decisionLog = [
    {
      icon: <MdElectricBolt size={22} color="#f59e0b" />,
      title: 'Neural Energy Load Prediction',
      detail: d.energyForecast != null
        ? `Model forecasts ${d.energyForecast} kWh demand over the next 24h cycle (Current: ${d.todaysEnergy ?? '-'} kWh).`
        : '-',
      conf: d.energyForecast != null ? (d.energyForecast > (d.todaysEnergy ?? 0) ? 'Higher Demand Expected' : 'Normal Grid Load') : '-',
    },
    {
      icon: <MdWaterDrop size={22} color="#0284c7" />,
      title: 'Hydraulic Demand Projection',
      detail: d.waterForecast != null
        ? `Estimated ${d.waterForecast.toLocaleString('en-IN')} L water required tomorrow based on real-time consumption.`
        : '-',
      conf: d.waterForecast != null ? (d.waterForecast > (d.todaysUsage ?? 0) ? 'Elevated Volume' : 'Conserving Quota') : '-',
    },
    {
      icon: <MdAir size={22} color="#10b981" />,
      title: 'Atmospheric Microclimate Forecasting',
      detail: d.aqi != null
        ? `Current AQI ${d.aqi} with PM2.5 at ${d.pm25 ?? '-'} µg/m³ and CO₂ at ${d.co2 ?? '-'} ppm. Weather: Rain ${d.rainfall ?? 0} mm, Wind ${d.windSpeed ?? 0} km/h (${d.windDirection ?? '-'}).`
        : '-',
      conf: d.aqi != null ? (d.aqi <= 50 ? 'Optimal Air Purity' : d.aqi <= 100 ? 'Moderate Air Quality' : 'Air Filtration Active') : '-',
    },
    {
      icon: <MdDelete size={22} color="#ef4444" />,
      title: 'Sanitation Overflow Prediction',
      detail: d.overflowRisk != null
        ? ((d.overflowRisk ?? 0) > 0
            ? `Alert: ${d.overflowRisk} bin(s) predicted to hit critical overflow threshold within ~${d.overflowPrediction ?? '-'} hours.`
            : 'All smart bins currently within safe holding capacities.')
        : '-',
      conf: d.overflowRisk != null ? ((d.overflowRisk ?? 0) > 0 ? `${d.overflowRisk} At-Risk Units` : 'Safe Capacities') : '-',
    },
  ];

  const actions = [];
  if (d.todaysEnergy > 120) actions.push(`Energy Draw: Shift non-essential HVAC cooling to solar peak windows.`);
  if (d.overflowRisk > 0) actions.push(`Waste Overflow: Route electric collection cart to ${d.overflowRisk} critical bin(s).`);
  if (d.pm25 > 30) actions.push(`Particulate Alert: Inspect perimeter dust sensors and turn on misting cannons.`);
  if (d.nh3 > 25) actions.push(`Chemical Vapor Hazard: Ammonia (NH3) at ${d.nh3} ppm. Activate emergency fume hood extraction.`);
  if (d.voc > 0.5) actions.push(`VOC Ventilation: Volatile organic compounds at ${d.voc} ppm. Increase fresh air supply rate.`);
  if (d.tankLevel < 35 && d.tankLevel != null) actions.push(`Water Reserve: Main reservoir at ${d.tankLevel}%. Schedule rainwater replenishment.`);
  if (d.parkingOccupancy > 80) actions.push(`Parking Capacity: Redirect Gate 1 queue to North Overflow Lot.`);
  if (d.maintenanceDue > 0) actions.push(`Asset Health: Dispatch maintenance crew for ${d.maintenanceDue} unit(s) due.`);
  if (hasData && actions.length === 0) actions.push('Facility systems are in green equilibrium. No emergency overrides necessary.');
  if (!hasData) actions.push('-');

  return (
    <>
      {/* 3 Forecast Metric Cards */}
      <div className="three">
        <div className="card">
          <div className="kpi-label">AI 24h Energy Forecast</div>
          <div className="kpi-value">
            {d.energyForecast ?? '-'}
            {d.energyForecast != null && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}> kWh</span>}
          </div>
          <div className="kpi-foot">
            {d.todaysEnergy != null && d.energyForecast != null ? (
              <span>
                {d.energyForecast > d.todaysEnergy ? '▲ Expected rise of ' : '▼ Expected drop of '}
                {Math.abs(d.energyForecast - d.todaysEnergy)} kWh
              </span>
            ) : (
              '-'
            )}
          </div>
        </div>

        <div className="card">
          <div className="kpi-label">AI Tomorrow's Water Demand</div>
          <div className="kpi-value">
            {d.waterForecast != null ? d.waterForecast.toLocaleString('en-IN') : '-'}
            {d.waterForecast != null && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}> L</span>}
          </div>
          <div className="kpi-foot">
            {d.todaysUsage != null && d.waterForecast != null ? (
              <span>
                {d.waterForecast > d.todaysUsage ? '▲ Anticipating ' : '▼ Conserving '}
                {Math.abs(d.waterForecast - d.todaysUsage).toLocaleString('en-IN')} L vs today
              </span>
            ) : (
              '-'
            )}
          </div>
        </div>

        <div className="card">
          <div className="kpi-label">Waste Overflow Timeline</div>
          <div
            className="kpi-value"
            style={{ color: (d.overflowPrediction ?? 10) < 6 ? 'var(--red)' : 'var(--text)' }}
          >
            {d.overflowPrediction ?? '-'}
            {d.overflowPrediction != null && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}> hrs</span>}
          </div>
          <div className="kpi-foot" style={{ color: (d.overflowRisk ?? 0) > 0 ? 'var(--red)' : 'var(--green)' }}>
            {d.overflowRisk != null
              ? ((d.overflowRisk ?? 0) > 0 ? `${d.overflowRisk} bin(s) approaching capacity` : 'No overflow hazards projected')
              : '-'}
          </div>
        </div>
      </div>

      {/* Dynamic Forecast & Sustainability Radar Charts */}
      <div className="two">
        <div className="card">
          <h3>
            <span>AI 24-Hour Forecast vs Current Consumption</span>
            <span className="card-tag">Neural Model</span>
          </h3>
          <ChartBox id="aiForecastChart" type="bar" labels={forecastData.labels} datasets={forecastData.datasets} />
        </div>

        <div className="card">
          <h3>
            <span>Cross-Domain Facility Performance</span>
            <span className="card-tag">Index / 100</span>
          </h3>
          <ChartBox id="aiScorecardRadar" type="radar" labels={scorecardData.labels} datasets={scorecardData.datasets} />
        </div>
      </div>

      {/* Decision Log and Directives */}
      <div className="two">
        <div className="card">
          <h3>
            <span>Real-time AI Decision Log</span>
            <span className="card-tag">Self-Learning Engine</span>
          </h3>
          {decisionLog.map(entry => (
            <div key={entry.title} className="alert">
              <div className="alert-icon">{entry.icon}</div>
              <div>
                <b style={{ color: 'var(--text)' }}>{entry.title}</b>
                <div style={{ margin: '4px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
                  {entry.detail}
                </div>
                <span className="small" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                  Confidence: {entry.conf}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>
            <span>Autonomous Action Directives</span>
            <span className="card-tag"><MdAutoAwesome style={{ verticalAlign: 'middle' }} /> Active AI</span>
          </h3>
          {actions.map((act, i) => (
            <div key={i} className="recommendation" style={{ marginBottom: 12 }}>
              {act === '-' ? '-' : <span><b>Directive {i + 1}:</b> {act}</span>}
            </div>
          ))}
          <div style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <span className="small">
              Telemetry Source: <b>{d.source ?? '-'}</b> • Facility Zone: <b>{d.location ?? '-'}</b> •{' '}
              Timestamp: <b>{d.updatedAt ? new Date(d.updatedAt).toLocaleTimeString() : '-'}</b>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
