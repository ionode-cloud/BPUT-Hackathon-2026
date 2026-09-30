import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import './styles.css'
import { AuthProvider, useAuth } from './auth'
import { Loading } from './components/ui'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import StudentDetail from './pages/StudentDetail'
import NewStudent from './pages/NewStudent'
import Drives from './pages/Drives'
import DriveDetail from './pages/DriveDetail'
import Scheduler from './pages/Scheduler'
import Offers from './pages/Offers'
import Notifications from './pages/Notifications'
import Analytics from './pages/Analytics'
import Assistant from './pages/Assistant'
import Evaluation from './pages/Evaluation'
import Models from './pages/Models'
import Login from './pages/Login'
import Landing from './pages/Landing'
import Admin from './pages/Admin'
import { Account, MentorHome, RecruiterHome } from './pages/Portals'

const STAFF_NAV = [
  ['Overview', [['/', '◎', 'Command Dashboard'], ['/analytics', '▲', 'Analytics & Insights']]],
  ['Lifecycle', [['/students', '☺', 'Student Readiness'], ['/drives', '◆', 'Recruiters & Matching'],
    ['/schedule', '▦', 'Drive Scheduler'], ['/offers', '✓', 'Offers & Documents'], ['/notifications', '✉', 'Notifications']]],
  ['AI (PyTorch)', [['/models', '⬡', 'AI Models'], ['/assistant', '✦', 'AI Assistant'], ['/evaluation', '≡', 'Model Evaluation']]],
]
const NAV = {
  admin: [...STAFF_NAV, ['Administration', [['/admin', '⚙', 'Users, Audit & System']]]],
  officer: STAFF_NAV,
  student: [['My placement', [['/', '◎', 'My Dashboard'], ['/notifications', '✉', 'Notifications'], ['/assistant', '✦', 'AI Assistant']]]],
  recruiter: [['Recruiter', [['/', '◆', 'My Drives & Offers'], ['/drives', '+', 'Post a JD'], ['/notifications', '✉', 'Notifications']]]],
  mentor: [['Mentor', [['/', '☺', 'My Mentees'], ['/notifications', '✉', 'Notifications'], ['/assistant', '✦', 'AI Assistant']]]],
}

function StaffRoutes({ admin }) {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/students" element={<Students />} />
      <Route path="/students/new" element={<NewStudent />} />
      <Route path="/students/:id" element={<StudentDetail />} />
      <Route path="/drives" element={<Drives />} />
      <Route path="/drives/:id" element={<DriveDetail />} />
      <Route path="/schedule" element={<Scheduler />} />
      <Route path="/offers" element={<Offers />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/assistant" element={<Assistant />} />
      <Route path="/evaluation" element={<Evaluation />} />
      <Route path="/models" element={<Models />} />
      <Route path="/account" element={<Account />} />
      {admin && <Route path="/admin" element={<Admin />} />}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function RoleRoutes({ user }) {
  if (user.role === 'admin' || user.role === 'officer') return <StaffRoutes admin={user.role === 'admin'} />
  const common = [<Route key="n" path="/notifications" element={<Notifications />} />, <Route key="a" path="/account" element={<Account />} />,
    <Route key="x" path="*" element={<Navigate to="/" replace />} />]
  if (user.role === 'student') return <Routes><Route path="/" element={<StudentDetail key={user.student_id || user.id} studentId={user.student_id} />} /><Route path="/assistant" element={<Assistant />} />{common}</Routes>
  if (user.role === 'recruiter') return <Routes><Route path="/" element={<RecruiterHome />} /><Route path="/drives" element={<Drives />} /><Route path="/drives/:id" element={<DriveDetail />} /><Route path="/students/:id" element={<StudentDetail />} />{common}</Routes>
  if (user.role === 'mentor') return <Routes><Route path="/" element={<MentorHome />} /><Route path="/students/:id" element={<StudentDetail />} /><Route path="/assistant" element={<Assistant />} />{common}</Routes>
  return <Routes>{common}</Routes>
}

function Shell() {
  const { user, ready, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  if (!ready) return <Loading />
  if (!user) return <Landing />

  const closeMenu = () => setMobileMenuOpen(false)

  return (
    <div className={`layout ${mobileMenuOpen ? 'mobile-nav-open' : ''}`}>
      {/* Mobile Top Navbar */}
      <header className="mobile-header">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(o => !o)}
          aria-label="Toggle navigation menu"
        >
          <span className="mobile-menu-icon">{mobileMenuOpen ? '✕' : '☰'}</span>
        </button>
        <div className="mobile-brand">
          <div className="brand-mark">CL</div>
          <span>CampusLink</span>
        </div>
        <div className="mobile-user-pill" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {user.avatar && (
            <img src={user.avatar} alt={user.name} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
          )}
          <span className={`badge role-${user.role}`}>{user.role}</span>
        </div>
      </header>

      {/* Backdrop for mobile drawer */}
      {mobileMenuOpen && (
        <div className="sidebar-backdrop" onClick={closeMenu} />
      )}

      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">CL</div>
          <div>CampusLink<small>Placement Intelligence</small></div>
          <button className="sidebar-close-btn" onClick={closeMenu}>✕</button>
        </div>
        <nav className="nav">
          {(NAV[user.role] || []).map(([sec, items]) => (
            <div key={sec}>
              <div className="nav-section">{sec}</div>
              {items.map(([to, ico, label]) => (
                <NavLink key={to} to={to} end={to === '/'} onClick={closeMenu}>
                  <span className="ico">{ico}</span>{label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="user-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.3)', flexShrink: 0 }}
              />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="small" style={{ color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div className="small" style={{ color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
            </div>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <span className={`badge role-${user.role}`}>{user.role}</span>
            <NavLink to="/account" className="small" onClick={closeMenu}>Account</NavLink>
            <button className="linkbtn small" onClick={logout}>Sign out</button>
          </div>
        </div>
      </aside>
      <main className="main">
        {user.must_change_password && (
          <div className="banner">
            You are signed in with a temporary password. <NavLink to="/account">Set your own password →</NavLink>
          </div>
        )}
        <RoleRoutes user={user} />
      </main>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Shell />
    </BrowserRouter>
  </AuthProvider>,
)
