import { LuX as X } from 'react-icons/lu';
import { FiAlertTriangle as AlertTriangle } from 'react-icons/fi';

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', confirmVariant = 'danger' }) => {
  if (!isOpen) return null;

  const btnClass = confirmVariant === 'danger' ? 'btn-danger-esg' : 'btn-primary-esg';

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
            {title}
          </span>
          <button className="modal-close" onClick={onCancel}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary-esg" onClick={onCancel}>Cancel</button>
          <button className={btnClass} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
