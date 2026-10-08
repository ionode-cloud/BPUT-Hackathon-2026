const mongoose = require('mongoose');

const ESG_CATEGORIES = ['Environmental', 'Social', 'Governance'];

const WORKFLOW_STATUS = [
  'Draft',
  'Submitted',
  'Under Review',
  'Validated',
  'Correction Required',
  'Approved',
  'Consolidated',
  'Reported',
  'Rejected',
];

const ENV_METRICS = [
  // Energy
  'Total Energy Consumption',
  'Electricity Consumption',
  'Fuel Consumption',
  'Renewable Energy Generated',
  'Renewable Energy Consumed',
  // Water
  'Total Water Withdrawal',
  'Water Recycled/Reused',
  // Waste
  'Total Waste Generated',
  'Hazardous Waste',
  'Non-Hazardous Waste',
  'Waste Recycled',
  'Waste Disposed',
  // Emissions
  'Scope 1 GHG Emissions',
  'Scope 2 GHG Emissions',
  'Scope 3 GHG Emissions',
  'NOx Emissions',
  'SOx Emissions',
  'Particulate Matter Emissions',
  // Incidents
  'Environmental Incidents',
];

const SOCIAL_METRICS = [
  // Employees
  'Total Employees',
  'Permanent Employees',
  'Contractual Employees',
  'Female Employees',
  'Male Employees',
  'New Hires',
  'Employee Turnover',
  // Diversity
  'Women in Leadership',
  'SC/ST Employees',
  'PwD Employees',
  // Training
  'Training Hours',
  'Employees Trained',
  'Health & Safety Training Hours',
  // OHS
  'Lost Time Injury Rate',
  'Total Recordable Incidents',
  'Fatalities',
  'Near Misses',
  // Welfare
  'Employees with Health Insurance',
  'Employees with Provident Fund',
  // Community
  'CSR Expenditure',
  'Community Beneficiaries',
  // Grievances
  'Grievances Received',
  'Grievances Resolved',
];

const GOVERNANCE_METRICS = [
  // Board
  'Total Board Members',
  'Independent Directors',
  'Women Directors',
  'Board Meetings Held',
  // Ethics
  'Ethics Policy Coverage',
  'Anti-Corruption Training Completion',
  'Corruption Cases Reported',
  'Corruption Cases Resolved',
  // Whistleblower
  'Whistleblower Complaints Received',
  'Whistleblower Complaints Resolved',
  // Risk
  'Identified Material Risks',
  'Risks with Mitigation Plans',
  // Regulatory
  'Regulatory Non-Compliances',
  'Regulatory Fines Paid',
  // Data Privacy
  'Data Breaches',
  'Privacy Complaints',
];

const ALL_METRICS = [...ENV_METRICS, ...SOCIAL_METRICS, ...GOVERNANCE_METRICS];

const evidenceSchema = new mongoose.Schema({
  document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  fileName: String,
  url: String,
  uploadedAt: { type: Date, default: Date.now },
});

const workflowHistorySchema = new mongoose.Schema({
  status: { type: String, enum: WORKFLOW_STATUS },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changedAt: { type: Date, default: Date.now },
  comment: String,
});

const esgDataSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ESG_CATEGORIES,
      required: [true, 'ESG category is required'],
    },
    subcategory: {
      type: String,
      trim: true,
    },
    metric: {
      type: String,
      required: [true, 'Metric is required'],
      trim: true,
    },
    reportingPeriod: {
      year: { type: String, required: true },
      quarter: { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'], default: 'Annual' },
      month: { type: String, trim: true },
    },
    // Common Fields for Every ESG Form
    projectId: { type: String, trim: true },
    projectName: { type: String, trim: true },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    organizationName: { type: String, trim: true },
    organizationId: { type: String, trim: true },
    groupCompany: { type: String, trim: true, default: 'MEIL Group (Megha Engineering & Infrastructures Ltd.)' },
    subsidiaryName: { type: String, trim: true },
    businessUnitName: { type: String, trim: true },
    sectorType: { type: String, trim: true },
    location: {
      state: { type: String, trim: true },
      district: { type: String, trim: true },
      city: { type: String, trim: true },
      address: { type: String, trim: true },
    },
    department: {
      type: String,
      enum: ['Environmental', 'HR', 'Safety', 'Compliance', 'Governance', 'General'],
      default: 'Environmental',
    },
    submittedByName: { type: String, trim: true },
    employeeId: { type: String, trim: true },
    designation: { type: String, trim: true },
    dateOfSubmission: { type: Date },
    lastUpdatedDate: { type: Date, default: Date.now },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Value is required'],
    },
    unit: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    dataSource: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    evidence: [evidenceSchema],
    supportingDocuments: [
      {
        fileName: String,
        url: String,
        fileSize: Number,
        fileType: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    aiValidationResults: [
      {
        type: { type: String },
        severity: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW', 'WARNING', 'INFO'] },
        message: String,
        suggestion: String,
        field: String,
        details: mongoose.Schema.Types.Mixed,
        detectedAt: { type: Date, default: Date.now },
      },
    ],
    responsibleUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    submittedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    status: {
      type: String,
      enum: WORKFLOW_STATUS,
      default: 'Draft',
    },
    validationErrors: [
      {
        field: String,
        message: String,
      },
    ],
    reviewComment: {
      type: String,
      trim: true,
    },
    correctionComment: {
      type: String,
      trim: true,
    },
    workflowHistory: [workflowHistorySchema],
    isConsolidated: { type: Boolean, default: false },
    consolidatedInto: { type: mongoose.Schema.Types.ObjectId, ref: 'ESGData' },
    aggregationMethod: {
      type: String,
      enum: ['Sum', 'Average', 'Max', 'Min', 'Count', 'Latest'],
      default: 'Sum',
    },
    // Additional category-specific fields stored as flexible key-value
    additionalData: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

// Indexes for common queries
esgDataSchema.index({ organization: 1, category: 1, status: 1 });
esgDataSchema.index({ 'reportingPeriod.year': 1, 'reportingPeriod.quarter': 1 });
esgDataSchema.index({ metric: 1, status: 1 });
esgDataSchema.index({ responsibleUser: 1 });
esgDataSchema.index({ createdAt: -1 });

const ESGData = mongoose.model('ESGData', esgDataSchema);
module.exports = ESGData;
module.exports.ESG_CATEGORIES = ESG_CATEGORIES;
module.exports.WORKFLOW_STATUS = WORKFLOW_STATUS;
module.exports.ENV_METRICS = ENV_METRICS;
module.exports.SOCIAL_METRICS = SOCIAL_METRICS;
module.exports.GOVERNANCE_METRICS = GOVERNANCE_METRICS;
