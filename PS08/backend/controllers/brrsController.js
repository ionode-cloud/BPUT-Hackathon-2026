const BRSRReport = require('../models/BRSRReport');
const ESGData = require('../models/ESGData');
const { getAccessibleOrgIds } = require('./organizationController');
const { createAuditLog } = require('../utils/auditLogger');
const { BRSR_SECTIONS } = require('../models/BRSRReport');

const getBRSRMapping = () => ({
  'Section A: General Disclosures': {
    categories: ['Environmental', 'Social', 'Governance'],
    metrics: ['Total Employees', 'Female Employees', 'Total Waste Generated', 'Total Energy Consumption'],
  },
  'Section B: Management and Process Disclosures': {
    categories: ['Governance'],
    metrics: ['Ethics Policy Coverage', 'Anti-Corruption Training Completion', 'Whistleblower Complaints Received'],
  },
  'Section C: Principle-wise Performance Disclosures': {
    categories: ['Environmental', 'Social', 'Governance'],
    metrics: ['Total Water Withdrawal', 'Scope 1 GHG Emissions', 'Lost Time Injury Rate', 'Training Hours'],
  },
  'Principle 1: Ethics and Transparency': {
    categories: ['Governance'],
    metrics: ['Ethics Policy Coverage', 'Anti-Corruption Training Completion', 'Corruption Cases Reported'],
  },
  'Principle 2: Sustainable Products and Services': {
    categories: ['Environmental', 'Governance'],
    metrics: ['Renewable Energy Generated', 'Waste Recycled'],
  },
  'Principle 3: Employee Well-being': {
    categories: ['Social'],
    metrics: ['Total Employees', 'Female Employees', 'Employees with Health Insurance', 'Training Hours', 'Lost Time Injury Rate'],
  },
  'Principle 4: Stakeholder Interests': {
    categories: ['Social'],
    metrics: ['Grievances Received', 'Grievances Resolved'],
  },
  'Principle 5: Human Rights': {
    categories: ['Social'],
    metrics: ['Grievances Received', 'Grievances Resolved', 'SC/ST Employees', 'PwD Employees'],
  },
  'Principle 6: Environmental Responsibility': {
    categories: ['Environmental'],
    metrics: ['Total Energy Consumption', 'Total Water Withdrawal', 'Scope 1 GHG Emissions', 'Scope 2 GHG Emissions', 'Total Waste Generated'],
  },
  'Principle 7: Policy Advocacy': {
    categories: ['Governance'],
    metrics: ['Ethics Policy Coverage'],
  },
  'Principle 8: Inclusive Growth': {
    categories: ['Social'],
    metrics: ['CSR Expenditure', 'Community Beneficiaries'],
  },
  'Principle 9: Consumer Responsibility': {
    categories: ['Social', 'Governance'],
    metrics: ['Data Breaches', 'Privacy Complaints'],
  },
});

// @desc    Get BRSR reports
// @route   GET /api/brsr
// @access  Private
const getBRSRReports = async (req, res) => {
  const { page = 1, limit = 20, year, status, organization } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const accessibleIds = await getAccessibleOrgIds(req.user);
  const filter = { organization: { $in: accessibleIds } };
  if (year) filter['reportingPeriod.year'] = year;
  if (status) filter.status = status;
  if (organization) filter.organization = organization;

  const total = await BRSRReport.countDocuments(filter);
  const reports = await BRSRReport.find(filter)
    .populate('organization', 'name type')
    .populate('generatedBy', 'name email')
    .populate('approvedBy', 'name email')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: reports,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
  });
};

// @desc    Get single BRSR report
// @route   GET /api/brsr/:id
// @access  Private
const getBRSRReport = async (req, res) => {
  const report = await BRSRReport.findById(req.params.id)
    .populate('organization', 'name type location cin gstin industry')
    .populate('generatedBy', 'name email')
    .populate('approvedBy', 'name email')
    .populate('includedESGRecords');

  if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

  const accessibleIds = await getAccessibleOrgIds(req.user);
  if (!accessibleIds.some((id) => id.toString() === report.organization._id.toString())) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  res.status(200).json({ success: true, data: report });
};

// @desc    Create BRSR report
// @route   POST /api/brsr
// @access  Private (ESG Manager, Compliance Officer, Admin)
const createBRSRReport = async (req, res) => {
  const { title, organization, year, fromDate, toDate } = req.body;

  const accessibleIds = await getAccessibleOrgIds(req.user);
  if (!accessibleIds.some((id) => id.toString() === organization)) {
    return res.status(403).json({ success: false, message: 'Not authorized for this organization' });
  }

  // Check if a report for this org/year already exists
  const existing = await BRSRReport.findOne({ organization, 'reportingPeriod.year': year });
  if (existing) {
    return res.status(400).json({ success: false, message: 'A BRSR report for this organization and year already exists' });
  }

  const sections = BRSR_SECTIONS.map((name) => ({
    sectionName: name,
    isComplete: false,
    completionPercentage: 0,
    linkedRecords: [],
    data: {},
    missingFields: [],
  }));

  const report = await BRSRReport.create({
    title,
    organization,
    reportingPeriod: { year, fromDate, toDate },
    status: 'Draft',
    generatedBy: req.user._id,
    sections,
  });

  await createAuditLog({
    user: req.user,
    action: 'CREATE',
    entity: 'BRSRReport',
    entityId: report._id,
    organization: req.user.organization,
    description: `Created BRSR report: ${title} for year ${year}`,
  });

  res.status(201).json({ success: true, message: 'BRSR report created', data: report });
};

// @desc    Generate/update BRSR report from approved ESG data
// @route   POST /api/reports/generate
// @access  Private (Reviewer/Admin)
const generateReport = async (req, res) => {
  const { reportId } = req.body;

  const report = await BRSRReport.findById(reportId).populate('organization');
  if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

  const accessibleIds = await getAccessibleOrgIds(req.user);
  if (!accessibleIds.some((id) => id.toString() === report.organization._id.toString())) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  // Get all approved ESG records for this org and reporting year
  const approvedRecords = await ESGData.find({
    organization: report.organization._id,
    'reportingPeriod.year': report.reportingPeriod.year,
    status: 'Approved',
  });

  const brsrMapping = getBRSRMapping();

  // Map ESG records to BRSR sections and compute completeness
  let totalSections = report.sections.length;
  let completedSections = 0;

  report.sections = report.sections.map((section) => {
    const mapping = brsrMapping[section.sectionName];
    if (!mapping) {
      return { ...section.toObject(), completionPercentage: 0 };
    }

    const linkedRecords = approvedRecords.filter((r) => {
      const categoryMatch = mapping.categories.includes(r.category);
      const metricMatch = mapping.metrics.length === 0 || mapping.metrics.includes(r.metric);
      return categoryMatch && metricMatch;
    });

    const expectedMetrics = mapping.metrics.length || 3;
    const foundMetrics = linkedRecords.length;
    const completionPercentage = Math.min(100, Math.round((foundMetrics / expectedMetrics) * 100));
    const isComplete = completionPercentage >= 100;

    if (isComplete) completedSections++;

    const missingFields = mapping.metrics.filter(
      (m) => !linkedRecords.some((r) => r.metric === m)
    );

    return {
      ...section.toObject(),
      linkedRecords: linkedRecords.map((r) => r._id),
      completionPercentage,
      isComplete,
      missingFields,
    };
  });

  report.overallCompletionPercentage = Math.round((completedSections / totalSections) * 100);
  report.includedESGRecords = approvedRecords.map((r) => r._id);
  report.generatedAt = new Date();
  report.status = 'In Progress';

  await report.save();

  await createAuditLog({
    user: req.user,
    action: 'REPORT_GENERATE',
    entity: 'BRSRReport',
    entityId: report._id,
    organization: req.user.organization,
    description: `Generated BRSR report: ${report.title}. ${approvedRecords.length} approved records mapped.`,
  });

  res.status(200).json({ success: true, message: 'Report generated', data: report });
};

// @desc    Update BRSR report
// @route   PUT /api/brsr/:id
// @access  Private
const updateBRSRReport = async (req, res) => {
  const report = await BRSRReport.findById(req.params.id);
  if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

  const allowedFields = ['title', 'status', 'summaryNarrative', 'reportVersion', 'reviewComment', 'correctionComment'];
  const updates = {};
  allowedFields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  if (req.body.status === 'Approved') {
    updates.approvedBy = req.user._id;
    updates.approvedAt = new Date();
  } else if (req.body.status === 'Validated' || req.body.status === 'Under Review') {
    updates.reviewedBy = req.user._id;
    updates.reviewedAt = new Date();
  }

  const updated = await BRSRReport.findByIdAndUpdate(req.params.id, updates, { new: true })
    .populate('organization', 'name type')
    .populate('generatedBy', 'name email');

  await createAuditLog({
    user: req.user,
    action: 'UPDATE',
    entity: 'BRSRReport',
    entityId: updated._id,
    organization: req.user.organization,
    description: `Updated BRSR report: ${updated.title}`,
  });

  res.status(200).json({ success: true, message: 'Report updated', data: updated });
};

// @desc    Review BRSR report (approve, correction, validate, under_review)
// @route   PUT /api/brsr/:id/review
// @access  Private (Reviewer/Admin)
const reviewBRSRReport = async (req, res) => {
  const { action, comment } = req.body;
  const report = await BRSRReport.findById(req.params.id).populate('organization');
  if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

  let newStatus;
  if (action === 'approve') {
    newStatus = 'Approved';
    report.approvedBy = req.user._id;
    report.approvedAt = new Date();
  } else if (action === 'correction') {
    newStatus = 'Correction Required';
    report.correctionComment = comment || 'Correction required by administrator';
  } else if (action === 'validate') {
    newStatus = 'Validated';
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
  } else if (action === 'under_review') {
    newStatus = 'Under Review';
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
  } else {
    return res.status(400).json({ success: false, message: 'Invalid action. Use: approve, correction, validate, under_review' });
  }

  report.status = newStatus;
  if (comment) report.reviewComment = comment;
  await report.save();

  await createAuditLog({
    user: req.user,
    action: action === 'approve' ? 'APPROVE' : action === 'correction' ? 'CORRECTION_REQUEST' : 'VALIDATE',
    entity: 'BRSRReport',
    entityId: report._id,
    organization: req.user.organization,
    description: `${action.toUpperCase()} on BRSR report: ${report.title}. Status: ${newStatus}`,
  });

  const updatedReport = await BRSRReport.findById(report._id)
    .populate('organization', 'name type location cin gstin industry')
    .populate('generatedBy', 'name email')
    .populate('approvedBy', 'name email')
    .populate('reviewedBy', 'name email')
    .populate('includedESGRecords');

  res.status(200).json({ success: true, message: `Report status updated to ${newStatus}`, data: updatedReport });
};

// @desc    Get all reports
// @route   GET /api/reports
// @access  Private
const getReports = getBRSRReports;

module.exports = { getBRSRReports, getBRSRReport, createBRSRReport, generateReport, updateBRSRReport, reviewBRSRReport, getReports };
