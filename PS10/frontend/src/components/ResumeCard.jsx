import { useEffect, useRef, useState } from 'react'
import { api, download, upload } from '../api'

/** Upload a resume PDF → preview the profile changes → apply. Used by students (own profile) and placement staff. */
export default function ResumeCard({ student, resume, canUpload, self, onApplied }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [pending, setPending] = useState(null)
  const [msg, setMsg] = useState('')
  const [history, setHistory] = useState([])
  const [showHist, setShowHist] = useState(false)
  const loadHistory = () => api.get(`/students/${student.id}/resume/history`).then(setHistory).catch(() => {})
  useEffect(() => { loadHistory() }, [student.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) { setMsg('Please choose a PDF file.'); return }
    setBusy(true); setMsg('')
    try { setPending(await upload(`/students/${student.id}/resume`, file)) } catch (e) { setMsg(e.message) } finally { setBusy(false) }
  }
  const apply = async () => {
    setBusy(true)
    try {
      const r = await api.post(`/students/${student.id}/resume/${pending.upload_id}/apply`)
      setPending(null)
      setMsg(`Profile updated: ${Object.keys(r.applied.new_skills).length} new skill(s), ${r.applied.new_projects.length} project(s), ${r.applied.new_certifications.length} certification(s). Readiness is now ${r.readiness.score}.`)
      onApplied?.()
      loadHistory()
    } catch (e) { setMsg(e.message) } finally { setBusy(false) }
  }
  const pv = pending?.preview
  const nothing = pv && !Object.keys(pv.new_skills).length && !Object.keys(pv.upgraded_skills).length && !pv.new_projects.length && !pv.new_certifications.length

  return (
    <div className="card mt">
      <div className="row between">
        <h2 style={{ margin: 0 }}>{self ? 'My resume' : 'Resume'}</h2>
        {resume && <button className="btn small" onClick={() => download(`/students/${student.id}/resume`, `${student.roll_no}_resume.pdf`)}>⬇ {resume.filename} · {resume.pages} page(s) · {resume.uploaded_at.replace('T', ' ')}</button>}
      </div>
      {!resume && !pending && <p className="small muted">{self ? 'No resume uploaded yet. Upload your latest resume so recruiters see your real skills and projects.' : 'No resume uploaded yet.'}</p>}

      {canUpload && !pending && (
        <div className={`dropzone ${drag ? 'on' : ''}`} onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); send(e.dataTransfer.files?.[0]) }}>
          <input ref={input} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={(e) => { send(e.target.files?.[0]); e.target.value = '' }} />
          <div style={{ fontSize: 26 }}>📄</div>
          <b>{busy ? 'Reading your PDF…' : resume ? 'Upload a new version (PDF)' : 'Upload resume (PDF)'}</b>
          <div className="small muted">Drag & drop or click · text-based PDF, max 5 MB · skills, projects and certifications are read automatically</div>
        </div>)}

      {pv && (
        <div className="mt">
          <div className="small muted">Read {pending.pages} page(s) from <b>{pending.filename}</b>. Review what will be added to {self ? 'your' : 'the'} profile:</div>
          <div className="grid g2 mt">
            <div>
              <h3>Skills</h3>
              {Object.entries(pv.new_skills).map(([k, v]) => <span key={k} className="tag" style={{ background: '#ebfbee', color: '#2b8a3e' }}>+ {k} ({v}/5)</span>)}
              {Object.entries(pv.upgraded_skills).map(([k, v]) => <span key={k} className="tag">{k} {v.from}→{v.to}</span>)}
              {!Object.keys(pv.new_skills).length && !Object.keys(pv.upgraded_skills).length && <div className="small muted">No new skills</div>}
              {pv.predicted_role && <div className="small mt">Best-fit role (PyTorch classifier): <b>{pv.predicted_role}</b></div>}
            </div>
            <div>
              <h3>Projects & certifications</h3>
              <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
                {pv.new_projects.map((p) => <li key={p.title}>Project: {p.title}{p.tech.length ? ` (${p.tech.join(', ')})` : ''}</li>)}
                {pv.new_certifications.map((c) => <li key={c.name}>Certification: {c.name}</li>)}
                {!pv.new_projects.length && !pv.new_certifications.length && <li className="muted">Nothing new</li>}
              </ul>
            </div>
          </div>
          {pv.warnings.map((w) => <div key={w} className="small mt" style={{ color: '#e67700' }}>⚠ {w}</div>)}
          <div className="small muted mt">CGPA, marks and backlogs always come from the official academic record, not from the resume.</div>
          <div className="row mt">
            <button className="btn primary" disabled={busy} onClick={apply}>{nothing ? 'Save resume' : 'Apply to profile'}</button>
            <button className="btn" disabled={busy} onClick={() => setPending(null)}>Discard</button>
          </div>
        </div>)}
      {msg && <div className="explain mt small">{msg}</div>}
      {history.length > 1 && (
        <div className="mt small">
          <button className="btn small" onClick={() => setShowHist(!showHist)}>{showHist ? '▾' : '▸'} Version history ({history.length})</button>
          {showHist && (
            <table className="mt"><thead><tr><th>File</th><th>Uploaded</th><th>Pages</th><th>Status</th></tr></thead>
              <tbody>{history.map((h) => (
                <tr key={h.id}><td>{h.filename}</td><td>{h.uploaded_at.replace('T', ' ')}</td><td>{h.pages}</td>
                  <td><span className={`badge ${h.status === 'applied' ? 'b-green' : 'b-grey'}`}>{h.status === 'applied' ? 'current' : h.status === 'pending' ? 'not applied' : 'older version'}</span></td></tr>))}
              </tbody></table>)}
          <div className="muted mt">Uploading a new version adds new skills, projects and certifications; nothing already on the profile is removed.</div>
        </div>)}
    </div>
  )
}
