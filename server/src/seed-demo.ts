/**
 * Deterministic, idempotent demo seed for the two fictional projects (Al Nour, Bab Ezzouar).
 *
 *   npm run db:demo      create / sync the schema of the isolated demo database
 *   npm run seed:demo    seed it (safe to run repeatedly: same input → same rows)
 *   npm run demo:docs    (re)write the fictional PDFs / SVGs into client/public/demo-docs
 *
 * Target database: DEMO_DATABASE_URL, default file:./demo.db (resolved next to prisma/schema.prisma).
 * It never reads DATABASE_URL, refuses the development database (dev.db) and, for any URL that does
 * not contain "demo", requires DEMO_SEED_CONFIRM=yes. Works with SQLite and PostgreSQL (Prisma API only).
 * DEMO_ANCHOR (YYYY-MM-DD or "today") sets the "current day" of the demo; default 2026-11-24.
 * Passwords are never printed.
 */
import path from 'path';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { buildDemo, resolveAnchor, DemoData } from './demo/build';
import { demoDocuments, demoSvgs } from './demo/documents';

export function demoDatabaseUrl(): string {
  const url = process.env.DEMO_DATABASE_URL || 'file:./demo.db';
  if (url.startsWith('file:')) {
    const raw = url.slice(5).split('?')[0];
    const file = path.isAbsolute(raw) ? raw : path.resolve(__dirname, '..', 'prisma', raw);
    if (/^dev\.db$/i.test(path.basename(file))) throw new Error('Refusing to seed demo data into dev.db. Use an isolated demo database.');
  }
  if (!/demo/i.test(url) && process.env.DEMO_SEED_CONFIRM !== 'yes') {
    throw new Error('Target URL does not look like a demo database. Set DEMO_SEED_CONFIRM=yes to confirm.');
  }
  return url;
}

// Local development accounts mirror src/seed.ts. They are used only for local SQLite demo databases:
// a hosted (PostgreSQL) target never receives known passwords; it gets DEMO_PASSWORD or a random one.
const LOCAL_DEV_PASSWORDS: Record<string, string> = {
  admin: 'admin123', pm: 'pm123456', engineer: 'eng12345', consultant: 'cons1234',
};

type Row = Record<string, any>;

/** Replace generated user ids by the ids actually stored (users are matched by e-mail). */
function remap<T>(value: T, ids: Map<string, string>): T {
  if (typeof value === 'string') return (ids.get(value) ?? value) as any;
  if (Array.isArray(value)) return value.map(v => remap(v, ids)) as any;
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Row = {};
    for (const [k, v] of Object.entries(value)) out[k] = remap(v, ids);
    return out as T;
  }
  return value;
}

async function upsertAll(model: any, rows: Row[]) {
  for (const row of rows) {
    const { id, ...rest } = row;
    await model.upsert({ where: { id }, create: row, update: rest });
  }
}

export async function seedDemo(prisma: PrismaClient, data: DemoData, localTarget = true) {
  // ── users ──
  const ids = new Map<string, string>();
  const stamp = new Date(Date.UTC(2025, 0, 6, 8)); // fixed timestamps keep re-runs byte-identical
  for (const u of data.users) {
    const pw = (u.existing && localTarget ? LOCAL_DEV_PASSWORDS[u.key] : undefined) ?? process.env.DEMO_PASSWORD ?? randomBytes(18).toString('base64url');
    const profile = { name: u.name, role: u.role, company: u.company, phone: u.phone, isActive: true, updatedAt: stamp };
    const existing = await prisma.user.findUnique({ where: { email: u.email }, select: { id: true } });
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data: profile }); // never re-hash on update
      ids.set(u.id, existing.id);
    } else {
      await prisma.user.create({ data: { id: u.id, email: u.email, password: await bcrypt.hash(pw, 12), ...profile, createdAt: stamp } });
      ids.set(u.id, u.id);
    }
  }

  const summary: Record<string, Record<string, number>> = {};
  for (const raw of data.bundles) {
    const b = remap(raw, ids);
    const slug = raw.def.slug;
    const { _plannedProgress, ...project } = b.project as Row;
    project.imageUrl = `/demo-docs/${slug}/photos/site-overview.svg`;
    const svgSize = new Map(demoSvgs(raw).map(f => [f.path.split('/').pop()!, f.buffer.length]));
    const photos: Row[] = (b.photos as Row[]).map(p => ({ ...p, fileSize: svgSize.get(p.fileName) ?? p.fileSize }));
    const { documents } = demoDocuments(data, raw);
    const docs = remap(documents, ids);

    await prisma.project.upsert({ where: { id: project.id }, create: project as any, update: (({ id, ...r }) => r)(project) as any });
    const pid = project.id as string;

    // Members are unique per (user, project): clear the pair before writing the fixed id.
    for (const m of b.members as Row[]) {
      await prisma.projectMember.deleteMany({ where: { userId: m.userId, projectId: pid, NOT: { id: m.id } } });
    }
    // Weekly / monthly reports are unique per period: drop any non-demo duplicate first.
    for (const w of b.weeklyReports as Row[]) await prisma.weeklyReport.deleteMany({ where: { projectId: pid, weekNumber: w.weekNumber, year: w.year, NOT: { id: w.id } } });
    for (const m of b.monthlyReports as Row[]) await prisma.monthlyReport.deleteMany({ where: { projectId: pid, month: m.month, year: m.year, NOT: { id: m.id } } });

    const sets: [string, any, Row[]][] = [
      ['members', prisma.projectMember, b.members],
      ['activities', prisma.activity, b.activities],
      ['milestones', prisma.milestone, b.milestones],
      ['dailyReports', prisma.dailyReport, b.dailyReports],
      ['weeklyReports', prisma.weeklyReport, b.weeklyReports],
      ['monthlyReports', prisma.monthlyReport, b.monthlyReports],
      ['risks', prisma.risk, b.risks],
      ['ncrs', prisma.nCR, b.ncrs],
      ['plant', prisma.plantEquipment, b.plant],
      ['resources', prisma.siteResource, b.resources],
      ['documents', prisma.document, docs],
    ];
    const counts: Record<string, number> = {};
    for (const [name, model, rows] of sets) {
      // Remove stale rows of this project (from an older demo build), then upsert the current set.
      await model.deleteMany({ where: { projectId: pid, id: { notIn: rows.map(r => r.id) } } });
      await upsertAll(model, rows);
      counts[name] = rows.length;
    }
    const reportIds = (b.dailyReports as Row[]).map(r => r.id), ncrIds = (b.ncrs as Row[]).map(r => r.id);
    await prisma.photo.deleteMany({ where: { OR: [{ dailyReportId: { in: reportIds } }, { ncrId: { in: ncrIds } }], id: { notIn: photos.map(p => p.id) } } });
    await upsertAll(prisma.photo, photos);
    await prisma.comment.deleteMany({ where: { dailyReportId: { in: reportIds }, id: { notIn: (b.comments as Row[]).map(c => c.id) } } });
    await upsertAll(prisma.comment, b.comments);
    counts.photos = photos.length; counts.comments = b.comments.length;
    summary[project.name as string] = counts;
  }
  return summary;
}

async function main() {
  const url = demoDatabaseUrl();
  const anchor = resolveAnchor(process.env.DEMO_ANCHOR);
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const summary = await seedDemo(prisma, buildDemo(anchor), url.startsWith('file:'));
    console.log(`Demo data seeded (anchor ${anchor}, fictional projects only).`);
    console.table(summary);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
