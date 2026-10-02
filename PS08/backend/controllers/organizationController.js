const Organization = require('../models/Organization');
const User = require('../models/User');
const { createAuditLog } = require('../utils/auditLogger');

// Helper to get org IDs a user has access to
const getAccessibleOrgIds = async (user) => {
  // Super Admin and Group ESG Admin can see every organization data
  if (user.role === 'Super Admin' || user.role === 'Group ESG Admin') {
    const all = await Organization.find({}, '_id');
    return all.map((o) => o._id);
  }
  if (!user.organization) return [];

  // All other roles ONLY see their own registered / assigned organization data
  const orgId = user.organization._id || user.organization;
  return [orgId];
};

// @desc    Get all organizations (with hierarchy)
// @route   GET /api/organizations
// @access  Private
const getOrganizations = async (req, res) => {
  const { page = 1, limit = 50, type, parent, status, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const accessibleIds = await getAccessibleOrgIds(req.user);
  const filter = { _id: { $in: accessibleIds } };

  if (type) filter.type = type;
  if (parent === 'null') filter.parent = null;
  else if (parent) filter.parent = parent;
  if (status) filter.status = status;
  if (search) filter.name = { $regex: search, $options: 'i' };

  const total = await Organization.countDocuments(filter);
  const organizations = await Organization.find(filter)
    .populate('parent', 'name type')
    .populate('adminUser', 'name email')
    .populate('approvedBy', 'name email role')
    .populate('verifiedBy', 'name email role')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ type: 1, name: 1 });

  res.status(200).json({
    success: true,
    data: organizations,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
  });
};

// @desc    Get organization hierarchy tree
// @route   GET /api/organizations/tree
// @access  Private
const getOrganizationTree = async (req, res) => {
  const accessibleIds = await getAccessibleOrgIds(req.user);
  const orgs = await Organization.find({ _id: { $in: accessibleIds } })
    .populate('parent', 'name type')
    .populate('approvedBy', 'name email role')
    .populate('verifiedBy', 'name email role')
    .sort({ type: 1, name: 1 });

  // Build tree structure
  const buildTree = (items, parentId = null) => {
    return items
      .filter((item) => {
        const itemParent = item.parent ? item.parent._id.toString() : null;
        return itemParent === (parentId ? parentId.toString() : null);
      })
      .map((item) => ({
        ...item.toObject(),
        children: buildTree(items, item._id),
      }));
  };

  const tree = buildTree(orgs);
  res.status(200).json({ success: true, data: tree });
};

// @desc    Get single organization
// @route   GET /api/organizations/:id
// @access  Private
const getOrganization = async (req, res) => {
  const org = await Organization.findById(req.params.id)
    .populate('parent', 'name type')
    .populate('adminUser', 'name email role')
    .populate('approvedBy', 'name email role')
    .populate('verifiedBy', 'name email role');

  if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

  // Check access
  const accessibleIds = await getAccessibleOrgIds(req.user);
  if (!accessibleIds.some((id) => id.toString() === req.params.id)) {
    return res.status(403).json({ success: false, message: 'Not authorized to view this organization' });
  }

  // Get users in this org
  const users = await User.find({ organization: req.params.id }, 'name email role isActive');
  // Get children
  const children = await Organization.find({ parent: req.params.id }, 'name type status');

  res.status(200).json({ success: true, data: { ...org.toObject(), users, children } });
};

// @desc    Create organization
// @route   POST /api/organizations
// @access  Private (Admin)
const createOrganization = async (req, res) => {
  const { name, type, parent, location, cin, gstin, industry, description, adminUser, reportingYear } = req.body;

  // Validate parent exists and type hierarchy
  if (parent) {
    const parentOrg = await Organization.findById(parent);
    if (!parentOrg) return res.status(400).json({ success: false, message: 'Parent organization not found' });

    const typeHierarchy = { Group: 0, Subsidiary: 1, 'Business Unit': 2, Project: 3 };
    if (typeHierarchy[parentOrg.type] >= typeHierarchy[type]) {
      return res.status(400).json({
        success: false,
        message: `A ${type} must be a child of a higher-level organization`,
      });
    }
  } else if (type !== 'Group') {
    return res.status(400).json({ success: false, message: 'Only Group-type organizations can be root nodes' });
  }

  const org = await Organization.create({
    name, type, parent, location, cin, gstin, industry, description, adminUser, reportingYear,
    status: req.body.status || 'Submitted',
    verificationStatus: req.body.verificationStatus || 'Pending Verification',
  });

  await createAuditLog({
    user: req.user,
    action: 'ORG_CREATE',
    entity: 'Organization',
    entityId: org._id,
    organization: org,
    description: `Created ${type} organization: ${name}`,
  });

  res.status(201).json({ success: true, message: 'Organization created', data: org });
};

// @desc    Update organization
// @route   PUT /api/organizations/:id
// @access  Private (Admin)
const updateOrganization = async (req, res) => {
  const org = await Organization.findById(req.params.id);
  if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

  const accessibleIds = await getAccessibleOrgIds(req.user);
  if (!accessibleIds.some((id) => id.toString() === req.params.id)) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  const allowedFields = [
    'name', 'location', 'cin', 'gstin', 'industry', 'description',
    'status', 'verificationStatus', 'adminUser', 'reportingYear',
    'approvalComment', 'verificationComment'
  ];
  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const updated = await Organization.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
    .populate('parent', 'name type')
    .populate('adminUser', 'name email')
    .populate('approvedBy', 'name email role')
    .populate('verifiedBy', 'name email role');

  await createAuditLog({
    user: req.user,
    action: 'ORG_UPDATE',
    entity: 'Organization',
    entityId: updated._id,
    organization: updated,
    description: `Updated organization: ${updated.name}`,
    metadata: updates,
  });

  res.status(200).json({ success: true, message: 'Organization updated', data: updated });
};

// @desc    Delete organization
// @route   DELETE /api/organizations/:id
// @access  Private (Admin)
const deleteOrganization = async (req, res) => {
  const org = await Organization.findById(req.params.id);
  if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

  const childrenCount = await Organization.countDocuments({ parent: req.params.id });
  if (childrenCount > 0) {
    return res.status(400).json({ success: false, message: 'Cannot delete organization that has child units or projects' });
  }

  const usersCount = await User.countDocuments({ organization: req.params.id });
  if (usersCount > 0) {
    return res.status(400).json({ success: false, message: `Cannot delete organization with ${usersCount} assigned user(s). Reassign them first.` });
  }

  const ESGData = require('../models/ESGData');
  const esgCount = await ESGData.countDocuments({ organization: req.params.id });
  if (esgCount > 0) {
    return res.status(400).json({ success: false, message: `Cannot delete organization with ${esgCount} associated ESG record(s). Reassign them first.` });
  }

  await org.deleteOne();

  await createAuditLog({
    user: req.user,
    action: 'DELETE',
    entity: 'Organization',
    entityId: req.params.id,
    organization: req.user.organization,
    description: `Deleted organization: ${org.name}`,
  });

  res.status(200).json({ success: true, message: 'Organization deleted successfully' });
};

// @desc    Approve or reject organization submission
// @route   PUT /api/organizations/:id/approve
// @access  Private (Admin)
const approveOrganization = async (req, res) => {
  const { action = 'approve', comment = '' } = req.body;
  const org = await Organization.findById(req.params.id);
  if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

  if (action === 'approve') {
    org.status = 'Approved';
    org.approvedBy = req.user._id;
    org.approvedAt = new Date();
  } else {
    org.status = 'Rejected';
    org.approvedBy = req.user._id;
    org.approvedAt = new Date();
  }
  if (comment) org.approvalComment = comment;
  await org.save();

  await createAuditLog({
    user: req.user,
    action: action === 'approve' ? 'ORG_APPROVE' : 'ORG_REJECT',
    entity: 'Organization',
    entityId: org._id,
    organization: org,
    description: `${action === 'approve' ? 'Approved' : 'Rejected'} organization: ${org.name}${comment ? ` (${comment})` : ''}`,
  });

  const populated = await Organization.findById(org._id)
    .populate('parent', 'name type')
    .populate('adminUser', 'name email')
    .populate('approvedBy', 'name email role')
    .populate('verifiedBy', 'name email role');

  res.status(200).json({
    success: true,
    message: `Organization ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    data: populated,
  });
};

// @desc    Verify or reject organization credentials
// @route   PUT /api/organizations/:id/verify
// @access  Private (Admin)
const verifyOrganization = async (req, res) => {
  const { action = 'verify', comment = '' } = req.body;
  const org = await Organization.findById(req.params.id);
  if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

  if (action === 'verify') {
    org.verificationStatus = 'Verified';
    org.verifiedBy = req.user._id;
    org.verifiedAt = new Date();
  } else {
    org.verificationStatus = 'Rejected';
    org.verifiedBy = req.user._id;
    org.verifiedAt = new Date();
  }
  if (comment) org.verificationComment = comment;
  await org.save();

  await createAuditLog({
    user: req.user,
    action: action === 'verify' ? 'ORG_VERIFY' : 'ORG_VERIFY_REJECT',
    entity: 'Organization',
    entityId: org._id,
    organization: org,
    description: `${action === 'verify' ? 'Verified credentials for' : 'Rejected verification for'} organization: ${org.name}${comment ? ` (${comment})` : ''}`,
  });

  const populated = await Organization.findById(org._id)
    .populate('parent', 'name type')
    .populate('adminUser', 'name email')
    .populate('approvedBy', 'name email role')
    .populate('verifiedBy', 'name email role');

  res.status(200).json({
    success: true,
    message: `Organization ${action === 'verify' ? 'verified' : 'unverified'} successfully`,
    data: populated,
  });
};

module.exports = {
  getOrganizations,
  getOrganizationTree,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  approveOrganization,
  verifyOrganization,
  getAccessibleOrgIds,
};
