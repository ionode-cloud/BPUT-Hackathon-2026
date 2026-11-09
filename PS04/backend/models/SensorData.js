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
    acPower:          { type: Number, default: null }, // kW (AC Mains & Heavy HVAC)
    acEnergy:         { type: Number, default: null }, // kWh (AC Consumption)
    dcPower:          { type: Number, default: null }, // kW (DC Solar & Battery Infeed)
    dcEnergy:         { type: Number, default: null }, // kWh (DC Infeed)
    gridStatus:       { type: String, default: 'ONLINE' }, // "ONLINE" | "OFF"

    // ── Street Light Subsystem ─────────────────────────────────────────────
    streetLightStatus:   { type: String, default: 'AUTO' }, // "ON" | "OFF" | "AUTO"
    streetLightsActive:  { type: Number, default: null },   // count of lit poles
    streetLightTotal:    { type: Number, default: 48 },     // total campus poles
    streetLightPower:    { type: Number, default: null },   // kW live lighting load
    streetLightEnergy:   { type: Number, default: null },   // kWh cumulative lighting energy
    streetLightDimming:  { type: Number, default: 80 },     // % brightness level

    // ── Water ─────────────────────────────────────────────────────────────
    tankLevel:        { type: Number,  default: null }, // %
    todaysUsage:      { type: Number,  default: null }, // Litres
    flowRate:         { type: Number,  default: null }, // L/min (Combined / main line)
    val1Flow:         { type: Number,  default: 0 },    // L/m for val1 flow rate
    val2Flow:         { type: Number,  default: 0 },    // L/m for val2 flow rate
    leakStatus:       { type: String,  default: null }, // "Normal" | "Leak Detected"
    val1:             { type: mongoose.Schema.Types.Mixed, default: 'Normal' }, // Line 1 Acoustic Leak Status ("Normal" | "Leak Detected" | true | false)
    val2:             { type: mongoose.Schema.Types.Mixed, default: 'Normal' }, // Line 2 Acoustic Leak Status ("Normal" | "Leak Detected" | true | false)
    valve1:           { type: Boolean, default: false }, // Valve 1 status (true=ON, false=OFF)
    valve2:           { type: Boolean, default: false }, // Valve 2 status (true=ON, false=OFF)

    // ── Waste ─────────────────────────────────────────────────────────────
    totalBins:        { type: Number, default: null },
    averageFill:      { type: Number, default: null }, // %
    wasteCollected:   { type: Number, default: null }, // kg
    overflowRisk:     { type: Number, default: null }, // count of at-risk bins
    wasteDry:         { type: Number, default: null }, // kg dry recyclables
    wasteWet:         { type: Number, default: null }, // kg wet organic
    wasteDryFill:     { type: Number, default: null }, // % dry fill
    wasteWetFill:     { type: Number, default: null }, // % wet fill
    WasteWetFill:     { type: Number, default: null }, // % wet fill alias for direct IoT payloads
    WasteDryFill:     { type: Number, default: null }, // % dry fill alias for direct IoT payloads
    wasteBlocks:      { type: mongoose.Schema.Types.Mixed, default: () => [] }, // Block-wise dry/wet array

    // ── Traffic & Parking (3 Real Bays: a1, a2, a3 where true = Free, false = Occupied) ───
    a1:               { type: Boolean, default: true },  // true = Free / Available, false = Occupied
    a2:               { type: Boolean, default: false }, // true = Free / Available, false = Occupied
    a3:               { type: Boolean, default: true },  // true = Free / Available, false = Occupied
    parkingOccupancy: { type: Number, default: null }, // %
    occupiedSlots:    { type: Number, default: null },
    totalSlots:       { type: Number, default: 3 },
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

    // Free-form dynamic objects & AI forecast payloads
    aiForecasting:        { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    priorityEngine:       { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    // ── Meta ──────────────────────────────────────────────────────────────
    source:    { type: String, default: 'manual' }, // "sensor" | "manual" | "synthetic"
    location:  { type: String, default: null },     // optional facility zone tag
    notes:     { type: String, default: null },
  },
  {
    timestamps: true,  // adds createdAt + updatedAt automatically
    versionKey: false,
    strict: false,     // Allow free-form fields and keep any dynamic properties
  }
);

// Index on timestamp for efficient range queries
sensorDataSchema.index({ timestamp: -1 });

module.exports = mongoose.model('SensorData', sensorDataSchema);
