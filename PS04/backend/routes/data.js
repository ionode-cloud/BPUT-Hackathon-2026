const express    = require('express');
const mongoose   = require('mongoose');
const router     = express.Router();
const SensorData = require('../models/SensorData');

function normalizeValveFields(body) {
  if (!body || typeof body !== 'object') return body;
  if (body.Valve1 !== undefined) {
    if (body.valve1 === undefined) body.valve1 = body.Valve1;
    delete body.Valve1;
  }
  if (body.valve1 !== undefined) {
    body.valve1 = body.valve1 === true || body.valve1 === 'true' || body.valve1 === 1 || body.valve1 === '1';
  }
  if (body.Valve2 !== undefined) {
    if (body.valve2 === undefined) body.valve2 = body.Valve2;
    delete body.Valve2;
  }
  if (body.valve2 !== undefined) {
    body.valve2 = body.valve2 === true || body.valve2 === 'true' || body.valve2 === 1 || body.valve2 === '1';
  }
  return body;
}

function normalizeDynamicFields(body) {
  if (!body || typeof body !== 'object') return body;

  // Accept aiForecasting, aiForeacst, or aiForecast, consolidate into single canonical field aiForecasting
  if (body.aiForecasting === undefined) {
    if (body.aiForeacst !== undefined) body.aiForecasting = body.aiForeacst;
    else if (body.aiForecast !== undefined) body.aiForecasting = body.aiForecast;
  }
  delete body.aiForeacst;
  delete body.aiForecast;

  // Accept "priority Engine", "Priority Engine", etc., consolidate into single field priorityEngine
  if (body.priorityEngine === undefined) {
    if (body['priority Engine'] !== undefined) body.priorityEngine = body['priority Engine'];
    else if (body['Priority Engine'] !== undefined) body.priorityEngine = body['Priority Engine'];
    else if (body['priority engine'] !== undefined) body.priorityEngine = body['priority engine'];
  }
  delete body['priority Engine'];
  delete body['Priority Engine'];
  delete body['priority engine'];

  // Normalize Waste fields (handle PascalCase and variations e.g. WasteWetFill)
  if (body.wasteWetFill === undefined) {
    if (body.WasteWetFill !== undefined) body.wasteWetFill = body.WasteWetFill;
    else if (body['waste_wet_fill'] !== undefined) body.wasteWetFill = body['waste_wet_fill'];
  }
  if (body.WasteWetFill === undefined && body.wasteWetFill !== undefined) {
    body.WasteWetFill = body.wasteWetFill;
  }
  delete body['waste_wet_fill'];

  if (body.wasteDryFill === undefined) {
    if (body.WasteDryFill !== undefined) body.wasteDryFill = body.WasteDryFill;
    else if (body['waste_dry_fill'] !== undefined) body.wasteDryFill = body['waste_dry_fill'];
  }
  if (body.WasteDryFill === undefined && body.wasteDryFill !== undefined) {
    body.WasteDryFill = body.wasteDryFill;
  }
  delete body['waste_dry_fill'];

  if (body.wasteWet === undefined) {
    if (body.WasteWet !== undefined) body.wasteWet = body.WasteWet;
    else if (body['waste_wet'] !== undefined) body.wasteWet = body['waste_wet'];
  }
  delete body.WasteWet;
  delete body['waste_wet'];

  if (body.wasteDry === undefined) {
    if (body.WasteDry !== undefined) body.wasteDry = body.WasteDry;
    else if (body['waste_dry'] !== undefined) body.wasteDry = body.WasteDry;
  }
  delete body.WasteDry;
  delete body['waste_dry'];

  // Smart Parking Bays: a1, a2, a3 (true = Free, false = Occupied)
  if (body.a1 === undefined) {
    if (body.A1 !== undefined) body.a1 = body.A1;
    else if (body['bayA1'] !== undefined) body.a1 = body['bayA1'];
    else if (body['bay_a1'] !== undefined) body.a1 = body['bay_a1'];
  }
  if (body.a2 === undefined) {
    if (body.A2 !== undefined) body.a2 = body.A2;
    else if (body['bayA2'] !== undefined) body.a2 = body['bayA2'];
    else if (body['bay_a2'] !== undefined) body.a2 = body['bay_a2'];
  }
  if (body.a3 === undefined) {
    if (body.A3 !== undefined) body.a3 = body.A3;
    else if (body['bayA3'] !== undefined) body.a3 = body['bayA3'];
    else if (body['bay_a3'] !== undefined) body.a3 = body['bay_a3'];
  }
  delete body.A1;
  delete body.A2;
  delete body.A3;
  delete body['bayA1'];
  delete body['bayA2'];
  delete body['bayA3'];
  delete body['bay_a1'];
  delete body['bay_a2'];
  delete body['bay_a3'];

  // Normalize val1 and val2 fields
  if (body.val1 === undefined) {
    if (body.Val1 !== undefined) body.val1 = body.Val1;
    else if (body.VAL1 !== undefined) body.val1 = body.VAL1;
  }
  if (body.val2 === undefined) {
    if (body.Val2 !== undefined) body.val2 = body.Val2;
    else if (body.VAL2 !== undefined) body.val2 = body.VAL2;
  }
  delete body.Val1;
  delete body.Val2;
  delete body.VAL1;
  delete body.VAL2;

  // Normalize flow rate fields for val1 and val2 (val1Flow & val2Flow in L/m)
  if (body.val1Flow === undefined) {
    if (body.flowRate1 !== undefined) body.val1Flow = body.flowRate1;
    else if (body.val1_flow !== undefined) body.val1Flow = body.val1_flow;
    else if (body.flow1 !== undefined) body.val1Flow = body.flow1;
    else if (body.Flow1 !== undefined) body.val1Flow = body.Flow1;
    else if (body.flow_rate_1 !== undefined) body.val1Flow = body.flow_rate_1;
    else if (body.flowRate_1 !== undefined) body.val1Flow = body.flowRate_1;
  }
  if (body.val2Flow === undefined) {
    if (body.flowRate2 !== undefined) body.val2Flow = body.flowRate2;
    else if (body.val2_flow !== undefined) body.val2Flow = body.val2_flow;
    else if (body.flow2 !== undefined) body.val2Flow = body.flow2;
    else if (body.Flow2 !== undefined) body.val2Flow = body.Flow2;
    else if (body.flow_rate_2 !== undefined) body.val2Flow = body.flow_rate_2;
    else if (body.flowRate_2 !== undefined) body.val2Flow = body.flowRate_2;
  }
  if (body.val1Flow !== undefined) {
    body.val1Flow = Number(body.val1Flow);
  }
  if (body.val2Flow !== undefined) {
    body.val2Flow = Number(body.val2Flow);
  }
  delete body.flowRate1;
  delete body.flowRate2;
  delete body.flow1;
  delete body.flow2;
  delete body.Flow1;
  delete body.Flow2;
  delete body.val1_flow;
  delete body.val2_flow;
  delete body.flow_rate_1;
  delete body.flow_rate_2;
  delete body.flowRate_1;
  delete body.flowRate_2;

  // Remove generator fields
  delete body.generatorStatus;
  delete body.generatorFuel;
  delete body.generatorLoad;
  delete body.generatorRuntime;

  if (body.a1 !== undefined) {
    body.a1 = body.a1 === true || body.a1 === 'true' || body.a1 === 1 || body.a1 === '1';
  }
  if (body.a2 !== undefined) {
    body.a2 = body.a2 === true || body.a2 === 'true' || body.a2 === 1 || body.a2 === '1';
  }
  if (body.a3 !== undefined) {
    body.a3 = body.a3 === true || body.a3 === 'true' || body.a3 === 1 || body.a3 === '1';
  }

  return body;
}

const DEFAULT_WASTE_BLOCKS = [
  {
    id: 'block-a',
    name: 'Block A',
    code: 'BL-A',
    dryFill: 0,
    wetFill: 28,
    dryWeight: 0,
    wetWeight: 9.8,
    status: 'Optimal',
    complianceScore: 94,
    lastCollection: '2h ago',
    directive: 'Organic bio-feed stream active. Next sweep at 16:30.',
  },
  {
    id: 'block-b',
    name: 'Block B',
    code: 'BL-B',
    dryFill: 68,
    wetFill: 0,
    dryWeight: 42.0,
    wetWeight: 0,
    status: 'Moderate',
    complianceScore: 88,
    lastCollection: '3h ago',
    directive: 'Block B dry recyclables container at 68% capacity. Dispatch in evening run.',
  },
];

function computeBlockStatus(block) {
  const wet = Number(block.wetFill || 0);
  const dry = Number(block.dryFill || 0);
  if (wet > 80) return 'Wet Overflow Risk';
  if (dry > 80) return 'Dry Overflow Risk';
  if (wet > 60 || dry > 60) return 'Moderate';
  return 'Optimal';
}

function normalizeWasteBlocks(rawBlocks) {
  const allowedIds = new Set(['block-a', 'block-b']);
  const allowedCodes = new Set(['BL-A', 'BL-B']);
  const source = Array.isArray(rawBlocks)
    ? rawBlocks.filter(b => b && (allowedIds.has(b.id) || allowedCodes.has(b.code)))
    : [];

  return DEFAULT_WASTE_BLOCKS.map(def => {
    const existing = source.find(b => b.id === def.id || b.code === def.code);
    if (!existing) return { ...def };
    const merged = { ...def, ...existing };
    if (!merged.name || merged.name.includes('Academic') || merged.name.includes('Hostel')) {
      merged.name = def.name;
    }
    merged.status = computeBlockStatus(merged);
    if (!existing.directive) {
      merged.directive = merged.wetFill > 80 || merged.dryFill > 80
        ? 'High fill surge! Dispatch sanitation collection immediately.'
        : (merged.wetFill > 60 || merged.dryFill > 60
          ? 'Approaching capacity. Schedule collection in next sweep.'
          : def.directive);
    }
    return merged;
  });
}

function computeActiveAvgFill(blocks, field) {
  const active = blocks.map(b => Number(b[field] || 0)).filter(v => v > 0);
  if (active.length === 0) return 0;
  return Math.round(active.reduce((acc, v) => acc + v, 0) / active.length);
}

function syncWasteTelemetry(obj, explicitBody = null) {
  const hadExtraBlocks = Array.isArray(obj.wasteBlocks) && obj.wasteBlocks.length > 2;
  obj.wasteBlocks = normalizeWasteBlocks(obj.wasteBlocks);

  const blockA = obj.wasteBlocks[0];
  const blockB = obj.wasteBlocks[1];

  const hasExplicitBlocks = explicitBody && Array.isArray(explicitBody.wasteBlocks);
  const hasExplicitScalars = explicitBody && (
    explicitBody.wasteWetFill !== undefined ||
    explicitBody.WasteWetFill !== undefined ||
    explicitBody.wasteWet !== undefined ||
    explicitBody.wasteDryFill !== undefined ||
    explicitBody.WasteDryFill !== undefined ||
    explicitBody.wasteDry !== undefined
  );

  // When IoT/API updates top-level waste scalars without wasteBlocks, sync Block A (wet) & Block B (dry)
  if (hasExplicitScalars && !hasExplicitBlocks) {
    if (explicitBody.wasteWetFill !== undefined || explicitBody.WasteWetFill !== undefined) {
      const wf = Number(explicitBody.wasteWetFill ?? explicitBody.WasteWetFill);
      if (!isNaN(wf)) {
        blockA.wetFill = wf;
        blockA.status = computeBlockStatus(blockA);
      }
    }
    if (explicitBody.wasteWet !== undefined) {
      const ww = Number(explicitBody.wasteWet);
      if (!isNaN(ww)) blockA.wetWeight = ww;
    }
    if (explicitBody.wasteDryFill !== undefined || explicitBody.WasteDryFill !== undefined) {
      const df = Number(explicitBody.wasteDryFill ?? explicitBody.WasteDryFill);
      if (!isNaN(df)) {
        blockB.dryFill = df;
        blockB.status = computeBlockStatus(blockB);
      }
    }
    if (explicitBody.wasteDry !== undefined) {
      const dw = Number(explicitBody.wasteDry);
      if (!isNaN(dw)) blockB.dryWeight = dw;
    }
  }

  const totalDry = obj.wasteBlocks.reduce((acc, b) => acc + Number(b.dryWeight || 0), 0);
  const totalWet = obj.wasteBlocks.reduce((acc, b) => acc + Number(b.wetWeight || 0), 0);
  const calcDryFill = computeActiveAvgFill(obj.wasteBlocks, 'dryFill');
  const calcWetFill = computeActiveAvgFill(obj.wasteBlocks, 'wetFill');
  const calcOverflow = obj.wasteBlocks.filter(b => Number(b.wetFill || 0) > 80 || Number(b.dryFill || 0) > 80).length;

  const shouldRecomputeAll = hadExtraBlocks || hasExplicitBlocks || hasExplicitScalars;

  if (shouldRecomputeAll || obj.wasteDry === undefined || obj.wasteDry === null) {
    obj.wasteDry = (hasExplicitScalars && explicitBody.wasteDry !== undefined) ? Number(explicitBody.wasteDry) : Number(totalDry.toFixed(1));
  }
  if (shouldRecomputeAll || obj.wasteWet === undefined || obj.wasteWet === null) {
    obj.wasteWet = (hasExplicitScalars && explicitBody.wasteWet !== undefined) ? Number(explicitBody.wasteWet) : Number(totalWet.toFixed(1));
  }
  if (shouldRecomputeAll || obj.wasteDryFill === undefined || obj.wasteDryFill === null) {
    if (hasExplicitScalars && (explicitBody.wasteDryFill !== undefined || explicitBody.WasteDryFill !== undefined)) {
      obj.wasteDryFill = Number(explicitBody.wasteDryFill ?? explicitBody.WasteDryFill);
    } else {
      obj.wasteDryFill = (obj.WasteDryFill != null && !hadExtraBlocks && !hasExplicitBlocks) ? Number(obj.WasteDryFill) : calcDryFill;
    }
  }
  obj.WasteDryFill = obj.wasteDryFill;

  if (shouldRecomputeAll || obj.wasteWetFill === undefined || obj.wasteWetFill === null) {
    if (hasExplicitScalars && (explicitBody.wasteWetFill !== undefined || explicitBody.WasteWetFill !== undefined)) {
      obj.wasteWetFill = Number(explicitBody.wasteWetFill ?? explicitBody.WasteWetFill);
    } else {
      obj.wasteWetFill = (obj.WasteWetFill != null && !hadExtraBlocks && !hasExplicitBlocks) ? Number(obj.WasteWetFill) : calcWetFill;
    }
  }
  obj.WasteWetFill = obj.wasteWetFill;

  if (shouldRecomputeAll || obj.overflowRisk === undefined || obj.overflowRisk === null) {
    if (!explicitBody || explicitBody.overflowRisk === undefined) {
      obj.overflowRisk = calcOverflow;
    }
  }

  return hadExtraBlocks;
}

function attachDynamicDefaults(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  // Use whatever value was stored or PUT by user; default to empty object {} if unset
  const forecastVal = obj.aiForecasting !== undefined
    ? obj.aiForecasting
    : (obj.aiForeacst !== undefined
      ? obj.aiForeacst
      : (obj.aiForecast !== undefined ? obj.aiForecast : {}));
  obj.aiForecasting = forecastVal;
  delete obj.aiForeacst;
  delete obj.aiForecast;

  const priorityVal = obj.priorityEngine !== undefined ? obj.priorityEngine : (obj['priority Engine'] !== undefined ? obj['priority Engine'] : {});
  obj.priorityEngine = priorityVal;
  delete obj['priority Engine'];
  delete obj['Priority Engine'];
  delete obj['priority engine'];

  // ── 1. Energy: AC vs DC Supply Power Profiling ──────────────────────────
  const liveKw = typeof obj.livePower === 'number' && !isNaN(obj.livePower) ? obj.livePower : 18.4;
  const todayKwh = typeof obj.todaysEnergy === 'number' && !isNaN(obj.todaysEnergy) ? obj.todaysEnergy : 142.5;

  if (obj.acPower === undefined || obj.acPower === null) {
    obj.acPower = Number((liveKw * 0.78).toFixed(1)); // 78% AC (Mains, Chillers, Heavy Lab loads)
  }
  if (obj.acEnergy === undefined || obj.acEnergy === null) {
    obj.acEnergy = Number((todayKwh * 0.76).toFixed(1));
  }
  if (obj.dcPower === undefined || obj.dcPower === null) {
    obj.dcPower = Number((liveKw * 0.22).toFixed(1)); // 22% DC (Solar PV bus, BESS, Server DC racks)
  }
  if (obj.dcEnergy === undefined || obj.dcEnergy === null) {
    obj.dcEnergy = Number((todayKwh * 0.24).toFixed(1));
  }

  // ── 2. Energy: Grid Status ─────────────────────────────────────────────
  if (!obj.gridStatus) {
    obj.gridStatus = 'ONLINE';
  }
  delete obj.generatorStatus;
  delete obj.generatorFuel;
  delete obj.generatorLoad;
  delete obj.generatorRuntime;

  // ── 3. Street Light Monitoring ──────────────────────────────────────────
  if (obj.streetLightTotal === undefined || obj.streetLightTotal === null) {
    obj.streetLightTotal = 48; // 48 smart poles across campus ring road & avenues
  }
  if (!obj.streetLightStatus) {
    const lux = typeof obj.lightIntensity === 'number' ? obj.lightIntensity : 120;
    obj.streetLightStatus = lux < 50 ? 'ON' : 'OFF';
  }
  if (obj.streetLightsActive === undefined || obj.streetLightsActive === null) {
    obj.streetLightsActive = obj.streetLightStatus === 'OFF' ? 0 : 44; // 44/48 active when ON
  }
  if (obj.streetLightPower === undefined || obj.streetLightPower === null) {
    obj.streetLightPower = obj.streetLightStatus === 'OFF' ? 0 : 4.4; // kW
  }
  if (obj.streetLightEnergy === undefined || obj.streetLightEnergy === null) {
    obj.streetLightEnergy = 38.6; // kWh
  }
  if (obj.streetLightDimming === undefined || obj.streetLightDimming === null) {
    obj.streetLightDimming = 80; // % brightness
  }

  // ── 4. Waste Management: Only Block A & Block B ─────────────────────────
  syncWasteTelemetry(obj);

  // ── 5. Smart Parking: 3 Real Bays (a1, a2, a3) ──────────────────────────
  // Rule: true = Free / Available, false = Occupied
  if (obj.a1 === undefined || obj.a1 === null) {
    obj.a1 = true; // default Free
  } else {
    obj.a1 = obj.a1 === true || obj.a1 === 'true' || obj.a1 === 1 || obj.a1 === '1';
  }

  if (obj.a2 === undefined || obj.a2 === null) {
    obj.a2 = false; // default Occupied
  } else {
    obj.a2 = obj.a2 === true || obj.a2 === 'true' || obj.a2 === 1 || obj.a2 === '1';
  }

  if (obj.a3 === undefined || obj.a3 === null) {
    obj.a3 = true; // default Free
  } else {
    obj.a3 = obj.a3 === true || obj.a3 === 'true' || obj.a3 === 1 || obj.a3 === '1';
  }

  obj.totalSlots = 3;
  const isA1Occ = !obj.a1;
  const isA2Occ = !obj.a2;
  const isA3Occ = !obj.a3;
  obj.occupiedSlots = [isA1Occ, isA2Occ, isA3Occ].filter(Boolean).length;
  obj.parkingOccupancy = Math.round((obj.occupiedSlots / 3) * 100);

  if (obj.vehiclesToday === undefined || obj.vehiclesToday === null) {
    obj.vehiclesToday = 482;
  }
  if (obj.avgWaitingTime === undefined || obj.avgWaitingTime === null) {
    obj.avgWaitingTime = 3.5;
  }

  // ── 6. Water: Acoustic Leak Telemetry (val1 & val2) ─────────────────────
  if (obj.val1 === undefined || obj.val1 === null) {
    obj.val1 = obj.leakStatus && obj.leakStatus !== 'Normal' ? obj.leakStatus : 'Normal';
  }
  if (obj.val2 === undefined || obj.val2 === null) {
    obj.val2 = 'Normal';
  }

  // ── 7. Water: Individual Flow Rates for val1 & val2 (val1Flow & val2Flow in L/m) ──────────────
  const baseFlow = typeof obj.flowRate === 'number' && !isNaN(obj.flowRate) ? obj.flowRate : 0;
  if (obj.val1Flow === undefined || obj.val1Flow === null) {
    obj.val1Flow = obj.flowRate1 !== undefined && obj.flowRate1 !== null
      ? Number(obj.flowRate1)
      : (baseFlow > 0 ? Number((baseFlow * 0.65).toFixed(1)) : 0);
  }
  if (obj.val2Flow === undefined || obj.val2Flow === null) {
    obj.val2Flow = obj.flowRate2 !== undefined && obj.flowRate2 !== null
      ? Number(obj.flowRate2)
      : (baseFlow > 0 ? Number((baseFlow * 0.35).toFixed(1)) : 0);
  }
  obj.val1Flow = Number(Number(obj.val1Flow).toFixed(1));
  obj.val2Flow = Number(Number(obj.val2Flow).toFixed(1));
  delete obj.flowRate1;
  delete obj.flowRate2;
  delete obj.flow1;
  delete obj.flow2;
  if (obj.flowRate === undefined || obj.flowRate === null || obj.flowRate === 0) {
    obj.flowRate = Number((obj.val1Flow + obj.val2Flow).toFixed(1));
  }

  return obj;
}

// ── Persistent Actuator States for Water Valves ─────────────────────────────
// Valves are manually operated actuators and must NOT auto-reset to OFF
// when periodic sensor nodes post readings without valve state.
let persistentValveState = {
  valve1: null,
  valve2: null,
};

async function getOrInitValveState() {
  if (persistentValveState.valve1 === null || persistentValveState.valve2 === null) {
    try {
      const latestWithValve = await SensorData.findOne({
        $or: [{ valve1: { $exists: true } }, { valve2: { $exists: true } }]
      }).sort({ timestamp: -1 }).lean();
      if (latestWithValve) {
        if (persistentValveState.valve1 === null && latestWithValve.valve1 !== undefined) {
          persistentValveState.valve1 = Boolean(latestWithValve.valve1);
        }
        if (persistentValveState.valve2 === null && latestWithValve.valve2 !== undefined) {
          persistentValveState.valve2 = Boolean(latestWithValve.valve2);
        }
      }
    } catch (e) {
      // ignore
    }
    if (persistentValveState.valve1 === null) persistentValveState.valve1 = false;
    if (persistentValveState.valve2 === null) persistentValveState.valve2 = false;
  }
  return persistentValveState;
}

/* ═══════════════════════════════════════════════════════════════════════════
   GET  /api/data          → latest record (default) OR all records with ?all=true
   GET  /api/data?all=true → array of all records, newest first
   GET  /api/data?limit=N  → last N records, newest first
   GET  /api/data/:id      → single record by Mongo _id
   ═══════════════════════════════════════════════════════════════════════════ */
router.get('/', async (req, res) => {
  try {
    const { all, limit } = req.query;

    if (all === 'true') {
      const lim    = parseInt(limit) || 0;           // 0 = no limit in mongoose
      const records = await SensorData.find()
        .sort({ timestamp: -1 })
        .limit(lim)
        .lean();
      const mapped = records.map(r => {
        const v1 = r.valve1 !== undefined ? r.valve1 : (r.Valve1 !== undefined ? r.Valve1 : false);
        const v2 = r.valve2 !== undefined ? r.valve2 : (r.Valve2 !== undefined ? r.Valve2 : false);
        const { Valve1, Valve2, ...rest } = r;
        const item = {
          ...rest,
          valve1: Boolean(v1),
          valve2: Boolean(v2),
        };
        return attachDynamicDefaults(item);
      });
      return res.json({ success: true, count: mapped.length, data: mapped });
    }

    // Default: return consolidated facility snapshot with most recent non-null telemetry
    const records = await SensorData.find().sort({ timestamp: -1 }).limit(20).lean();
    if (!records || records.length === 0) {
      return res.status(404).json({ success: false, message: 'No sensor data found.' });
    }

    // Merge non-null fields from oldest to newest so newest non-null readings always win
    const consolidated = {};
    for (let i = records.length - 1; i >= 0; i--) {
      const rec = records[i];
      for (const [key, val] of Object.entries(rec)) {
        if (val !== null && val !== undefined) {
          consolidated[key] = val;
        }
      }
    }
    // Retain newest record's identity and timestamp
    consolidated._id = records[0]._id;
    consolidated.timestamp = records[0].timestamp;
    consolidated.createdAt = records[0].createdAt;
    consolidated.updatedAt = records[0].updatedAt;

    // Ensure valve1 and valve2 default to boolean false if not defined in older records
    const v1 = consolidated.valve1 !== undefined ? consolidated.valve1 : (consolidated.Valve1 !== undefined ? consolidated.Valve1 : false);
    const v2 = consolidated.valve2 !== undefined ? consolidated.valve2 : (consolidated.Valve2 !== undefined ? consolidated.Valve2 : false);
    
    // Always honor persistent manual actuator state set by operator clicks
    const currentValves = await getOrInitValveState();
    consolidated.valve1 = currentValves.valve1 !== null ? currentValves.valve1 : Boolean(v1);
    consolidated.valve2 = currentValves.valve2 !== null ? currentValves.valve2 : Boolean(v2);
    delete consolidated.Valve1;
    delete consolidated.Valve2;

    // Attach dynamic AI Forecast, Priority Engine, and Parking Bay (a1, a2, a3) defaults
    attachDynamicDefaults(consolidated);

    // If the latest document in MongoDB has generator fields, remove them permanently
    if (records[0] && (records[0].generatorStatus !== undefined || records[0].generatorFuel !== undefined || records[0].generatorLoad !== undefined || records[0].generatorRuntime !== undefined)) {
      SensorData.updateMany(
        {},
        {
          $unset: {
            generatorStatus: 1,
            generatorFuel: 1,
            generatorLoad: 1,
            generatorRuntime: 1,
          }
        }
      ).catch(() => {});
    }

    // If the latest document in MongoDB is missing a1, a2, or a3, persist them to MongoDB now so MongoDB Atlas has them permanently
    if (records[0] && (records[0].a1 === undefined || records[0].a2 === undefined || records[0].a3 === undefined)) {
      SensorData.updateOne(
        { _id: records[0]._id },
        {
          $set: {
            a1: consolidated.a1,
            a2: consolidated.a2,
            a3: consolidated.a3,
            totalSlots: 3,
            occupiedSlots: consolidated.occupiedSlots,
            parkingOccupancy: consolidated.parkingOccupancy,
          }
        }
      ).catch(() => {});
    }

    // If the latest document in MongoDB is missing val1 or val2, persist them to MongoDB now
    if (records[0] && (records[0].val1 === undefined || records[0].val2 === undefined)) {
      SensorData.updateOne(
        { _id: records[0]._id },
        {
          $set: {
            val1: consolidated.val1,
            val2: consolidated.val2,
          }
        }
      ).catch(() => {});
    }

    // Unset flowRate1, flowRate2, flow1, flow2 if present in existing document
    if (records[0] && (records[0].flowRate1 !== undefined || records[0].flowRate2 !== undefined || records[0].flow1 !== undefined || records[0].flow2 !== undefined)) {
      SensorData.updateMany(
        {},
        {
          $unset: {
            flowRate1: 1,
            flowRate2: 1,
            flow1: 1,
            flow2: 1,
          }
        }
      ).catch(() => {});
    }

    // If the latest document in MongoDB is missing val1Flow or val2Flow, persist them to MongoDB now
    if (records[0] && (records[0].val1Flow === undefined || records[0].val2Flow === undefined)) {
      SensorData.updateOne(
        { _id: records[0]._id },
        {
          $set: {
            val1Flow: consolidated.val1Flow,
            val2Flow: consolidated.val2Flow,
          }
        }
      ).catch(() => {});
    }

    // If the latest document still has Block C/D/E, old block names, or missing wasteBlocks, update MongoDB
    const hasStaleWasteBlocks = !records[0] || !Array.isArray(records[0].wasteBlocks) ||
      records[0].wasteBlocks.length !== 2 ||
      records[0].wasteBlocks.some(b =>
        (b.id !== 'block-a' && b.id !== 'block-b') ||
        (b.name || '').includes('Academic') ||
        (b.name || '').includes('Hostel')
      );
    if (records[0] && hasStaleWasteBlocks) {
      SensorData.updateOne(
        { _id: records[0]._id },
        {
          $set: {
            wasteBlocks: consolidated.wasteBlocks,
            wasteDry: consolidated.wasteDry,
            wasteWet: consolidated.wasteWet,
            wasteDryFill: consolidated.wasteDryFill,
            WasteDryFill: consolidated.WasteDryFill,
            wasteWetFill: consolidated.wasteWetFill,
            WasteWetFill: consolidated.WasteWetFill,
            overflowRisk: consolidated.overflowRisk,
          }
        }
      ).catch(() => {});
    }

    res.json({ success: true, data: consolidated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Invalid record ID format.' });
    }
    const record = await SensorData.findById(req.params.id).lean();
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }
    const v1 = record.valve1 !== undefined ? record.valve1 : (record.Valve1 !== undefined ? record.Valve1 : false);
    const v2 = record.valve2 !== undefined ? record.valve2 : (record.Valve2 !== undefined ? record.Valve2 : false);
    const currentValves = await getOrInitValveState();
    record.valve1 = currentValves.valve1 !== null ? currentValves.valve1 : Boolean(v1);
    record.valve2 = currentValves.valve2 !== null ? currentValves.valve2 : Boolean(v2);
    delete record.Valve1;
    delete record.Valve2;
    attachDynamicDefaults(record);
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   POST  /api/data   → create a new sensor-data snapshot
   Body  (JSON)      → any subset of SensorData fields
   ═══════════════════════════════════════════════════════════════════════════ */
router.post('/', async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }
    normalizeValveFields(body);
    normalizeDynamicFields(body);

    const currentValves = await getOrInitValveState();

    // If incoming body is partial, inherit previous known readings so different sensor channels don't blank each other out
    const latest = await SensorData.findOne().sort({ timestamp: -1 }).lean();
    let payload = { ...body };
    if (latest) {
      const { _id, createdAt, updatedAt, __v, ...prevFields } = latest;
      payload = { ...prevFields, ...body };
    }
    delete payload._id;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.__v;

    // Actuators (Valve 1 & 2) must only change via explicit operator action (PUT), NEVER auto-revert from sensor telemetry POSTs
    if (body.valve1 === undefined && body.Valve1 === undefined) {
      payload.valve1 = currentValves.valve1;
    } else if (body.source === 'sensor' || (!body.source && body.source !== 'manual')) {
      // Periodic sensor ingestion preserves current valve state unless explicitly forced by manual operator
      payload.valve1 = currentValves.valve1;
    } else {
      persistentValveState.valve1 = Boolean(body.valve1);
      payload.valve1 = persistentValveState.valve1;
    }

    if (body.valve2 === undefined && body.Valve2 === undefined) {
      payload.valve2 = currentValves.valve2;
    } else if (body.source === 'sensor' || (!body.source && body.source !== 'manual')) {
      payload.valve2 = currentValves.valve2;
    } else {
      persistentValveState.valve2 = Boolean(body.valve2);
      payload.valve2 = persistentValveState.valve2;
    }

    // Sync waste blocks (Block A & Block B only) with any updated scalar waste values before attaching defaults
    syncWasteTelemetry(payload, body);

    // Guarantee all dynamic fields, including a1, a2, a3, are defaulted and attached directly to payload BEFORE saving to MongoDB
    attachDynamicDefaults(payload);
    payload.timestamp = new Date();
    const record = await SensorData.create(payload);
    const postData = record.toObject ? record.toObject() : { ...record };
    delete postData.Valve1;
    delete postData.Valve2;
    res.status(201).json({ success: true, message: 'Sensor data created.', data: postData });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   PUT  /api/data      → full / partial update of the most-recent snapshot
   Body (JSON)         → fields to update
   ═══════════════════════════════════════════════════════════════════════════ */
router.put('/', async (req, res) => {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }
    normalizeValveFields(body);
    normalizeDynamicFields(body);

    if (body.valve1 !== undefined) {
      persistentValveState.valve1 = Boolean(body.valve1);
    }
    if (body.valve2 !== undefined) {
      persistentValveState.valve2 = Boolean(body.valve2);
    }

    // Find the latest record to update, or create one if database is empty
    let record = await SensorData.findOne().sort({ timestamp: -1 });
    if (!record) {
      const newPayload = { ...body, timestamp: new Date() };
      delete newPayload._id;
      delete newPayload.createdAt;
      delete newPayload.updatedAt;
      delete newPayload.__v;
      syncWasteTelemetry(newPayload, body);
      record = await SensorData.create(newPayload);
      const createdData = record.toObject ? record.toObject() : { ...record };
      delete createdData.Valve1;
      delete createdData.Valve2;
      attachDynamicDefaults(createdData);
      return res.status(201).json({ success: true, message: 'Sensor snapshot created.', data: createdData });
    }

    // Prepare update data, stripping Mongo immutable / internal keys so full records can be sent safely
    const updateData = { ...body };
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.__v;

    // Remove generator fields
    delete updateData.generatorStatus;
    delete updateData.generatorFuel;
    delete updateData.generatorLoad;
    delete updateData.generatorRuntime;

    // Handle val1 and val2 in PUT
    if (updateData.val1 === undefined) {
      if (record && record.val1 !== undefined) updateData.val1 = record.val1;
      else updateData.val1 = 'Normal';
    }
    if (updateData.val2 === undefined) {
      if (record && record.val2 !== undefined) updateData.val2 = record.val2;
      else updateData.val2 = 'Normal';
    }

    const isVal1Leaking = updateData.val1 === false || updateData.val1 === 'false' || updateData.val1 === 'Leak Detected' || updateData.val1 === 'Leak';
    const isVal2Leaking = updateData.val2 === false || updateData.val2 === 'false' || updateData.val2 === 'Leak Detected' || updateData.val2 === 'Leak';
    if (updateData.leakStatus === undefined) {
      if (isVal1Leaking || isVal2Leaking) {
        updateData.leakStatus = 'Leak Detected';
      }
    }

    // Handle val1Flow and val2Flow in PUT
    if (updateData.val1Flow !== undefined) {
      updateData.val1Flow = Number(updateData.val1Flow);
    } else if (updateData.flowRate1 !== undefined) {
      updateData.val1Flow = Number(updateData.flowRate1);
    } else if (record && record.val1Flow !== undefined) {
      updateData.val1Flow = record.val1Flow;
    } else {
      updateData.val1Flow = 0;
    }

    if (updateData.val2Flow !== undefined) {
      updateData.val2Flow = Number(updateData.val2Flow);
    } else if (updateData.flowRate2 !== undefined) {
      updateData.val2Flow = Number(updateData.flowRate2);
    } else if (record && record.val2Flow !== undefined) {
      updateData.val2Flow = record.val2Flow;
    } else {
      updateData.val2Flow = 0;
    }

    delete updateData.flowRate1;
    delete updateData.flowRate2;
    delete updateData.flow1;
    delete updateData.flow2;

    // Street Light actuator status synchronization
    if (updateData.streetLightStatus === 'ON') {
      updateData.streetLightsActive = updateData.streetLightTotal || (record ? record.streetLightTotal : 48);
      updateData.streetLightPower = 4.4;
    } else if (updateData.streetLightStatus === 'OFF') {
      updateData.streetLightsActive = 0;
      updateData.streetLightPower = 0;
    }

    // Guarantee Smart Parking Bays a1, a2, a3 are always present and saved to MongoDB on every PUT
    const curA1 = updateData.a1 !== undefined
      ? updateData.a1
      : (record && record.a1 !== undefined ? record.a1 : true);
    const curA2 = updateData.a2 !== undefined
      ? updateData.a2
      : (record && record.a2 !== undefined ? record.a2 : false);
    const curA3 = updateData.a3 !== undefined
      ? updateData.a3
      : (record && record.a3 !== undefined ? record.a3 : true);
    updateData.a1 = curA1;
    updateData.a2 = curA2;
    updateData.a3 = curA3;
    updateData.totalSlots = 3;
    updateData.occupiedSlots = [!curA1, !curA2, !curA3].filter(Boolean).length;
    updateData.parkingOccupancy = Math.round((updateData.occupiedSlots / 3) * 100);

    // Keep only Block A & Block B and synchronize live waste telemetry
    const recordObj = record.toObject ? record.toObject() : { ...record };
    const wasteMerged = { ...recordObj, ...updateData };
    syncWasteTelemetry(wasteMerged, body);
    updateData.wasteBlocks = wasteMerged.wasteBlocks;
    updateData.wasteDry = wasteMerged.wasteDry;
    updateData.wasteWet = wasteMerged.wasteWet;
    updateData.wasteDryFill = wasteMerged.wasteDryFill;
    updateData.WasteDryFill = wasteMerged.WasteDryFill;
    updateData.wasteWetFill = wasteMerged.wasteWetFill;
    updateData.WasteWetFill = wasteMerged.WasteWetFill;
    updateData.overflowRisk = wasteMerged.overflowRisk;

    // Update with fresh timestamp so it immediately becomes the newest live snapshot
    updateData.timestamp = new Date();

    const updated = await SensorData.findByIdAndUpdate(
      record._id,
      {
        $set: updateData,
        $unset: {
          generatorStatus: 1,
          generatorFuel: 1,
          generatorLoad: 1,
          generatorRuntime: 1,
          flowRate1: 1,
          flowRate2: 1,
          flow1: 1,
          flow2: 1,
        },
      },
      { new: true, runValidators: false, strict: false }
    );
    const putData = updated.toObject ? updated.toObject() : { ...updated };
    delete putData.Valve1;
    delete putData.Valve2;
    attachDynamicDefaults(putData);
    res.json({ success: true, message: 'Sensor data updated.', data: putData });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   PUT  /api/data/:id  → full / partial update of a single record by Mongo _id
   Body (JSON)         → fields to update (all optional)
   ═══════════════════════════════════════════════════════════════════════════ */
router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Invalid record ID format.' });
    }
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }
    normalizeValveFields(body);
    normalizeDynamicFields(body);

    if (body.valve1 !== undefined) {
      persistentValveState.valve1 = Boolean(body.valve1);
    }
    if (body.valve2 !== undefined) {
      persistentValveState.valve2 = Boolean(body.valve2);
    }

    const updateData = { ...body };
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.__v;
    delete updateData.generatorStatus;
    delete updateData.generatorFuel;
    delete updateData.generatorLoad;
    delete updateData.generatorRuntime;

    if (!body.timestamp) {
      updateData.timestamp = new Date();
    }

    const record = await SensorData.findByIdAndUpdate(
      req.params.id,
      {
        $set: updateData,
        $unset: {
          generatorStatus: 1,
          generatorFuel: 1,
          generatorLoad: 1,
          generatorRuntime: 1,
          flowRate1: 1,
          flowRate2: 1,
          flow1: 1,
          flow2: 1,
        },
      },
      { new: true, runValidators: false, strict: false }
    );
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }
    const resData = record.toObject ? record.toObject() : { ...record };
    delete resData.Valve1;
    delete resData.Valve2;
    attachDynamicDefaults(resData);
    res.json({ success: true, message: 'Sensor data updated.', data: resData });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   DELETE  /api/data/:id  → delete a single record by _id
   DELETE  /api/data      → delete ALL records (use with caution)
   ═══════════════════════════════════════════════════════════════════════════ */
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Invalid record ID format.' });
    }
    const record = await SensorData.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }
    res.json({ success: true, message: 'Sensor data deleted.', data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/', async (req, res) => {
  try {
    const { seedOnly } = req.query;
    const filter = seedOnly === 'true'
      ? { $or: [{ source: 'synthetic' }, { notes: { $regex: /seed/i } }] }
      : {};
    const result = await SensorData.deleteMany(filter);
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} ${seedOnly === 'true' ? 'seed ' : ''}record(s).`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
