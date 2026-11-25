// Fictional fixtures for the export regression tests.
// Every name, company and figure below is invented demo data.

export const project = {
  id: 'fx-project-1',
  name: 'Harbour View Residences (DEMO)',
  code: 'DEMO-HVR',
  client: 'Fictional Estates Ltd (DEMO)',
  contractor: 'Sample Builders Co (DEMO)',
  consultant: 'Example Engineering (DEMO)',
  location: 'Demo City',
  startDate: '2026-01-05T00:00:00.000Z',
  endDate: '2027-06-30T00:00:00.000Z',
  progress: 42,
  status: 'ACTIVE',
  currency: 'USD',
  budget: 12500000,
};

// Daily report that exercises every PDF and Excel branch.
// JSON fields are stored as strings, as the API returns them.
export const dailyFull = {
  id: 'fx-daily-1',
  projectId: project.id,
  reportNumber: 57,
  reportDate: '2026-03-12T00:00:00.000Z',
  weekNumber: 11,
  status: 'SUBMITTED',
  weather: 'SUNNY',
  temperature: 24,
  humidity: 38,
  windSpeed: 12,
  totalManpower: 64,
  toolboxTalks: 2,
  incidents: 0,
  nearMisses: 1,
  generalSummary: 'Level 3 slab concreting completed on schedule. Formwork moved to level 4 core walls.',
  workCompleted: 'Pour of slab L3 zone B (182 m3). Rebar inspection for core walls L4.',
  plannedWork: 'Start L4 core wall formwork. Deliver blockwork for L1 partitions.',
  safetyNotes: 'One near miss recorded at the hoist landing; barrier reinstated.',
  manpowerData: JSON.stringify([
    { position: 'maçons', type: 'DIRECT', company: 'Sample Builders Co (DEMO)', count: 18, hours: 8 },
    { position: 'ferrailleurs', type: 'DIRECT', company: 'Rebar Demo Ltd', np: 14, hours: 9 },
    { trade: 'Electricians', type: 'DIRECT', company: 'Volt Demo', count: 12, hours: 8 },
    { position: 'chef de chantier', type: 'INDIRECT', company: 'Sample Builders Co (DEMO)', count: 4, hours: 10 },
    { position: 'Safety Officer', type: 'INDIRECT', company: 'Sample Builders Co (DEMO)', count: 16 },
  ]),
  equipmentData: JSON.stringify([
    { name: 'Tower crane TC-1', count: 1, hours: 9, status: 'IN_USE', remarks: 'Daily check OK' },
    { type: 'Concrete pump', count: 2, hours: 6, status: 'STAND_BY' },
  ]),
  materialsData: JSON.stringify([
    { designation: 'Ready-mix C35/45', unit: 'm3', qtyDelivered: 182, qtyExpected: 180, remarks: 'Two trucks rejected', name: 'Ready-mix C35/45', quantity: 182, supplier: 'Demo Concrete' },
    { name: 'Rebar T16', unit: 't', quantity: 12.5, supplier: 'Rebar Demo Ltd' },
  ]),
  activitiesData: JSON.stringify([
    { lot: 'GO', area: 'L3-B', description: 'Slab concreting', resources: '18 masons', unit: 'm3', producedQty: 182, discipline: 'STRUCTURE', progress: 100, status: 'COMPLETED' },
    { lot: 'GO', area: 'L4-Core', description: 'Core wall rebar', resources: '14 steel fixers', unit: 't', progress: 35, discipline: 'STRUCTURE', status: 'IN_PROGRESS' },
  ]),
  delays: JSON.stringify([
    { description: 'Late concrete delivery', duration: '2 h', responsibility: 'Supplier', impact: 'LOW', remarks: 'No critical path impact' },
  ]),
  hseData: JSON.stringify({
    accidentsWithLTI: 0, accidentsWithoutLTI: 1, accidentsWithoutLTIComment: 'Minor cut, first aid',
    recruitmentMedicalCheckup: 3, periodicMedicalCheckup: 12, fireIncident: 0,
    accidentWithMaterialDamage: 0, safetyViolationNotice: 2, safetyViolationNoticeComment: 'Harness not clipped',
    safetyInductions: 5, toolboxTalks: 2, specificTraining: 1, lostWorkingHours: 3,
    remarks: ['Hoist landing barrier reinstated', '', 'Housekeeping L2 to improve', 'Fire extinguisher L3 replaced'],
  }),
};

// Daily report with no optional sections.
export const dailyEmpty = {
  id: 'fx-daily-2',
  projectId: project.id,
  reportNumber: 3,
  reportDate: '2026-01-07T00:00:00.000Z',
  weekNumber: 2,
  status: 'DRAFT',
  weather: 'Light Rain',
  temperature: null,
  humidity: null,
  totalManpower: 0,
  generalSummary: '',
  manpowerData: '[]',
  equipmentData: '[]',
  materialsData: '[]',
  activitiesData: '[]',
  delays: '[]',
  hseData: '{}',
};

export const weekly = {
  id: 'fx-weekly-1',
  projectId: project.id,
  weekNumber: 11,
  year: 2026,
  startDate: '2026-03-09T00:00:00.000Z',
  endDate: '2026-03-15T00:00:00.000Z',
  status: 'APPROVED',
  overallProgress: 41.5,
  plannedProgress: 44,
  totalManpowerWeek: 372,
  peakManpower: 71,
  activitiesCompleted: 9,
  activitiesDelayed: 2,
  spi: 0.94,
  cpi: 1.02,
  manpowerBreakdown: JSON.stringify({
    'Sample Builders Co (DEMO)': { direct: 120, indirect: 30, total: 150 },
    'Rebar Demo Ltd': { direct: 84, indirect: 6, total: 90 },
    'Volt Demo': { direct: 60, indirect: 0, total: 60 },
  }),
  lotsData: JSON.stringify([
    { lotNumber: 'GO', description: 'Structural works', unit: 'm3', budgetQty: 5400, previousCumulPct: 52, weeklyPct: 4, newCumulPct: 56, remainingPct: 44, kpiEfficiency: 108 },
    { lotNumber: 'EL', description: 'Electrical first fix', unit: 'ml', budgetQty: 18000, previousCumulPct: 10, weeklyPct: 1.5, newCumulPct: 11.5, remainingPct: 88.5, kpiEfficiency: 76 },
  ]),
  highlightsAchieved: 'Slab L3 completed. Façade mock-up approved by the client.',
  issuesEncountered: 'Concrete supply delays on two days.',
  nextWeekPlan: 'Core walls L4, blockwork L1, MEP sleeves L3.',
};

export const monthly = {
  id: 'fx-monthly-1',
  projectId: project.id,
  month: 3,
  year: 2026,
  status: 'SUBMITTED',
  overallProgress: 42,
  plannedProgress: 45,
  totalManpowerDays: 1488,
  peakManpower: 76,
  avgDailyManpower: 57.2307,
  openRisks: 5,
  openNCRs: 3,
  closedNCRs: 7,
  completedMilestones: 4,
  pendingMilestones: 6,
  delayedMilestones: 1,
  mitigatedRisks: 2,
  structureProgress: 63,
  architectureProgress: 18,
  mecaniqueProgress: 22,
  electriciteProgress: 14,
  plomberieProgress: 0,
  infrastructureProgress: 100,
  budgetExpended: 4825000,
  forecastFinalCost: 12740000,
  variance: -240000,
  executiveSummary: 'The project is three points behind plan; structure leads all disciplines.',
  keyAchievements: 'Slab L3 completed; infrastructure package closed.',
  majorChallenges: 'Concrete supply reliability.',
  nextMonthPlan: 'Complete structure L4 and start façade L1.',
};

export const presentation = {
  surface: '18 450 m2',
  floors: 'B1 + G + 8',
  totalLots: '12',
  structureType: 'Reinforced concrete frame',
  generalDescription: 'Fictional mixed-use residential tower used for demonstration only. Eight storeys over one basement level with retail at ground floor.',
  intervenants: [
    { role: 'Client', company: 'Fictional Estates Ltd (DEMO)', contact: 'A. Example', phone: '+000 000 0001', email: 'client@example.test' },
    { role: 'Contractor', company: 'Sample Builders Co (DEMO)', contact: 'B. Sample', phone: '+000 000 0002', email: 'contractor@example.test' },
  ],
  zones: [
    { zone: 'Zone A', description: 'Tower core', surface: '6 200', level: 'B1-8', progress: 60 },
    { zone: 'Zone B', description: 'Podium', surface: '4 100', level: 'G-1', progress: 35 },
  ],
  billing: [
    { number: 'INV-001', description: 'Advance payment', amount: 1250000, dateIssued: '2026-01-15T00:00:00.000Z', delayDays: 0, datePaid: '2026-02-01T00:00:00.000Z', status: 'PAID' },
    { number: 'INV-002', description: 'Progress claim 1', amount: 830500, dateIssued: '2026-03-01T00:00:00.000Z', delayDays: 12, datePaid: null, status: 'LATE' },
  ],
  weighting: [
    { lot: 'GO', description: 'Structure', weighting: 40, progress: 63, sendRef: 'TR-014', sendDate: '2026-02-10T00:00:00.000Z', approvalRef: 'AP-009', approvalDate: '2026-02-20T00:00:00.000Z', approvalStatus: 'APPROVED' },
    { lot: 'EL', description: 'Electrical', weighting: 15, progress: 14, sendRef: '', sendDate: null, approvalRef: '', approvalDate: null, approvalStatus: 'DRAFT' },
  ],
  plans: [
    { number: 'ARC-101', title: 'Ground floor plan', revision: 'C', format: 'A1', issuedBy: 'Example Engineering (DEMO)', date: '2026-02-02T00:00:00.000Z', status: 'APPROVED', remarks: '' },
  ],
};

export const presentationMinimal = {
  surface: '', floors: '', totalLots: '', structureType: '', generalDescription: '',
  intervenants: [], zones: [], billing: [], weighting: [], plans: [],
};

// Daily reports listed in the monthly Excel log.
export const monthLog = [
  { ...dailyFull, reportNumber: 55, reportDate: '2026-03-10T00:00:00.000Z', totalManpower: 58, weather: 'Clear', temperature: 22, status: 'APPROVED' },
  { ...dailyFull, reportNumber: 56, reportDate: '2026-03-11T00:00:00.000Z', totalManpower: 61, weather: '', temperature: null, status: 'APPROVED' },
  dailyFull,
];
