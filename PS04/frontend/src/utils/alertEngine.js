// Intelligent High Alert Detection & Persistence Engine for Sustainable Facility AI

const STORAGE_KEY = 'facility_ai_alerts_store_v1';

// Initial realistic high-alert incident history across all tabs
const BASELINE_HIGH_ALERTS = [
  {
    id: 'alert-water-pipe-leak',
    system: 'water',
    systemLabel: 'Water Management',
    severity: 'CRITICAL',
    title: 'Acoustic Pipe Rupture & Water Leak Detected',
    metric: 'Hydraulic Integrity',
    value: 'Leak Detected',
    threshold: 'Normal Acoustic Wave',
    location: 'Underground Supply Trunk — Substation B',
    recommendation: 'Actuate Solenoid Valve 1 to isolate ruptured pipe segment and prevent campus water loss.',
    timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(), // 14 mins ago
    status: 'active', // 'active' | 'solved'
    solvedAt: null,
    cleared: false,
  },
  {
    id: 'alert-air-aqi-hazard',
    system: 'air',
    systemLabel: 'Air Quality',
    severity: 'CRITICAL',
    title: 'Severe AQI Degradation & Toxic Particulate Spike',
    metric: 'Air Quality Index (AQI)',
    value: '148 AQI • PM2.5: 58 µg/m³',
    threshold: 'Safe Ceiling: ≤ 100 AQI',
    location: 'Science Quad & Chemistry Exhaust Stack',
    recommendation: 'Engage active HEPA air scrubbers and notify laboratory staff to seal ventilation dampers.',
    timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(), // 32 mins ago
    status: 'active',
    solvedAt: null,
    cleared: false,
  },
  {
    id: 'alert-energy-peak-surge',
    system: 'energy',
    systemLabel: 'Energy',
    severity: 'HIGH',
    title: 'Peak Electrical Demand Spikes Above Grid Ceiling',
    metric: 'Live Grid Power Draw',
    value: '23.8 kW (88% of Peak)',
    threshold: 'Substation Safe Max: ≤ 20.0 kW',
    location: 'Main Substation #1 — Chiller Compressor Line',
    recommendation: 'Activate dynamic load shedding on secondary HVAC chillers to avert power tariff penalties.',
    timestamp: new Date(Date.now() - 58 * 60 * 1000).toISOString(), // 58 mins ago
    status: 'active',
    solvedAt: null,
    cleared: false,
  },
  {
    id: 'alert-waste-bin-overflow',
    system: 'waste',
    systemLabel: 'Waste',
    severity: 'HIGH',
    title: 'Smart Waste Bin Volumetric Overflow Emergency',
    metric: 'Sonar Fill Level',
    value: '89% Fill • 2 Bins at Overflow Risk',
    threshold: 'Max Recommended: ≤ 75% Fill',
    location: 'Central Cafeteria & East Library Quad',
    recommendation: 'Dispatch campus waste collection crew for automated robotic bin compaction and pickup.',
    timestamp: new Date(Date.now() - 95 * 60 * 1000).toISOString(), // 1.5 hrs ago
    status: 'active',
    solvedAt: null,
    cleared: false,
  },
  {
    id: 'alert-air-nh3-ammonia',
    system: 'air',
    systemLabel: 'Air Quality',
    severity: 'CRITICAL',
    title: 'Toxic Ammonia (NH3) Vapor Accumulation',
    metric: 'Ammonia Concentration',
    value: '18 ppm NH3',
    threshold: 'Permissible Limit: ≤ 10 ppm',
    location: 'Hazardous Waste Processing & Sewage Bay',
    recommendation: 'Evacuate utility personnel from basement corridor and run emergency scrubber exhaust.',
    timestamp: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
    status: 'active',
    solvedAt: null,
    cleared: false,
  },
  {
    id: 'alert-water-low-tank',
    system: 'water',
    systemLabel: 'Water Management',
    severity: 'HIGH',
    title: 'Critical Low Water Reservoir Storage Warning',
    metric: 'Tank Storage Level',
    value: '19% Capacity',
    threshold: 'Minimum Safety Reserve: ≥ 30%',
    location: 'Hostel Block C Overhead Reservoir',
    recommendation: 'Engage auxiliary submersible booster pump to replenish drinking supply.',
    timestamp: new Date(Date.now() - 210 * 60 * 1000).toISOString(),
    status: 'active',
    solvedAt: null,
    cleared: false,
  },
];

// Helper to extract live high alert items from current API data snapshot
export function scanLiveHighAlerts(data) {
  if (!data || typeof data !== 'object') return [];
  const alerts = [];
  const now = new Date().toISOString();

  // 1. Water Leaks
  if (data.leakStatus && data.leakStatus !== 'Normal') {
    alerts.push({
      id: `live-water-leak-${data.timestamp ? new Date(data.timestamp).getTime() : 'active'}`,
      system: 'water',
      systemLabel: 'Water Management',
      severity: 'CRITICAL',
      title: 'Acoustic Pipe Rupture / Leak Detected',
      metric: 'Hydraulic Integrity',
      value: String(data.leakStatus),
      threshold: 'Normal Flow',
      location: data.location || 'Underground Main Pipeline',
      recommendation: 'Close Solenoid Valve 1 immediately to isolate ruptured line.',
      timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : now,
      status: 'active',
      solvedAt: null,
      cleared: false,
    });
  }

  // 2. Air Quality - High AQI
  if (data.aqi != null && data.aqi > 100) {
    alerts.push({
      id: `live-air-aqi-${Math.round(data.aqi)}`,
      system: 'air',
      systemLabel: 'Air Quality',
      severity: data.aqi > 150 ? 'CRITICAL' : 'HIGH',
      title: 'Elevated Atmospheric AQI Index Breach',
      metric: 'Air Quality Index',
      value: `${data.aqi} AQI`,
      threshold: '≤ 100 AQI',
      location: 'Science Quad Ambient Sensors',
      recommendation: 'Direct HVAC fresh-air intake scrubbers into high-efficiency recirculation mode.',
      timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : now,
      status: 'active',
      solvedAt: null,
      cleared: false,
    });
  }

  // 3. Air Quality - PM2.5
  if (data.pm25 != null && data.pm25 > 50) {
    alerts.push({
      id: `live-air-pm25-${Math.round(data.pm25)}`,
      system: 'air',
      systemLabel: 'Air Quality',
      severity: 'HIGH',
      title: 'Hazardous PM2.5 Respirable Dust Infiltration',
      metric: 'PM2.5 Particulate',
      value: `${data.pm25} µg/m³`,
      threshold: '≤ 25 µg/m³',
      location: 'Mechanical Workshop East Bay',
      recommendation: 'Engage secondary extraction vents and restrict outdoor athletic activities.',
      timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : now,
      status: 'active',
      solvedAt: null,
      cleared: false,
    });
  }

  // 4. Air Quality - Toxic Smoke or NH3
  if (data.smoke != null && data.smoke > 30) {
    alerts.push({
      id: `live-air-smoke-${Math.round(data.smoke)}`,
      system: 'air',
      systemLabel: 'Air Quality',
      severity: 'CRITICAL',
      title: 'Optical Smoke / Combustion Vapor Detected',
      metric: 'Smoke Sensor Optical Density',
      value: `${data.smoke} ppm`,
      threshold: '≤ 20 ppm',
      location: 'Utility Service Tunnel & Boiler Bay',
      recommendation: 'Dispatch immediate physical inspection for smoldering electrical insulation.',
      timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : now,
      status: 'active',
      solvedAt: null,
      cleared: false,
    });
  }

  // 5. Energy - High Power Draw
  if (data.livePower != null && data.livePower > 22) {
    alerts.push({
      id: `live-energy-power-${Math.round(data.livePower)}`,
      system: 'energy',
      systemLabel: 'Energy',
      severity: 'HIGH',
      title: 'Grid Power Surge Exceeds Substation Headroom',
      metric: 'Live Draw',
      value: `${data.livePower} kW`,
      threshold: '≤ 20.0 kW',
      location: 'Main Substation #1 Transformer Feed',
      recommendation: 'Shift non-critical water pumping schedules outside peak grid tariff window.',
      timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : now,
      status: 'active',
      solvedAt: null,
      cleared: false,
    });
  }

  // 6. Water - Tank Depletion or Overflow
  if (data.tankLevel != null && data.tankLevel < 20) {
    alerts.push({
      id: `live-water-tank-low-${Math.round(data.tankLevel)}`,
      system: 'water',
      systemLabel: 'Water Management',
      severity: 'HIGH',
      title: 'Critical Low Tank Water Storage',
      metric: 'Water Tank Level',
      value: `${data.tankLevel}%`,
      threshold: '≥ 25%',
      location: 'Main Campus Storage Reservoir',
      recommendation: 'Run supply replenishment pump to safeguard against dry-run motor burnout.',
      timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : now,
      status: 'active',
      solvedAt: null,
      cleared: false,
    });
  }

  // 7. Waste - Overflow Risk
  if ((data.overflowRisk != null && data.overflowRisk > 0) || (data.averageFill != null && data.averageFill > 80)) {
    alerts.push({
      id: `live-waste-overflow-${data.overflowRisk || data.averageFill}`,
      system: 'waste',
      systemLabel: 'Waste',
      severity: 'HIGH',
      title: 'Smart Waste Bin Overfill Warning',
      metric: 'Volumetric Sonar Fill',
      value: data.overflowRisk ? `${data.overflowRisk} Bins at Risk` : `${data.averageFill}% Avg`,
      threshold: '≤ 75%',
      location: 'Campus Courtyard & Dining Facilities',
      recommendation: 'Trigger route optimization notice to facility waste logistics truck.',
      timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : now,
      status: 'active',
      solvedAt: null,
      cleared: false,
    });
  }

  return alerts;
}

// Load persisted alerts from localStorage, merged with baseline and live detected alerts
export function loadPersistedAlerts(liveData = null) {
  let stored = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      stored = JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to parse alerts from storage:', err);
  }

  // If storage is completely empty, initialize with default baseline alerts
  if (!Array.isArray(stored) || stored.length === 0) {
    stored = [...BASELINE_HIGH_ALERTS];
  }

  // Scan live sensor snapshot for any active high-threshold conditions
  if (liveData) {
    const liveAlerts = scanLiveHighAlerts(liveData);
    for (const la of liveAlerts) {
      const existingIdx = stored.findIndex(a => a.id === la.id);
      if (existingIdx === -1) {
        // Prepend new live alert
        stored.unshift(la);
      } else {
        // Update metric values while preserving solved / cleared user actions
        stored[existingIdx] = {
          ...stored[existingIdx],
          value: la.value,
          metric: la.metric,
          timestamp: la.timestamp,
        };
      }
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (err) {
    console.error(err);
  }

  return stored;
}

// Persist the entire alert list to localStorage
export function saveAlerts(alerts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch (err) {
    console.error('Failed to save alerts:', err);
  }
}

// Mark an alert as solved
export function markAlertSolved(alertList, id) {
  const updated = alertList.map(a => {
    if (a.id === id) {
      const isAlreadySolved = a.status === 'solved';
      return {
        ...a,
        status: isAlreadySolved ? 'active' : 'solved',
        solvedAt: isAlreadySolved ? null : new Date().toISOString(),
      };
    }
    return a;
  });
  saveAlerts(updated);
  return updated;
}

// Clear an alert (remove or mark cleared)
export function clearAlert(alertList, id) {
  const updated = alertList.filter(a => a.id !== id);
  saveAlerts(updated);
  return updated;
}

// Mark all active alerts as solved
export function markAllAlertsSolved(alertList) {
  const now = new Date().toISOString();
  const updated = alertList.map(a => ({
    ...a,
    status: 'solved',
    solvedAt: a.solvedAt || now,
  }));
  saveAlerts(updated);
  return updated;
}

// Clear all alerts
export function clearAllAlerts() {
  saveAlerts([]);
  return [];
}

// Reset alerts back to default baseline
export function resetDefaultAlerts(liveData = null) {
  const fresh = [...BASELINE_HIGH_ALERTS];
  if (liveData) {
    const liveAlerts = scanLiveHighAlerts(liveData);
    for (const la of liveAlerts) {
      if (!fresh.some(f => f.id === la.id)) {
        fresh.unshift(la);
      }
    }
  }
  saveAlerts(fresh);
  return fresh;
}

// Count how many alerts are currently active and unresolved
export function countActiveAlerts(alertList) {
  if (!Array.isArray(alertList)) return 0;
  return alertList.filter(a => !a.cleared && a.status !== 'solved').length;
}
