import express from 'express';
import {
  getNodes,
  getNodeById,
  createNode,
  updateNode,
  deleteNode,
  streamNodeEvents,
} from '../controllers/nodeController.js';
import {
  getAlerts,
  updateAlert,
  deleteAlert,
  acknowledgeAllAlerts,
} from '../controllers/alertController.js';

const router = express.Router();

// Real-time Server-Sent Events stream
router.get('/events', streamNodeEvents);

// Alert History endpoints under /api/nodes
router.route('/alerts').get(getAlerts);
router.route('/alerts/acknowledge-all').put(acknowledgeAllAlerts);
router.route('/alerts/:id').put(updateAlert).delete(deleteAlert);

// Node CRUD
router.route('/').get(getNodes).post(createNode);
router.route('/:id').get(getNodeById).put(updateNode).delete(deleteNode);

export default router;
