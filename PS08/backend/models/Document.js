const mongoose = require('mongoose');

const DOC_CATEGORIES = [
  'ESG Evidence',
  'Policy Document',
  'Audit Report',
  'Financial Data',
  'Environmental Certificate',
  'Safety Record',
  'Community Report',
  'Board Document',
  'Regulatory Filing',
  'Other',
];

const documentSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
    },
    cloudinaryUrl: {
      type: String,
      required: [true, 'Cloudinary URL is required'],
    },
    cloudinaryPublicId: {
      type: String,
      required: [true, 'Cloudinary public ID is required'],
    },
    fileType: {
      type: String,
      trim: true,
    },
    fileSize: {
      type: Number, // bytes
    },
    category: {
      type: String,
      enum: DOC_CATEGORIES,
      default: 'ESG Evidence',
    },
    relatedESGRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ESGData',
    },
    relatedBRSRReport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BRSRReport',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Draft', 'Submitted', 'Under Review', 'Validated', 'Correction Required', 'Approved'],
      default: 'Submitted',
    },
    reviewComment: String,
    correctionComment: String,
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
    isActive: {
      type: Boolean,
      default: true,
    },
    reportingPeriod: {
      year: String,
      quarter: String,
    },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

documentSchema.index({ organization: 1, category: 1, isActive: 1 });
documentSchema.index({ relatedESGRecord: 1 });
documentSchema.index({ uploadedBy: 1, createdAt: -1 });

const Document = mongoose.model('Document', documentSchema);
module.exports = Document;
module.exports.DOC_CATEGORIES = DOC_CATEGORIES;
