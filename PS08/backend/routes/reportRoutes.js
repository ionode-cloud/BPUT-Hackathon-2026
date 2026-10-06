const express = require('express');
const router = express.Router();
const { getReports, generateReport, reviewBRSRReport } = require('../controllers/brrsController');
const { protect, reviewerOnly, managementAccess, superAdminOnly } = require('../middleware/auth');

router.get('/', protect, getReports);
router.post('/generate', protect, managementAccess, generateReport);
router.put('/:id/review', protect, superAdminOnly, reviewBRSRReport);

module.exports = router;
