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
| Uploads | Neon, table `buildtrack_files.stored_file` | `UPLOAD_STORAGE=database` (the default when `VERCEL` is set). 4 MB per file, within Vercel's 4.5 MB request limit. No Blob or other paid storage |

`vercel.json` sets the build steps:

1. `npm install`. The root `postinstall` installs the server and the client.
2. `set-provider.js` switches Prisma to `postgresql` because `DATABASE_URL` is a Postgres URL.
3. `prisma generate`.
4. The client build.

There is no seeding and no schema change at build time or request time.

## Access model (enforced on the server)

- **Owner and real users.** They sign in with e-mail and password (`passwordLogin` is on). The owner (ADMIN)
  creates, edits and archives projects, manages users, and grants or revokes project roles. A project manager
  manages their own projects. Every other role sees only the projects it belongs to; any other project returns 404.
- **Public demo.** With `DEMO_MODE=true`, the accounts in `DEMO_USER_EMAILS` are demo accounts:
  - one-click sign-in only; password login is refused (403);
  - ADMIN accounts are never offered and are refused;
  - they see only the fictional projects (ids starting with `demo-`); any other project returns 404;
  - every write, upload and report generation returns 403 `{demo:true}`; reading and exporting (PDF, Excel,
    complete export) are allowed.
  The UI hides write controls for these accounts and shows a banner, but the server is the authority.
- Real accounts never see the demo projects, so the two sets of data never mix.
- Public registration stays closed (`ALLOW_REGISTRATION` unset).
- Recent-activity windows (dashboard "last 7 days", project analytics and stats "last 30 days") end at the
  latest daily-report date in scope, never after the real clock. The demo stays populated without reseeding.
  See `server/src/lib/clock.ts`.
- A hosted (PostgreSQL) seed never stores the known local development passwords. Accounts get `DEMO_PASSWORD`
  or a random value.

## Uploads

Vercel's filesystem is not persistent, so on Vercel uploaded documents and photos are stored as bytes in Neon.
The table `buildtrack_files.stored_file` lives in its own schema, so `prisma db push` never touches it. It is
created on first use (`CREATE ... IF NOT EXISTS`) and by `db:prod-init`. Files are served at the same `/uploads/...` URLs, only to
members of the file's project.

Limits: 4 MB per file, and Neon Free's 1 GB storage per project is shared with the data. Large drawings or many photos
would need paid object storage, which this deployment deliberately does not use.

Locally, files are written to `server/uploads/` unless `UPLOAD_STORAGE=database` is set.

## Owner account

There is no default owner and no password in the code. Create or restore the owner once, from `server/`,
using the Neon **direct** URL. In PowerShell:

```powershell
$env:OWNER_DATABASE_URL="<direct URL>?sslmode=require"; $env:OWNER_EMAIL="<your e-mail>"; $env:OWNER_NAME="<your name>"
npm run owner:init
Remove-Item Env:OWNER_DATABASE_URL
```

The password is typed at a hidden prompt (12 characters minimum) and stored only as a bcrypt hash. Re-running
the command resets the password, clears any lockout and signs out existing sessions. Demo e-mails and the local
`dev.db` are refused. Then sign in on the normal sign-in form and create the other users on the Users page.

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
   3. Run `npm run owner:init` (see "Owner account") and sign in as the owner.

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
| `ALLOW_REGISTRATION` | Leave unset (off). |
| `UPLOAD_STORAGE` | Leave unset (`database` on Vercel). |

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
