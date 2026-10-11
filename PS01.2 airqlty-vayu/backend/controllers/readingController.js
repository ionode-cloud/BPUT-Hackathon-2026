const SensorReading = require('../models/SensorReading');
const { asyncHandler } = require('../middleware/errorHandler');
const { computeActionDevice } = require('../services/actionDeviceService');

// Flatten a reading document to a simpler structure for the frontend
const flattenReading = (doc) => {
  if (!doc) return null;
  const flat = {
    _id: doc._id,
    nodeId: doc.nodeId || 'NODE-01',
    timestamp: doc.timestamp,
    dataSource: doc.dataSource || 'iot',
  };
  const sensors = ['co', 'co2', 'o3', 'no2', 'voc', 'so2', 'pm25', 'pm10', 'temperature', 'humidity', 'nh3', 'smoke'];
  sensors.forEach((s) => {
    flat[s] = doc[s]?.value ?? null;
  });
  flat.actiondevice = (doc.actiondevice !== undefined && doc.actiondevice !== null)
    ? doc.actiondevice
    : computeActionDevice(flat);
  flat.createdAt = doc.createdAt;
  flat.updatedAt = doc.updatedAt;
  return flat;
};

const buildSensor = (val, defaultUnit) => {
  if (val === undefined || val === null) return { value: null, unit: defaultUnit };
  if (typeof val === 'object' && val.value !== undefined) {
    return {
      value: val.value !== null && !isNaN(val.value) ? Number(val.value) : null,
      unit: val.unit || defaultUnit,
    };
  }
  const num = Number(val);
  return {
    value: !isNaN(num) ? num : null,
    unit: defaultUnit,
  };
};

// GET /api/readings?limit=&page=
exports.getReadings = asyncHandler(async (req, res) => {
  const { limit = 50, page = 1, nodeId } = req.query;
  const filter = nodeId ? { nodeId: nodeId.toUpperCase() } : {};

  const total = await SensorReading.countDocuments(filter);
  const readings = await SensorReading.find(filter)
    .sort({ timestamp: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  res.json({
    success: true,
    count: readings.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit) || 1,
    data: readings.map(flattenReading),
  });
});

// GET /api/readings/latest — most recent reading
exports.getLatestReadings = asyncHandler(async (req, res) => {
  const latest = await SensorReading.findOne().sort({ timestamp: -1 }).lean();
  res.json({
    success: true,
    data: latest ? [flattenReading(latest)] : [],
  });
});

// GET /api/readings/node/:nodeId
exports.getReadingsByNode = asyncHandler(async (req, res) => {
  const { limit = 100 } = req.query;
  const readings = await SensorReading.find()
    .sort({ timestamp: -1 })
    .limit(Number(limit))
    .lean();
  res.json({ success: true, count: readings.length, data: readings.map(flattenReading) });
});

// GET /api/readings/sensor/:sensorType?limit=
exports.getReadingsBySensor = asyncHandler(async (req, res) => {
  const { sensorType } = req.params;
  const { limit = 100 } = req.query;

  const readings = await SensorReading.find({}, { timestamp: 1, [sensorType]: 1 })
    .sort({ timestamp: -1 })
    .limit(Number(limit))
    .lean();

  const data = readings.map((r) => ({
    timestamp: r.timestamp,
    value: r[sensorType]?.value ?? null,
    unit: r[sensorType]?.unit ?? null,
  }));

  res.json({ success: true, count: data.length, data });
});

// GET /api/readings/history?sensorType=&from=&to=&limit=&nodeId=
exports.getHistory = asyncHandler(async (req, res) => {
  const { sensorType, from, to, limit = 300, nodeId } = req.query;

  const filter = {};
  if (nodeId) {
    filter.nodeId = String(nodeId).toUpperCase().trim();
  }
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }

  const projection = { timestamp: 1, nodeId: 1 };
  if (sensorType) {
    projection[sensorType] = 1;
  } else {
    ['co', 'co2', 'o3', 'no2', 'voc', 'so2', 'pm25', 'pm10', 'temperature', 'humidity', 'nh3', 'smoke'].forEach(s => {
      projection[s] = 1;
    });
  }

  const readings = await SensorReading.find(filter, projection)
    .sort({ timestamp: -1 })
    .limit(Number(limit))
    .lean();

  // Reverse to ensure chronological order (oldest to newest left-to-right) on charts
  readings.reverse();

  res.json({ success: true, count: readings.length, data: readings.map(flattenReading) });
});

// POST /api/readings — IoT ingestion endpoint (compatible with /api/sensor)
exports.createReading = asyncHandler(async (req, res) => {
  const {
    nodeId, timestamp, dataSource,
    co, co2, o3, no2, voc, so2, pm25, pm10, temperature, humidity, smoke,
    nh3,
  } = req.body;

  const actiondevice = computeActionDevice(req.body);
  const reading = await SensorReading.create({
    nodeId:      (nodeId || 'NODE-01').toString().trim().toUpperCase(),
    timestamp:   timestamp ? new Date(timestamp) : new Date(),
    dataSource:  dataSource || 'iot',
    actiondevice,
    co:          buildSensor(co,          'ppm'),
    co2:         buildSensor(co2,         'ppm'),
    o3:          buildSensor(o3,          'ppb'),
    no2:         buildSensor(no2,         'ppb'),
    voc:         buildSensor(voc,         'ppb'),
    so2:         buildSensor(so2,         'ppb'),
    nh3:         buildSensor(nh3,         'ppm'),
    pm25:        buildSensor(pm25,        'µg/m³'),
    pm10:        buildSensor(pm10,        'µg/m³'),
    temperature: buildSensor(temperature, '°C'),
    humidity:    buildSensor(humidity,    '%RH'),
    smoke:       buildSensor(smoke,       'raw'),
  });

  const flatData = flattenReading(reading.toObject());

  const io = req.app.locals?.io;
  if (io) io.emit('new_reading', flatData);

  res.status(201).json({
    success: true,
    message: 'Sensor reading recorded successfully',
    data: flatData,
  });
});

// PUT /api/readings/:id
exports.updateReading = asyncHandler(async (req, res) => {
  const reading = await SensorReading.findById(req.params.id);
  if (!reading) {
    return res.status(404).json({ success: false, message: 'Sensor reading not found' });
  }

  const SENSOR_DEFAULT_UNITS = {
    co: 'ppm',
    co2: 'ppm',
    o3: 'ppb',
    no2: 'ppb',
    voc: 'ppb',
    so2: 'ppb',
    pm25: 'µg/m³',
    pm10: 'µg/m³',
    temperature: '°C',
    humidity: '%RH',
    nh3: 'ppm',
    smoke: 'raw',
  };

  Object.keys(SENSOR_DEFAULT_UNITS).forEach((key) => {
    if (req.body[key] !== undefined) {
      reading[key] = buildSensor(req.body[key], SENSOR_DEFAULT_UNITS[key]);
    }
  });

  reading.actiondevice = computeActionDevice(reading);
  reading.updatedAt = new Date();
  await reading.save();

  const flat = flattenReading(reading.toObject());
  const io = req.app.locals?.io;
  if (io) io.emit('update_reading', flat);

  res.json({
    success: true,
    message: 'Sensor reading updated successfully',
    data: flat,
  });
});

// DELETE /api/readings/:id
exports.deleteReading = asyncHandler(async (req, res) => {
  const reading = await SensorReading.findByIdAndDelete(req.params.id);
  if (!reading) {
    return res.status(404).json({ success: false, message: 'Sensor reading not found' });
  }

  const io = req.app.locals?.io;
  if (io) io.emit('delete_reading', { id: req.params.id });

  res.json({
    success: true,
    message: 'Sensor reading deleted successfully',
    id: req.params.id,
  });
});
