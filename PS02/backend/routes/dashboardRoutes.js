import express from 'express';
import {
  getDashboardSummary,
  getHeatStress,
  getPrediction,
} from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/summary', getDashboardSummary);
router.get('/heat-stress', getHeatStress);
router.get('/prediction', getPrediction);

export default router;
