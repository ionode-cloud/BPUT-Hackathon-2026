const express = require('express');
const router = express.Router();
const {
  getAuditLogs,
  createAuditLogRecord,
  updateAuditLog,
  deleteAuditLog,
} = require('../controllers/auditLogController');
const { protect, superAdminOnly } = require('../middleware/auth');

// Audit logs can ONLY be seen and modified by Super Admin
router.get('/', protect, superAdminOnly, getAuditLogs);
router.post('/', protect, superAdminOnly, createAuditLogRecord);
router.put('/:id', protect, superAdminOnly, updateAuditLog);
router.delete('/:id', protect, superAdminOnly, deleteAuditLog);

module.exports = router;
