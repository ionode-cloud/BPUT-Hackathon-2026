import { useState, useEffect } from 'react';
import { Plus, ChevronRight, Building2, Edit2, Eye, X, Users, Trash2 } from 'lucide-react';
import Breadcrumbs from '../components/common/Breadcrumbs';
import StatusBadge from '../components/common/StatusBadge';
import { LoadingState, EmptyState } from '../components/common/States';
import Pagination from '../components/common/Pagination';
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

const OrgFormModal = ({ org, parents, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: org?.name || '',
    type: org?.type || 'Group',
    parent: org?.parent?._id || org?.parent || '',
    city: org?.location?.city || '',
    state: org?.location?.state || '',
    country: org?.location?.country || 'India',
    cin: org?.cin || '',
    industry: org?.industry || '',
    description: org?.description || '',
    status: org?.status || 'Active',
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
        name: form.name, type: form.type,
        parent: form.parent || null,
        location: { city: form.city, state: form.state, country: form.country },
        cin: form.cin, industry: form.industry,
        description: form.description, status: form.status,
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
          <span className="modal-title">{org?._id ? 'Edit' : 'New'} Organization</span>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-body">
            {error && <div className="alert-esg alert-danger">{error}</div>}
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
                <input type="text" name="industry" className="form-control-esg" placeholder="e.g. Infrastructure" value={form.industry} onChange={handleChange} />
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
                <label className="form-label-esg">CIN</label>
                <input type="text" name="cin" className="form-control-esg" placeholder="Corporate ID Number" value={form.cin} onChange={handleChange} />
              </div>
              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Status</label>
                <select name="status" className="form-control-esg" value={form.status} onChange={handleChange}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="form-group-esg" style={{ marginTop: '1rem' }}>
              <label className="form-label-esg">Description</label>
              <textarea name="description" className="form-control-esg" rows={2} placeholder="Brief description" value={form.description} onChange={handleChange} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary-esg" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary-esg" disabled={saving}>
              {saving ? 'Saving...' : org?._id ? 'Update' : 'Create Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Recursive org tree node
const OrgTreeNode = ({ org, allOrgs, depth = 0, onEdit, onView, onDelete, isAdmin }) => {
  const [expanded, setExpanded] = useState(depth < 2);
  const children = allOrgs.filter(o => o.parent?._id === org._id || o.parent === org._id);
  const colors = TYPE_COLORS[org.type] || { bg: 'var(--bg)', color: 'var(--text-secondary)' };

  return (
    <div style={{ marginLeft: depth > 0 ? '1.5rem' : 0 }}>
      <div className="org-tree-item" style={{ marginBottom: '0.5rem' }}>
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
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{org.name}</div>
          {org.location?.city && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{org.location.city}{org.location.state ? `, ${org.location.state}` : ''}</div>
          )}
        </div>
        <span className="org-type-badge" style={{ background: colors.bg, color: colors.color }}>{org.type}</span>
        <StatusBadge status={org.status} />
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button className="topbar-action-btn" style={{ width: 26, height: 26 }} onClick={() => onView(org)} title="View"><Eye size={12} /></button>
          {isAdmin && (
            <>
              <button className="topbar-action-btn" style={{ width: 26, height: 26 }} onClick={() => onEdit(org)} title="Edit"><Edit2 size={12} /></button>
              <button className="topbar-action-btn" style={{ width: 26, height: 26, color: 'var(--danger)' }} onClick={() => onDelete(org)} title="Delete"><Trash2 size={12} /></button>
            </>
          )}
        </div>
      </div>
      {expanded && children.map(child => (
        <OrgTreeNode key={child._id} org={child} allOrgs={allOrgs} depth={depth + 1} onEdit={onEdit} onView={onView} onDelete={onDelete} isAdmin={isAdmin} />
      ))}
    </div>
  );
};

const Organizations = () => {
  const { isAdmin } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editOrg, setEditOrg] = useState(null);
  const [viewOrg, setViewOrg] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [view, setView] = useState('tree'); // 'tree' or 'table'

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/organizations', { params: { limit: 200 } });
      setOrgs(res.data.data);
    } catch { } finally { setLoading(false); }
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

  const rootOrgs = orgs.filter(o => !o.parent);

  return (
    <div className="fade-in">
      <Breadcrumbs items={[{ label: 'Organizations', path: '/organizations' }]} />
      <div className="page-header">
        <div className="d-flex justify-between align-center">
          <div>
            <h1 className="page-title">Organization Hierarchy</h1>
            <p className="page-subtitle">Manage the Group → Subsidiary → Business Unit → Project structure</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ display: 'flex', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {['tree', 'table'].map(v => (
                <button key={v} onClick={() => setView(v)}
                  style={{ padding: '0.45rem 0.875rem', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, background: view === v ? 'var(--primary)' : 'transparent', color: view === v ? 'white' : 'var(--text-secondary)', transition: 'var(--transition)', fontFamily: 'var(--font)', textTransform: 'capitalize' }}>
                  {v}
                </button>
              ))}
            </div>
            {isAdmin && (
              <button className="btn-primary-esg" onClick={() => { setEditOrg(null); setShowForm(true); }}>
                <Plus size={15} /> Add Organization
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
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

      {loading ? <LoadingState /> : orgs.length === 0 ? (
        <div className="esg-card">
          <EmptyState
            icon={<Building2 size={48} />}
            title="No organizations found"
            message="Create your first organization to start the hierarchy."
            action={isAdmin && <button className="btn-primary-esg" onClick={() => setShowForm(true)}><Plus size={14} /> Add Group</button>}
          />
        </div>
      ) : view === 'tree' ? (
        <div className="esg-card">
          <div className="section-header" style={{ marginBottom: '1rem' }}>
            <div className="section-title">Organization Tree</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{orgs.length} total units</div>
          </div>
          <div className="org-tree">
            {rootOrgs.map(org => (
              <OrgTreeNode
                key={org._id} org={org} allOrgs={orgs}
                onEdit={o => { setEditOrg(o); setShowForm(true); }}
                onView={setViewOrg}
                onDelete={setDeleteTarget}
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
                <th>Status</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {orgs.map(o => (
                <tr key={o._id}>
                  <td style={{ fontWeight: 500 }}>{o.name}</td>
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
                  <td><StatusBadge status={o.status} /></td>
                  {isAdmin && (
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="topbar-action-btn" style={{ width: 28, height: 28 }} onClick={() => setViewOrg(o)} title="View"><Eye size={13} /></button>
                        <button className="topbar-action-btn" style={{ width: 28, height: 28 }} onClick={() => { setEditOrg(o); setShowForm(true); }} title="Edit"><Edit2 size={13} /></button>
                        <button className="topbar-action-btn" style={{ width: 28, height: 28, color: 'var(--danger)' }} onClick={() => setDeleteTarget(o)} title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
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

      {viewOrg && (
        <div className="modal-overlay" onClick={() => setViewOrg(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{viewOrg.name}</span>
              <button className="modal-close" onClick={() => setViewOrg(null)}><X size={14} /></button>
            </div>
            <div className="modal-body">
              <div className="grid-2" style={{ gap: '1rem' }}>
                {[
                  ['Type', viewOrg.type], ['Status', null],
                  ['Parent', viewOrg.parent?.name || 'Root'],
                  ['Industry', viewOrg.industry],
                  ['Location', [viewOrg.location?.city, viewOrg.location?.state, viewOrg.location?.country].filter(Boolean).join(', ')],
                  ['CIN', viewOrg.cin],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{k}</div>
                    {k === 'Status' ? <StatusBadge status={viewOrg.status} /> : <div style={{ fontSize: '0.875rem' }}>{v || '—'}</div>}
                  </div>
                ))}
              </div>
              {viewOrg.description && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Description</div>
                  <p style={{ fontSize: '0.875rem' }}>{viewOrg.description}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary-esg" onClick={() => setViewOrg(null)}>Close</button>
              {isAdmin && <button className="btn-primary-esg" onClick={() => { setEditOrg(viewOrg); setViewOrg(null); setShowForm(true); }}>
                <Edit2 size={14} /> Edit
              </button>}
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
