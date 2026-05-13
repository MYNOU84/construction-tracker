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

---

## Demo Accounts

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

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS (custom design system) |
| Charts | Recharts |
| State | Zustand + React Query |
| Forms | React Hook Form + Zod |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite (via Prisma ORM) |
| Auth | JWT + bcryptjs |
| Files | Multer |
| PDF | jsPDF + jspdf-autotable |
| Excel | xlsx (SheetJS) |

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
