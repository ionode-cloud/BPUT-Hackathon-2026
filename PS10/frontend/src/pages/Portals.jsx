import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { ErrorBox, Kpi, Level, Loading, ScoreBar, Status, Toast, useApi } from '../components/ui'

export function MentorHome() {
  const { data, error, loading } = useApi('/me/profile')
  const nav = useNavigate()
  if (error) return <ErrorBox error={error} />
  if (loading || !data) return <Loading />
  const levels = data.mentees.reduce((m, s) => ({ ...m, [s.readiness_level]: (m[s.readiness_level] || 0) + 1 }), {})
  return (
    <>
      <div className="topbar"><div><h1>My mentees</h1><p>{data.mentor} · students assigned to you, weakest first</p></div></div>
      <div className="kpis">
        <Kpi label="Mentees" value={data.total} tone="accent" />
        <Kpi label="At risk of remaining unplaced" value={data.at_risk} tone="warn" sub="escalated to you automatically" />
        <Kpi label="Not ready" value={levels['Not Ready'] || 0} /><Kpi label="Highly employable" value={levels['Highly Employable'] || 0} tone="ok" />
      </div>
      <div className="card"><div className="table-wrap"><table>
        <thead><tr><th>Student</th><th>Branch</th><th className="num">CGPA</th><th style={{ width: 170 }}>Readiness</th><th>Level</th><th className="num">P(placed)</th><th>Top skills</th></tr></thead>
        <tbody>{data.mentees.map((s) => (
          <tr key={s.id} className="click" onClick={() => nav(`/students/${s.id}`)}>
            <td><b>{s.name}</b><div className="small muted">{s.roll_no}</div></td><td>{s.branch}</td><td className="num">{s.cgpa}</td>
            <td><div className="row"><div style={{ flex: 1 }}><ScoreBar value={s.readiness_score} /></div><b>{s.readiness_score.toFixed(0)}</b></div></td>
            <td><Level level={s.readiness_level} />{s.at_risk && <span className="badge b-red" style={{ marginLeft: 4 }}>At risk</span>}</td>
            <td className="num">{s.placement_probability}%</td><td>{s.top_skills.map((k) => <span key={k} className="tag">{k}</span>)}</td>
          </tr>))}</tbody>
      </table></div></div>
    </>)
}

export function RecruiterHome() {
  const { data, error, loading, reload } = useApi('/me/profile')
  const nav = useNavigate()
  const [toast, setToast] = useState('')
  const [uploadModal, setUploadModal] = useState(null)
  const [letterName, setLetterName] = useState('')
  const [busy, setBusy] = useState(false)

  if (error) return <ErrorBox error={error} />
  if (loading || !data) return <Loading />

  const act = async (o, status) => {
    try { await api.post(`/offers/${o.id}/transition`, { status }); setToast(`Offer #${o.id} → ${status}`); reload() } catch (e) { setToast(e.message) }
  }

  const handleUploadLetter = async (e) => {
    e?.preventDefault()
    if (!uploadModal) return
    setBusy(true)
    try {
      await api.post(`/offers/${uploadModal.id}/upload-letter`, {
        filename: letterName.trim() || `${uploadModal.student.replace(/\s+/g, '_')}_Official_Offer.pdf`,
        notes: `Uploaded by recruiter from ${data.company.name}`
      })
      setToast(`Offer letter uploaded for ${uploadModal.student}! Student and TPO notified.`)
      setUploadModal(null)
      setLetterName('')
      reload()
    } catch (err) {
      setToast(err.message || 'Failed to upload offer letter')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg, #0d9488, #0284c7)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 800, flexShrink: 0, boxShadow: '0 4px 12px rgba(13,148,136,0.3)' }}>
            🏢
          </div>
          <div>
            <h1 style={{ margin: 0 }}>{data.company.name}</h1>
            <p style={{ margin: '3px 0 0' }}>Corporate Recruiter Portal · {data.company.sector} · <Status s={data.company.tier} /></p>
          </div>
        </div>
        <button className="btn primary" onClick={() => nav('/drives')}>+ Post a Job / Drive</button>
      </div>

      <div className="kpis">
        <Kpi label="Active drives" value={data.drives.length} tone="accent" />
        <Kpi label="Shortlisted candidates" value={data.drives.reduce((a, d) => a + d.shortlisted, 0)} />
        <Kpi label="Offers issued" value={data.offers.length} />
        <Kpi label="Offers accepted" value={data.offers.filter((o) => ['Accepted', 'Joined'].includes(o.status)).length} tone="ok" />
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="row between" style={{ marginBottom: 8 }}>
            <h2>Your hiring drives</h2>
            <span className="small muted">Click to view AI candidate ranking</span>
          </div>
          <table>
            <thead><tr><th>Drive</th><th>Status</th><th>Date</th><th className="num">Candidates</th></tr></thead>
            <tbody>{data.drives.map((d) => (
              <tr key={d.id} className="click" onClick={() => nav(`/drives/${d.id}`)}>
                <td><b>{d.role}</b><div className="small muted">₹{d.ctc_lpa} LPA · {d.job_type}</div></td>
                <td><Status s={d.status} /></td>
                <td className="small">{d.date ? `${d.date} ${d.slot}` : 'to be scheduled'}</td>
                <td className="num">{d.shortlisted + d.selected + d.rejected}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        <div className="card">
          <div className="row between" style={{ marginBottom: 8 }}>
            <h2>Candidate offers & letters</h2>
            <span className="small muted">{data.offers.length} total</span>
          </div>
          {data.offers.length === 0 ? (
            <div className="muted small">No offers yet – select candidates from your drive's ranked pool.</div>
          ) : (
            <table>
              <thead><tr><th>Candidate</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{data.offers.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link to={`/students/${o.student_id}`} style={{ fontWeight: 700 }}>{o.student}</Link>
                    <div className="small muted">{o.branch}</div>
                  </td>
                  <td className="small">{o.role}<div className="muted">₹{o.ctc_lpa} L</div></td>
                  <td><Status s={o.status} /></td>
                  <td>
                    <div className="row" style={{ gap: 4 }}>
                      <button
                        type="button"
                        className="btn small"
                        title="Upload official offer letter PDF"
                        onClick={() => { setUploadModal(o); setLetterName(`${o.student.replace(/\s+/g, '_')}_Offer_Letter.pdf`) }}
                      >
                        📄 Upload Letter
                      </button>
                      {o.allowed.includes('Joined') && <button className="btn small" onClick={() => act(o, 'Joined')}>Confirm joined</button>}
                      {o.allowed.includes('Withdrawn') && <button className="btn small" onClick={() => act(o, 'Withdrawn')}>Withdraw</button>}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>

      {/* Upload Offer Letter Modal */}
      {uploadModal && (
        <div className="modal-backdrop" onClick={() => setUploadModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>
              📄 Upload Official Offer Letter
            </h3>
            <p className="small muted" style={{ margin: '0 0 14px' }}>
              Upload the offer letter for <b>{uploadModal.student}</b> ({uploadModal.role}, ₹{uploadModal.ctc_lpa} LPA). Both the student and TPO will be notified.
            </p>
            <form onSubmit={handleUploadLetter}>
              <div style={{ marginBottom: 14 }}>
                <label className="small" style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>Document File Name / Reference</label>
                <input
                  type="text"
                  required
                  value={letterName}
                  onChange={(e) => setLetterName(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn" onClick={() => setUploadModal(null)}>Cancel</button>
                <button type="submit" className="btn primary" disabled={busy}>
                  {busy ? 'Uploading…' : 'Upload & Notify →'}
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

export { default as Account } from './Account'
