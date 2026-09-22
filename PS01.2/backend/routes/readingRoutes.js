const express = require('express');
const router = express.Router();
const {
  getReadings,
  getLatestReadings,
  getReadingsByNode,
  getReadingsBySensor,
  getHistory,
  createReading,
  updateReading,
  deleteReading,
} = require('../controllers/readingController');

router.get('/', getReadings);
router.get('/latest', getLatestReadings);
router.get('/history', getHistory);
router.get('/node/:nodeId', getReadingsByNode);
router.get('/sensor/:sensorType', getReadingsBySensor);
router.post('/', createReading);
router.put('/:id', updateReading);
router.delete('/:id', deleteReading);

module.exports = router;
