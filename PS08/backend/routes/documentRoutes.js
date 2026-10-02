const express = require('express');
const router = express.Router();
const { uploadDocument, getDocuments, getDocument, deleteDocument, reviewDocument } = require('../controllers/documentController');
const { protect, reviewerOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/upload', protect, upload.single('file'), uploadDocument);
router.get('/', protect, getDocuments);
router.get('/:id', protect, getDocument);
router.put('/:id/review', protect, reviewerOnly, reviewDocument);
router.delete('/:id', protect, deleteDocument);

module.exports = router;
