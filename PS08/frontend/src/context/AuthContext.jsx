import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import authService from '../services/authService';
import {
  LuShieldAlert as ShieldAlert,
  LuClock as Clock,
  LuLogOut as LogOut,
  LuCircleCheck as CheckCircle2
} from 'react-icons/lu';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

// Role permission map
const ROLE_PERMISSIONS = {
  'Super Admin': ['all'], // Only Super Admin has authority for Approvals and Audit Logs
  'Group ESG Admin': ['dashboard', 'organizations', 'esg', 'environmental', 'social', 'governance', 'brsr', 'validation', 'documents', 'reports', 'analytics', 'notifications', 'users'],
  'Subsidiary Admin': ['dashboard', 'organizations', 'esg', 'environmental', 'social', 'governance', 'brsr', 'validation', 'documents', 'reports', 'analytics', 'notifications'],
  'Business Unit Manager': ['dashboard', 'organizations', 'esg', 'environmental', 'social', 'governance', 'brsr', 'validation', 'documents', 'reports', 'analytics', 'notifications'],
  'Project/Department User': ['dashboard', 'organizations', 'esg', 'environmental', 'social', 'governance', 'brsr', 'validation', 'documents', 'notifications'],
  'ESG Manager': ['dashboard', 'organizations', 'esg', 'environmental', 'social', 'governance', 'brsr', 'validation', 'documents', 'reports', 'analytics', 'notifications'],
  'Compliance Officer': ['dashboard', 'organizations', 'esg', 'environmental', 'social', 'governance', 'brsr', 'validation', 'documents', 'reports', 'analytics', 'notifications'],
  'Management': ['dashboard', 'organizations', 'esg', 'environmental', 'social', 'governance', 'brsr', 'validation', 'documents', 'reports', 'analytics', 'notifications'],
  'Auditor/Reviewer': ['dashboard', 'organizations', 'esg', 'environmental', 'social', 'governance', 'brsr', 'validation', 'documents', 'reports', 'analytics', 'notifications'],
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('esg360_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // ─── SUPER ADMIN AUTO SESSION TIMEOUT MECHANISM ───
  // Default: 30 seconds (per requirement for hackathon verification)
  // Configurable options: 30 seconds, 300 seconds (5m), 900 seconds (15m)
  const [timeoutSecondsSetting, setTimeoutSecondsSetting] = useState(() => {
    const saved = localStorage.getItem('esg_admin_timeout_setting');
    return saved ? Number(saved) : 30; // 30 seconds default
  });

  const [showWarningModal, setShowWarningModal] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(10);
  const lastActivityRef = useRef(Date.now());
  const timerIntervalRef = useRef(null);

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('esg360_token');
    if (token) {
      authService.getProfile()
        .then(res => {
          setUser(res.data.data);
          localStorage.setItem('esg360_user', JSON.stringify(res.data.data));
        })
        .catch(() => {
          localStorage.removeItem('esg360_token');
          localStorage.removeItem('esg360_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authService.login({ email, password });
    const { user: userData, token } = res.data.data;
    localStorage.setItem('esg360_token', token);
    localStorage.setItem('esg360_user', JSON.stringify(userData));
    setUser(userData);
    lastActivityRef.current = Date.now();
    return userData;
  }, []);

  const register = useCallback(async (formData) => {
    const res = await authService.register(formData);
    const { user: userData, token } = res.data.data;
    localStorage.setItem('esg360_token', token);
    localStorage.setItem('esg360_user', JSON.stringify(userData));
    setUser(userData);
    lastActivityRef.current = Date.now();
    return userData;
  }, []);

  const logout = useCallback((reason = null) => {
    localStorage.removeItem('esg360_token');
    localStorage.removeItem('esg360_user');
    setUser(null);
    setShowWarningModal(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    if (reason) {
      sessionStorage.setItem('esg_timeout_notice', reason);
      window.location.href = `/?timeout=superadmin_inactivity`;
    }
  }, []);

  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarningModal(false);
  }, []);

  const updateTimeoutSetting = useCallback((seconds) => {
    setTimeoutSecondsSetting(seconds);
    localStorage.setItem('esg_admin_timeout_setting', String(seconds));
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  // ─── Super Admin Inactivity Watcher Effect ───
  useEffect(() => {
    if (!user || user.role !== 'Super Admin') {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setShowWarningModal(false);
      return;
    }

    // Reset timestamp whenever setting or user changes
    lastActivityRef.current = Date.now();

    const handleUserActivity = () => {
      // If modal is not active, treat any interaction as active heartbeat
      if (!showWarningModal) {
        lastActivityRef.current = Date.now();
      }
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(evt => window.addEventListener(evt, handleUserActivity, { passive: true }));

    // Check timer tick every 1000ms
    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastActivityRef.current) / 1000);
      const totalTimeout = timeoutSecondsSetting;
      const warningThreshold = Math.max(1, totalTimeout - 10); // Show warning in last 10 seconds

      if (elapsedSeconds >= totalTimeout) {
        // Automatically logout Super Admin
        clearInterval(timerIntervalRef.current);
        logout('Super Admin account was automatically logged out due to 30 seconds of inactivity to protect sensitive ESG and BRSR data.');
      } else if (elapsedSeconds >= warningThreshold) {
        // Show Warning Popup
        setShowWarningModal(true);
        setSecondsRemaining(totalTimeout - elapsedSeconds);
      } else {
        setShowWarningModal(false);
      }
    }, 1000);

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, handleUserActivity));
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [user, timeoutSecondsSetting, showWarningModal, logout]);

  const hasPermission = useCallback((module) => {
    if (!user) return false;
    const perms = ROLE_PERMISSIONS[user.role] || [];
    return perms.includes('all') || perms.includes(module);
  }, [user]);

  const isAdmin = user && ['Super Admin', 'Group ESG Admin', 'Subsidiary Admin'].includes(user.role);
  const isReviewer = user && [
    'Super Admin', 'Group ESG Admin', 'Subsidiary Admin', 'Management',
    'ESG Manager', 'Compliance Officer', 'Auditor/Reviewer', 'Business Unit Manager'
  ].includes(user.role);
  const isSuperAdmin = user?.role === 'Super Admin';

  const value = {
    user,
    loading,
    login,
    logout,
    register,
    hasPermission,
    isAdmin,
    isReviewer,
    isSuperAdmin,
    isAuthenticated: !!user,
    timeoutSecondsSetting,
    updateTimeoutSetting,
    resetInactivityTimer,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}

      {/* ─── SUPER ADMIN INACTIVITY WARNING POPUP ─── */}
      {showWarningModal && isSuperAdmin && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '2px solid #F97316',
              overflow: 'hidden',
              animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
                padding: '1.5rem 1.5rem 1.25rem',
                borderBottom: '1px solid #FED7AA',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#F97316',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(249, 115, 22, 0.35)',
                }}
              >
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#9A3412' }}>
                  Super Admin Session Timeout
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#C2410C' }}>
                  Statutory ESG Security & BRSR Compliance Safeguard
                </p>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem' }}>
              <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>
                No activity detected on your Super Admin terminal for <strong>{timeoutSecondsSetting - secondsRemaining} seconds</strong>. To prevent unauthorized access to sensitive MEIL ESG data, your session will automatically terminate in:
              </p>

              {/* Big Countdown Badge */}
              <div
                style={{
                  background: '#FFF1F2',
                  border: '1.5px dashed #F43F5E',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.5rem',
                }}
              >
                <Clock size={24} style={{ color: '#E11D48', animation: 'pulse 1s infinite' }} />
                <span
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    color: '#BE123C',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {secondsRemaining}s
                </span>
                <span style={{ fontSize: '0.85rem', color: '#881337', fontWeight: 600 }}>
                  remaining until auto-logout
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={resetInactivityTimer}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: '#059669',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <CheckCircle2 size={16} /> Stay Logged In
                </button>

                <button
                  type="button"
                  onClick={() => logout('Super Admin manual logout.')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: '#F1F5F9',
                    color: '#64748B',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    border: '1px solid #CBD5E1',
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={15} /> Logout Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export default AuthContext;
