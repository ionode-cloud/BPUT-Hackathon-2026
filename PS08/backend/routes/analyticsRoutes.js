const express = require('express');
const router = express.Router();
const { getAnalytics, getConsolidation } = require('../controllers/analyticsController');
const { protect, managementAccess } = require('../middleware/auth');

router.get('/', protect, getAnalytics);
router.get('/consolidation', protect, managementAccess, getConsolidation);

module.exports = router;
