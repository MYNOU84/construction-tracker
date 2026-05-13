import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const renames: Record<string, string> = {
  'Terrassement Général':        'General Earthworks',
  'Fondations Profondes':        'Deep Foundations',
  'Infrastructure Béton Armé':   'Reinforced Concrete Infrastructure',
  'Superstructure RDC-R+3':      'Superstructure GF-L3',
  'Superstructure R+4-R+8':      'Superstructure L4-L8',
  'Maçonnerie Façade':           'Facade Brickwork',
  'Plomberie & Sanitaire':       'Plumbing & Sanitary Works',
  'Installation Électrique':     'Electrical Installation',
  'Climatisation & Ventilation': 'HVAC & Ventilation',
  'Revêtements Sol & Murs':      'Floor & Wall Finishes',
  'Voirie & Réseaux Divers':     'Roads & Underground Networks',
  'Aménagements Paysagers':      'Landscaping & Site Works',
};

async function main() {
  let updated = 0;
  for (const [oldName, newName] of Object.entries(renames)) {
    const result = await prisma.activity.updateMany({
      where: { name: oldName },
      data: { name: newName },
    });
    if (result.count > 0) {
      console.log(`✓ "${oldName}" → "${newName}"`);
      updated += result.count;
    }
  }
  console.log(`\nDone — ${updated} activities renamed.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
