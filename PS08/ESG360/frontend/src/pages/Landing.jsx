import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Users, Shield, ArrowRight, BarChart2, Building2, CheckCircle2, LogIn } from 'lucide-react';

const FEATURES = [
  { icon: Leaf, title: 'Environmental Reporting', desc: 'Track energy, water, waste, GHG emissions, and environmental incidents across your organization.' },
  { icon: Users, title: 'Social Responsibility', desc: 'Manage employee data, diversity, OHS, community development, and grievance records.' },
  { icon: Shield, title: 'Governance & Compliance', desc: 'Document board policies, ethics, anti-corruption measures, and regulatory compliance.' },
  { icon: BarChart2, title: 'BRSR Reporting', desc: 'Map validated ESG data to SEBI BRSR sections with completeness tracking and gap analysis.' },
];

const HIERARCHY = ['Group', 'Subsidiary', 'Business Unit', 'Project'];

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: 'var(--font)', background: 'var(--bg)' }}>
      {/* Navbar */}
      <nav style={{
        background: 'white', borderBottom: '1px solid var(--border)',
        padding: '0 2rem', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100, boxShadow: 'var(--shadow-xs)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 40, height: 40,
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-1px',
          }}>E</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--primary)', letterSpacing: '-0.03em' }}>ESG360</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: -2 }}>Smart BRSR Reporting</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-primary-esg" onClick={() => navigate('/login')}>
            <LogIn size={15} /> Sign In
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 50%, #0D3C28 100%)',
        padding: '6rem 2rem',
        position: 'relative', overflow: 'hidden',
        color: 'white',
        textAlign: 'center',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 70% 40%, rgba(22,140,131,0.2) 0%, transparent 60%)' }} />
        <div style={{ position: 'relative', maxWidth: 800, margin: '0 auto' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 99, padding: '0.35rem 1rem',
            fontSize: '0.78rem', fontWeight: 600, marginBottom: '1.5rem',
            color: 'rgba(255,255,255,0.9)',
          }}>
            BPUT Hackathon 2026 — Problem Statement 08
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, margin: '0 0 1rem', letterSpacing: '-0.03em', color: 'white' }}>
            ESG Compliance Made<br />
            <span style={{ color: '#7EDBB2' }}>Simple & Transparent</span>
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)', maxWidth: 580, margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
            ESG360 is a smart BRSR reporting and ESG compliance portal designed for infrastructure groups — enabling structured data collection, multi-tier consolidation, and SEBI-aligned reporting.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary-esg" style={{ background: 'white', color: 'var(--primary)', padding: '0.8rem 2.5rem', fontSize: '1rem' }} onClick={() => navigate('/login')}>
              Access Portal <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '5rem 2rem', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              Comprehensive ESG Management
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 540, margin: '0 auto' }}>
              Built on the SEBI BRSR framework, ESG360 supports the complete reporting lifecycle — from data entry to consolidated group-level reports.
            </p>
          </div>
          <div className="grid-4" style={{ gap: '1.5rem' }}>
            {FEATURES.map((f) => (
              <div key={f.title} className="esg-card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
                <div style={{
                  width: 60, height: 60,
                  background: 'linear-gradient(135deg, var(--secondary) 0%, #C8E0D0 100%)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                  color: 'var(--primary)',
                }}>
                  <f.icon size={26} />
                </div>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.6rem' }}>{f.title}</h3>
                <p style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Organization Hierarchy */}
      <section style={{ padding: '5rem 2rem', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>Multi-Tier Organization Hierarchy</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>
            ESG data is collected at every level and consolidated upward — ensuring accurate group-level reporting without double counting.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0', flexWrap: 'wrap' }}>
            {HIERARCHY.map((level, i) => (
              <div key={level} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  background: i === 0 ? 'var(--primary)' : 'var(--surface)',
                  border: `2px solid ${i === 0 ? 'var(--primary)' : 'var(--border)'}`,
                  color: i === 0 ? 'white' : 'var(--text-primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1.5rem',
                  fontWeight: 600, fontSize: '0.9rem',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <Building2 size={14} style={{ marginRight: 6 }} />
                  {level}
                </div>
                {i < HIERARCHY.length - 1 && (
                  <ArrowRight size={20} style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section style={{ padding: '5rem 2rem', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Structured Approval Workflow</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Every ESG record follows a traceable, auditable lifecycle.</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
            {['Draft', 'Submitted', 'Under Review', 'Validated', 'Approved', 'Consolidated', 'Reported'].map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  background: 'var(--surface)', border: '2px solid var(--border)',
                  borderRadius: 99, padding: '0.4rem 1rem',
                  fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)',
                }}>
                  {s}
                </div>
                {i < 6 && <ArrowRight size={14} style={{ margin: '0 0.25rem', color: 'var(--text-muted)' }} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
        padding: '4rem 2rem',
        textAlign: 'center', color: 'white',
      }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'white', marginBottom: '0.75rem' }}>
          Start Your ESG Journey Today
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '2rem', fontSize: '1rem' }}>
          Sign in to your organization account and begin collecting, validating, and reporting ESG data.
        </p>
        <button className="btn-primary-esg" style={{ background: 'white', color: 'var(--primary)', padding: '0.875rem 2.5rem', fontSize: '1rem' }} onClick={() => navigate('/login')}>
          Sign In to Portal <ArrowRight size={16} />
        </button>
      </section>
    </div>
  );
};

export default Landing;
