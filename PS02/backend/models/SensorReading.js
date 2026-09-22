import mongoose from 'mongoose';

const sensorReadingSchema = new mongoose.Schema(
  {
    nodeId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // BME688: Temp (°C) & Humidity (%RH) & VOC Index
    temperature: {
      type: Number,
      required: true,
    },
    humidity: {
      type: Number,
      required: true,
    },
    voc: {
      type: Number, // Gas Index / IAQ (0-500)
      default: 85,
    },
    // DS18B20 (in black globe): Radiant Heat (°C)
    radiantHeat: {
      type: Number,
      required: true,
    },
    // Anemometer with wind vane: Wind speed (m/s) and Wind direction (°)
    windSpeed: {
      type: Number,
      default: 1.8,
    },
    windDirection: {
      type: Number, // degrees 0-360
      default: 135,
    },
    // BH1750: Light intensity (lux)
    lightIntensity: {
      type: Number, // lux
      default: 48000,
    },
    // MLX90640: Surface Temperature (°C)
    surfaceTemperature: {
      type: Number,
      required: true,
    },
    // Computed Indices (Calculated on Master Node Edge AI)
    heatIndex: {
      type: Number,
      required: true,
    },
    wbgt: {
      type: Number,
      required: true,
    },
    riskLevel: {
      type: String,
      enum: ['Safe', 'Moderate', 'Dangerous'],
      default: 'Moderate',
    },
  },
  { timestamps: true }
);

// Compound index for querying time series per node efficiently
sensorReadingSchema.index({ nodeId: 1, timestamp: -1 });

export default mongoose.model('SensorReading', sensorReadingSchema);
