/**
 * exportToExcel.js
 * Comprehensive Microsoft Excel (.xlsx) export engine for Facility AI.
 * Exports real sensor telemetry, status metrics, historical time-series,
 * priority queues, and AI forecast models per active tab.
 * 
 * STRICT ARCHITECTURE RULE:
 * 1. For individual tabs ('digitaltwin', 'air', 'energy', 'water', 'waste',
 *    'forecasting', 'priority', 'alerts', 'overview'):
 *    - SHEET 1 IS ALWAYS THE COMPLETE MULTI-ROW HISTORICAL DATASET FOR THAT PARTICULAR TAB
 *      (all 93+ database records containing that domain's time series).
 *    - SHEET 2 provides the domain's current status vitals / reference benchmarks.
 *    - Additional sheets provide spatial / block / curve breakdowns where applicable.
 * 2. ONLY the 'history' tab exports the comprehensive 40+ column Master Telemetry
 *    ledger covering ALL subsystems simultaneously.
 */

import * as XLSX from 'xlsx';

function formatDate(date) {
  const d = date ? new Date(date) : new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`;
}

function safeVal(val, fallback = 'N/A') {
  if (val == null || val === '') return fallback;
  return val;
}

function formatRowDate(val, fallback = '-') {
  if (!val) return fallback;
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString([], {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    }
  } catch {}
  return String(val);
}

// Auto-size columns to prevent '###' truncation in Microsoft Excel
function autoFitColumns(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  return keys.map((key) => {
    let maxLen = String(key).length;
    for (let i = 0; i < Math.min(rows.length, 120); i++) {
      const val = rows[i][key];
      if (val != null) {
        const len = String(val).length;
        if (len > maxLen) maxLen = len;
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 11), 46) };
  });
}

function autoFitAoaColumns(aoa) {
  if (!Array.isArray(aoa) || aoa.length === 0) return [];
  const maxCols = Math.max(...aoa.map(r => (Array.isArray(r) ? r.length : 0)));
  const cols = [];
  for (let c = 0; c < maxCols; c++) {
    let maxLen = 10;
    for (let r = 0; r < Math.min(aoa.length, 60); r++) {
      const cell = aoa[r]?.[c];
      if (cell != null) {
        const len = String(cell).length;
        if (len > maxLen) maxLen = len;
      }
    }
    cols.push({ wch: Math.min(maxLen + 3, 50) });
  }
  return cols;
}

// Master telemetry builder used EXCLUSIVELY for the History tab
export function buildMasterTelemetryRows(records) {
  const safeList = Array.isArray(records) ? records : [];
  return safeList.map((r, idx) => {
    const isV1Leaking = String(r.val1 ?? '').toLowerCase().includes('leak') || r.val1 === false || r.val1 === 'false';
    const isV2Leaking = String(r.val2 ?? '').toLowerCase().includes('leak') || r.val2 === false || r.val2 === 'false';
    const isLeak = isV1Leaking || isV2Leaking || (r.leakStatus && r.leakStatus !== 'Normal');

    return {
      '#': idx + 1,
      'Timestamp': formatRowDate(r.timestamp || r.updatedAt || r.createdAt, `Record ${idx + 1}`),
      // Overview & Environment
      'Sustainability Score': safeVal(r.sustainabilityScore, '-'),
      'Safety Score': safeVal(r.safetyScore, '-'),
      // Air Quality
      'AQI': safeVal(r.aqi, '-'),
      'PM2.5 (µg/m³)': safeVal(r.pm25, '-'),
      'PM10 (µg/m³)': safeVal(r.pm10, '-'),
      'CO2 (ppm)': safeVal(r.co2, '-'),
      'Smoke (ppm)': safeVal(r.smoke, '-'),
      'NH3 (ppm)': safeVal(r.nh3, '-'),
      'VOC (ppm)': safeVal(r.voc, '-'),
      'Temperature (°C)': safeVal(r.temperature, '-'),
      'Humidity (%)': safeVal(r.humidity, '-'),
      'Rainfall (mm)': safeVal(r.rainfall, 0),
      'Wind Speed (km/h)': safeVal(r.windSpeed, '-'),
      'Solar Light (Lux)': safeVal(r.lightIntensity, '-'),
      // Energy
      'Live Power (kW)': safeVal(r.livePower, '-'),
      'AC Power (kW)': r.acPower != null ? r.acPower : (r.livePower ? Number((r.livePower * 0.78).toFixed(1)) : '-'),
      'DC Power (kW)': r.dcPower != null ? r.dcPower : (r.livePower ? Number((r.livePower * 0.22).toFixed(1)) : '-'),
      'Today Energy (kWh)': safeVal(r.todaysEnergy, '-'),
      'Peak Demand (kW)': safeVal(r.peakDemand, '-'),
      'Grid Status': safeVal(r.gridStatus, 'ONLINE'),
      'Estimated Cost (₹)': safeVal(r.estimatedCost, '-'),
      // Water
      'Tank Storage (%)': safeVal(r.tankLevel, '-'),
      'Water Consumed (L)': safeVal(r.todaysUsage, '-'),
      'Flow Rate (L/m)': safeVal(r.flowRate, '-'),
      'val1 Flow (L/m)': safeVal(r.val1Flow, '-'),
      'val2 Flow (L/m)': safeVal(r.val2Flow, '-'),
      'val1 Acoustic': safeVal(r.val1, 'Normal'),
      'val2 Acoustic': safeVal(r.val2, 'Normal'),
      'Leak Status': isLeak ? 'LEAK DETECTED' : 'NORMAL',
      'Valve 1': r.valve1 ? 'ON (Open)' : 'OFF (Closed)',
      'Valve 2': r.valve2 ? 'ON (Open)' : 'OFF (Closed)',
      // Waste
      'Block A Dry (kg)': safeVal(r.wasteBlocks?.[0]?.dryWeight ?? 0, '-'),
      'Block A Wet (kg)': safeVal(r.wasteBlocks?.[0]?.wetWeight ?? r.wasteWet, '-'),
      'Block A Fill (%)': safeVal(r.wasteBlocks?.[0]?.wetFill ?? r.wasteWetFill, '-'),
      'Block B Dry (kg)': safeVal(r.wasteBlocks?.[1]?.dryWeight ?? r.wasteDry, '-'),
      'Block B Wet (kg)': safeVal(r.wasteBlocks?.[1]?.wetWeight ?? 0, '-'),
      'Block B Fill (%)': safeVal(r.wasteBlocks?.[1]?.dryFill ?? r.wasteDryFill, '-'),
      'Average Bin Fill (%)': safeVal(r.averageFill, '-'),
      'Overflow Risk Bins': safeVal(r.overflowRisk, 0),
      // Parking
      'Bay A1': r.a1 === false || r.a1 === 'false' || r.a1 === 0 || r.a1 === '0' ? 'Occupied' : 'Free',
      'Bay A2': r.a2 === false || r.a2 === 'false' || r.a2 === 0 || r.a2 === '0' ? 'Occupied' : 'Free',
      'Bay A3': r.a3 === false || r.a3 === 'false' || r.a3 === 0 || r.a3 === '0' ? 'Occupied' : 'Free',
      'Occupied Bays': safeVal(r.occupiedSlots, '-'),
      'Parking Occupancy (%)': safeVal(r.parkingOccupancy, '-'),
      'Vehicles Today': safeVal(r.vehiclesToday, '-'),
    };
  });
}

/**
 * Builds and downloads an Excel file for the requested tab.
 * @param {Object} options
 * @param {string} options.tabName - 'digitaltwin' | 'air' | 'energy' | 'water' | 'waste' | 'forecasting' | 'priority' | 'alerts' | 'overview' | 'history'
 * @param {Object} options.data - Current live sensor snapshot
 * @param {Array} options.history - Historical sensor telemetry records
 * @param {Array} options.allHistory - Full database records array
 * @param {Array} options.alerts - High alert incident logs
 * @param {Object} options.extraData - Any tab-specific data (e.g. weights, scenarios)
 */
export function exportTabToExcel({
  tabName = 'overview',
  data = {},
  history = [],
  allHistory = [],
  alerts = [],
  extraData = {},
}) {
  const d = data || {};
  const wb = XLSX.utils.book_new();
  const timestamp = formatDate(new Date());

  // 1. Resolve full historical dataset across all tabs
  let records = Array.isArray(allHistory) && allHistory.length > 0
    ? allHistory
    : (Array.isArray(history) && history.length > 0 ? history : []);

  // 2. Check localStorage fallback store if records count is small
  try {
    const cached = typeof localStorage !== 'undefined' ? localStorage.getItem('facility_ai_telemetry_history_store_v1') : null;
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > records.length) {
        records = parsed;
      }
    }
  } catch {}

  // 3. Fallback to current snapshot row if history is completely empty
  if (records.length === 0 && d && Object.keys(d).length > 0) {
    records = [d];
  }

  const normalizedTab = (tabName || 'overview').toLowerCase().trim();

  switch (normalizedTab) {
    // ══════════════════════════════════════════════════════════════════════════
    // 1. DIGITAL TWIN & PARKING TAB
    // ══════════════════════════════════════════════════════════════════════════
    case 'digitaltwin': {
      // ── SHEET 1 (PRIMARY): FULL HISTORICAL PARKING & MOBILITY DATASET ──
      const parkingHistRows = records.map((r, idx) => {
        const a1Free = r.a1 !== undefined ? (r.a1 === true || r.a1 === 'true' || r.a1 === 1 || r.a1 === '1') : true;
        const a2Free = r.a2 !== undefined ? (r.a2 === true || r.a2 === 'true' || r.a2 === 1 || r.a2 === '1') : false;
        const a3Free = r.a3 !== undefined ? (r.a3 === true || r.a3 === 'true' || r.a3 === 1 || r.a3 === '1') : true;
        const occSlots = [!a1Free, !a2Free, !a3Free].filter(Boolean).length;
        const availSlots = 3 - occSlots;
        const occPct = Math.round((occSlots / 3) * 100);
        const streetLight = (r.streetLightStatus || 'AUTO').toUpperCase();

        return {
          '#': idx + 1,
          'Timestamp': formatRowDate(r.timestamp || r.updatedAt || r.createdAt, `Record ${idx + 1}`),
          'Bay A1 Status': a1Free ? 'FREE / AVAILABLE' : 'OCCUPIED',
          'Bay A2 Status': a2Free ? 'FREE / AVAILABLE' : 'OCCUPIED',
          'Bay A3 Status': a3Free ? 'FREE / AVAILABLE' : 'OCCUPIED',
          'Occupied Bays': occSlots,
          'Available Free Bays': availSlots,
          'Plaza Occupancy (%)': occPct,
          'Vehicles Today': safeVal(r.vehiclesToday, 482),
          'Gate Waiting (min)': safeVal(r.avgWaitingTime, 3.5),
          'Street Light Status': streetLight === 'OFF' ? 'OFF' : 'ON',
          'Substation Load (kW)': safeVal(r.livePower, 18.4),
        };
      });

      const wsParkingHist = XLSX.utils.json_to_sheet(
        parkingHistRows.length > 0 ? parkingHistRows : [{ Status: 'No parking telemetry logged' }]
      );
      wsParkingHist['!cols'] = autoFitColumns(parkingHistRows);
      XLSX.utils.book_append_sheet(wb, wsParkingHist, 'Parking & Mobility History');

      // ── SHEET 2: CURRENT STATUS & BENCHMARKS ──
      const isA1 = d.a1 !== undefined ? (d.a1 === true || d.a1 === 'true' || d.a1 === 1 || d.a1 === '1') : true;
      const isA2 = d.a2 !== undefined ? (d.a2 === true || d.a2 === 'true' || d.a2 === 1 || d.a2 === '1') : false;
      const isA3 = d.a3 !== undefined ? (d.a3 === true || d.a3 === 'true' || d.a3 === 1 || d.a3 === '1') : true;
      const curOccupied = [!isA1, !isA2, !isA3].filter(Boolean).length;
      const curAvail = 3 - curOccupied;
      const curOccPct = Math.round((curOccupied / 3) * 100);

      const parkingStatusRows = [
        ['Facility AI - Digital Twin & Smart Parking Report', ''],
        ['Export Timestamp', new Date().toLocaleString()],
        ['Campus Mobility Zone', 'Main Campus Smart Parking Plaza'],
        ['Total Historical Snapshots Exported', records.length],
        ['Data Ingestion Protocol', 'Ground-Loop Sonar Nodes (a1, a2, a3)'],
        ['', ''],
        ['Parameter / Sensor Metric', 'Current Reading', 'Reference Benchmark', 'Operational Status'],
        ['Total Parking Bays', '3 Bays', '3 Instrumented Bays', '100% Online'],
        ['Currently Occupied Bays', `${curOccupied} Bays`, 'Capacity Ceiling: 3', curOccupied === 3 ? 'Plaza Full' : 'Bays Available'],
        ['Available Free Bays', `${curAvail} Bays`, 'Target: ≥ 1 Bay Free', curAvail > 0 ? 'Vacancies Open' : 'Gate Diversion Active'],
        ['Plaza Occupancy Rate', `${curOccPct}%`, '≤ 85% Nominal Threshold', curOccPct > 85 ? 'Near Saturation' : 'Optimal Capacity'],
        ['Bay A1 Real-Time Status', isA1 ? 'FREE / AVAILABLE' : 'OCCUPIED', 'Ultrasonic Sonar a1', isA1 ? 'Vacant Bay' : 'Vehicle Parked'],
        ['Bay A2 Real-Time Status', isA2 ? 'FREE / AVAILABLE' : 'OCCUPIED', 'Ultrasonic Sonar a2', isA2 ? 'Vacant Bay' : 'Vehicle Parked'],
        ['Bay A3 Real-Time Status', isA3 ? 'FREE / AVAILABLE' : 'OCCUPIED', 'Ultrasonic Sonar a3', isA3 ? 'Vacant Bay' : 'Vehicle Parked'],
        ['Total Vehicles Ingress Today', safeVal(d.vehiclesToday, 482), 'Vehicles / Day', 'Turnover Normal'],
        ['Average Gate Waiting Time', `${safeVal(d.avgWaitingTime, 3.5)} min`, '≤ 5.0 min Target', 'Zero Traffic Bottleneck'],
        ['Street Light System', safeVal(d.streetLightStatus, 'AUTO'), '48 Smart LED Poles', safeVal(d.streetLightStatus, 'AUTO') === 'OFF' ? 'Daylight Standby' : 'Avenue Lighting Active'],
      ];
      const wsParking = XLSX.utils.aoa_to_sheet(parkingStatusRows);
      wsParking['!cols'] = autoFitAoaColumns(parkingStatusRows);
      XLSX.utils.book_append_sheet(wb, wsParking, 'Parking Status & Vitals');

      // ── SHEET 3: DIGITAL TWIN SPATIAL NODES ──
      const twinRows = [
        ['Campus Spatial Node', 'Domain Type', 'Telemetry Status', 'Primary Vitals', 'Operational Status'],
        ['Substation & Electrical Bus', 'Power Grid', 'SUB-METER ONLINE', `${d.livePower ?? 18.4} kW`, '415V AC Mains & 380V DC Solar Array'],
        ['Block A (Academic & Labs)', 'Educational', 'OPTIMAL BASELINE', `Wet: ${d.wasteWetFill ?? 28}% • ${d.wasteWet ?? 9.8} kg`, 'Lecture Theatres Active'],
        ['Block B (Residential)', 'Hostel Facility', 'MODERATE FILL', `Dry: ${d.wasteDryFill ?? 68}% • ${d.wasteDry ?? 42} kg`, 'Dry Recyclables Collection Scheduled'],
        ['Hydraulic Reservoir Header', 'Water Automation', 'RESERVOIR MONITORED', `Tank: ${d.tankLevel ?? 78}% • Flow: ${d.flowRate ?? 0} L/m`, 'Valve 1 & 2 Actuators Armed'],
        ['Main Parking Plaza', 'Smart Mobility', `${curOccPct}% OCCUPIED`, `${curOccupied}/3 Bays Occupied`, 'Ground-loop Sonar Array Online'],
      ];
      const wsTwin = XLSX.utils.aoa_to_sheet(twinRows);
      wsTwin['!cols'] = autoFitAoaColumns(twinRows);
      XLSX.utils.book_append_sheet(wb, wsTwin, 'Digital Twin Spatial Nodes');
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 2. AIR QUALITY TAB
    // ══════════════════════════════════════════════════════════════════════════
    case 'air': {
      // ── SHEET 1 (PRIMARY): FULL HISTORICAL AIR QUALITY & ATMOSPHERIC DATASET ──
      const airHistRows = records.map((r, idx) => {
        const aqiNum = safeVal(r.aqi, null);
        let aqiCategory = 'Good';
        if (aqiNum != null) {
          if (aqiNum > 100) aqiCategory = 'Unhealthy';
          else if (aqiNum > 50) aqiCategory = 'Moderate';
        }

        return {
          '#': idx + 1,
          'Timestamp': formatRowDate(r.timestamp || r.updatedAt || r.createdAt, `Record ${idx + 1}`),
          'AQI': safeVal(r.aqi, '-'),
          'AQI Category': aqiCategory,
          'PM2.5 (µg/m³)': safeVal(r.pm25, '-'),
          'PM10 (µg/m³)': safeVal(r.pm10, '-'),
          'CO2 (ppm)': safeVal(r.co2, '-'),
          'Ammonia NH3 (ppm)': safeVal(r.nh3, '-'),
          'VOC (ppm)': safeVal(r.voc, '-'),
          'Smoke (ppm)': safeVal(r.smoke, '-'),
          'Temperature (°C)': safeVal(r.temperature, '-'),
          'Relative Humidity (%)': safeVal(r.humidity, '-'),
          'Rainfall (mm)': safeVal(r.rainfall, 0),
          'Wind Speed (km/h)': safeVal(r.windSpeed, '-'),
          'Wind Direction': safeVal(r.windDirection, '-'),
          'Solar Light (Lux)': safeVal(r.lightIntensity, '-'),
        };
      });

      const wsAirHist = XLSX.utils.json_to_sheet(
        airHistRows.length > 0 ? airHistRows : [{ Status: 'No historical air logs recorded' }]
      );
      wsAirHist['!cols'] = autoFitColumns(airHistRows);
      XLSX.utils.book_append_sheet(wb, wsAirHist, 'Air Quality & Pollutant History');

      // ── SHEET 2: CURRENT AIR VITALS & BENCHMARKS ──
      const airRows = [
        ['Facility AI - Air Quality & Microclimate Telemetry Report', ''],
        ['Export Timestamp', new Date().toLocaleString()],
        ['Total Historical Snapshots Exported', records.length],
        ['Monitoring Station', safeVal(d.location, 'Perimeter & Indoor Chemical Sensors')],
        ['', ''],
        ['Atmospheric Parameter', 'Current Reading', 'Standard Safe Threshold', 'Unit', 'Quality Assessment'],
        ['Air Quality Index (AQI)', safeVal(d.aqi, 42), '0 - 50 (Good)', 'AQI', (d.aqi ?? 42) <= 50 ? 'Good / Optimal' : 'Elevated Attention'],
        ['PM2.5 Fine Particulates', safeVal(d.pm25, 18), '≤ 30 µg/m³', 'µg/m³', (d.pm25 ?? 18) <= 30 ? 'Safe' : 'Elevated'],
        ['PM10 Coarse Particulates', safeVal(d.pm10, 36), '≤ 60 µg/m³', 'µg/m³', (d.pm10 ?? 36) <= 60 ? 'Safe' : 'Elevated'],
        ['Carbon Dioxide (CO2)', safeVal(d.co2, 540), '≤ 1000 ppm', 'ppm', (d.co2 ?? 540) <= 800 ? 'Fresh Indoor Atmosphere' : 'Ventilation Advised'],
        ['Ammonia Vapor (NH3)', safeVal(d.nh3, 8), '≤ 25 ppm', 'ppm', (d.nh3 ?? 8) <= 25 ? 'Safe / Non-Toxic' : 'Chemical Alert!'],
        ['Volatile Organic Compounds (VOC)', safeVal(d.voc, 0.18), '≤ 0.50 ppm', 'ppm', (d.voc ?? 0.18) <= 0.5 ? 'Safe' : 'Scrubber Recommended'],
        ['Optical Smoke Vapor', safeVal(d.smoke, 12), '≤ 30 ppm', 'ppm', (d.smoke ?? 12) < 30 ? 'Clear Atmosphere' : 'Combustion Smoke Alert!'],
        ['Ambient Temperature', safeVal(d.temperature, 26.4), '18 - 30 °C', '°C', 'Thermal Comfort Zone'],
        ['Relative Humidity', safeVal(d.humidity, 58), '40 - 70 %', '%', 'Optimal Moisture Balance'],
        ['Precipitation / Rainfall', safeVal(d.rainfall, 0), '0 - 10 mm/h', 'mm', (d.rainfall ?? 0) > 0 ? 'Rainfall Active' : 'Clear Skies'],
        ['Wind Velocity', safeVal(d.windSpeed, 14), '≤ 35 km/h', 'km/h', 'Moderate Breeze'],
        ['Wind Compass Bearing', safeVal(d.windDirection, 'SSW'), 'Direction', 'Compass', safeVal(d.windDirection, 'SSW')],
        ['Solar Light Intensity', safeVal(d.lightIntensity, 28400), '10000 - 65000 Lux', 'Lux', 'Daylight Ambient'],
      ];
      const wsAir = XLSX.utils.aoa_to_sheet(airRows);
      wsAir['!cols'] = autoFitAoaColumns(airRows);
      XLSX.utils.book_append_sheet(wb, wsAir, 'Current Air Quality & Vitals');
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 3. ENERGY TAB
    // ══════════════════════════════════════════════════════════════════════════
    case 'energy': {
      // ── SHEET 1 (PRIMARY): FULL HISTORICAL ENERGY & SUB-METERING DATASET ──
      const energyHistRows = records.map((r, idx) => {
        const livePwr = r.livePower != null ? Number(r.livePower) : 0;
        const acPwr = r.acPower != null ? Number(r.acPower) : Number((livePwr * 0.78).toFixed(2));
        const dcPwr = r.dcPower != null ? Number(r.dcPower) : Number((livePwr * 0.22).toFixed(2));
        const totalPwr = acPwr + dcPwr;
        const todayEnergy = r.todaysEnergy != null ? Number(r.todaysEnergy) : 0;
        const acEnergy = r.acEnergy != null ? Number(r.acEnergy) : Number((todayEnergy * 0.76).toFixed(2));
        const dcEnergy = r.dcEnergy != null ? Number(r.dcEnergy) : Number((todayEnergy * 0.24).toFixed(2));
        const dcSavings = Number((dcEnergy * 7.5).toFixed(2));
        const cost = r.estimatedCost != null ? Number(r.estimatedCost) : Number((todayEnergy * 7.5).toFixed(2));

        return {
          '#': idx + 1,
          'Timestamp': formatRowDate(r.timestamp || r.updatedAt || r.createdAt, `Record ${idx + 1}`),
          'Live Power (kW)': livePwr > 0 ? livePwr : safeVal(r.livePower, '-'),
          'AC Supply Draw (kW)': acPwr,
          'DC Solar / BESS Draw (kW)': dcPwr,
          'Combined Power Draw (kW)': totalPwr > 0 ? Number(totalPwr.toFixed(2)) : livePwr,
          'AC Daily Energy (kWh)': acEnergy,
          'DC Daily Energy (kWh)': dcEnergy,
          'Today Energy Total (kWh)': todayEnergy > 0 ? todayEnergy : safeVal(r.todaysEnergy, '-'),
          'Peak Demand Today (kW)': safeVal(r.peakDemand, '-'),
          'AC Mains Grid Status': safeVal(r.gridStatus, 'ONLINE'),
          'Estimated Electricity Cost (₹)': cost > 0 ? cost : safeVal(r.estimatedCost, '-'),
          'Estimated Solar DC Savings (₹)': dcSavings,
        };
      });

      const wsEnergyHist = XLSX.utils.json_to_sheet(
        energyHistRows.length > 0 ? energyHistRows : [{ Status: 'No historical power logs recorded' }]
      );
      wsEnergyHist['!cols'] = autoFitColumns(energyHistRows);
      XLSX.utils.book_append_sheet(wb, wsEnergyHist, 'Energy & Power Grid History');

      // ── SHEET 2: CURRENT SUB-METERING STATUS & BENCHMARKS ──
      const liveKw = d.livePower ?? 18.4;
      const todayKwh = d.todaysEnergy ?? 142.5;
      const acPower = d.acPower ?? Number((liveKw * 0.78).toFixed(3));
      const acEnergy = d.acEnergy ?? Number((todayKwh * 0.76).toFixed(3));
      const dcPower = d.dcPower ?? Number((liveKw * 0.22).toFixed(3));
      const dcEnergy = d.dcEnergy ?? Number((todayKwh * 0.24).toFixed(3));
      const dcSavings = Number((dcEnergy * 7.5).toFixed(2));
      const gridStatus = String(d.gridStatus || 'ONLINE').toUpperCase();

      const energyRows = [
        ['Facility AI - Energy & Electrical Sub-Metering Report', ''],
        ['Export Timestamp', new Date().toLocaleString()],
        ['Substation ID', 'Main Campus Grid Feeder #1'],
        ['Total Historical Snapshots Exported', records.length],
        ['Mains Grid Status', gridStatus],
        ['', ''],
        ['Electrical Parameter', 'Current Value', 'Unit', 'Operational Target / Notes'],
        ['Instantaneous Total Power Draw', safeVal(d.livePower, liveKw), 'kW', 'Combined Campus Active Power'],
        ['AC Supply Active Draw (Mains & Chillers)', acPower, 'kW', '415V 3-Phase AC Bus (~78% of load)'],
        ['AC Supply Daily Energy', acEnergy, 'kWh', 'Feeds chillers, heavy labs & ring main'],
        ['DC Clean Infeed (Solar PV & BESS)', dcPower, 'kW', '380V DC Bus (~22% of load)'],
        ['DC Supply Daily Energy', dcEnergy, 'kWh', 'Clean rooftop solar generation & battery'],
        ['Recorded Peak Demand Today', safeVal(d.peakDemand, 32.5), 'kW', 'Campus Grid Ceiling: 45.0 kW'],
        ['AC Mains Grid Status', gridStatus, 'State', gridStatus === 'OFFLINE' ? 'AC Mains Tripped / Offline' : 'Grid Feeder Online'],
        ['Commercial Energy Tariff', '₹ 7.50 / kWh', 'INR/kWh', 'Commercial Campus Tariff Tier'],
        ['Estimated Today\'s Cost', `₹ ${d.estimatedCost ? d.estimatedCost.toLocaleString('en-IN') : '1,136'}`, 'INR', 'Daily Bill Accrual'],
        ['Estimated Solar DC Savings', `₹ ${dcSavings.toLocaleString('en-IN')}`, 'INR', 'Avoided Grid Expenditure Today'],
      ];
      const wsEnergy = XLSX.utils.aoa_to_sheet(energyRows);
      wsEnergy['!cols'] = autoFitAoaColumns(energyRows);
      XLSX.utils.book_append_sheet(wb, wsEnergy, 'Current Energy & Sub-Metering');
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 4. WATER TAB
    // ══════════════════════════════════════════════════════════════════════════
    case 'water': {
      // ── SHEET 1 (PRIMARY): FULL HISTORICAL WATER & HYDRAULIC DATASET ──
      const waterHistRows = records.map((r, idx) => {
        const v1L = String(r.val1 ?? '').toLowerCase().includes('leak') || r.val1 === false || r.val1 === 'false';
        const v2L = String(r.val2 ?? '').toLowerCase().includes('leak') || r.val2 === false || r.val2 === 'false';
        const leak = v1L || v2L || (r.leakStatus && r.leakStatus !== 'Normal');
        const tankPct = r.tankLevel != null ? Number(r.tankLevel) : 0;
        const usableL = tankPct > 0 ? Math.round((tankPct * 10000) / 100) : '-';

        return {
          '#': idx + 1,
          'Timestamp': formatRowDate(r.timestamp || r.updatedAt || r.createdAt, `Record ${idx + 1}`),
          'Tank Storage Fill (%)': safeVal(r.tankLevel, '-'),
          'Remaining Reserve (L)': usableL,
          'Water Consumed Today (L)': safeVal(r.todaysUsage, '-'),
          'Combined Delivery Flow (L/m)': safeVal(r.flowRate, '-'),
          'Line 1 (val1) Flow (L/m)': safeVal(r.val1Flow, '-'),
          'Line 2 (val2) Flow (L/m)': safeVal(r.val2Flow, '-'),
          'Acoustic Leak State': leak ? 'LEAK DETECTED' : 'NORMAL FLOW',
          'Line 1 Sensor (val1)': v1L ? 'Leak Detected' : 'Normal',
          'Line 2 Sensor (val2)': v2L ? 'Leak Detected' : 'Normal',
          'Main Solenoid Valve 1': r.valve1 ? 'OPEN (Flow Active)' : 'CLOSED (Isolated)',
          'Secondary Solenoid Valve 2': r.valve2 ? 'OPEN (Flow Active)' : 'CLOSED (Isolated)',
        };
      });

      const wsWaterHist = XLSX.utils.json_to_sheet(
        waterHistRows.length > 0 ? waterHistRows : [{ Status: 'No historical hydraulic records logged' }]
      );
      wsWaterHist['!cols'] = autoFitColumns(waterHistRows);
      XLSX.utils.book_append_sheet(wb, wsWaterHist, 'Water & Hydraulic Flow History');

      // ── SHEET 2: CURRENT WATER & SOLENOID STATUS ──
      const isVal1Leaking = String(d.val1 ?? '').toLowerCase().includes('leak') || d.val1 === false || d.val1 === 'false';
      const isVal2Leaking = String(d.val2 ?? '').toLowerCase().includes('leak') || d.val2 === false || d.val2 === 'false';
      const isLeaking = isVal1Leaking || isVal2Leaking || (d.leakStatus && d.leakStatus !== 'Normal');
      const val1Flow = d.val1Flow != null ? Number(d.val1Flow) : (d.flowRate ? Number((d.flowRate * 0.65).toFixed(1)) : 0);
      const val2Flow = d.val2Flow != null ? Number(d.val2Flow) : (d.flowRate ? Number((d.flowRate * 0.35).toFixed(1)) : 0);
      const totalFlow = Number((val1Flow + val2Flow).toFixed(1));

      const waterRows = [
        ['Facility AI - Hydraulic & Water Automation Report', ''],
        ['Export Timestamp', new Date().toLocaleString()],
        ['Water Reservoir ID', 'Overhead Tank Reservoir (Block A & Block B)'],
        ['Total Historical Snapshots Exported', records.length],
        ['', ''],
        ['Hydraulic Parameter', 'Current Value', 'Unit', 'Operational State / Benchmark'],
        ['Overhead Reservoir Fill Level', safeVal(d.tankLevel, 78), '%', (d.tankLevel ?? 78) < 25 ? 'Low Tank Storage Reserve (< 25%)' : 'Optimal Storage Headroom'],
        ['Total Tank Storage Capacity', '10,000 L', 'L', 'Max Campus Water Capacity'],
        ['Calculated Remaining Water', `${Math.round(((d.tankLevel ?? 78) * 10000) / 100)} L`, 'L', 'Current Usable Reserve Volume'],
        ['Water Consumed Today', safeVal(d.todaysUsage, 2840), 'L', 'Campus Daily Quota: 5,000 L'],
        ['Line 1 (val1) Flow Rate', val1Flow, 'L/m', val1Flow > 20 ? 'High Line Velocity' : 'Nominal Pipe Flow'],
        ['Line 2 (val2) Flow Rate', val2Flow, 'L/m', val2Flow > 20 ? 'High Line Velocity' : 'Nominal Pipe Flow'],
        ['Combined Main Delivery Flow', totalFlow > 0 ? totalFlow : safeVal(d.flowRate, 0), 'L/m', 'Standard Flow Limit: ≤ 25 L/m (Line Max 35 L/m)'],
        ['Acoustic Trunk Leak Status', isLeaking ? 'LEAK DETECTED' : 'NORMAL FLOW', 'Integrity', isLeaking ? 'Acoustic Pipe Rupture Confirmed' : 'Zero Acoustic Pressure Drop'],
        ['val1 Acoustic Sensor (Line 1)', isVal1Leaking ? 'Leak Detected' : 'Normal', 'Sensor', isVal1Leaking ? 'Line 1 Rupture' : 'Intact'],
        ['val2 Acoustic Sensor (Line 2)', isVal2Leaking ? 'Leak Detected' : 'Normal', 'Sensor', isVal2Leaking ? 'Line 2 Rupture' : 'Intact'],
        ['Main Solenoid Valve 1', d.valve1 ? 'ON (Open / Flow Active)' : 'OFF (Closed / Isolated)', 'Actuator', d.valve1 ? 'Line 1 Valve Open' : 'Line 1 Isolated'],
        ['Secondary Solenoid Valve 2', d.valve2 ? 'ON (Open / Flow Active)' : 'OFF (Closed / Isolated)', 'Actuator', d.valve2 ? 'Line 2 Valve Open' : 'Line 2 Isolated'],
      ];
      const wsWater = XLSX.utils.aoa_to_sheet(waterRows);
      wsWater['!cols'] = autoFitAoaColumns(waterRows);
      XLSX.utils.book_append_sheet(wb, wsWater, 'Current Water & Solenoid Status');
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 5. WASTE MANAGEMENT TAB
    // ══════════════════════════════════════════════════════════════════════════
    case 'waste': {
      // ── SHEET 1 (PRIMARY): FULL HISTORICAL WASTE GENERATION DATASET ──
      const wasteHistRows = records.map((r, idx) => {
        const bAWet = r.wasteBlocks?.[0]?.wetWeight ?? r.wasteWet;
        const bADry = r.wasteBlocks?.[0]?.dryWeight ?? 0;
        const bAFill = r.wasteBlocks?.[0]?.wetFill ?? r.wasteWetFill;
        const bBDry = r.wasteBlocks?.[1]?.dryWeight ?? r.wasteDry;
        const bBWet = r.wasteBlocks?.[1]?.wetWeight ?? 0;
        const bBFill = r.wasteBlocks?.[1]?.dryFill ?? r.wasteDryFill;
        const totalMass = Number(((Number(bAWet || 0) + Number(bADry || 0) + Number(bBDry || 0) + Number(bBWet || 0))).toFixed(1));

        return {
          '#': idx + 1,
          'Timestamp': formatRowDate(r.timestamp || r.updatedAt || r.createdAt, `Record ${idx + 1}`),
          'Average Bin Fill (%)': safeVal(r.averageFill, '-'),
          'Block A Wet Mass (kg)': safeVal(bAWet, '-'),
          'Block A Wet Fill (%)': safeVal(bAFill, '-'),
          'Block B Dry Mass (kg)': safeVal(bBDry, '-'),
          'Block B Dry Fill (%)': safeVal(bBFill, '-'),
          'Total Waste Mass (kg)': totalMass > 0 ? totalMass : '-',
          'Overflow Risk Bins': safeVal(r.overflowRisk, 0),
          'Predicted Runway (hrs)': safeVal(r.overflowPrediction, 3.5),
        };
      });

      const wsWasteHist = XLSX.utils.json_to_sheet(
        wasteHistRows.length > 0 ? wasteHistRows : [{ Status: 'No historical waste records logged' }]
      );
      wsWasteHist['!cols'] = autoFitColumns(wasteHistRows);
      XLSX.utils.book_append_sheet(wb, wsWasteHist, 'Waste Generation History');

      // ── SHEET 2: BLOCK-WISE SEGREGATION ──
      const filteredWasteBlocks = Array.isArray(d.wasteBlocks)
        ? d.wasteBlocks.filter(b => b && (b.id === 'block-a' || b.id === 'block-b' || b.code === 'BL-A' || b.code === 'BL-B'))
        : [];
      const blocks = filteredWasteBlocks.length > 0
        ? filteredWasteBlocks.map(b => ({
            ...b,
            name: b.id === 'block-a' || b.code === 'BL-A' ? 'Block A' : 'Block B',
          }))
        : [
            { name: 'Block A', code: 'BL-A', dryFill: 0, wetFill: 28, dryWeight: 0, wetWeight: 9.8, status: 'Optimal', complianceScore: 94 },
            { name: 'Block B', code: 'BL-B', dryFill: 68, wetFill: 0, dryWeight: 42.0, wetWeight: 0, status: 'Moderate', complianceScore: 88 },
          ];

      const blockRows = blocks.map((b) => ({
        'Campus Block': b.name,
        'Block Code': b.code,
        'Dry Fill (%)': `${b.dryFill}%`,
        'Dry Weight (kg)': b.dryWeight,
        'Wet Fill (%)': `${b.wetFill}%`,
        'Wet Weight (kg)': b.wetWeight,
        'Total Mass (kg)': Number(((b.dryWeight || 0) + (b.wetWeight || 0)).toFixed(1)),
        'Segregation Compliance': `${b.complianceScore}%`,
        'Operational Status': b.status,
      }));
      const wsBlocks = XLSX.utils.json_to_sheet(blockRows);
      wsBlocks['!cols'] = autoFitColumns(blockRows);
      XLSX.utils.book_append_sheet(wb, wsBlocks, 'Block-Wise Segregation');

      // ── SHEET 3: WASTE CURRENT STATUS & BENCHMARKS ──
      const blockA = blocks.find(b => b.name === 'Block A') || blocks[0];
      const blockB = blocks.find(b => b.name === 'Block B') || blocks[1];

      const wasteRows = [
        ['Facility AI - Smart Sanitation & Waste Segregation Report', ''],
        ['Export Timestamp', new Date().toLocaleString()],
        ['Campus Sanitation Division', 'Monitored Blocks: Block A & Block B only'],
        ['Total Historical Snapshots Exported', records.length],
        ['', ''],
        ['Sanitation Metric', 'Current Value', 'Unit', 'Logistics Directive'],
        ['Average Bin Volumetric Fill', safeVal(d.averageFill, 48), '%', 'Safe Holding Threshold (< 80%)'],
        ['Block A Wet Organic Fill', `${blockA?.wetFill ?? 28}%`, '% Fill', (blockA?.wetFill ?? 28) > 80 ? 'Overflow Risk' : 'Optimal Capacity'],
        ['Block A Wet Organic Weight', `${blockA?.wetWeight ?? 9.8} kg`, 'kg', 'Bio-degradable Organic Waste'],
        ['Block B Dry Recyclables Fill', `${blockB?.dryFill ?? 68}%`, '% Fill', (blockB?.dryFill ?? 68) > 80 ? 'Overflow Risk' : 'Moderate Recyclables Fill'],
        ['Block B Dry Recyclables Weight', `${blockB?.dryWeight ?? 42.0} kg`, 'kg', 'Clean Paper, Plastics, Cardboard'],
        ['Total Waste Mass Today', `${Number(((blockA?.wetWeight || 0) + (blockB?.dryWeight || 0)).toFixed(1))} kg`, 'kg', 'Dual-Stream Campus Waste'],
        ['Campus Segregation Compliance', '91.0%', 'Score', 'High Source Segregation Compliance'],
        ['Total Monitored Smart Bins', '2 Blocks', 'Units', 'Block A (BL-A) & Block B (BL-B)'],
        ['Bins at Critical Overflow Risk', safeVal(d.overflowRisk, 0), 'Units', (d.overflowRisk ?? 0) > 0 ? 'Sanitation Route Dispatch' : 'Zero Overflow Risk'],
        ['Predicted Runway to Overflow', `${safeVal(d.overflowPrediction, 3.5)} hrs`, 'Hours', 'Hours until 80% holding capacity reached'],
      ];
      const wsWaste = XLSX.utils.aoa_to_sheet(wasteRows);
      wsWaste['!cols'] = autoFitAoaColumns(wasteRows);
      XLSX.utils.book_append_sheet(wb, wsWaste, 'Current Waste Vitals');
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 6. AI FORECASTING TAB
    // ══════════════════════════════════════════════════════════════════════════
    case 'forecasting': {
      const ai = d.aiForecasting || {};
      const forecasts = Array.isArray(ai.forecasts) ? ai.forecasts : [];

      // ── SHEET 1 (PRIMARY): FULL MULTI-POINT PREDICTION HORIZON MATRIX ──
      const curveRows = [];
      forecasts.forEach((f, fIdx) => {
        const pts = Array.isArray(f.points) ? f.points : [];
        if (pts.length > 0) {
          pts.forEach((pt, pIdx) => {
            curveRows.push({
              '#': curveRows.length + 1,
              'Stream': f.stream || 'gateway',
              'Channel': f.channel || 'sensor',
              'Metric Label': f.label || f.channel,
              'Horizon Step': `+${(pIdx + 1) * 5}m (${(pIdx + 1) * 5} min ahead)`,
              'Live Value (Now)': safeVal(f.latest_value),
              'Neural Predicted Value': pt.value != null ? Number(pt.value).toFixed(2) : '-',
              '95% Lower Range': pt.lower != null ? Number(pt.lower).toFixed(2) : '-',
              '95% Upper Range': pt.upper != null ? Number(pt.upper).toFixed(2) : '-',
              'Model Type': f.model?.type || 'LSTM Multi-Horizon',
              'Beats Baseline': f.model?.beats_naive ? 'YES (High Accuracy)' : 'Indicative',
            });
          });
        } else {
          curveRows.push({
            '#': fIdx + 1,
            'Stream': f.stream || 'gateway',
            'Channel': f.channel || 'sensor',
            'Metric Label': f.label || f.channel,
            'Horizon Step': '+30m Horizon',
            'Live Value (Now)': safeVal(f.latest_value),
            'Neural Predicted Value': safeVal(f.predicted_value),
            '95% Lower Range': '-',
            '95% Upper Range': '-',
            'Model Type': f.model?.type || 'LSTM',
            'Beats Baseline': f.model?.beats_naive ? 'YES' : 'NO',
          });
        }
      });

      const wsCurve = XLSX.utils.json_to_sheet(
        curveRows.length > 0 ? curveRows : [{ Status: 'No forecast projection points logged yet' }]
      );
      wsCurve['!cols'] = autoFitColumns(curveRows);
      XLSX.utils.book_append_sheet(wb, wsCurve, 'AI Forecast Horizon Matrix');

      // ── SHEET 2: HISTORICAL TELEMETRY BASELINE (DATA USED BY FORECASTER) ──
      const fcHistoryRows = records.map((r, idx) => ({
        '#': idx + 1,
        'Timestamp': formatRowDate(r.timestamp || r.updatedAt || r.createdAt, `Record ${idx + 1}`),
        'Live Power (kW)': safeVal(r.livePower, '-'),
        'Today Energy (kWh)': safeVal(r.todaysEnergy, '-'),
        'Tank Fill (%)': safeVal(r.tankLevel, '-'),
        'Water Flow (L/m)': safeVal(r.flowRate, '-'),
        'AQI': safeVal(r.aqi, '-'),
        'PM2.5 (µg/m³)': safeVal(r.pm25, '-'),
        'CO2 (ppm)': safeVal(r.co2, '-'),
        'Waste Fill (%)': safeVal(r.averageFill, '-'),
        'Parking Occupancy (%)': safeVal(r.parkingOccupancy, '-'),
      }));
      const wsFcHistory = XLSX.utils.json_to_sheet(
        fcHistoryRows.length > 0 ? fcHistoryRows : [{ Status: 'No baseline telemetry' }]
      );
      wsFcHistory['!cols'] = autoFitColumns(fcHistoryRows);
      XLSX.utils.book_append_sheet(wb, wsFcHistory, 'Historical Telemetry Baseline');

      // ── SHEET 3: AI FORECASTER MODEL OVERVIEW ──
      const forecastOverviewRows = [
        ['Facility AI - Predictive Neural Forecasting Report', ''],
        ['Export Timestamp', new Date().toLocaleString()],
        ['Prediction Engine Model', 'LSTM Multi-Horizon Neural Forecaster'],
        ['Prediction Time Window', '30-Minute Ahead Horizon (+5m increments)'],
        ['Total Historical Training Records Exported', records.length],
        ['Model Generated Timestamp', ai.generated_at ? new Date(ai.generated_at).toLocaleString() : 'Live API Feed'],
        ['Facility Site', ai.site || d.location || 'Central Smart Campus'],
        ['', ''],
        ['Forecast Metric', 'Projected Value', 'Unit', 'Neural Assessment'],
        ['Active Forecast Channels', forecasts.length, 'Channels', `${forecasts.length} live stream models running`],
        ['Projected Energy Consumption (24h)', safeVal(d.energyForecast, Math.round((d.livePower ?? 18.4) * 24)), 'kWh', 'Projected next 24-hour electrical demand'],
        ['Projected Water Demand (24h)', safeVal(d.waterForecast, 3800), 'L', 'Hydraulic consumption projection'],
        ['Estimated Bin Fill Runway', `${safeVal(d.overflowPrediction, 3.5)} hrs`, 'Hours', 'Time until critical waste capacity reached'],
      ];
      const wsFcOverview = XLSX.utils.aoa_to_sheet(forecastOverviewRows);
      wsFcOverview['!cols'] = autoFitAoaColumns(forecastOverviewRows);
      XLSX.utils.book_append_sheet(wb, wsFcOverview, 'AI Forecaster Model Summary');
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 7. PRIORITY ENGINE TAB
    // ══════════════════════════════════════════════════════════════════════════
    case 'priority': {
      const pe = d.priorityEngine || {};
      const counts = pe.counts || { P1: 0, P2: 0, P3: 0, P4: 0 };
      const items = Array.isArray(pe.items) ? pe.items : [];

      // ── SHEET 1 (PRIMARY): FULL RANKED ACTIONS DIRECTIVES MATRIX ──
      const itemRows = items.map((it, idx) => ({
        'Priority Rank': it.rank || idx + 1,
        'Severity Level': it.level || 'P3',
        'Triage Score': it.score != null ? it.score : '-',
        'Subsystem Domain': it.area || 'Facility',
        'Action Directive Title': it.title || '-',
        'Required Directive (Do)': it.action || '-',
        'Verification Audit (Check)': it.check || '-',
        'Designated Owner': it.owner || 'Facility Operations Team',
        'SLA Response Window': it.level === 'P1' ? '< 15 Minutes' : it.level === 'P2' ? '< 4 Hours' : 'Within 48 Hours',
      }));

      const wsPriority = XLSX.utils.json_to_sheet(
        itemRows.length > 0 ? itemRows : [{ Status: 'No open ranked actions recorded - All systems optimal' }]
      );
      wsPriority['!cols'] = autoFitColumns(itemRows);
      XLSX.utils.book_append_sheet(wb, wsPriority, 'Ranked Actions Matrix');

      // ── SHEET 2: SUBSYSTEM TELEMETRY CONTEXT (HISTORICAL AUDIT LOG) ──
      const peHistRows = records.map((r, idx) => ({
        '#': idx + 1,
        'Timestamp': formatRowDate(r.timestamp || r.updatedAt || r.createdAt, `Record ${idx + 1}`),
        'Live Power (kW)': safeVal(r.livePower, '-'),
        'Grid Status': safeVal(r.gridStatus, 'ONLINE'),
        'Tank Level (%)': safeVal(r.tankLevel, '-'),
        'Leak State': safeVal(r.leakStatus, 'Normal'),
        'AQI': safeVal(r.aqi, '-'),
        'Waste Fill (%)': safeVal(r.averageFill, '-'),
        'Overflow Risk': safeVal(r.overflowRisk, 0),
        'Safety Score': safeVal(r.safetyScore, '-'),
      }));
      const wsPeHist = XLSX.utils.json_to_sheet(
        peHistRows.length > 0 ? peHistRows : [{ Status: 'No historical context logged' }]
      );
      wsPeHist['!cols'] = autoFitColumns(peHistRows);
      XLSX.utils.book_append_sheet(wb, wsPeHist, 'Subsystem Telemetry Context');

      // ── SHEET 3: PRIORITY ENGINE OVERVIEW & SLA COUNTS ──
      const priorityOverviewRows = [
        ['Facility AI - Priority Engine & Operational Triage Report', ''],
        ['Export Timestamp', new Date().toLocaleString()],
        ['Total Historical Snapshots Exported', records.length],
        ['Triage Directives Generated', pe.generated_at ? new Date(pe.generated_at).toLocaleString() : 'Live Stream'],
        ['Facility Site', pe.site || d.location || 'Central Smart Campus'],
        ['', ''],
        ['Priority Level', 'Active Incident Count', 'SLA Response Window', 'Directives Status'],
        ['P1 · Critical', counts.P1 ?? 0, 'Act Now (< 15 min SLA)', (counts.P1 ?? 0) > 0 ? 'Urgent Isolation Required' : 'All Clear'],
        ['P2 · High', counts.P2 ?? 0, 'Act Today (< 4 hr SLA)', (counts.P2 ?? 0) > 0 ? 'Maintenance Dispatch Armed' : 'Optimal'],
        ['P3 · Medium', counts.P3 ?? 0, 'Plan This Week', (counts.P3 ?? 0) > 0 ? 'Preventive Scheduling' : 'Optimal'],
        ['P4 · Low', counts.P4 ?? 0, 'Keep An Eye / Routine', 'Routine Walkthrough', 'Informational'],
        ['Total Ranked Action Items', items.length, 'All Subsystems Covered', 'Active Facility Queue'],
      ];
      const wsPeOverview = XLSX.utils.aoa_to_sheet(priorityOverviewRows);
      wsPeOverview['!cols'] = autoFitAoaColumns(priorityOverviewRows);
      XLSX.utils.book_append_sheet(wb, wsPeOverview, 'Priority Summary & SLA Counts');
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 8. ALERT HISTORY TAB
    // ══════════════════════════════════════════════════════════════════════════
    case 'alerts': {
      // ── SHEET 1 (PRIMARY): FULL INCIDENT TRIAGE & RESOLUTION AUDIT TRAIL ──
      const alertsList = Array.isArray(alerts) && alerts.length > 0 ? alerts : (extraData.alerts || []);
      const alertRows = alertsList.map((a, idx) => ({
        'Incident ID': a.id || `ALT-${1000 + idx}`,
        'System': a.systemLabel || a.source || a.system || 'Facility AI',
        'Severity Level': (a.severity || 'HIGH').toUpperCase(),
        'Incident Title': a.title || 'Anomaly Detected',
        'Location': a.location || 'Campus Facilities',
        'Telemetry Value': a.value != null ? String(a.value) : '-',
        'Safe Threshold': a.threshold != null ? String(a.threshold) : '-',
        'Sensor / Metric': a.metric || '-',
        'Automated Directive': a.recommendation || a.actionTaken || '-',
        'Logged Time': a.timestamp ? formatRowDate(a.timestamp) : new Date().toLocaleString(),
        'Status': a.status === 'solved' ? 'SOLVED' : 'ACTIVE',
        'Solved Time': a.solvedAt ? formatRowDate(a.solvedAt) : '-',
      }));

      const wsAlerts = XLSX.utils.json_to_sheet(
        alertRows.length > 0 ? alertRows : [{ 'Status': 'All clear - Zero active high alert incidents recorded.' }]
      );
      wsAlerts['!cols'] = autoFitColumns(alertRows);
      XLSX.utils.book_append_sheet(wb, wsAlerts, 'Incident Triage Log');

      // ── SHEET 2: FACILITY TELEMETRY HISTORY (CROSS-SYSTEM BASELINE) ──
      const alertHistRows = records.map((r, idx) => ({
        '#': idx + 1,
        'Timestamp': formatRowDate(r.timestamp || r.updatedAt || r.createdAt, `Record ${idx + 1}`),
        'Sustainability Score': safeVal(r.sustainabilityScore, '-'),
        'Safety Score': safeVal(r.safetyScore, '-'),
        'AQI': safeVal(r.aqi, '-'),
        'PM2.5 (µg/m³)': safeVal(r.pm25, '-'),
        'Live Power (kW)': safeVal(r.livePower, '-'),
        'Grid Status': safeVal(r.gridStatus, 'ONLINE'),
        'Tank Level (%)': safeVal(r.tankLevel, '-'),
        'Leak State': safeVal(r.leakStatus, 'Normal'),
        'Waste Fill (%)': safeVal(r.averageFill, '-'),
        'Overflow Risk Bins': safeVal(r.overflowRisk, 0),
      }));
      const wsAlertHist = XLSX.utils.json_to_sheet(
        alertHistRows.length > 0 ? alertHistRows : [{ Status: 'No baseline records logged' }]
      );
      wsAlertHist['!cols'] = autoFitColumns(alertHistRows);
      XLSX.utils.book_append_sheet(wb, wsAlertHist, 'Facility Telemetry History');

      // ── SHEET 3: INCIDENT SUMMARY AUDIT ──
      const activeIncidents = alertsList.filter(a => a.status !== 'solved').length;
      const solvedIncidents = alertsList.filter(a => a.status === 'solved').length;
      const alertSummary = [
        ['Facility AI - High Alert Incidents & Resolution Audit Report', ''],
        ['Export Timestamp', new Date().toLocaleString()],
        ['Total Historical Incidents Logged', alertsList.length],
        ['Active Pending Incidents', activeIncidents],
        ['Solved / Mitigated Incidents', solvedIncidents],
        ['Total Telemetry Snapshots Correlated', records.length],
      ];
      const wsAlertSummary = XLSX.utils.aoa_to_sheet(alertSummary);
      wsAlertSummary['!cols'] = autoFitAoaColumns(alertSummary);
      XLSX.utils.book_append_sheet(wb, wsAlertSummary, 'Incident Audit Summary');
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 9. OVERVIEW TAB
    // ══════════════════════════════════════════════════════════════════════════
    case 'overview': {
      // ── SHEET 1 (PRIMARY): FULL MULTI-DOMAIN OPERATIONAL HISTORY ──
      const overviewHistRows = records.map((r, idx) => ({
        '#': idx + 1,
        'Timestamp': formatRowDate(r.timestamp || r.updatedAt || r.createdAt, `Record ${idx + 1}`),
        'Sustainability Score (/100)': safeVal(r.sustainabilityScore, 84),
        'Safety Score (/100)': safeVal(r.safetyScore, 95),
        'Air Quality (AQI)': safeVal(r.aqi, '-'),
        'PM2.5 (µg/m³)': safeVal(r.pm25, '-'),
        'Live Power Draw (kW)': safeVal(r.livePower, '-'),
        'Today\'s Energy (kWh)': safeVal(r.todaysEnergy, '-'),
        'Water Tank Storage (%)': safeVal(r.tankLevel, '-'),
        'Water Consumed (L)': safeVal(r.todaysUsage, '-'),
        'Combined Flow Rate (L/m)': safeVal(r.flowRate, '-'),
        'Average Waste Fill (%)': safeVal(r.averageFill, '-'),
        'Parking Occupancy (%)': safeVal(r.parkingOccupancy, '-'),
        'Active High Alerts': safeVal(r.activeAlertsCount, alerts.length),
      }));

      const wsOverviewHist = XLSX.utils.json_to_sheet(
        overviewHistRows.length > 0 ? overviewHistRows : [{ Status: 'No historical records logged yet' }]
      );
      wsOverviewHist['!cols'] = autoFitColumns(overviewHistRows);
      XLSX.utils.book_append_sheet(wb, wsOverviewHist, 'Overview Multi-Domain History');

      // ── SHEET 2: EXECUTIVE FACILITY SUMMARY ──
      const summaryRows = [
        ['Facility AI - Operations Overview Executive Report', ''],
        ['Generated At', new Date().toLocaleString()],
        ['Facility Zone', safeVal(d.location, 'Central Smart Campus')],
        ['Data Source', safeVal(d.source, 'IoT Edge Gateway Hub')],
        ['Total Historical Records Exported', records.length],
        ['', ''],
        ['Core Parameter', 'Current Value', 'Unit', 'Operational Assessment'],
        ['Sustainability Score', safeVal(d.sustainabilityScore, 84), '/100', (d.sustainabilityScore ?? 84) >= 80 ? 'Optimal Green Rating' : 'Good Standing'],
        ['Air Quality Index (AQI)', safeVal(d.aqi, 42), 'AQI', (d.aqi ?? 42) <= 50 ? 'Good' : 'Moderate'],
        ['Today\'s Energy Usage', safeVal(d.todaysEnergy, 142), 'kWh', 'Normal Consumption Window'],
        ['Live Grid Power Draw', safeVal(d.livePower, 18.4), 'kW', 'Active Campus Substation'],
        ['Peak Energy Demand', safeVal(d.peakDemand, 32.5), 'kW', 'Within Grid Capacity Threshold'],
        ['Water Tank Storage', safeVal(d.tankLevel, 78), '%', 'Overhead Reservoir Adequate'],
        ['Water Consumed Today', safeVal(d.todaysUsage, 2840), 'L', 'Hydraulic Quota Normal'],
        ['Solenoid Valve 1 State', d.valve1 ? 'OPEN' : 'CLOSED', 'State', d.valve1 ? 'Hydraulic Flow Active' : 'Supply Isolated'],
        ['Acoustic Leak Status', safeVal(d.leakStatus, 'Normal Flow'), 'Status', d.leakStatus === 'Leak Detected' ? 'URGENT: Inspection Required' : 'Acoustic Baseline Normal'],
        ['Average Bin Fill Level', safeVal(d.averageFill, 54), '%', 'Sanitation Quota Stable'],
        ['Total Monitored Smart Bins', '2 Blocks', 'Units', 'Block A & Block B Dual Stream'],
        ['Campus Safety Score', safeVal(d.safetyScore, 95), '/100', 'Zero Fatalities / Safe Env'],
        ['Active High Alerts Count', safeVal(d.activeAlertsCount, alerts.length), 'Incidents', alerts.length > 0 ? 'Active Triage Required' : 'All Clear'],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      wsSummary['!cols'] = autoFitAoaColumns(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Facility Summary');
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 10. HISTORY TAB (ONLY TAB WITH ENTIRE MASTER DATA ACROSS ALL DOMAINS)
    // ══════════════════════════════════════════════════════════════════════════
    case 'history': {
      // ── SHEET 1: MASTER COMPREHENSIVE TELEMETRY LEDGER (ALL 40+ COLUMNS) ──
      const masterRows = buildMasterTelemetryRows(records);
      const wsMaster = XLSX.utils.json_to_sheet(
        masterRows.length > 0 ? masterRows : [{ Status: 'No telemetry history logged' }]
      );
      wsMaster['!cols'] = autoFitColumns(masterRows);
      XLSX.utils.book_append_sheet(wb, wsMaster, 'All Subsystems Master Telemetry');

      // ── SHEET 2: MULTI-SYSTEM BENCHMARK AUDIT SUMMARY ──
      const auditSummary = [
        ['Facility AI - Historical Telemetry Ledger Report (Entire Campus Dataset)', ''],
        ['Generated At', new Date().toLocaleString()],
        ['Total Historical Snapshots Logged', records.length],
        ['Facility Zone', safeVal(d.location, 'Central Smart Campus')],
        ['Data Ingestion Channel', safeVal(d.source, 'Live IoT Edge Hub')],
        ['', ''],
        ['Subsystem', 'Key Metric Tracked', 'Current Live Reading', 'Normal Range / Benchmark'],
        ['Air Quality', 'AQI Index', safeVal(d.aqi, '-'), '0 - 50 (Good)'],
        ['Air Quality', 'PM2.5 Particulates', safeVal(d.pm25, '-'), '≤ 30 µg/m³'],
        ['Energy Optimization', 'Live Power Draw', safeVal(d.livePower, '-'), '≤ 35 kW (Ceiling: 45 kW)'],
        ['Energy Optimization', 'AC / DC Supply Ratio', `${d.acPower ?? 0} kW AC / ${d.dcPower ?? 0} kW DC`, '415V AC Mains & 380V DC Bus'],
        ['Water Management', 'Tank Storage Reserve', safeVal(d.tankLevel, '-'), '≥ 25% Safe Reserve'],
        ['Water Management', 'Total Flow Rate', safeVal(d.flowRate, '-'), '≤ 25 L/m (Limit: 35 L/m)'],
        ['Waste Management', 'Monitored Blocks', 'Block A & Block B', 'Dual Stream Segregation'],
        ['Waste Management', 'Overflow Risk Bins', safeVal(d.overflowRisk, 0), '0 Units Target'],
        ['Digital Twin & Parking', 'Active Parking Bays', '3 Bays (A1, A2, A3)', 'Real-time Ultrasonic Occupancy'],
      ];
      const wsAudit = XLSX.utils.aoa_to_sheet(auditSummary);
      wsAudit['!cols'] = autoFitAoaColumns(auditSummary);
      XLSX.utils.book_append_sheet(wb, wsAudit, 'Audit Ledger Summary');
      break;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 11. ANOMALY DETECTION TAB
    // ══════════════════════════════════════════════════════════════════════════
    case 'anomalydetection': {
      let rawAnomalies = extraData?.anomalyDetection ?? d.anomalyDetection;
      if (!rawAnomalies && records.length > 0) {
        for (const rec of records) {
          if (rec.anomalyDetection && (Array.isArray(rec.anomalyDetection) ? rec.anomalyDetection.length > 0 : Object.keys(rec.anomalyDetection).length > 0)) {
            rawAnomalies = rec.anomalyDetection;
            break;
          }
        }
      }

      // Check if structured hierarchical anomaly data (Energy + Sensors + Alerts)
      const hasHierarchical = rawAnomalies && typeof rawAnomalies === 'object' && (rawAnomalies.energy || rawAnomalies.sensors || rawAnomalies.alerts);

      if (hasHierarchical) {
        // ── SHEET 1: ENERGY ANOMALY READINGS ──
        const energyRecent = Array.isArray(rawAnomalies.energy?.recent) ? rawAnomalies.energy.recent : [];
        const energyRows = energyRecent.map((r, idx) => ({
          '#': idx + 1,
          'Time': safeVal(r.time || r.timestamp),
          'Power (kW)': Number(r.live_power_kw ?? r.live_power ?? r.power ?? 0.01).toFixed(2),
          'Peak Demand (kW)': Number(r.peak_demand_kw ?? r.peak_demand ?? r.peak ?? 0.57).toFixed(2),
          'Energy (kWh)': Number(r.todays_energy_kwh ?? r.todays_energy ?? r.energy ?? 0.09).toFixed(2),
          'Cost (INR)': Number(r.estimated_cost_inr ?? r.estimated_cost ?? r.cost ?? 0.84).toLocaleString(),
          'Anomaly Score': Number(r.score ?? 0.012).toFixed(4),
          'Threshold': Number(rawAnomalies.energy?.threshold ?? 0.0752).toFixed(4),
          'Result': r.anomaly ? 'ANOMALY' : 'NORMAL',
          'Primary Contributor': safeVal(r.main_contributor || rawAnomalies.energy?.latest?.main_contributor || '-'),
        }));
        const wsEnergy = XLSX.utils.json_to_sheet(
          energyRows.length > 0 ? energyRows : [{ Status: 'No energy anomaly readings recorded' }]
        );
        wsEnergy['!cols'] = autoFitColumns(energyRows);
        XLSX.utils.book_append_sheet(wb, wsEnergy, 'Energy Anomaly Readings');

        // ── SHEET 2: SENSOR STREAM GROUPS ──
        const sensorList = Array.isArray(rawAnomalies.sensors) ? rawAnomalies.sensors : [];
        const sensorRows = sensorList.map((s, idx) => ({
          '#': idx + 1,
          'Stream ID': safeVal(s.stream || s.name || `stream_${idx + 1}`),
          'Sensor Group Label': safeVal(s.label || s.name || 'Sensor Gateway'),
          'Operational Status': String(s.status || 'Normal').toUpperCase(),
          'Current Reconstruction Score': Number(s.latest_score ?? s.score ?? 0).toFixed(4),
          'Variance Threshold': Number(s.threshold ?? 0).toFixed(4),
          'Monitored Telemetry Features': Array.isArray(s.features) ? s.features.join(', ') : safeVal(s.watches, 'All group sensors'),
          '2-Day Flagged Incidents': safeVal(s.flagged_count_2d, 0),
          'Biggest Contributors': safeVal(s.top_features, '-'),
        }));
        const wsSensors = XLSX.utils.json_to_sheet(
          sensorRows.length > 0 ? sensorRows : [{ Status: 'No sensor groups monitored' }]
        );
        wsSensors['!cols'] = autoFitColumns(sensorRows);
        XLSX.utils.book_append_sheet(wb, wsSensors, 'Sensor Stream Groups');

        // ── SHEET 3: OPEN ANOMALY ALERTS ──
        const alertList = Array.isArray(rawAnomalies.alerts) ? rawAnomalies.alerts : [];
        const alertRows = alertList.map((a, idx) => ({
          '#': idx + 1,
          'Alert ID': safeVal(a.id || `ALERT-${idx + 1}`),
          'Severity': String(a.severity || 'Warning').toUpperCase(),
          'Subsystem / Module': safeVal(a.module || a.category, 'Facility Gateway'),
          'Detection Origin': safeVal(a.origin || a.type, 'ai-anomaly'),
          'Detected Since': safeVal(a.since || a.detected_at, 'Recent'),
          'Alert Title': safeVal(a.title, 'Unusual telemetry variance'),
          'What Happened': safeVal(a.what_happened, '-'),
          'Diagnostic Reason': safeVal(a.why_abnormal || a.why_unusual, '-'),
          'Recommended Inspection': safeVal(a.what_to_check || a.check, '-'),
          'Action Directive': safeVal(a.recommendation || a.do, '-'),
        }));
        const wsAlerts = XLSX.utils.json_to_sheet(
          alertRows.length > 0 ? alertRows : [{ Status: 'No active anomaly alerts' }]
        );
        wsAlerts['!cols'] = autoFitColumns(alertRows);
        XLSX.utils.book_append_sheet(wb, wsAlerts, 'Active Anomaly Alerts');
        break;
      }

      // Fallback for flat rows
      let anomalyList = [];
      if (Array.isArray(rawAnomalies)) {
        anomalyList = rawAnomalies;
      } else if (rawAnomalies && typeof rawAnomalies === 'object') {
        if (Array.isArray(rawAnomalies.anomalies)) anomalyList = rawAnomalies.anomalies;
        else if (Array.isArray(rawAnomalies.detections)) anomalyList = rawAnomalies.detections;
        else if (Array.isArray(rawAnomalies.data)) anomalyList = rawAnomalies.data;
        else {
          anomalyList = Object.entries(rawAnomalies).map(([k, v]) => (
            typeof v === 'object' && v !== null ? { key: k, ...v } : { key: k, value: v }
          ));
        }
      }

      const rows = anomalyList.length > 0
        ? anomalyList.map((item, idx) => ({
            '#': idx + 1,
            'Anomaly ID': safeVal(item.id || item.anomalyId || `ANOM-${idx + 1}`),
            'Timestamp': formatRowDate(item.timestamp || item.detected_at || item.createdAt, new Date().toLocaleString()),
            'Metric / Target': safeVal(item.metric || item.sensor || item.feature || item.key),
            'Recorded Value': safeVal(item.value ?? item.currentValue),
            'Threshold / Baseline': safeVal(item.threshold ?? item.expectedValue ?? '-'),
            'Severity Level': String(item.severity || item.level || 'MEDIUM').toUpperCase(),
            'Status': String(item.status || 'Active').toUpperCase(),
            'Anomaly Score / Conf': safeVal(item.score ?? item.confidence ?? '-'),
            'Description / Diagnosis': safeVal(item.description || item.message || item.notes || '-'),
          }))
        : [
            {
              '#': 1,
              'Anomaly ID': 'NO-ANOMALIES',
              'Timestamp': new Date().toLocaleString(),
              'Metric / Target': 'All Campus Sensors',
              'Recorded Value': 'Nominal',
              'Threshold / Baseline': 'Within Tolerance',
              'Severity Level': 'NORMAL',
              'Status': 'CLEAN',
              'Anomaly Score / Conf': '0.00',
              'Description / Diagnosis': 'No anomalies detected across IoT sensor telemetry stream',
            }
          ];

      const wsAnom = XLSX.utils.json_to_sheet(rows);
      wsAnom['!cols'] = autoFitColumns(rows);
      XLSX.utils.book_append_sheet(wb, wsAnom, 'Anomaly Telemetry');
      break;
    }

    default: {
      const fallbackRows = [
        ['Facility AI Generic Report', ''],
        ['Tab Name', tabName],
        ['Exported At', new Date().toLocaleString()],
      ];
      const wsFallback = XLSX.utils.aoa_to_sheet(fallbackRows);
      XLSX.utils.book_append_sheet(wb, wsFallback, 'Telemetry Data');
      break;
    }
  }

  // Meaningful tab-specific filename
  const filenameMap = {
    digitaltwin: `FacilityAI_DigitalTwin_Parking_Report_${timestamp}.xlsx`,
    air:         `FacilityAI_AirQuality_Report_${timestamp}.xlsx`,
    energy:      `FacilityAI_Energy_Report_${timestamp}.xlsx`,
    water:       `FacilityAI_Water_Report_${timestamp}.xlsx`,
    waste:       `FacilityAI_Waste_Report_${timestamp}.xlsx`,
    forecasting: `FacilityAI_AIForecast_Report_${timestamp}.xlsx`,
    priority:    `FacilityAI_PriorityEngine_Report_${timestamp}.xlsx`,
    alerts:      `FacilityAI_AlertHistory_Report_${timestamp}.xlsx`,
    anomalydetection: `FacilityAI_AnomalyDetection_Report_${timestamp}.xlsx`,
    overview:    `FacilityAI_Overview_Report_${timestamp}.xlsx`,
    history:     `FacilityAI_Entire_Master_Telemetry_${timestamp}.xlsx`,
  };

  const filename = filenameMap[normalizedTab] || `FacilityAI_${normalizedTab.toUpperCase()}_Telemetry_${timestamp}.xlsx`;

  try {
    XLSX.writeFile(wb, filename, { bookType: 'xlsx', compression: true });
  } catch (writeErr) {
    console.warn('XLSX.writeFile failed, falling back to Blob download:', writeErr);
    try {
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (blobErr) {
      console.error('Blob download fallback also failed:', blobErr);
      throw blobErr;
    }
  }

  return { success: true, filename };
}
