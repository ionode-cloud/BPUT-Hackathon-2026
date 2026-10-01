import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import Breadcrumbs from '../components/common/Breadcrumbs';
import { LoadingState } from '../components/common/States';
import api from '../services/api';

const COLORS = ['#176B45', '#3B5BDB', '#E8A23A', '#D9534F', '#168C83', '#7C3AED', '#10B981'];
const STATUS_COLORS = {
  Approved: '#176B45',
  Validated: '#0EA5E9',
  'Under Review': '#8B5CF6',
  Submitted: '#3B5BDB',
  'Correction Required': '#E8A23A',
  Draft: '#9DADA6',
};

const YEARS = [];
for (let y = 2020; y <= new Date().getFullYear() + 1; y++) YEARS.push(y.toString());

const Analytics = () => {
  const [data, setData] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ year: '', category: '', organization: '' });
  const [consolidation, setConsolidation] = useState(null);
  const [consLoading, setConsLoading] = useState(false);

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

  const handleConsolidate = async () => {
    if (!filters.year || !filters.organization) {
      alert('Select a year and an organization to run consolidation.');
      return;
    }
    setConsLoading(true);
    try {
      const res = await api.get('/analytics/consolidation', {
        params: { year: filters.year, targetOrgId: filters.organization },
      });
      setConsolidation(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Consolidation failed');
    } finally { setConsLoading(false); }
  };

  return (
    <div className="fade-in">
      <Breadcrumbs items={[{ label: 'Analytics', path: '/analytics' }]} />
      <div className="page-header">
        <div className="d-flex justify-between align-center">
          <div>
            <h1 className="page-title">ESG Analytics</h1>
            <p className="page-subtitle">Data-driven insights from approved ESG records</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
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
          </div>
        </div>
      </div>

      {loading ? <LoadingState /> : (
        <>
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
                  <Line type="monotone" dataKey="Environmental" stroke="#176B45" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Social" stroke="#3B5BDB" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Governance" stroke="#E8A23A" strokeWidth={2} dot={{ r: 4 }} />
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

          {/* Consolidation Section */}
          <div className="esg-card">
            <div className="section-header" style={{ marginBottom: '1rem' }}>
              <div>
                <div className="section-title">Data Consolidation</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Aggregate approved ESG records across the organizational hierarchy</div>
              </div>
              <button className="btn-primary-esg" onClick={handleConsolidate} disabled={consLoading || !filters.organization || !filters.year}>
                {consLoading ? 'Consolidating...' : 'Run Consolidation'}
              </button>
            </div>
            {!filters.organization || !filters.year ? (
              <div className="info-box">ℹ Select a year and an organization from the filters above to run consolidation.</div>
            ) : null}
            {consolidation && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Consolidation for FY {consolidation.reportingYear} • {consolidation.organizationsIncluded} organizations included
                </div>
                <div className="table-wrapper">
                  <table className="table-esg">
                    <thead>
                      <tr><th>Category</th><th>Metric</th><th>Unit</th><th>Total Value</th><th>Records</th></tr>
                    </thead>
                    <tbody>
                      {consolidation.consolidatedData.map((row, i) => (
                        <tr key={i}>
                          <td>
                            <span style={{
                              background: row._id.category === 'Environmental' ? 'var(--success-bg)' : row._id.category === 'Social' ? '#E8F0FE' : 'var(--warning-bg)',
                              color: row._id.category === 'Environmental' ? 'var(--success)' : row._id.category === 'Social' ? '#3B5BDB' : 'var(--warning)',
                              padding: '0.15rem 0.5rem', borderRadius: 99, fontSize: '0.72rem', fontWeight: 600,
                            }}>{row._id.category}</span>
                          </td>
                          <td style={{ fontWeight: 500 }}>{row._id.metric}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{row._id.unit || '—'}</td>
                          <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{row.totalValue?.toLocaleString() || '—'}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
