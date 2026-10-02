const ESGData = require('../models/ESGData');
const { getAccessibleOrgIds } = require('./organizationController');
const { createAuditLog } = require('../utils/auditLogger');
const { createNotification } = require('../utils/notificationHelper');
const User = require('../models/User');

// Helper: validate ESG record fields
const validateESGRecord = (data) => {
  const errors = [];
  if (!data.category) errors.push({ field: 'category', message: 'Category is required' });
  if (!data.metric) errors.push({ field: 'metric', message: 'Metric is required' });
  if (!data.organization) errors.push({ field: 'organization', message: 'Organization is required' });
  if (data.value === undefined || data.value === null || data.value === '')
    errors.push({ field: 'value', message: 'Value is required' });
  if (!data.reportingPeriod?.year)
    errors.push({ field: 'reportingPeriod.year', message: 'Reporting year is required' });
  return errors;
};

// @desc    Get ESG records
// @route   GET /api/esg
// @access  Private
const getESGRecords = async (req, res) => {
  const { page = 1, limit = 20, category, status, organization, year, quarter, metric, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const accessibleIds = await getAccessibleOrgIds(req.user);
  const filter = { organization: { $in: accessibleIds } };

  if (category) filter.category = category;
  if (status) {
    if (status.toLowerCase() === 'pending') {
      filter.status = { $in: ['Submitted', 'Under Review', 'Validated'] };
    } else {
      filter.status = status;
    }
  }
  if (organization) filter.organization = organization;
  if (year) filter['reportingPeriod.year'] = year;
  if (quarter) filter['reportingPeriod.quarter'] = quarter;
  if (metric) filter.metric = { $regex: metric, $options: 'i' };
  if (search) {
    filter.$or = [
      { metric: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { dataSource: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await ESGData.countDocuments(filter);
  const records = await ESGData.find(filter)
    .populate('organization', 'name type')
    .populate('responsibleUser', 'name email')
    .populate('submittedBy', 'name email')
    .populate('reviewedBy', 'name email')
    .populate('approvedBy', 'name email')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: records,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
  });
};

// @desc    Get single ESG record
// @route   GET /api/esg/:id
// @access  Private
const getESGRecord = async (req, res) => {
  const record = await ESGData.findById(req.params.id)
    .populate('organization', 'name type parent')
    .populate('responsibleUser', 'name email role')
    .populate('submittedBy', 'name email')
    .populate('reviewedBy', 'name email')
    .populate('approvedBy', 'name email')
    .populate('workflowHistory.changedBy', 'name email role')
    .populate('evidence.document');

  if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

  const accessibleIds = await getAccessibleOrgIds(req.user);
  if (!accessibleIds.some((id) => id.toString() === record.organization._id.toString())) {
    return res.status(403).json({ success: false, message: 'Not authorized to view this record' });
  }

  res.status(200).json({ success: true, data: record });
};

// @desc    Create ESG record
// @route   POST /api/esg
// @access  Private
const createESGRecord = async (req, res) => {
  const accessibleIds = await getAccessibleOrgIds(req.user);
  const orgId = req.body.organization;

  if (!accessibleIds.some((id) => id.toString() === orgId)) {
    return res.status(403).json({ success: false, message: 'Not authorized to create records for this organization' });
  }

  const validationErrors = validateESGRecord(req.body);

  const record = await ESGData.create({
    ...req.body,
    submittedBy: req.user._id,
    responsibleUser: req.body.responsibleUser || req.user._id,
    status: req.body.status === 'Submitted' ? 'Submitted' : 'Draft',
    validationErrors,
    workflowHistory: [
      { status: 'Draft', changedBy: req.user._id, comment: 'Record created' },
    ],
  });

  await createAuditLog({
    user: req.user,
    action: 'CREATE',
    entity: 'ESGData',
    entityId: record._id,
    organization: req.user.organization,
    description: `Created ESG record: ${record.category} - ${record.metric}`,
  });

  res.status(201).json({ success: true, message: 'ESG record created', data: record });
};

// @desc    Update ESG record
// @route   PUT /api/esg/:id
// @access  Private
const updateESGRecord = async (req, res) => {
  const record = await ESGData.findById(req.params.id);
  if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

  const accessibleIds = await getAccessibleOrgIds(req.user);
  if (!accessibleIds.some((id) => id.toString() === record.organization.toString())) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  const allowedFields = [
    'value', 'unit', 'description', 'dataSource', 'remarks',
    'reportingPeriod', 'responsibleUser', 'category', 'metric',
    'subcategory', 'status', 'organization', 'additionalData'
  ];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) record[field] = req.body[field];
  });

  // Re-validate
  record.validationErrors = validateESGRecord(record);

  await record.save();

  await createAuditLog({
    user: req.user,
    action: 'UPDATE',
    entity: 'ESGData',
    entityId: record._id,
    organization: req.user.organization,
    description: `Updated ESG record: ${record.metric}`,
  });

  res.status(200).json({ success: true, message: 'Record updated', data: record });
};

// @desc    Submit ESG record for review
// @route   PUT /api/esg/:id/submit
// @access  Private
const submitESGRecord = async (req, res) => {
  const record = await ESGData.findById(req.params.id).populate('organization');
  if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

  if (!['Draft', 'Correction Required'].includes(record.status)) {
    return res.status(400).json({ success: false, message: `Cannot submit from status: ${record.status}` });
  }

  // Validate before submitting
  const errors = validateESGRecord(record);
  if (errors.length > 0) {
    record.validationErrors = errors;
    await record.save();
    return res.status(400).json({ success: false, message: 'Record has validation errors', errors });
  }

  record.status = 'Submitted';
  record.submittedBy = req.user._id;
  record.submittedAt = new Date();
  record.validationErrors = [];
  record.workflowHistory.push({ status: 'Submitted', changedBy: req.user._id, comment: req.body.comment || '' });
  await record.save();

  // Notify reviewers in the org
  const reviewers = await User.find({
    organization: record.organization._id,
    role: { $in: ['ESG Manager', 'Compliance Officer', 'Group ESG Admin', 'Super Admin'] },
  });
  for (const reviewer of reviewers) {
    await createNotification({
      recipient: reviewer._id,
      type: 'ESG_SUBMITTED',
      title: 'New ESG Record Submitted',
      message: `${req.user.name} submitted a ${record.category} record: ${record.metric}`,
      relatedRecord: { model: 'ESGData', id: record._id },
      triggeredBy: req.user._id,
      organization: record.organization._id,
    });
  }

  await createAuditLog({
    user: req.user,
    action: 'SUBMIT',
    entity: 'ESGData',
    entityId: record._id,
    organization: req.user.organization,
    description: `Submitted ESG record for review: ${record.metric}`,
  });

  res.status(200).json({ success: true, message: 'Record submitted for review', data: record });
};

// @desc    Review ESG record (approve/reject/request correction)
// @route   PUT /api/esg/:id/review
// @access  Private (Reviewer)
const reviewESGRecord = async (req, res) => {
  const { action, comment } = req.body; // action: 'approve' | 'reject' | 'correction'

  const record = await ESGData.findById(req.params.id).populate('organization');
  if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

  const isSuperOrAdmin = ['Super Admin', 'Group ESG Admin'].includes(req.user.role);
  if (!isSuperOrAdmin && !['Submitted', 'Under Review', 'Validated', 'Correction Required'].includes(record.status)) {
    return res.status(400).json({ success: false, message: `Cannot review from status: ${record.status}` });
  }

  let newStatus;
  let notificationType;
  let notificationTitle;

  if (action === 'approve') {
    newStatus = 'Approved';
    notificationType = 'ESG_APPROVED';
    notificationTitle = 'ESG Record Approved';
    record.approvedBy = req.user._id;
    record.approvedAt = new Date();
  } else if (action === 'correction') {
    newStatus = 'Correction Required';
    notificationType = 'CORRECTION_REQUIRED';
    notificationTitle = 'Correction Required on ESG Record';
    record.correctionComment = comment || 'Correction required by administrator';
  } else if (action === 'validate') {
    newStatus = 'Validated';
    notificationType = 'ESG_SUBMITTED';
    notificationTitle = 'ESG Record Validated';
    record.reviewedBy = req.user._id;
    record.reviewedAt = new Date();
  } else if (action === 'under_review') {
    newStatus = 'Under Review';
    notificationType = 'REVIEW_ASSIGNED';
    notificationTitle = 'ESG Record Under Review';
  } else {
    return res.status(400).json({ success: false, message: 'Invalid action. Use: approve, correction, validate, under_review' });
  }

  record.status = newStatus;
  record.reviewComment = comment;
  record.workflowHistory.push({ status: newStatus, changedBy: req.user._id, comment });
  await record.save();

  // Notify the responsible user
  if (record.responsibleUser) {
    await createNotification({
      recipient: record.responsibleUser,
      type: notificationType,
      title: notificationTitle,
      message: `Your ${record.category} record "${record.metric}" has been updated to: ${newStatus}. ${comment || ''}`,
      relatedRecord: { model: 'ESGData', id: record._id },
      triggeredBy: req.user._id,
      organization: record.organization._id,
    });
  }

  await createAuditLog({
    user: req.user,
    action: action === 'approve' ? 'APPROVE' : action === 'correction' ? 'CORRECTION_REQUEST' : 'VALIDATE',
    entity: 'ESGData',
    entityId: record._id,
    organization: req.user.organization,
    description: `${action} on ESG record: ${record.metric}. Status: ${newStatus}`,
    metadata: { comment },
  });

  res.status(200).json({ success: true, message: `Record ${newStatus}`, data: record });
};

// @desc    Delete ESG record (Draft only)
// @route   DELETE /api/esg/:id
// @access  Private
const deleteESGRecord = async (req, res) => {
  const record = await ESGData.findById(req.params.id);
  if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

  const accessibleIds = await getAccessibleOrgIds(req.user);
  if (!accessibleIds.some((id) => id.toString() === record.organization.toString())) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  await record.deleteOne();

  await createAuditLog({
    user: req.user,
    action: 'DELETE',
    entity: 'ESGData',
    entityId: req.params.id,
    organization: req.user.organization,
    description: `Deleted ESG record: ${record.metric}`,
  });

  res.status(200).json({ success: true, message: 'Record deleted' });
};

// @desc    Get dashboard stats
// @route   GET /api/esg/dashboard
// @access  Private
const getDashboardStats = async (req, res) => {
  const { year, organization } = req.query;
  const accessibleIds = await getAccessibleOrgIds(req.user);

  const filter = { organization: { $in: accessibleIds } };
  if (year) filter['reportingPeriod.year'] = year;
  if (organization && accessibleIds.some((id) => id.toString() === organization)) {
    filter.organization = organization;
  }

  const [statusCounts, categoryCounts, total] = await Promise.all([
    ESGData.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    ESGData.aggregate([
      { $match: filter },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
    ESGData.countDocuments(filter),
  ]);

  const statusMap = {};
  statusCounts.forEach((s) => (statusMap[s._id] = s.count));

  const categoryMap = {};
  categoryCounts.forEach((c) => (categoryMap[c._id] = c.count));

  const approved = statusMap['Approved'] || 0;
  const pending = (statusMap['Submitted'] || 0) + (statusMap['Under Review'] || 0) + (statusMap['Validated'] || 0);
  const correction = statusMap['Correction Required'] || 0;
  const draft = statusMap['Draft'] || 0;

  res.status(200).json({
    success: true,
    data: {
      total,
      approved,
      pending,
      correction,
      draft,
      completionPercentage: total > 0 ? Math.round((approved / total) * 100) : 0,
      byCategory: categoryMap,
      byStatus: statusMap,
    },
  });
};

module.exports = {
  getESGRecords,
  getESGRecord,
  createESGRecord,
  updateESGRecord,
  submitESGRecord,
  reviewESGRecord,
  deleteESGRecord,
  getDashboardStats,
};
