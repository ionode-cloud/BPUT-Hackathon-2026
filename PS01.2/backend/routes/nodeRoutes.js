const express = require('express');
const router = express.Router();
const {
  getAllNodes,
  getMasterNode,
  getLatestNodeReading,
  getNodeById,
  sendNodeSensorData,
  createNode,
  updateNodeById,
  setMasterNode,
  deleteNode,
  getNodeReadings,
  deleteNodeReading,
  updateNodeReading,
} = require('../controllers/nodeController');

// ── Global Node Collections ──────────────────────────────────
router.get('/', getAllNodes);
router.post('/', createNode);
router.put('/', updateNodeById);
router.get('/master', getMasterNode);
router.get('/latest', getLatestNodeReading);

// ── Node by ID Operations ────────────────────────────────────
router.get('/:nodeId', getNodeById);
// POST /api/nodes/:nodeId — Primary endpoint to send sensor telemetry from Postman!
router.post('/:nodeId', sendNodeSensorData);
// PUT /api/nodes/:nodeId — Update sensor data and/or node metadata!
router.put('/:nodeId', updateNodeById);
router.delete('/:nodeId', deleteNode);
router.put('/:nodeId/master', setMasterNode);

// ── Node Telemetry History Sub-resources ─────────────────────
router.get('/:nodeId/readings', getNodeReadings);
router.put('/:nodeId/readings/:readingId', updateNodeReading);
router.delete('/:nodeId/readings/:readingId', deleteNodeReading);

module.exports = router;
