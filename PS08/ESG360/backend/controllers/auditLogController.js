const AuditLog = require('../models/AuditLog');
const Organization = require('../models/Organization');

// @desc    Get audit logs (deduplicated by user credential/email)
// @route   GET /api/audit-logs
// @access  Private (Admin/Auditor)
const getAuditLogs = async (req, res) => {
  const { page = 1, limit = 20, user, action, entity, organization, startDate, endDate, status } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = {};
  if (user) filter.user = user;
  if (action) filter.action = action;
  if (entity) filter.entity = entity;
  if (organization) filter.organization = organization;
  if (status) filter.status = status;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  // Non-super-admins can only see their org's audit logs
  if (!['Super Admin', 'Group ESG Admin', 'Auditor/Reviewer'].includes(req.user.role)) {
    filter.organization = req.user.organization?._id;
  }

  const allLogs = await AuditLog.find(filter)
    .populate('user', 'name email role')
    .populate('organization', 'name type')
    .sort({ createdAt: -1 });

  // Deduplicate by userEmail to guarantee no duplicate credentials of Super Admin or any user
  const seenEmails = new Set();
  const dedupedLogs = [];
  for (const log of allLogs) {
    const email = (log.userEmail || log.user?.email || '').trim().toLowerCase();
    if (email && seenEmails.has(email)) {
      continue;
    }
    if (email) seenEmails.add(email);
    dedupedLogs.push(log);
  }

  const total = dedupedLogs.length;
  const pagedLogs = dedupedLogs.slice(skip, skip + parseInt(limit));

  res.status(200).json({
    success: true,
    data: pagedLogs,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) || 1 },
  });
};

// @desc    Create audit log manually
// @route   POST /api/audit-logs
// @access  Private (Admin)
const createAuditLogRecord = async (req, res) => {
  const { userName, userEmail, userRole, password, action, entity, organization, status, ipAddress } = req.body;

  const targetOrgId = organization || req.user.organization?._id || req.user.organization;
  let targetOrgName = '';
  if (targetOrgId) {
    const orgDoc = await Organization.findById(targetOrgId);
    if (orgDoc) targetOrgName = orgDoc.name;
  }

  const log = await AuditLog.create({
    user: req.user._id,
    userName: userName || req.user.name,
    userEmail: userEmail || req.user.email,
    userRole: userRole || req.user.role,
    password: password || 'Admin@123456',
    action: action || 'LOGIN',
    entity: entity || 'User',
    organization: targetOrgId || null,
    organizationName: targetOrgName,
    status: status || 'Success',
    ipAddress: ipAddress || req.ip || '127.0.0.1',
  });

  await log.populate('organization', 'name type');

  res.status(201).json({
    success: true,
    message: 'Audit log created successfully',
    data: log,
  });
};

// @desc    Update audit log
// @route   PUT /api/audit-logs/:id
// @access  Private (Admin)
const updateAuditLog = async (req, res) => {
  const { id } = req.params;
  const log = await AuditLog.findById(id);

  if (!log) {
    return res.status(404).json({ success: false, message: 'Audit log not found' });
  }

  const { userName, userEmail, userRole, password, action, entity, organization, status } = req.body;

  if (userName !== undefined) log.userName = userName;
  if (userEmail !== undefined) log.userEmail = userEmail;
  if (userRole !== undefined) log.userRole = userRole;
  if (password !== undefined) log.password = password;
  if (action !== undefined) log.action = action;
  if (entity !== undefined) log.entity = entity;
  if (status !== undefined) log.status = status;
  if (organization !== undefined) {
    log.organization = organization || null;
    if (organization) {
      const orgDoc = await Organization.findById(organization);
      if (orgDoc) log.organizationName = orgDoc.name;
    } else {
      log.organizationName = '';
    }
  }

  await log.save();
  await log.populate('organization', 'name type');

  res.status(200).json({
    success: true,
    message: 'Audit log updated successfully',
    data: log,
  });
};

// @desc    Delete audit log
// @route   DELETE /api/audit-logs/:id
// @access  Private (Admin)
const deleteAuditLog = async (req, res) => {
  const { id } = req.params;
  const log = await AuditLog.findById(id);

  if (!log) {
    return res.status(404).json({ success: false, message: 'Audit log not found' });
  }

  await log.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Audit log deleted successfully',
  });
};

module.exports = { getAuditLogs, createAuditLogRecord, updateAuditLog, deleteAuditLog };
