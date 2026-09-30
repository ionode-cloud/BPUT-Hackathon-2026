import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Leaf } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) {
      setError('Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left panel */}
      <div className="auth-left">
        <div style={{ position: 'relative', zIndex: 1, color: 'white', maxWidth: 380 }}>
          <div style={{
            width: 64, height: 64,
            background: 'rgba(255,255,255,0.15)',
            border: '2px solid rgba(255,255,255,0.25)',
            borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 800, marginBottom: '2rem',
          }}>E</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: 'white' }}>
            ESG360
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.8, marginBottom: '2.5rem' }}>
            Smart BRSR Reporting & ESG Compliance Portal for infrastructure groups. Structured, auditable, and SEBI-aligned.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {['Environmental tracking & reporting', 'Social responsibility monitoring', 'Governance & compliance management', 'BRSR section mapping & analytics'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                <div style={{ width: 22, height: 22, background: 'rgba(255,255,255,0.15)', borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>✓</div>
                <span style={{ color: 'rgba(255,255,255,0.9)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-logo"><Leaf size={22} /></div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.4rem' }}>Welcome back</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.75rem' }}>
            Sign in to your ESG360 account
          </p>

          {error && (
            <div className="alert-esg alert-danger" style={{ marginBottom: '1.25rem' }}>
              ⚠ {error}
            </div>
          )}

          <div style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '8px',
            padding: '0.75rem 0.875rem',
            marginBottom: '1.25rem',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}>
            <div>
              <div style={{ fontWeight: 600, color: '#166534' }}>Demo Super Admin Credentials</div>
              <div style={{ color: '#15803D', fontSize: '0.76rem', marginTop: '2px' }}>
                admin@esg360.com | Admin@123456
              </div>
            </div>
            <button
              type="button"
              className="btn-secondary-esg"
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', whiteSpace: 'nowrap', background: '#DCFCE7', borderColor: '#86EFAC', color: '#166534' }}
              onClick={() => setForm({ email: 'admin@esg360.com', password: 'Admin@123456' })}
            >
              Fill Credentials
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group-esg">
              <label className="form-label-esg">Email Address <span className="required">*</span></label>
              <input
                type="email"
                name="email"
                className="form-control-esg"
                placeholder="you@organization.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group-esg">
              <label className="form-label-esg">Password <span className="required">*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  className="form-control-esg"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  style={{ paddingRight: '2.75rem' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)',
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary-esg w-100"
              disabled={loading}
              style={{ marginTop: '0.5rem', padding: '0.75rem', justifyContent: 'center', fontSize: '0.9rem' }}
            >
              {loading ? (
                <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Signing in...</>
              ) : (
                <><LogIn size={16} /> Sign In</>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <Link to="/" style={{ color: 'var(--text-muted)' }}>← Back to Home</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
