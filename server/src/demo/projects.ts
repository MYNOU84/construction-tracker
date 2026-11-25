/**
 * Master data for the two fictional demonstration projects (WP5).
 * Every name, company, reference and figure here is invented.
 */

export type Discipline =
  'STRUCTURE' | 'ARCHITECTURE' | 'MECANIQUE' | 'ELECTRICITE' | 'PLOMBERIE' | 'CIVIL' | 'INFRASTRUCTURE' | 'GENERAL';

export interface ActDef {
  key: string; name: string; discipline: Discipline; area: string; phase: string;
  start: number; dur: number; unit: string; qty: number; crew: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; deps?: string[];
}
export interface MilestoneDef { key: string; name: string; description: string; act: string }
export interface PlantDef {
  name: string; category: string; make: string; model: string; owner: string; hireCompany?: string;
  onDay: number; offDay?: number; status: string; hourly: number; notes?: string;
}
export interface RiskDef {
  title: string; description: string; category: string; p: number; i: number;
  status: 'OPEN' | 'MITIGATED' | 'CLOSED' | 'ACCEPTED'; mitigation: string; owner: string; dueDay: number; raisedDay: number;
}
export interface NcrDef {
  title: string; description: string; area: string; discipline: Discipline; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  raisedBy: string; raisedDay: number; closeDay?: number; underReview?: boolean; resolution?: string;
}
export interface StudyDef { docNumber: string; description: string; discipline: string; rev: string; plannedDay: number; actualDay?: number; final: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW' | 'SUBMITTED'; observations?: string }
export interface MaterialDef { ref: string; description: string; discipline: string; submittedBy: string; submitDay: number; reviewDay?: number; final: 'APPROVED' | 'REJECTED' | 'RESUBMITTED' | 'UNDER_REVIEW' | 'SUBMITTED'; observations?: string }
export interface PlanDef { number: string; title: string; revision: string; format: string; issuedBy: string; day: number; status: 'DRAFT' | 'ISSUED' | 'APPROVED' | 'FOR_INFO' | 'SUPERSEDED'; remarks: string }
export interface ZoneDef { zone: string; level: string; description: string; surface: string; acts: string[] }
export interface LotDef { lot: string; description: string; weighting: number; disciplines: Discipline[] }

export interface ProjectDef {
  id: string; slug: string; code: string; name: string; description: string;
  client: string; consultant: string; contractor: string; location: string;
  start: string; end: string; budget: number; currency: string;
  costFactor: number;           // actual cost / earned value (CPI = 1 / costFactor)
  lagDays: number; stretch: number; seed: number;
  indirect: { position: string; np: number }[];
  companies: Record<Discipline, string>;
  presentation: { surface: string; floors: string; totalLots: string; structureType: string; generalDescription: string };
  intervenants: { role: string; company: string; contact: string; phone: string; email: string }[];
  activities: ActDef[];
  milestones: MilestoneDef[];
  plant: PlantDef[];
  risks: RiskDef[];
  ncrs: NcrDef[];
  studies: StudyDef[];
  materials: MaterialDef[];
  plans: PlanDef[];
  zones: ZoneDef[];
  lots: LotDef[];
  deliveries: Partial<Record<Discipline, { designation: string; unit: string; qty: number }[]>>;
  climateOffset: number;
}

// ────────────────────────────────────────────────────────────────
// Al Nour — 120-unit residential complex
// ────────────────────────────────────────────────────────────────
const AL: ActDef[] = [
  { key: 'A01', name: 'Site mobilisation & hoarding', discipline: 'GENERAL', area: 'Site', phase: '1 Preliminaries', start: 0, dur: 30, unit: 'ml', qty: 640, crew: 10 },
  { key: 'A02', name: 'Topographic survey & setting out', discipline: 'CIVIL', area: 'Site', phase: '1 Preliminaries', start: 10, dur: 20, unit: 'pts', qty: 420, crew: 4 },
  { key: 'A03', name: 'Temporary facilities & site offices', discipline: 'GENERAL', area: 'Site', phase: '1 Preliminaries', start: 15, dur: 25, unit: 'u', qty: 14, crew: 8 },
  { key: 'A04', name: 'Bulk excavation (2 basement levels)', discipline: 'CIVIL', area: 'Basement', phase: '2 Earthworks & foundations', start: 30, dur: 75, unit: 'm³', qty: 48500, crew: 14, priority: 'HIGH', deps: ['A02'] },
  { key: 'A05', name: 'Retaining wall – soldier piles & shotcrete', discipline: 'STRUCTURE', area: 'Basement', phase: '2 Earthworks & foundations', start: 40, dur: 80, unit: 'm²', qty: 3900, crew: 16, priority: 'HIGH' },
  { key: 'A06', name: 'Raft foundation Block A', discipline: 'STRUCTURE', area: 'Block A', phase: '2 Earthworks & foundations', start: 100, dur: 40, unit: 'm³', qty: 1850, crew: 22, priority: 'HIGH', deps: ['A04'] },
  { key: 'A07', name: 'Raft foundation Block B', discipline: 'STRUCTURE', area: 'Block B', phase: '2 Earthworks & foundations', start: 120, dur: 40, unit: 'm³', qty: 1850, crew: 22, priority: 'HIGH', deps: ['A04'] },
  { key: 'A08', name: 'Raft foundation Block C', discipline: 'STRUCTURE', area: 'Block C', phase: '2 Earthworks & foundations', start: 140, dur: 40, unit: 'm³', qty: 1700, crew: 22, priority: 'HIGH', deps: ['A04'] },
  { key: 'A09', name: 'Basement waterproofing membrane', discipline: 'ARCHITECTURE', area: 'Basement', phase: '2 Earthworks & foundations', start: 105, dur: 90, unit: 'm²', qty: 11200, crew: 8 },
  { key: 'A10', name: 'Basement B2–B1 RC structure', discipline: 'STRUCTURE', area: 'Basement', phase: '3 Structure', start: 135, dur: 90, unit: 'm³', qty: 6200, crew: 30, priority: 'CRITICAL', deps: ['A06', 'A07', 'A08'] },
  { key: 'A11', name: 'Superstructure Block A (GF–R+8)', discipline: 'STRUCTURE', area: 'Block A', phase: '3 Structure', start: 210, dur: 220, unit: 'm³', qty: 5400, crew: 28, priority: 'CRITICAL', deps: ['A10'] },
  { key: 'A12', name: 'Superstructure Block B (GF–R+8)', discipline: 'STRUCTURE', area: 'Block B', phase: '3 Structure', start: 240, dur: 220, unit: 'm³', qty: 5400, crew: 28, priority: 'CRITICAL', deps: ['A10'] },
  { key: 'A13', name: 'Superstructure Block C (GF–R+8)', discipline: 'STRUCTURE', area: 'Block C', phase: '3 Structure', start: 270, dur: 230, unit: 'm³', qty: 5000, crew: 28, priority: 'CRITICAL', deps: ['A10'] },
  { key: 'A14', name: 'Roof slabs, parapets & lift overruns', discipline: 'STRUCTURE', area: 'Roof', phase: '3 Structure', start: 470, dur: 60, unit: 'm³', qty: 720, crew: 16, deps: ['A11', 'A12', 'A13'] },
  { key: 'A15', name: 'Masonry walls Block A', discipline: 'ARCHITECTURE', area: 'Block A', phase: '4 Envelope', start: 330, dur: 180, unit: 'm²', qty: 14800, crew: 18 },
  { key: 'A16', name: 'Masonry walls Block B', discipline: 'ARCHITECTURE', area: 'Block B', phase: '4 Envelope', start: 360, dur: 180, unit: 'm²', qty: 14800, crew: 18 },
  { key: 'A17', name: 'Masonry walls Block C', discipline: 'ARCHITECTURE', area: 'Block C', phase: '4 Envelope', start: 400, dur: 190, unit: 'm²', qty: 13600, crew: 18 },
  { key: 'A18', name: 'Roof waterproofing & thermal insulation', discipline: 'ARCHITECTURE', area: 'Roof', phase: '4 Envelope', start: 520, dur: 70, unit: 'm²', qty: 4300, crew: 8, deps: ['A14'] },
  { key: 'A19', name: 'External render & façade cladding', discipline: 'ARCHITECTURE', area: 'Façades', phase: '4 Envelope', start: 500, dur: 200, unit: 'm²', qty: 16500, crew: 20, priority: 'HIGH' },
  { key: 'A20', name: 'Aluminium windows & balcony railings', discipline: 'ARCHITECTURE', area: 'Façades', phase: '4 Envelope', start: 560, dur: 170, unit: 'u', qty: 960, crew: 10 },
  { key: 'A21', name: 'Plumbing risers & drainage stacks', discipline: 'PLOMBERIE', area: 'All blocks', phase: '5 MEP', start: 380, dur: 260, unit: 'ml', qty: 9800, crew: 12 },
  { key: 'A22', name: 'Fire-fighting network (sprinklers & hydrants)', discipline: 'MECANIQUE', area: 'Basement', phase: '5 MEP', start: 430, dur: 200, unit: 'ml', qty: 5200, crew: 8 },
  { key: 'A23', name: 'Electrical containment & conduits', discipline: 'ELECTRICITE', area: 'All blocks', phase: '5 MEP', start: 360, dur: 240, unit: 'ml', qty: 38000, crew: 12 },
  { key: 'A24', name: 'LV distribution boards & cabling', discipline: 'ELECTRICITE', area: 'All blocks', phase: '5 MEP', start: 520, dur: 200, unit: 'ml', qty: 52000, crew: 14, priority: 'HIGH' },
  { key: 'A25', name: 'Lift installation (6 lifts)', discipline: 'MECANIQUE', area: 'Lift cores', phase: '5 MEP', start: 600, dur: 160, unit: 'u', qty: 6, crew: 6, priority: 'HIGH', deps: ['A14'] },
  { key: 'A26', name: 'Car-park ventilation & smoke extraction', discipline: 'MECANIQUE', area: 'Basement', phase: '5 MEP', start: 560, dur: 140, unit: 'ml', qty: 1450, crew: 6 },
  { key: 'A27', name: 'Gas distribution network', discipline: 'PLOMBERIE', area: 'All blocks', phase: '5 MEP', start: 620, dur: 110, unit: 'ml', qty: 3100, crew: 5 },
  { key: 'A28', name: 'Low-current systems (data, intercom, CCTV)', discipline: 'ELECTRICITE', area: 'All blocks', phase: '5 MEP', start: 640, dur: 150, unit: 'ml', qty: 21000, crew: 6 },
  { key: 'A29', name: 'HVAC split units & mechanical ventilation', discipline: 'MECANIQUE', area: 'All blocks', phase: '5 MEP', start: 650, dur: 140, unit: 'u', qty: 360, crew: 6 },
  { key: 'A30', name: 'Internal plastering Block A', discipline: 'ARCHITECTURE', area: 'Block A', phase: '6 Finishes', start: 480, dur: 140, unit: 'm²', qty: 26000, crew: 16 },
  { key: 'A31', name: 'Internal plastering Blocks B & C', discipline: 'ARCHITECTURE', area: 'Block B', phase: '6 Finishes', start: 540, dur: 160, unit: 'm²', qty: 50000, crew: 22 },
  { key: 'A32', name: 'Floor & wall tiling', discipline: 'ARCHITECTURE', area: 'All blocks', phase: '6 Finishes', start: 580, dur: 210, unit: 'm²', qty: 31000, crew: 18 },
  { key: 'A33', name: 'Internal doors & joinery', discipline: 'ARCHITECTURE', area: 'All blocks', phase: '6 Finishes', start: 640, dur: 170, unit: 'u', qty: 980, crew: 8 },
  { key: 'A34', name: 'Painting & decoration', discipline: 'ARCHITECTURE', area: 'All blocks', phase: '6 Finishes', start: 680, dur: 160, unit: 'm²', qty: 88000, crew: 16 },
  { key: 'A35', name: 'Kitchens & sanitary fittings', discipline: 'PLOMBERIE', area: 'All blocks', phase: '6 Finishes', start: 700, dur: 130, unit: 'u', qty: 120, crew: 8 },
  { key: 'A36', name: 'Common areas & lobby finishes', discipline: 'ARCHITECTURE', area: 'All blocks', phase: '6 Finishes', start: 730, dur: 110, unit: 'm²', qty: 3600, crew: 10 },
  { key: 'A37', name: 'Access roads & car-park ramp', discipline: 'INFRASTRUCTURE', area: 'External', phase: '7 External works', start: 650, dur: 120, unit: 'm²', qty: 6800, crew: 12 },
  { key: 'A38', name: 'Storm water & sewer networks', discipline: 'INFRASTRUCTURE', area: 'External', phase: '7 External works', start: 600, dur: 120, unit: 'ml', qty: 2300, crew: 10 },
  { key: 'A39', name: 'External lighting', discipline: 'ELECTRICITE', area: 'External', phase: '7 External works', start: 740, dur: 70, unit: 'u', qty: 86, crew: 4 },
  { key: 'A40', name: 'Landscaping & playgrounds', discipline: 'INFRASTRUCTURE', area: 'External', phase: '7 External works', start: 770, dur: 80, unit: 'm²', qty: 5400, crew: 10 },
  { key: 'A41', name: 'Boundary wall & gatehouse', discipline: 'CIVIL', area: 'External', phase: '7 External works', start: 620, dur: 100, unit: 'ml', qty: 610, crew: 8 },
  { key: 'A42', name: 'MEP testing & commissioning', discipline: 'MECANIQUE', area: 'All blocks', phase: '8 Commissioning', start: 790, dur: 60, unit: 'sys', qty: 14, crew: 8 },
  { key: 'A43', name: 'Authority inspections & certificates', discipline: 'GENERAL', area: 'Site', phase: '8 Commissioning', start: 820, dur: 40, unit: 'u', qty: 9, crew: 3 },
  { key: 'A44', name: 'Snagging & handover', discipline: 'GENERAL', area: 'All blocks', phase: '8 Commissioning', start: 830, dur: 48, unit: 'u', qty: 120, crew: 12 },
];

const BLOCK_ZONES = (blocks: string[]): ZoneDef[] => {
  const levels = ['B2', 'B1', 'GF', 'R+1', 'R+2', 'R+3', 'R+4', 'R+5', 'R+6', 'R+7', 'R+8'];
  const out: ZoneDef[] = [];
  blocks.forEach((b, bi) => {
    const key = ['A', 'B', 'C'][bi];
    levels.forEach(lv => {
      const basement = lv.startsWith('B');
      const fin = key === 'A' ? 'A30' : 'A31';
      out.push({
        zone: `Block ${key}`, level: lv,
        description: basement ? `Car park ${lv} under Block ${key} – structure, waterproofing, MEP` : `Block ${key} ${lv} – 4 apartments, structure, masonry, MEP, finishes`,
        surface: basement ? '1 450 m²' : '520 m²',
        acts: basement ? ['A10', 'A09', 'A22', 'A26'] : [`A1${bi + 1}`, `A1${bi + 5}`, 'A21', 'A23', fin, 'A32'],
      });
    });
  });
  return out;
};

export const AL_NOUR: ProjectDef = {
  id: 'demo-prj-alnour', slug: 'al-nour', code: 'PRJ-2025-001',
  name: 'Complexe Résidentiel Al Nour',
  description: 'Fictional demonstration project – 120-unit residential complex in three R+8 blocks over two basement car-park levels, with landscaped courtyards and community amenities.',
  client: 'Groupe Immobilier Al Nour', consultant: 'BET Ingénierie', contractor: 'Alpha Constructions',
  location: 'Alger, Algeria', start: '2025-02-02', end: '2027-06-30', budget: 15_000_000, currency: 'USD',
  costFactor: 1.04, lagDays: 7, stretch: 1.12, seed: 1201, climateOffset: 0,
  indirect: [
    { position: 'Project Manager', np: 1 }, { position: 'Construction Manager', np: 1 }, { position: 'Site Manager', np: 2 },
    { position: 'Civil Engineer', np: 3 }, { position: 'Electrical Engineer', np: 1 }, { position: 'Mechanical Engineer', np: 1 },
    { position: 'HSE Manager', np: 2 }, { position: 'Surveyor', np: 2 }, { position: 'QS', np: 1 },
    { position: 'Storekeeper', np: 2 }, { position: 'Security Guard', np: 4 },
  ],
  companies: {
    STRUCTURE: 'Alpha Constructions', CIVIL: 'Alpha Constructions', GENERAL: 'Alpha Constructions',
    ARCHITECTURE: 'Atlas Finitions SARL', MECANIQUE: 'Thermo-Fluides Maghreb', ELECTRICITE: 'Elec-Pro Services',
    PLOMBERIE: 'Hydro-Sanitaire Djurdjura', INFRASTRUCTURE: 'VRD Travaux Mitidja',
  },
  presentation: {
    surface: '38 400 m² GFA (site 9 800 m²)', floors: '2 basements + GF + 8 floors (3 blocks)', totalLots: '8',
    structureType: 'Reinforced concrete frame with flat slabs, shear-wall cores, raft foundations',
    generalDescription: 'Fictional demonstration project. Three residential blocks (A, B, C) of 40 apartments each, from F3 to F5, built over a shared two-level basement car park of 210 spaces. The scheme includes a landscaped courtyard, children’s play areas, a gatehouse and ground-floor community rooms. Works are let under a single main contract with nominated MEP and finishes subcontractors.',
  },
  intervenants: [
    { role: 'Client / Owner', company: 'Groupe Immobilier Al Nour', contact: 'Karim Haddadi', phone: '+213 (0)21 00 10 01', email: 'k.haddadi@alnour-demo.example' },
    { role: 'Project Management Consultant', company: 'BET Ingénierie', contact: 'Jean-Pierre Martin', phone: '+213 (0)21 00 10 02', email: 'jp.martin@bet-demo.example' },
    { role: 'Architect', company: 'Atelier Casbah Architectes', contact: 'Nadia Ferhat', phone: '+213 (0)21 00 10 03', email: 'n.ferhat@casbah-demo.example' },
    { role: 'Structural Engineer', company: 'Structura Conseil', contact: 'Yacine Belkacem', phone: '+213 (0)21 00 10 04', email: 'y.belkacem@structura-demo.example' },
    { role: 'Main Contractor', company: 'Alpha Constructions', contact: 'Ahmed Karim', phone: '+213 (0)21 00 10 05', email: 'a.karim@alpha-demo.example' },
    { role: 'MEP Subcontractor', company: 'Thermo-Fluides Maghreb', contact: 'Rachid Ouali', phone: '+213 (0)21 00 10 06', email: 'r.ouali@tfm-demo.example' },
    { role: 'Electrical Subcontractor', company: 'Elec-Pro Services', contact: 'Samir Benyahia', phone: '+213 (0)21 00 10 07', email: 's.benyahia@elecpro-demo.example' },
    { role: 'Technical Control Office', company: 'Bureau de Contrôle Technique Sahel', contact: 'Leïla Mansouri', phone: '+213 (0)21 00 10 08', email: 'l.mansouri@bcts-demo.example' },
  ],
  activities: AL,
  milestones: [
    { key: 'M01', name: 'Site possession & mobilisation complete', description: 'Hoarding, site offices and access in place', act: 'A01' },
    { key: 'M02', name: 'Bulk excavation complete', description: 'Formation level reached at –7.40 m', act: 'A04' },
    { key: 'M03', name: 'Raft foundations complete (A, B, C)', description: 'All three rafts poured and cured', act: 'A08' },
    { key: 'M04', name: 'Basement structure complete', description: 'B2 and B1 slabs complete, podium ready', act: 'A10' },
    { key: 'M05', name: 'Topping-out Block A', description: 'R+8 slab of Block A poured', act: 'A11' },
    { key: 'M06', name: 'Structural completion – all blocks', description: 'Roof slabs, parapets and lift overruns complete', act: 'A14' },
    { key: 'M07', name: 'Buildings watertight', description: 'Roof waterproofing complete on all blocks', act: 'A18' },
    { key: 'M08', name: 'MEP first-fix complete', description: 'LV cabling and distribution boards installed', act: 'A24' },
    { key: 'M09', name: 'Lifts commissioned', description: 'Six lifts tested and certified', act: 'A25' },
    { key: 'M10', name: 'Practical completion & handover', description: 'Handover of 120 units to the client', act: 'A44' },
  ],
  plant: [
    { name: 'Tower crane TC-01 (Block A/B)', category: 'LIFTING', make: 'Potain', model: 'MDT 219', owner: 'Alpha Constructions', onDay: 190, status: 'ON_SITE', hourly: 9.2 },
    { name: 'Tower crane TC-02 (Block C)', category: 'LIFTING', make: 'Liebherr', model: '172 EC-B 8', owner: 'Alpha Constructions', onDay: 250, status: 'ON_SITE', hourly: 8.8 },
    { name: 'Concrete pump 36 m', category: 'PUMPING', make: 'Putzmeister', model: 'M36-4', owner: 'Béton Express (fictional)', hireCompany: 'Béton Express', onDay: 120, status: 'ON_SITE', hourly: 3.4 },
    { name: 'Hydraulic excavator 30 t', category: 'EARTHMOVING', make: 'Caterpillar', model: '330', owner: 'Alpha Constructions', onDay: 28, offDay: 130, status: 'OFF_SITE', hourly: 8.5 },
    { name: 'Backhoe loader', category: 'EARTHMOVING', make: 'JCB', model: '3CX', owner: 'Alpha Constructions', onDay: 20, status: 'ON_SITE', hourly: 4.1 },
    { name: 'Telehandler 17 m', category: 'LIFTING', make: 'Manitou', model: 'MT 1740', owner: 'Location Engins Est', hireCompany: 'Location Engins Est', onDay: 420, status: 'UNDER_MAINTENANCE', hourly: 5.2, notes: 'Hydraulic hose replacement – back on site expected within the week' },
    { name: 'Passenger/material hoist Block B', category: 'LIFTING', make: 'Alimak', model: 'Scando 650', owner: 'Location Engins Est', hireCompany: 'Location Engins Est', onDay: 470, status: 'ON_SITE', hourly: 7.0 },
    { name: 'Diesel generator 250 kVA', category: 'ELECTRICAL', make: 'SDMO', model: 'J250K', owner: 'Alpha Constructions', onDay: 15, status: 'ON_SITE', hourly: 10.5 },
    { name: 'Plate compactor', category: 'COMPACTION', make: 'Bomag', model: 'BPR 50/52', owner: 'Alpha Constructions', onDay: 600, status: 'ON_SITE', hourly: 2.5 },
    { name: 'Tipper truck 6x4', category: 'TRANSPORT', make: 'Renault', model: 'Kerax 380', owner: 'Alpha Constructions', onDay: 30, status: 'BREAKDOWN', hourly: 5.0, notes: 'Gearbox failure – awaiting spare part' },
    { name: 'Facade scaffolding system (Block A)', category: 'SCAFFOLDING', make: 'Layher', model: 'Allround', owner: 'Échafaudages du Centre', hireCompany: 'Échafaudages du Centre', onDay: 495, status: 'ON_SITE', hourly: 0 },
  ],
  risks: [
    { title: 'Late delivery of aluminium window profiles', description: 'Imported profiles subject to customs clearance delays; could hold up façade close-in of Blocks B and C.', category: 'PROCUREMENT', p: 4, i: 4, status: 'OPEN', mitigation: 'Order released early; alternative local extruder pre-qualified; weekly tracking with supplier.', owner: 'Procurement Manager', dueDay: 690, raisedDay: 540 },
    { title: 'Winter rainfall affecting façade render', description: 'Rainy season (Nov–Feb) may stop external render and roof works for several days.', category: 'SCHEDULE', p: 4, i: 3, status: 'OPEN', mitigation: 'Re-sequence internal works on rainy days; protective sheeting on scaffolds.', owner: 'Construction Manager', dueDay: 720, raisedDay: 600 },
    { title: 'Lift supplier installation crew availability', description: 'Single installation crew shared with another site may delay lift commissioning.', category: 'RESOURCES', p: 3, i: 4, status: 'OPEN', mitigation: 'Contractual commitment for a second crew from February.', owner: 'MEP Coordinator', dueDay: 760, raisedDay: 610 },
    { title: 'Cement price escalation', description: 'Market price increases on cement and rebar beyond the contract price-adjustment formula.', category: 'FINANCIAL', p: 3, i: 3, status: 'MITIGATED', mitigation: 'Bulk purchase of remaining rebar tonnage secured in Q2 2026.', owner: 'Quantity Surveyor', dueDay: 560, raisedDay: 400 },
    { title: 'Groundwater ingress in basement B2', description: 'Seasonal water table rise could cause ingress through construction joints.', category: 'TECHNICAL', p: 2, i: 4, status: 'MITIGATED', mitigation: 'Injection of hydrophilic waterstops; sump pumps retained until handover.', owner: 'Site Manager', dueDay: 480, raisedDay: 200 },
    { title: 'Work at height on façade scaffolds', description: 'High exposure of render and window crews working at height on 8 floors.', category: 'HSE', p: 3, i: 5, status: 'OPEN', mitigation: 'Daily scaffold inspection tags, harness checks, dedicated HSE supervisor for façades.', owner: 'HSE Manager', dueDay: 760, raisedDay: 495 },
    { title: 'Design change to apartment layouts (client request)', description: 'Client request to merge 8 F3 units into F5 units on R+7/R+8.', category: 'DESIGN', p: 2, i: 3, status: 'ACCEPTED', mitigation: 'Variation priced and accepted; drawings revised under Rev C.', owner: 'Project Manager', dueDay: 600, raisedDay: 520 },
    { title: 'Utility connection approval (electricity)', description: 'Permanent HV/LV connection approval from the utility may take longer than planned.', category: 'REGULATORY', p: 3, i: 4, status: 'OPEN', mitigation: 'Application filed; monthly follow-up meetings; temporary generator kept as backup.', owner: 'Project Manager', dueDay: 800, raisedDay: 630 },
    { title: 'Tower crane wind downtime', description: 'Strong winds stopping crane operations during structural works.', category: 'SCHEDULE', p: 3, i: 2, status: 'CLOSED', mitigation: 'Structure complete – risk closed.', owner: 'Construction Manager', dueDay: 540, raisedDay: 210 },
    { title: 'Tile supply colour batch mismatch', description: 'Successive tile deliveries from different production batches.', category: 'QUALITY', p: 2, i: 2, status: 'MITIGATED', mitigation: 'Full quantity per block ordered from a single batch; mock-up approved.', owner: 'Finishes Engineer', dueDay: 650, raisedDay: 580 },
  ],
  ncrs: [
    { title: 'Honeycombing on column C-12 at R+3, Block B', description: 'Surface honeycombing over 0.4 m² at column base after formwork striking.', area: 'Block B – R+3', discipline: 'STRUCTURE', severity: 'MEDIUM', raisedBy: 'Jean-Pierre Martin', raisedDay: 360, closeDay: 372, resolution: 'Defective concrete removed and repaired with approved polymer-modified mortar; inspection passed.' },
    { title: 'Rebar cover below specification – slab R+5 Block A', description: 'Measured cover 18 mm vs 25 mm specified at several locations before pour.', area: 'Block A – R+5', discipline: 'STRUCTURE', severity: 'HIGH', raisedBy: 'Jean-Pierre Martin', raisedDay: 395, closeDay: 398, resolution: 'Additional spacers installed and cover re-checked prior to pour authorisation.' },
    { title: 'Membrane overlap insufficient at basement wall', description: 'Waterproofing membrane overlaps below the 100 mm minimum on grid 4–6.', area: 'Basement B2', discipline: 'ARCHITECTURE', severity: 'MEDIUM', raisedBy: 'Leïla Mansouri', raisedDay: 180, closeDay: 192, resolution: 'Strips re-laid with 150 mm overlaps and torch-sealed; flood test passed.' },
    { title: 'Masonry wall out of plumb – Block C R+2', description: 'Partition walls exceed the 10 mm/2 m tolerance in four apartments.', area: 'Block C – R+2', discipline: 'ARCHITECTURE', severity: 'LOW', raisedBy: 'Sara Benali', raisedDay: 640, underReview: true },
    { title: 'Unapproved cable type installed in riser 2', description: 'Cable sections installed in riser 2 do not match the approved submittal (non-LSZH).', area: 'Block A – riser 2', discipline: 'ELECTRICITE', severity: 'HIGH', raisedBy: 'Jean-Pierre Martin', raisedDay: 652 },
    { title: 'Render cracking on south façade Block A', description: 'Hairline cracking at slab edges on R+1 to R+3 south façade.', area: 'Façades – Block A south', discipline: 'ARCHITECTURE', severity: 'MEDIUM', raisedBy: 'Leïla Mansouri', raisedDay: 618 },
  ],
  studies: [
    { docNumber: 'AN-ARC-DD-001', description: 'Architectural detailed design – apartments typical floors', discipline: 'ARCHITECTURE', rev: 'C', plannedDay: 520, actualDay: 528, final: 'APPROVED' },
    { docNumber: 'AN-STR-CD-014', description: 'Roof slab and lift overrun reinforcement drawings', discipline: 'STRUCTURE', rev: 'B', plannedDay: 450, actualDay: 455, final: 'APPROVED' },
    { docNumber: 'AN-MEP-SD-022', description: 'Plumbing riser shop drawings Blocks A–C', discipline: 'PLOMBERIE', rev: 'A', plannedDay: 560, actualDay: 574, final: 'APPROVED' },
    { docNumber: 'AN-ELE-SD-031', description: 'LV single-line diagrams & distribution boards', discipline: 'ELECTRICITE', rev: 'B', plannedDay: 600, actualDay: 615, final: 'APPROVED' },
    { docNumber: 'AN-MEC-SD-040', description: 'Car-park ventilation & smoke extraction layout', discipline: 'MECANIQUE', rev: 'B', plannedDay: 610, actualDay: 640, final: 'UNDER_REVIEW', observations: 'CFD report requested by technical control' },
    { docNumber: 'AN-ARC-SD-052', description: 'Façade render joints & cladding details', discipline: 'ARCHITECTURE', rev: 'A', plannedDay: 630, actualDay: 645, final: 'REJECTED', observations: 'Movement joints at slab edges to be added (see NCR)' },
    { docNumber: 'AN-LIF-SD-060', description: 'Lift shaft & machine room shop drawings', discipline: 'MECANIQUE', rev: 'A', plannedDay: 650, actualDay: 655, final: 'SUBMITTED' },
    { docNumber: 'AN-VRD-DD-070', description: 'External works – roads, networks, landscaping', discipline: 'INFRASTRUCTURE', rev: 'A', plannedDay: 690, final: 'SUBMITTED' },
  ],
  materials: [
    { ref: 'MAT-AN-001', description: 'Ready-mix concrete C30/37 (structure)', discipline: 'STRUCTURE', submittedBy: 'Alpha Constructions', submitDay: 95, reviewDay: 102, final: 'APPROVED' },
    { ref: 'MAT-AN-004', description: 'Hollow clay bricks 15/20 cm', discipline: 'ARCHITECTURE', submittedBy: 'Atlas Finitions SARL', submitDay: 300, reviewDay: 310, final: 'APPROVED' },
    { ref: 'MAT-AN-007', description: 'Bituminous waterproofing membrane SBS 4 mm', discipline: 'ARCHITECTURE', submittedBy: 'Atlas Finitions SARL', submitDay: 470, reviewDay: 492, final: 'RESUBMITTED', observations: 'Rev A rejected (root resistance certificate missing); Rev B resubmitted' },
    { ref: 'MAT-AN-011', description: 'Porcelain floor tiles 60×60 cm', discipline: 'ARCHITECTURE', submittedBy: 'Atlas Finitions SARL', submitDay: 540, reviewDay: 552, final: 'APPROVED' },
    { ref: 'MAT-AN-015', description: 'Aluminium window system (thermal break)', discipline: 'ARCHITECTURE', submittedBy: 'Atlas Finitions SARL', submitDay: 520, reviewDay: 545, final: 'APPROVED' },
    { ref: 'MAT-AN-019', description: 'LSZH power cables & cable trays', discipline: 'ELECTRICITE', submittedBy: 'Elec-Pro Services', submitDay: 500, reviewDay: 512, final: 'APPROVED' },
    { ref: 'MAT-AN-022', description: 'PPR pipes & fittings (domestic water)', discipline: 'PLOMBERIE', submittedBy: 'Hydro-Sanitaire Djurdjura', submitDay: 360, reviewDay: 371, final: 'APPROVED' },
    { ref: 'MAT-AN-026', description: 'Passenger lifts 8 persons, 1.0 m/s', discipline: 'MECANIQUE', submittedBy: 'Thermo-Fluides Maghreb', submitDay: 560, reviewDay: 590, final: 'APPROVED' },
    { ref: 'MAT-AN-030', description: 'Jet fans for car-park ventilation', discipline: 'MECANIQUE', submittedBy: 'Thermo-Fluides Maghreb', submitDay: 640, final: 'UNDER_REVIEW' },
    { ref: 'MAT-AN-033', description: 'Interior acrylic paint (low VOC)', discipline: 'ARCHITECTURE', submittedBy: 'Atlas Finitions SARL', submitDay: 655, final: 'SUBMITTED' },
  ],
  plans: [
    { number: 'AN-ARC-GA-100', title: 'General arrangement – site plan', revision: 'D', format: 'A0', issuedBy: 'Atelier Casbah Architectes', day: 470, status: 'APPROVED', remarks: 'For construction' },
    { number: 'AN-ARC-GA-101', title: 'Typical floor plan Blocks A–C', revision: 'C', format: 'A1', issuedBy: 'Atelier Casbah Architectes', day: 528, status: 'APPROVED', remarks: 'Includes F5 merge on R+7/R+8' },
    { number: 'AN-ARC-GA-100', title: 'General arrangement – site plan', revision: 'C', format: 'A0', issuedBy: 'Atelier Casbah Architectes', day: 300, status: 'SUPERSEDED', remarks: 'Superseded by Rev D' },
    { number: 'AN-STR-PL-210', title: 'Raft foundation layout & reinforcement', revision: 'B', format: 'A0', issuedBy: 'Structura Conseil', day: 95, status: 'APPROVED', remarks: '' },
    { number: 'AN-STR-PL-230', title: 'Typical slab reinforcement R+1 to R+8', revision: 'C', format: 'A1', issuedBy: 'Structura Conseil', day: 230, status: 'APPROVED', remarks: '' },
    { number: 'AN-STR-SD-231', title: 'Shop drawing – slab R+6 Block C reinforcement', revision: 'A', format: 'A1', issuedBy: 'Alpha Constructions', day: 440, status: 'APPROVED', remarks: 'Approved with comments' },
    { number: 'AN-MEP-PL-310', title: 'Plumbing risers schematic', revision: 'B', format: 'A1', issuedBy: 'Thermo-Fluides Maghreb', day: 574, status: 'ISSUED', remarks: '' },
    { number: 'AN-ELE-PL-410', title: 'LV distribution single-line diagram', revision: 'B', format: 'A1', issuedBy: 'Elec-Pro Services', day: 615, status: 'ISSUED', remarks: '' },
    { number: 'AN-MEC-SD-420', title: 'Shop drawing – car-park ventilation layout', revision: 'B', format: 'A1', issuedBy: 'Thermo-Fluides Maghreb', day: 640, status: 'DRAFT', remarks: 'Under review by consultant' },
    { number: 'AN-VRD-PL-500', title: 'External works & networks', revision: 'A', format: 'A0', issuedBy: 'VRD Travaux Mitidja', day: 600, status: 'FOR_INFO', remarks: '' },
  ],
  zones: BLOCK_ZONES(['A', 'B', 'C']),
  lots: [
    { lot: 'Lot 01', description: 'Earthworks & foundations', weighting: 12, disciplines: ['CIVIL'] },
    { lot: 'Lot 02', description: 'Reinforced concrete structure', weighting: 30, disciplines: ['STRUCTURE'] },
    { lot: 'Lot 03', description: 'Masonry, envelope & finishes', weighting: 26, disciplines: ['ARCHITECTURE'] },
    { lot: 'Lot 04', description: 'Plumbing & sanitary', weighting: 7, disciplines: ['PLOMBERIE'] },
    { lot: 'Lot 05', description: 'HVAC, fire-fighting & lifts', weighting: 9, disciplines: ['MECANIQUE'] },
    { lot: 'Lot 06', description: 'Electrical & low current', weighting: 8, disciplines: ['ELECTRICITE'] },
    { lot: 'Lot 07', description: 'External works (VRD)', weighting: 6, disciplines: ['INFRASTRUCTURE'] },
    { lot: 'Lot 08', description: 'Preliminaries & commissioning', weighting: 2, disciplines: ['GENERAL'] },
  ],
  deliveries: {
    STRUCTURE: [{ designation: 'Ready-mix concrete C30/37', unit: 'm³', qty: 60 }, { designation: 'Rebar HA (FeE500)', unit: 't', qty: 12 }],
    ARCHITECTURE: [{ designation: 'Hollow clay bricks 15 cm', unit: 'u', qty: 6000 }, { designation: 'Cement CPJ 42.5 (bags)', unit: 't', qty: 8 }, { designation: 'Porcelain tiles 60×60', unit: 'm²', qty: 320 }, { designation: 'Plaster (bags)', unit: 't', qty: 6 }],
    PLOMBERIE: [{ designation: 'PPR pipes Ø20–Ø63', unit: 'ml', qty: 400 }, { designation: 'PVC drainage pipes Ø110', unit: 'ml', qty: 180 }],
    ELECTRICITE: [{ designation: 'LSZH cable 3G2.5 mm²', unit: 'ml', qty: 2500 }, { designation: 'Cable trays 300 mm', unit: 'ml', qty: 150 }],
    MECANIQUE: [{ designation: 'Galvanised ductwork', unit: 'm²', qty: 90 }, { designation: 'Sprinkler pipes DN50', unit: 'ml', qty: 120 }],
    INFRASTRUCTURE: [{ designation: 'Crushed aggregate 0/31.5', unit: 't', qty: 140 }, { designation: 'Concrete kerbs', unit: 'ml', qty: 120 }],
    CIVIL: [{ designation: 'Crushed aggregate 0/31.5', unit: 't', qty: 90 }],
  },
};

// ────────────────────────────────────────────────────────────────
// Bab Ezzouar — shopping centre
// ────────────────────────────────────────────────────────────────
const BAB: ActDef[] = [
  { key: 'B01', name: 'Mobilisation & site establishment', discipline: 'GENERAL', area: 'Site', phase: '1 Preliminaries', start: 0, dur: 35, unit: 'u', qty: 18, crew: 10 },
  { key: 'B02', name: 'Demolition of existing warehouses', discipline: 'CIVIL', area: 'Site', phase: '1 Preliminaries', start: 20, dur: 45, unit: 'm³', qty: 9200, crew: 12 },
  { key: 'B03', name: 'Complementary geotechnical investigation', discipline: 'CIVIL', area: 'Site', phase: '1 Preliminaries', start: 25, dur: 30, unit: 'bh', qty: 12, crew: 5 },
  { key: 'B04', name: 'Diaphragm wall (D-wall) 0.8 m', discipline: 'STRUCTURE', area: 'Perimeter', phase: '2 Substructure', start: 60, dur: 110, unit: 'm²', qty: 8600, crew: 18, priority: 'CRITICAL', deps: ['B03'] },
  { key: 'B05', name: 'Dewatering system & monitoring', discipline: 'CIVIL', area: 'Basement', phase: '2 Substructure', start: 150, dur: 200, unit: 'days', qty: 200, crew: 3 },
  { key: 'B06', name: 'Bulk excavation to B2 (–9.20 m)', discipline: 'CIVIL', area: 'Basement', phase: '2 Substructure', start: 160, dur: 110, unit: 'm³', qty: 72000, crew: 16, priority: 'CRITICAL', deps: ['B04'] },
  { key: 'B07', name: 'Bored piles Ø800 (interior columns)', discipline: 'STRUCTURE', area: 'Basement', phase: '2 Substructure', start: 170, dur: 80, unit: 'u', qty: 186, crew: 12, priority: 'HIGH' },
  { key: 'B08', name: 'Raft foundation & pile caps', discipline: 'STRUCTURE', area: 'B2', phase: '2 Substructure', start: 260, dur: 70, unit: 'm³', qty: 5400, crew: 26, priority: 'CRITICAL', deps: ['B06', 'B07'] },
  { key: 'B09', name: 'Basement waterproofing & drainage', discipline: 'ARCHITECTURE', area: 'B2', phase: '2 Substructure', start: 270, dur: 90, unit: 'm²', qty: 14500, crew: 8 },
  { key: 'B10', name: 'RC structure level B2', discipline: 'STRUCTURE', area: 'B2', phase: '3 Structure', start: 320, dur: 70, unit: 'm³', qty: 3600, crew: 30, priority: 'CRITICAL', deps: ['B08'] },
  { key: 'B11', name: 'RC structure level B1', discipline: 'STRUCTURE', area: 'B1', phase: '3 Structure', start: 370, dur: 70, unit: 'm³', qty: 3600, crew: 30, priority: 'CRITICAL', deps: ['B10'] },
  { key: 'B12', name: 'RC structure ground floor & podium', discipline: 'STRUCTURE', area: 'GF', phase: '3 Structure', start: 420, dur: 75, unit: 'm³', qty: 3900, crew: 30, priority: 'CRITICAL', deps: ['B11'] },
  { key: 'B13', name: 'Steel frame level 1', discipline: 'STRUCTURE', area: 'L1', phase: '3 Structure', start: 470, dur: 70, unit: 't', qty: 820, crew: 16, deps: ['B12'] },
  { key: 'B14', name: 'Steel frame level 2 & roof', discipline: 'STRUCTURE', area: 'L2', phase: '3 Structure', start: 520, dur: 80, unit: 't', qty: 960, crew: 16, deps: ['B13'] },
  { key: 'B15', name: 'Composite metal decks & toppings', discipline: 'STRUCTURE', area: 'L1', phase: '3 Structure', start: 490, dur: 110, unit: 'm²', qty: 21000, crew: 14 },
  { key: 'B16', name: 'Atrium skylight steel structure', discipline: 'STRUCTURE', area: 'Atrium', phase: '4 Envelope', start: 580, dur: 60, unit: 't', qty: 140, crew: 10 },
  { key: 'B17', name: 'Curtain wall – main façade', discipline: 'ARCHITECTURE', area: 'Façades', phase: '4 Envelope', start: 600, dur: 120, unit: 'm²', qty: 5200, crew: 12, priority: 'HIGH' },
  { key: 'B18', name: 'Metal cladding panels', discipline: 'ARCHITECTURE', area: 'Façades', phase: '4 Envelope', start: 620, dur: 100, unit: 'm²', qty: 7400, crew: 10 },
  { key: 'B19', name: 'Roof membrane & insulation', discipline: 'ARCHITECTURE', area: 'Roof', phase: '4 Envelope', start: 610, dur: 60, unit: 'm²', qty: 11800, crew: 8 },
  { key: 'B20', name: 'Atrium glazing', discipline: 'ARCHITECTURE', area: 'Atrium', phase: '4 Envelope', start: 640, dur: 50, unit: 'm²', qty: 1350, crew: 8 },
  { key: 'B21', name: 'HVAC chillers & air-handling units', discipline: 'MECANIQUE', area: 'Roof', phase: '5 MEP', start: 600, dur: 120, unit: 'u', qty: 22, crew: 8 },
  { key: 'B22', name: 'HVAC ductwork', discipline: 'MECANIQUE', area: 'All levels', phase: '5 MEP', start: 560, dur: 160, unit: 'm²', qty: 16500, crew: 14 },
  { key: 'B23', name: 'Escalators & lifts', discipline: 'MECANIQUE', area: 'Atrium', phase: '5 MEP', start: 650, dur: 90, unit: 'u', qty: 10, crew: 6 },
  { key: 'B24', name: 'Sprinkler network', discipline: 'MECANIQUE', area: 'All levels', phase: '5 MEP', start: 540, dur: 160, unit: 'ml', qty: 14200, crew: 10 },
  { key: 'B25', name: 'Plumbing, drainage & embedded sleeves', discipline: 'PLOMBERIE', area: 'All levels', phase: '5 MEP', start: 330, dur: 330, unit: 'ml', qty: 8600, crew: 8 },
  { key: 'B26', name: 'MV substation & transformers', discipline: 'ELECTRICITE', area: 'B1', phase: '5 MEP', start: 520, dur: 90, unit: 'u', qty: 3, crew: 6 },
  { key: 'B27', name: 'LV distribution & lighting', discipline: 'ELECTRICITE', area: 'All levels', phase: '5 MEP', start: 560, dur: 170, unit: 'ml', qty: 64000, crew: 14 },
  { key: 'B28', name: 'Fire alarm & BMS', discipline: 'ELECTRICITE', area: 'All levels', phase: '5 MEP', start: 640, dur: 110, unit: 'pts', qty: 2400, crew: 6 },
  { key: 'B29', name: 'Car-park ventilation (jet fans)', discipline: 'MECANIQUE', area: 'B1', phase: '5 MEP', start: 470, dur: 110, unit: 'u', qty: 48, crew: 5 },
  { key: 'B30', name: 'Partitions & tenant demising walls', discipline: 'ARCHITECTURE', area: 'GF', phase: '6 Finishes', start: 600, dur: 120, unit: 'm²', qty: 9800, crew: 14 },
  { key: 'B31', name: 'Mall shell finishes (floors, ceilings)', discipline: 'ARCHITECTURE', area: 'GF', phase: '6 Finishes', start: 650, dur: 120, unit: 'm²', qty: 14000, crew: 18 },
  { key: 'B32', name: 'Food court fit-out', discipline: 'ARCHITECTURE', area: 'L2', phase: '6 Finishes', start: 690, dur: 90, unit: 'm²', qty: 2600, crew: 12 },
  { key: 'B33', name: 'Car-park finishes & marking', discipline: 'ARCHITECTURE', area: 'B2', phase: '6 Finishes', start: 600, dur: 80, unit: 'm²', qty: 19000, crew: 8 },
  { key: 'B34', name: 'Access road & junction works', discipline: 'INFRASTRUCTURE', area: 'External', phase: '7 External works', start: 630, dur: 90, unit: 'm²', qty: 5200, crew: 10 },
  { key: 'B35', name: 'Surface car park', discipline: 'INFRASTRUCTURE', area: 'External', phase: '7 External works', start: 660, dur: 80, unit: 'm²', qty: 7800, crew: 10 },
  { key: 'B36', name: 'VRD networks (water, sewer, storm)', discipline: 'INFRASTRUCTURE', area: 'External', phase: '7 External works', start: 400, dur: 180, unit: 'ml', qty: 3400, crew: 10 },
  { key: 'B37', name: 'Landscaping & external furniture', discipline: 'INFRASTRUCTURE', area: 'External', phase: '7 External works', start: 720, dur: 60, unit: 'm²', qty: 4200, crew: 8 },
  { key: 'B38', name: 'Testing & commissioning', discipline: 'MECANIQUE', area: 'All levels', phase: '8 Commissioning', start: 740, dur: 50, unit: 'sys', qty: 16, crew: 8 },
  { key: 'B39', name: 'Tenant handover (fit-out access)', discipline: 'GENERAL', area: 'GF', phase: '8 Commissioning', start: 770, dur: 40, unit: 'u', qty: 86, crew: 6 },
  { key: 'B40', name: 'Final handover & completion certificate', discipline: 'GENERAL', area: 'Site', phase: '8 Commissioning', start: 790, dur: 26, unit: 'u', qty: 1, crew: 4 },
];

const MALL_ZONES: ZoneDef[] = (() => {
  const zones: [string, string][] = [['North Mall', 'N'], ['South Mall', 'S'], ['Atrium', 'AT'], ['Food Court', 'FC']];
  const levels = ['B2', 'B1', 'GF', 'L1', 'L2', 'Roof'];
  const map: Record<string, string[]> = {
    B2: ['B08', 'B09', 'B10'], B1: ['B11', 'B29'], GF: ['B12', 'B25'], L1: ['B13', 'B15'], L2: ['B14', 'B15'], Roof: ['B14', 'B19'],
  };
  const out: ZoneDef[] = [];
  for (const [z] of zones) for (const lv of levels) {
    if (z === 'Food Court' && !['L2', 'Roof'].includes(lv)) continue;
    if (z === 'Atrium' && lv === 'B2') continue;
    out.push({
      zone: z, level: lv,
      description: lv.startsWith('B') ? `${z} – car park ${lv}` : `${z} – ${lv === 'Roof' ? 'roof & plant' : 'retail level ' + lv}`,
      surface: lv.startsWith('B') ? '3 600 m²' : z === 'Atrium' ? '900 m²' : '2 800 m²',
      acts: z === 'Atrium' && !lv.startsWith('B') ? [...map[lv], 'B16'] : map[lv],
    });
  }
  return out;
})();

export const BAB_EZZOUAR: ProjectDef = {
  id: 'demo-prj-babezzouar', slug: 'bab-ezzouar', code: 'PRJ-2025-002',
  name: 'Centre Commercial Bab Ezzouar',
  description: 'Fictional demonstration project – regional shopping centre with two basement car-park levels, an RC podium, a steel-framed retail superstructure, a glazed atrium and a food court.',
  client: 'Invest Corp', consultant: 'Design & Build', contractor: 'Batimex SARL',
  location: 'Bab Ezzouar, Alger', start: '2025-10-05', end: '2027-12-30', budget: 8_500_000, currency: 'USD',
  costFactor: 0.98, lagDays: 12, stretch: 1.18, seed: 2207, climateOffset: -0.5,
  indirect: [
    { position: 'Project Manager', np: 1 }, { position: 'Construction Manager', np: 1 }, { position: 'Site Manager', np: 1 },
    { position: 'Civil Engineer', np: 2 }, { position: 'HSE Manager', np: 1 }, { position: 'Surveyor', np: 2 },
    { position: 'QS', np: 1 }, { position: 'Storekeeper', np: 1 }, { position: 'Security Guard', np: 3 },
  ],
  companies: {
    STRUCTURE: 'Batimex SARL', CIVIL: 'Batimex SARL', GENERAL: 'Batimex SARL',
    ARCHITECTURE: 'Façades & Verre Méditerranée', MECANIQUE: 'Clima-Tech Algérie', ELECTRICITE: 'Énergie Bâtiment Services',
    PLOMBERIE: 'Clima-Tech Algérie', INFRASTRUCTURE: 'Routes & Réseaux Est',
  },
  presentation: {
    surface: '46 000 m² GFA (site 21 500 m²)', floors: '2 basements + GF + 2 retail levels', totalLots: '7',
    structureType: 'RC basements and podium on diaphragm walls and bored piles; steel frame with composite decks above',
    generalDescription: 'Fictional demonstration project. A regional shopping centre of about 86 retail units around a central glazed atrium, with a food court on level 2 and 1 100 parking spaces on two basement levels and a surface car park. The basement is retained by a 0.8 m diaphragm wall with temporary dewatering; the retail levels use a steel frame with long-span composite decks.',
  },
  intervenants: [
    { role: 'Client / Developer', company: 'Invest Corp', contact: 'Mourad Saïdi', phone: '+213 (0)21 00 20 01', email: 'm.saidi@investcorp-demo.example' },
    { role: 'Design & Supervision Consultant', company: 'Design & Build', contact: 'Jean-Pierre Martin', phone: '+213 (0)21 00 20 02', email: 'jp.martin@db-demo.example' },
    { role: 'Architect', company: 'Studio Méditerranée Architecture', contact: 'Amel Kaci', phone: '+213 (0)21 00 20 03', email: 'a.kaci@sma-demo.example' },
    { role: 'Geotechnical Engineer', company: 'GéoSol Laboratoire', contact: 'Farid Zerrouki', phone: '+213 (0)21 00 20 04', email: 'f.zerrouki@geosol-demo.example' },
    { role: 'Main Contractor', company: 'Batimex SARL', contact: 'Ahmed Karim', phone: '+213 (0)21 00 20 05', email: 'a.karim@batimex-demo.example' },
    { role: 'Façade Subcontractor', company: 'Façades & Verre Méditerranée', contact: 'Hakim Larbi', phone: '+213 (0)21 00 20 06', email: 'h.larbi@fvm-demo.example' },
    { role: 'MEP Subcontractor', company: 'Clima-Tech Algérie', contact: 'Sofiane Mebarki', phone: '+213 (0)21 00 20 07', email: 's.mebarki@climatech-demo.example' },
    { role: 'Technical Control Office', company: 'Bureau de Contrôle Technique Sahel', contact: 'Leïla Mansouri', phone: '+213 (0)21 00 20 08', email: 'l.mansouri@bcts-demo.example' },
  ],
  activities: BAB,
  milestones: [
    { key: 'M01', name: 'Site possession', description: 'Site handed over, hoarding and offices installed', act: 'B01' },
    { key: 'M02', name: 'Demolition complete', description: 'Existing warehouses demolished and cleared', act: 'B02' },
    { key: 'M03', name: 'Diaphragm wall complete', description: 'Perimeter D-wall panels and capping beam complete', act: 'B04' },
    { key: 'M04', name: 'Excavation to B2 formation', description: 'Excavation reaches –9.20 m', act: 'B06' },
    { key: 'M05', name: 'Raft foundation complete', description: 'Raft and pile caps poured', act: 'B08' },
    { key: 'M06', name: 'Basement structure complete', description: 'B2 and B1 slabs complete', act: 'B11' },
    { key: 'M07', name: 'Steel frame topped out', description: 'Roof steel erected', act: 'B14' },
    { key: 'M08', name: 'Building watertight', description: 'Roof membrane and curtain wall complete', act: 'B19' },
    { key: 'M09', name: 'MV energisation', description: 'Permanent power available', act: 'B26' },
    { key: 'M10', name: 'Opening & final handover', description: 'Completion certificate and opening to the public', act: 'B40' },
  ],
  plant: [
    { name: 'Diaphragm-wall hydraulic grab', category: 'DRILLING', make: 'Bauer', model: 'GB 34', owner: 'Fondations Spéciales Sud', hireCompany: 'Fondations Spéciales Sud', onDay: 55, offDay: 185, status: 'OFF_SITE', hourly: 9.0 },
    { name: 'Piling rig Ø800', category: 'DRILLING', make: 'Soilmec', model: 'SR-75', owner: 'Fondations Spéciales Sud', hireCompany: 'Fondations Spéciales Sud', onDay: 165, offDay: 275, status: 'OFF_SITE', hourly: 8.5 },
    { name: 'Hydraulic excavator 35 t', category: 'EARTHMOVING', make: 'Komatsu', model: 'PC360', owner: 'Batimex SARL', onDay: 158, status: 'ON_SITE', hourly: 7.0 },
    { name: 'Long-reach excavator', category: 'EARTHMOVING', make: 'Hitachi', model: 'ZX350 LR', owner: 'Batimex SARL', onDay: 160, status: 'UNDER_MAINTENANCE', hourly: 4.0, notes: 'Scheduled 2 000 h service' },
    { name: 'Tower crane TC-01', category: 'LIFTING', make: 'Potain', model: 'MCT 205', owner: 'Batimex SARL', onDay: 255, status: 'ON_SITE', hourly: 9.0 },
    { name: 'Mobile crane 60 t', category: 'LIFTING', make: 'Liebherr', model: 'LTM 1060', owner: 'Grues Express', hireCompany: 'Grues Express', onDay: 300, status: 'ON_SITE', hourly: 3.0 },
    { name: 'Concrete pump 42 m', category: 'PUMPING', make: 'Schwing', model: 'S 43 SX', owner: 'Béton Express (fictional)', hireCompany: 'Béton Express', onDay: 258, status: 'ON_SITE', hourly: 3.8 },
    { name: 'Dewatering pumps (6 wells)', category: 'PUMPING', make: 'Grundfos', model: 'SP 46', owner: 'Batimex SARL', onDay: 150, status: 'ON_SITE', hourly: 22 },
    { name: 'Dump trucks (fleet of 4)', category: 'TRANSPORT', make: 'Mercedes-Benz', model: 'Actros 3341', owner: 'Batimex SARL', onDay: 160, status: 'ON_SITE', hourly: 7.5 },
    { name: 'Vibratory roller 12 t', category: 'COMPACTION', make: 'Dynapac', model: 'CA2500', owner: 'Routes & Réseaux Est', onDay: 400, status: 'ON_SITE', hourly: 3.0 },
    { name: 'Generator 400 kVA', category: 'ELECTRICAL', make: 'Caterpillar', model: 'XQ400', owner: 'Batimex SARL', onDay: 10, status: 'ON_SITE', hourly: 11.0 },
  ],
  risks: [
    { title: 'Groundwater drawdown affecting neighbouring buildings', description: 'Dewatering may cause settlement of adjacent low-rise buildings.', category: 'TECHNICAL', p: 3, i: 5, status: 'MITIGATED', mitigation: 'Settlement monitoring points read twice weekly; recharge wells installed; trigger levels agreed.', owner: 'Geotechnical Engineer', dueDay: 380, raisedDay: 140 },
    { title: 'D-wall panel joint leakage', description: 'Leaks at panel joints during excavation to B2.', category: 'TECHNICAL', p: 3, i: 4, status: 'CLOSED', mitigation: 'Resin injection performed at 7 joints; excavation completed.', owner: 'Site Manager', dueDay: 300, raisedDay: 190 },
    { title: 'Steel frame fabrication slot', description: 'Fabricator capacity may delay delivery of level 1 steel.', category: 'PROCUREMENT', p: 4, i: 4, status: 'OPEN', mitigation: 'Shop drawings fast-tracked; partial early release of 300 t; second fabricator on standby.', owner: 'Procurement Manager', dueDay: 470, raisedDay: 360 },
    { title: 'Curtain wall glazing submittal rejected', description: 'Rev A glazing submittal rejected – risk to façade programme.', category: 'DESIGN', p: 3, i: 4, status: 'OPEN', mitigation: 'Rev B resubmitted with revised U-value and solar factor; review meeting held.', owner: 'Façade Manager', dueDay: 450, raisedDay: 390 },
    { title: 'Traffic management on main road', description: 'Truck movements on the national road may be restricted at peak hours.', category: 'REGULATORY', p: 3, i: 3, status: 'MITIGATED', mitigation: 'Traffic plan approved; deliveries restricted to 09:00–16:00; flagmen at gate.', owner: 'Logistics Coordinator', dueDay: 400, raisedDay: 160 },
    { title: 'Deep excavation – collapse of temporary slopes', description: 'Risk to workers at excavation base near ramps.', category: 'HSE', p: 2, i: 5, status: 'MITIGATED', mitigation: 'Slopes regraded at 1:1.5, edge protection, daily geotechnical inspection.', owner: 'HSE Manager', dueDay: 330, raisedDay: 170 },
    { title: 'Tenant design changes after slab pour', description: 'Anchor tenant requests for additional openings in the GF slab.', category: 'DESIGN', p: 3, i: 3, status: 'OPEN', mitigation: 'Freeze date agreed for GF penetrations; provisional sleeves installed.', owner: 'Project Manager', dueDay: 440, raisedDay: 380 },
    { title: 'Currency fluctuation on imported MEP equipment', description: 'Chillers and escalators priced in EUR.', category: 'FINANCIAL', p: 3, i: 3, status: 'ACCEPTED', mitigation: 'Contingency allowance held by client; forward purchase considered.', owner: 'Quantity Surveyor', dueDay: 520, raisedDay: 300 },
    { title: 'Heavy rain flooding the excavation', description: 'Autumn storms may flood B2 formation and damage the raft subgrade.', category: 'SCHEDULE', p: 3, i: 3, status: 'OPEN', mitigation: 'Standby pumps, perimeter bund and blinding as soon as excavation reaches level.', owner: 'Construction Manager', dueDay: 450, raisedDay: 360 },
    { title: 'MV connection lead time', description: 'Utility lead time for the 30 kV connection may exceed 12 months.', category: 'REGULATORY', p: 4, i: 4, status: 'OPEN', mitigation: 'Application submitted early; temporary generator plan for commissioning.', owner: 'MEP Manager', dueDay: 600, raisedDay: 330 },
  ],
  ncrs: [
    { title: 'D-wall panel P-23 verticality out of tolerance', description: 'Inclinometer survey shows 1:180 deviation vs 1:200 allowed.', area: 'Perimeter – north', discipline: 'STRUCTURE', severity: 'MEDIUM', raisedBy: 'Jean-Pierre Martin', raisedDay: 120, closeDay: 140, resolution: 'Structural check by designer confirmed acceptable; local trimming of protrusion.' },
    { title: 'Pile P-114 concrete level short', description: 'Cut-off level 300 mm below design after excavation.', area: 'Basement grid F/9', discipline: 'STRUCTURE', severity: 'HIGH', raisedBy: 'Leïla Mansouri', raisedDay: 268, closeDay: 282, resolution: 'Pile extended with doweled extension per designer instruction; integrity test passed.' },
    { title: 'Raft blinding contaminated by groundwater', description: 'Blinding layer softened in bay 3 after pump failure.', area: 'B2 – bay 3', discipline: 'CIVIL', severity: 'MEDIUM', raisedBy: 'Jean-Pierre Martin', raisedDay: 292, closeDay: 299, resolution: 'Softened material removed and re-blinded; standby pump added.' },
    { title: 'Waterstop missing at raft construction joint', description: 'PVC waterstop omitted over 6 m at joint J-4.', area: 'B2 – joint J-4', discipline: 'STRUCTURE', severity: 'HIGH', raisedBy: 'Leïla Mansouri', raisedDay: 335, closeDay: 350, resolution: 'Hydrophilic swelling strip + injection hoses installed; designer approval received.' },
    { title: 'Concrete cube results below C35/45 – B2 columns', description: '28-day cubes at 41 MPa average on pour 27.', area: 'B2 – columns C1–C8', discipline: 'STRUCTURE', severity: 'HIGH', raisedBy: 'Jean-Pierre Martin', raisedDay: 398, underReview: true },
    { title: 'Sleeves missing in B1 slab for drainage', description: 'Six sleeves omitted in B1 slab pour 3.', area: 'B1 – zone S', discipline: 'PLOMBERIE', severity: 'LOW', raisedBy: 'Sara Benali', raisedDay: 408 },
  ],
  studies: [
    { docNumber: 'BE-GEO-RP-001', description: 'Geotechnical interpretative report (complementary)', discipline: 'CIVIL', rev: 'B', plannedDay: 70, actualDay: 74, final: 'APPROVED' },
    { docNumber: 'BE-STR-CD-010', description: 'D-wall design & panel layout', discipline: 'STRUCTURE', rev: 'C', plannedDay: 50, actualDay: 55, final: 'APPROVED' },
    { docNumber: 'BE-STR-CD-020', description: 'Raft & pile cap reinforcement', discipline: 'STRUCTURE', rev: 'B', plannedDay: 240, actualDay: 248, final: 'APPROVED' },
    { docNumber: 'BE-STR-SD-031', description: 'Steel frame shop drawings – level 1', discipline: 'STRUCTURE', rev: 'A', plannedDay: 390, actualDay: 402, final: 'UNDER_REVIEW' },
    { docNumber: 'BE-ARC-DD-040', description: 'Curtain wall design & glazing performance', discipline: 'ARCHITECTURE', rev: 'B', plannedDay: 380, actualDay: 405, final: 'SUBMITTED', observations: 'Rev A rejected – U-value' },
    { docNumber: 'BE-MEP-DD-050', description: 'HVAC design – chillers & AHUs', discipline: 'MECANIQUE', rev: 'A', plannedDay: 420, final: 'SUBMITTED' },
    { docNumber: 'BE-ELE-DD-060', description: 'MV substation layout & single-line diagram', discipline: 'ELECTRICITE', rev: 'A', plannedDay: 430, final: 'SUBMITTED' },
    { docNumber: 'BE-VRD-DD-070', description: 'External networks & access road', discipline: 'INFRASTRUCTURE', rev: 'A', plannedDay: 360, actualDay: 371, final: 'APPROVED' },
  ],
  materials: [
    { ref: 'MAT-BE-001', description: 'Bentonite slurry for D-wall excavation', discipline: 'CIVIL', submittedBy: 'Batimex SARL', submitDay: 45, reviewDay: 52, final: 'APPROVED' },
    { ref: 'MAT-BE-003', description: 'Ready-mix concrete C35/45 (basement)', discipline: 'STRUCTURE', submittedBy: 'Batimex SARL', submitDay: 230, reviewDay: 238, final: 'APPROVED' },
    { ref: 'MAT-BE-005', description: 'Rebar FeE500 (certified mill)', discipline: 'STRUCTURE', submittedBy: 'Batimex SARL', submitDay: 225, reviewDay: 233, final: 'APPROVED' },
    { ref: 'MAT-BE-008', description: 'Structural steel S355 sections & plates', discipline: 'STRUCTURE', submittedBy: 'Batimex SARL', submitDay: 340, reviewDay: 352, final: 'APPROVED' },
    { ref: 'MAT-BE-010', description: 'PVC/hydrophilic waterstops', discipline: 'STRUCTURE', submittedBy: 'Batimex SARL', submitDay: 250, reviewDay: 256, final: 'APPROVED' },
    { ref: 'MAT-BE-012', description: 'Basement waterproofing (HDPE pre-applied)', discipline: 'ARCHITECTURE', submittedBy: 'Batimex SARL', submitDay: 255, reviewDay: 266, final: 'APPROVED' },
    { ref: 'MAT-BE-015', description: 'Curtain wall double glazing units', discipline: 'ARCHITECTURE', submittedBy: 'Façades & Verre Méditerranée', submitDay: 385, reviewDay: 398, final: 'RESUBMITTED', observations: 'Rev A rejected (U-value 1.9 > 1.6 W/m²K); Rev B resubmitted' },
    { ref: 'MAT-BE-018', description: 'Composite metal deck 1.0 mm', discipline: 'STRUCTURE', submittedBy: 'Batimex SARL', submitDay: 395, final: 'UNDER_REVIEW' },
    { ref: 'MAT-BE-021', description: 'Jet fans for car-park ventilation', discipline: 'MECANIQUE', submittedBy: 'Clima-Tech Algérie', submitDay: 405, final: 'SUBMITTED' },
  ],
  plans: [
    { number: 'BE-ARC-GA-100', title: 'Site plan & access', revision: 'C', format: 'A0', issuedBy: 'Studio Méditerranée Architecture', day: 180, status: 'APPROVED', remarks: 'For construction' },
    { number: 'BE-ARC-GA-110', title: 'Ground floor retail layout', revision: 'D', format: 'A0', issuedBy: 'Studio Méditerranée Architecture', day: 395, status: 'ISSUED', remarks: 'Anchor tenant changes' },
    { number: 'BE-ARC-GA-110', title: 'Ground floor retail layout', revision: 'C', format: 'A0', issuedBy: 'Studio Méditerranée Architecture', day: 240, status: 'SUPERSEDED', remarks: 'Superseded by Rev D' },
    { number: 'BE-STR-PL-200', title: 'D-wall panel layout & sections', revision: 'C', format: 'A0', issuedBy: 'Design & Build', day: 55, status: 'APPROVED', remarks: '' },
    { number: 'BE-STR-PL-220', title: 'Raft foundation reinforcement', revision: 'B', format: 'A0', issuedBy: 'Design & Build', day: 248, status: 'APPROVED', remarks: '' },
    { number: 'BE-STR-SD-221', title: 'Shop drawing – raft bay 3 reinforcement', revision: 'A', format: 'A1', issuedBy: 'Batimex SARL', day: 262, status: 'APPROVED', remarks: 'Approved' },
    { number: 'BE-STR-SD-310', title: 'Shop drawing – steel frame level 1 grid A–F', revision: 'A', format: 'A1', issuedBy: 'Batimex SARL', day: 402, status: 'DRAFT', remarks: 'Under review' },
    { number: 'BE-MEP-PL-400', title: 'HVAC schematic', revision: 'A', format: 'A1', issuedBy: 'Clima-Tech Algérie', day: 410, status: 'FOR_INFO', remarks: '' },
    { number: 'BE-VRD-PL-500', title: 'External networks', revision: 'A', format: 'A0', issuedBy: 'Routes & Réseaux Est', day: 371, status: 'APPROVED', remarks: '' },
  ],
  zones: MALL_ZONES,
  lots: [
    { lot: 'Lot 01', description: 'Demolition, earthworks & dewatering', weighting: 12, disciplines: ['CIVIL'] },
    { lot: 'Lot 02', description: 'Special foundations & structure', weighting: 36, disciplines: ['STRUCTURE'] },
    { lot: 'Lot 03', description: 'Envelope, waterproofing & finishes', weighting: 20, disciplines: ['ARCHITECTURE'] },
    { lot: 'Lot 04', description: 'HVAC, fire protection & vertical transport', weighting: 14, disciplines: ['MECANIQUE'] },
    { lot: 'Lot 05', description: 'Electrical, MV & BMS', weighting: 9, disciplines: ['ELECTRICITE'] },
    { lot: 'Lot 06', description: 'Plumbing & drainage', weighting: 3, disciplines: ['PLOMBERIE'] },
    { lot: 'Lot 07', description: 'External works & handover', weighting: 6, disciplines: ['INFRASTRUCTURE', 'GENERAL'] },
  ],
  deliveries: {
    STRUCTURE: [{ designation: 'Ready-mix concrete C35/45', unit: 'm³', qty: 90 }, { designation: 'Rebar FeE500', unit: 't', qty: 18 }, { designation: 'PVC waterstops', unit: 'ml', qty: 60 }],
    CIVIL: [{ designation: 'Gravel 15/25 (drainage layer)', unit: 't', qty: 80 }, { designation: 'Bentonite', unit: 't', qty: 4 }],
    ARCHITECTURE: [{ designation: 'HDPE waterproofing membrane', unit: 'm²', qty: 450 }, { designation: 'Protection board', unit: 'm²', qty: 300 }],
    PLOMBERIE: [{ designation: 'PVC sleeves Ø160', unit: 'u', qty: 40 }, { designation: 'Cast-iron drainage pipes', unit: 'ml', qty: 60 }],
    INFRASTRUCTURE: [{ designation: 'Concrete pipes Ø600', unit: 'ml', qty: 48 }, { designation: 'Manhole rings', unit: 'u', qty: 6 }],
    GENERAL: [{ designation: 'Site consumables', unit: 'lot', qty: 1 }],
  },
};

export const DEMO_PROJECTS = [AL_NOUR, BAB_EZZOUAR];

export const DEMO_USERS = [
  { key: 'admin', email: 'admin@buildtrack.com', name: 'System Admin', role: 'ADMIN', company: 'BuildTrack', phone: null as string | null, existing: true },
  { key: 'pm', email: 'pm@buildtrack.com', name: 'Ahmed Karim', role: 'PROJECT_MANAGER', company: 'Alpha Constructions', phone: '+213 (0)21 00 10 05', existing: true },
  { key: 'engineer', email: 'engineer@buildtrack.com', name: 'Sara Benali', role: 'SITE_ENGINEER', company: 'Alpha Constructions', phone: '+213 (0)21 00 10 09', existing: true },
  { key: 'consultant', email: 'consultant@buildtrack.com', name: 'Jean-Pierre Martin', role: 'CONSULTANT', company: 'BET Ingénierie', phone: '+213 (0)21 00 10 02', existing: true },
  { key: 'contractor', email: 'contractor@buildtrack.com', name: 'Rachid Ouali', role: 'CONTRACTOR', company: 'Thermo-Fluides Maghreb', phone: '+213 (0)21 00 10 06', existing: false },
  { key: 'client', email: 'client@buildtrack.com', name: 'Karim Haddadi', role: 'CLIENT_VIEWER', company: 'Groupe Immobilier Al Nour', phone: '+213 (0)21 00 10 01', existing: false },
];
