const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema(
  {
    // ── Overview / Cross-cutting ──────────────────────────────────────────
    sustainabilityScore: { type: Number, default: null }, // 0–100
    timestamp:           { type: Date,   default: Date.now },

    // ── Air Quality ───────────────────────────────────────────────────────
    aqi:              { type: Number, default: null }, // Air Quality Index
    pm25:             { type: Number, default: null }, // µg/m³
    pm10:             { type: Number, default: null }, // µg/m³
    co2:              { type: Number, default: null }, // ppm
    smoke:            { type: Number, default: null }, // ppm
    nh3:              { type: Number, default: null }, // ppm (Ammonia)
    voc:              { type: Number, default: null }, // ppm (Volatile Organic Compounds)

    // ── Weather / Environment ─────────────────────────────────────────────
    rainfall:         { type: Number,  default: null }, // mm
    windSpeed:        { type: Number,  default: null }, // km/h
    windDirection:    { type: String,  default: null }, // e.g. "NE"
    lightIntensity:   { type: Number,  default: null }, // lux

    // ── Energy ────────────────────────────────────────────────────────────
    livePower:        { type: Number, default: null }, // kW
    todaysEnergy:     { type: Number, default: null }, // kWh
    peakDemand:       { type: Number, default: null }, // kW
    estimatedCost:    { type: Number, default: null }, // ₹

    // ── Water ─────────────────────────────────────────────────────────────
    tankLevel:        { type: Number,  default: null }, // %
    todaysUsage:      { type: Number,  default: null }, // Litres
    flowRate:         { type: Number,  default: null }, // L/min
    leakStatus:       { type: String,  default: null }, // "Normal" | "Leak Detected"
    valve1:           { type: Boolean, default: false }, // Valve 1 status (true=ON, false=OFF)
    valve2:           { type: Boolean, default: false }, // Valve 2 status (true=ON, false=OFF)

    // ── Waste ─────────────────────────────────────────────────────────────
    totalBins:        { type: Number, default: null },
    averageFill:      { type: Number, default: null }, // %
    wasteCollected:   { type: Number, default: null }, // kg
    overflowRisk:     { type: Number, default: null }, // count of at-risk bins

    // ── Traffic & Parking ─────────────────────────────────────────────────
    parkingOccupancy: { type: Number, default: null }, // %
    occupiedSlots:    { type: Number, default: null },
    totalSlots:       { type: Number, default: null },
    vehiclesToday:    { type: Number, default: null },
    avgWaitingTime:   { type: Number, default: null }, // minutes

    // ── Asset Utilization ─────────────────────────────────────────────────
    totalEquipment:   { type: Number, default: null },
    activeEquipment:  { type: Number, default: null },
    utilization:      { type: Number, default: null }, // %
    maintenanceDue:   { type: Number, default: null }, // count

    // ── Safety ────────────────────────────────────────────────────────────
    safetyScore:      { type: Number, default: null }, // 0–100
    incidentsToday:   { type: Number, default: null },
    openIncidents:    { type: Number, default: null },
    avgResponse:      { type: Number, default: null }, // minutes

    // ── AI Forecasts ──────────────────────────────────────────────────────
    energyForecast:       { type: Number, default: null }, // kWh next 24h
    waterForecast:        { type: Number, default: null }, // Litres next day
    overflowPrediction:   { type: Number, default: null }, // hours until overflow

    // ── Meta ──────────────────────────────────────────────────────────────
    source:    { type: String, default: 'manual' }, // "sensor" | "manual" | "synthetic"
    location:  { type: String, default: null },     // optional facility zone tag
    notes:     { type: String, default: null },
  },
  {
    timestamps: true,  // adds createdAt + updatedAt automatically
    versionKey: false,
  }
);

// Index on timestamp for efficient range queries
sensorDataSchema.index({ timestamp: -1 });

module.exports = mongoose.model('SensorData', sensorDataSchema);
