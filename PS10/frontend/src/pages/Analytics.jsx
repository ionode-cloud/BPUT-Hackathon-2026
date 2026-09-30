import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ErrorBox, Level, Loading, Status, useApi } from '../components/ui'

export default function Analytics() {
  const { data, error, loading } = useApi('/analytics')
  const nav = useNavigate()
  if (error) return <ErrorBox error={error} />
  if (loading || !data) return <Loading />
  return (
    <>
      <div className="topbar"><div><h1>Analytics & Predictive Insights</h1><p>What converts into offers – from four years of placement history and the live season</p></div></div>
      <div className="grid g2">
        <div className="card">
          <h2>Skill-wise placement conversion (historical)</h2>
          <ResponsiveContainer width="100%" height={330}>
            <BarChart data={data.skill_conversion.slice(0, 15)} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid horizontal={false} stroke="#eef1f6" />
              <XAxis type="number" unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="skill" width={110} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, n, p) => [`${v}% (lift ×${p.payload.lift}, n=${p.payload.students})`, 'Placement rate']} />
              <Bar dataKey="placement_rate" fill="#3b5bdb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2>What drives placement? (PlacementNet · Integrated Gradients)</h2>
          <ResponsiveContainer width="100%" height={330}>
            <BarChart data={data.feature_importance.slice(0, 12)} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid horizontal={false} stroke="#eef1f6" />
              <XAxis type="number" tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="feature" width={140} tick={{ fontSize: 11 }} />
              <Tooltip /><Bar dataKey="importance" fill="#15aabf" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid g2 mt">
        <div className="card">
          <h2>Average package by recruiter (LPA)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.company_packages} margin={{ bottom: 70 }}>
              <CartesianGrid vertical={false} stroke="#eef1f6" />
              <XAxis dataKey="company" angle={-40} textAnchor="end" interval={0} tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} />
              <Tooltip /><Bar dataKey="avg_ctc" name="Avg CTC" fill="#7048e8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2>Multi-campus comparison</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.campuses}>
              <CartesianGrid vertical={false} stroke="#eef1f6" />
              <XAxis dataKey="campus" tick={{ fontSize: 10 }} tickFormatter={(v) => v.replace('Kalinga Institute of Engineering ', '')} /><YAxis tick={{ fontSize: 11 }} />
              <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="students" fill="#adb5bd" /><Bar dataKey="placed" fill="#2b8a3e" /><Bar dataKey="at_risk" name="at risk" fill="#e03131" /><Bar dataKey="avg_readiness" name="avg readiness" fill="#3b5bdb" />
            </BarChart>
          </ResponsiveContainer>
          <h3 className="mt">Repeat-hiring recruiters</h3>
          <div>{data.recruiters.filter((r) => r.repeat_recruiter).map((r) => <span key={r.company} className="tag">{r.company} · {r.years_visited} yrs</span>)}</div>
        </div>
      </div>
      <div className="card mt">
        <div className="row between"><h2>Students at risk of remaining unplaced ({data.at_risk.length})</h2><span className="small muted">Predicted P(placed) &lt; 45% and no accepted offer · escalated to mentors automatically</span></div>
        <div className="table-wrap" style={{ maxHeight: 460, overflowY: 'auto' }}>
          <table>
            <thead><tr><th>Student</th><th>Branch</th><th className="num">CGPA</th><th className="num">Readiness</th><th>Level</th><th className="num">P(placed)</th><th>Key risk factors</th><th>Mentor</th></tr></thead>
            <tbody>
              {data.at_risk.map((s) => (
                <tr key={s.id} className="click" onClick={() => nav(`/students/${s.id}`)}>
                  <td><b>{s.name}</b><div className="small muted">{s.roll_no}</div></td><td>{s.branch}</td><td className="num">{s.cgpa}</td>
                  <td className="num">{s.readiness}</td><td><Level level={s.level} /></td><td className="num"><span className="badge b-red">{s.probability}%</span></td>
                  <td className="small">{s.reasons.join(' · ')}</td><td className="small muted">{s.mentor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card mt">
        <h2>Recruiter engagement & repeat-hiring pattern</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Recruiter</th><th>Tier</th>{['2023', '2024', '2025', '2026'].map((y) => <th key={y} className="num">Hires {y}</th>)}<th className="num">2027 offers</th><th>Stage</th></tr></thead>
            <tbody>{data.recruiters.map((r) => (
              <tr key={r.company}><td>{r.company}</td><td><Status s={r.tier} /></td>{['2023', '2024', '2025', '2026'].map((y) => <td key={y} className="num">{r.hires_by_year[y] || '—'}</td>)}<td className="num">{r.offers_2027}</td><td className="small">{r.stage}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </>
  )
}
