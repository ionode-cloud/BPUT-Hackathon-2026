import { useEffect, useState, useCallback } from 'react'
import { api } from '../api'

export const LEVEL_COLORS = {
  'Not Ready': '#e03131', Developing: '#e67700', Ready: '#1c7ed6', 'Highly Employable': '#2b8a3e', 'Not Eligible': '#868e96',
}
const LEVEL_CLASS = { 'Not Ready': 'b-red', Developing: 'b-amber', Ready: 'b-blue', 'Highly Employable': 'b-green', 'Not Eligible': 'b-grey' }
const STATUS_CLASS = {
  Shortlisted: 'b-blue', Selected: 'b-green', Rejected: 'b-red', Waitlisted: 'b-amber', 'Below Threshold': 'b-amber',
  'Not Eligible': 'b-grey', Issued: 'b-blue', Accepted: 'b-green', Joined: 'b-green', Deferred: 'b-amber', Declined: 'b-red',
  Withdrawn: 'b-red', Pending: 'b-amber', Submitted: 'b-blue', Verified: 'b-green', Issue: 'b-red', Upcoming: 'b-blue',
  Completed: 'b-grey', Dream: 'b-violet', Super: 'b-blue', Regular: 'b-grey', critical: 'b-red', high: 'b-amber',
  medium: 'b-blue', info: 'b-grey',
}

export function useApi(path, deps = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(() => {
    if (!path) return
    setLoading(true)
    api.get(path).then((d) => { setData(d); setError(null) }).catch(setError).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps])
  useEffect(() => { load() }, [load])
  return { data, error, loading, reload: load }
}

export const Level = ({ level }) => <span className={`badge ${LEVEL_CLASS[level] || 'b-grey'}`}>{level}</span>
export const Status = ({ s }) => <span className={`badge ${STATUS_CLASS[s] || 'b-grey'}`}>{s}</span>

export function Kpi({ label, value, sub, tone = '' }) {
  return (
    <div className={`kpi ${tone}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )
}

export function ScoreBar({ value, color, max = 100 }) {
  const c = color || (value >= 70 ? '#2b8a3e' : value >= 55 ? '#1c7ed6' : value >= 40 ? '#e67700' : '#e03131')
  return <div className="bar"><span style={{ width: `${Math.max(2, Math.min(100, (value / max) * 100))}%`, background: c }} /></div>
}

export function Gauge({ value, label }) {
  const r = 52, c = 2 * Math.PI * r, arc = c * 0.75
  const pct = Math.max(0, Math.min(100, value)) / 100
  const color = value >= 70 ? '#2b8a3e' : value >= 55 ? '#1c7ed6' : value >= 40 ? '#e67700' : '#e03131'
  return (
    <svg viewBox="0 0 140 120" width="170" role="img" aria-label={`${label} ${value}`}>
      <g transform="rotate(135 70 70)">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#edf0f5" strokeWidth="12" strokeDasharray={`${arc} ${c}`} strokeLinecap="round" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12" strokeDasharray={`${arc * pct} ${c}`} strokeLinecap="round" />
      </g>
      <text x="70" y="72" textAnchor="middle" fontSize="28" fontWeight="700" fill="#0f172a">{value.toFixed(0)}</text>
      <text x="70" y="114" textAnchor="middle" fontSize="11" fill="#64748b">{label}</text>
    </svg>
  )
}

export const Loading = () => <div className="loading">Loading…</div>
export const ErrorBox = ({ error }) => <div className="card" style={{ color: '#e03131' }}>Error: {String(error?.message || error)} — is the API running on port 8000?</div>

export function Toast({ msg, onClose }) {
  useEffect(() => { if (msg) { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) } }, [msg, onClose])
  return msg ? <div className="toast">{msg}</div> : null
}

export const fmt = (n, d = 1) => (n === null || n === undefined ? '—' : Number(n).toFixed(d))
