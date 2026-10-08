import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  LuPlus as Plus,
  LuSearch as Search,
  LuFilter as Filter,
  LuEye as Eye,
  LuTrash2 as Trash2,
  LuSend as Send,
  LuX as X,
  LuShieldCheck as ShieldCheck,
  LuCircleCheck as CheckCircle2,
  LuDownload as Download,
  LuFileSpreadsheet as FileSpreadsheet,
  LuFileText as FileText,
  LuLeaf as Leaf,
  LuUsers as Users,
  LuShield as Shield,
  LuAward as Award,
  LuLock as Lock,
  LuExternalLink as ExternalLink,
  LuPaperclip as Paperclip,
  LuArrowRight as ArrowRight,
  LuBuilding2 as Building2,
  LuCheck as Check,
  LuRefreshCw as RefreshCw,
  LuSparkles as Sparkles
} from 'react-icons/lu';
import {
  FiEdit2 as Edit2,
  FiUploadCloud as UploadCloud,
  FiAlertCircle as AlertCircle,
  FiAlertTriangle as AlertTriangle
} from 'react-icons/fi';
import Breadcrumbs from '../components/common/Breadcrumbs';
import StatusBadge from '../components/common/StatusBadge';
import Pagination from '../components/common/Pagination';
import ConfirmDialog from '../components/common/ConfirmDialog';
import ReviewActionModal from '../components/common/ReviewActionModal';
import ExportDropdown from '../components/common/ExportDropdown';
import { exportESGRecordsToExcel, exportESGRecordsToPDF, exportSingleRecordToPDF } from '../utils/exportUtils';
import { LoadingState, EmptyState } from '../components/common/States';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const DEPARTMENTS = [
  { id: 'ALL', label: 'All Departments', icon: Building2 },
  { id: 'Environmental', label: 'Environmental Officer', icon: Leaf, color: '#059669' },
  { id: 'HR', label: 'HR Officer', icon: Users, color: '#2563EB' },
  { id: 'Safety', label: 'Safety Officer', icon: Award, color: '#EA580C' },
  { id: 'Compliance', label: 'Compliance Officer', icon: Shield, color: '#7C3AED' },
];

const SECTORS = [
  'Transportation',
  'Water',
  'Irrigation',
  'Power',
  'Oil & Gas',
  'Construction',
  'Renewable Energy',
  'Other',
];

const YEARS = [];
for (let y = 2020; y <= new Date().getFullYear() + 1; y++) YEARS.push(y.toString());

const STATUSES = ['Draft', 'Submitted', 'Under Review', 'Validated', 'Correction Required', 'Approved', 'Rejected'];

const DEPARTMENT_METRICS = {
  Environmental: [
    'Scope 1 GHG Emissions',
    'Scope 2 GHG Emissions',
    'Scope 3 GHG Emissions',
    'Total Water Withdrawal',
    'Water Recycled/Reused',
    'Total Energy Consumption',
    'Electricity Consumption',
    'Fuel Consumption',
    'Renewable Energy Consumed',
    'Renewable Energy Generated',
    'Total Waste Generated',
    'Hazardous Waste',
    'Non-Hazardous Waste',
    'Waste Recycled',
    'Environmental Incidents',
  ],
  HR: [
    'Total Employees',
    'Permanent Employees',
    'Contractual Employees',
    'Female Employees',
    'Male Employees',
    'New Hires',
    'Employee Turnover',
    'Women in Leadership',
    'Training Hours',
    'Employees Trained',
    'Employees with Health Insurance',
    'Employees with Provident Fund',
  ],
  Safety: [
    'Lost Time Injury Rate',
    'Total Recordable Incidents',
    'Fatalities',
    'Near Misses',
    'Health & Safety Training Hours',
    'Safety Drills Conducted',
    'Safety Committee Meetings',
  ],
  Compliance: [
    'Ethics Policy Coverage',
    'Anti-Corruption Training Completion',
    'Corruption Cases Reported',
    'Whistleblower Complaints Received',
    'Whistleblower Complaints Resolved',
    'Regulatory Non-Compliances',
    'Regulatory Fines Paid',
    'Data Breaches',
    'CSR Expenditure',
  ],
};

const UNITS = [
  'KL', 'ML', 'kWh', 'MWh', 'GJ', 'MT', 'Tonnes', 'tCO2e', 'Nos.',
  'Hours', '%', 'INR Lakhs', 'INR Crores', 'Per 1000 workers', 'Other'
];

// ─────────────────────────────────────────────────────────────
// PROJECT CREATION MODAL
// ─────────────────────────────────────────────────────────────
const ProjectModal = ({ isOpen, onClose, onCreated, organizations }) => {
  const [form, setForm] = useState({
    projectName: '',
    sector: 'Transportation',
    state: '',
    district: '',
    address: '',
    businessUnit: '',
    subsidiary: '',
    reportingYear: new Date().getFullYear().toString(),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.projectName) {
      setError('Project Name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        projectName: form.projectName,
        sector: form.sector,
        reportingYear: form.reportingYear,
        businessUnit: form.businessUnit || undefined,
        subsidiary: form.subsidiary || undefined,
        location: {
          state: form.state,
          district: form.district,
          address: form.address,
        },
      };
      const res = await api.post('/esg/projects', payload);
      onCreated(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  const buOptions = organizations.filter(o => o.type === 'Business Unit');
  const subOptions = organizations.filter(o => o.type === 'Subsidiary');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Create MEIL Operational Project</span>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-body">
            {error && <div className="alert-esg alert-danger">{error}</div>}

            <div style={{ padding: '0.65rem 0.85rem', background: '#FFF9F6', border: '1px solid #FFE5D9', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.78rem', color: '#9A3412', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={16} style={{ color: '#F15A24', flexShrink: 0 }} />
              <span><strong>Step 1: Project Creation:</strong> Distributed ESG collection links directly to individual MEIL project sites across transportation, water, irrigation, power, oil &amp; gas, and construction sectors.</span>
            </div>

            <div className="grid-2" style={{ gap: '1rem' }}>
              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Project Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-control-esg"
                  placeholder="e.g. Hyderabad Metro Line 2, Polavaram Left Canal"
                  value={form.projectName}
                  onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Sector Type <span className="required">*</span></label>
                <select
                  className="form-control-esg"
                  value={form.sector}
                  onChange={(e) => setForm({ ...form, sector: e.target.value })}
                >
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">State</label>
                <input
                  type="text"
                  className="form-control-esg"
                  placeholder="e.g. Telangana, Andhra Pradesh, Gujarat, Odisha"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </div>

              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">District</label>
                <input
                  type="text"
                  className="form-control-esg"
                  placeholder="e.g. Hyderabad, Krishna, Ahmedabad, Cuttack"
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                />
              </div>

              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Business Unit</label>
                <select
                  className="form-control-esg"
                  value={form.businessUnit}
                  onChange={(e) => setForm({ ...form, businessUnit: e.target.value })}
                >
                  <option value="">Select Business Unit (Optional)</option>
                  {buOptions.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>

              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Subsidiary</label>
                <select
                  className="form-control-esg"
                  value={form.subsidiary}
                  onChange={(e) => setForm({ ...form, subsidiary: e.target.value })}
                >
                  <option value="">Select Subsidiary (Optional)</option>
                  {subOptions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>

              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Reporting Financial Year</label>
                <select
                  className="form-control-esg"
                  value={form.reportingYear}
                  onChange={(e) => setForm({ ...form, reportingYear: e.target.value })}
                >
                  {YEARS.map(y => <option key={y} value={y}>FY {y}</option>)}
                </select>
              </div>

              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Site Address / Remarks</label>
                <input
                  type="text"
                  className="form-control-esg"
                  placeholder="Operational facility site location"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary-esg" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary-esg" disabled={saving}>
              {saving ? 'Creating Project...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// COMPREHENSIVE ESG FORM MODAL (WITH ALL COMMON FIELDS + EVIDENCE)
// ─────────────────────────────────────────────────────────────
const RecordFormModal = ({ record, onClose, onSaved, organizations, selectedDepartment }) => {
  const { user } = useAuth();

  // Determine initial department
  const initialDept = record?.department || (
    selectedDepartment && selectedDepartment !== 'ALL'
      ? selectedDepartment
      : record?.category === 'Social' ? 'HR'
      : record?.category === 'Governance' ? 'Compliance'
      : 'Environmental'
  );

  const [form, setForm] = useState({
    // Common Fields
    projectId: record?.projectId || '',
    projectName: record?.projectName || '',
    organization: record?.organization?._id || record?.organization || '',
    groupCompany: record?.groupCompany || 'MEIL Group (Megha Engineering & Infrastructures Ltd.)',
    subsidiaryName: record?.subsidiaryName || '',
    businessUnitName: record?.businessUnitName || '',
    sectorType: record?.sectorType || 'Transportation',
    state: record?.location?.state || '',
    district: record?.location?.district || '',
    reportingYear: record?.reportingPeriod?.year || new Date().getFullYear().toString(),
    reportingQuarter: record?.reportingPeriod?.quarter || 'Annual',
    reportingMonth: record?.reportingPeriod?.month || '',
    department: initialDept,
    category: record?.category || (initialDept === 'HR' ? 'Social' : initialDept === 'Compliance' ? 'Governance' : 'Environmental'),
    submittedByName: record?.submittedByName || user?.name || '',
    employeeId: record?.employeeId || user?.employeeId || 'MEIL-EMP-1042',
    designation: record?.designation || user?.designation || 'ESG Operations Officer',
    status: record?.status || 'Draft',
    // Metric fields
    metric: record?.metric || '',
    subcategory: record?.subcategory || '',
    value: record?.value !== undefined ? record.value : '',
    unit: record?.unit || 'KL',
    description: record?.description || '',
    dataSource: record?.dataSource || 'Utility Invoice / Telemetry Meter',
    remarks: record?.remarks || '',
    // Evidence attachments
    evidence: record?.evidence || [],
  });

  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState('');
  const [aiWarning, setAiWarning] = useState('');

  // Handle Organization Selection -> auto-populate Project & Location fields
  const handleOrgChange = (orgId) => {
    const org = organizations.find(o => o._id === orgId);
    if (org) {
      setForm(f => ({
        ...f,
        organization: orgId,
        projectId: org.projectId || (org.type === 'Project' ? org.name : f.projectId),
        projectName: org.type === 'Project' ? org.name : (f.projectName || org.name),
        sectorType: org.sector || org.industry || f.sectorType,
        state: org.location?.state || f.state,
        district: org.location?.district || f.district,
        subsidiaryName: org.subsidiaryName || (org.parent?.type === 'Subsidiary' ? org.parent.name : f.subsidiaryName),
        businessUnitName: org.businessUnitName || (org.parent?.type === 'Business Unit' ? org.parent.name : f.businessUnitName),
      }));
    } else {
      setForm(f => ({ ...f, organization: orgId }));
    }
  };

  // Handle Department Change -> update category and reset metric
  const handleDeptChange = (dept) => {
    const cat = dept === 'Environmental' ? 'Environmental' : dept === 'HR' ? 'Social' : dept === 'Safety' ? 'Social' : 'Governance';
    setForm(f => ({
      ...f,
      department: dept,
      category: cat,
      metric: '',
    }));
  };

  // Handle Evidence File Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'ESG Evidence');
      formData.append('description', `Audit evidence for ${form.metric || 'ESG metric'}`);
      if (form.organization) formData.append('organization', form.organization);

      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedDoc = res.data.data;
      const newEvidenceItem = {
        document: uploadedDoc._id,
        fileName: file.name,
        url: uploadedDoc.cloudinaryUrl,
        uploadedAt: new Date(),
      };

      setForm(f => ({
        ...f,
        evidence: [...f.evidence, newEvidenceItem],
      }));
    } catch (err) {
      console.warn('Backend file upload fallback:', err);
      // Fallback: create direct local blob/data preview for immediate testing
      const fakeUrl = URL.createObjectURL(file);
      const newEvidenceItem = {
        fileName: file.name,
        url: fakeUrl,
        uploadedAt: new Date(),
      };
      setForm(f => ({
        ...f,
        evidence: [...f.evidence, newEvidenceItem],
      }));
    } finally {
      setUploadingFile(false);
    }
  };

  // Save or Save & Submit
  const handleSave = async (submitAfter = false) => {
    if (!form.metric || !form.organization || form.value === '') {
      setError('Metric, Organization, and Value are required fields.');
      return;
    }

    setSaving(true);
    setError('');
    setAiWarning('');

    try {
      const payload = {
        ...form,
        value: isNaN(form.value) ? form.value : Number(form.value),
        category: form.category,
        department: form.department,
        reportingPeriod: {
          year: form.reportingYear,
          quarter: form.reportingQuarter,
          month: form.reportingMonth,
        },
        location: {
          state: form.state,
          district: form.district,
        },
        status: submitAfter ? 'Submitted' : (record?.status || 'Draft'),
      };

      let savedRecord;
      if (record?._id) {
        const res = await api.put(`/esg/${record._id}`, payload);
        savedRecord = res.data.data;
      } else {
        const res = await api.post('/esg', payload);
        savedRecord = res.data.data;
      }

      if (submitAfter && savedRecord?._id && savedRecord.status !== 'Submitted') {
        await api.put(`/esg/${savedRecord._id}/submit`);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save ESG record');
    } finally {
      setSaving(false);
    }
  };

  const metricsForDept = DEPARTMENT_METRICS[form.department] || DEPARTMENT_METRICS.Environmental;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-lg" style={{ maxWidth: '850px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="modal-title">
              {record?._id ? 'Edit Operational ESG Record' : 'New Distributed ESG Record'}
            </span>
            <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '99px', background: '#F15A2420', color: '#F15A24', fontWeight: 700 }}>
              MEIL ESG Form
            </span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="modal-body" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
          {error && <div className="alert-esg alert-danger">{error}</div>}

          {/* Correction Required Highlight */}
          {record?.status === 'Correction Required' && record?.correctionComment && (
            <div className="alert-esg alert-warning" style={{ marginBottom: '1.25rem', borderLeft: '4px solid #D97706' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                <AlertTriangle size={16} /> Reviewer Correction Request
              </div>
              <div>{record.correctionComment}</div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.4rem', opacity: 0.85 }}>
                Please adjust the operational metrics or attach requested audit evidence below, then click "Save &amp; Resubmit".
              </div>
            </div>
          )}

          {/* ── SECTION 1: PROJECT & HIERARCHY SCOPE ── */}
          <div style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Building2 size={14} /> 1. Project &amp; Organizational Scope (Common Fields)
            </div>

            <div className="grid-2" style={{ gap: '0.85rem' }}>
              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Operating Organization / Facility <span className="required">*</span></label>
                <select
                  className="form-control-esg"
                  value={form.organization}
                  onChange={(e) => handleOrgChange(e.target.value)}
                >
                  <option value="">Select Organization or Project</option>
                  {organizations.map(o => (
                    <option key={o._id} value={o._id}>{o.name} ({o.type}{o.sector ? ` • ${o.sector}` : ''})</option>
                  ))}
                </select>
              </div>

              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Project Name</label>
                <input
                  type="text"
                  className="form-control-esg"
                  placeholder="e.g. Bhadla 500MW Ultra Solar, Zojila Tunnel"
                  value={form.projectName}
                  onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                />
              </div>

              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Project ID</label>
                <input
                  type="text"
                  className="form-control-esg"
                  placeholder="e.g. PRJ-TRA-26-401"
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                />
              </div>

              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Sector Type</label>
                <select
                  className="form-control-esg"
                  value={form.sectorType}
                  onChange={(e) => setForm({ ...form, sectorType: e.target.value })}
                >
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">MEIL Group Company</label>
                <input
                  type="text"
                  className="form-control-esg"
                  value={form.groupCompany}
                  readOnly
                  style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}
                />
              </div>

              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Subsidiary / Business Unit</label>
                <input
                  type="text"
                  className="form-control-esg"
                  placeholder="Subsidiary or BU Name"
                  value={form.subsidiaryName || form.businessUnitName}
                  onChange={(e) => setForm({ ...form, subsidiaryName: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* ── SECTION 2: GEOGRAPHY & REPORTING PERIOD ── */}
          <div style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              📍 2. Location &amp; Reporting Period
            </div>

            <div className="grid-4" style={{ gap: '0.85rem' }}>
              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">State</label>
                <input
                  type="text"
                  className="form-control-esg"
                  placeholder="e.g. Telangana"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </div>

              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">District</label>
                <input
                  type="text"
                  className="form-control-esg"
                  placeholder="e.g. Hyderabad"
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                />
              </div>

              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Reporting Year <span className="required">*</span></label>
                <select
                  className="form-control-esg"
                  value={form.reportingYear}
                  onChange={(e) => setForm({ ...form, reportingYear: e.target.value })}
                >
                  {YEARS.map(y => <option key={y} value={y}>FY {y}</option>)}
                </select>
              </div>

              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Quarter / Month</label>
                <select
                  className="form-control-esg"
                  value={form.reportingQuarter}
                  onChange={(e) => setForm({ ...form, reportingQuarter: e.target.value })}
                >
                  {['Annual', 'Q1', 'Q2', 'Q3', 'Q4'].map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── SECTION 3: DEPARTMENT & SUBMITTER CREDENTIALS ── */}
          <div style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              👤 3. Department Role &amp; Submitter Credentials
            </div>

            <div className="grid-4" style={{ gap: '0.85rem' }}>
              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Department <span className="required">*</span></label>
                <select
                  className="form-control-esg"
                  value={form.department}
                  onChange={(e) => handleDeptChange(e.target.value)}
                >
                  <option value="Environmental">🌿 Environmental Officer</option>
                  <option value="HR">👥 HR Officer</option>
                  <option value="Safety">🦺 Safety Officer</option>
                  <option value="Compliance">⚖️ Compliance Officer</option>
                </select>
              </div>

              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Submitted By</label>
                <input
                  type="text"
                  className="form-control-esg"
                  value={form.submittedByName}
                  onChange={(e) => setForm({ ...form, submittedByName: e.target.value })}
                />
              </div>

              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Employee ID</label>
                <input
                  type="text"
                  className="form-control-esg"
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                />
              </div>

              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Designation</label>
                <input
                  type="text"
                  className="form-control-esg"
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* ── SECTION 4: OPERATIONAL METRIC & VALUE ── */}
          <div style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              📊 4. Operational Metric &amp; Measured Value
            </div>

            <div className="grid-2" style={{ gap: '0.85rem' }}>
              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Metric Name <span className="required">*</span></label>
                <select
                  className="form-control-esg"
                  value={form.metric}
                  onChange={(e) => setForm({ ...form, metric: e.target.value })}
                >
                  <option value="">Select {form.department} Metric</option>
                  {metricsForDept.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Sub-Category</label>
                <input
                  type="text"
                  className="form-control-esg"
                  placeholder="e.g. Scope 1 Diesel, Sewage Treated, OHS Drills"
                  value={form.subcategory}
                  onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                />
              </div>

              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Reported Value <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-control-esg"
                  placeholder="Numeric measured value (e.g. 12500)"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </div>

              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Measurement Unit <span className="required">*</span></label>
                <select
                  className="form-control-esg"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Data Source / Evidence Basis</label>
                <input
                  type="text"
                  className="form-control-esg"
                  placeholder="e.g. Discom Utility Bill, Flow Meter #3, HRMS Register"
                  value={form.dataSource}
                  onChange={(e) => setForm({ ...form, dataSource: e.target.value })}
                />
              </div>

              <div className="form-group-esg" style={{ marginBottom: 0 }}>
                <label className="form-label-esg">Remarks &amp; Explanations</label>
                <input
                  type="text"
                  className="form-control-esg"
                  placeholder="Additional context or operational explanation"
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* ── SECTION 5: AUDIT EVIDENCE & FILE ATTACHMENT AREA (OPEN IN NEW TAB) ── */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              🧾 5. Supporting Documents &amp; Audit Evidence Upload (Opens in New Tab)
            </div>

            <div style={{ padding: '1rem', background: '#F8FAFC', border: '1.5px dashed #CBD5E1', borderRadius: '10px', textAlign: 'center', marginBottom: '1rem' }}>
              <input
                type="file"
                id="evidence-file-input"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
              />
              <UploadCloud size={28} style={{ color: '#F15A24', margin: '0 auto 0.35rem', display: 'block' }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Upload Audit Evidence for Verification
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
                Attach lab test CEMS report, Discom utility invoices, or safety incident logs.
              </div>
              <label
                htmlFor="evidence-file-input"
                className="btn-secondary-esg btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
              >
                <Paperclip size={13} /> {uploadingFile ? 'Uploading Document...' : 'Select File from Device'}
              </label>
            </div>

            {/* Uploaded Evidence Files List */}
            {form.evidence && form.evidence.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Attached Documents ({form.evidence.length}):
                </div>
                {form.evidence.map((ev, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.85rem',
                      background: '#FFFFFF',
                      border: '1px solid var(--border-light)',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={16} style={{ color: '#0284C7' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {ev.fileName || 'Audit_Evidence.pdf'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      {/* Required: View Evidence in New Tab */}
                      <a
                        href={ev.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary-esg btn-sm"
                        style={{
                          textDecoration: 'none',
                          color: '#0284C7',
                          borderColor: '#BAE6FD',
                          background: '#F0F9FF',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.74rem',
                        }}
                        title="Open supporting file in new tab"
                      >
                        <ExternalLink size={12} /> Open in New Tab 🧾
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          setForm(f => ({
                            ...f,
                            evidence: f.evidence.filter((_, i) => i !== idx),
                          }));
                        }}
                        style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '2px' }}
                        title="Remove file"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary-esg" onClick={onClose}>Cancel</button>
          <button
            className="btn-secondary-esg"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            className="btn-primary-esg"
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            <Send size={14} /> {record?.status === 'Correction Required' ? 'Save & Resubmit' : 'Save & Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// VIEW RECORD MODAL (WITH AUDIT TRAIL & NEW TAB EVIDENCE VIEWER)
// ─────────────────────────────────────────────────────────────
const ViewModal = ({ record, onClose, onAction, isSuperAdmin, onEdit, onDelete, canEdit, canDelete }) => {
  const [comment, setComment] = useState('');
  const [acting, setActing] = useState(false);

  const handleAction = async (action) => {
    setActing(true);
    try {
      await onAction(record._id, action, comment);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setActing(false);
    }
  };

  if (!record) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="modal-title">ESG Audit Record: {record.metric}</span>
            <StatusBadge status={record.status} />
          </div>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="modal-body" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
          {/* Status Policy Banner */}
          {record.status === 'Approved' ? (
            <div style={{ padding: '0.65rem 0.85rem', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.78rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Lock size={15} style={{ color: '#16A34A', flexShrink: 0 }} />
              <span><strong>Immutable Record (Locked):</strong> This record has been approved by the authorized reviewer and is locked for statutory SEBI BRSR Core compliance.</span>
            </div>
          ) : ['Submitted', 'Under Review', 'Validated'].includes(record.status) ? (
            <div style={{ padding: '0.65rem 0.85rem', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.78rem', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <ShieldCheck size={15} style={{ color: '#2563EB', flexShrink: 0 }} />
              <span><strong>Read-Only Mode:</strong> This record has been submitted and cannot be modified. If updates are needed, an ESG Manager must raise a Correction Request.</span>
            </div>
          ) : null}

          <div className="grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
            {[
              ['Project Name', record.projectName || record.project?.name || record.organization?.name],
              ['Project ID', record.projectId || 'PRJ-MEIL-STD'],
              ['Sector Type', record.sectorType || 'Transportation'],
              ['MEIL Group', record.groupCompany || 'MEIL Group'],
              ['Department', `${record.department || record.category} Officer`],
              ['Metric Name', record.metric],
              ['Reported Value', `${record.value} ${record.unit || ''}`],
              ['Period', `FY ${record.reportingPeriod?.year} (${record.reportingPeriod?.quarter || 'Annual'})`],
              ['State / District', `${record.location?.state || 'India'} ${record.location?.district ? `• ${record.location.district}` : ''}`],
              ['Submitted By', `${record.submittedByName || record.submittedBy?.name || 'Officer'} (${record.employeeId || 'MEIL-EMP'})`],
              ['Designation', record.designation || 'ESG Specialist'],
              ['Data Source', record.dataSource || 'Operational Meter'],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>{k}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{v || '—'}</div>
              </div>
            ))}
          </div>

          {/* Evidence Documents Area with Open in New Tab Button */}
          {record.evidence && record.evidence.length > 0 && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                Attached Evidence Documents (Auditor Verification):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {record.evidence.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.65rem', background: '#FFFFFF', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                      <FileText size={14} style={{ color: '#0284C7' }} />
                      <span>{ev.fileName || `Evidence_Document_${i + 1}.pdf`}</span>
                    </div>
                    <a
                      href={ev.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary-esg btn-sm"
                      style={{ textDecoration: 'none', color: '#0284C7', background: '#F0F9FF', borderColor: '#BAE6FD', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem' }}
                    >
                      <ExternalLink size={12} /> View File in New Tab 🧾
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {record.correctionComment && (
            <div className="alert-esg alert-warning" style={{ marginTop: '1rem' }}>
              <strong>Correction Comment:</strong> {record.correctionComment}
            </div>
          )}

          {record.reviewComment && (
            <div className="alert-esg alert-info" style={{ marginTop: '1rem' }}>
              <strong>Review Comment:</strong> {record.reviewComment}
            </div>
          )}

          {/* Workflow history timeline */}
          {record.workflowHistory?.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>Immutable Audit Trail</div>
              <div className="workflow-timeline">
                {record.workflowHistory.slice().reverse().map((h, i) => (
                  <div key={i} className="timeline-item">
                    <div className={`timeline-dot ${h.status === 'Approved' ? 'approved' : h.status === 'Correction Required' ? 'correction' : h.status === 'Submitted' ? 'submitted' : 'default'}`}>
                      {h.status === 'Approved' ? '✓' : h.status === 'Correction Required' ? '!' : '→'}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-status">{h.status}</div>
                      <div className="timeline-meta">
                        {h.changedBy?.name || 'System'} • {new Date(h.changedAt).toLocaleString()}
                      </div>
                      {h.comment && <div className="timeline-comment">{h.comment}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isSuperAdmin && (
            <div style={{ marginTop: '1rem' }}>
              <label className="form-label-esg">Reviewer Action Comment</label>
              <textarea
                className="form-control-esg"
                rows={2}
                placeholder="Enter comments or explanation for approval / correction request..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <button className="btn-secondary-esg" onClick={onClose}>Close</button>
          <button
            type="button"
            className="btn-secondary-esg"
            onClick={() => exportSingleRecordToPDF(record)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <FileText size={13} style={{ color: '#DC2626' }} /> PDF Slip
          </button>

          {canEdit && (
            <button className="btn-secondary-esg" onClick={() => { onEdit(record); onClose(); }}>
              <Edit2 size={13} /> Edit Record
            </button>
          )}

          {canDelete && (
            <button
              className="btn-secondary-esg"
              style={{ color: 'var(--danger)', borderColor: '#FECACA' }}
              onClick={() => { onDelete(record); onClose(); }}
            >
              <Trash2 size={13} /> Delete Draft
            </button>
          )}

          {isSuperAdmin && (
            <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-danger-esg btn-sm"
                onClick={() => {
                  if (!comment.trim()) {
                    alert('Please enter a review comment explaining what correction is needed.');
                    return;
                  }
                  handleAction('correction');
                }}
                disabled={acting}
              >
                Raise Correction Request
              </button>
              <button
                type="button"
                className="btn-primary-esg btn-sm"
                onClick={() => handleAction('approve')}
                disabled={acting}
              >
                <CheckCircle2 size={13} /> Approve Record
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN DATA COLLECTION PAGE
// ─────────────────────────────────────────────────────────────
const DataCollection = ({ category: fixedCategory, defaultStatus }) => {
  const { isReviewer, isSuperAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlDept = searchParams.get('department') || 'ALL';
  const urlStatus = searchParams.get('status') || defaultStatus || '';
  const urlYear = searchParams.get('year') || new Date().getFullYear().toString();
  const urlOrg = searchParams.get('organization') || '';

  const [records, setRecords] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const [selectedDept, setSelectedDept] = useState(urlDept);
  const [filters, setFilters] = useState({
    status: urlStatus,
    year: urlYear,
    organization: urlOrg,
    search: '',
  });

  const [showForm, setShowForm] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Sync state if searchParams change
  useEffect(() => {
    setSelectedDept(searchParams.get('department') || 'ALL');
  }, [searchParams]);

  const fetchRecords = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 15, ...filters };
      if (selectedDept !== 'ALL') params.department = selectedDept;
      if (fixedCategory) params.category = fixedCategory;

      const res = await api.get('/esg', { params });
      setRecords(res.data.data);
      setPagination(res.data.pagination);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => {
    api.get('/organizations', { params: { limit: 100 } })
      .then(r => setOrganizations(r.data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchRecords(1);
  }, [filters, selectedDept]);

  const handleExport = async (format, scope = 'all') => {
    setExporting(true);
    try {
      let exportData = records;
      if (scope === 'all') {
        const params = { page: 1, limit: 2000, ...filters };
        if (selectedDept !== 'ALL') params.department = selectedDept;
        if (fixedCategory) params.category = fixedCategory;
        const res = await api.get('/esg', { params });
        exportData = res.data.data;
      }

      if (!exportData || exportData.length === 0) {
        alert('No records found to export with the current filters.');
        return;
      }

      const orgObj = organizations.find(o => o._id === filters.organization);
      const options = {
        category: selectedDept !== 'ALL' ? `${selectedDept} Officer` : 'All ESG Departments',
        year: filters.year,
        organizationName: orgObj ? `${orgObj.name} (${orgObj.type})` : 'All MEIL Organizations',
        status: filters.status || 'All Statuses',
      };

      if (format === 'excel') exportESGRecordsToExcel(exportData, options);
      else if (format === 'pdf') exportESGRecordsToPDF(exportData, options);
    } catch (err) {
      console.error(err);
      alert('Failed to generate export file.');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/esg/${deleteTarget._id}`);
      fetchRecords();
    } catch (e) {
      alert(e.response?.data?.message || 'Delete failed');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleSubmit = async (id) => {
    try {
      await api.put(`/esg/${id}/submit`);
      fetchRecords();
    } catch (e) {
      alert(e.response?.data?.message || 'Submit failed');
    }
  };

  const handleReviewAction = async (id, action, comment) => {
    await api.put(`/esg/${id}/review`, { action, comment });
    fetchRecords();
  };

  return (
    <div className="fade-in">
      <Breadcrumbs items={[{ label: 'ESG Data Collection', path: '/data-collection' }]} />

      {/* ─── 7-STEP WORKFLOW PIPELINE TRACKER ─── */}
      <div
        className="esg-card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          background: '#FFFFFF',
          border: '1px solid var(--border-light)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#F15A24', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            MEIL ESG Statutory Lifecycle Pipeline (7 Stages)
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Stage 2 Active • Distributed Department Collection
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.35rem' }}>
          {[
            { num: 1, name: 'Project Creation', action: () => setShowProjectModal(true), active: false, done: true },
            { num: 2, name: 'Department Data Entry', action: () => {}, active: true, done: false },
            { num: 3, name: 'Data Consolidation', action: () => navigate('/consolidation'), active: false, done: false },
            { num: 4, name: 'AI Validation Engine', action: () => navigate('/validation'), active: false, done: false },
            { num: 5, name: 'ESG Score Calculation', action: () => navigate('/consolidation'), active: false, done: false },
            { num: 6, name: 'BRSR Mapping', action: () => navigate('/brsr'), active: false, done: false },
            { num: 7, name: 'PDF Report Generation', action: () => navigate('/brsr'), active: false, done: false },
          ].map((st, i) => (
            <div key={st.num} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
              <div
                onClick={st.action}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  background: st.active ? '#F15A2415' : st.done ? '#05966915' : 'var(--bg)',
                  border: st.active ? '1.5px solid #F15A24' : st.done ? '1px solid #05966950' : '1px solid var(--border-light)',
                  cursor: 'pointer',
                  fontSize: '0.74rem',
                  fontWeight: st.active ? 700 : 500,
                  color: st.active ? '#F15A24' : st.done ? '#059669' : 'var(--text-secondary)',
                }}
              >
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: st.active ? '#F15A24' : st.done ? '#059669' : '#CBD5E1',
                    color: '#FFFFFF',
                    fontSize: '0.65rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                  }}
                >
                  {st.done ? '✓' : st.num}
                </span>
                <span>{st.name}</span>
              </div>
              {i < 6 && <ArrowRight size={12} style={{ color: '#CBD5E1', flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Page Header */}
      <div className="page-header">
        <div className="d-flex justify-between align-center flex-wrap" style={{ gap: '0.75rem' }}>
          <div>
            <h1 className="page-title">Department-wise Data Collection</h1>
            <p className="page-subtitle">
              Distributed operational data entry for Environmental, HR, Safety, and Compliance Officers with immutable audit trails.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <ExportDropdown
              onExportExcel={(scope) => handleExport('excel', scope)}
              onExportPDF={(scope) => handleExport('pdf', scope)}
              loading={exporting}
              totalRecords={pagination.total || records.length}
              label="Download Report"
            />

            <button
              className="btn-secondary-esg"
              onClick={() => setShowProjectModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Building2 size={15} /> + Create Project
            </button>

            <button
              className="btn-primary-esg"
              onClick={() => { setEditRecord(null); setShowForm(true); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={16} /> New ESG Record
            </button>
          </div>
        </div>
      </div>

      {/* ─── DEPARTMENT SELECTOR TABS ─── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {DEPARTMENTS.map((dept) => {
          const active = selectedDept === dept.id;
          return (
            <button
              key={dept.id}
              onClick={() => setSelectedDept(dept.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                border: active ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                background: active ? 'var(--primary)' : 'var(--surface)',
                color: active ? '#FFFFFF' : 'var(--text-primary)',
                fontWeight: active ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <dept.icon size={15} style={{ color: active ? '#FFFFFF' : dept.color || 'var(--text-secondary)' }} />
              <span>{dept.label}</span>
            </button>
          );
        })}

        <button
          onClick={() => navigate('/validation')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            border: '1.5px solid #F15A24',
            background: 'rgba(241, 90, 36, 0.08)',
            color: '#F15A24',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            marginLeft: 'auto',
            transition: 'all 0.15s ease',
          }}
          title="Open AI Validation & Anomaly Detection Engine"
        >
          <Sparkles size={15} />
          <span>AI Validation Engine</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="search-input-wrap">
          <Search size={14} className="search-icon" />
          <input
            placeholder="Search metric or project..."
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </div>

        <select
          className="filter-select"
          value={filters.organization}
          onChange={(e) => setFilters(f => ({ ...f, organization: e.target.value }))}
        >
          <option value="">All Projects &amp; Organizations</option>
          {organizations.map(org => (
            <option key={org._id} value={org._id}>{org.name} ({org.type})</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={filters.status}
          onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending Review (All)</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          className="filter-select"
          value={filters.year}
          onChange={(e) => setFilters(f => ({ ...f, year: e.target.value }))}
        >
          {YEARS.map(y => <option key={y} value={y}>FY {y}</option>)}
        </select>

        <button
          className="btn-secondary-esg btn-sm"
          onClick={() => {
            setSearchParams({});
            setSelectedDept('ALL');
            setFilters({
              search: '',
              status: '',
              year: new Date().getFullYear().toString(),
              organization: '',
            });
          }}
        >
          Clear
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingState />
      ) : records.length === 0 ? (
        <div className="esg-card">
          <EmptyState
            icon="📊"
            title="No ESG records found"
            message={`Start entering operational data for ${selectedDept !== 'ALL' ? selectedDept + ' Officer' : 'your facility'}.`}
            action={
              <button className="btn-primary-esg" onClick={() => setShowForm(true)}>
                <Plus size={14} /> Add Record
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table-esg">
              <thead>
                <tr>
                  <th>Metric Name</th>
                  <th>Department</th>
                  <th>Project / Org</th>
                  <th>Period</th>
                  <th>Reported Value</th>
                  <th>Status &amp; Policy</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const isCreator = r.submittedBy?._id === user?._id || r.submittedBy === user?._id || isSuperAdmin;
                  const isLocked = r.status === 'Approved';
                  const isReadOnly = ['Submitted', 'Under Review', 'Validated'].includes(r.status);
                  const canEdit = (r.status === 'Draft' || r.status === 'Correction Required') && (isCreator || isSuperAdmin);
                  const canDelete = r.status === 'Draft' && (isCreator || isSuperAdmin);

                  return (
                    <tr key={r._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.metric}</div>
                        {r.subcategory && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.subcategory}</div>}
                      </td>

                      <td>
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: r.department === 'Environmental' ? '#DCFCE7' : r.department === 'HR' ? '#DBEAFE' : r.department === 'Safety' ? '#FFEDD5' : '#F3E8FF',
                            color: r.department === 'Environmental' ? '#166534' : r.department === 'HR' ? '#1E40AF' : r.department === 'Safety' ? '#9A3412' : '#6B21A8',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                          }}
                        >
                          {r.department || r.category}
                        </span>
                      </td>

                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <div>{r.projectName || r.organization?.name || '—'}</div>
                        {r.projectId && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{r.projectId}</div>}
                      </td>

                      <td style={{ fontSize: '0.8rem' }}>
                        FY {r.reportingPeriod?.year}
                        {r.reportingPeriod?.quarter !== 'Annual' && (
                          <span style={{ color: 'var(--text-muted)' }}> / {r.reportingPeriod?.quarter}</span>
                        )}
                      </td>

                      <td>
                        <span style={{ fontWeight: 700 }}>{r.value}</span>
                        {r.unit && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.25rem' }}>{r.unit}</span>}
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <StatusBadge status={r.status} />
                          {isLocked && (
                            <span style={{ fontSize: '0.65rem', color: '#16A34A', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <Lock size={10} /> Locked
                            </span>
                          )}
                          {isReadOnly && (
                            <span style={{ fontSize: '0.65rem', color: '#2563EB', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <Eye size={10} /> Read-Only
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          <button
                            className="btn-secondary-esg btn-sm"
                            style={{ padding: '0.28rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => setViewRecord(r)}
                            title="View Record & Evidence"
                          >
                            <Eye size={13} />
                          </button>

                          {/* Quick New Tab Evidence Link */}
                          {r.evidence && r.evidence.length > 0 && (
                            <a
                              href={r.evidence[0].url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-secondary-esg btn-sm"
                              style={{ padding: '0.28rem 0.5rem', fontSize: '0.75rem', color: '#0284C7', textDecoration: 'none' }}
                              title="Open audit evidence document in new tab"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}

                          <button
                            className="btn-secondary-esg btn-sm"
                            style={{ padding: '0.28rem 0.5rem', fontSize: '0.75rem', color: '#0284C7' }}
                            onClick={() => exportSingleRecordToPDF(r)}
                            title="Download Record PDF Slip"
                          >
                            <Download size={13} />
                          </button>

                          {canEdit && (
                            <button
                              className="btn-secondary-esg btn-sm"
                              style={{ padding: '0.28rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => { setEditRecord(r); setShowForm(true); }}
                              title="Edit Draft / Update Record"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}

                          {r.status === 'Draft' && isCreator && (
                            <button
                              className="btn-primary-esg btn-sm"
                              style={{ padding: '0.28rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => handleSubmit(r._id)}
                              title="Submit for Approval"
                            >
                              <Send size={12} />
                            </button>
                          )}

                          {isSuperAdmin && (
                            <button
                              className="btn-secondary-esg btn-sm"
                              style={{ padding: '0.28rem 0.5rem', fontSize: '0.75rem', color: '#087F5B', borderColor: '#C3FAE8', background: '#E6FCF5' }}
                              onClick={() => setReviewTarget(r)}
                              title="Review / Correction Request"
                            >
                              <ShieldCheck size={13} /> Review
                            </button>
                          )}

                          {canDelete && (
                            <button
                              className="btn-secondary-esg btn-sm"
                              style={{ padding: '0.28rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: '#FECACA' }}
                              onClick={() => setDeleteTarget(r)}
                              title="Delete Draft"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            onPageChange={(p) => fetchRecords(p)}
          />
        </>
      )}

      {/* Project Creation Modal */}
      <ProjectModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        organizations={organizations}
        onCreated={(newProj) => {
          setOrganizations([newProj, ...organizations]);
          fetchRecords(1);
        }}
      />

      {/* ESG Form Modal */}
      {showForm && (
        <RecordFormModal
          record={editRecord}
          selectedDepartment={selectedDept}
          organizations={organizations}
          onClose={() => { setShowForm(false); setEditRecord(null); }}
          onSaved={() => fetchRecords(1)}
        />
      )}

      {/* View Modal */}
      {viewRecord && (
        <ViewModal
          record={viewRecord}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setViewRecord(null)}
          onAction={handleReviewAction}
          onEdit={(r) => { setEditRecord(r); setShowForm(true); }}
          onDelete={(r) => setDeleteTarget(r)}
          canEdit={(viewRecord.status === 'Draft' || viewRecord.status === 'Correction Required') && (viewRecord.submittedBy?._id === user?._id || viewRecord.submittedBy === user?._id || isSuperAdmin)}
          canDelete={viewRecord.status === 'Draft' && (viewRecord.submittedBy?._id === user?._id || viewRecord.submittedBy === user?._id || isSuperAdmin)}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Draft Record"
        message={`Delete "${deleteTarget?.metric}"? This draft record will be removed from your terminal.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText="Delete"
      />

      {isSuperAdmin && reviewTarget && (
        <ReviewActionModal
          isOpen={!!reviewTarget}
          onClose={() => setReviewTarget(null)}
          title="Review ESG Record"
          recordName={reviewTarget.metric}
          currentStatus={reviewTarget.status}
          initialAction={reviewTarget.status === 'Validated' ? 'approve' : reviewTarget.status === 'Under Review' ? 'validate' : 'under_review'}
          onConfirm={async (action, comment) => {
            await handleReviewAction(reviewTarget._id, action, comment);
            setReviewTarget(null);
          }}
        />
      )}
    </div>
  );
};

export default DataCollection;
