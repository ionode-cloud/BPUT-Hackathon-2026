import { Fragment, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, download } from '../api'
import { isStaff, useAuth } from '../auth'
import { ErrorBox, LEVEL_COLORS, Level, Loading, ScoreBar, Status, Toast, useApi } from '../components/ui'

export default function DriveDetail() {
  const { user } = useAuth()
  const staff = isStaff(user)
  const { id } = useParams()
  const [filter, setFilter] = useState('')
  const { data, error, loading, reload } = useApi(`/drives/${id}?limit=150${filter ? `&status=${encodeURIComponent(filter)}` : ''}`)
  const [open, setOpen] = useState(null)
  const [toast, setToast] = useState('')
  if (error) return <ErrorBox error={error} />
  if (loading || !data) return <Loading />
  const d = data.drive, j = data.job
  const dist = Object.entries(data.level_distribution).map(([level, count]) => ({ level, count }))

  const rematch = async () => { const r = await api.post(`/drives/${id}/match`); setToast(`Re-matched: ${r.eligible} eligible, ${r.shortlisted} shortlisted`); reload() }
  const notify = async () => { const r = await api.post(`/drives/${id}/notify-shortlist`); setToast(`${r.notified} shortlisted students notified (WhatsApp)`) }
  const setStatus = async (aid, status) => {
    const r = await api.post(`/applications/${aid}/status`, { status })
    setToast(r.offer_id ? `Selected – offer #${r.offer_id} issued and logged to ledger` : `Marked ${status}`); reload()
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="small"><Link to={staff ? '/drives' : '/'}>← {staff ? 'Drives' : 'My drives'}</Link></div>
          <h1>{d.name}</h1>
          <p>{d.role} · {d.job_type} · ₹{d.ctc_lpa} LPA · {d.date ? `${d.date} ${d.slot} @ ${d.venue}` : 'not yet scheduled'}</p>
        </div>
        <div className="row"><Status s={d.tier} /><Status s={d.status} />
          {staff && d.status === 'Upcoming' && <><button className="btn" onClick={rematch}>↻ Re-run matching</button><button className="btn primary" onClick={notify}>Notify shortlist</button></>}
        </div>
      </div>

      <div className="grid g3">
        <div className="card">
          <h2>Parsed requirements</h2>
          <div className="small"><b>Required:</b> {j.required_skills.map((s) => <span key={s} className="tag">{s}</span>)}</div>
          <div className="small"><b>Good to have:</b> {j.preferred_skills.map((s) => <span key={s} className="tag">{s}</span>)}</div>
          <div className="small mt">Min CGPA <b>{d.min_cgpa}</b> · Max active backlogs <b>{j.max_active_backlogs}</b> · Mock benchmark <b>{j.mock_benchmark}</b></div>
          <div className="small">Branches: <b>{d.branches.join(', ')}</b> · Interview pool size <b>{j.pool_size}</b> ({d.openings} openings)</div>
          <details className="mt small"><summary>Job description</summary><p>{j.jd_text}</p></details>
        </div>
        <div className="card">
          <h2>Pool</h2>
          <div className="grid g2">
            <div><div className="small muted">Evaluated</div><b style={{ fontSize: 22 }}>{data.total}</b></div>
            <div><div className="small muted">Eligible</div><b style={{ fontSize: 22 }}>{d.eligible}</b></div>
            <div><div className="small muted">Shortlisted</div><b style={{ fontSize: 22 }}>{d.shortlisted + d.selected + d.rejected}</b></div>
            <div><div className="small muted">Selected</div><b style={{ fontSize: 22 }}>{d.selected}</b></div>
          </div>
          <h3 className="mt">Ineligibility reasons</h3>
          <div className="small">{Object.entries(data.ineligible_reasons).map(([k, v]) => <span key={k} className="tag miss">{k}: {v}</span>)}</div>
        </div>
        <div className="card">
          <h2>Fit-level distribution (eligible)</h2>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={dist}><XAxis dataKey="level" tick={{ fontSize: 10 }} interval={0} /><YAxis tick={{ fontSize: 11 }} /><Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>{dist.map((x) => <Cell key={x.level} fill={LEVEL_COLORS[x.level]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card mt">
        <h2>Why is the pool ranked in this order?</h2>
        <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{data.rationale.slice(0, 6).map((r) => <li key={r}>{r}</li>)}</ul>
      </div>

      <div className="card mt">
        <div className="row between">
          <h2>Ranked candidates</h2>
          <div className="pill-tabs">
            {['', 'Shortlisted', 'Waitlisted', 'Below Threshold', 'Selected', 'Rejected', 'Not Eligible'].map((f) => (
              <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>{f || 'All'}</button>
            ))}
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th className="num">Rank</th><th>Student</th><th>Branch</th><th className="num">CGPA</th><th className="num">Mock</th><th style={{ width: 160 }}>Fit score</th><th>Fit level</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {data.applications.map((a) => (
                <Fragment key={a.application_id}>
                  <tr className="click" onClick={() => setOpen(open === a.application_id ? null : a.application_id)}>
                    <td className="num">{a.rank ?? '—'}</td>
                    <td><Link to={`/students/${a.student_id}`} onClick={(e) => e.stopPropagation()}><b>{a.name}</b></Link><div className="small muted">{a.roll_no}</div></td>
                    <td>{a.branch}</td><td className="num">{a.cgpa}</td><td className="num">{a.mock.toFixed(0)}</td>
                    <td>{a.fit_score > 0 ? <div className="row"><div style={{ flex: 1 }}><ScoreBar value={a.fit_score} /></div><b>{a.fit_score}</b></div> : '—'}</td>
                    <td><Level level={a.fit_level} /></td><td><Status s={a.status} /></td>
                    <td className="small" style={{ whiteSpace: 'nowrap' }}>{a.has_resume && <button className="btn small" title="Download resume" onClick={(e) => { e.stopPropagation(); download(`/students/${a.student_id}/resume`, `${a.roll_no}_resume.pdf`) }}>📄</button>} {open === a.application_id ? '▲' : '▼ why?'}</td>
                  </tr>
                  {open === a.application_id && (
                    <tr><td colSpan={9}>
                      <div className="explain">{a.explanation.summary}</div>
                      {a.explanation.factors?.length > 0 && (
                        <div className="grid g2 mt">
                          <div>{a.explanation.factors.map((f) => (
                            <div key={f.factor} className="small" style={{ marginBottom: 6 }}>
                              <div className="row between"><span>{f.factor} {f.weight !== null && <span className="muted">(learned weight {(f.weight * 100).toFixed(1)}%)</span>}</span><b>{f.contribution >= 0 ? '+' : ''}{f.contribution}</b></div>
                              {f.score !== null && <ScoreBar value={f.score} />}
                            </div>))}
                          </div>
                          <div className="small">
                            {a.explanation.passed?.map((p) => <div key={p} style={{ color: '#2b8a3e' }}>✓ {p}</div>)}
                            {a.explanation.missing_skills?.length > 0 && <div className="mt">Missing skills: {a.explanation.missing_skills.map((m) => <span key={m} className="tag miss">{m}</span>)}</div>}
                            <div className="row mt" style={{ flexWrap: 'wrap', gap: 6, paddingTop: 8, borderTop: '1px dashed #cbd5e1' }}>
                              <span className="small muted" style={{ alignSelf: 'center', fontWeight: 700 }}>Candidate Status:</span>
                              {[
                                { label: 'Applied', val: 'Applied' },
                                { label: 'Shortlist', val: 'Shortlisted' },
                                { label: 'Interview', val: 'Interview' },
                                { label: 'Issue Offer', val: 'Selected', color: '#16a34a' },
                                { label: 'Accepted', val: 'Accepted' },
                                { label: 'Joined', val: 'Joined' },
                                { label: 'Reject', val: 'Rejected', color: '#dc2626' }
                              ].map((st) => (
                                <button
                                  key={st.val}
                                  type="button"
                                  className={`btn small ${a.status === st.val ? 'primary' : ''}`}
                                  style={st.color ? { borderColor: st.color, color: a.status === st.val ? '#fff' : st.color } : {}}
                                  disabled={a.status === st.val}
                                  onClick={() => setStatus(a.application_id, st.val)}
                                >
                                  {st.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      {a.explanation.failed?.length > 0 && <div className="small mt">{a.explanation.failed.map((p) => <div key={p} style={{ color: '#e03131' }}>✗ {p}</div>)}</div>}
                    </td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Toast msg={toast} onClose={() => setToast('')} />
    </>
  )
}
