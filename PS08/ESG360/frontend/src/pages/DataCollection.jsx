import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, Eye, Edit2, Trash2, Send, X, ShieldCheck, CheckCircle2 } from 'lucide-react';
import Breadcrumbs from '../components/common/Breadcrumbs';
import StatusBadge from '../components/common/StatusBadge';
import Pagination from '../components/common/Pagination';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ReviewActionModal from '../components/common/ReviewActionModal';
import { LoadingState, EmptyState } from '../components/common/States';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['Environmental', 'Social', 'Governance'];

const YEARS = [];
for (let y = 2020; y <= new Date().getFullYear() + 1; y++) YEARS.push(y.toString());

const STATUSES = ['Draft', 'Submitted', 'Under Review', 'Validated', 'Approved', 'Correction Required'];

const ESG_METRICS = {
  Environmental: [
    'Total Energy Consumption', 'Electricity Consumption', 'Fuel Consumption',
    'Renewable Energy Generated', 'Renewable Energy Consumed', 'Total Water Withdrawal',
    'Water Recycled/Reused', 'Total Waste Generated', 'Hazardous Waste',
    'Non-Hazardous Waste', 'Waste Recycled', 'Scope 1 GHG Emissions',
    'Scope 2 GHG Emissions', 'Scope 3 GHG Emissions', 'Environmental Incidents',
  ],
  Social: [
    'Total Employees', 'Permanent Employees', 'Contractual Employees',
    'Female Employees', 'Male Employees', 'New Hires', 'Employee Turnover',
    'Women in Leadership', 'Training Hours', 'Lost Time Injury Rate',
    'Total Recordable Incidents', 'Fatalities', 'CSR Expenditure',
    'Grievances Received', 'Grievances Resolved',
  ],
  Governance: [
    'Total Board Members', 'Independent Directors', 'Women Directors',
    'Board Meetings Held', 'Ethics Policy Coverage', 'Anti-Corruption Training Completion',
    'Corruption Cases Reported', 'Whistleblower Complaints Received',
    'Regulatory Non-Compliances', 'Data Breaches',
  ],
};

const UNITS = ['kWh', 'MWh', 'GJ', 'TJ', 'KL', 'ML', 'MT', 'Tonnes', 'tCO2e', 'Nos.', 'INR Lakhs', 'INR Crores', '%', 'Hours', 'Per 1000 workers', 'Other'];

// ESG Record Form Modal
const RecordFormModal = ({ record, onClose, onSaved, organizations, category: defaultCategory }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    category: defaultCategory || record?.category || 'Environmental',
    metric: record?.metric || '',
    'reportingPeriod.year': record?.reportingPeriod?.year || new Date().getFullYear().toString(),
    'reportingPeriod.quarter': record?.reportingPeriod?.quarter || 'Annual',
    organization: record?.organization?._id || record?.organization || user?.organization?._id || '',
    value: record?.value || '',
    unit: record?.unit || '',
    description: record?.description || '',
    dataSource: record?.dataSource || '',
    remarks: record?.remarks || '',
    subcategory: record?.subcategory || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async (submitAfter = false) => {
    if (!form.metric || !form.organization || form.value === '') {
      setError('Category, Metric, Organization, and Value are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        category: form.category,
        metric: form.metric,
        subcategory: form.subcategory,
        reportingPeriod: { year: form['reportingPeriod.year'], quarter: form['reportingPeriod.quarter'] },
        organization: form.organization,
        value: isNaN(form.value) ? form.value : Number(form.value),
        unit: form.unit,
        description: form.description,
        dataSource: form.dataSource,
        remarks: form.remarks,
      };
      let saved;
      if (record?._id) {
        saved = await api.put(`/esg/${record._id}`, payload);
      } else {
        saved = await api.post('/esg', payload);
      }
      if (submitAfter) {
        await api.put(`/esg/${saved.data.data._id}/submit`);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const metricsForCat = ESG_METRICS[form.category] || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{record?._id ? 'Edit' : 'New'} ESG Record</span>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          {error && <div className="alert-esg alert-danger">{error}</div>}
          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="form-group-esg" style={{ marginBottom: 0 }}>
              <label className="form-label-esg">Category <span className="required">*</span></label>
              <select name="category" className="form-control-esg" value={form.category} onChange={handleChange}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group-esg" style={{ marginBottom: 0 }}>
              <label className="form-label-esg">Metric <span className="required">*</span></label>
              <select name="metric" className="form-control-esg" value={form.metric} onChange={handleChange}>
                <option value="">Select metric</option>
                {metricsForCat.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group-esg" style={{ marginBottom: 0 }}>
              <label className="form-label-esg">Organization <span className="required">*</span></label>
              <select name="organization" className="form-control-esg" value={form.organization} onChange={handleChange}>
                <option value="">Select organization</option>
                {organizations.map(o => <option key={o._id} value={o._id}>{o.name} ({o.type})</option>)}
              </select>
            </div>
            <div className="form-group-esg" style={{ marginBottom: 0 }}>
              <label className="form-label-esg">Sub-category</label>
              <input type="text" name="subcategory" className="form-control-esg" placeholder="e.g. Coal, Diesel" value={form.subcategory} onChange={handleChange} />
            </div>
            <div className="form-group-esg" style={{ marginBottom: 0 }}>
              <label className="form-label-esg">Reporting Year <span className="required">*</span></label>
              <select name="reportingPeriod.year" className="form-control-esg" value={form['reportingPeriod.year']} onChange={handleChange}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="form-group-esg" style={{ marginBottom: 0 }}>
              <label className="form-label-esg">Quarter</label>
              <select name="reportingPeriod.quarter" className="form-control-esg" value={form['reportingPeriod.quarter']} onChange={handleChange}>
                {['Annual', 'Q1', 'Q2', 'Q3', 'Q4'].map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <div className="form-group-esg" style={{ marginBottom: 0 }}>
              <label className="form-label-esg">Value <span className="required">*</span></label>
              <input type="text" name="value" className="form-control-esg" placeholder="Numeric or descriptive value" value={form.value} onChange={handleChange} />
            </div>
            <div className="form-group-esg" style={{ marginBottom: 0 }}>
              <label className="form-label-esg">Unit</label>
              <select name="unit" className="form-control-esg" value={form.unit} onChange={handleChange}>
                <option value="">Select unit</option>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group-esg" style={{ marginTop: '1rem' }}>
            <label className="form-label-esg">Description</label>
            <textarea name="description" className="form-control-esg" rows={2} placeholder="Brief description of the metric" value={form.description} onChange={handleChange} />
          </div>
          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="form-group-esg" style={{ marginBottom: 0 }}>
              <label className="form-label-esg">Data Source</label>
              <input type="text" name="dataSource" className="form-control-esg" placeholder="e.g. Utility bills, HR system" value={form.dataSource} onChange={handleChange} />
            </div>
            <div className="form-group-esg" style={{ marginBottom: 0 }}>
              <label className="form-label-esg">Remarks</label>
              <input type="text" name="remarks" className="form-control-esg" placeholder="Additional notes" value={form.remarks} onChange={handleChange} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary-esg" onClick={onClose}>Cancel</button>
          <button className="btn-secondary-esg" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button className="btn-primary-esg" onClick={() => handleSave(true)} disabled={saving}>
            <Send size={14} /> Save & Submit
          </button>
        </div>
      </div>
    </div>
  );
};

// View Record Modal
const ViewModal = ({ record, onClose, onAction, isReviewer, onEdit, onDelete }) => {
  const [comment, setComment] = useState('');
  const [acting, setActing] = useState(false);

  const handleAction = async (action) => {
    setActing(true);
    try { await onAction(record._id, action, comment); onClose(); }
    catch (e) { console.error(e); }
    finally { setActing(false); }
  };

  if (!record) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">ESG Record: {record.metric}</span>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div className="grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
            {[
              ['Category', record.category], ['Metric', record.metric],
              ['Organization', record.organization?.name], ['Period', `${record.reportingPeriod?.year} ${record.reportingPeriod?.quarter !== 'Annual' ? record.reportingPeriod?.quarter : ''}`],
              ['Value', `${record.value} ${record.unit || ''}`], ['Status', null],
              ['Data Source', record.dataSource], ['Description', record.description],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{k}</div>
                {k === 'Status' ? <StatusBadge status={record.status} /> : <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{v || '—'}</div>}
              </div>
            ))}
          </div>
          {record.correctionComment && (
            <div className="alert-esg alert-warning">
              <strong>Correction Comment:</strong> {record.correctionComment}
            </div>
          )}
          {record.reviewComment && (
            <div className="alert-esg alert-info">
              <strong>Review Comment:</strong> {record.reviewComment}
            </div>
          )}
          {record.validationErrors?.length > 0 && (
            <div className="alert-esg alert-danger">
              <strong>Validation Issues:</strong>
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1rem' }}>
                {record.validationErrors.map((e, i) => <li key={i}>{e.message}</li>)}
              </ul>
            </div>
          )}
          {/* Workflow history */}
          {record.workflowHistory?.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>Workflow History</div>
              <div className="workflow-timeline">
                {record.workflowHistory.slice().reverse().map((h, i) => (
                  <div key={i} className="timeline-item">
                    <div className={`timeline-dot ${h.status === 'Approved' ? 'approved' : h.status === 'Correction Required' ? 'correction' : h.status === 'Submitted' ? 'submitted' : 'default'}`}>
                      {h.status === 'Approved' ? '✓' : h.status === 'Correction Required' ? '!' : '→'}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-status">{h.status}</div>
                      <div className="timeline-meta">
                        {h.changedBy?.name || 'System'} • {new Date(h.changedAt).toLocaleString()}
                      </div>
                      {h.comment && <div className="timeline-comment">{h.comment}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isReviewer && (
            <div style={{ marginTop: '1rem' }}>
              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Reviewer Comment</label>
                <textarea
                  className="form-control-esg"
                  rows={2}
                  placeholder="Optional review comment or required correction details..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <button className="btn-secondary-esg" onClick={onClose}>Close</button>
          {onEdit && (
            <button className="btn-secondary-esg" onClick={() => { onEdit(record); onClose(); }}>
              <Edit2 size={13} /> Edit
            </button>
          )}
          {onDelete && (
            <button className="btn-secondary-esg" style={{ color: 'var(--danger)', borderColor: '#FECACA' }} onClick={() => { onDelete(record); onClose(); }}>
              <Trash2 size={13} /> Delete
            </button>
          )}
          {isReviewer && (
            <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary-esg btn-sm"
                onClick={() => handleAction('under_review')}
                disabled={acting}
                title="Mark Under Review"
              >
                Under Review
              </button>
              <button
                type="button"
                className="btn-secondary-esg btn-sm"
                onClick={() => handleAction('validate')}
                disabled={acting}
                title="Validate Record"
              >
                Validate
              </button>
              <button
                type="button"
                className="btn-danger-esg btn-sm"
                onClick={() => {
                  if (!comment.trim()) {
                    alert('Please enter a review comment explaining what correction is needed.');
                    return;
                  }
                  handleAction('correction');
                }}
                disabled={acting}
                title="Request Correction"
              >
                Correction Required
              </button>
              <button
                type="button"
                className="btn-primary-esg btn-sm"
                onClick={() => handleAction('approve')}
                disabled={acting}
                title="Approve Record"
              >
                <CheckCircle2 size={13} /> Approve
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Page ──
const DataCollection = ({ category: fixedCategory, defaultStatus }) => {
  const { isReviewer, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlStatus = searchParams.get('status') || defaultStatus || '';
  const urlYear = searchParams.get('year') || new Date().getFullYear().toString();
  const urlCategory = searchParams.get('category') || fixedCategory || '';
  const urlOrg = searchParams.get('organization') || '';

  const [records, setRecords] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({
    category: urlCategory,
    status: urlStatus,
    year: urlYear,
    organization: urlOrg,
    search: '',
  });

  // Sync state if searchParams change
  useEffect(() => {
    const qStatus = searchParams.get('status') || '';
    const qYear = searchParams.get('year') || new Date().getFullYear().toString();
    const qCategory = searchParams.get('category') || fixedCategory || '';
    const qOrg = searchParams.get('organization') || '';
    setFilters(f => ({
      ...f,
      status: qStatus,
      year: qYear,
      category: qCategory,
      organization: qOrg,
    }));
  }, [searchParams, fixedCategory]);
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);

  const fetchRecords = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 15, ...filters };
      const res = await api.get('/esg', { params });
      setRecords(res.data.data);
      setPagination(res.data.pagination);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => {
    api.get('/organizations', { params: { limit: 100 } }).then(r => setOrganizations(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchRecords(1); }, [filters]);

  const handleDelete = async () => {
    try { await api.delete(`/esg/${deleteTarget._id}`); fetchRecords(); }
    catch (e) { console.error(e); }
    finally { setDeleteTarget(null); }
  };

  const handleSubmit = async (id) => {
    try { await api.put(`/esg/${id}/submit`); fetchRecords(); }
    catch (e) { alert(e.response?.data?.message || 'Submit failed'); }
  };

  const handleReviewAction = async (id, action, comment) => {
    await api.put(`/esg/${id}/review`, { action, comment });
    fetchRecords();
  };

  const pageTitle = fixedCategory ? `${fixedCategory} Reporting` : 'ESG Data Collection';

  return (
    <div className="fade-in">
      <Breadcrumbs items={fixedCategory
        ? [{ label: fixedCategory, path: `/${fixedCategory.toLowerCase()}` }]
        : [{ label: 'ESG Data Collection', path: '/data-collection' }]}
      />

      <div className="page-header">
        <div className="d-flex justify-between align-center">
          <div>
            <h1 className="page-title">{pageTitle}</h1>
            <p className="page-subtitle">Manage ESG records across your organizational scope</p>
          </div>
          <button className="btn-primary-esg" onClick={() => { setEditRecord(null); setShowForm(true); }}>
            <Plus size={16} /> New Record
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-input-wrap">
          <Search size={14} className="search-icon" />
          <input
            placeholder="Search metrics..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </div>
        <select
          className="filter-select"
          value={filters.organization}
          onChange={e => setFilters(f => ({ ...f, organization: e.target.value }))}
        >
          <option value="">All Organizations</option>
          {organizations.map(org => (
            <option key={org._id} value={org._id}>{org.name} ({org.type})</option>
          ))}
        </select>
        {!fixedCategory && (
          <select className="filter-select" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <select className="filter-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Statuses</option>
          <option value="pending">Pending Review (All)</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="filter-select" value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button
          className="btn-secondary-esg btn-sm"
          onClick={() => {
            setSearchParams({});
            setFilters(f => ({
              ...f,
              search: '',
              status: '',
              category: fixedCategory || '',
              year: new Date().getFullYear().toString(),
              organization: '',
            }));
          }}
        >
          Clear
        </button>
      </div>

      {/* Table */}
      {loading ? <LoadingState /> : records.length === 0 ? (
        <div className="esg-card">
          <EmptyState
            icon="📊"
            title="No ESG records found"
            message="Create your first ESG record to start tracking sustainability data."
            action={<button className="btn-primary-esg" onClick={() => setShowForm(true)}><Plus size={14} /> Add Record</button>}
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
                  <th>Period</th>
                  <th>Value / Unit</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r._id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.metric}</div>
                      {r.subcategory && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.subcategory}</div>}
                    </td>
                    <td><StatusBadge status={r.category} /></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.organization?.name || '—'}</td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {r.reportingPeriod?.year}
                      {r.reportingPeriod?.quarter !== 'Annual' && <span style={{ color: 'var(--text-muted)' }}> / {r.reportingPeriod?.quarter}</span>}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{r.value}</span>
                      {r.unit && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> {r.unit}</span>}
                    </td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <button
                          className="btn-secondary-esg btn-sm"
                          style={{ padding: '0.28rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => setViewRecord(r)}
                          title="View Details"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          className="btn-secondary-esg btn-sm"
                          style={{ padding: '0.28rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => { setEditRecord(r); setShowForm(true); }}
                          title="Edit Record"
                        >
                          <Edit2 size={13} />
                        </button>
                        {r.status === 'Draft' && (
                          <button
                            className="btn-primary-esg btn-sm"
                            style={{ padding: '0.28rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => handleSubmit(r._id)}
                            title="Submit Record"
                          >
                            <Send size={12} />
                          </button>
                        )}
                        {isReviewer && (
                          <button
                            className="btn-secondary-esg btn-sm"
                            style={{ padding: '0.28rem 0.5rem', fontSize: '0.75rem', color: '#087F5B', borderColor: '#C3FAE8', background: '#E6FCF5' }}
                            onClick={() => setReviewTarget(r)}
                            title="Approval / Review Actions"
                          >
                            <ShieldCheck size={13} /> Review
                          </button>
                        )}
                        <button
                          className="btn-secondary-esg btn-sm"
                          style={{ padding: '0.28rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: '#FECACA' }}
                          onClick={() => setDeleteTarget(r)}
                          title="Delete Record"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            onPageChange={(p) => fetchRecords(p)}
          />
        </>
      )}

      {showForm && (
        <RecordFormModal
          record={editRecord}
          category={fixedCategory}
          organizations={organizations}
          onClose={() => { setShowForm(false); setEditRecord(null); }}
          onSaved={() => fetchRecords(1)}
        />
      )}

      {viewRecord && (
        <ViewModal
          record={viewRecord}
          isReviewer={isReviewer}
          onClose={() => setViewRecord(null)}
          onAction={handleReviewAction}
          onEdit={(r) => { setEditRecord(r); setShowForm(true); }}
          onDelete={(r) => setDeleteTarget(r)}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Record"
        message={`Delete "${deleteTarget?.metric}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText="Delete"
      />

      {reviewTarget && (
        <ReviewActionModal
          isOpen={!!reviewTarget}
          onClose={() => setReviewTarget(null)}
          title="Review ESG Record"
          recordName={reviewTarget.metric}
          currentStatus={reviewTarget.status}
          initialAction={reviewTarget.status === 'Validated' ? 'approve' : reviewTarget.status === 'Under Review' ? 'validate' : 'under_review'}
          onConfirm={async (action, comment) => {
            await handleReviewAction(reviewTarget._id, action, comment);
            setReviewTarget(null);
          }}
        />
      )}
    </div>
  );
};

export default DataCollection;
