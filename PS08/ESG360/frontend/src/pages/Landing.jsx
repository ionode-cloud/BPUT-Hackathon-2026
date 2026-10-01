import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Leaf, Users, Shield, ArrowRight, BarChart2, Building2, CheckCircle2,
  LogIn, ChevronLeft, ChevronRight, Play, Pause, Sparkles, FileText,
  CheckCheck, RefreshCw, Layers, HelpCircle, Compass, TrendingUp,
  Award, ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/landing.css';

/* ─── MARQUEE COMPLIANCE FRAMEWORKS ─── */
const COMPLIANCE_ITEMS = [
  'SEBI BRSR Core (2023-24 Framework)',
  'GRI Universal Standards 2021',
  'GHG Protocol (Scope 1, 2 & 3 Emissions)',
  'TCFD Climate Disclosures',
  'Companies Act 2013 (Section 135 CSR)',
  'ISO 14001:2015 Environmental System',
  'ISO 45001:2018 Occupational Safety',
  'UN Sustainable Development Goals (SDGs)',
  'Business Responsibility & Sustainability Reporting Core',
];

/* ─── AUTO-SCROLL CAROUSEL SLIDES ─── */
const CAROUSEL_SLIDES = [
  {
    id: 'environmental',
    tag: 'Environmental Pillar',
    tagBg: '#D1FAE5',
    tagColor: '#065F46',
    title: 'Scope 1, 2 & 3 Decarbonization & Emissions Tracking',
    desc: 'Real-time carbon accounting compliant with the GHG Protocol. Track direct fuel emissions, purchased electricity, and value chain impact with automated tCO₂e conversion and water recycling intensity.',
    kpis: [
      { label: 'Total GHG Tracked', value: '42,850 tCO₂e' },
      { label: 'Renewable Energy', value: '68.4%' },
      { label: 'Water Recycled', value: '89.2%' },
    ],
    mockup: {
      title: 'Emissions Distribution (FY 2025-26)',
      items: [
        { label: 'Scope 1 (Direct Fuel / DG Sets)', val: '14,200 tCO₂e', pct: 33, color: '#10B981' },
        { label: 'Scope 2 (Purchased Grid Power)', val: '20,500 tCO₂e', pct: 48, color: '#059669' },
        { label: 'Scope 3 (Supply Chain / Freight)', val: '8,150 tCO₂e', pct: 19, color: '#047857' },
      ],
      badge: 'ISO 14064 Verified • Continuous CEMS Linked',
      metricNote: '64% towards 2030 Net-Zero Target',
    }
  },
  {
    id: 'social',
    tag: 'Social Pillar',
    tagBg: '#DBEAFE',
    tagColor: '#1E40AF',
    title: 'Workplace Diversity, OHS Zero-Harm & Human Rights',
    desc: 'Comprehensive oversight of employee diversity, median wage ratios, safety incident tracking (LTIFR), employee upskilling hours, POSH compliance, and audited CSR community development projects.',
    kpis: [
      { label: 'Female Representation', value: '34.8%' },
      { label: 'LTIFR Safety Index', value: '0.00' },
      { label: 'Avg Training / FTE', value: '48.5 hrs' },
    ],
    mockup: {
      title: 'Workforce & Safety Scorecard',
      items: [
        { label: 'Permanent & Contract Employees', val: '4,850 Personnel', pct: 85, color: '#3B82F6' },
        { label: 'Zero-Harm Safe Working Hours', val: '1.24 Million Hrs', pct: 100, color: '#2563EB' },
        { label: 'CSR Community Investment', val: '₹4.2 Cr Allocated', pct: 92, color: '#1D4ED8' },
      ],
      badge: 'Zero Fatalities Reported across 12 Facilities',
      metricNote: '100% Grievance Redressal within 14 Days',
    }
  },
  {
    id: 'governance',
    tag: 'Governance Pillar',
    tagBg: '#EDE9FE',
    tagColor: '#5B21B6',
    title: 'Board Independence, Ethics & Whistleblower Oversight',
    desc: 'Strengthen enterprise trust with transparent board committee matrices, anti-bribery code attestations, data privacy audits, and immutable compliance audit trails.',
    kpis: [
      { label: 'Whistleblower Resolution', value: '100%' },
      { label: 'Independent Directors', value: '54.5%' },
      { label: 'Corruption Complaints', value: '0' },
    ],
    mockup: {
      title: 'Corporate Governance Health Index',
      items: [
        { label: 'Board Independence Ratio', val: '6 of 11 Directors', pct: 55, color: '#8B5CF6' },
        { label: 'Anti-Corruption Policy Sign-off', val: '99.8% Employees', pct: 99, color: '#7C3AED' },
        { label: 'Quarterly Risk Audit Filings', val: '4 of 4 Completed', pct: 100, color: '#6D28D9' },
      ],
      badge: 'ESG Risk Committee Active • Clean Audit Opinion',
      metricNote: 'Full Regulatory Compliance Track Record',
    }
  },
  {
    id: 'brsr',
    tag: 'SEBI Regulatory Engine',
    tagBg: '#FEF3C7',
    tagColor: '#92400E',
    title: 'Automated SEBI BRSR Principles 1-9 Reporting Engine',
    desc: 'Instant mapping of operational ESG records into SEBI BRSR Core format. Calculates completeness metrics, performs gap analysis, and exports audit-ready PDF and Excel filing packets.',
    kpis: [
      { label: 'SEBI Principles Covered', value: 'Principles 1-9' },
      { label: 'Section Completeness', value: '99.4%' },
      { label: 'Audit Readiness', value: 'Assurance Ready' },
    ],
    mockup: {
      title: 'SEBI BRSR Filing Completeness',
      items: [
        { label: 'Section A: General Disclosures', val: '100% Complete', pct: 100, color: '#F59E0B' },
        { label: 'Section B: Management & Process', val: '100% Complete', pct: 100, color: '#D97706' },
        { label: 'Section C: Principle-wise KPIs', val: '98.8% Complete', pct: 98, color: '#B45309' },
      ],
      badge: 'SEBI Circular May 2023 Compliant',
      metricNote: 'One-Click Downloadable PDF & Excel Filing',
    }
  },
  {
    id: 'evidence',
    tag: 'Evidence & Integrity',
    tagBg: '#FCE7F3',
    tagColor: '#9D174D',
    title: 'Tamper-Proof Document Evidence & Multi-Tier Approval',
    desc: 'Every metric is accompanied by verifying documents (CEMS lab certificates, electricity invoices, ISO auditor sign-offs). Four-tier hierarchical approval workflows eliminate fabricated disclosures.',
    kpis: [
      { label: 'Evidence Attachment', value: '100%' },
      { label: 'Approval Workflow', value: '4-Stage Signoff' },
      { label: 'Audit Trail', value: 'SHA-256 Hashed' },
    ],
    mockup: {
      title: 'Evidence Verification Lifecycle',
      items: [
        { label: 'Stage 1: Site Data Contributor', val: 'Submitted with Bills', pct: 100, color: '#EC4899' },
        { label: 'Stage 2: BU Manager Review', val: 'Validated & Checked', pct: 100, color: '#DB2777' },
        { label: 'Stage 3: Group ESG Director', val: 'Approved & Signed', pct: 100, color: '#BE185D' },
      ],
      badge: 'Immutable Audit Log Timestamp Active',
      metricNote: '12 Connected Group Organizations Audited',
    }
  },
];

/* ─── ROLE-BASED INSTRUCTIONS & DEMO LOGINS ─── */
const ROLE_INSTRUCTIONS = [
  {
    role: 'Super Admin / Group ESG Admin',
    email: 'admin@esg360.com',
    password: 'Admin@123456',
    badge: 'Executive Oversight',
    scope: 'Group-wide authority over all 12 organizations, subsidiaries, and facilities.',
    responsibilities: [
      'Manage corporate organizational hierarchy and subsidiaries',
      'Oversee group-wide ESG consolidation across all 4 tiers',
      'Approve final submissions and review system-wide audit logs',
      'Export consolidated SEBI BRSR reports for public regulatory filing',
    ],
    hint: 'Full system access: organizations, data collection, BRSR reports, audit logs, and document repository.'
  },
  {
    role: 'Subsidiary Admin (Clean Energy Ltd.)',
    email: 'energy.sub@esg360.com',
    password: 'Admin@123456',
    badge: 'Subsidiary Tier',
    scope: 'Autonomous management of Solar Parks BU and Wind & Hybrid BU.',
    responsibilities: [
      'Monitor clean energy generation metrics and subsidiary emission factors',
      'Review and aggregate business unit submissions before group rollup',
      'Validate subsidiary-specific compliance documentation',
      'Coordinate with BU managers on target progress and gap analysis',
    ],
    hint: 'Has full access to Clean Energy subsidiary entities, approval workflows, and reports.'
  },
  {
    role: 'Business Unit Manager (Solar Parks BU)',
    email: 'solar.bu@esg360.com',
    password: 'Admin@123456',
    badge: 'Business Unit Tier',
    scope: 'Supervises operational solar parks including the Bhadla 500MW site.',
    responsibilities: [
      'Review monthly solar generation, panel cleaning water usage, and inverter uptime',
      'Inspect site-level submissions and attached utility bills',
      'Trigger "Correction Required" with feedback if discrepancies are detected',
      'Approve validated site metrics for subsidiary consolidation',
    ],
    hint: 'Reviews project-level operational data and manages approval verification.'
  },
  {
    role: 'Project Facility User (Bhadla Solar Site)',
    email: 'bhadla.user@esg360.com',
    password: 'Admin@123456',
    badge: 'Operating Facility Tier',
    scope: 'Hands-on data contributor at Bhadla 500MW Ultra Solar Park.',
    responsibilities: [
      'Enter monthly operational metrics: water consumption, auxiliary power, local labor',
      'Upload mandatory supporting documents (invoices, CEMS calibration logs)',
      'Respond to manager feedback if corrections are requested',
      'Maintain site compliance records and incident registers',
    ],
    hint: 'Responsible for raw data entry and evidence document uploads.'
  },
  {
    role: 'ESG Manager & Compliance Officer',
    email: 'esg.manager@esg360.com',
    password: 'Admin@123456',
    badge: 'Independent Assurance',
    scope: 'Group-level compliance officer and sustainability assurance lead.',
    responsibilities: [
      'Conduct rigorous SEBI BRSR gap analysis across Principles 1-9',
      'Verify cryptographic checksums of attached evidence documents',
      'Monitor whistleblower cases and code-of-conduct attestations',
      'Prepare reasonable assurance audit packs for external reviewers',
    ],
    hint: 'Has analytical, validation, and compliance oversight permissions.'
  },
];

/* ─── STEP INSTRUCTIONS ─── */
const WORKFLOW_STEPS = [
  {
    num: '01',
    title: 'Configure 4-Tier Corporate Hierarchy',
    desc: 'Group ESG Admins set up the enterprise tree (Group → Subsidiaries → Business Units → Operating Projects). Boundary rules and role permissions are automatically mapped.',
    badge: 'Hierarchy & Boundaries',
    icon: Building2,
  },
  {
    num: '02',
    title: 'Input Metrics with Mandatory Evidence',
    desc: 'Facility users and department engineers log monthly environmental, social, and governance figures. Uploading verifying documents (utility bills, lab tests) is strictly enforced.',
    badge: 'Data Collection & Bills',
    icon: FileText,
  },
  {
    num: '03',
    title: 'Multi-Stage Review & Correction Loop',
    desc: 'BU Managers and Compliance Officers audit figures against historical baselines. Reviewers can validate data or send it back with "Correction Required" and audit notes.',
    badge: 'Validation & Traceability',
    icon: CheckCheck,
  },
  {
    num: '04',
    title: 'Automated Group Rollup & BRSR PDF Filing',
    desc: 'Approved site metrics automatically aggregate upward without double-counting. Generate complete SEBI BRSR Section A, B & C reports ready for exchange filing.',
    badge: 'SEBI Compliance Filing',
    icon: BarChart2,
  },
];

/* ─── INSTRUCTION ACCORDION ITEMS ─── */
const GUIDELINE_FAQS = [
  {
    q: 'How does ESG360 prevent double counting across multi-tier entities?',
    a: 'ESG360 implements strict boundary accounting based on the GHG Protocol Corporate Standard. Data collected at the project level rolls up hierarchically through its designated business unit and subsidiary. Inter-company energy transfers or transactions are tagged and excluded from group-wide aggregations.',
  },
  {
    q: 'What is the SEBI BRSR Core framework and how is it addressed?',
    a: 'SEBI mandated BRSR Core reporting for top listed entities with specific reasonable assurance requirements. ESG360 maps raw metrics directly to SEBI Core KPIs across Greenhouse Gas emissions, water footprint, waste management, employee well-being, gender diversity, and customer relations.',
  },
  {
    q: 'What happens when a reviewer marks an entry as "Correction Required"?',
    a: 'The record enters a flagged state and notifies the original submitter with specific reviewer remarks. The submitter can adjust figures, upload additional explanatory documentation, and re-submit. All edit revisions and reviewer comments are permanently recorded in the immutable audit log.',
  },
  {
    q: 'Which file formats and verification standards are supported for audit evidence?',
    a: 'Users can upload PDF documents, spreadsheets (XLSX, CSV), and scanned image certificates up to 10MB. The system stores cryptographic SHA-256 hashes of each file to ensure evidence cannot be altered after approval.',
  },
];

const Landing = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Role instructions state
  const [selectedRole, setSelectedRole] = useState(0);
  const [loginLoading, setLoginLoading] = useState(false);

  // Accordion state
  const [openFaq, setOpenFaq] = useState(0);

  // Auto-scroll Carousel Effect (every 4.5 seconds)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused]);

  // One-click quick login handler for demo credentials
  const handleQuickLogin = async (email, password) => {
    setLoginLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Quick login error:', err);
      navigate('/login');
    } finally {
      setLoginLoading(false);
    }
  };

  const activeSlideData = CAROUSEL_SLIDES[currentSlide];
  const activeRoleData = ROLE_INSTRUCTIONS[selectedRole];

  return (
    <div className="w-100" style={{ fontFamily: 'var(--font)', background: 'var(--bg)', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* ─── NAVBAR (CONTAINER FLUID) ─── */}
      <nav className="container-fluid px-3 px-md-5" style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        height: 68,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: 42,
            height: 42,
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 800,
            fontSize: '1.2rem',
            boxShadow: '0 4px 12px rgba(23, 107, 69, 0.25)',
          }}>
            E
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              ESG360
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Smart BRSR Reporting Portal
            </div>
          </div>
        </div>

        {/* Desktop Anchor Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }} className="d-none d-md-flex">
          <a href="#carousel-section" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>
            Features & Modules
          </a>
          <a href="#instructions-section" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>
            User Instructions
          </a>
          <a href="#roles-guide-section" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>
            Roles & Access
          </a>
          <a href="#hierarchy-section" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>
            4-Tier Hierarchy
          </a>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => {
              const el = document.getElementById('roles-guide-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="btn-secondary-esg d-none d-sm-inline-flex"
            style={{ fontSize: '0.84rem', padding: '0.5rem 1rem' }}
          >
            <Sparkles size={14} style={{ color: 'var(--warning)' }} /> Explore Roles
          </button>

          <button
            className="btn-primary-esg"
            onClick={() => navigate('/login')}
            style={{ padding: '0.55rem 1.35rem', fontSize: '0.875rem' }}
          >
            <LogIn size={15} /> Sign In
          </button>
        </div>
      </nav>

      {/* ─── HERO SECTION (FULL WIDTH FLUID) ─── */}
      <section className="landing-hero-modern w-100">
        <div className="hero-glow-orb-1" />
        <div className="hero-glow-orb-2" />

        <div className="container-fluid px-3 px-md-5" style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
          <div className="hero-pill-badge">
            <span className="hero-pill-dot" />
            <span>BPUT Hackathon 2026 • Problem Statement 08 | SEBI BRSR Reference 2023-24</span>
          </div>

          <h1 className="hero-title" style={{ maxWidth: '1100px', margin: '0 auto 1.25rem' }}>
            Enterprise ESG Compliance &<br />
            <span className="hero-title-highlight">Automated BRSR Reporting</span>
          </h1>

          <p className="hero-subtitle" style={{ maxWidth: '850px', margin: '0 auto 2.5rem' }}>
            A comprehensive, multi-tier sustainability data management portal built for complex corporate groups.
            Collect operational ESG data with document evidence, execute 4-tier hierarchical rollups, and generate
            SEBI-compliant BRSR reports with zero manual overhead.
          </p>

          <div className="hero-cta-group" style={{ marginBottom: '1.5rem' }}>
            <button className="btn-hero-primary" onClick={() => navigate('/login')}>
              Launch Compliance Portal <ArrowRight size={17} />
            </button>
            <button
              className="btn-hero-secondary"
              onClick={() => {
                const el = document.getElementById('carousel-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Explore ESG Modules <Compass size={17} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── CONTINUOUS AUTO-SCROLLING MARQUEE TICKER ─── */}
      <div className="marquee-wrapper w-100">
        <div className="marquee-track">
          {[...COMPLIANCE_ITEMS, ...COMPLIANCE_ITEMS, ...COMPLIANCE_ITEMS].map((item, idx) => (
            <div key={idx} className="marquee-item">
              <Award size={14} style={{ color: '#7EDBB2' }} />
              <span>{item}</span>
              <span className="marquee-dot" />
            </div>
          ))}
        </div>
      </div>

      {/* ─── AUTO-SCROLL CAROUSEL SECTION (FULL WIDTH FLUID) ─── */}
      <section id="carousel-section" className="carousel-section w-100">
        <div className="container-fluid px-3 px-md-5" style={{ textAlign: 'center' }}>
          <div className="section-tag">
            <Layers size={13} /> Interactive Module Showcase
          </div>
          <h2 className="section-heading">
            Next-Generation ESG & BRSR Architecture
          </h2>
          <p className="section-desc" style={{ maxWidth: '750px', margin: '0 auto' }}>
            Explore our automated reporting modules. This carousel auto-advances through core capabilities.
            Hover anywhere over the card to pause and inspect the metrics.
          </p>

          {/* Module Selector Pill Tabs */}
          <div className="carousel-tabs-container">
            {CAROUSEL_SLIDES.map((slide, i) => (
              <button
                key={slide.id}
                className={`carousel-tab-pill ${currentSlide === i ? 'active' : ''}`}
                onClick={() => setCurrentSlide(i)}
              >
                <span>{slide.tag}</span>
              </button>
            ))}
          </div>

          {/* Active Carousel Card (Full Width Fluid) */}
          <div
            className="carousel-card-container w-100"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="carousel-card w-100">
              {/* Content Side */}
              <div className="carousel-content-side" style={{ textAlign: 'left' }}>
                <div
                  className="carousel-slide-tag"
                  style={{ background: activeSlideData.tagBg, color: activeSlideData.tagColor }}
                >
                  <Sparkles size={12} /> {activeSlideData.tag}
                </div>

                <h3 className="carousel-slide-title">
                  {activeSlideData.title}
                </h3>

                <p className="carousel-slide-desc">
                  {activeSlideData.desc}
                </p>

                {/* Key KPIs */}
                <div className="carousel-kpi-grid">
                  {activeSlideData.kpis.map((kpi, kIdx) => (
                    <div key={kIdx} className="carousel-kpi-box">
                      <div className="carousel-kpi-value">{kpi.value}</div>
                      <div className="carousel-kpi-label">{kpi.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button
                    className="btn-primary-esg"
                    onClick={() => navigate('/login')}
                    style={{ padding: '0.65rem 1.5rem', fontSize: '0.85rem' }}
                  >
                    Experience Live <ArrowRight size={15} />
                  </button>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Slide {currentSlide + 1} of {CAROUSEL_SLIDES.length}
                  </span>
                </div>
              </div>

              {/* Visual Mockup Side */}
              <div className="carousel-visual-side">
                <div className="visual-mockup-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#A3E9C7', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <TrendingUp size={15} /> {activeSlideData.mockup.title}
                    </div>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
                    {activeSlideData.mockup.items.map((item, itIdx) => (
                      <div key={itIdx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.3rem', color: 'rgba(255,255,255,0.9)' }}>
                          <span>{item.label}</span>
                          <span style={{ fontWeight: 700, color: '#7EDBB2' }}>{item.val}</span>
                        </div>
                        <div style={{ height: 6, width: '100%', background: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${item.pct}%`, background: item.color, borderRadius: 4, transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 8,
                    padding: '0.65rem 0.85rem',
                    fontSize: '0.74rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <span style={{ color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CheckCircle2 size={13} style={{ color: '#4ADE80' }} /> {activeSlideData.mockup.badge}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.6rem', textAlign: 'center' }}>
                    {activeSlideData.mockup.metricNote}
                  </div>
                </div>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="carousel-controls-bar">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  className="carousel-nav-btn"
                  onClick={() => setCurrentSlide(prev => (prev - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length)}
                  title="Previous Slide"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  className="carousel-nav-btn"
                  onClick={() => setCurrentSlide(prev => (prev + 1) % CAROUSEL_SLIDES.length)}
                  title="Next Slide"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  className="carousel-nav-btn"
                  onClick={() => setIsPaused(p => !p)}
                  title={isPaused ? 'Resume Auto-Scroll' : 'Pause Auto-Scroll'}
                  style={{ fontSize: '0.75rem' }}
                >
                  {isPaused ? <Play size={15} /> : <Pause size={15} />}
                </button>
              </div>

              {/* Dot Indicators */}
              <div className="carousel-dots-group">
                {CAROUSEL_SLIDES.map((_, i) => (
                  <div
                    key={i}
                    className={`carousel-dot ${currentSlide === i ? 'active' : ''}`}
                    onClick={() => setCurrentSlide(i)}
                    title={`Slide ${i + 1}`}
                  />
                ))}
              </div>

              <div className="carousel-timer-badge">
                <span>{isPaused ? 'Auto-scroll Paused' : 'Auto-advancing (4.5s)'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── INSTRUCTIONS & OPERATIONAL GUIDE SECTION (FULL WIDTH FLUID) ─── */}
      <section id="instructions-section" className="instructions-section w-100">
        <div className="container-fluid px-3 px-md-5" style={{ textAlign: 'center' }}>
          <div className="section-tag">
            <HelpCircle size={13} /> Operational Instructions
          </div>
          <h2 className="section-heading">
            How It Works: Step-by-Step User Guide
          </h2>
          <p className="section-desc" style={{ maxWidth: '750px', margin: '0 auto' }}>
            Follow this streamlined 4-step execution flow to onboard organizations, enter operational metrics,
            conduct evidence audits, and submit SEBI-aligned sustainability disclosures.
          </p>

          {/* 4 Step Cards (Full Width Fluid) */}
          <div className="steps-grid w-100">
            {WORKFLOW_STEPS.map((step) => (
              <div key={step.num} className="step-card">
                <div className="step-number-badge">
                  {step.num}
                </div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
                <div>
                  <span className="step-key-badge">
                    <step.icon size={12} style={{ display: 'inline', marginRight: 4 }} />
                    {step.badge}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ─── ROLE-BASED INSTRUCTIONS (FULL WIDTH FLUID) ─── */}
          <div id="roles-guide-section" className="role-hub-card w-100" style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Role-Based Instructions Hub
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.2rem 0 0' }}>
                Role Responsibilities & Access Guide
              </h3>
            </div>

            {/* Role Tabs */}
            <div className="role-tabs">
              {ROLE_INSTRUCTIONS.map((r, rIdx) => (
                <button
                  key={r.role}
                  className={`role-tab-btn ${selectedRole === rIdx ? 'active' : ''}`}
                  onClick={() => setSelectedRole(rIdx)}
                >
                  <span>{r.role.split('(')[0]}</span>
                </button>
              ))}
            </div>

            {/* Active Role Content */}
            <div style={{ paddingTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {activeRoleData.role}
                </h4>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'var(--secondary)', color: 'var(--primary)', padding: '2px 10px', borderRadius: 99 }}>
                  {activeRoleData.badge}
                </span>
              </div>

              <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
                {activeRoleData.scope}
              </p>

              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
                  Key Operational Responsibilities & Instructions:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem' }}>
                  {activeRoleData.responsibilities.map((resp, respIdx) => (
                    <div key={respIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.86rem', color: 'var(--text-secondary)', background: 'var(--surface)', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
                      <span>{resp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ─── REGULATORY INSTRUCTIONS & FAQ ACCORDION (FULL WIDTH FLUID) ─── */}
          <div className="w-100" style={{ margin: '2.5rem auto 0', textAlign: 'left' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Regulatory Compliance Rules
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                SEBI BRSR Compliance & Audit Guidelines
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {GUIDELINE_FAQS.map((faq, fIdx) => (
                <div
                  key={fIdx}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === fIdx ? null : fIdx)}
                    style={{
                      width: '100%',
                      padding: '1.1rem 1.25rem',
                      background: 'none',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.92rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span>{faq.q}</span>
                    {openFaq === fIdx ? <ChevronUp size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} /> : <ChevronDown size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                  </button>

                  {openFaq === fIdx && (
                    <div style={{ padding: '0 1.25rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.65, borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── MULTI-TIER HIERARCHY ARCHITECTURE SECTION (FULL WIDTH FLUID) ─── */}
      <section id="hierarchy-section" className="w-100" style={{ padding: '2.5rem 0', background: 'var(--surface)' }}>
        <div className="container-fluid px-3 px-md-5" style={{ textAlign: 'center' }}>
          <div className="section-tag">
            <Building2 size={13} /> Enterprise Structure
          </div>
          <h2 className="section-heading">Multi-Tier Organization Hierarchy</h2>
          <p className="section-desc" style={{ maxWidth: '750px', margin: '0 auto 1.5rem' }}>
            ESG data is collected at physical operating facilities and consolidated upward through business units
            and subsidiaries to group headquarters with absolute mathematical consistency.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', position: 'relative' }} className="d-none d-md-grid w-100">
            <div className="esg-card" style={{ padding: '1.75rem 1.25rem', textAlign: 'center', borderTop: '4px solid var(--primary)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Tier 1: Root Group</div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem' }}>ESG360 Infra Group Ltd.</h4>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0 }}>Executive governance, board oversight, and final SEBI BRSR filing consolidation.</p>
            </div>

            <div className="esg-card" style={{ padding: '1.75rem 1.25rem', textAlign: 'center', borderTop: '4px solid var(--accent)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Tier 2: Subsidiary</div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem' }}>ESG360 Clean Energy Ltd.</h4>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0 }}>Clean energy & renewable infrastructure operations oversight.</p>
            </div>

            <div className="esg-card" style={{ padding: '1.75rem 1.25rem', textAlign: 'center', borderTop: '4px solid #F59E0B' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Tier 3: Business Unit</div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem' }}>Solar Parks Business Unit</h4>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0 }}>Utility scale solar energy division management & aggregation.</p>
            </div>

            <div className="esg-card" style={{ padding: '1.75rem 1.25rem', textAlign: 'center', borderTop: '4px solid #3B82F6' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Tier 4: Project Site</div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem' }}>Bhadla 500MW Ultra Solar Park</h4>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0 }}>Physical plant telemetry, on-site carbon & environmental data logging.</p>
            </div>
          </div>

          {/* Mobile view of hierarchy */}
          <div className="d-md-none" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left' }}>
            {[
              'Tier 1: Group (ESG360 Infra Group Ltd.)',
              'Tier 2: Subsidiary (ESG360 Clean Energy Ltd.)',
              'Tier 3: Business Unit (Solar Parks Business Unit)',
              'Tier 4: Project Site (Bhadla 500MW Ultra Solar Park)'
            ].map((tier, tIdx) => (
              <div key={tIdx} style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '0.85rem 1rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600 }}>
                {tier}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER (FULL WIDTH FLUID) ─── */}
      <footer className="w-100" style={{
        background: '#072118',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        color: 'rgba(255, 255, 255, 0.75)',
        padding: '1.75rem 0',
        fontSize: '0.84rem',
      }}>
        <div className="container-fluid px-3 px-md-5">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.25rem',
          }}>
            {/* Left: Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 32,
                height: 32,
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 800,
                fontSize: '0.95rem',
              }}>
                E
              </div>
              <div>
                <span style={{ fontWeight: 800, color: 'white', fontSize: '1rem', letterSpacing: '-0.02em', marginRight: '0.5rem' }}>
                  ESG360
                </span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                  Smart BRSR Reporting Platform
                </span>
              </div>
            </div>

            {/* Center: Navigation Links */}
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.82rem' }}>
              <a href="#carousel-section" style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s' }}>
                Modules
              </a>
              <a href="#instructions-section" style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s' }}>
                Instructions
              </a>
              <a href="#roles-guide-section" style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s' }}>
                Roles Guide
              </a>
              <a href="#hierarchy-section" style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s' }}>
                Hierarchy
              </a>
              <button
                onClick={() => navigate('/login')}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#7EDBB2',
                  padding: '0.35rem 0.85rem',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                Sign In
              </button>
            </div>

            {/* Right: Copyright */}
            <div style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '0.75rem' }}>
              &copy; 2026 ESG360. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
