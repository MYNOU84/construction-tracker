/**
 * Fictional sample documents (PDF) and site illustrations (SVG) for the demo projects.
 * Everything is generated from the demo model, so figures agree with the seeded records.
 * Every file carries a visible "fictional / demonstration" marking.
 */
import { createHash } from 'crypto';
import { PdfDoc, C, PAGE, DocMeta } from './pdf';
import { DemoBundle, DemoData, PHOTO_SCENES, rnd } from './build';

export interface DemoFile { path: string; buffer: Buffer; mime: string }
export interface DemoDocument {
  id: string; projectId: string; name: string; description: string; type: string; fileUrl: string; fileName: string;
  fileSize: number; mimeType: string; revision: string; tags: string; uploadedBy: string; createdAt: Date; updatedAt: Date;
}

const DAY = 86_400_000;
const money = (n: number, cur = 'USD') => `${Math.round(n).toLocaleString('en-US')} ${cur}`;
const num = (n: number) => Math.round(n).toLocaleString('en-US');
const iso = (d: Date) => d.toISOString().slice(0, 10);

interface Ctx {
  b: DemoBundle; data: DemoData; day: (t: number) => Date; party: (role: RegExp) => { company: string; contact: string };
  code: string; name: string; cur: string;
}

// ─── shared drawing helpers ───────────────────────────────────────────────────
function titleBlock(d: PdfDoc, x: number, y: number, w: number, rows: [string, string][]) {
  const h = rows.length * 13 + 6;
  d.stroke(C.ink); d.raw('0.8 w'); d.rect(x, y, w, h, 'S');
  rows.forEach(([k, v], i) => {
    const yy = y + h - 13 - i * 13;
    d.text(x + 5, yy, k, 6.5, true, C.grey);
    d.text(x + 70, yy, v, 7.5, false, C.ink);
    if (i) d.line(x, yy + 10, x + w, yy + 10, 0.3);
  });
}
function dims(d: PdfDoc, x1: number, y: number, x2: number, label: string) {
  d.stroke(C.grey); d.line(x1, y, x2, y, 0.4);
  d.line(x1, y - 3, x1, y + 3, 0.4); d.line(x2, y - 3, x2, y + 3, 0.4);
  d.textCenter((x1 + x2) / 2, y + 3, label, 6.5, false, C.grey);
}
function stamp(d: PdfDoc, x: number, y: number, label: string, color = C.green) {
  d.stroke(color); d.raw('1.4 w'); d.rect(x, y, 150, 34, 'S');
  d.textCenter(x + 75, y + 20, label, 10, true, color);
  d.textCenter(x + 75, y + 8, 'Specimen stamp – fictional', 6.5, false, color);
}

// ─── document builders ────────────────────────────────────────────────────────
type Builder = (c: Ctx, meta: DocMeta) => Buffer;

const contract: Builder = (c, meta) => {
  const p = c.b.def, d = new PdfDoc(meta);
  d.disclaimer();
  d.h1('Agreement');
  d.p(`This fictional Contract Agreement is made between ${p.client} (the "Employer") and ${p.contractor} (the "Contractor") for the execution and completion of the works known as ${p.name}, ${p.location}, under the supervision of ${p.consultant} acting as the Engineer.`);
  d.kv([
    ['Employer', p.client], ['Engineer', p.consultant], ['Contractor', p.contractor],
    ['Works', p.description.replace(/^Fictional demonstration project – /, '')],
    ['Contract sum', `${money(p.budget, c.cur)} (lump sum, excluding VAT)`],
    ['Commencement date', p.start], ['Time for completion', `${p.end} (${Math.round((Date.parse(p.end) - Date.parse(p.start)) / DAY)} calendar days)`],
    ['Advance payment', `15% of the Contract sum against an unconditional bank guarantee, recovered pro rata from interim certificates`],
    ['Retention', '5% of each interim certificate, half released at taking-over, half at the end of the defects notification period'],
    ['Delay damages', '0.05% of the Contract sum per day, capped at 10%'],
    ['Defects notification period', '12 months from taking-over'],
    ['Payment terms', 'Interim payment certificates monthly; payment within 45 days of certification'],
  ], 150);
  d.h1('Particular conditions (extract)');
  d.bullets([
    'Clause 4.1 – The Contractor shall design (where specified), execute and complete the Works in accordance with the Contract and the Engineer’s instructions.',
    'Clause 4.8 – The Contractor shall comply with the site HSE plan, keep daily records of personnel and equipment and submit daily, weekly and monthly reports.',
    'Clause 8.3 – A detailed programme shall be submitted within 28 days of commencement and updated monthly, showing the critical path.',
    'Clause 13 – Variations may be initiated by the Engineer by instruction or by request for proposal; no variation shall be executed without written instruction.',
    'Clause 14.3 – Applications for interim payment shall be supported by measured quantities and the weighted progress of each lot.',
    'Clause 17 – The Contractor shall maintain Contractor’s All Risks and third-party liability insurance for the duration of the Works.',
    'Clause 20 – Claims shall be notified within 28 days of the event giving rise to the claim.',
  ]);
  d.h1('Contract documents (order of precedence)');
  d.table(['#', 'Document'], [
    ['1', 'This Agreement and Addenda'], ['2', 'Letter of Acceptance'], ['3', 'Particular Conditions'], ['4', 'General Conditions'],
    ['5', 'Technical Specifications'], ['6', 'Drawings'], ['7', 'Priced Bill of Quantities'], ['8', 'Contractor’s Technical Proposal'],
  ], [1, 12]);
  d.signatures([`For the Employer – ${p.client}`, `For the Contractor – ${p.contractor}`]);
  return d.toBuffer();
};

const addendum: Builder = (c, meta) => {
  const p = c.b.def, d = new PdfDoc(meta);
  d.disclaimer();
  d.h1('Addendum No. 1 to the Contract Agreement');
  d.p(`The Parties to the Contract for ${p.name} agree to the following amendments. All other terms of the Contract remain unchanged.`);
  const items = c.b.def.slug === 'al-nour'
    ? [
      ['1', 'Nominated subcontractors', `${p.companies.MECANIQUE} (HVAC, fire-fighting, lifts) and ${p.companies.ELECTRICITE} (electrical) are confirmed as nominated subcontractors.`],
      ['2', 'Milestone payment', 'A milestone payment of 2% is added on completion of the superstructure of Block C (roof slab).'],
      ['3', 'Façade finish', 'External render colour changed from RAL 1015 to RAL 9001 on all blocks; no change to the Contract sum.'],
      ['4', 'Reporting', 'Daily reports to be submitted through the project management platform before 18:00 each working day.'],
    ]
    : [
      ['1', 'Dewatering', 'Groundwater lowering system to be designed by the Contractor and approved by the Engineer before bulk excavation.'],
      ['2', 'Adjacent buildings', 'Monitoring of adjacent structures (crack gauges and settlement points) weekly during excavation; alert and alarm levels as per specification section 02 300.'],
      ['3', 'Programme', 'Completion of the B1 slab is added as a key date; delay damages for the key date are 0.02% per day.'],
      ['4', 'Reporting', 'Daily reports to be submitted through the project management platform before 18:00 each working day.'],
    ];
  d.table(['Item', 'Subject', 'Amendment'], items, [1, 3, 10]);
  d.kv([['Effect on Contract sum', 'None'], ['Effect on Time for completion', 'None'], ['Effective date', meta.date]], 150);
  d.signatures([`For the Employer – ${p.client}`, `For the Contractor – ${p.contractor}`]);
  return d.toBuffer();
};

function boqItems(c: Ctx) {
  const p = c.b.def;
  return p.lots.map(l => {
    const acts = p.activities.filter(a => l.disciplines.includes(a.discipline));
    const amount = (p.budget * l.weighting) / 100;
    const w = acts.reduce((s, a) => s + a.dur * a.crew, 0) || 1;
    const items = acts.map((a, i) => {
      const total = Math.round((amount * a.dur * a.crew) / w / 100) * 100;
      return { ref: `${l.lot.replace('Lot ', '')}.${String(i + 1).padStart(2, '0')}`, name: a.name, unit: a.unit, qty: a.qty, rate: total / a.qty, total };
    });
    const last = items[items.length - 1];
    if (last) { last.total += amount - items.reduce((s, x) => s + x.total, 0); last.rate = last.total / last.qty; } // absorb rounding
    const sum = items.reduce((s, x) => s + x.total, 0);
    return { lot: l, items, sum };
  });
}

const boq: Builder = (c, meta) => {
  const p = c.b.def, d = new PdfDoc(meta);
  d.disclaimer();
  const lots = boqItems(c);
  const grand = lots.reduce((s, l) => s + l.sum, 0);
  d.h1('Summary by lot');
  d.table(['Lot', 'Description', 'Weighting', `Amount (${c.cur})`],
    [...lots.map(l => [l.lot.lot, l.lot.description, `${l.lot.weighting}%`, num(l.sum)]), ['', 'TOTAL (excl. VAT)', '100%', num(grand)]],
    [2, 8, 2, 3], { align: ['l', 'l', 'r', 'r'], totalRows: 1 });
  for (const l of lots) {
    d.h1(`${l.lot.lot} – ${l.lot.description}`);
    d.table(['Item', 'Description', 'Unit', 'Quantity', 'Rate', 'Amount'],
      [...l.items.map(x => [x.ref, x.name, x.unit, num(x.qty), x.rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), num(x.total)]), ['', `Total ${l.lot.lot}`, '', '', '', num(l.sum)]],
      [1.4, 7, 1.2, 2, 1.8, 2.4], { align: ['l', 'l', 'c', 'r', 'r', 'r'], totalRows: 1 });
  }
  d.p('Rates are fictional and include labour, plant, materials, overheads and profit. Quantities are for demonstration only.', 8, C.grey);
  return d.toBuffer();
};

const permit: Builder = (c, meta) => {
  const p = c.b.def, d = new PdfDoc(meta);
  d.disclaimer();
  d.h1('Building permit (fictional specimen)');
  d.p('Issued by a fictional municipal planning office for demonstration purposes. This document has no legal value.');
  d.kv([
    ['Permit No.', meta.docNo], ['Applicant', p.client], ['Project', p.name], ['Site', p.location],
    ['Designer', c.party(/Architect|Design/i).company], ['Use', c.b.def.slug === 'al-nour' ? 'Residential – 120 dwellings, basement car park' : 'Commercial – shopping mall, two-level basement car park'],
    ['Gross floor area', String(p.presentation.surface)], ['Height / levels', String(p.presentation.floors)],
    ['Validity', '36 months from the date of issue; works to start within 12 months'],
  ], 140);
  d.h1('Conditions');
  d.bullets([
    'A site notice showing the permit number shall be displayed at the main gate for the duration of the works.',
    'Any modification to façades, height or use requires a modifying permit before execution.',
    'The technical control office shall be notified at the start of foundations, structure and MEP works.',
    'Construction waste shall be removed to an authorised disposal site; burning on site is prohibited.',
    'Working hours: 07:00–18:00, Saturday to Thursday; noisy works are not permitted on Fridays.',
    'A certificate of conformity shall be requested at completion before occupation.',
  ]);
  stamp(d, d.right - 160, d.block(48) + 6, 'PERMIT GRANTED');
  return d.toBuffer();
};

const insurance: Builder = (c, meta) => {
  const p = c.b.def, d = new PdfDoc(meta);
  d.disclaimer();
  d.h1('Certificate of insurance – Contractor’s All Risks');
  d.kv([
    ['Insurer', 'Fictional Assurance Company (demo)'], ['Policy No.', `CAR-${p.code}-DEMO`], ['Insured', `${p.contractor}, ${p.client}, ${p.consultant} and all subcontractors`],
    ['Project', `${p.name}, ${p.location}`], ['Period', `${p.start} to ${p.end} + 12 months maintenance`],
  ], 140);
  d.table(['Section', 'Cover', `Limit (${c.cur})`, `Deductible (${c.cur})`], [
    ['I', 'Material damage to the contract works', num(p.budget), num(10000)],
    ['I', 'Construction plant and equipment', num(p.budget * 0.08), num(5000)],
    ['I', 'Debris removal', num(p.budget * 0.03), num(2500)],
    ['II', 'Third-party liability (any one occurrence)', num(2_000_000), num(5000)],
    ['II', 'Cross liability', 'Included', '–'],
  ], [1, 7, 3, 3], { align: ['c', 'l', 'r', 'r'] });
  d.p('Exclusions and conditions as per the policy wording (fictional). This certificate is for demonstration only.', 8, C.grey);
  d.signatures(['For the insurer (specimen)']);
  return d.toBuffer();
};

const specification: Builder = (c, meta) => {
  const d = new PdfDoc(meta);
  d.disclaimer();
  if (c.b.def.slug === 'al-nour') {
    d.h1('Section 03 300 – Cast-in-place concrete');
    d.h2('1. Scope'); d.p('Supply, placing, compaction and curing of structural concrete for foundations, basement, superstructure and roof slabs of Blocks A, B and C.');
    d.h2('2. Materials');
    d.table(['Element', 'Class', 'Max. aggregate', 'Exposure', 'Cover'], [
      ['Raft foundation', 'C30/37', '20 mm', 'XC2 / XA1', '50 mm'], ['Basement walls', 'C30/37 (waterproof admixture)', '20 mm', 'XC2', '40 mm'],
      ['Columns, cores', 'C35/45', '20 mm', 'XC1', '30 mm'], ['Slabs, beams', 'C30/37', '20 mm', 'XC1', '25 mm'], ['Blinding', 'C12/15', '20 mm', '–', '–'],
    ], [3, 3, 2, 2, 1.5]);
    d.h2('3. Execution');
    d.bullets(['Slump 120–160 mm at discharge; trucks outside tolerance are rejected.', 'Cubes: one set of 6 per 50 m³ or per pour, tested at 7 and 28 days.', 'Curing by wet hessian or curing compound for a minimum of 7 days.', 'Formwork striking: slab soffits not before 7 days and 70% of characteristic strength.', 'Hot-weather concreting above 32 °C requires chilled water and a pour plan approved by the Engineer.']);
  } else {
    d.h1('Section 02 300 – Diaphragm walls and excavation support');
    d.h2('1. Scope'); d.p('Construction of the 800 mm reinforced concrete diaphragm wall around the basement perimeter, capping beam, temporary propping and monitoring.');
    d.h2('2. Tolerances and materials');
    d.table(['Item', 'Requirement'], [
      ['Wall thickness', '800 mm'], ['Verticality', '1:100'], ['Panel length', '2.8 to 6.5 m'], ['Concrete', 'C35/45, tremie placed, slump 180–220 mm'],
      ['Support fluid', 'Bentonite, density ≤ 1.10 before concreting, sand content ≤ 4%'], ['Reinforcement', 'B500B, cages with 75 mm cover spacers'],
    ], [3, 7]);
    d.h2('3. Monitoring');
    d.bullets(['Inclinometers in 6 panels, read weekly during excavation.', 'Alert level 15 mm / alarm level 25 mm lateral displacement.', 'Settlement points on adjacent buildings read weekly.', 'Piezometers to confirm drawdown before each excavation stage.']);
  }
  d.h2('4. Submittals'); d.bullets(['Mix designs and trial results', 'Method statement and ITP', 'Material certificates and delivery notes', 'Test results within 48 hours']);
  return d.toBuffer();
};

function sheet(c: Ctx, meta: DocMeta, title: string, draw: (d: PdfDoc, x: number, y: number, w: number, h: number) => void, notes: string[], status?: [string, [number, number, number]]) {
  const d = new PdfDoc(meta);
  d.disclaimer();
  const h = 420, y = d.block(h), x = d.left, w = d.width;
  d.stroke(C.ink); d.raw('1 w'); d.rect(x, y, w, h, 'S');
  draw(d, x + 10, y + 70, w - 20, h - 80);
  titleBlock(d, x + w - 230, y + 4, 226, [['Project', c.name], ['Title', title], ['Drawing No.', meta.docNo], ['Rev. / Date', `${meta.revision} / ${meta.date}`], ['Scale', 'NTS – fictional']]);
  if (status) stamp(d, x + 8, y + 10, status[0], status[1]);
  d.h2('Notes'); d.bullets(notes, 8.5);
  return d.toBuffer();
}

const drawings = {
  rebar: (d: PdfDoc, x: number, y: number, w: number, h: number) => {
    d.stroke(C.ink); d.raw('1.2 w'); d.rect(x + 20, y + 20, w - 40, h - 40, 'S');
    d.stroke(C.red);
    for (let i = 0; i <= 18; i++) d.line(x + 30 + i * ((w - 60) / 18), y + 28, x + 30 + i * ((w - 60) / 18), y + h - 28, 0.5);
    d.stroke([0.15, 0.35, 0.7]);
    for (let j = 0; j <= 10; j++) d.line(x + 28, y + 30 + j * ((h - 60) / 10), x + w - 28, y + 30 + j * ((h - 60) / 10), 0.5);
    d.fill(C.ink); [[0.25, 0.3], [0.5, 0.3], [0.75, 0.3], [0.25, 0.7], [0.5, 0.7], [0.75, 0.7]].forEach(([u, v]) => d.rect(x + u * w - 8, y + v * h - 8, 16, 16));
    d.text(x + 30, y + h - 16, 'T: HA12 @ 150 (B1)  ·  B: HA14 @ 150 (B2)  ·  Extra over columns: HA16 @ 150, L = 2.40 m', 7, true, C.ink);
    dims(d, x + 20, y + 10, x + w - 20, '24.60 m');
  },
  layout: (d: PdfDoc, x: number, y: number, w: number, h: number) => {
    d.stroke(C.ink); d.raw('1.4 w'); d.rect(x + 20, y + 20, w - 40, h - 40, 'S');
    const cols = 4, rows = 2;
    for (let i = 1; i < cols; i++) d.line(x + 20 + i * ((w - 40) / cols), y + 20, x + 20 + i * ((w - 40) / cols), y + h - 20, 0.8);
    d.line(x + 20, y + h / 2, x + w - 20, y + h / 2, 0.8);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const cx = x + 20 + (i + 0.5) * ((w - 40) / cols), cy = y + 20 + (j + 0.5) * ((h - 40) / rows);
      d.stroke([0.15, 0.35, 0.7]); d.circle(cx - 18, cy, 6); d.circle(cx + 18, cy, 6);
      d.line(cx - 12, cy, cx + 12, cy, 0.8);
      d.textCenter(cx, cy - 18, `Unit ${j * cols + i + 1}`, 6.5, false, C.grey);
    }
    d.stroke(C.red); d.line(x + 20, y + h / 2 + 6, x + w - 20, y + h / 2 + 6, 1.2, [4, 2]);
    d.text(x + 26, y + h / 2 + 10, 'Main drainage stack (DN110) – sleeves at each slab', 6.5, true, C.red);
  },
  site: (blocks: [number, number, number, number, string][]) => (d: PdfDoc, x: number, y: number, w: number, h: number) => {
    d.stroke(C.grey); d.raw('1 w'); d.line(x + 5, y + 5, x + w - 5, y + 5, 1, [6, 3]); d.line(x + w - 5, y + 5, x + w - 5, y + h - 5, 1, [6, 3]);
    d.line(x + w - 5, y + h - 5, x + 5, y + h - 5, 1, [6, 3]); d.line(x + 5, y + h - 5, x + 5, y + 5, 1, [6, 3]);
    for (const [u, v, bw, bh, label] of blocks) {
      d.fill([0.93, 0.9, 0.84]); d.stroke(C.ink); d.raw('1.2 w'); d.rect(x + u * w, y + v * h, bw * w, bh * h, 'B');
      d.textCenter(x + (u + bw / 2) * w, y + (v + bh / 2) * h - 3, label, 8, true, C.ink);
    }
    d.fill(C.gold); d.circle(x + w - 30, y + h - 30, 10, 'f'); d.textCenter(x + w - 30, y + h - 52, 'N', 9, true, C.ink);
    d.text(x + 12, y + 12, 'Site boundary (dashed)  ·  Main access from the north road', 7, false, C.grey);
  },
};

const rfi: Builder = (c, meta) => {
  const p = c.b.def, d = new PdfDoc(meta);
  d.disclaimer();
  const alNour = p.slug === 'al-nour';
  d.kv([
    ['From', `${p.contractor} – ${c.party(/Main Contractor/i).contact || 'Site Manager'}`], ['To', `${p.consultant} (Engineer)`],
    ['Subject', alNour ? 'Clash between sprinkler main and cable tray – Block B, R+4 corridor' : 'Level of B1 slab drainage sleeves vs. revised MEP layout'],
    ['Discipline', alNour ? 'MEP coordination' : 'Structure / MEP'], ['Date raised', meta.date], ['Response required by', iso(new Date(Date.parse(meta.date) + 7 * DAY))],
  ], 140);
  d.h1('Question');
  d.p(alNour
    ? 'The sprinkler main (DN100) shown on the fire-fighting drawing at +2.75 m clashes with the 300 mm cable tray at the same level along gridline 4 of the R+4 corridor. Please confirm whether the cable tray may be lowered to +2.55 m, keeping the false-ceiling level at +2.45 m.'
    : 'Revision B of the drainage layout moves four DN150 sleeves by 600 mm towards gridline C. Two of them now coincide with the drop panels around columns C3 and C4. Please confirm the revised sleeve positions or advise an alternative route.');
  d.h1('Contractor’s proposal');
  d.p(alNour ? 'Lower the cable tray to +2.55 m over 18 m and offset it 150 mm towards the façade. No change to the false ceiling.' : 'Keep the sleeves outside the drop panels by moving them 350 mm towards gridline D; adjust the falls of the drainage branches accordingly.');
  d.h1('Engineer’s response');
  d.p(alNour ? 'Proposal accepted. Maintain 100 mm clearance between the sprinkler main and the tray. Update the coordinated services drawing and resubmit for information.' : 'Proposal accepted subject to the structural engineer’s confirmation of opening sizes ≤ 200 mm outside drop panels. Revised sleeve drawing to be submitted before concreting.');
  d.kv([['Status', 'Answered – closed'], ['Cost impact', 'None'], ['Time impact', 'None']], 140);
  d.signatures(['Raised by (Contractor)', 'Answered by (Engineer)']);
  return d.toBuffer();
};

const methodStatement: Builder = (c, meta) => {
  const p = c.b.def, d = new PdfDoc(meta);
  d.disclaimer();
  const alNour = p.slug === 'al-nour';
  d.kv([
    ['Activity', alNour ? 'External render and façade painting – Blocks A, B, C' : 'Diaphragm wall construction (grab and tremie)'],
    ['Prepared by', `${p.contractor} – works department`], ['Reviewed by', `${p.consultant}`], ['Related ITP', `${meta.docNo.replace('MS', 'ITP')}`],
  ], 140);
  d.h1('1. Sequence of works');
  d.bullets(alNour
    ? ['Erect façade scaffold with tagged inspection; install debris netting.', 'Check substrate (masonry) flatness ±5 mm / 2 m; repair joints.', 'Fix galvanised mesh at concrete/masonry junctions.', 'Apply base coat 15 mm, cure 48 h.', 'Apply finish coat 8 mm, textured; protect from rain for 24 h.', 'Two coats of exterior paint, colour RAL 9001.']
    : ['Construct guide walls and set out panels.', 'Excavate panel with hydraulic grab under bentonite support.', 'Desand bentonite and check density/sand content.', 'Install reinforcement cage with crawler crane; check cover.', 'Place concrete by tremie continuously; record levels.', 'Break out top 600 mm and cast capping beam.']);
  d.h1('2. Resources');
  d.table(['Resource', 'Quantity', 'Remarks'], alNour
    ? [['Rendering crew', '3 × 6 workers', 'Supervised by finishes foreman'], ['Façade scaffold', '4 200 m²', 'Inspected weekly'], ['Mortar mixer', '3', 'On each block'], ['Hoist', '1', 'Material handling']]
    : [['Hydraulic grab rig', '1', 'Including desander unit'], ['Crawler crane 90 t', '1', 'Cage handling'], ['Bentonite plant', '1', '150 m³ storage'], ['Crew', '14', 'Including banksman']], [4, 2, 5]);
  d.h1('3. HSE controls');
  d.bullets(['Permit to work for lifting and work at height.', 'Exclusion zone around active work fronts, signed and barriered.', 'Daily toolbox talk; PPE including harness above 2 m.', 'Emergency rescue plan for scaffold / excavation.']);
  d.h1('4. Inspection and test plan (summary)');
  d.table(['Stage', 'Check', 'Acceptance criteria', 'Hold point'], alNour
    ? [['Substrate', 'Flatness, cleanliness', '±5 mm / 2 m', 'H'], ['Base coat', 'Thickness, adhesion', '15 ± 3 mm', 'W'], ['Finish', 'Texture vs. mock-up', 'Matches approved mock-up', 'H'], ['Paint', 'DFT, colour', '≥ 120 µm, RAL 9001', 'W']]
    : [['Excavation', 'Verticality, depth', '1:100, ≥ design toe', 'H'], ['Bentonite', 'Density, sand content', '≤ 1.10, ≤ 4%', 'W'], ['Cage', 'Cover, laps', '75 mm, per drawing', 'H'], ['Concrete', 'Slump, cubes', '180–220 mm, C35/45', 'W']], [2, 3, 4, 1.4]);
  stamp(d, d.right - 160, d.block(44) + 4, 'APPROVED – CODE A');
  return d.toBuffer();
};

function materialSubmittal(rev: 'A' | 'B'): Builder {
  return (c, meta) => {
    const p = c.b.def, d = new PdfDoc(meta);
    d.disclaimer();
    const alNour = p.slug === 'al-nour';
    const item = alNour ? 'Roof thermal insulation – XPS boards' : 'Basement wall waterproofing membrane';
    d.kv([
      ['Material', item], ['Specification ref.', alNour ? 'Section 07 210 – Thermal insulation' : 'Section 07 130 – Sheet waterproofing'],
      ['Submitted by', p.contractor], ['Supplier', 'Fictional supplier (demo)'], ['Revision', rev], ['Submission date', meta.date],
    ], 140);
    d.h1('Technical data');
    d.table(['Property', 'Specified', 'Proposed', 'Compliance'], alNour
      ? (rev === 'A'
        ? [['Thickness', '80 mm', '50 mm', 'NO'], ['Thermal conductivity', '≤ 0.035 W/mK', '0.034 W/mK', 'YES'], ['Compressive strength', '≥ 300 kPa', '250 kPa', 'NO'], ['Fire class', 'E', 'E', 'YES']]
        : [['Thickness', '80 mm', '80 mm', 'YES'], ['Thermal conductivity', '≤ 0.035 W/mK', '0.034 W/mK', 'YES'], ['Compressive strength', '≥ 300 kPa', '300 kPa', 'YES'], ['Fire class', 'E', 'E', 'YES']])
      : (rev === 'A'
        ? [['Type', 'Bituminous SBS, 2 layers', 'Single-ply PVC 1.2 mm', 'NO'], ['Thickness', '2 × 4 mm', '1.2 mm', 'NO'], ['Root / puncture resistance', 'Required', 'Not tested', 'NO'], ['Hydrostatic head', '≥ 60 kPa', '50 kPa', 'NO']]
        : [['Type', 'Bituminous SBS, 2 layers', 'SBS, 2 layers', 'YES'], ['Thickness', '2 × 4 mm', '2 × 4 mm', 'YES'], ['Root / puncture resistance', 'Required', 'Tested – compliant', 'YES'], ['Hydrostatic head', '≥ 60 kPa', '60 kPa', 'YES']]),
      [4, 3, 3, 1.6], { align: ['l', 'l', 'l', 'c'] });
    d.h1('Attachments');
    d.bullets(['Manufacturer’s data sheet (fictional)', 'Test certificates (fictional)', 'Sample reference ' + (rev === 'A' ? 'S-01' : 'S-02')]);
    d.h1('Engineer’s review');
    if (rev === 'A') {
      d.p(alNour ? 'Rejected (Code C). Thickness and compressive strength do not comply with the specification. Resubmit with 80 mm boards rated ≥ 300 kPa.' : 'Rejected (Code C). The proposed single-ply membrane is not equivalent to the specified two-layer SBS system for a 2-level basement below the water table. Resubmit a compliant system.', 9, C.red);
      stamp(d, d.right - 160, d.block(44) + 4, 'REJECTED – CODE C', C.red);
    } else {
      d.p('Resubmitted after Rev. A comments. Review in progress by the Engineer; all specified properties are now met according to the data sheet.', 9, C.ink);
      stamp(d, d.right - 160, d.block(44) + 4, 'RESUBMITTED', [0.25, 0.3, 0.7]);
    }
    return d.toBuffer();
  };
}

const mockup: Builder = (c, meta) => {
  const p = c.b.def, d = new PdfDoc(meta);
  d.disclaimer();
  const alNour = p.slug === 'al-nour';
  d.kv([['Mock-up', alNour ? 'Typical apartment bathroom (Block A, R+1, unit A-104)' : 'Basement wall waterproofing and protection board – 3 × 3 m panel'], ['Inspected by', `${p.consultant}, ${p.contractor}, ${p.client}`], ['Date', meta.date]], 140);
  d.h1('Inspection results');
  d.table(['Item', 'Result', 'Comment'], alNour
    ? [['Wall tiling joints', 'PASS', '2 mm joints, aligned'], ['Floor falls to drain', 'PASS', '1.5% verified with level'], ['Sanitary fixtures', 'CONDITIONAL', 'WC to be moved 30 mm from wall'], ['Silicone finish', 'PASS', '–'], ['Accessories', 'PASS', 'As per finishes schedule']]
    : [['Substrate preparation', 'PASS', 'Primer applied at 0.3 l/m²'], ['Overlaps', 'PASS', '100 mm side / 150 mm end'], ['Corner detailing', 'CONDITIONAL', 'Add fillet at wall/raft junction'], ['Protection board', 'PASS', '–']], [4, 2, 5]);
  d.p('The approved mock-up is the reference for workmanship for the rest of the works.');
  stamp(d, d.right - 160, d.block(44) + 4, 'APPROVED WITH COMMENTS', C.amber);
  return d.toBuffer();
};

const progressReport: Builder = (c, meta) => {
  const p = c.b.def, d = new PdfDoc(meta);
  d.disclaimer();
  const mr = [...c.b.monthlyReports].reverse().find(m => m.status === 'APPROVED') ?? c.b.monthlyReports[c.b.monthlyReports.length - 1];
  d.h1('Executive summary'); d.p(mr.executiveSummary);
  d.kv([
    ['Overall progress', `${mr.overallProgress}% (planned ${mr.plannedProgress}%)`], ['Man-days', num(mr.totalManpowerDays)], ['Peak manpower', String(mr.peakManpower)],
    ['Budget expended', money(mr.budgetExpended, c.cur)], ['Forecast final cost', money(mr.forecastFinalCost, c.cur)],
    ['Milestones', `${mr.completedMilestones} achieved · ${mr.pendingMilestones} pending · ${mr.delayedMilestones} delayed`],
    ['Risks / NCRs', `${mr.openRisks} open risks · ${mr.openNCRs} open NCRs · ${mr.closedNCRs} closed NCRs`],
  ], 140);
  d.h1('Progress by discipline');
  const disc = JSON.parse(mr.progressByDiscipline) as Record<string, { total: number; completed: number; inProgress: number; delayed: number; avgProgress: number }>;
  d.table(['Discipline', 'Activities', 'Completed', 'In progress', 'Delayed', 'Avg. progress'],
    Object.entries(disc).map(([k, v]) => [k, String(v.total), String(v.completed), String(v.inProgress), String(v.delayed), `${v.avgProgress}%`]), [3, 1.5, 1.5, 1.5, 1.5, 1.8], { align: ['l', 'r', 'r', 'r', 'r', 'r'] });
  d.h1('Key achievements'); d.bullets(mr.keyAchievements.split('\n').map((s: string) => s.replace(/^• /, '')));
  d.h1('Challenges'); d.bullets(mr.majorChallenges.split('\n').map((s: string) => s.replace(/^• /, '')));
  return d.toBuffer();
};

// ─── SVG illustrations ────────────────────────────────────────────────────────
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function svgFrame(inner: string, caption: string, project: string, accent = '#C9982C') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img" aria-label="${esc(caption)} (fictional illustration)">
<title>${esc(caption)} – fictional illustration</title>
${inner}
<rect x="0" y="720" width="1200" height="80" fill="#0A0A0B"/>
<rect x="0" y="718" width="1200" height="3" fill="${accent}"/>
<text x="28" y="752" font-family="Inter,Arial,sans-serif" font-size="24" fill="#F5F1E8">${esc(caption)}</text>
<text x="28" y="782" font-family="Inter,Arial,sans-serif" font-size="16" fill="#D4A53C">${esc(project)} · FICTIONAL ILLUSTRATION – DEMO DATA</text>
<text x="1172" y="782" text-anchor="end" font-family="Inter,Arial,sans-serif" font-size="16" fill="#8A8A8E">BuildTrack Pro</text>
</svg>
`;
}
function scene(kind: string, seed: string): string {
  const r = (...k: (string | number)[]) => rnd(seed, ...k);
  const sky = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9EC3DE"/><stop offset="1" stop-color="#E8EEF2"/></linearGradient></defs><rect width="1200" height="720" fill="url(#sky)"/>`;
  const out: string[] = [];
  if (kind === 'tower') {
    out.push(sky, '<rect y="560" width="1200" height="160" fill="#B9A88A"/>');
    [[120, 230, 260], [470, 200, 300], [820, 260, 260]].forEach(([x, top, w], i) => {
      const floors = 9, fh = (560 - top) / floors;
      out.push(`<rect x="${x}" y="${top}" width="${w}" height="${560 - top}" fill="${['#D8D2C6', '#CFC7B8', '#DDD6CA'][i]}" stroke="#6B6458" stroke-width="2"/>`);
      for (let f = 0; f < floors; f++) for (let k = 0; k < 5; k++) {
        const done = f < floors - Math.floor(r('fl', i) * 3);
        out.push(`<rect x="${x + 18 + k * (w - 36) / 5}" y="${top + 10 + f * fh}" width="${(w - 36) / 5 - 14}" height="${fh - 18}" fill="${done ? '#5B6B78' : '#8E867A'}" opacity="${done ? 0.85 : 0.5}"/>`);
      }
      if (r('sc', i) > 0.4) out.push(`<g stroke="#C9982C" stroke-width="3" opacity="0.8">${Array.from({ length: 10 }, (_, k) => `<line x1="${x - 12}" y1="${top + k * (560 - top) / 10}" x2="${x + w + 12}" y2="${top + k * (560 - top) / 10}"/>`).join('')}<line x1="${x - 12}" y1="${top}" x2="${x - 12}" y2="560"/><line x1="${x + w + 12}" y1="${top}" x2="${x + w + 12}" y2="560"/></g>`);
    });
    out.push('<g stroke="#D4A53C" stroke-width="6" fill="none"><line x1="700" y1="560" x2="700" y2="70"/><line x1="560" y1="90" x2="1120" y2="90"/><line x1="700" y1="70" x2="1050" y2="90"/><line x1="700" y1="70" x2="580" y2="90"/></g><line x1="980" y1="90" x2="980" y2="260" stroke="#333" stroke-width="2"/><rect x="960" y="260" width="40" height="22" fill="#555"/>');
  } else if (kind === 'pit') {
    out.push(sky, '<polygon points="0,300 1200,300 1200,720 0,720" fill="#A88F6A"/><polygon points="120,330 1080,330 980,660 220,660" fill="#7E6648"/><polygon points="220,660 980,660 1080,330 1200,330 1200,720 0,720 0,330 120,330" fill="#9A8260"/>');
    for (let i = 0; i < 14; i++) out.push(`<rect x="${130 + i * 68}" y="300" width="60" height="40" fill="#9C9C98" stroke="#555" />`);
    out.push('<rect x="120" y="300" width="960" height="18" fill="#BDBDB8"/>');
    for (let i = 0; i < 5; i++) out.push(`<line x1="${180 + i * 200}" y1="420" x2="${300 + i * 160}" y2="420" stroke="#C9982C" stroke-width="10"/>`);
    out.push(`<g fill="#E0B040" stroke="#333" stroke-width="2"><rect x="${420 + r('ex') * 200}" y="560" width="130" height="50"/><rect x="${470 + r('ex') * 200}" y="520" width="60" height="40"/></g><line x1="${550 + r('ex') * 200}" y1="540" x2="${640 + r('ex') * 200}" y2="480" stroke="#333" stroke-width="10"/>`);
    for (let i = 0; i < 4; i++) out.push(`<circle cx="${260 + i * 220}" cy="640" r="10" fill="#3D6B8E"/>`);
  } else if (kind === 'slab') {
    out.push('<rect width="1200" height="720" fill="#C9C3B6"/><polygon points="0,720 1200,720 1000,260 200,260" fill="#8E8778"/>');
    for (let i = 0; i <= 24; i++) out.push(`<line x1="${200 + i * 800 / 24}" y1="260" x2="${i * 1200 / 24}" y2="720" stroke="#7A3B1E" stroke-width="3"/>`);
    for (let j = 0; j <= 14; j++) { const t = j / 14, y = 260 + t * 460, x0 = 200 - t * 200, x1 = 1000 + t * 200; out.push(`<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="#8A4A25" stroke-width="${2 + t * 3}"/>`); }
    for (let i = 0; i < 3; i++) out.push(`<rect x="${300 + i * 260}" y="180" width="40" height="${90 + i * 10}" fill="#A9A49A" stroke="#555"/>`);
    out.push(`<circle cx="${450 + r('w') * 300}" cy="${470 + r('w2') * 80}" r="18" fill="#E8C24A"/><rect x="${440 + r('w') * 300}" y="${488 + r('w2') * 80}" width="20" height="50" fill="#E06B1F"/>`);
  } else {
    out.push('<rect width="1200" height="720" fill="#E7E1D5"/><polygon points="0,0 300,180 300,560 0,720" fill="#D3CBBC"/><polygon points="1200,0 900,180 900,560 1200,720" fill="#D9D1C2"/><rect x="300" y="180" width="600" height="380" fill="#EEE8DC"/><polygon points="0,720 300,560 900,560 1200,720" fill="#BFB6A6"/>');
    if (kind === 'brick') for (let j = 0; j < 12; j++) for (let i = 0; i < 10; i++) out.push(`<rect x="${300 + i * 60 + (j % 2) * 30}" y="${560 - (j + 1) * 30}" width="56" height="26" fill="#B5623C" opacity="${j < 8 + r('h') * 4 ? 1 : 0}"/>`);
    else for (let j = 0; j < 6; j++) for (let i = 0; i < 12; i++) out.push(`<line x1="${300 - j * 50 + i * (600 + j * 100) / 12}" y1="${560 + j * 27}" x2="${300 - (j + 1) * 50 + i * (600 + (j + 1) * 100) / 12}" y2="${560 + (j + 1) * 27}" stroke="#9C9282"/>`);
    out.push('<rect x="560" y="300" width="80" height="260" fill="#6F6556" opacity="0.6"/>');
  }
  return out.join('\n');
}
const SCENE_KIND: Record<string, string> = {
  'site-overview': 'tower', 'facade-render': 'tower', scaffold: 'tower', 'lift-shaft': 'tower', 'roof-waterproofing': 'slab', 'electrical-riser': 'interior',
  masonry: 'brick', tiling: 'interior', dwall: 'pit', excavation: 'pit', dewatering: 'pit', 'raft-pour': 'slab', 'b1-slab': 'slab', rebar: 'slab', sleeves: 'slab',
};

export function demoSvgs(b: DemoBundle): DemoFile[] {
  const files: DemoFile[] = [];
  for (const sc of PHOTO_SCENES[b.def.slug]) {
    files.push({ path: `photos/${sc.file}.svg`, mime: 'image/svg+xml', buffer: Buffer.from(svgFrame(scene(SCENE_KIND[sc.file] ?? 'interior', b.def.slug + sc.file), sc.caption, b.def.name)) });
  }
  b.ncrs.forEach((n, i) => {
    const kind = /rebar|cover|concrete|honeycomb|slab|pour|sleeve/i.test(n.title + n.description) ? 'slab' : /masonry|wall|block/i.test(n.title) ? 'brick' : 'interior';
    const inner = scene(kind, b.def.slug + 'ncr' + i) + `<circle cx="${480 + rnd('ncr', i) * 240}" cy="${380 + rnd('ncr2', i) * 120}" r="90" fill="none" stroke="#C0392B" stroke-width="8"/><rect x="28" y="28" width="250" height="52" fill="#C0392B"/><text x="44" y="64" font-family="Inter,Arial,sans-serif" font-size="28" font-weight="700" fill="#fff">${esc(n.ncrNumber)}</text>`;
    files.push({ path: `photos/ncr-${String(i + 1).padStart(2, '0')}.svg`, mime: 'image/svg+xml', buffer: Buffer.from(svgFrame(inner, `${n.title} – as found`, b.def.name, '#C0392B')) });
  });
  return files;
}

// ─── catalogue ────────────────────────────────────────────────────────────────
interface Spec { key: string; type: string; title: string; docNo: string; rev: string; day: number; status: string; uploader: string; build: Builder; description: string }

function specs(c: Ctx): Spec[] {
  const p = c.b.def, s = c.b.short, alNour = p.slug === 'al-nour';
  const T = c.b.anchorDay;
  const n = (k: string, i = 1) => `${p.code}-${k}-${String(i).padStart(3, '0')}`;
  const list: Spec[] = [
    { key: 'contract', type: 'CONTRACT', title: 'Main Works Contract Agreement', docNo: n('CON'), rev: '0', day: -10, status: 'SIGNED', uploader: 'pm', build: contract, description: 'Contract agreement and particular conditions (extract)' },
    { key: 'addendum-01', type: 'ADDENDUM', title: 'Contract Addendum No. 1', docNo: n('ADD'), rev: '0', day: alNour ? 120 : 45, status: 'SIGNED', uploader: 'pm', build: addendum, description: 'Amendments agreed after award' },
    { key: 'boq', type: 'BOQ', title: 'Priced Bill of Quantities', docNo: n('BOQ'), rev: 'B', day: -12, status: 'APPROVED', uploader: 'pm', build: boq, description: 'Lot summary and priced items; totals equal the contract sum' },
    { key: 'permit', type: 'PERMIT', title: 'Building Permit', docNo: n('PC'), rev: '0', day: -40, status: 'APPROVED', uploader: 'pm', build: permit, description: 'Fictional building permit specimen with conditions' },
    { key: 'insurance', type: 'INSURANCE', title: 'CAR Insurance Certificate', docNo: n('INS'), rev: '0', day: -5, status: 'APPROVED', uploader: 'pm', build: insurance, description: 'Contractor’s all risks and third-party liability' },
    { key: 'specification', type: 'SPECIFICATION', title: alNour ? 'Specification 03 300 – Cast-in-place Concrete' : 'Specification 02 300 – Diaphragm Walls', docNo: n('SPC'), rev: 'A', day: -20, status: 'APPROVED', uploader: 'consultant', build: specification, description: 'Technical specification section' },
    { key: 'shop-01', type: 'SHOP_DRAWING', title: alNour ? 'Shop Drawing – Typical Slab Reinforcement, Block A' : 'Shop Drawing – D-Wall Panel Reinforcement Cage', docNo: n('SD'), rev: 'B', day: alNour ? 230 : 60, status: 'APPROVED', uploader: 'engineer',
      build: (cc, m) => sheet(cc, m, alNour ? 'Typical slab reinforcement' : 'D-wall cage – typical panel', drawings.rebar, ['All reinforcement B500B. Laps 50Ø unless noted.', 'Cover: 25 mm slabs / 75 mm D-wall.', 'Dimensions in metres; do not scale.'], ['APPROVED – CODE A', C.green]), description: 'Reinforcement shop drawing' },
    { key: 'shop-02', type: 'SHOP_DRAWING', title: alNour ? 'Shop Drawing – Bathroom Plumbing Layout, Typical Floor' : 'Shop Drawing – B1 Slab Sleeves and Openings', docNo: n('SD', 2), rev: 'A', day: T - 9, status: 'UNDER_REVIEW', uploader: 'engineer',
      build: (cc, m) => sheet(cc, m, alNour ? 'Bathroom plumbing – typical floor' : 'B1 slab sleeves & openings', drawings.layout, ['Sleeves to be fixed before concreting and checked by the Engineer.', 'Pipe sizes: DN110 stacks, DN50 branches.', 'Coordinate with structural drawings.'], ['UNDER REVIEW', C.amber]), description: 'MEP coordination shop drawing' },
    { key: 'mat-rev-a', type: 'MATERIAL_SUBMITTAL', title: alNour ? 'Material Submittal – Roof XPS Insulation (Rev. A)' : 'Material Submittal – Basement Waterproofing (Rev. A)', docNo: n('MAT', 7), rev: 'A', day: alNour ? 560 : 300, status: 'REJECTED', uploader: 'contractor', build: materialSubmittal('A'), description: 'Rejected – does not meet specification' },
    { key: 'mat-rev-b', type: 'MATERIAL_SUBMITTAL', title: alNour ? 'Material Submittal – Roof XPS Insulation (Rev. B)' : 'Material Submittal – Basement Waterproofing (Rev. B)', docNo: n('MAT', 7), rev: 'B', day: alNour ? 585 : 330, status: 'RESUBMITTED', uploader: 'contractor', build: materialSubmittal('B'), description: 'Resubmission addressing Rev. A comments' },
    { key: 'method-statement', type: 'METHOD_STATEMENT', title: alNour ? 'Method Statement – External Render and Painting' : 'Method Statement – Diaphragm Wall Construction', docNo: n('MS'), rev: 'B', day: alNour ? 470 : 30, status: 'APPROVED', uploader: 'engineer', build: methodStatement, description: 'Sequence, resources, HSE controls and ITP' },
    { key: 'mockup', type: 'MOCKUP', title: alNour ? 'Mock-up Inspection – Typical Bathroom' : 'Mock-up Inspection – Wall Waterproofing Panel', docNo: n('MU'), rev: '0', day: alNour ? 600 : 340, status: 'APPROVED', uploader: 'consultant', build: mockup, description: 'Mock-up inspection record' },
    { key: 'rfi', type: 'RFI', title: alNour ? 'RFI – Sprinkler / Cable Tray Clash, Block B R+4' : 'RFI – B1 Slab Drainage Sleeves', docNo: n('RFI', 14), rev: '0', day: T - 21, status: 'ANSWERED', uploader: 'engineer', build: rfi, description: 'Request for information with Engineer’s response' },
    { key: 'site-plan', type: 'DRAWING', title: 'General Site Plan', docNo: n('GA'), rev: 'C', day: -25, status: 'FOR_CONSTRUCTION', uploader: 'consultant',
      build: (cc, m) => sheet(cc, m, 'General site plan', drawings.site(alNour
        ? [[0.08, 0.15, 0.22, 0.6, 'BLOCK A'], [0.39, 0.15, 0.22, 0.6, 'BLOCK B'], [0.7, 0.15, 0.22, 0.6, 'BLOCK C'], [0.08, 0.8, 0.12, 0.1, 'Gatehouse']]
        : [[0.08, 0.15, 0.36, 0.65, 'NORTH MALL'], [0.56, 0.15, 0.36, 0.65, 'SOUTH MALL'], [0.44, 0.3, 0.12, 0.35, 'ATRIUM'], [0.3, 0.82, 0.4, 0.1, 'Car park ramps']]),
      ['Basement footprint follows the site boundary less 3 m.', 'Levels refer to the fictional project datum ±0.00 = 52.40.', 'Drawing for demonstration only.']), description: 'General arrangement / site layout' },
    { key: 'monthly-report', type: 'REPORT', title: 'Monthly Progress Report (latest approved)', docNo: n('MPR'), rev: '0', day: T - 20, status: 'APPROVED', uploader: 'pm', build: progressReport, description: 'Monthly report generated from the seeded data' },
  ];
  return list.map(x => ({ ...x, day: Math.min(x.day, T) }));
}

export function demoDocuments(data: DemoData, b: DemoBundle): { files: DemoFile[]; documents: DemoDocument[] } {
  const p = b.def;
  const start = Date.parse(p.start + 'T00:00:00Z');
  const ctx: Ctx = {
    b, data, code: p.code, name: p.name, cur: p.currency,
    day: t => new Date(start + t * DAY + 11 * 3_600_000),
    party: re => p.intervenants.find(x => re.test(x.role)) ?? { company: p.contractor, contact: '' },
  };
  const uid = (k: string) => data.users.find(u => u.key === k)?.id ?? data.users.find(u => u.key === 'pm')!.id;
  const files: DemoFile[] = [], documents: DemoDocument[] = [];
  for (const s of specs(ctx)) {
    const date = ctx.day(s.day);
    const meta: DocMeta = { title: s.title, docNo: s.docNo, projectName: p.name, projectCode: p.code, revision: s.rev, date: iso(date), status: s.status.replace(/_/g, ' ') };
    const buffer = s.build(ctx, meta);
    const fileName = `${s.key}.pdf`;
    files.push({ path: fileName, buffer, mime: 'application/pdf' });
    documents.push({
      id: `demo-doc-${b.short.toLowerCase()}-${s.key}`, projectId: p.id, name: `${s.title} [DEMO]`, description: `${s.description}. Fictional demonstration document (${s.docNo}).`,
      type: s.type, fileUrl: `/demo-docs/${p.slug}/${fileName}`, fileName, fileSize: buffer.length, mimeType: 'application/pdf', revision: s.rev,
      tags: JSON.stringify([s.status, 'DEMO', 'FICTIONAL']), uploadedBy: uid(s.uploader), createdAt: date, updatedAt: date,
    });
  }
  const svgs = demoSvgs(b);
  files.push(...svgs);
  const overview = svgs[0];
  const d0 = ctx.day(Math.max(0, b.anchorDay - 3));
  documents.push({
    id: `demo-doc-${b.short.toLowerCase()}-photo-overview`, projectId: p.id, name: 'Site overview illustration [DEMO]', description: 'Fictional illustration of the site (not a photograph).',
    type: 'PHOTO', fileUrl: `/demo-docs/${p.slug}/${overview.path}`, fileName: overview.path.split('/').pop()!, fileSize: overview.buffer.length, mimeType: 'image/svg+xml', revision: '0',
    tags: JSON.stringify(['DEMO', 'FICTIONAL']), uploadedBy: uid('engineer'), createdAt: d0, updatedAt: d0,
  });
  return { files, documents };
}

export const sha256 = (b: Buffer) => createHash('sha256').update(b).digest('hex');
export { PAGE };
