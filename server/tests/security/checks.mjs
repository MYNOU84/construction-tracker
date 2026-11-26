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
  const pdf = await upload(s.engineer, docsA, 'file', 'security-test.pdf', 'application/pdf', '%PDF-1.4\n%%EOF', { name: 'security-test.pdf', tags: '["a","b"]', status: 'SUBMITTED' });
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

  group('permissions');
  for (const k of ['viewer', 'contractor']) s[k] = (await login(base, acct[k])).s;
  const P = `/api/projects/${ids.projectA}`;
  const perms = async (k) => (await s[k].req('GET', `${P}/permissions`)).json;
  const pa = await perms('admin'), pv = await perms('viewer'), pe = await perms('engineer');
  check('owner (ADMIN) → role OWNER with every permission', pa.role === 'OWNER' && pa.permissions?.daily?.includes('approve') && pa.seesInternal === true, JSON.stringify(pa));
  check('client viewer → view/export only, no internal access', pv.role === 'CLIENT_VIEWER' && pv.permissions?.risks?.join() === 'view,export' && pv.seesInternal === false, JSON.stringify(pv));
  check('site engineer → may submit but not approve daily reports', pe.permissions?.daily?.includes('submit') && !pe.permissions?.daily?.includes('approve'), JSON.stringify(pe));
  check('permissions of a non-member project → 404', (await s.engineer.req('GET', `/api/projects/${ids.projectB}/permissions`)).status === 404);

  // Client viewer: read and export only.
  check('viewer reads risks → 200', (await s.viewer.req('GET', `${P}/risks`)).status === 200);
  check('viewer exports the project → 200', (await s.viewer.req('GET', `${P}/export`)).status === 200);
  for (const [m, p, b] of [
    ['POST', `${P}/risks`, { title: 'x', description: 'x' }],
    ['PUT', `${P}/risks/${ids.riskA}`, { title: 'viewer-hijack' }],
    ['DELETE', `${P}/risks/${ids.riskA}`],
    ['POST', `${P}/reports/daily`, { reportDate: '2026-02-01' }],
    ['POST', `${P}/reports/weekly/generate`, { weekNumber: 5, year: 2026 }],
    ['POST', `${P}/reports/monthly/generate`, { month: 2, year: 2026 }],
    ['POST', `${P}/documents`, { name: 'x', fileUrl: '#', type: 'CONTRACT' }],
  ]) {
    const r = await s.viewer.req(m, p, b);
    check(`viewer ${m} ${p.replace(P, ':A').replace(ids.riskA, ':risk')} → 403`, r.status === 403, `status=${r.status}`);
  }
  check('risk A unchanged by viewer', (await db.risk.findUnique({ where: { id: ids.riskA } }))?.title === 'Fixture risk A');

  // Contractor: may raise a risk but not edit it.
  const cr = await s.contractor.req('POST', `${P}/risks`, { title: 'Contractor risk', description: 'x' });
  check('contractor creates a risk → 201', cr.status === 201, `status=${cr.status}`);
  if (cr.status === 201) {
    check('contractor edits a risk → 403', (await s.contractor.req('PUT', `${P}/risks/${cr.json.id}`, { title: 'y' })).status === 403);
    check('contractor deletes a risk → 403', (await s.contractor.req('DELETE', `${P}/risks/${cr.json.id}`)).status === 403);
    await s.admin.req('DELETE', `${P}/risks/${cr.json.id}`);
  }
  check('consultant generates a weekly report → 403', (await s.consultant.req('POST', `${P}/reports/weekly/generate`, { weekNumber: 6, year: 2026 })).status === 403);

  // Daily report workflow: draft → submitted → approved.
  const draft = await s.engineer.req('POST', `${P}/reports/daily`, { reportDate: '2026-02-02', status: 'DRAFT' });
  const sub = await s.engineer.req('POST', `${P}/reports/daily`, { reportDate: '2026-02-03', status: 'SUBMITTED' });
  check('engineer creates a draft and a submitted report', draft.status === 201 && draft.json.status === 'DRAFT' && sub.status === 201 && sub.json.status === 'SUBMITTED', `${draft.status}/${sub.status}`);
  const vForced = await s.viewer.req('POST', `${P}/reports/daily`, { reportDate: '2026-02-04', status: 'APPROVED' });
  check('viewer cannot create an approved report', vForced.status === 403);
  const cForced = await s.contractor.req('POST', `${P}/reports/daily`, { reportDate: '2026-02-05', status: 'APPROVED' });
  check('status APPROVED on create is not honoured', cForced.status === 201 && cForced.json.status !== 'APPROVED', JSON.stringify(cForced.json?.status));
  if (draft.status === 201 && sub.status === 201) {
    const D = `${P}/reports/daily/${draft.json.id}`, S = `${P}/reports/daily/${sub.json.id}`;
    const vList = (await s.viewer.req('GET', `${P}/reports/daily`)).json;
    const vIds = new Set((Array.isArray(vList) ? vList : vList.reports || vList.data || []).map(r => r.id));
    check('viewer list hides internal drafts, shows submitted', !vIds.has(draft.json.id) && vIds.has(sub.json.id), JSON.stringify([...vIds]));
    check('viewer GET internal draft → 404', (await s.viewer.req('GET', D)).status === 404);
    check('consultant GET internal draft → 404', (await s.consultant.req('GET', D)).status === 404);
    check('PM GET internal draft → 200', (await s.pm.req('GET', D)).status === 200);
    const vExport = (await s.viewer.req('GET', `${P}/export`)).json;
    check('viewer export excludes internal drafts', Array.isArray(vExport.dailyReports) && !vExport.dailyReports.some(r => r.id === draft.json.id));
    check('viewer comment → 403', (await s.viewer.req('POST', `${S}/comments`, { content: 'x' })).status === 403);
    check('consultant review comment → 201', (await s.consultant.req('POST', `${S}/comments`, { content: 'Reviewed' })).status === 201);
    check('engineer approves own report → 403', (await s.engineer.req('PUT', S, { status: 'APPROVED' })).status === 403);
    check('contractor approves → 403', (await s.contractor.req('PUT', S, { status: 'APPROVED' })).status === 403);
    check('consultant approves a draft → refused', (await s.consultant.req('PUT', D, { status: 'APPROVED' })).status >= 400);
    const ap = await s.consultant.req('PUT', S, { status: 'APPROVED' });
    const apRow = await db.dailyReport.findUnique({ where: { id: sub.json.id } });
    check('consultant approves a submitted report → 200, approver recorded', ap.status === 200 && apRow.status === 'APPROVED' && apRow.approvedBy === ids.users.consultant, `status=${ap.status}`);
    check('engineer edits an approved report → 403', (await s.engineer.req('PUT', S, { generalSummary: 'changed' })).status === 403);
    check('viewer deletes a report → 403', (await s.viewer.req('DELETE', S)).status === 403);
    await s.admin.req('DELETE', D); await s.admin.req('DELETE', S);
  }
  if (cForced.status === 201) await s.admin.req('DELETE', `${P}/reports/daily/${cForced.json.id}`);

  // Documents: internal working files vs officially submitted documents.
  const idoc = await upload(s.engineer, `${P}/documents`, 'file', 'internal.pdf', 'application/pdf', '%PDF-1.4\n%%EOF', { name: 'internal.pdf' });
  check('upload without status is INTERNAL', idoc.status === 201 && idoc.json.status === 'INTERNAL', JSON.stringify(idoc.json?.status));
  const vdoc = await upload(s.viewer, `${P}/documents`, 'file', 'v.pdf', 'application/pdf', '%PDF-1.4');
  check('viewer upload → 403', vdoc.status === 403);
  if (idoc.status === 201) {
    const docUrl = `${P}/documents/${idoc.json.id}`;
    const listed = async (k) => ((await s[k].req('GET', `${P}/documents`)).json || []).some(d => d.id === idoc.json.id);
    check('internal document hidden from viewer and consultant, visible to PM', !(await listed('viewer')) && !(await listed('consultant')) && (await listed('pm')));
    check('internal document file → 404 for viewer', (await s.viewer.req('GET', idoc.json.fileUrl)).status === 404);
    { const r = await s.viewer.req('PATCH', `${docUrl}/status`, { status: 'SUBMITTED' }); check('viewer cannot issue it (403/404)', r.status === 403 || r.status === 404, `status=${r.status}`); }
    check('engineer cannot approve an internal document', (await s.engineer.req('PATCH', `${docUrl}/status`, { status: 'APPROVED' })).status >= 400);
    const issued = await s.engineer.req('PATCH', `${docUrl}/status`, { status: 'SUBMITTED' });
    check('engineer submits it officially → 200', issued.status === 200 && issued.json.status === 'SUBMITTED', `status=${issued.status}`);
    check('submitted document visible to viewer, file served', (await listed('viewer')) && (await s.viewer.req('GET', idoc.json.fileUrl)).status === 200);
    check('engineer approves → 403', (await s.engineer.req('PATCH', `${docUrl}/status`, { status: 'APPROVED' })).status === 403);
    const appr = await s.consultant.req('PATCH', `${docUrl}/status`, { status: 'APPROVED', note: 'OK' });
    check('consultant approves → 200, reviewer recorded', appr.status === 200 && appr.json.status === 'APPROVED' && appr.json.reviewedBy === ids.users.consultant, JSON.stringify(appr.json));
    check('viewer deletes it → 403', (await s.viewer.req('DELETE', docUrl)).status === 403);
    check('engineer deletes an official document → 403', (await s.engineer.req('DELETE', docUrl)).status === 403);
    await s.admin.req('DELETE', docUrl);
  }

  group('owner-workflow');
  {
    check('project without required fields → 400 (not 500)', (await s.admin.req('POST', '/api/projects', { name: 'Incomplete', code: `INC-${Date.now()}` })).status === 400);
    // The owner (system ADMIN) runs several real projects end to end. Test projects are removed afterwards.
    const created = [];
    for (const n of [1, 2]) {
      const r = await s.admin.req('POST', '/api/projects', { name: `Owner workflow ${n}`, code: `OWN-${n}-${Date.now()}`, client: 'Test client', location: 'Test site', startDate: '2026-01-01', endDate: '2026-12-31', status: 'ACTIVE' });
      check(`owner creates project ${n} → 201`, r.status === 201, r.status);
      if (r.status === 201) created.push(r.json);
    }
    const again = await login(base, acct.admin);
    const listed = (await again.s.req('GET', '/api/projects')).json;
    check('both projects persist and are listed in a new session', Array.isArray(listed) && created.every(c => listed.some(p => p.id === c.id)));
    if (created.length === 2) {
      const [p1, p2] = created;
      const P1 = `/api/projects/${p1.id}`;
      const ed = await s.admin.req('PUT', P1, { name: 'Owner workflow 1 (renamed)', progress: 25 });
      check('owner edits a project → 200', ed.status === 200 && ed.json.name === 'Owner workflow 1 (renamed)', ed.status);
      const perm = (await s.admin.req('GET', `${P1}/permissions`)).json;
      check('owner role on own project is OWNER with every permission', perm?.role === 'OWNER' && perm.permissions?.daily?.includes('approve') && perm.seesInternal === true);
      const add = await s.admin.req('POST', `${P1}/members`, { userId: ids.users.viewer, role: 'CLIENT_VIEWER' });
      check('owner assigns a client viewer to project 1 → 201', add.status === 201 || add.status === 200, add.status);
      check('assigned viewer reads project 1', (await s.viewer.req('GET', P1)).status === 200);
      check('viewer cannot see project 2 (isolation) → 404', (await s.viewer.req('GET', `/api/projects/${p2.id}`)).status === 404);
      const vp = (await s.viewer.req('GET', `${P1}/permissions`)).json;
      check('viewer permissions on project 1 are read/export only', vp?.role === 'CLIENT_VIEWER' && !vp.permissions?.daily?.includes('create') && vp.permissions?.daily?.includes('export'));
      const dr = await s.admin.req('POST', `${P1}/reports/daily`, { reportDate: '2026-03-02', status: 'SUBMITTED', weather: 'SUNNY', workDescription: 'Formwork level 1' });
      check('owner records a daily report → 201', dr.status === 201, dr.status);
      const wk = await s.admin.req('POST', `${P1}/reports/weekly/generate`, { weekNumber: 10, year: 2026 });
      check('owner generates a weekly report → 201', wk.status === 201 || wk.status === 200, wk.status);
      const mo = await s.admin.req('POST', `${P1}/reports/monthly/generate`, { month: 3, year: 2026 });
      check('owner generates a monthly report → 201', mo.status === 201 || mo.status === 200, mo.status);
      check('weekly report listed', ((await s.admin.req('GET', `${P1}/reports/weekly`)).json || []).length >= 1);
      check('monthly report listed', ((await s.admin.req('GET', `${P1}/reports/monthly`)).json || []).length >= 1);
      const ex = await s.admin.req('GET', `${P1}/export`);
      const exJson = ex.json && typeof ex.json === 'object' ? ex.json : {};
      const keys = Object.keys(exJson).join(',');
      check('owner exports all project data → 200 with reports', ex.status === 200 && /daily/i.test(keys) && /weekly/i.test(keys) && /monthly/i.test(keys), keys);
      const ar = await s.admin.req('PUT', `/api/projects/${p2.id}`, { status: 'ARCHIVED' });
      check('owner archives project 2 → 200', ar.status === 200 && ar.json.status === 'ARCHIVED', ar.status);
      check('owner lists users (user management) → 200', (await s.admin.req('GET', '/api/users')).status === 200);
    }
    for (const c of created) await s.admin.req('DELETE', `/api/projects/${c.id}`);
    const left = (await s.admin.req('GET', '/api/projects')).json;
    check('test projects removed after verification', Array.isArray(left) && !created.some(c => left.some(p => p.id === c.id)));
  }

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

// ─── Public demo (per-account, read-only) ────────────────────────────────────
export async function demoChecks(ctx) {
  const { base, acct, ids, db, foreignToken } = ctx;
  group('demo');
  const cfg = (await session(base).req('GET', '/api/auth/config')).json;
  check('config: demo on, password login on, registration off', cfg.demoMode === true && cfg.passwordLogin === true && cfg.registrationOpen === false, JSON.stringify(cfg));
  check('password login refused for an allow-listed demo account (admin) → 403', (await session(base).req('POST', '/api/auth/login', { email: acct.admin.email, password: acct.admin.password })).status === 403);
  check('password login refused for an allow-listed demo account (viewer) → 403', (await session(base).req('POST', '/api/auth/login', { email: acct.viewer.email, password: acct.viewer.password })).status === 403);
  const list = (await session(base).req('GET', '/api/auth/demo-accounts')).json;
  const emails = Array.isArray(list) ? list.map(a => a.email) : [];
  check('demo accounts: allow-listed, ADMIN filtered out even if listed', emails.length === 2 && emails[0] === acct.viewer.email && emails.includes(acct.consultant.email) && !emails.includes(acct.admin.email), JSON.stringify(list));
  check('demo sign-in as an allow-listed ADMIN → 400', (await session(base).req('POST', '/api/auth/demo', { email: acct.admin.email })).status === 400);
  check('demo sign-in as a non-listed user → 400', (await session(base).req('POST', '/api/auth/demo', { email: acct.pm.email })).status === 400);
  check('token from another deployment (other secret) → 401', (await session(base).req('GET', '/api/auth/profile', undefined, { bearer: foreignToken })).status === 401);

  // A real (non-demo) account signs in with its password and keeps write access (a no-op rename).
  const pm = session(base);
  const pl = await pm.req('POST', '/api/auth/login', { email: acct.pm.email, password: acct.pm.password });
  check('real account password login → 200, not flagged demo', pl.status === 200 && !pl.json.user?.demo, `status=${pl.status}`);
  const projectAName = (await db.project.findUnique({ where: { id: ids.projectA } })).name;
  check('real project manager can still write (PUT own project)', (await pm.req('PUT', `/api/projects/${ids.projectA}`, { name: projectAName })).status === 200);
  const pmList = (await pm.req('GET', '/api/projects')).json;
  check('real member does not see the demo project', Array.isArray(pmList) && !pmList.some(p => p.id === ids.projectDemo));

  const before = await snapshot(db, acct);
  const v = session(base);
  const d = await v.req('POST', '/api/auth/demo', {});
  check('default demo sign-in → first allow-listed account, flagged demo', d.status === 200 && d.json.user?.email === acct.viewer.email && d.json.user?.role !== 'ADMIN' && d.json.user?.demo === true, `status=${d.status}`);
  const vList = (await v.req('GET', '/api/projects')).json;
  check('demo visitor lists only demo- projects', Array.isArray(vList) && vList.length === 1 && vList[0].id === ids.projectDemo, JSON.stringify(vList?.map?.(p => p.id)));
  const D = `/api/projects/${ids.projectDemo}`;
  check('demo reads work (demo project)', (await v.req('GET', D)).status === 200);
  check('demo reads work (demo project risks)', (await v.req('GET', `${D}/risks`)).status === 200);
  check('demo export works (demo project)', (await v.req('GET', `${D}/export`)).status === 200);
  for (const [label, id] of [['A (member)', ids.projectA], ['B', ids.projectB]]) {
    for (const sub of ['', '/risks', '/export', '/reports/daily', '/documents', '/member-candidates']) {
      const r = await v.req('GET', `/api/projects/${id}${sub}`);
      check(`demo visitor → private project ${label}${sub} hidden (404/403)`, r.status === 404 || r.status === 403, `status=${r.status}`);
    }
  }
  check('/users still ADMIN-only → 403', (await v.req('GET', '/api/users')).status === 403);

  const A = `/api/projects/${ids.projectA}`;
  const writes = [
    ['POST', '/api/projects', { name: 'x', code: 'x', client: 'x', location: 'x', startDate: '2026-01-01', endDate: '2026-12-31' }],
    ['PUT', A, { name: 'demo-hijack' }],
    ['DELETE', A],
    ['PUT', D, { name: 'demo-hijack' }],
    ['PUT', D, { presentationData: '{}' }],
    ['DELETE', D],
    ['POST', `${A}/members`, { userId: ids.users.viewer, role: 'PROJECT_MANAGER' }],
    ['POST', `${D}/members`, { userId: ids.users.viewer, role: 'PROJECT_MANAGER' }],
    ['DELETE', `${A}/members/${ids.users.engineer}`],
    ['POST', `${A}/risks`, { title: 'x', description: 'x' }],
    ['POST', `${D}/risks`, { title: 'x', description: 'x' }],
    ['PUT', `${D}/risks/${ids.riskDemo}`, { title: 'demo-hijack' }],
    ['DELETE', `${D}/risks/${ids.riskDemo}`],
    ['PUT', `${A}/risks/${ids.riskA}`, { title: 'demo-hijack' }],
    ['DELETE', `${A}/risks/${ids.riskA}`],
    ['POST', `${D}/reports/daily`, { reportDate: '2026-01-02' }],
    ['POST', `${D}/reports/weekly/generate`, { weekNumber: 1, year: 2026 }],
    ['POST', `${D}/reports/monthly/generate`, { month: 1, year: 2026 }],
    ['PUT', '/api/auth/profile', { name: 'demo-hijack' }],
    ['POST', '/api/users', { name: 'x', email: 'x@security-test.invalid', password: 'password123', role: 'ADMIN' }],
  ];
  for (const [m, p, b] of writes) {
    const r = await v.req(m, p, b);
    const short = p.replace(ids.projectA, ':A').replace(ids.projectDemo, ':DEMO');
    check(`${m} ${short} → 403 (read-only)`, r.status === 403 && r.json?.demo === true, `status=${r.status}`);
  }
  const up = await upload(v, `${D}/documents`, 'file', 'x.pdf', 'application/pdf', '%PDF-1.4');
  check('document upload (demo project) → 403 (read-only)', up.status === 403 && up.json?.demo === true, `status=${up.status}`);
  const ph = await upload(v, '/api/photos', 'file', 'p.png', 'image/png', 'png', { dailyReportId: ids.reportA });
  check('photo upload → 403 (read-only)', ph.status === 403 && ph.json?.demo === true, `status=${ph.status}`);
  const override = await v.req('POST', `${D}/risks`, { title: 'x', description: 'x' }, { headers: { 'X-HTTP-Method-Override': 'GET' } });
  check('method-override header does not bypass read-only', override.status === 403);
  const caseTrick = await v.req('PUT', `/api/PROJECTS/${ids.projectDemo}`, { name: 'demo-hijack' });
  check('path case variation does not bypass read-only', caseTrick.status === 403 || caseTrick.status === 404, `status=${caseTrick.status}`);

  // An ADMIN whose e-mail is allow-listed as a demo account is refused outright, even with a valid token.
  const admin = session(base);
  admin.token = ctx.demoAdminToken;
  const aw = await admin.req('PUT', A, { name: 'demo-hijack' });
  check('allow-listed ADMIN token cannot write', aw.status === 403 && aw.json?.demo === true, `status=${aw.status}`);
  const ar = await admin.req('GET', A);
  check('allow-listed ADMIN token cannot read private projects', ar.status === 403 || ar.status === 404, `status=${ar.status}`);
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
