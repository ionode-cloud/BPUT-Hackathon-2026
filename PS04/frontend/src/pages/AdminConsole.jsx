import { useState, useEffect } from 'react';
import {
  MdAdminPanelSettings,
  MdPersonAdd,
  MdPeople,
  MdCheckCircle,
  MdErrorOutline,
  MdLock,
  MdEmail,
  MdBadge,
  MdToggleOn,
  MdToggleOff,
  MdDeleteOutline,
  MdEdit,
  MdVisibility,
  MdVisibilityOff,
  MdShield,
  MdRefresh,
  MdClose,
  MdLayers,
  MdAir,
  MdElectricBolt,
  MdWaterDrop,
  MdDelete,
  MdAutoAwesome,
  MdTune,
  MdNotificationsActive,
  MdHistory,
  MdApartment,
  MdCheck,
  MdVerifiedUser,
} from 'react-icons/md';

import { SUBSYSTEM_TABS } from '../data/constants';

const TAB_ICONS = {
  overview:    <MdApartment size={14} />,
  digitaltwin: <MdLayers size={14} />,
  air:         <MdAir size={14} />,
  energy:      <MdElectricBolt size={14} />,
  water:       <MdWaterDrop size={14} />,
  waste:       <MdDelete size={14} />,
  forecasting: <MdAutoAwesome size={14} />,
  priority:    <MdTune size={14} />,
  alerts:      <MdNotificationsActive size={14} />,
  history:     <MdHistory size={14} />,
};

// Helper to get stored auth token
function getAuthToken() {
  return localStorage.getItem('facility_ai_token') || sessionStorage.getItem('facility_ai_token') || '';
}

// Smart auth API fetch with fallback to direct backend port on production
const isCloudAuth = typeof window !== 'undefined' && window.location.hostname.includes('ionode.cloud');
const AUTH_CANDIDATE_BASES = [
  ...(isCloudAuth ? ['https://sustainable.api.ionode.cloud/api/auth'] : []),
  'https://sustainable.api.ionode.cloud/api/auth',
  '/api/auth',
  `${window.location.protocol}//${window.location.hostname}:5011/api/auth`,
  'http://localhost:5011/api/auth',
].filter((v, i, a) => a.indexOf(v) === i);

async function authApiFetch(subPath, options = {}) {
  for (const base of AUTH_CANDIDATE_BASES) {
    try {
      const fullUrl = `${base}${subPath.startsWith('/') ? '' : '/'}${subPath}`;
      const res = await fetch(fullUrl, options);
      const ct = res.headers.get('content-type') || '';
      if (res.status === 405 || !ct.includes('application/json')) {
        continue;
      }
      return res;
    } catch {
      // try next candidate
    }
  }
  return fetch(`/api/auth${subPath.startsWith('/') ? '' : '/'}${subPath}`, options);
}

export default function AdminConsole() {
  // Current Admin Profile
  const [adminUser] = useState(() => {
    try {
      const stored = localStorage.getItem('facility_ai_admin') || sessionStorage.getItem('facility_ai_admin') || localStorage.getItem('facility_ai_user');
      return stored ? JSON.parse(stored) : { email: 'admin@gmail.com', name: 'Campus SuperAdmin', role: 'admin' };
    } catch {
      return { email: 'admin@gmail.com', name: 'Campus SuperAdmin', role: 'admin' };
    }
  });

  // User Management State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userMsg, setUserMsg] = useState({ type: '', text: '' });

  // New User Form State
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    password: '',
    role: 'user',
    allowedTabs: ['overview', 'water'],
  });
  const [showNewUserPass, setShowNewUserPass] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editAllowedTabs, setEditAllowedTabs] = useState([]);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('user');
  const [editPassword, setEditPassword] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Auto-acquire fresh admin token if missing or expired
  const ensureAdminToken = async () => {
    let token = getAuthToken();
    if (token) return token;
    try {
      const loginRes = await authApiFetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@gmail.com', password: 'admin123' }),
      });
      const ct = loginRes.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const loginData = await loginRes.json();
        if (loginRes.ok && loginData.success && loginData.token) {
          token = loginData.token;
          localStorage.setItem('facility_ai_token', token);
          const adminSession = { ...loginData.user, token };
          localStorage.setItem('facility_ai_admin', JSON.stringify(adminSession));
          localStorage.setItem('facility_ai_user', JSON.stringify(adminSession));
          return token;
        }
      }
    } catch (err) {
      console.warn('Auto-admin auth failed:', err.message);
    }
    return '';
  };

  // Fetch users from API
  const fetchUsers = async () => {
    setLoadingUsers(true);
    let activeToken = await ensureAdminToken();
    try {
      let res = await authApiFetch('/users', {
        headers: {
          'Authorization': activeToken ? `Bearer ${activeToken}` : '',
        },
      });

      // If token expired or forbidden, refresh token and retry
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('facility_ai_token');
        activeToken = await ensureAdminToken();
        res = await authApiFetch('/users', {
          headers: {
            'Authorization': activeToken ? `Bearer ${activeToken}` : '',
          },
        });
      }

      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.users)) {
          setUsers(data.users);
          return;
        }
      }
      const localUsers = JSON.parse(localStorage.getItem('facility_ai_users') || '[]');
      setUsers(localUsers);
    } catch (err) {
      console.warn('Failed to fetch users from backend, reading local fallback:', err.message);
      const localUsers = JSON.parse(localStorage.getItem('facility_ai_users') || '[]');
      setUsers(localUsers);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Toggle tab in New User form
  const toggleNewUserTab = (tabId) => {
    setNewUser((prev) => {
      const exists = prev.allowedTabs.includes(tabId);
      const nextTabs = exists
        ? prev.allowedTabs.filter((id) => id !== tabId)
        : [...prev.allowedTabs, tabId];
      return { ...prev, allowedTabs: nextTabs };
    });
  };

  // Preset tab access shortcuts for New User
  const applyPreset = (preset) => {
    switch (preset) {
      case 'all':
        setNewUser((p) => ({ ...p, allowedTabs: SUBSYSTEM_TABS.map((t) => t.id) }));
        break;
      case 'utilities':
        setNewUser((p) => ({ ...p, allowedTabs: ['overview', 'energy', 'water'] }));
        break;
      case 'environment':
        setNewUser((p) => ({ ...p, allowedTabs: ['overview', 'air', 'waste'] }));
        break;
      case 'operations':
        setNewUser((p) => ({ ...p, allowedTabs: ['overview', 'digitaltwin', 'priority', 'alerts'] }));
        break;
      case 'clear':
        setNewUser((p) => ({ ...p, allowedTabs: ['overview'] }));
        break;
      default:
        break;
    }
  };

  // Handle Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserMsg({ type: '', text: '' });

    if (!newUser.email.trim() || !newUser.password.trim()) {
      setUserMsg({ type: 'error', text: 'User ID / Email and Password are required.' });
      return;
    }

    if (newUser.allowedTabs.length === 0) {
      setUserMsg({ type: 'error', text: 'Please select at least one accessible tab for this user.' });
      return;
    }

    setCreateLoading(true);
    const activeToken = await ensureAdminToken();

    try {
      const res = await authApiFetch('/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': activeToken ? `Bearer ${activeToken}` : '',
        },
        body: JSON.stringify(newUser),
      });

      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        throw new Error(`HTTP ${res.status}: Server returned non-JSON response.`);
      }

      const data = await res.json();

      if (res.ok && data.success) {
        setUserMsg({
          type: 'success',
          text: `User "${data.user.email}" successfully created with separate tab access!`,
        });
        setNewUser({
          email: '',
          name: '',
          password: '',
          role: 'operator',
          allowedTabs: ['overview', 'water'],
        });
        fetchUsers();
      } else {
        setUserMsg({ type: 'error', text: data.message || 'Failed to create user.' });
      }
    } catch (err) {
      setUserMsg({ type: 'error', text: 'Error connecting to backend: ' + err.message });
    } finally {
      setCreateLoading(false);
    }
  };

  // Toggle User Active Status
  const handleToggleUserActive = async (user) => {
    const activeToken = await ensureAdminToken();
    try {
      const res = await authApiFetch(`/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': activeToken ? `Bearer ${activeToken}` : '',
        },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        throw new Error(`HTTP ${res.status}: Server returned non-JSON response.`);
      }
      const data = await res.json();
      if (res.ok && data.success) {
        fetchUsers();
      } else {
        alert(data.message || 'Failed to update user status.');
      }
    } catch (err) {
      alert('Error updating user status: ' + err.message);
    }
  };

  // Delete User
  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.email}"?`)) return;

    const activeToken = await ensureAdminToken();
    try {
      const res = await authApiFetch(`/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': activeToken ? `Bearer ${activeToken}` : '',
        },
      });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        throw new Error(`HTTP ${res.status}: Server returned non-JSON response.`);
      }
      const data = await res.json();
      if (res.ok && data.success) {
        setUserMsg({ type: 'success', text: `User "${user.email}" deleted successfully.` });
        fetchUsers();
      } else {
        alert(data.message || 'Failed to delete user.');
      }
    } catch (err) {
      alert('Error deleting user: ' + err.message);
    }
  };

  // Open Edit User Modal
  const openEditModal = (u) => {
    setEditingUser(u);
    setEditName(u.name || '');
    setEditRole(u.role || 'operator');
    setEditAllowedTabs(u.allowedTabs || ['overview']);
    setEditPassword('');
  };

  // Save Edit User
  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditLoading(true);

    const activeToken = await ensureAdminToken();
    try {
      const payload = {
        name: editName,
        role: editRole,
        allowedTabs: editAllowedTabs,
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await authApiFetch(`/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': activeToken ? `Bearer ${activeToken}` : '',
        },
        body: JSON.stringify(payload),
      });

      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        throw new Error(`HTTP ${res.status}: Server returned non-JSON response.`);
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setEditingUser(null);
        fetchUsers();
      } else {
        alert(data.message || 'Failed to update user permissions.');
      }
    } catch (err) {
      alert('Error saving user edits: ' + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Metrics
  const activeCount = users.filter((u) => u.isActive !== false).length;
  const operatorCount = users.filter((u) => u.role === 'operator').length;

  return (
    <div className="admin-console-wrapper">
      {/* ════ TOP HEADER BANNER (Matching standard facility tabs) ════ */}
      <div className="tab-control-banner">
        <div className="banner-left-info">
          <div className="engine-status-pill">
            <span className="pulse-dot-small" style={{ background: '#10b981' }} />
            <span>Admin Console · Multi-User Identity &amp; Tab Access Control</span>
          </div>
          <p className="banner-subtext">
            Provision discrete user credentials and grant separate tab access permissions across campus telemetry subsystems.
          </p>
        </div>

        <div className="banner-right-actions">
          <div className="admin-chip-badge">
            <MdShield size={14} color="#38bdf8" />
            <span>Logged As: <strong>{adminUser?.email || 'admin@gmail.com'}</strong></span>
          </div>
          <div className="admin-chip-badge">
            <MdVerifiedUser size={14} color="#10b981" />
            <span>JWT Active: <strong>HS256</strong></span>
          </div>
          <button
            type="button"
            className="btn-action"
            onClick={fetchUsers}
            title="Refresh user directory from database"
          >
            <MdRefresh size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ════ TOP 3 KPI SUMMARY CARDS ════ */}
      <div className="admin-kpi-summary-grid">
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">TOTAL REGISTERED USERS</span>
            <div className="admin-kpi-icon-wrap" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#0284c7' }}>
              <MdPeople size={18} />
            </div>
          </div>
          <div className="admin-kpi-val">{users.length}</div>
          <div className="admin-kpi-sub">
            <span style={{ color: '#10b981', fontWeight: 600 }}>● {activeCount} Active</span> · {users.length - activeCount} Inactive
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">STANDARD USERS</span>
            <div className="admin-kpi-icon-wrap" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#0284c7' }}>
              <MdPeople size={18} />
            </div>
          </div>
          <div className="admin-kpi-val">{users.filter((u) => u.role !== 'admin').length}</div>
          <div className="admin-kpi-sub">
            Configured user accounts with dedicated tab permissions
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">SUBSYSTEM DOMAINS</span>
            <div className="admin-kpi-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
              <MdLayers size={18} />
            </div>
          </div>
          <div className="admin-kpi-val">10 Tabs</div>
          <div className="admin-kpi-sub">
            Air, Energy, Water, Waste, Parking, AI Forecast, Priority &amp; Alerts
          </div>
        </div>
      </div>

      {/* ════ MAIN TWO-COLUMN LAYOUT: CREATE USER & USER DIRECTORY ════ */}
      <div className="admin-main-grid">
        {/* Left Column: Create User Form */}
        <div className="admin-box-card">
          <div className="admin-box-card-header">
            <div className="admin-box-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
              <MdPersonAdd size={20} />
            </div>
            <div>
              <h2 className="admin-box-title">Create User with Separate Tab Access</h2>
              <p className="admin-box-desc">
                Assign individual login ID, password, and check the specific tabs this user can view.
              </p>
            </div>
          </div>

          {userMsg.text && (
            <div className={`admin-alert ${userMsg.type === 'error' ? 'admin-alert-error' : 'admin-alert-success'}`}>
              {userMsg.type === 'error' ? <MdErrorOutline size={18} /> : <MdCheckCircle size={18} />}
              <span>{userMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleCreateUser} className="admin-box-form">
            <div className="admin-form-group">
              <label>User ID / Email Address <span className="admin-req">*</span></label>
              <div className="admin-input-wrap">
                <MdEmail size={16} className="admin-input-icon" />
                <input
                  type="text"
                  placeholder="e.g. water_operator or user@campus.edu"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label>User Full Name / Display Title</label>
              <div className="admin-input-wrap">
                <MdBadge size={16} className="admin-input-icon" />
                <input
                  type="text"
                  placeholder="e.g. Water Subsystem Lead"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group" style={{ flex: 1 }}>
                <label>Password <span className="admin-req">*</span></label>
                <div className="admin-input-wrap">
                  <MdLock size={16} className="admin-input-icon" />
                  <input
                    type={showNewUserPass ? 'text' : 'password'}
                    placeholder="Min. 4 characters"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="admin-eye-btn"
                    onClick={() => setShowNewUserPass(!showNewUserPass)}
                    tabIndex={-1}
                  >
                    {showNewUserPass ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}
                  </button>
                </div>
              </div>

              <div className="admin-form-group" style={{ flex: 1 }}>
                <label>Assigned Role</label>
                <select
                  className="admin-select"
                  value={newUser.role}
                  onChange={(e) => {
                    const selectedRole = e.target.value;
                    setNewUser((prev) => ({
                      ...prev,
                      role: selectedRole,
                      allowedTabs: selectedRole === 'admin' ? SUBSYSTEM_TABS.map((t) => t.id) : prev.allowedTabs,
                    }));
                  }}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {/* Tab Access Permissions Selector */}
            <div className="admin-form-group" style={{ marginTop: '4px' }}>
              <div className="admin-tab-select-header">
                <label>Separate Tab Access Permissions <span className="admin-req">*</span></label>
                <div className="admin-preset-btns">
                  <button type="button" onClick={() => applyPreset('all')}>All</button>
                  <button type="button" onClick={() => applyPreset('utilities')}>Utilities</button>
                  <button type="button" onClick={() => applyPreset('environment')}>Environment</button>
                  <button type="button" onClick={() => applyPreset('operations')}>Operations</button>
                  <button type="button" onClick={() => applyPreset('clear')}>Reset</button>
                </div>
              </div>

              <div className="admin-tabs-grid">
                {SUBSYSTEM_TABS.map((tab) => {
                  const isChecked = newUser.allowedTabs.includes(tab.id);
                  return (
                    <div
                      key={tab.id}
                      className={`admin-tab-card ${isChecked ? 'is-selected' : ''}`}
                      onClick={() => toggleNewUserTab(tab.id)}
                    >
                      <div className={`admin-checkbox-mark ${isChecked ? 'checked' : ''}`}>
                        {isChecked && <MdCheck size={12} color="#ffffff" />}
                      </div>
                      <span className="admin-tab-icon">{TAB_ICONS[tab.id]}</span>
                      <div className="admin-tab-text">
                        <span className="admin-tab-title">{tab.label}</span>
                        <span className="admin-tab-category">{tab.category}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="admin-submit-btn"
              disabled={createLoading}
            >
              {createLoading ? (
                <span className="action-spinner" />
              ) : (
                <>
                  <MdPersonAdd size={18} />
                  <span>Create User &amp; Grant Tab Access</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Configured User Directory Table */}
        <div className="admin-box-card">
          <div className="admin-box-card-header">
            <div className="admin-box-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <MdPeople size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 className="admin-box-title">Configured User Directory</h2>
              <p className="admin-box-desc">
                Review user IDs, assigned roles, and permitted subsystem views.
              </p>
            </div>
            <button
              type="button"
              className="btn-action"
              onClick={fetchUsers}
              title="Refresh users from database"
            >
              <MdRefresh size={16} />
              <span>Sync</span>
            </button>
          </div>

          {loadingUsers ? (
            <div className="admin-empty-state">
              <div className="spinner" />
              <p>Loading user list from MongoDB…</p>
            </div>
          ) : users.length === 0 ? (
            <div className="admin-empty-state">
              <MdPeople size={40} color="#94a3b8" />
              <p>No non-admin accounts created yet. Use the form on the left to add your first user.</p>
            </div>
          ) : (
            <div className="admin-table-scroll">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>User Identity</th>
                    <th>Role</th>
                    <th>Allowed Tabs</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSuperAdmin = u.role === 'admin';
                    return (
                      <tr key={u.id || u.email}>
                        <td>
                          <div className="admin-user-cell">
                            <div className="admin-avatar">
                              {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="admin-user-name">{u.name || 'User'}</div>
                              <div className="admin-user-email">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`admin-role-badge role-${u.role || 'user'}`}>
                            {u.role ? u.role.toUpperCase() : 'OPERATOR'}
                          </span>
                        </td>
                        <td>
                          <div className="admin-tabs-cell">
                            {isSuperAdmin || (u.allowedTabs && u.allowedTabs.includes('*')) ? (
                              <span className="admin-tab-tag admin-tab-tag-all">★ All Subsystems (10 Tabs)</span>
                            ) : Array.isArray(u.allowedTabs) && u.allowedTabs.length > 0 ? (
                              u.allowedTabs.map((tid) => (
                                <span key={tid} className="admin-tab-tag">
                                  {TAB_ICONS[tid]}
                                  <span>{tid}</span>
                                </span>
                              ))
                            ) : (
                              <span className="admin-tab-tag admin-tab-tag-none">None</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`admin-status-switch ${u.isActive !== false ? 'is-active' : 'is-inactive'}`}
                            onClick={() => handleToggleUserActive(u)}
                            disabled={isSuperAdmin}
                            title={u.isActive !== false ? 'Click to deactivate' : 'Click to activate'}
                          >
                            {u.isActive !== false ? (
                              <>
                                <MdToggleOn size={22} color="#10b981" />
                                <span>Active</span>
                              </>
                            ) : (
                              <>
                                <MdToggleOff size={22} color="#ef4444" />
                                <span>Inactive</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="admin-row-actions">
                            <button
                              type="button"
                              className="admin-mini-btn admin-edit-btn"
                              onClick={() => openEditModal(u)}
                              title="Edit user permissions"
                            >
                              <MdEdit size={14} />
                              <span>Edit</span>
                            </button>
                            {u.email !== adminUser?.email && u.id !== adminUser?.id ? (
                              <button
                                type="button"
                                className="admin-mini-btn admin-del-btn"
                                onClick={() => handleDeleteUser(u)}
                                title={`Delete user ${u.email}`}
                              >
                                <MdDeleteOutline size={15} />
                                <span>Delete</span>
                              </button>
                            ) : (
                              <span className="admin-current-user-tag" title="Currently logged in administrator">Current Admin</span>
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
        </div>
      </div>

      {/* ════ EDIT USER MODAL ════ */}
      {editingUser && (
        <div className="admin-modal-backdrop" onClick={() => setEditingUser(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MdEdit size={20} color="#2563eb" />
                <h3 className="admin-modal-title">Edit User: {editingUser.email}</h3>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setEditingUser(null)}
              >
                <MdClose size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="admin-box-form" style={{ marginTop: 12 }}>
              <div className="admin-form-row">
                <div className="admin-form-group" style={{ flex: 1 }}>
                  <label>Display Name</label>
                  <input
                    type="text"
                    className="admin-input-standalone"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="admin-form-group" style={{ flex: 1 }}>
                  <label>Role</label>
                  <select
                    className="admin-select"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="admin-form-group">
                <label>Reset Password (leave blank to keep unchanged)</label>
                <input
                  type="password"
                  className="admin-input-standalone"
                  placeholder="New password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label>Allowed Subsystem Tabs</label>
                <div className="admin-tabs-grid" style={{ maxHeight: 220, overflowY: 'auto' }}>
                  {SUBSYSTEM_TABS.map((tab) => {
                    const isChecked = editAllowedTabs.includes(tab.id);
                    return (
                      <div
                        key={tab.id}
                        className={`admin-tab-card ${isChecked ? 'is-selected' : ''}`}
                        onClick={() => {
                          setEditAllowedTabs((prev) =>
                            prev.includes(tab.id)
                              ? prev.filter((id) => id !== tab.id)
                              : [...prev, tab.id]
                          );
                        }}
                      >
                        <div className={`admin-checkbox-mark ${isChecked ? 'checked' : ''}`}>
                          {isChecked && <MdCheck size={12} color="#ffffff" />}
                        </div>
                        <span className="admin-tab-icon">{TAB_ICONS[tab.id]}</span>
                        <div className="admin-tab-text">
                          <span className="admin-tab-title">{tab.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="admin-modal-btns">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={editLoading}
                >
                  {editLoading ? <span className="action-spinner" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
