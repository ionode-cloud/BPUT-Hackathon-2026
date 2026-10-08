import { useState } from 'react';
import {
  MdEmail,
  MdLock,
  MdVisibility,
  MdVisibilityOff,
  MdClose,
  MdErrorOutline,
} from 'react-icons/md';

export default function AdminLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimmedInput = adminId.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (!trimmedInput || !trimmedPass) {
      setError('Please enter both Admin Gmail and Password.');
      return;
    }

    // Auto-normalize if user typed just username (e.g. "admin" -> "admin@gmail.com")
    const resolvedGmail = trimmedInput.includes('@') ? trimmedInput : `${trimmedInput}@gmail.com`;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resolvedGmail)) {
      setError('Please enter a valid Gmail address (e.g. admin@gmail.com).');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      let valid = false;
      let userRole = 'Facility SuperAdmin';
      const usernamePart = resolvedGmail.split('@')[0];
      let userName = usernamePart === 'admin'
        ? 'Campus SuperAdmin'
        : usernamePart.charAt(0).toUpperCase() + usernamePart.slice(1);

      // Authenticate: Accept admin@gmail.com, any valid @gmail.com address with valid password, or local registered users
      if (
        (resolvedGmail === 'admin@gmail.com' || resolvedGmail.endsWith('@gmail.com') || resolvedGmail.includes('admin')) &&
        (trimmedPass === 'admin123' || trimmedPass.length >= 4)
      ) {
        valid = true;
      } else {
        try {
          const registeredUsers = JSON.parse(localStorage.getItem('facility_ai_users') || '[]');
          const matched = registeredUsers.find(
            (u) =>
              (u.id.toLowerCase() === resolvedGmail || (u.email && u.email.toLowerCase() === resolvedGmail)) &&
              u.password === trimmedPass
          );
          if (matched) {
            valid = true;
            userRole = matched.role || userRole;
            userName = matched.name || userName;
          }
        } catch (err) {
          console.error(err);
        }
      }

      if (valid) {
        const sessionData = {
          id: resolvedGmail,
          email: resolvedGmail,
          name: userName,
          role: userRole,
          timestamp: Date.now(),
        };

        if (rememberMe) {
          localStorage.setItem('facility_ai_admin', JSON.stringify(sessionData));
        } else {
          sessionStorage.setItem('facility_ai_admin', JSON.stringify(sessionData));
        }

        setIsLoading(false);
        onLoginSuccess(sessionData);
      } else {
        setIsLoading(false);
        setError('Invalid email or password. Please check your credentials.');
      }
    }, 400);
  };

  return (
    <div className="vector-modal-overlay" onClick={onClose}>
      <div
        className="vector-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="vector-modal-title"
      >
        {/* Background Decorative Organic Waves matching the reference image */}
        <div className="vector-wave-bg-layer" aria-hidden="true">
          <svg
            className="vector-wave-svg"
            viewBox="0 0 860 480"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="refPurpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="40%" stopColor="#6366f1" />
                <stop offset="75%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              <linearGradient id="refGlowSoft" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Top Right Curved Scalloped Wave */}
            <path
              d="M 330 0
                 C 380 40, 420 50, 460 30
                 C 510 5, 550 50, 600 35
                 C 660 15, 710 55, 770 25
                 C 810 5, 840 25, 860 15
                 L 860 0 Z"
              fill="url(#refPurpleGrad)"
            />

            {/* Right Edge & Bottom Curved Organic Shape */}
            <path
              d="M 860 25
                 C 810 40, 770 95, 740 125
                 C 690 175, 715 235, 765 270
                 C 815 305, 800 365, 735 385
                 C 675 405, 620 435, 575 455
                 C 525 478, 470 480, 410 480
                 L 860 480 Z"
              fill="url(#refPurpleGrad)"
            />

            {/* Top-Right Soft Radial Ambient Glow */}
            <ellipse cx="760" cy="70" rx="90" ry="60" fill="url(#refGlowSoft)" />
          </svg>
        </div>

        {/* Modal Close Button */}
        <button
          type="button"
          className="vector-close-btn"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <MdClose size={20} />
        </button>

        {/* Modal Content Grid (Left: Sign-In Form, Right: Welcome Back Text) */}
        <div className="vector-modal-body">
          {/* ── Left Form Column ── */}
          <div className="vector-form-col">
            <h1 id="vector-modal-title" className="vector-title">
              Hello!
            </h1>
            <p className="vector-subtitle">Sign in to your account</p>

            {error && (
              <div className="vector-error-badge">
                <MdErrorOutline size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="vector-signin-form">
              {/* Email / Gmail Admin ID Input */}
              <div className="vector-input-pill">
                <div className="vector-pill-icon">
                  <MdEmail size={18} />
                </div>
                <input
                  id="vector-email-input"
                  type="email"
                  placeholder="admin@gmail.com"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {/* Password Input */}
              <div className="vector-input-pill">
                <div className="vector-pill-icon">
                  <MdLock size={18} />
                </div>
                <input
                  id="vector-password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="vector-eye-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                </button>
              </div>

              {/* Options Row (Remember me) */}
              <div className="vector-options-row">
                <label className="vector-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="vector-submit-wrap">
                <button
                  type="submit"
                  className="vector-signin-btn"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="vector-spinner" />
                  ) : (
                    <span>SIGN IN</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* ── Right Welcome Column ── */}
          <div className="vector-welcome-col">
            <h2 className="vector-welcome-title">Welcome Back!</h2>
            <p className="vector-welcome-desc">
              Facility AI connects your campus air quality telemetry, power grid meters,
              ultrasonic tank controls, and smart bins into one unified console.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
