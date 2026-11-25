#!/usr/bin/env node
/**
 * Database schema guard.
 *
 *   node scripts/db-sync.js           check only: never writes to an existing database
 *   node scripts/db-sync.js --apply   back up the SQLite file, then apply the schema
 *   DB_UPGRADE=true node scripts/db-sync.js   same as --apply
 *
 * SQLite (local development):
 *   - Missing database file: created from the schema (first run).
 *   - Existing database in sync: nothing happens.
 *   - Existing database out of sync: prints what to do and exits 1, unless --apply
 *     or DB_UPGRADE=true is set. Applying first copies the file to
 *     backups/<name>-<timestamp>.db next to the database file and never passes --accept-data-loss, so
 *     Prisma refuses any change that would drop data.
 *
 * PostgreSQL (hosted): schema changes are applied by the deployment pipeline,
 * not here (see README, "Deployment"). This script only reports drift.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const serverDir = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(serverDir, '.env') });

const schemaPath = path.join(serverDir, 'prisma', 'schema.prisma');
const prismaCli = require.resolve('prisma/build/index.js', { paths: [serverDir] });
const apply = process.argv.includes('--apply') || process.env.DB_UPGRADE === 'true';
const url = process.env.DATABASE_URL || 'file:./dev.db';
const isSqlite = url.startsWith('file:');

function prisma(args) {
  // Run the Prisma CLI through node directly: no shell, so paths with spaces are safe.
  return spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: url },
    encoding: 'utf8',
  });
}

function sqlitePath() {
  // Prisma resolves relative SQLite paths against the schema's folder.
  const raw = url.slice('file:'.length).split('?')[0];
  return path.isAbsolute(raw) ? raw : path.resolve(path.dirname(schemaPath), raw);
}

function diff(fromUrl) {
  const r = prisma(['migrate', 'diff', '--from-url', fromUrl, '--to-schema-datamodel', schemaPath, '--script', '--exit-code']);
  if (r.status === 0) return { inSync: true };
  if (r.status === 2) return { inSync: false, sql: r.stdout.trim() };
  throw new Error(`prisma migrate diff failed:\n${r.stderr || r.stdout}`);
}

function push() {
  const r = prisma(['db', 'push', '--skip-generate']);
  process.stdout.write(r.stdout || '');
  if (r.status !== 0) {
    process.stderr.write(r.stderr || '');
    throw new Error('prisma db push refused the change (no data was dropped).');
  }
}

function main() {
  if (!isSqlite) {
    const result = diff(url);
    if (result.inSync) console.log('[db-sync] Hosted database schema is up to date.');
    else {
      console.error('[db-sync] Hosted database schema differs from prisma/schema.prisma.');
      console.error('[db-sync] Apply it through the deployment pipeline, not from a local machine.');
      process.exit(1);
    }
    return;
  }

  const dbFile = sqlitePath();
  if (!fs.existsSync(dbFile)) {
    console.log(`[db-sync] No database at ${path.relative(serverDir, dbFile)}: creating it from the schema.`);
    push();
    return;
  }

  const result = diff(`file:${dbFile}`);
  if (result.inSync) {
    console.log('[db-sync] Database schema is up to date.');
    return;
  }

  if (!apply) {
    console.error('');
    console.error('[db-sync] The local database schema is older than prisma/schema.prisma.');
    console.error('[db-sync] Nothing was changed. Pending changes:');
    console.error(result.sql.split('\n').map((l) => `           ${l}`).join('\n'));
    console.error('');
    console.error('[db-sync] To upgrade (a backup is taken first), run from the server folder:');
    console.error('             npm run db:upgrade');
    console.error('');
    process.exit(1);
  }

  const backupDir = path.join(path.dirname(dbFile), 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = path.join(backupDir, `${path.basename(dbFile, '.db')}-${stamp}.db`);
  fs.copyFileSync(dbFile, backup);
  console.log(`[db-sync] Backup written to ${path.relative(serverDir, backup)}`);
  push();
  if (!diff(`file:${dbFile}`).inSync) throw new Error('Schema still differs after the upgrade.');
  console.log('[db-sync] Database upgraded.');
}

try {
  main();
} catch (err) {
  console.error(`[db-sync] ${err.message}`);
  process.exit(1);
}
