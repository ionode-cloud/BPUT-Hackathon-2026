import { useState } from 'react';
import {
  X, FileText, Download, ShieldCheck, CheckCircle2,
  AlertCircle, Building2, Calendar, FileSpreadsheet, Send, Edit2, Trash2
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { exportSingleRecordToPDF, exportESGRecordsToExcel } from '../../utils/exportUtils';
import { useAuth } from '../../context/AuthContext';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const ESGRecordViewModal = ({ record, onClose, onReview, onEdit, onDelete, onAction }) => {
  const { isReviewer, user } = useAuth();
  const [comment, setComment] = useState('');
  const [acting, setActing] = useState(false);

  if (!record) return null;

  const handleActionClick = async (action) => {
    if (onAction) {
      setActing(true);
      try {
        await onAction(record._id, action, comment);
        onClose();
      } catch (e) {
        console.error(e);
      } finally {
        setActing(false);
      }
    } else if (onReview) {
      onClose();
      onReview(record);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-box modal-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 840, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: '1rem 1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span className="modal-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {record.metric}
              </span>
              <StatusBadge status={record.status || 'Draft'} />
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {record.category} {record.subcategory && `• ${record.subcategory}`} • FY {record.reportingPeriod?.year} {record.reportingPeriod?.quarter !== 'Annual' && `(${record.reportingPeriod?.quarter})`}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
          {/* Key Value Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #FFF0E9 0%, #FFFFFF 100%)',
            border: '1.5px solid #FFD8C7',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Disclosed Quantitative Metric Value
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.15rem' }}>
                {record.value !== undefined ? record.value : '—'} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{record.unit || ''}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary-esg"
                onClick={() => exportSingleRecordToPDF(record)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#FFFFFF' }}
              >
                <FileText size={13} style={{ color: '#DC2626' }} /> Download PDF Slip
              </button>
              <button
                type="button"
                className="btn-secondary-esg"
                onClick={() => exportESGRecordsToExcel([record], { category: record.category, year: record.reportingPeriod?.year })}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#FFFFFF' }}
              >
                <FileSpreadsheet size={13} style={{ color: '#137333' }} /> Download Excel
              </button>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid-2" style={{ gap: '1rem', marginBottom: '1.25rem' }}>
            {[
              ['Organization', record.organization?.name || 'Group Scoped Entity'],
              ['ESG Domain', record.category],
              ['Subcategory', record.subcategory || 'General Disclosures'],
              ['Reporting Period', `${record.reportingPeriod?.year} • ${record.reportingPeriod?.quarter || 'Annual'}`],
              ['Data Source', record.dataSource || 'Internal Company Logs'],
              ['Submission Date', formatDate(record.submittedAt || record.createdAt)],
              ['Submitted By', record.submittedBy?.name || 'ESG Officer'],
              ['Approved By', record.approvedBy?.name ? `${record.approvedBy.name} (${formatDate(record.approvedAt)})` : 'Pending Verification'],
            ].map(([k, v]) => (
              <div key={k} style={{ background: 'var(--bg)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>{v}</div>
              </div>
            ))}
          </div>

          {record.description && (
            <div style={{ marginBottom: '1rem', background: '#FFFFFF', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Description</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>{record.description}</div>
            </div>
          )}

          {record.remarks && (
            <div style={{ marginBottom: '1rem', background: '#FFFFFF', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Remarks & Footnotes</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{record.remarks}</div>
            </div>
          )}

          {record.correctionComment && (
            <div className="alert-esg alert-danger" style={{ marginBottom: '1rem' }}>
              <strong>Correction Required:</strong> {record.correctionComment}
            </div>
          )}

          {record.reviewComment && (
            <div className="alert-esg alert-info" style={{ marginBottom: '1rem' }}>
              <strong>Reviewer Comment:</strong> {record.reviewComment}
            </div>
          )}

          {/* Workflow history */}
          {record.workflowHistory?.length > 0 && (
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--text-primary)' }}>
                Workflow & Verification History Audit Trail
              </div>
              <div className="table-wrapper">
                <table className="table-esg">
                  <thead>
                    <tr><th>Status</th><th>Updated By</th><th>Date</th><th>Comment</th></tr>
                  </thead>
                  <tbody>
                    {record.workflowHistory.slice().reverse().map((h, i) => (
                      <tr key={i}>
                        <td><StatusBadge status={h.status} /></td>
                        <td style={{ fontSize: '0.8rem' }}>{h.changedBy?.name || 'System'}</td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatDate(h.changedAt)}</td>
                        <td style={{ fontSize: '0.8rem' }}>{h.comment || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ padding: '0.85rem 1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" className="btn-secondary-esg" onClick={onClose}>Close</button>

          {onReview && (
            <button
              type="button"
              className="btn-primary-esg"
              style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={() => {
                onClose();
                onReview(record);
              }}
            >
              <ShieldCheck size={14} /> Review & Action
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ESGRecordViewModal;
