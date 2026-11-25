#!/usr/bin/env node
/**
 * BuildTrack Pro — WP1 security regression suite.
 *
 *   npm run test:security        (from server/; compiles, then runs this file)
 *
 * Also covers the dev.db schema guard (scripts/db-sync.js) on a throwaway database.
 *
 * Isolation guarantees
 *   - Uses a brand-new SQLite database in the OS temp folder, created with
 *     `prisma db push` from prisma/schema.prisma. prisma/dev.db is never opened;
 *     the run aborts if the target resolves into prisma/, and fails if the
 *     dev.db fingerprint changes during the run.
 *   - Fixture users and passwords are generated at run time; no seeded
 *     credentials, no copies of any real database, no secrets from .env.
 *   - Each server mode gets its own random JWT secret, its own port, cwd = the
 *     temp folder (so server/.env is never loaded) and UPLOAD_DIR in the temp folder.
 *   - The temp folder is deleted afterwards (pass --keep to inspect it).
 */
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { results, group, check, devChecks, prodChecks, demoChecks } from './checks.mjs';

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PRISMA_DIR = path.join(SERVER_DIR, 'prisma');
const DEV_DB = path.join(PRISMA_DIR, 'dev.db');
const SCHEMA = path.join(PRISMA_DIR, 'schema.prisma');
const ENTRY = path.join(SERVER_DIR, 'dist', 'index.js');
const KEEP = process.argv.includes('--keep');
const require = createRequire(path.join(SERVER_DIR, 'package.json'));

const fingerprint = (file) => fs.existsSync(file)
  ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
  : 'absent';
const randomSecret = () => crypto.randomBytes(48).toString('hex');
const randomPassword = () => crypto.randomBytes(18).toString('base64url');
const freePort = () => new Promise((resolve, reject) => {
  const srv = net.createServer();
  srv.unref();
  srv.on('error', reject);
  srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
});
const fail = (msg) => { console.error(`\n✖ ${msg}`); process.exit(2); };

// ─── Pre-flight ──────────────────────────────────────────────────────────────
if (!fs.existsSync(ENTRY)) fail('dist/index.js not found. Run `npm run test:security` (it compiles first) or `npx tsc`.');
if (!/provider\s*=\s*"sqlite"/.test(fs.readFileSync(SCHEMA, 'utf8'))) {
  fail('prisma/schema.prisma is not set to sqlite. The security suite only runs against a throwaway local SQLite file.');
}
const devDbBefore = fingerprint(DEV_DB);
const listUploads = () => {
  const root = path.join(SERVER_DIR, 'uploads');
  return fs.existsSync(root) ? fs.readdirSync(root, { recursive: true }).sort().join('|') : '';
};
const uploadsBefore = listUploads();

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'buildtrack-sec-'));
const dbFile = path.join(tmp, 'security-test.db');
const uploadDir = path.join(tmp, 'uploads');
const rel = path.relative(PRISMA_DIR, dbFile);
if (path.resolve(dbFile) === path.resolve(DEV_DB) || !rel.startsWith('..')) fail('Refusing to use a database inside server/prisma.');
const DATABASE_URL = `file:${dbFile.replace(/\\/g, '/')}`;

const children = new Set();
let db;
const cleanup = async () => {
  for (const c of children) { try { c.kill(); } catch { /* already gone */ } }
  if (db) await db.$disconnect().catch(() => {});
  if (!KEEP) fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
};
process.on('SIGINT', async () => { await cleanup(); process.exit(130); });

// ─── Isolated database ───────────────────────────────────────────────────────
console.log(`Isolated database: ${dbFile}`);
execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'db', 'push', '--skip-generate', `--schema=${SCHEMA}`], {
  cwd: tmp, env: { ...process.env, DATABASE_URL }, stdio: 'pipe',
});

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
db = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

// ─── Fixtures (generated, fictional) ─────────────────────────────────────────
const ROLE = {
  admin: 'ADMIN', pm: 'PROJECT_MANAGER', engineer: 'SITE_ENGINEER', consultant: 'CONSULTANT',
  viewer: 'CLIENT_VIEWER', lockme: 'SITE_ENGINEER', revoke: 'SITE_ENGINEER',
};
const acct = {};
const ids = { users: {} };
for (const [key, role] of Object.entries(ROLE)) {
  const password = randomPassword();
  const email = `${key}@security-test.invalid`;
  const u = await db.user.create({
    data: { name: `Security fixture ${key}`, email, role, password: await bcrypt.hash(password, 4) },
  });
  acct[key] = { email, password };
  ids.users[key] = u.id;
}
const mkProject = (code, name) => db.project.create({
  data: { name, code, client: 'Fixture client', location: 'Nowhere', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') },
});
const A = await mkProject('SEC-A', 'Security fixture project A');
const B = await mkProject('SEC-B', 'Security fixture project B');
ids.projectA = A.id;
ids.projectB = B.id;
await db.projectMember.createMany({
  data: [
    { projectId: A.id, userId: ids.users.pm, role: 'PROJECT_MANAGER' },
    { projectId: A.id, userId: ids.users.engineer, role: 'SITE_ENGINEER' },
    { projectId: A.id, userId: ids.users.consultant, role: 'CONSULTANT' },
    { projectId: A.id, userId: ids.users.viewer, role: 'CLIENT_VIEWER' },
    { projectId: B.id, userId: ids.users.consultant, role: 'CONSULTANT' },
  ],
});
// A fictional public-demo project (id prefix "demo-"): the only project demo accounts may see.
ids.projectDemo = (await db.project.create({
  data: { id: 'demo-sec-fixture', name: 'Security fixture demo project', code: 'SEC-DEMO', client: 'Fixture client', location: 'Nowhere', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') },
})).id;
await db.projectMember.createMany({
  data: [
    { projectId: ids.projectDemo, userId: ids.users.viewer, role: 'CLIENT_VIEWER' },
    { projectId: ids.projectDemo, userId: ids.users.consultant, role: 'CONSULTANT' },
  ],
});
ids.riskDemo = (await db.risk.create({ data: { projectId: ids.projectDemo, title: 'Fixture demo risk', description: 'fixture' } })).id;
ids.riskA = (await db.risk.create({ data: { projectId: A.id, title: 'Fixture risk A', description: 'fixture' } })).id;
ids.riskB = (await db.risk.create({ data: { projectId: B.id, title: 'Fixture risk B', description: 'fixture' } })).id;
ids.milestoneB = (await db.milestone.create({ data: { projectId: B.id, name: 'Fixture milestone B', plannedDate: new Date('2026-06-01') } })).id;
const report = (projectId) => db.dailyReport.create({
  data: { projectId, reportDate: new Date('2026-01-05'), reportNumber: 1, submittedBy: ids.users.admin },
});
ids.reportA = (await report(A.id)).id;
ids.reportB = (await report(B.id)).id;

// The three WP1 columns exist on a fresh database with safe defaults.
group('schema');
const fresh = await db.user.findUnique({ where: { id: ids.users.engineer } });
check('User.failedLoginCount defaults to 0', fresh.failedLoginCount === 0);
check('User.lockedUntil defaults to null', fresh.lockedUntil === null);
check('User.tokenVersion defaults to 0', fresh.tokenVersion === 0);

// ─── Server runner ───────────────────────────────────────────────────────────
const BASE_ENV = {
  DATABASE_URL, UPLOAD_DIR: uploadDir, JWT_EXPIRES_IN: '12h',
  // Set every switch explicitly; never inherit them from the caller's shell.
  DEMO_MODE: 'false', DEMO_USER_EMAILS: 'none@security-test.invalid',
  ALLOW_PASSWORD_LOGIN: 'false', ALLOW_REGISTRATION: 'false',
  CORS_ORIGIN: 'https://allowed.security-test.invalid',
};
const startServer = async (label, env) => {
  const port = await freePort();
  const logFile = path.join(tmp, `${label}.log`);
  const out = fs.openSync(logFile, 'w');
  const child = spawn(process.execPath, [ENTRY], {
    cwd: tmp, // server/.env is not loaded from here
    env: { ...process.env, ...BASE_ENV, PORT: String(port), ...env },
    stdio: ['ignore', out, out],
  });
  children.add(child);
  const exited = new Promise(r => child.once('exit', (code) => r(code)));
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 80; i++) {
    const done = await Promise.race([exited.then(c => ({ c })), new Promise(r => setTimeout(r, 150))]);
    if (done) return { exitCode: done.c, log: fs.readFileSync(logFile, 'utf8') };
    try { if ((await fetch(`${base}/api/auth/config`)).ok) break; } catch { /* not up yet */ }
  }
  const stop = async () => { child.kill(); await exited; children.delete(child); fs.closeSync(out); };
  return { base, stop, log: () => fs.readFileSync(logFile, 'utf8') };
};
const startupRefused = async (label, env) => {
  const r = await startServer(label, env);
  if (r.stop) { await r.stop(); return false; }
  return r.exitCode !== 0 && /JWT_SECRET/.test(r.log);
};

let exitCode = 0;
try {
  // Development: original roles and full access.
  const devSecret = randomSecret();
  const dev = await startServer('dev', { NODE_ENV: 'development', JWT_SECRET: devSecret });
  if (!dev.stop) throw new Error(`dev server did not start:\n${dev.log}`);
  const devOut = await devChecks({ base: dev.base, acct, ids, db, jwt, secret: devSecret });
  await dev.stop();

  group('schema');
  const locked = await db.user.findUnique({ where: { id: ids.users.lockme } });
  // The controller stores the lock in lockedUntil and resets the counter for the next window.
  check('lockedUntil set in the future on lockout', locked.lockedUntil instanceof Date && locked.lockedUntil > new Date());
  check('failedLoginCount reset when the lock is applied', locked.failedLoginCount === 0);
  const revoked = await db.user.findUnique({ where: { id: ids.users.revoke } });
  check('tokenVersion incremented on role change', revoked.tokenVersion === 1);

  // Production: hardened defaults.
  group('prod-startup');
  check('production refuses to start without JWT_SECRET', await startupRefused('prod-nosecret', { NODE_ENV: 'production', JWT_SECRET: '' }));
  check('production refuses a JWT_SECRET shorter than 32 chars', await startupRefused('prod-short', { NODE_ENV: 'production', JWT_SECRET: 'too-short-secret' }));
  const prod = await startServer('prod', { NODE_ENV: 'production', JWT_SECRET: randomSecret() });
  if (!prod.stop) throw new Error(`prod server did not start:\n${prod.log}`);
  await prodChecks({ base: prod.base, acct, ids, allowedOrigin: BASE_ENV.CORS_ORIGIN });
  await prod.stop();

  // Public demo: read-only. The admin e-mail is allow-listed on purpose to
  // prove that ADMIN accounts are still refused.
  const demoSecret = randomSecret();
  const admin = await db.user.findUnique({ where: { id: ids.users.admin } });
  const demoAdminToken = jwt.sign(
    { userId: admin.id, email: admin.email, role: admin.role, tv: admin.tokenVersion },
    demoSecret, { algorithm: 'HS256', issuer: 'buildtrack-pro', expiresIn: '5m' },
  );
  const demo = await startServer('demo', {
    NODE_ENV: 'production', JWT_SECRET: demoSecret, DEMO_MODE: 'true',
    DEMO_USER_EMAILS: [acct.viewer.email, acct.admin.email, acct.consultant.email].join(','),
  });
  if (!demo.stop) throw new Error(`demo server did not start:\n${demo.log}`);
  await demoChecks({ base: demo.base, acct, ids, db, foreignToken: devOut.adminToken, demoAdminToken });
  await demo.stop();
} catch (err) {
  console.error(err);
  exitCode = 1;
}

// ─── Schema guard (scripts/db-sync.js) ───────────────────────────────────────
// Builds a throwaway database with the pre-WP1 User table (the three new columns
// dropped) and proves the guard reports it without writing, then upgrades it
// only on --apply, with a backup and no data loss.
try {
  group('db-guard');
  const legacyFile = path.join(tmp, 'legacy', 'legacy.db');
  fs.mkdirSync(path.dirname(legacyFile));
  const legacyUrl = `file:${legacyFile.replace(/\\/g, '/')}`;
  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'db', 'push', '--skip-generate', `--schema=${SCHEMA}`], {
    cwd: tmp, env: { ...process.env, DATABASE_URL: legacyUrl }, stdio: 'pipe',
  });
  const legacy = new PrismaClient({ datasources: { db: { url: legacyUrl } } });
  await legacy.user.create({ data: { name: 'Legacy User', email: 'legacy@security-test.invalid', password: 'x' } });
  for (const col of ['failedLoginCount', 'lockedUntil', 'tokenVersion']) {
    await legacy.$executeRawUnsafe(`ALTER TABLE "User" DROP COLUMN "${col}"`);
  }
  await legacy.$disconnect();

  const guard = (args) => {
    try {
      execFileSync(process.execPath, [path.join(SERVER_DIR, 'scripts', 'db-sync.js'), ...args], {
        cwd: SERVER_DIR, env: { ...process.env, DATABASE_URL: legacyUrl, DB_UPGRADE: '' }, stdio: 'pipe',
      });
      return 0;
    } catch (e) { return e.status ?? -1; }
  };
  const backupDir = path.join(path.dirname(legacyFile), 'backups');
  const legacyBefore = fingerprint(legacyFile);

  check('check mode reports an outdated schema (exit 1)', guard([]) === 1);
  check('check mode leaves the database byte-for-byte unchanged', fingerprint(legacyFile) === legacyBefore);
  check('check mode writes no backup', !fs.existsSync(backupDir));

  check('--apply upgrades the schema (exit 0)', guard(['--apply']) === 0);
  const backups = fs.existsSync(backupDir) ? fs.readdirSync(backupDir) : [];
  check('--apply took a backup identical to the original file',
    backups.length === 1 && fingerprint(path.join(backupDir, backups[0])) === legacyBefore);
  const upgraded = new PrismaClient({ datasources: { db: { url: legacyUrl } } });
  const row = await upgraded.user.findUnique({ where: { email: 'legacy@security-test.invalid' } });
  await upgraded.$disconnect();
  check('existing rows survive the upgrade with safe defaults',
    !!row && row.failedLoginCount === 0 && row.lockedUntil === null && row.tokenVersion === 0);
  check('check mode passes after the upgrade (exit 0)', guard([]) === 0);
} catch (err) {
  console.error(err);
  exitCode = 1;
}

// ─── Isolation + residue checks ──────────────────────────────────────────────
group('isolation');
check('prisma/dev.db untouched (same fingerprint before and after)', fingerprint(DEV_DB) === devDbBefore);
const leftovers = fs.existsSync(path.join(uploadDir, 'documents')) ? fs.readdirSync(path.join(uploadDir, 'documents')) : [];
check('no uploaded files left behind', leftovers.length === 0, leftovers.join(','));
check('server/uploads untouched (test files went to the temp folder)', listUploads() === uploadsBefore);

await cleanup();

// ─── Summary ─────────────────────────────────────────────────────────────────
const passed = results.filter(r => r.pass).length;
const failed = results.length - passed;
const byGroup = {};
for (const r of results) {
  byGroup[r.group] ??= { pass: 0, fail: 0 };
  byGroup[r.group][r.pass ? 'pass' : 'fail']++;
}
console.log('\nGroup            pass  fail');
for (const [g, c] of Object.entries(byGroup)) console.log(`${g.padEnd(16)} ${String(c.pass).padStart(4)}  ${String(c.fail).padStart(4)}`);
console.log(`\nSecurity suite: ${passed} passed, ${failed} failed (${results.length} checks)`);
if (failed) for (const r of results.filter(x => !x.pass)) console.log(`  FAIL [${r.group}] ${r.name} ${r.detail}`);
process.exit(exitCode || (failed ? 1 : 0));
