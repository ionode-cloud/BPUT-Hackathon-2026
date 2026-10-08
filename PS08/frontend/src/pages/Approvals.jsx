import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LuCircleCheck as CheckCircle2,
  LuSearch as Search,
  LuShieldCheck as ShieldCheck,
  LuFileText as FileText,
  LuFolderOpen as FolderOpen,
  LuBuilding2 as Building2,
  LuEye as Eye,
  LuDownload as Download,
  LuClock as Clock,
  LuCheck as Check,
  LuX as X,
  LuFile as File,
  LuImage as Image,
  LuSparkles as Sparkles,
  LuZap as Zap,
  LuArrowRight as ArrowRight
} from 'react-icons/lu';
import {
  FiAlertCircle as AlertCircle,
  FiCheckSquare as CheckSquare,
  FiAlertTriangle as AlertTriangle
} from 'react-icons/fi';
import Breadcrumbs from '../components/common/Breadcrumbs';
import StatusBadge from '../components/common/StatusBadge';
import { LoadingState, EmptyState } from '../components/common/States';
import Pagination from '../components/common/Pagination';
import ReviewActionModal from '../components/common/ReviewActionModal';
import ExportDropdown from '../components/common/ExportDropdown';
import DocumentViewModal from '../components/common/DocumentViewModal';
import ESGRecordViewModal from '../components/common/ESGRecordViewModal';
import { exportESGRecordsToExcel, exportESGRecordsToPDF, exportDocumentsToExcel, exportDocumentsToPDF } from '../utils/exportUtils';
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

  // Review Modals & View Modals
  const [reviewModalItem, setReviewModalItem] = useState(null);
  const [reviewDocTarget, setReviewDocTarget] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);
  const [viewESGRecord, setViewESGRecord] = useState(null);

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

  if (user && !isSuperAdmin) {
    return (
      <div className="fade-in">
        <Breadcrumbs items={[{ label: 'Approvals', path: '/approvals' }]} />
        <div className="esg-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', marginTop: '1.5rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(241, 90, 36, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <ShieldCheck size={36} style={{ color: 'var(--primary)' }} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Super Admin Authority Only</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto 1.5rem', fontSize: '0.88rem', lineHeight: 1.5 }}>
            The Approvals and Review sign-off center is strictly restricted to the <strong>Super Admin</strong>. Non-administrative roles do not have permission to review or approve audit records.
          </p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary-esg" style={{ display: 'inline-flex', padding: '0.5rem 1.25rem' }}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <Breadcrumbs items={[{ label: 'Approvals', path: '/approvals' }]} />

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="d-flex justify-between align-center" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
              <h1 className="page-title" style={{ margin: 0 }}>Approvals & Workflow Review</h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.25rem 0.65rem',
                  borderRadius: 99,
                  background: 'rgba(241, 90, 36, 0.12)',
                  color: 'var(--primary)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  border: '1px solid rgba(241, 90, 36, 0.3)',
                }}
              >
                <ShieldCheck size={13} /> Super Admin Authority Active
              </span>
            </div>
            <p className="page-subtitle" style={{ margin: 0 }}>
              Official administrative sign-off center for uploaded documents, ESG metric disclosures, and corporate entities
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <ExportDropdown
              onExportExcel={() => {
                if (activeTab === 'esg') {
                  exportESGRecordsToExcel(records, { status: esgStatus, category: 'All' });
                } else if (activeTab === 'documents') {
                  exportDocumentsToExcel(documents, { status: docStatus });
                }
              }}
              onExportPDF={() => {
                if (activeTab === 'esg') {
                  exportESGRecordsToPDF(records, { status: esgStatus, category: 'All' });
                } else if (activeTab === 'documents') {
                  exportDocumentsToPDF(documents, { status: docStatus });
                }
              }}
              totalRecords={activeTab === 'esg' ? esgPagination.total : activeTab === 'documents' ? docPagination.total : orgs.length}
              label="Download Queue"
            />
          </div>
        </div>
      </div>

      {/* Main Approval Category Tabs (Executive Styled Grid) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {[
          {
            id: 'documents',
            title: 'Uploaded Documents',
            desc: 'Verification evidence & certificates',
            icon: FolderOpen,
            count: docPagination.total,
            color: 'var(--primary)',
            bg: 'rgba(241, 90, 36, 0.12)',
            activeGradient: 'linear-gradient(135deg, #FFF6F2 0%, #FFFFFF 100%)',
          },
          {
            id: 'esg',
            title: 'ESG Metric Records',
            desc: 'Reported sustainability values',
            icon: FileText,
            count: esgPagination.total,
            color: '#0284C7',
            bg: 'rgba(2, 132, 199, 0.12)',
            activeGradient: 'linear-gradient(135deg, #F0F9FF 0%, #FFFFFF 100%)',
          },
          {
            id: 'orgs',
            title: 'Organization Registrations',
            desc: 'Subsidiaries & business entities',
            icon: Building2,
            count: orgs.length,
            color: '#059669',
            bg: 'rgba(5, 150, 105, 0.12)',
            activeGradient: 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)',
          },
          {
            id: 'ai_validation',
            title: 'AI Validation Anomalies',
            desc: 'Auto-detected spikes & outliers',
            icon: Sparkles,
            count: records.filter(r => r.validationStatus === 'Flagged' || r.anomalyDetected).length || 'Audit',
            color: '#7C3AED',
            bg: 'rgba(124, 58, 237, 0.12)',
            activeGradient: 'linear-gradient(135deg, #F5F3FF 0%, #FFFFFF 100%)',
          },
        ].map(item => {
          const Icon = item.icon;
          const isSelected = activeTab === item.id;
          return (
            <div
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSearch(''); }}
              style={{
                cursor: 'pointer',
                borderRadius: 'var(--radius-md)',
                padding: '1.1rem 1.25rem',
                border: isSelected ? `2px solid ${item.color}` : '1.5px solid var(--border)',
                background: isSelected ? item.activeGradient : 'var(--surface)',
                boxShadow: isSelected ? 'var(--shadow-md)' : 'none',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: isSelected ? item.color : item.bg,
                    color: isSelected ? 'white' : item.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Icon size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {item.desc}
                  </div>
                </div>
              </div>
              <span
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: 99,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: isSelected ? item.color : 'var(--bg)',
                  color: isSelected ? 'white' : 'var(--text-secondary)',
                  border: isSelected ? 'none' : '1px solid var(--border)',
                }}
              >
                {item.count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Sub Status Workflow Filter Pills */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          marginBottom: '1.25rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem',
        }}
      >
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '0.35rem', whiteSpace: 'nowrap' }}>
          Workflow Status:
        </span>
        {(activeTab === 'documents' ? DOC_REVIEW_STATUSES : activeTab === 'esg' ? ESG_REVIEW_STATUSES : ORG_REVIEW_STATUSES).map(s => {
          const currentVal = activeTab === 'documents' ? docStatus : activeTab === 'esg' ? esgStatus : orgStatus;
          const isSelected = currentVal === s;
          return (
            <button
              key={s}
              onClick={() => {
                if (activeTab === 'documents') setDocStatus(s);
                else if (activeTab === 'esg') setEsgStatus(s);
                else setOrgStatus(s);
              }}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: 99,
                fontSize: '0.78rem',
                fontWeight: isSelected ? 600 : 500,
                border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: isSelected ? 'var(--primary)' : 'var(--surface)',
                color: isSelected ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'var(--transition)',
              }}
            >
              {s}
            </button>
          );
        })}
      </div>

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
                                <span
                                  style={{ fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}
                                  onClick={() => setViewDoc(doc)}
                                  title="Click to view document details"
                                >
                                  {doc.originalName}
                                </span>
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
                              <button
                                type="button"
                                className="topbar-action-btn"
                                style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                onClick={() => setViewDoc(doc)}
                                title="View Document Details & Preview"
                              >
                                <Eye size={13} />
                              </button>

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
                                    <CheckCircle2 size={13} /> Approve
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
                        <td
                          style={{ fontWeight: 500, cursor: 'pointer', color: 'var(--text-primary)' }}
                          onClick={() => setViewESGRecord(r)}
                          title="Click to view record details"
                        >
                          {r.metric}
                        </td>
                        <td><StatusBadge status={r.category} /></td>
                        <td style={{ fontSize: '0.8rem' }}>{r.organization?.name}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.submittedBy?.name || '—'}</td>
                        <td><span style={{ fontWeight: 600 }}>{r.value}</span> <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{r.unit}</span></td>
                        <td><StatusBadge status={r.status} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn-secondary-esg btn-sm"
                              style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                              onClick={() => setViewESGRecord(r)}
                              title="View Record Details"
                            >
                              <Eye size={12} /> View
                            </button>
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

      {/* TAB 4: AI VALIDATION ANOMALIES QUEUE */}
      {activeTab === 'ai_validation' && (
        <>
          <div
            style={{
              padding: '1.25rem 1.5rem',
              marginBottom: '1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #F5F3FF 0%, #FFFFFF 100%)',
              border: '1.5px solid #DDD6FE',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#7C3AED', fontWeight: 800, fontSize: '1rem' }}>
                <Sparkles size={18} /> AI Anomaly &amp; Outlier Verification Queue
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Maker-Checker verification for records flagged by automated spike detectors and boundary condition checks.
              </div>
            </div>
            <button
              className="btn-primary-esg btn-sm"
              onClick={() => navigate('/validation')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#7C3AED' }}
            >
              Open Full AI Validation Engine <ArrowRight size={13} />
            </button>
          </div>

          {records.length === 0 ? (
            <div className="esg-card">
              <EmptyState
                icon={<CheckCircle2 size={48} style={{ color: '#059669' }} />}
                title="No Critical AI Anomalies Flagged"
                message="All submitted records comply with mathematical bounds, demographic ratios, and variance thresholds."
              />
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table-esg">
                <thead>
                  <tr>
                    <th>Metric &amp; Category</th>
                    <th>Reported Value</th>
                    <th>Reporting Scope</th>
                    <th>AI Evaluation Note</th>
                    <th>Workflow Status</th>
                    <th style={{ textAlign: 'right' }}>Maker-Checker Review</th>
                  </tr>
                </thead>
                <tbody>
                  {records.slice(0, 15).map((r) => {
                    const hasSpike = Number(r.value) > 5000 || r.validationStatus === 'Flagged';
                    return (
                      <tr key={r._id}>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{r.metric}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {r.category} • {r.department || 'General'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: hasSpike ? '#DC2626' : 'var(--text-primary)' }}>
                            {r.value} {r.unit}
                          </div>
                          {hasSpike && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#DC2626', background: '#FEF2F2', padding: '0.1rem 0.35rem', borderRadius: 4 }}>
                              ⚠️ High Variance
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                            {r.projectName || r.organizationName || 'MEIL Infrastructure'}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {r.reportingPeriod?.year} ({r.reportingPeriod?.quarter || 'Annual'})
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.75rem', color: hasSpike ? '#991B1B' : '#059669', background: hasSpike ? '#FEF2F2' : '#F0FDF4', padding: '0.35rem 0.6rem', borderRadius: 6, borderLeft: `3px solid ${hasSpike ? '#DC2626' : '#059669'}` }}>
                            {hasSpike
                              ? 'Unusual historical spike (>100% variance vs prior year baseline)'
                              : '✓ Passed physical range and demographic consistency checks'}
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={r.status} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <button
                              className="btn-icon-esg"
                              title="View Full Record"
                              onClick={() => setViewESGRecord(r)}
                            >
                              <Eye size={14} />
                            </button>
                            {(isReviewer || isSuperAdmin) && (
                              <>
                                <button
                                  className="btn-sm btn-outline-esg"
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', color: '#D97706', borderColor: '#FCD34D' }}
                                  title="Request Correction"
                                  onClick={() => {
                                    setReviewModalItem({ ...r, _preselect: 'correction' });
                                  }}
                                >
                                  Fix
                                </button>
                                <button
                                  className="btn-sm btn-primary-esg"
                                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem', background: '#059669' }}
                                  title="Approve Metric"
                                  onClick={() => {
                                    setReviewModalItem({ ...r, _preselect: 'approve' });
                                  }}
                                >
                                  <Check size={12} /> Approve
                                </button>
                              </>
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

      {/* In-App Document View Modal */}
      {viewDoc && (
        <DocumentViewModal
          doc={viewDoc}
          onClose={() => setViewDoc(null)}
          onReview={(d) => setReviewDocTarget(d)}
        />
      )}

      {/* In-App ESG Record View Modal */}
      {viewESGRecord && (
        <ESGRecordViewModal
          record={viewESGRecord}
          onClose={() => setViewESGRecord(null)}
          onReview={(r) => setReviewModalItem(r)}
          onAction={handleAction}
        />
      )}
    </div>
  );
};

export default Approvals;
