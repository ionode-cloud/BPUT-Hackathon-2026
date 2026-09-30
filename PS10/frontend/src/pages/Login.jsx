import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { launchGoogleAccountSelector } from '../googleAuth'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{flexShrink:0}}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

export default function Login() {
  const { login, loginGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [notRegistered, setNotRegistered] = useState(false)
  const [busy, setBusy] = useState(false)
  const [busyLabel, setBusyLabel] = useState('')
  const [demo, setDemo] = useState([])

  useEffect(() => { api.get('/auth/demo-accounts').then(setDemo).catch(() => setDemo([])) }, [])

  const submit = async (e, em = email, pw = password) => {
    e?.preventDefault()
    setBusy(true); setErr(''); setNotRegistered(false)
    try { await login(em, pw) } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }

  const handleGoogleLogin = () => {
    setErr('')
    setNotRegistered(false)
    setBusy(true)
    setBusyLabel('Opening Google account selector…')

    launchGoogleAccountSelector({
      onSuccess: async (credential) => {
        try {
          setBusy(true)
          setBusyLabel('Verifying Google credentials…')
          await loginGoogle(credential)
        } catch (x) {
          const msg = x.message || 'Google sign-in failed'
          if (msg.includes('not registered') || msg.includes('404')) {
            setNotRegistered(true)
            setErr('Your account is not registered. Please register first.')
          } else {
            setErr(msg)
          }
        } finally {
          setBusy(false)
          setBusyLabel('')
        }
      },
      onError: (error) => {
        setBusy(false)
        setBusyLabel('')
        setErr(error.message || 'Google authentication was not completed.')
      },
      onCancel: () => {
        setBusy(false)
        setBusyLabel('')
      },
      onNeedConfig: () => {
        setBusy(false)
        setBusyLabel('')
        setErr('Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your frontend .env file.')
      }
    })
  }

  return (
    <div className="login-wrap">
      <div className="login-brand">
        <div className="brand" style={{ padding: 0 }}><div className="brand-mark">CL</div><div>CampusLink<small>Placement Intelligence</small></div></div>
        <h2 className="login-title">AI-powered campus-to-corporate placement platform</h2>
        <ul className="login-points">
          <li>Readiness scoring & skill-gap plans for every student</li>
          <li>Explainable recruiter matching with PyTorch models</li>
          <li>Conflict-free drive scheduling & automated alerts</li>
          <li>Offer, document and joining tracking on a tamper-evident ledger</li>
        </ul>
        <div className="small" style={{ color: '#8a97b8' }}>Role-based portals for Placement Officers (TPO), Students, and Recruiters.</div>
      </div>
      <div className="login-form">
        <form className="card" onSubmit={submit} style={{ width: '100%', maxWidth: 440 }}>
          <h1 style={{ marginBottom: 4, fontSize: 22, fontWeight: 800 }}>Sign in to CampusLink AI</h1>
          <p className="muted small" style={{ marginTop: 0, marginBottom: 16 }}>Select a demo account or sign in with your credentials.</p>

          <label className="small">E-mail<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', marginBottom: 10 }} /></label>
          <label className="small">Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%' }} /></label>

          {notRegistered ? (
            <div className="am-not-registered-box" style={{ marginTop: 12 }}>
              <div className="am-not-registered-msg">
                <span className="am-not-registered-icon">⚠️</span>
                <div>
                  <strong>Your account is not registered. Please register first.</strong>
                  <p>You can create a new account in seconds using Google.</p>
                </div>
              </div>
              <a href="/" className="am-register-nav-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
                Go to Registration Page →
              </a>
            </div>
          ) : (
            err && <div className="small" style={{ color: '#e03131', marginTop: 8 }}>{err}</div>
          )}

          <button className="btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: 14 }} disabled={busy}>
            {busy ? (busyLabel || 'Signing in…') : 'Sign in'}
          </button>

          <div className="am-divider" style={{ margin: '14px 0' }}><span>or</span></div>

          <button
            type="button"
            className="am-google"
            onClick={handleGoogleLogin}
            disabled={busy}
            style={{ width: '100%' }}
          >
            <GoogleIcon /> Continue with Google
          </button>

          <div className="mt" style={{ borderTop: '1px solid #eef2f6', paddingTop: 14 }}>
            <div className="small muted" style={{ marginBottom: 8, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase' }}>
              ✨ Demo Accounts (1-Click Sign In)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { role: 'student',   label: 'Student',                 email: 'student@campuslink.edu',   password: 'Student@123',   icon: '📚', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                { role: 'officer',   label: 'Placement Officer (TPO)', email: 'officer@campuslink.edu',   password: 'Officer@123',   icon: '🎓', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                { role: 'recruiter', label: 'Recruiter',               email: 'recruiter@campuslink.edu', password: 'Recruiter@123', icon: '💼', color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' },
              ].map((d) => (
                <button
                  type="button"
                  key={d.email}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '10px 4px',
                    borderRadius: 10,
                    border: `1.5px solid ${d.border}`,
                    background: d.bg,
                    color: d.color,
                    cursor: 'pointer',
                    transition: 'all .15s',
                    minHeight: 68,
                    gap: 3,
                    font: 'inherit'
                  }}
                  onClick={() => { setEmail(d.email); setPassword(d.password); submit(null, d.email, d.password) }}
                  title={`Sign in as ${d.label}`}
                >
                  <span style={{ fontSize: 18 }}>{d.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2 }}>{d.label}</span>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
