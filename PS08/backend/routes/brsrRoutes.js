const express = require('express');
const router = express.Router();
const { getBRSRReports, getBRSRReport, createBRSRReport, updateBRSRReport, reviewBRSRReport, generateReport } = require('../controllers/brrsController');
const { protect, reviewerOnly, managementAccess, superAdminOnly } = require('../middleware/auth');

router.get('/', protect, getBRSRReports);
router.post('/', protect, managementAccess, createBRSRReport);
router.get('/:id', protect, getBRSRReport);
router.put('/:id', protect, managementAccess, updateBRSRReport);
router.put('/:id/review', protect, superAdminOnly, reviewBRSRReport);

module.exports = router;
