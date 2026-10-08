import { useState, useEffect } from 'react';
import {
  LuCircleCheck as CheckCircle2,
  LuClock as Clock,
  LuShieldCheck as ShieldCheck,
  LuX as X
} from 'react-icons/lu';
import { FiAlertCircle as AlertCircle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const ACTIONS = [
  {
    key: 'under_review',
    label: 'Under Review',
    status: 'Under Review',
    color: '#B7791F',
    bg: '#FEF3C7',
    border: '#FDE68A',
    icon: Clock,
    desc: 'Mark as currently under audit review',
  },
  {
    key: 'validate',
    label: 'Validate',
    status: 'Validated',
    color: '#087F5B',
    bg: '#E6FCF5',
    border: '#C3FAE8',
    icon: ShieldCheck,
    desc: 'Verify methodology and calculation correctness',
  },
  {
    key: 'correction',
    label: 'Correction Required',
    status: 'Correction Required',
    color: '#C92A2A',
    bg: '#FFE3E3',
    border: '#FFC9C9',
    icon: AlertCircle,
    desc: 'Return to contributor with required modifications',
  },
  {
    key: 'approve',
    label: 'Approve (Super Admin)',
    status: 'Approved',
    color: '#2B8A3E',
    bg: '#EBFBEE',
    border: '#D3F9D8',
    icon: CheckCircle2,
    desc: 'Grant formal approval for reporting & compliance',
    superAdminOnly: true,
  },
];

const ReviewActionModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Review & Workflow Action',
  recordName = '',
  currentStatus = '',
  initialAction = 'approve',
}) => {
  const { isSuperAdmin } = useAuth();
  const defaultAction = (!isSuperAdmin && initialAction === 'approve') ? 'validate' : initialAction;
  const [selectedAction, setSelectedAction] = useState(defaultAction);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedAction(initialAction || 'approve');
      setComment('');
      setError('');
      setSubmitting(false);
    }
  }, [isOpen, initialAction]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedAction === 'correction' && !comment.trim()) {
      setError('Please provide a reason or comment for requesting correction.');
      return;
    }
    if (selectedAction === 'approve' && !isSuperAdmin) {
      setError('Only Super Admin is authorized to grant final approval.');
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(selectedAction, comment.trim());
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-md" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{title}</div>
            {recordName && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Item: <strong>{recordName}</strong> {currentStatus && `• Current: ${currentStatus}`}
              </div>
            )}
          </div>
          <button className="modal-close" onClick={onClose}><X size={15} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '1.25rem' }}>
            {error && <div className="alert-esg alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

            <label className="form-label-esg" style={{ marginBottom: '0.65rem', display: 'block' }}>
              Select Workflow Status Action
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '1.25rem' }}>
              {ACTIONS.map((act) => {
                const Icon = act.icon;
                const isSelected = selectedAction === act.key;
                const isDisabled = act.superAdminOnly && !isSuperAdmin;

                return (
                  <div
                    key={act.key}
                    onClick={() => {
                      if (isDisabled) {
                        setError('Only Super Admin can grant final approval.');
                        return;
                      }
                      setSelectedAction(act.key);
                      setError('');
                    }}
                    style={{
                      border: isSelected ? `2px solid ${act.color}` : '1.5px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem',
                      background: isSelected ? act.bg : 'var(--surface)',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.55 : 1,
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                    title={isDisabled ? 'Super Admin approval required' : ''}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
                      <Icon size={16} style={{ color: act.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: act.color }}>{act.label}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.25 }}>
                      {isDisabled ? 'Requires Super Admin permission' : act.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="form-group-esg" style={{ marginBottom: 0 }}>
              <label className="form-label-esg">
                Reviewer Comment {selectedAction === 'correction' ? <span className="required">*</span> : <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>}
              </label>
              <textarea
                className="form-control-esg"
                rows={3}
                placeholder={
                  selectedAction === 'correction'
                    ? 'Specify required changes, missing documentation, or recalculation needed...'
                    : 'Add audit notes, verification remarks, or instructions...'
                }
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn-secondary-esg" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className={selectedAction === 'correction' ? 'btn-danger-esg' : 'btn-primary-esg'}
              disabled={submitting}
            >
              {submitting ? 'Applying...' : `Confirm: ${ACTIONS.find(a => a.key === selectedAction)?.label || 'Submit'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewActionModal;
