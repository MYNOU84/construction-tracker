#!/usr/bin/env node
/**
 * One-time initialisation of the production demo database (Neon PostgreSQL), run from a developer machine.
 *
 *   DEMO_DATABASE_URL="<Neon DIRECT connection string>" npm run db:prod-init
 *
 * Steps: switch the Prisma provider to postgresql → generate → `prisma db push` (creates the tables; refuses
 * data-loss changes) → deterministic demo seed (fictional data only) → restore the sqlite provider and the
 * local Prisma client, even on failure. Safe to re-run: the seed upserts fixed ids.
 *
 * Guards: PostgreSQL URLs only; the URL must contain "demo" (e.g. database `buildtrack_demo`) unless
 * DEMO_SEED_CONFIRM=yes. The URL is never printed. Nothing runs at request time.
 */
const { execSync } = require('child_process');
const path = require('path');

const url = process.env.DEMO_DATABASE_URL || '';
if (!/^postgres(ql)?:\/\//.test(url)) {
  console.error('DEMO_DATABASE_URL must be a PostgreSQL connection string (use the Neon *direct*, non-pooled URL).');
  process.exit(1);
}
if (!/demo/i.test(url) && process.env.DEMO_SEED_CONFIRM !== 'yes') {
  console.error('Target URL does not look like a demo database. Name it e.g. buildtrack_demo, or set DEMO_SEED_CONFIRM=yes.');
  process.exit(1);
}

const cwd = path.join(__dirname, '..');
const run = (cmd, env) => execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });
const pg = { DATABASE_URL: url };
const local = { DATABASE_URL: 'file:./dev.db' }; // only used to pick the sqlite provider; dev.db is not opened

let failed = false;
try {
  run('node scripts/set-provider.js', pg);
  run('npx prisma generate', pg);
  run('npx prisma db push --skip-generate', pg);
  run('npx tsx src/seed-demo.ts', { ...pg, DEMO_DATABASE_URL: url });
  console.log('\nProduction demo database initialised.');
} catch {
  failed = true;
  console.error('\nInitialisation failed; see the output above.');
} finally {
  run('node scripts/set-provider.js', local);
  run('npx prisma generate', local);
}
process.exit(failed ? 1 : 0);
