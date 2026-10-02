const mongoose = require('mongoose');

const ORG_TYPES = ['Group', 'Subsidiary', 'Business Unit', 'Project'];

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    type: {
      type: String,
      enum: ORG_TYPES,
      required: [true, 'Organization type is required'],
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    location: {
      address: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true, default: 'India' },
      pincode: { type: String, trim: true },
    },
    cin: { type: String, trim: true }, // Corporate Identification Number
    gstin: { type: String, trim: true },
    industry: { type: String, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Pending Approval', 'Submitted', 'Approved', 'Rejected'],
      default: 'Active',
    },
    verificationStatus: {
      type: String,
      enum: ['Pending Verification', 'Verified', 'Unverified', 'Rejected'],
      default: 'Pending Verification',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: { type: Date },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: { type: Date },
    approvalComment: { type: String, trim: true },
    verificationComment: { type: String, trim: true },
    adminUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reportingYear: { type: String, trim: true },
  },
  { timestamps: true }
);

// Index for hierarchy queries
organizationSchema.index({ parent: 1, type: 1, status: 1 });
organizationSchema.index({ name: 'text' });

const Organization = mongoose.model('Organization', organizationSchema);
module.exports = Organization;
module.exports.ORG_TYPES = ORG_TYPES;
