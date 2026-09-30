const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'ESG_SUBMITTED',
  'ESG_APPROVED',
  'ESG_REJECTED',
  'CORRECTION_REQUIRED',
  'REVIEW_ASSIGNED',
  'REPORT_GENERATED',
  'REMINDER',
  'SYSTEM',
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    relatedRecord: {
      model: {
        type: String,
        enum: ['ESGData', 'BRSRReport', 'Organization', 'Document'],
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ organization: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
