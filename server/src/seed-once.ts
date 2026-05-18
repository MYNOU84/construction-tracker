import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
      try {
              const userCount = await prisma.user.count();
              if (userCount > 0) {
                        console.log('[seed-once] Database already has ' + userCount + ' user(s) - skipping seed.');
                        return;
              }
              console.log('[seed-once] No users found - creating demo accounts...');

        const users = [
            { email: 'admin@buildtrack.com', password: 'admin123', name: 'System Admin', role: 'ADMIN', company: 'BuildTrack' },
            { email: 'pm@buildtrack.com', password: 'pm123456', name: 'Ahmed Karim', role: 'PROJECT_MANAGER', company: 'Alpha Constructions' },
            { email: 'engineer@buildtrack.com', password: 'eng12345', name: 'Sara Benali', role: 'SITE_ENGINEER', company: 'Alpha Constructions' },
            { email: 'consultant@buildtrack.com', password: 'cons1234', name: 'Jean-Pierre Martin', role: 'CONSULTANT', company: 'BET Ingenierie' }
                ];

        for (const u of users) {
                  const hashed = await bcrypt.hash(u.password, 12);
                  await prisma.user.upsert({
                              where: { email: u.email },
                              update: {},
                              create: { email: u.email, password: hashed, name: u.name, role: u.role, company: u.company }
                  });
                  console.log('[seed-once] Created: ' + u.email);
        }
              console.log('[seed-once] Seed complete.');
      } catch (err) {
              console.error('[seed-once] Seed step failed (continuing anyway):', err);
      } finally {
              await prisma.$disconnect().catch(() => {});
      }
}

main().then(() => process.exit(0));
