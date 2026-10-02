const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).populate('organization');
    if (!req.user || !req.user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
  }
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`,
      });
    }
    next();
  };
};

// Super Admin only
const superAdminOnly = authorize('Super Admin');

// Admin-level roles
const adminOnly = authorize('Super Admin', 'Group ESG Admin', 'Subsidiary Admin');

// Review and approval roles
const reviewerOnly = authorize(
  'Super Admin',
  'Group ESG Admin',
  'Subsidiary Admin',
  'Management',
  'Business Unit Manager',
  'ESG Manager',
  'Compliance Officer',
  'Auditor/Reviewer'
);

// Management-level access
const managementAccess = authorize(
  'Super Admin',
  'Group ESG Admin',
  'Subsidiary Admin',
  'Business Unit Manager',
  'ESG Manager',
  'Compliance Officer',
  'Management',
  'Auditor/Reviewer'
);

module.exports = { protect, authorize, superAdminOnly, adminOnly, reviewerOnly, managementAccess };
