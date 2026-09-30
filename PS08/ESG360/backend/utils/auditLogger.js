const AuditLog = require('../models/AuditLog');

/**
 * Create an audit log entry
 * @param {Object} params
 */
const createAuditLog = async ({
  user,
  action,
  entity,
  entityId,
  organization,
  description,
  metadata,
  ipAddress,
  userAgent,
  status = 'Success',
  errorMessage,
}) => {
  try {
    await AuditLog.create({
      user: user?._id || user,
      userName: user?.name,
      userEmail: user?.email,
      userRole: user?.role,
      action,
      entity,
      entityId,
      organization: organization?._id || organization,
      organizationName: organization?.name,
      description,
      metadata,
      ipAddress,
      userAgent,
      status,
      errorMessage,
    });
  } catch (err) {
    console.error('Audit log error:', err.message);
    // Do not throw — audit log failure should not break application flow
  }
};

module.exports = { createAuditLog };
