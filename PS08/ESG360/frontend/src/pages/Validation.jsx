// Validation page — shows records needing action from reviewers
import DataCollection from './DataCollection';

// Validation is essentially Data Collection filtered to records awaiting review
const Validation = () => {
  return (
    <div className="fade-in">
      <div style={{ marginBottom: '1rem', padding: '0.875rem 1rem', background: 'var(--warning-bg)', border: '1px solid #F5D898', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: '#92650A', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
        ⚠ <span><strong>Validation View:</strong> Records submitted for review appear below. Reviewers can validate, approve, or request corrections.</span>
      </div>
      <DataCollection />
    </div>
  );
};

export default Validation;
