import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { Toast, useApi } from '../components/ui'

const SUGGESTIONS = [
  'Am I eligible for TechCorp Solutions?',
  'What skills should I improve?',
  'What is my readiness score?',
  'Which documents are pending for my offer?',
  'What are the upcoming drives?',
  'What is the dream-offer policy?'
]

export default function Assistant() {
  const { user } = useAuth()
  const status = useApi('/llm/status')
  const students = useApi(['admin', 'officer', 'mentor'].includes(user?.role) ? '/students?limit=60&sort=readiness_asc' : null)
  const [sid, setSid] = useState(user?.role === 'student' ? String(user.student_id) : '')
  const [msgs, setMsgs] = useState([{ role: 'bot', text: 'Hi! I am the CampusLink placement assistant. Ask me about eligibility, readiness, skill gaps, drives, offers or policies. For urgent issues, you can escalate directly to the Placement Officer (TPO).' }])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [showEscalate, setShowEscalate] = useState(false)
  const [escalateMsg, setEscalateMsg] = useState('')
  const [urgency, setUrgency] = useState('high')
  const [toast, setToast] = useState('')
  const end = useRef(null)

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const send = async (text) => {
    const question = (text ?? q).trim()
    if (!question) return
    setMsgs((m) => [...m, { role: 'user', text: question }]); setQ(''); setBusy(true)

    // Check if question indicates an urgent matter that warrants escalation
    const isUrgent = /(urgent|emergency|complaint|harassment|discrepancy|escalat|tpo help)/i.test(question)

    try {
      const r = await api.post('/assistant', { question, student_id: sid ? Number(sid) : null })
      let botResponse = r.answer.replace(/\*\*/g, '')
      if (isUrgent) {
        botResponse += "\n\n🚨 Note: If you need urgent intervention from the placement cell, you can click '🚨 Escalate to TPO' below to alert the Placement Officer directly."
      }
      setMsgs((m) => [...m, { role: 'bot', text: botResponse, engine: r.engine }])
    } catch (e) {
      setMsgs((m) => [...m, { role: 'bot', text: `Error: ${e.message}` }])
    } finally {
      setBusy(false)
    }
  }

  const handleEscalateSubmit = async (e) => {
    e?.preventDefault()
    if (!escalateMsg.trim()) return
    setBusy(true)
    try {
      const res = await api.post('/assistant/escalate', {
        question: escalateMsg.trim(),
        urgency,
        category: 'TPO Assistance'
      })
      setMsgs((m) => [...m,
        { role: 'user', text: `[Escalation to TPO]: ${escalateMsg.trim()}` },
        { role: 'bot', text: `🚨 ${res.message || 'Your issue has been escalated to the Placement Officer (TPO). The placement cell has been alerted and will reach out to you shortly.'}` }
      ])
      setToast('Urgent issue escalated to Placement Officer (TPO)')
      setEscalateMsg('')
      setShowEscalate(false)
    } catch (err) {
      setToast(err.message || 'Failed to escalate')
    } finally {
      setBusy(false)
    }
  }

  const s = status.data

  return (
    <>
      <div className="topbar">
        <div>
          <h1>AI Placement Assistant</h1>
          <p>Retrieval-grounded chatbot for eligibility, readiness and policies · with direct TPO escalation</p>
        </div>
        <div className="row">
          <button
            type="button"
            className="btn"
            style={{ borderColor: '#ef4444', color: '#dc2626', background: '#fef2f2', fontWeight: 700 }}
            onClick={() => setShowEscalate(true)}
          >
            🚨 Escalate to TPO
          </button>
          {s && <span className={`badge ${s.available ? 'b-green' : 'b-amber'}`}>{s.mode}</span>}
        </div>
      </div>

      <div className="grid g-2-1">
        <div className="card">
          <div className="chat">
            {msgs.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                {m.text}
                {m.engine && <div className="small muted" style={{ marginTop: 4 }}>via {m.engine}</div>}
              </div>
            ))}
            {busy && <div className="msg bot muted">Thinking…</div>}
            <div ref={end} />
          </div>

          <div className="row mt">
            <input
              style={{ flex: 1 }}
              value={q}
              placeholder="Ask a question about eligibility, drives, readiness, or policies…"
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button className="btn primary" disabled={busy} onClick={() => send()}>Send</button>
          </div>

          <div className="row mt">
            {SUGGESTIONS.map((x) => (
              <button key={x} className="btn small" onClick={() => send(x)}>{x}</button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>{user?.role === 'student' ? 'Personalised to you' : 'Ask as student'}</h2>
          {user?.role !== 'student' && (
            <select value={sid} onChange={(e) => setSid(e.target.value)} style={{ width: '100%' }}>
              <option value="">Anonymous / general</option>
              {students.data?.items.map((x) => (
                <option key={x.id} value={x.id}>{x.name} ({x.branch}, {x.readiness_level})</option>
              ))}
            </select>
          )}
          {user?.role === 'student' && (
            <p className="small muted">Answers use your own profile, skill gaps, offers and drive eligibility.</p>
          )}

          <div className="card" style={{ background: '#fef2f2', border: '1.5px solid #fecaca', marginTop: 16 }}>
            <h3 style={{ color: '#991b1b', margin: '0 0 6px' }}>🚨 Need Human Support?</h3>
            <p className="small" style={{ color: '#7f1d1d', margin: '0 0 10px', lineHeight: 1.4 }}>
              If you are facing an urgent placement issue, conflicting test schedule, or offer discrepancy, escalate directly to the Placement Officer (TPO).
            </p>
            <button
              type="button"
              className="btn small"
              style={{ background: '#dc2626', color: '#fff', border: 'none', width: '100%', justifyContent: 'center' }}
              onClick={() => setShowEscalate(true)}
            >
              Contact Placement Officer (TPO) →
            </button>
          </div>

          <h3 className="mt">How it works</h3>
          <ol className="small" style={{ paddingLeft: 18, lineHeight: 1.7 }}>
            <li>Retrieve live student profile, skill gaps, offers and eligible drives</li>
            <li>Retrieve closest placement policy FAQs with semantic ranking</li>
            <li>Pass context to local PyTorch LLM with transparent fallback</li>
            <li>Automated urgency detection & direct escalation to TPO command center</li>
          </ol>
          {s && <div className="small muted">Backend: {s.backend} · model: {s.model} · state: {s.state}{s.device ? ` · ${s.device}` : ''}</div>}
        </div>
      </div>

      {/* Escalation Modal */}
      {showEscalate && (
        <div className="modal-backdrop" onClick={() => setShowEscalate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px', color: '#0f172a' }}>
              🚨 Escalate Issue to Placement Officer (TPO)
            </h3>
            <p className="small muted" style={{ margin: '0 0 16px', lineHeight: 1.45 }}>
              The Placement Officer will receive an instant high-priority alert with your profile details to review and assist you.
            </p>
            <form onSubmit={handleEscalateSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label className="small" style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>Urgency Level</label>
                <select value={urgency} onChange={(e) => setUrgency(e.target.value)} style={{ width: '100%' }}>
                  <option value="medium">Medium – General guidance needed</option>
                  <option value="high">High – Schedule conflict / Drive issue</option>
                  <option value="critical">Critical – Offer deadline / Document emergency</option>
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="small" style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>Describe the issue</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain the problem clearly (e.g., overlapping test timings, offer dispute, attendance issue)..."
                  value={escalateMsg}
                  onChange={(e) => setEscalateMsg(e.target.value)}
                />
              </div>
              <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn" onClick={() => setShowEscalate(false)}>Cancel</button>
                <button type="submit" className="btn primary" style={{ background: '#dc2626', borderColor: '#dc2626' }} disabled={busy}>
                  {busy ? 'Submitting…' : 'Send to TPO →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast msg={toast} onClose={() => setToast('')} />
    </>
  )
}
