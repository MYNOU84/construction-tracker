/**
 * Deterministic generator for the WP5 demonstration data set.
 *
 * buildDemo(anchor) is a pure function of the anchor date: the same anchor always
 * yields the same records, ids and timestamps. Nothing here touches a database.
 * All people, companies and figures are fictional.
 */
import { DEMO_PROJECTS, DEMO_USERS, ProjectDef, ActDef, Discipline, PlantDef } from './projects';
import { getWeekNumber } from '../utils/helpers';

export const DEFAULT_ANCHOR = '2026-11-24';
const DAY = 86_400_000;
const DAILY_WINDOW = 91;

// ─── deterministic randomness ─────────────────────────────────────────────────
function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
/** Value in [0,1) derived from the keys (FNV-1a + one mulberry32 step). */
export function rnd(...keys: (string | number)[]): number {
  let t = (fnv(keys.join('|')) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T>(arr: T[], ...keys: (string | number)[]): T => arr[Math.floor(rnd(...keys) * arr.length)];
const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (x: number) => x * x * (3 - 2 * x);
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const pad = (n: number, w = 3) => String(n).padStart(w, '0');
const fmtQty = (n: number) => (n >= 50 ? Math.round(n) : r1(n));

// ─── shared vocabularies ──────────────────────────────────────────────────────
const RISK_CAT: Record<string, string> = {
  PROCUREMENT: 'SUPPLY_CHAIN', SCHEDULE: 'WEATHER', RESOURCES: 'HUMAN_RESOURCES', TECHNICAL: 'GEOTECHNICAL',
  HSE: 'GENERAL', DESIGN: 'GENERAL', QUALITY: 'GENERAL', REGULATORY: 'REGULATORY', FINANCIAL: 'FINANCIAL',
};
const DISCIPLINES: Discipline[] = ['STRUCTURE', 'ARCHITECTURE', 'MECANIQUE', 'ELECTRICITE', 'PLOMBERIE', 'CIVIL', 'INFRASTRUCTURE', 'GENERAL'];
const POSITIONS: Record<Discipline, [string, number][]> = {
  STRUCTURE: [['Steel Fixer', 0.32], ['Formwork', 0.3], ['Mason', 0.12], ['Carpenter', 0.08], ['Helper', 1]],
  CIVIL: [['Driver', 0.35], ['Mason', 0.15], ['Helper', 1]],
  ARCHITECTURE: [['Mason', 0.35], ['Tiler', 0.2], ['Painter', 0.15], ['Helper', 1]],
  MECANIQUE: [['Welder', 0.45], ['Plumber', 0.15], ['Helper', 1]],
  ELECTRICITE: [['Electrician', 0.7], ['Helper', 1]],
  PLOMBERIE: [['Plumber', 0.7], ['Helper', 1]],
  INFRASTRUCTURE: [['Driver', 0.25], ['Mason', 0.3], ['Helper', 1]],
  GENERAL: [['Driver', 0.2], ['Carpenter', 0.2], ['Helper', 1]],
};
// Algiers monthly climate (index = UTC month)
const RAIN_P = [0.34, 0.3, 0.26, 0.22, 0.14, 0.05, 0.02, 0.04, 0.12, 0.22, 0.3, 0.35];
const TEMP = [11.5, 12, 13.8, 15.6, 18.8, 22.4, 25.4, 26.2, 23.8, 20.2, 16.2, 13];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const HOLDS: Record<string, number> = { A27: 640, B36: 405 };

const FIRST = ['Amine', 'Yacine', 'Sofiane', 'Karim', 'Walid', 'Nabil', 'Mourad', 'Hichem', 'Bilal', 'Farid', 'Rafik', 'Djamel', 'Omar', 'Salim', 'Hamza', 'Anis', 'Riad', 'Mehdi', 'Lotfi', 'Khaled', 'Samir', 'Yassine', 'Adel', 'Fouad', 'Nassim', 'Tarek', 'Lyes', 'Ilyes', 'Redouane', 'Zakaria', 'Amel', 'Lina', 'Meriem', 'Imane', 'Sonia', 'Nesrine'];
const LAST = ['Benali', 'Haddad', 'Boudiaf', 'Mansouri', 'Belkacem', 'Cherif', 'Saadi', 'Ouali', 'Ferhat', 'Zerrouki', 'Brahimi', 'Kaci', 'Hamidi', 'Toumi', 'Meziane', 'Rahmani', 'Bouzid', 'Larbi', 'Amrani', 'Slimani', 'Guerfi', 'Bensalem', 'Aouadi', 'Djebbar', 'Khelifi', 'Mekki', 'Yahiaoui', 'Bekkouche', 'Taleb', 'Hadjadj'];

const TOOLBOX = ['Working at height and harness inspection', 'Safe use of hand-held power tools', 'Manual handling and back care', 'Housekeeping and access routes', 'Hot works permit and fire watch', 'Electrical isolation (LOTO)', 'Lifting operations and banksman signals', 'Heat stress and hydration', 'Excavation edge protection', 'PPE: correct use and inspection', 'Scaffold tagging system', 'Wet-weather slips and trips'];
const HSE_REMARKS = ['Scaffold tags checked on all active façades', 'Site walk with HSE manager – minor housekeeping points closed', 'Fire extinguishers inspected at all floors', 'Edge protection reinstated at stair cores', 'First-aid kits replenished', 'Dust suppression applied on haul roads', 'Barriers installed around open service trenches', 'Visitor induction register up to date'];
const ISSUES: { d: string; s: string; a: string }[] = [
  { d: 'Temporary water supply pressure low on upper floors', s: 'LOW', a: 'Booster pump relocated' },
  { d: 'Drawing clash between sprinkler main and cable tray', s: 'MEDIUM', a: 'RFI raised to consultant' },
  { d: 'Concrete truck arrived outside slump tolerance', s: 'MEDIUM', a: 'Load rejected, supplier notified' },
  { d: 'Access to work front blocked by stored material', s: 'LOW', a: 'Storage area reorganised' },
  { d: 'Missing sleeves at slab penetration', s: 'MEDIUM', a: 'Core drilling approved by structural engineer' },
  { d: 'Subcontractor crew below agreed headcount', s: 'MEDIUM', a: 'Formal notice issued; recovery plan requested' },
  { d: 'Damaged delivery of finishing material', s: 'LOW', a: 'Damaged items quarantined and replacement ordered' },
  { d: 'Tower crane availability conflict between trades', s: 'LOW', a: 'Daily crane schedule agreed at coordination meeting' },
];
const PENDING = [
  { a: 'Submit revised method statement for façade works', r: 'Contractor' },
  { a: 'Close out open items from consultant site walk', r: 'Site Manager' },
  { a: 'Confirm delivery date of next material batch', r: 'Procurement' },
  { a: 'Issue updated 3-week look-ahead programme', r: 'Planning Engineer' },
  { a: 'Respond to pending RFIs', r: 'Consultant' },
  { a: 'Provide calibration certificates for test equipment', r: 'QA/QC Engineer' },
  { a: 'Update HSE induction register', r: 'HSE Manager' },
  { a: 'Agree inspection slot for MEP first-fix', r: 'MEP Coordinator' },
];
const CONSULTANT_COMMENTS = ['Noted. Please attach the pour records for the slab works mentioned.', 'Good progress. Housekeeping on the upper floors needs attention.', 'Inspection results accepted. Provide the material delivery notes with the weekly report.', 'Please confirm the recovery measures for the delayed work front.', 'Photos are helpful – keep the same angles for the weekly comparison.', 'Manpower figures agree with the gate register. Approved.'];

export const PHOTO_SCENES: Record<string, { file: string; caption: string; location: string }[]> = {
  'al-nour': [
    { file: 'site-overview', caption: 'General view of Blocks A–C from the gatehouse', location: 'Site' },
    { file: 'facade-render', caption: 'External render in progress – Block A south façade', location: 'Façades – Block A' },
    { file: 'masonry', caption: 'Masonry partitions – Block C upper floors', location: 'Block C' },
    { file: 'tiling', caption: 'Porcelain floor tiling in apartment units', location: 'Block A' },
    { file: 'electrical-riser', caption: 'LV cabling in electrical riser', location: 'Block A – riser 2' },
    { file: 'roof-waterproofing', caption: 'Roof waterproofing membrane and insulation', location: 'Roof' },
    { file: 'lift-shaft', caption: 'Lift guide rails installation', location: 'Lift cores' },
    { file: 'scaffold', caption: 'Façade scaffold with inspection tags', location: 'Façades' },
  ],
  'bab-ezzouar': [
    { file: 'site-overview', caption: 'General view of the excavation and podium works', location: 'Site' },
    { file: 'dwall', caption: 'Diaphragm wall capping beam', location: 'Perimeter' },
    { file: 'excavation', caption: 'Bulk excavation at formation level', location: 'Basement' },
    { file: 'raft-pour', caption: 'Raft foundation pour – bay 4', location: 'B2' },
    { file: 'b1-slab', caption: 'B1 slab formwork and reinforcement', location: 'B1' },
    { file: 'rebar', caption: 'Rebar inspection before pour', location: 'GF' },
    { file: 'dewatering', caption: 'Dewatering wells and monitoring piezometers', location: 'Basement' },
    { file: 'sleeves', caption: 'Embedded drainage sleeves before concreting', location: 'B1' },
  ],
};

// ─── output types ─────────────────────────────────────────────────────────────
type Row = Record<string, any>;
export interface DemoBundle {
  def: ProjectDef;
  short: string;
  anchorDay: number;
  project: Row;
  members: Row[];
  activities: Row[];
  milestones: Row[];
  dailyReports: Row[];
  photos: Row[];
  comments: Row[];
  weeklyReports: Row[];
  monthlyReports: Row[];
  risks: Row[];
  ncrs: Row[];
  plant: Row[];
  resources: Row[];
}
export interface DemoData {
  anchor: string;
  users: { id: string; key: string; email: string; name: string; role: string; company: string; phone: string | null; existing: boolean }[];
  bundles: DemoBundle[];
}

// ─── per-project model ────────────────────────────────────────────────────────
interface ActModel { def: ActDef; idx: number; aStart: number; aDur: number; hold?: number; weight: number }

class Model {
  readonly startMs: number;
  readonly T: number;
  readonly acts: ActModel[];
  readonly short: string;
  private dayCache = new Map<number, DayState>();

  constructor(readonly p: ProjectDef, anchorMs: number) {
    this.startMs = Date.parse(p.start + 'T00:00:00Z');
    this.T = Math.round((anchorMs - this.startMs) / DAY);
    this.short = p.slug.split('-').map(s => s[0]).join('').toUpperCase();
    this.acts = p.activities.map((def, idx) => {
      const r = rnd(p.seed, def.key, 'pace');
      let aStart: number, aDur: number;
      if (rnd(p.seed, def.key, 'ahead') < 0.18) { aStart = Math.max(0, def.start - 2); aDur = Math.round(def.dur * 0.95); }
      else {
        aStart = def.start + Math.round(p.lagDays * (0.3 + r));
        aDur = Math.round(def.dur * p.stretch * (0.92 + 0.2 * r));
      }
      return { def, idx, aStart, aDur, hold: HOLDS[def.key], weight: def.dur * def.crew };
    });
  }

  at(t: number, hour = 12, minute = 0): Date { return new Date(this.startMs + t * DAY + hour * 3_600_000 + minute * 60_000); }
  isWork(t: number): boolean { return this.at(t).getUTCDay() !== 5; }
  prevWork(t: number): number { let s = t - 1; while (!this.isWork(s)) s--; return s; }
  nextWork(t: number): number { let s = t + 1; while (!this.isWork(s)) s++; return s; }
  dayOf(d: Date): number { return Math.floor((d.getTime() - this.startMs) / DAY); }

  planned(a: ActModel, t: number): number { return 100 * smooth(clamp((t - a.def.start) / a.def.dur)); }
  actual(a: ActModel, t: number): number {
    const tt = a.hold !== undefined ? Math.min(t, a.hold) : t;
    if (tt < a.aStart) return 0;
    return 100 * smooth(clamp((tt - a.aStart) / a.aDur));
  }
  status(a: ActModel, t: number): string {
    const ac = this.actual(a, t), pl = this.planned(a, t);
    if (ac >= 99.999) return 'COMPLETED';
    if (a.hold !== undefined && t > a.hold) return 'ON_HOLD';
    if (ac > 0) return pl - ac > 12 ? 'DELAYED' : 'IN_PROGRESS';
    return pl > 0 ? 'DELAYED' : 'NOT_STARTED';
  }
  lotOf(d: Discipline) { return this.p.lots.find(l => l.disciplines.includes(d)) ?? this.p.lots[this.p.lots.length - 1]; }

  progress(t: number, kind: 'actual' | 'planned') {
    const val = (a: ActModel) => (kind === 'actual' ? this.actual(a, t) : this.planned(a, t));
    const wavg = (list: ActModel[]) => {
      const w = list.reduce((s, a) => s + a.weight, 0);
      return w ? list.reduce((s, a) => s + a.weight * val(a), 0) / w : 0;
    };
    const byDisc: Record<string, number> = {};
    for (const d of DISCIPLINES) {
      const list = this.acts.filter(a => a.def.discipline === d);
      if (list.length) byDisc[d] = r1(wavg(list));
    }
    const byLot = this.p.lots.map(l => wavg(this.acts.filter(a => l.disciplines.includes(a.def.discipline))));
    const tw = this.p.lots.reduce((s, l) => s + l.weighting, 0);
    const overall = this.p.lots.reduce((s, l, i) => s + l.weighting * byLot[i], 0) / tw;
    return { overall: r1(overall), byDisc, byLot: byLot.map(r1) };
  }
  /** Simple average of activity progress per discipline (same rule as the server's monthly generator). */
  discAvg(t: number, d: string): number {
    const list = this.acts.filter(a => a.def.discipline === d);
    return list.length ? Math.round(list.reduce((s, a) => s + this.actual(a, t), 0) / list.length) : 0;
  }
  statusCounts(t: number) {
    const c = { completed: 0, delayed: 0, ongoing: 0, notStarted: 0, onHold: 0 };
    for (const a of this.acts) {
      const s = this.status(a, t);
      if (s === 'COMPLETED') c.completed++; else if (s === 'DELAYED') c.delayed++;
      else if (s === 'IN_PROGRESS') c.ongoing++; else if (s === 'ON_HOLD') c.onHold++; else c.notStarted++;
    }
    return c;
  }
  plantOn(t: number): PlantDef[] { return this.p.plant.filter(pl => pl.onDay <= t && (pl.offDay === undefined || pl.offDay > t)); }

  day(t: number): DayState {
    let s = this.dayCache.get(t);
    if (!s) { s = dayState(this, t); this.dayCache.set(t, s); }
    return s;
  }
}

// ─── one working day ──────────────────────────────────────────────────────────
interface ActiveAct { a: ActModel; delta: number; crew: number; produced: number; outdoor: boolean }
interface DayState {
  t: number; weather: string; temperature: number; humidity: number; windSpeed: number; conditions: string;
  rain: boolean; active: ActiveAct[]; manpower: Row[]; total: number; direct: number; indirect: number;
  equipment: Row[]; materials: Row[]; tasks: Row[]; delays: Row[]; issues: Row[]; risks: Row[];
  pending: Row[]; inspections: Row[]; hse: Row; toolbox: string;
}

function dayState(m: Model, t: number): DayState {
  const p = m.p, seed = p.seed, date = m.at(t), month = date.getUTCMonth();
  // weather
  const wr = rnd(seed, 'wx', t);
  const rain = wr < RAIN_P[month];
  const w2 = rnd(seed, 'wx2', t);
  const weather = rain ? 'RAINY' : w2 < 0.1 ? 'WINDY' : w2 < 0.38 ? 'CLOUDY' : 'SUNNY';
  const temperature = r1(TEMP[month] + p.climateOffset + (rnd(seed, 'temp', t) - 0.5) * 4 - (rain ? 1.8 : 0));
  const humidity = Math.round((rain ? 78 : 58) + rnd(seed, 'hum', t) * 16);
  const windSpeed = Math.round(weather === 'WINDY' ? 32 + rnd(seed, 'wind', t) * 14 : 6 + rnd(seed, 'wind', t) * 14);
  const conditions = {
    RAINY: 'Rain showers; external works suspended for part of the shift',
    WINDY: 'Strong gusts; crane lifts restricted above 50 km/h',
    CLOUDY: 'Overcast, dry',
    SUNNY: 'Clear and dry',
  }[weather]!;

  // active activities
  const prev = m.prevWork(t);
  const active: ActiveAct[] = [];
  for (const a of m.acts) {
    const now = m.actual(a, t), before = m.actual(a, prev);
    if (now - before <= 0.001) continue;
    const outdoor = /^[1247]/.test(a.def.phase) || ['External', 'Façades', 'Roof', 'Perimeter'].includes(a.def.area);
    let crew = Math.max(2, Math.round(a.def.crew * (0.85 + 0.3 * rnd(seed, 'crew', a.def.key, t))));
    if (rain && outdoor) crew = Math.max(1, Math.round(crew / 2));
    const produced = (a.def.qty * (now - before)) / 100 * (rain && outdoor ? 0.4 : 1);
    active.push({ a, delta: now - before, crew, produced, outdoor });
  }

  // manpower
  const mp = new Map<string, Row>();
  const add = (company: string, position: string, type: string, np: number) => {
    if (np <= 0) return;
    const k = `${type}|${company}|${position}`;
    const e = mp.get(k);
    if (e) e.np += np; else mp.set(k, { position, type, company, np, hours: type === 'INDIRECT' ? 9 : 8 });
  };
  for (const ind of p.indirect) add(p.contractor, ind.position, 'INDIRECT', ind.np);
  for (const x of active) {
    const company = p.companies[x.a.def.discipline];
    let left = x.crew;
    if (x.crew >= 4) { add(company, 'Foreman', 'DIRECT', 1); left--; }
    const spec = POSITIONS[x.a.def.discipline];
    spec.forEach(([pos, frac], i) => {
      const n = i === spec.length - 1 ? left : Math.min(left, Math.round(x.crew * frac));
      add(company, pos, 'DIRECT', n); left -= n;
    });
  }
  const cranes = m.plantOn(t).filter(pl => pl.category === 'LIFTING').length;
  if (cranes) add(p.contractor, 'Crane Operator', 'DIRECT', cranes);
  const manpower = [...mp.values()].sort((a, b) => (a.type === b.type ? a.company.localeCompare(b.company) || a.position.localeCompare(b.position) : a.type === 'INDIRECT' ? -1 : 1));
  const indirect = manpower.filter(e => e.type === 'INDIRECT').reduce((s, e) => s + e.np, 0);
  const total = manpower.reduce((s, e) => s + e.np, 0);

  // equipment
  const near = t >= m.T - 6;
  const equipment = m.plantOn(t).map(pl => {
    let status = 'OPERATIONAL';
    if (near && (pl.status === 'BREAKDOWN' || pl.status === 'UNDER_MAINTENANCE')) status = pl.status;
    else if (rnd(seed, 'idle', pl.name, t) < 0.08 || (rain && pl.category === 'LIFTING' && weather === 'WINDY')) status = 'IDLE';
    const hours = status === 'OPERATIONAL' ? r1(pl.hourly * (rain ? 0.6 : 1)) : 0;
    return { name: pl.name, count: 1, hours, status };
  });

  // materials
  const discs = [...new Set(active.map(x => x.a.def.discipline))];
  const materials: Row[] = [];
  for (const d of discs) for (const it of p.deliveries[d] ?? []) {
    if (rnd(seed, 'mat', it.designation, t) >= 0.4) continue;
    const partial = rnd(seed, 'matp', it.designation, t) < 0.1;
    const qtyDelivered = partial ? Math.round(it.qty * (0.5 + 0.3 * rnd(seed, 'matq', t))) : it.qty;
    materials.push({ designation: it.designation, unit: it.unit, qtyExpected: it.qty, qtyDelivered, remarks: partial ? 'Partial delivery – balance expected next day' : 'Delivered and checked against delivery note' });
  }

  // tasks
  const tasks = active.map(x => ({
    lot: m.lotOf(x.a.def.discipline).lot, area: x.a.def.area, description: x.a.def.name,
    resources: `${x.crew} workers – ${p.companies[x.a.def.discipline]}`, unit: x.a.def.unit,
    producedQty: fmtQty(x.produced), status: m.actual(x.a, t) >= 99.999 ? 'COMPLETED' : 'IN_PROGRESS',
  }));

  // delays
  const delays: Row[] = [];
  if (rain && active.some(x => x.outdoor)) delays.push({ description: 'Rain – external works suspended (façades, roof, external works)', duration: `${2 + Math.floor(rnd(seed, 'rd', t) * 4)} h`, responsibility: 'Force majeure (weather)', impact: 'MEDIUM' });
  if (materials.length && rnd(seed, 'late', t) < 0.07) {
    const mt = pick(materials, seed, 'latem', t);
    delays.push({ description: `Late delivery of ${mt.designation}`, duration: '1/2 day', responsibility: 'Supplier', impact: 'LOW' });
  }

  // issues, risks, pending actions, inspections
  const issues: Row[] = [];
  if (rnd(seed, 'iss', t) < 0.25) {
    const it = pick(ISSUES, seed, 'issp', t);
    issues.push({ description: it.d, severity: it.s, action: it.a, status: t < m.T - 5 ? 'CLOSED' : 'OPEN' });
  }
  const openRisks = p.risks.filter(r => r.raisedDay <= t && (r.status === 'OPEN' || r.dueDay > t));
  const risks = openRisks
    .sort((a, b) => b.p * b.i - a.p * a.i).slice(0, 2)
    .map(r => ({ description: r.title, level: r.p * r.i >= 15 ? 'HIGH' : r.p * r.i >= 8 ? 'MEDIUM' : 'LOW', action: r.mitigation }));
  const pending = [0, 1].filter(i => i === 0 || rnd(seed, 'pa2', t) < 0.5).map(i => {
    const it = pick(PENDING, seed, 'pa', i, t);
    return { action: it.a, responsible: it.r, dueDate: isoDate(m.at(t + 3 + Math.floor(rnd(seed, 'pad', i, t) * 8))) };
  });
  const inspector = p.intervenants[1]?.contact ?? 'Consultant';
  const inspections = active.length ? [0, 1].filter(i => i === 0 || rnd(seed, 'in2', t) < 0.45).map(i => {
    const x = pick(active, seed, 'insp', i, t);
    const r = rnd(seed, 'insr', i, t);
    const kind = x.a.def.discipline === 'STRUCTURE' ? 'Rebar and formwork inspection before pour' : x.a.def.discipline === 'ARCHITECTURE' ? 'Workmanship inspection' : 'Installation inspection';
    return { description: `${kind} – ${x.a.def.name} (${x.a.def.area})`, result: r < 0.04 ? 'FAIL' : r < 0.16 ? 'CONDITIONAL' : 'PASS', inspector };
  }) : [];

  // HSE
  const toolbox = pick(TOOLBOX, seed, 'tb', t);
  const inductions = Math.floor(rnd(seed, 'ind', t) * 4);
  const lti = rnd(seed, 'lti', t) < 0.0025 ? 1 : 0;
  const nlti = rnd(seed, 'nlti', t) < 0.012 ? 1 : 0;
  const subTotal = manpower.filter(e => e.type === 'DIRECT' && e.company !== p.contractor).reduce((s, e) => s + e.np, 0);
  const hse = {
    accidentsWithLTI: lti, accidentsWithLTIComment: lti ? 'Hand injury during formwork handling – worker referred to clinic' : '',
    accidentsWithoutLTI: nlti, accidentsWithoutLTIComment: nlti ? 'Minor cut treated on site (first aid)' : '',
    recruitmentMedicalCheckup: inductions, recruitmentMedicalCheckupComment: inductions ? 'New workers cleared by occupational doctor' : '',
    periodicMedicalCheckup: rnd(seed, 'pmc', t) < 0.08 ? 2 + Math.floor(rnd(seed, 'pmcn', t) * 5) : 0,
    fireIncident: 0,
    accidentWithMaterialDamage: rnd(seed, 'dmg', t) < 0.01 ? 1 : 0,
    safetyViolationNotice: rnd(seed, 'svn', t) < 0.06 ? 1 : 0,
    safetyViolationNoticeComment: '',
    safetyInductions: inductions, safetyInductionsComment: inductions ? 'Site induction for new starters' : '',
    toolboxTalks: 1 + (rnd(seed, 'tb2', t) < 0.3 ? 1 : 0), toolboxTalksComment: toolbox,
    specificTraining: rnd(seed, 'trn', t) < 0.08 ? 1 : 0, specificTrainingComment: '',
    lostWorkingHours: lti ? 16 : 0,
    remarks: [pick(HSE_REMARKS, seed, 'rem', t)],
    nearMisses: rnd(seed, 'nm', t) < 0.05 ? 1 : 0,
    subcontractingPct: total ? Math.round((subTotal / total) * 100) : 0,
  };
  if (hse.safetyViolationNotice) hse.safetyViolationNoticeComment = 'Worker without harness on scaffold – removed and re-briefed';
  if (hse.specificTraining) hse.specificTrainingComment = 'Work-at-height refresher for façade crews';

  return {
    t, weather, temperature, humidity, windSpeed, conditions, rain, active, manpower, total,
    direct: total - indirect, indirect, equipment, materials, tasks, delays, issues, risks, pending, inspections, hse, toolbox,
  };
}

// ─── studies / materials "as of" a day ────────────────────────────────────────
function studiesAt(m: Model, t: number): Row[] {
  return m.p.studies.filter(s => s.plannedDay - 60 <= t).map((s, i) => {
    let status: string, progress: number;
    if (s.actualDay !== undefined && t >= s.actualDay) {
      if (t >= s.actualDay + 10 || s.final === 'SUBMITTED') { status = s.final; progress = s.final === 'APPROVED' ? 100 : s.final === 'REJECTED' ? 80 : 95; }
      else { status = 'SUBMITTED'; progress = 95; }
    } else if (t < s.plannedDay - 30) { status = 'NOT_STARTED'; progress = 0; }
    else { status = 'IN_PROGRESS'; progress = Math.round(clamp((t - (s.plannedDay - 30)) / 30, 0.15, 0.9) * 100); }
    return {
      id: `${m.p.slug}-st-${i + 1}`, docNumber: s.docNumber, description: s.description, discipline: s.discipline, rev: s.rev,
      plannedDate: isoDate(m.at(s.plannedDay)), actualDate: s.actualDay !== undefined && t >= s.actualDay ? isoDate(m.at(s.actualDay)) : '',
      status, progress, observations: status === s.final ? (s.observations ?? '') : '',
    };
  });
}
function materialsAt(m: Model, t: number): Row[] {
  return m.p.materials.filter(x => x.submitDay <= t).map((x, i) => {
    const reviewed = x.reviewDay !== undefined && t >= x.reviewDay;
    const status = reviewed || ['SUBMITTED', 'UNDER_REVIEW'].includes(x.final) && t >= x.submitDay + 3 ? x.final : 'SUBMITTED';
    return {
      id: `${m.p.slug}-mt-${i + 1}`, ref: x.ref, description: x.description, discipline: x.discipline, submittedBy: x.submittedBy,
      submissionDate: isoDate(m.at(x.submitDay)), reviewDate: reviewed ? isoDate(m.at(x.reviewDay!)) : '',
      status, observations: status === x.final ? (x.observations ?? '') : '',
    };
  });
}

// ─── project build ────────────────────────────────────────────────────────────
function buildProject(p: ProjectDef, anchorMs: number, users: DemoData['users']): DemoBundle {
  const m = new Model(p, anchorMs);
  const T = m.T, seed = p.seed, short = m.short;
  const uid = (k: string) => users.find(u => u.key === k)!.id;
  const created = m.at(0, 8);
  const stamp = (t: number, h = 12) => ({ createdAt: m.at(t, h), updatedAt: m.at(Math.min(t, T), h) });

  // activities
  const activities = m.acts.map(a => {
    const ac = m.actual(a, T), st = m.status(a, T);
    return {
      id: `demo-act-${short.toLowerCase()}-${a.def.key.toLowerCase()}`, projectId: p.id, name: a.def.name,
      description: `${a.def.qty.toLocaleString('en-US')} ${a.def.unit} – crew of ${a.def.crew} (${p.companies[a.def.discipline]})`,
      discipline: a.def.discipline, area: a.def.area, phase: a.def.phase, wbsCode: `${short}.${a.def.phase.split(' ')[0]}.${a.def.key}`,
      plannedStart: m.at(a.def.start, 0), plannedEnd: m.at(a.def.start + a.def.dur, 0),
      actualStart: ac > 0 ? m.at(a.aStart, 0) : null, actualEnd: st === 'COMPLETED' ? m.at(a.aStart + a.aDur, 0) : null,
      plannedProgress: r1(m.planned(a, T)), actualProgress: r1(ac), status: st, priority: a.def.priority ?? 'MEDIUM',
      dependencies: JSON.stringify((a.def.deps ?? []).map(k => `demo-act-${short.toLowerCase()}-${k.toLowerCase()}`)),
      createdAt: created, updatedAt: m.at(T, 7),
    };
  });

  // milestones
  const milestones = p.milestones.map(ms => {
    const a = m.acts.find(x => x.def.key === ms.act)!;
    const plannedDay = a.def.start + a.def.dur, done = m.actual(a, T) >= 99.999;
    const forecast = a.aStart + a.aDur;
    const status = done ? 'ACHIEVED' : plannedDay < T ? 'DELAYED' : forecast - plannedDay > 20 || a.hold !== undefined ? 'AT_RISK' : 'PENDING';
    return {
      id: `demo-ms-${short.toLowerCase()}-${ms.key.toLowerCase()}`, projectId: p.id, name: ms.name, description: ms.description,
      plannedDate: m.at(plannedDay, 0), actualDate: done ? m.at(forecast, 0) : null, status, createdAt: created, updatedAt: m.at(T, 7),
    };
  });

  // daily reports (recent window)
  const dailyReports: Row[] = [], photos: Row[] = [], comments: Row[] = [];
  const winStart = Math.max(0, T - DAILY_WINDOW + 1);
  let seq = 0;
  for (let t = 0; t < winStart; t++) if (m.isWork(t)) seq++;
  const days: number[] = [];
  for (let t = winStart; t <= T; t++) if (m.isWork(t)) days.push(t);
  const newestFirst = [...days].reverse();
  for (const t of days) {
    seq++;
    const s = m.day(t), date = m.at(t);
    const rank = newestFirst.indexOf(t);
    const status = rank < 2 ? 'SUBMITTED' : short === 'BE' && rank === 9 ? 'REJECTED' : 'APPROVED';
    const id = `demo-dr-${short.toLowerCase()}-${pad(seq, 4)}`;
    const top = [...s.active].sort((a, b) => b.crew - a.crew).slice(0, 3).map(x => x.a.def.name.toLowerCase());
    const next = m.nextWork(t);
    const upcoming = m.acts.filter(a => a.aStart > t && a.aStart <= t + 10).map(a => a.def.name);
    dailyReports.push({
      id, projectId: p.id, reportDate: date, reportNumber: seq, weekNumber: getWeekNumber(date),
      weather: s.weather, temperature: s.temperature, humidity: s.humidity, windSpeed: s.windSpeed, conditions: s.conditions,
      generalSummary: `Working day ${seq} of ${p.name}. ${s.total} personnel on site (${s.direct} direct, ${s.indirect} indirect) on ${s.active.length} work fronts. Main works: ${top.join('; ') || 'site preparation'}. ${s.rain ? 'Rain interrupted external works; crews were redeployed to internal areas.' : 'All planned work fronts were open.'}`,
      workCompleted: s.tasks.map(k => `• ${k.description} (${k.area}): ${k.producedQty} ${k.unit}`).join('\n'),
      plannedWork: [...m.acts.filter(a => m.actual(a, next) > m.actual(a, t)).slice(0, 6).map(a => `• Continue ${a.def.name} (${a.def.area})`), ...upcoming.slice(0, 2).map(n => `• Prepare start of ${n}`)].join('\n'),
      manpowerData: JSON.stringify(s.manpower), totalManpower: s.total,
      equipmentData: JSON.stringify(s.equipment), materialsData: JSON.stringify(s.materials), activitiesData: JSON.stringify(s.tasks),
      delays: JSON.stringify(s.delays), issues: JSON.stringify(s.issues), risks: JSON.stringify(s.risks),
      pendingActions: JSON.stringify(s.pending), inspections: JSON.stringify(s.inspections), hseData: JSON.stringify(s.hse),
      safetyNotes: `Toolbox talk: ${s.toolbox}. ${s.hse.remarks[0]}.`,
      incidents: s.hse.accidentsWithLTI + s.hse.accidentsWithoutLTI, nearMisses: s.hse.nearMisses, toolboxTalks: s.hse.toolboxTalks,
      status, submittedBy: uid('engineer'), submittedAt: m.at(t, 18),
      approvedBy: status === 'APPROVED' ? uid('consultant') : null, approvedAt: status === 'APPROVED' ? m.at(t + 1, 9) : null,
      createdAt: m.at(t, 17), updatedAt: status === 'APPROVED' ? m.at(t + 1, 9) : m.at(t, 18),
    });
    if (rank < 12) {
      const scenes = PHOTO_SCENES[p.slug];
      const i0 = Math.floor(rnd(seed, 'ph', t) * scenes.length);
      [i0, (i0 + 3) % scenes.length].forEach((si, j) => {
        const sc = scenes[si];
        photos.push({ id: `${id}-ph${j + 1}`, url: `/demo-docs/${p.slug}/photos/${sc.file}.svg`, fileName: `${sc.file}.svg`, caption: sc.caption, takenAt: m.at(t, 10 + j * 3), location: sc.location, fileSize: null, dailyReportId: id, ncrId: null, createdAt: m.at(t, 17) });
      });
    }
    if (status === 'REJECTED') comments.push({ id: `${id}-c1`, content: 'Rejected: manpower table does not match the gate register for Thermo/finishes crews and the rebar inspection result is missing. Please correct and resubmit.', userId: uid('consultant'), dailyReportId: id, createdAt: m.at(t + 1, 9), updatedAt: m.at(t + 1, 9) });
    else if (status === 'APPROVED' && rnd(seed, 'cm', t) < 0.14) comments.push({ id: `${id}-c1`, content: pick(CONSULTANT_COMMENTS, seed, 'cmt', t), userId: uid('consultant'), dailyReportId: id, createdAt: m.at(t + 1, 8, 30), updatedAt: m.at(t + 1, 8, 30) });
    if (rank === 0) comments.push({ id: `${id}-c2`, content: 'Reviewed – please keep the recovery actions on the delayed fronts visible in tomorrow’s report.', userId: uid('pm'), dailyReportId: id, createdAt: m.at(t, 19), updatedAt: m.at(t, 19) });
  }

  // weekly reports – full ISO weeks inside the daily window
  const weeklyReports: Row[] = [];
  const mondays: number[] = [];
  for (let t = winStart; t + 6 <= T; t++) if (m.at(t).getUTCDay() === 1) mondays.push(t);
  mondays.forEach((mon, wi) => {
    const sun = mon + 6, wd = days.filter(t => t >= mon && t <= sun), states = wd.map(t => m.day(t));
    const act = m.progress(sun, 'actual'), plan = m.progress(sun, 'planned'), before = m.progress(mon - 1, 'actual'), planBefore = m.progress(mon - 1, 'planned');
    const manpowerByDay: Record<string, number> = {};
    states.forEach(s => { manpowerByDay[isoDate(m.at(s.t))] = s.total; });
    const breakdown: Record<string, { direct: number; indirect: number; total: number }> = {};
    states.forEach(s => s.manpower.forEach(e => {
      const b = breakdown[e.company] ??= { direct: 0, indirect: 0, total: 0 };
      if (e.type === 'INDIRECT') b.indirect += e.np; else b.direct += e.np;
      b.total += e.np;
    }));
    const c = m.statusCounts(sun);
    const wx: Record<string, number> = {};
    states.forEach(s => { wx[s.weather] = (wx[s.weather] ?? 0) + 1; });
    const temps = states.map(s => s.temperature);
    const completedIn = m.acts.filter(a => m.actual(a, sun) >= 99.999 && m.actual(a, mon - 1) < 99.999).map(a => a.def.name);
    const msIn = milestones.filter(x => x.actualDate && x.actualDate >= m.at(mon, 0) && x.actualDate <= m.at(sun, 23)).map(x => x.name);
    const ncrIn = p.ncrs.filter(n => n.raisedDay >= mon && n.raisedDay <= sun).map(n => n.title);
    const rainDays = states.filter(s => s.rain).length;
    const total = states.reduce((s, x) => s + x.total, 0), peak = Math.max(0, ...states.map(s => s.total));
    const spi = plan.overall ? r2(act.overall / plan.overall) : 1;
    const busiest = new Map<string, number>();
    states.forEach(s => s.active.forEach(x => busiest.set(x.a.def.name, (busiest.get(x.a.def.name) ?? 0) + x.crew)));
    const topFronts = [...busiest.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(e => e[0]);
    const nextFronts = m.acts.filter(a => m.actual(a, sun + 7) > m.actual(a, sun)).map(a => a.def.name).slice(0, 6);
    const lotsData = p.lots.map((l, i) => {
      const wk = act.byLot[i] - before.byLot[i], pw = plan.byLot[i] - planBefore.byLot[i];
      return {
        lotNumber: l.lot, description: l.description, unit: '%', budgetQty: Math.round((p.budget * l.weighting) / 100),
        previousCumulPct: before.byLot[i], weeklyPct: r1(wk), newCumulPct: act.byLot[i], remainingPct: r1(100 - act.byLot[i]),
        kpiEfficiency: pw > 0.05 ? Math.round((wk / pw) * 100) : 100,
      };
    });
    const iso = getWeekNumber(m.at(mon)), year = m.at(mon + 3).getUTCFullYear();
    weeklyReports.push({
      id: `demo-wr-${short.toLowerCase()}-${year}-${pad(iso, 2)}`, projectId: p.id, weekNumber: iso, year,
      startDate: m.at(mon, 0), endDate: m.at(sun, 0),
      executiveSummary: `Week ${iso}/${year}: overall progress reached ${act.overall}% against ${plan.overall}% planned (SPI ${spi}). ${wd.length} working days, ${total} man-days, average ${Math.round(total / Math.max(1, wd.length))} and peak ${peak} personnel. ${rainDays ? `${rainDays} rain day(s) affected external works.` : 'No weather downtime.'}`,
      highlightsAchieved: [...topFronts.map(n => `• Progress on ${n}`), ...completedIn.map(n => `• Completed: ${n}`), ...msIn.map(n => `• Milestone achieved: ${n}`)].join('\n'),
      issuesEncountered: [rainDays ? `• ${rainDays} rain day(s) – external works partly suspended` : '', ...ncrIn.map(n => `• NCR raised: ${n}`), c.delayed ? `• ${c.delayed} activities behind programme – recovery plan under review` : '', c.onHold ? `• ${c.onHold} activity on hold pending design/authority input` : ''].filter(Boolean).join('\n') || '• No significant issues',
      nextWeekPlan: nextFronts.map(n => `• ${n}`).join('\n'),
      overallProgress: act.overall, plannedProgress: plan.overall, progressByDiscipline: JSON.stringify(act.byDisc),
      manpowerByDay: JSON.stringify(manpowerByDay), totalManpowerWeek: total, peakManpower: peak,
      activitiesCompleted: c.completed, activitiesDelayed: c.delayed, activitiesOngoing: c.ongoing,
      spi, cpi: r2(1 / p.costFactor + (rnd(seed, 'cpi', mon) - 0.5) * 0.02),
      weatherSummary: `${Object.entries(wx).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(', ')} day(s); temperatures ${Math.min(...temps)}–${Math.max(...temps)} °C`,
      lotsData: JSON.stringify(lotsData), manpowerBreakdown: JSON.stringify(breakdown),
      studiesProgress: JSON.stringify(studiesAt(m, sun)), materialApprovals: JSON.stringify(materialsAt(m, sun)),
      status: wi === mondays.length - 1 ? 'SUBMITTED' : 'APPROVED',
      createdAt: m.at(sun + 1, 10), updatedAt: m.at(Math.min(sun + 2, T), 10),
    });
  });

  // risks / NCRs as of a day
  const riskStatusAt = (r: ProjectDef['risks'][number], t: number) => (r.status === 'MITIGATED' || r.status === 'CLOSED') && t < Math.min(r.dueDay, T) ? 'OPEN' : r.status;
  const ncrStatusAt = (n: ProjectDef['ncrs'][number], t: number) => (n.closeDay !== undefined && t >= n.closeDay ? 'CLOSED' : n.underReview && t >= n.raisedDay + 5 ? 'UNDER_REVIEW' : 'OPEN');

  // monthly reports – every month from start to the anchor month
  const monthlyReports: Row[] = [];
  const s0 = m.at(0), sa = m.at(T);
  for (let y = s0.getUTCFullYear(), mo = s0.getUTCMonth(); y < sa.getUTCFullYear() || (y === sa.getUTCFullYear() && mo <= sa.getUTCMonth()); mo === 11 ? (y++, mo = 0) : mo++) {
    const first = Math.max(0, m.dayOf(new Date(Date.UTC(y, mo, 1, 12))));
    const lastCal = m.dayOf(new Date(Date.UTC(y, mo + 1, 0, 12)));
    const last = Math.min(lastCal, T), current = lastCal >= T;
    const wd: number[] = [];
    for (let t = first; t <= last; t++) if (m.isWork(t)) wd.push(t);
    const states = wd.map(t => m.day(t));
    const act = m.progress(last, 'actual'), plan = m.progress(last, 'planned'), prevAct = m.progress(first - 1, 'actual');
    const mdays = states.reduce((s, x) => s + x.total, 0);
    const c = m.statusCounts(last);
    const discStats: Record<string, Row> = {};
    for (const d of DISCIPLINES) {
      const list = m.acts.filter(a => a.def.discipline === d);
      if (!list.length) continue;
      const st = list.map(a => m.status(a, last));
      discStats[d] = { total: list.length, completed: st.filter(s => s === 'COMPLETED').length, inProgress: st.filter(s => s === 'IN_PROGRESS').length, delayed: st.filter(s => s === 'DELAYED').length, notStarted: st.filter(s => s === 'NOT_STARTED').length, avgProgress: m.discAvg(last, d) };
    }
    const msAt = milestones.map(x => {
      const a = m.acts.find(z => z.def.key === p.milestones.find(q => `demo-ms-${short.toLowerCase()}-${q.key.toLowerCase()}` === x.id)!.act)!;
      const pd = a.def.start + a.def.dur;
      return m.actual(a, last) >= 99.999 ? 'ACHIEVED' : pd < last ? 'DELAYED' : 'PENDING';
    });
    const risksAt = p.risks.filter(r => r.raisedDay <= last).map(r => riskStatusAt(r, last));
    const ncrsAt = p.ncrs.filter(n => n.raisedDay <= last).map(n => ncrStatusAt(n, last));
    const spent = Math.round((p.budget * act.overall) / 100 * p.costFactor);
    const forecast = Math.round(p.budget * (p.costFactor * 0.6 + 0.4) + (act.overall > 5 ? (rnd(seed, 'fc', y, mo) - 0.5) * p.budget * 0.004 : 0));
    const lti = states.reduce((s, x) => s + x.hse.accidentsWithLTI, 0);
    const completedIn = m.acts.filter(a => m.actual(a, last) >= 99.999 && m.actual(a, first - 1) < 99.999).map(a => a.def.name);
    const startedIn = m.acts.filter(a => a.aStart >= first && a.aStart <= last).map(a => a.def.name);
    const msIn = p.milestones.filter(q => { const a = m.acts.find(z => z.def.key === q.act)!; const f = a.aStart + a.aDur; return f >= first && f <= last && m.actual(a, last) >= 99.999; }).map(q => q.name);
    const nextActs = m.acts.filter(a => m.actual(a, last + 30) > m.actual(a, last)).map(a => a.def.name).slice(0, 7);
    const scenes = PHOTO_SCENES[p.slug];
    monthlyReports.push({
      id: `demo-mr-${short.toLowerCase()}-${y}-${pad(mo + 1, 2)}`, projectId: p.id, month: mo + 1, year: y,
      executiveSummary: `${MONTHS[mo]} ${y}${current ? ' (month to date)' : ''}: overall progress ${act.overall}% (+${r1(act.overall - prevAct.overall)} pts) against ${plan.overall}% planned. ${wd.length} working days, ${mdays} man-days, peak ${Math.max(0, ...states.map(s => s.total))} personnel. ${c.delayed ? `${c.delayed} activities are behind programme.` : 'All activities are within tolerance.'}`,
      keyAchievements: [...completedIn.map(n => `• Completed: ${n}`), ...msIn.map(n => `• Milestone achieved: ${n}`), ...startedIn.map(n => `• Started: ${n}`)].join('\n') || '• Works continued on all open fronts',
      majorChallenges: [states.filter(s => s.rain).length ? `• ${states.filter(s => s.rain).length} rain day(s) affecting external works` : '', c.delayed ? `• ${c.delayed} activities delayed – recovery measures in place` : '', ...p.ncrs.filter(n => n.raisedDay >= first && n.raisedDay <= last).map(n => `• NCR: ${n.title}`), ...p.risks.filter(r => r.raisedDay >= first && r.raisedDay <= last).map(r => `• New risk: ${r.title}`)].filter(Boolean).join('\n') || '• No major challenges',
      nextMonthPlan: nextActs.map(n => `• ${n}`).join('\n'),
      overallProgress: act.overall, plannedProgress: plan.overall,
      architectureProgress: m.discAvg(last, 'ARCHITECTURE'), structureProgress: m.discAvg(last, 'STRUCTURE'), mecaniqueProgress: m.discAvg(last, 'MECANIQUE'),
      electriciteProgress: m.discAvg(last, 'ELECTRICITE'), plomberieProgress: m.discAvg(last, 'PLOMBERIE'), infrastructureProgress: m.discAvg(last, 'INFRASTRUCTURE'),
      totalManpowerDays: mdays, peakManpower: Math.max(0, ...states.map(s => s.total)), avgDailyManpower: wd.length ? r1(mdays / wd.length) : 0,
      budgetExpended: spent, forecastFinalCost: forecast, variance: p.budget - forecast,
      completedMilestones: msAt.filter(s => s === 'ACHIEVED').length, pendingMilestones: msAt.filter(s => s === 'PENDING').length, delayedMilestones: msAt.filter(s => s === 'DELAYED').length,
      openRisks: risksAt.filter(s => s === 'OPEN').length, mitigatedRisks: risksAt.filter(s => s === 'MITIGATED').length,
      openNCRs: ncrsAt.filter(s => s !== 'CLOSED').length, closedNCRs: ncrsAt.filter(s => s === 'CLOSED').length,
      kpis: JSON.stringify({ activitiesCompleted: c.completed, activitiesDelayed: c.delayed, activitiesOngoing: c.ongoing, activitiesNotStarted: c.notStarted, spi: plan.overall ? r2(act.overall / plan.overall) : 1, cpi: r2(1 / p.costFactor), ltiCount: lti, manHours: mdays * 8 }),
      photos: JSON.stringify([0, 1, 2].map(k => { const sc = scenes[(mo + k * 3) % scenes.length]; return { url: `/demo-docs/${p.slug}/photos/${sc.file}.svg`, caption: sc.caption }; })),
      progressByDiscipline: JSON.stringify(discStats),
      studiesProgress: JSON.stringify(studiesAt(m, last)), materialApprovals: JSON.stringify(materialsAt(m, last)),
      status: current ? 'DRAFT' : 'APPROVED',
      createdAt: m.at(Math.min(lastCal + 3, T), 10), updatedAt: m.at(Math.min(lastCal + 5, T), 10),
    });
  }

  // risks, NCRs, plant, resources
  const risks = p.risks.filter(r => r.raisedDay <= T).map((r, i) => ({
    id: `demo-risk-${short.toLowerCase()}-${pad(i + 1, 2)}`, projectId: p.id, title: r.title, description: r.description,
    category: RISK_CAT[r.category] ?? 'GENERAL', probability: r.p, impact: r.i, riskScore: r.p * r.i, status: r.status,
    mitigation: r.mitigation, owner: r.owner, dueDate: m.at(r.dueDay, 0), ...stamp(r.raisedDay, 11),
  }));
  const ncrPhotos: Row[] = [];
  const ncrs = p.ncrs.filter(n => n.raisedDay <= T).map((n, i) => {
    const id = `demo-ncr-${short.toLowerCase()}-${pad(i + 1, 2)}`, status = ncrStatusAt(n, T);
    ncrPhotos.push({ id: `${id}-ph1`, url: `/demo-docs/${p.slug}/photos/ncr-${pad(i + 1, 2)}.svg`, fileName: `ncr-${pad(i + 1, 2)}.svg`, caption: `${n.title} – as found`, takenAt: m.at(n.raisedDay, 10), location: n.area, fileSize: null, dailyReportId: null, ncrId: id, createdAt: m.at(n.raisedDay, 11) });
    return {
      id, projectId: p.id, ncrNumber: `NCR-${short}-${pad(i + 1)}`, title: n.title, description: n.description, area: n.area, discipline: n.discipline,
      severity: n.severity, raisedBy: n.raisedBy, raisedDate: m.at(n.raisedDay, 10), status,
      resolution: status === 'CLOSED' ? n.resolution ?? 'Corrective action verified on site.' : n.underReview ? 'Corrective action proposal received – under consultant review.' : null,
      closedDate: status === 'CLOSED' ? m.at(n.closeDay!, 15) : null, createdAt: m.at(n.raisedDay, 11), updatedAt: m.at(Math.min(n.closeDay ?? T, T), 15),
    };
  });
  photos.push(...ncrPhotos);

  const plant = p.plant.filter(pl => pl.onDay <= T).map((pl, i) => {
    const off = pl.offDay !== undefined && pl.offDay <= T;
    let wdays = 0;
    for (let t = pl.onDay; t <= (off ? pl.offDay! : T); t++) if (m.isWork(t)) wdays++;
    const cycles = Math.ceil((T - pl.onDay + 1) / 365);
    return {
      id: `demo-plant-${short.toLowerCase()}-${pad(i + 1, 2)}`, projectId: p.id, name: pl.name, category: pl.category, make: pl.make, model: pl.model,
      serialNumber: `${pl.make.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()}-${pad(fnv(p.slug + pl.name) % 1000000, 6)}`,
      plateNumber: ['TRANSPORT', 'EARTHMOVING', 'LIFTING', 'PUMPING'].includes(pl.category) && !/crane|hoist/i.test(pl.name) ? `DEMO-${pad(fnv(pl.name) % 100000, 5)}-${16}` : null,
      owner: pl.owner, hireCompany: pl.hireCompany ?? null, dateOnSite: m.at(pl.onDay, 0), dateOffSite: off ? m.at(pl.offDay!, 0) : null,
      status: off ? 'OFF_SITE' : pl.status, certExpiry: off ? null : m.at(pl.onDay + 365 * cycles, 0),
      lastInspection: off ? m.at(pl.offDay! - 5, 0) : m.at(T - 3 - Math.floor(rnd(seed, 'insp', pl.name) * 22), 0),
      hoursOnSite: r1(wdays * pl.hourly), notes: pl.notes ?? null, ...stamp(pl.onDay, 9),
    };
  });

  const resources: Row[] = [];
  let rn = 0;
  const person = (company: string, trade: string, position: string, type: string, induction: number) => {
    rn++;
    const name = `${FIRST[fnv(p.slug + 'f' + rn) % FIRST.length]} ${LAST[(fnv(p.slug + 'l' + rn) + rn) % LAST.length]}`;
    const r = rnd(seed, 'res', rn);
    const status = rn === 17 ? 'SUSPENDED' : r < 0.07 ? 'INACTIVE' : 'ACTIVE';
    resources.push({
      id: `demo-res-${short.toLowerCase()}-${pad(rn)}`, projectId: p.id, fullName: name, company, trade, position, type,
      idNumber: `DEMO-ID-${short}${pad(rn, 4)}`, inductionDate: m.at(induction, 8), status,
      notes: status === 'SUSPENDED' ? 'Suspended pending HSE review (no harness at height)' : status === 'INACTIVE' ? 'Demobilised – trade package complete' : null,
      ...stamp(induction, 8),
    });
  };
  p.indirect.forEach(ind => { for (let k = 0; k < ind.np; k++) person(p.contractor, 'Management & supervision', ind.position, 'INDIRECT', Math.floor(rnd(seed, 'indi', ind.position, k) * Math.min(60, T))); });
  const ref = m.day(days[days.length - 1]);
  const direct = ref.manpower.filter(e => e.type === 'DIRECT');
  const totalDirect = direct.reduce((s, e) => s + e.np, 0) || 1;
  const target = 45 + Math.floor(rnd(seed, 'dirn') * 16);
  direct.forEach(e => {
    const n = Math.max(1, Math.round((e.np * target) / totalDirect));
    for (let k = 0; k < n; k++) person(e.company, e.position, e.position, 'DIRECT', Math.max(0, T - 5 - Math.floor(rnd(seed, 'indd', e.position, k) * Math.min(300, T))));
  });

  // presentation data
  const act = m.progress(T, 'actual'), plan = m.progress(T, 'planned');
  const zoneProgress = (z: ProjectDef['zones'][number]) => {
    const vals = z.acts.map(k => {
      const a = m.acts.find(x => x.def.key === k);
      if (!a) return 0;
      const pr = m.actual(a, T);
      if (p.slug === 'al-nour') {
        const upper = ['GF', 'R+1', 'R+2', 'R+3', 'R+4', 'R+5', 'R+6', 'R+7', 'R+8'];
        if (upper.includes(z.level)) return 100 * clamp((pr * upper.length) / 100 - upper.indexOf(z.level));
        if (k === 'A10') return 100 * clamp((pr * 2) / 100 - (z.level === 'B2' ? 0 : 1));
      }
      return pr;
    });
    return Math.round(vals.reduce((s, v) => s + v, 0) / Math.max(1, vals.length));
  };
  const billing: Row[] = [];
  const advDay = 14;
  billing.push({ id: `${p.slug}-bill-adv`, number: 'ADV-01', description: 'Advance payment (15% of contract value) against bank guarantee', amount: Math.round(p.budget * 0.15), dateIssued: isoDate(m.at(advDay)), delayDays: 21, datePaid: isoDate(m.at(advDay + 21)), status: 'PAID' });
  let prevEarned = 0, ipc = 0;
  for (const mr of monthlyReports) {
    const issueDate = new Date(Date.UTC(mr.year, mr.month, 5, 12));
    const issued = m.dayOf(issueDate);
    if (issued > T) break;
    const earned = (p.budget * mr.overallProgress) / 100;
    const amount = Math.round((earned - prevEarned) * 0.85 / 100) * 100;
    prevEarned = earned;
    if (amount <= 0) continue;
    ipc++;
    const delay = 25 + Math.floor(rnd(seed, 'pay', ipc) * 40);
    const paid = issued + delay <= T;
    const outstanding = T - issued;
    billing.push({
      id: `${p.slug}-bill-${pad(ipc, 2)}`, number: `IPC-${pad(ipc, 2)}`, description: `Interim payment certificate – works executed in ${MONTHS[mr.month - 1]} ${mr.year} (net of 15% advance recovery)`,
      amount, dateIssued: isoDate(issueDate), delayDays: paid ? delay : outstanding, datePaid: paid ? isoDate(m.at(issued + delay)) : '',
      status: paid ? 'PAID' : outstanding > 45 ? 'LATE' : 'PENDING',
    });
  }
  billing.push({ id: `${p.slug}-bill-vc1`, number: 'VC-01', description: p.slug === 'al-nour' ? 'Variation claim – F3/F5 layout merge on R+7/R+8 (client request)' : 'Variation claim – additional dewatering wells after geotechnical update', amount: Math.round(p.budget * 0.012 / 100) * 100, dateIssued: isoDate(m.at(T - 40)), delayDays: 40, datePaid: '', status: 'DISPUTED' });

  const presentation = {
    ...p.presentation,
    intervenants: p.intervenants.map((x, i) => ({ id: `${p.slug}-int-${i + 1}`, ...x })),
    zones: p.zones.map((z, i) => ({ id: `${p.slug}-zone-${i + 1}`, zone: z.zone, description: z.description, surface: z.surface, level: z.level, progress: zoneProgress(z) })),
    billing,
    weighting: p.lots.map((l, i) => {
      const last = i === p.lots.length - 1;
      return {
        id: `${p.slug}-wgt-${i + 1}`, lot: l.lot, description: l.description, weighting: l.weighting, progress: Math.round(act.byLot[i]),
        sendRef: `${p.code}-WGT-${pad(i + 1, 2)}`, sendDate: isoDate(m.at(45 + i * 3)),
        approvalRef: last ? '' : `${p.code}-APP-${pad(i + 1, 2)}`, approvalDate: last ? '' : isoDate(m.at(60 + i * 3)),
        approvalStatus: last ? 'SUBMITTED' : 'APPROVED',
      };
    }),
    plans: p.plans.filter(pl => pl.day <= T).map((pl, i) => ({ id: `${p.slug}-plan-${i + 1}`, number: pl.number, title: pl.title, revision: pl.revision, format: pl.format, issuedBy: pl.issuedBy, date: isoDate(m.at(pl.day)), status: pl.status, remarks: pl.remarks })),
  };

  const project = {
    id: p.id, name: p.name, code: p.code, description: p.description, client: p.client, consultant: p.consultant, contractor: p.contractor,
    location: p.location, startDate: m.at(0, 0), endDate: new Date(p.end + 'T00:00:00Z'), status: 'ACTIVE',
    progress: act.overall, budget: p.budget, actualCost: Math.round((p.budget * act.overall) / 100 * p.costFactor), currency: p.currency,
    imageUrl: null, presentationData: JSON.stringify(presentation), createdAt: m.at(-20, 9), updatedAt: m.at(T, 7),
    _plannedProgress: plan.overall,
  };

  const memberKeys = p.slug === 'al-nour' ? ['pm', 'engineer', 'consultant', 'contractor', 'client'] : ['pm', 'engineer', 'consultant'];
  const members = memberKeys.map(k => ({ id: `demo-mem-${short.toLowerCase()}-${k}`, userId: uid(k), projectId: p.id, role: users.find(u => u.key === k)!.role }));

  return { def: p, short, anchorDay: T, project, members, activities, milestones, dailyReports, photos, comments, weeklyReports, monthlyReports, risks, ncrs, plant, resources };
}

export function resolveAnchor(input?: string): string {
  if (!input) return DEFAULT_ANCHOR;
  if (input === 'today') return new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input) || Number.isNaN(Date.parse(input))) throw new Error(`Invalid DEMO_ANCHOR "${input}" (use YYYY-MM-DD or "today")`);
  return input;
}

export function buildDemo(anchor = DEFAULT_ANCHOR): DemoData {
  const anchorMs = Date.parse(anchor + 'T00:00:00Z');
  const users = DEMO_USERS.map(u => ({ ...u, id: `demo-usr-${u.key}` }));
  return { anchor, users, bundles: DEMO_PROJECTS.map(p => buildProject(p, anchorMs, users)) };
}
