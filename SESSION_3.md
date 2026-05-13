# Session 3 — Railway PostgreSQL Migration

**Date:** 2026-05-13

---

## Summary

Short session focused entirely on fixing the Railway production deployment by switching the database from SQLite to PostgreSQL.

---

## Problem

After the Session 2 fix (removing node_modules from git), Railway was still not fully production-ready because:

- SQLite stores data in a local file (`dev.db`) — on Railway this file is **ephemeral** (wiped on every redeploy)
- No `DATABASE_URL` was configured for production
- `prisma migrate deploy` was used but no migration files existed, so tables would never be created

---

## Solution — Switch to PostgreSQL

PostgreSQL is the correct choice for Railway because:
- Railway has a native **PostgreSQL plugin** that auto-injects `DATABASE_URL`
- Data persists across deploys
- No volume mounting or manual configuration needed

---

## Files Changed

### `server/prisma/schema.prisma`
Changed database provider from SQLite to PostgreSQL:
```prisma
datasource db {
  provider = "postgresql"   // was: "sqlite"
  url      = env("DATABASE_URL")
}
```

### `server/package.json`
Added `prisma generate` to the build step so the Prisma client is generated for the correct provider:
```json
"build": "prisma generate && tsc"
```

### `package.json` (root)
Switched from `prisma migrate deploy` (requires migration files) to `prisma db push` (syncs schema directly — no migration files needed for a fresh database):
```json
"start": "cd server && npx prisma db push && node dist/index.js"
```

---

## Railway Setup Instructions

After pushing these changes, do the following in the Railway dashboard:

1. **Add PostgreSQL database:**
   - Project → **+ New** → **Database** → **Add PostgreSQL**
   - Railway auto-injects `DATABASE_URL` into the service — no manual value needed

2. **Add environment variable** to the web service:
   ```
   NODE_ENV=production
   ```

3. **Trigger a new deploy.**

---

## Deploy Pipeline (after fix)

| Phase | Command | What it does |
|-------|---------|--------------|
| Build | `npm run install:all` | Installs root + server + client deps |
| Build | `npm run build` | Runs `prisma generate && tsc` (server) + Vite build (client) |
| Start | `npx prisma db push` | Creates all tables in fresh PostgreSQL DB |
| Start | `node dist/index.js` | Starts Express server on Railway's `PORT` |

---

## Architecture Notes

- Server serves both the API (`/api/*`) and the compiled React client (`client/dist`) as static files in production — no separate frontend service needed
- Uploads (`/uploads/*`) served from `server/uploads/` — note these are also ephemeral on Railway unless a volume is mounted
- All JSON data (manpower, equipment, etc.) stored as `String` columns — fully compatible with both SQLite and PostgreSQL, no schema changes needed beyond provider switch
