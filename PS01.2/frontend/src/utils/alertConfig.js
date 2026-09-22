/**
 * Centralized Environmental Alert Configuration for AirSense IoT
 * Thresholds, Human-friendly messages, recommendations, and evaluation logic
 */

export const ALERT_POPUP_DURATION = 4000; // 4 seconds popup display time

export const SENSOR_THRESHOLDS = {
  temperature: {
    warning: 35,
    critical: 38,
    recovery: 32,
    unit: '°C',
    name: 'Temperature',
    icon: '🌡️',
    warningTitle: 'High Temperature',
    criticalTitle: 'CRITICAL HIGH TEMPERATURE',
    message: 'High temperature detected outside.',
    recommendedActions: [
      'Turn ON AC',
      'Turn ON Cooler/Fan',
    ],
  },

  humidity: {
    warning: 60,
    critical: 70,
    recovery: 55,
    unit: '%RH',
    name: 'Humidity',
    icon: '💧',
    warningTitle: 'High Humidity',
    criticalTitle: 'CRITICAL HIGH HUMIDITY',
    message: 'High humidity detected.',
    recommendedActions: [
      'Turn ON Fan',
      'Increase ventilation',
      'Use AC/dehumidification',
    ],
  },

  pm25: {
    warning: 35.4,
    critical: 55.4,
    recovery: 35,
    unit: 'µg/m³',
    name: 'PM2.5',
    icon: '🌫️',
    warningTitle: 'High PM2.5',
    criticalTitle: 'CRITICAL PM2.5 POLLUTION',
    message: 'Poor particulate air quality detected.',
    recommendedActions: [
      'Close windows',
      'Turn ON Air Purifier',
    ],
  },

  pm10: {
    warning: 154,
    critical: 254,
    recovery: 150,
    unit: 'µg/m³',
    name: 'PM10',
    icon: '🌫️',
    warningTitle: 'High PM10',
    criticalTitle: 'CRITICAL PM10 POLLUTION',
    message: 'High particulate pollution detected.',
    recommendedActions: [
      'Close windows',
      'Turn ON Air Purifier',
    ],
  },

  co2: {
    warning: 1000,
    critical: 2000,
    recovery: 900,
    unit: 'ppm',
    name: 'CO₂',
    icon: '🫁',
    warningTitle: 'High CO₂',
    criticalTitle: 'CRITICAL HIGH CO₂',
    message: 'High CO₂ concentration detected.',
    recommendedActions: [
      'Increase fresh-air ventilation',
      'Open windows if outdoor air quality is acceptable',
    ],
  },

  co: {
    warning: 9,
    critical: 35,
    recovery: 4,
    unit: 'ppm',
    name: 'Carbon Monoxide',
    icon: '☠️',
    warningTitle: 'Elevated CO',
    criticalTitle: 'CRITICAL CO DETECTED',
    message: 'Dangerous carbon monoxide level detected.',
    recommendedActions: [
      '🚨 Increase ventilation immediately',
      '🚪 Move people away from the affected area',
      '⚠️ Activate emergency safety procedure',
    ],
  },

  no2: {
    warning: 100,
    critical: 200,
    recovery: 80,
    unit: 'ppb',
    name: 'Nitrogen Dioxide',
    icon: '⚠️',
    warningTitle: 'High NO₂',
    criticalTitle: 'CRITICAL NO₂ CONCENTRATION',
    message: 'High nitrogen dioxide concentration detected.',
    recommendedActions: [
      'Increase ventilation',
      'Check combustion sources',
    ],
  },

  so2: {
    warning: 75,
    critical: 185,
    recovery: 60,
    unit: 'ppb',
    name: 'Sulfur Dioxide',
    icon: '⚠️',
    warningTitle: 'High SO₂',
    criticalTitle: 'CRITICAL SO₂ CONCENTRATION',
    message: 'High sulfur dioxide concentration detected.',
    recommendedActions: [
      'Increase ventilation',
      'Move away from pollution source',
    ],
  },

  o3: {
    warning: 70,
    critical: 85,
    recovery: 60,
    unit: 'ppb',
    name: 'Ozone',
    icon: '🟠',
    warningTitle: 'High O₃',
    criticalTitle: 'CRITICAL OZONE LEVEL',
    message: 'High ozone concentration detected.',
    recommendedActions: [
      'Reduce outdoor exposure',
      'Use air filtration',
    ],
  },

  voc: {
    warning: 200,
    critical: 500,
    recovery: 180,
    unit: 'ppb',
    name: 'VOC',
    icon: '🧪',
    warningTitle: 'High VOC',
    criticalTitle: 'CRITICAL VOC LEVEL',
    message: 'High VOC concentration detected.',
    recommendedActions: [
      'Increase ventilation',
      'Check chemical/solvent sources',
    ],
  },

  nh3: {
    warning: 25,
    critical: 50,
    recovery: 20,
    unit: 'ppm',
    name: 'NH₃ (Ammonia)',
    icon: '⚗️',
    warningTitle: 'High NH₃ (Ammonia)',
    criticalTitle: 'CRITICAL NH₃ LEVEL',
    message: 'High ammonia concentration detected in the area.',
    recommendedActions: [
      'Increase fresh air ventilation immediately',
      'Check refrigeration or chemical ammonia sources',
      'Wear respiratory protection if entering room',
    ],
  },

  smoke: {
    warning: 200,
    critical: 500,
    recovery: 150,
    unit: 'raw',
    name: 'Smoke',
    icon: '🔥',
    warningTitle: 'SMOKE DETECTED',
    criticalTitle: 'CRITICAL SMOKE ALARM',
    message: 'Smoke detected in the monitored area.',
    recommendedActions: [
      '🚨 Check for fire',
      '🚪 Move people to a safe location',
      '📞 Activate emergency response if required',
    ],
  },
};

/**
 * Helper to format duration between two timestamps into human-readable string (e.g., "5m 14s")
 */
export function formatDuration(ms) {
  if (!ms || ms < 0) return '0s';
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Formats a localized time string from an ISO string or Date
 */
export function formatAlertTime(timestamp) {
  try {
    const d = timestamp ? new Date(timestamp) : new Date();
    return d.toLocaleTimeString('en-IN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return new Date().toLocaleTimeString();
  }
}

/**
 * Evaluates an incoming telemetry reading across all sensors for a specific node
 *
 * @param {Object} reading - Raw reading object from new_reading event
 * @param {String} nodeName - Display name of the source node
 * @param {Object} currentActiveAlerts - Current active alerts map { alertKey: alertObj }
 *
 * @returns {Object} {
 *   popupsToTrigger: Array<Alert>,
 *   updatedActiveAlerts: Object,
 *   resolvedAlerts: Array<Alert>
 * }
 */
export function evaluateReadingAlerts(reading, nodeName, currentActiveAlerts = {}) {
  if (!reading || !reading.nodeId) {
    return { popupsToTrigger: [], updatedActiveAlerts: { ...currentActiveAlerts }, resolvedAlerts: [] };
  }

  const cleanNodeId = String(reading.nodeId).toUpperCase().trim();
  const displayName = nodeName || cleanNodeId;
  const readingTimestamp = reading.timestamp || new Date().toISOString();

  const popupsToTrigger = [];
  const resolvedAlerts = [];
  const updatedActive = { ...currentActiveAlerts };

  // Iterate all configured sensors
  Object.entries(SENSOR_THRESHOLDS).forEach(([sensorKey, cfg]) => {
    let rawVal = reading[sensorKey];
    if (rawVal && typeof rawVal === 'object' && rawVal.value !== undefined) {
      rawVal = rawVal.value;
    }

    // Skip if sensor value is null, undefined, or not a number
    if (rawVal === null || rawVal === undefined || rawVal === '' || isNaN(Number(rawVal))) {
      return;
    }

    const value = Number(rawVal);
    const alertKey = `${cleanNodeId}-${sensorKey}`;
    const existingAlert = updatedActive[alertKey];
    const previousSeverity = existingAlert ? existingAlert.severity : 'normal';

    // Determine new severity
    const effectiveRecovery = Math.min(cfg.recovery, cfg.warning);
    let newSeverity = 'normal';

    // Check critical thresholds (high and low if applicable)
    if (value >= cfg.critical || (cfg.criticalLow !== undefined && value <= cfg.criticalLow)) {
      newSeverity = 'critical';
    } else if (value >= cfg.warning || (cfg.warningLow !== undefined && value <= cfg.warningLow)) {
      newSeverity = 'warning';
    } else if (value > effectiveRecovery && previousSeverity !== 'normal') {
      // Retain previous severity within hysteresis band
      newSeverity = previousSeverity;
    } else {
      newSeverity = 'normal';
    }

    // ── CASE 1: Danger or Warning Detected (Active Alert) ──
    if (newSeverity !== 'normal') {
      const isCritical = newSeverity === 'critical';
      const threshold = isCritical ? cfg.critical : cfg.warning;
      const title = isCritical ? cfg.criticalTitle : cfg.warningTitle;

      const alertObj = {
        id: alertKey,
        nodeId: cleanNodeId,
        nodeName: displayName,
        sensor: sensorKey,
        sensorName: cfg.name,
        sensorIcon: cfg.icon,
        title,
        value,
        threshold,
        unit: cfg.unit,
        severity: newSeverity, // 'warning' | 'critical'
        status: 'active',
        message: cfg.message,
        recommendedActions: cfg.recommendedActions,
        timestamp: readingTimestamp,
        startedAt: existingAlert?.startedAt || readingTimestamp,
        peakValue: Math.max(existingAlert?.peakValue || value, value),
      };

      updatedActive[alertKey] = alertObj;
      // Always trigger popup when dangerous sensor data arrives
      popupsToTrigger.push(alertObj);
    }
    // ── CASE 2: Recovery back to normal ──
    else if (newSeverity === 'normal' && existingAlert) {
      const resolvedAt = readingTimestamp;
      const startTime = new Date(existingAlert.startedAt).getTime();
      const endTime = new Date(resolvedAt).getTime();
      const durationMs = Math.max(0, endTime - startTime);

      const resolvedObj = {
        ...existingAlert,
        status: 'resolved',
        resolvedAt,
        durationMs,
        duration: formatDuration(durationMs),
        finalValue: value,
      };

      delete updatedActive[alertKey];
      resolvedAlerts.push(resolvedObj);
    }
  });

  return {
    popupsToTrigger,
    updatedActiveAlerts: updatedActive,
    resolvedAlerts,
  };
}
