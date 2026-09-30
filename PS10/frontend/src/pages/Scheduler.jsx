import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { ErrorBox, Loading, Status, Toast, useApi } from '../components/ui'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const iso = (d) => d.toISOString().slice(0, 10)

function Calendar({ events, conflictIds, holidays, start, weeks = 6 }) {
  const days = useMemo(() => {
    const s = new Date(start + 'T00:00:00Z')
    const offset = (s.getUTCDay() + 6) % 7
    s.setUTCDate(s.getUTCDate() - offset)
    return Array.from({ length: weeks * 7 }, (_, i) => { const d = new Date(s); d.setUTCDate(s.getUTCDate() + i); return d })
  }, [start, weeks])
  return (
    <div className="cal" style={{ gridTemplateColumns: 'repeat(7, minmax(0,1fr))' }}>
      {WEEKDAYS.map((w) => <div key={w} className="small muted" style={{ fontWeight: 600, textAlign: 'center' }}>{w}</div>)}
      {days.map((d) => {
        const key = iso(d)
        const evs = events.filter((e) => e.date === key)
        const off = d.getUTCDay() === 0 || holidays[key]
        return (
          <div key={key} className={`cal-day ${off ? 'off' : ''}`}>
            <div className="d"><span>{d.getUTCDate()} {d.toLocaleString('en', { month: 'short', timeZone: 'UTC' })}</span>{holidays[key] && <span style={{ color: '#e03131' }}>{holidays[key]}</span>}</div>
            {evs.sort((a, b) => (a.slot > b.slot ? 1 : -1)).map((e) => (
              <div key={e.id} className={`cal-ev ev-${e.tier} ${conflictIds.has(e.id) ? 'ev-conf' : ''}`} title={`${e.name} @ ${e.venue}`}>
                <b>{e.slot}</b> {e.company.split(' ')[0]}<div className="muted">{e.venue}</div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export default function Scheduler() {
  const { data, error, loading, reload } = useApi('/schedule')
  const meta = useApi('/meta')
  const [plan, setPlan] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [manual, setManual] = useState({ drive: '', date: '2026-10-12', slot: 'AM', venue_id: 1 })
  if (error) return <ErrorBox error={error} />
  if (loading || !data) return <Loading />
  const upcoming = data.calendar.filter((e) => e.status === 'Upcoming')
  const real = data.conflicts.filter((c) => c.severity !== 'info')
  const conflictIds = new Set(real.flatMap((c) => c.drives))
  const preview = plan ? upcoming.map((e) => { const ch = plan.changes.find((c) => c.drive_id === e.id); return ch ? { ...e, date: ch.to.date, slot: ch.to.slot, venue: ch.to.venue } : e }) : null

  const runAuto = async (apply) => {
    setBusy(true)
    const r = await api.post(`/schedule/auto?apply=${apply}`)
    setBusy(false)
    if (apply) { setToast(`Schedule applied – ${r.changes.length} drives moved, students & recruiters notified`); setPlan(null); reload() } else setPlan(r)
  }
  const assign = async () => {
    if (!manual.drive) return
    const r = await api.put(`/drives/${manual.drive}/schedule`, { date: manual.date, slot: manual.slot, venue_id: Number(manual.venue_id) })
    setToast(r.conflicts.length ? `Saved with ${r.conflicts.length} conflict(s): ${r.conflicts[0].type}` : 'Saved – no conflicts'); reload()
  }

  return (
    <>
      <div className="topbar">
        <div><h1>Conflict-aware Drive Scheduler</h1><p>Detects venue, candidate, panel, capacity and holiday conflicts – and resolves them automatically</p></div>
        <div className="row">
          <button className="btn" disabled={busy} onClick={() => runAuto(false)}>⚙ Preview auto-schedule</button>
          {plan && <button className="btn primary" disabled={busy} onClick={() => runAuto(true)}>Apply plan & notify</button>}
        </div>
      </div>

      <div className="kpis">
        <div className="kpi warn"><div className="label">Active conflicts</div><div className="value">{real.length}</div><div className="sub">{real.filter((c) => c.severity === 'critical').length} critical</div></div>
        <div className="kpi"><div className="label">Unscheduled drives</div><div className="value">{data.conflicts.filter((c) => c.type === 'Unscheduled').length}</div></div>
        <div className="kpi"><div className="label">Upcoming drives</div><div className="value">{upcoming.length}</div></div>
        <div className="kpi"><div className="label">Panel pool / slot</div><div className="value">{data.panel_pool[1]}</div><div className="sub">Main campus · {data.panel_pool[2]} North</div></div>
        {plan && <div className="kpi ok"><div className="label">After auto-schedule</div><div className="value">{plan.conflicts_after}</div><div className="sub">conflicts (was {plan.conflicts_before}) · {plan.runtime_ms} ms</div></div>}
      </div>

      <div className="grid g-2-1">
        <div className="card">
          <div className="row between"><h2>{plan ? 'Proposed schedule (preview)' : 'Current schedule'}</h2><span className="small muted">Red outline = conflict · colour = recruiter tier</span></div>
          <Calendar events={preview || upcoming} conflictIds={plan ? new Set(plan.after.filter((c) => c.severity !== 'info').flatMap((c) => c.drives)) : conflictIds} holidays={data.holidays} start="2026-10-01" />
        </div>
        <div className="card">
          <h2>{plan ? 'Plan changes' : 'Detected conflicts'}</h2>
          {plan ? (
            plan.changes.length ? plan.changes.map((c) => (
              <div key={c.drive_id} className="conflict"><div><b>{c.drive}</b><div className="small muted">{c.from} →</div><div className="small" style={{ color: '#2b8a3e' }}>{c.to.date} {c.to.slot} @ {c.to.venue}</div></div></div>
            )) : <div className="muted">No changes needed.</div>
          ) : data.conflicts.map((c, i) => (
            <div key={i} className="conflict"><Status s={c.severity} /><div><b>{c.type}</b><div className="small">{c.detail}</div></div></div>
          ))}
          {plan?.unplaced?.length > 0 && <div className="small" style={{ color: '#e03131' }}>Could not place: {plan.unplaced.map((u) => u.drive).join(', ')}</div>}
        </div>
      </div>

      <div className="grid g2 mt">
        <div className="card">
          <h2>Manual slot assignment</h2>
          <p className="small muted">Book a slot and instantly see whether it creates a conflict.</p>
          <div className="row">
            <select value={manual.drive} onChange={(e) => setManual({ ...manual, drive: e.target.value })}>
              <option value="">Select drive…</option>{upcoming.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <input type="date" value={manual.date} onChange={(e) => setManual({ ...manual, date: e.target.value })} />
            <select value={manual.slot} onChange={(e) => setManual({ ...manual, slot: e.target.value })}><option>AM</option><option>PM</option></select>
            <select value={manual.venue_id} onChange={(e) => setManual({ ...manual, venue_id: e.target.value })}>
              {meta.data?.venues.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.capacity})</option>)}
            </select>
            <button className="btn primary" onClick={assign}>Save</button>
          </div>
        </div>
        <div className="card">
          <h2>Drives</h2>
          <table>
            <thead><tr><th>Drive</th><th>Slot</th><th>Venue</th><th>Window</th></tr></thead>
            <tbody>{upcoming.map((e) => <tr key={e.id}><td><Link to={`/drives/${e.id}`}>{e.name}</Link></td><td className="small">{e.date ? `${e.date} ${e.slot}` : '—'}</td><td className="small">{e.venue || '—'}</td><td className="small muted">{e.window[0]} → {e.window[1]}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
      <Toast msg={toast} onClose={() => setToast('')} />
    </>
  )
}
