# WP5 + WP6 — Demo data and sample documents

All data and documents described here are **fictional demonstration material**. They describe two
invented projects, *Complexe Résidentiel Al Nour* (PRJ-2025-001) and *Centre Commercial Bab Ezzouar*
(PRJ-2025-002). Every PDF and SVG carries a "FICTIONAL – DEMO DATA" marking. Every document record name
ends in `[DEMO]` and is tagged `DEMO` and `FICTIONAL`.

## Commands (run in `server/`)

| Command | Effect |
|---|---|
| `npm run db:demo` | Creates or syncs the schema of the isolated demo database. The default is `prisma/demo.db`. |
| `npm run seed:demo` | Seeds both projects. It is deterministic and idempotent: re-running it yields byte-identical rows. |
| `npm run demo:docs` | Regenerates the PDFs and SVGs in `client/public/demo-docs/`. The files are committed, so this is only needed after a change. |

To run the API against the demo database, set `DATABASE_URL=file:./demo.db` (or a Postgres demo URL).

### Target database safety

- The target comes from `DEMO_DATABASE_URL`. The default is `file:./demo.db`. `DATABASE_URL` is never read for this.
- `dev.db` is always refused.
- A URL that does not contain `demo` needs `DEMO_SEED_CONFIRM=yes`.
- Seeding uses only the Prisma API (upserts by fixed id), so it works on both SQLite and Neon PostgreSQL.
  For Postgres, run `set-provider.js` first, as for any deployment.

### Dates (`DEMO_ANCHOR`)

`DEMO_ANCHOR=YYYY-MM-DD` (or `today`) sets the demo's "current day". All dates are derived from it:
recent daily reports, the manpower trend and progress-to-date. The default is `2026-11-24`, which keeps
seeds reproducible. Use `DEMO_ANCHOR=today` before a live demonstration so the "recent" charts are current.

### Accounts

- The existing local development accounts (admin, pm, engineer, consultant) are reused. They are matched
  by e-mail and their passwords are never re-hashed.
- Two new demo accounts are created: contractor and client. Their password is `DEMO_PASSWORD`, or a random
  value when that is unset.
- No password is ever printed.

## Coverage

| Module / page | Al Nour | Bab Ezzouar |
|---|---|---|
| Projects list, dashboard KPIs, featured card | ✓ | ✓ |
| Project overview: description, participants, quick-link counts, milestones | ✓ | ✓ |
| Performance & KPIs / analytics, including the manpower trend | ✓ | ✓ |
| Daily reports (weather, manpower, equipment, materials, HSE, photos, comments) | 78 | 78 |
| Weekly reports | 12 | 12 |
| Monthly reports | 22 | 14 |
| Schedule: activities | 44 | 40 |
| Schedule: milestones | 10 | 10 |
| Documents (15 PDFs and 1 photo each) | 16 | 16 |
| Contracts & Submittals (contract, addendum, BOQ, shop drawings, material submittals, RFI, method statement, mock-up) | ✓ | ✓ |
| HSE (from daily-report HSE fields) | ✓ | ✓ |
| Risks | 10 | 10 |
| NCRs, with photos | 6 | 6 |
| Plant & Equipment | 11 | 11 |
| Site resources | 70 | 75 |
| Presentation: zones, billing, participants | ✓ | ✓ |
| Site map | ✓ | ✓ |

## Document inventory (per project, under `/demo-docs/<al-nour|bab-ezzouar>/`)

| File | Type | Status |
|---|---|---|
| contract.pdf | CONTRACT | — |
| addendum-01.pdf | ADDENDUM | — |
| boq.pdf | BOQ (lot totals reconcile to the contract sum) | — |
| permit.pdf | PERMIT | — |
| insurance.pdf | INSURANCE | — |
| specification.pdf | SPECIFICATION | — |
| shop-01.pdf | SHOP_DRAWING | APPROVED |
| shop-02.pdf | SHOP_DRAWING | UNDER_REVIEW |
| mat-rev-a.pdf | MATERIAL_SUBMITTAL | REJECTED |
| mat-rev-b.pdf | MATERIAL_SUBMITTAL | RESUBMITTED |
| method-statement.pdf | METHOD_STATEMENT | — |
| mockup.pdf | MOCKUP | — |
| rfi.pdf | RFI | ANSWERED |
| site-plan.pdf | DRAWING | — |
| monthly-report.pdf | REPORT | — |
| photos/*.svg | 8 site scenes and 6 NCR illustrations | — |

`client/public/demo-docs/README.txt` repeats the fictional-material notice.

## Source

| File | Role |
|---|---|
| `server/src/demo/projects.ts` | Project definitions |
| `server/src/demo/build.ts` | Deterministic record builder |
| `server/src/demo/documents.ts` and `pdf.ts` | Document and SVG generation |
| `server/src/seed-demo.ts` | Writes to the database |
| `server/src/demo/generate-docs.ts` | Writes the files |
| `server/scripts/demo-db.js` | Schema sync for the demo database |
