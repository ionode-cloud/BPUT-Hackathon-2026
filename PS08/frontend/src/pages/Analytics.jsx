import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import {
  LuLeaf as Leaf,
  LuUsers as Users,
  LuAward as Award,
  LuShield as Shield,
  LuArrowRight as ArrowRight,
  LuCircleCheck as CheckCircle2,
  LuClock as Clock,
  LuChartBar as BarChart3,
  LuTrendingUp as TrendingUp
} from 'react-icons/lu';
import Breadcrumbs from '../components/common/Breadcrumbs';
import ExportDropdown from '../components/common/ExportDropdown';
import { exportAnalyticsToExcel, exportAnalyticsToPDF } from '../utils/exportUtils';
import { LoadingState } from '../components/common/States';
import api from '../services/api';

const COLORS = ['#F15A24', '#0284C7', '#059669', '#D97706', '#7C3AED', '#EC4899', '#14B8A6'];
const STATUS_COLORS = {
  Approved: '#059669',
  Validated: '#0284C7',
  'Under Review': '#7C3AED',
  Submitted: '#F15A24',
  'Correction Required': '#D97706',
  Draft: '#888888',
};

const YEARS = [];
for (let y = 2020; y <= new Date().getFullYear() + 1; y++) YEARS.push(y.toString());

const Analytics = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ year: '', category: '', organization: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics', { params: filters });
      setData(res.data.data);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filters]);
  useEffect(() => {
    api.get('/organizations', { params: { limit: 100 } }).then(r => setOrgs(r.data.data)).catch(() => {});
  }, []);

  // Year trend chart data
  const yearTrendData = (() => {
    if (!data?.yearTrend) return [];
    const years = [...new Set(data.yearTrend.map(d => d._id.year))].sort();
    const cats = ['Environmental', 'Social', 'Governance'];
    return years.map(y => {
      const row = { year: y };
      cats.forEach(c => {
        const found = data.yearTrend.find(d => d._id.year === y && d._id.category === c);
        row[c] = found?.count || 0;
      });
      return row;
    });
  })();

  // Status breakdown chart data
  const statusChartData = (data?.statusBreakdown || []).map(s => ({
    name: s._id || 'Unknown',
    value: s.count || s.value || 0,
  }));

  // Department-wise stats & breakdown
  const deptStats = (() => {
    const defaultDepts = [
      { id: 'Environmental', title: 'Environmental Officer', icon: Leaf, color: '#059669', bg: 'rgba(5, 150, 105, 0.08)', metrics: 'GHG Emissions, Water, Energy, Waste' },
      { id: 'HR', title: 'HR Officer', icon: Users, color: '#2563EB', bg: 'rgba(37, 99, 235, 0.08)', metrics: 'Headcount, Diversity, Training Hours' },
      { id: 'Safety', title: 'Safety Officer', icon: Award, color: '#EA580C', bg: 'rgba(234, 88, 12, 0.08)', metrics: 'Accidents, Near Misses, OHS Drills' },
      { id: 'Compliance', title: 'Compliance Officer', icon: Shield, color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.08)', metrics: 'Policies, Audits, Whistleblower, CSR' },
    ];

    const raw = data?.departmentBreakdown || [];
    return defaultDepts.map(dept => {
      const records = raw.filter(r => r._id?.department === dept.id);
      const total = records.reduce((sum, r) => sum + (r.count || 0), 0);
      const approved = records.filter(r => r._id?.status === 'Approved').reduce((sum, r) => sum + (r.count || 0), 0);
      const inReview = records.filter(r => ['Under Review', 'Validated'].includes(r._id?.status)).reduce((sum, r) => sum + (r.count || 0), 0);
      const pending = records.filter(r => ['Submitted', 'Draft', 'Correction Required'].includes(r._id?.status)).reduce((sum, r) => sum + (r.count || 0), 0);
      const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
      return { ...dept, total, approved, inReview, pending, pct };
    });
  })();



  return (
    <div className="fade-in">
      <Breadcrumbs items={[{ label: 'Analytics', path: '/analytics' }]} />
      <div className="page-header">
        <div className="d-flex justify-between align-center flex-wrap" style={{ gap: '0.75rem' }}>
          <div>
            <h1 className="page-title">ESG Analytics</h1>
            <p className="page-subtitle">Data-driven insights from approved ESG records</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="filter-select" value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}>
              <option value="">All Years</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="filter-select" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
              <option value="">All Categories</option>
              {['Environmental', 'Social', 'Governance'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="filter-select" value={filters.organization} onChange={e => setFilters(f => ({ ...f, organization: e.target.value }))}>
              <option value="">All Organizations</option>
              {orgs.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
            </select>
            <ExportDropdown
              onExportExcel={() => exportAnalyticsToExcel(data, filters, orgs)}
              onExportPDF={() => exportAnalyticsToPDF(data, filters, orgs)}
              totalRecords={data?.orgBreakdown?.length || 0}
              label="Download Analytics"
            />
          </div>
        </div>
      </div>

      {loading ? <LoadingState /> : (
        <>
          {/* Department-wise Collection & Progress Overview */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }}></span>
                  Department-wise ESG Collection &amp; Review Progress
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Distributed data collection across MEIL departments &amp; reporting officers
                </span>
              </div>
              <button
                className="btn-outline-esg btn-sm"
                onClick={() => navigate('/data-collection')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
              >
                Go to Data Collection <ArrowRight size={13} />
              </button>
            </div>

            <div className="grid-4" style={{ gap: '1rem' }}>
              {deptStats.map(dept => {
                const Icon = dept.icon;
                return (
                  <div
                    key={dept.id}
                    className="esg-card"
                    style={{
                      padding: '1.15rem',
                      borderRadius: 'var(--radius)',
                      borderTop: `3px solid ${dept.color}`,
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate(`/data-collection?dept=${dept.id}`)}
                    title={`Click to view data collection for ${dept.title}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 8,
                          background: dept.bg, color: dept.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                            {dept.title}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {dept.metrics}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                      <div>
                        <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {dept.total}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.3rem' }}>
                          records
                        </span>
                      </div>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: dept.pct === 100 ? '#059669' : dept.color,
                      }}>
                        {dept.pct}% approved
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ height: 6, background: 'var(--border-light)', borderRadius: 99, overflow: 'hidden', marginBottom: '0.65rem' }}>
                      <div style={{
                        height: '100%',
                        width: `${dept.pct}%`,
                        background: dept.color,
                        borderRadius: 99,
                        transition: 'width 0.4s ease'
                      }} />
                    </div>

                    {/* Status Pill Counts */}
                    <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.7rem', flexWrap: 'wrap' }}>
                      <span style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669', padding: '0.15rem 0.4rem', borderRadius: 4, fontWeight: 600 }}>
                        ✓ {dept.approved} Appr
                      </span>
                      {dept.inReview > 0 && (
                        <span style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED', padding: '0.15rem 0.4rem', borderRadius: 4, fontWeight: 600 }}>
                          ⚡ {dept.inReview} Review
                        </span>
                      )}
                      {dept.pending > 0 && (
                        <span style={{ background: 'rgba(241, 90, 36, 0.1)', color: '#F15A24', padding: '0.15rem 0.4rem', borderRadius: 4, fontWeight: 600 }}>
                          ⏳ {dept.pending} Pend
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid-3" style={{ marginBottom: '1.75rem' }}>
            {/* Category Distribution */}
            <div className="chart-card">
              <div className="chart-title">Category Distribution</div>
              <div className="chart-subtitle">All records by ESG category</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={(data?.categoryBreakdown || []).reduce((acc, { _id, count }) => {
                      const existing = acc.find(a => a.name === _id.category);
                      if (existing) existing.value += count;
                      else acc.push({ name: _id.category, value: count });
                      return acc;
                    }, [])}
                    cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    dataKey="value" nameKey="name" paddingAngle={3}
                  >
                    {['Environmental', 'Social', 'Governance'].map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} formatter={v => <span style={{ fontSize: '0.75rem' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Status Breakdown */}
            <div className="chart-card">
              <div className="chart-title">Workflow Status</div>
              <div className="chart-subtitle">Records by current status</div>
              {statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%" cy="50%" outerRadius={80}
                      dataKey="value" nameKey="name"
                      paddingAngle={statusChartData.length > 1 ? 2 : 0}
                    >
                      {statusChartData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} records`, n]} />
                    <Legend iconSize={8} formatter={v => <span style={{ fontSize: '0.7rem' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No workflow records found
                </div>
              )}
            </div>

            {/* Top Organizations */}
            <div className="chart-card">
              <div className="chart-title">Top Reporting Organizations</div>
              <div className="chart-subtitle">By approved record count</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={(data?.orgBreakdown || []).slice(0, 6).map(o => ({
                    name: (o.orgName || 'N/A').slice(0, 12),
                    Records: o.count,
                  }))}
                  layout="vertical"
                  margin={{ top: 5, right: 15, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="Records" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Year Trend */}
          <div className="chart-card" style={{ marginBottom: '1.75rem' }}>
            <div className="chart-title">Year-over-Year ESG Trend</div>
            <div className="chart-subtitle">Approved records by category and reporting year</div>
            {yearTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={yearTrendData} margin={{ top: 5, right: 30, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend formatter={v => <span style={{ fontSize: '0.8rem' }}>{v}</span>} />
                  <Line type="monotone" dataKey="Environmental" stroke="#059669" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Social" stroke="#0284C7" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Governance" stroke="#F15A24" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No multi-year approved data found. Approve records across multiple years to see trends.
              </div>
            )}
          </div>

          {/* Top Metrics */}
          {(data?.topMetrics || []).length > 0 && (
            <div className="esg-card" style={{ marginBottom: '1.75rem' }}>
              <div className="section-title" style={{ marginBottom: '1rem' }}>Most Reported Metrics</div>
              <div className="table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
                <table className="table-esg">
                  <thead>
                    <tr><th>Metric</th><th>Category</th><th>Approved Records</th></tr>
                  </thead>
                  <tbody>
                    {(data?.topMetrics || []).map((m, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{m._id.metric}</td>
                        <td>
                          <span style={{
                            background: m._id.category === 'Environmental' ? 'var(--success-bg)' : m._id.category === 'Social' ? '#E8F0FE' : 'var(--warning-bg)',
                            color: m._id.category === 'Environmental' ? 'var(--success)' : m._id.category === 'Social' ? '#3B5BDB' : 'var(--warning)',
                            padding: '0.15rem 0.5rem', borderRadius: 99, fontSize: '0.72rem', fontWeight: 600,
                          }}>{m._id.category}</span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{m.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
};

export default Analytics;
