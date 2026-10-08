# ESG360 — Smart BRSR Reporting & ESG Compliance Portal
## Comprehensive Production & System Architecture Documentation
*Built for BPUT Hackathon 2026 — Problem Statement 08 (PS08)*  
*MEIL Infrastructure Group (Megha Engineering & Infrastructures Ltd.) Compliance Framework*

---

## Executive Summary

**ESG360** is an enterprise-grade, full-stack MERN (MongoDB, Express.js, React.js, Node.js) ESG Data Collection, AI Validation, Multi-Tier Consolidation, and Statutory SEBI BRSR (Business Responsibility and Sustainability Reporting) Platform. 

In diversified conglomerates like MEIL that operate across heavy infrastructure, transportation, irrigation, hydrocarbon, urban transit, and clean energy, no single employee holds all statutory environmental, social, or governance data. Operational metrics originate from physical site meters, weighbridge receipts, human resource payroll censuses, and safety drill logs spread across subsidiaries, business units, and site offices.

ESG360 replaces error-prone spreadsheets with a structured **4-Tier Organizational Hierarchy** (Group &rarr; Subsidiary &rarr; Business Unit &rarr; Project), automated **Maker-Checker-Approver workflows**, an algorithmic **AI Statutory Anomaly Engine & Copilot**, multi-tier mathematical **Consolidation and ESG Scoring Engines**, and automated **SEBI BRSR 2023–24 statutory report generators** with one-click export to PDF and Excel.

---

# 1. Project Overview

### 1.1 Project Name & Identification
- **Application Name**: ESG360 — Smart BRSR Reporting & ESG Compliance Portal
- **Hackathon Context**: BPUT Hackathon 2026 | Problem Statement 08 (PS08)
- **Target Organization Scope**: MEIL Group (Megha Engineering & Infrastructures Ltd.) and its operating subsidiaries.

### 1.2 Project Purpose
To provide an end-to-end statutory ESG data accounting and assurance system that standardizes raw data capture from construction and operational sites, algorithmically validates telemetry for compliance anomalies (e.g., negative values, missing meter proofs, multi-fold abnormal spikes), enforces multi-tier management sign-offs, consolidates data across operating subsidiaries, and compiles official SEBI BRSR Core disclosures.

### 1.3 Business Problem
Large infrastructure conglomerates face critical challenges in ESG compliance:
1. **Dispersed Data Silos**: Environmental, safety, workforce, and governance data are isolated in disconnected plant spreadsheets.
2. **Data Integrity Hazards**: Manual entries frequently suffer from unit confusion (e.g., liters vs. kiloliters), missing mandatory baselines, duplicate project submissions, and underreported safety incidents.
3. **Audit Trail Deficits**: Third-party auditors (e.g., Big 4, SEBI accredited assurance providers) reject disclosures lacking timestamped evidence (NABL calibration certificates, weighbridge receipts, CEMS logs).
4. **Complex Consolidation**: Aggregating Scope 1, Scope 2, and Scope 3 emissions across subsidiaries with differing equity shares or operational boundaries requires rigorous mathematical consolidation.
5. **Regulatory Deadlines**: Mandated SEBI circulars (`CIR/CFD/CMD/10/2015` and `SEBI/HO/CFD/CFD-SEC-2/P/CIR/2023/122`) require listed top 1,000 entities to disclose 9 core BRSR principles with strict non-financial assurance.

### 1.4 Solution Provided
ESG360 delivers an integrated digital platform that:
- Models the exact 4-tier organizational hierarchy of infrastructure groups.
- Provides dedicated data entry interfaces for Environmental, HR, Safety, and Compliance officers.
- Integrates an **AI Statutory Anomaly Engine** that scans data for missing fields, duplicate submissions, mathematical inconsistencies, and historical outlier jumps prior to sign-off.
- Offers a ChatGPT-style **ESG AI Validation Copilot** for conversational department and module auto-auditing.
- Enforces an immutable **Audit Log & Maker-Checker Approval Workflow** (`Draft` &rarr; `Submitted` &rarr; `Under Review` &rarr; `Validated` &rarr; `Approved`).
- Executes multi-tier mathematical consolidation (Sum, Average, Max, Min, Latest) into parent business units and subsidiaries.
- Generates official **SEBI BRSR Section A, B, and C (Principles 1–9)** statutory reports with PDF and Excel export.

### 1.5 Target Users
- **Super Admins & Executive Governance**: Complete platform governance, system configuration, user provisioning, and final statutory sign-offs.
- **Group ESG Admins**: Oversee cross-subsidiary ESG strategy, aggregate carbon accounting, and regulatory filings.
- **Subsidiary Admins**: Oversee subsidiary-level operations, projects, and data validation.
- **Business Unit Managers**: Oversee sector-specific operational clusters (e.g., Solar BU, Expressways BU).
- **Project / Department Officers**: Field-level data creators (Environmental Officers, HR Officers, Safety Officers, Compliance Officers).
- **ESG Managers & Compliance Officers**: Second-line review, verification, and regulatory alignment.
- **Auditors / Reviewers**: Independent third-party assurance providers reviewing evidence manifests and calibration records.
- **Management / Board of Directors**: Executive oversight, ESG ratings, and decarbonization dashboards.

### 1.6 Key Features
- **4-Tier Hierarchy Engine**: Group &rarr; Subsidiary &rarr; Business Unit &rarr; Project with recursive parent-child rollups.
- **Structured Data Capture**: 60+ pre-configured ESG metrics mapped to SEBI BRSR principles.
- **Cloud Evidence Vault**: Direct Cloudinary document storage with secure local disk fallback for weighbridge slips, CEMS certificates, and calibration proof.
- **AI Validation & Outlier Spikes Engine**: Algorithmic rules detecting blanks, unit anomalies, abnormal spikes (+200% jumps), and logical violations (e.g., female employees > total employees).
- **ChatGPT-Style AI Copilot**: Interactive diagnostic assistant with one-click stream audit tiles and downloadable PDF audit slips.
- **Multi-Tier Maker-Checker Approvals**: Role-governed review pipeline with correction request loops and audit timestamps.
- **Automated BRSR Report Compiler**: Section A (General), Section B (Management), Section C (Principles 1–9).
- **Consolidation & ESG Scoring Engine**: Weighted algorithm calculating Environmental (40%), Social (30%), and Governance (30%) scores (0–100 scale) with letter grades (AAA to B).
- **Executive Analytics & Trend Visualizer**: Recharts-powered graphs comparing year-over-year emissions, category splits, and project rankings.
- **Session Security & Inactivity Guard**: Automated 30-second inactivity detection with 10-second countdown modal for Super Admin security.

---

# 2. Business Context & Workflow

### 2.1 The Traditional vs. ESG360 Process

| Traditional Manual Process | ESG360 Digital Platform |
|----------------------------|--------------------------|
| Disconnected Excel sheets emailed across 100+ sites | Centralized cloud database accessible via role-based access control |
| Typographical errors, negative numbers, missing units | Strict frontend and backend type validation and enum restrictions |
| No historical comparison during data entry | Real-time outlier detection comparing previous vs. current values |
| Supporting bills and calibration certificates lost in emails | Cloud-hosted document vault linked directly to metric records |
| Unclear accountability; no immutable trail of changes | Cryptographic SHA-256 audit logs with user IP, action, and timestamp |
| Weeks spent manually aggregating subsidiary totals | Automated 1-click mathematical aggregation and scoring |
| Static, tedious manual drafting of SEBI reports | Automated statutory PDF & Excel generator with 100% data concordance |

### 2.2 End-to-End Business Workflow

```mermaid
flowchart TD
    A[Project / Department Officer] -->|1. Data Entry + Evidence Upload| B(ESG Record: Draft)
    B -->|2. Submit Record| C(ESG Record: Submitted)
    C -->|3. Algorithmic AI Validation Scan| D{Anomaly Detected?}
    D -- Yes (Spike/Missing Data) --> E[Flagged Anomaly Alert + Copilot Slip]
    E -->|Requires Fix| A
    D -- No (Clean) --> F(ESG Record: Under Review)
    F -->|4. BU / ESG Manager Review| G{Manager Decision}
    G -- Request Correction --> B
    G -- Validate --> H(ESG Record: Validated)
    H -->|5. Group Admin / Super Admin Sign-Off| I(ESG Record: Approved)
    I -->|6. Multi-Tier Aggregation Engine| J[Consolidated Parent Dataset]
    J -->|7. Weighted ESG Scoring Engine| K[E, S, G Scorecard & Grade: AAA-B]
    J -->|8. SEBI BRSR Compiler| L[BRSR Report: Principles 1-9]
    L -->|9. Export Engine| M[Statutory PDF & Excel Dossiers]
```

---

# 3. Technology Stack

| Layer | Technology | Version | Purpose in Project |
|---|---|---|---|
| **Frontend Framework** | React.js | `v19.2.8` | Component-based interactive Single Page Application (SPA) |
| **Frontend Routing** | React Router DOM | `v7.18.4` | Client-side routing, protected routes, and role-based redirects |
| **Frontend Build Tool** | Vite | `v8.3.0` | Next-gen fast development server and optimized rollup production bundler |
| **Styling & Design System** | Vanilla CSS + Design Tokens | Custom | Bespoke corporate design system (Forest Green `#176B45`, Slate `#0F172A`, Orange `#F15A24`), dark headers, glassmorphism, fluid responsive layouts |
| **UI Component Library** | Bootstrap (Core utilities) | `v5.3.8` | Grid foundations and responsive scaffolding |
| **Icons Library** | Lucide React / React Icons | `v5.7.0` | Consistent iconography across all 15 operational modules |
| **Data Visualization** | Recharts | `v3.10.1` | Interactive SVG-rendered Bar, Line, Pie, and Area charts |
| **Report Generation** | jsPDF + jsPDF-AutoTable | `v4.2.1` / `v5.0.8` | Client-side vector PDF generation for BRSR reports, audit slips, and executive dossiers |
| **Spreadsheet Generation**| SheetJS (xlsx) | `v0.18.5` | Multi-sheet Excel workbook export (`.xlsx`) |
| **HTTP Client** | Axios | `v1.20.0` | Asynchronous API communication with request/response interceptors |
| **Backend Runtime** | Node.js | `>=18.x` | Cross-platform JavaScript runtime environment |
| **Backend Framework** | Express.js | `v4.22.3` | RESTful routing, middleware pipeline, and JSON API handling |
| **Async Middleware** | express-async-errors | `v3.1.1` | Catches unhandled promise rejections without redundant try/catch blocks |
| **Database & ODM** | MongoDB Atlas + Mongoose | `v9.10.2` | Cloud document database with strictly typed schemas, indexes, and aggregation pipelines |
| **Authentication & Tokens**| JSON Web Tokens (`jsonwebtoken`) | `v9.0.3` | Stateless Bearer token generation, verification, and role decoding |
| **Password Security** | bcryptjs | `v3.0.3` | Salt generation (12 rounds) and cryptographic password hashing |
| **Security Headers** | Helmet | `v8.3.0` | Protects HTTP headers against sniffing, clickjacking, and XSS |
| **CORS Middleware** | cors | `v2.8.6` | Whitelists frontend origins (localhost, Vercel, Render) |
| **Logging** | Morgan | `v1.12.1` | HTTP request logging in development environment |
| **File Multipart Upload** | Multer | `v2.4.0` | Memory buffer handling for multipart form uploads (10MB limit) |
| **Cloud File Storage** | Cloudinary SDK (`cloudinary`) | `v1.41.3` | Cloud document hosting with fallback to local filesystem via `streamifier` |
| **Validation Engine** | Custom JavaScript Engine | Built-in | Rule-based if-else validation and outlier spike detection engine |
| **Deployment Platform** | Vercel (Frontend) + Render (Backend) | Cloud | Serverless frontend SPA hosting + Managed containerized Node service |
| **Version Control** | Git + GitHub | Cloud | Distributed source control, branch synchronization, and CI/CD triggers |

---

# 4. System Architecture

```mermaid
flowchart TD
    subgraph Client["Client Browser (React 19 + Vite)"]
        UI[User Interface & Pages]
        AuthCtx[AuthContext & Inactivity Guard]
        AxiosClient[Axios API Client + Interceptors]
        PDFEng[jsPDF & SheetJS Export Engines]
    end

    subgraph CDN["Cloud Document Storage"]
        Cloudinary[(Cloudinary Cloud Storage)]
    end

    subgraph Server["Backend Server (Express.js on Render)"]
        Entry[server.js Entry Point]
        Security[Helmet + CORS + No-Cache Headers]
        AuthMid[JWT Auth Middleware: protect & authorize]
        UploadMid[Multer Memory Buffer Middleware]
        
        subgraph Controllers["Business Logic Controllers"]
            AuthCtrl[authController.js]
            OrgCtrl[organizationController.js]
            ESGCtrl[esgController.js]
            BRSRCtrl[brrsController.js]
            DocCtrl[documentController.js]
            AnalyticsCtrl[analyticsController.js]
            AuditCtrl[auditLogController.js]
            NotifCtrl[notificationController.js]
        end

        subgraph CoreEngines["Core Computational Engines"]
            AIVal[aiValidationEngine.js - Spikes & Anomalies]
            ESGScore[esgScoreEngine.js - Weights & Letter Grades]
            AuditLogEng[auditLogger.js - Immutable Audit Trail]
        end
    end

    subgraph Database["MongoDB Atlas (Cloud Cluster)"]
        M_User[(Users Collection)]
        M_Org[(Organizations Collection)]
        M_ESG[(ESGData Collection)]
        M_BRSR[(BRSRReports Collection)]
        M_Doc[(Documents Collection)]
        M_Audit[(AuditLogs Collection)]
        M_Notif[(Notifications Collection)]
    end

    UI --> AxiosClient
    AxiosClient -->|HTTPS REST Request + Bearer JWT| Security
    Security --> Entry
    Entry --> AuthMid
    AuthMid --> Controllers
    DocCtrl --> UploadMid
    UploadMid --> Cloudinary
    ESGCtrl --> AIVal
    ESGCtrl --> ESGScore
    Controllers --> AuditLogEng
    Controllers --> Database
    AuditLogEng --> M_Audit
    UI --> PDFEng
```

---

# 5. Complete Application Workflow

```text
[1. User Visits App]
        │
        ├── Landing Page (/) -> Marketing & Platform Scope
        └── Login (/login) -> Enters Email & Password
                 │
[2. Authentication & Verification]
        │
        ├── POST /api/auth/login
        ├── bcryptjs verifies password (supports fallback auto-upgrade)
        ├── Server returns JWT (7d expiry) + User Object with Role & Org
        └── AuthContext stores token & user in localStorage
                 │
[3. Dashboard & Role Detection]
        │
        ├── /dashboard displays role-governed KPIs, charts, and notifications
        ├── Super Admin activates 30-Second Inactivity Security Timer
        └── Sidebar highlights modules authorized for current role
                 │
[4. Project Setup (Super Admin / Subsidiary Admin)]
        │
        └── /organizations -> Create Project with Sector, BU, Subsidiary, Location
                 │
[5. Department-wise Data Entry (Project Officers)]
        │
        ├── /data-collection or /environmental or /social or /governance
        ├── Officer inputs: Metric, Reporting Period, Value, Unit, Evidence File
        ├── POST /api/documents/upload -> Streams file to Cloudinary / Local storage
        └── POST /api/esg -> Saves record in 'Draft' status
                 │
[6. AI Anomaly & Validation Pre-Check]
        │
        ├── /validation (AI Copilot & Rules Matrix) or automated background hook
        ├── POST /api/esg/validate executes aiValidationEngine.js
        ├── Flags missing mandatory fields, duplicate submissions, and outlier spikes
        └── Outputs Data Quality Score (0-100%) and downloadable Audit Slip
                 │
[7. Maker-Checker Submission & Review]
        │
        ├── Officer clicks 'Submit for Review' -> PUT /api/esg/:id/submit ('Submitted')
        ├── Notification triggered for ESG Manager & Reviewer
        ├── /approvals -> Reviewer inspects record & attached evidence
        └── PUT /api/esg/:id/review -> 'Validated', 'Correction Required', or 'Approved'
                 │
[8. Multi-Tier Consolidation & Scoring]
        │
        ├── /consolidation -> Fetches approved records across operating units
        ├── Aggregates metrics (Sum/Average) to BU & Subsidiary levels
        └── esgScoreEngine.js computes E-Score (40%), S-Score (30%), G-Score (30%) & Grade
                 │
[9. Statutory BRSR Compilation]
        │
        ├── /brsr & /reports -> POST /api/reports/generate
        ├── Compiles Section A (General), Section B (Management), Section C (Principles 1-9)
        └── Tracks completion percentage across all 9 statutory principles
                 │
[10. Statutory Export & Audit Archival]
        │
        ├── User downloads official SEBI BRSR PDF Report or Excel Workbook
        └── Immutable Audit Log recorded in MongoDB for statutory auditors
```

---

# 6. User Roles & Permissions

The platform implements 9 strictly defined enterprise roles:

```text
1. Super Admin            (Executive authority; Approvals, Users, Organizations, Audit Logs)
2. Group ESG Admin         (Cross-subsidiary governance and corporate reporting)
3. Subsidiary Admin        (Subsidiary operations, project provisioning, review)
4. Business Unit Manager   (Operational cluster data review and management)
5. Project/Department User (Field data entry: Environmental, HR, Safety, Compliance)
6. ESG Manager             (Data quality validation and review workflow)
7. Compliance Officer      (Statutory checks, legal and SEBI disclosure review)
8. Management              (Executive oversight, board dashboards, read access)
9. Auditor / Reviewer      (Third-party verification, evidence manifest review)
```

### 6.1 Role Permission Matrix

| Feature / Action | Super Admin | Group ESG Admin | Subsidiary Admin | Business Unit Mgr | Project User | ESG Manager | Compliance Officer | Management | Auditor / Reviewer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Dashboard** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Organizations View** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Create/Edit Org** | ✓ | ✓ | ✓ (Sub Scope) | - | - | - | - | - | - |
| **Approve/Verify Org** | ✓ | ✓ | - | - | - | - | - | - | - |
| **Data Collection (Create)** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | - |
| **Submit Record** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | - |
| **Review / Validate Record** | ✓ | ✓ | ✓ | ✓ | - | ✓ | ✓ | ✓ | ✓ |
| **Final Approve Record** | ✓ | ✓ | ✓ | - | - | - | - | - | - |
| **AI Copilot & Validation** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Document Upload** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | - |
| **Document Review** | ✓ | ✓ | ✓ | ✓ | - | ✓ | ✓ | - | ✓ |
| **Consolidation & Scoring** | ✓ | ✓ | ✓ | ✓ | - | ✓ | ✓ | ✓ | ✓ |
| **BRSR Report Generate** | ✓ | ✓ | ✓ | ✓ | - | ✓ | ✓ | ✓ | - |
| **Statutory BRSR Review**| ✓ | - | - | - | - | - | - | - | - |
| **Analytics & Trends** | ✓ | ✓ | ✓ | ✓ | - | ✓ | ✓ | ✓ | ✓ |
| **Audit Logs (View/Edit)** | ✓ | - | - | - | - | - | - | - | - |
| **User Management** | ✓ | ✓ | - | - | - | - | - | - | - |

---

# 7. Frontend Documentation

### 7.1 Architecture & Tech Overview
- **Vite SPA**: Fast client-side compilation with React 19.
- **Client State**: Centralized `AuthContext` managing authenticated user, JWT tokens, and idle timeouts. Local state managed via React hooks (`useState`, `useEffect`, `useRef`, `useCallback`).
- **Styling Architecture**: Custom CSS architecture with CSS custom properties (`--primary: #176B45`, `--brand-orange: #F15A24`, `--surface: #FFFFFF`, etc.) defined in `global.css`, `layout.css`, `components.css`, and `auth.css`.
- **Client Export Utilities**: `exportUtils.js` leverages `jsPDF` and `xlsx` for zero-server-overhead document synthesis.

### 7.2 Frontend Folder Structure

```text
frontend/
├── public/
│   └── vite.svg
├── src/
│   ├── assets/                      # 3D illustration characters & branding images
│   │   ├── hero-characters.jpg
│   │   ├── process-character.jpg
│   │   └── about-analytics.jpg
│   ├── components/
│   │   ├── common/                  # 11 Reusable enterprise UI components
│   │   │   ├── Breadcrumbs.jsx      # Navigation trail
│   │   │   ├── ConfirmDialog.jsx    # Modal confirmation for delete/approve
│   │   │   ├── DocumentViewModal.jsx# Cloudinary/PDF preview modal
│   │   │   ├── ESGRecordViewModal.jsx # Detailed single-record audit modal
│   │   │   ├── ExportDropdown.jsx   # Multi-format (PDF/Excel) action menu
│   │   │   ├── KPICard.jsx          # Metric cards with percentage trends
│   │   │   ├── Pagination.jsx       # Standard table pagination
│   │   │   ├── ReviewActionModal.jsx# Approve/Reject/Correction dialogue
│   │   │   ├── States.jsx           # LoadingState and EmptyState placeholders
│   │   │   ├── StatusBadge.jsx      # Colored pill badges for workflow statuses
│   │   │   └── WorkflowPipeline.jsx # Visual multi-step progress stepper
│   │   └── layout/                  # Core scaffolding components
│   │       ├── AppLayout.jsx        # Sidebar + Topbar + Content shell
│   │       ├── Sidebar.jsx          # Module navigation links & badges
│   │       └── Topbar.jsx           # Search, org switcher, timer, profile
│   ├── context/
│   │   └── AuthContext.jsx          # Auth provider & 30s Super Admin idle timeout
│   ├── pages/                       # 15 Main application page modules
│   │   ├── Analytics.jsx            # Trend charts & subsidiary comparison
│   │   ├── Approvals.jsx            # Multi-tier approval queue & modals
│   │   ├── AuditLogs.jsx            # Immutable compliance audit log register
│   │   ├── BRSR.jsx                 # Statutory SEBI 9-Principle completeness
│   │   ├── CategoryPages.jsx        # Dedicated Environmental/Social/Gov views
│   │   ├── ConsolidationScoring.jsx # Aggregation & ESG score calculator
│   │   ├── Dashboard.jsx            # Executive KPI cockpit & quick widgets
│   │   ├── DataCollection.jsx       # Universal ESG record creation & table
│   │   ├── Documents.jsx            # Cloudinary evidence file vault
│   │   ├── Landing.jsx              # Public landing page with 3D character design
│   │   ├── Login.jsx                # Unified credential authentication page
│   │   ├── Notifications.jsx        # User-specific notification feed
│   │   ├── Organizations.jsx        # 4-Tier hierarchy tree & management
│   │   ├── Reports.jsx              # Generated BRSR reports repository
│   │   └── Validation.jsx           # AI Copilot & Anomaly Detection Center
│   ├── routes/
│   │   └── ProtectedRoute.jsx       # Route protection & role barrier
│   ├── services/
│   │   ├── api.js                   # Axios client with interceptors
│   │   └── authService.js           # Auth endpoint wrappers
│   ├── styles/                      # Comprehensive CSS design tokens
│   │   ├── auth.css
│   │   ├── components.css
│   │   ├── global.css
│   │   ├── landing.css
│   │   └── layout.css
│   ├── utils/
│   │   └── exportUtils.js           # 47KB PDF/Excel client export engine
│   ├── App.jsx                      # Main router & routes definition
│   └── main.jsx                     # Vite DOM entry point
├── package.json
├── vercel.json                      # Vercel SPA rewrite & Render proxy configuration
└── vite.config.js                   # Vite configuration
```

---

# 8. Backend Documentation

### 8.1 Server Configuration (`server.js`)
- **Initialization**: Connects to MongoDB Atlas via `config/db.js`, configures Cloudinary via `config/cloudinary.js`, loads all Mongoose models in `models/index.js`.
- **Cache Invalidation**: Disables ETag caching and enforces `no-store, no-cache, must-revalidate` HTTP headers on all API endpoints to guarantee 200 responses with fresh database telemetry.
- **Security Headers**: Uses `helmet` configured for cross-origin resource policy.
- **CORS Policy**: Dynamic origin checker supporting localhost (`:5173`, `:3000`), Vercel preview domains (`.vercel.app`), Render backends (`.onrender.com`), and environment overrides.
- **Upload Fallback**: Configures static `/uploads` serving for local filesystem fallback if external cloud uploads fail.

### 8.2 Request Pipeline Flow

```text
[HTTP Request from Frontend]
            │
    Helmet & CORS Check
            │
  Disable ETag & Cache-Control
            │
 Express JSON Parser (10MB limit)
            │
 Route Matching (/api/...)
            │
 JWT Middleware (protect) -> Verifies Bearer Token
            │
 Role Authorization (authorize / adminOnly / reviewerOnly)
            │
 Controller Logic (Business Validation)
            │
 Computational Engines (aiValidationEngine / esgScoreEngine)
            │
 Audit Logger (auditLogger.js)
            │
 Mongoose ODM -> MongoDB Atlas
            │
 JSON HTTP Response (200 / 201 / 400 / 403 / 500)
```

---

# 9. Database Documentation

ESG360 runs on MongoDB Atlas with 7 Mongoose collections.

### 9.1 Database ER Diagram

```mermaid
erDiagram
    ORGANIZATION ||--o{ ORGANIZATION : "parent/child hierarchy"
    ORGANIZATION ||--o{ USER : employs
    ORGANIZATION ||--o{ ESGDATA : owns
    ORGANIZATION ||--o{ BRSRREPORT : reports_for
    ORGANIZATION ||--o{ DOCUMENT : owns
    ORGANIZATION ||--o{ AUDITLOG : targets

    USER ||--o{ ESGDATA : submits
    USER ||--o{ ESGDATA : reviews
    USER ||--o{ ESGDATA : approves
    USER ||--o{ DOCUMENT : uploads
    USER ||--o{ BRSRREPORT : generates
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ AUDITLOG : triggers

    ESGDATA ||--o{ DOCUMENT : attaches_evidence
    ESGDATA }o--o{ BRSRREPORT : included_in
```

### 9.2 Collections & Field Definitions

#### 1. `users` Collection
| Field | Type | Required | Constraints | Purpose |
|---|---|---|---|---|
| `_id` | ObjectId | Yes | Auto-generated | Unique user identifier |
| `name` | String | Yes | Max 100 chars | Full employee name |
| `email` | String | Yes | Unique, lowercase | Corporate email address |
| `password` | String | Yes | Min 8 chars, hashed | bcrypt encrypted hash |
| `role` | String | Yes | 9 ROLES enum | Platform role |
| `organization`| ObjectId | No | Ref: Organization | Primary assigned organization |
| `department` | String | No | Trimmed string | Operational department |
| `employeeId` | String | No | Trimmed string | Corporate employee identifier |
| `isActive` | Boolean | Yes | Default: `true` | Account active status |

#### 2. `organizations` Collection
| Field | Type | Required | Constraints | Purpose |
|---|---|---|---|---|
| `_id` | ObjectId | Yes | Auto-generated | Organization identifier |
| `name` | String | Yes | Max 200 chars | Corporate / project name |
| `type` | String | Yes | Group, Subsidiary, BU, Project | 4-Tier Hierarchy tier |
| `parent` | ObjectId | No | Ref: Organization | Parent organization link |
| `location` | Object | No | address, city, state, pincode | Physical plant / site address |
| `cin` | String | No | String | Corporate Identification Number |
| `gstin` | String | No | String | Statutory Tax ID |
| `industry` | String | No | String | Industry sector |
| `status` | String | Yes | Active, Inactive, Submitted, Approved | Operational lifecycle status |
| `verificationStatus` | String | Yes | Verified, Pending Verification | Governance compliance status |

#### 3. `esgdatas` Collection
| Field | Type | Required | Constraints | Purpose |
|---|---|---|---|---|
| `_id` | ObjectId | Yes | Auto-generated | Record identifier |
| `category` | String | Yes | Environmental, Social, Governance | Core ESG pillar |
| `subcategory` | String | No | String | Secondary classification |
| `metric` | String | Yes | 60+ pre-defined metric enum | Statutory ESG metric name |
| `reportingPeriod` | Object | Yes | year (String), quarter (Enum) | Accounting period |
| `organization`| ObjectId | Yes | Ref: Organization | Target reporting entity |
| `value` | Mixed | Yes | Number or String | Measured physical value |
| `unit` | String | No | KL, MWh, MT, Nos., tCO2e | Standard measurement unit |
| `status` | String | Yes | 9 WORKFLOW_STATUS enum | Lifecycle status |
| `evidence` | Array | No | Sub-schema | Attached documents & URLs |
| `aiValidationResults` | Array | No | Severity, type, message | Algorithmic audit findings |
| `submittedBy` | ObjectId | No | Ref: User | Submitting officer |
| `reviewedBy` | ObjectId | No | Ref: User | Reviewing manager |
| `approvedBy` | ObjectId | No | Ref: User | Approving executive |

#### 4. `brsrreports` Collection
| Field | Type | Required | Constraints | Purpose |
|---|---|---|---|---|
| `_id` | ObjectId | Yes | Auto-generated | Report identifier |
| `title` | String | Yes | String | Official filing report title |
| `organization`| ObjectId | Yes | Ref: Organization | Reporting corporate scope |
| `reportingPeriod` | Object | Yes | year, fromDate, toDate | Statutory fiscal year |
| `status` | String | Yes | Draft, Under Review, Approved | Filing status |
| `sections` | Array | Yes | 12 BRSR sections & principles | Section completeness & indicators |
| `overallCompletionPercentage`| Number | Yes | 0 to 100 | Total statutory completeness |
| `includedESGRecords` | Array | No | Array of ObjectId refs | Linked approved records |

#### 5. `documents` Collection
| Field | Type | Required | Constraints | Purpose |
|---|---|---|---|---|
| `_id` | ObjectId | Yes | Auto-generated | Document identifier |
| `originalName`| String | Yes | String | Original uploaded filename |
| `cloudinaryUrl`| String | Yes | Valid URL | Cloud hosting / local fallback URL |
| `cloudinaryPublicId` | String | Yes | String | Cloudinary resource key |
| `category` | String | Yes | 10 DOC_CATEGORIES enum | Document category |
| `relatedESGRecord` | ObjectId | No | Ref: ESGData | Associated metric record |
| `uploadedBy` | ObjectId | Yes | Ref: User | Uploader ID |
| `status` | String | Yes | Draft, Under Review, Approved | Audit review status |

#### 6. `auditlogs` Collection
| Field | Type | Required | Constraints | Purpose |
|---|---|---|---|---|
| `_id` | ObjectId | Yes | Auto-generated | Audit log entry ID |
| `user` | ObjectId | No | Ref: User | Actor ID |
| `userName` | String | No | Denormalized string | Immutable historical username |
| `action` | String | Yes | 20 AUDIT_ACTIONS enum | Action type (CREATE, SUBMIT, etc.) |
| `entity` | String | Yes | 6 AUDIT_ENTITIES enum | Affected entity type |
| `entityId` | ObjectId | No | ObjectId | ID of modified entity |
| `ipAddress` | String | No | IP string | Client IP address |
| `status` | String | Yes | Success, Failure | Execution result |

#### 7. `notifications` Collection
| Field | Type | Required | Constraints | Purpose |
|---|---|---|---|---|
| `_id` | ObjectId | Yes | Auto-generated | Notification ID |
| `recipient` | ObjectId | Yes | Ref: User | Targeted user ID |
| `type` | String | Yes | 8 NOTIFICATION_TYPES enum | Event trigger type |
| `title` | String | Yes | Max 200 chars | Short alert headline |
| `message` | String | Yes | Max 1000 chars | Detailed notification text |
| `isRead` | Boolean | Yes | Default: `false` | Read status |

---

# 10. Complete API Reference

ESG360 implements 50 production endpoints organized across 9 REST routers:

### 10.1 Authentication (`/api/auth`)
| Method | Endpoint | Auth | Role | Request Body / Params | Purpose |
|---|---|---|---|---|---|
| `POST` | `/api/auth/register` | No | Public | `{ name, email, password, role, organization }` | Register new user account |
| `POST` | `/api/auth/login` | No | Public | `{ email, password }` | Authenticate user & return JWT token |
| `GET` | `/api/auth/profile` | Yes | All | None | Fetch authenticated user profile |
| `PUT` | `/api/auth/profile` | Yes | All | `{ name, phone, designation, department }` | Update user personal details |
| `PUT` | `/api/auth/change-password` | Yes | All | `{ currentPassword, newPassword }` | Change user password |
| `GET` | `/api/auth/users` | Yes | Admin Only | Query: `?role=&organization=&page=&limit=` | Fetch list of users |
| `PUT` | `/api/auth/users/:id` | Yes | Admin Only | `{ role, isActive, organization }` | Update user permissions & status |

### 10.2 Organizations (`/api/organizations`)
| Method | Endpoint | Auth | Role | Request Body / Params | Purpose |
|---|---|---|---|---|---|
| `GET` | `/api/organizations` | Yes | All | Query: `?type=&status=&search=&limit=` | List organizations matching scope |
| `GET` | `/api/organizations/tree` | Yes | All | None | Fetch nested 4-tier tree structure |
| `GET` | `/api/organizations/:id` | Yes | All | Params: `id` | Get single organization details |
| `POST` | `/api/organizations` | Yes | Admin Only | `{ name, type, parent, location, cin, gstin }` | Provision new organization entity |
| `PUT` | `/api/organizations/:id` | Yes | Admin Only | Updated organization fields | Update entity metadata |
| `PUT` | `/api/organizations/:id/approve` | Yes | Admin Only | `{ status: "Approved", comment }` | Executive approval of new entity |
| `PUT` | `/api/organizations/:id/verify` | Yes | Admin Only | `{ verificationStatus: "Verified" }` | Compliance verification of entity |
| `DELETE`| `/api/organizations/:id` | Yes | Admin Only | Params: `id` | Soft-delete / remove organization |

### 10.3 ESG Data Collection (`/api/esg`)
| Method | Endpoint | Auth | Role | Request Body / Params | Purpose |
|---|---|---|---|---|---|
| `GET` | `/api/esg` | Yes | All | Query: `?category=&metric=&year=&status=&org=` | List ESG records with filtering |
| `POST` | `/api/esg` | Yes | All | `{ category, metric, value, unit, year, org, ... }` | Create new ESG draft record |
| `GET` | `/api/esg/:id` | Yes | All | Params: `id` | Fetch detailed single ESG record |
| `PUT` | `/api/esg/:id` | Yes | All | Updated record fields | Modify record in Draft status |
| `PUT` | `/api/esg/:id/submit` | Yes | All | Params: `id` | Submit record for manager review |
| `PUT` | `/api/esg/:id/review` | Yes | Reviewer Only | `{ action: "Approved"|"Validated"|"Correction Required", comment }` | Review action by manager |
| `DELETE`| `/api/esg/:id` | Yes | All | Params: `id` | Delete unapproved draft record |
| `POST` | `/api/esg/validate` | Yes | All | `{ recordData, previousRecord }` | Run AI validation & outlier check |
| `GET` | `/api/esg/dashboard` | Yes | All | Query: `?year=&organization=` | KPI statistics & category aggregates |
| `GET` | `/api/esg/consolidated` | Yes | All | Query: `?year=&targetOrgId=` | Rollup metrics across hierarchy |
| `GET` | `/api/esg/score` | Yes | All | Query: `?year=&organization=` | Calculate E, S, G composite scores |
| `POST` | `/api/esg/projects` | Yes | All | `{ name, subsidiaryName, sector, ... }` | Quick-create project profile |

### 10.4 BRSR & Statutory Reports (`/api/brsr` & `/api/reports`)
| Method | Endpoint | Auth | Role | Request Body / Params | Purpose |
|---|---|---|---|---|---|
| `GET` | `/api/brsr` | Yes | All | Query: `?year=&organization=&status=` | Fetch generated BRSR reports |
| `POST` | `/api/brsr` | Yes | Management Access | `{ title, organization, reportingPeriod }` | Create custom BRSR report container |
| `GET` | `/api/brsr/:id` | Yes | All | Params: `id` | Fetch full report with all 9 principles |
| `PUT` | `/api/brsr/:id` | Yes | Management Access | `{ summaryNarrative, sections }` | Update BRSR narrative / section data |
| `PUT` | `/api/brsr/:id/review` | Yes | Super Admin Only | `{ status: "Approved", comment }` | Final statutory executive sign-off |
| `GET` | `/api/reports` | Yes | All | Query: `?year=&organization=` | Fetch published executive reports |
| `POST` | `/api/reports/generate`| Yes | Management Access | `{ organization, year, title }` | Auto-compile BRSR from approved data |

### 10.5 Documents & Evidence (`/api/documents`)
| Method | Endpoint | Auth | Role | Request Body / Params | Purpose |
|---|---|---|---|---|---|
| `POST` | `/api/documents/upload` | Yes | All | Multipart Form: `file`, `category`, `org`, `tags` | Upload evidence to Cloudinary/Disk |
| `GET` | `/api/documents` | Yes | All | Query: `?category=&organization=&status=` | List uploaded evidence documents |
| `GET` | `/api/documents/:id` | Yes | All | Params: `id` | Get document metadata & URL |
| `PUT` | `/api/documents/:id/review` | Yes | Reviewer Only | `{ status: "Approved"|"Rejected", comment }`| Auditor approval of proof |
| `DELETE`| `/api/documents/:id` | Yes | All | Params: `id` | Remove document from vault |

### 10.6 Analytics (`/api/analytics`)
| Method | Endpoint | Auth | Role | Request Body / Params | Purpose |
|---|---|---|---|---|---|
| `GET` | `/api/analytics` | Yes | All | Query: `?year=&organization=&category=` | Multi-dimensional aggregation stats |
| `GET` | `/api/analytics/consolidation` | Yes | Management Access | Query: `?year=&targetOrgId=` | Hierarchical rollups for charts |

### 10.7 Audit Logs (`/api/audit-logs`)
| Method | Endpoint | Auth | Role | Request Body / Params | Purpose |
|---|---|---|---|---|---|
| `GET` | `/api/audit-logs` | Yes | Super Admin Only | Query: `?action=&entity=&user=&search=` | Fetch immutable audit trail entries |
| `POST` | `/api/audit-logs` | Yes | Super Admin Only | `{ action, entity, entityId, description }` | Create manual statutory audit note |
| `PUT` | `/api/audit-logs/:id` | Yes | Super Admin Only | `{ description, metadata }` | Update auditor annotation |
| `DELETE`| `/api/audit-logs/:id` | Yes | Super Admin Only | Params: `id` | Administrative log purge |

### 10.8 Notifications (`/api/notifications`)
| Method | Endpoint | Auth | Role | Request Body / Params | Purpose |
|---|---|---|---|---|---|
| `GET` | `/api/notifications` | Yes | All | Query: `?isRead=&limit=` | Fetch authenticated user notifications |
| `PUT` | `/api/notifications/read-all` | Yes | All | None | Mark all notifications as read |
| `PUT` | `/api/notifications/:id/read` | Yes | All | Params: `id` | Mark single notification as read |

### 10.9 System Health
| Method | Endpoint | Auth | Role | Request Body / Params | Purpose |
|---|---|---|---|---|---|
| `GET` | `/api/health` | No | Public | None | Health check & uptime timestamp |

---

# 11. Authentication & Authorization Deep Dive

### 11.1 Password Cryptography
Passwords are encrypted using `bcryptjs` with **12 salt rounds** before saving to MongoDB Atlas via a Mongoose `pre('save')` hook.
The custom `matchPassword` method supports:
1. Standard bcrypt hash comparison.
2. Direct plain-text auto-upgrade: If an administrator updates credentials directly in MongoDB Compass or Atlas during hackathons, the method detects plain text, authenticates the user, and automatically hashes and saves the new password.

### 11.2 JWT Token Mechanics
- **Issuance**: Upon successful `/api/auth/login`, a token signed with `JWT_SECRET` containing the user's `_id` is returned.
- **Validity**: Configured for 7 days (`JWT_EXPIRE=7d`).
- **Authorization Header**: Sent as `Bearer <token>` on every request via Axios interceptors.
- **Session Expiry Handling**: An Axios response interceptor intercepts HTTP 401 statuses, clears `localStorage`, and safely routes the user to `/login` without breaking active login forms.

### 11.3 Super Admin 30-Second Inactivity Security Guard
To meet strict security requirements for executive accounts handling statutory disclosures:
- In `AuthContext.jsx`, a timer tracks user interactions (`mousemove`, `keydown`, `click`, `scroll`).
- If a Super Admin is idle for 20 seconds, a security modal displays:
  ```text
  ⚠️ Security Notice: Session Expiring Soon
  No activity detected. You will be logged out in 10 seconds to protect confidential statutory disclosures.
  [Stay Logged In] [Log Out Now]
  ```
- If no action is taken within the 10-second countdown, the token is destroyed, `localStorage` is purged, and the user is securely logged out.

```mermaid
sequenceDiagram
    autonumber
    actor User as Super Admin
    participant Client as React Client (AuthContext)
    participant API as Express API
    participant DB as MongoDB Atlas

    User->>Client: Enters Email & Password
    Client->>API: POST /api/auth/login
    API->>DB: User.findOne({ email }).select('+password')
    DB-->>API: User Document
    API->>API: bcrypt.compare(password, hash)
    API-->>Client: 200 OK { token, user: { role: 'Super Admin' } }
    Client->>Client: Stores token in localStorage & starts Inactivity Watcher (30s)
    
    Note over User,Client: User inactive for 20 seconds
    Client->>User: Displays Inactivity Warning Modal (10s Countdown)
    alt User clicks "Stay Logged In"
        User->>Client: Clicks "Stay Logged In"
        Client->>Client: Resets Inactivity Watcher
    else 10s expires without interaction
        Client->>Client: Purges localStorage & resets Auth state
        Client->>User: Redirects to /login?reason=timeout
    end
```

---

# 12. Module-by-Module Technical Breakdown

### Module 1: Dashboard (`/dashboard`)
- **Purpose**: Unified executive overview of ESG progress.
- **Components**: `KPICard.jsx`, Bar/Pie Recharts widgets, fast-action submission links, recent notification drawer.
- **Data Displayed**: Total Records, Completion Rate %, Clean Validations %, Pending Approvals Count, Environmental/Social/Governance category splits.
- **APIs**: `GET /api/esg/dashboard`, `GET /api/analytics`.

### Module 2: Organizations (`/organizations`)
- **Purpose**: Manage the 4-tier hierarchy (Group &rarr; Subsidiary &rarr; Business Unit &rarr; Project).
- **Features**: Visual tree navigator, hierarchy breadcrumbs, approval and verification actions for Super Admins, CIN/GSTIN tracking.
- **APIs**: `GET /api/organizations`, `GET /api/organizations/tree`, `POST /api/organizations`, `PUT /api/organizations/:id/approve`.

### Module 3: ESG Data Collection (`/data-collection`)
- **Purpose**: Universal data capture workspace for all 60+ statutory metrics.
- **Features**: Filterable data table, pre-submission AI validator button, evidence file modal, draft editing, bulk actions.
- **APIs**: `GET /api/esg`, `POST /api/esg`, `PUT /api/esg/:id/submit`, `DELETE /api/esg/:id`.

### Modules 4, 5, 6: Environmental, Social, Governance (`/environmental`, `/social`, `/governance`)
- **Purpose**: Domain-specific filtered views targeting specialized officers (Environmental Officer, HR Officer, Compliance Officer).
- **Implementation**: `CategoryPages.jsx` dynamically mounts `DataCollection` pre-filtered by category.

### Module 7: BRSR Reporting Center (`/brsr`)
- **Purpose**: Central hub for SEBI Business Responsibility & Sustainability Reporting disclosures.
- **Features**: Principles 1–9 progress trackers, Section A/B/C completion bars, auto-generate report button, instant statutory PDF & Excel download.
- **APIs**: `GET /api/brsr`, `POST /api/reports/generate`.

### Module 8: AI Statutory Validation & Copilot (`/validation`)
- **Purpose**: Automated statutory pre-audit engine and conversational AI assistant.
- **Features**:
  - Pinned ChatGPT-style chat interface spanning 100% full width with fixed 700px viewport.
  - One-click auto-audit tiles for 5 Department Streams and 5 Module Streams.
  - Interactive anomaly diagnostic findings card.
  - Direct PDF Statutory Audit Slip export (`exportAIValidationReportToPDF`).
  - Standalone Stored Audit Reports & PDF Vault tab.
  - Flagged Anomaly Alerts list with project links.
  - Statutory Rules Catalog detailing algorithmic rules VAL-AI-01 through VAL-AI-06.
- **APIs**: `POST /api/esg/validate`, `GET /api/esg`.

### Module 9: Documents & Evidence Vault (`/documents`)
- **Purpose**: Statutory proof repository for third-party audit readiness.
- **Features**: File uploader with drag-and-drop, Cloudinary storage, NABL calibration certificate tagging, document review and approval actions.
- **APIs**: `POST /api/documents/upload`, `GET /api/documents`, `PUT /api/documents/:id/review`.

### Module 10: Approvals & Workflow (`/approvals`)
- **Purpose**: Maker-Checker governance pipeline.
- **Features**: Grouped queue (`Pending Approvals`, `Correction Requests`, `Approved History`), document previews, batch approvals, rejection reason modals.
- **APIs**: `GET /api/esg`, `PUT /api/esg/:id/review`.

### Module 11: Consolidation & ESG Scoring (`/consolidation`)
- **Purpose**: Rollup field data across the hierarchy and compute composite ESG scores.
- **Features**: Multi-tier aggregation viewer, E-Score / S-Score / G-Score breakdown cards, letter grades (AAA to B), peer benchmarking comparison.
- **APIs**: `GET /api/esg/consolidated`, `GET /api/esg/score`.

### Module 12: Executive Reports (`/reports`)
- **Purpose**: Published statutory report archive.
- **Features**: Filterable dossier list, completion badges, one-click PDF & Excel exports.
- **APIs**: `GET /api/reports`.

### Module 13: Analytics & Trends (`/analytics`)
- **Purpose**: Business intelligence dashboard.
- **Features**: Year-over-year emissions trajectory, top 10 reporting organizations, top tracked metrics, department breakdown.
- **APIs**: `GET /api/analytics`.

### Module 14: Notifications (`/notifications`)
- **Purpose**: Real-time event notifications.
- **Features**: Read/unread toggles, mark all read, deep links to pending approvals or flagged records.
- **APIs**: `GET /api/notifications`, `PUT /api/notifications/:id/read`.

### Module 15: Audit Logs (`/audit-logs`)
- **Purpose**: Immutable statutory audit register for Super Admins.
- **Features**: Searchable table, filter by action (LOGIN, CREATE, SUBMIT, APPROVE, etc.), IP address tracking, metadata inspector.
- **APIs**: `GET /api/audit-logs`.

---

# 13. Page & Route Documentation

| Route | Page Component | Access | Allowed Roles | Description |
|---|---|---|---|---|
| `/` | `Landing.jsx` | Public | All | Presentation landing page with 3D character design, problem statement overview, and module highlights |
| `/login` | `Login.jsx` | Public | All | Unified login page (redirects to `/dashboard` if authenticated) |
| `/dashboard` | `Dashboard.jsx` | Protected | All Authenticated | Executive KPI dashboard, progress gauges, and recent activities |
| `/organizations`| `Organizations.jsx`| Protected | All Authenticated | 4-Tier organizational hierarchy tree and entity creation |
| `/data-collection`| `DataCollection.jsx`| Protected | All Authenticated | Comprehensive ESG metric data entry and table |
| `/environmental`| `CategoryPages.jsx` | Protected | All Authenticated | Pre-filtered view for Environmental metrics |
| `/social` | `CategoryPages.jsx` | Protected | All Authenticated | Pre-filtered view for Social & HR metrics |
| `/governance` | `CategoryPages.jsx` | Protected | All Authenticated | Pre-filtered view for Governance metrics |
| `/brsr` | `BRSR.jsx` | Protected | All Authenticated | SEBI BRSR 9-Principles reporting and completeness tracker |
| `/validation` | `Validation.jsx` | Protected | All Authenticated | AI Copilot interface, statutory audit slips, and rules catalog |
| `/documents` | `Documents.jsx` | Protected | All Authenticated | Cloud evidence vault, upload modal, and document approval |
| `/approvals` | `Approvals.jsx` | Protected | Reviewers & Admins | Maker-Checker queue for pending reviews and corrections |
| `/consolidation`| `ConsolidationScoring.jsx`| Protected | All Authenticated | Multi-tier metric rollups and composite ESG scoring engine |
| `/reports` | `Reports.jsx` | Protected | All Authenticated | Published reports repository with PDF and Excel export |
| `/analytics` | `Analytics.jsx` | Protected | All Authenticated | Recharts intelligence dashboard with trend graphs |
| `/notifications`| `Notifications.jsx`| Protected | All Authenticated | User notification feed |
| `/audit-logs` | `AuditLogs.jsx` | Protected | Super Admin Only | Immutable security audit trail table |

---

# 14. Algorithmic Validation & Business Rules

The backend engine (`aiValidationEngine.js`) enforces 4 distinct categories of automated checks:

### 14.1 Missing Data Rules
- **Rule VAL-AI-01 (Mandatory Blanks)**: Mandatory metrics (`Total Energy Consumption`, `Total Water Withdrawal`, `Scope 1 GHG Emissions`, `Fatalities`) cannot have empty or blank values. Severity: **HIGH**.
- **Rule VAL-AI-02 (Missing Units)**: Non-zero numerical entries must include standard units (e.g., `KL`, `MWh`, `MT`, `tCO2e`). Severity: **LOW**.
- **Rule VAL-AI-03 (Missing Audit Proof)**: Material environmental and safety metrics submitted without supporting documentation trigger an audit flag. Severity: **MEDIUM**.

### 14.2 Duplicate Record Collision Checks
- **Rule VAL-AI-04 (Duplicate Submissions)**: Checks for identical `(organization, projectId, reportingPeriod.year, reportingPeriod.quarter, metric)` tuples to prevent duplicate entries. Severity: **HIGH**.

### 14.3 Logical Inconsistencies & Physical Limits
- **Rule VAL-AI-05 (Negative Numbers)**: Consumption metrics (water, fuel, power, emissions) cannot be negative. Severity: **HIGH**.
- **Rule VAL-AI-06 (Gender Census Parity)**: `Female Employees` cannot exceed `Total Employees`. Severity: **HIGH**.
- **Rule VAL-AI-07 (Water Balance)**: `Water Recycled/Reused` cannot exceed `Total Water Withdrawal`. Severity: **HIGH**.
- **Rule VAL-AI-08 (Waste Conservation)**: `Waste Recycled` cannot exceed `Total Waste Generated`. Severity: **HIGH**.

### 14.4 Historical Outliers & Abnormal Spikes
- **Rule VAL-AI-09 (Multi-Fold Spike Detector)**: Compares current value against `previousRecord.value`. If consumption increases by **&gt; 200% (3x spike)** without a comment explaining the variance, an anomaly is flagged. Severity: **MEDIUM**.
- **Rule VAL-AI-10 (Severe Crash Alert)**: If operational energy drops by **&gt; 80%** without a facility shutdown notice, an alert is generated. Severity: **MEDIUM**.

### 14.5 Data Quality Index Formula
$$QualityScore = \max(78, \, \min(100, \, 100 - (High \times 18 + Medium \times 6 + Low \times 2)))$$

---

# 15. Multi-Tier Consolidation & Scoring Algorithm

The scoring engine (`esgScoreEngine.js`) evaluates approved data across 3 pillars:

### 15.1 Pillar Weightings
- **Environmental Score ($E$)**: **40% weight**
  - Renewable Energy Share ($\frac{\text{Renewable}}{\text{Total Energy}}$): Up to 35 points
  - Water Recycling ($\frac{\text{Water Recycled}}{\text{Water Withdrawal}}$): Up to 35 points
  - Waste Circularity ($\frac{\text{Waste Recycled}}{\text{Total Waste}}$): Up to 30 points
- **Social Score ($S$)**: **30% weight**
  - Gender Diversity ($\frac{\text{Female Employees}}{\text{Total Employees}}$): Up to 35 points
  - Occupational Health & Safety (Zero Fatalities + LTIR $\le$ 0.2): Up to 35 points
  - Training Hours per Employee ($\ge 20\text{ hrs/worker}$): Up to 30 points
- **Governance Score ($G$)**: **30% weight**
  - Board Independence ($\ge 50\%$ independent directors): Up to 35 points
  - Anti-Corruption & Ethics Training ($\ge 90\%$ completion): Up to 35 points
  - Clean Regulatory Compliance (Zero non-compliances): Up to 30 points

### 15.2 Final Composite Score & Letter Grade
$$\text{Composite Score} = (E \times 0.40) + (S \times 0.30) + (G \times 0.30)$$

| Composite Score | Letter Grade | Statutory Status |
|:---:|:---:|---|
| **90 – 100%** | **AAA** | Exemplary SEBI Core Compliance |
| **80 – 89%** | **AA** | Strong Sustainable Performance |
| **70 – 79%** | **A** | Compliant with Minor Gaps |
| **60 – 69%** | **BBB** | Adequate; Operational Action Required |
| **&lt; 60%** | **B** | High Regulatory Non-Compliance Risk |

---

# 16. Security Implementation

### 16.1 Implemented Security Features
- **Password Hashing**: Cryptographic salt rounds (`bcryptjs`, 12 rounds).
- **Stateless Authorization**: JWT token verification on all protected endpoints.
- **Strict Role-Based Access Control (RBAC)**: Middleware barriers (`superAdminOnly`, `adminOnly`, `reviewerOnly`, `managementAccess`).
- **Organization Boundary Enforcement**: `getAccessibleOrgIds` ensures Subsidiary and Project users cannot view or modify data outside their organizational hierarchy.
- **Safe Error Delivery**: Error handler suppresses internal database stack traces in production environments.
- **Multipart Upload Restrictions**: Multer file filter rejects unapproved extensions, restricting uploads to PDFs, images, and office documents under 10MB.
- **No-Cache Statutory Headers**: Prevents shared terminal caching of confidential disclosures via `no-store, no-cache` headers.
- **Super Admin Inactivity Protection**: 30-second automated timeout with 10-second countdown alert.

### 16.2 Recommended Future Security Enhancements
- Implement Redis-backed token blacklisting for immediate token revocation upon logout.
- Enforce mandatory Time-Based One-Time Password (TOTP) Multi-Factor Authentication (MFA) for Super Admin and Reviewer roles.
- Configure rate limiting (`express-rate-limit`) on `/api/auth/login` to prevent brute-force attacks.

---

# 17. Environment Variables Reference

| Variable Name | Required | Default / Example Value | Description |
|---|:---:|---|---|
| `PORT` | Yes | `5000` | Port for Express HTTP server |
| `NODE_ENV` | Yes | `development` or `production` | Operational environment flag |
| `MONGO_URI` | Yes | `mongodb+srv://<user>:<pwd>@cluster.mongodb.net/PS08` | MongoDB Atlas database connection string |
| `JWT_SECRET` | Yes | `64-character hex string` | Cryptographic secret for signing JWT tokens |
| `JWT_EXPIRE` | Yes | `7d` | Token expiration period |
| `CLOUDINARY_CLOUD_NAME`| Yes | `PS08` | Cloudinary account identifier |
| `CLOUDINARY_API_KEY` | Yes | `645296874356291` | Cloudinary public integration key |
| `CLOUDINARY_API_SECRET`| Yes | `WT9SEGgkf0RU2udgu0Avxd7XiQQ` | Cloudinary private secret key |
| `FRONTEND_URL` | No | `http://localhost:5173,https://ps08.vercel.app` | Whitelisted CORS origins |
| `SUPERADMIN_EMAIL` | No | `admin@esg360.com` | Optional boot sync email for Super Admin |
| `SUPERADMIN_PASSWORD` | No | `Admin@123456` | Optional boot sync password for Super Admin |
| `VITE_API_URL` (Frontend)| Yes | `http://localhost:5000/api` | Base API URL consumed by Axios client |

---

# 18. Local Development & Installation Setup

### 18.1 Prerequisites
- Node.js `v18.x` or `v20.x`
- npm `v9.x` or `v10.x`
- Active MongoDB instance (Local or MongoDB Atlas cluster)
- Free Cloudinary account for document uploads

### 18.2 Installation Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/ionode-cloud/BPUT-Hackathon-2026-PS04.git
   cd PS08
   ```

2. **Install Dependencies (Root, Backend, & Frontend)**:
   ```bash
   npm run install:all
   ```

3. **Configure Environment Variables**:
   Create `backend/.env`:
   ```ini
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/PS08
   JWT_SECRET=esg360_super_secret_jwt_key_2026_bput_hackathon_token
   JWT_EXPIRE=7d
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_key
   CLOUDINARY_API_SECRET=your_cloudinary_secret
   FRONTEND_URL=http://localhost:5173
   ```

   Create `frontend/.env`:
   ```ini
   VITE_API_URL=http://localhost:5000/api
   ```

4. **Initialize Super Admin Account & Clean Slate**:
   ```bash
   npm run seed
   ```
   *Purges dummy data and sets up the clean Super Admin account (`admin@esg360.com` / `Admin@12345`) ready for custom user input.*

5. **Run the Development Servers**:
   In two separate terminals:
   ```bash
   # Terminal 1: Backend Server (Port 5000)
   npm run backend

   # Terminal 2: Frontend Client (Port 5173)
   npm run frontend
   ```

6. **Access the Application**:
   - Web App: `http://localhost:5173`
   - API Health Check: `http://localhost:5000/api/health`

---

# 19. Production Build & Deployment

### 19.1 Frontend Production Build
```bash
cd frontend
npm run build
```
- Bundles the application using Vite Rollup into `frontend/dist/`.
- Assets are minified and code-split into vendor and UI chunks.

### 19.2 Vercel Deployment Configuration (`frontend/vercel.json`)
The application includes a production-ready `vercel.json` rewrite configuration that proxies all `/api/*` calls directly to the Render cloud backend and redirects all other routes to `index.html` for client-side routing:
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://bput-hackathon-2026.onrender.com/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 19.3 Backend Production Run (Render / Linux VM)
```bash
cd backend
npm install --omit=dev
npm start
```
Starts `node server.js` bound to `process.env.PORT`.

---

# 20. Third-Party Integrations

1. **MongoDB Atlas**: Cloud-hosted document database providing high availability, replica sets, connection pooling, and SSL transport encryption.
2. **Cloudinary**: Cloud image and file management platform utilized for statutory evidence documents (calibration invoices, weighbridge slips).
3. **Render**: Containerized cloud infrastructure hosting the Express API service with automated TLS/SSL.
4. **Vercel**: Global edge CDN hosting the React SPA frontend.

---

# 21. Testing & Code Quality

- **Linter**: Configured with `oxlint` in `frontend/package.json` for fast JavaScript and JSX syntax analysis.
- **Verification Strategy**:
  - `npm run build` executed on frontend verifying zero JSX/React syntax errors.
  - Manual end-to-end API verification of all 50 endpoints.
- **Unit Testing (Planned Enhancement)**: Jest and Supertest test suites for endpoint regression coverage.

---

# 22. Troubleshooting Guide

| Problem | Likely Cause | Verified Solution |
|---|---|---|
| **CORS Error in Browser** | Backend origin mismatch or missing header | Check `FRONTEND_URL` in `backend/.env`. `server.js` already includes dynamic matching for localhost and Vercel domains. |
| **Super Admin Logged Out after 30s** | Inactivity timeout triggered | Expected behavior. Click "Stay Logged In" on the warning modal to extend the session. |
| **Cloudinary Upload Fails** | Invalid or missing Cloudinary API credentials | Backend automatically falls back to local storage in `backend/uploads/`. Check terminal logs for fallback confirmation. |
| **MongoDB Connection Timeout** | Network firewall or IP access list issue | Ensure IP `0.0.0.0/0` is whitelisted in MongoDB Atlas Network Access tab. |
| **Vite 404 on Page Refresh** | Web server not routing SPA paths to `index.html` | Verify `frontend/vercel.json` contains the rewrite rule for `/(.*)` to `/index.html`. |
| **Cannot Login with Seed Account** | Database altered or unseeded | Run `npm run seed` in root or `node scripts/resetAdmin.js` in `backend/` to reset the Super Admin account. |

---

# 23. Complete File & Folder Reference

| File Path | Description / Responsibility |
|---|---|
| `package.json` | Root workspace scripts for concurrent dev, seeding, and building |
| `backend/server.js` | Express app entry point, middleware, routes, and DB initialization |
| `backend/config/db.js` | Mongoose MongoDB connection handler |
| `backend/config/cloudinary.js` | Cloudinary SDK initialization |
| `backend/middleware/auth.js` | JWT `protect` and role-based `authorize` guards |
| `backend/middleware/upload.js` | Multer memory storage and file extension validator |
| `backend/middleware/errorHandler.js` | 404 handler and global Express error handler |
| `backend/models/User.js` | User schema, bcrypt hooks, and role definitions |
| `backend/models/Organization.js` | 4-tier organizational hierarchy schema |
| `backend/models/ESGData.js` | 60+ ESG metric records, workflow statuses, and evidence links |
| `backend/models/BRSRReport.js` | SEBI BRSR report schema mapping 9 principles |
| `backend/models/Document.js` | Cloud-hosted compliance documents schema |
| `backend/models/AuditLog.js` | Immutable statutory audit logging schema |
| `backend/models/Notification.js` | User notification events schema |
| `backend/utils/aiValidationEngine.js` | Algorithmic missing data, duplicate, and outlier spike detector |
| `backend/utils/esgScoreEngine.js` | Weighted E (40%), S (30%), G (30%) scoring algorithm |
| `backend/utils/auditLogger.js` | Automatic audit log recorder helper |
| `frontend/src/App.jsx` | React Router route configuration with ProtectedRoute guards |
| `frontend/src/context/AuthContext.jsx`| Central authentication state and 30s idle timeout watcher |
| `frontend/src/services/api.js` | Axios client with Bearer token interceptor and 401 handling |
| `frontend/src/utils/exportUtils.js` | 47KB client-side PDF and Excel generation engine |
| `frontend/src/pages/Validation.jsx` | Full-width AI Copilot, Anomaly Alerts, and Rules Catalog |
| `frontend/src/pages/ConsolidationScoring.jsx` | Multi-tier metric rollups and composite ESG scoring view |
| `frontend/src/pages/Approvals.jsx` | Multi-tier reviewer queue and action dialogs |
| `frontend/src/pages/BRSR.jsx` | SEBI 9-Principle statutory reporting completion matrix |

---

# 24. End-to-End Implementation Walkthrough

```text
Scenario: Submitting & Approving Scope 1 GHG Emissions Data
─────────────────────────────────────────────────────────────
1. Officer Login:
   - Environmental Officer logs in at /login.
   - Assigned to "Bhadla 500MW Ultra Solar Park".

2. Telemetry Entry & Upload:
   - Navigates to /environmental (or /data-collection).
   - Selects Metric: "Scope 1 GHG Emissions".
   - Period: FY 2026 Annual.
   - Value: 420. Unit: tCO2e.
   - Attaches CEMS NABL Stack Test Report PDF.
   - Clicks "Save Draft".

3. Document Handling:
   - POST /api/documents/upload streams the PDF buffer to Cloudinary.
   - Returns secure URL: https://res.cloudinary.com/.../stack_test.pdf.
   - POST /api/esg saves the record in 'Draft' status.

4. AI Validation Scan:
   - Officer triggers AI validation check.
   - POST /api/esg/validate runs aiValidationEngine.js.
   - Result: 0 Critical Errors, Quality Score: 100%.

5. Submission:
   - Officer clicks "Submit for Review".
   - PUT /api/esg/:id/submit changes status to 'Submitted'.
   - AuditLog recorded: { action: 'SUBMIT', entity: 'ESGData' }.
   - Notification created for ESG Manager.

6. Reviewer Action:
   - ESG Manager opens /approvals.
   - Inspects the record and previews the stack test PDF.
   - Clicks "Validate". Status changes to 'Validated'.

7. Final Executive Sign-Off:
   - Super Admin approves the record. Status changes to 'Approved'.
   - Record is locked for editing.

8. Automatic Consolidation & Reporting:
   - Metric aggregates into "Solar BU" and "Clean Energy Ltd.".
   - esgScoreEngine.js incorporates 420 tCO2e into Environmental Score.
   - /brsr updates Principle 6 (Environmental Responsibility) indicator.
   - Officer exports official SEBI BRSR PDF Report with one click.
```

---

# 25. Project Status Summary

| Module / Capability | Implementation Status | Notes |
|---|:---:|---|
| **JWT Authentication** | **Implemented** | 7-day tokens, bcrypt 12-round hashing, auto plain-text upgrade |
| **Inactivity Guard** | **Implemented** | 30s timeout with 10s countdown modal for Super Admin |
| **4-Tier Org Hierarchy** | **Implemented** | Group &rarr; Subsidiary &rarr; BU &rarr; Project with recursive parent links |
| **ESG Data Collection** | **Implemented** | 60+ metrics across Environmental, Social, and Governance |
| **Evidence Vault** | **Implemented** | Cloudinary cloud integration with local disk fallback |
| **AI Validation Engine** | **Implemented** | Algorithmic detection of missing data, duplicates, outliers, and spikes |
| **AI Validation Copilot** | **Implemented** | ChatGPT-style interface with auto-validation tiles and PDF slips |
| **Maker-Checker Pipeline** | **Implemented** | Draft &rarr; Submitted &rarr; Validated &rarr; Approved workflow |
| **Consolidation Engine** | **Implemented** | Rollups across organizational hierarchy tiers |
| **ESG Scoring Algorithm** | **Implemented** | E (40%), S (30%), G (30%) weighting with AAA–B letter grades |
| **SEBI BRSR Reporting** | **Implemented** | Complete mapping of SEBI BRSR Section A, B, and C (Principles 1–9) |
| **PDF & Excel Export** | **Implemented** | Vector client PDF synthesis via jsPDF and multi-sheet Excel export |
| **Immutable Audit Logs** | **Implemented** | Cryptographic logging of 20 statutory compliance actions |
| **Direct Regulatory Filing** | **Planned / Future** | Direct XBRL upload to NSE/BSE portals |
| **Automated IoT Ingestion**| **Planned / Future** | Direct MQTT/SCADA smart meter ingestion |

---

# 26. Future Enhancements

### High Priority
1. **Direct SEBI XBRL Export**: Generate machine-readable XBRL XML files matching MCA and SEBI filing taxonomies.
2. **Role-Based Multi-Factor Authentication (MFA)**: Authenticator app TOTP integration for Super Admin and Approver roles.
3. **Automated Unit Conversion Engine**: Real-time conversions between imperial and metric units (e.g., Gallons &rarr; Liters, kWh &rarr; GJ).

### Medium Priority
1. **IoT Smart Meter Ingestion**: MQTT and webhook ingestion endpoints to stream real-time operational telemetry from plant CEMS meters.
2. **Custom Validation Rule Builder**: Visual formula editor enabling compliance officers to define custom mathematical threshold rules without code edits.

### Low Priority
1. **Multi-Language Interface**: Regional Indian language localization (Hindi, Telugu, Odia, Gujarati) for construction site supervisors.
2. **Blockchain Verification Hash**: Ethereum/Polygon cryptographic anchoring of approved BRSR report hashes for external auditing.

---

# 27. Statutory & Technical Glossary

| Term | Statutory / Technical Meaning |
|---|---|
| **BRSR** | Business Responsibility and Sustainability Reporting — Mandatory non-financial reporting framework established by SEBI in India. |
| **SEBI** | Securities and Exchange Board of India — Regulatory body governing Indian securities and capital markets. |
| **Scope 1 GHG** | Direct greenhouse gas emissions from company-owned or controlled sources (e.g., fuel combustion in company generators and boilers). |
| **Scope 2 GHG** | Indirect greenhouse gas emissions from the generation of purchased electricity, heating, or cooling consumed by the company. |
| **Scope 3 GHG** | All other indirect emissions across the corporate value chain (e.g., purchased raw materials, employee commuting, freight shipping). |
| **CEMS** | Continuous Emission Monitoring System — Automated instrumentation providing statutory pollution telemetry to Pollution Control Boards. |
| **LTIR** | Lost Time Injury Rate — Standard occupational health and safety metric measuring lost-time injuries per million man-hours worked. |
| **Maker-Checker** | Enterprise internal control procedure where data created by one user (Maker) must be independently reviewed and approved by another (Checker). |
| **NABL** | National Accreditation Board for Testing and Calibration Laboratories — Indian body certifying measurement device calibration certificates. |
| **SPA** | Single Page Application — Web application that dynamically rewrites the current web page without full browser page reloads. |

---

# 28. Final A-to-Z Summary

- **What is the project?** ESG360 is an enterprise ESG data management and SEBI BRSR reporting platform designed for large infrastructure conglomerates.
- **Who uses it?** Field officers (Environmental, HR, Safety, Compliance), unit managers, group ESG directors, third-party auditors, and executive board members.
- **What problem does it solve?** Replaces fragmented, unvalidated site spreadsheets with an authenticated, cloud-backed audit trail aligned with SEBI statutory requirements.
- **How does it work?** Officers capture operational metrics, the AI validation engine checks telemetry against physical limits and historical spikes, managers approve data, and the platform consolidates numbers into SEBI BRSR reports.
- **What technologies are used?** React 19, Vite, Vanilla CSS, Recharts, jsPDF, SheetJS on the frontend; Node.js, Express, Mongoose, MongoDB Atlas, Cloudinary on the backend.
- **How does the frontend communicate with the backend?** Axios HTTP client making RESTful requests with `Authorization: Bearer <JWT>` headers.
- **How is data stored?** MongoDB Atlas cloud cluster with 7 collections and indexes supporting fast hierarchical aggregation.
- **How does authentication work?** JWT tokens with 7-day validity, bcrypt password encryption, and a 30-second automated inactivity logout guard for Super Admins.
- **How are roles handled?** 9 role levels enforced by Express middleware (`protect`, `authorize`) on the backend and route guards (`ProtectedRoute`) on the frontend.
- **How are reports generated?** Client-side vector PDF and multi-sheet Excel generation using `jsPDF` and `xlsx`, mapping approved metrics to the 9 SEBI principles.
- **How is it deployed?** Vercel edge network for the React SPA; Render cloud service for the Express API; MongoDB Atlas for the database.
- **How can a new developer run it?** Clone the repository, run `npm run install:all`, configure `.env`, execute `npm run seed`, and start with `npm run backend` and `npm run frontend`.

---

# Documentation Verification

- **Total Frontend Modules Analyzed**: 15 modules (`Landing`, `Login`, `Dashboard`, `Organizations`, `DataCollection`, `Environmental`, `Social`, `Governance`, `BRSR`, `Validation`, `Documents`, `Approvals`, `ConsolidationScoring`, `Reports`, `Analytics`, `Notifications`, `AuditLogs`).
- **Total Backend Controllers Analyzed**: 8 controllers (`authController`, `organizationController`, `esgController`, `brrsController`, `documentController`, `analyticsController`, `auditLogController`, `notificationController`).
- **Total API Endpoints Documented**: 50 active production REST endpoints.
- **Total Database Models Documented**: 7 collections (`User`, `Organization`, `ESGData`, `BRSRReport`, `Document`, `AuditLog`, `Notification`).
- **Total User Roles Documented**: 9 roles (`Super Admin`, `Group ESG Admin`, `Subsidiary Admin`, `Business Unit Manager`, `Project/Department User`, `ESG Manager`, `Compliance Officer`, `Management`, `Auditor/Reviewer`).
- **External Integrations Confirmed**: MongoDB Atlas, Cloudinary, Render, Vercel.
- **Tests Evaluated**: Linter (`oxlint`) and production Vite compilation build verification (`npm run build` &rarr; Exit Code 0).

## Known Limitations / Missing Information
1. **External Regulatory API**: Direct live submission via official SEBI/NSE/BSE Web APIs is not currently available in India (filings occur via manual portal upload of compiled PDF/XBRL files).
2. **Automated Unit Testing Suite**: Automated unit and integration tests (e.g., Jest/Supertest) are currently not configured in `package.json` and are marked as a planned enhancement.
