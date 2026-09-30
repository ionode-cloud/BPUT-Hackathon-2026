import { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Eye, X, File, FileText, Image, Search, ShieldCheck, Building2, Layers, List } from 'lucide-react';
import Breadcrumbs from '../components/common/Breadcrumbs';
import StatusBadge from '../components/common/StatusBadge';
import { LoadingState, EmptyState } from '../components/common/States';
import Pagination from '../components/common/Pagination';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ReviewActionModal from '../components/common/ReviewActionModal';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  'ESG Evidence',
  'Policy Document',
  'Audit Report',
  'Financial Data',
  'Environmental Certificate',
  'Safety Record',
  'Community Report',
  'Board Document',
  'Other',
];

const getFileIcon = (fileType) => {
  if (!fileType) return <File size={20} />;
  if (fileType.startsWith('image/')) return <Image size={20} />;
  if (fileType === 'application/pdf') return <FileText size={20} />;
  return <File size={20} />;
};

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const Documents = () => {
  const { isReviewer, user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ category: '', organization: '', search: '', status: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reviewDocTarget, setReviewDocTarget] = useState(null);
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' | 'list'
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ category: 'ESG Evidence', description: '', organization: '' });
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();

  const handleReviewDoc = async (docId, action, comment) => {
    try {
      await api.put(`/documents/${docId}/review`, { action, comment });
      fetchDocs();
    } catch (err) {
      alert(err.response?.data?.message || 'Document review action failed');
    }
  };

  const fetchDocs = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/documents', { params: { page, limit: 50, ...filters } });
      setDocuments(res.data.data);
      setPagination(res.data.pagination);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => {
    api.get('/organizations', { params: { limit: 100 } }).then(r => setOrganizations(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchDocs(1); }, [filters]);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', uploadForm.category);
      formData.append('description', uploadForm.description);
      if (uploadForm.organization) formData.append('organization', uploadForm.organization);
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchDocs(1);
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/documents/${deleteTarget._id}`);
      fetchDocs();
    } catch { }
    finally { setDeleteTarget(null); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  // Group documents by organization
  const groupedByOrg = documents.reduce((acc, doc) => {
    const orgId = doc.organization?._id || 'general';
    const orgName = doc.organization?.name || 'General / Group Wide';
    const orgType = doc.organization?.type || 'Group';
    if (!acc[orgId]) {
      acc[orgId] = { orgId, orgName, orgType, docs: [] };
    }
    acc[orgId].docs.push(doc);
    return acc;
  }, {});

  const renderDocCard = (doc) => (
    <div key={doc._id} className="file-item" style={{ alignItems: 'flex-start' }}>
      <div className="file-icon" style={{ color: 'var(--primary)', marginTop: '0.2rem' }}>
        {getFileIcon(doc.fileType)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
          <span className="file-name" style={{ fontWeight: 600 }}>{doc.originalName}</span>
          {doc.organization && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
              background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE',
              padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600
            }}>
              <Building2 size={11} /> {doc.organization?.name} {doc.organization?.type ? `(${doc.organization.type})` : ''}
            </span>
          )}
          <StatusBadge status={doc.status || 'Approved'} />
        </div>
        <div className="file-meta">
          <strong>{doc.category}</strong> • {formatSize(doc.fileSize)} • Uploaded by {doc.uploadedBy?.name || '?'} • {new Date(doc.createdAt).toLocaleDateString()}
        </div>
        {doc.description && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.35 }}>
            {doc.description}
          </div>
        )}
        {doc.correctionComment && (
          <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.35rem', background: 'var(--danger-bg)', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
            ⚠️ <strong>Correction Required:</strong> {doc.correctionComment}
          </div>
        )}
        {doc.reviewComment && (
          <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.35rem', background: '#F0F9FF', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
            ℹ️ <strong>Review Comment:</strong> {doc.reviewComment}
          </div>
        )}
        {doc.relatedESGRecord && (
          <div style={{ fontSize: '0.72rem', color: 'var(--accent)', marginTop: '0.2rem' }}>
            Linked to ESG Metric: <strong>{doc.relatedESGRecord.metric}</strong>
          </div>
        )}
        {doc.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
            {doc.tags.map((t, idx) => (
              <span key={idx} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '3px', fontSize: '0.68rem', padding: '0.1rem 0.35rem', color: 'var(--text-muted)' }}>
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="file-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        {isReviewer && (
          <button
            className="btn-secondary-esg btn-sm"
            style={{ padding: '0.28rem 0.6rem', fontSize: '0.75rem', color: '#087F5B', borderColor: '#C3FAE8', background: '#E6FCF5' }}
            onClick={() => setReviewDocTarget(doc)}
            title="Review & Workflow Action (Approve, Validate, Correction, Under Review)"
          >
            <ShieldCheck size={12} /> Review
          </button>
        )}
        <a
          href={doc.cloudinaryUrl}
          target="_blank"
          rel="noreferrer"
          className="topbar-action-btn"
          style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="View / Download"
        >
          <Eye size={13} />
        </a>
        <button
          className="topbar-action-btn"
          style={{ width: 30, height: 30, color: 'var(--danger)', borderColor: 'var(--danger)' }}
          onClick={() => setDeleteTarget(doc)}
          title="Delete Document"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      <Breadcrumbs items={[{ label: 'Documents', path: '/documents' }]} />
      <div className="page-header">
        <div className="d-flex justify-between align-center" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title">Document Management</h1>
            <p className="page-subtitle">Manage, review, validate, and access compliance evidence by Organization</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>View Mode:</span>
              <div className="tabs-esg" style={{ marginBottom: 0 }}>
                <button
                  className={`tab-btn ${viewMode === 'grouped' ? 'active' : ''}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                  onClick={() => setViewMode('grouped')}
                >
                  <Layers size={13} style={{ marginRight: '0.3rem' }} /> By Organization
                </button>
                <button
                  className={`tab-btn ${viewMode === 'list' ? 'active' : ''}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                  onClick={() => setViewMode('list')}
                >
                  <List size={13} style={{ marginRight: '0.3rem' }} /> Flat List
                </button>
              </div>
            </div>
            <button className="btn-primary-esg" onClick={() => setShowUploadModal(true)}>
              <Upload size={14} /> Upload Document
            </button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar" style={{ marginBottom: '1.25rem' }}>
        <div className="search-input-wrap">
          <Search size={14} className="search-icon" />
          <input placeholder="Search documents by name or description..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
        </div>
        <select
          className="filter-select"
          value={filters.organization}
          onChange={e => setFilters(f => ({ ...f, organization: e.target.value }))}
        >
          <option value="">All Organizations</option>
          {organizations.map(o => <option key={o._id} value={o._id}>{o.name} ({o.type})</option>)}
        </select>
        <select className="filter-select" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          className="filter-select"
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          <option value="Submitted">Submitted</option>
          <option value="Under Review">Under Review</option>
          <option value="Validated">Validated</option>
          <option value="Correction Required">Correction Required</option>
          <option value="Approved">Approved</option>
        </select>
        <button
          className="btn-secondary-esg btn-sm"
          onClick={() => setFilters({ category: '', organization: '', search: '', status: '' })}
        >
          Clear
        </button>
      </div>

      {/* Documents List */}
      {loading ? <LoadingState /> : documents.length === 0 ? (
        <div className="esg-card">
          <EmptyState
            icon={<File size={48} />}
            title="No documents found"
            message="No documents match your active organization or filter criteria."
          />
        </div>
      ) : viewMode === 'grouped' ? (
        /* Grouped by Organization View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {Object.values(groupedByOrg).map(group => (
            <div key={group.orgId} className="esg-card" style={{ padding: '1.25rem' }}>
              <div className="d-flex justify-between align-center" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Building2 size={20} style={{ color: 'var(--primary)' }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{group.orgName}</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Tier: <strong>{group.orgType}</strong> • {group.docs.length} document{group.docs.length > 1 ? 's' : ''} uploaded
                    </div>
                  </div>
                </div>
                <button
                  className="btn-secondary-esg btn-sm"
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => setFilters(f => ({ ...f, organization: group.orgId !== 'general' ? group.orgId : '' }))}
                >
                  Filter Only This Org
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {group.docs.map(doc => renderDocCard(doc))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Flat List View */
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {documents.map(doc => renderDocCard(doc))}
          </div>
          <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPageChange={p => fetchDocs(p)} />
        </>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Document"
        message={`Delete "${deleteTarget?.originalName}"? The file will be removed from Cloudinary.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText="Delete"
      />

      {reviewDocTarget && (
        <ReviewActionModal
          isOpen={!!reviewDocTarget}
          onClose={() => setReviewDocTarget(null)}
          title="Review Compliance Document"
          recordName={reviewDocTarget.originalName}
          currentStatus={reviewDocTarget.status || 'Approved'}
          initialAction={reviewDocTarget.status === 'Validated' ? 'approve' : reviewDocTarget.status === 'Under Review' ? 'validate' : 'under_review'}
          onConfirm={async (action, comment) => {
            await handleReviewDoc(reviewDocTarget._id, action, comment);
            setReviewDocTarget(null);
          }}
        />
      )}

      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-box modal-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Upload Compliance Document</span>
              <button className="modal-close" onClick={() => setShowUploadModal(false)}><X size={15} /></button>
            </div>
            <div className="modal-body">
              <div
                className={`upload-zone ${dragOver ? 'dragging' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="upload-zone-icon">
                  {uploading ? <div className="spinner" /> : <Upload size={32} style={{ color: 'var(--primary)' }} />}
                </div>
                <p>{uploading ? 'Uploading...' : 'Drag & drop or click to upload'}</p>
                <small>PDF, DOC, XLS, PNG, JPG — Max 10MB</small>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.gif"
                  onChange={e => {
                    handleUpload(e.target.files[0]);
                    setShowUploadModal(false);
                  }}
                />
              </div>
              {uploadError && <div className="alert-esg alert-danger" style={{ marginTop: '0.75rem' }}>{uploadError}</div>}
              <div className="form-group-esg" style={{ marginTop: '1rem' }}>
                <label className="form-label-esg">Assigned Organization <span className="required">*</span></label>
                <select
                  className="form-control-esg"
                  value={uploadForm.organization}
                  onChange={e => setUploadForm(f => ({ ...f, organization: e.target.value }))}
                >
                  <option value="">Select Organization</option>
                  {organizations.map(o => <option key={o._id} value={o._id}>{o.name} ({o.type})</option>)}
                </select>
              </div>
              <div className="form-group-esg">
                <label className="form-label-esg">Document Category</label>
                <select
                  className="form-control-esg"
                  value={uploadForm.category}
                  onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Description</label>
                <textarea
                  className="form-control-esg" rows={2}
                  placeholder="Brief description of the document"
                  value={uploadForm.description}
                  onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary-esg" onClick={() => setShowUploadModal(false)}>Cancel</button>
              <button className="btn-primary-esg" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload size={14} /> {uploading ? 'Uploading...' : 'Select File'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
