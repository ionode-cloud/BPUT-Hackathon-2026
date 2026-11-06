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

  return body;
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

  // ── 2. Energy: Automatic Generator Failover ─────────────────────────────
  if (!obj.gridStatus) {
    obj.gridStatus = 'ONLINE';
  }
  if (obj.gridStatus === 'OFF') {
    // Autonomous failover: generator automatically switches ON when grid drops
    obj.generatorStatus = 'RUNNING';
    if (obj.generatorLoad === undefined || obj.generatorLoad === null || obj.generatorLoad === 0) {
      obj.generatorLoad = Number((liveKw * 0.85).toFixed(1));
    }
  } else {
    if (!obj.generatorStatus) {
      obj.generatorStatus = 'STANDBY';
    }
    if (obj.generatorStatus === 'STANDBY' || obj.generatorStatus === 'OFF') {
      obj.generatorLoad = 0;
    }
  }
  if (obj.generatorFuel === undefined || obj.generatorFuel === null) {
    obj.generatorFuel = 84; // % diesel capacity
  }
  if (obj.generatorRuntime === undefined || obj.generatorRuntime === null) {
    obj.generatorRuntime = 142.5; // Cumulative operating hours
  }

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

  // ── 4. Waste Management: Dry vs Wet Waste Block-Wise ────────────────────
  if (!Array.isArray(obj.wasteBlocks) || obj.wasteBlocks.length === 0) {
    obj.wasteBlocks = [
      {
        id: 'block-a',
        name: 'Block A (Academic & Lecture Theatres)',
        code: 'BL-A',
        dryFill: 42,
        wetFill: 28,
        dryWeight: 26.5,
        wetWeight: 9.8,
        status: 'Optimal',
        complianceScore: 94,
        lastCollection: '2h ago',
      },
      {
        id: 'block-b',
        name: 'Block B (Hostel Towers & Residential)',
        code: 'BL-B',
        dryFill: 68,
        wetFill: 62,
        dryWeight: 42.0,
        wetWeight: 38.5,
        status: 'Moderate',
        complianceScore: 88,
        lastCollection: '3h ago',
      },
      {
        id: 'block-c',
        name: 'Block C (Central Library & Administration)',
        code: 'BL-C',
        dryFill: 36,
        wetFill: 18,
        dryWeight: 19.5,
        wetWeight: 5.2,
        status: 'Optimal',
        complianceScore: 96,
        lastCollection: '1h ago',
      },
      {
        id: 'block-d',
        name: 'Block D (Campus Canteen & Food Courts)',
        code: 'BL-D',
        dryFill: 58,
        wetFill: 88,
        dryWeight: 31.0,
        wetWeight: 59.5,
        status: 'Wet Overflow Risk',
        complianceScore: 82,
        lastCollection: '4h ago',
      },
      {
        id: 'block-e',
        name: 'Block E (R&D Labs & Technical Complex)',
        code: 'BL-E',
        dryFill: 52,
        wetFill: 24,
        dryWeight: 23.0,
        wetWeight: 7.5,
        status: 'Optimal',
        complianceScore: 91,
        lastCollection: '2h ago',
      },
    ];
  }

  // Compute dry/wet aggregates from block matrix
  if (obj.wasteDry === undefined || obj.wasteDry === null) {
    const totalDry = obj.wasteBlocks.reduce((acc, b) => acc + (b.dryWeight || 0), 0);
    obj.wasteDry = Number(totalDry.toFixed(1));
  }
  if (obj.wasteWet === undefined || obj.wasteWet === null) {
    const totalWet = obj.wasteBlocks.reduce((acc, b) => acc + (b.wetWeight || 0), 0);
    obj.wasteWet = Number(totalWet.toFixed(1));
  }
  if (obj.wasteDryFill === undefined || obj.wasteDryFill === null) {
    const avgDry = obj.wasteBlocks.reduce((acc, b) => acc + (b.dryFill || 0), 0) / obj.wasteBlocks.length;
    obj.wasteDryFill = Math.round(avgDry);
  }
  if (obj.wasteWetFill === undefined || obj.wasteWetFill === null) {
    const avgWet = obj.wasteBlocks.reduce((acc, b) => acc + (b.wetFill || 0), 0) / obj.wasteBlocks.length;
    obj.wasteWetFill = Math.round(avgWet);
  }

  // ── 5. Parking & Digital Twin Bay Matrix ────────────────────────────────
  if (obj.totalSlots === undefined || obj.totalSlots === null) {
    obj.totalSlots = 48;
  }
  if (obj.occupiedSlots === undefined || obj.occupiedSlots === null) {
    obj.occupiedSlots = 36;
  }
  if (obj.parkingOccupancy === undefined || obj.parkingOccupancy === null) {
    obj.parkingOccupancy = Math.round((obj.occupiedSlots / obj.totalSlots) * 100);
  }
  if (obj.vehiclesToday === undefined || obj.vehiclesToday === null) {
    obj.vehiclesToday = 482;
  }
  if (obj.avgWaitingTime === undefined || obj.avgWaitingTime === null) {
    obj.avgWaitingTime = 3.5;
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

    // Attach dynamic AI Forecast and Priority Engine defaults if not already present
    attachDynamicDefaults(consolidated);

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

    // Always assign fresh current timestamp so new Postman requests become the latest active snapshot
    payload.timestamp = new Date();
    const record = await SensorData.create(payload);
    const postData = record.toObject ? record.toObject() : { ...record };
    delete postData.Valve1;
    delete postData.Valve2;
    attachDynamicDefaults(postData);
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

    // Automatic Generator Failover logic when grid drops
    if (updateData.gridStatus === 'OFF') {
      updateData.generatorStatus = 'RUNNING';
      const liveP = updateData.livePower || (record ? record.livePower : 18.4);
      updateData.generatorLoad = Number((liveP * 0.85).toFixed(1));
    } else if (updateData.gridStatus === 'ONLINE' && updateData.generatorStatus === undefined) {
      updateData.generatorStatus = 'STANDBY';
      updateData.generatorLoad = 0;
    }

    // Street Light actuator status synchronization
    if (updateData.streetLightStatus === 'ON') {
      updateData.streetLightsActive = updateData.streetLightTotal || (record ? record.streetLightTotal : 48);
      updateData.streetLightPower = 4.4;
    } else if (updateData.streetLightStatus === 'OFF') {
      updateData.streetLightsActive = 0;
      updateData.streetLightPower = 0;
    }

    // Update with fresh timestamp so it immediately becomes the newest live snapshot
    updateData.timestamp = new Date();

    const updated = await SensorData.findByIdAndUpdate(
      record._id,
      { $set: updateData },
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

    if (!body.timestamp) {
      updateData.timestamp = new Date();
    }

    const record = await SensorData.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
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
