import { useState } from 'react';
import {
  X, FileText, Download, ExternalLink, ShieldCheck, CheckCircle2,
  Clock, AlertCircle, Building2, Tag, Calendar, User, File, Image, FileSpreadsheet
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { exportDocumentsToPDF } from '../../utils/exportUtils';
import { useAuth } from '../../context/AuthContext';

const formatSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const getFileIcon = (fileType) => {
  if (!fileType) return <File size={24} />;
  if (fileType.startsWith('image/')) return <Image size={24} />;
  if (fileType.includes('pdf')) return <FileText size={24} />;
  if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('csv')) return <FileSpreadsheet size={24} />;
  return <File size={24} />;
};

const DocumentViewModal = ({ doc, onClose, onReview }) => {
  const { isReviewer, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'metadata'
  const [iframeError, setIframeError] = useState(false);

  if (!doc) return null;

  const isImage = doc.fileType?.startsWith('image/');
  const isPdf = doc.fileType === 'application/pdf' || doc.originalName?.toLowerCase().endsWith('.pdf');
  const hasCloudinaryUrl = !!doc.cloudinaryUrl && !doc.cloudinaryUrl.includes('demo/image/upload/v1690000000/sample');

  const handleDownloadOriginal = () => {
    if (doc.cloudinaryUrl) {
      window.open(doc.cloudinaryUrl, '_blank', 'noopener,noreferrer');
    } else {
      exportDocumentsToPDF([doc]);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-box modal-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 840, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: 'rgba(241, 90, 36, 0.12)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              {getFileIcon(doc.fileType)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="modal-title" style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  {doc.originalName || doc.title || 'Document Details'}
                </span>
                <StatusBadge status={doc.status || 'Submitted'} />
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {doc.category} • {formatSize(doc.fileSize)} • {doc.organization?.name || 'General Scope'}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* View Mode Tabs */}
        <div style={{ padding: '0.5rem 1.25rem 0', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
          <div className="tabs-esg" style={{ marginBottom: 0 }}>
            <button
              className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
              style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
            >
              Document Preview
            </button>
            <button
              className={`tab-btn ${activeTab === 'metadata' ? 'active' : ''}`}
              onClick={() => setActiveTab('metadata')}
              style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
            >
              Audit Details & Metadata
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
          {/* Status alerts */}
          {doc.correctionComment && (
            <div className="alert-esg alert-danger" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <AlertCircle size={16} style={{ marginTop: '0.1rem', flexShrink: 0 }} />
              <div>
                <strong>Correction Required:</strong> {doc.correctionComment}
              </div>
            </div>
          )}

          {doc.reviewComment && (
            <div className="alert-esg alert-info" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <ShieldCheck size={16} style={{ marginTop: '0.1rem', flexShrink: 0 }} />
              <div>
                <strong>Reviewer Feedback:</strong> {doc.reviewComment}
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div>
              {/* If image and valid url */}
              {isImage && doc.cloudinaryUrl ? (
                <div style={{
                  textAlign: 'center', background: '#0F172A',
                  borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300
                }}>
                  <img
                    src={doc.cloudinaryUrl}
                    alt={doc.originalName}
                    style={{ maxHeight: 380, maxWidth: '100%', borderRadius: 4, objectFit: 'contain' }}
                    onError={() => setIframeError(true)}
                  />
                </div>
              ) : isPdf && hasCloudinaryUrl && !iframeError ? (
                /* Real PDF viewer */
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '1rem' }}>
                  <iframe
                    src={doc.cloudinaryUrl}
                    title={doc.originalName}
                    style={{ width: '100%', height: '420px', border: 'none' }}
                    onError={() => setIframeError(true)}
                  />
                </div>
              ) : (
                /* Executive Compliance Evidence Dossier Card */
                <div style={{
                  background: 'linear-gradient(135deg, #FAF7F5 0%, #FFFFFF 100%)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.5rem',
                  marginBottom: '1rem',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 10,
                      background: '#FFF0E9', color: 'var(--primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {getFileIcon(doc.fileType)}
                    </div>
                    <div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {doc.originalName}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        SEBI BRSR Statutory Evidence Document • Verified Digital Record
                      </div>
                    </div>
                  </div>

                  <div className="grid-2" style={{ gap: '0.75rem', background: '#FFFFFF', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Category</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>{doc.category}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>File Size & Type</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>{formatSize(doc.fileSize)} • {doc.fileType || 'Document'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Assigned Entity</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>{doc.organization?.name || 'Group Portfolio'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Uploaded By</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>{doc.uploadedBy?.name || 'ESG Officer'} ({formatDate(doc.createdAt)})</div>
                    </div>
                  </div>

                  {doc.description && (
                    <div style={{ marginTop: '1rem', background: '#FFFFFF', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Description & Scope</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{doc.description}</div>
                    </div>
                  )}

                  {doc.relatedESGRecord && (
                    <div style={{ marginTop: '0.75rem', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ShieldCheck size={16} style={{ color: '#1D4ED8' }} />
                      <div style={{ fontSize: '0.82rem', color: '#1E40AF' }}>
                        Directly tagged to ESG Metric: <strong>{doc.relatedESGRecord.metric}</strong> ({doc.relatedESGRecord.category})
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'metadata' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="table-wrapper">
                <table className="table-esg">
                  <thead>
                    <tr><th>Attribute</th><th>Audit Value</th></tr>
                  </thead>
                  <tbody>
                    <tr><td style={{ fontWeight: 600, width: 180 }}>Document Name</td><td>{doc.originalName}</td></tr>
                    <tr><td style={{ fontWeight: 600 }}>Category</td><td>{doc.category}</td></tr>
                    <tr><td style={{ fontWeight: 600 }}>Organization</td><td>{doc.organization?.name} ({doc.organization?.type || 'Tier'})</td></tr>
                    <tr><td style={{ fontWeight: 600 }}>Verification Status</td><td><StatusBadge status={doc.status || 'Submitted'} /></td></tr>
                    <tr><td style={{ fontWeight: 600 }}>File Type</td><td>{doc.fileType || 'N/A'}</td></tr>
                    <tr><td style={{ fontWeight: 600 }}>File Size</td><td>{formatSize(doc.fileSize)} ({doc.fileSize} bytes)</td></tr>
                    <tr><td style={{ fontWeight: 600 }}>Uploaded By</td><td>{doc.uploadedBy?.name} ({doc.uploadedBy?.email || 'N/A'})</td></tr>
                    <tr><td style={{ fontWeight: 600 }}>Upload Date</td><td>{formatDate(doc.createdAt)}</td></tr>
                    <tr><td style={{ fontWeight: 600 }}>Last Updated</td><td>{formatDate(doc.updatedAt)}</td></tr>
                    <tr><td style={{ fontWeight: 600 }}>Approved By</td><td>{doc.approvedBy?.name || 'Pending Review'}</td></tr>
                    <tr><td style={{ fontWeight: 600 }}>Cloud Storage Key</td><td style={{ wordBreak: 'break-all', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{doc.cloudinaryUrl || 'Stored Securely in AWS/Cloudinary Vault'}</td></tr>
                  </tbody>
                </table>
              </div>

              {doc.tags?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Tags:</div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {doc.tags.map((t, idx) => (
                      <span key={idx} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.75rem', padding: '0.15rem 0.5rem', color: 'var(--text-primary)' }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ padding: '0.85rem 1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" className="btn-secondary-esg" onClick={onClose}>
            Close
          </button>

          <button
            type="button"
            className="btn-secondary-esg"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#DC2626' }}
            onClick={() => exportDocumentsToPDF([doc])}
            title="Download PDF Audit Verification Dossier"
          >
            <Download size={13} /> PDF Dossier
          </button>

          {doc.cloudinaryUrl && (
            <button
              type="button"
              className="btn-secondary-esg"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#0284C7' }}
              onClick={handleDownloadOriginal}
              title="Open or Download Original File"
            >
              <ExternalLink size={13} /> Open Original File
            </button>
          )}

          {isReviewer && onReview && (
            <button
              type="button"
              className="btn-primary-esg"
              style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={() => {
                onClose();
                onReview(doc);
              }}
            >
              <ShieldCheck size={14} /> Review & Action
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewModal;
