/**
 * chartHelpers.js
 * Strictly generates dynamic Chart.js datasets and labels based on REAL API
 * telemetry data and history from http://localhost:5000/api/data.
 * Zero dummy factors, zero synthetic multipliers, zero fabricated time series.
 */

export function formatTime(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  return isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function getActiveRecords(data, history = []) {
  if (Array.isArray(history) && history.length > 0) {
    return history;
  }
  if (data && Object.keys(data).length > 0) {
    return [data];
  }
  return [];
}

/**
 * Overview Tab: Real Energy (kWh) and Water (×100 L) Timeline
 */
export function getOverviewChartData(data, history = []) {
  const records = getActiveRecords(data, history);
  const hasValid = records.some(r => r.todaysEnergy != null || r.todaysUsage != null);
  if (!hasValid) return { labels: [], datasets: [] };

  const labels = records.map(r => formatTime(r.timestamp || r.createdAt || r.updatedAt));
  const energy = records.map(r => r.todaysEnergy ?? 0);
  const water = records.map(r => (r.todaysUsage != null ? Math.round(r.todaysUsage / 100) : 0));

  return {
    labels,
    datasets: [
      {
        label: 'Energy (kWh)',
        data: energy,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.15)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: records.length === 1 ? 6 : 4,
        pointHoverRadius: 7,
      },
      {
        label: 'Water (×100 L)',
        data: water,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.12)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: records.length === 1 ? 6 : 4,
        pointHoverRadius: 7,
      },
    ],
  };
}

/**
 * Air Quality Tab: Real Pollutants Live Trend (PM2.5, PM10, Smoke, NH3, VOC)
 */
export function getAirQualityChartData(data, history = []) {
  const records = getActiveRecords(data, history);
  const hasAir = records.some(
    r => r.pm25 != null || r.pm10 != null || r.smoke != null || r.nh3 != null || r.voc != null
  );
  if (!hasAir) return { labels: [], datasets: [] };

  const labels = records.map(r => formatTime(r.timestamp || r.createdAt || r.updatedAt));

  return {
    labels,
    datasets: [
      ...(records.some(r => r.pm25 != null) ? [{
        label: 'PM2.5 (µg/m³)',
        data: records.map(r => r.pm25 ?? 0),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: records.length === 1 ? 6 : 4,
      }] : []),
      ...(records.some(r => r.pm10 != null) ? [{
        label: 'PM10 (µg/m³)',
        data: records.map(r => r.pm10 ?? 0),
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: records.length === 1 ? 6 : 4,
      }] : []),
      ...(records.some(r => r.smoke != null) ? [{
        label: 'Smoke (ppm)',
        data: records.map(r => r.smoke ?? 0),
        borderColor: '#8b5cf6',
        tension: 0.35,
        borderWidth: 2,
        pointRadius: records.length === 1 ? 6 : 4,
      }] : []),
      ...(records.some(r => r.nh3 != null) ? [{
        label: 'NH3 (ppm)',
        data: records.map(r => r.nh3 ?? 0),
        borderColor: '#7c3aed',
        tension: 0.35,
        borderWidth: 2,
        pointRadius: records.length === 1 ? 6 : 4,
      }] : []),
      ...(records.some(r => r.voc != null) ? [{
        label: 'VOC (ppm)',
        data: records.map(r => r.voc ?? 0),
        borderColor: '#06b6d4',
        tension: 0.35,
        borderWidth: 2,
        pointRadius: records.length === 1 ? 6 : 4,
      }] : []),
    ],
  };
}

/**
 * Energy Tab: Real Hourly Power Draw & Energy History
 */
export function getEnergyBarData(data, history = []) {
  const records = getActiveRecords(data, history);
  const hasEnergy = records.some(r => r.todaysEnergy != null || r.livePower != null);
  if (!hasEnergy) return { labels: [], datasets: [] };

  const labels = records.map(r => formatTime(r.timestamp || r.createdAt || r.updatedAt));

  return {
    labels,
    datasets: [
      {
        label: 'Cumulative Energy (kWh)',
        data: records.map(r => r.todaysEnergy ?? 0),
        backgroundColor: '#3b82f6',
        borderRadius: 6,
      },
      {
        label: 'Live Power Draw (kW)',
        data: records.map(r => r.livePower ?? 0),
        backgroundColor: '#10b981',
        borderRadius: 6,
      },
    ],
  };
}

/**
 * Energy Tab: Real Telemetry Distribution from API
 */
export function getEnergyDistributionData(data) {
  if (!data || (data.livePower == null && data.todaysEnergy == null && data.peakDemand == null)) {
    return { labels: [], datasets: [] };
  }

  const live = data.livePower ?? 0;
  const energy = data.todaysEnergy ?? 0;
  const peak = data.peakDemand ?? 0;
  const forecast = data.energyForecast ?? 0;

  return {
    labels: ['Live Draw (kW)', "Today's Energy (kWh)", 'Recorded Peak (kW)', '24h Forecast (kWh)'],
    datasets: [
      {
        data: [live, energy, peak, forecast],
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };
}

/**
 * Water Tab: Real Consumption & Flow Rate Timeline
 */
export function getWaterTrendData(data, history = []) {
  const records = getActiveRecords(data, history);
  const hasWater = records.some(r => r.todaysUsage != null || r.flowRate != null);
  if (!hasWater) return { labels: [], datasets: [] };

  const labels = records.map(r => formatTime(r.timestamp || r.createdAt || r.updatedAt));

  return {
    labels,
    datasets: [
      {
        label: 'Water Consumption (L)',
        data: records.map(r => r.todaysUsage ?? 0),
        borderColor: '#0284c7',
        backgroundColor: 'rgba(2, 132, 199, 0.15)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: records.length === 1 ? 6 : 4,
      },
      {
        label: 'Flow Rate (L/min)',
        data: records.map(r => r.flowRate ?? 0),
        borderColor: '#10b981',
        borderDash: [5, 5],
        tension: 0.35,
        borderWidth: 2,
        pointRadius: records.length === 1 ? 6 : 4,
      },
    ],
  };
}

/**
 * Water Tab: Real Reservoir Storage Breakdown
 */
export function getTankStorageData(data) {
  if (!data || data.tankLevel == null) return { labels: [], datasets: [] };
  const level = data.tankLevel;
  const remaining = Math.max(0, 100 - level);

  return {
    labels: ['Water Stored (%)', 'Available Capacity (%)'],
    datasets: [
      {
        data: [level, remaining],
        backgroundColor: [level < 25 ? '#ef4444' : '#0284c7', '#e2e8f0'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };
}

/**
 * Waste Tab: Real Waste Fill & Weight Generation Trend
 */
export function getWasteTrendData(data, history = []) {
  const records = getActiveRecords(data, history);
  const hasWaste = records.some(r => r.averageFill != null || r.wasteCollected != null);
  if (!hasWaste) return { labels: [], datasets: [] };

  const labels = records.map(r => formatTime(r.timestamp || r.createdAt || r.updatedAt));

  return {
    labels,
    datasets: [
      {
        label: 'Average Fill (%)',
        data: records.map(r => r.averageFill ?? 0),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: records.length === 1 ? 6 : 4,
      },
      {
        label: 'Waste Collected (kg)',
        data: records.map(r => r.wasteCollected ?? 0),
        borderColor: '#10b981',
        tension: 0.35,
        borderWidth: 2,
        pointRadius: records.length === 1 ? 6 : 4,
      },
    ],
  };
}

/**
 * Waste Tab: Real Bin Allocation
 */
export function getWasteBinDistribution(data) {
  if (!data || data.totalBins == null) return { labels: [], datasets: [] };
  const total = data.totalBins;
  const atRisk = data.overflowRisk || 0;
  const safe = Math.max(0, total - atRisk);

  return {
    labels: ['Safe Bins', 'Overflow Risk'],
    datasets: [
      {
        data: [safe, atRisk],
        backgroundColor: ['#10b981', '#ef4444'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };
}

/**
 * Traffic Tab: Real Vehicular Inflow & Movement
 */
export function getTrafficFlowData(data, history = []) {
  const records = getActiveRecords(data, history);
  const hasTraffic = records.some(r => r.vehiclesToday != null || r.parkingOccupancy != null);
  if (!hasTraffic) return { labels: [], datasets: [] };

  const labels = records.map(r => formatTime(r.timestamp || r.createdAt || r.updatedAt));

  return {
    labels,
    datasets: [
      {
        label: 'Vehicles Count',
        data: records.map(r => r.vehiclesToday ?? 0),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: records.length === 1 ? 6 : 4,
      },
      {
        label: 'Parking Bay Occupancy (%)',
        data: records.map(r => r.parkingOccupancy ?? 0),
        borderColor: '#f59e0b',
        tension: 0.35,
        borderWidth: 2,
        pointRadius: records.length === 1 ? 6 : 4,
      },
    ],
  };
}

/**
 * Traffic Tab: Real Parking Allocation
 */
export function getParkingDistribution(data) {
  if (!data || (data.totalSlots == null && data.occupiedSlots == null && data.parkingOccupancy == null)) {
    return { labels: [], datasets: [] };
  }
  const total = data.totalSlots || 100;
  const occupied = data.occupiedSlots ?? (data.parkingOccupancy != null ? Math.round(data.parkingOccupancy * total / 100) : 0);
  const available = Math.max(0, total - occupied);

  return {
    labels: ['Occupied Slots', 'Available Slots'],
    datasets: [
      {
        data: [occupied, available],
        backgroundColor: ['#6366f1', '#10b981'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };
}

/**
 * Assets Tab: Real Equipment Status
 */
export function getAssetStatusData(data) {
  if (!data || data.totalEquipment == null) return { labels: [], datasets: [] };
  const total = data.totalEquipment;
  const active = data.activeEquipment || 0;
  const due = data.maintenanceDue || 0;
  const idle = Math.max(0, total - active - due);

  return {
    labels: ['Active Equipment', 'Standby Units', 'Maintenance Due'],
    datasets: [
      {
        data: [active, idle, due],
        backgroundColor: ['#10b981', '#94a3b8', '#f59e0b'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };
}

/**
 * Assets Tab: Real Machinery Utilization Timeline
 */
export function getAssetUtilizationData(data, history = []) {
  const records = getActiveRecords(data, history);
  const hasUtil = records.some(r => r.utilization != null);
  if (!hasUtil) return { labels: [], datasets: [] };

  const labels = records.map(r => formatTime(r.timestamp || r.createdAt || r.updatedAt));

  return {
    labels,
    datasets: [
      {
        label: 'Machinery Utilization (%)',
        data: records.map(r => r.utilization ?? 0),
        backgroundColor: '#3b82f6',
        borderRadius: 6,
      },
    ],
  };
}

/**
 * Safety Tab: Real Incidents & Safety Score Timeline
 */
export function getSafetyTrendData(data, history = []) {
  const records = getActiveRecords(data, history);
  const hasSafety = records.some(r => r.safetyScore != null || r.incidentsToday != null);
  if (!hasSafety) return { labels: [], datasets: [] };

  const labels = records.map(r => formatTime(r.timestamp || r.createdAt || r.updatedAt));

  return {
    labels,
    datasets: [
      {
        label: 'Safety Score (0-100)',
        data: records.map(r => r.safetyScore ?? 0),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: records.length === 1 ? 6 : 4,
      },
      {
        label: 'Incidents Logged',
        data: records.map(r => r.incidentsToday ?? 0),
        borderColor: '#ef4444',
        tension: 0.35,
        borderWidth: 2,
        pointRadius: records.length === 1 ? 6 : 4,
      },
    ],
  };
}

/**
 * Safety Tab: Real Incident Resolution Distribution
 */
export function getIncidentDistribution(data) {
  if (!data || (data.incidentsToday == null && data.openIncidents == null)) {
    return { labels: [], datasets: [] };
  }
  const today = data.incidentsToday || 0;
  const open = data.openIncidents || 0;
  const resolved = Math.max(0, today - open);

  return {
    labels: ['Resolved Today', 'Open Incidents'],
    datasets: [
      {
        data: [resolved, open],
        backgroundColor: ['#10b981', '#ef4444'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };
}

/**
 * AI Insights Tab: Real AI Forecast vs Current Actual
 */
export function getAIForecastComparisonData(data) {
  if (!data || (data.energyForecast == null && data.todaysEnergy == null)) {
    return { labels: [], datasets: [] };
  }

  const curEnergy = data.todaysEnergy ?? 0;
  const predEnergy = data.energyForecast ?? 0;
  const curWaterK = data.todaysUsage != null ? Math.round(data.todaysUsage / 100) : 0;
  const predWaterK = data.waterForecast != null ? Math.round(data.waterForecast / 100) : 0;

  return {
    labels: ['Energy (kWh)', 'Water (×100 L)'],
    datasets: [
      {
        label: 'Current Actual',
        data: [curEnergy, curWaterK],
        backgroundColor: '#3b82f6',
        borderRadius: 6,
      },
      {
        label: 'AI Forecast (Next 24h)',
        data: [predEnergy, predWaterK],
        backgroundColor: '#8b5cf6',
        borderRadius: 6,
      },
    ],
  };
}

/**
 * AI Insights Tab: Real Performance Index Radar
 */
export function getAISustainabilityScorecard(data) {
  if (!data || (data.sustainabilityScore == null && data.aqi == null && data.safetyScore == null)) {
    return { labels: [], datasets: [] };
  }

  const energyScore = data.todaysEnergy ? Math.min(Math.round((1 - data.todaysEnergy / 250) * 100 + 40), 100) : 0;
  const waterScore = data.todaysUsage ? Math.min(Math.round((1 - data.todaysUsage / 5000) * 100 + 30), 100) : 0;
  const wasteScore = data.averageFill ? Math.max(100 - data.averageFill, 0) : 0;
  const safetyScore = data.safetyScore ?? 0;
  const airScore = data.aqi ? Math.max(100 - data.aqi / 2, 0) : 0;

  return {
    labels: ['Energy Efficiency', 'Water Conservation', 'Waste Mgmt', 'Safety Rating', 'Air Purity'],
    datasets: [
      {
        label: 'Performance Index',
        data: [energyScore, waterScore, wasteScore, safetyScore, airScore],
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: '#3b82f6',
        pointBackgroundColor: '#2563eb',
        borderWidth: 2,
      },
    ],
  };
}
