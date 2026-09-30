export const LoadingState = ({ text = 'Loading...' }) => (
  <div className="loading-spinner">
    <div className="spinner" />
    <span>{text}</span>
  </div>
);

export const EmptyState = ({ icon, title, message, action }) => (
  <div className="empty-state">
    {icon && <div className="empty-state-icon">{icon}</div>}
    <h4>{title}</h4>
    {message && <p>{message}</p>}
    {action && <div style={{ marginTop: '1rem' }}>{action}</div>}
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div className="empty-state">
    <div className="empty-state-icon" style={{ color: 'var(--danger)' }}>⚠</div>
    <h4>Something went wrong</h4>
    <p>{message}</p>
    {onRetry && (
      <button className="btn-outline-esg" onClick={onRetry} style={{ marginTop: '1rem' }}>
        Try Again
      </button>
    )}
  </div>
);
