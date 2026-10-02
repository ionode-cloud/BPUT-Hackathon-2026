import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, ChevronRight, Building2, Edit2, Eye, X, Users, Trash2,
  CheckCircle2, ShieldCheck, Check, Clock, AlertCircle, FileCheck, Filter,
  FolderOpen, CheckSquare
} from 'lucide-react';
import Breadcrumbs from '../components/common/Breadcrumbs';
import StatusBadge from '../components/common/StatusBadge';
import { LoadingState, EmptyState } from '../components/common/States';
import ConfirmDialog from '../components/common/ConfirmDialog';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ORG_TYPES = ['Group', 'Subsidiary', 'Business Unit', 'Project'];

const TYPE_COLORS = {
  Group: { bg: 'var(--success-bg)', color: 'var(--success)' },
  Subsidiary: { bg: 'var(--accent-light)', color: 'var(--accent)' },
  'Business Unit': { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  Project: { bg: '#F3E8FF', color: '#7C3AED' },
};

// Verification status badge
const VerificationBadge = ({ status }) => {
  const isVerified = status === 'Verified';
  const isRejected = status === 'Rejected';

  if (isVerified) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          fontSize: '0.72rem',
          padding: '0.2rem 0.55rem',
          borderRadius: 99,
          background: 'rgba(5, 150, 105, 0.12)',
          color: '#059669',
          fontWeight: 600,
          border: '1px solid rgba(5, 150, 105, 0.25)',
        }}
        title="Identity & CIN/GSTIN verified by ESG Administrator"
      >
        <ShieldCheck size={12} /> Verified
      </span>
    );
  }

  if (isRejected) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          fontSize: '0.72rem',
          padding: '0.2rem 0.55rem',
          borderRadius: 99,
          background: 'rgba(220, 38, 38, 0.1)',
          color: '#DC2626',
          fontWeight: 600,
          border: '1px solid rgba(220, 38, 38, 0.2)',
        }}
        title="Verification rejected"
      >
        <AlertCircle size={12} /> Rejected
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        fontSize: '0.72rem',
        padding: '0.2rem 0.55rem',
        borderRadius: 99,
        background: 'rgba(241, 90, 36, 0.1)',
        color: '#F15A24',
        fontWeight: 600,
        border: '1px solid rgba(241, 90, 36, 0.25)',
      }}
      title="Awaiting administrator verification"
    >
      <Clock size={12} /> Pending Verification
    </span>
  );
};

const OrgFormModal = ({ org, parents, onClose, onSaved }) => {
  const { isAdmin } = useAuth();
  const [form, setForm] = useState({
    name: org?.name || '',
    type: org?.type || 'Group',
    parent: org?.parent?._id || org?.parent || '',
    city: org?.location?.city || '',
    state: org?.location?.state || '',
    country: org?.location?.country || 'India',
    cin: org?.cin || '',
    gstin: org?.gstin || '',
    industry: org?.industry || '',
    description: org?.description || '',
    status: org?.status || (org?._id ? 'Active' : 'Submitted'),
    verificationStatus: org?.verificationStatus || 'Pending Verification',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const eligibleParents = parents.filter(p => {
    const hierarchy = { Group: 0, Subsidiary: 1, 'Business Unit': 2, Project: 3 };
    return hierarchy[p.type] < hierarchy[form.type];
  });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.type) { setError('Name and Type are required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        type: form.type,
        parent: form.parent || null,
        location: { city: form.city, state: form.state, country: form.country },
        cin: form.cin,
        gstin: form.gstin,
        industry: form.industry,
        description: form.description,
        status: form.status,
        verificationStatus: form.verificationStatus,
      };
      if (org?._id) await api.put(`/organizations/${org._id}`, payload);
      else await api.post('/organizations', payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{org?._id ? 'Edit' : 'Submit New'} Organization</span>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-body">
            {error && <div className="alert-esg alert-danger">{error}</div>}

            <div style={{ padding: '0.65rem 0.85rem', background: '#FFF9F6', border: '1px solid #FFE5D9', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.78rem', color: '#9A3412', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} style={{ color: '#F15A24', flexShrink: 0 }} />
              <span><strong>Compliance & Verification Protocol:</strong> Submitted organizations undergo administrative review. An Admin validates corporate identifiers (CIN, GSTIN, location) and gives formal approval and verification.</span>
            </div>

            <div className="grid-2" style={{ gap: '1rem' }}>
              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Name <span className="required">*</span></label>
                <input type="text" name="name" className="form-control-esg" placeholder="Organization name" value={form.name} onChange={handleChange} required />
              </div>
              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Type <span className="required">*</span></label>
                <select name="type" className="form-control-esg" value={form.type} onChange={handleChange}>
                  {ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {form.type !== 'Group' && (
                <div className="form-group-esg" style={{ marginBottom: 0 }}>
                  <label className="form-label-esg">Parent Organization</label>
                  <select name="parent" className="form-control-esg" value={form.parent} onChange={handleChange}>
                    <option value="">Select parent</option>
                    {eligibleParents.map(p => <option key={p._id} value={p._id}>{p.name} ({p.type})</option>)}
                  </select>
                </div>
              )}
              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Industry</label>
                <input type="text" name="industry" className="form-control-esg" placeholder="e.g. Infrastructure, Manufacturing" value={form.industry} onChange={handleChange} />
              </div>
              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">City</label>
                <input type="text" name="city" className="form-control-esg" placeholder="City" value={form.city} onChange={handleChange} />
              </div>
              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">State</label>
                <input type="text" name="state" className="form-control-esg" placeholder="State" value={form.state} onChange={handleChange} />
              </div>
              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">CIN (Corporate ID Number)</label>
                <input type="text" name="cin" className="form-control-esg" placeholder="e.g. L12345MH2000PLC123456" value={form.cin} onChange={handleChange} />
              </div>
              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">GSTIN</label>
                <input type="text" name="gstin" className="form-control-esg" placeholder="e.g. 27AAAAA0000A1Z5" value={form.gstin} onChange={handleChange} />
              </div>
              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Workflow Status</label>
                <select name="status" className="form-control-esg" value={form.status} onChange={handleChange}>
                  <option value="Submitted">Submitted (Awaiting Approval)</option>
                  <option value="Approved">Approved</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Verification Status</label>
                <select name="verificationStatus" className="form-control-esg" value={form.verificationStatus} onChange={handleChange}>
                  <option value="Pending Verification">Pending Verification</option>
                  <option value="Verified">Verified</option>
                  <option value="Unverified">Unverified</option>
                </select>
              </div>
            </div>
            <div className="form-group-esg" style={{ marginTop: '1rem' }}>
              <label className="form-label-esg">Description & Scope</label>
              <textarea name="description" className="form-control-esg" rows={2} placeholder="Brief operational scope and description" value={form.description} onChange={handleChange} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary-esg" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary-esg" disabled={saving}>
              {saving ? 'Processing...' : org?._id ? 'Update Organization' : 'Submit Organization for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Recursive org tree node
const OrgTreeNode = ({ org, allOrgs, depth = 0, onEdit, onView, onDelete, onApprove, onVerify, isAdmin }) => {
  const [expanded, setExpanded] = useState(depth < 2);
  const children = allOrgs.filter(o => o.parent?._id === org._id || o.parent === org._id);
  const colors = TYPE_COLORS[org.type] || { bg: 'var(--bg)', color: 'var(--text-secondary)' };

  const isApproved = org.status === 'Approved' || org.status === 'Active';
  const isVerified = org.verificationStatus === 'Verified';

  return (
    <div style={{ marginLeft: depth > 0 ? '1.5rem' : 0 }}>
      <div className="org-tree-item" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        {children.length > 0 && (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)' }}
          >
            <ChevronRight size={14} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'var(--transition)' }} />
          </button>
        )}
        {children.length === 0 && <div style={{ width: 14 }} />}
        <div style={{ width: 32, height: 32, background: colors.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Building2 size={15} style={{ color: colors.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{org.name}</span>
            <span className="org-type-badge" style={{ background: colors.bg, color: colors.color }}>{org.type}</span>
          </div>
          {org.location?.city && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{org.location.city}{org.location.state ? `, ${org.location.state}` : ''}</div>
          )}
        </div>

        {/* Status badges */}
        <StatusBadge status={org.status || 'Submitted'} />
        <VerificationBadge status={org.verificationStatus || 'Pending Verification'} />

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          <button className="topbar-action-btn" style={{ width: 28, height: 28 }} onClick={() => onView(org)} title="View Details">
            <Eye size={13} />
          </button>

          {isAdmin && (
            <>
              {!isApproved && (
                <button
                  className="topbar-action-btn"
                  style={{ width: 28, height: 28, color: '#059669', background: 'rgba(5, 150, 105, 0.12)' }}
                  onClick={() => onApprove(org._id)}
                  title="Admin: Give Approval"
                >
                  <CheckCircle2 size={14} />
                </button>
              )}

              {!isVerified && (
                <button
                  className="topbar-action-btn"
                  style={{ width: 28, height: 28, color: '#0284C7', background: 'rgba(2, 132, 199, 0.12)' }}
                  onClick={() => onVerify(org._id)}
                  title="Admin: Verify Organization Credentials"
                >
                  <ShieldCheck size={14} />
                </button>
              )}

              <button className="topbar-action-btn" style={{ width: 28, height: 28 }} onClick={() => onEdit(org)} title="Edit">
                <Edit2 size={13} />
              </button>
              <button className="topbar-action-btn" style={{ width: 28, height: 28, color: 'var(--danger)' }} onClick={() => onDelete(org)} title="Delete">
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>
      {expanded && children.map(child => (
        <OrgTreeNode
          key={child._id}
          org={child}
          allOrgs={allOrgs}
          depth={depth + 1}
          onEdit={onEdit}
          onView={onView}
          onDelete={onDelete}
          onApprove={onApprove}
          onVerify={onVerify}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
};

const Organizations = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editOrg, setEditOrg] = useState(null);
  const [viewOrg, setViewOrg] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [view, setView] = useState('tree'); // 'tree' or 'table'
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'pending' | 'verified'

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/organizations', { params: { limit: 200 } });
      setOrgs(res.data.data);
    } catch { } finally { setLoading(false); }
  };

  const handleApproveOrg = async (orgId, action = 'approve', comment = '') => {
    try {
      const res = await api.put(`/organizations/${orgId}/approve`, { action, comment });
      await fetchOrgs();
      if (viewOrg && viewOrg._id === orgId) {
        setViewOrg(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Approval action failed');
    }
  };

  const handleVerifyOrg = async (orgId, action = 'verify', comment = '') => {
    try {
      const res = await api.put(`/organizations/${orgId}/verify`, { action, comment });
      await fetchOrgs();
      if (viewOrg && viewOrg._id === orgId) {
        setViewOrg(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Verification action failed');
    }
  };

  const handleDeleteOrg = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/organizations/${deleteTarget._id}`);
      setDeleteTarget(null);
      fetchOrgs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete organization');
      setDeleteTarget(null);
    }
  };

  useEffect(() => { fetchOrgs(); }, []);

  const displayedOrgs = orgs.filter(o => {
    if (filterMode === 'pending') {
      return o.status === 'Submitted' || o.verificationStatus !== 'Verified';
    }
    if (filterMode === 'verified') {
      return o.verificationStatus === 'Verified';
    }
    return true;
  });

  const rootOrgs = displayedOrgs.filter(o => !o.parent);

  const pendingCount = orgs.filter(o => o.status === 'Submitted' || o.verificationStatus === 'Pending Verification').length;
  const verifiedCount = orgs.filter(o => o.verificationStatus === 'Verified').length;

  return (
    <div className="fade-in">
      <Breadcrumbs items={[{ label: 'Organizations', path: '/organizations' }]} />

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
          <Building2 size={15} /> Organizations
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
        <button
          onClick={() => navigate('/approvals')}
          className="btn-secondary-esg"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.45rem',
            padding: '0.5rem 1rem', fontSize: '0.84rem', fontWeight: 500,
            background: 'var(--surface)', color: 'var(--text-primary)',
          }}
        >
          <CheckCircle2 size={15} style={{ color: '#059669' }} /> Approvals
        </button>
      </div>
      <div className="page-header">
        <div className="d-flex justify-between align-center" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 className="page-title">Organization Hierarchy & Verification</h1>
            <p className="page-subtitle">Manage Group → Subsidiary → Business Unit structure with administrative verification & approval</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {/* View Switcher */}
            <div style={{ display: 'flex', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {['tree', 'table'].map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding: '0.45rem 0.875rem',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    background: view === v ? 'var(--primary)' : 'transparent',
                    color: view === v ? 'white' : 'var(--text-secondary)',
                    transition: 'var(--transition)',
                    fontFamily: 'var(--font)',
                    textTransform: 'capitalize'
                  }}
                >
                  {v}
                </button>
              ))}
            </div>

            <button className="btn-primary-esg" onClick={() => { setEditOrg(null); setShowForm(true); }}>
              <Plus size={15} /> Add / Submit Organization
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPIs & Verification Stats */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        {ORG_TYPES.map(type => {
          const colors = TYPE_COLORS[type];
          const count = orgs.filter(o => o.type === type).length;
          return (
            <div key={type} className="esg-card" style={{ borderLeft: `3px solid ${colors.color}`, padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: colors.color }}>{count}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{type}s</div>
            </div>
          );
        })}
      </div>

      {/* Compliance Status Filters Bar */}
      <div className="esg-card" style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Workflow Filter:</span>
          {[
            { id: 'all', label: `All Units (${orgs.length})` },
            { id: 'pending', label: `Pending Approval / Verification (${pendingCount})`, highlight: pendingCount > 0 },
            { id: 'verified', label: `Verified Units (${verifiedCount})` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterMode(f.id)}
              style={{
                fontSize: '0.78rem',
                padding: '0.35rem 0.75rem',
                borderRadius: 99,
                border: filterMode === f.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: filterMode === f.id ? 'var(--primary-subtle, #FFE5D9)' : 'transparent',
                color: filterMode === f.id ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: filterMode === f.id ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        {isAdmin && pendingCount > 0 && (
          <div style={{ fontSize: '0.78rem', color: '#F15A24', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Clock size={14} /> {pendingCount} organization(s) submitted awaiting admin approval & verification
          </div>
        )}
      </div>

      {loading ? <LoadingState /> : orgs.length === 0 ? (
        <div className="esg-card">
          <EmptyState
            icon={<Building2 size={48} />}
            title="No organizations found"
            message="Create your first organization to start the hierarchy."
            action={<button className="btn-primary-esg" onClick={() => setShowForm(true)}><Plus size={14} /> Add Group</button>}
          />
        </div>
      ) : view === 'tree' ? (
        <div className="esg-card">
          <div className="section-header" style={{ marginBottom: '1rem' }}>
            <div className="section-title">Organization Tree & Approvals</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{displayedOrgs.length} displayed units</div>
          </div>
          <div className="org-tree">
            {rootOrgs.map(org => (
              <OrgTreeNode
                key={org._id}
                org={org}
                allOrgs={displayedOrgs}
                onEdit={o => { setEditOrg(o); setShowForm(true); }}
                onView={setViewOrg}
                onDelete={setDeleteTarget}
                onApprove={handleApproveOrg}
                onVerify={handleVerifyOrg}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table-esg">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Parent</th>
                <th>Location</th>
                <th>Industry</th>
                <th>Approval Status</th>
                <th>Verification</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedOrgs.map(o => {
                const isApproved = o.status === 'Approved' || o.status === 'Active';
                const isVerified = o.verificationStatus === 'Verified';

                return (
                  <tr key={o._id}>
                    <td style={{ fontWeight: 600 }}>{o.name}</td>
                    <td>
                      <span className="org-type-badge" style={{ background: TYPE_COLORS[o.type]?.bg, color: TYPE_COLORS[o.type]?.color }}>
                        {o.type}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{o.parent?.name || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {[o.location?.city, o.location?.state].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{o.industry || '—'}</td>
                    <td>
                      <StatusBadge status={o.status || 'Submitted'} />
                    </td>
                    <td>
                      <VerificationBadge status={o.verificationStatus || 'Pending Verification'} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <button className="topbar-action-btn" style={{ width: 28, height: 28 }} onClick={() => setViewOrg(o)} title="View Details">
                          <Eye size={13} />
                        </button>

                        {isAdmin && (
                          <>
                            {!isApproved && (
                              <button
                                className="topbar-action-btn"
                                style={{ width: 28, height: 28, color: '#059669', background: 'rgba(5, 150, 105, 0.12)' }}
                                onClick={() => handleApproveOrg(o._id, 'approve')}
                                title="Admin: Give Approval"
                              >
                                <CheckCircle2 size={14} />
                              </button>
                            )}

                            {!isVerified && (
                              <button
                                className="topbar-action-btn"
                                style={{ width: 28, height: 28, color: '#0284C7', background: 'rgba(2, 132, 199, 0.12)' }}
                                onClick={() => handleVerifyOrg(o._id, 'verify')}
                                title="Admin: Verify Credentials"
                              >
                                <ShieldCheck size={14} />
                              </button>
                            )}

                            <button className="topbar-action-btn" style={{ width: 28, height: 28 }} onClick={() => { setEditOrg(o); setShowForm(true); }} title="Edit">
                              <Edit2 size={13} />
                            </button>
                            <button className="topbar-action-btn" style={{ width: 28, height: 28, color: 'var(--danger)' }} onClick={() => setDeleteTarget(o)} title="Delete">
                              <Trash2 size={13} />
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

      {showForm && (
        <OrgFormModal
          org={editOrg}
          parents={orgs}
          onClose={() => { setShowForm(false); setEditOrg(null); }}
          onSaved={fetchOrgs}
        />
      )}

      {/* Organization View / Verification Details Modal */}
      {viewOrg && (
        <div className="modal-overlay" onClick={() => setViewOrg(null)}>
          <div className="modal-box modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="modal-title">{viewOrg.name}</span>
                <span className="org-type-badge" style={{ background: TYPE_COLORS[viewOrg.type]?.bg, color: TYPE_COLORS[viewOrg.type]?.color }}>
                  {viewOrg.type}
                </span>
              </div>
              <button className="modal-close" onClick={() => setViewOrg(null)}><X size={14} /></button>
            </div>
            <div className="modal-body">
              {/* Approval & Verification Status Box */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={16} style={{ color: 'var(--primary)' }} />
                  Administrative Approval & Verification Record
                </div>
                <div className="grid-2" style={{ gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>APPROVAL STATUS</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <StatusBadge status={viewOrg.status || 'Submitted'} />
                    </div>
                    {viewOrg.approvedBy ? (
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                        Approved by <strong>{viewOrg.approvedBy.name}</strong> ({viewOrg.approvedBy.role}) on {new Date(viewOrg.approvedAt).toLocaleDateString()}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.74rem', color: '#D97706', marginTop: '0.35rem' }}>
                        Pending administrative approval
                      </div>
                    )}
                    {viewOrg.approvalComment && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontStyle: 'italic' }}>
                        "{viewOrg.approvalComment}"
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>VERIFICATION STATUS</div>
                    <VerificationBadge status={viewOrg.verificationStatus || 'Pending Verification'} />
                    {viewOrg.verifiedBy ? (
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                        Verified by <strong>{viewOrg.verifiedBy.name}</strong> ({viewOrg.verifiedBy.role}) on {new Date(viewOrg.verifiedAt).toLocaleDateString()}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.74rem', color: '#D97706', marginTop: '0.35rem' }}>
                        CIN & legal documentation awaiting verification
                      </div>
                    )}
                    {viewOrg.verificationComment && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontStyle: 'italic' }}>
                        "{viewOrg.verificationComment}"
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* General Organization Details */}
              <div className="grid-2" style={{ gap: '1rem' }}>
                {[
                  ['Parent Unit', viewOrg.parent?.name || 'Root (Top-level Organization)'],
                  ['Industry', viewOrg.industry || '—'],
                  ['Location', [viewOrg.location?.city, viewOrg.location?.state, viewOrg.location?.country].filter(Boolean).join(', ') || '—'],
                  ['Corporate ID (CIN)', viewOrg.cin || '—'],
                  ['GST Identification (GSTIN)', viewOrg.gstin || '—'],
                  ['Reporting Year', viewOrg.reportingYear || 'All'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{k}</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{v}</div>
                  </div>
                ))}
              </div>

              {viewOrg.description && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Description</div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{viewOrg.description}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {isAdmin && (viewOrg.status !== 'Approved' && viewOrg.status !== 'Active') && (
                  <button
                    type="button"
                    className="btn-primary-esg"
                    style={{ background: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
                    onClick={() => handleApproveOrg(viewOrg._id, 'approve')}
                  >
                    <CheckCircle2 size={14} /> Give Approval
                  </button>
                )}

                {isAdmin && (viewOrg.verificationStatus !== 'Verified') && (
                  <button
                    type="button"
                    className="btn-primary-esg"
                    style={{ background: '#0284C7', borderColor: '#0284C7', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
                    onClick={() => handleVerifyOrg(viewOrg._id, 'verify')}
                  >
                    <ShieldCheck size={14} /> Verify Organization
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-secondary-esg" onClick={() => setViewOrg(null)}>Close</button>
                {isAdmin && (
                  <button className="btn-primary-esg" onClick={() => { setEditOrg(viewOrg); setViewOrg(null); setShowForm(true); }}>
                    <Edit2 size={14} /> Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Organization"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteOrg}
        onCancel={() => setDeleteTarget(null)}
        confirmText="Delete"
      />
    </div>
  );
};

export default Organizations;
