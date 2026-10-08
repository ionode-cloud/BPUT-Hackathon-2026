const ESGData = require('../models/ESGData');
const Organization = require('../models/Organization');
const User = require('../models/User');
const { getAccessibleOrgIds } = require('./organizationController');
const { createAuditLog } = require('../utils/auditLogger');
const { createNotification } = require('../utils/notificationHelper');
const { validateRecord, validateProjectDataset } = require('../utils/aiValidationEngine');
const { calculateESGScore } = require('../utils/esgScoreEngine');

// Helper: validate basic ESG record fields
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
  const { page = 1, limit = 20, category, status, organization, year, quarter, metric, department, projectId, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const accessibleIds = await getAccessibleOrgIds(req.user);
  const filter = { organization: { $in: accessibleIds } };

  if (category) filter.category = category;
  if (department) filter.department = department;
  if (projectId) filter.projectId = projectId;

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
      { projectName: { $regex: search, $options: 'i' } },
      { projectId: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await ESGData.countDocuments(filter);
  const records = await ESGData.find(filter)
    .populate('organization', 'name type projectId sector location')
    .populate('project', 'name projectId sector location')
    .populate('responsibleUser', 'name email employeeId designation')
    .populate('submittedBy', 'name email employeeId designation')
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
    .populate('organization', 'name type parent projectId sector location')
    .populate('project', 'name projectId sector location')
    .populate('responsibleUser', 'name email role employeeId designation')
    .populate('submittedBy', 'name email employeeId designation')
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

  const org = await Organization.findById(orgId).populate('parent');

  // Fill project and organizational context automatically if not explicitly provided
  const projectId = req.body.projectId || org?.projectId || (org?.type === 'Project' ? org.name : '');
  const projectName = req.body.projectName || (org?.type === 'Project' ? org.name : '');
  const organizationName = org?.name || '';
  const organizationId = org?._id?.toString() || '';
  const subsidiaryName = req.body.subsidiaryName || org?.subsidiaryName || (org?.parent?.type === 'Subsidiary' ? org.parent.name : '');
  const businessUnitName = req.body.businessUnitName || org?.businessUnitName || (org?.parent?.type === 'Business Unit' ? org.parent.name : '');
  const sectorType = req.body.sectorType || org?.sector || org?.industry || 'Infrastructure';
  const locationState = req.body.location?.state || org?.location?.state || '';
  const locationDistrict = req.body.location?.district || org?.location?.district || '';
  const locationCity = req.body.location?.city || org?.location?.city || '';
  const locationAddress = req.body.location?.address || org?.location?.address || '';

  // Determine department based on category or explicit choice
  let department = req.body.department;
  if (!department) {
    if (req.body.category === 'Environmental') department = 'Environmental';
    else if (req.body.category === 'Social') department = 'HR';
    else if (req.body.category === 'Governance') department = 'Compliance';
    else department = 'Environmental';
  }

  const initialStatus = req.body.status === 'Submitted' ? 'Submitted' : 'Draft';

  // Run AI Validation check
  const aiCheck = await validateRecord(req.body);
  const validationErrors = validateESGRecord(req.body);

  const record = await ESGData.create({
    ...req.body,
    projectId,
    projectName,
    project: org?.type === 'Project' ? org._id : (req.body.project || undefined),
    organizationName,
    organizationId,
    groupCompany: req.body.groupCompany || 'MEIL Group (Megha Engineering & Infrastructures Ltd.)',
    subsidiaryName,
    businessUnitName,
    sectorType,
    location: {
      state: locationState,
      district: locationDistrict,
      city: locationCity,
      address: locationAddress,
    },
    department,
    submittedBy: req.user._id,
    submittedByName: req.body.submittedByName || req.user.name,
    employeeId: req.body.employeeId || req.user.employeeId || 'MEIL-EMP-1042',
    designation: req.body.designation || req.user.designation || 'ESG Operations Officer',
    responsibleUser: req.body.responsibleUser || req.user._id,
    dateOfSubmission: initialStatus === 'Submitted' ? new Date() : undefined,
    lastUpdatedDate: new Date(),
    status: initialStatus,
    validationErrors,
    aiValidationResults: aiCheck.issues || [],
    workflowHistory: [
      {
        status: initialStatus,
        changedBy: req.user._id,
        comment: initialStatus === 'Submitted' ? 'Record created and submitted directly' : 'Record created as draft',
      },
    ],
  });

  await createAuditLog({
    user: req.user,
    action: initialStatus === 'Submitted' ? 'SUBMIT' : 'CREATE',
    entity: 'ESGData',
    entityId: record._id,
    organization: req.user.organization,
    description: `Created ESG record: ${record.category} - ${record.metric} [Status: ${initialStatus}]`,
  });

  res.status(201).json({ success: true, message: 'ESG record created', data: record, aiValidation: aiCheck });
};

// @desc    Update ESG record
// @route   PUT /api/esg/:id
// @access  Private
// Enforces Data Integrity & Access Control Policy:
// - Only the user who created it can edit it while in Draft status (or Correction Required)
// - Once submitted, it becomes READ-ONLY
// - Approved records are LOCKED
const updateESGRecord = async (req, res) => {
  const record = await ESGData.findById(req.params.id);
  if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

  const accessibleIds = await getAccessibleOrgIds(req.user);
  if (!accessibleIds.some((id) => id.toString() === record.organization.toString())) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  const isSuperAdmin = req.user.role === 'Super Admin';
  const isCreator = record.submittedBy && record.submittedBy.toString() === req.user._id.toString();

  // 1. Check if record is approved and locked
  if (record.status === 'Approved') {
    return res.status(400).json({
      success: false,
      message: 'Data Integrity Policy: This record has been Approved and is LOCKED. Modifications are strictly prohibited for BRSR statutory compliance.',
    });
  }

  // 2. Check if record has been submitted and is read-only
  if (['Submitted', 'Under Review', 'Validated'].includes(record.status)) {
    return res.status(400).json({
      success: false,
      message: 'Data Integrity Policy: Submitted records are READ-ONLY. An authorized ESG Manager or Reviewer must raise a Correction Request to return the record for modifications.',
    });
  }

  // 3. Check ownership: Only the creator can edit (or Super Admin) in Draft / Correction Required status
  if (!isCreator && !isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Access Control Policy: Only the user who originally created this record can edit it.',
    });
  }

  const allowedFields = [
    'value', 'unit', 'description', 'dataSource', 'remarks',
    'reportingPeriod', 'responsibleUser', 'category', 'metric',
    'subcategory', 'organization', 'additionalData', 'projectId',
    'projectName', 'groupCompany', 'subsidiaryName', 'businessUnitName',
    'sectorType', 'location', 'department', 'employeeId', 'designation',
    'supportingDocuments', 'evidence',
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) record[field] = req.body[field];
  });

  record.lastUpdatedDate = new Date();

  // Re-run AI Validation
  const aiCheck = await validateRecord(record);
  record.aiValidationResults = aiCheck.issues || [];
  record.validationErrors = validateESGRecord(record);

  // If was Correction Required, track modification in history
  if (record.status === 'Correction Required') {
    record.workflowHistory.push({
      status: 'Correction Required',
      changedBy: req.user._id,
      comment: 'Record updated by submitter in response to correction request',
    });
  }

  await record.save();

  await createAuditLog({
    user: req.user,
    action: 'UPDATE',
    entity: 'ESGData',
    entityId: record._id,
    organization: req.user.organization,
    description: `Updated ESG record: ${record.metric} by ${req.user.name}`,
  });

  res.status(200).json({ success: true, message: 'Record updated successfully', data: record, aiValidation: aiCheck });
};

// @desc    Submit ESG record for review
// @route   PUT /api/esg/:id/submit
// @access  Private
const submitESGRecord = async (req, res) => {
  const record = await ESGData.findById(req.params.id).populate('organization');
  if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

  // Only creator or Super Admin can submit
  const isCreator = record.submittedBy && record.submittedBy.toString() === req.user._id.toString();
  const isSuperAdmin = req.user.role === 'Super Admin';
  if (!isCreator && !isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'Only the creator can submit this record.' });
  }

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

  // Run AI Validation Engine
  const aiCheck = await validateRecord(record);
  record.aiValidationResults = aiCheck.issues || [];

  const previousStatus = record.status;
  record.status = 'Submitted';
  record.submittedBy = req.user._id;
  record.submittedAt = new Date();
  record.dateOfSubmission = new Date();
  record.lastUpdatedDate = new Date();
  record.validationErrors = [];
  record.workflowHistory.push({
    status: 'Submitted',
    changedBy: req.user._id,
    comment: req.body.comment || (previousStatus === 'Correction Required' ? 'Resubmitted after correction' : 'Submitted for review'),
  });
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
    action: previousStatus === 'Correction Required' ? 'RESUBMIT' : 'SUBMIT',
    entity: 'ESGData',
    entityId: record._id,
    organization: req.user.organization,
    description: `Submitted ESG record for review: ${record.metric}`,
  });

  res.status(200).json({ success: true, message: 'Record submitted for review', data: record, aiValidation: aiCheck });
};

// @desc    Review ESG record (approve/reject/request correction)
// @route   PUT /api/esg/:id/review
// @access  Private (Reviewer / ESG Manager / Super Admin)
const reviewESGRecord = async (req, res) => {
  const { action, comment } = req.body; // action: 'approve' | 'reject' | 'correction' | 'validate' | 'under_review'

  const record = await ESGData.findById(req.params.id).populate('organization');
  if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

  const isSuperOrAdmin = ['Super Admin', 'Group ESG Admin', 'ESG Manager'].includes(req.user.role);
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
  } else if (action === 'reject') {
    newStatus = 'Rejected';
    notificationType = 'CORRECTION_REQUIRED';
    notificationTitle = 'ESG Record Rejected';
    record.reviewComment = comment || 'Record rejected by reviewer';
  } else if (action === 'correction') {
    newStatus = 'Correction Required';
    notificationType = 'CORRECTION_REQUIRED';
    notificationTitle = 'Correction Required on ESG Record';
    record.correctionComment = comment || 'Correction required by administrator / ESG Manager';
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
    return res.status(400).json({ success: false, message: 'Invalid action. Use: approve, reject, correction, validate, under_review' });
  }

  record.status = newStatus;
  if (comment) record.reviewComment = comment;
  record.lastUpdatedDate = new Date();
  record.workflowHistory.push({ status: newStatus, changedBy: req.user._id, comment });
  await record.save();

  // Notify the submitter
  const targetUser = record.submittedBy || record.responsibleUser;
  if (targetUser) {
    await createNotification({
      recipient: targetUser,
      type: notificationType,
      title: notificationTitle,
      message: `Your ${record.category} record "${record.metric}" status is now: ${newStatus}. ${comment || ''}`,
      relatedRecord: { model: 'ESGData', id: record._id },
      triggeredBy: req.user._id,
      organization: record.organization._id,
    });
  }

  await createAuditLog({
    user: req.user,
    action: action === 'approve' ? 'APPROVE' : action === 'reject' ? 'REJECT' : action === 'correction' ? 'CORRECTION_REQUEST' : 'VALIDATE',
    entity: 'ESGData',
    entityId: record._id,
    organization: req.user.organization,
    description: `${action.toUpperCase()} on ESG record: ${record.metric}. Status: ${newStatus}`,
    metadata: { comment },
  });

  res.status(200).json({ success: true, message: `Record status updated to: ${newStatus}`, data: record });
};

// @desc    Delete ESG record (Draft only, creator or Super Admin only)
// @route   DELETE /api/esg/:id
// @access  Private
const deleteESGRecord = async (req, res) => {
  const record = await ESGData.findById(req.params.id);
  if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

  const accessibleIds = await getAccessibleOrgIds(req.user);
  if (!accessibleIds.some((id) => id.toString() === record.organization.toString())) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  // Data Integrity Policy: Only Draft status records can be deleted
  if (record.status !== 'Draft') {
    return res.status(400).json({
      success: false,
      message: `Data Integrity Policy: Records in "${record.status}" status cannot be deleted. Only records in "Draft" status can be deleted to maintain statutory audit trails.`,
    });
  }

  // Creator or Super Admin check
  const isCreator = record.submittedBy && record.submittedBy.toString() === req.user._id.toString();
  const isSuperAdmin = req.user.role === 'Super Admin';
  if (!isCreator && !isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Access Control Policy: Only the user who created this record can delete it while in Draft status.',
    });
  }

  await record.deleteOne();

  await createAuditLog({
    user: req.user,
    action: 'DELETE',
    entity: 'ESGData',
    entityId: req.params.id,
    organization: req.user.organization,
    description: `Deleted Draft ESG record: ${record.metric}`,
  });

  res.status(200).json({ success: true, message: 'Draft record deleted successfully' });
};

// @desc    Run AI Validation Engine on record or project dataset
// @route   POST /api/esg/validate
// @access  Private
const runAIValidation = async (req, res) => {
  const { recordId, recordData, organization, year, projectId } = req.body;

  // Single record validation
  if (recordId) {
    const record = await ESGData.findById(recordId).populate('organization');
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

    const result = await validateRecord(record);
    record.aiValidationResults = result.issues;
    await record.save();

    return res.status(200).json({ success: true, data: result, record });
  }

  if (recordData) {
    const result = await validateRecord(recordData);
    return res.status(200).json({ success: true, data: result });
  }

  // Full dataset validation for an organization/project and year
  const filter = {};
  if (organization) filter.organization = organization;
  if (projectId) filter.projectId = projectId;
  if (year) filter['reportingPeriod.year'] = year;

  const records = await ESGData.find(filter).populate('organization', 'name type');
  const recordValidations = await Promise.all(records.map((r) => validateRecord(r, { existingRecords: records, isBatch: true })));

  const projectDatasetCheck = validateProjectDataset(records);

  // Combine issues
  const allIssues = [];
  records.forEach((r, idx) => {
    const val = recordValidations[idx];
    if (val.issues?.length > 0) {
      val.issues.forEach((iss) => {
        allIssues.push({
          ...iss,
          recordId: r._id,
          metric: r.metric,
          category: r.category,
          department: r.department,
          projectName: r.projectName,
          status: r.status,
        });
      });
    }
  });

  projectDatasetCheck.allIssues.forEach((iss) => allIssues.push(iss));

  const highCount = allIssues.filter((i) => i.severity === 'HIGH').length;
  const medCount = allIssues.filter((i) => i.severity === 'MEDIUM').length;
  const lowCount = allIssues.filter((i) => i.severity === 'LOW').length;

  let overallConfidence = 100 - (highCount * 20 + medCount * 8 + lowCount * 2);
  overallConfidence = Math.max(0, Math.min(100, overallConfidence));

  res.status(200).json({
    success: true,
    data: {
      totalRecordsEvaluated: records.length,
      overallConfidence,
      issuesCount: allIssues.length,
      summary: { highCount, medCount, lowCount },
      issues: allIssues,
      departmentCoverage: projectDatasetCheck.deptCoverage,
    },
  });
};

// @desc    Get consolidated ESG data combining Environmental + HR + Safety + Governance
// @route   GET /api/esg/consolidated
// @access  Private
const getConsolidatedData = async (req, res) => {
  const { organization, projectId, year = new Date().getFullYear().toString() } = req.query;

  const filter = { 'reportingPeriod.year': year };
  if (organization) filter.organization = organization;
  if (projectId) filter.projectId = projectId;

  const records = await ESGData.find(filter)
    .populate('organization', 'name type projectId sector location')
    .populate('project', 'name projectId sector location')
    .populate('submittedBy', 'name email employeeId designation')
    .sort({ createdAt: -1 });

  // Group into 4 departments: Environmental, HR, Safety, Compliance/Governance
  const environmentalRecords = records.filter(
    (r) => r.department === 'Environmental' || r.category === 'Environmental'
  );

  const hrRecords = records.filter(
    (r) =>
      r.department === 'HR' ||
      (r.category === 'Social' &&
        (r.metric.includes('Employee') || r.metric.includes('Training') || r.metric.includes('Diversity') || r.metric.includes('Hires')))
  );

  const safetyRecords = records.filter(
    (r) =>
      r.department === 'Safety' ||
      r.metric.toLowerCase().includes('injury') ||
      r.metric.toLowerCase().includes('accident') ||
      r.metric.toLowerCase().includes('fatal') ||
      r.metric.toLowerCase().includes('near miss') ||
      r.metric.toLowerCase().includes('safety')
  );

  const complianceRecords = records.filter(
    (r) =>
      r.department === 'Compliance' ||
      r.department === 'Governance' ||
      r.category === 'Governance' ||
      r.metric.includes('Ethics') ||
      r.metric.includes('Corruption') ||
      r.metric.includes('Compliances')
  );

  const approvedCount = records.filter((r) => r.status === 'Approved').length;
  const submittedCount = records.filter((r) => r.status === 'Submitted' || r.status === 'Under Review' || r.status === 'Validated').length;
  const draftCount = records.filter((r) => r.status === 'Draft').length;
  const correctionCount = records.filter((r) => r.status === 'Correction Required').length;

  res.status(200).json({
    success: true,
    data: {
      year,
      totalRecords: records.length,
      statusBreakdown: {
        approved: approvedCount,
        submitted: submittedCount,
        draft: draftCount,
        correctionRequired: correctionCount,
      },
      departments: {
        environmental: {
          label: 'Environmental Officer',
          count: environmentalRecords.length,
          records: environmentalRecords,
        },
        hr: {
          label: 'HR Officer',
          count: hrRecords.length,
          records: hrRecords,
        },
        safety: {
          label: 'Safety Officer',
          count: safetyRecords.length,
          records: safetyRecords,
        },
        compliance: {
          label: 'Compliance Officer',
          count: complianceRecords.length,
          records: complianceRecords,
        },
      },
      isReadyForScoring: approvedCount >= 4,
    },
  });
};

// @desc    Calculate ESG score for organization / project
// @route   GET /api/esg/score
// @access  Private
const getESGScore = async (req, res) => {
  const { organization, projectId, year = new Date().getFullYear().toString() } = req.query;

  const filter = { 'reportingPeriod.year': year };
  if (organization) filter.organization = organization;
  if (projectId) filter.projectId = projectId;

  // Prefer approved records; fallback to submitted if evaluating pipeline
  let records = await ESGData.find({ ...filter, status: 'Approved' });
  if (records.length === 0) {
    records = await ESGData.find(filter);
  }

  let orgInfo = {};
  if (organization) {
    orgInfo = await Organization.findById(organization);
  }

  const scoreResult = calculateESGScore(records, {
    sector: orgInfo?.sector || orgInfo?.industry || 'Infrastructure',
    projectName: orgInfo?.name,
  });

  res.status(200).json({
    success: true,
    data: scoreResult,
  });
};

// @desc    Create a Project
// @route   POST /api/esg/projects
// @access  Private
const createProject = async (req, res) => {
  const {
    projectName,
    sector,
    location,
    businessUnit,
    subsidiary,
    reportingYear = new Date().getFullYear().toString(),
  } = req.body;

  if (!projectName) {
    return res.status(400).json({ success: false, message: 'Project Name is required' });
  }

  // Generate unique Project ID
  const sectorCode = (sector || 'INFRA').slice(0, 3).toUpperCase();
  const yearCode = reportingYear.slice(-2);
  const randomCode = Math.floor(100 + Math.random() * 900);
  const projectId = `PRJ-${sectorCode}-${yearCode}-${randomCode}`;

  let buOrg = null;
  if (businessUnit) {
    buOrg = await Organization.findById(businessUnit);
  }

  let subOrg = null;
  if (subsidiary) {
    subOrg = await Organization.findById(subsidiary);
  }

  const project = await Organization.create({
    name: projectName,
    type: 'Project',
    projectId,
    sector: sector || 'Transportation',
    industry: sector || 'Transportation',
    parent: buOrg?._id || subOrg?._id || null,
    subsidiaryName: subOrg?.name || '',
    businessUnitName: buOrg?.name || '',
    reportingYear,
    location: {
      state: location?.state || '',
      district: location?.district || '',
      city: location?.city || '',
      address: location?.address || '',
      country: 'India',
    },
    status: 'Active',
    verificationStatus: 'Verified',
  });

  await createAuditLog({
    user: req.user,
    action: 'ORG_CREATE',
    entity: 'Organization',
    entityId: project._id,
    organization: project,
    description: `Created MEIL Project: ${projectName} (${projectId}) in ${sector} sector`,
  });

  res.status(201).json({
    success: true,
    message: 'Project created successfully',
    data: project,
  });
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
  const rejected = statusMap['Rejected'] || 0;

  res.status(200).json({
    success: true,
    data: {
      total,
      approved,
      pending,
      correction,
      draft,
      rejected,
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
  runAIValidation,
  getConsolidatedData,
  getESGScore,
  createProject,
  getDashboardStats,
};
