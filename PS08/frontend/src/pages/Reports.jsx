import { useState, useEffect } from 'react';
import {
  LuFileText as FileText,
  LuFileSpreadsheet as FileSpreadsheet,
  LuDownload as Download,
  LuRefreshCw as RefreshCw,
  LuFilter as Filter,
  LuSparkles as Sparkles,
  LuCircleCheck as CheckCircle2,
  LuShieldCheck as ShieldCheck,
  LuDatabase as Database,
  LuLeaf as Leaf,
  LuUsers as Users,
  LuShield as Shield
} from 'react-icons/lu';
import Breadcrumbs from '../components/common/Breadcrumbs';
import StatusBadge from '../components/common/StatusBadge';
import Pagination from '../components/common/Pagination';
import ExportDropdown from '../components/common/ExportDropdown';
import BRSR from './BRSR';
import api from '../services/api';
import {
  exportESGRecordsToExcel,
  exportESGRecordsToPDF,
  exportSingleRecordToPDF,
} from '../utils/exportUtils';
import { LoadingState, EmptyState } from '../components/common/States';

const CATEGORIES = ['All', 'Environmental', 'Social', 'Governance'];

const YEARS = [];
for (let y = 2020; y <= new Date().getFullYear() + 1; y++) YEARS.push(y.toString());

const Reports = () => {
  const [activeTab, setActiveTab] = useState('brsr'); // 'brsr' | 'domain'
  const [category, setCategory] = useState('All');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [organization, setOrganization] = useState('');
  const [status, setStatus] = useState('Approved');
  const [organizations, setOrganizations] = useState([]);

  // ESG Records State for Domain Reports
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  useEffect(() => {
    api.get('/organizations', { params: { limit: 100 } })
      .then(r => setOrganizations(r.data.data))
      .catch(() => {});
  }, []);

  const fetchDomainRecords = async (page = 1) => {
    if (activeTab !== 'domain') return;
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (category !== 'All') params.category = category;
      if (year) params.year = year;
      if (organization) params.organization = organization;
      if (status) params.status = status;

      const res = await api.get('/esg', { params });
      setRecords(res.data.data);
      setPagination(res.data.pagination);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'domain') {
      fetchDomainRecords(1);
    }
  }, [activeTab, category, year, organization, status]);

  const handleExportDomain = async (format, scope = 'all') => {
    setExporting(true);
    try {
      let exportData = records;
      if (scope === 'all') {
        const params = { page: 1, limit: 2000 };
        if (category !== 'All') params.category = category;
        if (year) params.year = year;
        if (organization) params.organization = organization;
        if (status) params.status = status;

        const res = await api.get('/esg', { params });
        exportData = res.data.data;
      }

      if (!exportData || exportData.length === 0) {
        alert('No ESG records found to export with the current criteria.');
        return;
      }

      const orgObj = organizations.find(o => o._id === organization);
      const options = {
        category: category,
        year: year,
        organizationName: orgObj ? `${orgObj.name} (${orgObj.type})` : 'All Scoped Organizations',
        status: status || 'All Statuses',
      };

      if (format === 'excel') {
        exportESGRecordsToExcel(exportData, options);
      } else if (format === 'pdf') {
        exportESGRecordsToPDF(exportData, options);
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to generate export file. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fade-in">
      <Breadcrumbs items={[{ label: 'Reports Hub', path: '/reports' }]} />

      {/* Top Header & Navigation Tabs */}
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <div className="d-flex justify-between align-center flex-wrap" style={{ gap: '0.75rem' }}>
          <div>
            <h1 className="page-title">ESG & Statutory Reports Hub</h1>
            <p className="page-subtitle">Generate, inspect, and download official SEBI BRSR filings and ESG performance dossiers</p>
          </div>
          <div className="tabs-esg" style={{ marginBottom: 0 }}>
            <button
              className={`tab-btn ${activeTab === 'brsr' ? 'active' : ''}`}
              onClick={() => setActiveTab('brsr')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
            >
              <FileText size={15} /> BRSR Statutory Reports
            </button>
            <button
              className={`tab-btn ${activeTab === 'domain' ? 'active' : ''}`}
              onClick={() => setActiveTab('domain')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
            >
              <Database size={15} /> ESG Domain Disclosures
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: BRSR Statutory Reports */}
      {activeTab === 'brsr' && (
        <BRSR />
      )}

      {/* Tab 2: ESG Domain Reports Generator */}
      {activeTab === 'domain' && (
        <div>
          {/* Quick Category Switcher */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            {[
              { id: 'All', title: 'Full ESG Dossier', desc: 'Consolidated E, S & G metrics', icon: Sparkles, color: 'var(--primary)', bg: 'var(--secondary)' },
              { id: 'Environmental', title: 'Environmental Report', desc: 'Emissions, Energy, Water & Waste', icon: Leaf, color: '#059669', bg: '#DCFCE7' },
              { id: 'Social', title: 'Social Report', desc: 'Workforce, Health, OHS & CSR', icon: Users, color: '#0284C7', bg: '#E0F2FE' },
              { id: 'Governance', title: 'Governance Report', desc: 'Board, Ethics & Compliance', icon: Shield, color: '#7C3AED', bg: '#F3E8FF' },
            ].map(item => {
              const Icon = item.icon;
              const isSelected = category === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setCategory(item.id)}
                  style={{
                    cursor: 'pointer',
                    background: isSelected ? '#FFFFFF' : '#FAFAFA',
                    border: `2px solid ${isSelected ? item.color : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    boxShadow: isSelected ? 'var(--shadow-md)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={16} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {item.title}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {item.desc}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filters Bar & Prominent Export Actions */}
          <div className="filters-bar" style={{ marginBottom: '1.25rem', alignItems: 'center' }}>
            <select
              className="filter-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c === 'All' ? 'All ESG Domains' : `${c} Only`}</option>)}
            </select>

            <select
              className="filter-select"
              value={organization}
              onChange={e => setOrganization(e.target.value)}
            >
              <option value="">All Organizations</option>
              {organizations.map(o => (
                <option key={o._id} value={o._id}>{o.name} ({o.type})</option>
              ))}
            </select>

            <select
              className="filter-select"
              value={year}
              onChange={e => setYear(e.target.value)}
            >
              <option value="">All Years</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            <select
              className="filter-select"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Approved">Approved Only (Statutory Ready)</option>
              <option value="Validated">Validated</option>
              <option value="Under Review">Under Review</option>
              <option value="Submitted">Submitted</option>
              <option value="Draft">Draft</option>
            </select>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <ExportDropdown
                onExportExcel={(scope) => handleExportDomain('excel', scope)}
                onExportPDF={(scope) => handleExportDomain('pdf', scope)}
                loading={exporting}
                totalRecords={pagination.total || records.length}
                label="Download Report"
              />
            </div>
          </div>

          {/* Live Data Preview Table */}
          {loading ? (
            <LoadingState />
          ) : records.length === 0 ? (
            <div className="esg-card">
              <EmptyState
                icon={<FileText size={48} />}
                title="No records match current report filters"
                message="Select another category, reporting year, or change status to preview and export data."
              />
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="table-esg">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Metric Name</th>
                      <th>Category</th>
                      <th>Organization</th>
                      <th>Reporting Period</th>
                      <th>Disclosed Value</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={r._id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{i + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.metric}</div>
                          {r.subcategory && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.subcategory}</div>}
                        </td>
                        <td><StatusBadge status={r.category} /></td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.organization?.name || '—'}</td>
                        <td style={{ fontSize: '0.8rem' }}>
                          {r.reportingPeriod?.year} {r.reportingPeriod?.quarter !== 'Annual' && `(${r.reportingPeriod?.quarter})`}
                        </td>
                        <td>
                          <span style={{ fontWeight: 700 }}>{r.value}</span>
                          {r.unit && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> {r.unit}</span>}
                        </td>
                        <td><StatusBadge status={r.status} /></td>
                        <td>
                          <button
                            type="button"
                            className="btn-secondary-esg btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#DC2626' }}
                            onClick={() => exportSingleRecordToPDF(r)}
                            title="Download PDF Verification Slip"
                          >
                            <Download size={12} /> PDF Slip
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={pagination.page}
                pages={pagination.pages}
                total={pagination.total}
                onPageChange={(p) => fetchDomainRecords(p)}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;
