# BuildTrack Pro — Construction Management Platform

## Quick Start

Double-click `START.bat` in the `construction-tracker` folder.

| URL | Purpose |
|-----|---------|
| http://localhost:5173 | Web application |
| http://localhost:5000 | API server |

## Login Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@buildtrack.com | admin123 |
| Project Manager | pm@buildtrack.com | pm123456 |
| Engineer | engineer@buildtrack.com | eng12345 |

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Recharts
- **Backend**: Node.js + Express + Prisma ORM + SQLite
- **State**: TanStack React Query + Zustand

## Project Structure

```
construction-tracker/
├── client/          # React frontend
│   └── src/
│       ├── pages/   # All page components
│       ├── components/
│       ├── api/     # API endpoint functions
│       ├── store/   # Auth store (Zustand)
│       ├── types/   # TypeScript types
│       └── utils/   # Helpers, export functions
└── server/          # Express backend
    └── src/
        ├── controllers/
        ├── routes/
        └── prisma/  # Schema + SQLite DB
```

## Key Features

- **Projects** — Full CRUD, status tracking, budget, progress
- **Daily Reports** — Bilingual FR/EN, LOT-based tasks, manpower, HSE indicators, weather
- **Weekly Reports** — Manpower breakdown, LOT production table, PDF/Excel export
- **Monthly Reports** — KPIs, milestones, financial summary
- **Schedule & Tasks** — Gantt-style task management
- **Documents** — File attachments per project
- **Risks & NCRs** — Risk register with severity matrix
- **Plant & Equipment** — On-site equipment register with cert expiry
- **Site Resources** — Workforce register (Direct/Indirect manpower)
- **Analytics** — Cross-project dashboard
- **Users** — Role-based access control

## Theme

Dark cyberpunk neon theme — CSS variables in `client/src/index.css`:
- `--cyan: #00d4ff` — primary accent
- `--violet: #8c3aff` — secondary accent
- `--bg-card: #0d1428` — card background

## PDF/Excel Export

Located in `client/src/utils/exportPDF.ts` and `exportExcel.ts`.
Uses `jsPDF` + `jspdf-autotable` + `xlsx`.
