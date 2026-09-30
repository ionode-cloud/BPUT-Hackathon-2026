# CampusLink – AI-Powered Campus-to-Corporate Placement Platform

Production-ready placement management system: **Profiling → Matching → Scheduling → Notification → Offer Tracking → Analytics**,
with role-based portals, PyTorch AI models and an on-premise LLM.

| | |
|---|---|
| **AI (all PyTorch, CPU-only inference)** | PlacementNet deep ensemble (placement probability, at-risk, Integrated-Gradients explanations) · Skill2Vec embeddings · FitNet learned ranker (RankNet) · JD role classifier · on-prem LLM via Hugging Face transformers |
| **Portals** | Placement officer & admin command centre · student · recruiter · faculty mentor |
| **Security** | JWT auth, PBKDF2 passwords, role-based access with data scoping, audit trail, rate limiting, security headers, production-config guard |
| **Platform** | FastAPI · PostgreSQL (SQLite for demo) · Alembic · React + Recharts · Nginx · Docker Compose · Prometheus metrics · JSON logs |
| **Quality** | 39 pytest tests (SQLite **and** PostgreSQL) · ruff · GitHub Actions CI |

## 1. Demo on a laptop (synthetic campus, demo sign-ins)

```bash
./run.sh              # Windows: run.bat   → http://localhost:8000
# or with hot reload:  make install && make api   (and in another terminal)  make web  → http://localhost:5173
# or in Docker:        docker compose -f docker-compose.demo.yml up --build
```

| Role | E-mail | Password |
|---|---|---|
| Placement officer | officer@campuslink.edu | Officer@123 |
| Administrator | admin@campuslink.edu | Admin@123 |
| Student | student@campuslink.edu | Student@123 |
| Recruiter (Nimbus Cloud) | recruiter@nimbus.example.com | Recruiter@123 |
| Faculty mentor | mentor@campuslink.edu | Mentor@123 |

First start takes ~20 s (creates the database and trains the PyTorch models; later starts load them from `backend/data/models`).

## 2. College deployment (PostgreSQL + Nginx)

```bash
cp .env.example .env          # set SECRET_KEY, POSTGRES_PASSWORD, ADMIN_EMAIL/ADMIN_PASSWORD, PUBLIC_URL
docker compose up -d --build  # web (Nginx :80) → api (FastAPI + PyTorch) → db (PostgreSQL 16)
```

Then: sign in as the admin (change the password) → **Administration**: add campuses, venues, companies, staff and
recruiter accounts → import past placement outcomes (`/api/admin/history/template.csv`) → **Retrain all models** →
import students (CSV) and hand out their portal credentials. With `ENV=production` the API refuses to start with a default
secret, default admin password or demo mode. Put TLS in front (or terminate it in Nginx).

## 3. Resume PDFs

* **Students** sign in → *My Dashboard* → **My resume** → drag & drop or choose their PDF → review the preview (new skills,
  projects, certifications, best-fit role) → **Apply to profile**. Readiness and drive rankings update immediately.
* **Placement officer** registering a student → *Student Readiness* → *+ Add / import students* → **📄 Upload resume PDF**
  → the form is pre-filled and the PDF is attached to the new profile.
* Text-based PDFs only (≤ 5 MB, ≤ 10 pages); scanned image PDFs are rejected. CGPA, marks and backlogs always come from the
  official record, never from the resume. Recruiters can download resumes only for candidates in their own drive pools.

## 4. Deleting a student

Placement officer or admin → *Student Readiness* → 🗑 on the student's row (or **Delete student** on their page) → type the
roll number to confirm. The profile, drive applications, resume PDFs and portal login are removed, affected drive pools are
re-ranked, and the action is written to the audit log. Students who already have offers cannot be deleted, because offers
are part of the hash-chained offer ledger; withdraw the offer instead.

## 5. Offline LLM (optional)

```bash
pip install transformers                       # included in requirements.txt
LLM_MODEL=Qwen/Qwen2.5-0.5B-Instruct           # downloaded once (~1 GB), then cached; can be a local folder
LLM_BACKEND=transformers                       # transformers | ollama | none
```
Without it, the assistant and resume builder use the built-in rule + retrieval engine.

**CPU only.** Every model – including the LLM – runs on the CPU; no GPU is needed or used. PyTorch threads are set by
`TORCH_THREADS` (0 = auto) and the LLM is int8-quantised for CPU (`LLM_QUANTIZE=true`). Per-model CPU latencies are shown
on the Model Evaluation page (the task models answer in a few milliseconds on a 2-core CPU).

## 6. Developer workflow

```bash
make test        # pytest (SQLite)
make test-pg     # pytest against PostgreSQL (TEST_DATABASE_URL)
make lint        # ruff + frontend build
make audit       # checks all 62 problem-statement requirements through the live API
make migration m="describe change"   # new Alembic revision
```
API docs: `http://localhost:8000/docs` · metrics: `/metrics` · health: `/api/health`, `/api/ready`.

## Project layout

```
backend/
  app/core/          config (pydantic-settings), security (JWT, PBKDF2), observability (logs, metrics, rate limit)
  app/api/           deps (auth, RBAC, scoping, audit), serializers, routers/{auth, students, recruitment, offers,
                     insights, portal, admin, system}
  app/engines/       readiness, matching, scheduler, offers ledger, notifications, analytics, onboarding, llm, evaluation
  app/ml/            PyTorch models: placement (deep ensemble + IG), skill2vec, fitnet, roleclf, core (trainer, metrics)
  app/models.py      SQLAlchemy ORM · app/schemas.py Pydantic inputs · app/seed.py synthetic data
  migrations/        Alembic
  tests/             39 tests (engines, models, API, RBAC, onboarding, security)
frontend/            React app (role-based portals), Dockerfile, nginx.conf
docs/                CampusLink_Documentation.pdf, screenshots, evaluation_report.json
docker-compose.yml   production stack · docker-compose.demo.yml one-container demo · .env.example · Makefile · .github/workflows/ci.yml
```

All people and companies in the demo data are fictional.
