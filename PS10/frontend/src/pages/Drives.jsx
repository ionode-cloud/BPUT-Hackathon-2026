import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { ErrorBox, Loading, Status, Toast, useApi } from '../components/ui'

const SAMPLE_JD = `Hiring: Backend Developer (FTE) – 2027 batch.
Must have: Python, Django, REST APIs, SQL, Git and strong DSA.
Good to have: Docker, AWS.
Eligibility: CSE / IT with CGPA 7.0 and above, no active backlogs. CTC 11 LPA.`

export default function Drives() {
  const { user } = useAuth()
  const { data, error, loading, reload } = useApi('/drives')
  const companies = useApi('/companies')
  const nav = useNavigate()
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ company_id: 8, title: 'Backend Developer', jd_text: SAMPLE_JD, openings: 6, mock_benchmark: 62, window_start: '2026-10-26', window_end: '2026-11-13' })
  const [parsed, setParsed] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  const parse = async () => setParsed(await api.post('/jobs/parse', { text: form.jd_text }))
  const create = async () => {
    setBusy(true)
    try {
      const r = await api.post('/jobs', { ...form, company_id: Number(form.company_id), openings: Number(form.openings), mock_benchmark: Number(form.mock_benchmark) })
      setToast(`Drive created – ${r.matching.eligible} eligible, ${r.matching.shortlisted} auto-shortlisted`)
      setShowNew(false); setParsed(null); reload(); nav(`/drives/${r.drive_id}`)
    } catch (e) { setToast(e.message) } finally { setBusy(false) }
  }
  if (error) return <ErrorBox error={error} />
  return (
    <>
      <div className="topbar">
        <div><h1>{user?.role === 'recruiter' ? 'Post a job description' : 'Recruiters & Matching'}</h1><p>JD parsing, eligibility filtering, AI fit scoring and explainable shortlists</p></div>
        <button className="btn primary" onClick={() => setShowNew(!showNew)}>{showNew ? 'Close' : '+ New drive from JD'}</button>
      </div>

      {showNew && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2>Create drive from a job description (NLP parsing)</h2>
          <div className="grid g2">
            <div>
              <div className="row" style={{ marginBottom: 8 }}>
                <select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                  {companies.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Role title" />
              </div>
              <textarea rows={8} value={form.jd_text} onChange={(e) => setForm({ ...form, jd_text: e.target.value })} />
              <div className="row mt small">
                <label>Openings <input type="number" value={form.openings} style={{ width: 70 }} onChange={(e) => setForm({ ...form, openings: e.target.value })} /></label>
                <label>Mock benchmark <input type="number" value={form.mock_benchmark} style={{ width: 70 }} onChange={(e) => setForm({ ...form, mock_benchmark: e.target.value })} /></label>
                <label>Window <input type="date" value={form.window_start} onChange={(e) => setForm({ ...form, window_start: e.target.value })} /> – <input type="date" value={form.window_end} onChange={(e) => setForm({ ...form, window_end: e.target.value })} /></label>
              </div>
              <div className="row mt"><button className="btn" onClick={parse}>Parse JD</button><button className="btn primary" disabled={busy} onClick={create}>{busy ? 'Matching…' : 'Create drive & run matching'}</button></div>
            </div>
            <div>
              {parsed ? (
                <div className="explain" style={{ borderLeftColor: '#15aabf' }}>
                  <div><b>Role family:</b> {parsed.role_family} · <b>Type:</b> {parsed.job_type}</div>
                  <div className="mt"><b>Required:</b> {parsed.required_skills.map((s) => <span key={s} className="tag">{s}</span>)}</div>
                  <div><b>Preferred:</b> {parsed.preferred_skills.map((s) => <span key={s} className="tag">{s}</span>) || '—'}</div>
                  <div className="mt"><b>Min CGPA:</b> {parsed.min_cgpa ?? '—'} · <b>Max backlogs:</b> {parsed.max_active_backlogs ?? '—'} · <b>CTC:</b> {parsed.ctc_lpa ?? '—'} LPA</div>
                  <div><b>Branches:</b> {parsed.allowed_branches.join(', ') || '—'}</div>
                  <div><b>Skill categories:</b> {parsed.skill_categories.join(', ')}</div>
                </div>
              ) : <div className="muted small">Click “Parse JD” to preview the extracted skills and eligibility rules.</div>}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {loading || !data ? <Loading /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Drive</th><th>Tier</th><th>Status</th><th>Date</th><th className="num">CTC</th><th className="num">Min CGPA</th><th className="num">Eligible</th><th className="num">Shortlisted</th><th className="num">Selected</th></tr></thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.id} className="click" onClick={() => nav(`/drives/${d.id}`)}>
                    <td><b>{d.company}</b><div className="small muted">{d.role} · {d.job_type} · Campus {d.campus_id}</div></td>
                    <td><Status s={d.tier} /></td><td><Status s={d.status} /></td>
                    <td className="small">{d.date ? `${d.date} ${d.slot}` : <span className="badge b-amber">Unscheduled</span>}<div className="muted">{d.venue}</div></td>
                    <td className="num">₹{d.ctc_lpa} L</td><td className="num">{d.min_cgpa}</td>
                    <td className="num">{d.eligible}</td><td className="num">{d.shortlisted + d.selected + d.rejected}</td><td className="num">{d.selected || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="small muted mt">Tip: open any drive to see the ranked candidate pool with reasons. <Link to="/schedule">Check scheduling conflicts →</Link></div>
      <Toast msg={toast} onClose={() => setToast('')} />
    </>
  )
}
