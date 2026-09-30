import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

/** Staff-only "Delete student" button with a type-the-roll-number confirmation dialog. */
export default function DeleteStudent({ student, compact = false, onDeleted }) {
  const [open, setOpen] = useState(false)
  const [check, setCheck] = useState(null)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const nav = useNavigate()

  useEffect(() => {
    if (!open) return
    setTyped(''); setErr(''); setCheck(null)
    api.get(`/students/${student.id}/delete-check`).then(setCheck).catch((e) => setErr(e.message))
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open, student.id])

  const remove = async () => {
    setBusy(true); setErr('')
    try {
      await api.del(`/students/${student.id}?confirm=${encodeURIComponent(typed)}`)
      const msg = `${student.name} (${student.roll_no}) was deleted`
      if (onDeleted) { setOpen(false); onDeleted(msg) } else nav('/students', { state: { toast: msg } })
    } catch (e) { setErr(e.message); setBusy(false) }
  }
  const blocked = check?.blockers?.length > 0
  const ok = typed.trim().toUpperCase() === student.roll_no.toUpperCase()

  return (
    <>
      <button className="btn danger small" title={`Delete ${student.name}`} aria-label={`Delete ${student.name}`}
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}>🗑{compact ? '' : ' Delete student'}</button>
      {open && (
        <div className="modal-backdrop" style={{ cursor: 'default' }}
          onClick={(e) => { e.stopPropagation(); if (!busy) setOpen(false) }}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>Delete {student.name}?</h3>
            {!check && !err && <p className="small muted">Checking…</p>}
            {blocked && <p className="small" style={{ color: '#c92a2a' }}>Cannot delete: {check.blockers.join(' ')}</p>}
            {check && !blocked && (
              <>
                <p className="small">This permanently removes the profile, {check.applications} drive application(s),
                  {' '}{check.resumes} resume PDF(s) and {check.logins} portal login(s). Drive pools are re-ranked so the next
                  candidate moves up. The action is recorded in the audit log and cannot be undone.</p>
                <label className="small">Type the roll number <b>{student.roll_no}</b> to confirm
                  <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} style={{ width: '100%' }}
                    onKeyDown={(e) => e.key === 'Enter' && ok && !busy && remove()} /></label>
              </>)}
            {err && <p className="small" style={{ color: '#c92a2a' }}>{err}</p>}
            <div className="row mt" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
              {!blocked && <button className="btn danger solid" disabled={!ok || busy} onClick={remove}>{busy ? 'Deleting…' : 'Delete permanently'}</button>}
            </div>
          </div>
        </div>)}
    </>
  )
}
