const mongoose = require('mongoose');

const sensorReadingSchema = new mongoose.Schema(
  {
    nodeId: {
      type: String,
      required: false,
      uppercase: true,
      trim: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    dataSource: {
      type: String,
      enum: ['iot', 'manual', 'mock'],
      default: 'iot',
    },
    // ── Gas sensors ────────────────────────────
    co: {
      value: { type: Number, default: null }, // ppm  — MQ7
      unit: { type: String, default: 'ppm' },
    },
    co2: {
      value: { type: Number, default: null }, // ppm  — MH-Z19
      unit: { type: String, default: 'ppm' },
    },
    o3: {
      value: { type: Number, default: null }, // ppb  — MQ131
      unit: { type: String, default: 'ppb' },
    },
    no2: {
      value: { type: Number, default: null }, // ppb  — Fermion NO2 / MiCS-6814
      unit: { type: String, default: 'ppb' },
    },
    voc: {
      value: { type: Number, default: null }, // ppb  — MiCS-6814
      unit: { type: String, default: 'ppb' },
    },
    so2: {
      value: { type: Number, default: null }, // ppb  — MQ135
      unit: { type: String, default: 'ppb' },
    },
    nh3: {
      value: { type: Number, default: null }, // ppm  — MQ137 / MiCS-6814
      unit: { type: String, default: 'ppm' },
    },
    // ── Particulate matter ─────────────────────
    pm25: {
      value: { type: Number, default: null }, // µg/m³ — PMS7003
      unit: { type: String, default: 'µg/m³' },
    },
    pm10: {
      value: { type: Number, default: null }, // µg/m³ — PMS7003
      unit: { type: String, default: 'µg/m³' },
    },
    // ── Environmental ──────────────────────────
    temperature: {
      value: { type: Number, default: null }, // °C — DHT22
      unit: { type: String, default: '°C' },
    },
    humidity: {
      value: { type: Number, default: null }, // %RH — DHT22
      unit: { type: String, default: '%RH' },
    },
    // ── Smoke ──────────────────────────────────
    smoke: {
      value: { type: Number, default: null }, // relative level 0-1023 — MQ2
      unit: { type: String, default: 'raw' },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient node + time range queries
sensorReadingSchema.index({ nodeId: 1, timestamp: -1 });

module.exports = mongoose.model('SensorReading', sensorReadingSchema);
