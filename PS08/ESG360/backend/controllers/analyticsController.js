const mongoose = require('mongoose');
const ESGData = require('../models/ESGData');
const Organization = require('../models/Organization');
const { getAccessibleOrgIds } = require('./organizationController');
const { createAuditLog } = require('../utils/auditLogger');

// @desc    Get analytics data
// @route   GET /api/analytics
// @access  Private
const getAnalytics = async (req, res) => {
  const { year, organization, category } = req.query;
  const accessibleIds = await getAccessibleOrgIds(req.user);

  const filter = { organization: { $in: accessibleIds } };
  if (year) filter['reportingPeriod.year'] = year;
  if (organization && accessibleIds.some((id) => id.toString() === organization)) {
    filter.organization = new mongoose.Types.ObjectId(organization);
  }
  if (category) filter.category = category;

  // Category breakdown (approved data only for analytics)
  const approvedFilter = { ...filter, status: 'Approved' };

  const [
    categoryBreakdown,
    statusBreakdown,
    orgBreakdown,
    yearTrend,
    topMetrics,
  ] = await Promise.all([
    // By category
    ESGData.aggregate([
      { $match: filter },
      { $group: { _id: { category: '$category', status: '$status' }, count: { $sum: 1 } } },
      { $sort: { '_id.category': 1 } },
    ]),
    // By status
    ESGData.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    // By organization (top 10)
    ESGData.aggregate([
      { $match: approvedFilter },
      { $group: { _id: '$organization', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'organizations', localField: '_id', foreignField: '_id', as: 'org' } },
      { $unwind: { path: '$org', preserveNullAndEmptyArrays: true } },
      { $project: { orgName: '$org.name', orgType: '$org.type', count: 1 } },
    ]),
    // Year-over-year trend
    ESGData.aggregate([
      { $match: { ...filter, status: 'Approved' } },
      { $group: { _id: { year: '$reportingPeriod.year', category: '$category' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1 } },
    ]),
    // Top metrics by count
    ESGData.aggregate([
      { $match: approvedFilter },
      { $group: { _id: { metric: '$metric', category: '$category' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      categoryBreakdown,
      statusBreakdown,
      orgBreakdown,
      yearTrend,
      topMetrics,
    },
  });
};

// @desc    Get consolidation data
// @route   GET /api/analytics/consolidation
// @access  Private (Admin/ESG Manager)
const getConsolidation = async (req, res) => {
  const { year, targetOrgId } = req.query;

  if (!year || !targetOrgId) {
    return res.status(400).json({ success: false, message: 'year and targetOrgId are required' });
  }

  const accessibleIds = await getAccessibleOrgIds(req.user);
  if (!accessibleIds.some((id) => id.toString() === targetOrgId)) {
    return res.status(403).json({ success: false, message: 'Not authorized for this organization' });
  }

  // Get all orgs under target org
  const allOrgIds = [targetOrgId];
  const findChildren = async (parentId) => {
    const children = await Organization.find({ parent: parentId }, '_id');
    for (const child of children) {
      allOrgIds.push(child._id.toString());
      await findChildren(child._id);
    }
  };
  await findChildren(targetOrgId);

  // Aggregate approved records only
  const consolidatedData = await ESGData.aggregate([
    {
      $match: {
        organization: { $in: allOrgIds.map((id) => require('mongoose').Types.ObjectId.createFromHexString(id)) },
        'reportingPeriod.year': year,
        status: 'Approved',
      },
    },
    {
      $group: {
        _id: { category: '$category', metric: '$metric', unit: '$unit' },
        totalValue: { $sum: { $toDouble: { $ifNull: ['$value', 0] } } },
        count: { $sum: 1 },
        organizations: { $addToSet: '$organization' },
        aggregationMethod: { $first: '$aggregationMethod' },
      },
    },
    { $sort: { '_id.category': 1, '_id.metric': 1 } },
  ]);

  await createAuditLog({
    user: req.user,
    action: 'CONSOLIDATE',
    entity: 'ESGData',
    organization: req.user.organization,
    description: `Consolidated ESG data for year ${year}, ${allOrgIds.length} organizations`,
    metadata: { year, targetOrgId, orgCount: allOrgIds.length },
  });

  res.status(200).json({
    success: true,
    data: {
      reportingYear: year,
      organizationsIncluded: allOrgIds.length,
      consolidatedData,
    },
  });
};

module.exports = { getAnalytics, getConsolidation };
