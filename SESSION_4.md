# Session 4 — Full Production Review & Railway Deployment

**Date:** 2026-05-13

---

## Summary

Full codebase audit and production hardening. Fixed critical bugs, security issues, missing API endpoints, and attempted Railway deployment with PostgreSQL.

---

## Issues Found & Fixed

### 1. Multiple PrismaClient Instances (CRITICAL)
- **Problem:** Each of the 6 controllers created its own `new PrismaClient()` — causes PostgreSQL connection pool exhaustion in production
- **Fix:** Created `server/src/lib/prisma.ts` singleton, all controllers now import from it

### 2. Missing DELETE API Endpoints
- **Problem:** No DELETE routes for Milestone, Risk, or NCR — UI delete buttons had no backend
- **Fix:** Added `deleteMilestone`, `deleteRisk`, `deleteNCR` handlers in `reportController.ts` and registered routes in `routes/index.ts`

### 3. Missing getUserAnalytics Route
- **Problem:** Controller existed but was never registered in routes
- **Fix:** Added `GET /analytics/users` route

### 4. No Rate Limiting
- **Problem:** Auth endpoints had no protection against brute force
- **Fix:** Created `server/src/middleware/rateLimit.ts` using `express-rate-limit` — 20 req/15min on auth, 500 req/15min on API

### 5. No Input Validation on Auth
- **Problem:** Login/register accepted any input including invalid emails and empty fields
- **Fix:** Added email format check, password length (min 6), required field validation, email normalisation (lowercase trim)
- **Fix:** Blocked self-elevation to ADMIN role via public register

### 6. Insecure JWT Secret Fallback
- **Problem:** `jwt.ts` used `'fallback_secret'` silently in production
- **Fix:** Now throws a hard error if `JWT_SECRET` is not set in production

### 7. No Global Error Handler
- **Problem:** Unhandled errors returned raw stack traces or crashed silently
- **Fix:** Added 4-param Express error handler in `app.ts`, hides stack trace in production

### 8. Shallow Health Check
- **Problem:** `/api/health` returned `{status: 'ok'}` without verifying DB
- **Fix:** Now pings the database with `SELECT 1` — returns `db: connected` or 503 if DB is down

### 9. No React Error Boundary
- **Problem:** Any React crash showed a blank white screen
- **Fix:** Added `ErrorBoundary` class component wrapping the entire app in `App.tsx`

### 10. Missing Client API Methods
- **Problem:** `milestonesApi`, `risksApi`, `ncrsApi` had no `delete()` method
- **Fix:** Added `delete()` to all three in `endpoints.ts`

### 11. Double npm install in Railway Pipeline
- **Problem:** `buildCommand = "npm run install:all && npm run build"` caused 3x installs
- **Fix:** Simplified to `buildCommand = "npm run build"` — `postinstall` handles sub-packages

### 12. No .env.example
- **Fix:** Created `server/.env.example` with all required variables documented

---

## Railway Deployment Journey

### Problem 1 — node_modules in git (Session 2, already fixed)
Initial commit had 9,596 node_modules files tracked → Railway mount error

### Problem 2 — Wrong start script
`"start": "node server/index.js"` → changed to `cd server && node dist/index.js`

### Problem 3 — server/.env committed to git
`server/.env` contained `DATABASE_URL="file:./dev.db"` — deployed to Railway and overrode the injected PostgreSQL URL
- **Fix:** `git rm --cached server/.env` — removed from tracking

### Problem 4 — DATABASE_URL not injected
PostgreSQL plugin was added but not linked to the web service → `DATABASE_URL` not available at runtime
- **Status:** Pending — user needs to add `DATABASE_URL` variable in Railway web service Variables tab

### Problem 5 — SQLite vs PostgreSQL schema conflict
`schema.prisma` provider must be static — can't use `env()` for provider field
- **Fix:** Created `server/scripts/set-provider.js` — auto-detects provider from DATABASE_URL at build time
  - `file:...` → `sqlite` (local development)
  - `postgresql://...` → `postgresql` (Railway production)
- Build script: `node scripts/set-provider.js && prisma generate && tsc`

### Problem 6 — Local app broken (missing .env + unseeded DB)
`git rm --cached server/.env` also removed the local file
- **Fix:** Recreated `server/.env` with SQLite config
- **Fix:** Ran `npm run seed` → seeded demo accounts

---

## Demo Credentials (Local)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@buildtrack.com | admin123 |
| Project Manager | pm@buildtrack.com | pm123456 |
| Engineer | engineer@buildtrack.com | eng12345 |
| Consultant | consultant@buildtrack.com | cons1234 |

---

## Files Changed

| File | Change |
|------|--------|
| `server/src/lib/prisma.ts` | NEW — Prisma singleton |
| `server/src/middleware/rateLimit.ts` | NEW — Rate limiting |
| `server/scripts/set-provider.js` | NEW — Auto-detect SQLite/PostgreSQL |
| `server/.env.example` | NEW — Deployment guide |
| `server/src/app.ts` | Global error handler, DB health check |
| `server/src/utils/jwt.ts` | Throws in production if JWT_SECRET missing |
| `server/src/controllers/*.ts` | All use Prisma singleton |
| `server/src/controllers/reportController.ts` | Added deleteMilestone/Risk/NCR |
| `server/src/routes/index.ts` | Added DELETE routes + getUserAnalytics + rate limiting |
| `server/src/controllers/authController.ts` | Input validation |
| `server/package.json` | Added express-rate-limit, set-provider in build |
| `server/prisma/schema.prisma` | Provider set to sqlite (auto-switched at build) |
| `client/src/App.tsx` | React ErrorBoundary |
| `client/src/api/endpoints.ts` | Added delete() to milestones/risks/ncrs |
| `railway.toml` | Simplified buildCommand |

---

## Railway Deployment — Remaining Step

To complete Railway deployment, add `DATABASE_URL` to your web service:

1. Railway dashboard → PostgreSQL service → **Connect** tab → copy connection string
2. Railway dashboard → Web service → **Variables** tab → New Variable
3. Name: `DATABASE_URL`, Value: paste the PostgreSQL connection string
4. Railway auto-redeploys — build will detect `postgresql://` and switch Prisma provider

Also ensure these variables are set on the web service:
- `NODE_ENV` = `production`
- `JWT_SECRET` = any long random string
