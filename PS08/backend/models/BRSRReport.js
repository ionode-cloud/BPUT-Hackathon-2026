const mongoose = require('mongoose');

const BRSR_SECTIONS = [
  'Section A: General Disclosures',
  'Section B: Management and Process Disclosures',
  'Section C: Principle-wise Performance Disclosures',
  'Principle 1: Ethics and Transparency',
  'Principle 2: Sustainable Products and Services',
  'Principle 3: Employee Well-being',
  'Principle 4: Stakeholder Interests',
  'Principle 5: Human Rights',
  'Principle 6: Environmental Responsibility',
  'Principle 7: Policy Advocacy',
  'Principle 8: Inclusive Growth',
  'Principle 9: Consumer Responsibility',
];

const REPORT_STATUS = ['Draft', 'In Progress', 'Under Review', 'Validated', 'Correction Required', 'Approved', 'Published'];

const brrsReportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Report title is required'],
      trim: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    reportingPeriod: {
      year: { type: String, required: true },
      fromDate: Date,
      toDate: Date,
    },
    status: {
      type: String,
      enum: REPORT_STATUS,
      default: 'Draft',
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    generatedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    reviewComment: String,
    correctionComment: String,
    sections: [
      {
        sectionName: { type: String, enum: BRSR_SECTIONS },
        isComplete: { type: Boolean, default: false },
        completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
        linkedRecords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ESGData' }],
        data: { type: Map, of: mongoose.Schema.Types.Mixed },
        missingFields: [String],
        reviewComment: String,
      },
    ],
    overallCompletionPercentage: { type: Number, default: 0, min: 0, max: 100 },
    summaryNarrative: { type: String, trim: true },
    reportVersion: { type: String, default: '1.0' },
    brsrReference: { type: String, default: 'SEBI BRSR 2023-24' },
    includedESGRecords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ESGData' }],
    consolidatedScope: {
      organizations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Organization' }],
      includesSubsidiaries: { type: Boolean, default: false },
    },
    downloadUrl: String,
  },
  { timestamps: true }
);

brrsReportSchema.index({ organization: 1, 'reportingPeriod.year': 1, status: 1 });
brrsReportSchema.index({ generatedBy: 1, createdAt: -1 });

const BRSRReport = mongoose.model('BRSRReport', brrsReportSchema);
module.exports = BRSRReport;
module.exports.BRSR_SECTIONS = BRSR_SECTIONS;
module.exports.REPORT_STATUS = REPORT_STATUS;
