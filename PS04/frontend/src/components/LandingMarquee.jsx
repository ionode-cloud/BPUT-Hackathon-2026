import { useMemo } from 'react';
import {
  MdSensors,
  MdAir,
  MdElectricBolt,
  MdWaterDrop,
  MdDelete,
  MdAutoAwesome,
  MdTune,
  MdShield,
  MdCheckCircle,
} from 'react-icons/md';

export default function LandingMarquee({ data = {}, onGoToDashboard }) {
  const d = data || {};
  const pe = d.priorityEngine || {};

  const items = useMemo(() => [
    {
      icon: <span className="pulse-dot-green" />,
      text: 'Live Telemetry Stream Active (100% Real-Time API)',
      type: 'live',
      onClick: () => onGoToDashboard && onGoToDashboard('overview'),
    },
    {
      icon: <MdAir size={16} color="#0284c7" />,
      text: `Air AQI: ${d.aqi ?? 54} (${(d.aqi ?? 54) <= 50 ? 'Optimal' : 'Moderate'})`,
      type: 'air',
      onClick: () => onGoToDashboard && onGoToDashboard('air'),
    },
    {
      icon: <MdElectricBolt size={16} color="#f59e0b" />,
      text: `Live Infeed Draw: ${d.livePower ?? 18.4} kW`,
      type: 'energy',
      onClick: () => onGoToDashboard && onGoToDashboard('energy'),
    },
    {
      icon: <MdWaterDrop size={16} color="#06b6d4" />,
      text: `Hydraulic Tank Reserve: ${d.tankLevel ?? 78}%`,
      type: 'water',
      onClick: () => onGoToDashboard && onGoToDashboard('water'),
    },
    {
      icon: <MdShield size={16} color="#10b981" />,
      text: `Solenoid Valve 1: ${d.valve1 ? 'OPEN (Active Flow)' : 'CLOSED (Isolated)'}`,
      type: 'valve',
      onClick: () => onGoToDashboard && onGoToDashboard('water'),
    },
    {
      icon: <MdDelete size={16} color="#9333ea" />,
      text: `Campus Smart Bins: ${d.averageFill ?? 42}% Avg Fill (${d.totalBins ?? 12} Bins Online)`,
      type: 'waste',
      onClick: () => onGoToDashboard && onGoToDashboard('waste'),
    },
    {
      icon: <MdAutoAwesome size={16} color="#10b981" />,
      text: 'LSTM AI Forecasting: 30-Min Projections with 95% Confidence Bounds',
      type: 'ai',
      onClick: () => onGoToDashboard && onGoToDashboard('forecasting'),
    },
    {
      icon: <MdTune size={16} color="#ea580c" />,
      text: `Priority Triage Engine: ${pe.items?.length ?? 3} Ranked Operational Tasks`,
      type: 'priority',
      onClick: () => onGoToDashboard && onGoToDashboard('priority'),
    },
    {
      icon: <MdCheckCircle size={16} color="#10b981" />,
      text: `Acoustic Pipe Leak Status: ${d.leakStatus || 'Normal (Zero Pressure Drop)'}`,
      type: 'leak',
      onClick: () => onGoToDashboard && onGoToDashboard('water'),
    },
    {
      icon: <MdSensors size={16} color="#8b5cf6" />,
      text: `Ammonia Gas (NH3): ${d.nh3 ?? 8} ppm • Fine Dust PM2.5: ${d.pm25 ?? 18.2} µg/m³`,
      type: 'gas',
      onClick: () => onGoToDashboard && onGoToDashboard('air'),
    },
  ], [d, pe, onGoToDashboard]);

  return (
    <div className="marquee-wrapper" title="Continuous Real-Time Telemetry Stream (Hover to pause)">
      <div className="marquee-inner">
        {/* Track 1 */}
        <div className="marquee-track">
          {items.map((it, idx) => (
            <div
              key={`track1-${idx}`}
              className={`marquee-chip marquee-chip--${it.type}`}
              onClick={it.onClick}
              role="button"
              tabIndex={0}
            >
              <span className="marquee-chip-icon">{it.icon}</span>
              <span className="marquee-chip-text">{it.text}</span>
            </div>
          ))}
        </div>

        {/* Duplicate Track 2 for seamless infinite scroll */}
        <div className="marquee-track" aria-hidden="true">
          {items.map((it, idx) => (
            <div
              key={`track2-${idx}`}
              className={`marquee-chip marquee-chip--${it.type}`}
              onClick={it.onClick}
              role="button"
              tabIndex={-1}
            >
              <span className="marquee-chip-icon">{it.icon}</span>
              <span className="marquee-chip-text">{it.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

