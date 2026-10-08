import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LuLayers as Layers,
  LuAward as Award,
  LuCircleCheck as CheckCircle2,
  LuArrowRight as ArrowRight,
  LuTrendingUp as TrendingUp,
  LuLeaf as Leaf,
  LuUsers as Users,
  LuShield as Shield,
  LuFileText as FileText,
  LuRefreshCw as RefreshCw,
  LuBuilding2 as Building2,
  LuCalendar as Calendar,
  LuChevronRight as ChevronRight,
  LuDownload as Download
} from 'react-icons/lu';
import { FiAlertTriangle as AlertTriangle } from 'react-icons/fi';
import Breadcrumbs from '../components/common/Breadcrumbs';
import StatusBadge from '../components/common/StatusBadge';
import { LoadingState, EmptyState } from '../components/common/States';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ConsolidationScoring = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const [consolidatedData, setConsolidatedData] = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const [activeDeptTab, setActiveDeptTab] = useState('environmental');

  // Fetch organizations
  useEffect(() => {
    api.get('/organizations', { params: { limit: 100 } })
      .then((res) => {
        setOrganizations(res.data.data);
        if (res.data.data.length > 0 && !selectedOrg) {
          // Default to first project or org
          const proj = res.data.data.find((o) => o.type === 'Project');
          if (proj) setSelectedOrg(proj._id);
        }
      })
      .catch(() => {});
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        organization: selectedOrg || undefined,
        year: selectedYear,
      };

      const [consRes, scoreRes] = await Promise.all([
        api.get('/esg/consolidated', { params }),
        api.get('/esg/score', { params }),
      ]);

      setConsolidatedData(consRes.data.data);
      setScoreData(scoreRes.data.data);
    } catch (err) {
      console.error('Failed to fetch consolidation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedOrg, selectedYear]);

  const depts = consolidatedData?.departments || {};
  const currentDept = depts[activeDeptTab] || { label: 'Department', records: [] };

  const ratingColor = scoreData?.color || '#059669';

  return (
    <div className="fade-in">
      <Breadcrumbs items={[{ label: 'Data Consolidation & ESG Scoring', path: '/consolidation' }]} />

      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div className="d-flex justify-between align-center flex-wrap" style={{ gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ padding: '0.2rem 0.55rem', borderRadius: '99px', background: 'rgba(5, 150, 105, 0.12)', color: '#059669', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em' }}>
                STAGE 4 &amp; 5 OF BRSR PIPELINE
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Multi-Department Dataset Rollup &amp; Automated Scoring
              </span>
            </div>
            <h1 className="page-title">ESG Consolidation &amp; Scoring Engine</h1>
            <p className="page-subtitle">
              Combines Environmental + HR + Safety + Governance data into one unified ESG dataset with composite scoring.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <button
              className="btn-secondary-esg"
              onClick={fetchData}
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
            </button>
            <button
              className="btn-primary-esg"
              onClick={() => navigate('/brsr')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              Proceed to BRSR Mapping <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Scope Selector Bar */}
      <div className="filters-bar" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          <Building2 size={16} style={{ color: '#F15A24' }} /> Consolidation Scope:
        </div>

        <select
          className="filter-select"
          value={selectedOrg}
          onChange={(e) => setSelectedOrg(e.target.value)}
          style={{ minWidth: '260px' }}
        >
          <option value="">All Operating Entities &amp; Projects</option>
          {organizations.map((org) => (
            <option key={org._id} value={org._id}>
              {org.name} ({org.type}{org.sector ? ` • ${org.sector}` : ''})
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          {['2024', '2025', '2026', '2027'].map((y) => (
            <option key={y} value={y}>FY {y} Reporting Period</option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <>
          {/* ─── ESG SCORECARD BANNER ─── */}
          <div
            className="esg-card"
            style={{
              padding: '1.75rem',
              marginBottom: '1.75rem',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top Tri-Color Executive Accent Bar */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #F15A24 0%, #0284C7 50%, #059669 100%)',
              }}
            />

            <div className="grid-3" style={{ gap: '2rem', alignItems: 'center' }}>
              {/* Overall Score Dial */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.5rem',
                  borderRight: '1px solid #E2E8F0',
                  paddingRight: '1.5rem',
                }}
              >
                <div
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: `conic-gradient(${ratingColor} ${scoreData?.finalScore || 0}%, #F1F5F9 0)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    flexShrink: 0,
                    boxShadow: `0 4px 14px ${ratingColor}25`,
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div
                    style={{
                      width: '82px',
                      height: '82px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'inset 0 2px 5px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                      {scoreData?.finalScore || 0}
                    </span>
                    <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 700, letterSpacing: '0.05em' }}>
                      OUT OF 100
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        background: (scoreData?.recordsEvaluated || 0) > 0 ? `${ratingColor}15` : '#F1F5F9',
                        color: (scoreData?.recordsEvaluated || 0) > 0 ? ratingColor : '#64748B',
                        border: `1px solid ${(scoreData?.recordsEvaluated || 0) > 0 ? `${ratingColor}40` : '#CBD5E1'}`,
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        letterSpacing: '0.05em',
                      }}
                    >
                      {scoreData?.rating || 'N/A'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
                      ESG Rating Grade
                    </span>
                  </div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0F172A' }}>
                    {scoreData?.band || 'Awaiting Approved Operational Records'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.3rem' }}>
                    Calculated from {scoreData?.recordsEvaluated || 0} approved records
                  </div>
                </div>
              </div>

              {/* Dimension Scores (E, S, G) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* Environmental */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    <span style={{ color: '#065F46', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Leaf size={13} style={{ color: '#059669' }} /> Environmental Score (40% Weight)
                    </span>
                    <span style={{ color: '#0F172A', fontWeight: 700 }}>
                      {scoreData?.environmentalScore?.score || 0} / 100
                    </span>
                  </div>
                  <div style={{ height: '7px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '99px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${scoreData?.environmentalScore?.score || 0}%`,
                        background: 'linear-gradient(90deg, #10B981, #059669)',
                        borderRadius: '99px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Social */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    <span style={{ color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Users size={13} style={{ color: '#2563EB' }} /> Social Score (30% Weight)
                    </span>
                    <span style={{ color: '#0F172A', fontWeight: 700 }}>
                      {scoreData?.socialScore?.score || 0} / 100
                    </span>
                  </div>
                  <div style={{ height: '7px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '99px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${scoreData?.socialScore?.score || 0}%`,
                        background: 'linear-gradient(90deg, #3B82F6, #2563EB)',
                        borderRadius: '99px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Governance */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    <span style={{ color: '#6B21A8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Shield size={13} style={{ color: '#7C3AED' }} /> Governance Score (30% Weight)
                    </span>
                    <span style={{ color: '#0F172A', fontWeight: 700 }}>
                      {scoreData?.governanceScore?.score || 0} / 100
                    </span>
                  </div>
                  <div style={{ height: '7px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '99px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${scoreData?.governanceScore?.score || 0}%`,
                        background: 'linear-gradient(90deg, #A855F7, #7C3AED)',
                        borderRadius: '99px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Sector Benchmark Comparison */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                  padding: '1.15rem',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#EA580C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  MEIL Sector Benchmark
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '0.3rem', color: '#0F172A' }}>
                  {scoreData?.sectorBenchmark?.industry || 'Infrastructure & Engineering'}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem', marginTop: '0.4rem' }}>
                  <span
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 800,
                      color: (scoreData?.recordsEvaluated || 0) > 0 ? '#0284C7' : '#64748B',
                    }}
                  >
                    {(scoreData?.recordsEvaluated || 0) > 0
                      ? `${(scoreData?.sectorBenchmark?.difference || 0) >= 0 ? '+' : ''}${Math.round(scoreData?.sectorBenchmark?.difference || 0)} pts`
                      : '0 pts'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    vs. Peer Avg ({scoreData?.sectorBenchmark?.peerAverage || 62.5})
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: (scoreData?.recordsEvaluated || 0) > 0 ? '#059669' : '#64748B',
                    marginTop: '0.35rem',
                    fontWeight: 600,
                  }}
                >
                  {(scoreData?.recordsEvaluated || 0) > 0
                    ? '✓ Outperforming sector average'
                    : 'Awaiting operational data for peer comparison'}
                </div>
              </div>
            </div>
          </div>

          {/* ─── 4 DEPARTMENTS CONSOLIDATION MATRIX ─── */}
          <div className="esg-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
            {/* Header Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', background: 'var(--bg)', overflowX: 'auto' }}>
              {[
                { id: 'environmental', label: 'Environmental Officer', icon: Leaf, count: depts.environmental?.count || 0, color: '#059669' },
                { id: 'hr', label: 'HR Officer', icon: Users, count: depts.hr?.count || 0, color: '#2563EB' },
                { id: 'safety', label: 'Safety Officer', icon: Award, count: depts.safety?.count || 0, color: '#EA580C' },
                { id: 'compliance', label: 'Compliance Officer', icon: Shield, count: depts.compliance?.count || 0, color: '#7C3AED' },
              ].map((tab) => {
                const active = activeDeptTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDeptTab(tab.id)}
                    style={{
                      padding: '1rem 1.25rem',
                      background: active ? '#FFFFFF' : 'transparent',
                      border: 'none',
                      borderBottom: active ? `3px solid ${tab.color}` : '3px solid transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      fontWeight: active ? 700 : 500,
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <tab.icon size={16} style={{ color: tab.color }} />
                    <span>{tab.label}</span>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '99px',
                        background: active ? `${tab.color}15` : 'rgba(0,0,0,0.06)',
                        color: active ? tab.color : 'inherit',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                      }}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Department Records Table */}
            <div style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Showing <strong>{currentDept.records?.length || 0}</strong> operational records collected from {currentDept.label}.
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn-secondary-esg btn-sm"
                    onClick={() => navigate(`/data-collection?department=${encodeURIComponent(activeDeptTab === 'environmental' ? 'Environmental' : activeDeptTab === 'hr' ? 'HR' : activeDeptTab === 'safety' ? 'Safety' : 'Compliance')}`)}
                  >
                    + Enter More {currentDept.label} Metrics
                  </button>
                </div>
              </div>

              {(!currentDept.records || currentDept.records.length === 0) ? (
                <EmptyState
                  icon="📋"
                  title={`No ${currentDept.label} Records Found`}
                  message={`No records have been uploaded for ${currentDept.label} for the selected scope.`}
                  action={
                    <button
                      className="btn-primary-esg"
                      onClick={() => navigate('/data-collection')}
                    >
                      Collect {currentDept.label} Data
                    </button>
                  }
                />
              ) : (
                <div className="table-wrapper">
                  <table className="table-esg">
                    <thead>
                      <tr>
                        <th>Metric Name</th>
                        <th>Project / Org</th>
                        <th>Reported Value</th>
                        <th>Reporting Period</th>
                        <th>Submitted By</th>
                        <th>Status</th>
                        <th>Audit Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentDept.records.map((rec) => (
                        <tr key={rec._id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{rec.metric}</div>
                            {rec.subcategory && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{rec.subcategory}</div>}
                          </td>
                          <td style={{ fontSize: '0.8rem' }}>
                            {rec.projectName || rec.organization?.name || 'MEIL Facility'}
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{rec.value}</span>
                            {rec.unit && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.25rem' }}>{rec.unit}</span>}
                          </td>
                          <td style={{ fontSize: '0.8rem' }}>
                            FY {rec.reportingPeriod?.year} {rec.reportingPeriod?.quarter !== 'Annual' ? `(${rec.reportingPeriod?.quarter})` : ''}
                          </td>
                          <td style={{ fontSize: '0.78rem' }}>
                            <div>{rec.submittedByName || rec.submittedBy?.name || 'Officer'}</div>
                            {rec.employeeId && <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{rec.employeeId}</div>}
                          </td>
                          <td>
                            <StatusBadge status={rec.status} />
                          </td>
                          <td>
                            {rec.evidence && rec.evidence.length > 0 ? (
                              <a
                                href={rec.evidence[0].url || `/uploads/${rec.evidence[0].fileName}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.75rem',
                                  color: '#0284C7',
                                  textDecoration: 'none',
                                  fontWeight: 600,
                                }}
                                title="Open supporting audit document in new tab"
                              >
                                🧾 View (New Tab)
                              </a>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ConsolidationScoring;
