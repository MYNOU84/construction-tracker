# BuildTrack Pro — Construction Progress Tracker

A full-stack, production-ready construction project management system with daily, weekly, and monthly reporting, role-based access, dashboards, analytics, PDF/Excel export, document management, and more.

---

## Quick Start

### Option A: One-Click Setup (Windows)
Double-click **`START.bat`** in the project root.

### Option B: Manual Setup

**Prerequisites:** Node.js 18+

```bash
# 1. Install dependencies
npm install
cd server && npm install
cd ../client && npm install
cd ..

# 2. Set up database & seed demo data
cd server
npx prisma generate
npx prisma migrate dev --name init
npx tsx src/seed.ts
cd ..

# 3. Start both servers
npm run dev
```

**App:** http://localhost:5173  
**API:** http://localhost:5000

### Upgrading an existing local database

`START.bat` and `npm start` check the schema of an existing `server/prisma/dev.db`
without changing it. If the database predates a schema change they stop and say so.
To upgrade (a backup is written to `server/prisma/backups/` first, and no data is dropped):

```bash
cd server
npm run db:check     # read-only: reports whether an upgrade is needed
npm run db:upgrade   # backup + upgrade
```

### Environment

Copy `server/.env.example` to `server/.env` and set a long random `JWT_SECRET`
(the file explains how to generate one). Every environment needs its **own** secret:
a deployed instance must use a separate production secret set in the hosting
provider's environment variables, never the local one. See [SECURITY.md](SECURITY.md).

---

## Demo Accounts

> **Local development only.** These accounts are created by the local seed script.
> Their passwords must never be used on a hosted database. On the hosted deployment the
> demo accounts are one-click, read-only and limited to the fictional projects, while the owner
> signs in with a password set by `npm run owner:init` (see docs/WP7-DEPLOYMENT.md).

| Role | Email | Password |
|------|-------|----------|
| Administrator | admin@buildtrack.com | admin123 |
| Project Manager | pm@buildtrack.com | pm123456 |
| Site Engineer | engineer@buildtrack.com | eng12345 |
| Consultant | consultant@buildtrack.com | cons1234 |

---

## Features

### Project Management
- Multi-project portfolio with progress tracking
- Team members with role-based permissions
- Project status: Planning → Active → On Hold → Completed

### Daily Reports (Rapports Journaliers)
- Weather conditions, temperature, humidity
- Manpower by trade and company
- Equipment status
- Materials received
- Work activities with discipline/area/progress
- Delays and issues tracking
- Safety & HSE observations
- Inspections and pending actions
- Status workflow: Draft → Submitted → Approved

### Weekly Reports (Rapports Hebdomadaires)
- Auto-generated from daily reports
- Manpower trend charts
- Narrative sections
- KPI indicators

### Monthly Reports (Rapports Mensuels)
- Full progress summary
- Discipline breakdown: Structure, Architecture, MEP, Infrastructure
- KPI dashboard
- Milestone status
- Risk and NCR summary
- Budget tracking

### Schedule & Tasks
- Activity management with Gantt view
- Discipline-grouped activities
- Milestone tracking with status
- Progress monitoring

### Documents
- Multi-type uploads: Drawings, RFIs, Permits, Photos, Reports
- File organization by type
- Revision tracking

### Risks & NCRs
- Risk register with probability/impact matrix
- Risk scoring and level (Low/Medium/High/Critical)
- Non-Conformance Reports (NCRs)
- Mitigation tracking

### Analytics Dashboard
- Portfolio overview
- Manpower trend charts
- Discipline progress breakdowns
- Activity status distribution
- Milestone timeline
- Weather analysis

### Export
- **PDF Reports**: Professional formatted reports for Daily, Weekly, Monthly
- **Excel Export**: Multi-sheet workbooks with all data

### User Management
- 6 roles: Admin, Project Manager, Site Engineer, Consultant, Contractor, Client Viewer
- User activation/deactivation
- Per-project team assignment

---

## Security

Sessions use an httpOnly cookie, state-changing requests require a CSRF header, every
project route checks membership, uploads are allow-listed, and demo accounts are read-only and
limited to the fictional projects on the server. Details, configuration and known limitations are in [SECURITY.md](SECURITY.md).

Run the security regression suite (it uses its own temporary database and never touches
`dev.db`):

```bash
cd server
npm run test:security
```

Latest results: [server/tests/security/RESULTS.md](server/tests/security/RESULTS.md).

Dependency and export regression checks (offline, no database):

```bash
npm run test:deps      # removed packages stay removed, patched versions stay installed
npm run test:exports   # every PDF and Excel export against fictional fixtures
```

Dependency audit, versions and residual risks: [docs/WP2-DEPENDENCIES.md](docs/WP2-DEPENDENCIES.md).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS (custom design system) |
| Charts | Recharts |
| State | Zustand + React Query |
| Forms | React Hook Form |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite (via Prisma ORM) |
| Auth | JWT + bcryptjs |
| Files | Multer |
| PDF | jsPDF + jspdf-autotable |
| Excel | ExcelJS |

---

## Project Structure

```
construction-tracker/
├── client/                  # React frontend
│   └── src/
│       ├── api/             # API client & endpoints
│       ├── components/      # UI components
│       ├── pages/           # Page components
│       ├── store/           # Zustand store
│       ├── types/           # TypeScript types
│       └── utils/           # Helpers + export utils
├── server/                  # Express backend
│   ├── prisma/             # Database schema
│   └── src/
│       ├── controllers/    # Route handlers
│       ├── middleware/     # Auth + upload
│       ├── routes/         # API routes
│       └── utils/          # JWT + helpers
└── START.bat               # One-click startup
```
