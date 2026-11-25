#!/usr/bin/env node
// Dependency regression guard (WP2). Offline: reads package.json files, lockfiles
// and source code only. Run with `npm run test:deps` from the repository root.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

let pass = 0;
let fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? ` (${detail})` : ''}`); }
}

function cmp(a, b) {
  const pa = a.split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  const pb = b.split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

const installed = (lock, name) => lock.packages?.[`node_modules/${name}`]?.version;
const declared = (pkg, name) => pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];

// Packages removed in WP2. They must not come back without a reason.
const REMOVED = {
  server: ['express-validator', 'zod', 'uuid', '@types/uuid', 'xlsx'],
  client: ['xlsx', 'zod', '@hookform/resolvers', 'uuid', 'express-validator'],
};

// Minimum versions that close known advisories.
const MINIMUM = {
  server: { express: '4.22.3', qs: '6.16.2', tsx: '4.23.15' },
  client: { jspdf: '4.2.1', 'jspdf-autotable': '5.0.9', dompurify: '3.5.0', axios: '1.21.1' },
  '.': { 'shell-quote': '1.12.0' },
};

// Packages the application needs.
const REQUIRED = { client: ['exceljs', 'jspdf', 'jspdf-autotable'] };

for (const dir of ['.', 'server', 'client']) {
  console.log(`\n${dir === '.' ? 'root' : dir}`);
  const pkg = read(join(dir, 'package.json'));
  const lock = read(join(dir, 'package-lock.json'));

  for (const name of REMOVED[dir] ?? []) {
    check(`${name} not declared`, declared(pkg, name) === undefined, declared(pkg, name));
    if (dir === 'server') {
      // The server has no transitive need for these: the lockfile must not hold them.
      check(`${name} not installed`, installed(lock, name) === undefined, installed(lock, name));
    }
  }
  for (const [name, min] of Object.entries(MINIMUM[dir] ?? {})) {
    const v = installed(lock, name);
    check(`${name} >= ${min}`, v !== undefined && cmp(v, min) >= 0, v ?? 'missing');
  }
  for (const name of REQUIRED[dir] ?? []) {
    check(`${name} installed`, installed(lock, name) !== undefined);
  }
}

// No source file may import a removed package.
console.log('\nsource imports');
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry)) out.push(p);
  }
  return out;
}
const banned = ['xlsx', 'zod', '@hookform/resolvers', 'express-validator', 'uuid'];
const importRe = new RegExp(
  `(?:from\\s+|require\\(\\s*|import\\(\\s*)['"](${banned.map((b) => b.replace(/[/@]/g, '\\$&')).join('|')})(?:/[^'"]*)?['"]`,
);
for (const dir of ['server/src', 'client/src']) {
  const hits = walk(join(root, dir)).filter((f) => importRe.test(readFileSync(f, 'utf8')));
  check(`${dir} imports none of ${banned.join(', ')}`, hits.length === 0,
    hits.map((h) => h.slice(root.length + 1)).join(', '));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
