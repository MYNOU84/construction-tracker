#!/usr/bin/env node
/**
 * Creates or restores the owner (administrator) account of a hosted database. Run it yourself, from server/:
 *
 *   $env:OWNER_DATABASE_URL="<Neon DIRECT connection string>"; $env:OWNER_EMAIL="you@example.com"; $env:OWNER_NAME="Your Name"
 *   npm run owner:init
 *   Remove-Item Env:OWNER_DATABASE_URL
 *
 * The password is typed at a hidden prompt (or read from OWNER_PASSWORD for automation), must be at least
 * 12 characters, and is stored only as a bcrypt hash. Nothing secret is printed.
 *
 * Effect: creates the account with role ADMIN, or, if the e-mail exists, sets role ADMIN, re-activates it,
 * sets the new password, clears any lockout and signs out its existing sessions (tokenVersion + 1).
 * Public demo accounts cannot become owners. The local development database (dev.db) is refused.
 *
 * For PostgreSQL a separate Prisma client is generated into a throw-away folder (server/.owner-client-*), so the
 * installed client, prisma/schema.prisma and dev.db are never touched (this avoids the Windows EPERM file lock).
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const DEMO_EMAILS = ['pm@buildtrack.com', 'engineer@buildtrack.com', 'consultant@buildtrack.com',
  'contractor@buildtrack.com', 'client@buildtrack.com', 'admin@buildtrack.com'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fail = (msg) => { console.error(msg); process.exit(1); };

const url = process.env.OWNER_DATABASE_URL || '';
const email = (process.env.OWNER_EMAIL || '').trim().toLowerCase();
const name = (process.env.OWNER_NAME || '').trim().slice(0, 120);
const isPg = /^postgres(ql)?:\/\//.test(url);

if (!isPg && !url.startsWith('file:')) fail('OWNER_DATABASE_URL must be a PostgreSQL URL (Neon direct URL) or a file: SQLite URL.');
if (url.startsWith('file:') && /(^|[\\/:])dev\.db(\?|$)/i.test(url)) fail('Refusing to modify the local development database (dev.db).');
if (!EMAIL_RE.test(email)) fail('Set OWNER_EMAIL to a valid e-mail address.');
if (!name) fail('Set OWNER_NAME.');
const listed = (process.env.DEMO_USER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
if (DEMO_EMAILS.includes(email) || listed.includes(email)) fail('A public demo account cannot be the owner. Use your own e-mail address.');

function askHidden(question) {
  // Raw-mode read: nothing typed or pasted is ever echoed to the screen.
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(false); stdin.pause(); stdin.off('data', onData); stdout.write('\n');
          resolve(value); return;
        }
        if (ch === '\u0003') { stdin.setRawMode(false); stdout.write('\n'); process.exit(130); }
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

async function readPassword() {
  if (process.env.OWNER_PASSWORD) return process.env.OWNER_PASSWORD;
  if (!process.stdin.isTTY) fail('No terminal for the password prompt. Run this in an interactive terminal.');
  const a = await askHidden('Owner password (min. 12 characters, hidden): ');
  const b = await askHidden('Repeat the password: ');
  if (a !== b) fail('The passwords do not match. Nothing was changed.');
  return a;
}

const cwd = path.join(__dirname, '..');

/** A Prisma client for the given URL. PostgreSQL gets its own generated copy; SQLite uses the installed client. */
function makeClient() {
  if (!isPg) { const { PrismaClient } = require('@prisma/client'); return { prisma: new PrismaClient({ datasources: { db: { url } } }), cleanup() {} }; }
  const dir = path.join(cwd, '.owner-client-' + process.pid);
  fs.mkdirSync(dir, { recursive: true });
  const schema = fs.readFileSync(path.join(cwd, 'prisma', 'schema.prisma'), 'utf8')
    .replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"')
    .replace('provider = "prisma-client-js"', `provider = "prisma-client-js"\n  output   = "${path.join(dir, 'client').split(path.sep).join('/')}"`);
  const schemaFile = path.join(dir, 'schema.prisma');
  fs.writeFileSync(schemaFile, schema);
  execSync('npx prisma generate --schema "' + schemaFile + '"', { cwd, stdio: 'pipe', env: { ...process.env, DATABASE_URL: url } });
  const { PrismaClient } = require(path.join(dir, 'client'));
  return { prisma: new PrismaClient({ datasources: { db: { url } } }), cleanup() { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* a locked engine file is removed next run */ } } };
}

(async () => {
  const password = await readPassword();
  if (typeof password !== 'string' || password.length < 12) fail('The password must be at least 12 characters. Nothing was changed.');

  let failed = false;
  let handle;
  try {
    handle = makeClient();
    const { prisma } = handle;
    const bcrypt = require('bcryptjs');
    try {
      const hash = await bcrypt.hash(password, 12);
      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { name, role: 'ADMIN', isActive: true, password: hash, failedLoginCount: 0, lockedUntil: null, tokenVersion: { increment: 1 } },
        });
        console.log('Owner account updated: role ADMIN, active, new password, existing sessions signed out.');
      } else {
        await prisma.user.create({ data: { name, email, role: 'ADMIN', password: hash } });
        console.log('Owner account created with role ADMIN.');
      }
      const check = await prisma.user.findUnique({ where: { email }, select: { role: true, isActive: true, password: true } });
      const ok = check && check.role === 'ADMIN' && check.isActive && await bcrypt.compare(password, check.password);
      console.log(ok ? 'Verified in the database: ADMIN, active, password matches.' : 'WARNING: verification failed.');
      if (!ok) failed = true;
    } finally {
      await prisma.$disconnect();
    }
  } catch (e) {
    failed = true;
    console.error('Owner initialisation failed:', e && e.code ? e.code : (e && e.message ? String(e.message).split('\n').pop().slice(0, 200) : 'unknown'));
  } finally {
    if (handle) handle.cleanup();
  }
  process.exit(failed ? 1 : 0);
})();
