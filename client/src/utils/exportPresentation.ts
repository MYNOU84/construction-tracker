import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, formatCurrency } from './helpers';
import type { Project, ProjectPresentationData } from '../types';

type RGB = [number, number, number];
const NAVY:  RGB = [10, 14, 31];
const CARD:  RGB = [13, 20, 40];
const CYAN:  RGB = [0, 212, 255];
const VIO:   RGB = [140, 58, 255];
const GREEN: RGB = [0, 214, 143];
const AMBER: RGB = [255, 184, 0];
const RED:   RGB = [255, 77, 109];
const TEXT1: RGB = [232, 238, 248];
const TEXT2: RGB = [136, 153, 187];
const TEXT3: RGB = [74, 95, 133];
const BORDER:RGB = [30, 45, 80];

const W = 210, MARGIN = 14;
const CONTENT = W - MARGIN * 2;

function addHeader(doc: jsPDF, project: Project, pageNum: number, total: number) {
  // Top bar
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 12, 'F');
  // Cyan accent line
  for (let x = 0; x <= W; x++) {
    const t = x / W;
    const r = Math.round(CYAN[0] + (VIO[0] - CYAN[0]) * t);
    const g = Math.round(CYAN[1] + (VIO[1] - CYAN[1]) * t);
    const b = Math.round(CYAN[2] + (VIO[2] - CYAN[2]) * t);
    doc.setDrawColor(r, g, b);
    doc.line(x, 12, x + 1, 12);
  }
  doc.setFontSize(7); doc.setTextColor(...TEXT2);
  doc.text(`${project.name}  —  ${project.code}`, MARGIN, 8);
  doc.text(`Page ${pageNum} / ${total}`, W - MARGIN, 8, { align: 'right' });
}

function addFooter(doc: jsPDF) {
  const y = 287;
  doc.setFillColor(...NAVY);
  doc.rect(0, y, W, 10, 'F');
  doc.setFontSize(6); doc.setTextColor(...TEXT3);
  doc.text('BuildTrack Pro  —  General Project Presentation', MARGIN, y + 6);
  doc.text(formatDate(new Date().toISOString()), W - MARGIN, y + 6, { align: 'right' });
}

function sectionTitle(doc: jsPDF, text: string, y: number, color = CYAN): number {
  doc.setFillColor(...color);
  doc.rect(MARGIN, y, CONTENT, 7, 'F');
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(10, 14, 31);
  doc.text(text.toUpperCase(), MARGIN + 3, y + 5);
  doc.setFont('helvetica', 'normal');
  return y + 10;
}

function infoRow(doc: jsPDF, label: string, value: string, x: number, y: number, colW: number) {
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...TEXT3);
  doc.text(label, x, y);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...TEXT1);
  doc.text(value || '—', x, y + 4.5, { maxWidth: colW - 2 });
}

export async function exportPresentationPDF(project: Project, data: ProjectPresentationData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const TOTAL_PAGES = 1 +
    (data.intervenants.length > 0 ? 1 : 0) +
    (data.zones.length > 0 ? 1 : 0) +
    (data.billing.length > 0 ? 1 : 0) +
    (data.weighting.length > 0 ? 1 : 0) +
    (data.plans.length > 0 ? 1 : 0) + 1;

  let page = 1;

  // ══════════════════════════════════════════
  // PAGE 1 — COVER
  // ══════════════════════════════════════════
  doc.setFillColor(...NAVY); doc.rect(0, 0, W, 297, 'F');

  // Gradient diagonal accent
  for (let i = 0; i < 60; i++) {
    const alpha = (i / 60) * 0.12;
    doc.setFillColor(0, 212, 255);
    doc.setGState(doc.GState({ opacity: alpha }));
    doc.rect(W - 80 + i, 0, 1, 120, 'F');
  }
  doc.setGState(doc.GState({ opacity: 1 }));

  // Logo box
  doc.setFillColor(0, 212, 255);
  doc.roundedRect(MARGIN, 35, 22, 22, 3, 3, 'F');
  doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(10, 14, 31);
  doc.text('BT', MARGIN + 11, 49, { align: 'center' });

  // Title block
  doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(...TEXT1);
  doc.text(project.name, MARGIN + 28, 46);
  doc.setFontSize(10); doc.setTextColor(...CYAN);
  doc.text(`${project.code}  —  GENERAL PRESENTATION`, MARGIN + 28, 53);

  // Cyan divider
  doc.setDrawColor(...CYAN); doc.setLineWidth(0.4);
  doc.line(MARGIN, 65, W - MARGIN, 65);

  // Info grid
  let cy = 72;
  const cols = [[project.client, 'Client'], [project.contractor || '—', 'Contractor'], [project.consultant || '—', 'Consultant'], [project.location, 'Location']];
  cols.forEach(([val, label], idx) => {
    const x = MARGIN + (idx % 2) * (CONTENT / 2 + 4);
    if (idx === 2) cy = 86;
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...TEXT3);
    doc.text(label, x, cy);
    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...TEXT1);
    doc.text(val, x, cy + 5.5);
  });

  cy = 108;
  // Key facts row
  const facts = [
    ['Area', data.surface || '—'],
    ['Floors', data.floors || '—'],
    ['Lots', data.totalLots || '—'],
    ['Structure', data.structureType || '—'],
    ['Start', formatDate(project.startDate)],
    ['End Date', formatDate(project.endDate)],
  ];
  const factW = CONTENT / 3;
  facts.forEach(([label, val], idx) => {
    const col = idx % 3, row = Math.floor(idx / 3);
    const x = MARGIN + col * factW;
    const y = cy + row * 14;
    doc.setFillColor(...CARD); doc.roundedRect(x, y - 2, factW - 3, 12, 2, 2, 'F');
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...TEXT3);
    doc.text(label, x + 3, y + 3.5);
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...TEXT1);
    doc.text(val, x + 3, y + 8.5);
  });

  cy = 140;
  // Progress bar
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...TEXT2);
  doc.text('Overall Progress', MARGIN, cy);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...CYAN);
  doc.text(`${project.progress}%`, W - MARGIN, cy, { align: 'right' });
  doc.setFillColor(...BORDER); doc.roundedRect(MARGIN, cy + 4, CONTENT, 5, 2, 2, 'F');
  doc.setFillColor(...CYAN); doc.roundedRect(MARGIN, cy + 4, CONTENT * project.progress / 100, 5, 2, 2, 'F');

  // Description
  if (data.generalDescription) {
    cy = 160;
    doc.setFillColor(...CARD); doc.roundedRect(MARGIN, cy, CONTENT, 35, 3, 3, 'F');
    doc.setDrawColor(...CYAN); doc.setLineWidth(0.3); doc.line(MARGIN + 3, cy, MARGIN + 3, cy + 35);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...TEXT2);
    const lines = doc.splitTextToSize(data.generalDescription, CONTENT - 10);
    doc.text(lines.slice(0, 6), MARGIN + 7, cy + 7);
  }

  // Footer bottom branding
  doc.setFillColor(0, 212, 255); doc.roundedRect(MARGIN, 268, CONTENT, 12, 3, 3, 'F');
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(10, 14, 31);
  doc.text('BUILDTRACK PRO  —  Construction Management Platform', W / 2, 275.5, { align: 'center' });

  addFooter(doc);

  // ══════════════════════════════════════════
  // PAGE 2 — INTERVENANTS
  // ══════════════════════════════════════════
  if (data.intervenants.length > 0) {
    doc.addPage(); page++;
    doc.setFillColor(...NAVY); doc.rect(0, 0, W, 297, 'F');
    addHeader(doc, project, page, TOTAL_PAGES);
    let y = 22;
    y = sectionTitle(doc, 'Project Stakeholders', y);
    autoTable(doc, {
      startY: y,
      head: [['Role', 'Company / Organization', 'Representative', 'Phone', 'Email']],
      body: data.intervenants.map(r => [r.role, r.company, r.contact, r.phone, r.email]),
      theme: 'plain',
      styles: { fontSize: 8, textColor: [...TEXT1] as any, fillColor: [...CARD] as any, lineColor: [...BORDER] as any, lineWidth: 0.3 },
      headStyles: { fillColor: [...NAVY] as any, textColor: [...TEXT3] as any, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: [16, 24, 48] as any },
      margin: { left: MARGIN, right: MARGIN },
    });
    addFooter(doc);
  }

  // ══════════════════════════════════════════
  // PAGE 3 — ZONES & NIVEAUX
  // ══════════════════════════════════════════
  if (data.zones.length > 0) {
    doc.addPage(); page++;
    doc.setFillColor(...NAVY); doc.rect(0, 0, W, 297, 'F');
    addHeader(doc, project, page, TOTAL_PAGES);
    let y = 22;
    y = sectionTitle(doc, 'Zones & Levels', y);
    autoTable(doc, {
      startY: y,
      head: [['Zone / Lot', 'Description', 'Area (m²)', 'Level', 'Progress %']],
      body: data.zones.map(z => [z.zone, z.description, z.surface, z.level, `${z.progress}%`]),
      theme: 'plain',
      styles: { fontSize: 8, textColor: [...TEXT1] as any, fillColor: [...CARD] as any, lineColor: [...BORDER] as any, lineWidth: 0.3 },
      headStyles: { fillColor: [...NAVY] as any, textColor: [...TEXT3] as any, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: [16, 24, 48] as any },
      columnStyles: { 4: { textColor: [...CYAN] as any, fontStyle: 'bold' } },
      margin: { left: MARGIN, right: MARGIN },
    });
    const avgProg = Math.round(data.zones.reduce((s, z) => s + z.progress, 0) / data.zones.length);
    const finalY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFillColor(...CARD); doc.roundedRect(MARGIN, finalY, CONTENT, 16, 3, 3, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...TEXT2);
    doc.text(`Average zone progress: `, MARGIN + 5, finalY + 7);
    doc.setTextColor(...CYAN); doc.text(`${avgProg}%`, MARGIN + 75, finalY + 7);
    doc.setFillColor(...BORDER); doc.roundedRect(MARGIN + 5, finalY + 9, CONTENT - 10, 4, 2, 2, 'F');
    doc.setFillColor(...CYAN); doc.roundedRect(MARGIN + 5, finalY + 9, (CONTENT - 10) * avgProg / 100, 4, 2, 2, 'F');
    addFooter(doc);
  }

  // ══════════════════════════════════════════
  // PAGE 4 — FACTURATION
  // ══════════════════════════════════════════
  if (data.billing.length > 0) {
    doc.addPage(); page++;
    doc.setFillColor(...NAVY); doc.rect(0, 0, W, 297, 'F');
    addHeader(doc, project, page, TOTAL_PAGES);
    let y = 22;
    y = sectionTitle(doc, 'Billing Situations', y, GREEN);

    const totalFact = data.billing.reduce((s, b) => s + (b.amount || 0), 0);
    const totalPaid = data.billing.filter(b => b.status === 'PAID').reduce((s, b) => s + (b.amount || 0), 0);
    const kpis = [
      ['Total Billed', formatCurrency(totalFact, project.currency), [...CYAN]],
      ['Total Paid',   formatCurrency(totalPaid, project.currency), [...GREEN]],
      ['Pending',      formatCurrency(totalFact - totalPaid, project.currency), [...AMBER]],
    ];
    kpis.forEach(([l, v, c], i) => {
      const x = MARGIN + i * (CONTENT / 3 + 2);
      const col = c as RGB;
      doc.setFillColor(CARD[0], CARD[1], CARD[2]); doc.roundedRect(x, y, CONTENT / 3 - 1, 14, 2, 2, 'F');
      doc.setFontSize(7); doc.setTextColor(TEXT3[0], TEXT3[1], TEXT3[2]); doc.text(l as string, x + 3, y + 5);
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(col[0], col[1], col[2]); doc.text(v as string, x + 3, y + 11);
      doc.setFont('helvetica', 'normal');
    });
    y += 18;

    const BILLING_STATUS: Record<string, string> = { PENDING: 'Pending', PAID: 'Paid', LATE: 'Late', DISPUTED: 'Disputed' };
    autoTable(doc, {
      startY: y,
      head: [['N° Invoice', 'Description', 'Amount', 'Issue Date', 'Delay (days)', 'Payment Date', 'Status']],
      body: data.billing.map(b => [b.number, b.description, formatCurrency(b.amount, project.currency), b.dateIssued ? formatDate(b.dateIssued) : '—', b.delayDays, b.datePaid ? formatDate(b.datePaid) : '—', BILLING_STATUS[b.status] || b.status]),
      theme: 'plain',
      styles: { fontSize: 7.5, textColor: [...TEXT1] as any, fillColor: [...CARD] as any, lineColor: [...BORDER] as any, lineWidth: 0.3 },
      headStyles: { fillColor: [...NAVY] as any, textColor: [...TEXT3] as any, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [16, 24, 48] as any },
      margin: { left: MARGIN, right: MARGIN },
    });
    addFooter(doc);
  }

  // ══════════════════════════════════════════
  // PAGE 5 — PONDÉRATION
  // ══════════════════════════════════════════
  if (data.weighting.length > 0) {
    doc.addPage(); page++;
    doc.setFillColor(...NAVY); doc.rect(0, 0, W, 297, 'F');
    addHeader(doc, project, page, TOTAL_PAGES);
    let y = 22;
    y = sectionTitle(doc, 'Weighting & Approval Status', y, VIO);

    const weightedProg = data.weighting.reduce((s, w) => s + (w.weighting / 100) * (w.progress / 100), 0) * 100;
    doc.setFillColor(...CARD); doc.roundedRect(MARGIN, y, CONTENT, 14, 2, 2, 'F');
    doc.setFontSize(7.5); doc.setTextColor(...TEXT2); doc.text('Weighted overall progress:', MARGIN + 4, y + 5.5);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...CYAN); doc.text(`${weightedProg.toFixed(1)}%`, MARGIN + 60, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFillColor(...BORDER); doc.roundedRect(MARGIN + 4, y + 7, CONTENT - 8, 4, 2, 2, 'F');
    doc.setFillColor(...CYAN); doc.roundedRect(MARGIN + 4, y + 7, (CONTENT - 8) * weightedProg / 100, 4, 2, 2, 'F');
    y += 18;

    const APP_STATUS: Record<string, string> = { DRAFT: 'Draft', SUBMITTED: 'Submitted', APPROVED: 'Approved', REJECTED: 'Rejected' };
    autoTable(doc, {
      startY: y,
      head: [['Lot', 'Description', 'Weight%', 'Progress%', 'Wtd.%', 'Send Ref', 'Send Date', 'Appro. Ref', 'Appro. Date', 'Status']],
      body: data.weighting.map(w => [w.lot, w.description, `${w.weighting}%`, `${w.progress}%`, `${((w.weighting / 100) * (w.progress / 100) * 100).toFixed(1)}%`, w.sendRef || '—', w.sendDate ? formatDate(w.sendDate) : '—', w.approvalRef || '—', w.approvalDate ? formatDate(w.approvalDate) : '—', APP_STATUS[w.approvalStatus] || w.approvalStatus]),
      theme: 'plain',
      styles: { fontSize: 7, textColor: [...TEXT1] as any, fillColor: [...CARD] as any, lineColor: [...BORDER] as any, lineWidth: 0.3 },
      headStyles: { fillColor: [...NAVY] as any, textColor: [...TEXT3] as any, fontStyle: 'bold', fontSize: 6.5 },
      alternateRowStyles: { fillColor: [16, 24, 48] as any },
      columnStyles: { 4: { textColor: [...CYAN] as any, fontStyle: 'bold' } },
      margin: { left: MARGIN, right: MARGIN },
    });
    addFooter(doc);
  }

  // ══════════════════════════════════════════
  // PAGE 6 — NOMENCLATURE PLANS
  // ══════════════════════════════════════════
  if (data.plans.length > 0) {
    doc.addPage(); page++;
    doc.setFillColor(...NAVY); doc.rect(0, 0, W, 297, 'F');
    addHeader(doc, project, page, TOTAL_PAGES);
    let y = 22;
    y = sectionTitle(doc, 'Plan List', y, AMBER);

    const PLAN_STATUS: Record<string, string> = { DRAFT: 'Draft', ISSUED: 'Issued', APPROVED: 'Approved', FOR_INFO: 'For Info', SUPERSEDED: 'Superseded' };
    autoTable(doc, {
      startY: y,
      head: [['Plan No.', 'Title / Description', 'Rev.', 'Format', 'Issued By', 'Date', 'Status', 'Remarks']],
      body: data.plans.map(p => [p.number, p.title, p.revision, p.format, p.issuedBy, p.date ? formatDate(p.date) : '—', PLAN_STATUS[p.status] || p.status, p.remarks]),
      theme: 'plain',
      styles: { fontSize: 7.5, textColor: [...TEXT1] as any, fillColor: [...CARD] as any, lineColor: [...BORDER] as any, lineWidth: 0.3 },
      headStyles: { fillColor: [...NAVY] as any, textColor: [...TEXT3] as any, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [16, 24, 48] as any },
      margin: { left: MARGIN, right: MARGIN },
    });
    addFooter(doc);
  }

  doc.save(`${project.code}_Presentation_${formatDate(new Date().toISOString(), 'dd-MM-yyyy')}.pdf`);
}
