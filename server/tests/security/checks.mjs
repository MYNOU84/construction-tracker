/**
 * BuildTrack Pro — security regression checks.
 *
 * Every check talks to a real server process over HTTP. The server runs on an
 * isolated temporary database (see run.mjs); nothing here touches prisma/dev.db.
 * Fixture accounts and passwords are generated at run time by run.mjs.
 */

// ─── Check recorder ──────────────────────────────────────────────────────────
export const results = [];
let currentGroup = '';
export const group = (name) => { currentGroup = name; };
export const check = (name, cond, detail = '') => {
  results.push({ group: currentGroup, name, pass: !!cond, detail: cond ? '' : String(detail) });
  console.log(`${cond ? 'PASS' : 'FAIL'}  [${currentGroup}] ${name}${cond || !detail ? '' : `  (${detail})`}`);
};

// ─── HTTP session with a cookie jar ──────────────────────────────────────────
export const session = (base) => {
  let cookie = '';
  const req = async (method, path, body, { csrf = true, headers = {}, raw, bearer } = {}) => {
    const h = { ...headers };
    if (cookie) h.Cookie = cookie;
    if (bearer) h.Authorization = `Bearer ${bearer}`;
    if (csrf) h['X-Requested-With'] = 'XMLHttpRequest';
    let payload;
    if (raw !== undefined) payload = raw;
    else if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetch(base + path, { method, headers: h, body: payload, redirect: 'manual' });
    const setCookie = res.headers.get('set-cookie') || '';
    const m = /bt_token=([^;]*)/.exec(setCookie);
    if (m) cookie = m[1] ? `bt_token=${m[1]}` : '';
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, json, text, headers: res.headers, setCookie };
  };
  return {
    req,
    get token() { return cookie.replace('bt_token=', ''); },
    set token(t) { cookie = t ? `bt_token=${t}` : ''; },
  };
};

const login = async (base, acct) => {
  const s = session(base);
  const r = await s.req('POST', '/api/auth/login', { email: acct.email, password: acct.password });
  return { s, r };
};

const noStack = (r) => !/\bat\s+\S+\s+\(|\.ts:\d+|\.js:\d+/.test(r.text);
const upload = (s, path, field, name, type, content, extra = {}) => {
  const fd = new FormData();
  fd.append(field, new Blob([content], { type }), name);
  for (const [k, v] of Object.entries(extra)) fd.append(k, v);
  return s.req('POST', path, undefined, { raw: fd });
};

// ─── Development mode (original roles, full access) ──────────────────────────
export async function devChecks(ctx) {
  const { base, acct, ids, db, jwt, secret } = ctx;
  const anon = session(base);

  group('session');
  check('API requires a session (401)', (await anon.req('GET', '/api/projects')).status === 401);
  const cfg = (await anon.req('GET', '/api/auth/config')).json;
  check('auth config: password login on, demo off', cfg.passwordLogin === true && cfg.demoMode === false);

  const s = {};
  for (const k of ['admin', 'pm', 'engineer', 'consultant']) {
    const { s: sess, r } = await login(base, acct[k]);
    s[k] = sess;
    check(`${k} signs in; no token in the response body`, r.status === 200 && r.json.user?.email === acct[k].email && !('token' in r.json), `status=${r.status}`);
    check(`${k} profile via cookie`, (await sess.req('GET', '/api/auth/profile')).status === 200);
    if (k === 'admin') {
      const c = r.setCookie;
      check('cookie: HttpOnly', /;\s*HttpOnly/i.test(c));
      check('cookie: SameSite=Lax', /;\s*SameSite=Lax/i.test(c));
      check('cookie: Path=/', /;\s*Path=\/(;|$)/i.test(c));
      check('cookie: bounded lifetime (Max-Age/Expires)', /;\s*Max-Age=\d+/i.test(c) && /;\s*Expires=/i.test(c));
      check('cookie: not Secure over local HTTP (development)', !/;\s*Secure/i.test(c));
      check('no password hash in login response', !/password/i.test(r.text));
    }
  }

  group('tokens');
  const br = await anon.req('GET', '/api/auth/profile', undefined, { bearer: s.admin.token });
  check('Bearer header fallback accepted', br.status === 200);
  const payload = { userId: ids.users.engineer, email: acct.engineer.email, role: 'ADMIN', tv: 0 };
  const wrongSecret = jwt.sign(payload, 'not-the-server-secret-0123456789abcdef', { algorithm: 'HS256', issuer: 'buildtrack-pro' });
  check('token signed with another secret → 401', (await anon.req('GET', '/api/auth/profile', undefined, { bearer: wrongSecret })).status === 401);
  const unsigned = jwt.sign(payload, '', { algorithm: 'none' });
  check('unsigned (alg=none) token → 401', (await anon.req('GET', '/api/auth/profile', undefined, { bearer: unsigned })).status === 401);
  const wrongIssuer = jwt.sign(payload, secret, { algorithm: 'HS256', issuer: 'someone-else' });
  check('token with a foreign issuer → 401', (await anon.req('GET', '/api/auth/profile', undefined, { bearer: wrongIssuer })).status === 401);
  const roleClaim = jwt.sign(payload, secret, { algorithm: 'HS256', issuer: 'buildtrack-pro', expiresIn: '5m' });
  check('role claim in token is not trusted (engineer claiming ADMIN → /users 403)',
    (await anon.req('GET', '/api/users', undefined, { bearer: roleClaim })).status === 403);
  const expired = jwt.sign({ ...payload, role: 'SITE_ENGINEER', exp: Math.floor(Date.now() / 1000) - 60 }, secret, { algorithm: 'HS256', issuer: 'buildtrack-pro' });
  check('expired token → 401', (await anon.req('GET', '/api/auth/profile', undefined, { bearer: expired })).status === 401);

  group('csrf');
  const noHdr = await anon.req('POST', '/api/auth/login', { email: acct.pm.email, password: acct.pm.password }, { csrf: false });
  check('POST without X-Requested-With → 403', noHdr.status === 403 && !noHdr.setCookie.includes('bt_token='));
  const put = await s.admin.req('PUT', `/api/projects/${ids.projectA}`, { name: 'csrf-hijack' }, { csrf: false });
  const nameAfter = (await db.project.findUnique({ where: { id: ids.projectA } })).name;
  check('PUT without X-Requested-With → 403, project unchanged', put.status === 403 && nameAfter !== 'csrf-hijack', `status=${put.status}`);
  const del = await s.admin.req('DELETE', `/api/projects/${ids.projectB}/risks/${ids.riskB}`, undefined, { csrf: false });
  const riskStill = await db.risk.findUnique({ where: { id: ids.riskB } });
  check('DELETE without X-Requested-With → 403, record kept', del.status === 403 && !!riskStill, `status=${del.status}`);
  const form = await s.admin.req('POST', `/api/projects/${ids.projectA}/risks`, undefined, {
    csrf: false, raw: 'title=csrf&description=csrf', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://evil.example' },
  });
  check('cross-site form POST with session cookie → 403', form.status === 403);

  group('roles');
  check('ADMIN GET /users → 200', (await s.admin.req('GET', '/api/users')).status === 200);
  for (const k of ['pm', 'engineer', 'consultant']) {
    check(`${k} GET /users → 403`, (await s[k].req('GET', '/api/users')).status === 403);
  }
  check('PM cannot create an ADMIN account', (await s.pm.req('POST', '/api/users', { name: 'X', email: 'x@security-test.invalid', password: 'password123', role: 'ADMIN' })).status === 403);
  check('admin analytics (users) blocked for PM', (await s.pm.req('GET', '/api/analytics/users')).status === 403);
  const regEmail = `reg-${Date.now()}@security-test.invalid`;
  const reg = await session(base).req('POST', '/api/auth/register', { name: 'Reg', email: regEmail, password: 'password123', role: 'ADMIN' });
  check('self-registration cannot pick ADMIN', reg.status === 201 && reg.json.user?.role !== 'ADMIN', JSON.stringify(reg.json));
  check('registration rejects a short password', (await session(base).req('POST', '/api/auth/register', { name: 'a', email: `b${regEmail}`, password: 'short' })).status === 400);
  check('admin cannot demote themselves', (await s.admin.req('PUT', `/api/users/${ids.users.admin}`, { role: 'SITE_ENGINEER' })).status === 400);

  group('project-access');
  const engList = (await s.engineer.req('GET', '/api/projects')).json;
  const engIds = new Set(engList.map(p => p.id));
  check('engineer lists project A but not project B', engIds.has(ids.projectA) && !engIds.has(ids.projectB));
  check('consultant (member) reads project A', (await s.consultant.req('GET', `/api/projects/${ids.projectA}`)).status === 200);
  for (const [label, path] of [
    ['project', `/api/projects/${ids.projectB}`],
    ['stats', `/api/projects/${ids.projectB}/stats`],
    ['risks', `/api/projects/${ids.projectB}/risks`],
    ['daily reports', `/api/projects/${ids.projectB}/reports/daily`],
    ['daily report by id', `/api/projects/${ids.projectB}/reports/daily/${ids.reportB}`],
    ['documents', `/api/projects/${ids.projectB}/documents`],
    ['analytics', `/api/analytics/projects/${ids.projectB}`],
  ]) {
    check(`non-member GET ${label} of project B → 404`, (await s.engineer.req('GET', path)).status === 404);
  }
  check('non-member POST risk into project B → 404', (await s.engineer.req('POST', `/api/projects/${ids.projectB}/risks`, { title: 'x', description: 'x' })).status === 404);
  check('non-member PUT project B → 404', (await s.engineer.req('PUT', `/api/projects/${ids.projectB}`, { name: 'x' })).status === 404);

  // Child records must belong to the project in the URL (IDOR).
  const updRisk = await s.engineer.req('PUT', `/api/projects/${ids.projectA}/risks/${ids.riskB}`, { title: 'hijacked' });
  const delRisk = await s.engineer.req('DELETE', `/api/projects/${ids.projectA}/risks/${ids.riskB}`);
  const updMs = await s.engineer.req('PUT', `/api/projects/${ids.projectA}/milestones/${ids.milestoneB}`, { name: 'hijacked' });
  const getRep = await s.engineer.req('GET', `/api/projects/${ids.projectA}/reports/daily/${ids.reportB}`);
  const comment = await s.engineer.req('POST', `/api/projects/${ids.projectA}/reports/daily/${ids.reportB}/comments`, { content: 'x' });
  check('IDOR: update B risk via project A → 404', updRisk.status === 404, `status=${updRisk.status}`);
  check('IDOR: delete B risk via project A → 404', delRisk.status === 404, `status=${delRisk.status}`);
  check('IDOR: update B milestone via project A → 404', updMs.status === 404, `status=${updMs.status}`);
  check('IDOR: read B daily report via project A → 404', getRep.status === 404, `status=${getRep.status}`);
  check('IDOR: comment on B daily report via project A → 404', comment.status === 404, `status=${comment.status}`);
  const riskB = await db.risk.findUnique({ where: { id: ids.riskB } });
  const msB = await db.milestone.findUnique({ where: { id: ids.milestoneB } });
  check('project B records unchanged after IDOR attempts', riskB?.title === 'Fixture risk B' && msB?.name === 'Fixture milestone B');

  // Body fields cannot re-target records.
  const own = await s.engineer.req('POST', `/api/projects/${ids.projectA}/risks`, { title: 'Engineer risk', description: 'x', probability: 2, impact: 2, projectId: ids.projectB, id: 'forced-id' });
  check('create: body projectId/id ignored (stays in project A)', own.status === 201 && own.json.projectId === ids.projectA && own.json.id !== 'forced-id', JSON.stringify(own.json));
  if (own.status === 201) {
    await s.engineer.req('PUT', `/api/projects/${ids.projectA}/risks/${own.json.id}`, { projectId: ids.projectB, title: 'Engineer risk v2' });
    const moved = await db.risk.findUnique({ where: { id: own.json.id } });
    check('update: body projectId cannot move a record', moved?.projectId === ids.projectA && moved?.title === 'Engineer risk v2');
    await s.engineer.req('DELETE', `/api/projects/${ids.projectA}/risks/${own.json.id}`);
  }

  // Project management: PROJECT_MANAGER members (or ADMIN) only.
  check('engineer DELETE project A → 403', (await s.engineer.req('DELETE', `/api/projects/${ids.projectA}`)).status === 403);
  check('engineer add member to project A → 403', (await s.engineer.req('POST', `/api/projects/${ids.projectA}/members`, { userId: ids.users.viewer, role: 'ADMIN' })).status === 403);
  check('engineer remove member from project A → 403', (await s.engineer.req('DELETE', `/api/projects/${ids.projectA}/members/${ids.users.consultant}`)).status === 403);
  check('PM (not a member) DELETE project B → 403', (await s.pm.req('DELETE', `/api/projects/${ids.projectB}`)).status === 403);
  check('PM (not a member) add member to project B → 403', (await s.pm.req('POST', `/api/projects/${ids.projectB}/members`, { userId: ids.users.engineer, role: 'SITE_ENGINEER' })).status === 403);
  const add = await s.pm.req('POST', `/api/projects/${ids.projectA}/members`, { userId: ids.users.revoke, role: 'CLIENT_VIEWER' });
  check('PM of project A can add a member', add.status === 200, `status=${add.status}`);
  const rem = await s.pm.req('DELETE', `/api/projects/${ids.projectA}/members/${ids.users.revoke}`);
  check('PM of project A can remove a member', rem.status === 200, `status=${rem.status}`);
  check('project A still exists after the role checks', !!(await db.project.findUnique({ where: { id: ids.projectA } })));

  group('uploads');
  const docsA = `/api/projects/${ids.projectA}/documents`;
  check('reject .html', (await upload(s.admin, docsA, 'file', 'x.html', 'text/html', '<script>alert(1)</script>')).status === 400);
  check('reject .svg', (await upload(s.admin, docsA, 'file', 'x.svg', 'image/svg+xml', '<svg/>')).status === 400);
  check('reject .pdf sent with an HTML MIME type', (await upload(s.admin, docsA, 'file', 'x.pdf', 'text/html', 'x')).status === 400);
  check('reject .exe', (await upload(s.admin, docsA, 'file', 'x.exe', 'application/octet-stream', 'MZ')).status === 400);
  const pdf = await upload(s.engineer, docsA, 'file', 'security-test.pdf', 'application/pdf', '%PDF-1.4\n%%EOF', { name: 'security-test.pdf', tags: '["a","b"]' });
  check('member uploads a .pdf', pdf.status === 201, JSON.stringify(pdf.json));
  check('stored under a random name, tags parsed', pdf.status === 201 && /^\/uploads\/documents\/[0-9a-f-]{36}\.pdf$/.test(pdf.json.fileUrl) && pdf.json.tags === '["a","b"]', JSON.stringify(pdf.json));
  const meta = await s.admin.req('POST', docsA, { name: 'Metadata only', fileUrl: '#', type: 'CONTRACT' });
  check('metadata-only register entry accepted', meta.status === 201);
  check('non-member upload into project B → 404', (await upload(s.engineer, `/api/projects/${ids.projectB}/documents`, 'file', 'x.pdf', 'application/pdf', '%PDF-1.4')).status === 404);
  const photo = await upload(s.engineer, '/api/photos', 'file', 'p.png', 'image/png', 'png', { dailyReportId: ids.reportB });
  check('photo cannot be attached to a project B report by a non-member → 400', photo.status === 400);
  const docB = await upload(s.admin, `/api/projects/${ids.projectB}/documents`, 'file', 'b.pdf', 'application/pdf', '%PDF-1.4\n%%EOF', { name: 'b.pdf' });

  if (pdf.status === 201) {
    const url = pdf.json.fileUrl;
    check('file: anonymous → 401', (await anon.req('GET', url)).status === 401);
    const g = await s.consultant.req('GET', url);
    check('file: project member → 200 + nosniff + CSP', g.status === 200 && g.headers.get('x-content-type-options') === 'nosniff' && !!g.headers.get('content-security-policy'));
    if (docB.status === 201) check('file: non-member of project B → 404', (await s.engineer.req('GET', docB.json.fileUrl)).status === 404);
    check('file: path traversal → 404', (await s.admin.req('GET', '/uploads/documents/..%2F..%2Fprisma%2Fdev.db')).status === 404);
    await s.admin.req('DELETE', `/api/projects/${ids.projectA}/documents/${pdf.json.id}`);
    check('file removed when its document is deleted', (await s.admin.req('GET', url)).status === 404);
  }
  if (meta.status === 201) await s.admin.req('DELETE', `${docsA}/${meta.json.id}`);
  if (docB.status === 201) await s.admin.req('DELETE', `/api/projects/${ids.projectB}/documents/${docB.json.id}`);

  group('revocation');
  const { s: rs, r: rl } = await login(base, acct.revoke);
  check('revocation fixture signs in', rl.status === 200);
  await s.admin.req('PUT', `/api/users/${ids.users.revoke}`, { role: 'CLIENT_VIEWER' });
  check('role change revokes existing sessions', (await rs.req('GET', '/api/auth/profile')).status === 401);
  const lo = await s.consultant.req('POST', '/api/auth/logout');
  check('logout expires the cookie', lo.status === 200 && /bt_token=;/.test(lo.setCookie) && /Expires=Thu, 01 Jan 1970/i.test(lo.setCookie));
  check('after logout the browser session is gone', (await s.consultant.req('GET', '/api/auth/profile')).status === 401);

  group('lockout');
  const codes = [];
  for (let i = 0; i < 5; i++) codes.push((await session(base).req('POST', '/api/auth/login', { email: acct.lockme.email, password: 'wrong-password' })).status);
  check('wrong passwords → 401', codes.slice(0, 4).every(c => c === 401), codes.join(','));
  const locked = await session(base).req('POST', '/api/auth/login', { email: acct.lockme.email, password: acct.lockme.password });
  check('locked after 5 failures (correct password → 429)', locked.status === 429, `status=${locked.status}`);
  const unknown = await session(base).req('POST', '/api/auth/login', { email: 'nobody@security-test.invalid', password: 'x' });
  check('unknown account gets the same generic 401', unknown.status === 401 && !/not found|no user/i.test(unknown.text));

  return { adminToken: s.admin.token };
}

// ─── Production mode ─────────────────────────────────────────────────────────
export async function prodChecks(ctx) {
  const { base, acct, ids, allowedOrigin } = ctx;
  group('prod');
  const cfg = (await session(base).req('GET', '/api/auth/config')).json;
  check('registration closed by default', cfg.registrationOpen === false);
  check('register → 403', (await session(base).req('POST', '/api/auth/register', { name: 'x', email: `p-${Date.now()}@security-test.invalid`, password: 'password123' })).status === 403);
  const { s, r } = await login(base, acct.pm);
  check('login works', r.status === 200);
  check('cookie: Secure + HttpOnly + SameSite=Lax + Path=/', /;\s*Secure/i.test(r.setCookie) && /;\s*HttpOnly/i.test(r.setCookie) && /;\s*SameSite=Lax/i.test(r.setCookie) && /;\s*Path=\//i.test(r.setCookie));
  check('CSRF header still required', (await s.req('PUT', `/api/projects/${ids.projectA}`, { name: 'x' }, { csrf: false })).status === 403);
  const nf = await s.req('GET', '/api/projects/does-not-exist');
  check('unknown project → 404 without stack trace', nf.status === 404 && noStack(nf));
  const bad = await s.req('POST', `/api/projects/${ids.projectA}/risks`, undefined, { raw: '{"title":', headers: { 'Content-Type': 'application/json' } });
  check('malformed JSON → 400 without stack trace', bad.status === 400 && noStack(bad), `status=${bad.status}`);
  check('demo sign-in disabled → 404', (await session(base).req('POST', '/api/auth/demo', {})).status === 404);
  const h = (await session(base).req('GET', '/api/auth/config')).headers;
  check('helmet headers present, X-Powered-By hidden', h.get('x-content-type-options') === 'nosniff' && !!h.get('strict-transport-security') && !h.get('x-powered-by'));
  const foreign = await fetch(`${base}/api/auth/config`, { headers: { Origin: 'https://evil.example' } });
  check('CORS: foreign origin gets no Access-Control-Allow-Origin', !foreign.headers.get('access-control-allow-origin'));
  const pre = await fetch(`${base}/api/projects`, { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'x-requested-with' } });
  check('CORS: foreign preflight is not allowed', !pre.headers.get('access-control-allow-origin'));
  const ok = await fetch(`${base}/api/auth/config`, { headers: { Origin: allowedOrigin } });
  check('CORS: configured origin allowed with credentials', ok.headers.get('access-control-allow-origin') === allowedOrigin && ok.headers.get('access-control-allow-credentials') === 'true');
  const lo = await s.req('POST', '/api/auth/logout');
  check('logout cookie also Secure', /bt_token=;/.test(lo.setCookie) && /;\s*Secure/i.test(lo.setCookie));
}

// ─── Public demo mode (read-only) ────────────────────────────────────────────
export async function demoChecks(ctx) {
  const { base, acct, ids, db, foreignToken } = ctx;
  group('demo');
  const before = await snapshot(db, acct);
  const cfg = (await session(base).req('GET', '/api/auth/config')).json;
  check('config: demo on, password login and registration off', cfg.demoMode === true && cfg.passwordLogin === false && cfg.registrationOpen === false);
  check('password login refused (admin) → 403', (await session(base).req('POST', '/api/auth/login', { email: acct.admin.email, password: acct.admin.password })).status === 403);
  check('password login refused (viewer) → 403', (await session(base).req('POST', '/api/auth/login', { email: acct.viewer.email, password: acct.viewer.password })).status === 403);
  const list = (await session(base).req('GET', '/api/auth/demo-accounts')).json;
  const emails = Array.isArray(list) ? list.map(a => a.email) : [];
  check('demo accounts: allow-listed, ADMIN filtered out even if listed', emails.length === 2 && emails[0] === acct.viewer.email && emails.includes(acct.consultant.email) && !emails.includes(acct.admin.email), JSON.stringify(list));
  check('demo sign-in as an allow-listed ADMIN → 400', (await session(base).req('POST', '/api/auth/demo', { email: acct.admin.email })).status === 400);
  check('demo sign-in as a non-listed user → 400', (await session(base).req('POST', '/api/auth/demo', { email: acct.pm.email })).status === 400);
  check('token from another deployment (other secret) → 401', (await session(base).req('GET', '/api/auth/profile', undefined, { bearer: foreignToken })).status === 401);

  const v = session(base);
  const d = await v.req('POST', '/api/auth/demo', {});
  check('default demo sign-in → first allow-listed account', d.status === 200 && d.json.user?.email === acct.viewer.email && d.json.user?.role !== 'ADMIN');
  check('reads work (projects)', (await v.req('GET', '/api/projects')).status === 200);
  check('reads work (member project risks)', (await v.req('GET', `/api/projects/${ids.projectA}/risks`)).status === 200);
  check('/users still ADMIN-only → 403', (await v.req('GET', '/api/users')).status === 403);

  const A = `/api/projects/${ids.projectA}`;
  const writes = [
    ['POST', '/api/projects', { name: 'x', code: 'x', client: 'x', location: 'x', startDate: '2026-01-01', endDate: '2026-12-31' }],
    ['PUT', A, { name: 'demo-hijack' }],
    ['DELETE', A],
    ['POST', `${A}/members`, { userId: ids.users.viewer, role: 'PROJECT_MANAGER' }],
    ['DELETE', `${A}/members/${ids.users.engineer}`],
    ['POST', `${A}/risks`, { title: 'x', description: 'x' }],
    ['PUT', `${A}/risks/${ids.riskA}`, { title: 'demo-hijack' }],
    ['DELETE', `${A}/risks/${ids.riskA}`],
    ['POST', `${A}/reports/daily`, { reportDate: '2026-01-02' }],
    ['POST', `${A}/reports/weekly/generate`, { weekNumber: 1, year: 2026 }],
    ['POST', `${A}/activities/bulk`, { activities: [] }],
    ['PUT', '/api/auth/profile', { name: 'demo-hijack' }],
    ['POST', '/api/users', { name: 'x', email: 'x@security-test.invalid', password: 'password123', role: 'ADMIN' }],
    ['POST', '/api/auth/register', { name: 'x', email: 'y@security-test.invalid', password: 'password123' }],
  ];
  for (const [m, p, b] of writes) {
    const r = await v.req(m, p, b);
    check(`${m} ${p.replace(ids.projectA, ':A')} → 403 (read-only)`, r.status === 403 && r.json.demo === true, `status=${r.status}`);
  }
  const up = await upload(v, `${A}/documents`, 'file', 'x.pdf', 'application/pdf', '%PDF-1.4');
  check('document upload → 403 (read-only)', up.status === 403 && up.json.demo === true);
  const ph = await upload(v, '/api/photos', 'file', 'p.png', 'image/png', 'png', { dailyReportId: ids.reportA });
  check('photo upload → 403 (read-only)', ph.status === 403 && ph.json.demo === true);
  const override = await v.req('POST', `${A}/risks`, { title: 'x', description: 'x' }, { headers: { 'X-HTTP-Method-Override': 'GET' } });
  check('method-override header does not bypass read-only', override.status === 403);
  const caseTrick = await v.req('PUT', `/api/PROJECTS/${ids.projectA}`, { name: 'demo-hijack' });
  check('path case variation does not bypass read-only', caseTrick.status === 403);

  // A full-privilege session cannot write either.
  const admin = session(base);
  admin.token = ctx.demoAdminToken;
  const aw = await admin.req('PUT', A, { name: 'demo-hijack' });
  check('even an ADMIN session is read-only in demo mode', aw.status === 403 && aw.json.demo === true, `status=${aw.status}`);
  check('logout still allowed', (await v.req('POST', '/api/auth/logout')).status === 200);

  const after = await snapshot(db, acct);
  check('database unchanged by all demo write attempts', JSON.stringify(before) === JSON.stringify(after), `${JSON.stringify(before)} vs ${JSON.stringify(after)}`);
}

const snapshot = async (db, acct) => ({
  users: await db.user.count(),
  projects: await db.project.count(),
  members: await db.projectMember.count(),
  risks: await db.risk.count(),
  reports: await db.dailyReport.count(),
  documents: await db.document.count(),
  photos: await db.photo.count(),
  projectA: (await db.project.findUnique({ where: { code: 'SEC-A' } }))?.name,
  riskTitles: (await db.risk.findMany({ select: { title: true }, orderBy: { id: 'asc' } })).map(r => r.title),
  viewerName: (await db.user.findUnique({ where: { email: acct.viewer.email } }))?.name,
});
