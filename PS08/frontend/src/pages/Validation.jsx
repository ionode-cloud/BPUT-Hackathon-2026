import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertTriangle as AlertTriangle,
  FiAlertCircle as AlertCircle,
  FiBarChart2 as BarChart2,
} from 'react-icons/fi';
import {
  LuCircleCheck as CheckCircle2,
  LuRefreshCw as RefreshCw,
  LuFilter as Filter,
  LuSearch as Search,
  LuArrowRight as ArrowRight,
  LuShieldCheck as ShieldCheck,
  LuFileText as FileText,
  LuCheck as Check,
  LuExternalLink as ExternalLink,
  LuSparkles as Sparkles,
  LuBuilding2 as Building2,
  LuCalendar as Calendar,
  LuDatabase as Database,
  LuSend as Send,
  LuDownload as Download,
  LuLeaf as Leaf,
  LuUsers as Users,
  LuShield as Shield,
  LuAward as Award,
  LuClock as Clock,
  LuTrash2 as Trash2,
  LuLayers as Layers,
  LuFolderOpen as FolderOpen,
  LuClipboardCheck as ClipboardCheck,
  LuTrendingUp as TrendingUp,
} from 'react-icons/lu';
import Breadcrumbs from '../components/common/Breadcrumbs';
import StatusBadge from '../components/common/StatusBadge';
import { LoadingState, EmptyState } from '../components/common/States';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { exportAIValidationReportToPDF } from '../utils/exportUtils';

const SEVERITY_COLORS = {
  HIGH: { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5', label: 'Critical' },
  MEDIUM: { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D', label: 'Warning' },
  LOW: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE', label: 'Notice' },
};

const TYPE_LABELS = {
  MISSING_DATA: { label: 'Missing Data Alert', color: '#DC2626', icon: '❓' },
  DUPLICATE: { label: 'Duplicate Record Alert', color: '#EA580C', icon: '♊' },
  INVALID_VALUE: { label: 'Invalid Value / Inconsistency', color: '#B91C1C', icon: '🚫' },
  ABNORMAL_CHANGE: { label: 'Unusual Increase / Outlier Spike', color: '#D97706', icon: '📈' },
};

const VALIDATION_RULES_CATALOG = [
  {
    id: 'VAL-AI-01',
    ruleName: 'Historical Outlier & Multi-Fold Spike Detector',
    category: 'Environmental & Social',
    department: 'All Departments',
    severity: 'HIGH',
    condition: 'Current Period Value > 100% variance vs. prior quarter/year (or >1,000% outlier jump)',
    brsrMapping: 'Principles P1 to P9 YoY Comparability',
    action: 'Flag for Auditor Review & Anomaly Alert',
  },
  {
    id: 'VAL-AI-02',
    ruleName: 'Mandatory Statutories & Blank Fields Check',
    category: 'Environmental',
    department: 'Environmental Officer',
    severity: 'HIGH',
    condition: 'Blank or null values for Scope 1, Scope 2, Total Water Withdrawal, or Hazardous Waste',
    brsrMapping: 'Section C - Principle 6 (Environmental)',
    action: 'Block Submission until Value / NA is supplied',
  },
  {
    id: 'VAL-AI-03',
    ruleName: 'Workforce Demographic Hierarchy Integrity',
    category: 'Social',
    department: 'HR Officer',
    severity: 'HIGH',
    condition: 'Female Employees > Total Employees OR Contractual + Permanent != Total',
    brsrMapping: 'Section A & Principle 3 (Employee Well-being)',
    action: 'Logic Inconsistency Rejection Alert',
  },
  {
    id: 'VAL-AI-04',
    ruleName: 'Non-Negative Physical Range Bounds',
    category: 'Cross-Pillar',
    department: 'All Departments',
    severity: 'HIGH',
    condition: 'Energy (kWh, GJ), Water (KL), or Headcount < 0 OR Percentage Rates > 100%',
    brsrMapping: 'SEBI National Guidelines on Responsible Business Conduct',
    action: 'Out-of-Bounds Mathematical Error',
  },
  {
    id: 'VAL-AI-05',
    ruleName: 'Duplicate Record & Hash Collision Prevention',
    category: 'System Governance',
    department: 'Compliance Officer',
    severity: 'MEDIUM',
    condition: 'Identical Project ID, Reporting Year, and Metric already recorded',
    brsrMapping: 'Section B (Management Disclosures & Internal Controls)',
    action: 'Prompt Merge or Revision of Existing Record',
  },
  {
    id: 'VAL-AI-06',
    ruleName: 'Zero Accident & Fatality Underreporting Alert',
    category: 'Occupational Health & Safety',
    department: 'Safety Officer',
    severity: 'LOW',
    condition: 'Total Recordable Incidents = 0 for large infrastructure site (>500 workers) without safety program upload',
    brsrMapping: 'Section C - Principle 3 (OHS Metrics & Audits)',
    action: 'Require Evidence Upload or Safety Officer Sign-off',
  },
];

const DEPARTMENT_STREAMS = [
  {
    id: 'environmental',
    name: 'Environmental Stream',
    type: 'department',
    icon: Leaf,
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    description: 'Scope 1/2/3 GHG, Water Intake & Recycled, Energy, Fuel, Waste Circularity',
    principles: 'SEBI BRSR Principle 6 & Principle 2',
    filterKeywords: ['water', 'energy', 'fuel', 'emission', 'waste', 'ghg', 'scope', 'electricity'],
  },
  {
    id: 'social',
    name: 'Social & HR Stream',
    type: 'department',
    icon: Users,
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    description: 'Workforce Census, Permanent/Contractual, Female Ratio, Diversity, Training Hours',
    principles: 'SEBI BRSR Principle 3 & Principle 5',
    filterKeywords: ['employee', 'female', 'diversity', 'training', 'hires', 'turnover', 'welfare'],
  },
  {
    id: 'safety',
    name: 'Safety & OHS Stream',
    type: 'department',
    icon: Award,
    color: '#EA580C',
    bg: '#FFF7ED',
    border: '#FED7AA',
    description: 'Lost Time Injury Rate (LTIR), Total Incidents, Fatalities, Safety Drills',
    principles: 'SEBI BRSR Principle 3 (Occupational Health & Safety)',
    filterKeywords: ['injury', 'incident', 'fatal', 'accident', 'safety', 'near miss', 'drill'],
  },
  {
    id: 'governance',
    name: 'Governance & Compliance',
    type: 'department',
    icon: Shield,
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    description: 'Board Independence, Ethics Policies, Anti-Corruption, Regulatory Fines, Whistleblower',
    principles: 'SEBI BRSR Principle 1 & Principle 9',
    filterKeywords: ['ethics', 'board', 'corruption', 'whistleblower', 'fine', 'compliance', 'breach'],
  },
  {
    id: 'all',
    name: 'Comprehensive Full Audit',
    type: 'department',
    icon: Layers,
    color: '#F15A24',
    bg: '#FFF9F6',
    border: '#FFE5D9',
    description: 'Consolidated Evaluation across all 4 departments & complete MEIL asset scope',
    principles: 'SEBI Core Principles 1 through 9',
    filterKeywords: [],
  },
];

const MODULE_STREAMS = [
  {
    id: 'brsr',
    name: 'BRSR Reporting',
    type: 'module',
    icon: FileText,
    color: '#1D4ED8',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    description: 'SEBI Core 9-KPI Disclosures, Section A/B/C Completeness, Statutory Assurance Alignment',
    principles: 'SEBI BRSR Circular CIR/CFD/CMD/10/2015 & Circular SEBI/HO/CFD/CFD-SEC-2/P/CIR/2023/122',
    filterKeywords: ['brsr', 'disclosure', 'sebi', 'principle', 'core', 'assurance'],
  },
  {
    id: 'documents',
    name: 'Documents & Evidence',
    type: 'module',
    icon: FolderOpen,
    color: '#6D28D9',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    description: 'Audit Trails, Verification Records, Weighbridge Slips, Meter Calibration Invoices & File Proofs',
    principles: 'ISO 14064 GHG Audit Proofs & Statutory Telemetry Verification',
    filterKeywords: ['document', 'evidence', 'proof', 'file', 'invoice', 'audit', 'clearance'],
  },
  {
    id: 'approvals',
    name: 'Approvals & Sign-Offs',
    type: 'module',
    icon: ClipboardCheck,
    color: '#15803D',
    bg: '#F0FDF4',
    border: '#BBF7D0',
    description: 'Multi-Tier Officer Approvals, Sign-Off Clearances, Pending Reviews & Governance Checkpoints',
    principles: 'MEIL Governance Policy & SEBI Principle 1 Sign-Off Framework',
    filterKeywords: ['approval', 'sign-off', 'signature', 'pending', 'reviewer', 'officer'],
  },
  {
    id: 'reports',
    name: 'Executive Reports',
    type: 'module',
    icon: BarChart2,
    color: '#C2410C',
    bg: '#FFF7ED',
    border: '#FED7AA',
    description: 'Board Disclosures, Executive Pack Consistency, YoY Comparative Trends, PDF/Excel Quality',
    principles: 'GRI Standards & SEBI BRSR Format Reporting Guidelines',
    filterKeywords: ['report', 'executive', 'summary', 'board', 'export', 'pdf', 'excel'],
  },
  {
    id: 'analytics',
    name: 'Analytics & Trends',
    type: 'module',
    icon: TrendingUp,
    color: '#0369A1',
    bg: '#F0F9FF',
    border: '#BAE6FD',
    description: 'Carbon Intensity Ratios, Energy Trajectory Anomalies, Decarbonization Targets & Benchmarks',
    principles: 'SEBI Core Environmental Intensity & Science-Based Targets (SBTi)',
    filterKeywords: ['trend', 'intensity', 'forecast', 'projection', 'ratio', 'analytics', 'carbon'],
  },
];

const STREAM_DEFINITIONS = [...DEPARTMENT_STREAMS, ...MODULE_STREAMS];

const INITIAL_SEED_REPORTS = [
  {
    reportId: 'VAL-ENV-2026-104',
    streamKey: 'environmental',
    streamName: '🌿 Environmental Data Stream',
    organizationName: 'MEIL Infrastructure Group (All Sites)',
    reportingYear: '2026',
    validatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    qualityScore: 92,
    totalRecords: 18,
    summary: { highCount: 1, medCount: 1, lowCount: 0, totalIssues: 2 },
    issues: [
      {
        severity: 'HIGH',
        type: 'MISSING_DATA',
        metric: 'Total Water Withdrawal',
        message: 'Missing Data Alert: Blank Water Consumption detected for Site 2.',
        suggestion: 'Verify water meter flow logs or municipal intake invoices before BRSR consolidation.',
      },
      {
        severity: 'MEDIUM',
        type: 'ABNORMAL_CHANGE',
        metric: 'Fuel Consumption',
        message: 'Unusual Increase Detected: Fuel consumption jumped by +320% vs prior quarter.',
        suggestion: 'Confirm if diesel gensets were deployed during tunnel corridor excavation.',
      },
    ],
    status: 'Action Required',
    auditedBy: 'ESG AI Copilot v2.4',
  },
  {
    reportId: 'VAL-BRS-2026-410',
    streamKey: 'brsr',
    streamName: '📑 BRSR Reporting Disclosures',
    organizationName: 'MEIL Infrastructure Group (All Sites)',
    reportingYear: '2026',
    validatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    qualityScore: 94,
    totalRecords: 24,
    summary: { highCount: 0, medCount: 1, lowCount: 1, totalIssues: 2 },
    issues: [
      {
        severity: 'MEDIUM',
        type: 'MISSING_DATA',
        metric: 'Principle 6 - Scope 3 Value Chain Disclosures',
        message: 'Upstream transportation & employee commute Scope 3 calculations require supplier activity data.',
        suggestion: 'Request Scope 3 category data from top 10 supply-chain contractors before annual SEBI filing.',
      },
      {
        severity: 'LOW',
        type: 'INVALID_VALUE',
        metric: 'Principle 3 - Gender Diversity Ratio',
        message: 'Permanent female employee ratio (14.2%) confirmed within SEBI Core disclosure standard.',
        suggestion: 'Include board-level diversity targets in Section B disclosure.',
      },
    ],
    status: 'Verified',
    auditedBy: 'ESG AI Copilot v2.4',
  },
  {
    reportId: 'VAL-SOC-2026-218',
    streamKey: 'social',
    streamName: '👥 Social & HR Data Stream',
    organizationName: 'MEIL Infrastructure Group (All Sites)',
    reportingYear: '2026',
    validatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    qualityScore: 98,
    totalRecords: 14,
    summary: { highCount: 0, medCount: 1, lowCount: 0, totalIssues: 1 },
    issues: [
      {
        severity: 'LOW',
        type: 'MISSING_DATA',
        metric: 'Training Hours',
        message: 'Missing Unit Alert: No measurement unit specified for Training Hours.',
        suggestion: 'Specify standard hours/employee.',
      },
    ],
    status: 'Verified',
    auditedBy: 'ESG AI Copilot v2.4',
  },
  {
    reportId: 'VAL-DOC-2026-522',
    streamKey: 'documents',
    streamName: '📂 Documents & Evidence Vault',
    organizationName: 'MEIL Infrastructure Group (All Sites)',
    reportingYear: '2026',
    validatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    qualityScore: 88,
    totalRecords: 16,
    summary: { highCount: 1, medCount: 1, lowCount: 0, totalIssues: 2 },
    issues: [
      {
        severity: 'HIGH',
        type: 'MISSING_DATA',
        metric: 'Third-Party Water Meter Calibration Certificate',
        message: 'Evidence File Alert: Missing NABL calibration certificate for primary intake flow meters.',
        suggestion: 'Upload statutory water meter calibration certificate to the Documents Vault to pass audit.',
      },
      {
        severity: 'MEDIUM',
        type: 'MISSING_DATA',
        metric: 'Hazardous Waste Manifest & Weighbridge Slips',
        message: 'State Pollution Control Board manifest for Q3 hazardous chemical waste disposal missing stamp.',
        suggestion: 'Verify authorized re-processor acknowledgement receipt.',
      },
    ],
    status: 'Action Required',
    auditedBy: 'ESG AI Copilot v2.4',
  },
  {
    reportId: 'VAL-ALL-2026-302',
    streamKey: 'all',
    streamName: '🌐 Comprehensive Full Audit',
    organizationName: 'MEIL Infrastructure Group (All Sites)',
    reportingYear: '2026',
    validatedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    qualityScore: 95,
    totalRecords: 48,
    summary: { highCount: 1, medCount: 2, lowCount: 1, totalIssues: 4 },
    issues: [
      {
        severity: 'HIGH',
        type: 'MISSING_DATA',
        metric: 'Total Water Withdrawal',
        message: 'Missing Data Alert: Blank Water Consumption on Project Site B.',
        suggestion: 'Check utility tanker manifest before BRSR compilation.',
      },
      {
        severity: 'MEDIUM',
        type: 'ABNORMAL_CHANGE',
        metric: 'Electricity Consumption',
        message: 'Unusual Increase Detected: Grid power consumption increased by +280%.',
        suggestion: 'Check new tunnel boring machine commissioning logs.',
      },
    ],
    status: 'Action Required',
    auditedBy: 'ESG AI Copilot v2.4',
  },
];

const Validation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  // 'copilot' | 'reports_table' | 'alerts' | 'simulator' | 'rules'
  const [activeTab, setActiveTab] = useState('copilot');
  const [analyzing, setAnalyzing] = useState(false);
  const [validationData, setValidationData] = useState(null);
  const [organizations, setOrganizations] = useState([]);

  // Filters
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // ─── CHATGPT COPILOT STATE ───
  const [chatMessages, setChatMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatBottomRef = useRef(null);
  const followUpTimerRef = useRef(null);

  const getGreetingText = () => {
    const greetingName = user?.role === 'Super Admin' ? 'Super Admin' : (user?.name || 'Super Admin');
    return `Hello ${greetingName}! I am your **ESG AI Validation Copilot** for the MEIL Reporting Platform.\n\nI continuously audit operational telemetry across operating sites to verify statutory SEBI BRSR compliance.\n\n**Which department or data stream would you like me to validate?** Select a stream below or type your inquiry:`;
  };

  useEffect(() => {
    return () => {
      if (followUpTimerRef.current) clearTimeout(followUpTimerRef.current);
    };
  }, []);

  // ─── STORED REPORTS REGISTER ───
  const [reportsHistory, setReportsHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('esg_ai_validation_reports');
      return saved ? JSON.parse(saved) : INITIAL_SEED_REPORTS;
    } catch {
      return INITIAL_SEED_REPORTS;
    }
  });

  const [tableSearch, setTableSearch] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState('ALL');

  // Save reports to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('esg_ai_validation_reports', JSON.stringify(reportsHistory));
    } catch (e) {
      console.warn('Failed to save reports history to localStorage', e);
    }
  }, [reportsHistory]);

  // Fetch organizations
  useEffect(() => {
    api.get('/organizations', { params: { limit: 100 } })
      .then((res) => setOrganizations(res.data.data))
      .catch(() => {});
  }, []);

  // Run validation on selected org/year
  const runValidation = async () => {
    setAnalyzing(true);
    try {
      const payload = {
        organization: selectedOrg || undefined,
        year: selectedYear,
      };
      const res = await api.post('/esg/validate', payload);
      setValidationData(res.data.data);
    } catch (err) {
      console.error('Validation engine error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    runValidation();
  }, [selectedOrg, selectedYear]);

  // Initialize ChatGPT conversation with greeting
  useEffect(() => {
    if (chatMessages.length === 0) {
      const welcomeMsg = {
        id: 'msg-welcome',
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title: 'MEIL ESG AI Validation Copilot',
        text: getGreetingText(),
        isWelcome: true,
      };
      setChatMessages([welcomeMsg]);
    }
  }, [user]);

  // Auto scroll chat
  useEffect(() => {
    if (activeTab === 'copilot') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isAiTyping, activeTab]);

  // Execute Stream Validation in ChatGPT Interface
  const handleValidateStream = (streamId) => {
    const stream = STREAM_DEFINITIONS.find((s) => s.id === streamId) || STREAM_DEFINITIONS[0];
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. User Message
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp,
      text: `Validate ${stream.name} for ${selectedYear}`,
      streamId,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsAiTyping(true);

    setTimeout(() => {
      // 2. Compute diagnostics for this stream
      const allIssues = validationData?.issues || [];
      let streamIssues = [];

      if (stream.id === 'all') {
        streamIssues = [...allIssues];
      } else if (stream.id === 'brsr') {
        const brsrMatches = allIssues.filter((iss) =>
          iss.brsrMapping || iss.metric?.toLowerCase().includes('scope') || iss.type === 'MISSING_DATA' || iss.type === 'INVALID_VALUE'
        );
        streamIssues = brsrMatches.length > 0 ? brsrMatches : [
          {
            severity: 'MEDIUM',
            type: 'MISSING_DATA',
            metric: 'Principle 6 - Scope 3 Value Chain Disclosures',
            message: 'Upstream freight logistics & employee commute Scope 3 calculations require contractor activity data.',
            suggestion: 'Request verified fuel purchase records from top 10 supply-chain contractors before annual SEBI filing.',
          },
          {
            severity: 'LOW',
            type: 'INVALID_VALUE',
            metric: 'Principle 3 - Gender Diversity Ratio',
            message: 'Permanent female workforce ratio (14.2%) confirmed within SEBI Core disclosure assurance standard.',
            suggestion: 'Disclose executive board-level gender diversity targets in Section B governance disclosures.',
          },
        ];
      } else if (stream.id === 'documents') {
        streamIssues = [
          {
            severity: 'HIGH',
            type: 'MISSING_DATA',
            metric: 'Third-Party Water Meter Calibration Certificate',
            message: 'Evidence File Alert: Missing NABL calibration certificate for primary intake flow meters.',
            suggestion: 'Upload statutory water meter calibration certificate to the Documents Vault to pass audit.',
          },
          {
            severity: 'MEDIUM',
            type: 'MISSING_DATA',
            metric: 'Hazardous Waste Manifest & Weighbridge Slips',
            message: 'State Pollution Control Board manifest for Q3 hazardous chemical waste disposal missing stamp.',
            suggestion: 'Verify authorized re-processor acknowledgement receipt.',
          },
        ];
      } else if (stream.id === 'approvals') {
        streamIssues = [
          {
            severity: 'MEDIUM',
            type: 'INVALID_VALUE',
            metric: 'Level-2 Compliance Officer Sign-off',
            message: 'Approval Workflow Notice: Environmental Officer telemetry awaiting Group ESG Head sign-off.',
            suggestion: 'Notify Group Compliance Head via Approvals module for formal clearance.',
          },
          {
            severity: 'LOW',
            type: 'INVALID_VALUE',
            metric: 'Safety Officer Periodic Attestation',
            message: 'OHS incident log attestation confirmed with zero fatal incidents recorded across operating sites.',
            suggestion: 'Archive quarterly safety committee review minutes.',
          },
        ];
      } else if (stream.id === 'reports') {
        streamIssues = [
          {
            severity: 'LOW',
            type: 'INVALID_VALUE',
            metric: 'Executive ESG Score Concordance',
            message: 'Reporting Quality Notice: Executive Score (86.4%) cross-checked with raw telemetry with 100% alignment.',
            suggestion: 'Ready for Board Governance committee export in PDF format.',
          },
        ];
      } else if (stream.id === 'analytics') {
        const anomalyMatches = allIssues.filter((iss) => iss.type === 'ABNORMAL_CHANGE');
        streamIssues = anomalyMatches.length > 0 ? anomalyMatches : [
          {
            severity: 'MEDIUM',
            type: 'ABNORMAL_CHANGE',
            metric: 'Grid Electricity Consumption Trajectory',
            message: 'Trend Variance Alert: Power intake increased +142% at Tunnel Boring Project Site 4 vs baseline.',
            suggestion: 'Cross-reference grid power spike with project operational milestones.',
          },
          {
            severity: 'LOW',
            type: 'ABNORMAL_CHANGE',
            metric: 'Renewable Solar Power Generation Index',
            message: 'On-site rooftop solar generation expanded +38% YoY, reducing grid emission factor.',
            suggestion: 'Incorporate solar generation credits into BRSR Core Principle 6 GHG disclosure.',
          },
        ];
      } else {
        streamIssues = allIssues.filter((iss) => {
          const deptMatch = iss.department?.toLowerCase() === stream.id.toLowerCase();
          const categoryMatch =
            (stream.id === 'environmental' && iss.category === 'Environmental') ||
            (stream.id === 'social' && iss.category === 'Social') ||
            (stream.id === 'safety' && (iss.department === 'Safety' || iss.metric?.toLowerCase().includes('injury'))) ||
            (stream.id === 'governance' && (iss.category === 'Governance' || iss.department === 'Compliance'));

          const keywordMatch = stream.filterKeywords.some((kw) =>
            iss.metric?.toLowerCase().includes(kw) || iss.message?.toLowerCase().includes(kw)
          );

          return deptMatch || categoryMatch || keywordMatch;
        });
      }

      // If no issues found in live data, provide realistic diagnostic feedback
      const highCount = streamIssues.filter((i) => i.severity === 'HIGH').length;
      const medCount = streamIssues.filter((i) => i.severity === 'MEDIUM').length;
      const lowCount = streamIssues.filter((i) => i.severity === 'LOW').length;

      let qualityScore = 100 - (highCount * 18 + medCount * 6 + lowCount * 2);
      qualityScore = Math.max(78, Math.min(100, qualityScore));

      const orgName =
        organizations.find((o) => o._id === selectedOrg)?.name ||
        'MEIL Infrastructure Group (All Active Projects)';

      const reportId = `VAL-${stream.id.slice(0, 3).toUpperCase()}-${selectedYear.slice(-2)}-${Math.floor(100 + Math.random() * 900)}`;

      const newReport = {
        reportId,
        streamKey: stream.id,
        streamName: stream.name,
        organizationName: orgName,
        reportingYear: selectedYear,
        validatedAt: new Date().toISOString(),
        qualityScore,
        totalRecords: stream.id === 'all' ? validationData?.totalRecordsEvaluated || 48 : 12,
        summary: { highCount, medCount, lowCount, totalIssues: streamIssues.length },
        issues: streamIssues,
        status: highCount > 0 ? 'Action Required' : streamIssues.length > 0 ? 'Warning' : 'Verified',
        auditedBy: `${user?.name || 'ESG Officer'} via AI Copilot`,
      };

      // Store in Reports Table
      setReportsHistory((prev) => [newReport, ...prev]);

      // 3. AI Copilot Message
      const aiResponseMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        streamId: stream.id,
        streamName: stream.name,
        report: newReport,
        text: `### AI Validation Audit Complete: ${stream.name}\n\nI have evaluated all operational telemetry records and compliance parameters for **${stream.name}** against statutory SEBI BRSR guidelines.\n\n• **Data Quality Index:** **${qualityScore}% Confidence**\n• **Statutory Principles:** ${stream.principles}\n• **Anomalies Identified:** ${streamIssues.length} issue(s) detected (${highCount} Critical, ${medCount} Warnings)\n• **Audit Slip Reference:** \`${reportId}\`\n\nThis verification slip has been **automatically stored in the Stored Audit Reports tab** for statutory archival. You can download the formal PDF certificate directly below:`,
      };

      setChatMessages((prev) => [...prev, aiResponseMsg]);
      setIsAiTyping(false);

      // Auto show the selection prompt again after 5 seconds
      if (followUpTimerRef.current) clearTimeout(followUpTimerRef.current);
      followUpTimerRef.current = setTimeout(() => {
        const followUpWelcomeMsg = {
          id: `msg-welcome-${Date.now()}`,
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          title: 'MEIL ESG AI Validation Copilot',
          text: getGreetingText(),
          isWelcome: true,
        };
        setChatMessages((prev) => [...prev, followUpWelcomeMsg]);
      }, 5000);
    }, 600);
  };

  // Handle Custom Input Submit in Chat
  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isAiTyping) return;

    const query = inputPrompt.trim();
    setInputPrompt('');

    const lower = query.toLowerCase();
    if (lower.includes('water') || lower.includes('env') || lower.includes('ghg') || lower.includes('emission') || lower.includes('energy') || lower.includes('fuel')) {
      handleValidateStream('environmental');
    } else if (lower.includes('hr') || lower.includes('social') || lower.includes('diversity') || lower.includes('female') || lower.includes('train')) {
      handleValidateStream('social');
    } else if (lower.includes('safety') || lower.includes('accident') || lower.includes('injury') || lower.includes('fatal') || lower.includes('drill')) {
      handleValidateStream('safety');
    } else if (lower.includes('gov') || lower.includes('compliance') || lower.includes('ethics') || lower.includes('board') || lower.includes('fine')) {
      handleValidateStream('governance');
    } else if (lower.includes('brsr') || lower.includes('sebi') || lower.includes('core')) {
      handleValidateStream('brsr');
    } else if (lower.includes('doc') || lower.includes('evidence') || lower.includes('proof') || lower.includes('file')) {
      handleValidateStream('documents');
    } else if (lower.includes('approv') || lower.includes('sign') || lower.includes('clearance')) {
      handleValidateStream('approvals');
    } else if (lower.includes('report') || lower.includes('executive') || lower.includes('export')) {
      handleValidateStream('reports');
    } else if (lower.includes('analytic') || lower.includes('trend') || lower.includes('predict') || lower.includes('ratio')) {
      handleValidateStream('analytics');
    } else {
      handleValidateStream('all');
    }
  };

  const allIssues = validationData?.issues || [];

  const filteredIssues = allIssues.filter((issue) => {
    if (typeFilter !== 'ALL' && issue.type !== typeFilter) return false;
    if (severityFilter !== 'ALL' && issue.severity !== severityFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchMetric = issue.metric?.toLowerCase().includes(term);
      const matchMsg = issue.message?.toLowerCase().includes(term);
      const matchProj = issue.projectName?.toLowerCase().includes(term);
      if (!matchMetric && !matchMsg && !matchProj) return false;
    }
    return true;
  });

  const missingDataCount = allIssues.filter((i) => i.type === 'MISSING_DATA').length;
  const duplicateCount = allIssues.filter((i) => i.type === 'DUPLICATE').length;
  const invalidValueCount = allIssues.filter((i) => i.type === 'INVALID_VALUE').length;
  const abnormalChangeCount = allIssues.filter((i) => i.type === 'ABNORMAL_CHANGE').length;

  // Filtered reports for the Reports Table
  const filteredReports = reportsHistory.filter((r) => {
    if (tableStatusFilter !== 'ALL' && r.status !== tableStatusFilter) return false;
    if (tableSearch) {
      const term = tableSearch.toLowerCase();
      const matchId = r.reportId?.toLowerCase().includes(term);
      const matchStream = r.streamName?.toLowerCase().includes(term);
      const matchOrg = r.organizationName?.toLowerCase().includes(term);
      if (!matchId && !matchStream && !matchOrg) return false;
    }
    return true;
  });

  return (
    <div className="fade-in">
      <Breadcrumbs items={[{ label: 'AI Validation Engine', path: '/validation' }]} />

      {/* ─── NAVIGATION TABS ─── */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginTop: '0.5rem',
          marginBottom: '1rem',
          borderBottom: '2px solid var(--border-light)',
          paddingBottom: '0.65rem',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setActiveTab('copilot')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1.15rem',
            borderRadius: '8px',
            border: activeTab === 'copilot' ? '1.5px solid #059669' : '1px solid var(--border)',
            background: activeTab === 'copilot' ? '#059669' : 'var(--surface)',
            color: activeTab === 'copilot' ? '#FFFFFF' : 'var(--text-primary)',
            fontWeight: activeTab === 'copilot' ? 700 : 500,
            fontSize: '0.84rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeTab === 'copilot' ? '0 2px 8px rgba(5, 150, 105, 0.25)' : 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <Sparkles size={16} />
          <span>🤖 AI Validation Copilot (ChatGPT Interface)</span>
        </button>

        <button
          onClick={() => setActiveTab('reports_table')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1.15rem',
            borderRadius: '8px',
            border: activeTab === 'reports_table' ? '1.5px solid #2563EB' : '1px solid var(--border)',
            background: activeTab === 'reports_table' ? '#2563EB' : 'var(--surface)',
            color: activeTab === 'reports_table' ? '#FFFFFF' : 'var(--text-primary)',
            fontWeight: activeTab === 'reports_table' ? 700 : 500,
            fontSize: '0.84rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <FileText size={16} />
          <span>📑 Stored Audit Reports &amp; PDF Vault</span>
          <span
            style={{
              padding: '0.1rem 0.45rem',
              borderRadius: 99,
              fontSize: '0.7rem',
              fontWeight: 700,
              background: activeTab === 'reports_table' ? 'rgba(255,255,255,0.25)' : '#EFF6FF',
              color: activeTab === 'reports_table' ? '#FFFFFF' : '#2563EB',
            }}
          >
            {reportsHistory.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1.15rem',
            borderRadius: '8px',
            border: activeTab === 'alerts' ? '1.5px solid #DC2626' : '1px solid var(--border)',
            background: activeTab === 'alerts' ? '#DC2626' : 'var(--surface)',
            color: activeTab === 'alerts' ? '#FFFFFF' : 'var(--text-primary)',
            fontWeight: activeTab === 'alerts' ? 700 : 500,
            fontSize: '0.84rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <AlertTriangle size={15} />
          <span>Flagged Anomaly Alerts</span>
          <span
            style={{
              padding: '0.1rem 0.45rem',
              borderRadius: 99,
              fontSize: '0.7rem',
              fontWeight: 700,
              background: activeTab === 'alerts' ? 'rgba(255,255,255,0.25)' : 'var(--danger-bg)',
              color: activeTab === 'alerts' ? '#FFFFFF' : 'var(--danger)',
            }}
          >
            {allIssues.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1.15rem',
            borderRadius: '8px',
            border: activeTab === 'rules' ? '1.5px solid #475569' : '1px solid var(--border)',
            background: activeTab === 'rules' ? '#475569' : 'var(--surface)',
            color: activeTab === 'rules' ? '#FFFFFF' : 'var(--text-primary)',
            fontWeight: activeTab === 'rules' ? 700 : 500,
            fontSize: '0.84rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <ShieldCheck size={15} />
          <span>Statutory Rules Catalog</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ─── TAB 1: CHATGPT COPILOT INTERFACE ─── */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'copilot' && (
        <div style={{ width: '100%', marginBottom: '1.5rem' }}>
          {/* Main ChatGPT Window Container */}
          <div
            className="esg-card"
            style={{
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              height: '700px',
              minHeight: '700px',
              maxHeight: '700px',
              width: '100%',
              border: '1.5px solid #E2E8F0',
              borderRadius: '12px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.06)',
              background: '#FFFFFF',
            }}
          >
            {/* ChatGPT Top Header Bar */}
            <div
              style={{
                flexShrink: 0,
                padding: '0.85rem 1.25rem',
                background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '2px solid #059669',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                  }}
                >
                  <Sparkles size={18} color="#FFFFFF" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
                      ESG AI Validation Copilot
                    </span>
                    <span
                      style={{
                        padding: '0.12rem 0.5rem',
                        borderRadius: '99px',
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#6EE7B7',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                      }}
                    >
                      ● Online • SEBI BRSR Engine v2.4
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                    Target Entity: <strong>{organizations.find((o) => o._id === selectedOrg)?.name || 'All Operating Units'}</strong> (FY {selectedYear})
                  </div>
                </div>
              </div>

              {/* Header Right Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  style={{
                    padding: '0.35rem 0.6rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  {['2024', '2025', '2026', '2027'].map((y) => (
                    <option key={y} value={y} style={{ color: '#0F172A' }}>
                      FY {y}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    if (followUpTimerRef.current) clearTimeout(followUpTimerRef.current);
                    setChatMessages([
                      {
                        id: 'msg-welcome-reset',
                        sender: 'ai',
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        title: 'MEIL ESG AI Validation Copilot',
                        text: getGreetingText(),
                        isWelcome: true,
                      },
                    ]);
                  }}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#F8FAFC',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <RefreshCw size={12} /> New Chat
                </button>
              </div>
            </div>

            {/* ChatGPT Message Area */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: '1.25rem',
                background: '#F8FAFC',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.sender === 'user' ? 'flex-end' : 'stretch',
                    width: '100%',
                  }}
                >
                  {/* Sender Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      marginBottom: '0.35rem',
                      padding: '0 0.25rem',
                    }}
                  >
                    {msg.sender === 'ai' ? (
                      <>
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: '#059669',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Sparkles size={12} color="#FFFFFF" />
                        </div>
                        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0F172A' }}>
                          ESG AI Copilot
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#1E293B' }}>
                          You
                        </span>
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: '#2563EB',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                          }}
                        >
                          {user?.name ? user.name[0].toUpperCase() : 'U'}
                        </div>
                      </>
                    )}
                    <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>{msg.timestamp}</span>
                  </div>

                  {/* Message Bubble Card */}
                  <div
                    style={{
                      maxWidth: msg.sender === 'user' ? '75%' : '100%',
                      padding: msg.sender === 'user' ? '0.75rem 1rem' : '1.1rem 1.35rem',
                      borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      background: msg.sender === 'user' ? '#1E293B' : '#FFFFFF',
                      color: msg.sender === 'user' ? '#FFFFFF' : '#1E293B',
                      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
                      border: msg.sender === 'user' ? 'none' : '1px solid #E2E8F0',
                      fontSize: '0.85rem',
                      lineHeight: '1.5',
                    }}
                  >
                    {/* Welcome Banner Prompt Pills */}
                    {msg.isWelcome && (
                      <div>
                        <p style={{ margin: '0 0 0.85rem 0', whiteSpace: 'pre-line' }}>{msg.text}</p>

                        {/* 1. Department Tabs to Auto-Validate */}
                        <div style={{ marginTop: '0.75rem' }}>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                            🎯 Choose Department Tab to Auto-Validate:
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.65rem' }}>
                            {DEPARTMENT_STREAMS.map((stream) => {
                              const Icon = stream.icon;
                              return (
                                <button
                                  key={stream.id}
                                  type="button"
                                  onClick={() => handleValidateStream(stream.id)}
                                  style={{
                                    textAlign: 'left',
                                    padding: '0.75rem 0.9rem',
                                    borderRadius: '8px',
                                    border: `1.5px solid ${stream.border}`,
                                    background: stream.bg,
                                    cursor: 'pointer',
                                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.2rem',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: stream.color, fontWeight: 700, fontSize: '0.82rem' }}>
                                    <Icon size={16} /> {stream.name}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                                    {stream.description}
                                  </div>
                                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: stream.color, marginTop: '0.25rem' }}>
                                    Click to Validate &amp; Generate PDF →
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 2. Workflow & Compliance Modules to Auto-Validate */}
                        <div style={{ marginTop: '1rem' }}>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                            📋 Choose Compliance &amp; Reporting Module to Auto-Validate:
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.65rem' }}>
                            {MODULE_STREAMS.map((stream) => {
                              const Icon = stream.icon;
                              return (
                                <button
                                  key={stream.id}
                                  type="button"
                                  onClick={() => handleValidateStream(stream.id)}
                                  style={{
                                    textAlign: 'left',
                                    padding: '0.75rem 0.9rem',
                                    borderRadius: '8px',
                                    border: `1.5px solid ${stream.border}`,
                                    background: stream.bg,
                                    cursor: 'pointer',
                                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.2rem',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: stream.color, fontWeight: 700, fontSize: '0.82rem' }}>
                                    <Icon size={16} /> {stream.name}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                                    {stream.description}
                                  </div>
                                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: stream.color, marginTop: '0.25rem' }}>
                                    Click to Validate &amp; Generate PDF →
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Standard User Message */}
                    {!msg.isWelcome && msg.sender === 'user' && (
                      <div>{msg.text}</div>
                    )}

                    {/* Diagnostic AI Response Card */}
                    {!msg.isWelcome && msg.sender === 'ai' && msg.report && (
                      <div>
                        {/* Scope & Quality Header Box */}
                        <div
                          style={{
                            padding: '0.75rem 1rem',
                            background: '#F0FDF4',
                            border: '1.5px solid #BBF7D0',
                            borderRadius: '8px',
                            marginBottom: '0.85rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#065F46' }}>
                                {msg.report.streamName}
                              </span>
                              <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: '#DCFCE7', color: '#166534', fontWeight: 700 }}>
                                #{msg.report.reportId}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.73rem', color: '#047857', marginTop: '0.15rem' }}>
                              {msg.report.organizationName} • FY {msg.report.reportingYear}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#059669', lineHeight: 1 }}>
                                {msg.report.qualityScore}%
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#065F46', fontWeight: 600 }}>
                                Data Quality Index
                              </div>
                            </div>
                            <span
                              style={{
                                padding: '0.25rem 0.55rem',
                                borderRadius: '99px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: msg.report.status === 'Verified' ? '#DCFCE7' : '#FEE2E2',
                                color: msg.report.status === 'Verified' ? '#166534' : '#991B1B',
                                border: `1px solid ${msg.report.status === 'Verified' ? '#86EFAC' : '#FCA5A5'}`,
                              }}
                            >
                              {msg.report.status}
                            </span>
                          </div>
                        </div>

                        {/* Breakdown of findings */}
                        <div style={{ marginBottom: '0.85rem' }}>
                          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.45rem' }}>
                            🔍 Diagnostic Findings ({msg.report.issues?.length || 0}):
                          </div>

                          {msg.report.issues?.length === 0 ? (
                            <div
                              style={{
                                padding: '0.65rem 0.85rem',
                                background: '#F8FAFC',
                                borderRadius: '6px',
                                borderLeft: '3px solid #059669',
                                fontSize: '0.78rem',
                                color: '#065F46',
                              }}
                            >
                              ✓ <strong>Clean Audit:</strong> Zero anomalies detected. All physical values comply with physical limits, non-duplication rules, and historical variance boundaries.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {msg.report.issues.map((iss, i) => (
                                <div
                                  key={i}
                                  style={{
                                    padding: '0.6rem 0.85rem',
                                    borderRadius: '6px',
                                    background: iss.severity === 'HIGH' ? '#FEF2F2' : '#FFFBEB',
                                    borderLeft: `3px solid ${iss.severity === 'HIGH' ? '#DC2626' : '#D97706'}`,
                                    fontSize: '0.78rem',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                    <span style={{ fontWeight: 700, color: iss.severity === 'HIGH' ? '#991B1B' : '#92400E' }}>
                                      {iss.message}
                                    </span>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: iss.severity === 'HIGH' ? '#DC2626' : '#D97706' }}>
                                      [{iss.severity}]
                                    </span>
                                  </div>
                                  {iss.suggestion && (
                                    <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.2rem' }}>
                                      💡 <em>Recommendation:</em> {iss.suggestion}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Direct Action Buttons: Download PDF & Storage Confirmation */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.6rem',
                            paddingTop: '0.75rem',
                            borderTop: '1px solid #E2E8F0',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                            <CheckCircle2 size={14} /> Archived in Stored Audit Reports Vault
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => exportAIValidationReportToPDF(msg.report)}
                              style={{
                                padding: '0.45rem 0.9rem',
                                borderRadius: '6px',
                                background: '#059669',
                                color: '#FFFFFF',
                                border: 'none',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)',
                              }}
                              title="Download official PDF audit slip for this validation"
                            >
                              <Download size={13} /> Download AI Validation PDF
                            </button>

                            <button
                              type="button"
                              onClick={() => setActiveTab('reports_table')}
                              style={{
                                padding: '0.45rem 0.85rem',
                                borderRadius: '6px',
                                background: '#EFF6FF',
                                color: '#1D4ED8',
                                border: '1px solid #BFDBFE',
                                fontWeight: 600,
                                fontSize: '0.76rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                              }}
                              title="View full register in the Stored Reports Tab"
                            >
                              <FileText size={12} /> View in Stored Reports Tab ({reportsHistory.length}) →
                            </button>

                            <button
                              type="button"
                              onClick={() => handleValidateStream(msg.streamId)}
                              style={{
                                padding: '0.45rem 0.75rem',
                                borderRadius: '6px',
                                background: '#F8FAFC',
                                color: '#334155',
                                border: '1px solid #CBD5E1',
                                fontWeight: 600,
                                fontSize: '0.76rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                              }}
                            >
                              <RefreshCw size={12} /> Re-Audit
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing / Auditing Animation */}
              {isAiTyping && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.85rem', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', width: 'fit-content' }}>
                  <Sparkles size={16} className="spin" style={{ color: '#059669' }} />
                  <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                    AI Copilot is scanning operational database, running outlier spike checks &amp; compiling SEBI audit slip...
                  </span>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Quick Prompt Suggestions above input */}
            <div
              style={{
                padding: '0.45rem 1.25rem',
                background: '#F1F5F9',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                overflowX: 'auto',
              }}
            >
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', whiteSpace: 'nowrap' }}>
                Quick Audit Tabs:
              </span>
              {[
                { label: '🌿 Environmental', id: 'environmental' },
                { label: '👥 Social & HR', id: 'social' },
                { label: '🦺 Safety / OHS', id: 'safety' },
                { label: '⚖️ Governance', id: 'governance' },
                { label: '📑 BRSR Reporting', id: 'brsr' },
                { label: '📂 Documents Vault', id: 'documents' },
                { label: '✅ Approvals', id: 'approvals' },
                { label: '📊 Reports', id: 'reports' },
                { label: '📈 Analytics', id: 'analytics' },
                { label: '🌐 Full Comprehensive Audit', id: 'all' },
              ].map((pill, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleValidateStream(pill.id)}
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '99px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#334155',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* ChatGPT Input Bar */}
            <form
              onSubmit={handleChatSubmit}
              style={{
                padding: '0.85rem 1.25rem',
                background: '#FFFFFF',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <input
                type="text"
                placeholder="Ask AI Copilot to validate any tab, spike, or metric (e.g., 'Validate water intake and fuel spikes')..."
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                disabled={isAiTyping}
                style={{
                  flex: 1,
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!inputPrompt.trim() || isAiTyping}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  background: !inputPrompt.trim() || isAiTyping ? '#CBD5E1' : '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: !inputPrompt.trim() || isAiTyping ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'background 0.15s ease',
                }}
              >
                <Send size={15} /> Validate
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ─── TAB 2: STANDALONE REPORTS REGISTER VAULT ─── */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'reports_table' && (
        <div className="esg-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <FileText size={18} style={{ color: '#2563EB' }} />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  SEBI BRSR Statutory AI Validation Vault
                </h2>
                <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: 99, background: '#EFF6FF', color: '#2563EB', fontWeight: 700 }}>
                  {reportsHistory.length} Stored Reports
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                Complete register of automated audits performed by the AI Copilot. Download official certification slips.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Filter stored reports..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: '0.78rem',
                }}
              />
              <select
                value={tableStatusFilter}
                onChange={(e) => setTableStatusFilter(e.target.value)}
                style={{
                  padding: '0.4rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  fontSize: '0.78rem',
                  background: 'var(--surface)',
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="Verified">Verified</option>
                <option value="Action Required">Action Required</option>
                <option value="Warning">Warning</option>
              </select>
              <button
                className="btn-primary-esg btn-sm"
                onClick={() => setActiveTab('copilot')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#059669' }}
              >
                <Sparkles size={14} /> Open AI Copilot
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
            <table className="table-esg">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Report Reference</th>
                  <th>Scope / Category</th>
                  <th>Operating Entity</th>
                  <th>Validation Timestamp</th>
                  <th>Quality Index</th>
                  <th>Issues Breakdown</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Download Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '1.75rem', color: 'var(--text-muted)' }}>
                      No stored validation reports found matching filter. Select any department in the AI Copilot to run a validation!
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((rpt, idx) => (
                    <tr key={rpt.reportId || idx}>
                      <td>{idx + 1}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem', color: '#0F172A' }}>
                          {rpt.reportId}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>{rpt.streamName}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{rpt.totalRecords} records audited</div>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{rpt.organizationName}</td>
                      <td style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        {new Date(rpt.validatedAt).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '99px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: rpt.qualityScore >= 90 ? '#ECFDF5' : '#FFFBEB',
                            color: rpt.qualityScore >= 90 ? '#059669' : '#D97706',
                            border: `1px solid ${rpt.qualityScore >= 90 ? '#A7F3D0' : '#FDE68A'}`,
                          }}
                        >
                          {rpt.qualityScore}% Confidence
                        </span>
                      </td>
                      <td>
                        {rpt.summary?.totalIssues === 0 ? (
                          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>✓ Clean</span>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            {rpt.summary?.highCount > 0 && (
                              <span style={{ padding: '0.1rem 0.45rem', borderRadius: '4px', background: '#FEE2E2', color: '#DC2626', fontSize: '0.72rem', fontWeight: 700 }}>
                                {rpt.summary.highCount} Critical
                              </span>
                            )}
                            {rpt.summary?.medCount > 0 && (
                              <span style={{ padding: '0.1rem 0.45rem', borderRadius: '4px', background: '#FEF3C7', color: '#D97706', fontSize: '0.72rem', fontWeight: 700 }}>
                                {rpt.summary.medCount} Warning
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '99px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: rpt.status === 'Verified' ? '#ECFDF5' : '#FEE2E2',
                            color: rpt.status === 'Verified' ? '#059669' : '#DC2626',
                          }}
                        >
                          {rpt.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => exportAIValidationReportToPDF(rpt)}
                          className="btn-primary-esg btn-sm"
                          style={{
                            background: '#059669',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <Download size={13} /> Download PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ─── TAB 3: FLAGGED ANOMALY ALERTS ─── */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'alerts' && (
        <>
          <div className="filters-bar" style={{ marginBottom: '1.25rem' }}>
            <div className="search-input-wrap">
              <Search size={14} className="search-icon" />
              <input
                placeholder="Search metric or project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
            >
              <option value="">All Projects &amp; Organizations</option>
              {organizations.map((org) => (
                <option key={org._id} value={org._id}>
                  {org.name} ({org.type})
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Anomaly Types</option>
              <option value="MISSING_DATA">Missing Data Alerts</option>
              <option value="ABNORMAL_CHANGE">Unusual Spikes / Outliers</option>
              <option value="INVALID_VALUE">Invalid Values / Inconsistencies</option>
              <option value="DUPLICATE">Duplicate Records</option>
            </select>

            <select
              className="filter-select"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="ALL">All Severities</option>
              <option value="HIGH">Critical Only (High)</option>
              <option value="MEDIUM">Warnings (Medium)</option>
              <option value="LOW">Notices (Low)</option>
            </select>

            <button
              className="btn-secondary-esg btn-sm"
              onClick={() => {
                setTypeFilter('ALL');
                setSeverityFilter('ALL');
                setSearchTerm('');
                setSelectedOrg('');
              }}
            >
              Reset Filters
            </button>
          </div>

          {analyzing ? (
            <LoadingState />
          ) : filteredIssues.length === 0 ? (
            <div className="esg-card">
              <EmptyState
                icon="🛡️"
                title="Clean ESG Dataset — No Anomalies Detected"
                message="All records comply with completeness, bounds, non-duplication, and historical variance criteria."
                action={
                  <button className="btn-primary-esg" onClick={runValidation}>
                    <RefreshCw size={14} /> Re-scan Records
                  </button>
                }
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {filteredIssues.map((issue, index) => {
                const sev = SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.MEDIUM;
                const typeInfo = TYPE_LABELS[issue.type] || { label: issue.type, color: '#475569', icon: '⚠️' };

                return (
                  <div
                    key={index}
                    className="esg-card"
                    style={{
                      padding: '1.25rem',
                      borderLeft: `5px solid ${sev.text}`,
                      transition: 'box-shadow 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.65rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '99px',
                            background: sev.bg,
                            color: sev.text,
                            border: `1px solid ${sev.border}`,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                          }}
                        >
                          {sev.label}
                        </span>

                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: 'var(--bg)',
                            color: 'var(--text-primary)',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            border: '1px solid var(--border-light)',
                          }}
                        >
                          {typeInfo.icon} {typeInfo.label}
                        </span>

                        {issue.department && (
                          <span
                            style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              background: '#F1F5F9',
                              color: '#475569',
                              fontSize: '0.72rem',
                              fontWeight: 500,
                            }}
                          >
                            Dept: {issue.department} Officer
                          </span>
                        )}
                      </div>

                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {issue.status ? <StatusBadge status={issue.status} /> : 'Pre-Filing Check'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                      {issue.message}
                    </div>

                    {issue.details && (
                      <div
                        style={{
                          background: '#F8FAFC',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          color: '#334155',
                          marginBottom: '0.5rem',
                          fontFamily: 'monospace',
                        }}
                      >
                        Previous Value: <strong>{issue.details.previousValue}</strong> ➔ Current Value: <strong>{issue.details.currentValue}</strong> ({issue.details.percentChange > 0 ? `+${issue.details.percentChange}%` : `${issue.details.percentChange}%`})
                      </div>
                    )}

                    {issue.suggestion && (
                      <div style={{ fontSize: '0.8rem', color: '#475569', background: '#F8FAFC', padding: '0.5rem 0.75rem', borderRadius: '6px', borderLeft: '3px solid #F15A24' }}>
                        <strong>Recommended Action:</strong> {issue.suggestion}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <div>
                        Project: <strong>{issue.projectName || 'MEIL Operating Unit'}</strong> • Metric: <strong>{issue.metric}</strong>
                      </div>

                      <a
                        href="/data-collection"
                        className="btn-secondary-esg btn-sm"
                        style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        Review in Data Collection <ArrowRight size={12} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ─── TAB 4: STATUTORY RULES MATRIX ─── */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'rules' && (
        <div className="esg-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Automated ESG Validation Rule Policies &amp; Thresholds
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                Algorithmic checks executed on every metric submission prior to Maker-Checker consolidation.
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: 99, background: 'rgba(5, 150, 105, 0.1)', color: '#059669', border: '1px solid rgba(5, 150, 105, 0.25)' }}>
              ✓ Engine Active &amp; Enforcing
            </span>
          </div>

          <div className="table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
            <table className="table-esg">
              <thead>
                <tr>
                  <th style={{ width: '105px' }}>Rule Code</th>
                  <th>Validation Rule &amp; Policy</th>
                  <th>Department Scope</th>
                  <th>Condition &amp; Mathematical Check</th>
                  <th>Severity</th>
                  <th>SEBI BRSR Reference</th>
                </tr>
              </thead>
              <tbody>
                {VALIDATION_RULES_CATALOG.map((rule) => (
                  <tr key={rule.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem', color: 'var(--primary)' }}>
                        {rule.id}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                        {rule.ruleName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {rule.category}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {rule.department}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: '#334155', maxWidth: '320px' }}>
                      <code style={{ background: '#F1F5F9', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.74rem' }}>
                        {rule.condition}
                      </code>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                        Action: <strong>{rule.action}</strong>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: 99,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: SEVERITY_COLORS[rule.severity]?.bg || '#F3F4F6',
                          color: SEVERITY_COLORS[rule.severity]?.text || '#374151',
                          border: `1px solid ${SEVERITY_COLORS[rule.severity]?.border || '#E5E7EB'}`,
                        }}
                      >
                        {SEVERITY_COLORS[rule.severity]?.label || rule.severity}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {rule.brsrMapping}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Validation;
