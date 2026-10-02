import { useState, useEffect } from 'react';
import { Plus, FileText, RefreshCw, CheckCircle2, AlertCircle, X, Eye, ShieldCheck } from 'lucide-react';
import Breadcrumbs from '../components/common/Breadcrumbs';
import StatusBadge from '../components/common/StatusBadge';
import { LoadingState, EmptyState } from '../components/common/States';
import Pagination from '../components/common/Pagination';
import ReviewActionModal from '../components/common/ReviewActionModal';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const YEARS = [];
for (let y = 2020; y <= new Date().getFullYear() + 1; y++) YEARS.push(y.toString());

const BRSR_SECTIONS = [
  'Section A: General Disclosures',
  'Section B: Management and Process Disclosures',
  'Section C: Principle-wise Performance Disclosures',
  'Principle 1: Ethics and Transparency',
  'Principle 2: Sustainable Products and Services',
  'Principle 3: Employee Well-being',
  'Principle 4: Stakeholder Interests',
  'Principle 5: Human Rights',
  'Principle 6: Environmental Responsibility',
  'Principle 7: Policy Advocacy',
  'Principle 8: Inclusive Growth',
  'Principle 9: Consumer Responsibility',
];

const BRSR = () => {
  const { isReviewer } = useAuth();
  const [reports, setReports] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewReport, setViewReport] = useState(null);
  const [generating, setGenerating] = useState(null);
  const [reviewReportTarget, setReviewReportTarget] = useState(null);
  const [viewReportComment, setViewReportComment] = useState('');
  const [acting, setActing] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ organization: '', year: '', status: '' });
  const [form, setForm] = useState({ title: '', organization: '', year: new Date().getFullYear().toString(), fromDate: '', toDate: '' });
  const [formError, setFormError] = useState('');

  const handleReviewReport = async (reportId, action, comment) => {
    setActing(true);
    try {
      const res = await api.put(`/brsr/${reportId}/review`, { action, comment });
      fetchReports();
      if (viewReport && viewReport._id === reportId) {
        setViewReport(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Report review action failed');
    } finally {
      setActing(false);
    }
  };

  const fetchReports = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (filters.organization) params.organization = filters.organization;
      if (filters.year) params.year = filters.year;
      if (filters.status) params.status = filters.status;
      const res = await api.get('/brsr', { params });
      setReports(res.data.data);
      setPagination(res.data.pagination);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => {
    api.get('/organizations', { params: { limit: 100 } }).then(r => setOrgs(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchReports(1);
  }, [filters]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.organization || !form.year) { setFormError('Title, Organization, and Year are required.'); return; }
    try {
      await api.post('/brsr', form);
      setShowForm(false);
      setForm({ title: '', organization: '', year: new Date().getFullYear().toString(), fromDate: '', toDate: '' });
      fetchReports();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Create failed');
    }
  };

  const handleGenerate = async (reportId) => {
    setGenerating(reportId);
    try {
      const res = await api.post('/reports/generate', { reportId });
      setViewReport(res.data.data);
      fetchReports();
    } catch (err) {
      alert(err.response?.data?.message || 'Generation failed');
    } finally { setGenerating(null); }
  };

  return (
    <div className="fade-in">
      <Breadcrumbs items={[{ label: 'BRSR Reporting', path: '/brsr' }]} />
      <div className="page-header">
        <div className="d-flex justify-between align-center">
          <div>
            <h1 className="page-title">BRSR Reporting</h1>
            <p className="page-subtitle">SEBI BRSR 2023-24 — Map ESG data to reporting sections</p>
          </div>
          {isReviewer && (
            <button className="btn-primary-esg" onClick={() => setShowForm(true)}>
              <Plus size={15} /> New Report
            </button>
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="info-box" style={{ marginBottom: '1rem' }}>
        ℹ BRSR reports are generated from <strong>Approved</strong> ESG records only. Create a report, then generate it to map approved data across SEBI BRSR sections.
      </div>

      {/* Filters Bar */}
      <div className="filters-bar" style={{ marginBottom: '1.25rem' }}>
        <select
          className="filter-select"
          value={filters.organization}
          onChange={e => setFilters(f => ({ ...f, organization: e.target.value }))}
        >
          <option value="">All Organizations</option>
          {orgs.map(o => (
            <option key={o._id} value={o._id}>{o.name} ({o.type})</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={filters.year}
          onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}
        >
          <option value="">All Years</option>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          className="filter-select"
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="In Progress">In Progress</option>
          <option value="Under Review">Under Review</option>
          <option value="Validated">Validated</option>
          <option value="Correction Required">Correction Required</option>
          <option value="Approved">Approved</option>
        </select>
        <button
          className="btn-secondary-esg btn-sm"
          onClick={() => setFilters({ organization: '', year: '', status: '' })}
        >
          Clear
        </button>
      </div>

      {loading ? <LoadingState /> : reports.length === 0 ? (
        <div className="esg-card">
          <EmptyState
            icon={<FileText size={48} />}
            title="No BRSR reports yet"
            message="Create a new BRSR report to begin mapping your ESG data."
            action={isReviewer && <button className="btn-primary-esg" onClick={() => setShowForm(true)}><Plus size={14} /> Create Report</button>}
          />
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reports.map(r => (
              <div key={r._id} className="esg-card" style={{ padding: '1.25rem' }}>
                <div className="d-flex justify-between align-center" style={{ marginBottom: '0.875rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{r.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {r.organization?.name} • Year {r.reportingPeriod?.year} • Ref: {r.brsrReference}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <StatusBadge status={r.status} />
                    <button className="btn-secondary-esg btn-sm" onClick={() => { setViewReport(r); setViewReportComment(''); }}><Eye size={12} /> View</button>
                    {isReviewer && (
                      <>
                        <button
                          className="btn-secondary-esg btn-sm"
                          style={{ color: '#087F5B', borderColor: '#C3FAE8', background: '#E6FCF5' }}
                          onClick={() => setReviewReportTarget(r)}
                          title="Review & Workflow Action"
                        >
                          <ShieldCheck size={12} /> Review
                        </button>
                        <button
                          className="btn-primary-esg btn-sm"
                          onClick={() => handleGenerate(r._id)}
                          disabled={generating === r._id}
                        >
                          <RefreshCw size={12} /> {generating === r._id ? 'Generating...' : 'Generate'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div className="d-flex justify-between align-center" style={{ marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Overall Completion</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>{r.overallCompletionPercentage}%</span>
                  </div>
                  <div className="progress-esg">
                    <div className={`progress-bar-esg ${r.overallCompletionPercentage >= 80 ? 'success' : ''}`}
                      style={{ width: `${r.overallCompletionPercentage}%` }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {(r.sections || []).slice(0, 6).map(s => (
                    <div key={s.sectionName} style={{
                      background: s.isComplete ? 'var(--success-bg)' : 'var(--bg)',
                      border: `1px solid ${s.isComplete ? 'var(--success)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.625rem',
                      fontSize: '0.72rem', color: s.isComplete ? 'var(--success)' : 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', gap: '0.25rem',
                    }}>
                      {s.isComplete ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                      {s.sectionName?.replace('Section ', '').replace('Principle', 'P').slice(0, 20)}
                    </div>
                  ))}
                  {(r.sections || []).length > 6 && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0.25rem' }}>
                      +{r.sections.length - 6} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPageChange={p => fetchReports(p)} />
        </>
      )}

      {/* Create Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Create BRSR Report</span>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={14} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {formError && <div className="alert-esg alert-danger">{formError}</div>}
                <div className="form-group-esg">
                  <label className="form-label-esg">Report Title <span className="required">*</span></label>
                  <input type="text" className="form-control-esg" placeholder="e.g. BRSR Report FY 2024-25" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="form-group-esg">
                  <label className="form-label-esg">Organization <span className="required">*</span></label>
                  <select className="form-control-esg" value={form.organization} onChange={e => setForm(f => ({ ...f, organization: e.target.value }))}>
                    <option value="">Select organization</option>
                    {orgs.map(o => <option key={o._id} value={o._id}>{o.name} ({o.type})</option>)}
                  </select>
                </div>
                <div className="grid-2" style={{ gap: '1rem' }}>
                  <div className="form-group-esg" style={{ marginBottom: 0 }}>
                    <label className="form-label-esg">Reporting Year <span className="required">*</span></label>
                    <select className="form-control-esg" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="form-group-esg" style={{ marginBottom: 0 }}>
                    <label className="form-label-esg">From Date</label>
                    <input type="date" className="form-control-esg" value={form.fromDate} onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary-esg" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary-esg">Create Report</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Report Modal */}
      {viewReport && (
        <div className="modal-overlay" onClick={() => setViewReport(null)}>
          <div className="modal-box modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{viewReport.title}</span>
              <button className="modal-close" onClick={() => setViewReport(null)}><X size={14} /></button>
            </div>
            <div className="modal-body">
              <div className="d-flex justify-between align-center" style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {viewReport.organization?.name} • FY {viewReport.reportingPeriod?.year} • Ref: {viewReport.brsrReference}
                </div>
                <StatusBadge status={viewReport.status} />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <div className="d-flex justify-between" style={{ marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Overall Completion</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{viewReport.overallCompletionPercentage}%</span>
                </div>
                <div className="progress-esg" style={{ height: 12 }}>
                  <div className={`progress-bar-esg ${viewReport.overallCompletionPercentage >= 80 ? 'success' : ''}`}
                    style={{ width: `${viewReport.overallCompletionPercentage}%` }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {(viewReport.sections || BRSR_SECTIONS.map(s => ({ sectionName: s, completionPercentage: 0, isComplete: false, missingFields: [] }))).map((s, i) => (
                  <div key={i} className="brsr-section-card">
                    <div className="brsr-section-name">{s.sectionName}</div>
                    <div className="brsr-section-progress">
                      <div className="brsr-pct">{s.completionPercentage || 0}%</div>
                      <div className="progress-esg" style={{ flex: 1 }}>
                        <div
                          className={`progress-bar-esg ${s.isComplete ? 'success' : ''}`}
                          style={{ width: `${s.completionPercentage || 0}%` }}
                        />
                      </div>
                      {s.isComplete ? <CheckCircle2 size={14} style={{ color: 'var(--success)', flexShrink: 0 }} /> : <AlertCircle size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                    </div>
                    {s.missingFields?.length > 0 && (
                      <div className="missing-fields-list">
                        Missing: {s.missingFields.join(', ')}
                      </div>
                    )}
                    {s.linkedRecords?.length > 0 && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--success)', marginTop: '0.25rem' }}>
                        {s.linkedRecords.length} approved record{s.linkedRecords.length > 1 ? 's' : ''} mapped
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {viewReport.correctionComment && (
                <div className="alert-esg alert-danger" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
                  <strong>Correction Required:</strong> {viewReport.correctionComment}
                </div>
              )}
              {viewReport.reviewComment && (
                <div className="alert-esg alert-info" style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                  <strong>Review Comment:</strong> {viewReport.reviewComment}
                </div>
              )}
              {isReviewer && (
                <div style={{ marginTop: '1rem' }}>
                  <label className="form-label-esg">Reviewer Notes / Instructions</label>
                  <textarea
                    className="form-control-esg"
                    rows={2}
                    placeholder="Enter review feedback, verification notes, or correction details..."
                    value={viewReportComment}
                    onChange={e => setViewReportComment(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              <button className="btn-secondary-esg" onClick={() => setViewReport(null)}>Close</button>
              {isReviewer && (
                <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
                  <button
                    className="btn-primary-esg btn-sm"
                    onClick={() => handleGenerate(viewReport._id)}
                    disabled={generating === viewReport._id || acting}
                    title="Generate / update report with approved records"
                  >
                    <RefreshCw size={12} /> {generating === viewReport._id ? 'Generating...' : 'Regenerate'}
                  </button>
                  <button
                    className="btn-secondary-esg btn-sm"
                    onClick={() => handleReviewReport(viewReport._id, 'under_review', viewReportComment)}
                    disabled={acting}
                  >
                    Under Review
                  </button>
                  <button
                    className="btn-secondary-esg btn-sm"
                    onClick={() => handleReviewReport(viewReport._id, 'validate', viewReportComment)}
                    disabled={acting}
                  >
                    Validate
                  </button>
                  <button
                    className="btn-danger-esg btn-sm"
                    onClick={() => {
                      if (!viewReportComment.trim()) {
                        alert('Please enter a review comment specifying what correction is needed.');
                        return;
                      }
                      handleReviewReport(viewReport._id, 'correction', viewReportComment);
                    }}
                    disabled={acting}
                  >
                    Correction Required
                  </button>
                  <button
                    className="btn-primary-esg btn-sm"
                    onClick={() => handleReviewReport(viewReport._id, 'approve', viewReportComment)}
                    disabled={acting}
                  >
                    <CheckCircle2 size={12} /> Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {reviewReportTarget && (
        <ReviewActionModal
          isOpen={!!reviewReportTarget}
          onClose={() => setReviewReportTarget(null)}
          title="Review BRSR Report"
          recordName={reviewReportTarget.title}
          currentStatus={reviewReportTarget.status}
          initialAction={reviewReportTarget.status === 'Validated' ? 'approve' : reviewReportTarget.status === 'Under Review' ? 'validate' : 'under_review'}
          onConfirm={async (action, comment) => {
            await handleReviewReport(reviewReportTarget._id, action, comment);
            setReviewReportTarget(null);
          }}
        />
      )}
    </div>
  );
};

export default BRSR;
