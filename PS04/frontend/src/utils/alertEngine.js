// Intelligent High Alert Detection & Reconciliation Engine for Sustainable Facility AI

const STORAGE_KEY = 'facility_ai_alerts_store_v4';

// Legacy keys to purge completely so no stale dummy alerts leak into the UI
const LEGACY_STORAGE_KEYS = [
  'facility_ai_alerts_store',
  'facility_ai_alerts_store_v1',
  'facility_ai_alerts_store_v2',
  'facility_ai_alerts_store_v3',
];

// Keywords from old dummy / mock alerts to permanently filter out
const DUMMY_KEYWORDS = [
  'substation b',
  'chiller compressor',
  'central cafeteria',
  'east library',
  '23.8 kw',
  'substation safe max',
  'max recommended: <= 75%',
  'underground supply trunk',
  'robotic bin compaction',
  'academic & lecture',
  'hostel towers',
];

function isDummyAlert(alert) {
  if (!alert || typeof alert !== 'object') return true;
  // Alerts must have an id starting with 'live-'
  if (!alert.id || !alert.id.startsWith('live-')) return true;
  const text = `${alert.title || ''} ${alert.location || ''} ${alert.metric || ''} ${alert.value || ''} ${alert.threshold || ''} ${alert.recommendation || ''}`.toLowerCase();
  return DUMMY_KEYWORDS.some(kw => text.includes(kw));
}

function isWaterLineLeaking(val) {
  if (val === undefined || val === null) return false;
  return (
    val === false ||
    val === 'false' ||
    val === 0 ||
    val === '0' ||
    String(val).toLowerCase().includes('leak')
  );
}

// Extract live high-alert conditions strictly from current API telemetry snapshot
export function scanLiveHighAlerts(data) {
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) return [];
  const alerts = [];
  const now = data.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString();

  // 1. Water Leaks (val1, val2, and leakStatus)
  const val1Leaking = isWaterLineLeaking(data.val1);
  const val2Leaking = isWaterLineLeaking(data.val2);
  const mainLeaking = Boolean(data.leakStatus && String(data.leakStatus).toLowerCase() !== 'normal');

  if (val1Leaking) {
    alerts.push({
      id: 'live-water-leak-val1',
      system: 'water',
      systemLabel: 'Water Management',
      severity: 'CRITICAL',
      title: 'Acoustic Pipe Rupture / Leak Detected (val1)',
      metric: 'val1 Acoustic Line Sensor',
      value: 'Leak Detected',
      threshold: 'Normal',
      location: data.location ? `${data.location} — Line 1 (val1)` : 'Main Supply Pipeline (val1)',
      recommendation: 'Close Solenoid Valve 1 immediately to isolate Line 1 and stop water loss.',
      timestamp: now,
      status: 'active',
      solvedAt: null,
      cleared: false,
    });
  }

  if (val2Leaking) {
    alerts.push({
      id: 'live-water-leak-val2',
      system: 'water',
      systemLabel: 'Water Management',
      severity: 'CRITICAL',
      title: 'Acoustic Pipe Rupture / Leak Detected (val2)',
      metric: 'val2 Acoustic Line Sensor',
      value: 'Leak Detected',
      threshold: 'Normal',
      location: data.location ? `${data.location} — Line 2 (val2)` : 'Auxiliary Branch Pipeline (val2)',
      recommendation: 'Close Solenoid Valve 2 immediately to isolate Line 2 and stop water loss.',
      timestamp: now,
      status: 'active',
      solvedAt: null,
      cleared: false,
    });
  }

  if (!val1Leaking && !val2Leaking && mainLeaking) {
    alerts.push({
      id: 'live-water-leak-main',
      system: 'water',
      systemLabel: 'Water Management',
      severity: 'CRITICAL',
      title: 'Acoustic Pipe Rupture / Leak Detected',
      metric: 'Hydraulic Integrity',
      value: String(data.leakStatus),
      threshold: 'Normal',
      location: data.location || 'Main Water Supply Pipeline',
      recommendation: 'Isolate main solenoid valves and inspect hydraulic trunk immediately.',
      timestamp: now,
      status: 'active',
      solvedAt: null,
      cleared: false,
    });
  }

  // 2. Water High Flow Velocity (val1Flow, val2Flow, or combined flowRate)
  const rawFlow1 = data.val1Flow ?? data.flowRate1;
  const rawFlow2 = data.val2Flow ?? data.flowRate2;
  const val1Flow = rawFlow1 != null ? Number(rawFlow1) : 0;
  const val2Flow = rawFlow2 != null ? Number(rawFlow2) : 0;
  const totalFlow = (rawFlow1 != null || rawFlow2 != null)
    ? Number((val1Flow + val2Flow).toFixed(1))
    : Number(data.flowRate || 0);

  if (val1Flow > 20 || val2Flow > 20 || totalFlow > 25) {
    alerts.push({
      id: 'live-water-high-flow',
      system: 'water',
      systemLabel: 'Water Management',
      severity: totalFlow > 35 ? 'CRITICAL' : 'HIGH',
      title: 'High Water Line Flow Velocity Detected',
      metric: 'Hydraulic Flow Rate',
      value: `${totalFlow} L/m (val1: ${val1Flow}, val2: ${val2Flow})`,
      threshold: '≤ 25 L/m (Line Limit 35 L/m)',
      location: data.location || 'Campus Distribution Header',
      recommendation: 'Inspect downstream washroom solenoids and pressure regulators for line surge.',
      timestamp: now,
      status: 'active',
      solvedAt: null,
      cleared: false,
    });
  }

  // 3. Water Low Tank Storage (< 25% aligns with Water tab & Priority Engine)
  if (data.tankLevel != null && data.tankLevel < 25) {
    alerts.push({
      id: 'live-water-tank-low',
      system: 'water',
      systemLabel: 'Water Management',
      severity: data.tankLevel < 15 ? 'CRITICAL' : 'HIGH',
      title: 'Low Tank Water Storage Reserve',
      metric: 'Water Tank Level',
      value: `${data.tankLevel}%`,
      threshold: '≥ 25%',
      location: data.location || 'Main Campus Storage Reservoir',
      recommendation: 'Start replenishment pump and verify inlet valve to maintain reserve above 25%.',
      timestamp: now,
      status: 'active',
      solvedAt: null,
      cleared: false,
    });
  }

  // 4. Air Quality - High AQI
  if (data.aqi != null && data.aqi > 100) {
    alerts.push({
      id: 'live-air-aqi',
      system: 'air',
      systemLabel: 'Air Quality',
      severity: data.aqi > 150 ? 'CRITICAL' : 'HIGH',
      title: 'Elevated Atmospheric AQI Index Breach',
      metric: 'Air Quality Index (AQI)',
      value: `${data.aqi} AQI`,
      threshold: '≤ 100 AQI',
      location: data.location || 'Campus Ambient Air Sensors',
      recommendation: 'Limit outdoor exposure, keep windows sealed, and switch HVAC into recirculation filtration.',
      timestamp: now,
      status: 'active',
      solvedAt: null,
      cleared: false,
    });
  }

  // 5. Air Quality - PM2.5
  if (data.pm25 != null && data.pm25 > 50) {
    alerts.push({
      id: 'live-air-pm25',
      system: 'air',
      systemLabel: 'Air Quality',
      severity: data.pm25 > 90 ? 'CRITICAL' : 'HIGH',
      title: 'Elevated PM2.5 Particulate Concentration',
      metric: 'PM2.5 Particulate',
      value: `${data.pm25} µg/m³`,
      threshold: '≤ 50 µg/m³',
      location: data.location || 'Campus Ambient Air Sensors',
      recommendation: 'Engage HEPA filtration / extraction vents and inspect nearby dust or combustion sources.',
      timestamp: now,
      status: 'active',
      solvedAt: null,
      cleared: false,
    });
  }

  // 6. Air Quality - PM10
  if (data.pm10 != null && data.pm10 > 100) {
    alerts.push({
      id: 'live-air-pm10',
      system: 'air',
      systemLabel: 'Air Quality',
      severity: data.pm10 > 200 ? 'CRITICAL' : 'HIGH',
      title: 'Elevated PM10 Coarse Dust Concentration',
      metric: 'PM10 Particulate',
      value: `${data.pm10} µg/m³`,
      threshold: '≤ 100 µg/m³',
      location: data.location || 'Campus Ambient Air Sensors',
      recommendation: 'Inspect nearby road/construction dust and activate air scrubbers.',
      timestamp: now,
      status: 'active',
      solvedAt: null,
      cleared: false,
    });
  }

  // 7. Air Quality - Smoke
  if (data.smoke != null && data.smoke > 30) {
    alerts.push({
      id: 'live-air-smoke',
      system: 'air',
      systemLabel: 'Air Quality',
      severity: 'CRITICAL',
      title: 'Optical Smoke / Combustion Vapor Detected',
      metric: 'Smoke Sensor Concentration',
      value: `${data.smoke} ppm`,
      threshold: '≤ 30 ppm',
      location: data.location || 'Campus Air Safety Zone',
      recommendation: 'Dispatch immediate inspection for smoke, burning, or electrical insulation fault.',
      timestamp: now,
      status: 'active',
      solvedAt: null,
      cleared: false,
    });
  }

  // 8. Air Quality - Ammonia (NH3)
  if (data.nh3 != null && data.nh3 > 10) {
    alerts.push({
      id: 'live-air-nh3',
      system: 'air',
      systemLabel: 'Air Quality',
      severity: 'CRITICAL',
      title: 'Elevated Ammonia (NH3) Vapor Level',
      metric: 'Ammonia (NH3) Concentration',
      value: `${data.nh3} ppm`,
      threshold: '≤ 10 ppm',
      location: data.location || 'Utility & Sanitation Corridor',
      recommendation: 'Ventilate area immediately and run exhaust scrubbers.',
      timestamp: now,
      status: 'active',
      solvedAt: null,
      cleared: false,
    });
  }

  // 9. Energy - AC Mains Grid Offline
  const gridStatus = String(data.gridStatus || '').toUpperCase();
  if (gridStatus === 'OFFLINE' || gridStatus === 'OFF') {
    const acKw = data.acPower ?? 0;
    const dcKw = data.dcPower ?? data.livePower ?? 0;
    alerts.push({
      id: 'live-energy-grid-offline',
      system: 'energy',
      systemLabel: 'Energy',
      severity: 'HIGH',
      title: 'AC Mains Grid Supply Offline',
      metric: 'Grid Status & AC/DC Bus',
      value: `${gridStatus} • AC: ${acKw} kW | DC: ${dcKw} kW`,
      threshold: 'ONLINE',
      location: data.location || 'Main Electrical Substation',
      recommendation: 'Verify AC mains feeder breaker; sustain essential DC Solar PV & BESS bus loads.',
      timestamp: now,
      status: 'active',
      solvedAt: null,
      cleared: false,
    });
  }

  // 10. Energy - High Power Draw / Peak Demand (consistent with 45 kW Grid Ceiling in Energy tab)
  if ((data.livePower != null && data.livePower > 35) || (data.peakDemand != null && data.peakDemand > 40)) {
    const liveKw = data.livePower ?? 0;
    const peakKw = data.peakDemand ?? 0;
    const isCritical = liveKw > 45 || peakKw > 45;
    alerts.push({
      id: 'live-energy-power',
      system: 'energy',
      systemLabel: 'Energy',
      severity: isCritical ? 'CRITICAL' : 'HIGH',
      title: 'Electrical Demand Approaching Grid Ceiling',
      metric: 'Live Draw / Peak Demand',
      value: `${liveKw} kW (Peak: ${peakKw} kW)`,
      threshold: '≤ 35.0 kW (Ceiling: 45 kW)',
      location: data.location || 'Main Substation Transformer Feed',
      recommendation: 'Shift non-critical HVAC and pumping loads onto DC Solar/BESS or off-peak windows.',
      timestamp: now,
      status: 'active',
      solvedAt: null,
      cleared: false,
    });
  }

  // 11. Waste - Block-wise Dry & Wet Overflow (Block A & Block B only)
  const allowedWasteBlocks = Array.isArray(data.wasteBlocks)
    ? data.wasteBlocks.filter(
        b => b && (b.id === 'block-a' || b.id === 'block-b' || b.code === 'BL-A' || b.code === 'BL-B')
      )
    : [];

  if (allowedWasteBlocks.length > 0) {
    for (const block of allowedWasteBlocks) {
      const isBlockA = block.id === 'block-a' || block.code === 'BL-A';
      const blockName = isBlockA ? 'Block A' : 'Block B';
      const blockCode = block.code || (isBlockA ? 'BL-A' : 'BL-B');
      const wetFill = Number(block.wetFill ?? 0);
      const dryFill = Number(block.dryFill ?? 0);

      if (wetFill > 80) {
        alerts.push({
          id: `live-waste-wet-${blockCode.toLowerCase()}`,
          system: 'waste',
          systemLabel: 'Waste',
          severity: wetFill > 90 ? 'CRITICAL' : 'HIGH',
          title: `${blockName} Wet Waste Bin Overflow Risk`,
          metric: 'Wet Organic Sonar Fill',
          value: `${wetFill}% Fill (${block.wetWeight ?? 0} kg)`,
          threshold: '≤ 80% Fill',
          location: `${blockName} (${blockCode})`,
          recommendation: `Dispatch sanitation collection to ${blockName} organic bin to prevent overflow and odor.`,
          timestamp: now,
          status: 'active',
          solvedAt: null,
          cleared: false,
        });
      }

      if (dryFill > 80) {
        alerts.push({
          id: `live-waste-dry-${blockCode.toLowerCase()}`,
          system: 'waste',
          systemLabel: 'Waste',
          severity: dryFill > 90 ? 'CRITICAL' : 'HIGH',
          title: `${blockName} Dry Waste Bin Overflow Risk`,
          metric: 'Dry Recyclables Sonar Fill',
          value: `${dryFill}% Fill (${block.dryWeight ?? 0} kg)`,
          threshold: '≤ 80% Fill',
          location: `${blockName} (${blockCode})`,
          recommendation: `Dispatch recycling collection crew to ${blockName} dry waste container.`,
          timestamp: now,
          status: 'active',
          solvedAt: null,
          cleared: false,
        });
      }
    }
  } else {
    if (data.wasteWetFill != null && data.wasteWetFill > 80) {
      alerts.push({
        id: 'live-waste-wet-scalar',
        system: 'waste',
        systemLabel: 'Waste',
        severity: 'HIGH',
        title: 'Block A Wet Waste Bin Overflow Risk',
        metric: 'Wet Organic Sonar Fill',
        value: `${data.wasteWetFill}% Fill (${data.wasteWet ?? 0} kg)`,
        threshold: '≤ 80% Fill',
        location: 'Block A (BL-A)',
        recommendation: 'Dispatch sanitation crew to empty Block A wet waste bin.',
        timestamp: now,
        status: 'active',
        solvedAt: null,
        cleared: false,
      });
    }
    if (data.wasteDryFill != null && data.wasteDryFill > 80) {
      alerts.push({
        id: 'live-waste-dry-scalar',
        system: 'waste',
        systemLabel: 'Waste',
        severity: 'HIGH',
        title: 'Block B Dry Waste Bin Overflow Risk',
        metric: 'Dry Recyclables Sonar Fill',
        value: `${data.wasteDryFill}% Fill (${data.wasteDry ?? 0} kg)`,
        threshold: '≤ 80% Fill',
        location: 'Block B (BL-B)',
        recommendation: 'Dispatch sanitation crew to empty Block B dry waste bin.',
        timestamp: now,
        status: 'active',
        solvedAt: null,
        cleared: false,
      });
    }
    if ((data.overflowRisk != null && data.overflowRisk > 0) || (data.averageFill != null && data.averageFill > 80)) {
      alerts.push({
        id: 'live-waste-overflow',
        system: 'waste',
        systemLabel: 'Waste',
        severity: 'HIGH',
        title: 'Smart Waste Bin Overfill Warning',
        metric: 'Volumetric Sonar Fill',
        value: data.overflowRisk ? `${data.overflowRisk} Bin(s) at Risk` : `${data.averageFill}% Avg`,
        threshold: '≤ 80% Fill',
        location: data.location || 'Campus Waste Blocks',
        recommendation: 'Trigger route dispatch notice to campus sanitation collection.',
        timestamp: now,
        status: 'active',
        solvedAt: null,
        cleared: false,
      });
    }
  }

  // 12. Parking - Plaza Saturation
  if (data.parkingOccupancy != null && data.parkingOccupancy > 85) {
    alerts.push({
      id: 'live-parking-saturation',
      system: 'digitaltwin',
      systemLabel: 'Digital Twin & Parking',
      severity: 'HIGH',
      title: 'Smart Parking Plaza Nearing Saturation',
      metric: 'Bay Occupancy',
      value: `${data.parkingOccupancy}% Occupied (${data.occupiedSlots}/${data.totalSlots} Bays)`,
      threshold: '≤ 85% Capacity',
      location: data.location || 'Main Campus Parking Plaza',
      recommendation: 'Direct incoming vehicles at Gate 1 to alternate overflow bays.',
      timestamp: now,
      status: 'active',
      solvedAt: null,
      cleared: false,
    });
  }

  return alerts;
}

// Load persisted alerts from localStorage and reconcile with live sensor telemetry
export function loadPersistedAlerts(liveData = null) {
  // Purge legacy storage keys so old mock alerts are wiped forever
  try {
    for (const k of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(k);
    }
  } catch {}

  let stored = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        stored = parsed.filter(a => !isDummyAlert(a));
      }
    }
  } catch (err) {
    console.error('Failed to parse alerts from storage:', err);
  }

  if (liveData && typeof liveData === 'object' && Object.keys(liveData).length > 0) {
    const liveAlerts = scanLiveHighAlerts(liveData);
    const liveById = new Map(liveAlerts.map(a => [a.id, a]));
    const resolvedAt = new Date().toISOString();

    // Update existing alerts & auto-resolve conditions that returned to safe levels
    stored = stored
      .filter(a => !isDummyAlert(a))
      .map(existing => {
        const liveMatch = liveById.get(existing.id);
        if (liveMatch) {
          const shouldReactivate = existing.autoResolved && !existing.manualSolved;
          return {
            ...existing,
            title: liveMatch.title,
            severity: liveMatch.severity,
            metric: liveMatch.metric,
            value: liveMatch.value,
            threshold: liveMatch.threshold,
            location: liveMatch.location,
            recommendation: liveMatch.recommendation,
            timestamp: liveMatch.timestamp,
            status: shouldReactivate ? 'active' : existing.status,
            solvedAt: shouldReactivate ? null : existing.solvedAt,
            autoResolved: shouldReactivate ? false : existing.autoResolved,
          };
        }

        // Live telemetry is back to normal for this condition -> mark resolved automatically
        if (existing.id?.startsWith('live-') && existing.status !== 'solved') {
          return {
            ...existing,
            status: 'solved',
            solvedAt: existing.solvedAt || resolvedAt,
            autoResolved: true,
          };
        }

        return existing;
      });

    // Prepend newly detected live alerts
    const newOnes = liveAlerts.filter(la => !stored.some(s => s.id === la.id));
    if (newOnes.length > 0) {
      stored = [...newOnes, ...stored];
    }
  }

  saveAlerts(stored);
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

// Mark an alert as solved (or reopen) manually
export function markAlertSolved(alertList, id) {
  const updated = alertList.map(a => {
    if (a.id === id) {
      const isAlreadySolved = a.status === 'solved';
      return {
        ...a,
        status: isAlreadySolved ? 'active' : 'solved',
        solvedAt: isAlreadySolved ? null : new Date().toISOString(),
        manualSolved: !isAlreadySolved,
        autoResolved: false,
      };
    }
    return a;
  });
  saveAlerts(updated);
  return updated;
}

// Clear an alert
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
    manualSolved: true,
    autoResolved: false,
  }));
  saveAlerts(updated);
  return updated;
}

// Clear all alerts
export function clearAllAlerts() {
  saveAlerts([]);
  return [];
}

// Re-scan strictly from live telemetry (zero fake baseline data)
export function resetDefaultAlerts(liveData = null) {
  const fresh = liveData ? scanLiveHighAlerts(liveData) : [];
  saveAlerts(fresh);
  return fresh;
}

// Count how many alerts are currently active and unresolved
export function countActiveAlerts(alertList) {
  if (!Array.isArray(alertList)) return 0;
  return alertList.filter(a => !a.cleared && a.status !== 'solved').length;
}
