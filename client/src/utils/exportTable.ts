import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { addHeader, addFooter } from './exportPDF';
import { formatDate } from './helpers';
import type { Project } from '../types';

/**
 * Generic, branded (black / gold / warm white) PDF and Excel exports of register tables.
 * Every module page passes the rows it currently shows, so exports follow the page's filters.
 */
export interface ExportColumn<T = any> { header: string; value: (row: T) => unknown; width?: number }
export interface ExportSection<T = any> { name: string; columns: ExportColumn<T>[]; rows: T[] }
export interface TableExport { title: string; subtitle?: string; fileBase: string; project?: Project; sections: ExportSection[] }

const INK = 'FF0A0A0B', CHARCOAL = 'FF1F1F23', GOLD = 'FFC9982C', ROW_ALT = 'FFF8F4EA', BORDER = 'FFE2DACA', WHITE = 'FFFFFFFF';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
/** Display value: ISO dates → dd/MM/yyyy, arrays/objects → readable text, empty → "". */
export function cellText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return ISO_DATE.test(v) ? formatDate(v) : v;
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (v instanceof Date) return formatDate(v.toISOString());
  if (Array.isArray(v)) return v.map(cellText).filter(Boolean).join('; ');
  if (typeof v === 'object') return Object.entries(v as Record<string, unknown>).map(([k, x]) => `${k}: ${cellText(x)}`).join(', ');
  return String(v);
}

const safeName = (s: string) => s.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'export';
const stamp = () => formatDate(new Date().toISOString(), 'yyyy-MM-dd');

export function downloadBlob(data: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function exportTablePDF({ title, subtitle, fileBase, project, sections }: TableExport) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = addHeader(doc, title, subtitle || `${sections.map(s => `${s.rows.length} ${s.name.toLowerCase()}`).join(' · ')}`, project);
  for (const s of sections) {
    if (y > doc.internal.pageSize.height - 40) { doc.addPage(); y = 14; }
    doc.setFillColor(23, 23, 26);
    doc.rect(14, y, 182, 7, 'F');
    doc.setFillColor(201, 152, 44);
    doc.rect(14, y, 1.2, 7, 'F');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text(`${s.name} (${s.rows.length})`, 17, y + 5);
    y += 9;
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14, bottom: 14 },
      head: [s.columns.map(c => c.header)],
      body: s.rows.length ? s.rows.map(r => s.columns.map(c => cellText(c.value(r)))) : [[{ content: 'No records', colSpan: s.columns.length }]],
      styles: { fontSize: 7, cellPadding: 1.6, overflow: 'linebreak', textColor: [23, 23, 26], lineColor: [226, 218, 202], lineWidth: 0.1 },
      headStyles: { fillColor: [31, 31, 35], textColor: [245, 241, 232], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 244, 234] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) { doc.setPage(i); addFooter(doc, i, pages); }
  doc.save(`${safeName(fileBase)}_${stamp()}.pdf`);
}

function addSheet(wb: ExcelJS.Workbook, title: string, project: Project | undefined, s: ExportSection) {
  const ws = wb.addWorksheet(safeName(s.name).slice(0, 31) || 'Sheet', { views: [{ state: 'frozen', ySplit: 4 }] });
  const n = Math.max(s.columns.length, 2);
  ws.mergeCells(1, 1, 1, n);
  const t = ws.getCell(1, 1);
  t.value = `BuildTrack Pro — ${title}`;
  t.font = { bold: true, size: 14, color: { argb: GOLD } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };
  ws.getRow(1).height = 26;
  ws.mergeCells(2, 1, 2, n);
  const sub = ws.getCell(2, 1);
  sub.value = `${project ? `${project.name} (${project.code}) · ` : ''}${s.name} · ${s.rows.length} records · generated ${formatDate(new Date().toISOString(), 'dd/MM/yyyy HH:mm')}`;
  sub.font = { size: 9, color: { argb: 'FFF5F1E8' } };
  sub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CHARCOAL } };
  const head = ws.getRow(4);
  s.columns.forEach((c, i) => {
    const cell = head.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: 'FFF5F1E8' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CHARCOAL } };
    cell.border = { bottom: { style: 'medium', color: { argb: GOLD } } };
    ws.getColumn(i + 1).width = c.width ?? Math.min(50, Math.max(12, c.header.length + 4));
  });
  s.rows.forEach((r, ri) => {
    const row = ws.getRow(5 + ri);
    s.columns.forEach((c, i) => {
      const v = c.value(r);
      const cell = row.getCell(i + 1);
      cell.value = typeof v === 'number' && Number.isFinite(v) ? v : cellText(v);
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = { bottom: { style: 'thin', color: { argb: BORDER } } };
      if (ri % 2) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_ALT } };
      else cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WHITE } };
    });
  });
  if (s.rows.length) ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + s.rows.length, column: s.columns.length } };
}

export async function exportTableExcel({ title, fileBase, project, sections }: TableExport) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BuildTrack Pro';
  wb.created = new Date();
  for (const s of sections) addSheet(wb, title, project, s);
  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(buf, `${safeName(fileBase)}_${stamp()}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

// ─── Complete project export (owner / project manager / members) ───────────

const parse = (v: unknown) => { if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch { return v; } };

/** Builds one sheet per module from GET /projects/:id/export. */
export function projectExportSections(d: any): ExportSection[] {
  const p = d.project ?? {};
  return [
    { name: 'Project', columns: [{ header: 'Field', value: (r: any) => r[0], width: 24 }, { header: 'Value', value: (r: any) => r[1], width: 70 }],
      rows: Object.entries(p).filter(([k]) => k !== 'presentationData').map(([k, v]) => [k, v]) },
    { name: 'Members', columns: [
      { header: 'Name', value: (m: any) => m.user?.name }, { header: 'E-mail', value: (m: any) => m.user?.email, width: 30 },
      { header: 'Project role', value: (m: any) => m.role }, { header: 'Company', value: (m: any) => m.user?.company }], rows: d.members ?? [] },
    { name: 'Activities', columns: [
      { header: 'WBS', value: (a: any) => a.wbsCode }, { header: 'Activity', value: (a: any) => a.name, width: 40 },
      { header: 'Discipline', value: (a: any) => a.discipline }, { header: 'Area', value: (a: any) => a.area },
      { header: 'Planned start', value: (a: any) => a.plannedStart }, { header: 'Planned end', value: (a: any) => a.plannedEnd },
      { header: 'Actual start', value: (a: any) => a.actualStart }, { header: 'Actual end', value: (a: any) => a.actualEnd },
      { header: 'Planned %', value: (a: any) => a.plannedProgress }, { header: 'Actual %', value: (a: any) => a.actualProgress },
      { header: 'Status', value: (a: any) => a.status }, { header: 'Priority', value: (a: any) => a.priority }], rows: d.activities ?? [] },
    { name: 'Milestones', columns: [
      { header: 'Milestone', value: (m: any) => m.name, width: 40 }, { header: 'Planned', value: (m: any) => m.plannedDate },
      { header: 'Actual', value: (m: any) => m.actualDate }, { header: 'Status', value: (m: any) => m.status }], rows: d.milestones ?? [] },
    { name: 'Daily reports', columns: [
      { header: 'No.', value: (r: any) => r.reportNumber }, { header: 'Date', value: (r: any) => r.reportDate },
      { header: 'Status', value: (r: any) => r.status }, { header: 'Author', value: (r: any) => r.author?.name },
      { header: 'Weather', value: (r: any) => r.weather }, { header: 'Manpower', value: (r: any) => r.totalManpower },
      { header: 'Summary', value: (r: any) => r.generalSummary, width: 50 }, { header: 'Work completed', value: (r: any) => r.workCompleted, width: 50 },
      { header: 'Incidents', value: (r: any) => r.incidents }, { header: 'Near misses', value: (r: any) => r.nearMisses },
      { header: 'Photos', value: (r: any) => r.photos?.length ?? 0 }, { header: 'Comments', value: (r: any) => r.comments?.length ?? 0 }], rows: d.dailyReports ?? [] },
    { name: 'Weekly reports', columns: [
      { header: 'Year', value: (r: any) => r.year }, { header: 'Week', value: (r: any) => r.weekNumber },
      { header: 'Start', value: (r: any) => r.startDate }, { header: 'End', value: (r: any) => r.endDate },
      { header: 'Status', value: (r: any) => r.status }, { header: 'Progress %', value: (r: any) => r.overallProgress },
      { header: 'Summary', value: (r: any) => r.executiveSummary, width: 60 }], rows: d.weeklyReports ?? [] },
    { name: 'Monthly reports', columns: [
      { header: 'Year', value: (r: any) => r.year }, { header: 'Month', value: (r: any) => r.month },
      { header: 'Status', value: (r: any) => r.status }, { header: 'Progress %', value: (r: any) => r.overallProgress },
      { header: 'Executive summary', value: (r: any) => r.executiveSummary, width: 60 }], rows: d.monthlyReports ?? [] },
    { name: 'Risks', columns: [
      { header: 'Title', value: (r: any) => r.title, width: 36 }, { header: 'Category', value: (r: any) => r.category },
      { header: 'Probability', value: (r: any) => r.probability }, { header: 'Impact', value: (r: any) => r.impact },
      { header: 'Score', value: (r: any) => r.riskScore }, { header: 'Status', value: (r: any) => r.status },
      { header: 'Owner', value: (r: any) => r.owner }, { header: 'Mitigation', value: (r: any) => r.mitigation, width: 50 }], rows: d.risks ?? [] },
    { name: 'NCRs', columns: [
      { header: 'NCR No.', value: (r: any) => r.ncrNumber }, { header: 'Title', value: (r: any) => r.title, width: 36 },
      { header: 'Severity', value: (r: any) => r.severity }, { header: 'Raised by', value: (r: any) => r.raisedBy },
      { header: 'Raised', value: (r: any) => r.raisedDate }, { header: 'Status', value: (r: any) => r.status },
      { header: 'Closed', value: (r: any) => r.closedDate }, { header: 'Resolution', value: (r: any) => r.resolution, width: 40 }], rows: d.ncrs ?? [] },
    { name: 'Plant & equipment', columns: [
      { header: 'Name', value: (r: any) => r.name, width: 30 }, { header: 'Category', value: (r: any) => r.category },
      { header: 'Plate / serial', value: (r: any) => r.plateNumber || r.serialNumber }, { header: 'Owner / hire', value: (r: any) => r.owner || r.hireCompany },
      { header: 'On site', value: (r: any) => r.dateOnSite }, { header: 'Off site', value: (r: any) => r.dateOffSite },
      { header: 'Status', value: (r: any) => r.status }, { header: 'Cert. expiry', value: (r: any) => r.certExpiry },
      { header: 'Hours', value: (r: any) => r.hoursOnSite }], rows: d.plant ?? [] },
    { name: 'Site resources', columns: [
      { header: 'Name', value: (r: any) => r.fullName, width: 28 }, { header: 'Company', value: (r: any) => r.company },
      { header: 'Trade', value: (r: any) => r.trade }, { header: 'Position', value: (r: any) => r.position },
      { header: 'Type', value: (r: any) => r.type }, { header: 'Induction', value: (r: any) => r.inductionDate },
      { header: 'Status', value: (r: any) => r.status }], rows: d.resources ?? [] },
    { name: 'Documents', columns: [
      { header: 'Name', value: (r: any) => r.name, width: 40 }, { header: 'Type', value: (r: any) => r.type },
      { header: 'Revision', value: (r: any) => r.revision }, { header: 'File', value: (r: any) => r.fileName, width: 30 },
      { header: 'Size (KB)', value: (r: any) => r.fileSize ? Math.round(r.fileSize / 1024) : '' },
      { header: 'Tags', value: (r: any) => parse(r.tags) }, { header: 'Uploaded by', value: (r: any) => r.uploader?.name },
      { header: 'Uploaded', value: (r: any) => r.createdAt }], rows: d.documents ?? [] },
  ];
}

export async function exportProjectWorkbook(d: any) {
  await exportTableExcel({
    title: 'Complete project export', fileBase: `${d.project?.code || 'Project'}_complete_export`,
    project: d.project, sections: projectExportSections(d),
  });
}

/** Machine-readable copy of every project record (JSON). */
export function exportProjectJSON(d: any) {
  downloadBlob(JSON.stringify(d, null, 2), `${safeName(d.project?.code || 'project')}_complete_export_${stamp()}.json`, 'application/json');
}
