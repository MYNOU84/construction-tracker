import { PrismaClient } from '@prisma/client';
import { seedDatabase } from './seed';

const prisma = new PrismaClient();

async function main() {
    try {
          const userCount = await prisma.user.count();
          if (userCount === 0) {
                  console.log('[seed-once] No users found - seeding demo data...');
                  await seedDatabase();
                  console.log('[seed-once] Seed complete.');
          } else {
                  console.log('[seed-once] Database already has ' + userCount + ' user(s) - skipping seed.');
          }
    } catch (err) {
          console.error('[seed-once] Seed step failed (continuing anyway):', err);
    } finally {
          await prisma.$disconnect().catch(() => {});
    }
}

main().then(() => process.exit(0));
