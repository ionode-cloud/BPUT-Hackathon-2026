import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { ErrorBox, Kpi, Loading, Status, Toast, useApi } from '../components/ui'

const DOC_STATES = ['Pending', 'Submitted', 'Verified', 'Rejected']

export default function Offers() {
  const [status, setStatus] = useState('')
  const { data, error, loading, reload } = useApi(`/offers${status ? `?status=${status}` : ''}`)
  const all = useApi('/offers')
  const ledger = useApi('/ledger/verify')
  const [sel, setSel] = useState(null)
  const [verify, setVerify] = useState(null)
  const [toast, setToast] = useState('')
  if (error) return <ErrorBox error={error} />
  const offers = data || []
  const current = sel ? offers.find((o) => o.id === sel) || (all.data || []).find((o) => o.id === sel) : null
  const counts = (all.data || []).reduce((m, o) => ({ ...m, [o.status]: (m[o.status] || 0) + 1 }), {})

  const [letterDoc, setLetterDoc] = useState('')

  const move = async (s) => {
    try { await api.post(`/offers/${sel}/transition`, { status: s, note: 'Updated by placement cell' }); setToast(`Offer moved to ${s}`); reload(); all.reload() } catch (e) { setToast(e.message) }
  }
  const doc = async (d, s) => { await api.post(`/offers/${sel}/documents`, { document: d, status: s }); reload(); all.reload() }
  const check = async () => setVerify(await api.get(`/offers/${sel}/verify`))

  const uploadLetter = async () => {
    try {
      await api.post(`/offers/${sel}/upload-letter`, {
        filename: letterDoc.trim() || `${current.student.replace(/\s+/g, '_')}_Offer_Letter.pdf`,
        notes: 'Official offer letter verified and stored by placement office'
      })
      setToast('Official offer letter uploaded & student notified!')
      setLetterDoc('')
      reload()
      all.reload()
    } catch (e) {
      setToast(e.message)
    }
  }

  return (
    <>
      <div className="topbar"><div><h1>Offer, Documentation & Joining Tracker</h1><p>Full post-selection lifecycle with a tamper-evident offer ledger</p></div>
        {ledger.data && <span className={`badge ${ledger.data.valid ? 'b-green' : 'b-red'}`}>Ledger: {ledger.data.offers} offers · {ledger.data.valid ? 'integrity verified' : `tampered: ${ledger.data.tampered.join(',')}`}</span>}
      </div>
      <div className="kpis">
        {['Issued', 'Accepted', 'Deferred', 'Declined', 'Joined', 'Withdrawn'].map((s) => <Kpi key={s} label={s} value={counts[s] || 0} tone={s === 'Accepted' || s === 'Joined' ? 'ok' : s === 'Issued' ? 'accent' : ''} />)}
      </div>
      <div className="grid g-2-1">
        <div className="card">
          <div className="filters">
            <div className="pill-tabs">{['', 'Issued', 'Accepted', 'Deferred', 'Declined', 'Joined'].map((s) => <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>{s || 'All'}</button>)}</div>
          </div>
          {loading ? <Loading /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Student</th><th>Company / role</th><th>Type</th><th className="num">CTC</th><th>Status</th><th>Docs</th><th>Respond by</th></tr></thead>
                <tbody>
                  {offers.map((o) => (
                    <tr key={o.id} className="click" onClick={() => { setSel(o.id); setVerify(null) }} style={sel === o.id ? { outline: '2px solid #3b5bdb' } : {}}>
                      <td><b>{o.student}</b><div className="small muted">{o.roll_no} · {o.branch}</div></td>
                      <td>{o.company}<div className="small muted">{o.role}</div></td>
                      <td className="small">{o.offer_type}{o.bond_months ? <div className="muted">{o.bond_months}-mo bond</div> : null}</td>
                      <td className="num">₹{o.ctc_lpa} L</td><td><Status s={o.status} /></td>
                      <td><Status s={o.verification_status} /><div className="small muted">{o.pending_docs.length} pending</div></td>
                      <td className="small">{o.respond_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card">
          {!current ? <div className="muted">Select an offer to manage its status, documents and verification.</div> : (
            <>
              <h2>Offer #{current.id} – <Link to={`/students/${current.student_id}`}>{current.student}</Link></h2>
              <div className="small muted">{current.company} · {current.role} · ₹{current.ctc_lpa} LPA · joining {current.joining_date}</div>
              <div className="row mt"><Status s={current.status} />{current.allowed.map((s) => <button key={s} className="btn small" onClick={() => move(s)}>→ {s}</button>)}</div>
              <h3 className="mt">Documents & verification</h3>
              {Object.entries(current.documents).map(([d, s]) => (
                <div key={d} className="row between small" style={{ padding: '5px 0', borderBottom: '1px dashed #e3e8f0' }}>
                  <span>{d}</span>
                  <select value={s} onChange={(e) => doc(d, e.target.value)}>{DOC_STATES.map((x) => <option key={x}>{x}</option>)}</select>
                </div>
              ))}
              <div style={{ marginTop: 12, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div className="small" style={{ fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                  📤 Store / Upload Student Offer Letter
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <input
                    type="text"
                    placeholder="Offer letter document or filename..."
                    value={letterDoc}
                    onChange={(e) => setLetterDoc(e.target.value)}
                    style={{ flex: 1, fontSize: 12, padding: '6px 8px' }}
                  />
                  <button className="btn small primary" onClick={uploadLetter}>
                    Upload & Notify Student
                  </button>
                </div>
              </div>
              <h3 className="mt">Timeline</h3>
              <ul className="list small">{current.history.map((h, i) => <li key={i}><b>{h.status}</b> · {h.at} <span className="muted">{h.note}</span></li>)}</ul>
              <h3 className="mt">Ledger verification</h3>
              <div className="hash">{current.ledger_hash}</div>
              <button className="btn small mt" onClick={check}>Verify authenticity</button>
              {verify && <div className="small mt" style={{ color: verify.valid ? '#2b8a3e' : '#e03131' }}>{verify.valid ? '✓ Offer terms match the ledger hash and the chain link is intact.' : '✗ Verification failed – offer terms were altered.'}</div>}
            </>
          )}
        </div>
      </div>
      <Toast msg={toast} onClose={() => setToast('')} />
    </>
  )
}
