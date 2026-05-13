import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Users
  const adminPw = await bcrypt.hash('admin123', 12);
  const pmPw = await bcrypt.hash('pm123456', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@buildtrack.com' },
    update: {},
    create: { name: 'System Admin', email: 'admin@buildtrack.com', password: adminPw, role: 'ADMIN', company: 'BuildTrack' },
  });

  const pm = await prisma.user.upsert({
    where: { email: 'pm@buildtrack.com' },
    update: {},
    create: { name: 'Ahmed Karim', email: 'pm@buildtrack.com', password: pmPw, role: 'PROJECT_MANAGER', company: 'Alpha Constructions', phone: '+213 555 0100' },
  });

  const engineer = await prisma.user.upsert({
    where: { email: 'engineer@buildtrack.com' },
    update: {},
    create: { name: 'Sara Benali', email: 'engineer@buildtrack.com', password: await bcrypt.hash('eng12345', 12), role: 'SITE_ENGINEER', company: 'Alpha Constructions', phone: '+213 555 0101' },
  });

  const consultant = await prisma.user.upsert({
    where: { email: 'consultant@buildtrack.com' },
    update: {},
    create: { name: 'Jean-Pierre Martin', email: 'consultant@buildtrack.com', password: await bcrypt.hash('cons1234', 12), role: 'CONSULTANT', company: 'BET Ingénierie', phone: '+33 6 12 34 56 78' },
  });

  // Project 1
  const project1 = await prisma.project.upsert({
    where: { code: 'PRJ-2024-001' },
    update: {},
    create: {
      name: 'Complexe Résidentiel Al Nour',
      code: 'PRJ-2024-001',
      description: 'Construction of a 120-unit residential complex with underground parking, amenities, and landscaping',
      client: 'Groupe Immobilier Al Nour',
      consultant: 'BET Ingénierie',
      contractor: 'Alpha Constructions',
      location: 'Alger, Algeria',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2026-06-30'),
      status: 'ACTIVE',
      progress: 47,
      budget: 15000000,
      actualCost: 6800000,
      currency: 'USD',
      members: {
        create: [
          { userId: pm.id, role: 'PROJECT_MANAGER' },
          { userId: engineer.id, role: 'SITE_ENGINEER' },
          { userId: consultant.id, role: 'CONSULTANT' },
        ],
      },
    },
  });

  // Project 2
  const project2 = await prisma.project.upsert({
    where: { code: 'PRJ-2024-002' },
    update: {},
    create: {
      name: 'Centre Commercial Bab Ezzouar',
      code: 'PRJ-2024-002',
      description: 'Development of a 3-floor shopping center with food court, parking, and retail spaces',
      client: 'Invest Corp',
      consultant: 'Design & Build',
      contractor: 'Batimex SARL',
      location: 'Bab Ezzouar, Alger',
      startDate: new Date('2024-03-01'),
      endDate: new Date('2025-12-31'),
      status: 'ACTIVE',
      progress: 28,
      budget: 8500000,
      actualCost: 2400000,
      currency: 'USD',
      members: {
        create: [{ userId: pm.id, role: 'PROJECT_MANAGER' }],
      },
    },
  });

  // Milestones for project 1
  const milestones = [
    { name: 'Site Preparation & Earthworks', plannedDate: new Date('2024-02-28'), actualDate: new Date('2024-03-05'), status: 'ACHIEVED' },
    { name: 'Foundation Works Complete', plannedDate: new Date('2024-05-31'), actualDate: new Date('2024-06-10'), status: 'ACHIEVED' },
    { name: 'Ground Floor Slab', plannedDate: new Date('2024-08-31'), actualDate: new Date('2024-09-02'), status: 'ACHIEVED' },
    { name: 'Structural Frame Complete (Level 5)', plannedDate: new Date('2024-12-31'), actualDate: null, status: 'DELAYED' },
    { name: 'Roofing & Waterproofing', plannedDate: new Date('2025-04-30'), actualDate: null, status: 'PENDING' },
    { name: 'MEP Rough-In Complete', plannedDate: new Date('2025-07-31'), actualDate: null, status: 'PENDING' },
    { name: 'Fit-Out & Finishes', plannedDate: new Date('2025-12-31'), actualDate: null, status: 'PENDING' },
    { name: 'Practical Completion', plannedDate: new Date('2026-06-30'), actualDate: null, status: 'PENDING' },
  ];

  for (const ms of milestones) {
    await prisma.milestone.upsert({
      where: { id: ms.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: { ...ms, projectId: project1.id, id: ms.name.toLowerCase().replace(/\s+/g, '-') },
    }).catch(() =>
      prisma.milestone.create({ data: { ...ms, projectId: project1.id } })
    );
  }

  // Activities
  const activities = [
    { name: 'General Earthworks', discipline: 'CIVIL', area: 'Zone A', plannedStart: new Date('2024-01-20'), plannedEnd: new Date('2024-02-28'), actualStart: new Date('2024-01-22'), actualEnd: new Date('2024-03-05'), actualProgress: 100, status: 'COMPLETED' },
    { name: 'Deep Foundations', discipline: 'STRUCTURE', area: 'Zone A', plannedStart: new Date('2024-03-01'), plannedEnd: new Date('2024-04-30'), actualStart: new Date('2024-03-08'), actualEnd: new Date('2024-05-10'), actualProgress: 100, status: 'COMPLETED' },
    { name: 'Reinforced Concrete Infrastructure', discipline: 'STRUCTURE', area: 'Zone A&B', plannedStart: new Date('2024-05-01'), plannedEnd: new Date('2024-07-31'), actualStart: new Date('2024-05-15'), actualEnd: new Date('2024-08-20'), actualProgress: 100, status: 'COMPLETED' },
    { name: 'Superstructure GF-L3', discipline: 'STRUCTURE', area: 'Building A', plannedStart: new Date('2024-08-01'), plannedEnd: new Date('2024-11-30'), actualStart: new Date('2024-08-25'), actualEnd: null, actualProgress: 85, status: 'IN_PROGRESS' },
    { name: 'Superstructure L4-L8', discipline: 'STRUCTURE', area: 'Building A', plannedStart: new Date('2024-11-01'), plannedEnd: new Date('2025-03-31'), actualStart: null, actualEnd: null, actualProgress: 20, status: 'IN_PROGRESS' },
    { name: 'Facade Brickwork', discipline: 'ARCHITECTURE', area: 'Building A', plannedStart: new Date('2024-10-01'), plannedEnd: new Date('2025-04-30'), actualStart: new Date('2024-10-15'), actualEnd: null, actualProgress: 35, status: 'IN_PROGRESS' },
    { name: 'Plumbing & Sanitary Works', discipline: 'PLOMBERIE',   area: 'All', plannedStart: new Date('2024-09-01'), plannedEnd: new Date('2025-06-30'), actualStart: null, actualEnd: null, actualProgress: 15, status: 'IN_PROGRESS' },
    { name: 'Electrical Installation',   discipline: 'ELECTRICITE', area: 'All', plannedStart: new Date('2024-10-01'), plannedEnd: new Date('2025-07-31'), actualStart: null, actualEnd: null, actualProgress: 10, status: 'NOT_STARTED' },
    { name: 'HVAC & Ventilation',        discipline: 'MECANIQUE',   area: 'All', plannedStart: new Date('2025-01-01'), plannedEnd: new Date('2025-09-30'), actualStart: null, actualEnd: null, actualProgress: 0,  status: 'NOT_STARTED' },
    { name: 'Floor & Wall Finishes', discipline: 'ARCHITECTURE', area: 'Interior', plannedStart: new Date('2025-04-01'), plannedEnd: new Date('2025-11-30'), actualStart: null, actualEnd: null, actualProgress: 0, status: 'NOT_STARTED' },
    { name: 'Roads & Underground Networks', discipline: 'INFRASTRUCTURE', area: 'External', plannedStart: new Date('2025-08-01'), plannedEnd: new Date('2026-03-31'), actualStart: null, actualEnd: null, actualProgress: 0, status: 'NOT_STARTED' },
    { name: 'Landscaping & Site Works', discipline: 'INFRASTRUCTURE', area: 'External', plannedStart: new Date('2026-01-01'), plannedEnd: new Date('2026-06-15'), actualStart: null, actualEnd: null, actualProgress: 0, status: 'NOT_STARTED' },
  ];

  for (const act of activities) {
    await prisma.activity.create({ data: { ...act, projectId: project1.id, plannedProgress: 100 } });
  }

  // Daily reports (last 15 days)
  const weathers = ['Clear', 'Partly Cloudy', 'Sunny', 'Overcast', 'Light Rain'];
  for (let i = 14; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const manpowerData = [
      { trade: 'Masons', company: 'Alpha Constructions', count: 12 + Math.floor(Math.random() * 5) },
      { trade: 'Steel Fixers', company: 'Alpha Constructions', count: 8 + Math.floor(Math.random() * 4) },
      { trade: 'Carpenters', company: 'Alpha Constructions', count: 6 + Math.floor(Math.random() * 3) },
      { trade: 'Plumbers', company: 'SudPlomb', count: 4 + Math.floor(Math.random() * 2) },
      { trade: 'Electricians', company: 'ElecPro', count: 3 + Math.floor(Math.random() * 2) },
      { trade: 'Plant Operators', company: 'Alpha Constructions', count: 3 },
      { trade: 'Labourers', company: 'Alpha Constructions', count: 10 + Math.floor(Math.random() * 5) },
    ];
    const totalManpower = manpowerData.reduce((s, m) => s + m.count, 0);

    await prisma.dailyReport.create({
      data: {
        projectId: project1.id,
        reportDate: date,
        reportNumber: 15 - i,
        weekNumber: Math.ceil((15 - i) / 7),
        weather: weathers[Math.floor(Math.random() * weathers.length)],
        temperature: 18 + Math.floor(Math.random() * 12),
        humidity: 40 + Math.floor(Math.random() * 30),
        generalSummary: `Daily progress report for ${date.toDateString()}. Works ongoing as scheduled with minor adjustments.`,
        workCompleted: 'Continued structural works on levels R+3 and R+4. Formwork installation for slab S15 completed.',
        manpowerData: JSON.stringify(manpowerData),
        totalManpower,
        equipmentData: JSON.stringify([
          { type: 'Tower Crane (Liebherr 280 EC)', count: 1, status: 'Operational' },
          { type: 'Concrete Mixer Truck', count: 2, status: 'Operational' },
          { type: 'Concrete Pump', count: 1, status: 'Operational' },
          { type: 'Excavator CAT 320', count: 1, status: i > 5 ? 'Operational' : 'Under Maintenance' },
        ]),
        materialsData: JSON.stringify([
          { name: 'Concrete B25', quantity: 45 + Math.floor(Math.random() * 20), unit: 'm³', supplier: 'BétonAlg' },
          { name: 'Rebar HA', quantity: 3.2 + Math.random(), unit: 'Tonnes', supplier: 'SIDER EL DZ' },
          { name: 'CMU Blocks 20x20x40', quantity: 800 + Math.floor(Math.random() * 200), unit: 'Units', supplier: 'Local' },
        ]),
        activitiesData: JSON.stringify([
          { description: 'Formwork wall Axis B-C, Level R+3', area: 'Building A', discipline: 'STRUCTURE', progress: 75 + Math.floor(Math.random() * 20), status: 'IN_PROGRESS' },
          { description: 'Rebar slab S15', area: 'Building A', discipline: 'STRUCTURE', progress: 60 + Math.floor(Math.random() * 30), status: 'IN_PROGRESS' },
          { description: 'East facade brickwork, GF', area: 'Building A', discipline: 'ARCHITECTURE', progress: 40 + Math.floor(Math.random() * 20), status: 'IN_PROGRESS' },
        ]),
        delays: i === 7 ? JSON.stringify([{ description: 'Delay in rebar delivery', duration: '1 day', responsibility: 'Supplier', impact: 'LOW' }]) : '[]',
        issues: i === 3 ? JSON.stringify([{ description: 'Non-conformity on formwork wall V12', severity: 'MEDIUM', action: 'Rework scheduled tomorrow', status: 'OPEN' }]) : '[]',
        safetyNotes: 'Toolbox talk conducted at 07:30. All workers wearing mandatory PPE.',
        toolboxTalks: 1,
        status: 'APPROVED',
        submittedBy: engineer.id,
        submittedAt: date,
        approvedBy: pm.id,
        approvedAt: date,
      },
    });
  }

  // Risks
  const risksToCreate = [
    { title: 'Steel Supply Delay', description: 'Delays in steel delivery affecting structural works', category: 'SUPPLY_CHAIN', probability: 3, impact: 4, riskScore: 12, status: 'OPEN', mitigation: 'Multiple supplier contracts, 2-week buffer stock', owner: 'PM' },
    { title: 'Adverse Weather Conditions', description: 'Rain season may impact concrete works', category: 'ENVIRONMENTAL', probability: 3, impact: 3, riskScore: 9, status: 'MITIGATED', mitigation: 'Rain covers and schedule acceleration during dry season', owner: 'SE' },
    { title: 'Concrete Cost Overrun', description: 'Concrete price increase of 15% noted', category: 'FINANCIAL', probability: 4, impact: 3, riskScore: 12, status: 'OPEN', mitigation: 'Contract renegotiation with supplier, value engineering review', owner: 'PM' },
    { title: 'Skilled Labour Availability', description: 'Shortage of skilled carpenters during peak formwork period', category: 'HUMAN_RESOURCES', probability: 2, impact: 3, riskScore: 6, status: 'OPEN', mitigation: 'Pre-booking of subcontractors, training program', owner: 'PM' },
  ];
  for (const r of risksToCreate) {
    await prisma.risk.create({ data: { ...r, projectId: project1.id } });
  }

  // NCRs
  await prisma.nCR.create({
    data: {
      projectId: project1.id,
      ncrNumber: 'NCR-PRJ-2024-001-001',
      title: 'Insufficient Concrete Cover - Wall V12',
      description: 'Inadequate concrete cover (25mm instead of specified 35mm) on wall V12, axis C, level R+2',
      area: 'Building A, Level R+2',
      discipline: 'STRUCTURE',
      severity: 'MEDIUM',
      raisedBy: engineer.id,
      raisedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      status: 'UNDER_REVIEW',
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('\n📋 Demo Credentials:');
  console.log('   Admin:    admin@buildtrack.com  / admin123');
  console.log('   PM:       pm@buildtrack.com     / pm123456');
  console.log('   Engineer: engineer@buildtrack.com / eng12345');
  console.log('   Consult:  consultant@buildtrack.com / cons1234\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
