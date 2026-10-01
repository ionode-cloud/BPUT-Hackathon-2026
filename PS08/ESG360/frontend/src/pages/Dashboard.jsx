import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, CheckCircle2, Clock, AlertCircle, FileText, Leaf, Users, Shield, TrendingUp, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import KPICard from '../components/common/KPICard';
import { LoadingState } from '../components/common/States';
import StatusBadge from '../components/common/StatusBadge';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const COLORS = { Environmental: '#176B45', Social: '#3B5BDB', Governance: '#E8A23A' };
const STATUS_COLORS = ['#176B45', '#3B5BDB', '#E8A23A', '#D9534F', '#168C83', '#7C3AED'];
const WORKFLOW_COLORS = {
  Approved: '#176B45',
  Validated: '#0EA5E9',
  'Under Review': '#8B5CF6',
  Submitted: '#3B5BDB',
  'Correction Required': '#E8A23A',
  Draft: '#9DADA6',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const years = [];
  for (let y = 2020; y <= new Date().getFullYear() + 1; y++) years.push(y.toString());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, analyticsRes, recordsRes] = await Promise.all([
          api.get('/esg/dashboard', { params: { year } }),
          api.get('/analytics', { params: { year } }),
          api.get('/esg', { params: { limit: 5, year } }),
        ]);
        setStats(statsRes.data.data);
        setAnalytics(analyticsRes.data.data);
        setRecentRecords(recordsRes.data.data);
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [year]);

  // Prepare chart data
  const categoryChartData = analytics?.categoryBreakdown
    ? Object.entries(
        analytics.categoryBreakdown.reduce((acc, { _id, count }) => {
          if (!acc[_id.category]) acc[_id.category] = 0;
          acc[_id.category] += count;
          return acc;
        }, {})
      ).map(([name, value]) => ({ name, value }))
    : [];

  const statusChartData = (analytics?.statusBreakdown && analytics.statusBreakdown.length > 0)
    ? analytics.statusBreakdown.map(s => ({ name: s._id || 'Unknown', value: s.count || s.value || 0 }))
    : stats?.byStatus
    ? Object.entries(stats.byStatus).map(([name, value]) => ({ name, value }))
    : [];

  const orgChartData = (analytics?.orgBreakdown || []).slice(0, 6).map(o => ({
    name: o.orgName?.length > 14 ? o.orgName.slice(0, 14) + '…' : o.orgName || 'N/A',
    records: o.count,
  }));

  if (loading) return <LoadingState text="Loading dashboard..." />;

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="d-flex justify-between align-center">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              Welcome back, <strong>{user?.name}</strong> — {user?.role}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Reporting Year:</label>
            <select
              className="filter-select"
              value={year}
              onChange={e => setYear(e.target.value)}
              style={{ minWidth: 100 }}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: '1.75rem' }}>
        <KPICard
          title="Total ESG Records"
          value={stats?.total || 0}
          icon={Database}
          variant="primary"
          onClick={() => navigate(`/data-collection?year=${year}`)}
        />
        <KPICard
          title="Approved Records"
          value={stats?.approved || 0}
          icon={CheckCircle2}
          variant="success"
          onClick={() => navigate(`/data-collection?status=Approved&year=${year}`)}
        />
        <KPICard
          title="Pending Review"
          value={stats?.pending || 0}
          icon={Clock}
          variant="warning"
          onClick={() => navigate(`/data-collection?status=pending&year=${year}`)}
        />
        <KPICard
          title="Correction Required"
          value={stats?.correction || 0}
          icon={AlertCircle}
          variant="danger"
          onClick={() => navigate(`/data-collection?status=Correction Required&year=${year}`)}
        />
      </div>

      {/* Completion Row */}
      <div className="esg-card" style={{ marginBottom: '1.75rem' }}>
        <div className="d-flex justify-between align-center" style={{ marginBottom: '0.75rem' }}>
          <div>
            <div className="section-title">Reporting Completion</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Year {year} — Approved vs Total</div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>
            {stats?.completionPercentage || 0}%
          </div>
        </div>
        <div className="progress-esg">
          <div
            className={`progress-bar-esg ${(stats?.completionPercentage || 0) >= 80 ? 'success' : (stats?.completionPercentage || 0) >= 40 ? '' : 'warning'}`}
            style={{ width: `${stats?.completionPercentage || 0}%` }}
          />
        </div>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Draft', count: stats?.draft || 0, color: 'var(--text-muted)', status: 'Draft' },
            { label: 'Submitted', count: (stats?.byStatus?.['Submitted'] || 0), color: '#3B5BDB', status: 'Submitted' },
            { label: 'Under Review', count: (stats?.byStatus?.['Under Review'] || 0), color: 'var(--warning)', status: 'Under Review' },
            { label: 'Approved', count: stats?.approved || 0, color: 'var(--success)', status: 'Approved' },
            { label: 'Correction', count: stats?.correction || 0, color: 'var(--danger)', status: 'Correction Required' },
          ].map(s => (
            <div
              key={s.label}
              style={{ fontSize: '0.78rem', cursor: 'pointer' }}
              onClick={() => navigate(`/data-collection?status=${encodeURIComponent(s.status)}&year=${year}`)}
              title={`View ${s.label} records`}
            >
              <span style={{ color: 'var(--text-muted)' }}>{s.label}: </span>
              <span style={{ color: s.color, fontWeight: 600 }}>{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-3" style={{ marginBottom: '1.75rem' }}>
        {/* Category Distribution */}
        <div className="chart-card">
          <div className="chart-title">ESG Category Distribution</div>
          <div className="chart-subtitle">All records for {year}</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                dataKey="value" nameKey="name" paddingAngle={3}>
                {categoryChartData.map((entry, i) => (
                  <Cell key={i} fill={COLORS[entry.name] || STATUS_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
              <Legend iconSize={10} formatter={v => <span style={{ fontSize: '0.75rem' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Workflow Status */}
        <div className="chart-card">
          <div className="chart-title">Workflow Status</div>
          <div className="chart-subtitle">Current workflow status</div>
          {statusChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusChartData} cx="50%" cy="50%" outerRadius={75} dataKey="value" nameKey="name" paddingAngle={statusChartData.length > 1 ? 2 : 0}>
                  {statusChartData.map((entry, i) => (
                    <Cell key={i} fill={WORKFLOW_COLORS[entry.name] || STATUS_COLORS[i % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} records`, n]} />
                <Legend iconSize={8} formatter={v => <span style={{ fontSize: '0.7rem' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No workflow records for selected period
            </div>
          )}
        </div>

        {/* Top Organizations */}
        <div className="chart-card">
          <div className="chart-title">Records by Organization</div>
          <div className="chart-subtitle">Approved records by unit</div>
          {orgChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={orgChartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="records" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No approved records yet
            </div>
          )}
        </div>
      </div>

      {/* ESG Overview Cards */}
      <div className="grid-3" style={{ marginBottom: '1.75rem' }}>
        {[
          { cat: 'Environmental', icon: Leaf, color: '#176B45', bg: 'var(--success-bg)', metrics: ['Energy', 'Water', 'Waste', 'Emissions', 'Renewable'] },
          { cat: 'Social', icon: Users, color: '#3B5BDB', bg: '#E8F0FE', metrics: ['Employees', 'Diversity', 'Training', 'OHS', 'Community'] },
          { cat: 'Governance', icon: Shield, color: '#E8A23A', bg: 'var(--warning-bg)', metrics: ['Board Info', 'Policies', 'Ethics', 'Risk', 'Compliance'] },
        ].map(({ cat, icon: Icon, color, bg, metrics }) => {
          const catStats = analytics?.categoryBreakdown?.reduce((acc, { _id, count }) => {
            if (_id.category === cat) acc[_id.status] = (acc[_id.status] || 0) + count;
            return acc;
          }, {}) || {};
          const total = Object.values(catStats).reduce((a, b) => a + b, 0);
          return (
            <div key={cat} className="esg-card" style={{ borderTop: `3px solid ${color}` }}>
              <div className="metric-category-header">
                <div className={`metric-cat-icon`} style={{ background: bg }}>
                  <Icon size={22} style={{ color }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{cat}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{total} records</div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: '1.5rem', fontWeight: 700, color }}>
                  {catStats['Approved'] || 0}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {metrics.map(m => (
                  <span key={m} style={{
                    fontSize: '0.7rem', padding: '0.2rem 0.5rem',
                    background: bg, color, borderRadius: 99, fontWeight: 500,
                  }}>{m}</span>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {[
                  { label: 'Approved', val: catStats['Approved'] || 0, color: 'var(--success)' },
                  { label: 'Pending', val: (catStats['Submitted'] || 0) + (catStats['Under Review'] || 0), color: 'var(--warning)' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Records */}
      <div className="esg-card">
        <div className="section-header">
          <div className="section-title">Recent ESG Records</div>
          <a href="/data-collection" className="btn-secondary-esg btn-sm">View All</a>
        </div>
        {recentRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No records found for the selected period.
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
            <table className="table-esg">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Category</th>
                  <th>Organization</th>
                  <th>Period</th>
                  <th>Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.map(r => (
                  <tr key={r._id}>
                    <td style={{ fontWeight: 500 }}>{r.metric}</td>
                    <td><StatusBadge status={r.category} /></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {r.organization?.name || '—'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {r.reportingPeriod?.year} {r.reportingPeriod?.quarter !== 'Annual' ? r.reportingPeriod?.quarter : ''}
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.value} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{r.unit}</span></td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
