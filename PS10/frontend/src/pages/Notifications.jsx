import { useState } from 'react'
import { api } from '../api'
import { isStaff, useAuth } from '../auth'
import { ErrorBox, Loading, Toast, useApi } from '../components/ui'

const CH = { 'In-app': 'b-blue', Email: 'b-violet', WhatsApp: 'b-green', SMS: 'b-amber' }

export default function Notifications() {
  const { user } = useAuth()
  const staff = isStaff(user)
  const [audience, setAudience] = useState('')
  const [category, setCategory] = useState('')
  const { data, error, loading, reload } = useApi(`/notifications?limit=120&audience=${audience}&category=${encodeURIComponent(category)}`)
  const [toast, setToast] = useState('')
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [bTitle, setBTitle] = useState('')
  const [bMsg, setBMsg] = useState('')
  const [bBranch, setBBranch] = useState('')
  const [bBatch, setBBatch] = useState('')
  const [bMinCgpa, setBMinCgpa] = useState('0')
  const [bChannel, setBChannel] = useState('In-app')

  const handleBroadcast = async (e) => {
    e?.preventDefault()
    if (!bTitle.trim() || !bMsg.trim()) return
    setBusy(true)
    try {
      const res = await api.post('/notifications/broadcast', {
        title: bTitle.trim(),
        message: bMsg.trim(),
        branch: bBranch,
        batch: bBatch ? Number(bBatch) : null,
        min_cgpa: Number(bMinCgpa) || 0,
        channel: bChannel
      })
      setToast(`Broadcast successfully sent to ${res.recipients_count} student(s) via ${res.channel}!`)
      setBTitle('')
      setBMsg('')
      setShowBroadcast(false)
      reload()
    } catch (err) {
      setToast(err.message || 'Failed to send broadcast')
    } finally {
      setBusy(false)
    }
  }

  const run = async () => {
    setBusy(true)
    const r = await api.post('/automation/run')
    setBusy(false)
    setToast(`Automation ran: ${r.document_reminders} doc reminders, ${r.response_reminders} offer reminders, ${r.mentor_escalations} mentor escalations, ${r.recruiter_followups} recruiter follow-ups`)
    reload()
  }
  if (error) return <ErrorBox error={error} />
  return (
    <>
      <div className="topbar">
        <div><h1>Communication & Workflow Automation</h1><p>Targeted, de-duplicated alerts replace manual e-mail / WhatsApp coordination</p></div>
        <div className="row">
          {staff && (
            <>
              <button className="btn" style={{ borderColor: '#2563eb', color: '#2563eb', background: '#eff6ff', fontWeight: 600 }} onClick={() => setShowBroadcast(true)}>
                📢 Broadcast Announcement
              </button>
              <button className="btn primary" disabled={busy} onClick={run}>{busy ? 'Running…' : '▶ Run automation now'}</button>
            </>
          )}
        </div>
      </div>
      <div className="grid g-1-2">
        <div className="card">
          <h2>Outbox by category</h2>
          <ul className="list">
            <li className="row between click" style={{ cursor: 'pointer' }} onClick={() => setCategory('')}><span>All</span><b>{data?.stats.reduce((a, b) => a + b.count, 0)}</b></li>
            {data?.stats.map((s) => <li key={s.category} className="row between" style={{ cursor: 'pointer', fontWeight: category === s.category ? 700 : 400 }} onClick={() => setCategory(s.category)}><span>{s.category}</span><b>{s.count}</b></li>)}
          </ul>
          <h3 className="mt">Automation rules</h3>
          <ul className="small" style={{ paddingLeft: 18, lineHeight: 1.7 }}>
            <li>Drive announcements → only eligible students</li>
            <li>Shortlist & schedule alerts → WhatsApp / SMS</li>
            <li>Pending documents on accepted offers → reminder with deadline</li>
            <li>Offer response deadline → student reminder</li>
            <li>Offer past deadline → recruiter follow-up e-mail</li>
            <li>At-risk & unplaced → escalation to faculty mentor</li>
          </ul>
        </div>
        <div className="card">
          <div className="filters">
            {staff && <div className="pill-tabs">{['', 'student', 'recruiter', 'mentor', 'admin'].map((a) => <button key={a} className={audience === a ? 'on' : ''} onClick={() => setAudience(a)}>{a || 'Everyone'}</button>)}</div>}
            <span className="small muted">{data?.total} messages</span>
          </div>
          {loading || !data ? <Loading /> : (
            <ul className="list">
              {data.items.map((n) => (
                <li key={n.id}>
                  <div className="row between"><b>{n.title}</b><span className={`badge ${CH[n.channel]}`}>{n.channel}</span></div>
                  <div className="small">{n.message}</div>
                  <div className="small muted">To: {n.recipient} ({n.audience}) · {n.category} · {n.created_at.replace('T', ' ')}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {/* ── Broadcast Announcement Modal ── */}
      {showBroadcast && (
        <div className="modal-backdrop" onClick={() => setShowBroadcast(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px', color: '#0f172a' }}>
              📢 Broadcast Placement Announcement
            </h3>
            <p className="small muted" style={{ margin: '0 0 16px', lineHeight: 1.45 }}>
              Send targeted placement alerts, drive notifications, and updates to selected student groups.
            </p>
            <form onSubmit={handleBroadcast}>
              <div className="grid g2" style={{ marginBottom: 12 }}>
                <div>
                  <label className="small" style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>Target Branch</label>
                  <select value={bBranch} onChange={(e) => setBBranch(e.target.value)} style={{ width: '100%' }}>
                    <option value="">All Branches</option>
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="ME">ME</option>
                    <option value="CE">CE</option>
                    <option value="IT">IT</option>
                  </select>
                </div>
                <div>
                  <label className="small" style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>Delivery Channel</label>
                  <select value={bChannel} onChange={(e) => setBChannel(e.target.value)} style={{ width: '100%' }}>
                    <option value="In-app">In-app</option>
                    <option value="Email">Email</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="SMS">SMS</option>
                  </select>
                </div>
              </div>

              <div className="grid g2" style={{ marginBottom: 12 }}>
                <div>
                  <label className="small" style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>Batch</label>
                  <select value={bBatch} onChange={(e) => setBBatch(e.target.value)} style={{ width: '100%' }}>
                    <option value="">All Batches</option>
                    <option value="2027">2027</option>
                    <option value="2026">2026</option>
                  </select>
                </div>
                <div>
                  <label className="small" style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>Minimum CGPA</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={bMinCgpa}
                    onChange={(e) => setBMinCgpa(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="small" style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>Announcement Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Google Campus Hiring Drive – Registration Open"
                  value={bTitle}
                  onChange={(e) => setBTitle(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="small" style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>Message Content</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter the full announcement details, test schedule, eligibility instructions..."
                  value={bMsg}
                  onChange={(e) => setBMsg(e.target.value)}
                />
              </div>

              <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn" onClick={() => setShowBroadcast(false)}>Cancel</button>
                <button type="submit" className="btn primary" disabled={busy}>
                  {busy ? 'Sending…' : 'Send Broadcast Now →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast msg={toast} onClose={() => setToast('')} />
    </>
  )
}
