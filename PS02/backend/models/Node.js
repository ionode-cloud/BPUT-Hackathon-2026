import mongoose from 'mongoose';

const nodeSchema = new mongoose.Schema(
  {
    nodeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    nodeName: {
      type: String,
      required: true,
      trim: true,
    },
    nodeType: {
      type: String,
      required: true,
      enum: ['master', 'slave'],
      default: 'slave',
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    latitude: {
      type: Number,
      default: 20.2961,
    },
    longitude: {
      type: Number,
      default: 85.8245,
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'warning'],
      default: 'online',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    signalStrength: {
      type: Number, // -dBm (e.g. -58) or percentage
      default: -65,
    },
    batteryLevel: {
      type: Number, // Percentage 0-100
      default: 95,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Node', nodeSchema);
