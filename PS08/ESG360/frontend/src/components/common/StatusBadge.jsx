// Status badge mappings
const STATUS_CLASS = {
  'Draft': 'badge-draft',
  'Submitted': 'badge-submitted',
  'Under Review': 'badge-under-review',
  'Validated': 'badge-validated',
  'Approved': 'badge-approved',
  'Correction Required': 'badge-correction',
  'Consolidated': 'badge-consolidated',
  'Reported': 'badge-reported',
  'Environmental': 'badge-env',
  'Social': 'badge-social',
  'Governance': 'badge-gov',
  'Active': 'badge-approved',
  'Inactive': 'badge-draft',
  'In Progress': 'badge-submitted',
  'Published': 'badge-approved',
};

const StatusBadge = ({ status }) => {
  const cls = STATUS_CLASS[status] || 'badge-draft';
  return <span className={`badge-esg ${cls}`}>{status}</span>;
};

export default StatusBadge;
