const express = require('express');
const router = express.Router();
const {
  getOrganizations,
  getOrganizationTree,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} = require('../controllers/organizationController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, getOrganizations);
router.get('/tree', protect, getOrganizationTree);
router.get('/:id', protect, getOrganization);
router.post('/', protect, adminOnly, createOrganization);
router.put('/:id', protect, adminOnly, updateOrganization);
router.delete('/:id', protect, adminOnly, deleteOrganization);

module.exports = router;
