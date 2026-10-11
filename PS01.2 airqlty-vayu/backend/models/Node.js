const mongoose = require('mongoose');

const nodeSchema = new mongoose.Schema(
  {
    nodeId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nodeNumber: {
      type: Number,
      required: true,
    },
    isMaster: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'warning'],
      default: 'online',
    },
    location: {
      type: String,
      default: 'Main Monitoring Station',
      trim: true,
    },
    latitude: {
      type: Number,
      default: null,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      default: null,
      min: -180,
      max: 180,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Node', nodeSchema);
