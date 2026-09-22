import React, { useState } from 'react';
import { UserCheck, HardHat, Baby, HeartPulse, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function PersonalisedRiskPanel({ profilesData }) {
  const [selectedProfile, setSelectedProfile] = useState('Labourer');

  const profileExplanations = {
    Labourer: {
      explanation: 'Continuous high metabolic exertion (350-450W) elevates core internal body temperature.',
      vulnerabilityFactor: 'High physical exertion, direct solar exposure',
    },
    Child: {
      explanation: 'Children heat up faster due to higher surface-area-to-body-mass ratio.',
      vulnerabilityFactor: 'Developing thermoregulatory system, reduced sweating efficiency',
    },
    Elderly: {
      explanation: 'Cardiovascular strain increases dramatically during prolonged ambient heat.',
      vulnerabilityFactor: 'Impaired vascular dilation, chronic medications, blunted thirst mechanism',
    },
  };

  const activeData = profilesData?.[selectedProfile];
  const meta = profileExplanations[selectedProfile];
  const hasRisk = Boolean(activeData?.riskLevel);

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <UserCheck size={16} />
          <span>Personalised Heat Risk</span>
        </div>
        <span className="card-subtitle">ISO 7243 & OSHA Work/Rest Guidelines</span>
      </div>

      {/* Profile Selector Tabs */}
      <div className="profile-selector-tabs">
        <button
          className={`profile-tab-btn ${selectedProfile === 'Labourer' ? 'active' : ''}`}
          onClick={() => setSelectedProfile('Labourer')}
        >
          <HardHat size={14} />
          <span>Labourer</span>
        </button>

        <button
          className={`profile-tab-btn ${selectedProfile === 'Child' ? 'active' : ''}`}
          onClick={() => setSelectedProfile('Child')}
        >
          <Baby size={14} />
          <span>Child</span>
        </button>

        <button
          className={`profile-tab-btn ${selectedProfile === 'Elderly' ? 'active' : ''}`}
          onClick={() => setSelectedProfile('Elderly')}
        >
          <HeartPulse size={14} />
          <span>Elderly</span>
        </button>
      </div>

      {/* Detailed Card */}
      <div className="personalised-details">
        <div
          className="risk-level-banner"
          style={{
            backgroundColor:
              activeData?.riskLevel === 'Dangerous'
                ? '#FDF0F0'
                : activeData?.riskLevel === 'Moderate'
                ? '#FCF7E8'
                : activeData?.riskLevel === 'Safe'
                ? '#F4FAE8'
                : '#F8FAFC',
            border: `1px solid ${
              activeData?.riskLevel === 'Dangerous'
                ? '#D96C6C'
                : activeData?.riskLevel === 'Moderate'
                ? '#E7C86A'
                : activeData?.riskLevel === 'Safe'
                ? '#C5ED8D'
                : '#E2E8F0'
            }`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeData?.riskLevel === 'Dangerous' ? (
              <AlertCircle size={16} color="#D96C6C" />
            ) : activeData?.riskLevel ? (
              <CheckCircle2 size={16} color="#3D8888" />
            ) : (
              <AlertCircle size={16} color="#8A8A8A" />
            )}
            <span style={{ color: '#173B5A' }}>
              Target Cohort: <strong>{selectedProfile}</strong>
            </span>
          </div>

          {hasRisk ? (
            <span className={`status-badge ${activeData.riskLevel.toLowerCase()}`}>
              {activeData.riskLevel} Heat Risk
            </span>
          ) : (
            <span style={{ fontSize: '11px', color: '#8A8A8A' }}>-</span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ background: '#FFFFFF', padding: '8px 10px', border: '1px solid #ECECEC', borderRadius: '4px' }}>
            <span style={{ fontSize: '11px', color: '#8A8A8A', display: 'block' }}>WBGT Threshold:</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#173B5A' }}>
              {activeData?.wbgt != null ? `${activeData.wbgt}°C` : '-'}
            </span>
          </div>
          <div style={{ background: '#FFFFFF', padding: '8px 10px', border: '1px solid #ECECEC', borderRadius: '4px' }}>
            <span style={{ fontSize: '11px', color: '#8A8A8A', display: 'block' }}>Heat Index:</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#173B5A' }}>
              {activeData?.heatIndex != null ? `${activeData.heatIndex}°C` : '-'}
            </span>
          </div>
        </div>

        <div className="rest-break-box">
          <div className="rest-break-title">Recommended Rest-Break Status:</div>
          <div style={{ color: activeData?.restBreakStatus ? '#173B5A' : '#8A8A8A', fontWeight: 600 }}>
            {activeData?.restBreakStatus || '-'}
          </div>
        </div>

        <div style={{ fontSize: '12px', color: '#555555', lineHeight: 1.4 }}>
          <strong>Physiological Context:</strong> {meta.explanation}
        </div>
      </div>
    </div>
  );
}
