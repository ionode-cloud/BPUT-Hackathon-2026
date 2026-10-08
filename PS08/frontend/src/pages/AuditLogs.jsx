import { useState, useEffect } from 'react';
import {
  LuSearch as Search,
  LuFilter as Filter,
  LuPlus as Plus,
  LuTrash2 as Trash2,
  LuEye as Eye,
  LuEyeOff as EyeOff,
  LuX as X,
  LuCircleCheck as CheckCircle2,
  LuShield as Shield
} from 'react-icons/lu';
import { FiEdit2 as Edit2 } from 'react-icons/fi';
import Breadcrumbs from '../components/common/Breadcrumbs';
import { LoadingState, EmptyState } from '../components/common/States';
import Pagination from '../components/common/Pagination';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ACTIONS = [
  'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'SUBMIT',
  'VALIDATE', 'APPROVE', 'REJECT', 'CORRECTION_REQUEST',
  'REPORT_GENERATE', 'DOCUMENT_UPLOAD', 'ORG_CREATE', 'CONSOLIDATE'
];

const ENTITIES = ['User', 'Organization', 'ESGData', 'BRSRReport', 'Document', 'Notification'];

const ROLES = [
  'Super Admin',
  'Group ESG Admin',
  'Subsidiary Admin',
  'Business Unit Manager',
  'Project/Department User',
  'ESG Manager',
  'Compliance Officer',
  'Management',
  'Auditor/Reviewer',
];

const ACTION_COLORS = {
  LOGIN: 'var(--accent)', LOGOUT: 'var(--text-muted)', CREATE: 'var(--success)',
  UPDATE: '#3B5BDB', DELETE: 'var(--danger)', SUBMIT: '#3B5BDB',
  VALIDATE: '#0ea5e9', APPROVE: 'var(--success)', REJECT: 'var(--danger)',
  CORRECTION_REQUEST: 'var(--warning)', REPORT_GENERATE: 'var(--primary)',
  DOCUMENT_UPLOAD: 'var(--accent)', CONSOLIDATE: '#8b5cf6', DEFAULT: 'var(--text-muted)',
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({
    action: '', entity: '', organization: '', startDate: '', endDate: '', search: '',
  });

  // Organizations list
  const [organizations, setOrganizations] = useState([]);

  // Password visibility state per row
  const [showPasswordMap, setShowPasswordMap] = useState({});

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [formData, setFormData] = useState({
    userName: '',
    userEmail: '',
    userRole: 'Super Admin',
    password: 'Admin@123456',
    organization: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [showModalPassword, setShowModalPassword] = useState(false);

  // Success toast/banner
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/audit-logs', { params: { page, limit: 20, ...filters } });
      const rawLogs = res.data.data || [];
      // Deduplicate by userEmail so Super Admin and all other credentials only appear once
      const seenEmails = new Set();
      const uniqueLogs = rawLogs.filter(log => {
        const email = (log.userEmail || log.user?.email || '').trim().toLowerCase();
        if (!email) return true;
        if (seenEmails.has(email)) return false;
        seenEmails.add(email);
        return true;
      });
      setLogs(uniqueLogs);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/organizations', { params: { limit: 200 } })
      .then(res => setOrganizations(res.data.data || []))
      .catch(err => console.error('Failed to fetch organizations:', err));
  }, []);

  useEffect(() => {
    fetchLogs(1);
  }, [filters]);

  const togglePasswordVisibility = (id) => {
    setShowPasswordMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openCreateModal = () => {
    setEditingLog(null);
    setFormData({
      userName: '',
      userEmail: '',
      userRole: 'Super Admin',
      password: 'Admin@123456',
      organization: '',
    });
    setFormError('');
    setShowModalPassword(false);
    setIsModalOpen(true);
  };

  const openEditModal = (log) => {
    const role = log.userRole || log.user?.role || 'Super Admin';
    setEditingLog(log);
    setFormData({
      userName: log.userName || log.user?.name || '',
      userEmail: log.userEmail || log.user?.email || '',
      userRole: role,
      password: log.password || 'Admin@123456',
      organization: role === 'Super Admin' ? '' : (log.organization?._id || log.organization || ''),
    });
    setFormError('');
    setShowModalPassword(false);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const isSuperAdminRole = formData.userRole === 'Super Admin';

    if (!formData.userName || !formData.userEmail || !formData.password) {
      setFormError('Please fill in user name, email, and password.');
      return;
    }

    if (!isSuperAdminRole && !formData.organization && organizations.length > 0) {
      setFormError('Please select an organization for this user role.');
      return;
    }

    if (formData.password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      const payload = {
        ...formData,
        organization: isSuperAdminRole ? null : (formData.organization || null),
        action: editingLog?.action || 'LOGIN',
        entity: editingLog?.entity || 'User',
        status: editingLog?.status || 'Success',
      };
      if (editingLog) {
        await api.put(`/audit-logs/${editingLog._id}`, payload);
        showToast('Audit log and login credentials updated successfully!');
      } else {
        await api.post('/audit-logs', payload);
        showToast('Audit log created and user credentials activated successfully!');
      }
      setIsModalOpen(false);
      fetchLogs(pagination.page);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save audit log.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (log) => {
    if (!window.confirm(`Are you sure you want to delete audit log for "${log.userName || log.userEmail}" (${log.action})?`)) {
      return;
    }

    try {
      await api.delete(`/audit-logs/${log._id}`);
      showToast('Audit log deleted successfully!');
      fetchLogs(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete audit log.');
    }
  };

  const { user } = useAuth();

  if (user && user.role !== 'Super Admin') {
    return (
      <div className="fade-in">
        <Breadcrumbs items={[{ label: 'Audit Logs', path: '/audit-logs' }]} />
        <div className="esg-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', marginTop: '1.5rem' }}>
          <Shield size={52} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.5rem' }}>Access Restricted</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
            Audit Logs can only be viewed and modified by the <strong>Super Admin</strong>.
          </p>
          <a href="/dashboard" className="btn-primary-esg" style={{ display: 'inline-flex' }}>
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <Breadcrumbs items={[{ label: 'Audit Logs', path: '/audit-logs' }]} />

      {/* Page Header */}
      <div className="page-header d-flex justify-between align-center">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Track, manage, and verify user credentials & system actions</p>
        </div>
        <button className="btn-primary-esg" onClick={openCreateModal}>
          <Plus size={16} /> Create Audit Log
        </button>
      </div>

      {/* Success notification banner */}
      {toastMessage && (
        <div className="alert-esg alert-success" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={16} /> {toastMessage}
        </div>
      )}

      {/* Filters Bar */}
      <div className="filters-bar">
        <select
          className="filter-select"
          value={filters.action}
          onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
        >
          <option value="">All Actions</option>
          {ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
        <select
          className="filter-select"
          value={filters.entity}
          onChange={e => setFilters(f => ({ ...f, entity: e.target.value }))}
        >
          <option value="">All Entities</option>
          {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select
          className="filter-select"
          value={filters.organization}
          onChange={e => setFilters(f => ({ ...f, organization: e.target.value }))}
        >
          <option value="">All Organizations</option>
          {organizations.map(org => (
            <option key={org._id} value={org._id}>{org.name}</option>
          ))}
        </select>
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From</label>
          <input
            type="date"
            className="filter-select"
            style={{ minWidth: 130 }}
            value={filters.startDate}
            onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>To</label>
          <input
            type="date"
            className="filter-select"
            style={{ minWidth: 130 }}
            value={filters.endDate}
            onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
          />
        </div>
        <button
          className="btn-secondary-esg btn-sm"
          onClick={() => setFilters({ action: '', entity: '', organization: '', startDate: '', endDate: '', search: '' })}
        >
          Clear
        </button>
      </div>

      {loading ? (
        <LoadingState text="Loading audit logs..." />
      ) : logs.length === 0 ? (
        <div className="esg-card">
          <EmptyState
            title="No audit logs found"
            message="Click '+ Create Audit Log' to add your first audit entry."
          />
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table-esg">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Organization</th>
                  <th>Password</th>
                  <th style={{ textAlign: 'right', minWidth: 90 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const isVisible = showPasswordMap[log._id];
                  const displayPassword = log.password || 'Admin@123456';

                  return (
                    <tr key={log._id}>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleDateString()}<br />
                        <span style={{ fontSize: '0.7rem' }}>{new Date(log.createdAt).toLocaleTimeString()}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                          {log.userName || log.user?.name || '—'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {log.userEmail || log.user?.email || '—'}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {log.userRole || log.user?.role || '—'}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {log.organization?.name || log.organizationName || (
                          (log.userRole === 'Super Admin' || log.user?.role === 'Super Admin') ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '99px',
                                background: '#ECFDF5',
                                color: '#059669',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                border: '1px solid #A7F3D0',
                              }}
                            >
                              <Shield size={11} /> Global (All Orgs)
                            </span>
                          ) : '—'
                        )}
                      </td>

                      {/* Password Column with show/hide toggle */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '0.82rem',
                              background: isVisible ? '#F3F4F6' : 'transparent',
                              padding: isVisible ? '0.1rem 0.35rem' : '0',
                              borderRadius: '4px',
                              letterSpacing: isVisible ? 'normal' : '0.15rem',
                              color: isVisible ? 'var(--primary)' : 'var(--text-primary)',
                              fontWeight: isVisible ? 600 : 500,
                            }}
                          >
                            {isVisible ? displayPassword : '••••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(log._id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: isVisible ? 'var(--primary)' : 'var(--text-muted)',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title={isVisible ? 'Hide password' : 'Show password'}
                          >
                            {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </td>

                      {/* Action buttons: Edit and Delete */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="btn-secondary-esg"
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => openEditModal(log)}
                            title="Edit Audit Log"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn-secondary-esg"
                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: '#FECACA' }}
                            onClick={() => handleDelete(log)}
                            title="Delete Audit Log"
                          >
                            <Trash2 size={13} />
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
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            onPageChange={p => fetchLogs(p)}
          />
        </>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-box modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {editingLog ? 'Edit Audit Log' : 'Create New Audit Log'}
              </span>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                {formError && (
                  <div className="alert-esg alert-danger" style={{ marginBottom: '1rem' }}>
                    ⚠ {formError}
                  </div>
                )}

                <div className="grid-2" style={{ gap: '1rem' }}>
                  {/* User Name */}
                  <div className="form-group-esg">
                    <label className="form-label-esg">User Name <span className="required">*</span></label>
                    <input
                      type="text"
                      className="form-control-esg"
                      placeholder="e.g. Super Admin"
                      value={formData.userName}
                      onChange={e => setFormData({ ...formData, userName: e.target.value })}
                      required
                    />
                  </div>

                  {/* User Email */}
                  <div className="form-group-esg">
                    <label className="form-label-esg">User Email <span className="required">*</span></label>
                    <input
                      type="email"
                      className="form-control-esg"
                      placeholder="e.g. admin@esg360.com"
                      value={formData.userEmail}
                      onChange={e => setFormData({ ...formData, userEmail: e.target.value })}
                      required
                    />
                  </div>

                  {/* User Role */}
                  <div className="form-group-esg">
                    <label className="form-label-esg">Role</label>
                    <select
                      className="form-control-esg"
                      value={formData.userRole}
                      onChange={e => setFormData({ ...formData, userRole: e.target.value })}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  {/* Password with toggle */}
                  <div className="form-group-esg">
                    <label className="form-label-esg">Password <span className="required">*</span></label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showModalPassword ? 'text' : 'password'}
                        className="form-control-esg"
                        placeholder="Enter password"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        style={{ paddingRight: '2.5rem' }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowModalPassword(s => !s)}
                        style={{
                          position: 'absolute',
                          right: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {showModalPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Organization field (Not required for Super Admin) */}
                  <div className="form-group-esg" style={{ gridColumn: 'span 2' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <label className="form-label-esg" style={{ marginBottom: 0 }}>
                        Organization {formData.userRole !== 'Super Admin' && <span className="required">*</span>}
                      </label>
                      {formData.userRole === 'Super Admin' && (
                        <span style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          ✓ Platform-wide (No Organization Required)
                        </span>
                      )}
                    </div>

                    {formData.userRole === 'Super Admin' ? (
                      <div
                        style={{
                          padding: '0.75rem 0.95rem',
                          background: '#F8FAFC',
                          border: '1px dashed #CBD5E1',
                          borderRadius: '8px',
                          color: '#64748B',
                          fontSize: '0.82rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.55rem',
                        }}
                      >
                        <Shield size={16} style={{ color: '#059669', flexShrink: 0 }} />
                        <span>
                          <strong>Super Admin:</strong> Holds global platform-wide administrative authority across all operating entities and business units. Setting an organization is not required.
                        </span>
                      </div>
                    ) : (
                      <select
                        className="form-control-esg"
                        value={formData.organization}
                        onChange={e => setFormData({ ...formData, organization: e.target.value })}
                        required={formData.userRole !== 'Super Admin'}
                      >
                        <option value="">Select Organization</option>
                        {organizations.map(org => (
                          <option key={org._id} value={org._id}>
                            {org.name} ({org.type})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  className="btn-secondary-esg"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-esg"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : editingLog ? 'Update Audit Log' : 'Create Audit Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
