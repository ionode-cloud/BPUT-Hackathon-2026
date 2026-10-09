import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, AlertTriangle, AlertCircle, Clock, CheckCircle2,
  ChevronRight, Radio, ExternalLink, Check
} from 'lucide-react';
import { useAlerts } from '../context/AlertContext';
import { formatAlertTime, ALERT_POPUP_DURATION } from '../utils/alertConfig';

export function AlertPopupContainer() {
  const navigate = useNavigate();
  const { currentPopup, popupQueue, dismissCurrentPopup, acknowledgeAlert } = useAlerts();
  const [progress, setProgress] = useState(100);

  // Animated progress bar countdown for the 4-second duration
  useEffect(() => {
    if (!currentPopup) {
      setProgress(100);
      return;
    }

    setProgress(100);
    const intervalMs = 40;
    const step = (intervalMs / ALERT_POPUP_DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev - step;
        return next <= 0 ? 0 : next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [currentPopup]);

  if (!currentPopup) return null;

  const isCritical = currentPopup.severity === 'critical';
  const accentColor = isCritical ? '#F43F5E' : '#F59E0B';
  const badgeBg = isCritical ? 'rgba(244, 63, 94, 0.12)' : 'rgba(245, 158, 11, 0.14)';
  const badgeText = isCritical ? '#BE123C' : '#B45309';

  return (
    <div className="alert-popup-bottom-dock">
      <div
        key={currentPopup.id}
        className={`alert-popup-bottom-card ${isCritical ? 'critical' : 'warning'}`}
      >
        {/* Top Header Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 16px',
            background: isCritical
              ? 'linear-gradient(90deg, #FFF1F2 0%, #FFFFFF 100%)'
              : 'linear-gradient(90deg, #FFFBEB 0%, #FFFFFF 100%)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          }}
        >
          {/* Left: Severity Badge + Station Tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: badgeBg,
                padding: '3px 8px',
                borderRadius: 999,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: accentColor,
                  display: 'inline-block',
                  animation: isCritical ? 'alertPulseDot 1.4s infinite' : 'alertWarningDot 1.4s infinite',
                }}
              />
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 900,
                  letterSpacing: '0.4px',
                  color: badgeText,
                  textTransform: 'uppercase',
                }}
              >
                {isCritical ? 'CRITICAL ALERT' : 'WARNING EXCEEDANCE'}
              </span>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--color-heading)',
                background: '#F8FAFC',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                padding: '2px 7px',
              }}
            >
              <Radio size={11} color="#059669" />
              <span>{currentPopup.nodeName || currentPopup.nodeId}</span>
            </div>
          </div>

          {/* Right: Queue Badge + Detected Time + Dismiss Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {popupQueue.length > 0 && (
              <span
                style={{
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: '#4F46E5',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: 999,
                }}
              >
                +{popupQueue.length} queued
              </span>
            )}

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10.5,
                color: 'var(--color-text-secondary)',
              }}
            >
              <Clock size={11} /> {formatAlertTime(currentPopup.timestamp)}
            </span>

            <button
              type="button"
              onClick={dismissCurrentPopup}
              style={{
                background: '#F1F5F9',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                width: 22,
                height: 22,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              title="Dismiss Alert"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div style={{ padding: '14px 16px' }}>
          {/* Situation Row: Sensor Icon + Title + Message */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: isCritical
                  ? 'linear-gradient(135deg, #FFE4E6 0%, #FECDD3 100%)'
                  : 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                border: `1px solid ${isCritical ? '#FDA4AF' : '#FCD34D'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                flexShrink: 0,
                boxShadow: isCritical
                  ? '0 4px 12px rgba(244, 63, 94, 0.18)'
                  : '0 4px 12px rgba(245, 158, 11, 0.18)',
              }}
            >
              {currentPopup.sensorIcon || '⚠️'}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <h4
                  style={{
                    margin: 0,
                    fontSize: 14.5,
                    fontWeight: 800,
                    color: 'var(--color-heading)',
                    lineHeight: 1.3,
                  }}
                >
                  {currentPopup.title || `${currentPopup.sensorName} Exceeded`}
                </h4>
              </div>

              <p
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  margin: '3px 0 0',
                  lineHeight: 1.45,
                }}
              >
                {currentPopup.message}
              </p>
            </div>
          </div>

          {/* Telemetry Numbers Box: Current Value vs Limit */}
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--color-text-label)', textTransform: 'uppercase' }}>
                CURRENT READING
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: accentColor, lineHeight: 1.2, marginTop: 2 }}>
                {currentPopup.value} <span style={{ fontSize: 12, fontWeight: 700 }}>{currentPopup.unit}</span>
              </div>
            </div>

            <div style={{ width: 1, height: 26, background: 'var(--color-border)' }} />

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--color-text-label)', textTransform: 'uppercase' }}>
                SAFE THRESHOLD
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-heading)', lineHeight: 1.2, marginTop: 2 }}>
                ≤ {currentPopup.threshold} <span style={{ fontSize: 11, fontWeight: 600 }}>{currentPopup.unit}</span>
              </div>
            </div>
          </div>

          {/* Recommended Actions */}
          {currentPopup.recommendedActions && currentPopup.recommendedActions.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-text-label)', textTransform: 'uppercase', marginBottom: 5 }}>
                Recommended Actions:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {currentPopup.recommendedActions.map((action, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--color-heading)',
                      background: '#F1F5F9',
                      border: '1px solid rgba(0, 0, 0, 0.06)',
                      padding: '2px 8px',
                      borderRadius: 6,
                    }}
                  >
                    {action}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              paddingTop: 4,
            }}
          >
            <button
              type="button"
              onClick={() => {
                acknowledgeAlert(currentPopup.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-secondary)',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 6px',
                borderRadius: 6,
              }}
              title="Acknowledge alert"
            >
              <Check size={12} color="#059669" />
              <span>Acknowledge</span>
            </button>

            <button
              type="button"
              onClick={() => {
                dismissCurrentPopup();
                navigate('/alerts');
              }}
              style={{
                background: accentColor,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                padding: '5px 12px',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                boxShadow: `0 2px 8px ${accentColor}40`,
                transition: 'all 0.15s ease',
              }}
            >
              <span>View in Alerts Deck</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Bottom Glowing Countdown Bar */}
        <div
          style={{
            height: 4,
            width: '100%',
            background: 'rgba(0, 0, 0, 0.05)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: accentColor,
              boxShadow: `0 0 6px ${accentColor}`,
              transition: 'width 0.04s linear',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default AlertPopupContainer;
