const cloudinary = require('../config/cloudinary');
const Document = require('../models/Document');
const ESGData = require('../models/ESGData');
const { getAccessibleOrgIds } = require('./organizationController');
const { createAuditLog } = require('../utils/auditLogger');
const streamifier = require('streamifier');

// Helper to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// @desc    Upload document
// @route   POST /api/documents/upload
// @access  Private
const uploadDocument = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file provided' });
  }

  const { category, description, relatedESGRecord, organization, reportingYear, reportingQuarter, tags } = req.body;

  // Check org access
  if (organization) {
    const accessibleIds = await getAccessibleOrgIds(req.user);
    if (!accessibleIds.some((id) => id.toString() === organization)) {
      return res.status(403).json({ success: false, message: 'Not authorized for this organization' });
    }
  }

  let cloudinaryResult;
  try {
    cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
      folder: `esg360/${organization || 'general'}`,
      resource_type: 'auto',
      public_id: `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`,
    });
  } catch (uploadError) {
    console.warn('Cloudinary upload warning (falling back to secure local storage):', uploadError.message || uploadError);
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const safeName = `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(uploadsDir, safeName);
    fs.writeFileSync(filePath, req.file.buffer);

    cloudinaryResult = {
      secure_url: `${req.protocol}://${req.get('host')}/uploads/${safeName}`,
      public_id: `local/${safeName}`,
    };
  }

  const isSuperAdmin = req.user.role === 'Super Admin';
  const doc = await Document.create({
    originalName: req.file.originalname,
    cloudinaryUrl: cloudinaryResult.secure_url,
    cloudinaryPublicId: cloudinaryResult.public_id,
    fileType: req.file.mimetype,
    fileSize: req.file.size,
    category: category || 'ESG Evidence',
    description,
    relatedESGRecord,
    organization: organization || (req.user.organization?._id || req.user.organization),
    uploadedBy: req.user._id,
    reportingPeriod: { year: reportingYear, quarter: reportingQuarter },
    status: 'Submitted',
    tags: (() => {
      if (!tags) return [];
      try {
        const parsed = typeof tags === 'string' ? JSON.parse(tags) : tags;
        return Array.isArray(parsed) ? parsed : [String(parsed)];
      } catch {
        return typeof tags === 'string' ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
      }
    })(),
  });

  // If linked to an ESG record, add evidence reference
  if (relatedESGRecord) {
    await ESGData.findByIdAndUpdate(relatedESGRecord, {
      $push: {
        evidence: {
          document: doc._id,
          fileName: doc.originalName,
          url: doc.cloudinaryUrl,
        },
      },
    });
  }

  await createAuditLog({
    user: req.user,
    action: 'DOCUMENT_UPLOAD',
    entity: 'Document',
    entityId: doc._id,
    organization: req.user.organization,
    description: `Uploaded document: ${doc.originalName}`,
  });

  res.status(201).json({ success: true, message: 'Document uploaded', data: doc });
};

// @desc    Get documents
// @route   GET /api/documents
// @access  Private
const getDocuments = async (req, res) => {
  const { page = 1, limit = 20, category, organization, relatedESGRecord, year, status, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const accessibleIds = await getAccessibleOrgIds(req.user);
  const isSuperOrGroupAdmin = ['Super Admin', 'Group ESG Admin'].includes(req.user.role);
  const filter = { isActive: true };

  if (!isSuperOrGroupAdmin) {
    filter.organization = { $in: accessibleIds };
  }
  if (organization) {
    filter.organization = organization;
  }
  if (category) filter.category = category;
  if (relatedESGRecord) filter.relatedESGRecord = relatedESGRecord;
  if (year) filter['reportingPeriod.year'] = year;
  if (status === 'pending' || status === 'Pending Review') {
    filter.status = { $in: ['Submitted', 'Under Review'] };
  } else if (status && status !== 'All') {
    filter.status = status;
  }
  if (search) {
    filter.$or = [
      { originalName: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await Document.countDocuments(filter);
  const documents = await Document.find(filter)
    .populate('uploadedBy', 'name email role')
    .populate('approvedBy', 'name email role')
    .populate('reviewedBy', 'name email role')
    .populate('organization', 'name type')
    .populate('relatedESGRecord', 'metric category status')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: documents,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
  });
};

// @desc    Get single document
// @route   GET /api/documents/:id
// @access  Private
const getDocument = async (req, res) => {
  const doc = await Document.findById(req.params.id)
    .populate('uploadedBy', 'name email')
    .populate('organization', 'name type')
    .populate('relatedESGRecord', 'metric category status organization');

  if (!doc || !doc.isActive) return res.status(404).json({ success: false, message: 'Document not found' });

  const accessibleIds = await getAccessibleOrgIds(req.user);
  if (doc.organization && !accessibleIds.some((id) => id.toString() === doc.organization._id.toString())) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  res.status(200).json({ success: true, data: doc });
};

// @desc    Delete document (soft delete)
// @route   DELETE /api/documents/:id
// @access  Private
const deleteDocument = async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc || !doc.isActive) return res.status(404).json({ success: false, message: 'Document not found' });

  const accessibleIds = await getAccessibleOrgIds(req.user);
  if (doc.organization && !accessibleIds.some((id) => id.toString() === doc.organization.toString())) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  // Only owner or admin can delete
  const isOwner = doc.uploadedBy.toString() === req.user._id.toString();
  const isAdmin = ['Super Admin', 'Group ESG Admin', 'ESG Manager'].includes(req.user.role);
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ success: false, message: 'Not authorized to delete this document' });
  }

  // Try to delete from Cloudinary or local fallback
  try {
    if (doc.cloudinaryPublicId && !doc.cloudinaryPublicId.startsWith('local/')) {
      await cloudinary.uploader.destroy(doc.cloudinaryPublicId);
    } else if (doc.cloudinaryPublicId && doc.cloudinaryPublicId.startsWith('local/')) {
      const fs = require('fs');
      const path = require('path');
      const localFile = path.join(__dirname, '..', 'uploads', doc.cloudinaryPublicId.replace('local/', ''));
      if (fs.existsSync(localFile)) fs.unlinkSync(localFile);
    }
  } catch (err) {
    console.error('Document delete error:', err.message);
  }

  doc.isActive = false;
  await doc.save();

  // Remove from ESG record evidence
  if (doc.relatedESGRecord) {
    await ESGData.findByIdAndUpdate(doc.relatedESGRecord, {
      $pull: { evidence: { document: doc._id } },
    });
  }

  await createAuditLog({
    user: req.user,
    action: 'DOCUMENT_DELETE',
    entity: 'Document',
    entityId: doc._id,
    organization: req.user.organization,
    description: `Deleted document: ${doc.originalName}`,
  });

  res.status(200).json({ success: true, message: 'Document deleted' });
};

// @desc    Review document (approve, correction, validate, under_review)
// @route   PUT /api/documents/:id/review
// @access  Private (Reviewer/Admin)
const reviewDocument = async (req, res) => {
  const { action, comment } = req.body;
  const doc = await Document.findById(req.params.id);
  if (!doc || !doc.isActive) return res.status(404).json({ success: false, message: 'Document not found' });

  let newStatus;
  if (action === 'approve') {
    if (req.user.role !== 'Super Admin') {
      return res.status(403).json({
        success: false,
        message: 'Only Super Admin has authority to grant final approval for uploaded documents',
      });
    }
    newStatus = 'Approved';
    doc.approvedBy = req.user._id;
    doc.approvedAt = new Date();
  } else if (action === 'correction') {
    newStatus = 'Correction Required';
    doc.correctionComment = comment || 'Correction required by administrator';
  } else if (action === 'validate') {
    newStatus = 'Validated';
    doc.reviewedBy = req.user._id;
    doc.reviewedAt = new Date();
  } else if (action === 'under_review') {
    newStatus = 'Under Review';
    doc.reviewedBy = req.user._id;
    doc.reviewedAt = new Date();
  } else {
    return res.status(400).json({ success: false, message: 'Invalid action. Use: approve, correction, validate, under_review' });
  }

  doc.status = newStatus;
  if (comment) doc.reviewComment = comment;
  await doc.save();

  await createAuditLog({
    user: req.user,
    action: action === 'approve' ? 'APPROVE' : action === 'correction' ? 'CORRECTION_REQUEST' : 'VALIDATE',
    entity: 'Document',
    entityId: doc._id,
    organization: doc.organization,
    description: `${action.toUpperCase()} on document: ${doc.originalName}. Status: ${newStatus}`,
    metadata: { comment },
  });

  res.status(200).json({ success: true, message: `Document status updated to ${newStatus}`, data: doc });
};

module.exports = { uploadDocument, getDocuments, getDocument, deleteDocument, reviewDocument };
