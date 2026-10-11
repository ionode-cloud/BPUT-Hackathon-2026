const SensorReading = require('../models/SensorReading');
const { asyncHandler } = require('../middleware/errorHandler');
const { computeActionDevice } = require('../services/actionDeviceService');

// Exact threshold limits from user specification
const THRESHOLDS = {
  co:          { safeMax: 4.4,  moderateMax: 9,    dangerousMin: 9.1 },
  co2:         { safeMax: 1000, moderateMax: 2000, dangerousMin: 2001 },
  no2:         { safeMax: 53,   moderateMax: 100,  dangerousMin: 101 },
  so2:         { safeMax: 35,   moderateMax: 75,   dangerousMin: 76 },
  o3:          { safeMax: 54,   moderateMax: 70,   dangerousMin: 71 },
  pm25:        { safeMax: 12,   moderateMax: 35.4, dangerousMin: 35.5 },
  pm10:        { safeMax: 54,   moderateMax: 154,  dangerousMin: 155 },
  temperature: { safeMin: 20, safeMax: 26, moderateMin: 15, moderateMax: 32, dangerousMin: 38, dangerousMaxLow: 10 },
  humidity:    { safeMin: 30, safeMax: 50, moderateMin: 20, moderateMax: 60, dangerousMin: 70, dangerousMaxLow: 20 },
  voc:         { safeMax: 200,  moderateMax: 500,  dangerousMin: 501 },
  nh3:         { safeMax: 25,   moderateMax: 50,   dangerousMin: 50.1 },
  smoke:       { safeMax: 200,  moderateMax: 500,  dangerousMin: 501 },
};

const computeStatus = (sensorKey, val) => {
  if (val === null || val === undefined || isNaN(val)) return 'unknown';
  const t = THRESHOLDS[sensorKey];
  if (!t) return 'safe';
  const v = Number(val);

  if (t.dangerousMaxLow !== undefined) {
    if (v < t.dangerousMaxLow || v > t.dangerousMin) return 'dangerous';
    if (v < t.safeMin || v > t.safeMax) return 'moderate';
    return 'safe';
  }

  if (v > t.dangerousMin) return 'dangerous';
  if (v > t.safeMax)      return 'moderate';
  return 'safe';
};

// GET /api/dashboard/summary
exports.getSummary = asyncHandler(async (req, res) => {
  const { nodeId } = req.query;
  const filter = nodeId ? { nodeId: String(nodeId).toUpperCase().trim() } : {};

  const [totalReadings, latestReading, recentReadings] = await Promise.all([
    SensorReading.countDocuments(filter),
    SensorReading.findOne(filter).sort({ timestamp: -1 }).lean(),
    SensorReading.find(filter).sort({ timestamp: -1 }).limit(20).lean(),
  ]);

  let avgTemp = null;
  let avgHumidity = null;

  if (recentReadings.length > 0) {
    const validTemps = recentReadings.map(r => r.temperature?.value).filter(v => v !== null && v !== undefined);
    const validHums  = recentReadings.map(r => r.humidity?.value).filter(v => v !== null && v !== undefined);
    if (validTemps.length > 0) {
      avgTemp = parseFloat((validTemps.reduce((a, b) => a + b, 0) / validTemps.length).toFixed(1));
    }
    if (validHums.length > 0) {
      avgHumidity = parseFloat((validHums.reduce((a, b) => a + b, 0) / validHums.length).toFixed(1));
    }
  }

  let overallAirQuality = 'safe';
  let actiondevice = true;
  if (latestReading) {
    const statuses = ['co', 'co2', 'no2', 'so2', 'o3', 'pm25', 'pm10', 'temperature', 'humidity', 'voc', 'nh3', 'smoke'].map(k =>
      computeStatus(k, latestReading[k]?.value)
    );
    if (statuses.includes('dangerous')) overallAirQuality = 'dangerous';
    else if (statuses.includes('moderate')) overallAirQuality = 'moderate';

    actiondevice = (latestReading.actiondevice !== undefined && latestReading.actiondevice !== null)
      ? latestReading.actiondevice
      : computeActionDevice(latestReading);
  }

  res.json({
    success: true,
    data: {
      totalReadings,
      totalSensors: 12,
      avgTemperature: avgTemp,
      avgHumidity,
      overallAirQuality,
      actiondevice,
      lastDataReceived: latestReading?.timestamp || null,
      latestReading: latestReading ? {
        _id: latestReading._id,
        timestamp: latestReading.timestamp,
        co: latestReading.co?.value ?? null,
        co2: latestReading.co2?.value ?? null,
        no2: latestReading.no2?.value ?? null,
        so2: latestReading.so2?.value ?? null,
        o3: latestReading.o3?.value ?? null,
        pm25: latestReading.pm25?.value ?? null,
        pm10: latestReading.pm10?.value ?? null,
        temperature: latestReading.temperature?.value ?? null,
        humidity: latestReading.humidity?.value ?? null,
        smoke: latestReading.smoke?.value ?? null,
        voc: latestReading.voc?.value ?? null,
        nh3: latestReading.nh3?.value ?? null,
        actiondevice,
      } : null,
      updatedAt: new Date(),
    },
  });
});

// GET /api/dashboard/node-status
exports.getNodeStatus = asyncHandler(async (req, res) => {
  const latest = await SensorReading.findOne().sort({ timestamp: -1 }).lean();
  if (!latest) {
    return res.json({ success: true, data: [] });
  }
  const nodeActionDevice = (latest.actiondevice !== undefined && latest.actiondevice !== null)
    ? latest.actiondevice
    : computeActionDevice(latest);

  res.json({
    success: true,
    data: [
      {
        nodeId: latest.nodeId,
        nodeName: 'Primary Environmental Sensor Unit',
        status: 'online',
        airQualityStatus: 'safe',
        actiondevice: nodeActionDevice,
        lastSeen: latest.timestamp || new Date(),
        latestReading: {
          timestamp: latest.timestamp,
          actiondevice: nodeActionDevice,
        },
      },
    ],
  });
});

// GET /api/dashboard/air-quality-summary
exports.getAirQualitySummary = asyncHandler(async (req, res) => {
  const latest = await SensorReading.findOne().sort({ timestamp: -1 }).lean();
  if (!latest) {
    return res.json({ success: true, data: [] });
  }

  const sensors = {};
  const sensorTypes = ['co', 'co2', 'o3', 'no2', 'voc', 'so2', 'pm25', 'pm10', 'temperature', 'humidity', 'nh3', 'smoke'];
  sensorTypes.forEach((s) => {
    const val = latest[s]?.value ?? null;
    sensors[s] = {
      value: val,
      unit: latest[s]?.unit ?? null,
      status: computeStatus(s, val),
    };
  });

  const nodeActionDevice = (latest.actiondevice !== undefined && latest.actiondevice !== null)
    ? latest.actiondevice
    : computeActionDevice(latest);

  res.json({
    success: true,
    data: [
      {
        nodeId: latest.nodeId || 'SENSOR-01',
        timestamp: latest.timestamp,
        actiondevice: nodeActionDevice,
        sensors,
      },
    ],
  });
});

// GET /api/dashboard/reports/daily
exports.getDailyReport = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { totalReadings: 0 } });
});

// GET /api/dashboard/reports/weekly
exports.getWeeklyReport = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { totalReadings: 0 } });
});
