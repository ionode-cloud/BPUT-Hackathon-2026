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
        return {
          ...rest,
          valve1: Boolean(v1),
          valve2: Boolean(v2),
        };
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

    const currentValves = await getOrInitValveState();

    // If incoming body is partial, inherit previous known readings so different sensor channels don't blank each other out
    const latest = await SensorData.findOne().sort({ timestamp: -1 }).lean();
    let payload = { ...body };
    if (latest) {
      const { _id, createdAt, updatedAt, ...prevFields } = latest;
      payload = { ...prevFields, ...body };
    }

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

    if (body.valve1 !== undefined) {
      persistentValveState.valve1 = Boolean(body.valve1);
    }
    if (body.valve2 !== undefined) {
      persistentValveState.valve2 = Boolean(body.valve2);
    }

    // Find the latest record to update, or create one if database is empty
    let record = await SensorData.findOne().sort({ timestamp: -1 });
    if (!record) {
      record = await SensorData.create({ ...body, timestamp: new Date() });
      const createdData = record.toObject ? record.toObject() : { ...record };
      delete createdData.Valve1;
      delete createdData.Valve2;
      return res.status(201).json({ success: true, message: 'Sensor snapshot created.', data: createdData });
    }

    // Update with fresh timestamp so it immediately becomes the newest live snapshot
    const updateData = { ...body, timestamp: new Date() };
    const updated = await SensorData.findByIdAndUpdate(
      record._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    const putData = updated.toObject ? updated.toObject() : { ...updated };
    delete putData.Valve1;
    delete putData.Valve2;
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

    if (body.valve1 !== undefined) {
      persistentValveState.valve1 = Boolean(body.valve1);
    }
    if (body.valve2 !== undefined) {
      persistentValveState.valve2 = Boolean(body.valve2);
    }

    const updateData = { ...body };
    if (!body.timestamp) {
      updateData.timestamp = new Date();
    }

    const record = await SensorData.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }
    const resData = record.toObject ? record.toObject() : { ...record };
    delete resData.Valve1;
    delete resData.Valve2;
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
