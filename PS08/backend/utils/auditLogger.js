const AuditLog = require('../models/AuditLog');

/**
 * Create or update an audit log entry
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
    const userEmail = user?.email;
    const userId = user?._id || user;

    // For LOGIN actions, update existing record if already present
    // to prevent duplicate credentials piling up in audit logs
    if (action === 'LOGIN' && userEmail) {
      const existing = await AuditLog.findOne({
        $or: [{ user: userId }, { userEmail }],
        action: 'LOGIN',
      });
      if (existing) {
        existing.createdAt = new Date();
        existing.status = status;
        if (ipAddress) existing.ipAddress = ipAddress;
        if (userAgent) existing.userAgent = userAgent;
        if (description) existing.description = description;
        if (errorMessage) existing.errorMessage = errorMessage;
        await existing.save();
        return existing;
      }
    }

    await AuditLog.create({
      user: userId,
      userName: user?.name,
      userEmail: user?.email,
      userRole: user?.role,
      password: 'Admin@123456',
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
