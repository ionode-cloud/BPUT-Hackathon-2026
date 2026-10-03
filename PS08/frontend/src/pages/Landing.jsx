import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Leaf, Users, Shield, ArrowRight, ArrowLeft,
  Sparkles, FileText,
  Menu, X, ArrowUpRight,
  Lock, Globe, Mail, Eye, EyeOff, LogIn, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/landing.css';
import '../styles/auth.css';

// Import 3D character illustrations matching reference image
import heroCharactersImg from '../assets/hero-characters.jpg';
import processCharacterImg from '../assets/process-character.jpg';
import aboutAnalyticsImg from '../assets/about-analytics.jpg';

/* ─── 4 SERVICES (MATCHING REFERENCE 4 CARDS) ─── */
const SERVICES_DATA = [
  {
    id: 'environmental',
    title: 'Environmental & GHG',
    desc: 'Scope 1, 2 & 3 carbon accounting, renewable energy ratios, water recycling, and automated emissions calculators.',
    icon: Leaf,
    color: '#D97706',
    bg: '#FEF9C3',
    link: '#process',
  },
  {
    id: 'social',
    title: 'Social & Workplace',
    desc: 'Track employee diversity, median wage parity, zero-harm OHS indices (LTIFR), and verified CSR community investments.',
    icon: Users,
    color: '#059669',
    bg: '#DCFCE7',
    link: '#process',
  },
  {
    id: 'governance',
    title: 'Governance & Ethics',
    desc: 'Board independence matrix, anti-bribery policies, whistleblower log resolution, and audit committee oversight.',
    icon: Shield,
    color: '#7C3AED',
    bg: '#F3E8FF',
    link: '#process',
  },
  {
    id: 'brsr',
    title: 'Automated BRSR Filing',
    desc: 'SEBI Principles 1-9 automated mapping, gap analysis, and one-click PDF & Excel statutory filing generation.',
    icon: FileText,
    color: '#EA580C',
    bg: '#FFEDD5',
    link: '#process',
  },
];

/* ─── 4 PROCESS STEPS (MATCHING REFERENCE PEACH SECTION) ─── */
const PROCESS_STEPS = [
  {
    num: 1,
    title: 'Contact & Onboard Hierarchy',
    desc: 'Configure your Group, Subsidiary, Business Unit, and Operating Plant hierarchy with strict boundaries.',
  },
  {
    num: 2,
    title: 'Input Operational Metrics',
    desc: 'Facility engineers log monthly figures with mandatory utility bills and CEMS lab test evidence.',
  },
  {
    num: 3,
    title: 'Multi-Tier Validation',
    desc: 'BU managers review metrics with automated anomaly checks and integrated correction loops.',
  },
  {
    num: 4,
    title: 'Automated BRSR Filing',
    desc: 'Consolidate approved metrics upward without double-counting and export SEBI filing packets.',
  },
];

/* ─── DEMO ACCOUNTS FOR INSTANT LOGIN ─── */
const DEMO_USERS = [
  { role: 'Super Admin', email: 'admin@esg360.com', password: 'Admin@123456' },
  { role: 'Group ESG Admin', email: 'group.admin@esg360.com', password: 'Admin@123456' },
  { role: 'Subsidiary Admin', email: 'energy.sub@esg360.com', password: 'Admin@123456' },
  { role: 'BU Manager', email: 'solar.bu@esg360.com', password: 'Admin@123456' },
  { role: 'Facility User', email: 'bhadla.user@esg360.com', password: 'Admin@123456' },
];

const Landing = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Navigation State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Login Modal State (Pop-up on landing page)
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginShowPass, setLoginShowPass] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Open modal and optionally autofill
  const openLoginModal = (email = '', password = '') => {
    setLoginForm({ email, password });
    setLoginError('');
    setLoginModalOpen(true);
  };

  // Handle Login submission in modal
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (!loginForm.email || !loginForm.password) {
      setLoginError('Please enter your work email and password.');
      return;
    }

    setLoginLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      setLoginModalOpen(false);
      navigate('/dashboard');
    } catch (err) {
      if (!err.response) {
        if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
          setLoginError('Backend request timed out. The server on Render is likely spinning up from sleep; please try again in a few seconds.');
        } else {
          setLoginError('Unable to connect to backend server. If using Render free-tier, the server may take 30-50s to wake up. Please retry.');
        }
      } else {
        setLoginError(err.response?.data?.message || 'Invalid email or password. Please try again.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="lp-root" id="home">
      {/* ─── 2. HEADER / NAVIGATION ─── */}
      <header className="lp-header">
        <div className="lp-container container-fluid lp-header-inner">
          {/* Left: Brand Logo */}
          <a href="#home" className="lp-logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <div className="lp-logo-icon">
              <Sparkles size={20} />
            </div>
            <div className="lp-logo-text">
              ESG<span>360</span>
            </div>
          </a>

          {/* Center: Navigation Links */}
          <nav>
            <ul className="lp-nav-menu">
              <li><a href="#home" className="lp-nav-link active">Home</a></li>
              <li><a href="#about" className="lp-nav-link">About us</a></li>
              <li><a href="#services" className="lp-nav-link">Services</a></li>
              <li><a href="#process" className="lp-nav-link">Process</a></li>
            </ul>
          </nav>

          {/* Right: Actions (Sign Up button opens the popup modal) */}
          <div className="lp-header-right">
            <button
              onClick={() => openLoginModal()}
              className="lp-btn-orange"
              style={{ padding: '0.55rem 1.4rem', fontSize: '0.88rem' }}
            >
              Sign Up
            </button>
            <button
              className="lp-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lp-mobile-nav">
            <a href="#home" className="lp-nav-link" onClick={() => setMobileMenuOpen(false)}>Home</a>
            <a href="#about" className="lp-nav-link" onClick={() => setMobileMenuOpen(false)}>About us</a>
            <a href="#services" className="lp-nav-link" onClick={() => setMobileMenuOpen(false)}>Services</a>
            <a href="#process" className="lp-nav-link" onClick={() => setMobileMenuOpen(false)}>Process</a>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => { setMobileMenuOpen(false); openLoginModal(); }}
                className="lp-btn-orange"
                style={{ width: '100%' }}
              >
                Sign Up
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ─── 3. HERO SECTION ─── */}
      <section className="lp-hero">
        {/* Subtle decorative floating circles matching reference */}
        <div className="lp-decor-dot" style={{ top: '15%', left: '4%', width: 14, height: 14, background: '#FFD8C7', opacity: 0.8 }} />
        <div className="lp-decor-dot" style={{ top: '25%', left: '8%', width: 8, height: 8, background: '#F15A24', opacity: 0.6, animationDelay: '1s' }} />
        <div className="lp-decor-dot" style={{ top: '75%', left: '12%', width: 18, height: 18, background: '#DDF4F5', opacity: 0.85, animationDelay: '2s' }} />
        <div className="lp-decor-dot" style={{ top: '20%', right: '6%', width: 12, height: 12, background: '#F15A24', opacity: 0.5, animationDelay: '1.5s' }} />
        <div className="lp-decor-dot" style={{ top: '80%', right: '14%', width: 16, height: 16, background: '#FFE5D9', opacity: 0.9, animationDelay: '0.5s' }} />

        <div className="lp-container container-fluid">
          <div className="lp-hero-grid">
            {/* Left Column */}
            <div>
              <div className="lp-hero-eyebrow">
                <Sparkles size={13} /> SMART BRSR & ESG COMPLIANCE PORTAL
              </div>

              <h1 className="lp-hero-title">
                We create <br />
                <span className="lp-highlight">solutions</span> for <br />
                your enterprise
              </h1>

              <p className="lp-hero-desc">
                Our platform streamlines multi-tier data collection, document evidence validation, and SEBI BRSR Core reporting to keep your corporate disclosures auditable and cutting-edge.
              </p>

              <div className="lp-hero-actions">
                <button onClick={() => openLoginModal()} className="lp-btn-orange">
                  Get Started
                </button>

                <a
                  href="#services"
                  className="lp-explore-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <div className="lp-explore-icon">
                    <ArrowRight size={17} />
                  </div>
                  <span>Explore more</span>
                </a>
              </div>
            </div>

            {/* Right Column: 3D Illustration matching reference */}
            <div className="lp-hero-image-wrap">
              <img
                src={heroCharactersImg}
                alt="ESG360 Enterprise Sustainability Team"
                className="lp-hero-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. SERVICES SECTION ─── */}
      <section className="lp-services" id="services">
        {/* Decorative dots */}
        <div className="lp-decor-dot" style={{ top: '10%', right: '8%', width: 10, height: 10, background: '#F15A24', opacity: 0.6 }} />
        <div className="lp-decor-dot" style={{ bottom: '15%', left: '5%', width: 14, height: 14, background: '#DDF4F5', opacity: 0.8 }} />

        <div className="lp-container container-fluid">
          <div className="lp-services-header">
            <h2 className="lp-heading-h2">
              We Provide The Best <span className="lp-highlight">Services</span>
            </h2>
            <p className="lp-subtitle">
              Let us unlock the full potential of your sustainability management with our data-driven reporting modules and automated frameworks.
            </p>
          </div>

          <div className="lp-services-grid">
            {SERVICES_DATA.map((service) => (
              <div key={service.id} className="lp-service-card">
                <div
                  className="lp-card-icon-box"
                  style={{ background: service.bg, color: service.color }}
                >
                  <service.icon size={24} />
                </div>
                <h3 className="lp-card-title">{service.title}</h3>
                <p className="lp-card-desc">{service.desc}</p>
                <a
                  href={service.link}
                  className="lp-card-link"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('process')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Read more <ArrowRight size={14} />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5. PROCESS / HOW IT WORKS SECTION (PEACH BACKGROUND) ─── */}
      <section className="lp-process" id="process">
        {/* Floating subtle dots on peach background */}
        <div className="lp-decor-dot" style={{ top: '12%', left: '6%', width: 12, height: 12, background: '#F15A24', opacity: 0.5 }} />
        <div className="lp-decor-dot" style={{ bottom: '15%', right: '8%', width: 16, height: 16, background: '#FFFFFF', opacity: 0.7 }} />

        <div className="lp-container container-fluid">
          <div className="lp-process-grid">
            {/* Left Column: Armchair character illustration */}
            <div className="lp-process-image-wrap">
              <img
                src={processCharacterImg}
                alt="Effortless ESG Workflow"
                className="lp-process-img"
              />
            </div>

            {/* Right Column: 4 Numbered Steps & CTAs */}
            <div className="lp-process-content">
              <h2 className="lp-heading-h2">
                Simple <span className="lp-highlight">Solutions!</span>
              </h2>
              <p className="lp-process-desc">
                We understand that no two enterprise hierarchies are alike. That's why our structured 4-step workflow ensures verified data integrity at every tier.
              </p>

              <div className="lp-steps-list">
                {PROCESS_STEPS.map((step) => (
                  <div key={step.num} className="lp-step-item">
                    <div className="lp-step-badge">{step.num}</div>
                    <div>
                      <h4 className="lp-step-title">{step.title}</h4>
                      <p className="lp-step-desc">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="lp-process-actions">
                <button onClick={() => openLoginModal()} className="lp-btn-orange">
                  Get Started
                </button>
                <button
                  onClick={() => {
                    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="lp-btn-outline"
                >
                  Read more
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. ABOUT / AGENCY SECTION ─── */}
      <section className="lp-about" id="about">
        {/* Decorative elements */}
        <div className="lp-decor-dot" style={{ top: '20%', left: '8%', width: 10, height: 10, background: '#DDF4F5', opacity: 0.8 }} />
        <div className="lp-decor-dot" style={{ bottom: '20%', right: '5%', width: 14, height: 14, background: '#FFD8C7', opacity: 0.6 }} />

        <div className="lp-container container-fluid">
          <div className="lp-about-grid">
            {/* Left Column: Description & Highlights */}
            <div className="lp-about-content">
              <h2 className="lp-heading-h2">
                Our <span className="lp-highlight">Agency</span>
              </h2>
              <p className="lp-about-desc">
                We believe in the power of data. Our analytics-driven approach allows enterprise groups to make informed decisions and optimize their sustainability disclosures for maximum impact.
              </p>
              <p className="lp-about-desc" style={{ marginTop: '-0.5rem', marginBottom: '1.5rem' }}>
                Let's turn your raw facility data into actionable insights with tailored solutions for your business.
              </p>

              <div className="lp-about-points">
                <div className="lp-about-point">
                  <div className="lp-about-point-dot" />
                  <span>SEBI BRSR Core (2023-24 Framework) & GRI Standards Compliant</span>
                </div>
                <div className="lp-about-point">
                  <div className="lp-about-point-dot" />
                  <span>GHG Protocol Scope 1, 2 & 3 Automated Decarbonization Accounting</span>
                </div>
                <div className="lp-about-point">
                  <div className="lp-about-point-dot" />
                  <span>Immutable Audit Trails with Cloudinary Evidence Verification</span>
                </div>
              </div>

              <button
                onClick={() => openLoginModal()}
                className="lp-btn-orange"
              >
                Read more
              </button>
            </div>

            {/* Right Column: Desk Analytics 3D illustration */}
            <div className="lp-about-image-wrap">
              <img
                src={aboutAnalyticsImg}
                alt="ESG Analytics & BRSR Performance Reporting"
                className="lp-about-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. FINAL CTA SECTION (ORANGE BANNER) ─── */}
      <section className="lp-cta-section" id="cta">
        <div className="lp-container container-fluid">
          <div className="lp-cta-banner">
            <div>
              <h3 className="lp-cta-title">Ready to get started?</h3>
              <p className="lp-cta-subtitle">
                Launch the portal or sign in to begin collecting, validating, and filing ESG data.
              </p>
            </div>
            <button onClick={() => openLoginModal()} className="lp-cta-action-btn">
              Contact Us
            </button>
          </div>
        </div>
      </section>

      {/* ─── 8. FOOTER ─── */}
      <footer className="lp-footer" id="footer">
        <div className="lp-container container-fluid">
          <div className="lp-footer-grid">
            {/* Column 1: Brand & Socials */}
            <div className="lp-footer-col">
              <a
                href="#home"
                className="lp-logo"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <div className="lp-logo-icon">
                  <Sparkles size={18} />
                </div>
                <div className="lp-logo-text">
                  ESG<span>360</span>
                </div>
              </a>
              <div className="lp-social-links" style={{ marginTop: '1.25rem' }}>
                <a href="#footer" className="lp-social-icon" style={{ background: '#3B5998' }} aria-label="Facebook">
                  <Globe size={15} />
                </a>
                <a href="#footer" className="lp-social-icon" style={{ background: '#E1306C' }} aria-label="Instagram">
                  <Sparkles size={15} />
                </a>
                <a href="#footer" className="lp-social-icon" style={{ background: '#1DA1F2' }} aria-label="Twitter">
                  <ArrowUpRight size={15} />
                </a>
                <a href="#footer" className="lp-social-icon" style={{ background: '#0077B5' }} aria-label="LinkedIn">
                  <Users size={15} />
                </a>
              </div>
            </div>

            {/* Column 2: Company */}
            <div className="lp-footer-col">
              <h5>Company</h5>
              <ul className="lp-footer-links">
                <li><a href="#about" className="lp-footer-link">About Us</a></li>
                <li><a href="#services" className="lp-footer-link">Services</a></li>
                <li><a href="#process" className="lp-footer-link">Process</a></li>
                <li><a href="#home" className="lp-footer-link">Team</a></li>
              </ul>
            </div>

            {/* Column 3: Modules */}
            <div className="lp-footer-col">
              <h5>Modules</h5>
              <ul className="lp-footer-links">
                <li><a href="#services" className="lp-footer-link">Environmental GHG</a></li>
                <li><a href="#services" className="lp-footer-link">Social & Workplace</a></li>
                <li><a href="#services" className="lp-footer-link">Governance & Risk</a></li>
                <li><a href="#services" className="lp-footer-link">SEBI BRSR Core</a></li>
                <li><a href="#services" className="lp-footer-link">Audit Evidence</a></li>
              </ul>
            </div>

            {/* Column 4: Resources */}
            <div className="lp-footer-col">
              <h5>Resources</h5>
              <ul className="lp-footer-links">
                <li><a href="#about" className="lp-footer-link">SEBI Guidelines 2023-24</a></li>
                <li><a href="#about" className="lp-footer-link">GHG Protocol Scope 1-3</a></li>
                <li><a href="#about" className="lp-footer-link">Assurance Framework</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Curved Orange Accent Strip with Centered Copyright */}
        <div className="lp-bottom-orange-bar">
          <span>&copy; 2026 ESG360. All rights reserved. BPUT Hackathon 2026 &bull; Problem Statement 08.</span>
        </div>
      </footer>

      {/* ─── TWO-PANEL LOGIN POPUP MODAL (EXACT MATCH TO USER SCREENSHOT) ─── */}
      {loginModalOpen && (
        <div className="lp-modal-backdrop" onClick={() => setLoginModalOpen(false)}>
          <div className="lp-two-panel-modal" onClick={(e) => e.stopPropagation()}>
            {/* Top Close Button */}
            <button
              className="lp-modal-close-top"
              onClick={() => setLoginModalOpen(false)}
              aria-label="Close popup"
            >
              <X size={18} />
            </button>

            {/* Left Showcase Panel (Soft Peach Background matching screenshot) */}
            <div className="auth-left-panel">
              {/* Brand Header */}
              <div
                className="auth-brand-logo"
                onClick={() => setLoginModalOpen(false)}
                style={{ cursor: 'pointer' }}
              >
                <div className="auth-brand-icon">
                  <Sparkles size={20} />
                </div>
                <div className="auth-brand-name">
                  ESG<span>360</span>
                </div>
              </div>

              {/* Center Content */}
              <div className="auth-left-content">
                <div className="auth-left-eyebrow">
                  <Sparkles size={12} /> ENTERPRISE SUSTAINABILITY PORTAL
                </div>

                <h2 className="auth-left-title">
                  Streamlined ESG compliance for <span>your enterprise</span>
                </h2>

                <p className="auth-left-desc">
                  Empower your organization with multi-tier operational ESG data collection, evidence verification, and automated SEBI BRSR Core reporting.
                </p>

                <div className="auth-feature-list">
                  <div className="auth-feature-item">
                    <div className="auth-feature-check">✓</div>
                    <span>100% SEBI BRSR Core (Principles 1-9) Aligned</span>
                  </div>
                  <div className="auth-feature-item">
                    <div className="auth-feature-check">✓</div>
                    <span>GHG Protocol Scope 1, 2 & 3 Automated Accounting</span>
                  </div>
                  <div className="auth-feature-item">
                    <div className="auth-feature-check">✓</div>
                    <span>4-Tier Hierarchical Rollup Without Double Counting</span>
                  </div>
                  <div className="auth-feature-item">
                    <div className="auth-feature-check">✓</div>
                    <span>Verifiable Cloudinary Evidence & Immutable Audit Logs</span>
                  </div>
                </div>

                <img
                  src={processCharacterImg}
                  alt="ESG360 Compliance Workflow"
                  className="auth-left-illustration"
                />
              </div>

              {/* Footer info */}
              <div className="auth-left-footer">
                &copy; 2026 ESG360. All rights reserved. BPUT Hackathon 2026.
              </div>
            </div>

            {/* Right Form Container (White Background matching screenshot) */}
            <div className="auth-right-panel">
              <div className="auth-form-wrapper">
                <button
                  type="button"
                  onClick={() => setLoginModalOpen(false)}
                  className="auth-back-link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <ArrowLeft size={16} /> Back to Home
                </button>

                <div className="auth-form-card">
                  {/* Form Header */}
                  <div className="auth-form-header">
                    <h2 className="auth-form-title">Welcome back</h2>
                    <p className="auth-form-subtitle">
                      Sign in to your ESG360 enterprise compliance portal
                    </p>
                  </div>

                  {/* Error Alert */}
                  {loginError && (
                    <div className="auth-alert-error">
                      <AlertCircle size={16} />
                      <span>{loginError}</span>
                    </div>
                  )}

                  {/* 1-Click Demo Super Admin Box */}
                  <div className="auth-demo-box">
                    <div className="auth-demo-info">
                      <div className="auth-demo-label">
                        <Sparkles size={13} style={{ color: '#F15A24' }} />
                        Demo Super Admin
                      </div>
                      <div className="auth-demo-val">admin@esg360.com &bull; Admin@123456</div>
                    </div>
                    <button
                      type="button"
                      className="auth-demo-btn"
                      onClick={() => {
                        setLoginForm({ email: 'admin@esg360.com', password: 'Admin@123456' });
                        setLoginError('');
                      }}
                    >
                      Fill Credentials
                    </button>
                  </div>

                  {/* Login Form */}
                  <form onSubmit={handleLoginSubmit} noValidate>
                    {/* Email Address */}
                    <div className="auth-input-group">
                      <label className="auth-label">
                        Work Email Address <span className="req">*</span>
                      </label>
                      <div className="auth-input-wrap">
                        <Mail size={16} className="auth-input-icon" />
                        <input
                          type="email"
                          name="email"
                          className="auth-input"
                          placeholder="you@organization.com"
                          value={loginForm.email}
                          onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                          autoComplete="email"
                          required
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="auth-input-group">
                      <label className="auth-label">
                        Password <span className="req">*</span>
                      </label>
                      <div className="auth-input-wrap">
                        <Lock size={16} className="auth-input-icon" />
                        <input
                          type={loginShowPass ? 'text' : 'password'}
                          name="password"
                          className="auth-input"
                          placeholder="Enter your password"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                          autoComplete="current-password"
                          style={{ paddingRight: '2.5rem' }}
                          required
                        />
                        <button
                          type="button"
                          className="auth-eye-btn"
                          onClick={() => setLoginShowPass(!loginShowPass)}
                          aria-label="Toggle password visibility"
                        >
                          {loginShowPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="auth-submit-btn"
                      disabled={loginLoading}
                    >
                      {loginLoading ? (
                        <>Signing in...</>
                      ) : (
                        <>
                          <LogIn size={18} /> Sign In
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
