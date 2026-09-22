import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, AlertCircle, Clock, CheckCircle2, ChevronRight, Radio } from 'lucide-react';
import { useAlerts } from '../context/AlertContext';
import { formatAlertTime, ALERT_POPUP_DURATION } from '../utils/alertConfig';

export function AlertPopupContainer() {
  const { currentPopup, popupQueue, dismissCurrentPopup } = useAlerts();
  const [progress, setProgress] = useState(100);

  // Animated progress bar countdown for the 4-second duration
  useEffect(() => {
    if (!currentPopup) {
      setProgress(100);
      return;
    }

    setProgress(100);
    const intervalMs = 50;
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
  const accentColor = isCritical ? '#E87878' : '#F5B84B';
  const badgeBg = isCritical ? 'rgba(232, 120, 120, 0.16)' : 'rgba(245, 184, 75, 0.18)';
  const badgeText = isCritical ? '#b91c1c' : '#9a6700';
  const borderColor = isCritical ? '#E87878' : '#F5B84B';

  return (
    <div className="alert-popup-fullwidth">
      <div
        key={currentPopup.id}
        className="alert-popup-card"
        style={{
          border: `2px solid ${borderColor}`,
          boxShadow: isCritical
            ? '0 10px 36px rgba(232, 120, 120, 0.32), 0 2px 10px rgba(0, 0, 0, 0.08)'
            : '0 10px 36px rgba(245, 184, 75, 0.32), 0 2px 10px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Top Header Strip: Severity + Station + Timestamp + Queue Counter + Close Button */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 18px',
            background: isCritical ? '#FFF5F5' : '#FFFDF3',
            borderBottom: '1px solid var(--color-border)',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {/* Left: Severity Badge & Station Tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: accentColor,
                  display: 'inline-block',
                  boxShadow: `0 0 8px ${accentColor}`,
                  animation: 'alertPulseDot 1.4s infinite',
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: '0.6px',
                  color: badgeText,
                  textTransform: 'uppercase',
                }}
              >
                {isCritical ? '🔴 CRITICAL ALERT' : '🟠 WARNING ALERT'}
              </span>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                fontWeight: 800,
                color: '#4A4200',
                background: '#FFF8D9',
                border: '1px solid #F4D35E',
                borderRadius: 6,
                padding: '2px 8px',
              }}
            >
              <Radio size={11} color="#9a6700" />
              Station: <strong>{currentPopup.nodeName}</strong>
              <span style={{ color: 'var(--color-text-label)', fontWeight: 600, fontFamily: 'monospace', fontSize: 10.5 }}>
                ({currentPopup.nodeId})
              </span>
            </div>
          </div>

          {/* Right: Detected Time + Queue Counter + Close Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-label)' }}>
              <Clock size={12} /> Detected: {formatAlertTime(currentPopup.timestamp)}
            </span>

            {popupQueue.length > 0 && (
              <span
                style={{
                  background: 'rgba(125, 112, 216, 0.14)',
                  color: '#6557C7',
                  border: '1px solid rgba(125, 112, 216, 0.3)',
                  fontSize: 10.5,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 999,
                }}
              >
                +{popupQueue.length} more in queue
              </span>
            )}

            <button
              type="button"
              onClick={dismissCurrentPopup}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                padding: 4,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s ease',
              }}
              title="Dismiss alert (advances to next)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Responsive Full-Width Body Content */}
        <div className="alert-popup-body">
          {/* Column 1: Sensor Icon, Title & Situation Message */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{currentPopup.sensorIcon}</span>
            <div>
              <h4
                style={{
                  margin: 0,
                  fontSize: 15.5,
                  fontWeight: 800,
                  color: 'var(--color-heading)',
                  lineHeight: 1.25,
                }}
              >
                {currentPopup.title || `${currentPopup.sensorName} Exceeded`}
              </h4>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  margin: '3px 0 0',
                  lineHeight: 1.4,
                }}
              >
                {currentPopup.message}
              </p>
            </div>
          </div>

          {/* Column 2: Current Value vs Threshold Limit */}
          <div
            style={{
              background: '#FFFDF3',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              padding: '8px 14px',
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 10, color: 'var(--color-text-label)', fontWeight: 700, letterSpacing: '0.4px' }}>CURRENT VALUE</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: accentColor, lineHeight: 1.2 }}>
                {currentPopup.value} {currentPopup.unit}
              </div>
            </div>
            <div style={{ height: 28, width: 1, background: 'var(--color-border)' }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--color-text-label)', fontWeight: 700, letterSpacing: '0.4px' }}>THRESHOLD LIMIT</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-heading)', lineHeight: 1.2 }}>
                {currentPopup.threshold} {currentPopup.unit}
              </div>
            </div>
          </div>

          {/* Column 3: Recommended Actions */}
          <div className="alert-action-col">
            {currentPopup.recommendedActions && currentPopup.recommendedActions.length > 0 && (
              <div
                style={{
                  background: isCritical ? '#FFF8F8' : '#FFFDF3',
                  border: `1px solid ${isCritical ? '#FAD2D2' : '#F1E9C8'}`,
                  borderRadius: 10,
                  padding: '8px 12px',
                }}
              >
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: isCritical ? '#b91c1c' : '#9a6700',
                    marginBottom: 4,
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                  }}
                >
                  Recommended Actions:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {currentPopup.recommendedActions.map((action, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: 11.5,
                        color: 'var(--color-heading)',
                        fontWeight: 600,
                        background: '#FFFFFF',
                        border: '1px solid rgba(0,0,0,0.06)',
                        padding: '2px 8px',
                        borderRadius: 6,
                        display: 'inline-block',
                      }}
                    >
                      {action}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4-second Countdown Animated Progress Bar across 100% full width */}
        <div
          style={{
            height: 4,
            width: '100%',
            background: 'rgba(0, 0, 0, 0.06)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: accentColor,
              transition: 'width 0.05s linear',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default AlertPopupContainer;
