const express = require('express');
const router = express.Router();
const {
  getESGRecords,
  getESGRecord,
  createESGRecord,
  updateESGRecord,
  submitESGRecord,
  reviewESGRecord,
  deleteESGRecord,
  runAIValidation,
  getConsolidatedData,
  getESGScore,
  createProject,
  getDashboardStats,
} = require('../controllers/esgController');
const { protect, reviewerOnly } = require('../middleware/auth');

router.get('/dashboard', protect, getDashboardStats);
router.get('/consolidated', protect, getConsolidatedData);
router.get('/score', protect, getESGScore);
router.post('/validate', protect, runAIValidation);
router.post('/projects', protect, createProject);

router.get('/', protect, getESGRecords);
router.post('/', protect, createESGRecord);
router.get('/:id', protect, getESGRecord);
router.put('/:id', protect, updateESGRecord);
router.put('/:id/submit', protect, submitESGRecord);
router.put('/:id/review', protect, reviewerOnly, reviewESGRecord);
router.delete('/:id', protect, deleteESGRecord);

module.exports = router;
