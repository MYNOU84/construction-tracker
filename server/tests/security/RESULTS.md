# WP1 security regression results

Generated from a run of `npm run test:security` (in `server/`).

| | |
|---|---|
| Date | 2026-11-25 |
| Branch | `feature/production-readiness` (WP1 baseline `ae4a3e24` + WP1 closure corrections) |
| Runtime | Node v24.15.0, Prisma 5.22.0, SQLite |
| Database | Fresh temporary SQLite file created per run; `prisma/dev.db` never opened |
| Result | **146 passed, 0 failed (146 checks)** |

The suite was extended during WP1 closure from the 60 original ad-hoc checks to the
reproducible set below. It contains no credentials: every account, password and JWT
secret is generated at run time and discarded with the temporary folder.

## Summary by group

| Group | Covers | Pass | Fail |
|---|---|---:|---:|
| `schema` | The three WP1 User columns on an isolated database (defaults, lockout bookkeeping, token version) | 6 | 0 |
| `session` | Sign-in for each role, httpOnly session cookie attributes, no token in response bodies | 16 | 0 |
| `tokens` | JWT verification: Bearer fallback, wrong secret, alg=none, foreign issuer, forged role, expiry | 6 | 0 |
| `csrf` | State-changing requests without the X-Requested-With header are rejected and change nothing | 4 | 0 |
| `roles` | Role-based authorisation: admin-only routes, privilege escalation, password policy | 9 | 0 |
| `project-access` | Project-level authorisation: non-members get 404, IDOR through project A, body-injected ids, member management | 27 | 0 |
| `uploads` | Upload type allow-list, random file names, member-only download, path traversal, file removal | 14 | 0 |
| `revocation` | Session revocation through tokenVersion, logout cookie expiry | 4 | 0 |
| `lockout` | Account lockout after repeated failures, generic error for unknown accounts | 3 | 0 |
| `prod-startup` | Production refuses to start without a strong JWT_SECRET | 2 | 0 |
| `prod` | Production mode: closed registration, Secure cookie, CSRF, no stack traces, helmet headers, CORS | 13 | 0 |
| `demo` | Demo mode: server-side read-only for every write route, no password sign-in, ADMIN refused, DB unchanged | 32 | 0 |
| `db-guard` | Schema guard (scripts/db-sync.js) on a throwaway pre-WP1 database: read-only check, backup, lossless upgrade | 7 | 0 |
| `isolation` | prisma/dev.db and server/uploads are untouched by the run | 3 | 0 |

## Checks

### schema

- [x] User.failedLoginCount defaults to 0
- [x] User.lockedUntil defaults to null
- [x] User.tokenVersion defaults to 0
- [x] lockedUntil set in the future on lockout
- [x] failedLoginCount reset when the lock is applied
- [x] tokenVersion incremented on role change

### session

- [x] API requires a session (401)
- [x] auth config: password login on, demo off
- [x] admin signs in; no token in the response body
- [x] admin profile via cookie
- [x] cookie: HttpOnly
- [x] cookie: SameSite=Lax
- [x] cookie: Path=/
- [x] cookie: bounded lifetime (Max-Age/Expires)
- [x] cookie: not Secure over local HTTP (development)
- [x] no password hash in login response
- [x] pm signs in; no token in the response body
- [x] pm profile via cookie
- [x] engineer signs in; no token in the response body
- [x] engineer profile via cookie
- [x] consultant signs in; no token in the response body
- [x] consultant profile via cookie

### tokens

- [x] Bearer header fallback accepted
- [x] token signed with another secret → 401
- [x] unsigned (alg=none) token → 401
- [x] token with a foreign issuer → 401
- [x] role claim in token is not trusted (engineer claiming ADMIN → /users 403)
- [x] expired token → 401

### csrf

- [x] POST without X-Requested-With → 403
- [x] PUT without X-Requested-With → 403, project unchanged
- [x] DELETE without X-Requested-With → 403, record kept
- [x] cross-site form POST with session cookie → 403

### roles

- [x] ADMIN GET /users → 200
- [x] pm GET /users → 403
- [x] engineer GET /users → 403
- [x] consultant GET /users → 403
- [x] PM cannot create an ADMIN account
- [x] admin analytics (users) blocked for PM
- [x] self-registration cannot pick ADMIN
- [x] registration rejects a short password
- [x] admin cannot demote themselves

### project-access

- [x] engineer lists project A but not project B
- [x] consultant (member) reads project A
- [x] non-member GET project of project B → 404
- [x] non-member GET stats of project B → 404
- [x] non-member GET risks of project B → 404
- [x] non-member GET daily reports of project B → 404
- [x] non-member GET daily report by id of project B → 404
- [x] non-member GET documents of project B → 404
- [x] non-member GET analytics of project B → 404
- [x] non-member POST risk into project B → 404
- [x] non-member PUT project B → 404
- [x] IDOR: update B risk via project A → 404
- [x] IDOR: delete B risk via project A → 404
- [x] IDOR: update B milestone via project A → 404
- [x] IDOR: read B daily report via project A → 404
- [x] IDOR: comment on B daily report via project A → 404
- [x] project B records unchanged after IDOR attempts
- [x] create: body projectId/id ignored (stays in project A)
- [x] update: body projectId cannot move a record
- [x] engineer DELETE project A → 403
- [x] engineer add member to project A → 403
- [x] engineer remove member from project A → 403
- [x] PM (not a member) DELETE project B → 403
- [x] PM (not a member) add member to project B → 403
- [x] PM of project A can add a member
- [x] PM of project A can remove a member
- [x] project A still exists after the role checks

### uploads

- [x] reject .html
- [x] reject .svg
- [x] reject .pdf sent with an HTML MIME type
- [x] reject .exe
- [x] member uploads a .pdf
- [x] stored under a random name, tags parsed
- [x] metadata-only register entry accepted
- [x] non-member upload into project B → 404
- [x] photo cannot be attached to a project B report by a non-member → 400
- [x] file: anonymous → 401
- [x] file: project member → 200 + nosniff + CSP
- [x] file: non-member of project B → 404
- [x] file: path traversal → 404
- [x] file removed when its document is deleted

### revocation

- [x] revocation fixture signs in
- [x] role change revokes existing sessions
- [x] logout expires the cookie
- [x] after logout the browser session is gone

### lockout

- [x] wrong passwords → 401
- [x] locked after 5 failures (correct password → 429)
- [x] unknown account gets the same generic 401

### prod-startup

- [x] production refuses to start without JWT_SECRET
- [x] production refuses a JWT_SECRET shorter than 32 chars

### prod

- [x] registration closed by default
- [x] register → 403
- [x] login works
- [x] cookie: Secure + HttpOnly + SameSite=Lax + Path=/
- [x] CSRF header still required
- [x] unknown project → 404 without stack trace
- [x] malformed JSON → 400 without stack trace
- [x] demo sign-in disabled → 404
- [x] helmet headers present, X-Powered-By hidden
- [x] CORS: foreign origin gets no Access-Control-Allow-Origin
- [x] CORS: foreign preflight is not allowed
- [x] CORS: configured origin allowed with credentials
- [x] logout cookie also Secure

### demo

- [x] config: demo on, password login and registration off
- [x] password login refused (admin) → 403
- [x] password login refused (viewer) → 403
- [x] demo accounts: allow-listed, ADMIN filtered out even if listed
- [x] demo sign-in as an allow-listed ADMIN → 400
- [x] demo sign-in as a non-listed user → 400
- [x] token from another deployment (other secret) → 401
- [x] default demo sign-in → first allow-listed account
- [x] reads work (projects)
- [x] reads work (member project risks)
- [x] /users still ADMIN-only → 403
- [x] POST /api/projects → 403 (read-only)
- [x] PUT /api/projects/:A → 403 (read-only)
- [x] DELETE /api/projects/:A → 403 (read-only)
- [x] POST /api/projects/:A/members → 403 (read-only)
- [x] DELETE /api/projects/:A/members/cmww4ssu00002wojmpo591zal → 403 (read-only)
- [x] POST /api/projects/:A/risks → 403 (read-only)
- [x] PUT /api/projects/:A/risks/cmww4ssw6000fwojm3ydtxtk1 → 403 (read-only)
- [x] DELETE /api/projects/:A/risks/cmww4ssw6000fwojm3ydtxtk1 → 403 (read-only)
- [x] POST /api/projects/:A/reports/daily → 403 (read-only)
- [x] POST /api/projects/:A/reports/weekly/generate → 403 (read-only)
- [x] POST /api/projects/:A/activities/bulk → 403 (read-only)
- [x] PUT /api/auth/profile → 403 (read-only)
- [x] POST /api/users → 403 (read-only)
- [x] POST /api/auth/register → 403 (read-only)
- [x] document upload → 403 (read-only)
- [x] photo upload → 403 (read-only)
- [x] method-override header does not bypass read-only
- [x] path case variation does not bypass read-only
- [x] even an ADMIN session is read-only in demo mode
- [x] logout still allowed
- [x] database unchanged by all demo write attempts

### db-guard

- [x] check mode reports an outdated schema (exit 1)
- [x] check mode leaves the database byte-for-byte unchanged
- [x] check mode writes no backup
- [x] --apply upgrades the schema (exit 0)
- [x] --apply took a backup identical to the original file
- [x] existing rows survive the upgrade with safe defaults
- [x] check mode passes after the upgrade (exit 0)

### isolation

- [x] prisma/dev.db untouched (same fingerprint before and after)
- [x] no uploaded files left behind
- [x] server/uploads untouched (test files went to the temp folder)

## Reproducing

```bash
cd server
npm run test:security          # compiles, runs, cleans up
node tests/security/run.mjs --keep   # keep the temp folder for inspection
```

The run exits non-zero if any check fails.
