import express from 'express';
import {
  getReadings,
  getLatestReadings,
  getReadingsByNode,
  createReading,
  deleteAllReadings,
  deleteReadingById,
} from '../controllers/readingController.js';

const router = express.Router();

router.route('/')
  .get(getReadings)
  .post(createReading)
  .delete(deleteAllReadings);

router.route('/latest').get(getLatestReadings);
router.route('/node/:nodeId').get(getReadingsByNode);
router.route('/:id').delete(deleteReadingById);

export default router;

