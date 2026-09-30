// Approvals page — shows records across all workflow review statuses
import { useState, useEffect } from 'react';
import { CheckCircle2, Search, ShieldCheck } from 'lucide-react';
import Breadcrumbs from '../components/common/Breadcrumbs';
import StatusBadge from '../components/common/StatusBadge';
import { LoadingState, EmptyState } from '../components/common/States';
import Pagination from '../components/common/Pagination';
import ReviewActionModal from '../components/common/ReviewActionModal';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const REVIEW_STATUSES = ['Pending Review', 'Submitted', 'Under Review', 'Validated', 'Correction Required', 'Approved'];

const Approvals = () => {
  const { isReviewer } = useAuth();
  const [records, setRecords] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [status, setStatus] = useState('Pending Review');
  const [search, setSearch] = useState('');
  const [reviewModalItem, setReviewModalItem] = useState(null);

  const fetchRecords = async (page = 1) => {
    setLoading(true);
    try {
      const queryStatus = status === 'Pending Review' ? 'pending' : status;
      const params = { page, limit: 15, status: queryStatus, search };
      if (selectedOrg) params.organization = selectedOrg;
      const res = await api.get('/esg', { params });
      setRecords(res.data.data);
      setPagination(res.data.pagination);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => {
    api.get('/organizations', { params: { limit: 100 } }).then(r => setOrganizations(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchRecords(1); }, [status, search, selectedOrg]);

  const handleAction = async (id, action, comment = '') => {
    try {
      await api.put(`/esg/${id}/review`, { action, comment });
      fetchRecords();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  if (!isReviewer) {
    return (
      <div className="esg-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔒</div>
        <h3>Access Restricted</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Approval actions require a reviewer or manager role.</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <Breadcrumbs items={[{ label: 'Approvals', path: '/approvals' }]} />
      <div className="page-header">
        <h1 className="page-title">Approvals & Workflow Review</h1>
        <p className="page-subtitle">Review, validate, request corrections, and approve submitted ESG records</p>
      </div>

      {/* Status tabs */}
      <div className="tabs-esg" style={{ marginBottom: '1.25rem' }}>
        {REVIEW_STATUSES.map(s => (
          <button key={s} className={`tab-btn ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>{s}</button>
        ))}
      </div>

      <div className="filters-bar" style={{ marginBottom: '1.25rem' }}>
        <div className="search-input-wrap">
          <Search size={14} className="search-icon" />
          <input placeholder="Search metrics..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select
          className="filter-select"
          value={selectedOrg}
          onChange={e => setSelectedOrg(e.target.value)}
        >
          <option value="">All Organizations</option>
          {organizations.map(o => (
            <option key={o._id} value={o._id}>{o.name} ({o.type})</option>
          ))}
        </select>
        <button
          className="btn-secondary-esg btn-sm"
          onClick={() => { setSearch(''); setSelectedOrg(''); }}
        >
          Clear
        </button>
      </div>

      {loading ? <LoadingState /> : records.length === 0 ? (
        <div className="esg-card">
          <EmptyState
            icon={<CheckCircle2 size={48} />}
            title={`No records with status: ${status}`}
            message="All records in this status have been processed."
          />
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table-esg">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Category</th>
                  <th>Organization</th>
                  <th>Submitted By</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r._id}>
                    <td style={{ fontWeight: 500 }}>{r.metric}</td>
                    <td><StatusBadge status={r.category} /></td>
                    <td style={{ fontSize: '0.8rem' }}>{r.organization?.name}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.submittedBy?.name || '—'}</td>
                    <td><span style={{ fontWeight: 600 }}>{r.value}</span> <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{r.unit}</span></td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <button
                          className="btn-secondary-esg btn-sm"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', color: '#087F5B', borderColor: '#C3FAE8', background: '#E6FCF5' }}
                          onClick={() => setReviewModalItem(r)}
                          title="Open Full Review & Actions"
                        >
                          <ShieldCheck size={12} /> Review
                        </button>
                        {r.status !== 'Under Review' && (
                          <button
                            className="btn-secondary-esg btn-sm"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => handleAction(r._id, 'under_review')}
                            title="Mark Under Review"
                          >
                            Under Review
                          </button>
                        )}
                        {r.status !== 'Validated' && (
                          <button
                            className="btn-secondary-esg btn-sm"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => handleAction(r._id, 'validate')}
                            title="Validate record"
                          >
                            Validate
                          </button>
                        )}
                        <button
                          className="btn-danger-esg btn-sm"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => setReviewModalItem({ ...r, _preselect: 'correction' })}
                          title="Request correction"
                        >
                          Correct
                        </button>
                        <button
                          className="btn-primary-esg btn-sm"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => handleAction(r._id, 'approve')}
                          title="Approve record"
                        >
                          <CheckCircle2 size={12} /> Approve
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPageChange={p => fetchRecords(p)} />
        </>
      )}

      {reviewModalItem && (
        <ReviewActionModal
          isOpen={!!reviewModalItem}
          onClose={() => setReviewModalItem(null)}
          title="ESG Record Workflow Review"
          recordName={reviewModalItem.metric}
          currentStatus={reviewModalItem.status}
          initialAction={
            reviewModalItem._preselect ||
            (reviewModalItem.status === 'Validated' ? 'approve' : reviewModalItem.status === 'Under Review' ? 'validate' : 'under_review')
          }
          onConfirm={async (action, comment) => {
            await handleAction(reviewModalItem._id, action, comment);
            setReviewModalItem(null);
          }}
        />
      )}
    </div>
  );
};

export default Approvals;
