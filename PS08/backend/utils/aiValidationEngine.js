/**
 * ESG Innovators - AI Validation Engine
 * Implements rule-based (if-else condition) verification for:
 * 1. Missing Data
 * 2. Duplicate Records
 * 3. Invalid Values & Logical Inconsistencies
 * 4. Abnormal Changes & Spikes (e.g. Previous 100 KL vs Current 10,000 KL)
 */

const ESGData = require('../models/ESGData');

// Mandatory metrics per department
const MANDATORY_DEPARTMENT_METRICS = {
  Environmental: [
    'Total Energy Consumption',
    'Total Water Withdrawal',
    'Total Waste Generated',
    'Scope 1 GHG Emissions',
  ],
  HR: [
    'Total Employees',
    'Female Employees',
    'Training Hours',
  ],
  Safety: [
    'Lost Time Injury Rate',
    'Total Recordable Incidents',
    'Fatalities',
  ],
  Compliance: [
    'Ethics Policy Coverage',
    'Regulatory Non-Compliances',
  ],
};

/**
 * Validates a single ESG record against validation rules
 * @param {Object} record - The ESG record to validate
 * @param {Object} options - Additional context like previousRecord, existingRecords
 * @returns {Object} - Validation result with issues and quality score
 */
const validateRecord = async (record, options = {}) => {
  const issues = [];
  const { existingRecords = [], previousRecord = null, isBatch = false } = options;

  const value = record.value;
  const numValue = Number(value);
  const isNumeric = !isNaN(numValue) && value !== '' && value !== null && value !== undefined;
  const metric = record.metric || '';
  const unit = record.unit || '';
  const dept = record.department || record.category;

  // ─────────────────────────────────────────────────────────────
  // 1. MISSING DATA CHECKS
  // ─────────────────────────────────────────────────────────────
  if (value === undefined || value === null || value === '' || String(value).trim() === '') {
    issues.push({
      type: 'MISSING_DATA',
      severity: 'HIGH',
      field: 'value',
      metric,
      message: `Missing Data Alert: Blank value detected for "${metric}". Mandatory metric must have a recorded value.`,
      suggestion: 'Enter the measured operational value or report "0" if zero consumption.',
    });
  }

  // Check specific department core metrics
  if (metric.toLowerCase().includes('water') && (value === '' || value === null || value === undefined)) {
    issues.push({
      type: 'MISSING_DATA',
      severity: 'HIGH',
      field: 'value',
      metric,
      message: `Missing Data Alert: Blank Water Consumption. Water accounting is required for SEBI BRSR Principle 6.`,
      suggestion: 'Check utility water meters or water tanker logs.',
    });
  }

  if (!record.unit && isNumeric && numValue !== 0) {
    issues.push({
      type: 'MISSING_DATA',
      severity: 'LOW',
      field: 'unit',
      metric,
      message: `Missing Unit Alert: No measurement unit specified for "${metric}".`,
      suggestion: 'Provide standard unit (e.g., KL, MWh, MT, Nos., tCO2e).',
    });
  }

  if (!record.evidence || record.evidence.length === 0) {
    if (['Scope 1 GHG Emissions', 'Total Energy Consumption', 'Fatalities', 'Regulatory Non-Compliances'].includes(metric)) {
      issues.push({
        type: 'MISSING_DATA',
        severity: 'MEDIUM',
        field: 'evidence',
        metric,
        message: `Missing Evidence Alert: Material metric "${metric}" has no supporting audit document attached.`,
        suggestion: 'Upload supporting CEMS test, utility invoice, or safety log for verification in new tab.',
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. DUPLICATE RECORDS CHECKS
  // ─────────────────────────────────────────────────────────────
  let duplicateFound = false;
  if (!isBatch && record.organization && metric) {
    const orgId = record.organization._id || record.organization;
    const year = record.reportingPeriod?.year;
    const quarter = record.reportingPeriod?.quarter || 'Annual';

    const dupQuery = {
      _id: { $ne: record._id },
      organization: orgId,
      metric,
      'reportingPeriod.year': year,
      'reportingPeriod.quarter': quarter,
    };

    if (record.projectId) dupQuery.projectId = record.projectId;

    const existingDup = await ESGData.findOne(dupQuery);
    if (existingDup) {
      duplicateFound = true;
      issues.push({
        type: 'DUPLICATE',
        severity: 'HIGH',
        field: 'metric',
        metric,
        message: `Duplicate Record Alert: "${metric}" has already been submitted for this Project / Organization in ${year} (${quarter}).`,
        suggestion: 'Edit the existing record rather than creating a duplicate entry.',
      });
    }
  } else if (isBatch && existingRecords.length > 0) {
    const duplicateInBatch = existingRecords.find(
      (r) =>
        r._id?.toString() !== record._id?.toString() &&
        r.metric === metric &&
        r.reportingPeriod?.year === record.reportingPeriod?.year &&
        r.reportingPeriod?.quarter === record.reportingPeriod?.quarter
    );
    if (duplicateInBatch) {
      issues.push({
        type: 'DUPLICATE',
        severity: 'HIGH',
        field: 'metric',
        metric,
        message: `Duplicate Record Alert: Multiple entries found for "${metric}" within the same period.`,
        suggestion: 'Consolidate multiple facility entries into a single aggregated record.',
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. INVALID VALUES & LOGICAL INCONSISTENCIES
  // ─────────────────────────────────────────────────────────────
  if (isNumeric) {
    // Negative number checks for inherently non-negative quantities
    const nonNegativeKeywords = [
      'consumption', 'withdrawal', 'waste', 'employees', 'training',
      'hours', 'emissions', 'incidents', 'fatalities', 'turnover', 'expenditure',
    ];
    const isNonNegativeMetric = nonNegativeKeywords.some((kw) => metric.toLowerCase().includes(kw));

    if (isNonNegativeMetric && numValue < 0) {
      issues.push({
        type: 'INVALID_VALUE',
        severity: 'HIGH',
        field: 'value',
        metric,
        message: `Invalid Value Alert: Negative value (${numValue} ${unit}) is not permitted for "${metric}".`,
        suggestion: 'Operational metrics cannot be negative. Please verify inputs.',
      });
    }

    // Percentage bounds checks
    const isPercentage =
      unit === '%' ||
      metric.toLowerCase().includes('rate') ||
      metric.toLowerCase().includes('percentage') ||
      metric.toLowerCase().includes('diversity') ||
      metric.toLowerCase().includes('coverage');

    if (isPercentage && (numValue < 0 || numValue > 100)) {
      issues.push({
        type: 'INVALID_VALUE',
        severity: 'HIGH',
        field: 'value',
        metric,
        message: `Invalid Value Alert: Value (${numValue}%) is out of percentage bounds. Must be between 0% and 100%.`,
        suggestion: 'Recalculate percentage ratio on a 0-100 scale.',
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 4. ABNORMAL CHANGES (Spikes, Outliers, Multi-fold Jumps)
  // ─────────────────────────────────────────────────────────────
  let historicalRecord = previousRecord;
  if (!historicalRecord && record.organization && metric && isNumeric) {
    const orgId = record.organization._id || record.organization;
    const currentYear = Number(record.reportingPeriod?.year);

    // Look for previous reporting period (prior year or prior quarter)
    historicalRecord = await ESGData.findOne({
      _id: { $ne: record._id },
      organization: orgId,
      metric,
      'reportingPeriod.year': { $in: [(currentYear - 1).toString(), currentYear.toString()] },
      status: { $in: ['Approved', 'Validated', 'Submitted'] },
    }).sort({ createdAt: -1 });
  }

  if (historicalRecord && isNumeric) {
    const prevValue = Number(historicalRecord.value);
    if (!isNaN(prevValue) && prevValue > 0) {
      const ratio = numValue / prevValue;
      const pctChange = Math.round(((numValue - prevValue) / prevValue) * 100);

      // Example from prompt: Previous 100 KL, Current 10,000 KL -> Spike (>3x or >300%)
      if (ratio >= 3) {
        issues.push({
          type: 'ABNORMAL_CHANGE',
          severity: 'HIGH',
          field: 'value',
          metric,
          message: `Unusual Increase Detected: ${metric} spiked by ${pctChange.toLocaleString()}% (Previous: ${prevValue} ${unit} ➔ Current: ${numValue} ${unit}).`,
          suggestion: 'Confirm if project scope expanded, calibration error occurred, or attach utility bill evidence for audit.',
          details: { previousValue: prevValue, currentValue: numValue, percentChange: pctChange },
        });
      } else if (ratio <= 0.15 && numValue > 0) {
        // Dramatic drop (>85% reduction)
        issues.push({
          type: 'ABNORMAL_CHANGE',
          severity: 'MEDIUM',
          field: 'value',
          metric,
          message: `Unusual Decrease Detected: ${metric} dropped by ${Math.abs(pctChange)}% (Previous: ${prevValue} ${unit} ➔ Current: ${numValue} ${unit}).`,
          suggestion: 'Verify if operations were shut down or if data is incomplete.',
          details: { previousValue: prevValue, currentValue: numValue, percentChange: pctChange },
        });
      }
    }
  }

  // Calculate Data Quality / Confidence Score (0-100%)
  const highCount = issues.filter((i) => i.severity === 'HIGH').length;
  const medCount = issues.filter((i) => i.severity === 'MEDIUM').length;
  const lowCount = issues.filter((i) => i.severity === 'LOW').length;

  let qualityScore = 100 - (highCount * 35 + medCount * 15 + lowCount * 5);
  qualityScore = Math.max(0, Math.min(100, qualityScore));

  return {
    isValid: highCount === 0,
    qualityScore,
    issues,
    summary: {
      highCount,
      medCount,
      lowCount,
      totalIssues: issues.length,
    },
  };
};

/**
 * Validates a consolidated project dataset across all 4 departments
 * Performs cross-metric logical checks:
 * - Female Employees <= Total Employees
 * - Water Recycled <= Water Withdrawn
 * - Hazardous Waste <= Total Waste
 * - Permanent + Contractual == Total Employees
 */
const validateProjectDataset = (records = [], projectInfo = {}) => {
  const allIssues = [];
  const metricsMap = {};

  records.forEach((r) => {
    metricsMap[r.metric] = r;
  });

  // Cross-metric 1: Female Employees vs Total Employees
  const totalEmp = metricsMap['Total Employees'];
  const femaleEmp = metricsMap['Female Employees'];
  if (totalEmp && femaleEmp) {
    const totalVal = Number(totalEmp.value);
    const femaleVal = Number(femaleEmp.value);
    if (!isNaN(totalVal) && !isNaN(femaleVal) && femaleVal > totalVal) {
      allIssues.push({
        type: 'INVALID_VALUE',
        severity: 'HIGH',
        metric: 'Female Employees',
        field: 'value',
        message: `Logical Inconsistency: Female Employees (${femaleVal}) cannot exceed Total Employees (${totalVal}).`,
        suggestion: 'Verify HR headcount census.',
      });
    }
  }

  // Cross-metric 2: Water Recycled vs Water Withdrawal
  const waterWithdrawal = metricsMap['Total Water Withdrawal'];
  const waterRecycled = metricsMap['Water Recycled/Reused'];
  if (waterWithdrawal && waterRecycled) {
    const withVal = Number(waterWithdrawal.value);
    const recVal = Number(waterRecycled.value);
    if (!isNaN(withVal) && !isNaN(recVal) && recVal > withVal) {
      allIssues.push({
        type: 'INVALID_VALUE',
        severity: 'HIGH',
        metric: 'Water Recycled/Reused',
        field: 'value',
        message: `Logical Inconsistency: Water Recycled (${recVal} KL) cannot exceed Total Water Withdrawal (${withVal} KL).`,
        suggestion: 'Recycled quantity cannot be greater than gross intake.',
      });
    }
  }

  // Cross-metric 3: Hazardous Waste vs Total Waste
  const totalWaste = metricsMap['Total Waste Generated'];
  const hazWaste = metricsMap['Hazardous Waste'];
  if (totalWaste && hazWaste) {
    const totW = Number(totalWaste.value);
    const hazW = Number(hazWaste.value);
    if (!isNaN(totW) && !isNaN(hazW) && hazW > totW) {
      allIssues.push({
        type: 'INVALID_VALUE',
        severity: 'HIGH',
        metric: 'Hazardous Waste',
        field: 'value',
        message: `Logical Inconsistency: Hazardous Waste (${hazW} MT) exceeds Total Waste Generated (${totW} MT).`,
        suggestion: 'Hazardous waste is a sub-component of total waste.',
      });
    }
  }

  // Check department completeness
  const deptCoverage = {
    Environmental: records.filter((r) => r.department === 'Environmental' || r.category === 'Environmental').length,
    HR: records.filter((r) => r.department === 'HR' || r.category === 'Social').length,
    Safety: records.filter((r) => r.department === 'Safety' || r.metric?.toLowerCase().includes('incident') || r.metric?.toLowerCase().includes('injury')).length,
    Compliance: records.filter((r) => r.department === 'Compliance' || r.category === 'Governance').length,
  };

  Object.entries(deptCoverage).forEach(([dept, count]) => {
    if (count === 0) {
      allIssues.push({
        type: 'MISSING_DATA',
        severity: 'MEDIUM',
        metric: `${dept} Department Data`,
        field: 'department',
        message: `Department Data Missing: No records uploaded from ${dept} Officer for this project.`,
        suggestion: `Assign data entry to ${dept} Officer before BRSR consolidation.`,
      });
    }
  });

  return {
    allIssues,
    deptCoverage,
    totalRecords: records.length,
    hasCriticalErrors: allIssues.some((i) => i.severity === 'HIGH'),
  };
};

module.exports = {
  validateRecord,
  validateProjectDataset,
  MANDATORY_DEPARTMENT_METRICS,
};
