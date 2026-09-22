import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    nodeId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    alertType: {
      type: String,
      required: true,
      enum: [
        'High WBGT',
        'High Heat Index',
        'High radiant heat',
        'High surface temperature',
        'Extreme temperature',
        'High humidity',
        'Low humidity',
        'Dangerous heat risk',
        'Node offline',
        'Network outage',
        'Power outage',
        'Required rest break',
        'Relief action triggered',
      ],
    },
    value: {
      type: String,
      default: '',
    },
    severity: {
      type: String,
      enum: ['Safe', 'Warning', 'Critical', 'Resolved'],
      default: 'Warning',
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Acknowledged', 'Resolved'],
      default: 'Active',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Alert', alertSchema);
