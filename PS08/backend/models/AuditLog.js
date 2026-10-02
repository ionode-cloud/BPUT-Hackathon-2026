const mongoose = require('mongoose');

const AUDIT_ACTIONS = [
  'LOGIN',
  'LOGOUT',
  'REGISTER',
  'CREATE',
  'UPDATE',
  'DELETE',
  'SUBMIT',
  'VALIDATE',
  'APPROVE',
  'REJECT',
  'CORRECTION_REQUEST',
  'RESUBMIT',
  'REPORT_GENERATE',
  'DOCUMENT_UPLOAD',
  'DOCUMENT_DELETE',
  'ORG_CREATE',
  'ORG_UPDATE',
  'USER_UPDATE',
  'CONSOLIDATE',
  'PASSWORD_CHANGE',
];

const AUDIT_ENTITIES = [
  'User',
  'Organization',
  'ESGData',
  'BRSRReport',
  'Document',
  'Notification',
];

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: { type: String }, // Denormalized for audit integrity
    userEmail: { type: String },
    userRole: { type: String },
    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
    },
    entity: {
      type: String,
      enum: AUDIT_ENTITIES,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    organizationName: { type: String }, // Denormalized for audit integrity
    password: { type: String, trim: true, default: 'Admin@123456' },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    ipAddress: { type: String },
    userAgent: { type: String },
    status: {
      type: String,
      enum: ['Success', 'Failure'],
      default: 'Success',
    },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

// Compound indexes for efficient audit log queries
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, entity: 1, createdAt: -1 });
auditLogSchema.index({ entityId: 1, createdAt: -1 });
auditLogSchema.index({ organization: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;
module.exports.AUDIT_ACTIONS = AUDIT_ACTIONS;
module.exports.AUDIT_ENTITIES = AUDIT_ENTITIES;
