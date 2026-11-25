/**
 * Idempotent seeder run at startup (`npm start`), before the API boots.
 *
 * Seeds the full demo data set (4 demo users + 2 demo projects with milestones,
 * activities, daily reports, risks and an NCR) only when the database has no
 * projects yet. This also covers a database that already has the demo users
 * but no projects. Existing rows are never overwritten: users and projects are
 * upserts with `update: {}`, and child data is skipped when it already exists.
 *
 * Errors are logged, not thrown, so a seeding problem never blocks the server.
 */
import prisma from './lib/prisma';
import { seedDatabase } from './seed';

async function main() {
  try {
    const projectCount = await prisma.project.count();
    if (projectCount === 0) {
      console.log('🌱 [seed-once] No projects found — seeding demo data...');
      await seedDatabase();
      console.log('🌱 [seed-once] Seed complete.');
    } else {
      console.log(`🌱 [seed-once] Database already has ${projectCount} project(s) — skipping seed.`);
    }
  } catch (err) {
    console.error('🌱 [seed-once] Seed step failed (continuing anyway):', err);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().then(() => process.exit(0));
