# WP2 — Dependency Security and Compatibility

Branch `feature/production-readiness`, baseline commit `eef8a4b6`.
Node 24.15, npm audit against the public registry, 25 November 2026.

## Vulnerability counts (`npm audit`)

| Scope | Before | After (all) | After (production only, `--omit=dev`) |
|---|---|---|---|
| Root | 1 (1 critical, dev: `shell-quote`) | **0** | **0** |
| Server | 7 (6 in production) | **0** | **0** |
| Client | 25 (1 low, 10 moderate, 13 high, 1 critical; 16 in production) | **6** (5 moderate, 1 high) | **4 moderate** |
| **Total** | **33** (22 in production) | **6** | **4** (no high or critical) |

`npm audit fix --force` was never used. Every change stays inside each package's
declared semver range, except the two approved jsPDF majors.

## Removed packages

| Package | Where | Evidence |
|---|---|---|
| `xlsx` 0.18.5 | client | Not imported anywhere. Excel exports use ExcelJS. Had a prototype-pollution and ReDoS advisory with no npm fix. |
| `zod` 3.25.76 | client, server | Not imported anywhere. |
| `@hookform/resolvers` 3.10.0 | client | Only useful with zod. Not imported. |
| `express-validator` 7.3.2 | server | Not imported. Validation is done in the controllers. |
| `uuid` 10.0.0, `@types/uuid` | server | Declared but never called. IDs come from Prisma (`cuid()`) and stored upload names already use Node's `crypto.randomUUID()` (`server/src/middleware/upload.ts`). There was no remaining call site to replace, so the package was simply removed. |

Their transitive packages went with them (`validator`, `lodash`, `cfb`, `ssf`, `codepage`, `adler-32`, `frac`, `wmf`, `word`, …).

## Version changes

| Package | Before | After | Reason |
|---|---|---|---|
| jspdf | 2.5.2 | **4.2.1** | Approved upgrade. Closes jsPDF advisories (PDF injection, path traversal, ReDoS, DoS) and pulls `dompurify` 2.5.9 → 3.5.0. |
| jspdf-autotable | 3.8.4 | **5.0.9** | Approved upgrade, required by jsPDF 4. The default export and `lastAutoTable.finalY` still work, so no source change was needed. |
| axios | 1.16.0 | 1.21.1 | In range. Advisory fix. |
| react-router / react-router-dom | 6.30.3 | 6.30.6 | In range; latest v6. |
| express | 4.22.1 | 4.22.3 | In range. Pulls `qs` 6.14.2 → 6.16.2, `body-parser` 1.20.9. |
| morgan | 1.10.1 | 1.12.1 | In range. |
| tsx (server, dev) | 4.21.0 | 4.23.15 | In range. Pulls `esbuild` 0.27.7 → 0.28.2. |
| shell-quote (root, dev) | 1.8.3 | 1.12.0 | `npm audit fix`, via `concurrently`. |
| Babel, postcss, browserslist, follow-redirects, form-data, nanoid, tmp … | patch | patch | `npm audit fix` and lockfile refresh inside existing ranges. |

ExcelJS stays at 4.4.0.

## Residual risks (accepted, documented)

| Package | Severity | Production? | Why it stays | Exposure here |
|---|---|---|---|---|
| `uuid` < 11.1.1 via `exceljs` 4.4.0 | moderate | yes (bundled) | The only npm "fix" is downgrading ExcelJS to 3.4.0, which is a breaking change. | The advisory concerns `v3/v5/v6` called with a caller-supplied `buf`. ExcelJS only uses `v4()` internally. The app never calls uuid. Not reachable. |
| `react-router` / `react-router-dom` 6.30.6 | moderate | yes | Fixed only in v7, a major migration. 6.30.6 is the latest v6. | (1) Open redirect through a backslash path in `<Link>`/`navigate()` with an untrusted target. Every target in this app is a constant or a project id from the API. `SchedulePage` only reads `?tab`. (2) `deserializeErrors` applies only to SSR or data routers. The app uses `BrowserRouter` client-side only. Not reachable. |
| `vite` 5.4.21 / `esbuild` 0.21.5 | high / moderate | **no** (dev only) | Fixed only in vite 6–8, a major migration. 5.4.21 is the latest 5.x. | Dev-server issues only (`server.fs.deny` bypass on Windows, launch-editor, esbuild dev server). The production build is static files and is unaffected. Do not expose `vite dev` on a network (`--host`). |

Candidates for a later work package: a react-router v7 migration and a vite 6+ migration
(both majors). Also a build chunk over 500 kB (`index` with jsPDF, ExcelJS and Recharts),
which could be code-split with dynamic imports of the export modules.

## Pre-existing export defect (recorded, not changed)

The monthly PDF draws discipline progress bars with `█` (U+2588) and `░` (U+2591).
The standard PDF fonts cannot encode them, so jsPDF writes two Latin glyphs for each
character (`%ˆ` / `%‘`). The output is identical on jsPDF 2.5.2 and 4.2.1. The regression test pins the
current output so any change is visible. Fixing it changes the design and belongs to the
WP3/WP4 redesign.

**Resolved in WP3/WP4:** the bars are now drawn as filled rectangles (warm track plus gold
fill) in `didDrawCell`. The export test checks each fill ratio against the percentage and
asserts that no block glyphs remain.

## Verification

| Check | Result |
|---|---|
| `npm run test:exports`: 10 export documents (6 PDFs: daily full and empty, weekly, monthly, presentation full and minimal; 4 Excel workbooks: daily full and empty, monthly with and without log), 153 assertions on file names, page size, sections, text, totals, calculations, colours, fonts, merges, plus a 10-document structural snapshot | Baseline on jsPDF 2.5.2: **163/163**. After the upgrade: **163/163**, snapshot identical apart from the `Producer` field |
| `npm run test:deps`: removed packages stay removed, patched minimums stay installed, no source imports a removed package | **28/28** (a planted `import 'uuid'` is caught) |
| Server `tsc --noEmit` | pass |
| Client `tsc` + `vite build` | pass (chunk-size warning only) |
| `server: npm run test:security` | **146/146** |
| Original `prisma/dev.db` | unchanged (same SHA-256 before and after) |

The export tests run the real `client/src/utils` export modules, bundled with esbuild,
against fictional fixtures in `client/tests/exports/fixtures.mjs`. The date is frozen,
so output is deterministic. `npm run test:exports -- --update` refreshes the snapshot
after an intended change. `EXPORT_TEST_OUT=<dir>` keeps the generated PDF and XLSX files
for a visual check.

## Files changed

- `client/package.json`, `client/package-lock.json`: removed packages, jsPDF upgrades, `test:exports` script.
- `server/package.json`, `server/package-lock.json`: removed packages, in-range updates.
- `package.json`, `package-lock.json` (root): `shell-quote` fix, `test:deps` / `test:exports` scripts.
- `client/tests/exports/run.mjs`, `fixtures.mjs`, `snapshot.json`: new export regression suite.
- `scripts/check-deps.mjs`: new dependency guard.
- `README.md`: tech stack (ExcelJS, no Zod) and test commands.
- `docs/WP2-DEPENDENCIES.md`: this report.

No application source file was changed.
