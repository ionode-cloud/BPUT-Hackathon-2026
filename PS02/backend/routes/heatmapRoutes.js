import express from 'express';
import { getHeatmapData } from '../controllers/heatmapController.js';

const router = express.Router();

router.get('/', getHeatmapData);

export default router;
