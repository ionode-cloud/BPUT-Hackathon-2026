const express = require('express');
const router = express.Router();
const {
  getSummary,
  getNodeStatus,
  getAirQualitySummary,
  getDailyReport,
  getWeeklyReport,
} = require('../controllers/dashboardController');

router.get('/summary', getSummary);
router.get('/node-status', getNodeStatus);
router.get('/air-quality-summary', getAirQualitySummary);
router.get('/reports/daily', getDailyReport);
router.get('/reports/weekly', getWeeklyReport);

module.exports = router;
