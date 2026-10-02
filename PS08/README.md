# ESG360 — Smart BRSR Reporting & ESG Compliance Portal

**BPUT Hackathon 2026 | Problem Statement 08**

A complete, professional MERN stack application for structured ESG data collection, multi-tier consolidation, and SEBI BRSR-aligned reporting for infrastructure groups.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account (for document uploads)

### 1. Configure Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, and Cloudinary credentials
npm install
npm run dev
```

### 2. Configure Frontend

```bash
cd frontend
cp .env.example .env
# Edit VITE_API_URL if backend runs on a different port
npm install
npm run dev
```

The app will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Health check**: http://localhost:5000/api/health

---

## 🏗️ Project Structure

```
ESG360/
├── backend/
│   ├── config/          # MongoDB & Cloudinary config
│   ├── controllers/     # Business logic
│   ├── middleware/      # Auth, upload, error handling
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express routers
│   ├── utils/           # Audit logger, notifications, helpers
│   ├── server.js        # Express entry point
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/  # layout/, common/
    │   ├── context/     # AuthContext
    │   ├── pages/       # All 14 modules
    │   ├── routes/      # ProtectedRoute
    │   ├── services/    # api.js, authService.js
    │   └── styles/      # global.css, layout.css, components.css
    └── .env.example
```

---

## 📊 Modules

| Module | Description |
|--------|-------------|
| **Dashboard** | KPI cards, ESG category summaries, charts, progress tracking |
| **Organizations** | Group → Subsidiary → Business Unit → Project hierarchy |
| **ESG Data Collection** | Create, draft, edit, submit records with validation |
| **Environmental** | Energy, water, waste, emissions, renewable energy |
| **Social** | Employees, diversity, OHS, training, community |
| **Governance** | Board, policies, ethics, anti-corruption, risk |
| **BRSR Reporting** | SEBI BRSR section mapping, completeness tracking |
| **Validation** | Data quality checks, required fields, reviewer workflow |
| **Documents** | Cloudinary file upload, evidence management |
| **Approvals** | Submit → Under Review → Validated → Approved workflow |
| **Reports** | Generate from approved data, section completion |
| **Analytics** | Charts, trends, org comparisons, consolidation |
| **Notifications** | Event-driven, read/unread, per-user scope |
| **Audit Logs** | Immutable action log with filtering |

---

## 👥 Supported Roles

1. Super Admin
2. Group ESG Admin
3. Subsidiary Admin
4. Business Unit Manager
5. Project/Department User
6. ESG Manager
7. Compliance Officer
8. Management
9. Auditor/Reviewer

---

## 🔄 Approval Workflow

```
Draft → Submitted → Under Review → Validated → Approved → Consolidated → Reported
                ↗ (Correction Required → Resubmission)
```

---

## 🛡️ Security

- JWT authentication (7-day expiry)
- bcrypt password hashing (12 salt rounds)
- Role-based access control on every API endpoint
- Organization-scope enforcement (users cannot access outside their hierarchy)
- Cloudinary file type and size validation (10MB max)
- Secure error responses (no stack traces in production)

---

## 🎨 Design

- **Theme**: Professional light corporate — Forest Green (#176B45) primary brand
- **Layout**: Full-width fluid layout on all authenticated pages
- **Typography**: Inter font (Google Fonts)
- **Responsive**: Supports 320px to 1200px+ breakpoints
- **Charts**: Recharts (Bar, Pie, Line)
- **Icons**: Lucide React

---

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/profile` | Get current user |
| GET | `/api/organizations` | List organizations |
| POST | `/api/organizations` | Create organization |
| GET | `/api/esg` | List ESG records |
| POST | `/api/esg` | Create ESG record |
| PUT | `/api/esg/:id/submit` | Submit for review |
| PUT | `/api/esg/:id/review` | Reviewer action |
| GET | `/api/brsr` | List BRSR reports |
| POST | `/api/reports/generate` | Generate BRSR report |
| POST | `/api/documents/upload` | Upload evidence |
| GET | `/api/analytics` | Analytics data |
| GET | `/api/audit-logs` | Audit trail |

---

## 📌 Notes

- BRSR reference: **SEBI BRSR 2023-24**
- External regulatory filing: **Not implemented** (as per SRS scope)
- Demo data: Not pre-loaded — create organizations and records after login
- All analytics use **real database records only**

---

*Built for BPUT Hackathon 2026 — Problem Statement 08*
