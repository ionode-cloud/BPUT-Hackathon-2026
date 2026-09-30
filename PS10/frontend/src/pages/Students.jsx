import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { isStaff, useAuth } from '../auth'
import DeleteStudent from '../components/DeleteStudent'
import { ErrorBox, Level, Loading, ScoreBar, Toast, useApi } from '../components/ui'

export default function Students() {
  const [q, setQ] = useState('')
  const [branch, setBranch] = useState('')
  const [level, setLevel] = useState('')
  const [risk, setRisk] = useState('')
  const [sort, setSort] = useState('readiness_desc')
  const [page, setPage] = useState(0)
  const params = new URLSearchParams({ q, branch, level, sort, limit: 25, offset: page * 25 })
  if (risk) params.set('at_risk', risk)
  const { data, error, loading, reload } = useApi(`/students?${params}`)
  const staff = isStaff(useAuth().user)
  const nav = useNavigate()
  const loc = useLocation()
  const [toast, setToast] = useState(loc.state?.toast || '')
  const set = (fn) => (e) => { fn(e.target.value); setPage(0) }
  return (
    <>
      <Toast msg={toast} onClose={() => setToast('')} />
      <div className="topbar"><div><h1>Student Readiness Profiling</h1><p>Continuously updated employability scores, levels and risk flags</p></div>
        <button className="btn primary" onClick={() => nav('/students/new')}>+ Add / import students</button></div>
      <div className="card">
        <div className="filters">
          <input placeholder="Search name or roll no…" value={q} onChange={set(setQ)} style={{ minWidth: 220 }} />
          <select value={branch} onChange={set(setBranch)}><option value="">All branches</option>{['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL'].map((b) => <option key={b}>{b}</option>)}</select>
          <select value={level} onChange={set(setLevel)}><option value="">All levels</option>{['Not Ready', 'Developing', 'Ready', 'Highly Employable'].map((b) => <option key={b}>{b}</option>)}</select>
          <select value={risk} onChange={set(setRisk)}><option value="">Any risk</option><option value="true">At risk only</option><option value="false">Not at risk</option></select>
          <select value={sort} onChange={set(setSort)}><option value="readiness_desc">Readiness ↓</option><option value="readiness_asc">Readiness ↑</option><option value="cgpa_desc">CGPA ↓</option><option value="name">Name</option><option value="newest">Newest first</option></select>
          <span className="muted small">{data?.total ?? '…'} students</span>
        </div>
        {error ? <ErrorBox error={error} /> : loading || !data ? <Loading /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Student</th><th>Branch</th><th className="num">CGPA</th><th className="num">Backlogs</th><th>Top skills</th><th style={{ width: 170 }}>Readiness</th><th>Level</th><th className="num">P(placed)</th>{staff && <th />}</tr></thead>
              <tbody>
                {data.items.map((s) => (
                  <tr key={s.id} className="click" onClick={() => nav(`/students/${s.id}`)}>
                    <td><b>{s.name}</b><div className="small muted">{s.roll_no} · {s.preferred_role}</div></td>
                    <td>{s.branch}</td><td className="num">{s.cgpa.toFixed(2)}</td>
                    <td className="num">{s.active_backlogs || '—'}</td>
                    <td>{s.top_skills.map((k) => <span key={k} className="tag">{k}</span>)}</td>
                    <td><div className="row"><div style={{ flex: 1 }}><ScoreBar value={s.readiness_score} /></div><b>{s.readiness_score.toFixed(0)}</b></div></td>
                    <td><Level level={s.readiness_level} />{s.at_risk && <span className="badge b-red" style={{ marginLeft: 4 }}>At risk</span>}{s.provisional && <span className="badge b-amber" style={{ marginLeft: 4 }}>Provisional</span>}</td>
                    <td className="num">{s.placement_probability}%</td>
                    {staff && <td onClick={(e) => e.stopPropagation()}><DeleteStudent student={s} compact onDeleted={(m) => { setToast(m); reload() }} /></td>}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="row between mt">
              <button className="btn small" disabled={page === 0} onClick={() => setPage(page - 1)}>← Prev</button>
              <span className="small muted">Page {page + 1} of {Math.max(1, Math.ceil(data.total / 25))}</span>
              <button className="btn small" disabled={(page + 1) * 25 >= data.total} onClick={() => setPage(page + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
