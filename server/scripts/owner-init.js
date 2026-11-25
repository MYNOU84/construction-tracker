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
 * For PostgreSQL the Prisma provider is switched and restored exactly as in db:prod-init.
 */
const { execSync } = require('child_process');
const path = require('path');
const readline = require('readline');

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
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(question)) process.stdout.write(s); };
    rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer); });
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
const run = (cmd, env) => execSync(cmd, { cwd, stdio: 'pipe', env: { ...process.env, ...env } });

(async () => {
  const password = await readPassword();
  if (typeof password !== 'string' || password.length < 12) fail('The password must be at least 12 characters. Nothing was changed.');

  let failed = false;
  try {
    if (isPg) {
      run('node scripts/set-provider.js', { DATABASE_URL: url });
      run('npx prisma generate', { DATABASE_URL: url });
    }
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const prisma = new PrismaClient({ datasources: { db: { url } } });
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
    } finally {
      await prisma.$disconnect();
    }
  } catch (e) {
    failed = true;
    console.error('Owner initialisation failed:', e && e.code ? e.code : 'see the message above');
  } finally {
    if (isPg) {
      run('node scripts/set-provider.js', { DATABASE_URL: 'file:./dev.db' }); // picks the sqlite provider; dev.db is not opened
      run('npx prisma generate', { DATABASE_URL: 'file:./dev.db' });
    }
  }
  process.exit(failed ? 1 : 0);
})();
