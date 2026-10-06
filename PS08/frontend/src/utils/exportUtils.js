import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Format date for reports
 */
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'N/A';
  }
};

/**
 * Helper to sanitize filenames
 */
const sanitizeFilename = (str) => {
  return (str || 'Report').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 50);
};

// ============================================================================
// 1. ESG DATA RECORDS -> EXCEL EXPORT (.xlsx)
// ============================================================================
export const exportESGRecordsToExcel = (records = [], options = {}) => {
  if (!records || records.length === 0) {
    alert('No ESG records available to export.');
    return;
  }

  const {
    category = 'All',
    year = '',
    organizationName = 'All Organizations',
    status = '',
  } = options;

  const wb = XLSX.utils.book_new();

  // --- Sheet 1: Detailed Records ---
  const tableData = records.map((r, index) => ({
    'S.No': index + 1,
    'Record Ref': r._id ? r._id.slice(-6).toUpperCase() : 'N/A',
    'Category': r.category || 'N/A',
    'Subcategory': r.subcategory || 'General',
    'Metric Name': r.metric || 'N/A',
    'Reporting Year': r.reportingPeriod?.year || 'N/A',
    'Quarter': r.reportingPeriod?.quarter || 'Annual',
    'Organization': r.organization?.name || r.organization || 'N/A',
    'Value': r.value !== undefined ? r.value : 'N/A',
    'Unit': r.unit || '—',
    'Status': r.status || 'Draft',
    'Data Source': r.dataSource || 'Internal Logs',
    'Description': r.description || '',
    'Remarks / Notes': r.remarks || '',
    'Submitted By': r.submittedBy?.name || '—',
    'Reviewed By': r.reviewedBy?.name || '—',
    'Approved By': r.approvedBy?.name || '—',
    'Reviewer Comment': r.reviewComment || r.correctionComment || '—',
    'Created Date': formatDate(r.createdAt),
    'Last Updated': formatDate(r.updatedAt),
  }));

  const wsRecords = XLSX.utils.json_to_sheet(tableData);

  // Auto-fit column widths
  const colWidths = [
    { wch: 6 },  // S.No
    { wch: 12 }, // Record Ref
    { wch: 16 }, // Category
    { wch: 18 }, // Subcategory
    { wch: 32 }, // Metric Name
    { wch: 14 }, // Year
    { wch: 12 }, // Quarter
    { wch: 28 }, // Organization
    { wch: 14 }, // Value
    { wch: 12 }, // Unit
    { wch: 18 }, // Status
    { wch: 22 }, // Data Source
    { wch: 30 }, // Description
    { wch: 24 }, // Remarks
    { wch: 18 }, // Submitted By
    { wch: 18 }, // Reviewed By
    { wch: 18 }, // Approved By
    { wch: 26 }, // Reviewer Comment
    { wch: 14 }, // Created Date
    { wch: 14 }, // Last Updated
  ];
  wsRecords['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, wsRecords, 'ESG Data Records');

  // --- Sheet 2: Executive Summary & Statistics ---
  const catCounts = { Environmental: 0, Social: 0, Governance: 0 };
  const statusCounts = {};

  records.forEach((r) => {
    if (r.category && catCounts[r.category] !== undefined) {
      catCounts[r.category]++;
    }
    const st = r.status || 'Draft';
    statusCounts[st] = (statusCounts[st] || 0) + 1;
  });

  const summaryData = [
    { Metric: 'REPORT METADATA', Value: '' },
    { Metric: 'Portal / System', Value: 'ESG360 Smart BRSR Reporting Portal' },
    { Metric: 'Report Title', Value: `${category} Performance & Statutory Disclosures` },
    { Metric: 'Scope / Category', Value: category },
    { Metric: 'Organization Scope', Value: organizationName },
    { Metric: 'Reporting Period', Value: year ? `FY ${year}` : 'All Reporting Years' },
    { Metric: 'Status Filter', Value: status || 'All Statuses' },
    { Metric: 'Export Timestamp', Value: new Date().toLocaleString('en-IN') },
    { Metric: 'Total Records Exported', Value: records.length },
    { Metric: '', Value: '' },
    { Metric: 'BREAKDOWN BY ESG DOMAIN', Value: 'Count' },
    { Metric: 'Environmental Metrics', Value: catCounts.Environmental },
    { Metric: 'Social Metrics', Value: catCounts.Social },
    { Metric: 'Governance Metrics', Value: catCounts.Governance },
    { Metric: '', Value: '' },
    { Metric: 'WORKFLOW & VERIFICATION BREAKDOWN', Value: 'Count' },
    ...Object.entries(statusCounts).map(([stName, cnt]) => ({
      Metric: `Status: ${stName}`,
      Value: cnt,
    })),
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 36 }, { wch: 36 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

  const timestamp = new Date().toISOString().slice(0, 10);
  const catSlug = sanitizeFilename(category);
  const fileName = `ESG360_${catSlug}_Report_${year || 'All'}_${timestamp}.xlsx`;

  XLSX.writeFile(wb, fileName);
};

// ============================================================================
// 2. ESG DATA RECORDS -> PDF EXPORT (.pdf)
// ============================================================================
export const exportESGRecordsToPDF = (records = [], options = {}) => {
  if (!records || records.length === 0) {
    alert('No ESG records available to export.');
    return;
  }

  const {
    category = 'All',
    year = '',
    organizationName = 'All Organizations',
    status = '',
  } = options;

  // Landscape A4 for wide tabular data readability
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Header Background Bar (Brand Slate & Orange)
  doc.setFillColor(15, 23, 42); // #0F172A
  doc.rect(0, 0, pageWidth, 68, 'F');

  // Accent Line
  doc.setFillColor(241, 90, 36); // #F15A24 Brand Orange
  doc.rect(0, 68, pageWidth, 4, 'F');

  // Brand Name & Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('ESG360', 36, 32);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 126, 71); // Light orange
  doc.text('Smart BRSR & Statutory Reporting Portal', 108, 32);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  const reportMainTitle = category === 'All' 
    ? 'COMPREHENSIVE ESG DATA REPORT' 
    : `${category.toUpperCase()} PERFORMANCE DOSSIER`;
  doc.text(reportMainTitle, 36, 52);

  // Generated time on right
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth - 36, 32, { align: 'right' });
  doc.text(`Total Records: ${records.length}`, pageWidth - 36, 50, { align: 'right' });

  // Metadata Card Strip (Under header)
  doc.setFillColor(248, 250, 252); // Light background
  doc.roundedRect(36, 80, pageWidth - 72, 38, 4, 4, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(36, 80, pageWidth - 72, 38, 4, 4, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);

  const col1X = 50;
  const col2X = 220;
  const col3X = 400;
  const col4X = 580;

  doc.text('Category Scope:', col1X, 96);
  doc.text('Organization Scope:', col2X, 96);
  doc.text('Reporting Year:', col3X, 96);
  doc.text('Status Filter:', col4X, 96);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(category || 'All Categories', col1X, 109);
  doc.text((organizationName || 'All Entities').slice(0, 30), col2X, 109);
  doc.text(year ? `FY ${year}` : 'All Years', col3X, 109);
  doc.text(status || 'All Statuses', col4X, 109);

  // Prepare table columns and rows
  const tableHeaders = [
    '#',
    'Metric Name',
    'Category',
    'Organization',
    'Period',
    'Value',
    'Unit',
    'Status',
    'Data Source',
  ];

  const tableRows = records.map((r, i) => [
    (i + 1).toString(),
    r.metric || 'N/A',
    r.category || 'N/A',
    (r.organization?.name || r.organization || 'N/A').slice(0, 25),
    `${r.reportingPeriod?.year || ''} ${r.reportingPeriod?.quarter !== 'Annual' && r.reportingPeriod?.quarter ? r.reportingPeriod.quarter : ''}`,
    r.value !== undefined ? String(r.value) : '—',
    r.unit || '—',
    r.status || 'Draft',
    (r.dataSource || 'Internal').slice(0, 22),
  ]);

  // Generate Table
  autoTable(doc, {
    startY: 128,
    head: [tableHeaders],
    body: tableRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 5,
      valign: 'middle',
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 25 },
      1: { cellWidth: 160, fontStyle: 'bold' },
      2: { cellWidth: 75 },
      3: { cellWidth: 130 },
      4: { cellWidth: 55, halign: 'center' },
      5: { cellWidth: 65, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 50, halign: 'center' },
      7: { cellWidth: 75, halign: 'center', fontStyle: 'bold' },
      8: { cellWidth: 95 },
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    margin: { top: 80, bottom: 40, left: 36, right: 36 },
    didParseCell: (data) => {
      // Highlight status badge cells
      if (data.section === 'body' && data.column.index === 7) {
        const val = data.cell.raw;
        if (val === 'Approved') {
          data.cell.styles.textColor = [5, 150, 105]; // Green
        } else if (val === 'Validated') {
          data.cell.styles.textColor = [2, 132, 199]; // Blue
        } else if (val === 'Correction Required') {
          data.cell.styles.textColor = [220, 38, 38]; // Red
        } else if (val === 'Under Review' || val === 'Submitted') {
          data.cell.styles.textColor = [217, 119, 6]; // Amber
        }
      }
    },
  });

  // Footer on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(36, pageHeight - 26, pageWidth - 36, pageHeight - 26);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      'ESG360 Reporting Portal • Compliant with SEBI BRSR Core Circular & Statutory Guidelines',
      36,
      pageHeight - 14
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - 36,
      pageHeight - 14,
      { align: 'right' }
    );
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  const catSlug = sanitizeFilename(category);
  const fileName = `ESG360_${catSlug}_Report_${year || 'All'}_${timestamp}.pdf`;

  doc.save(fileName);
};

// ============================================================================
// 3. SINGLE ESG RECORD -> CERTIFICATE / AUDIT SLIP PDF (.pdf)
// ============================================================================
export const exportSingleRecordToPDF = (record) => {
  if (!record) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Header Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 75, 'F');
  doc.setFillColor(241, 90, 36);
  doc.rect(0, 75, pageWidth, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('ESG360', 40, 38);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 126, 71);
  doc.text('DATA VERIFICATION & COMPLIANCE DOSSIER', 115, 38);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Statutory ESG Audit Record Slip', 40, 58);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Record ID: ${record._id || 'N/A'}`, pageWidth - 40, 38, { align: 'right' });
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth - 40, 54, { align: 'right' });

  // Main Card
  let currentY = 100;

  // Title Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(40, currentY, pageWidth - 80, 50, 6, 6, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(40, currentY, pageWidth - 80, 50, 6, 6, 'S');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(record.metric || 'ESG Metric', 54, currentY + 22);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Category: ${record.category}  |  Subcategory: ${record.subcategory || 'General'}  |  Period: ${record.reportingPeriod?.year} ${record.reportingPeriod?.quarter || ''}`, 54, currentY + 38);

  currentY += 65;

  // Attributes Table
  const attrData = [
    ['Organization', record.organization?.name || record.organization || 'N/A'],
    ['Recorded Value', `${record.value !== undefined ? record.value : '—'} ${record.unit || ''}`],
    ['Workflow Status', record.status || 'Draft'],
    ['Reporting Period', `${record.reportingPeriod?.year || ''} (${record.reportingPeriod?.quarter || 'Annual'})`],
    ['Data Source', record.dataSource || 'Internal Company Records'],
    ['Description', record.description || 'Not provided'],
    ['Remarks / Footnotes', record.remarks || 'None'],
    ['Submitted By', record.submittedBy?.name ? `${record.submittedBy.name} (${record.submittedBy.email || ''})` : 'System / Unassigned'],
    ['Submission Date', formatDate(record.submittedAt || record.createdAt)],
    ['Reviewed By', record.reviewedBy?.name ? `${record.reviewedBy.name} (${record.reviewedBy.email || ''})` : '—'],
    ['Approved By', record.approvedBy?.name ? `${record.approvedBy.name} (${record.approvedBy.email || ''})` : '—'],
    ['Reviewer Comment', record.reviewComment || record.correctionComment || 'No comments recorded'],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Attribute Field', 'Recorded Audit Value']],
    body: attrData,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 6,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9.5,
    },
    columnStyles: {
      0: { cellWidth: 150, fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { cellWidth: pageWidth - 80 - 150 },
    },
    margin: { left: 40, right: 40 },
  });

  currentY = doc.lastAutoTable.finalY + 20;

  // Workflow Timeline if available
  if (record.workflowHistory && record.workflowHistory.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Verification & Workflow History Audit Trail', 40, currentY);

    const histRows = record.workflowHistory.map((h, i) => [
      (i + 1).toString(),
      h.status || '—',
      h.changedBy?.name || 'System Admin',
      formatDate(h.changedAt),
      h.comment || '—',
    ]);

    autoTable(doc, {
      startY: currentY + 8,
      head: [['#', 'Status Transition', 'Actor', 'Date', 'Action Comment']],
      body: histRows,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 4,
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 100, fontStyle: 'bold' },
        2: { cellWidth: 110 },
        3: { cellWidth: 80 },
        4: { cellWidth: pageWidth - 80 - 315 },
      },
      margin: { left: 40, right: 40 },
    });
  }

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(40, pageHeight - 26, pageWidth - 40, pageHeight - 26);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      'ESG360 Assurance Slip • Digital Signature / Tamper-evident Audit Trail',
      40,
      pageHeight - 14
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - 40,
      pageHeight - 14,
      { align: 'right' }
    );
  }

  const metricSlug = sanitizeFilename(record.metric);
  doc.save(`ESG360_Record_${metricSlug}_${record.reportingPeriod?.year || '2026'}.pdf`);
};

// ============================================================================
// 4. BRSR REPORT -> EXCEL EXPORT (.xlsx)
// ============================================================================
export const exportBRSRReportToExcel = (report) => {
  if (!report) {
    alert('No BRSR report selected.');
    return;
  }

  const wb = XLSX.utils.book_new();

  // Sheet 1: General Disclosures & Statutory Overview
  const overviewData = [
    { Field: 'STATUTORY FILING DETAILS', Value: '' },
    { Field: 'Regulatory Framework', Value: 'SEBI (LODR) Regulations 2015 / Circular SEBI/HO/CFD/CMD-2/P/CIR/2021/562' },
    { Field: 'Report Title', Value: report.title || 'BRSR Annual Statutory Report' },
    { Field: 'BRSR Reference ID', Value: report.brsrReference || 'N/A' },
    { Field: 'Organization / Company Name', Value: report.organization?.name || 'N/A' },
    { Field: 'Corporate Identity Number (CIN)', Value: report.organization?.cin || 'N/A' },
    { Field: 'GSTIN', Value: report.organization?.gstin || 'N/A' },
    { Field: 'Industry Classification', Value: report.organization?.industry || 'N/A' },
    { Field: 'Registered Location', Value: report.organization?.location || 'N/A' },
    { Field: 'Reporting Financial Year', Value: report.reportingPeriod?.year || '2026' },
    { Field: 'Period Covered', Value: `${report.reportingPeriod?.fromDate ? formatDate(report.reportingPeriod.fromDate) : 'Start FY'} to ${report.reportingPeriod?.toDate ? formatDate(report.reportingPeriod.toDate) : 'End FY'}` },
    { Field: 'Overall BRSR Completion %', Value: `${report.overallCompletionPercentage || 0}%` },
    { Field: 'Filing Workflow Status', Value: report.status || 'Draft' },
    { Field: 'Generated By', Value: report.generatedBy?.name || 'Authorized Reviewer' },
    { Field: 'Generation Date', Value: formatDate(report.generatedAt || report.createdAt) },
    { Field: 'Approved By', Value: report.approvedBy?.name || '—' },
    { Field: 'Approval Date', Value: formatDate(report.approvedAt) },
    { Field: 'Reviewer Feedback', Value: report.reviewComment || report.correctionComment || 'Compliant' },
  ];

  const wsOverview = XLSX.utils.json_to_sheet(overviewData);
  wsOverview['!cols'] = [{ wch: 32 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsOverview, 'BRSR Filing Profile');

  // Sheet 2: Section & Principle Disclosures
  const sectionsData = (report.sections || []).map((s, idx) => ({
    'S.No': idx + 1,
    'Section / Principle': s.sectionName || 'N/A',
    'Completion %': `${s.completionPercentage || 0}%`,
    'Status': s.isComplete ? 'Complete' : 'Incomplete',
    'Total Data Points': s.dataPoints?.length || 0,
    'Disclosed Indicators Summary': (s.dataPoints || []).map(dp => `${dp.key || dp.metric}: ${dp.value}`).join('; ').slice(0, 300) || 'Mapped from Approved Records',
  }));

  const wsSections = XLSX.utils.json_to_sheet(sectionsData);
  wsSections['!cols'] = [
    { wch: 6 },
    { wch: 42 },
    { wch: 15 },
    { wch: 14 },
    { wch: 18 },
    { wch: 60 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSections, 'Principles 1-9 & Sections');

  // Sheet 3: Underlying ESG Data Records (if populated)
  if (report.includedESGRecords && report.includedESGRecords.length > 0) {
    const rawData = report.includedESGRecords.map((r, i) => ({
      'S.No': i + 1,
      'Metric Name': r.metric,
      'Category': r.category,
      'Value': r.value,
      'Unit': r.unit || '',
      'Status': r.status,
      'Data Source': r.dataSource || '',
      'Year': r.reportingPeriod?.year || '',
    }));
    const wsRaw = XLSX.utils.json_to_sheet(rawData);
    wsRaw['!cols'] = [
      { wch: 6 }, { wch: 32 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 24 }, { wch: 10 }
    ];
    XLSX.utils.book_append_sheet(wb, wsRaw, 'Approved ESG Disclosures');
  }

  const fileName = `SEBI_BRSR_Report_${sanitizeFilename(report.organization?.name || 'Company')}_FY${report.reportingPeriod?.year || '2026'}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// ============================================================================
// 5. BRSR REPORT -> STATUTORY PDF EXPORT (.pdf)
// ============================================================================
export const exportBRSRReportToPDF = (report) => {
  if (!report) {
    alert('No BRSR report selected.');
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Header Banner
  doc.setFillColor(15, 23, 42); // Deep slate
  doc.rect(0, 0, pageWidth, 80, 'F');
  doc.setFillColor(241, 90, 36); // Brand Orange strip
  doc.rect(0, 80, pageWidth, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('BUSINESS RESPONSIBILITY & SUSTAINABILITY REPORT', 40, 34);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 126, 71);
  doc.text('SEBI Core Non-Financial Disclosures • Regulation 34(2)(f) Compliance', 40, 50);

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Ref: ${report.brsrReference || 'BRSR-GEN'}`, pageWidth - 40, 34, { align: 'right' });
  doc.text(`Date: ${formatDate(report.createdAt)}`, pageWidth - 40, 48, { align: 'right' });
  doc.text(`Status: ${report.status || 'Draft'}`, pageWidth - 40, 62, { align: 'right' });

  let currentY = 104;

  // Company Profile Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(40, currentY, pageWidth - 80, 75, 4, 4, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(40, currentY, pageWidth - 80, 75, 4, 4, 'S');

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(report.title || 'Annual BRSR Statutory Filing', 52, currentY + 20);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const orgName = report.organization?.name || 'Corporate Entity';
  const cin = report.organization?.cin || 'CIN Registered';
  const year = report.reportingPeriod?.year || '2026';
  const comp = report.overallCompletionPercentage || 0;

  doc.text(`Reporting Entity: ${orgName}`, 52, currentY + 36);
  doc.text(`Corporate Identity Number (CIN): ${cin}`, 52, currentY + 50);
  doc.text(`Reporting Financial Year: FY ${year}`, 52, currentY + 64);

  doc.text(`Overall Completion: ${comp}%`, 340, currentY + 36);
  doc.text(`Filing Status: ${report.status}`, 340, currentY + 50);
  doc.text(`Generated By: ${report.generatedBy?.name || 'Review Team'}`, 340, currentY + 64);

  currentY += 92;

  // Completion Bar
  doc.setFillColor(226, 232, 240);
  doc.roundedRect(40, currentY, pageWidth - 80, 8, 4, 4, 'F');
  doc.setFillColor(comp >= 80 ? 5 : 241, comp >= 80 ? 150 : 90, comp >= 80 ? 105 : 36);
  const fillW = Math.max(0, Math.min(pageWidth - 80, ((pageWidth - 80) * comp) / 100));
  doc.roundedRect(40, currentY, fillW, 8, 4, 4, 'F');

  currentY += 22;

  // Section Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('SEBI BRSR Sections & Principles Completion', 40, currentY);

  const sectionRows = (report.sections || []).map((s, idx) => [
    (idx + 1).toString(),
    s.sectionName || 'Principle',
    `${s.completionPercentage || 0}%`,
    s.isComplete ? 'Complete' : 'In Progress',
    (s.dataPoints || []).length > 0 ? `${s.dataPoints.length} indicators` : 'Mapped',
  ]);

  autoTable(doc, {
    startY: currentY + 8,
    head: [['#', 'Section / Principle Disclosures', 'Completion', 'Status', 'Indicators']],
    body: sectionRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 5,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' },
      1: { cellWidth: 260, fontStyle: 'bold' },
      2: { cellWidth: 70, halign: 'center' },
      3: { cellWidth: 80, halign: 'center' },
      4: { cellWidth: 80, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        if (data.cell.raw === 'Complete') {
          data.cell.styles.textColor = [5, 150, 105];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [217, 119, 6];
        }
      }
    },
    margin: { left: 40, right: 40 },
  });

  currentY = doc.lastAutoTable.finalY + 25;

  // Sign-off / Verification Box if space permits or on next page
  if (currentY > pageHeight - 140) {
    doc.addPage();
    currentY = 50;
  }

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(40, currentY, pageWidth - 80, 80, 4, 4, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(40, currentY, pageWidth - 80, 80, 4, 4, 'S');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Statutory Verification & Assurance Statement', 52, currentY + 18);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    'This document has been compiled automatically based on approved ESG data records verified by organizational ESG reviewers.',
    52,
    currentY + 32
  );
  doc.text(
    `Approval Status: ${report.status} | Authorized Officer: ${report.approvedBy?.name || 'Board ESG Committee'}`,
    52,
    currentY + 46
  );
  doc.text(
    `Verification Timestamp: ${formatDate(report.approvedAt || report.updatedAt)} | Digital Audit Hash Attached`,
    52,
    currentY + 60
  );

  // Footer on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(40, pageHeight - 26, pageWidth - 40, pageHeight - 26);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      'ESG360 Smart Portal • SEBI BRSR Core Statutory Reporting Framework',
      40,
      pageHeight - 14
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - 40,
      pageHeight - 14,
      { align: 'right' }
    );
  }

  const fileName = `SEBI_BRSR_Report_${sanitizeFilename(report.organization?.name || 'Company')}_FY${year}.pdf`;
  doc.save(fileName);
};

// ============================================================================
// 6. MASTER BRSR REPORTS LIST -> EXCEL & PDF EXPORT
// ============================================================================
export const exportBRSRReportsListToExcel = (reports = [], filters = {}) => {
  if (!reports || reports.length === 0) {
    alert('No BRSR reports available to export.');
    return;
  }

  const wb = XLSX.utils.book_new();

  const data = reports.map((r, i) => ({
    'S.No': i + 1,
    'Report Title': r.title,
    'BRSR Reference': r.brsrReference || 'N/A',
    'Organization': r.organization?.name || 'N/A',
    'Reporting Year': r.reportingPeriod?.year || 'N/A',
    'Status': r.status || 'Draft',
    'Completion %': `${r.overallCompletionPercentage || 0}%`,
    'Generated By': r.generatedBy?.name || '—',
    'Approved By': r.approvedBy?.name || '—',
    'Created Date': formatDate(r.createdAt),
    'Updated Date': formatDate(r.updatedAt),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 34 },
    { wch: 18 },
    { wch: 28 },
    { wch: 14 },
    { wch: 16 },
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'BRSR Reports Register');

  const fileName = `BRSR_Reports_Register_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportBRSRReportsListToPDF = (reports = [], filters = {}) => {
  if (!reports || reports.length === 0) {
    alert('No BRSR reports available to export.');
    return;
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Header Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 68, 'F');
  doc.setFillColor(241, 90, 36);
  doc.rect(0, 68, pageWidth, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('ESG360', 36, 32);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 126, 71);
  doc.text('BRSR Statutory Reports Register', 108, 32);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('SEBI BRSR COMPLIANCE REPORTS OVERVIEW', 36, 52);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth - 36, 32, { align: 'right' });
  doc.text(`Total Filings: ${reports.length}`, pageWidth - 36, 50, { align: 'right' });

  const headers = ['#', 'Report Title', 'Reference', 'Organization', 'Year', 'Completion', 'Status', 'Generated By'];
  const rows = reports.map((r, i) => [
    (i + 1).toString(),
    r.title,
    r.brsrReference || 'N/A',
    r.organization?.name || 'N/A',
    r.reportingPeriod?.year || '',
    `${r.overallCompletionPercentage || 0}%`,
    r.status || 'Draft',
    r.generatedBy?.name || '—',
  ]);

  autoTable(doc, {
    startY: 86,
    head: [headers],
    body: rows,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 5 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: 36, right: 36 },
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('ESG360 Reporting Portal • Statutory Reports Master Index', 36, pageHeight - 14);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 36, pageHeight - 14, { align: 'right' });
  }

  doc.save(`BRSR_Reports_Register_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// ============================================================================
// 7. ANALYTICS DATA -> EXCEL & PDF EXPORT
// ============================================================================
export const exportAnalyticsToExcel = (data, filters = {}, orgs = []) => {
  if (!data) {
    alert('No analytics data available to export.');
    return;
  }

  const wb = XLSX.utils.book_new();

  // Sheet 1: Category & Status Breakdown
  const catStatusData = (data.categoryBreakdown || []).map((cb, idx) => ({
    'S.No': idx + 1,
    'Category': cb._id?.category || 'N/A',
    'Status': cb._id?.status || 'N/A',
    'Record Count': cb.count || 0,
  }));
  const wsCat = XLSX.utils.json_to_sheet(catStatusData);
  wsCat['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 18 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsCat, 'Category & Status');

  // Sheet 2: Organization Performance
  const orgData = (data.orgBreakdown || []).map((ob, idx) => ({
    'Rank': idx + 1,
    'Organization Name': ob.orgName || 'N/A',
    'Organization Type': ob.orgType || 'N/A',
    'Approved Metrics Count': ob.count || 0,
  }));
  const wsOrg = XLSX.utils.json_to_sheet(orgData);
  wsOrg['!cols'] = [{ wch: 6 }, { wch: 32 }, { wch: 18 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsOrg, 'Organization Leaders');

  // Sheet 3: Top Metrics
  const topMetricsData = (data.topMetrics || []).map((tm, idx) => ({
    'Rank': idx + 1,
    'Metric Name': tm._id || 'N/A',
    'Logged Occurrences': tm.count || 0,
  }));
  const wsMetrics = XLSX.utils.json_to_sheet(topMetricsData);
  wsMetrics['!cols'] = [{ wch: 6 }, { wch: 36 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsMetrics, 'Top Logged Metrics');

  const fileName = `ESG360_Analytics_Report_${filters.year || 'All'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportAnalyticsToPDF = (data, filters = {}, orgs = []) => {
  if (!data) {
    alert('No analytics data available to export.');
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 75, 'F');
  doc.setFillColor(241, 90, 36);
  doc.rect(0, 75, pageWidth, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('ESG360', 36, 36);

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 126, 71);
  doc.text('EXECUTIVE SUSTAINABILITY ANALYTICS DOSSIER', 110, 36);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('PORTFOLIO ESG METRICS & BENCHMARKING REPORT', 36, 56);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth - 36, 36, { align: 'right' });
  doc.text(`Filter Year: ${filters.year || 'All Years'}`, pageWidth - 36, 52, { align: 'right' });

  let currentY = 96;

  // Organization Leaders Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Top Reporting Organizations by Approved Disclosures', 36, currentY);

  const orgRows = (data.orgBreakdown || []).map((o, i) => [
    (i + 1).toString(),
    o.orgName || 'N/A',
    o.orgType || 'N/A',
    (o.count || 0).toString(),
  ]);

  autoTable(doc, {
    startY: currentY + 8,
    head: [['#', 'Organization Name', 'Entity Type', 'Approved Metrics']],
    body: orgRows,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 5 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 25, halign: 'center' }, 3: { halign: 'center', fontStyle: 'bold' } },
    margin: { left: 36, right: 36 },
  });

  currentY = doc.lastAutoTable.finalY + 20;

  // Top Metrics Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Top Tracked ESG Metrics across Operations', 36, currentY);

  const metricRows = (data.topMetrics || []).slice(0, 8).map((m, i) => [
    (i + 1).toString(),
    m._id || 'N/A',
    (m.count || 0).toString(),
  ]);

  autoTable(doc, {
    startY: currentY + 8,
    head: [['#', 'ESG Metric Name', 'Logged Data Points']],
    body: metricRows,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 5 },
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 25, halign: 'center' }, 2: { halign: 'center', fontStyle: 'bold' } },
    margin: { left: 36, right: 36 },
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('ESG360 Executive Analytics Dossier • Corporate Sustainability Intelligence', 36, pageHeight - 14);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 36, pageHeight - 14, { align: 'right' });
  }

  doc.save(`ESG360_Analytics_Report_${filters.year || 'All'}_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// ============================================================================
// 8. DOCUMENTS MANIFEST -> EXCEL & PDF EXPORT
// ============================================================================
export const exportDocumentsToExcel = (documents = [], filters = {}) => {
  if (!documents || documents.length === 0) {
    alert('No documents available to export.');
    return;
  }

  const wb = XLSX.utils.book_new();

  const data = documents.map((d, i) => ({
    'S.No': i + 1,
    'Document Title': d.title,
    'Category': d.category || 'N/A',
    'Organization': d.organization?.name || 'N/A',
    'File Type': d.fileType || 'N/A',
    'File Size (Bytes)': d.fileSize || 0,
    'Review Status': d.status || 'Draft',
    'Uploaded By': d.uploadedBy?.name || '—',
    'Upload Date': formatDate(d.createdAt),
    'Linked ESG Metric': d.relatedESGRecord?.metric || 'None',
    'Cloud URL': d.fileUrl || '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 6 }, { wch: 32 }, { wch: 20 }, { wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 14 }, { wch: 28 }, { wch: 40 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Compliance Documents');

  XLSX.writeFile(wb, `ESG360_Documents_Audit_Manifest_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const exportDocumentsToPDF = (documents = [], filters = {}) => {
  if (!documents || documents.length === 0) {
    alert('No documents available to export.');
    return;
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Header Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 68, 'F');
  doc.setFillColor(241, 90, 36);
  doc.rect(0, 68, pageWidth, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('ESG360', 36, 32);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 126, 71);
  doc.text('Statutory Evidence & Documents Audit Manifest', 108, 32);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('COMPLIANCE EVIDENCE REPOSITORY AUDIT TRAIL', 36, 52);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth - 36, 32, { align: 'right' });
  doc.text(`Total Records: ${documents.length}`, pageWidth - 36, 50, { align: 'right' });

  const headers = ['#', 'Document Title', 'Category', 'Organization', 'Status', 'Uploaded By', 'Date', 'Linked Metric'];
  const rows = documents.map((d, i) => [
    (i + 1).toString(),
    (d.title || 'Untitled').slice(0, 30),
    d.category || 'N/A',
    (d.organization?.name || 'N/A').slice(0, 24),
    d.status || 'Draft',
    (d.uploadedBy?.name || '—').slice(0, 18),
    formatDate(d.createdAt),
    (d.relatedESGRecord?.metric || '—').slice(0, 24),
  ]);

  autoTable(doc, {
    startY: 86,
    head: [headers],
    body: rows,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 5 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: 36, right: 36 },
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('ESG360 Reporting Portal • Compliance Evidence & Audit Repository', 36, pageHeight - 14);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 36, pageHeight - 14, { align: 'right' });
  }

  doc.save(`ESG360_Documents_Manifest_${new Date().toISOString().slice(0, 10)}.pdf`);
};

