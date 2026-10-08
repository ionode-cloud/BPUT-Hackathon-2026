const AuditLog = require('../models/AuditLog');
const Organization = require('../models/Organization');
const User = require('../models/User');

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

// @desc    Create audit log manually & create/sync user account for immediate login
// @route   POST /api/audit-logs
// @access  Private (Admin)
const createAuditLogRecord = async (req, res) => {
  const { userName, userEmail, userRole, password, action, entity, organization, status, ipAddress } = req.body;

  if (!userEmail) {
    return res.status(400).json({ success: false, message: 'User email is required' });
  }

  const cleanPassword = password || 'Admin@123456';
  if (cleanPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
  }

  const assignedRole = userRole || 'Project/Department User';
  const isSuperAdmin = assignedRole === 'Super Admin';

  const targetOrgId = isSuperAdmin ? null : (organization || req.user.organization?._id || req.user.organization || null);
  let targetOrgName = '';
  if (targetOrgId) {
    const orgDoc = await Organization.findById(targetOrgId);
    if (orgDoc) targetOrgName = orgDoc.name;
  }

  const normalizedEmail = String(userEmail).trim().toLowerCase();
  const displayName = (userName && userName.trim()) || normalizedEmail.split('@')[0];

  // Synchronize with User collection so newly created credentials can immediately log in
  let targetUser = await User.findOne({ email: normalizedEmail }).select('+password');
  if (targetUser) {
    targetUser.name = displayName;
    targetUser.role = assignedRole;
    targetUser.organization = isSuperAdmin ? null : (targetOrgId || null);
    targetUser.password = cleanPassword; // pre('save') hook will hash with bcrypt
    targetUser.isActive = true;
    await targetUser.save();
  } else {
    targetUser = await User.create({
      name: displayName,
      email: normalizedEmail,
      password: cleanPassword,
      role: assignedRole,
      organization: isSuperAdmin ? null : (targetOrgId || null),
      isActive: true,
    });
  }

  const log = await AuditLog.create({
    user: targetUser._id,
    userName: targetUser.name,
    userEmail: targetUser.email,
    userRole: targetUser.role,
    password: cleanPassword,
    action: action || 'LOGIN',
    entity: entity || 'User',
    organization: isSuperAdmin ? null : (targetOrgId || null),
    organizationName: isSuperAdmin ? '' : targetOrgName,
    status: status || 'Success',
    ipAddress: ipAddress || req.ip || '127.0.0.1',
  });

  await log.populate('organization', 'name type');

  res.status(201).json({
    success: true,
    message: 'Audit log created and user account activated successfully. User can now log in.',
    data: log,
  });
};

// @desc    Update audit log & sync user credentials
// @route   PUT /api/audit-logs/:id
// @access  Private (Admin)
const updateAuditLog = async (req, res) => {
  const { id } = req.params;
  const log = await AuditLog.findById(id);

  if (!log) {
    return res.status(404).json({ success: false, message: 'Audit log not found' });
  }

  const { userName, userEmail, userRole, password, action, entity, organization, status } = req.body;

  if (password && password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
  }

  const oldEmail = log.userEmail?.toLowerCase()?.trim();
  const newEmail = userEmail ? String(userEmail).toLowerCase().trim() : oldEmail;

  if (userName !== undefined) log.userName = userName.trim();
  if (userEmail !== undefined) log.userEmail = newEmail;
  if (userRole !== undefined) log.userRole = userRole;
  if (password !== undefined) log.password = password;
  if (action !== undefined) log.action = action;
  if (entity !== undefined) log.entity = entity;
  if (status !== undefined) log.status = status;
  const effectiveRole = userRole !== undefined ? userRole : log.userRole;
  const isSuperAdmin = effectiveRole === 'Super Admin';

  if (isSuperAdmin) {
    log.organization = null;
    log.organizationName = '';
  } else if (organization !== undefined) {
    log.organization = organization || null;
    if (organization) {
      const orgDoc = await Organization.findById(organization);
      if (orgDoc) log.organizationName = orgDoc.name;
    } else {
      log.organizationName = '';
    }
  }

  // Sync updates with User model
  let targetUser = null;
  if (log.user) {
    targetUser = await User.findById(log.user).select('+password');
  }
  if (!targetUser && oldEmail) {
    targetUser = await User.findOne({ email: oldEmail }).select('+password');
  }
  if (!targetUser && newEmail) {
    targetUser = await User.findOne({ email: newEmail }).select('+password');
  }

  if (targetUser) {
    if (userName) targetUser.name = userName.trim();
    if (newEmail) targetUser.email = newEmail;
    if (userRole) targetUser.role = userRole;
    if (isSuperAdmin) {
      targetUser.organization = null;
    } else if (organization !== undefined) {
      targetUser.organization = organization || null;
    }
    if (password) targetUser.password = password; // triggers pre('save') hash
    targetUser.isActive = true;
    await targetUser.save();
    log.user = targetUser._id;
  } else if (newEmail) {
    targetUser = await User.create({
      name: (userName && userName.trim()) || log.userName || newEmail.split('@')[0],
      email: newEmail,
      password: password || log.password || 'Admin@123456',
      role: userRole || log.userRole || 'Project/Department User',
      organization: isSuperAdmin ? null : (organization || log.organization || null),
      isActive: true,
    });
    log.user = targetUser._id;
  }

  await log.save();
  await log.populate('organization', 'name type');

  res.status(200).json({
    success: true,
    message: 'Audit log updated and user credentials synced successfully',
    data: log,
  });
};

// @desc    Delete audit log & clean up user account if needed
// @route   DELETE /api/audit-logs/:id
// @access  Private (Admin)
const deleteAuditLog = async (req, res) => {
  const { id } = req.params;
  const log = await AuditLog.findById(id);

  if (!log) {
    return res.status(404).json({ success: false, message: 'Audit log not found' });
  }

  const targetEmail = log.userEmail?.toLowerCase()?.trim();
  // If not super admin default account, remove from User collection if no other audit log references it
  if (targetEmail && targetEmail !== 'admin@esg360.com') {
    const otherLogs = await AuditLog.countDocuments({
      _id: { $ne: log._id },
      userEmail: { $regex: new RegExp(`^${targetEmail}$`, 'i') },
    });
    if (otherLogs === 0) {
      await User.deleteOne({ email: targetEmail });
    }
  }

  await log.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Audit log deleted successfully',
  });
};

module.exports = { getAuditLogs, createAuditLogRecord, updateAuditLog, deleteAuditLog };

