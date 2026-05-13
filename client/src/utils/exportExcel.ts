import ExcelJS from 'exceljs';
import { formatDate, parseJSON, translatePosition } from './helpers';
import type { DailyReport, MonthlyReport, Project } from '../types';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ─── Color palette (ARGB) ────────────────────────────────────────────────────
const C = {
  NAVY_DARK : 'FF0D1428',
  NAVY_MID  : 'FF1A2744',
  NAVY_HEAD : 'FF1E3A5F',
  CYAN      : 'FF00D4FF',
  GREEN     : 'FF00D68F',
  AMBER     : 'FFFFB800',
  RED       : 'FFFF4D6D',
  VIOLET    : 'FF8C3AFF',
  WHITE     : 'FFFFFFFF',
  ROW_ALT   : 'FFF0F5FA',
  BORDER    : 'FFCBD5E1',
  TEXT_DARK : 'FF1E293B',
  TEXT_MID  : 'FF64748B',
  TOTAL_BG  : 'FFE2EFF8',
  COVER_ACC : 'FF00D4FF',
};

type BorderStyle = ExcelJS.BorderStyle;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function border(cell: ExcelJS.Cell, style: BorderStyle = 'thin') {
  const s = { style, color: { argb: C.BORDER } };
  cell.border = { top: s, left: s, bottom: s, right: s };
}

function styleHeader(row: ExcelJS.Row, cols: number, bg = C.NAVY_HEAD) {
  row.height = 24;
  for (let i = 1; i <= cols; i++) {
    const c = row.getCell(i);
    fill(c, bg);
    c.font = { bold: true, size: 10, color: { argb: C.WHITE }, name: 'Calibri' };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    border(c);
  }
}

function styleRow(row: ExcelJS.Row, cols: number, even: boolean) {
  row.height = 18;
  const bg = even ? C.WHITE : C.ROW_ALT;
  for (let i = 1; i <= cols; i++) {
    const c = row.getCell(i);
    fill(c, bg);
    c.font = { size: 9, color: { argb: C.TEXT_DARK }, name: 'Calibri' };
    c.alignment = { vertical: 'middle', wrapText: false };
    border(c);
  }
}

function styleTotalRow(row: ExcelJS.Row, cols: number) {
  row.height = 20;
  for (let i = 1; i <= cols; i++) {
    const c = row.getCell(i);
    fill(c, C.TOTAL_BG);
    c.font = { bold: true, size: 9, color: { argb: C.NAVY_MID }, name: 'Calibri' };
    c.alignment = { vertical: 'middle' };
    c.border = {
      top:    { style: 'medium', color: { argb: C.NAVY_HEAD } },
      bottom: { style: 'medium', color: { argb: C.NAVY_HEAD } },
      left:   { style: 'thin',   color: { argb: C.BORDER } },
      right:  { style: 'thin',   color: { argb: C.BORDER } },
    };
  }
}

function blankRow(ws: ExcelJS.Worksheet, height = 8) {
  ws.addRow([]).height = height;
}

function sectionTitle(ws: ExcelJS.Worksheet, text: string, colCount: number, accentArgb = C.CYAN) {
  const row = ws.addRow([text]);
  row.height = 22;
  const c = row.getCell(1);
  ws.mergeCells(`A${row.number}:${colLetter(colCount)}${row.number}`);
  fill(c, C.NAVY_MID);
  c.font = { bold: true, size: 10, color: { argb: accentArgb }, name: 'Calibri' };
  c.alignment = { vertical: 'middle', indent: 1 };
}

function colLetter(n: number): string {
  return String.fromCharCode(64 + n);
}

function downloadBlob(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 200);
}

// ─── Cover Sheet ─────────────────────────────────────────────────────────────

function buildCover(
  wb: ExcelJS.Workbook,
  reportType: string,
  reportRef: string,
  reportDate: string,
  project: Project,
  sheets: { name: string; desc: string }[],
) {
  const ws = wb.addWorksheet('COVER', { properties: { tabColor: { argb: C.CYAN } } });

  ws.columns = [
    { width: 3  }, // A margin
    { width: 26 }, // B label
    { width: 36 }, // C value
    { width: 4  }, // D gap
    { width: 24 }, // E label
    { width: 28 }, // F value
    { width: 3  }, // G margin
  ];

  // ── Top accent bar ──
  const bar = ws.getRow(1);
  bar.height = 7;
  for (let i = 1; i <= 7; i++) fill(bar.getCell(i), C.CYAN);

  // ── Dark banner rows 2–10 ──
  for (let r = 2; r <= 10; r++) {
    const row = ws.getRow(r);
    for (let i = 1; i <= 7; i++) fill(row.getCell(i), C.NAVY_DARK);
  }

  // App name
  ws.getRow(4).height = 46;
  ws.mergeCells('B4:F4');
  const appName = ws.getCell('B4');
  appName.value = 'BUILDTRACK PRO';
  appName.font = { bold: true, size: 28, color: { argb: C.CYAN }, name: 'Calibri' };
  appName.alignment = { horizontal: 'left', vertical: 'middle' };

  // Tagline
  ws.getRow(5).height = 24;
  ws.mergeCells('B5:F5');
  const tag = ws.getCell('B5');
  tag.value = 'Construction Management & Reporting Platform';
  tag.font = { italic: true, size: 11, color: { argb: 'FFAABBD4' }, name: 'Calibri' };
  tag.alignment = { horizontal: 'left', vertical: 'middle' };

  // Thin cyan rule
  ws.getRow(6).height = 3;
  for (let i = 1; i <= 7; i++) fill(ws.getRow(6).getCell(i), '3300D4FF');

  // Report type
  ws.getRow(8).height = 32;
  ws.mergeCells('B8:F8');
  const rType = ws.getCell('B8');
  rType.value = reportType;
  rType.font = { bold: true, size: 18, color: { argb: C.WHITE }, name: 'Calibri' };
  rType.alignment = { horizontal: 'left', vertical: 'middle' };

  // Report ref
  ws.getRow(9).height = 20;
  ws.mergeCells('B9:F9');
  const rRef = ws.getCell('B9');
  rRef.value = `Reference: ${reportRef}   ·   Date: ${reportDate}`;
  rRef.font = { size: 10, color: { argb: 'FF88AACC' }, name: 'Calibri' };
  rRef.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.getRow(11).height = 10; // spacer

  // ── Project Information ──
  ws.getRow(12).height = 22;
  ws.mergeCells('B12:F12');
  const ph = ws.getCell('B12');
  ph.value = '  ▌  PROJECT INFORMATION';
  fill(ph, C.NAVY_MID);
  ph.font = { bold: true, size: 10, color: { argb: C.CYAN }, name: 'Calibri' };
  ph.alignment = { vertical: 'middle' };

  const projRows: [string, string, string, string][] = [
    ['Project Name',   project.name         || '—', 'Project Code', project.code       || '—'],
    ['Client',         project.client       || '—', 'Location',     project.location   || '—'],
    ['Start Date',     formatDate(project.startDate), 'End Date',   formatDate(project.endDate)],
    ['Overall Progress', `${project.progress ?? 0}%`, 'Status',    project.status      || '—'],
    ['Currency',       project.currency     || 'USD', 'Budget',     project.budget ? project.budget.toLocaleString() : '—'],
  ];

  projRows.forEach(([l1, v1, l2, v2], i) => {
    const r = 13 + i;
    ws.getRow(r).height = 20;
    const bg = i % 2 === 0 ? C.ROW_ALT : C.WHITE;
    const pairs: [string, string][] = [['B', l1],['C', v1],['E', l2],['F', v2]];
    pairs.forEach(([col, val]) => {
      const c = ws.getCell(`${col}${r}`);
      c.value = val;
      fill(c, bg);
      border(c);
      if (col === 'B' || col === 'E') {
        c.font = { bold: true, size: 9, color: { argb: C.NAVY_MID }, name: 'Calibri' };
        c.alignment = { vertical: 'middle', indent: 1 };
      } else {
        c.font = { size: 9, color: { argb: C.TEXT_DARK }, name: 'Calibri' };
        c.alignment = { vertical: 'middle', indent: 1 };
      }
    });
  });

  const nextRow = 13 + projRows.length + 1;

  // ── Document Details ──
  ws.getRow(nextRow).height = 10; // spacer
  ws.getRow(nextRow + 1).height = 22;
  ws.mergeCells(`B${nextRow + 1}:F${nextRow + 1}`);
  const dh = ws.getCell(`B${nextRow + 1}`);
  dh.value = '  ▌  DOCUMENT DETAILS';
  fill(dh, C.NAVY_MID);
  dh.font = { bold: true, size: 10, color: { argb: C.CYAN }, name: 'Calibri' };
  dh.alignment = { vertical: 'middle' };

  const docRows: [string, string, string, string][] = [
    ['Prepared By', 'BuildTrack Pro System', 'Export Date', formatDate(new Date().toISOString(), 'dd MMMM yyyy')],
    ['Classification', 'CONFIDENTIAL', 'Version', '1.0'],
  ];

  docRows.forEach(([l1, v1, l2, v2], i) => {
    const r = nextRow + 2 + i;
    ws.getRow(r).height = 20;
    const bg = i % 2 === 0 ? C.ROW_ALT : C.WHITE;
    const pairs: [string, string][] = [['B', l1],['C', v1],['E', l2],['F', v2]];
    pairs.forEach(([col, val]) => {
      const c = ws.getCell(`${col}${r}`);
      c.value = val;
      fill(c, bg);
      border(c);
      if (col === 'B' || col === 'E') {
        c.font = { bold: true, size: 9, color: { argb: C.NAVY_MID }, name: 'Calibri' };
      } else {
        c.font = { size: 9, color: { argb: val === 'CONFIDENTIAL' ? C.RED : C.TEXT_DARK }, name: 'Calibri' };
      }
      c.alignment = { vertical: 'middle', indent: 1 };
    });
  });

  const tocStart = nextRow + 2 + docRows.length + 2;

  // ── Table of Contents ──
  ws.getRow(tocStart).height = 22;
  ws.mergeCells(`B${tocStart}:F${tocStart}`);
  const th = ws.getCell(`B${tocStart}`);
  th.value = '  ▌  REPORT CONTENTS';
  fill(th, C.NAVY_MID);
  th.font = { bold: true, size: 10, color: { argb: C.CYAN }, name: 'Calibri' };
  th.alignment = { vertical: 'middle' };

  // TOC header
  const tocHdrRow = ws.getRow(tocStart + 1);
  tocHdrRow.height = 20;
  [['B','#'],['C','Sheet'],['E','Description']].forEach(([col, val]) => {
    const c = tocHdrRow.getCell(col);
    c.value = val;
    fill(c, C.NAVY_HEAD);
    c.font = { bold: true, size: 9, color: { argb: C.WHITE }, name: 'Calibri' };
    c.alignment = { horizontal: col === 'B' ? 'center' : 'left', vertical: 'middle', indent: col !== 'B' ? 1 : 0 };
    border(c);
  });
  // Fill D col in toc header
  const dCell = tocHdrRow.getCell('D');
  fill(dCell, C.NAVY_HEAD);
  border(dCell);
  ws.mergeCells(`E${tocStart + 1}:F${tocStart + 1}`);

  // COVER entry
  const covRow = ws.getRow(tocStart + 2);
  covRow.height = 18;
  covRow.getCell('B').value = 1;
  ws.mergeCells(`C${tocStart + 2}:D${tocStart + 2}`);
  covRow.getCell('C').value = 'COVER';
  ws.mergeCells(`E${tocStart + 2}:F${tocStart + 2}`);
  covRow.getCell('E').value = 'Cover page, project information and table of contents';
  [covRow.getCell('B'), covRow.getCell('C'), covRow.getCell('D'), covRow.getCell('E')].forEach(c => {
    fill(c, C.ROW_ALT);
    c.font = { size: 9, color: { argb: C.TEXT_DARK }, name: 'Calibri' };
    c.alignment = { vertical: 'middle', indent: 1 };
    border(c);
  });
  covRow.getCell('B').alignment = { horizontal: 'center', vertical: 'middle' };

  sheets.forEach(({ name, desc }, i) => {
    const r = tocStart + 3 + i;
    const row = ws.getRow(r);
    row.height = 18;
    const bg = i % 2 === 0 ? C.WHITE : C.ROW_ALT;
    row.getCell('B').value = i + 2;
    ws.mergeCells(`C${r}:D${r}`);
    row.getCell('C').value = name;
    ws.mergeCells(`E${r}:F${r}`);
    row.getCell('E').value = desc;
    ['B','C','D','E'].forEach(col => {
      const c = row.getCell(col);
      fill(c, bg);
      c.font = { size: 9, color: { argb: C.TEXT_DARK }, name: 'Calibri' };
      c.alignment = { vertical: 'middle', indent: col !== 'B' ? 1 : 0 };
      border(c);
    });
    row.getCell('B').alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Footer
  const footerR = tocStart + 3 + sheets.length + 2;
  ws.getRow(footerR).height = 3;
  for (let i = 1; i <= 7; i++) fill(ws.getRow(footerR).getCell(i), C.CYAN);

  ws.getRow(footerR + 1).height = 18;
  ws.mergeCells(`B${footerR + 1}:F${footerR + 1}`);
  const foot = ws.getCell(`B${footerR + 1}`);
  foot.value = 'CONFIDENTIAL  —  Generated by BuildTrack Pro  —  For authorized use only.';
  foot.font = { italic: true, size: 8, color: { argb: C.TEXT_MID }, name: 'Calibri' };
  foot.alignment = { horizontal: 'center', vertical: 'middle' };
}

// ─── Generic styled data sheet ────────────────────────────────────────────────

interface ColDef { header: string; width: number; numFmt?: string; align?: ExcelJS.Alignment['horizontal'] }

function addSheet(
  wb: ExcelJS.Workbook,
  name: string,
  tabColor: string,
  cols: ColDef[],
  rows: (string | number | null | undefined)[][],
  totalRow?: (string | number | null | undefined)[],
): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(name, { properties: { tabColor: { argb: tabColor } } });

  // Freeze header rows
  ws.views = [{ state: 'frozen', ySplit: 3 }];

  // Column widths (index col + data cols)
  ws.columns = [
    { width: 5 },
    ...cols.map(c => ({ width: c.width })),
  ];

  // ── Sheet title (row 1) ──
  ws.getRow(1).height = 28;
  ws.mergeCells(`A1:${colLetter(cols.length + 1)}1`);
  const titleCell = ws.getCell('A1');
  titleCell.value = name.toUpperCase();
  fill(titleCell, C.NAVY_DARK);
  titleCell.font = { bold: true, size: 14, color: { argb: C.CYAN }, name: 'Calibri' };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // ── Header row (row 2) ──
  const hdrRow = ws.getRow(2);
  hdrRow.values = ['#', ...cols.map(c => c.header)];
  styleHeader(hdrRow, cols.length + 1);
  hdrRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

  // ── Data rows ──
  rows.forEach((rowData, i) => {
    const r = ws.addRow([i + 1, ...rowData]);
    styleRow(r, cols.length + 1, i % 2 === 0);
    r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    // Apply per-column alignment
    cols.forEach((col, ci) => {
      const cell = r.getCell(ci + 2);
      if (col.align) cell.alignment = { horizontal: col.align, vertical: 'middle' };
      if (col.numFmt) cell.numFmt = col.numFmt;
    });
  });

  if (rows.length === 0) {
    const empty = ws.addRow(['', 'No data recorded']);
    styleRow(empty, cols.length + 1, true);
    ws.mergeCells(`B${empty.number}:${colLetter(cols.length + 1)}${empty.number}`);
    empty.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    empty.getCell(2).font = { italic: true, size: 9, color: { argb: C.TEXT_MID } };
  }

  // ── Total row ──
  if (totalRow) {
    const tr = ws.addRow(['', ...totalRow]);
    styleTotalRow(tr, cols.length + 1);
    tr.getCell(1).value = '∑';
    tr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  return ws;
}

// ─── Daily Report Export ──────────────────────────────────────────────────────

export async function exportDailyReportExcel(report: DailyReport, project: Project) {
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'BuildTrack Pro';
  wb.created  = new Date();
  wb.modified = new Date();
  wb.properties.date1904 = false;

  const manpower  = parseJSON<any[]>(report.manpowerData,  []);
  const equipment = parseJSON<any[]>(report.equipmentData, []);
  const materials = parseJSON<any[]>(report.materialsData, []);
  const activities = parseJSON<any[]>(report.activitiesData, []);
  const delays    = parseJSON<any[]>(report.delays, []);

  const sheets = [
    { name: 'SUMMARY',    desc: 'Report header, weather, safety KPIs and narrative' },
    ...(manpower.length   ? [{ name: 'MANPOWER',   desc: 'Workforce by trade and company' }]  : []),
    ...(equipment.length  ? [{ name: 'EQUIPMENT',  desc: 'Plant and equipment on site'     }]  : []),
    ...(materials.length  ? [{ name: 'MATERIALS',  desc: 'Materials delivered and used'    }]  : []),
    ...(activities.length ? [{ name: 'ACTIVITIES', desc: 'Tasks executed with progress'    }]  : []),
    ...(delays.length     ? [{ name: 'DELAYS',     desc: 'Delays, issues and impacts'      }]  : []),
  ];

  buildCover(
    wb,
    'DAILY SITE REPORT',
    `Report #${report.reportNumber}`,
    formatDate(report.reportDate, 'dd MMMM yyyy'),
    project,
    sheets,
  );

  // ── Summary sheet ──
  const wsSumm = wb.addWorksheet('SUMMARY', { properties: { tabColor: { argb: C.NAVY_HEAD } } });
  wsSumm.views = [{ state: 'frozen', ySplit: 1 }];
  wsSumm.columns = [
    { width: 26 }, { width: 38 }, { width: 26 }, { width: 38 },
  ];

  // Title banner
  wsSumm.getRow(1).height = 28;
  wsSumm.mergeCells('A1:D1');
  const st = wsSumm.getCell('A1');
  st.value = 'DAILY SITE REPORT — SUMMARY';
  fill(st, C.NAVY_DARK);
  st.font = { bold: true, size: 14, color: { argb: C.CYAN }, name: 'Calibri' };
  st.alignment = { horizontal: 'center', vertical: 'middle' };

  blankRow(wsSumm, 6);

  // Project info block
  sectionTitle(wsSumm, '  PROJECT & REPORT INFORMATION', 4);
  const infoData: [string,string,string,string][] = [
    ['Project',       project.name,    'Code',         project.code],
    ['Client',        project.client || '—', 'Location', project.location || '—'],
    ['Report #',      `#${report.reportNumber}`, 'Date', formatDate(report.reportDate, 'dd MMMM yyyy')],
    ['Weather',       report.weather,  'Temperature',  `${report.temperature ?? '—'} °C`],
    ['Humidity',      `${report.humidity ?? '—'}%`, 'Wind Speed', `${report.windSpeed ?? '—'} km/h`],
    ['Total Manpower',String(report.totalManpower), 'Week #', String(report.weekNumber)],
    ['Status',        report.status,   'Prepared By',  'BuildTrack Pro System'],
  ];

  infoData.forEach(([l1, v1, l2, v2], i) => {
    const row = wsSumm.addRow([l1, v1, l2, v2]);
    row.height = 20;
    const bg = i % 2 === 0 ? C.ROW_ALT : C.WHITE;
    [1, 2, 3, 4].forEach(ci => {
      const c = row.getCell(ci);
      fill(c, bg);
      border(c);
      c.alignment = { vertical: 'middle', indent: 1 };
      if (ci === 1 || ci === 3) {
        c.font = { bold: true, size: 9, color: { argb: C.NAVY_MID }, name: 'Calibri' };
      } else {
        c.font = { size: 9, color: { argb: C.TEXT_DARK }, name: 'Calibri' };
      }
    });
  });

  // Safety KPIs
  blankRow(wsSumm, 6);
  sectionTitle(wsSumm, '  SAFETY & HSE', 4, C.GREEN);

  const safetyRow = wsSumm.addRow(['Toolbox Talks', report.toolboxTalks ?? 0, 'Incidents', report.incidents ?? 0]);
  safetyRow.height = 20;
  const nearRow = wsSumm.addRow(['Near Misses', report.nearMisses ?? 0, 'LTI', 0]);
  nearRow.height = 20;
  [safetyRow, nearRow].forEach((row, i) => {
    const bg = i % 2 === 0 ? C.ROW_ALT : C.WHITE;
    [1,2,3,4].forEach(ci => {
      const c = row.getCell(ci);
      fill(c, bg);
      border(c);
      c.alignment = { vertical: 'middle', indent: 1 };
      c.font = ci % 2 === 1
        ? { bold: true, size: 9, color: { argb: C.NAVY_MID }, name: 'Calibri' }
        : { bold: true, size: 11, color: { argb: C.GREEN }, name: 'Calibri' };
    });
  });

  // Narrative sections
  const narratives: [string, string | null | undefined][] = [
    ['GENERAL SUMMARY', report.generalSummary],
    ['WORK COMPLETED',  report.workCompleted],
    ['PLANNED WORK',    report.plannedWork],
    ['SAFETY NOTES',    report.safetyNotes],
  ];

  narratives.forEach(([title, text]) => {
    if (!text) return;
    blankRow(wsSumm, 6);
    sectionTitle(wsSumm, `  ${title}`, 4);
    const textRow = wsSumm.addRow([text || '—']);
    wsSumm.mergeCells(`A${textRow.number}:D${textRow.number}`);
    const c = textRow.getCell(1);
    c.value = text || '—';
    c.alignment = { wrapText: true, vertical: 'top', indent: 1 };
    c.font = { size: 9, color: { argb: C.TEXT_DARK }, name: 'Calibri' };
    fill(c, C.WHITE);
    border(c);
    textRow.height = Math.min(90, Math.max(20, Math.ceil((text || '').length / 60) * 15));
  });

  // ── Manpower sheet ──
  if (manpower.length > 0) {
    addSheet(wb, 'MANPOWER', C.CYAN,
      [
        { header: 'Trade / Position', width: 32 },
        { header: 'Company',          width: 28 },
        { header: 'Type',             width: 16, align: 'center' },
        { header: 'Count',            width: 12, align: 'center' },
        { header: 'Hours',            width: 12, align: 'center' },
      ],
      manpower.map(m => [translatePosition(m.trade || m.position || '—'), m.company || '—', m.type || '—', m.count ?? 0, m.hours || '—']),
      ['', 'TOTAL WORKERS', '', report.totalManpower, ''],
    );
  }

  // ── Equipment sheet ──
  if (equipment.length > 0) {
    addSheet(wb, 'EQUIPMENT', C.AMBER,
      [
        { header: 'Equipment Type', width: 36 },
        { header: 'Count',          width: 12, align: 'center' },
        { header: 'Status',         width: 20, align: 'center' },
        { header: 'Remarks',        width: 30 },
      ],
      equipment.map(e => [e.type || '—', e.count ?? 1, e.status || '—', e.remarks || '']),
    );
  }

  // ── Materials sheet ──
  if (materials.length > 0) {
    addSheet(wb, 'MATERIALS', C.GREEN,
      [
        { header: 'Material Name', width: 32 },
        { header: 'Quantity',      width: 14, align: 'center' },
        { header: 'Unit',          width: 10, align: 'center' },
        { header: 'Supplier',      width: 28 },
        { header: 'Remarks',       width: 28 },
      ],
      materials.map(m => [m.name || '—', m.quantity ?? 0, m.unit || '—', m.supplier || '—', m.remarks || '']),
    );
  }

  // ── Activities sheet ──
  if (activities.length > 0) {
    addSheet(wb, 'ACTIVITIES', C.VIOLET,
      [
        { header: 'Description',   width: 40 },
        { header: 'Area / Zone',   width: 18 },
        { header: 'Discipline',    width: 16, align: 'center' },
        { header: 'Progress (%)',  width: 14, align: 'center' },
        { header: 'Status',        width: 16, align: 'center' },
      ],
      activities.map(a => [a.description || '—', a.area || '—', a.discipline || '—', a.progress ?? 0, a.status || '—']),
    );
  }

  // ── Delays sheet ──
  if (delays.length > 0) {
    addSheet(wb, 'DELAYS', C.RED,
      [
        { header: 'Description',   width: 40 },
        { header: 'Duration',      width: 16 },
        { header: 'Responsibility',width: 22 },
        { header: 'Impact',        width: 16, align: 'center' },
        { header: 'Remarks',       width: 28 },
      ],
      delays.map(d => [d.description || '—', d.duration || '—', d.responsibility || '—', d.impact || '—', d.remarks || '']),
    );
  }

  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(buffer, `Daily_Report_${report.reportNumber}_${formatDate(report.reportDate, 'yyyy-MM-dd')}.xlsx`);
}

// ─── Monthly Report Export ────────────────────────────────────────────────────

export async function exportMonthlyReportExcel(report: MonthlyReport, project: Project, allReports: DailyReport[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'BuildTrack Pro';
  wb.created  = new Date();
  wb.modified = new Date();

  const periodLabel = `${MONTHS[report.month - 1]} ${report.year}`;

  const sheets = [
    { name: 'SUMMARY',   desc: 'KPIs, discipline progress and key metrics' },
    { name: 'DISCIPLINES', desc: 'Progress breakdown by discipline' },
    ...(allReports.length ? [{ name: 'DAILY LOG', desc: `Daily report log for ${periodLabel}` }] : []),
  ];

  buildCover(
    wb,
    'MONTHLY PROGRESS REPORT',
    `${MONTHS[report.month - 1]} ${report.year}`,
    formatDate(new Date(report.year, report.month - 1, 1).toISOString(), 'MMMM yyyy'),
    project,
    sheets,
  );

  // ── Summary sheet ──
  const wsSumm = wb.addWorksheet('SUMMARY', { properties: { tabColor: { argb: C.NAVY_HEAD } } });
  wsSumm.views = [{ state: 'frozen', ySplit: 1 }];
  wsSumm.columns = [
    { width: 30 }, { width: 22 }, { width: 30 }, { width: 22 },
  ];

  wsSumm.getRow(1).height = 28;
  wsSumm.mergeCells('A1:D1');
  const mst = wsSumm.getCell('A1');
  mst.value = `MONTHLY PROGRESS REPORT — ${periodLabel.toUpperCase()}`;
  fill(mst, C.NAVY_DARK);
  mst.font = { bold: true, size: 14, color: { argb: C.CYAN }, name: 'Calibri' };
  mst.alignment = { horizontal: 'center', vertical: 'middle' };

  blankRow(wsSumm, 6);
  sectionTitle(wsSumm, '  PROJECT INFORMATION', 4);

  const projInfo: [string, string, string, string][] = [
    ['Project',   project.name,           'Code',     project.code],
    ['Client',    project.client || '—',  'Location', project.location || '—'],
    ['Period',    periodLabel,             'Status',   report.status],
  ];
  projInfo.forEach(([l1,v1,l2,v2], i) => {
    const row = wsSumm.addRow([l1,v1,l2,v2]);
    row.height = 20;
    const bg = i % 2 === 0 ? C.ROW_ALT : C.WHITE;
    [1,2,3,4].forEach(ci => {
      const c = row.getCell(ci);
      fill(c, bg); border(c);
      c.alignment = { vertical: 'middle', indent: 1 };
      c.font = (ci===1||ci===3)
        ? { bold: true, size: 9, color: { argb: C.NAVY_MID }, name: 'Calibri' }
        : { size: 9, color: { argb: C.TEXT_DARK }, name: 'Calibri' };
    });
  });

  blankRow(wsSumm, 6);
  sectionTitle(wsSumm, '  KEY PERFORMANCE INDICATORS', 4, C.CYAN);

  const kpis: [string, string|number, string, string|number][] = [
    ['Overall Progress (%)',   report.overallProgress,         'Planned Progress (%)', report.plannedProgress],
    ['Total Man-Days',         report.totalManpowerDays,       'Peak Workforce',       report.peakManpower],
    ['Avg Daily Workforce',    report.avgDailyManpower?.toFixed(1) ?? '—', 'Open Risks', report.openRisks],
    ['Open NCRs',              report.openNCRs,                'Closed NCRs',          report.closedNCRs],
    ['Milestones Achieved',    report.completedMilestones,     'Milestones Delayed',   report.delayedMilestones],
    ['Mitigated Risks',        report.mitigatedRisks,          'Pending Milestones',   report.pendingMilestones],
  ];

  kpis.forEach(([l1,v1,l2,v2], i) => {
    const row = wsSumm.addRow([l1,v1,l2,v2]);
    row.height = 20;
    const bg = i % 2 === 0 ? C.ROW_ALT : C.WHITE;
    [1,2,3,4].forEach(ci => {
      const c = row.getCell(ci);
      fill(c, bg); border(c);
      c.alignment = { vertical: 'middle', indent: 1 };
      if (ci===1||ci===3) {
        c.font = { bold: true, size: 9, color: { argb: C.NAVY_MID }, name: 'Calibri' };
      } else {
        c.font = { bold: true, size: 10, color: { argb: C.CYAN }, name: 'Calibri' };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
  });

  // ── Disciplines sheet ──
  const discData: (string|number)[][] = [
    ['Structure',     report.structureProgress     ?? 0],
    ['Architecture',  report.architectureProgress  ?? 0],
    ['Mechanical',    (report as any).mecaniqueProgress ?? (report as any).mepProgress ?? 0],
    ['Electrical',    (report as any).electriciteProgress ?? 0],
    ['Plumbing',      (report as any).plomberieProgress ?? 0],
    ['Infrastructure',report.infrastructureProgress ?? 0],
  ].filter(([,v]) => v !== undefined);

  addSheet(wb, 'DISCIPLINES', C.VIOLET,
    [
      { header: 'Discipline',     width: 28 },
      { header: 'Progress (%)',   width: 18, align: 'center' },
      { header: 'Status',         width: 22, align: 'center' },
    ],
    discData.map(([name, val]) => [
      name,
      val,
      Number(val) >= 100 ? 'Completed' : Number(val) >= 75 ? 'Advanced' : Number(val) > 0 ? 'In Progress' : 'Not Started',
    ]),
  );

  // ── Daily Log sheet ──
  if (allReports.length > 0) {
    addSheet(wb, 'DAILY LOG', C.GREEN,
      [
        { header: 'Date',          width: 18 },
        { header: 'Report #',      width: 12, align: 'center' },
        { header: 'Weather',       width: 16 },
        { header: 'Temp (°C)',     width: 12, align: 'center' },
        { header: 'Workers',       width: 12, align: 'center' },
        { header: 'Status',        width: 16, align: 'center' },
      ],
      allReports.map(r => [
        formatDate(r.reportDate, 'dd MMM yyyy'),
        r.reportNumber,
        r.weather || '—',
        r.temperature ?? '—',
        r.totalManpower,
        r.status,
      ]),
      ['', 'TOTAL REPORTS', '', '', allReports.reduce((s,r) => s + r.totalManpower, 0), ''],
    );
  }

  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(buffer, `Monthly_Report_${MONTHS[report.month - 1]}_${report.year}.xlsx`);
}
