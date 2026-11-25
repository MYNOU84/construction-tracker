#!/usr/bin/env node
/**
 * Export regression tests for the PDF and Excel exports.
 *
 *   npm run test:exports            run the checks and compare with snapshot.json
 *   npm run test:exports -- --update  rewrite snapshot.json (review the diff first)
 *
 * The real modules in src/utils are bundled with esbuild exactly as the browser
 * build uses them (browser entry points of jspdf, jspdf-autotable and exceljs),
 * then run in Node with a minimal DOM stub that captures each download instead
 * of saving it. The clock is frozen so the output is deterministic.
 *
 * Checks:
 *   - explicit assertions on file names, page/sheet counts, section titles,
 *     computed totals, averages, percentages, colours and merges;
 *   - a structural snapshot of every export (PDF: text, font, position and
 *     fill colours per page; Excel: values, styles, merges, widths per sheet).
 *
 * All data comes from fixtures.mjs (fictional). Nothing touches the database.
 */
process.env.TZ = 'UTC';

import { build } from 'esbuild';
import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as fx from './fixtures.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.resolve(here, '..', '..');
const snapshotFile = path.join(here, 'snapshot.json');
const update = process.argv.includes('--update');

// ─── Frozen clock ────────────────────────────────────────────────────────────
const FIXED_NOW = Date.UTC(2026, 3, 1, 9, 30, 0); // 01 April 2026 09:30 UTC
const RealDate = Date;
class FrozenDate extends RealDate {
  constructor(...args) { if (args.length === 0) super(FIXED_NOW); else super(...args); }
  static now() { return FIXED_NOW; }
}
globalThis.Date = FrozenDate;

// ─── Minimal DOM stub that captures downloads ────────────────────────────────
const blobs = new Map();
const downloads = [];
let blobSeq = 0;
class HTMLAnchorElement {
  constructor() { this.href = ''; this.download = ''; this.rel = ''; this.style = {}; }
  click() { downloads.push({ name: this.download, blob: blobs.get(this.href) }); }
  dispatchEvent() { this.click(); return true; }
  setAttribute(k, v) { this[k] = v; }
}
HTMLAnchorElement.prototype.download = ''; // FileSaver feature-detects `download in prototype`
globalThis.window = globalThis;
globalThis.self = globalThis;
globalThis.HTMLAnchorElement = HTMLAnchorElement;
globalThis.MouseEvent = class MouseEvent { constructor(type) { this.type = type; } };
globalThis.document = {
  createElement: (tag) => {
    if (tag !== 'a') throw new Error(`Unexpected createElement(${tag}) in export code`);
    return new HTMLAnchorElement();
  },
  body: { appendChild() {}, removeChild() {} },
};
URL.createObjectURL = (blob) => { const u = `blob:test/${++blobSeq}`; blobs.set(u, blob); return u; };
URL.revokeObjectURL = (u) => { /* keep blobs until read */ };

// ─── Bundle the real export modules ──────────────────────────────────────────
const outDir = path.join(clientDir, 'node_modules', '.cache', 'buildtrack-export-tests');
const outFile = path.join(outDir, 'bundle.mjs');
await build({
  stdin: {
    contents: `
      export { exportDailyReportPDF, exportWeeklyReportPDF, exportMonthlyReportPDF } from './utils/exportPDF';
      export { exportPresentationPDF } from './utils/exportPresentation';
      export { exportDailyReportExcel, exportMonthlyReportExcel } from './utils/exportExcel';
    `,
    resolveDir: path.join(clientDir, 'src'),
    loader: 'ts',
  },
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2020',
  outfile: outFile,
  // Optional jsPDF features (html(), SVG) are not used by the exports.
  external: ['html2canvas', 'dompurify', 'canvg'],
  logLevel: 'error',
});
const mod = await import(pathToFileURL(outFile).href + `?t=${RealDate.now()}`);

// ─── Helpers ─────────────────────────────────────────────────────────────────
let failures = 0;
let passes = 0;
function check(name, cond, detail = '') {
  if (cond) { passes++; return; }
  failures++;
  console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
}

let dumpSeq = 0;
async function capture(fn) {
  const before = downloads.length;
  await fn();
  await new Promise((r) => setTimeout(r, 5)); // FileSaver clicks on a timer
  const got = downloads.slice(before);
  if (got.length !== 1) throw new Error(`expected 1 download, got ${got.length}`);
  const { name, blob } = got[0];
  const bytes = Buffer.from(await blob.arrayBuffer());
  // EXPORT_TEST_OUT=<folder> keeps the generated files for a visual check.
  if (process.env.EXPORT_TEST_OUT) {
    fs.mkdirSync(process.env.EXPORT_TEST_OUT, { recursive: true });
    fs.writeFileSync(path.join(process.env.EXPORT_TEST_OUT, `${++dumpSeq}-${name}`), bytes);
  }
  return { name, bytes, type: blob.type };
}

const round = (n) => Math.round(Number(n) * 10) / 10;

// Standard fonts use WinAnsiEncoding, which differs from Latin-1 only in 0x80–0x9F.
const WIN_ANSI = '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008DŽ\u008F\u0090‘’“”•–—˜™š›œ\u009DžŸ';
function unescapePdf(s) {
  const bytes = s.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, c) => {
    if (/^[0-7]+$/.test(c)) return String.fromCharCode(parseInt(c, 8));
    return { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' }[c] ?? c;
  });
  return bytes.replace(/[\x80-\x9f]/g, (ch) => WIN_ANSI[ch.charCodeAt(0) - 0x80]);
}

/** Parse an uncompressed jsPDF document into pages of text items and fill colours. */
function parsePdf(bytes) {
  const src = bytes.toString('latin1');
  if (!src.startsWith('%PDF-')) throw new Error('not a PDF');
  const objs = new Map();
  for (const m of src.matchAll(/(\d+) 0 obj\s*([\s\S]*?)endobj/g)) objs.set(Number(m[1]), m[2]);
  const pagesObj = [...objs.values()].find((o) => /\/Type \/Pages/.test(o));
  const kids = [...pagesObj.match(/\/Kids \[([^\]]*)\]/)[1].matchAll(/(\d+) 0 R/g)].map((m) => Number(m[1]));
  return kids.map((id) => {
    const page = objs.get(id);
    const mediaBox = page.match(/\/MediaBox \[([^\]]*)\]/)[1].trim().split(/\s+/).map(round);
    const contentsId = Number(page.match(/\/Contents (\d+) 0 R/)[1]);
    const stream = objs.get(contentsId).match(/stream\r?\n([\s\S]*?)\r?\nendstream/)[1];
    if (/\/Filter/.test(objs.get(contentsId).split('stream')[0])) throw new Error('compressed stream');
    const texts = [];
    const fills = new Set();
    const rects = [];
    let font = '';
    let size = 0;
    let fill = '';
    let x = 0;
    let y = 0;
    const tokens = stream.match(/\((?:\\.|[^\\)])*\)|\[[^\]]*\]|\/[^\s/[\]()<>]+|[^\s()[\]/]+/g) || [];
    const stack = [];
    for (const t of tokens) {
      switch (t) {
        case 'Tf': size = round(stack.pop()); font = stack.pop(); stack.length = 0; break;
        case 'Td': y = round(stack.pop()); x = round(stack.pop()); stack.length = 0; break;
        case 'rg': {
          const [r, g, b] = stack.splice(-3).map((v) => Math.round(Number(v) * 255));
          fill = `${r},${g},${b}`; fills.add(fill); stack.length = 0; break;
        }
        case 'g': { const v = Math.round(Number(stack.pop()) * 255); fill = `${v},${v},${v}`; fills.add(fill); stack.length = 0; break; }
        case 're': {
          const [rx, ry, rw, rh] = stack.splice(-4).map(Number);
          rects.push({ x: round(rx), y: round(ry), w: round(rw), h: round(rh), fill });
          stack.length = 0;
          break;
        }
        case 'Tj': {
          const raw = stack.pop();
          texts.push({ x, y, font, size, color: fill, text: unescapePdf(raw.slice(1, -1)) });
          stack.length = 0;
          break;
        }
        default:
          if (/^[a-zA-Z*'"]+$/.test(t)) stack.length = 0; else stack.push(t);
      }
    }
    // Rectangles stay out of the JSON snapshot (non-enumerable); tests read them directly.
    const result = { mediaBox, texts, fills: [...fills].sort() };
    Object.defineProperty(result, 'rects', { value: rects, enumerable: false });
    return result;
  });
}

const pageText = (page) => page.texts.map((t) => t.text);
const allText = (pages) => pages.flatMap(pageText);
const has = (pages, s) => allText(pages).some((t) => t === s);
const hasPart = (pages, s) => allText(pages).some((t) => t.includes(s));
const textColor = (pages, s) => pages.flatMap((p) => p.texts).find((t) => t.text === s)?.color;
// jsPDF writes colours with 3 decimals, so a channel may come back one unit off.
const near = (rgbText, [r, g, b]) => {
  if (!rgbText) return false;
  const [x, y, z] = rgbText.split(',').map(Number);
  return Math.abs(x - r) <= 2 && Math.abs(y - g) <= 2 && Math.abs(z - b) <= 2;
};
const hasFill = (page, rgb) => page.fills.some((f) => near(f, rgb));

function argb(c) { return c?.argb ?? c?.theme ?? undefined; }

/** Load an xlsx buffer and describe every sheet. */
async function parseXlsx(bytes) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes);
  const sheets = [];
  wb.eachSheet((ws) => {
    const rows = [];
    ws.eachRow({ includeEmpty: true }, (row, r) => {
      const cells = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        const v = cell.value;
        if (v == null && !cell.fill?.fgColor && !cell.font) return;
        cells.push({
          a: cell.address,
          v: v && typeof v === 'object' && !(v instanceof RealDate) ? JSON.stringify(v) : v,
          fmt: cell.numFmt || undefined,
          font: cell.font ? [cell.font.bold ? 'b' : '', cell.font.italic ? 'i' : '', cell.font.size, argb(cell.font.color)].join('|') : undefined,
          fill: cell.fill?.fgColor ? argb(cell.fill.fgColor) : undefined,
          align: cell.alignment?.horizontal,
          border: cell.border?.top?.style,
        });
      });
      rows.push({ r, h: row.height, cells });
    });
    sheets.push({
      name: ws.name,
      tab: argb(ws.properties.tabColor),
      views: (ws.views || []).map((v) => `${v.state}:${v.ySplit ?? 0}`),
      widths: ws.columns?.map((c) => c.width) ?? [],
      merges: [...(ws.model.merges || [])].sort(),
      rows,
    });
  });
  return { creator: wb.creator, sheets };
}

const sheet = (wbx, name) => wbx.sheets.find((s) => s.name === name);
const cell = (ws, addr) => ws?.rows.flatMap((r) => r.cells).find((c) => c.a === addr);
const rowValues = (ws) => ws.rows.map((r) => r.cells.map((c) => c.v));

// ─── Run every export ────────────────────────────────────────────────────────
const snapshot = {};
const num = (n) => n.toLocaleString();

// Daily PDF, all sections
{
  const out = await capture(() => mod.exportDailyReportPDF(fx.dailyFull, fx.project));
  const pages = parsePdf(out.bytes);
  snapshot['pdf:daily-full'] = { name: out.name, pages };
  console.log(`Daily PDF (full): ${out.name}, ${pages.length} pages`);
  check('daily file name', out.name === 'Daily_Report_57_2026-03-12.pdf', out.name);
  check('daily A4', pages.every((p) => p.mediaBox[2] === 595.3 && p.mediaBox[3] === 841.9), JSON.stringify(pages[0].mediaBox));
  check('daily title', has(pages, 'Daily Site Report #57'));
  check('daily subtitle', has(pages, 'Date: Thursday 12 March 2026 — Week 11 — Status: SUBMITTED'));
  check('daily project band', has(pages, 'Project: Harbour View Residences (DEMO) (DEMO-HVR)'));
  check('daily generated stamp', has(pages, 'Generated: 01/04/2026 09:30'));
  for (const s of ['1. GENERAL INFORMATION', '2. GENERAL SUMMARY', '3. MANPOWER', '4. EQUIPMENT', '5. MATERIALS', '6. TASKS EXECUTED', '7. DELAYS & ISSUES', 'APPROVALS & SIGNATURES']) {
    check(`daily section ${s}`, has(pages, s));
  }
  check('daily weather label', has(pages, 'Sunny'));
  check('daily temperature', has(pages, '24°C'));
  check('daily positions translated', ['Masons', 'Steel Fixers', 'Site Foreman', 'Electricians'].every((s) => has(pages, s)));
  const mp = pageText(pages[0]);
  const after = (label) => { const i = allText(pages).indexOf(label); return allText(pages)[i + 1]; };
  check('daily TOTAL DIRECT = 44', after('TOTAL DIRECT') === '44', after('TOTAL DIRECT'));
  check('daily TOTAL INDIRECT = 20', after('TOTAL INDIRECT') === '20', after('TOTAL INDIRECT'));
  check('daily GRAND TOTAL = 64', after('GRAND TOTAL') === '64', after('GRAND TOTAL'));
  check('daily np fallback (14 from np)', mp.includes('14'));
  check('daily equipment status underscores', has(pages, 'IN USE') && has(pages, 'STAND BY'));
  check('daily materials qty delivered/expected', has(pages, '182') && has(pages, '180'));
  check('daily HSE header', has(pages, '5- HSE'));
  check('daily HSE zero padding', ['00', '01', '03', '12', '02', '05'].every((s) => has(pages, s)));
  check('daily HSE comment', has(pages, 'Harness not clipped'));
  check('daily lost hours', has(pages, 'Lost Of Working Hours: 03 H'));
  check('daily remarks skip blanks', has(pages, 'Hoist landing barrier reinstated') && has(pages, 'Fire extinguisher L3 replaced'));
  check('daily signatures on last page', pageText(pages.at(-1)).includes('APPROVALS & SIGNATURES'));
  check('daily signature date', pageText(pages.at(-1)).includes('12/03/2026'));
  check('daily footer every page', pages.every((p, i) => pageText(p).includes(`Page ${i + 1} / ${pages.length}`)));
  check('daily ink header fill', hasFill(pages[0], [10, 10, 11]));
  check('daily charcoal banner fill', hasFill(pages[0], [23, 23, 26]));
  check('daily gold accent fill', hasFill(pages[0], [201, 152, 44]));
  check('daily delay section red', pages.some((p) => hasFill(p, [220, 38, 38])));
}

// Daily PDF, no optional sections
{
  const out = await capture(() => mod.exportDailyReportPDF(fx.dailyEmpty, fx.project));
  const pages = parsePdf(out.bytes);
  snapshot['pdf:daily-empty'] = { name: out.name, pages };
  console.log(`Daily PDF (empty): ${out.name}, ${pages.length} pages`);
  check('daily-empty pages', pages.length === 2, String(pages.length));
  check('daily-empty no manpower', !has(pages, '3. MANPOWER'));
  check('daily-empty no summary', !has(pages, '2. GENERAL SUMMARY'));
  check('daily-empty dash temperature', has(pages, '—°C'));
  check('daily-empty raw weather', has(pages, 'Light Rain'));
  check('daily-empty HSE defaults 00', allText(pages).filter((t) => t === '00').length >= 10);
  check('daily-empty 3 remark rows', ['01', '02', '03'].every((s) => has(pages, s)));
  check('daily-empty lost hours', has(pages, 'Lost Of Working Hours: 00 H'));
}

// Weekly PDF
{
  const out = await capture(() => mod.exportWeeklyReportPDF(fx.weekly, fx.project));
  const pages = parsePdf(out.bytes);
  snapshot['pdf:weekly'] = { name: out.name, pages };
  console.log(`Weekly PDF: ${out.name}, ${pages.length} pages`);
  const t = allText(pages);
  const after = (label, n = 1) => t[t.indexOf(label) + n];
  check('weekly file name', out.name === 'Weekly_Report_W11_2026.pdf', out.name);
  check('weekly title', has(pages, 'Weekly Report — Week 11/2026'));
  check('weekly period', has(pages, 'Period: 09/03/2026 to 15/03/2026 — Status: APPROVED'));
  check('weekly progress', has(pages, '41.5%') && has(pages, '44%'));
  check('weekly SPI/CPI', after('SPI') === '0.94' && after('CPI') === '1.02');
  check('weekly company total direct 264', after('TOTAL') === '264', after('TOTAL'));
  check('weekly company total indirect 36', after('TOTAL', 2) === '36', after('TOTAL', 2));
  check('weekly company grand 300', after('TOTAL', 3) === '300', after('TOTAL', 3));
  check('weekly lots', has(pages, 'Structural works') && has(pages, '88.5%'));
  check('weekly KPI >=100 green', near(textColor(pages, '108%'), [22, 163, 74]), textColor(pages, '108%'));
  check('weekly KPI <100 red', near(textColor(pages, '76%'), [220, 38, 38]), textColor(pages, '76%'));
  for (const s of ['KEY PERFORMANCE INDICATORS', 'MANPOWER BREAKDOWN BY COMPANY', 'LOT PRODUCTION STATUS', 'HIGHLIGHTS & ISSUES', 'NEXT WEEK PLAN', 'Highlights & Achievements:', 'Issues & Challenges:']) {
    check(`weekly section ${s}`, has(pages, s));
  }
  check('weekly footer', pages.every((p, i) => pageText(p).includes(`Page ${i + 1} / ${pages.length}`)));
}

// Monthly PDF
{
  const out = await capture(() => mod.exportMonthlyReportPDF(fx.monthly, fx.project));
  const pages = parsePdf(out.bytes);
  snapshot['pdf:monthly'] = { name: out.name, pages };
  console.log(`Monthly PDF: ${out.name}, ${pages.length} pages`);
  const t = allText(pages);
  check('monthly file name', out.name === 'Rapport_Mensuel_March_2026.pdf', out.name);
  check('monthly title', has(pages, 'Monthly Report — March 2026'));
  check('monthly avg workers 1 decimal', t[t.indexOf('Avg Daily Workers') + 1] === '57.2', t[t.indexOf('Avg Daily Workers') + 1]);
  const bars = { Structure: 63, Architecture: 18, Mechanical: 22, Electrical: 14, Plumbing: 0, Infrastructure: 100 };
  // WP3/WP4: progress bars are drawn as vector rectangles (warm track + gold fill),
  // replacing the block-character bars the standard PDF fonts could not encode.
  const barRects = pages.flatMap((p, pi) => p.rects.map((r) => ({ ...r, pi })));
  const tracks = barRects.filter((r) => near(r.fill, [232, 226, 212])).sort((a, b) => a.pi - b.pi || b.y - a.y);
  const golds = barRects.filter((r) => near(r.fill, [201, 152, 44]) && tracks.some((tr) => tr.pi === r.pi && tr.y === r.y && tr.x === r.x));
  check('monthly bar tracks drawn', tracks.length === Object.keys(bars).length, tracks.length);
  Object.entries(bars).forEach(([name, pct], k) => {
    const i = t.indexOf(name);
    check(`monthly ${name} ${pct}%`, t[i + 1] === `${pct}%`, t[i + 1]);
    const track = tracks[k];
    const gold = track && golds.find((g) => g.pi === track.pi && g.y === track.y);
    const filled = gold ? Math.round((gold.w / track.w) * 100) : 0;
    check(`monthly ${name} bar ${pct}% filled`, filled === pct && (pct > 0) === !!gold, filled);
  });
  check('monthly no block-glyph bars', !allText(pages).some((x) => /%ˆ|%‘|█|░/.test(x)));
  check('monthly milestones', ['4', '6', '1'].every((s) => has(pages, s)) && ['Achieved', 'Pending', 'Delayed'].every((s) => has(pages, s)));
  check('monthly budget', has(pages, `${num(4825000)} USD`) && has(pages, `${num(12740000)} USD`) && has(pages, `${num(-240000)} USD`));
  for (const s of ['KEY PERFORMANCE INDICATORS', 'PROGRESS BY DISCIPLINE', 'MILESTONES', 'FINANCIAL STATUS', 'EXECUTIVE SUMMARY', 'KEY ACHIEVEMENTS', 'MAJOR CHALLENGES', 'NEXT MONTH PLAN']) {
    check(`monthly section ${s}`, has(pages, s));
  }
}

// Presentation PDF, all pages
{
  const out = await capture(() => mod.exportPresentationPDF(fx.project, fx.presentation));
  const pages = parsePdf(out.bytes);
  snapshot['pdf:presentation-full'] = { name: out.name, pages };
  console.log(`Presentation PDF (full): ${out.name}, ${pages.length} pages`);
  check('presentation file name', out.name === 'DEMO-HVR_Presentation_01-04-2026.pdf', out.name);
  check('presentation pages', pages.length === 6, String(pages.length));
  check('presentation cover', has(pages, 'DEMO-HVR  —  GENERAL PRESENTATION') && has(pages, '42%'));
  check('presentation facts', has(pages, '18 450 m2') && has(pages, 'B1 + G + 8') && has(pages, '05 Jan 2026'));
  for (const s of ['PROJECT STAKEHOLDERS', 'ZONES & LEVELS', 'BILLING SITUATIONS', 'WEIGHTING & APPROVAL STATUS', 'PLAN LIST']) {
    check(`presentation section ${s}`, has(pages, s));
  }
  check('presentation zone average 48%', has(pages, '48%'));
  check('presentation billed total', has(pages, '$2,080,500'));
  check('presentation paid total', has(pages, '$1,250,000'));
  check('presentation pending total', has(pages, '$830,500'));
  check('presentation billing status labels', has(pages, 'Paid') && has(pages, 'Late'));
  check('presentation weighted progress 27.3%', has(pages, '27.3%'));
  check('presentation weighted rows', has(pages, '25.2%') && has(pages, '2.1%'));
  check('presentation approval labels', has(pages, 'Approved') && has(pages, 'Draft'));
  // Existing behaviour: the header total counts one page more than is produced.
  check('presentation header numbering (unchanged)', has(pages, 'Page 2 / 7'));
  check('presentation gold accent', hasFill(pages[0], [201, 152, 44]));
  check('presentation ink background', pages.every((p) => hasFill(p, [10, 10, 11])));
}

// Presentation PDF, cover only
{
  const out = await capture(() => mod.exportPresentationPDF(fx.project, fx.presentationMinimal));
  const pages = parsePdf(out.bytes);
  snapshot['pdf:presentation-minimal'] = { name: out.name, pages };
  console.log(`Presentation PDF (minimal): ${out.name}, ${pages.length} pages`);
  check('presentation-minimal pages', pages.length === 1, String(pages.length));
  check('presentation-minimal dashes', ['Area', 'Floors', 'Lots', 'Structure'].every((l) => { const t = allText(pages); return t[t.indexOf(l) + 1] === '—'; }));
}

// Daily Excel, all sheets
{
  const out = await capture(() => mod.exportDailyReportExcel(fx.dailyFull, fx.project));
  const wbx = await parseXlsx(out.bytes);
  snapshot['xlsx:daily-full'] = { name: out.name, type: out.type, ...wbx };
  console.log(`Daily Excel (full): ${out.name}, sheets ${wbx.sheets.map((s) => s.name).join(', ')}`);
  check('daily xlsx file name', out.name === 'Daily_Report_57_2026-03-12.xlsx', out.name);
  check('daily xlsx mime', out.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  check('daily xlsx sheets', wbx.sheets.map((s) => s.name).join() === 'COVER,SUMMARY,MANPOWER,EQUIPMENT,MATERIALS,ACTIVITIES,DELAYS');
  check('daily xlsx creator', wbx.creator === 'BuildTrack Pro');
  const cover = sheet(wbx, 'COVER');
  check('cover title', cell(cover, 'B4')?.v === 'BUILDTRACK PRO');
  check('cover title style', cell(cover, 'B4')?.font === 'b||28|FFC9982C');
  check('cover merges', ['B4:F4', 'B5:F5', 'B8:F8', 'B9:F9', 'B12:F12'].every((m) => cover.merges.includes(m)));
  check('cover accent bar', cell(cover, 'A1')?.fill === 'FFC9982C' && cell(cover, 'G1')?.fill === 'FFC9982C');
  check('cover reference', cell(cover, 'B9')?.v === 'Reference: Report #57   ·   Date: 12 March 2026');
  check('cover budget', cell(cover, 'F17')?.v === num(12500000), cell(cover, 'F17')?.v);
  check('cover export date', rowValues(cover).flat().includes('01 April 2026'));
  check('cover confidential red', cover.rows.flatMap((r) => r.cells).find((c) => c.v === 'CONFIDENTIAL')?.font?.endsWith('FFC9474F'));
  check('cover TOC lists 7 sheets', [27, 28, 29, 30, 31, 32, 33].map((r) => cell(cover, `C${r}`)?.v).join() === 'COVER,SUMMARY,MANPOWER,EQUIPMENT,MATERIALS,ACTIVITIES,DELAYS');
  const summ = sheet(wbx, 'SUMMARY');
  check('summary title', cell(summ, 'A1')?.v === 'DAILY SITE REPORT — SUMMARY');
  check('summary frozen', summ.views[0] === 'frozen:1');
  check('summary weather', rowValues(summ).some((r) => r[0] === 'Weather' && r[1] === 'SUNNY' && r[3] === '24 °C'));
  check('summary safety numbers', rowValues(summ).some((r) => r[0] === 'Toolbox Talks' && r[1] === 2 && r[3] === 0));
  check('summary narratives', ['  GENERAL SUMMARY', '  WORK COMPLETED', '  PLANNED WORK', '  SAFETY NOTES'].every((s) => rowValues(summ).flat().includes(s)));
  const man = sheet(wbx, 'MANPOWER');
  check('manpower frozen header', man.views[0] === 'frozen:3');
  check('manpower header', JSON.stringify(rowValues(man)[1]) === JSON.stringify(['#', 'Trade / Position', 'Company', 'Type', 'Count', 'Hours']));
  check('manpower translated', rowValues(man).some((r) => r[1] === 'Masons' && r[4] === 18));
  const total = man.rows.at(-1);
  check('manpower total row', total.cells.find((c) => c.a.startsWith('E'))?.v === 64 && total.cells[0].v === '∑');
  check('manpower total style', total.cells[0].fill === 'FFF3E9D2' && total.cells[0].border === 'medium');
  check('manpower zebra rows', cell(man, 'B3')?.fill === 'FFFFFFFF' && cell(man, 'B4')?.fill === 'FFF8F4EA');
  check('manpower header fill', cell(man, 'A2')?.fill === 'FF1F1F23');
  check('equipment default count', rowValues(sheet(wbx, 'EQUIPMENT')).some((r) => r[1] === 'Concrete pump' && r[2] === 2));
  check('materials numeric qty', rowValues(sheet(wbx, 'MATERIALS')).some((r) => r[1] === 'Rebar T16' && r[2] === 12.5));
  check('activities progress', rowValues(sheet(wbx, 'ACTIVITIES')).some((r) => r[4] === 100 && r[5] === 'COMPLETED'));
  check('delays tab red', sheet(wbx, 'DELAYS').tab === 'FFC9474F');
}

// Daily Excel, no optional sheets
{
  const out = await capture(() => mod.exportDailyReportExcel(fx.dailyEmpty, fx.project));
  const wbx = await parseXlsx(out.bytes);
  snapshot['xlsx:daily-empty'] = { name: out.name, type: out.type, ...wbx };
  console.log(`Daily Excel (empty): ${out.name}, sheets ${wbx.sheets.map((s) => s.name).join(', ')}`);
  check('daily-empty xlsx sheets', wbx.sheets.map((s) => s.name).join() === 'COVER,SUMMARY');
  check('daily-empty xlsx temperature dash', rowValues(sheet(wbx, 'SUMMARY')).some((r) => r[0] === 'Weather' && r[3] === '— °C'));
  check('daily-empty xlsx no narratives', !rowValues(sheet(wbx, 'SUMMARY')).flat().includes('  GENERAL SUMMARY'));
}

// Monthly Excel, with daily log
{
  const out = await capture(() => mod.exportMonthlyReportExcel(fx.monthly, fx.project, fx.monthLog));
  const wbx = await parseXlsx(out.bytes);
  snapshot['xlsx:monthly'] = { name: out.name, type: out.type, ...wbx };
  console.log(`Monthly Excel: ${out.name}, sheets ${wbx.sheets.map((s) => s.name).join(', ')}`);
  check('monthly xlsx file name', out.name === 'Monthly_Report_March_2026.xlsx', out.name);
  check('monthly xlsx sheets', wbx.sheets.map((s) => s.name).join() === 'COVER,SUMMARY,DISCIPLINES,DAILY LOG');
  const summ = sheet(wbx, 'SUMMARY');
  check('monthly xlsx title', cell(summ, 'A1')?.v === 'MONTHLY PROGRESS REPORT — MARCH 2026');
  check('monthly xlsx avg 1 decimal', rowValues(summ).some((r) => r[0] === 'Avg Daily Workforce' && r[1] === '57.2'));
  check('monthly xlsx KPI values', rowValues(summ).some((r) => r[0] === 'Open NCRs' && r[1] === 3 && r[3] === 7));
  const disc = rowValues(sheet(wbx, 'DISCIPLINES'));
  const status = Object.fromEntries(disc.slice(2).map((r) => [r[1], [r[2], r[3]]]));
  check('disciplines statuses', JSON.stringify(status) === JSON.stringify({
    Structure: [63, 'In Progress'], Architecture: [18, 'In Progress'], Mechanical: [22, 'In Progress'],
    Electrical: [14, 'In Progress'], Plumbing: [0, 'Not Started'], Infrastructure: [100, 'Completed'],
  }), JSON.stringify(status));
  const log = sheet(wbx, 'DAILY LOG');
  const logRows = rowValues(log);
  check('daily log rows', logRows.length === 2 + 3 + 1, String(logRows.length));
  check('daily log date format', logRows[2][1] === '10 Mar 2026');
  check('daily log missing weather/temp', logRows[3][3] === '—' && logRows[3][4] === '—');
  check('daily log total 183', logRows.at(-1)[5] === 183, String(logRows.at(-1)[5]));
}

// Monthly Excel, no daily reports
{
  const out = await capture(() => mod.exportMonthlyReportExcel({ ...fx.monthly, avgDailyManpower: undefined }, fx.project, []));
  const wbx = await parseXlsx(out.bytes);
  snapshot['xlsx:monthly-nolog'] = { name: out.name, type: out.type, ...wbx };
  console.log(`Monthly Excel (no log): ${out.name}, sheets ${wbx.sheets.map((s) => s.name).join(', ')}`);
  check('monthly-nolog sheets', wbx.sheets.map((s) => s.name).join() === 'COVER,SUMMARY,DISCIPLINES');
  check('monthly-nolog avg dash', rowValues(sheet(wbx, 'SUMMARY')).some((r) => r[0] === 'Avg Daily Workforce' && r[1] === '—'));
}

// ─── Snapshot comparison ─────────────────────────────────────────────────────
const current = JSON.parse(JSON.stringify(snapshot));
if (update || !fs.existsSync(snapshotFile)) {
  fs.writeFileSync(snapshotFile, JSON.stringify(current, null, 1) + '\n');
  console.log(`\nSnapshot written to ${path.relative(clientDir, snapshotFile)}`);
} else {
  const expected = JSON.parse(fs.readFileSync(snapshotFile, 'utf8'));
  for (const key of new Set([...Object.keys(expected), ...Object.keys(current)])) {
    const diffs = [];
    diff(expected[key], current[key], key, diffs);
    check(`snapshot ${key}`, diffs.length === 0, diffs.length ? `\n      ${diffs.slice(0, 12).join('\n      ')}${diffs.length > 12 ? `\n      … ${diffs.length - 12} more` : ''}` : '');
  }
}

function diff(a, b, p, out) {
  if (JSON.stringify(a) === JSON.stringify(b)) return;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], `${p}.${k}`, out);
    return;
  }
  out.push(`${p}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
