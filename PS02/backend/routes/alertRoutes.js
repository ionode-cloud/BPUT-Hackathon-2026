import express from 'express';
import {
  getAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
  acknowledgeAllAlerts,
} from '../controllers/alertController.js';

const router = express.Router();

router.route('/').get(getAlerts).post(createAlert);
router.route('/acknowledge-all').put(acknowledgeAllAlerts);
router.route('/:id').put(updateAlert).delete(deleteAlert);

export default router;
