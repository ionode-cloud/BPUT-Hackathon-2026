# ESG360 — Smart BRSR Reporting & ESG Compliance Portal

**BPUT Hackathon 2026 | Problem Statement 08**

A complete, professional MERN stack application for structured ESG data collection, multi-tier consolidation, and SEBI BRSR-aligned reporting for infrastructure groups.

> 📖 **Comprehensive Project & Architecture Documentation**: For complete end-to-end technical blueprints, all 50 API endpoint references, database schemas, sequence diagrams, mathematical consolidation algorithms, and ER diagrams, see [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md).

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

#Admin Id Pass
admin@esg360.com //Admin@12345