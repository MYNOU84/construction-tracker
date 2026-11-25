# WP7 + WP8 — Free deployment on Vercel Hobby + Neon Free

The public demo runs at zero cost. The React build is served as static files by Vercel's CDN. The Express API
runs as a single serverless function (`api/index.ts`). Data lives in a Neon Free PostgreSQL database seeded
once with the fictional demo projects. Local development still uses SQLite (`server/prisma/dev.db`).

## Architecture

| Piece | Where | Notes |
|---|---|---|
| `client/dist` (Vite build) | Vercel static/CDN | Includes `/demo-docs/**`: fictional PDFs and SVGs, so no file storage is needed |
| `/api/*`, `/uploads/*` | `api/index.ts` → `server/src/app.ts` | One function, region `fra1`, `maxDuration` 30 s |
| Database | Neon Free, AWS Frankfurt (`eu-central-1`) | Pooled URL at runtime; direct URL for the one-time init |
| Uploads | Disabled (HTTP 403) | `DEMO_MODE` or `VERCEL` turns them off. No Blob or other paid storage |

`vercel.json` sets the build steps:

1. `npm install`. The root `postinstall` installs the server and the client.
2. `set-provider.js` switches Prisma to `postgresql` because `DATABASE_URL` is a Postgres URL.
3. `prisma generate`.
4. The client build.

There is no seeding and no schema change at build time or request time.

## Server-side demo protections (already enforced)

- `DEMO_MODE=true` makes every write return 403, except sign-in and sign-out.
- Password login is disabled.
- One-click sign-in is available only for `DEMO_USER_EMAILS`. ADMIN accounts are always refused.
- Upload routes return 403 before multer runs.
- Project permissions are unchanged. Contractor and client are members of Al Nour only; any other project returns 404.
- Recent-activity windows (dashboard "last 7 days", project analytics and stats "last 30 days") end at the
  latest daily-report date in scope, never after the real clock. The demo stays populated without reseeding.
  See `server/src/lib/clock.ts`.
- A hosted (PostgreSQL) seed never stores the known local development passwords. Accounts get `DEMO_PASSWORD`
  or a random value. Sign-in is one-click anyway.

## Steps

1. **Neon**
   1. Create a free account at neon.com. Do not add a payment method.
   2. Create a project in region AWS Frankfurt.
   3. Create the database `buildtrack_demo`.
   4. Copy two connection strings: the **direct** one, and the **pooled** one (its host contains `-pooler`).
2. **Initialise the database once**, from your machine in `server/`. In PowerShell:
   ```powershell
   $env:DEMO_DATABASE_URL="<direct URL>?sslmode=require"; npm run db:prod-init; Remove-Item Env:DEMO_DATABASE_URL
   ```
   This creates the tables with `prisma db push`, which refuses data-loss changes. It then seeds both fictional
   projects deterministically and restores the local SQLite Prisma client. Re-running it is safe.
   Optional: set `DEMO_ANCHOR=today` (or `YYYY-MM-DD`) first to choose the demo's "current day". The default is 2026-11-24.
3. **Vercel**
   1. Create a free Hobby account. Do not add a payment method.
   2. Import the Git repository and choose the branch to deploy. Leave Root Directory as `/`.
      `vercel.json` provides the rest.
   3. Add the environment variables below for **Production**.
   4. Deploy.
4. **Check the deployment**
   1. Open `/api/health`. It should return `{"status":"ok","db":"connected"}`.
   2. On the sign-in page, choose a demo account and check both projects.

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** URL, with `?sslmode=require&pgbouncer=true&connection_limit=1&connect_timeout=15` appended |
| `JWT_SECRET` | New random value, 32 or more characters: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Never reuse the local one. |
| `JWT_EXPIRES_IN` | `12h` |
| `DEMO_MODE` | `true` |
| `DEMO_USER_EMAILS` | `pm@buildtrack.com,engineer@buildtrack.com,consultant@buildtrack.com,contractor@buildtrack.com,client@buildtrack.com` |
| `NODE_ENV`, `VERCEL` | Set by Vercel automatically. Do not add them. |
| `CORS_ORIGIN` | Leave unset. The client and API share one origin. |
| `ALLOW_PASSWORD_LOGIN`, `ALLOW_REGISTRATION` | Leave unset (off). |

## Free-tier limits (checked 2026-11-25)

| Service | Limits relevant here | Over the limit |
|---|---|---|
| Vercel Hobby | 1M function invocations/month; 4 h Active CPU; 360 GB-h memory; 100 GB Fast Data Transfer; 10 GB Fast Origin Transfer; function bundle 250 MB; max duration 300 s with Fluid compute | Usage pauses until the next window, up to 30 days. Nothing is billed. Non-commercial use only. |
| Neon Free | 100 CU-hours per project per month; 1 GB storage per project; 10 branches; scales to zero after 5 minutes idle; 5 GB egress/month | Compute suspends. No overage charges without a paid plan. |

The demo database is about 2 MB. A cold start after Neon scale-to-zero adds about 0.5–1 s to the first request.

Sources:

- https://vercel.com/docs/plans/hobby
- https://vercel.com/docs/limits
- https://vercel.com/docs/functions/limitations
- https://neon.com/docs/introduction/plans
- https://neon.com/faqs/free-plan-limits-and-quotas
- https://neon.com/pricing

## Retired

`railway.toml` was removed: the project no longer targets Railway. `SESSION_3.md` and `SESSION_4.md` keep the
historical Railway notes. The root `npm start` still works for a self-hosted Node server, which serves
`client/dist` itself when `VERCEL` is not set.
