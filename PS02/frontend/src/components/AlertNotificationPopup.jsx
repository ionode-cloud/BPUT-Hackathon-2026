import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  X,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { alertsAPI } from '../services/api';

export default function AlertNotificationPopup() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const processedIdsRef = useRef(new Set());
  const [acknowledging, setAcknowledging] = useState(false);

  // Append new unique alerts to the queue
  const enqueueAlerts = useCallback((newAlerts) => {
    if (!newAlerts || newAlerts.length === 0) return;
    setQueue((prevQueue) => {
      const existingQueueIds = new Set(prevQueue.map((a) => a._id));
      const toAdd = [];
      for (const a of newAlerts) {
        if (a && a._id && !processedIdsRef.current.has(a._id) && !existingQueueIds.has(a._id)) {
          toAdd.push(a);
        }
      }
      if (toAdd.length === 0) return prevQueue;
      return [...prevQueue, ...toAdd];
    });
  }, []);

  // Real-time listener for alerts triggered when data is PUT to http://localhost:5005/api/nodes/:nodeId
  useEffect(() => {
    let eventSource = null;
    let reconnectTimer = null;

    const connectSSE = () => {
      try {
        const sseBase = (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes(':5000'))
          ? import.meta.env.VITE_API_URL
          : '/api';
        const sseUrl = `${sseBase.replace(/\/$/, '')}/nodes/events`;
        eventSource = new EventSource(sseUrl);

        eventSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'alerts' && Array.isArray(payload.alerts)) {
              enqueueAlerts(payload.alerts);
            } else if (payload.type === 'alert' && payload.alert) {
              enqueueAlerts([payload.alert]);
            }
          } catch (e) {
            console.debug('[SSE] Parse error:', e);
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          reconnectTimer = setTimeout(connectSSE, 5000);
        };
      } catch (err) {
        console.debug('[SSE] Connect error:', err);
      }
    };

    connectSSE();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (eventSource) eventSource.close();
    };
  }, [enqueueAlerts]);

  // Listen for local trigger events (e.g. from PUT /api/nodes/:nodeId)
  useEffect(() => {
    const handleTrigger = (event) => {
      const data = event.detail;
      if (!data) return;
      const list = Array.isArray(data) ? data : [data];
      for (const a of list) {
        if (a?._id) processedIdsRef.current.delete(a._id);
      }
      enqueueAlerts(list);
    };

    window.addEventListener('app:alert-triggered', handleTrigger);
    window.addEventListener('app:alerts-triggered', handleTrigger);
    return () => {
      window.removeEventListener('app:alert-triggered', handleTrigger);
      window.removeEventListener('app:alerts-triggered', handleTrigger);
    };
  }, [enqueueAlerts]);

  // The alert currently showing is the head of the queue
  const currentAlert = queue[0] || null;

  // Advance queue: auto-save as Acknowledged in Alert History and show next
  const advanceQueue = useCallback(async (alertToFinish) => {
    if (!alertToFinish) return;

    // Mark as processed so polling doesn't re-queue it
    if (alertToFinish._id) {
      processedIdsRef.current.add(alertToFinish._id);
    }

    // Auto-save to Alert History in DB
    if (alertToFinish._id && alertToFinish.status !== 'Acknowledged') {
      try {
        await alertsAPI.update(alertToFinish._id, { status: 'Acknowledged' });
      } catch (err) {
        console.debug('Auto-save alert status error:', err);
      }
    }

    // Shift the queue to display the next alert
    setQueue((prev) => prev.slice(1));
  }, []);

  // 4-second auto-remove timer: show for 4s, then auto-remove, save in history, and show next
  useEffect(() => {
    if (!currentAlert) return;

    const timer = setTimeout(() => {
      advanceQueue(currentAlert);
    }, 4000); // 4 seconds (within 3 to 5 seconds requirement)

    return () => clearTimeout(timer);
  }, [currentAlert, advanceQueue]);

  const handleDismiss = () => {
    if (currentAlert) {
      advanceQueue(currentAlert);
    }
  };

  const handleAcknowledge = async () => {
    if (!currentAlert) return;
    try {
      setAcknowledging(true);
      await advanceQueue(currentAlert);
    } finally {
      setAcknowledging(false);
    }
  };

  const handleViewHistory = () => {
    if (currentAlert) {
      advanceQueue(currentAlert);
    }
    navigate('/alerts');
  };

  if (!currentAlert) return null;

  const isCritical = currentAlert.severity === 'Critical';
  const accentColor = isCritical ? '#DC2626' : '#EA580C';
  const bgGrad = isCritical
    ? 'linear-gradient(135deg, #FEF2F2 0%, #FFFFFF 100%)'
    : 'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 100%)';
  const borderColor = isCritical ? '#FCA5A5' : '#FCD34D';
  const remainingInQueue = queue.length - 1;

  return (
    <div
      key={currentAlert._id}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        maxWidth: '440px',
        width: 'calc(100vw - 48px)',
        zIndex: 9999,
        animation: 'slideInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          background: bgGrad,
          border: `2px solid ${borderColor}`,
          borderRadius: '10px',
          boxShadow: isCritical
            ? '0 12px 36px rgba(220, 38, 38, 0.28), 0 4px 12px rgba(0,0,0,0.08)'
            : '0 12px 36px rgba(234, 88, 12, 0.24), 0 4px 12px rgba(0,0,0,0.08)',
          padding: '16px 18px',
          color: '#1E293B',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated pulsating top indicator */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: isCritical
              ? 'linear-gradient(90deg, #DC2626, #EF4444, #DC2626)'
              : 'linear-gradient(90deg, #EA580C, #F59E0B, #EA580C)',
            animation: 'pulse 1.5s infinite',
          }}
        />

        {/* Top row: Badge, Node, Queue Counter, Close button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                padding: '3px 9px',
                borderRadius: '4px',
                backgroundColor: isCritical ? '#DC2626' : '#EA580C',
                color: '#FFFFFF',
                boxShadow: isCritical
                  ? '0 2px 8px rgba(220, 38, 38, 0.4)'
                  : '0 2px 8px rgba(234, 88, 12, 0.4)',
              }}
            >
              <Flame size={13} className="spin-slow" />
              <span>{isCritical ? 'CRITICAL HEAT ALERT' : 'HEAT STRESS WARNING'}</span>
            </span>

            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#475569',
                background: '#F1F5F9',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid #CBD5E1',
              }}
            >
              {currentAlert.nodeId}
            </span>

            {/* Queue Counter Badge (Shows when multiple alerts are queued) */}
            {remainingInQueue > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '10px',
                  fontWeight: 800,
                  color: isCritical ? '#B91C1C' : '#C2410C',
                  background: isCritical ? '#FEF2F2' : '#FFF7ED',
                  border: `1px solid ${isCritical ? '#F87171' : '#FDBA74'}`,
                  padding: '2px 7px',
                  borderRadius: '10px',
                }}
                title={`${remainingInQueue} more dangerous alert(s) queued to show next`}
              >
                <Layers size={10} />
                <span>Alert 1 of {queue.length} (showing one by one)</span>
              </span>
            )}
          </div>

          <button
            onClick={handleDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '4px',
            }}
            title="Dismiss current alert"
          >
            <X size={16} />
          </button>
        </div>

        {/* Value Callout & Alert Type */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
            {currentAlert.alertType}
          </span>
          {currentAlert.value && (
            <span
              style={{
                fontSize: '15px',
                fontWeight: 900,
                color: accentColor,
                background: isCritical ? '#FEE2E2' : '#FEF3C7',
                padding: '1px 8px',
                borderRadius: '4px',
              }}
            >
              {currentAlert.value}
            </span>
          )}
        </div>

        {/* Message description */}
        <div
          style={{
            fontSize: '12px',
            color: '#334155',
            lineHeight: 1.5,
            marginBottom: '12px',
          }}
        >
          {currentAlert.message}
        </div>

        {/* ISO 7243 Action Protocol Pill */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            padding: '8px 10px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <ShieldAlert size={15} color={accentColor} style={{ flexShrink: 0 }} />
          <span style={{ color: '#475569', fontWeight: 600 }}>
            {isCritical
              ? 'OSHA Protocol: Mandatory outdoor work cessation & cooling shelters active.'
              : 'Protocol: 45 min work / 15 min shaded hydration break mandatory.'}
          </span>
        </div>

        {/* Footer buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleViewHistory}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-teal)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 0',
              textDecoration: 'underline',
            }}
            title="Open Alert History page"
          >
            <ExternalLink size={11} />
            <span>Alert History</span>
          </button>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={handleDismiss}
              className="btn btn-outline btn-sm"
              style={{ fontSize: '11px', padding: '3px 8px' }}
              title={remainingInQueue > 0 ? 'Skip to next alert' : 'Dismiss'}
            >
              {remainingInQueue > 0 ? 'Next' : 'Dismiss'}
            </button>
            <button
              onClick={handleAcknowledge}
              disabled={acknowledging}
              className="btn btn-primary btn-sm"
              style={{
                fontSize: '11px',
                padding: '3px 10px',
                background: isCritical ? '#DC2626' : 'var(--accent-teal)',
                borderColor: isCritical ? '#DC2626' : 'var(--accent-teal)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 700,
              }}
            >
              <CheckCircle2 size={12} />
              <span>{acknowledging ? 'Saving...' : 'Acknowledge'}</span>
            </button>
          </div>
        </div>

        {/* Auto-dismiss countdown bar (4 seconds linear) */}
        <div
          key={`bar-${currentAlert._id}`}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '3px',
            background: isCritical ? '#DC2626' : '#EA580C',
            width: '100%',
            animation: 'shrinkWidth 4s linear forwards',
          }}
        />
        <style>{`
          @keyframes shrinkWidth {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>
      </div>
    </div>
  );
}
