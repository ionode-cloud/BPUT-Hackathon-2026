import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Search, ShieldCheck, FileText, FolderOpen, Building2,
  Eye, Download, AlertCircle, Clock, Check, X, File, Image, CheckSquare
} from 'lucide-react';
import Breadcrumbs from '../components/common/Breadcrumbs';
import StatusBadge from '../components/common/StatusBadge';
import { LoadingState, EmptyState } from '../components/common/States';
import Pagination from '../components/common/Pagination';
import ReviewActionModal from '../components/common/ReviewActionModal';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ESG_REVIEW_STATUSES = ['Pending Review', 'Submitted', 'Under Review', 'Validated', 'Correction Required', 'Approved'];
const DOC_REVIEW_STATUSES = ['Pending Review', 'Submitted', 'Under Review', 'Approved', 'Correction Required', 'All'];
const ORG_REVIEW_STATUSES = ['Pending Approval', 'Submitted', 'Approved', 'All'];

const getFileIcon = (fileType) => {
  if (!fileType) return <File size={16} />;
  if (fileType.startsWith('image/')) return <Image size={16} />;
  if (fileType === 'application/pdf') return <FileText size={16} />;
  return <File size={16} />;
};

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const Approvals = () => {
  const navigate = useNavigate();
  const { isReviewer, isSuperAdmin, user } = useAuth();
  const [activeTab, setActiveTab] = useState('documents'); // 'documents' | 'esg' | 'orgs'

  // ESG Records State
  const [records, setRecords] = useState([]);
  const [esgStatus, setEsgStatus] = useState('Pending Review');
  const [esgPagination, setEsgPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Documents State
  const [documents, setDocuments] = useState([]);
  const [docStatus, setDocStatus] = useState('Pending Review');
  const [docPagination, setDocPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Organizations State
  const [orgs, setOrgs] = useState([]);
  const [orgStatus, setOrgStatus] = useState('Pending Approval');

  // Shared Filters
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Review Modals
  const [reviewModalItem, setReviewModalItem] = useState(null);
  const [reviewDocTarget, setReviewDocTarget] = useState(null);

  // Fetch Organizations list for filter
  useEffect(() => {
    api.get('/organizations', { params: { limit: 100 } })
      .then(r => setOrganizations(r.data.data))
      .catch(() => {});
  }, []);

  // Fetch ESG records
  const fetchRecords = async (page = 1) => {
    setLoading(true);
    try {
      const queryStatus = esgStatus === 'Pending Review' ? 'pending' : esgStatus;
      const params = { page, limit: 15, status: queryStatus, search };
      if (selectedOrg) params.organization = selectedOrg;
      const res = await api.get('/esg', { params });
      setRecords(res.data.data);
      setEsgPagination(res.data.pagination);
    } catch { } finally { setLoading(false); }
  };

  // Fetch Documents
  const fetchDocuments = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 15, search };
      if (docStatus === 'Pending Review') {
        params.status = 'pending';
      } else if (docStatus !== 'All') {
        params.status = docStatus;
      }
      if (selectedOrg) params.organization = selectedOrg;
      const res = await api.get('/documents', { params });
      setDocuments(res.data.data);
      setDocPagination(res.data.pagination);
    } catch { } finally { setLoading(false); }
  };

  // Fetch Organizations
  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/organizations', { params: { limit: 100 } });
      setOrgs(res.data.data);
    } catch { } finally { setLoading(false); }
  };

  // Trigger appropriate fetch based on active tab
  useEffect(() => {
    if (activeTab === 'esg') fetchRecords(1);
    else if (activeTab === 'documents') fetchDocuments(1);
    else if (activeTab === 'orgs') fetchOrgs();
  }, [activeTab, esgStatus, docStatus, orgStatus, search, selectedOrg]);

  // Handle ESG record review
  const handleAction = async (id, action, comment = '') => {
    try {
      await api.put(`/esg/${id}/review`, { action, comment });
      fetchRecords(esgPagination.page);
    } catch (err) {
      alert(err.response?.data?.message || 'ESG review action failed');
    }
  };

  // Handle Document review & approval
  const handleReviewDoc = async (docId, action, comment = '') => {
    try {
      await api.put(`/documents/${docId}/review`, { action, comment });
      fetchDocuments(docPagination.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Document review action failed');
    }
  };

  // Handle Organization approval & verification
  const handleApproveOrg = async (orgId, action = 'approve', comment = '') => {
    try {
      await api.put(`/organizations/${orgId}/approve`, { action, comment });
      fetchOrgs();
    } catch (err) {
      alert(err.response?.data?.message || 'Organization approval failed');
    }
  };

  const handleVerifyOrg = async (orgId, action = 'verify', comment = '') => {
    try {
      await api.put(`/organizations/${orgId}/verify`, { action, comment });
      fetchOrgs();
    } catch (err) {
      alert(err.response?.data?.message || 'Organization verification failed');
    }
  };

  const filteredOrgs = orgs.filter(o => {
    if (orgStatus === 'Pending Approval') return o.status === 'Submitted' || o.verificationStatus !== 'Verified';
    if (orgStatus === 'Submitted') return o.status === 'Submitted';
    if (orgStatus === 'Approved') return o.status === 'Approved' || o.status === 'Active';
    return true;
  });

  return (
    <div className="fade-in">
      <Breadcrumbs items={[{ label: 'Approvals', path: '/approvals' }]} />

      {/* Administrative Compliance Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          className="btn-secondary-esg"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.45rem',
            padding: '0.5rem 1rem', fontSize: '0.84rem', fontWeight: 700,
            background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)',
          }}
        >
          <CheckCircle2 size={15} /> Approvals
        </button>
        <button
          onClick={() => navigate('/documents')}
          className="btn-secondary-esg"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.45rem',
            padding: '0.5rem 1rem', fontSize: '0.84rem', fontWeight: 500,
            background: 'var(--surface)', color: 'var(--text-primary)',
          }}
        >
          <FolderOpen size={15} style={{ color: 'var(--primary)' }} /> Documents
        </button>
        <button
          onClick={() => navigate('/organizations')}
          className="btn-secondary-esg"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.45rem',
            padding: '0.5rem 1rem', fontSize: '0.84rem', fontWeight: 500,
            background: 'var(--surface)', color: 'var(--text-primary)',
          }}
        >
          <Building2 size={15} style={{ color: 'var(--success, #059669)' }} /> Organizations
        </button>
        <button
          onClick={() => navigate('/validation')}
          className="btn-secondary-esg"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.45rem',
            padding: '0.5rem 1rem', fontSize: '0.84rem', fontWeight: 500,
            background: 'var(--surface)', color: 'var(--text-primary)',
          }}
        >
          <CheckSquare size={15} style={{ color: '#0284C7' }} /> Validation
        </button>
      </div>

      <div className="page-header">
        <div className="d-flex justify-between align-center" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 className="page-title">Approvals & Workflow Review</h1>
            <p className="page-subtitle">
              Administrator sign-off center for uploaded documents, ESG records, and organizational registrations
            </p>
          </div>
          {isSuperAdmin && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.85rem',
                borderRadius: 99,
                background: 'rgba(241, 90, 36, 0.12)',
                color: 'var(--primary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: '1px solid rgba(241, 90, 36, 0.25)',
              }}
            >
              <ShieldCheck size={14} /> Super Admin Approval Authority Active
            </span>
          )}
        </div>
      </div>

      {/* Main Approval Hub Category Switcher */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          className={`btn-secondary-esg ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => { setActiveTab('documents'); setSearch(''); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1.1rem',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'documents' ? 700 : 500,
            background: activeTab === 'documents' ? 'var(--primary)' : 'var(--surface)',
            color: activeTab === 'documents' ? 'white' : 'var(--text-primary)',
            borderColor: activeTab === 'documents' ? 'var(--primary)' : 'var(--border)',
          }}
        >
          <FolderOpen size={16} />
          <span>Uploaded Documents Approval</span>
          {activeTab === 'documents' && docPagination.total > 0 && (
            <span style={{ background: 'rgba(255,255,255,0.25)', color: 'white', padding: '0.1rem 0.45rem', borderRadius: 99, fontSize: '0.72rem' }}>
              {docPagination.total}
            </span>
          )}
        </button>

        <button
          className={`btn-secondary-esg ${activeTab === 'esg' ? 'active' : ''}`}
          onClick={() => { setActiveTab('esg'); setSearch(''); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1.1rem',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'esg' ? 700 : 500,
            background: activeTab === 'esg' ? 'var(--primary)' : 'var(--surface)',
            color: activeTab === 'esg' ? 'white' : 'var(--text-primary)',
            borderColor: activeTab === 'esg' ? 'var(--primary)' : 'var(--border)',
          }}
        >
          <FileText size={16} />
          <span>ESG Data Records</span>
          {activeTab === 'esg' && esgPagination.total > 0 && (
            <span style={{ background: 'rgba(255,255,255,0.25)', color: 'white', padding: '0.1rem 0.45rem', borderRadius: 99, fontSize: '0.72rem' }}>
              {esgPagination.total}
            </span>
          )}
        </button>

        <button
          className={`btn-secondary-esg ${activeTab === 'orgs' ? 'active' : ''}`}
          onClick={() => { setActiveTab('orgs'); setSearch(''); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1.1rem',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'orgs' ? 700 : 500,
            background: activeTab === 'orgs' ? 'var(--primary)' : 'var(--surface)',
            color: activeTab === 'orgs' ? 'white' : 'var(--text-primary)',
            borderColor: activeTab === 'orgs' ? 'var(--primary)' : 'var(--border)',
          }}
        >
          <Building2 size={16} />
          <span>Organization Registrations</span>
        </button>
      </div>

      {/* Sub Status Tabs */}
      {activeTab === 'documents' && (
        <div className="tabs-esg" style={{ marginBottom: '1.25rem' }}>
          {DOC_REVIEW_STATUSES.map(s => (
            <button
              key={s}
              className={`tab-btn ${docStatus === s ? 'active' : ''}`}
              onClick={() => setDocStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'esg' && (
        <div className="tabs-esg" style={{ marginBottom: '1.25rem' }}>
          {ESG_REVIEW_STATUSES.map(s => (
            <button
              key={s}
              className={`tab-btn ${esgStatus === s ? 'active' : ''}`}
              onClick={() => setEsgStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'orgs' && (
        <div className="tabs-esg" style={{ marginBottom: '1.25rem' }}>
          {ORG_REVIEW_STATUSES.map(s => (
            <button
              key={s}
              className={`tab-btn ${orgStatus === s ? 'active' : ''}`}
              onClick={() => setOrgStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Filters Bar */}
      <div className="filters-bar" style={{ marginBottom: '1.25rem' }}>
        <div className="search-input-wrap">
          <Search size={14} className="search-icon" />
          <input
            placeholder={
              activeTab === 'documents' ? 'Search documents by filename...' :
              activeTab === 'esg' ? 'Search ESG metrics...' : 'Search organizations...'
            }
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
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

      {/* TAB 1: UPLOADED DOCUMENTS APPROVAL */}
      {activeTab === 'documents' && (
        <>
          {loading ? <LoadingState text="Loading documents for review..." /> : documents.length === 0 ? (
            <div className="esg-card">
              <EmptyState
                icon={<FolderOpen size={48} />}
                title={`No documents found in ${docStatus}`}
                message="All documents in this workflow status have been processed, or none match your filters."
              />
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="table-esg">
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Category</th>
                      <th>Organization</th>
                      <th>Uploaded By</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map(doc => {
                      const isApproved = doc.status === 'Approved';
                      return (
                        <tr key={doc._id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <div style={{ color: 'var(--primary)', flexShrink: 0 }}>
                                {getFileIcon(doc.fileType)}
                              </div>
                              <div>
                                <a
                                  href={doc.cloudinaryUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}
                                  title="Click to view file"
                                >
                                  {doc.originalName}
                                </a>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {formatSize(doc.fileSize)} {doc.reportingPeriod?.year ? `• FY ${doc.reportingPeriod.year}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.78rem', padding: '0.2rem 0.55rem', background: 'var(--bg)', borderRadius: 99, border: '1px solid var(--border)', fontWeight: 500 }}>
                              {doc.category}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {doc.organization?.name || '—'}
                          </td>
                          <td>
                            <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>{doc.uploadedBy?.name || '—'}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{doc.uploadedBy?.role || ''}</div>
                          </td>
                          <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <StatusBadge status={doc.status || 'Submitted'} />
                            {doc.approvedBy && (
                              <div style={{ fontSize: '0.7rem', color: '#059669', marginTop: '0.2rem' }}>
                                ✓ by {doc.approvedBy.name}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              <a
                                href={doc.cloudinaryUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="topbar-action-btn"
                                style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Open / Download Document"
                              >
                                <Eye size={13} />
                              </a>

                              {!isApproved ? (
                                isSuperAdmin ? (
                                  <button
                                    className="btn-primary-esg btn-sm"
                                    style={{
                                      padding: '0.25rem 0.65rem',
                                      fontSize: '0.75rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      background: '#059669',
                                      borderColor: '#059669'
                                    }}
                                    onClick={() => handleReviewDoc(doc._id, 'approve', 'Approved by Super Admin')}
                                    title="Grant Super Admin Official Approval"
                                  >
                                    <CheckCircle2 size={13} /> Approve (Super Admin)
                                  </button>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: '0.72rem',
                                      color: '#B45309',
                                      background: '#FEF3C7',
                                      padding: '0.2rem 0.5rem',
                                      borderRadius: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      fontWeight: 600
                                    }}
                                    title="Only Super Admin has authority to grant final approval"
                                  >
                                    <Clock size={11} /> Super Admin Approval Required
                                  </span>
                                )
                              ) : (
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    color: '#059669',
                                    background: 'rgba(5, 150, 105, 0.12)',
                                    border: '1px solid rgba(5, 150, 105, 0.25)',
                                    padding: '0.2rem 0.55rem',
                                    borderRadius: 99,
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}
                                >
                                  <Check size={12} /> Approved by Super Admin
                                </span>
                              )}

                              <button
                                className="btn-secondary-esg btn-sm"
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                                onClick={() => setReviewDocTarget(doc)}
                                title="Review & Workflow Options"
                              >
                                <ShieldCheck size={12} /> Workflow
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={docPagination.page}
                pages={docPagination.pages}
                total={docPagination.total}
                onPageChange={p => fetchDocuments(p)}
              />
            </>
          )}
        </>
      )}

      {/* TAB 2: ESG DATA RECORDS APPROVAL */}
      {activeTab === 'esg' && (
        <>
          {loading ? <LoadingState text="Loading ESG records..." /> : records.length === 0 ? (
            <div className="esg-card">
              <EmptyState
                icon={<CheckCircle2 size={48} />}
                title={`No records with status: ${esgStatus}`}
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

                            {r.status !== 'Approved' && (
                              isSuperAdmin ? (
                                <button
                                  className="btn-primary-esg btn-sm"
                                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', background: '#059669', borderColor: '#059669' }}
                                  onClick={() => handleAction(r._id, 'approve')}
                                  title="Approve as Super Admin"
                                >
                                  <CheckCircle2 size={12} /> Approve (Super Admin)
                                </button>
                              ) : (
                                <span
                                  style={{ fontSize: '0.72rem', color: '#B45309', background: '#FEF3C7', padding: '0.2rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}
                                  title="Requires Super Admin approval"
                                >
                                  <Clock size={11} /> Super Admin Required
                                </span>
                              )
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
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={esgPagination.page}
                pages={esgPagination.pages}
                total={esgPagination.total}
                onPageChange={p => fetchRecords(p)}
              />
            </>
          )}
        </>
      )}

      {/* TAB 3: ORGANIZATION REGISTRATIONS APPROVAL */}
      {activeTab === 'orgs' && (
        <>
          {loading ? <LoadingState text="Loading organizations..." /> : filteredOrgs.length === 0 ? (
            <div className="esg-card">
              <EmptyState
                icon={<Building2 size={48} />}
                title="No organizations awaiting action"
                message="All organizations have been reviewed and approved."
              />
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table-esg">
                <thead>
                  <tr>
                    <th>Organization Name</th>
                    <th>Type</th>
                    <th>Parent Unit</th>
                    <th>Location</th>
                    <th>CIN / Identification</th>
                    <th>Approval Status</th>
                    <th>Verification</th>
                    <th>Admin Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrgs.map(o => {
                    const isApproved = o.status === 'Approved' || o.status === 'Active';
                    const isVerified = o.verificationStatus === 'Verified';

                    return (
                      <tr key={o._id}>
                        <td style={{ fontWeight: 600 }}>{o.name}</td>
                        <td>
                          <span className="org-type-badge">{o.type}</span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{o.parent?.name || '—'}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {[o.location?.city, o.location?.state].filter(Boolean).join(', ') || '—'}
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>{o.cin || o.gstin || '—'}</td>
                        <td>
                          <StatusBadge status={o.status || 'Submitted'} />
                          {o.approvedBy && (
                            <div style={{ fontSize: '0.7rem', color: '#059669', marginTop: '0.2rem' }}>
                              ✓ by {o.approvedBy.name}
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.72rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: 99,
                              background: isVerified ? 'rgba(5, 150, 105, 0.12)' : 'rgba(241, 90, 36, 0.1)',
                              color: isVerified ? '#059669' : '#F15A24',
                              fontWeight: 600,
                              border: isVerified ? '1px solid rgba(5, 150, 105, 0.25)' : '1px solid rgba(241, 90, 36, 0.25)',
                            }}
                          >
                            <ShieldCheck size={12} /> {o.verificationStatus || 'Pending Verification'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            {!isApproved && (
                              isSuperAdmin ? (
                                <button
                                  className="btn-primary-esg btn-sm"
                                  style={{ background: '#059669', borderColor: '#059669', padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                  onClick={() => handleApproveOrg(o._id, 'approve')}
                                  title="Grant Super Admin Approval"
                                >
                                  <CheckCircle2 size={13} /> Approve (Super Admin)
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.72rem', color: '#B45309', background: '#FEF3C7', padding: '0.2rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                                  <Clock size={11} /> Super Admin Required
                                </span>
                              )
                            )}

                            {!isVerified && (
                              isSuperAdmin ? (
                                <button
                                  className="btn-primary-esg btn-sm"
                                  style={{ background: '#0284C7', borderColor: '#0284C7', padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                  onClick={() => handleVerifyOrg(o._id, 'verify')}
                                  title="Verify Corporate Identity & CIN"
                                >
                                  <ShieldCheck size={13} /> Verify
                                </button>
                              ) : null
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ESG Review Modal */}
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

      {/* Document Review Action Modal */}
      {reviewDocTarget && (
        <ReviewActionModal
          isOpen={!!reviewDocTarget}
          onClose={() => setReviewDocTarget(null)}
          title="Uploaded Document Evidence Approval"
          recordName={reviewDocTarget.originalName}
          currentStatus={reviewDocTarget.status || 'Submitted'}
          initialAction={reviewDocTarget.status === 'Approved' ? 'validate' : 'approve'}
          onConfirm={async (action, comment) => {
            await handleReviewDoc(reviewDocTarget._id, action, comment);
            setReviewDocTarget(null);
          }}
        />
      )}
    </div>
  );
};

export default Approvals;
