import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../auth'
import { api } from '../api'
import { launchGoogleAccountSelector } from '../googleAuth'

export const ROLES = [
  { value: 'student',   label: 'Student',                 desc: 'Seeking job or internship',     icon: '📚', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  { value: 'officer',   label: 'Placement Officer (TPO)', desc: 'Manage placements & drives',    icon: '🎓', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { value: 'recruiter', label: 'Recruiter',               desc: 'Hire talent & post job drives', icon: '💼', color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' },
]

export const DEMO_ACCOUNTS = [
  { role: 'student',   label: 'Student',                 email: 'student@campuslink.edu',   password: 'Student@123',   icon: '📚', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  { role: 'officer',   label: 'Placement Officer (TPO)', email: 'officer@campuslink.edu',   password: 'Officer@123',   icon: '🎓', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { role: 'recruiter', label: 'Recruiter',               email: 'recruiter@campuslink.edu', password: 'Recruiter@123', icon: '💼', color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' },
]

function useScrollReveal(threshold = 0.12) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('lp-revealed'); obs.unobserve(el) } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return ref
}

const SLIDES = [
  { tag: 'AI Placement Intelligence', title: "Know Every Student's Readiness — Instantly", desc: "Our deep PyTorch ensemble scores every student on 20+ dimensions: CGPA, skills, projects and mock tests. Identify at-risk students before it's too late.", icon: '🎯', stat: '98%', statLabel: 'Prediction Accuracy', gradient: 'linear-gradient(135deg, rgba(239,246,255,0.82) 0%, rgba(240,244,255,0.78) 50%, rgba(250,245,255,0.82) 100%)', accent: '#2563eb', accentBg: '#eff6ff', illustration: '🧠', bg: '/slides/slide1.jpg' },
  { tag: 'Smart Matching Engine', title: 'Match Students to Jobs with Explainable AI', desc: 'FitNet — our learned RankNet model — ranks candidates using Skill2Vec embeddings and real placement history. Full Integrated-Gradient explanations for every match.', icon: '⚡', stat: '3x', statLabel: 'Faster Shortlisting', gradient: 'linear-gradient(135deg, rgba(240,253,244,0.80) 0%, rgba(236,253,245,0.76) 50%, rgba(239,246,255,0.80) 100%)', accent: '#0ea5e9', accentBg: '#f0f9ff', illustration: '🤝', bg: '/slides/slide2.jpg' },
  { tag: 'Drive Scheduling', title: 'Zero-Conflict Drive Scheduling, Automated', desc: 'Our conflict-aware scheduler books venues, resolves clashes, respects holidays, and sends automated reminders — so your placement cell focuses on people, not spreadsheets.', icon: '📅', stat: '100%', statLabel: 'Scheduling Automation', gradient: 'linear-gradient(135deg, rgba(254,249,195,0.82) 0%, rgba(254,243,199,0.78) 50%, rgba(255,251,235,0.82) 100%)', accent: '#d97706', accentBg: '#fffbeb', illustration: '📆', bg: '/slides/slide3.jpg' },
  { tag: 'Tamper-Evident Ledger', title: 'Hash-Chained Offer Tracking — Audit-Proof', desc: 'Every offer, document submission and status transition is recorded in a cryptographic hash-chain. Full audit trail, zero tampering, complete accountability.', icon: '🔐', stat: '256-bit', statLabel: 'Cryptographic Integrity', gradient: 'linear-gradient(135deg, rgba(250,245,255,0.75) 0%, rgba(245,243,255,0.70) 50%, rgba(237,233,254,0.75) 100%)', accent: '#7c3aed', accentBg: '#f5f3ff', illustration: '🛡️', bg: '/slides/slide4.jpg' },
  { tag: 'Role-Based Portals', title: 'One Platform, Three Roles — Perfectly Scoped', desc: 'Placement officers, administrators and students each get their own portal with exactly the data they need — nothing more, nothing less.', icon: '👥', stat: '3', statLabel: 'Dedicated Role Portals', gradient: 'linear-gradient(135deg, rgba(255,241,242,0.80) 0%, rgba(253,242,248,0.76) 50%, rgba(250,245,255,0.80) 100%)', accent: '#db2777', accentBg: '#fdf2f8', illustration: '🏛️', bg: '/slides/slide5.jpg' },
]

const WORKFLOW = [
  { step: '01', icon: '📋', title: 'Onboard Students', desc: 'Import via CSV or register individually. AI models score each student instantly — no retraining required.' },
  { step: '02', icon: '📄', title: 'Upload Resumes', desc: 'Students drag-and-drop their PDF. NLP extracts skills, projects and certifications automatically.' },
  { step: '03', icon: '🏢', title: 'Register Companies & JDs', desc: 'Add hiring partners and job profiles. FitNet matches and ranks the eligible pool automatically.' },
  { step: '04', icon: '📅', title: 'Schedule Drives', desc: 'The AI scheduler creates a conflict-free calendar, books venues, and sends reminders to all stakeholders.' },
  { step: '05', icon: '✅', title: 'Shortlist & Interview', desc: 'Review AI-ranked shortlists with explainability scores. Advance candidates with one click.' },
  { step: '06', icon: '🎉', title: 'Issue Offers & Track Onboarding', desc: 'Extend offers, track acceptances and manage documents on the tamper-evident ledger.' },
]

// ── Google SVG icon ────────────────────────────────────────────────────────────
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

// ── Auth Modal ─────────────────────────────────────────────────────────────────
function LoginModal({ onClose }) {
  const { login, register, registerGoogle, loginGoogle } = useAuth()
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [notRegisteredErr, setNotRegisteredErr] = useState(false)
  const [busy, setBusy] = useState(false)
  const [busyLabel, setBusyLabel] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('student')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showGoogleConfig, setShowGoogleConfig] = useState(false)
  const [mockEmail, setMockEmail] = useState('')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const switchTab = (t) => {
    setTab(t)
    setErr('')
    setNotRegisteredErr(false)
  }

  const submitLogin = async (e, em = email, pw = password) => {
    e?.preventDefault()
    setBusy(true)
    setBusyLabel('Signing in…')
    setErr('')
    setNotRegisteredErr(false)
    try {
      await login(em, pw)
      onClose()
    } catch (x) {
      setErr(x.message)
    } finally {
      setBusy(false)
      setBusyLabel('')
    }
  }

  const submitRegister = async (e) => {
    e.preventDefault()
    if (password.length < 8) { setErr('Password must be at least 8 characters long'); return }
    if (!/[A-Z]/.test(password)) { setErr('Password must contain at least one uppercase letter (A-Z)'); return }
    if (!/[0-9]/.test(password)) { setErr('Password must contain at least one number (0-9)'); return }
    if (password !== confirmPw) { setErr('Passwords do not match'); return }
    setBusy(true)
    setBusyLabel('Creating account…')
    setErr('')
    try {
      await register(name, email, password, role)
      onClose()
    } catch (x) {
      setErr(x.message)
    } finally {
      setBusy(false)
      setBusyLabel('')
    }
  }

  // Google Login Flow
  const handleGoogleLogin = () => {
    setErr('')
    setNotRegisteredErr(false)
    setBusy(true)
    setBusyLabel('Opening Google account selector…')

    launchGoogleAccountSelector({
      onSuccess: async (credential) => {
        try {
          setBusy(true)
          setBusyLabel('Verifying Google credentials…')
          await loginGoogle(credential)
          onClose()
        } catch (x) {
          const msg = x.message || 'Google sign-in failed'
          if (msg.includes('not registered') || msg.includes('404')) {
            setNotRegisteredErr(true)
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
        setShowGoogleConfig(true)
      }
    })
  }

  // Google Register Flow
  const handleGoogleRegister = () => {
    setErr('')
    setNotRegisteredErr(false)
    setBusy(true)
    setBusyLabel('Opening Google account selector…')

    launchGoogleAccountSelector({
      onSuccess: async (credential) => {
        try {
          const targetRoleLabel = ROLES.find(r => r.value === role)?.label || role
          setBusy(true)
          setBusyLabel(`Creating ${targetRoleLabel} account…`)
          await registerGoogle(credential, role)
          onClose()
        } catch (x) {
          setErr(x.message || 'Registration with Google failed')
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
        setShowGoogleConfig(true)
      }
    })
  }

  // Dev mode simulation when VITE_GOOGLE_CLIENT_ID is not configured yet
  const handleSimulateDevGoogle = async () => {
    setShowGoogleConfig(false)
    setBusy(true)
    setErr('')
    setNotRegisteredErr(false)
    try {
      if (tab === 'register') {
        const simEmail = mockEmail.trim() || `${role}.${Date.now().toString().slice(-4)}@gmail.com`
        const simName = simEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        const targetRoleLabel = ROLES.find(r => r.value === role)?.label || role
        setBusyLabel(`Registering new ${targetRoleLabel} with Google identity…`)
        await registerGoogle(`dev_mock:${simEmail}:${simName}`, role)
        onClose()
      } else {
        const simEmail = mockEmail.trim() || 'unregistered.user@gmail.com'
        setBusyLabel('Verifying Google account…')
        await loginGoogle(`dev_mock:${simEmail}:Google User`)
        onClose()
      }
    } catch (x) {
      const msg = x.message || 'Google authentication failed'
      if (msg.includes('not registered') || msg.includes('404')) {
        setNotRegisteredErr(true)
        setErr('Your account is not registered. Please register first.')
      } else {
        setErr(msg)
      }
    } finally {
      setBusy(false)
      setBusyLabel('')
    }
  }

  const FEATURES = [
    'AI-powered student readiness scoring',
    'Automated conflict-free drive scheduling',
    'Tamper-evident offer & document tracking',
  ]

  const selectedRole = ROLES.find(r => r.value === role)

  return (
    <div className="am-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="am-shell">

        {/* ── LEFT BRANDING PANEL ── */}
        <div className="am-left">
          <div className="am-blob am-blob-1" />
          <div className="am-blob am-blob-2" />
          <div className="am-blob am-blob-3" />
          <div className="am-left-content">
            <div className="am-left-logo">
              <div className="am-left-mark">CL</div>
              <span className="am-left-name">CampusLink</span>
            </div>
            <h2 className="am-left-headline">AI-Powered<br/>Campus Placements</h2>
            <p className="am-left-sub">The smartest way to connect students with their dream careers.</p>
            <ul className="am-features">
              {FEATURES.map(f => (
                <li key={f}><span className="am-feat-check">✓</span>{f}</li>
              ))}
            </ul>
            <div className="am-left-badge">Trusted by placement cells across India</div>
          </div>
        </div>

        {/* ── RIGHT FORM PANEL ── */}
        <div className="am-right">
          <button className="am-close" onClick={onClose} aria-label="Close">✕</button>

          {/* Tabs */}
          <div className="am-tabs">
            <button className={`am-tab ${tab === 'login' ? 'am-tab--on' : ''}`} onClick={() => switchTab('login')}>Login</button>
            <button className={`am-tab ${tab === 'register' ? 'am-tab--on' : ''}`} onClick={() => switchTab('register')}>Register</button>
            <div className="am-tab-ink" style={{ left: tab === 'login' ? '0%' : '50%' }} />
          </div>

          {/* ── LOGIN FORM ── */}
          {tab === 'login' && (
            <form onSubmit={submitLogin} className="am-form">
              <div style={{ marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Sign in to CampusLink AI</h3>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#64748b' }}>Select a demo account or sign in with your email & password.</p>
              </div>

              <div className="am-field">
                <label>Email address</label>
                <input type="email" autoComplete="username" value={email}
                  onChange={e => setEmail(e.target.value)} required placeholder="you@college.edu" />
              </div>
              <div className="am-field">
                <label>Password</label>
                <div className="am-pw-wrap">
                  <input type={showPw ? 'text' : 'password'} autoComplete="current-password" value={password}
                    onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
                  <button type="button" className="am-pw-eye" tabIndex={-1} onClick={() => setShowPw(p => !p)}>
                    {showPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Not Registered Error Banner */}
              {notRegisteredErr ? (
                <div className="am-not-registered-box">
                  <div className="am-not-registered-msg">
                    <span className="am-not-registered-icon">⚠️</span>
                    <div>
                      <strong>Your account is not registered. Please register first.</strong>
                      <p>Select your role and continue with Google on the registration page.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="am-register-nav-btn"
                    onClick={() => switchTab('register')}
                  >
                    Go to Registration →
                  </button>
                </div>
              ) : (
                err && <div className="am-err">⚠ {err}</div>
              )}

              <button className="am-submit" type="submit" disabled={busy}>
                {busy && <span className="am-spinner" />}
                {busy ? (busyLabel || 'Signing in…') : 'Sign in'}
              </button>

              <div className="am-divider"><span>or</span></div>

              {/* Continue with Google button */}
              <button
                className="am-google"
                type="button"
                onClick={handleGoogleLogin}
                disabled={busy}
                title="Sign in with your verified Google account"
              >
                <GoogleIcon /> Continue with Google
              </button>

              {/* Demo Accounts (1-Click Sign In) */}
              <div className="am-demo">
                <div className="am-demo-label">✨ Demo Accounts (1-Click Sign In)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {DEMO_ACCOUNTS.map((d) => (
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
                      onClick={() => {
                        setEmail(d.email)
                        setPassword(d.password)
                        submitLogin(null, d.email, d.password)
                      }}
                      title={`Sign in as ${d.label}`}
                    >
                      <span style={{ fontSize: 18 }}>{d.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2 }}>{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <p className="am-switch">Don't have an account?{' '}
                <button type="button" onClick={() => switchTab('register')}>Register here</button>
              </p>
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {tab === 'register' && (
            <form onSubmit={submitRegister} className="am-form">
              {/* Step 1: Role cards */}
              <div className="am-role-section">
                <div className="am-role-label">Step 1: Select your role</div>
                <div className="am-role-cards">
                  {ROLES.map(r => (
                    <button type="button" key={r.value}
                      className={`am-role-card ${role === r.value ? 'am-role-card--on' : ''}`}
                      style={role === r.value ? { borderColor: r.color, background: r.bg } : {}}
                      onClick={() => setRole(r.value)}>
                      <div className="am-role-card-icon"
                        style={{ background: role === r.value ? r.color : '#e2e8f0', color: role === r.value ? '#fff' : '#64748b' }}>
                        {r.icon}
                      </div>
                      <div className="am-role-card-body">
                        <div className="am-role-card-name"
                          style={role === r.value ? { color: r.color } : {}}>{r.label}</div>
                        <div className="am-role-card-desc">{r.desc}</div>
                      </div>
                      <div className={`am-role-radio ${role === r.value ? 'on' : ''}`}
                        style={role === r.value ? { background: r.color, borderColor: r.color } : {}} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="am-field">
                <label>Full name</label>
                <input type="text" autoComplete="name" value={name}
                  onChange={e => setName(e.target.value)} required placeholder="Your full name" minLength={2} />
              </div>
              <div className="am-field">
                <label>Email address</label>
                <input type="email" autoComplete="email" value={email}
                  onChange={e => setEmail(e.target.value)} required placeholder="you@college.edu" />
              </div>
              <div className="am-field">
                <label>Password</label>
                <div className="am-pw-wrap">
                  <input type={showPw ? 'text' : 'password'} autoComplete="new-password" value={password}
                    onChange={e => setPassword(e.target.value)} required placeholder="Min 8 chars, 1 uppercase & 1 digit" />
                  <button type="button" className="am-pw-eye" tabIndex={-1} onClick={() => setShowPw(p => !p)}>
                    {showPw ? '🙈' : '👁️'}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>Must contain at least 8 characters, 1 uppercase letter, and 1 number</div>
              </div>
              <div className="am-field">
                <label>Confirm password</label>
                <input type="password" autoComplete="new-password" value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)} required placeholder="Repeat password" />
              </div>

              {err && <div className="am-err">⚠ {err}</div>}

              <button className="am-submit" type="submit" disabled={busy}
                style={selectedRole ? { background: `linear-gradient(135deg, ${selectedRole.color}, ${selectedRole.color}cc)` } : {}}>
                {busy && <span className="am-spinner" />}
                {busy ? (busyLabel || 'Creating account…') : `Create ${selectedRole?.label} Account`}
              </button>

              <div className="am-divider"><span>or register with Google</span></div>

              {/* Step 2: Continue with Google button */}
              <button
                className="am-google"
                type="button"
                onClick={handleGoogleRegister}
                disabled={busy}
                title={`Continue with Google as ${selectedRole?.label}`}
              >
                <GoogleIcon /> Continue with Google as {selectedRole?.label}
              </button>

              <p className="am-switch">Already have an account?{' '}
                <button type="button" onClick={() => switchTab('login')}>Sign in</button>
              </p>
            </form>
          )}
        </div>
      </div>

      {/* ── Google Configuration / Dev Simulation Dialog ── */}
      {showGoogleConfig && (
        <div className="am-gconfig-overlay" onClick={() => setShowGoogleConfig(false)}>
          <div className="am-gconfig-card" onClick={e => e.stopPropagation()}>
            <div className="am-gconfig-header">
              <div className="am-gconfig-icon">
                <GoogleIcon />
              </div>
              <div>
                <h3 className="am-gconfig-title">Google OAuth Configuration</h3>
                <p className="am-gconfig-desc">Setup your Google Cloud OAuth Client ID for live sign-in</p>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
              To enable official Google Identity Services in your environment, configure your Web OAuth Client ID in:
            </p>

            <div className="am-gconfig-code">
              campuslink/frontend/.env → VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com<br/>
              campuslink/backend/.env → GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                🧪 Dev Mode: Test Google Flow Now
              </div>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 8px' }}>
                You can simulate a verified Google account right now without waiting for cloud credentials:
              </p>
              <input
                type="email"
                value={mockEmail}
                onChange={e => setMockEmail(e.target.value)}
                placeholder={tab === 'register' ? (role === 'officer' ? 'new.officer@gmail.com' : 'new.student@gmail.com') : 'unregistered.user@gmail.com'}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box', marginBottom: 8 }}
              />
              <button
                type="button"
                className="btn primary small"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleSimulateDevGoogle}
              >
                {tab === 'register' ? `Test Register with Google (${selectedRole?.label})` : 'Test Login with Google'}
              </button>
            </div>

            <div className="am-gconfig-actions">
              <button type="button" className="btn secondary small" onClick={() => setShowGoogleConfig(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Landing Page ──────────────────────────────────────────────────────────
export default function Landing() {
  const [showLogin, setShowLogin] = useState(false)
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)
  const intervalRef = useRef(null)

  const workflowRef = useScrollReveal(0.05)
  const portalsRef  = useScrollReveal(0.1)
  const ctaRef      = useScrollReveal(0.2)

  const advance = useCallback(() => setCurrent(c => (c + 1) % SLIDES.length), [])

  useEffect(() => {
    if (!paused) { intervalRef.current = setInterval(advance, 4800) }
    return () => clearInterval(intervalRef.current)
  }, [paused, advance])

  useEffect(() => {
    const h = () => setNavScrolled(window.scrollY > 60)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  const goTo = (i) => { setCurrent(i); setPaused(true); setTimeout(() => setPaused(false), 8000) }
  const slide = SLIDES[current]

  return (
    <div className="lp-root">
      <nav className={`lp-nav ${navScrolled ? 'lp-nav--scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <div className="lp-logo">
            <div className="lp-logo-mark">CL</div>
            <span className="lp-logo-text">CampusLink</span>
            <span className="lp-logo-badge">AI</span>
          </div>
          <div className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#portals">Portals</a>
          </div>
          <button className="lp-nav-login" id="nav-login-btn" onClick={() => setShowLogin(true)}>Sign in →</button>
        </div>
      </nav>

      <section id="features" className="lp-hero"
        style={{ backgroundImage: `${slide.gradient}, url(${slide.bg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
        onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div className="lp-blob lp-blob-1" style={{ background: slide.accent + '18' }} />
        <div className="lp-blob lp-blob-2" style={{ background: slide.accent + '10' }} />
        <div className="lp-hero-inner">
          <div className="lp-hero-content">
            <div className="lp-slide-tag lp-hero-tag-anim" style={{ background: slide.accentBg, color: slide.accent, borderColor: slide.accent + '33' }}>
              {slide.icon} &nbsp;{slide.tag}
            </div>
            <h1 className="lp-hero-title lp-hero-title-anim">{slide.title}</h1>
            <p className="lp-hero-desc lp-hero-desc-anim">{slide.desc}</p>
            <div className="lp-hero-stat lp-hero-stat-anim">
              <span className="lp-stat-value" style={{ color: slide.accent }}>{slide.stat}</span>
              <span className="lp-stat-label">{slide.statLabel}</span>
            </div>
            <div className="lp-hero-actions lp-hero-actions-anim">
              <button id="hero-cta-btn" className="lp-btn-primary" style={{ background: slide.accent }} onClick={() => setShowLogin(true)}>
                Get Started Free →
              </button>
              <a href="#how-it-works" className="lp-btn-outline" style={{ color: slide.accent, borderColor: slide.accent + '55' }}>
                See How It Works
              </a>
            </div>
          </div>
          <div className="lp-hero-visual">
            <div className="lp-hero-card" style={{ borderColor: slide.accent + '22', boxShadow: `0 20px 60px ${slide.accent}18` }}>
              <div className="lp-hero-card-icon" style={{ background: slide.accentBg, color: slide.accent }}>{slide.illustration}</div>
              <div className="lp-hero-card-stat" style={{ color: slide.accent }}>{slide.stat}</div>
              <div className="lp-hero-card-label">{slide.statLabel}</div>
              <div className="lp-hero-card-tag" style={{ background: slide.accentBg, color: slide.accent }}>{slide.tag}</div>
            </div>
          </div>
        </div>
        <div className="lp-dots">
          {SLIDES.map((s, i) => (
            <button key={i} className={`lp-dot ${i === current ? 'lp-dot--active' : ''}`}
              style={i === current ? { background: slide.accent } : {}}
              onClick={() => goTo(i)} aria-label={`Slide ${i + 1}`} />
          ))}
        </div>
        <div className="lp-progress-bar">
          <div key={current} className={`lp-progress-fill ${!paused ? 'lp-progress-animate' : ''}`} style={{ background: slide.accent }} />
        </div>
      </section>

      <section id="how-it-works" className="lp-section lp-workflow-section lp-reveal-section" ref={workflowRef}>
        <div className="lp-section-header lp-reveal-child" style={{ '--delay': '0ms' }}>
          <span className="lp-section-tag">Step by Step</span>
          <h2 className="lp-section-title">How CampusLink Works</h2>
          <p className="lp-section-sub">From student onboarding to final offer — fully automated and AI-powered</p>
        </div>
        <div className="lp-workflow-grid">
          {WORKFLOW.map((w, i) => (
            <div className="lp-workflow-card lp-reveal-child" key={i} style={{ '--delay': `${80 + i * 80}ms` }}>
              <div className="lp-wf-header">
                <span className="lp-wf-step">{w.step}</span>
                <span className="lp-wf-icon">{w.icon}</span>
              </div>
              <h3 className="lp-wf-title">{w.title}</h3>
              <p className="lp-wf-desc">{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="portals" className="lp-section lp-roles-section lp-reveal-section" ref={portalsRef}>
        <div className="lp-section-header lp-reveal-child" style={{ '--delay': '0ms' }}>
          <span className="lp-section-tag">Role-Based Access</span>
          <h2 className="lp-section-title">Built for Every Stakeholder</h2>
          <p className="lp-section-sub">Each role gets a perfectly scoped portal — no noise, no confusion</p>
        </div>
        <div className="lp-roles-grid">
          {DEMO_ACCOUNTS.map((r, i) => (
            <div className="lp-role-card lp-reveal-child" key={r.role}
              style={{ '--rc': r.color, '--rcbg': r.bg, '--delay': `${80 + i * 100}ms` }}>
              <div className="lp-role-icon" style={{ background: r.bg, color: r.color }}>
                {r.icon}
              </div>
              <div className="lp-role-name">{r.label}</div>
              <div className="lp-role-email">{r.email}</div>
              <button className="lp-role-btn" style={{ background: r.bg, color: r.color, borderColor: r.color + '40' }}
                onClick={() => setShowLogin(true)}>Sign in →</button>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-cta-section lp-reveal-section" ref={ctaRef}>
        <div className="lp-cta-blob lp-cta-blob-1" />
        <div className="lp-cta-blob lp-cta-blob-2" />
        <div className="lp-cta-inner lp-reveal-child" style={{ '--delay': '0ms' }}>
          <span className="lp-section-tag">Get Started Today</span>
          <h2 className="lp-cta-title">Ready to Transform Your Campus Placements?</h2>
          <p className="lp-cta-sub">Join and start placing more students — faster, smarter, fairer.</p>
          <button className="lp-btn-primary lp-cta-btn" onClick={() => setShowLogin(true)}>Launch CampusLink →</button>
        </div>
      </section>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  )
}
