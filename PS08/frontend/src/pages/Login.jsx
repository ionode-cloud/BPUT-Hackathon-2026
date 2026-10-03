import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, LogIn, Sparkles, Mail, Lock,
  ArrowLeft, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/auth.css';
import processCharacterImg from '../assets/process-character.jpg';

/* ─── DEMO CREDENTIALS FOR RAPID 1-CLICK TESTING ─── */
const DEMO_ACCOUNT = {
  label: 'Super Admin',
  email: 'admin@esg360.com',
  password: 'Admin@123456',
};

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Form states
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  // One-click demo credentials autofill
  const handleFillDemo = () => {
    setForm({
      email: DEMO_ACCOUNT.email,
      password: DEMO_ACCOUNT.password,
    });
    setError('');
  };

  // Handle Login submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email || !form.password) {
      setError('Please enter your work email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      if (!err.response) {
        if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
          setError('Backend server request timed out. The server on Render is likely spinning up from sleep; please try again in a few seconds.');
        } else {
          setError('Unable to connect to backend server. If using Render free-tier, the server may take 30-50s to wake up. Please retry.');
        }
      } else {
        setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      {/* ─── LEFT SHOWCASE PANEL (PEACH BACKGROUND) ─── */}
      <div className="auth-left-panel">
        {/* Brand Header */}
        <Link to="/" className="auth-brand-logo">
          <div className="auth-brand-icon">
            <Sparkles size={20} />
          </div>
          <div className="auth-brand-name">
            ESG<span>360</span>
          </div>
        </Link>

        {/* Center Content */}
        <div className="auth-left-content">
          <div className="auth-left-eyebrow">
            <Sparkles size={12} /> ENTERPRISE SUSTAINABILITY PORTAL
          </div>

          <h1 className="auth-left-title">
            Streamlined ESG compliance for <span>your enterprise</span>
          </h1>

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

      {/* ─── RIGHT FORM CONTAINER (WHITE BACKGROUND, SCROLLABLE) ─── */}
      <div className="auth-right-panel">
        <div className="auth-form-wrapper">
          <Link to="/" className="auth-back-link">
            <ArrowLeft size={16} /> Back to Home
          </Link>

          <div className="auth-form-card">
            {/* Form Header */}
            <div className="auth-form-header">
              <h2 className="auth-form-title">Welcome back</h2>
              <p className="auth-form-subtitle">
                Sign in to your ESG360 enterprise compliance portal
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="auth-alert-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* 1-Click Demo Fill Box */}
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
                onClick={handleFillDemo}
              >
                Fill Credentials
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} noValidate>
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
                    value={form.email}
                    onChange={handleChange}
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
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    className="auth-input"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    style={{ paddingRight: '2.5rem' }}
                    required
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowPass(!showPass)}
                    aria-label="Toggle password visibility"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading ? (
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
  );
};

export default Login;
