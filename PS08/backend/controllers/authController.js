const User = require('../models/User');
const Organization = require('../models/Organization');
const AuditLog = require('../models/AuditLog');
const { generateToken } = require('../utils/helpers');
const { createAuditLog } = require('../utils/auditLogger');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  const { name, email, password, organization, phone, department } = req.body;

  // Check for existing user
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }

  // New users always get the default role — admins assign roles separately
  const user = await User.create({
    name,
    email,
    password,
    organization,
    phone,
    department,
    role: 'Project/Department User',
  });

  const token = generateToken(user._id);

  await createAuditLog({
    user,
    action: 'REGISTER',
    entity: 'User',
    entityId: user._id,
    description: `New user registered: ${email}`,
    status: 'Success',
  });

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: { user, token },
  });
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const rawInput = String(email).trim();
  const lowerInput = rawInput.toLowerCase();

  // Support lookup by exact email, case-insensitive email, name, or role alias
  const queryConditions = [
    { email: lowerInput },
    { email: rawInput },
    { name: new RegExp(`^${rawInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  ];

  // If user typed shorthand ID: 'admin', 'superadmin', 'super admin', 'super_admin'
  if (['admin', 'superadmin', 'super admin', 'super_admin'].includes(lowerInput)) {
    queryConditions.push({ role: 'Super Admin' });
  }

  let user = await User.findOne({ $or: queryConditions }).select('+password').populate('organization');

  // Fallback: Check AuditLog collection if user document is missing
  if (!user) {
    const auditQuery = [
      { userEmail: lowerInput },
      { userEmail: rawInput },
      { userName: new RegExp(`^${rawInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    ];
    const auditEntry = await AuditLog.findOne({
      $or: auditQuery,
      password: { $exists: true, $ne: '' },
    }).sort({ createdAt: -1 });

    if (auditEntry) {
      const newEmail = (auditEntry.userEmail || rawInput).toLowerCase().trim();
      const existingUser = await User.findOne({ email: newEmail }).select('+password').populate('organization');
      if (existingUser) {
        user = existingUser;
      } else {
        const createdUser = await User.create({
          name: auditEntry.userName || newEmail.split('@')[0],
          email: newEmail,
          password: auditEntry.password || password,
          role: auditEntry.userRole || 'Project/Department User',
          organization: auditEntry.organization || null,
          isActive: true,
        });
        user = await User.findById(createdUser._id).select('+password').populate('organization');
        auditEntry.user = user._id;
        await auditEntry.save();
      }
    }
  }

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  if (!user.isActive) {
    return res.status(401).json({ success: false, message: 'Account is deactivated. Contact administrator.' });
  }

  let isMatch = await user.matchPassword(password);
  if (!isMatch) {
    // Check if an updated password exists in AuditLog
    const auditEntry = await AuditLog.findOne({
      $or: [
        { user: user._id },
        { userEmail: user.email },
        { userEmail: lowerInput },
      ],
      password: { $exists: true, $ne: '' },
    }).sort({ createdAt: -1 });

    if (auditEntry && auditEntry.password === password) {
      user.password = password;
      await user.save();
      isMatch = true;
    }
  }

  if (!isMatch) {
    await createAuditLog({
      user,
      action: 'LOGIN',
      entity: 'User',
      entityId: user._id,
      description: `Failed login attempt for ${rawInput}`,
      status: 'Failure',
      errorMessage: 'Invalid password',
    });
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  const token = generateToken(user._id);

  await createAuditLog({
    user,
    action: 'LOGIN',
    entity: 'User',
    entityId: user._id,
    organization: user.organization,
    description: `User logged in: ${user.email}`,
    status: 'Success',
  });

  // Don't return password
  const userObj = user.toJSON();

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: { user: userObj, token },
  });
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  const user = await User.findById(req.user._id).populate('organization');
  res.status(200).json({ success: true, data: user });
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  const { name, phone, department } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, phone, department },
    { new: true, runValidators: true }
  ).populate('organization');

  await createAuditLog({
    user: req.user,
    action: 'USER_UPDATE',
    entity: 'User',
    entityId: user._id,
    description: 'User updated their profile',
  });

  res.status(200).json({ success: true, message: 'Profile updated', data: user });
};

// @desc    Get all users (Admin)
// @route   GET /api/auth/users
// @access  Private (Admin)
const getUsers = async (req, res) => {
  const { page = 1, limit = 20, role, organization, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = {};
  if (role) filter.role = role;
  if (organization) filter.organization = organization;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  // Non-super-admins can only see users in their org scope
  if (req.user.role !== 'Super Admin') {
    filter.organization = req.user.organization?._id;
  }

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .populate('organization', 'name type')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: users,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
  });
};

// @desc    Update user role/organization (Admin)
// @route   PUT /api/auth/users/:id
// @access  Private (Admin)
const updateUser = async (req, res) => {
  const { role, organization, isActive } = req.body;

  // Super Admin can update any user; others can only update within their org
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (req.user.role !== 'Super Admin') {
    // Only manage users in their org
    if (String(user.organization) !== String(req.user.organization?._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this user' });
    }
    // Cannot self-assign Super Admin
    if (role === 'Super Admin') {
      return res.status(403).json({ success: false, message: 'Cannot assign Super Admin role' });
    }
  }

  const updates = {};
  if (role) updates.role = role;
  if (organization !== undefined) updates.organization = organization;
  if (isActive !== undefined) updates.isActive = isActive;

  const updated = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).populate('organization');

  await createAuditLog({
    user: req.user,
    action: 'USER_UPDATE',
    entity: 'User',
    entityId: updated._id,
    organization: req.user.organization,
    description: `Admin updated user ${updated.email}: role=${role}, isActive=${isActive}`,
  });

  res.status(200).json({ success: true, message: 'User updated', data: updated });
};

// @desc    Change user password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Verify current password if provided
  if (currentPassword) {
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
  }

  user.password = newPassword;
  await user.save();

  await createAuditLog({
    user,
    action: 'USER_UPDATE',
    entity: 'User',
    entityId: user._id,
    description: `Password updated for user: ${user.email}`,
    status: 'Success',
  });

  res.status(200).json({ success: true, message: 'Password updated successfully' });
};

module.exports = { register, login, getProfile, updateProfile, getUsers, updateUser, changePassword };
