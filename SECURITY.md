# Security

This document describes the security model of BuildTrack Pro, how to configure it
safely, and how to verify it. Test evidence for the current branch is in
[`server/tests/security/RESULTS.md`](server/tests/security/RESULTS.md).

## Controls

| Area | Behaviour |
|---|---|
| Session | JWT (HS256, issuer `buildtrack-pro`) in an `httpOnly` cookie `bt_token`, `SameSite=Lax`, `Path=/`, `Secure` in production. The token is never returned in a response body. An `Authorization: Bearer` header is accepted as a fallback for API clients. |
| User reload | Every authenticated request reloads the user from the database. Role and active status come from the database, never from the token. |
| Revocation | Changing a user's password, role or active status increments `User.tokenVersion`, which invalidates every session issued before the change. |
| CSRF | Every state-changing request (`POST`, `PUT`, `PATCH`, `DELETE`) must carry `X-Requested-With`. Browsers cannot add that header to cross-site form posts, and CORS blocks it for foreign origins. |
| Brute force | Sign-in, demo sign-in and registration are rate-limited (20 requests / 15 min / IP); the whole API allows 500. Five failed passwords lock the account for 15 minutes. Unknown accounts get the same generic error as wrong passwords. |
| Project authorisation | Every project-scoped route checks membership (non-members get `404`, so project ids cannot be probed). Management actions need `ADMIN` or a `PROJECT_MANAGER` membership on that project. Child records are looked up through their project, and `projectId`/`id` fields in request bodies are ignored. |
| Uploads | Extension and MIME allow-list (no HTML, SVG or executables; content must match the declared type), random stored file names, download only for project members, path traversal blocked, files deleted with their record. `UPLOAD_DIR` sets the storage folder. |
| Production mode | Self-registration closed unless `ALLOW_REGISTRATION=true`. `helmet` headers. CORS limited to `CORS_ORIGIN`. Errors never include stack traces. The server refuses to start without a `JWT_SECRET` of at least 32 characters. |
| Demo mode | `DEMO_MODE=true` makes the whole API read-only on the server (every non-GET route except sign-in/out returns `403`), disables password sign-in, and offers one-click access only to the non-admin accounts listed in `DEMO_USER_EMAILS`. `ADMIN` accounts are always refused, even if listed. |

## Secrets

- **`JWT_SECRET` is required and must be unique per environment.** Generate one with
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- **Production must use its own secret**, generated directly in the hosting provider's
  environment-variable settings (for example Vercel → Project → Settings → Environment
  Variables). Never copy the local development secret, never reuse a secret across
  environments, and never commit one.
- A development secret was committed in early history of this repository. It has been
  **rotated locally and must be treated as compromised**: it must never be used anywhere.
  Rotating the secret invalidates all sessions signed with the old one.
- `.env` files are git-ignored. Only `server/.env.example`, which contains placeholders,
  is tracked.

## Accounts

- The accounts in the README's "Demo Accounts" table are **local development seed data
  only**. They must never exist in a hosted database. A public demo uses a dedicated
  demonstration database with `DEMO_MODE=true`, where password sign-in is disabled.
- Passwords must be at least 8 characters. Accounts can only be given the `ADMIN` role by
  an existing administrator, and an administrator cannot remove their own admin role.

## Local database safety

`server/scripts/db-sync.js` guards the local SQLite database:

- `npm run db:check` (and `npm start`, `START.bat`) only **read** the schema of an
  existing `prisma/dev.db`. If it is out of date they stop with instructions and change
  nothing.
- `npm run db:upgrade` first copies the file to `prisma/backups/` (git-ignored), then
  applies the schema without `--accept-data-loss`, so Prisma refuses any change that
  would drop data.

## Verifying

```bash
cd server
npm run test:security
```

The suite builds a temporary SQLite database, generates its own fictional users,
passwords and secrets, starts the compiled server in development, production and demo
modes, and checks every control above. It never opens `prisma/dev.db` and fails if the
file's fingerprint changes. See [`server/tests/security/RESULTS.md`](server/tests/security/RESULTS.md).

## Known limitations

- Logging out clears the session cookie but does not revoke the token on the server.
  Incrementing `tokenVersion` on logout would also sign out every other visitor sharing
  a demo account. A stolen token therefore stays valid until it expires
  (`JWT_EXPIRES_IN`, 12 hours by default) or until the user's password, role or status
  changes.
- Rate limits and lockout counters are per server instance. On serverless hosting each
  instance keeps its own rate-limit window. The account lockout is stored in the
  database and is shared.
- The committed development secret remains in Git history. It is unusable once rotated,
  but history was deliberately not rewritten.

## Reporting a vulnerability

Please report security issues privately to the repository owner rather than opening a
public issue.
