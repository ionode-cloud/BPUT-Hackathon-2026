import {
  MdApartment,
  MdAir,
  MdElectricBolt,
  MdWaterDrop,
  MdDelete,
  MdArrowForward,
  MdCheckCircle,
  MdDashboard,
  MdNotificationsActive,
} from 'react-icons/md';

/* ── Inline Isometric SVGs Matching the Reference Layout ─────────────────── */

function HeroIsometricIllustration() {
  return (
    <svg viewBox="0 0 520 420" fill="none" xmlns="http://www.w3.org/2000/svg" className="hero-iso-svg">
      <defs>
        <linearGradient id="deskGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="screenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f8fafc" />
        </linearGradient>
        <linearGradient id="purpleGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Ambient Floor Shadow / Glow */}
      <ellipse cx="260" cy="330" rx="190" ry="70" fill="url(#purpleGlow)" />

      {/* Isometric Desk */}
      <polygon points="260,190 420,270 260,350 100,270" fill="url(#deskGrad)" />
      <polygon points="100,270 260,350 260,365 100,285" fill="#94a3b8" />
      <polygon points="260,350 420,270 420,285 260,365" fill="#64748b" />

      {/* Desk Legs */}
      <polygon points="110,280 120,285 120,345 110,340" fill="#475569" />
      <polygon points="400,280 410,275 410,335 400,340" fill="#475569" />
      <polygon points="255,360 265,360 265,400 255,400" fill="#334155" />

      {/* Smart Facility Dashboard Monitor on Desk */}
      <polygon points="290,140 380,185 380,245 290,200" fill="#1e293b" />
      <polygon points="293,143 377,185 377,242 293,200" fill="url(#screenGrad)" />
      
      {/* UI lines and graphs on monitor */}
      <path d="M 305 170 Q 330 155 345 175 T 370 185" stroke="#6366f1" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="305" y="180" width="30" height="4" rx="2" fill="#38bdf8" transform="skewY(26)" />
      <rect x="305" y="190" width="45" height="4" rx="2" fill="#10b981" transform="skewY(26)" />
      <rect x="305" y="200" width="22" height="4" rx="2" fill="#f59e0b" transform="skewY(26)" />

      {/* Secondary Floating Telemetry Screen */}
      <polygon points="340,110 430,155 430,215 340,170" fill="#312e81" opacity="0.9" />
      <polygon points="343,113 427,155 427,212 343,170" fill="#4338ca" />
      <path d="M 355 145 L 375 135 L 395 150 L 415 130" stroke="#38bdf8" strokeWidth="3" fill="none" />

      {/* Operator Figure Sitting at Workstation */}
      {/* Chair Backrest */}
      <polygon points="180,220 220,240 220,310 180,290" fill="#e11d48" />
      {/* Head */}
      <circle cx="215" cy="180" r="16" fill="#fcd34d" />
      <circle cx="213" cy="177" r="17" fill="#1e293b" stroke="#1e293b" strokeWidth="2" strokeDasharray="30 20" />
      {/* Torso */}
      <polygon points="200,196 230,212 215,265 185,248" fill="#818cf8" />
      {/* Arms to Keyboard */}
      <path d="M 225 210 Q 255 220 270 235" stroke="#fcd34d" strokeWidth="8" strokeLinecap="round" />
      {/* Legs */}
      <polygon points="190,255 210,265 210,320 190,310" fill="#334155" />

      {/* Plant on Desk Corner */}
      <polygon points="390,260 405,268 405,282 390,274" fill="#065f46" />
      <circle cx="398" cy="255" r="9" fill="#10b981" />
      <circle cx="404" cy="250" r="7" fill="#34d399" />

      {/* Floating IoT Signal Orbs */}
      <circle cx="150" cy="130" r="14" fill="#6366f1" opacity="0.8" />
      <circle cx="150" cy="130" r="6" fill="#ffffff" />
      <circle cx="460" cy="120" r="18" fill="#a855f7" opacity="0.8" />
      <circle cx="460" cy="120" r="7" fill="#ffffff" />
      <circle cx="450" cy="280" r="12" fill="#38bdf8" opacity="0.8" />
      <circle cx="450" cy="280" r="5" fill="#ffffff" />
    </svg>
  );
}

function WorkstationIsometricIllustration() {
  return (
    <svg viewBox="0 0 460 380" fill="none" xmlns="http://www.w3.org/2000/svg" className="feature-iso-svg">
      <defs>
        <linearGradient id="mainDash" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
      </defs>
      {/* Desk Base */}
      <polygon points="230,190 380,265 230,340 80,265" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
      <polygon points="80,265 230,340 230,355 80,280" fill="#cbd5e1" />
      <polygon points="230,340 380,265 380,280 230,355" fill="#94a3b8" />

      {/* Central Big Dashboard Monitor */}
      <polygon points="160,110 320,190 320,290 160,210" fill="#0f172a" />
      <polygon points="165,115 315,190 315,285 165,210" fill="url(#mainDash)" />

      {/* Charts inside screen */}
      <rect x="180" y="145" width="40" height="25" rx="4" fill="#fee2e2" transform="skewY(26)" />
      <rect x="230" y="170" width="70" height="40" rx="4" fill="#e0e7ff" transform="skewY(26)" />
      <path d="M 185 195 Q 210 180 240 205 T 300 230" stroke="#ef4444" strokeWidth="3" fill="none" />
      <path d="M 185 220 Q 220 200 250 225 T 300 245" stroke="#6366f1" strokeWidth="3" fill="none" />

      {/* Keyboard */}
      <polygon points="210,265 260,290 240,300 190,275" fill="#475569" />

      {/* Small Floating Widgets */}
      <polygon points="90,140 140,165 140,215 90,190" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
      <circle cx="115" cy="175" r="12" fill="#10b981" />

      <polygon points="325,120 375,145 375,195 325,170" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
      <rect x="335" y="145" width="25" height="15" fill="#38bdf8" rx="3" transform="skewY(26)" />

      {/* Engineer Figure */}
      <circle cx="340" cy="205" r="14" fill="#fcd34d" />
      <polygon points="330,220 350,225 345,280 325,275" fill="#4338ca" />
      <polygon points="325,280 345,280 340,335 320,335" fill="#1e293b" />
    </svg>
  );
}

function QuestionIsometricIllustration() {
  return (
    <svg viewBox="0 0 460 380" fill="none" xmlns="http://www.w3.org/2000/svg" className="feature-iso-svg">
      {/* Background soft circular glow */}
      <circle cx="230" cy="190" r="140" fill="#f5f3ff" />
      <circle cx="230" cy="190" r="100" fill="#ede9fe" />

      {/* Standing Person in red/pink outfit with open arms asking question */}
      {/* Hair & Head */}
      <circle cx="230" cy="120" r="24" fill="#fcd34d" />
      <path d="M 206 120 C 206 95 254 95 254 120 C 254 140 250 145 240 145 L 220 145 C 210 145 206 140 206 120 Z" fill="#1e293b" />
      {/* Body */}
      <path d="M 205 150 Q 230 145 255 150 L 260 230 L 200 230 Z" fill="#ec4899" />
      {/* Outstretched Arms */}
      <path d="M 205 160 Q 150 160 135 145" stroke="#fcd34d" strokeWidth="12" strokeLinecap="round" fill="none" />
      <path d="M 255 160 Q 310 160 325 145" stroke="#fcd34d" strokeWidth="12" strokeLinecap="round" fill="none" />
      {/* Legs */}
      <rect x="210" y="230" width="16" height="80" rx="6" fill="#1e293b" />
      <rect x="234" y="230" width="16" height="80" rx="6" fill="#1e293b" />

      {/* Floating Checkmark Pill (Left Hand) */}
      <rect x="110" y="125" width="34" height="34" rx="10" fill="#10b981" />
      <path d="M 120 142 L 126 148 L 136 135" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* Floating Cross Pill (Right Hand) */}
      <rect x="315" y="125" width="34" height="34" rx="10" fill="#ef4444" />
      <path d="M 325 135 L 339 149 M 339 135 L 325 149" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" />

      {/* Big Question Marks Above */}
      <text x="180" y="80" fill="#c4b5fd" fontSize="42" fontWeight="bold">?</text>
      <text x="260" y="70" fill="#a78bfa" fontSize="56" fontWeight="bold">?</text>
      <text x="215" y="60" fill="#8b5cf6" fontSize="36" fontWeight="bold">?</text>
    </svg>
  );
}

function DarkStepIsometricIllustration() {
  return (
    <svg viewBox="0 0 460 380" fill="none" xmlns="http://www.w3.org/2000/svg" className="dark-iso-svg">
      <defs>
        <linearGradient id="folderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>

      {/* Deep purple radial aura */}
      <circle cx="230" cy="200" r="130" fill="#4338ca" opacity="0.3" filter="blur(30px)" />

      {/* Isometric Database / Server Container */}
      <polygon points="230,170 340,230 230,290 120,230" fill="url(#folderGrad)" />
      <polygon points="120,230 230,290 230,310 120,250" fill="#be185d" />
      <polygon points="230,290 340,230 340,250 230,310" fill="#6d28d9" />

      {/* Glowing Central Server Rack Node */}
      <polygon points="230,120 310,165 230,210 150,165" fill="#38bdf8" />
      <polygon points="150,165 230,210 230,225 150,180" fill="#0284c7" />
      <polygon points="230,210 310,165 310,180 230,225" fill="#0369a1" />

      {/* Engineer Inspecting Pipeline */}
      <circle cx="160" cy="180" r="14" fill="#fcd34d" />
      <polygon points="150,195 170,195 175,250 155,250" fill="#10b981" />
      <rect x="155" y="250" width="8" height="40" fill="#0f172a" />
      <rect x="167" y="250" width="8" height="40" fill="#0f172a" />

      {/* Floating Sensor Data Nodes */}
      <circle cx="80" cy="140" r="16" fill="#3b82f6" opacity="0.8" />
      <circle cx="80" cy="140" r="6" fill="#ffffff" />
      <circle cx="360" cy="120" r="18" fill="#ec4899" opacity="0.8" />
      <circle cx="360" cy="120" r="7" fill="#ffffff" />
      <circle cx="380" cy="270" r="14" fill="#10b981" opacity="0.8" />
      <circle cx="380" cy="270" r="5" fill="#ffffff" />

      {/* Flow arrows */}
      <path d="M 100 155 Q 160 170 200 150" stroke="#38bdf8" strokeWidth="3" strokeDasharray="6 4" fill="none" />
      <path d="M 330 135 Q 280 150 250 140" stroke="#f472b6" strokeWidth="3" strokeDasharray="6 4" fill="none" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Landing Page Component
   ═══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage({
  onOpenLogin,
  onGoToDashboard,
  isAdmin,
  data = {},
}) {
  const d = data || {};

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-layout">
      {/* ═══════════════════════════════════════════════════════════════════
          Top Hero Banner Wrapper (Purple-to-Violet Rounded Container)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="hero-banner-outer">
        <div className="hero-banner-card">
          <div className="container-fluid">
            {/* Top Navigation */}
            <header className="hero-nav-bar">
              <div className="hero-nav-left" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <span className="brand-dot-pulse" />
                <span className="hero-brand-name">Facility AI</span>
                <span className="hero-badge-tag">PS04</span>
              </div>

              <nav className="hero-nav-mid">
                <button type="button" onClick={() => scrollTo('features-section')}>Telemetry</button>
                <button type="button" onClick={() => scrollTo('why-section')}>Why Facility AI</button>
                <button type="button" onClick={() => scrollTo('how-it-works-section')}>How It Works</button>
                <button type="button" onClick={() => scrollTo('pillars-section')}>Core Systems</button>
              </nav>

              <div className="hero-nav-right">
                {isAdmin ? (
                  <button
                    type="button"
                    className="hero-nav-cta-btn"
                    onClick={onGoToDashboard}
                  >
                    <MdDashboard size={16} />
                    <span>Dashboard</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="hero-nav-cta-btn"
                    onClick={onOpenLogin}
                  >
                    <span>Sign In</span>
                  </button>
                )}
              </div>
            </header>

            {/* Hero Main Content (2 Columns) */}
            <div className="hero-body-columns">
              <div className="hero-text-col">
                <h1 className="hero-headline-title">
                  Autonomous Campus & Facility Intelligence
                </h1>

                <p className="hero-headline-sub">
                  Is your campus telemetry fragmented? Unify IoT air quality, energy grid balancing,
                  automated solenoid valve controls, and ultrasonic waste logistics in one console.
                </p>

                <div className="hero-actions-row">
                  {isAdmin ? (
                    <button
                      type="button"
                      className="hero-primary-pill-btn"
                      onClick={onGoToDashboard}
                    >
                      <span>Open Admin Console</span>
                      <MdArrowForward size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="hero-primary-pill-btn"
                      onClick={onOpenLogin}
                    >
                      <span>Sign In to Console</span>
                      <MdArrowForward size={16} />
                    </button>
                  )}
                </div>

                <div className="hero-guarantee-line">
                  <span className="check-bullet">✓</span>
                  <span>Live REST Telemetry • 100% Real API Stream • Zero Synthetic Data</span>
                </div>
              </div>

              <div className="hero-graphic-col">
                <HeroIsometricIllustration />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          Section 1: Alternating Row (Workstation & Unified Sensor Telemetry)
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="features-section" className="alt-feature-section light-bg">
        <div className="container-fluid">
          <div className="alt-feature-row">
            <div className="alt-feature-col visual-col">
              <WorkstationIsometricIllustration />
            </div>

            <div className="alt-feature-col text-col">
              <span className="section-sub-pill">EDGE-TO-CLOUD TELEMETRY</span>
              <h2 className="section-main-heading">
                Use Facility AI to Monitor & Control Campus Vitals
              </h2>

              <p className="section-body-text">
                Facility AI connects directly with ESP32 microcontrollers deployed across laboratories,
                hostels, and utility substations. It captures atmospheric chemistry, live power draw,
                reservoir depth, and waste fill with sub-second responsiveness.
              </p>

              <div className="feature-mini-stats-grid">
                <div className="mini-stat-card">
                  <span className="mini-stat-label">Air Purity (AQI)</span>
                  <span className="mini-stat-value">{d.aqi ?? 54} AQI</span>
                </div>
                <div className="mini-stat-card">
                  <span className="mini-stat-label">Power Draw</span>
                  <span className="mini-stat-value">{d.livePower ?? 18.4} kW</span>
                </div>
                <div className="mini-stat-card">
                  <span className="mini-stat-label">Water Reserve</span>
                  <span className="mini-stat-value">{d.tankLevel ?? 78}% Level</span>
                </div>
                <div className="mini-stat-card">
                  <span className="mini-stat-label">Waste Bins</span>
                  <span className="mini-stat-value">{d.averageFill ?? 42}% Avg</span>
                </div>
              </div>

              <div className="section-cta-wrap">
                <button
                  type="button"
                  className="purple-action-btn"
                  onClick={isAdmin ? onGoToDashboard : onOpenLogin}
                >
                  <span>Access Live Data Console</span>
                  <MdArrowForward size={16} />
                </button>
              </div>
              <div className="feature-trust-note">
                • 30-day historical time-series analytics included
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          Section 2: Alternating Row (Why Autonomous Facility Intelligence?)
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="why-section" className="alt-feature-section light-bg">
        <div className="container-fluid">
          <div className="alt-feature-row reverse-on-desktop">
            <div className="alt-feature-col visual-col">
              <QuestionIsometricIllustration />
            </div>

            <div className="alt-feature-col text-col">
              <span className="section-sub-pill">PROBLEM & SOLUTION MATRIX</span>
              <h2 className="section-main-heading">
                Why Would You Need Autonomous Facility AI?
              </h2>

              <p className="section-body-text">
                Traditional campus facilities rely on manual meter checks, leading to undetected pipe
                ruptures, soaring electricity tariffs from phantom loads, and toxic gas buildup in
                science departments.
              </p>

              <p className="section-body-text">
                Facility AI replaces reactive maintenance with cyber-physical automation: detecting
                abnormal hydraulic flow instantly and shutting off solenoid valves before flood damage
                occurs.
              </p>

              <ul className="styled-benefit-list">
                <li>
                  <MdCheckCircle color="#6366f1" size={20} />
                  <span>Eliminate water waste through acoustic and ultrasonic leak detection.</span>
                </li>
                <li>
                  <MdCheckCircle color="#6366f1" size={20} />
                  <span>Optimize HVAC operations by monitoring indoor CO₂ and PM2.5 levels.</span>
                </li>
                <li>
                  <MdCheckCircle color="#6366f1" size={20} />
                  <span>Prevent campus bin overflow with ultrasound volumetric fill alerts.</span>
                </li>
              </ul>

              <div className="section-cta-wrap">
                <button
                  type="button"
                  className="purple-action-btn"
                  onClick={isAdmin ? onGoToDashboard : onOpenLogin}
                >
                  <span>Explore Autonomous Directives</span>
                  <MdArrowForward size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          Section 3: Dark Contrast Banner (How Do I Get Started?)
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works-section" className="dark-contrast-section">
        <div className="container-fluid">
          <div className="dark-section-header">
            <h2>How does the IoT Edge-to-Cloud Pipeline work?</h2>
            <p>
              With our unified API, microcontrollers and sensors sync seamlessly in three effortless steps.
            </p>
          </div>

          <div className="dark-columns-row">
            <div className="dark-visual-col">
              <DarkStepIsometricIllustration />
            </div>

            <div className="dark-steps-col">
              <div className="step-card-item">
                <div className="step-number-badge">1</div>
                <div className="step-content">
                  <h4>Sensor Telemetry Ingestion</h4>
                  <p>
                    Transducers (MQ-2, MQ-137, PM2.5, Flow meters) send JSON packets to
                    <code>/api/data</code> via Wi-Fi or cellular gateways.
                  </p>
                </div>
              </div>

              <div className="step-card-item">
                <div className="step-number-badge">2</div>
                <div className="step-content">
                  <h4>Snapshot Consolidation & Storage</h4>
                  <p>
                    The Express 5 ingestion engine merges partial frames and persists historical
                    records in MongoDB Atlas.
                  </p>
                </div>
              </div>

              <div className="step-card-item">
                <div className="step-number-badge">3</div>
                <div className="step-content">
                  <h4>Real-time Actuation & Decision Support</h4>
                  <p>
                    Operators view real-time Chart.js trends and remotely toggle
                    <code>Valve 1</code> & <code>Valve 2</code> actuators with instant hardware acknowledgment.
                  </p>
                </div>
              </div>

              <div className="dark-step-cta">
                <button
                  type="button"
                  className="purple-action-btn light-purple-btn"
                  onClick={isAdmin ? onGoToDashboard : () => onOpenLogin('login')}
                >
                  <span>Test Admin Actuation</span>
                  <MdArrowForward size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          Section 4: Four Core Systems Grid (What are the best modules?)
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="pillars-section" className="grid-cards-section light-bg">
        <div className="container-fluid">
          <div className="grid-section-header">
            <h2>What are the core systems of Facility AI?</h2>
            <p>Five integrated operational domains from the live Facility AI console powering campus intelligence.</p>
          </div>

          <div className="five-cards-grid">
            {/* 1. Facility Overview */}
            <div className="core-system-card card-overview">
              <div className="core-card-top">
                <div className="core-card-icon overview-bg">
                  <MdApartment size={22} />
                </div>
                <span className="core-card-live-pill">
                  <span className="pulse-dot-small" /> Live Feed
                </span>
              </div>
              <h3>Facility Overview</h3>
              <div className="core-card-kpi-highlight">
                Score: {d.sustainabilityScore ?? 84}/100 ★
              </div>
              <p>
                Unified sustainability scorecards, real-time energy & water trend curves, live alert
                triage, and algorithmic operational guidance.
              </p>
              <div className="core-card-footer">
                <div className="core-card-metric-tag">
                  {d.sustainabilityScore != null && d.sustainabilityScore >= 80 ? '★ Excellent Rating' : '✓ Good Standing'} • Multi-Zone Feed
                </div>
                <button
                  type="button"
                  className="core-card-action-btn"
                  onClick={() => onGoToDashboard('overview')}
                >
                  <span>Launch Overview</span>
                  <MdArrowForward size={14} />
                </button>
              </div>
            </div>

            {/* 2. Air Quality Monitoring */}
            <div className="core-system-card card-air">
              <div className="core-card-top">
                <div className="core-card-icon air-bg">
                  <MdAir size={22} />
                </div>
                <span className="core-card-live-pill">
                  <span className="pulse-dot-small" /> Live AQI
                </span>
              </div>
              <h3>Air Quality Monitoring</h3>
              <div className="core-card-kpi-highlight">
                {d.aqi ?? 42} AQI • {d.aqi != null && d.aqi <= 50 ? 'Good' : 'Moderate'}
              </div>
              <p>
                Continuous atmospheric monitoring of AQI, PM2.5, PM10, CO₂, smoke vapors, toxic NH3 gas,
                and ambient weather parameters.
              </p>
              <div className="core-card-footer">
                <div className="core-card-metric-tag">
                  PM2.5: {d.pm25 ?? 18} µg/m³ • NH3: {d.nh3 ?? 8} ppm
                </div>
                <button
                  type="button"
                  className="core-card-action-btn"
                  onClick={() => onGoToDashboard('air')}
                >
                  <span>Inspect Air Quality</span>
                  <MdArrowForward size={14} />
                </button>
              </div>
            </div>

            {/* 3. Energy Optimization */}
            <div className="core-system-card card-energy">
              <div className="core-card-top">
                <div className="core-card-icon energy-bg">
                  <MdElectricBolt size={22} />
                </div>
                <span className="core-card-live-pill">
                  <span className="pulse-dot-small" /> Grid Active
                </span>
              </div>
              <h3>Energy Optimization</h3>
              <div className="core-card-kpi-highlight">
                {d.livePower ?? 18.4} kW Live Draw
              </div>
              <p>
                Precision electrical wattage profiling, cumulative kilowatt-hours, peak demand spikes,
                and dynamic tariff cost estimation.
              </p>
              <div className="core-card-footer">
                <div className="core-card-metric-tag">
                  Today: {d.todaysEnergy ?? 142} kWh • ₹{d.estimatedCost != null ? d.estimatedCost.toLocaleString('en-IN') : '1,136'} Tariff
                </div>
                <button
                  type="button"
                  className="core-card-action-btn"
                  onClick={() => onGoToDashboard('energy')}
                >
                  <span>Analyze Energy Grid</span>
                  <MdArrowForward size={14} />
                </button>
              </div>
            </div>

            {/* 4. Water Management */}
            <div className="core-system-card card-water">
              <div className="core-card-top">
                <div className="core-card-icon water-bg">
                  <MdWaterDrop size={22} />
                </div>
                <span className="core-card-live-pill">
                  <span className="pulse-dot-small" /> Hydraulic Stream
                </span>
              </div>
              <h3>Water Management</h3>
              <div className="core-card-kpi-highlight">
                {d.tankLevel ?? 78}% Tank Storage
              </div>
              <p>
                Ultrasonic tank gauge, acoustic pipe leak detection, and 2-way remote solenoid actuation
                for instantaneous pipe isolation.
              </p>
              <div className="core-card-footer">
                <div className="core-card-metric-tag">
                  {d.valve1 ? 'Valve 1: OPEN' : 'Valve 1: CLOSED'} • {d.leakStatus || 'Normal Flow'}
                </div>
                <button
                  type="button"
                  className="core-card-action-btn"
                  onClick={() => onGoToDashboard('water')}
                >
                  <span>Control Valves</span>
                  <MdArrowForward size={14} />
                </button>
              </div>
            </div>

            {/* 5. Waste Management */}
            <div className="core-system-card card-waste">
              <div className="core-card-top">
                <div className="core-card-icon waste-bg">
                  <MdDelete size={22} />
                </div>
                <span className="core-card-live-pill">
                  <span className="pulse-dot-small" /> Sonar Active
                </span>
              </div>
              <h3>Waste Management</h3>
              <div className="core-card-kpi-highlight">
                {d.totalBins ?? 12} Monitored Bins
              </div>
              <p>
                Sonar fill level sensors streaming bin status across campus blocks, paired with
                predictive overflow dispatch alerts.
              </p>
              <div className="core-card-footer">
                <div className="core-card-metric-tag">
                  Avg: {d.averageFill ?? 54}% Fill • {d.overflowRisk ? `${d.overflowRisk} at Risk` : '0 Overflows'}
                </div>
                <button
                  type="button"
                  className="core-card-action-btn"
                  onClick={() => onGoToDashboard('waste')}
                >
                  <span>Track Waste Logistics</span>
                  <MdArrowForward size={14} />
                </button>
              </div>
            </div>

            {/* 6. Alert History */}
            <div className="core-system-card card-alerts">
              <div className="core-card-top">
                <div className="core-card-icon alerts-bg">
                  <MdNotificationsActive size={22} />
                </div>
                <span className="core-card-live-pill" style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}>
                  <span className="pulse-dot-small" style={{ background: '#ef4444' }} /> Active Sentinel
                </span>
              </div>
              <h3>High Alert Incident History</h3>
              <div className="core-card-kpi-highlight" style={{ color: '#dc2626' }}>
                Multi-Tab High Alert Aggregation
              </div>
              <p>
                Continuous cross-cutting anomaly surveillance: pipe leaks, AQI chemical spikes,
                substation overload, and bin overflow with 1-click Solved & Clear mitigation actions.
              </p>
              <div className="core-card-footer">
                <div className="core-card-metric-tag">
                  Automated Directives • Audit Trail
                </div>
                <button
                  type="button"
                  className="core-card-action-btn"
                  onClick={() => onGoToDashboard('alerts')}
                >
                  <span>Open Alert Console</span>
                  <MdArrowForward size={14} />
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          Footer
          ═══════════════════════════════════════════════════════════════════ */}
      <footer className="landing-v2-footer">
        <div className="container-fluid footer-inner-row">
          <div className="footer-left-info">
            <div className="footer-brand-title">Facility AI</div>
            <p>BPUT Hackathon 2026 — Problem Statement 04 (PS04)</p>
          </div>
          <div className="footer-right-copy">
            <span>© 2026 Sustainable Facility AI Team. Built for Campus Excellence.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
