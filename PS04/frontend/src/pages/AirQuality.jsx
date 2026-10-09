import { MdWaterDrop, MdAir, MdExplore, MdWbSunny, MdSmokingRooms, MdScience, MdGrain } from 'react-icons/md';
import ChartBox from '../components/ChartBox';
import { getAirQualityChartData } from '../utils/chartHelpers';
import ExcelDownloadBtn from '../components/ExcelDownloadBtn';

function aqiLabel(aqi) {
  if (aqi == null) return { text: '-', cls: '' };
  if (aqi <= 50) return { text: 'Good', cls: 'good' };
  if (aqi <= 100) return { text: 'Moderate', cls: 'medium' };
  if (aqi <= 150) return { text: 'Unhealthy', cls: 'high' };
  return { text: 'Very Poor', cls: 'high' };
}

export default function AirQuality({ data, history = [] }) {
  const d = data || {};
  const label = aqiLabel(d.aqi);
  const chartData = getAirQualityChartData(d, history);

  const envCards = [
    {
      icon: <MdWaterDrop size={26} color="#2563eb" />,
      label: 'Rainfall',
      value: d.rainfall ?? '-',
      unit: d.rainfall != null ? 'mm' : '',
      foot: d.rainfall != null
        ? (d.rainfall > 5 ? 'Heavy precipitation' : d.rainfall > 0 ? 'Light showers' : 'Clear / No rain')
        : '-',
      footCls: d.rainfall > 5 ? 'bad' : d.rainfall > 0 ? 'warn' : '',
    },
    {
      icon: <MdAir size={26} color="#0ea5e9" />,
      label: 'Wind Speed',
      value: d.windSpeed ?? '-',
      unit: d.windSpeed != null ? 'km/h' : '',
      foot: d.windSpeed != null
        ? (d.windSpeed > 40 ? 'Gale wind' : d.windSpeed > 20 ? 'Moderate breeze' : 'Calm breeze')
        : '-',
      footCls: d.windSpeed > 40 ? 'bad' : '',
    },
    {
      icon: <MdExplore size={26} color="#6366f1" />,
      label: 'Wind Direction',
      value: d.windDirection ?? '-',
      unit: '',
      foot: d.windDirection ? `Bearing: ${d.windDirection}` : '-',
      footCls: '',
    },
    {
      icon: <MdWbSunny size={26} color="#f59e0b" />,
      label: 'Light Intensity',
      value: d.lightIntensity != null ? d.lightIntensity.toLocaleString('en-IN') : '-',
      unit: d.lightIntensity != null ? 'lux' : '',
      foot: d.lightIntensity != null
        ? (d.lightIntensity > 50000 ? 'Bright direct daylight' : d.lightIntensity > 10000 ? 'Overcast day' : 'Dusk / Low light')
        : '-',
      footCls: '',
    },
    {
      icon: <MdSmokingRooms size={26} color="#ef4444" />,
      label: 'Smoke Sensor',
      value: d.smoke ?? '-',
      unit: d.smoke != null ? 'ppm' : '',
      foot: d.smoke != null
        ? (d.smoke > 100 ? 'Hazardous levels' : d.smoke > 50 ? 'Smoke detected' : 'Clear air')
        : '-',
      footCls: d.smoke > 50 ? 'bad' : '',
    },
    {
      icon: <MdScience size={26} color="#8b5cf6" />,
      label: 'Ammonia (NH3)',
      value: d.nh3 ?? '-',
      unit: d.nh3 != null ? 'ppm' : '',
      foot: d.nh3 != null
        ? (d.nh3 > 25 ? 'Critical chemical hazard' : d.nh3 > 15 ? 'Elevated NH3 vapors' : 'Safe air baseline')
        : '-',
      footCls: d.nh3 > 25 ? 'bad' : d.nh3 > 15 ? 'warn' : '',
    },
    {
      icon: <MdGrain size={26} color="#06b6d4" />,
      label: 'VOC (Volatile Organics)',
      value: d.voc ?? '-',
      unit: d.voc != null ? 'ppm' : '',
      foot: d.voc != null
        ? (d.voc > 1.0 ? 'High vapor concentration' : d.voc > 0.5 ? 'Moderate VOC exposure' : 'Pure air purity')
        : '-',
      footCls: d.voc > 1.0 ? 'bad' : d.voc > 0.5 ? 'warn' : '',
    },
  ];

  return (
    <>
      {/* Tab Control / Export Banner */}
      <div className="tab-control-banner">
        <div className="banner-left-info">
          <div className="engine-status-pill">
            <span className="pulse-dot-small" style={{ background: '#0284c7' }} />
            <span>Atmospheric & Microclimate Surveillance</span>
          </div>
          <p className="banner-subtext">
            Multi-spectral continuous monitoring of AQI, particulate concentrations, chemical vapors, and weather conditions.
          </p>
        </div>
        <div className="banner-right-actions">
          <ExcelDownloadBtn tabName="air" tabLabel="Air Quality" data={d} history={history} />
        </div>
      </div>

      {/* Primary KPI row */}
      <div className="grid">
        <div className="card">
          <div className="kpi-label">Air Quality Index (AQI)</div>
          <div className="kpi-value">{d.aqi ?? '-'}</div>
          <div className={`kpi-foot ${d.aqi > 100 ? 'bad' : d.aqi > 50 ? 'warn' : ''}`}>
            {d.aqi != null ? `${label.text} • Continuous monitoring` : '-'}
          </div>
        </div>

        <div className="card">
          <div className="kpi-label">Fine Particulate (PM2.5)</div>
          <div className="kpi-value">
            {d.pm25 ?? '-'}
            {d.pm25 != null && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>µg/m³</span>}
          </div>
          <div className={`kpi-foot ${d.pm25 > 35 ? 'warn' : ''}`}>
            {d.pm25 != null ? (d.pm25 > 60 ? 'Hazardous' : d.pm25 > 35 ? 'Moderate elevation' : 'Safe air quality') : '-'}
          </div>
        </div>

        <div className="card">
          <div className="kpi-label">Coarse Particulate (PM10)</div>
          <div className="kpi-value">
            {d.pm10 ?? '-'}
            {d.pm10 != null && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>µg/m³</span>}
          </div>
          <div className={`kpi-foot ${d.pm10 > 50 ? 'warn' : ''}`}>
            {d.pm10 != null ? (d.pm10 > 100 ? 'High concentration' : d.pm10 > 50 ? 'Acceptable' : 'Safe level') : '-'}
          </div>
        </div>

        <div className="card">
          <div className="kpi-label">Carbon Dioxide (CO₂)</div>
          <div className="kpi-value">
            {d.co2 ?? '-'}
            {d.co2 != null && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}>ppm</span>}
          </div>
          <div className={`kpi-foot ${d.co2 > 1000 ? 'warn' : ''}`}>
            {d.co2 != null ? (d.co2 > 1500 ? 'Poor ventilation' : d.co2 > 1000 ? 'Requires airflow' : 'Fresh indoor air') : '-'}
          </div>
        </div>
      </div>

      {/* Environmental Sensors Row */}
      <div className="env-cards">
        {envCards.map(c => (
          <div key={c.label} className="card env-card">
            <div className="env-icon">{c.icon}</div>
            <div className="kpi-label" style={{ marginBottom: 4 }}>{c.label}</div>
            <div className="kpi-value" style={{ fontSize: 24, marginBottom: 4 }}>
              {c.value}
              {c.unit && <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)', marginLeft: 4 }}>{c.unit}</span>}
            </div>
            <div className={`kpi-foot ${c.footCls}`}>{c.foot}</div>
          </div>
        ))}
      </div>

      {/* Dynamic Graph + Sensor Diagnostics */}
      <div className="two">
        <div className="card">
          <h3>
            <span>Air Pollutants Live Trend (PM2.5 / PM10 / Smoke / NH3 / VOC)</span>
            <span className="card-tag">Real Time</span>
          </h3>
          <ChartBox id="airChart" type="line" labels={chartData.labels} datasets={chartData.datasets} />
        </div>

        <div className="card">
          <h3>
            <span>Current Sensor Diagnostics</span>
            <span className="card-tag">7 Active Telemetries</span>
          </h3>
          <table>
            <thead>
              <tr>
                <th>Telemetry Parameter</th>
                <th>Measured Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>AQI (Overall)</td>
                <td><b>{d.aqi ?? '-'}</b></td>
                <td><span className={`badge ${label.cls}`}>{label.text}</span></td>
              </tr>
              <tr>
                <td>PM2.5 (Fine dust)</td>
                <td><b>{d.pm25 != null ? `${d.pm25} µg/m³` : '-'}</b></td>
                <td>
                  <span className={`badge ${d.pm25 != null ? (d.pm25 > 60 ? 'high' : d.pm25 > 35 ? 'medium' : 'good') : ''}`}>
                    {d.pm25 != null ? (d.pm25 > 60 ? 'High' : d.pm25 > 35 ? 'Moderate' : 'Safe') : '-'}
                  </span>
                </td>
              </tr>
              <tr>
                <td>PM10 (Coarse dust)</td>
                <td><b>{d.pm10 != null ? `${d.pm10} µg/m³` : '-'}</b></td>
                <td>
                  <span className={`badge ${d.pm10 != null ? (d.pm10 > 100 ? 'high' : d.pm10 > 50 ? 'medium' : 'good') : ''}`}>
                    {d.pm10 != null ? (d.pm10 > 100 ? 'High' : d.pm10 > 50 ? 'Moderate' : 'Safe') : '-'}
                  </span>
                </td>
              </tr>
              <tr>
                <td>CO₂ Concentration</td>
                <td><b>{d.co2 != null ? `${d.co2} ppm` : '-'}</b></td>
                <td>
                  <span className={`badge ${d.co2 != null ? (d.co2 > 1500 ? 'high' : d.co2 > 1000 ? 'medium' : 'good') : ''}`}>
                    {d.co2 != null ? (d.co2 > 1500 ? 'Poor' : d.co2 > 1000 ? 'Ventilate' : 'Optimal') : '-'}
                  </span>
                </td>
              </tr>
              <tr>
                <td>Smoke Particle Density</td>
                <td><b>{d.smoke != null ? `${d.smoke} ppm` : '-'}</b></td>
                <td>
                  <span className={`badge ${d.smoke != null ? (d.smoke > 100 ? 'high' : d.smoke > 50 ? 'medium' : 'good') : ''}`}>
                    {d.smoke != null ? (d.smoke > 100 ? 'Hazardous' : d.smoke > 50 ? 'Alert' : 'Clean') : '-'}
                  </span>
                </td>
              </tr>
              <tr>
                <td>Ammonia (NH3) Vapor</td>
                <td><b>{d.nh3 != null ? `${d.nh3} ppm` : '-'}</b></td>
                <td>
                  <span className={`badge ${d.nh3 != null ? (d.nh3 > 25 ? 'high' : d.nh3 > 15 ? 'medium' : 'good') : ''}`}>
                    {d.nh3 != null ? (d.nh3 > 25 ? 'Hazardous' : d.nh3 > 15 ? 'Elevated' : 'Safe') : '-'}
                  </span>
                </td>
              </tr>
              <tr>
                <td>Volatile Organics (VOC)</td>
                <td><b>{d.voc != null ? `${d.voc} ppm` : '-'}</b></td>
                <td>
                  <span className={`badge ${d.voc != null ? (d.voc > 1.0 ? 'high' : d.voc > 0.5 ? 'medium' : 'good') : ''}`}>
                    {d.voc != null ? (d.voc > 1.0 ? 'Hazardous' : d.voc > 0.5 ? 'Moderate' : 'Pure') : '-'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: 16 }}>
            {d.pm25 > 35 && (
              <div className="recommendation recommendation--warn">
                <b>Air Alert:</b> PM2.5 elevated at {d.pm25} µg/m³. Activate localized air filtration units in East Block.
              </div>
            )}
            {d.smoke > 50 && (
              <div className="recommendation recommendation--alert">
                <b>Smoke Alarm:</b> Detected {d.smoke} ppm. Inspect nearby utility rooms and kitchen exhaust lines.
              </div>
            )}
            {d.nh3 > 25 && (
              <div className="recommendation recommendation--alert">
                <b>Ammonia Hazard:</b> NH3 detected at {d.nh3} ppm. Hazardous vapor threshold exceeded; inspect chemical storage and trigger scrubber fans.
              </div>
            )}
            {d.voc > 0.5 && (
              <div className="recommendation recommendation--warn">
                <b>VOC Advisory:</b> Volatile organic concentration at {d.voc} ppm. Increase fresh air circulation and inspect solvents/coatings.
              </div>
            )}
            {d.aqi != null && (!d.pm25 || d.pm25 <= 35) && (!d.smoke || d.smoke <= 50) && (!d.nh3 || d.nh3 <= 25) && (!d.voc || d.voc <= 0.5) && (
              <div className="recommendation">
                <b>Clean Atmosphere:</b> Air parameters are in optimal range. Natural cross-ventilation is recommended.
              </div>
            )}
            {d.aqi == null && (
              <div className="small" style={{ color: 'var(--muted)' }}>-</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
