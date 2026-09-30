import { useState } from 'react'
import { api } from '../api'
import { ErrorBox, Kpi, Loading, Toast, useApi } from '../components/ui'

const ROLES = ['admin', 'officer', 'student', 'recruiter', 'mentor']

function Users() {
  const [role, setRole] = useState('')
  const [search, setSearch] = useState('')
  const { data, error, loading, reload } = useApi(`/admin/users?role=${role}`)
  const companies = useApi('/companies')
  const [f, setF] = useState({ email: '', name: '', role: 'officer', student_id: '', company_id: '', mentor_name: '' })
  const [msg, setMsg] = useState('')
  const create = async () => {
    try {
      const r = await api.post('/admin/users', { ...f, student_id: f.student_id ? Number(f.student_id) : null,
        company_id: f.company_id ? Number(f.company_id) : null, mentor_name: f.mentor_name || null })
      setMsg(`Created ${r.email}. Temporary password: ${r.temporary_password} (user must change it at first sign-in)`)
      setF({ ...f, email: '', name: '' }); reload()
    } catch (e) { setMsg(e.message) }
  }
  const patch = async (u, body) => {
    const r = await api.patch(`/admin/users/${u.id}`, body)
    setMsg(r.temporary_password ? `New temporary password for ${u.email}: ${r.temporary_password}` : `${u.email} updated`); reload()
  }
  if (error) return <ErrorBox error={error} />
  const filteredUsers = (data || []).filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div className="grid g-2-1 dash-animated">
      <div className="card">
        <div className="row between" style={{ marginBottom: 14 }}>
          <h2>👥 Users ({filteredUsers.length})</h2>
          <div className="pill-tabs">
            {['', ...ROLES].map((r) => (
              <button key={r} className={role === r ? 'on' : ''} onClick={() => setRole(r)}>
                {r ? r.charAt(0).toUpperCase() + r.slice(1) : 'All'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <input
            type="text"
            placeholder="🔍 Search users by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        {loading || !data ? <Loading /> : (
          <div className="table-wrap" style={{ maxHeight: 520, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Scope</th>
                  <th>Last sign-in</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td><b>{u.name}</b><div className="small muted">{u.email}</div></td>
                    <td><span className={`badge role-${u.role}`}>{u.role}</span></td>
                    <td className="small">{u.student_id ? `Student #${u.student_id}` : u.company_id ? `Company #${u.company_id}` : u.mentor_name || '—'}</td>
                    <td className="small muted">{u.last_login ? u.last_login.replace('T', ' ') : 'Never'}</td>
                    <td>
                      {u.is_active ? <span className="badge b-green">Active</span> : <span className="badge b-grey">Disabled</span>}
                      {u.must_change_password && <span className="badge b-amber" style={{ marginLeft: 4 }}>Temp pw</span>}
                    </td>
                    <td className="row">
                      <button className="btn small" onClick={() => patch(u, { is_active: !u.is_active })}>
                        {u.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button className="btn small" onClick={() => patch(u, { reset_password: true })}>
                        Reset pw
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="card">
        <h2>✨ Create New Account</h2>
        <label className="small" style={{ display: 'block', marginTop: 8 }}>Role
          <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} style={{ width: '100%', marginTop: 4 }}>
            {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </label>
        <label className="small" style={{ marginTop: 10, display: 'block' }}>Full Name
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. John Doe" style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }} />
        </label>
        <label className="small" style={{ marginTop: 10, display: 'block' }}>E-mail Address
          <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="name@campuslink.edu" style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }} />
        </label>
        {f.role === 'student' && (
          <label className="small" style={{ marginTop: 10, display: 'block' }}>Student ID
            <input type="number" value={f.student_id} onChange={(e) => setF({ ...f, student_id: e.target.value })} placeholder="Optional ID" style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }} />
          </label>
        )}
        {f.role === 'recruiter' && (
          <label className="small" style={{ marginTop: 10, display: 'block' }}>Company
            <select value={f.company_id} onChange={(e) => setF({ ...f, company_id: e.target.value })} style={{ width: '100%', marginTop: 4 }}>
              <option value="">Select company…</option>
              {companies.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}
        {f.role === 'mentor' && (
          <label className="small" style={{ marginTop: 10, display: 'block' }}>Mentor Name (as on student records)
            <input value={f.mentor_name} onChange={(e) => setF({ ...f, mentor_name: e.target.value })} placeholder="Dr. P. Sharma" style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }} />
          </label>
        )}
        <button className="btn primary mt" style={{ width: '100%' }} onClick={create} disabled={!f.email || !f.name}>
          Create Account with Temporary Password
        </button>
        {msg && <div className="explain mt small">{msg}</div>}
      </div>
    </div>
  )
}

function Audit() {
  const { data, error, loading } = useApi('/admin/audit?limit=300')
  if (error) return <ErrorBox error={error} />
  if (loading || !data) return <Loading />
  return (
    <div className="card dash-animated">
      <div className="row between" style={{ marginBottom: 12 }}>
        <h2>📜 Audit Trail ({data.length} events)</h2>
        <span className="live-pill"><span className="live-dot" /> Verified Ledger</span>
      </div>
      <div className="table-wrap" style={{ maxHeight: 600, overflowY: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Time (UTC)</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Detail</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id}>
                <td className="small">{r.at.replace('T', ' ')}</td>
                <td className="small">{r.user || '—'} {r.role && <span className={`badge role-${r.role}`}>{r.role}</span>}</td>
                <td><b className="small">{r.action}</b></td>
                <td className="small">{r.entity}{r.entity_id ? ` #${r.entity_id}` : ''}</td>
                <td className="small muted" style={{ maxWidth: 320 }}>{r.detail ? JSON.stringify(r.detail) : ''}</td>
                <td className="small muted">{r.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function System() {
  const ready = useApi('/ready')
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState(false)
  const act = async (path, label) => {
    setBusy(true)
    try { const r = await api.post(path); setToast(`${label}: ${JSON.stringify(r).slice(0, 140)}`) } catch (e) { setToast(e.message) } finally { setBusy(false); ready.reload() }
  }
  return (
    <div className="dash-animated">
      <div className="kpis">
        {ready.data && Object.entries(ready.data.checks).map(([k, v]) => (
          <Kpi
            key={k}
            label={k.replace('_', ' ')}
            value={String(v).split(' ')[0]}
            sub={String(v)}
            tone={['ok', 'trained', 'ready'].includes(String(v).split(' ')[0]) ? 'ok' : 'warn'}
          />
        ))}
      </div>
      <div className="grid g3">
        <div className="card">
          <h2>🧠 AI Models (PyTorch)</h2>
          <p className="small muted">Retrain every PyTorch model from the current database (e.g. after importing history or at season end).</p>
          <button className="btn primary mt" disabled={busy} onClick={() => act('/admin/retrain', 'Retrained')}>
            ↻ Retrain All Models
          </button>
        </div>
        <div className="card">
          <h2>📊 Metrics & Observability</h2>
          <p className="small muted">Prometheus metrics (request counts, latency histograms, failed logins) for Grafana dashboards and alerting.</p>
          <div className="row mt">
            <a className="btn" href="/metrics" target="_blank" rel="noreferrer">Open /metrics ↗</a>
            <a className="btn" href="/docs" target="_blank" rel="noreferrer">API Swagger Docs ↗</a>
          </div>
        </div>
        <div className="card">
          <h2>⚡ Demo Reset</h2>
          <p className="small muted">Regenerates the synthetic campus dataset and demo accounts (demo installations only).</p>
          <button className="btn danger mt" disabled={busy} onClick={() => act('/admin/reset', 'Reset')}>
            ↻ Reset Demo Data
          </button>
        </div>
      </div>
      <Toast msg={toast} onClose={() => setToast('')} />
    </div>
  )
}

export default function Admin() {
  const [tab, setTab] = useState('users')
  return (
    <div className="dash-animated">
      <div className="topbar">
        <div>
          <h1>Administrator Command Center</h1>
          <p>Accounts & roles, tamper-evident audit trail and system operations</p>
        </div>
        <div className="pill-tabs">
          {[
            ['users', '👥 Users & Roles'],
            ['audit', '📜 Audit Trail'],
            ['system', '⚡ System Health'],
          ].map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {tab === 'users' ? <Users /> : tab === 'audit' ? <Audit /> : <System />}
    </div>
  )
}
