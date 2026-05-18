import { PrismaClient } from '@prisma/client';
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
        try {
                  const userCount = await prisma.user.count();
                  if (userCount > 0) {
                              console.log('[seed-once] DB has ' + userCount + ' users - skip');
                              return;
                  }
                  const users: any[] = [
                        { email: 'admin@buildtrack.com', password: 'admin123', name: 'System Admin', role: 'ADMIN', company: 'BuildTrack' },
                        { email: 'pm@buildtrack.com', password: 'pm123456', name: 'Ahmed Karim', role: 'PROJECT_MANAGER', company: 'Alpha' },
                        { email: 'engineer@buildtrack.com', password: 'eng12345', name: 'Sara Benali', role: 'SITE_ENGINEER', company: 'Alpha' },
                        { email: 'consultant@buildtrack.com', password: 'cons1234', name: 'Jean Martin', role: 'CONSULTANT', company: 'BET' }
                            ];
                  for (const u of users) {
                              const hashed = await bcrypt.hash(u.password, 12);
                              await prisma.user.upsert({
                                            where: { email: u.email },
                                            update: {},
                                            create: { email: u.email, password: hashed, name: u.name, role: u.role, company: u.company }
                              });
                              console.log('[seed-once] +' + u.email);
                  }
        } catch (e) {
                  console.error('[seed-once] error', e);
        } finally {
                  await prisma.$disconnect();
        }
}
main().then(() => process.exit(0));
