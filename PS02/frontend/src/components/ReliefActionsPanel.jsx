import React from 'react';
import { Wind, Snowflake, RefreshCw, Droplets, Volume2 } from 'lucide-react';

const ICON_MAP = {
  fan: Wind,
  cooler: Snowflake,
  ventilation: RefreshCw,
  evaporative: Droplets,
  rest_break: Volume2,
};

export default function ReliefActionsPanel({ actions = [] }) {
  const defaultStandbyRelays = [
    {
      id: 'fan',
      name: 'High-Volume Fan Relay',
      status: 'Standby',
      triggerReason: '-',
      localControl: 'STM32U585 Relay Pin 4',
    },
    {
      id: 'cooler',
      name: 'Air Cooler / AC Relay',
      status: 'Standby',
      triggerReason: '-',
      localControl: 'STM32U585 Relay Pin 7',
    },
    {
      id: 'ventilation',
      name: 'Ventilation Louvers',
      status: 'Standby',
      triggerReason: '-',
      localControl: 'STM32U585 PWM Servo Ch 2',
    },
    {
      id: 'evaporative',
      name: 'Evaporative Misting Line',
      status: 'Standby',
      triggerReason: '-',
      localControl: 'STM32U585 Solenoid Valve Pin 8',
    },
    {
      id: 'rest_break',
      name: 'Rest Break Siren & Beacon',
      status: 'Standby',
      triggerReason: '-',
      localControl: 'STM32U585 Audio Alarm GPIO 12',
    },
  ];

  const displayList = actions.length > 0 ? actions : defaultStandbyRelays;

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <Wind size={16} />
          <span>Local Relief Actions</span>
        </div>
        <span className="card-subtitle">STM32U585 Local Autonomous Actuation</span>
      </div>

      <div className="relief-actions-list">
        {displayList.map((item) => {
          const Icon = ICON_MAP[item.id] || Wind;
          const isActive = item.status === 'Active';

          return (
            <div key={item.id} className="relief-action-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px',
                    backgroundColor: isActive ? '#EBF4F4' : '#F1F1F1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isActive ? '#3D8888' : '#8A8A8A',
                  }}
                >
                  <Icon size={16} />
                </div>

                <div>
                  <div className="relief-action-name">{item.name}</div>
                  <div className="relief-action-meta">
                    <strong>Trigger:</strong> {item.triggerReason}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <span className={`relief-status-chip ${isActive ? 'active' : 'inactive'}`}>
                  {item.status}
                </span>
                <span style={{ fontSize: '10px', color: '#8A8A8A' }}>
                  {item.localControl}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
