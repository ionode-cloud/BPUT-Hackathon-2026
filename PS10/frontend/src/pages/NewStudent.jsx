import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, download, upload } from '../api'
import { Gauge, Level, ScoreBar, Toast, useApi } from '../components/ui'

const EMPTY = { name: '', email: '', phone: '', branch: 'CSE', campus_id: 1, batch: 2027, cgpa: '', tenth_pct: '', twelfth_pct: '',
  active_backlogs: 0, backlog_history: 0, internships: 0, preferred_role: '', aptitude: '', coding: '', mock_interview: '',
  communication: '', softskill: '' }

const SAMPLE_RESUME = `Ananya Mishra
ananya.mishra@gmail.com | +91 9437012345
B.Tech Computer Science and Engineering, CGPA: 8.4 (2027)
Class XII: 89% | 10th: 93%
Skills: Python, Java, DSA, SQL, React, Node.js, Git, Docker
Projects:
- Campus event portal (React, Node.js, REST APIs, MySQL)
- Crop yield prediction with Python and Machine Learning
Experience:
- Web development intern at a Bhubaneswar startup (React, Docker)
Certifications: AWS Cloud Practitioner; HackerRank SQL (Advanced)`

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v))

export default function NewStudent() {
  const meta = useApi('/meta')
  const nav = useNavigate()
  const [f, setF] = useState(EMPTY)
  const [skills, setSkills] = useState({})
  const [projects, setProjects] = useState('')
  const [certs, setCerts] = useState('')
  const [resume, setResume] = useState('')
  const [newSkill, setNewSkill] = useState('')
  const [parsed, setParsed] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [csvRes, setCsvRes] = useState(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const [uploadId, setUploadId] = useState(null)
  const fillFrom = (p) => {
    setParsed(p)
    setF((o) => ({ ...o, name: p.name || o.name, email: p.email || o.email, phone: p.phone || o.phone, branch: p.branch || o.branch,
      cgpa: p.cgpa ?? o.cgpa, tenth_pct: p.tenth_pct ?? o.tenth_pct, twelfth_pct: p.twelfth_pct ?? o.twelfth_pct,
      internships: p.internships ?? o.internships, preferred_role: p.preferred_role || o.preferred_role }))
    setSkills(p.skills)
    setProjects(p.projects.map((x) => `${x.title}${x.tech.length ? ` : ${x.tech.join(', ')}` : ''}`).join('\n'))
    setCerts(p.certifications.map((c) => c.name).join('; '))
    setToast(`Extracted ${Object.keys(p.skills).length} skills · role predicted by PyTorch classifier: ${p.preferred_role || '—'}`)
  }
  const autofill = async () => {
    if (!resume.trim()) return
    fillFrom(await api.post('/students/parse-resume', { text: resume }))
  }
  const pdfFill = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const r = await upload('/students/parse-resume-file', file)
      setResume(r.text); setUploadId(r.upload_id); fillFrom(r.parsed)
    } catch (err) { setToast(err.message) }
  }

  const addSkill = () => {
    const s = newSkill.trim().toLowerCase()
    if (s) setSkills({ ...skills, [s]: skills[s] || 2 })
    setNewSkill('')
  }

  const submit = async () => {
    setBusy(true)
    try {
      const body = {
        ...f, cgpa: num(f.cgpa), tenth_pct: num(f.tenth_pct), twelfth_pct: num(f.twelfth_pct), campus_id: Number(f.campus_id),
        batch: Number(f.batch), active_backlogs: Number(f.active_backlogs || 0), backlog_history: Number(f.backlog_history || 0),
        internships: Number(f.internships || 0), aptitude: num(f.aptitude), coding: num(f.coding), mock_interview: num(f.mock_interview),
        communication: num(f.communication), softskill: num(f.softskill), preferred_role: f.preferred_role || null,
        email: f.email || null, skills,
        projects: projects.split('\n').filter((l) => l.trim()).map((l) => { const [t, tech] = l.split(':'); return { title: t.trim(), tech: tech ? tech.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean) : [], description: l.trim() } }),
        certifications: certs.split(/[;\n]/).map((c) => c.trim()).filter(Boolean), resume_text: resume || null, resume_upload_id: uploadId,
      }
      setResult(await api.post('/students', body))
      window.scrollTo(0, 0)
    } catch (e) { setToast(e.message) } finally { setBusy(false) }
  }

  const importCsv = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try { setCsvRes(await api.post('/students/import', { csv: await file.text() })) } catch (err) { setToast(err.message) } finally { setBusy(false); e.target.value = '' }
  }

  const r = result?.readiness
  return (
    <>
      <div className="topbar">
        <div><div className="small"><Link to="/students">← Students</Link></div><h1>Register a new student</h1>
          <p>Scored instantly by the trained PyTorch models – no retraining needed. Assessments not yet taken are estimated and marked provisional.</p></div>
      </div>

      {result && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #2b8a3e' }}>
          <div className="grid g-1-2">
            <div style={{ textAlign: 'center' }}>
              <Gauge value={r.score} label="Readiness score" />
              <div className="row" style={{ justifyContent: 'center' }}><Level level={r.level} />{r.provisional && <span className="badge b-amber">Provisional</span>}</div>
            </div>
            <div>
              <h2>✓ {f.name} registered as {result.roll_no}</h2>
              <div className="explain">{r.summary}</div>
              {r.cold_start?.score_range && (
                <div className="mt small"><b>Likely range until assessments are complete:</b> {r.cold_start.score_range[0]} – {r.cold_start.score_range[1]} ({r.cold_start.level_range.join(' → ')})
                  <div className="bar mt" style={{ position: 'relative' }}><span style={{ marginLeft: `${r.cold_start.score_range[0]}%`, width: `${r.cold_start.score_range[1] - r.cold_start.score_range[0]}%`, background: '#e67700' }} /></div>
                </div>)}
              {result.login && <div className="explain mt small" style={{ borderLeftColor: '#7048e8' }}>Student portal login created: <b>{result.login.email}</b> · temporary password <code>{result.login.temporary_password}</code> (must be changed at first sign-in)</div>}
              <div className="mt small"><b>{result.eligible_drives}</b> upcoming drives eligible · top matches: {result.top_matches.filter((m) => m.eligible).map((m) => `${m.company} (${m.fit_score})`).join(', ') || 'none yet'}</div>
              <div className="row mt"><button className="btn primary" onClick={() => nav(`/students/${result.id}`)}>Open full profile →</button>
                <button className="btn" onClick={() => { setResult(null); setF(EMPTY); setSkills({}); setProjects(''); setCerts(''); setResume(''); setParsed(null); setUploadId(null) }}>Register another</button></div>
            </div>
          </div>
        </div>
      )}

      <div className="grid g-1-2">
        <div>
          <div className="card">
            <h2>1 · Resume (optional)</h2>
            <p className="small muted">Upload the student's PDF (it is stored on the profile) or paste text. Skills, CGPA, marks, projects, certifications and contacts are extracted; the target role is predicted by the PyTorch role classifier.</p>
            <textarea rows={12} value={resume} placeholder="Paste the student's resume text here…" onChange={(e) => setResume(e.target.value)} />
            <div className="row mt"><label className="btn primary" style={{ cursor: 'pointer' }}>📄 Upload resume PDF<input type="file" accept="application/pdf,.pdf" onChange={pdfFill} style={{ display: 'none' }} /></label>
              <button className="btn" onClick={autofill} disabled={!resume.trim()}>✦ Auto-fill from pasted text</button>
              <button className="btn small" onClick={() => setResume(SAMPLE_RESUME)}>Use sample</button></div>
            {parsed?.role_candidates?.length > 0 && <div className="small mt">Role prediction: {parsed.role_candidates.map((c) => `${c.role} ${(c.p * 100).toFixed(0)}%`).join(' · ')}</div>}
          </div>
          <div className="card mt">
            <h2>Bulk import (CSV)</h2>
            <p className="small muted">One row per student. Skills as <code>python:3;sql:2</code>. Leave assessment columns blank if not yet taken.</p>
            <div className="row"><button className="btn small" onClick={() => download('/students/template.csv', 'campuslink_students_template.csv')}>⬇ Download template</button>
              <label className="btn small primary" style={{ cursor: 'pointer' }}>⬆ Upload CSV<input type="file" accept=".csv,text/csv" onChange={importCsv} style={{ display: 'none' }} /></label></div>
            {csvRes && (
              <div className="mt small">
                <b>{csvRes.created.length} created</b>, {csvRes.errors.length} error(s)
                <ul className="list">{csvRes.created.map((c) => <li key={c.id} className="row between"><span><Link to={`/students/${c.id}`}>{c.name}</Link>{c.login && <span className="small muted"> · {c.login.email} / <code>{c.login.temporary_password}</code></span>}</span><span>{c.readiness} <Level level={c.level} />{c.provisional && <span className="badge b-amber">Provisional</span>}</span></li>)}
                  {csvRes.errors.map((e) => <li key={e.row} style={{ color: '#e03131' }}>Row {e.row} ({e.name || '—'}): {e.error}</li>)}</ul>
              </div>)}
          </div>
        </div>

        <div className="card">
          <h2>2 · Student details</h2>
          <div className="grid g3">
            <label className="small">Full name*<input value={f.name} onChange={set('name')} style={{ width: '100%' }} /></label>
            <label className="small">E-mail<input value={f.email} onChange={set('email')} style={{ width: '100%' }} /></label>
            <label className="small">Phone<input value={f.phone} onChange={set('phone')} style={{ width: '100%' }} /></label>
            <label className="small">Branch*<select value={f.branch} onChange={set('branch')} style={{ width: '100%' }}>{(meta.data?.branches || []).map((b) => <option key={b}>{b}</option>)}</select></label>
            <label className="small">Campus<select value={f.campus_id} onChange={set('campus_id')} style={{ width: '100%' }}>{meta.data?.campuses.map((c) => <option key={c.id} value={c.id}>{c.name.replace('Kalinga Institute of Engineering ', '')}</option>)}</select></label>
            <label className="small">Batch<input type="number" value={f.batch} onChange={set('batch')} style={{ width: '100%' }} /></label>
            <label className="small">CGPA*<input type="number" step="0.01" value={f.cgpa} onChange={set('cgpa')} placeholder="required, e.g. 7.85" style={{ width: '100%', borderColor: f.cgpa ? undefined : '#f59e0b' }} /></label>
            <label className="small">10th %<input type="number" value={f.tenth_pct} onChange={set('tenth_pct')} style={{ width: '100%' }} /></label>
            <label className="small">12th %<input type="number" value={f.twelfth_pct} onChange={set('twelfth_pct')} style={{ width: '100%' }} /></label>
            <label className="small">Active backlogs<input type="number" value={f.active_backlogs} onChange={set('active_backlogs')} style={{ width: '100%' }} /></label>
            <label className="small">Backlog history<input type="number" value={f.backlog_history} onChange={set('backlog_history')} style={{ width: '100%' }} /></label>
            <label className="small">Internships<input type="number" value={f.internships} onChange={set('internships')} style={{ width: '100%' }} /></label>
          </div>
          <label className="small mt" style={{ display: 'block' }}>Target role (blank = predicted by AI)
            <select value={f.preferred_role} onChange={set('preferred_role')} style={{ width: '100%' }}><option value="">Auto (PyTorch role classifier)</option>{meta.data?.roles.map((x) => <option key={x}>{x}</option>)}</select></label>

          <h3 className="mt">Skills & proficiency (1 basic – 5 expert)</h3>
          <div>{Object.entries(skills).map(([k, v]) => (
            <span key={k} className="tag" style={{ padding: '3px 6px' }}>{k}
              <select value={v} onChange={(e) => setSkills({ ...skills, [k]: Number(e.target.value) })} style={{ padding: '0 2px', marginLeft: 4, fontSize: 11 }}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select>
              <button onClick={() => { const c = { ...skills }; delete c[k]; setSkills(c) }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#e03131' }}>×</button></span>))}
            {!Object.keys(skills).length && <span className="small muted">No skills yet – add below or auto-fill from resume.</span>}</div>
          <div className="row mt"><input list="skill-list" value={newSkill} placeholder="Add skill…" onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSkill()} />
            <datalist id="skill-list">{meta.data?.skills?.map((s) => <option key={s} value={s} />)}</datalist><button className="btn small" onClick={addSkill}>Add</button></div>

          <div className="grid g2 mt">
            <label className="small">Projects (one per line, “title : tech, tech”)<textarea rows={3} value={projects} onChange={(e) => setProjects(e.target.value)} /></label>
            <label className="small">Certifications (separate with ;)<textarea rows={3} value={certs} onChange={(e) => setCerts(e.target.value)} /></label>
          </div>

          <h3 className="mt">Assessment scores (0–100) – leave blank if not taken yet</h3>
          <div className="grid g3">
            {[['aptitude', 'Aptitude'], ['coding', 'Coding'], ['mock_interview', 'Mock interview'], ['communication', 'Communication'], ['softskill', 'Soft skills']].map(([k, l]) => (
              <label key={k} className="small">{l}<input type="number" min="0" max="100" value={f[k]} placeholder="not taken" onChange={set(k)} style={{ width: '100%' }} /></label>))}
          </div>
          <div className="row mt"><button className="btn primary" disabled={busy || !f.name || !f.cgpa} onClick={submit}>{busy ? 'Scoring…' : 'Register & score student'}</button>
            {!busy && (!f.name || !f.cgpa)
              ? <span className="small" style={{ color: '#b45309' }}>⚠ Enter {[!f.name && 'Full name', !f.cgpa && 'CGPA (from the official academic record)'].filter(Boolean).join(' and ')} to continue.</span>
              : <span className="small muted">Readiness, placement probability, skill gaps and drive matches are computed immediately.</span>}</div>
        </div>
      </div>
      <Toast msg={toast} onClose={() => setToast('')} />
    </>
  )
}
