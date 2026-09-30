import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api'
import { ErrorBox, Kpi, LEVEL_COLORS, Level, Loading, Status, Toast, useApi } from '../components/ui'

const DOC_COLORS = { Verified: '#2b8a3e', Submitted: '#1c7ed6', Pending: '#e67700', Rejected: '#e03131' }

export default function Dashboard() {
  const [campus, setCampus] = useState('')
  const { data, error, loading } = useApi(`/dashboard${campus ? `?campus_id=${campus}` : ''}`)
  const escalations = useApi('/escalations')
  const [toast, setToast] = useState('')
  const [resolvingId, setResolvingId] = useState(null)
  const nav = useNavigate()

  const resolveEscalation = async (nid) => {
    setResolvingId(nid)
    try {
      await api.post(`/escalations/${nid}/resolve`)
      setToast('Escalation marked as resolved')
      escalations.reload()
    } catch (err) {
      setToast(err.message || 'Failed to resolve')
    } finally {
      setResolvingId(null)
    }
  }

  if (error) return <ErrorBox error={error} />
  if (loading || !data) return <Loading />
  const k = data.kpis
  const activeEscalations = (escalations.data || []).filter(e => !e.read)

  return (
    <div className="dash-animated">
      <div className="topbar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
            <h1>Placement Command Dashboard</h1>
            <span className="live-pill"><span className="live-dot" /> LIVE</span>
          </div>
          <p>Batch 2027 · live view of student readiness, drives, offers and risk</p>
        </div>
        <select value={campus} onChange={(e) => setCampus(e.target.value)} style={{ padding: '8px 14px', borderRadius: 10, fontWeight: 600 }}>
          <option value="">🏛️ All campuses</option>
          {data.campuses.map((c) => <option key={c.id} value={c.id}>🏛️ {c.name}</option>)}
        </select>
      </div>

      {/* ── Urgent AI Requests & Escalations Section ── */}
      {activeEscalations.length > 0 ? (
        <div className="card" style={{ marginBottom: 18, border: '1.5px solid #fca5a5', background: '#fff5f5' }}>
          <div className="row between" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🚨</span>
              <h2 style={{ margin: 0, color: '#991b1b', fontSize: 16 }}>Urgent AI Requests & Student Escalations ({activeEscalations.length})</h2>
            </div>
            <span className="badge b-red">Action Required</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeEscalations.map((esc) => (
              <div key={esc.id} style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <b style={{ color: '#0f172a', fontSize: 13.5 }}>{esc.title}</b>
                    <span className="small muted">· {esc.created_at}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: '#475569', whiteSpace: 'pre-line', lineHeight: 1.45 }}>{esc.message}</p>
                </div>
                <button
                  type="button"
                  className="btn small"
                  style={{ background: '#16a34a', color: '#fff', borderColor: '#16a34a', flexShrink: 0 }}
                  disabled={resolvingId === esc.id}
                  onClick={() => resolveEscalation(esc.id)}
                >
                  {resolvingId === esc.id ? 'Resolving…' : '✓ Mark Resolved'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '8px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="small" style={{ color: '#166534', fontWeight: 600 }}>
            ✅ AI Placement Assistant: All student queries resolved · No urgent escalations pending
          </span>
          <Link to="/assistant" className="small" style={{ color: '#15803d', fontWeight: 600 }}>Open Assistant →</Link>
        </div>
      )}

      <div className="kpis">
        <Kpi label="👥 Total students" value={k.students} sub={`${k.placement_ready} placement-ready`} tone="accent" />
        <Kpi label="🎯 Placed students" value={k.placed} sub={`${k.placement_rate}% of batch`} tone="ok" />
        <Kpi label="⏳ Pending students" value={k.pending_students !== undefined ? k.pending_students : (k.students - k.placed)} sub="Seeking placement / in pipeline" tone="accent" />
        <Kpi label="⚠️ Students needing attention" value={k.at_risk} sub="At risk (probability < 45%)" tone="warn" />
        <Kpi label="💰 Average package" value={`₹${k.avg_ctc} L`} sub={`median ₹${k.median_ctc} L · top ₹${k.highest_ctc} L`} tone="ok" />
        <Kpi label="🏢 Active drives" value={k.active_drives} sub={`${k.unscheduled_drives} pending schedule`} tone="accent" />
      </div>

      <div className="grid g-2-1">
        <div className="card">
          <h2>Placement funnel</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.funnel} layout="vertical" margin={{ left: 40, right: 30 }}>
              <CartesianGrid horizontal={false} stroke="#eef1f6" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="stage" width={120} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b5bdb" radius={[0, 6, 6, 0]} label={{ position: 'right', fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2>Readiness distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data.readiness_distribution} dataKey="count" nameKey="level" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {data.readiness_distribution.map((d) => <Cell key={d.level} fill={LEVEL_COLORS[d.level]} />)}
              </Pie>
              <Tooltip /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid g2 mt">
        <div className="card">
          <h2>Branch-wise conversion (current vs. historical)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.branch_conversion}>
              <CartesianGrid vertical={false} stroke="#eef1f6" />
              <XAxis dataKey="branch" tick={{ fontSize: 12 }} /><YAxis unit="%" tick={{ fontSize: 11 }} />
              <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="historical_rate" name="Historical placement %" fill="#adb5bd" radius={[4, 4, 0, 0]} />
              <Bar dataKey="current_rate" name="2027 placed so far %" fill="#3b5bdb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="avg_readiness" name="Avg readiness" fill="#15aabf" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2>Package trend (LPA) & placement rate</h2>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={data.package_trend}>
              <CartesianGrid vertical={false} stroke="#eef1f6" />
              <XAxis dataKey="batch" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="l" tick={{ fontSize: 11 }} /><YAxis yAxisId="r" orientation="right" unit="%" tick={{ fontSize: 11 }} />
              <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="r" dataKey="placement_rate" name="Placement %" fill="#dbe4ff" radius={[4, 4, 0, 0]} />
              <Line yAxisId="l" dataKey="avg" name="Average" stroke="#3b5bdb" strokeWidth={2} />
              <Line yAxisId="l" dataKey="median" name="Median" stroke="#15aabf" strokeWidth={2} />
              <Line yAxisId="l" dataKey="max" name="Highest" stroke="#7048e8" strokeWidth={2} strokeDasharray="4 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid g3 mt">
        <div className="card">
          <div className="row between"><h2>Upcoming drives</h2><Link to="/schedule" className="small">Scheduler →</Link></div>
          <ul className="list">
            {data.upcoming_drives.map((d) => (
              <li key={d.id} className="row between">
                <div><Link to={`/drives/${d.id}`}>{d.name}</Link><div className="small muted">{d.date ? `${d.date} · ${d.slot}` : 'Not scheduled'} · ₹{d.ctc} L</div></div>
                <Status s={d.tier} />
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <div className="row between"><h2>Students at risk</h2><Link to="/analytics" className="small">All →</Link></div>
          <ul className="list">
            {data.at_risk_preview.map((s) => (
              <li key={s.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/students/${s.id}`)}>
                <div className="row between"><b>{s.name}</b><span className="badge b-red">{s.probability}%</span></div>
                <div className="small muted">{s.branch} · CGPA {s.cgpa} · {s.reasons.join(', ')}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2>Documentation & joining status</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data.documents} dataKey="count" nameKey="status" outerRadius={75}>
                {data.documents.map((d) => <Cell key={d.status} fill={DOC_COLORS[d.status]} />)}
              </Pie>
              <Tooltip /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="small muted">Documents across accepted offers · {k.offers_declined} offers declined/withdrawn</div>
        </div>
      </div>

      <div className="card mt">
        <h2>Recruiter pipeline & engagement</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Recruiter</th><th>Tier</th><th>Sector</th><th>Stage</th><th className="num">Years visited</th><th className="num">Past hires</th><th className="num">2027 offers</th><th className="num">Pending</th><th>Engagement</th></tr></thead>
            <tbody>
              {data.recruiter_pipeline.map((r) => (
                <tr key={r.company}>
                  <td><b>{r.company}</b>{r.repeat_recruiter && <span className="badge b-green" style={{ marginLeft: 6 }}>Repeat</span>}</td>
                  <td><Status s={r.tier} /></td><td className="muted">{r.sector}</td><td>{r.stage}</td>
                  <td className="num">{r.years_visited}</td><td className="num">{r.total_hist_hires}</td>
                  <td className="num">{r.offers_2027}</td><td className="num">{r.pending_offers || '—'}</td>
                  <td style={{ width: 140 }}><div className="row"><div style={{ flex: 1 }}><div className="bar"><span style={{ width: `${r.engagement_score}%`, background: '#3b5bdb' }} /></div></div><span className="small">{r.engagement_score}</span></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="small muted mt">Readiness levels: <Level level="Not Ready" /> <Level level="Developing" /> <Level level="Ready" /> <Level level="Highly Employable" /></div>
      <Toast msg={toast} onClose={() => setToast('')} />
    </div>
  )
}
