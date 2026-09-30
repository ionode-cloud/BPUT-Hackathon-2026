import { Fragment, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CartesianGrid, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api'
import { isStaff, useAuth } from '../auth'
import DeleteStudent from '../components/DeleteStudent'
import ResumeCard from '../components/ResumeCard'
import { ErrorBox, Gauge, Level, Loading, ScoreBar, Status, Toast, useApi } from '../components/ui'

export default function StudentDetail({ studentId }) {
  const params = useParams()
  const rawId = studentId ?? params.id
  const id = rawId && rawId !== 'undefined' ? rawId : null
  const { user } = useAuth()
  const staff = isStaff(user)
  const self = user?.role === 'student'
  const { data, error, loading, reload } = useApi(id ? `/students/${id}` : null)
  const [role, setRole] = useState('')
  const gap = useApi(id && role ? `/students/${id}/skill-gap?role=${encodeURIComponent(role)}` : null)
  const meta = useApi('/meta')
  const [tips, setTips] = useState(null)
  const [tipsLoading, setTipsLoading] = useState(false)
  const [open, setOpen] = useState(null)
  const [whatIf, setWhatIf] = useState(null)
  const [toast, setToast] = useState('')
  if (!id) {
    return (
      <div className="card" style={{ maxWidth: 500, margin: '40px auto', textAlign: 'center', padding: 32 }}>
        <h3>Setting up your student profile…</h3>
        <p className="muted" style={{ margin: '12px 0 20px' }}>Your student profile is being initialized. Click below to load your dashboard.</p>
        <button className="btn primary" onClick={() => window.location.reload()}>Refresh Dashboard</button>
      </div>
    )
  }
  if (error) return <ErrorBox error={error} />
  if (!data) return <Loading />  // keep showing the profile while it refreshes
  const p = data.profile, r = data.readiness
  const g = role && gap.data ? gap.data : data.skill_gap
  const radar = Object.entries(r.components).map(([k, v]) => ({ k, v: Math.round(v) }))
  const wi = whatIf || { aptitude: p.scores.aptitude, mock_interview: p.scores.mock_interview, communication: p.scores.communication, coding: p.scores.coding, softskill: p.scores.soft_skills }

  const respond = async (o, status) => {
    try { await api.post(`/offers/${o.id}/transition`, { status, note: 'Response from student portal' }); setToast(`Offer ${status.toLowerCase()}`); reload() } catch (e) { setToast(e.message) }
  }
  const submitDoc = async (o, d) => {
    try { await api.post(`/offers/${o.id}/documents`, { document: d, status: 'Submitted' }); setToast(`${d} marked as submitted`); reload() } catch (e) { setToast(e.message) }
  }
  const loadTips = () => { setTipsLoading(true); api.get(`/students/${id}/resume-tips`).then(setTips).finally(() => setTipsLoading(false)) }
  const applyWhatIf = async () => {
    const res = await api.put(`/students/${id}/assessment`, wi)
    setToast(`Assessment saved – readiness is now ${res.score} (${res.level})`)
    setWhatIf(null); reload()
  }

  return (
    <div className="dash-animated">
      {/* Student Hero Banner */}
      <div className="stu-hero">
        <div className="stu-hero-left">
          <div className="stu-avatar">
            {p.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div className="stu-hero-info">
            <div className="stu-hero-sub">
              {self ? '🎓 My Student Dashboard' : '🎓 Student Profile'}
              {!self && <Link to={staff ? '/students' : '/'} style={{ color: '#93c5fd', marginLeft: 8 }}>← Back to list</Link>}
            </div>
            <h1 className="stu-hero-name">{p.name}</h1>
            <div className="stu-hero-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              <span className="stu-hero-chip">🆔 {p.roll_no}</span>
              <span className="stu-hero-chip">✉️ {p.email}</span>
              <span className="stu-hero-chip">🏛️ {p.branch}</span>
              <span className="stu-hero-chip">📅 Batch {p.batch}</span>
              <span className="stu-hero-chip">⭐ CGPA {p.cgpa}</span>
              {p.phone && <span className="stu-hero-chip">📞 {p.phone}</span>}
            </div>
          </div>
        </div>
        <div className="stu-hero-actions">
          <Level level={r.level} />
          {p.at_risk && <span className="badge b-red">⚠️ At risk</span>}
          {r.provisional && <span className="badge b-amber">Provisional</span>}
          {staff && <DeleteStudent student={p} />}
        </div>
      </div>
      {r.provisional && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #e67700' }}>
          <b>New student – provisional profile.</b> <span className="small">Not yet assessed: {r.imputed_fields.join(', ')} (estimated from the {p.branch} median).
          {r.cold_start?.score_range && <> Likely readiness range until assessed: <b>{r.cold_start.score_range[0]} – {r.cold_start.score_range[1]}</b> ({r.cold_start.level_range.join(' → ')}), placement probability {(r.cold_start.probability_range[0] * 100).toFixed(0)}–{(r.cold_start.probability_range[1] * 100).toFixed(0)}%.</>}
          {' '}{staff ? 'Record the scores below (“Record new assessment”) to finalise.' : 'Your placement cell will record them after your next assessment.'}</span>
        </div>)}

      <div className="grid g-1-2">
        <div className="card" style={{ textAlign: 'center' }}>
          <Gauge value={r.score} label="Readiness score" />
          <div className="row" style={{ justifyContent: 'center' }}><Level level={r.level} /></div>
          <div className="grid g2 mt" style={{ textAlign: 'left' }}>
            <div><div className="small muted">Rubric score</div><b>{r.rubric.toFixed(1)}</b></div>
            <div><div className="small muted">PlacementNet P(placed)</div><b>{(r.probability * 100).toFixed(0)}% <span className="small muted">±{(r.probability_std * 100).toFixed(0)}</span></b></div>
            <div><div className="small muted">Trend (4 mo.)</div><b>{r.trend.direction} ({r.trend.delta > 0 ? '+' : ''}{r.trend.delta})</b></div>
            <div><div className="small muted">Backlogs</div><b>{p.active_backlogs} active / {p.backlog_history} history</b></div>
          </div>
        </div>
        <div className="card">
          <h2>Why this score? (explainable readiness)</h2>
          <div className="explain">{r.summary}</div>
          <div className="grid g2 mt">
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radar} outerRadius={75}>
                <PolarGrid /><PolarAngleAxis dataKey="k" tick={{ fontSize: 10.5 }} /><PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="v" stroke="#3b5bdb" fill="#3b5bdb" fillOpacity={0.3} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
            <div>
              <h3>PlacementNet attributions (Integrated Gradients vs. cohort median)</h3>
              <ul className="list small">
                {r.ml_factors.map((f) => (
                  <li key={f.feature} className="row between">
                    <span>{f.feature} <span className="muted">({f.value} vs {f.cohort_median})</span></span>
                    <b style={{ color: f.impact >= 0 ? '#2b8a3e' : '#e03131' }}>{f.impact >= 0 ? '+' : ''}{(f.impact * 100).toFixed(1)} pp</b>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {r.flags.length > 0 && <div className="mt">{r.flags.map((f) => <div key={f} className="small" style={{ color: '#e67700' }}>⚠ {f}</div>)}</div>}
        </div>
      </div>

      <ResumeCard student={p} resume={data.resume} canUpload={staff || self} self={self} onApplied={reload} />

      <div className="grid g2 mt">
        <div className="card">
          <div className="row between">
            <h2>Skill-gap analysis</h2>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">Target: {data.skill_gap.role}</option>
              {meta.data?.roles.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div className="row small muted" style={{ marginBottom: 8 }}>Role coverage <b style={{ color: '#0f172a' }}>{g.coverage}%</b> · Best-fit roles: {g.recommended_roles.map((x) => `${x.role} (${x.coverage}%)`).join(', ')}</div>
          <table>
            <thead><tr><th>Skill</th><th>Category</th><th>Have / Target</th><th>Suggested resource</th></tr></thead>
            <tbody>
              {g.items.map((it) => (
                <tr key={it.skill}>
                  <td>{it.gap > 0 ? <span className="tag miss">{it.skill}</span> : <span className="tag">{it.skill}</span>}</td>
                  <td className="muted small">{it.category}</td>
                  <td style={{ width: 120 }}><ScoreBar value={it.have} max={5} color={it.gap > 0 ? '#e67700' : '#2b8a3e'} /><span className="small muted">{it.have}/5 (target {it.target})</span></td>
                  <td className="small">{it.gap > 0 ? <>{it.resource}<div className="muted">{it.certification !== '—' && `Cert: ${it.certification}`}</div></> : <span className="muted">✓ meets target</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2>Personalised preparation plan</h2>
          {data.plan.map((t, i) => (
            <div className="step" key={i}>
              <div className="wk">W{t.week}</div>
              <div style={{ flex: 1 }}><b>{t.focus}</b><div className="small">{t.action}</div>{t.certification !== '—' && <div className="small muted">Certification: {t.certification}</div>}</div>
              <span className="badge b-violet">+{t.xp} XP</span>
            </div>
          ))}
          <h3 className="mt">Assessment trend</h3>
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={p.assessment_history}>
              <CartesianGrid vertical={false} stroke="#eef1f6" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
              <Line dataKey="aptitude" stroke="#3b5bdb" /><Line dataKey="mock" name="mock interview" stroke="#15aabf" /><Line dataKey="coding" stroke="#7048e8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card mt">
        <h2>Drive recommendations & explainable eligibility</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Drive</th><th className="num">CTC (LPA)</th><th>Date</th><th style={{ width: 150 }}>Fit score</th><th>Fit level</th><th></th></tr></thead>
            <tbody>
              {data.recommendations.map((d) => (
                <Fragment key={d.drive_id}>
                  <tr className="click" onClick={() => setOpen(open === d.drive_id ? null : d.drive_id)}>
                    <td><b>{d.company}</b><div className="small muted">{d.role}</div></td>
                    <td className="num">{d.ctc_lpa}</td><td className="small">{d.date || 'TBA'}</td>
                    <td>{d.eligible ? <div className="row"><div style={{ flex: 1 }}><ScoreBar value={d.fit_score} /></div><b>{d.fit_score}</b></div> : '—'}</td>
                    <td><Level level={d.fit_level} /></td>
                    <td className="small">{open === d.drive_id ? '▲' : '▼ why?'}</td>
                  </tr>
                  {open === d.drive_id && (
                    <tr key={`${d.drive_id}-x`}><td colSpan={6}><div className="explain">{d.explanation.summary}</div>
                      {d.explanation.factors?.length > 0 && <div className="row mt small">{d.explanation.factors.map((f) => <span key={f.factor} className="tag">{f.factor}: {f.contribution}</span>)}</div>}
                    </td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid g3 mt">
        <div className="card">
          <h2>Profile</h2>
          <h3>Projects</h3>
          <ul className="list small">{p.projects.map((x) => <li key={x.title}><b>{x.title}</b><div className="muted">{x.tech.join(', ')}</div></li>)}</ul>
          <h3 className="mt">Certifications</h3>
          <div>{p.certifications.length ? p.certifications.map((c) => <span key={c.name} className="tag">{c.name}</span>) : <span className="muted small">None</span>}</div>
          <h3 className="mt">Scores</h3>
          {Object.entries(p.scores).map(([k, v]) => <div key={k} className="small" style={{ marginBottom: 6 }}><div className="row between"><span>{k.replace('_', ' ')}</span><b>{v}</b></div><ScoreBar value={v} /></div>)}
          <div className="small muted">10th {p.tenth_pct}% · 12th {p.twelfth_pct}% · {p.internships} internship(s)</div>
        </div>
        {staff && <div className="card">
          <h2>Record new assessment (what-if)</h2>
          <p className="small muted">Update scores after a mock test; readiness and risk are recomputed instantly.</p>
          {['aptitude', 'coding', 'mock_interview', 'communication', 'softskill'].map((k) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <div className="row between small"><span>{k.replace('_', ' ')}</span><b>{wi[k]}</b></div>
              <input type="range" min="0" max="100" value={wi[k]} style={{ width: '100%', padding: 0 }} onChange={(e) => setWhatIf({ ...wi, [k]: Number(e.target.value) })} />
            </div>
          ))}
          <button className="btn primary" disabled={!whatIf} onClick={applyWhatIf}>{r.provisional ? 'Save assessment scores' : 'Save & recompute'}</button>
        </div>}
        <div className="card">
          <h2>AI resume & profile builder</h2>
          <p className="small muted">Runs on the offline PyTorch LLM (transformers) when loaded, with a rule-based fallback.</p>
          <button className="btn primary" onClick={loadTips} disabled={tipsLoading}>{tipsLoading ? 'Generating…' : '✦ Generate suggestions'}</button>
          {tips && (
            <div className="mt">
              <h3>Suggested summary</h3><div className="explain">{tips.summary}</div>
              <h3 className="mt">Improvements</h3><ul className="small">{tips.tips.map((t) => <li key={t}>{t}</li>)}</ul>
              <div className="small muted">Engine: {tips.engine}</div>
            </div>
          )}
        </div>
      </div>

      {(data.applications.length > 0 || data.offers.length > 0) && (
        <div className="card mt">
          <h2>Applications & offers</h2>
          <ul className="list">
            {data.offers.map((o) => (
              <li key={`o${o.id}`}>
                <div className="row between"><span><b>Offer:</b> {o.company} – {o.role} (₹{o.ctc_lpa} L, {o.offer_type}) <span className="small muted">respond by {o.respond_by}</span></span>
                  <span className="row"><Status s={o.status} />{self && o.allowed.filter((x) => ['Accepted', 'Declined', 'Deferred'].includes(x)).map((x) => (
                    <button key={x} className={`btn small ${x === 'Accepted' ? 'primary' : ''}`} onClick={() => respond(o, x)}>{x === 'Accepted' ? 'Accept' : x === 'Declined' ? 'Decline' : 'Defer'}</button>))}</span></div>
                {self && ['Accepted', 'Joined'].includes(o.status) && (
                  <div className="small mt">Documents: {Object.entries(o.documents).map(([d, st]) => (
                    <span key={d} className="tag" style={{ background: st === 'Verified' ? '#ebfbee' : st === 'Submitted' ? '#e7f5ff' : '#fff6e5' }}>{d}: {st}
                      {st === 'Pending' && <button className="btn small" style={{ marginLeft: 4, padding: '0 6px' }} onClick={() => submitDoc(o, d)}>Mark submitted</button>}</span>))}</div>)}
              </li>))}
            {data.applications.map((a) => <li key={a.drive_id} className="row between"><span>{staff ? <Link to={`/drives/${a.drive_id}`}>{a.drive}</Link> : <b>{a.drive}</b>} <span className="muted small">fit {a.fit_score}{a.rank ? ` · rank #${a.rank}` : ''}</span></span><Status s={a.status} /></li>)}
          </ul>
        </div>
      )}
      <Toast msg={toast} onClose={() => setToast('')} />
    </div>
  )
}
