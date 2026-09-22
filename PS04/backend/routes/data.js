const express    = require('express');
const mongoose   = require('mongoose');
const router     = express.Router();
const SensorData = require('../models/SensorData');

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
        .limit(lim);
      return res.json({ success: true, count: records.length, data: records });
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
    const record = await SensorData.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }
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

    // If incoming body is partial, inherit previous known readings so different sensor channels don't blank each other out
    const latest = await SensorData.findOne().sort({ timestamp: -1 }).lean();
    let payload = { ...body };
    if (latest) {
      const { _id, createdAt, updatedAt, ...prevFields } = latest;
      payload = { ...prevFields, ...body };
    }
    // Always assign fresh current timestamp so new Postman requests become the latest active snapshot
    payload.timestamp = new Date();
    const record = await SensorData.create(payload);
    res.status(201).json({ success: true, message: 'Sensor data created.', data: record });
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

    // Find the latest record to update, or create one if database is empty
    let record = await SensorData.findOne().sort({ timestamp: -1 });
    if (!record) {
      record = await SensorData.create({ ...body, timestamp: new Date() });
      return res.status(201).json({ success: true, message: 'Sensor snapshot created.', data: record });
    }

    // Update with fresh timestamp so it immediately becomes the newest live snapshot
    const updateData = { ...body, timestamp: new Date() };
    const updated = await SensorData.findByIdAndUpdate(
      record._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    res.json({ success: true, message: 'Sensor data updated.', data: updated });
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
    res.json({ success: true, message: 'Sensor data updated.', data: record });
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
