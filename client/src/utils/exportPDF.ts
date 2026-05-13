import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, parseJSON, translatePosition } from './helpers';
import type { DailyReport, WeeklyReport, MonthlyReport, Project, LotProgress } from '../types';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const NAVY: [number, number, number] = [15, 28, 51];
const PRIMARY: [number, number, number] = [30, 64, 175];
const ORANGE: [number, number, number] = [234, 88, 12];
const LIGHT: [number, number, number] = [245, 247, 250];
const RED: [number, number, number] = [220, 38, 38];
const GREEN: [number, number, number] = [22, 163, 74];

function addHeader(doc: jsPDF, title: string, subtitle: string, project?: Project): number {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 38, 'F');

  doc.setFillColor(...ORANGE);
  doc.roundedRect(14, 7, 20, 20, 3, 3, 'F');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('BT', 19.5, 21);

  doc.setFontSize(15);
  doc.text('BuildTrack Pro', 38, 16);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Construction Progress Management System', 38, 23);
  doc.text('Project Management & Reporting Platform', 38, 29);

  doc.setFontSize(8);
  doc.text(`Generated: ${formatDate(new Date().toISOString(), 'dd/MM/yyyy HH:mm')}`, 196, 16, { align: 'right' });

  // Title banner
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 38, 210, 18, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(title, 14, 49);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 210, 255);
  doc.text(subtitle, 14, 54);

  if (project) {
    doc.setFillColor(...LIGHT);
    doc.rect(0, 56, 210, 14, 'F');
    doc.setFontSize(8);
    doc.setTextColor(60, 80, 100);
    doc.setFont('helvetica', 'bold');
    doc.text(`Project: ${project.name} (${project.code})`, 14, 63);
    doc.setFont('helvetica', 'normal');
    doc.text(`Client: ${project.client}   |   Location: ${project.location}`, 14, 68);
    if (project.contractor) doc.text(`Contractor: ${project.contractor}`, 120, 63);
    return 76;
  }
  return 64;
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const h = doc.internal.pageSize.height;
  doc.setFillColor(...NAVY);
  doc.rect(0, h - 10, 210, 10, 'F');
  doc.setFontSize(7);
  doc.setTextColor(180, 190, 210);
  doc.setFont('helvetica', 'normal');
  doc.text('CONFIDENTIAL — BuildTrack Pro Construction Management System', 14, h - 3);
  doc.text(`Page ${pageNum} / ${totalPages}`, 196, h - 3, { align: 'right' });
}

function sectionTitle(doc: jsPDF, y: number, text: string, color: [number,number,number] = PRIMARY): number {
  doc.setFillColor(...color);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(text, 17, y + 5);
  return y + 11;
}

function newPage(doc: jsPDF): number {
  doc.addPage();
  return 14;
}

function checkPageBreak(doc: jsPDF, y: number, needed = 30): number {
  if (y > doc.internal.pageSize.height - needed) return newPage(doc);
  return y;
}

// ─── Daily Report PDF ──────────────────────────────────────────────────────────

export function exportDailyReportPDF(report: DailyReport, project: Project) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const weatherLabel: Record<string, string> = {
    SUNNY: 'Sunny', CLOUDY: 'Cloudy',
    RAINY: 'Rainy', WINDY: 'Windy',
    Clear: 'Clear', Sunny: 'Sunny',
  };

  let y = addHeader(
    doc,
    `Daily Site Report #${report.reportNumber}`,
    `Date: ${formatDate(report.reportDate, 'EEEE dd MMMM yyyy')} — Week ${report.weekNumber} — Status: ${report.status}`,
    project
  );

  // 1. General Info
  y = sectionTitle(doc, y, '1. GENERAL INFORMATION');
  autoTable(doc, {
    startY: y,
    body: [
      ['Report Date', formatDate(report.reportDate, 'dd/MM/yyyy'), 'Report No.', `#${report.reportNumber}`],
      ['Weather', weatherLabel[report.weather] || report.weather, 'Temperature', `${report.temperature ?? '—'}°C`],
      ['Humidity', `${report.humidity ?? '—'}%`, 'Wind', `${(report as any).windSpeed ?? '—'} km/h`],
      ['Week', String(report.weekNumber), 'Status', report.status],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: LIGHT, textColor: [40, 60, 80] },
      2: { fontStyle: 'bold', fillColor: LIGHT, textColor: [40, 60, 80] },
    },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 5;

  if (report.generalSummary) {
    y = checkPageBreak(doc, y, 25);
    y = sectionTitle(doc, y, '2. GENERAL SUMMARY');
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(report.generalSummary, 180);
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 5;
  }

  // 3. Manpower
  const manpower = parseJSON<any[]>(report.manpowerData, []);
  if (manpower.length > 0) {
    y = checkPageBreak(doc, y, 40);
    y = sectionTitle(doc, y, '3. MANPOWER');
    const directRows = manpower.filter(m => m.type !== 'INDIRECT');
    const indirectRows = manpower.filter(m => m.type === 'INDIRECT');
    const totalDirect = directRows.reduce((s: number, m: any) => s + (m.np || m.count || 0), 0);
    const totalIndirect = indirectRows.reduce((s: number, m: any) => s + (m.np || m.count || 0), 0);

    autoTable(doc, {
      startY: y,
      head: [['SN', 'Position', 'Type', 'Company', 'N/P', 'Hours']],
      body: [
        ...manpower.map((m, i) => [
          String(i + 1),
          translatePosition(m.position || m.trade || '—'),
          m.type || 'DIRECT',
          m.company || '—',
          String(m.np || m.count || 0),
          String(m.hours || '—'),
        ]),
        ['', { content: 'TOTAL DIRECT', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [230, 240, 255] } }, '', { content: String(totalDirect), styles: { fontStyle: 'bold', fillColor: [230, 240, 255] } }, ''],
        ['', { content: 'TOTAL INDIRECT', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [255, 245, 220] } }, '', { content: String(totalIndirect), styles: { fontStyle: 'bold', fillColor: [255, 245, 220] } }, ''],
        ['', { content: 'GRAND TOTAL', colSpan: 3, styles: { fontStyle: 'bold', fillColor: PRIMARY, textColor: [255,255,255] } }, '', { content: String(totalDirect + totalIndirect), styles: { fontStyle: 'bold', fillColor: PRIMARY, textColor: [255,255,255] } }, ''],
      ],
      theme: 'striped',
      headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 8 }, 4: { halign: 'center' }, 5: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 5;
  }

  // 4. Equipment
  const equipment = parseJSON<any[]>(report.equipmentData, []);
  if (equipment.length > 0) {
    y = checkPageBreak(doc, y, 35);
    y = sectionTitle(doc, y, '4. EQUIPMENT');
    autoTable(doc, {
      startY: y,
      head: [['SN', 'Equipment', 'Qty', 'Working Hours', 'Status']],
      body: equipment.map((e, i) => [
        String(i + 1),
        e.name || e.type || '—',
        String(e.count || 1),
        String(e.hours || '—'),
        (e.status || '').replace(/_/g, ' '),
      ]),
      theme: 'striped',
      headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 8 }, 2: { halign: 'center' }, 3: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 5;
  }

  // 5. Materials
  const materials = parseJSON<any[]>(report.materialsData, []);
  if (materials.length > 0) {
    y = checkPageBreak(doc, y, 35);
    y = sectionTitle(doc, y, '5. MATERIALS');
    autoTable(doc, {
      startY: y,
      head: [['SN', 'Material', 'Unit', 'QTY Delivered', 'QTY Expected', 'Observations']],
      body: materials.map((m, i) => [
        String(i + 1),
        m.designation || m.name || '—',
        m.unit || '—',
        String(m.qtyDelivered ?? m.quantity ?? '—'),
        String(m.qtyExpected ?? '—'),
        m.remarks || m.supplier || '—',
      ]),
      theme: 'striped',
      headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 8 }, 3: { halign: 'center' }, 4: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 5;
  }

  // 6. Tasks Executed
  const tasks = parseJSON<any[]>(report.activitiesData, []);
  if (tasks.length > 0) {
    y = checkPageBreak(doc, y, 40);
    y = sectionTitle(doc, y, '6. TASKS EXECUTED');
    autoTable(doc, {
      startY: y,
      head: [['SN', 'LOT', 'Area', 'Task Description', 'Resources', 'Unit', 'QTY Produced']],
      body: tasks.map((t, i) => [
        String(i + 1),
        t.lot || '—',
        t.area || '—',
        t.description || '—',
        t.resources || '—',
        t.unit || '—',
        String(t.producedQty ?? t.progress ?? '—'),
      ]),
      theme: 'striped',
      headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 14, halign: 'center' }, 6: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 5;
  }

  // 7. Delays
  const delays = parseJSON<any[]>(report.delays, []);
  if (delays.length > 0) {
    y = checkPageBreak(doc, y, 35);
    y = sectionTitle(doc, y, '7. DELAYS & ISSUES', RED);
    autoTable(doc, {
      startY: y,
      head: [['Description', 'Duration', 'Responsibility', 'Impact']],
      body: delays.map(d => [d.description, d.duration, d.responsibility, d.impact || '—']),
      theme: 'striped',
      headStyles: { fillColor: RED, textColor: 255, fontSize: 8 },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 5;
  }

  // 8. HSE
  y = checkPageBreak(doc, y, 80);
  const hse = parseJSON<any>(report.hseData, {});
  const fmt = (n: any) => String(n ?? 0).padStart(2, '0');
  autoTable(doc, {
    startY: y,
    head: [
      [{ content: '5- HSE', colSpan: 3, styles: { halign: 'center', fillColor: [220, 0, 0], textColor: 255, fontStyle: 'bold', fontSize: 11 } }],
      [{ content: 'Indicator', styles: { fillColor: [255, 193, 7], textColor: [0, 0, 0], fontStyle: 'bold' } },
       { content: 'Numbers', styles: { fillColor: [255, 193, 7], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' } },
       { content: 'Comment', styles: { fillColor: [255, 193, 7], textColor: [0, 0, 0], fontStyle: 'bold' } }],
    ],
    body: [
      ['Accident with Lost Time Injury',       fmt(hse.accidentsWithLTI),           hse.accidentsWithLTIComment || ''],
      ['Accident without Lost Time Injury',    fmt(hse.accidentsWithoutLTI),        hse.accidentsWithoutLTIComment || ''],
      ['Recruitment medical check-up',         fmt(hse.recruitmentMedicalCheckup),  hse.recruitmentMedicalCheckupComment || ''],
      ['Periodic medical check-up',            fmt(hse.periodicMedicalCheckup),     hse.periodicMedicalCheckupComment || ''],
      ['Fire incident',                        fmt(hse.fireIncident),               hse.fireIncidentComment || ''],
      ['Accident with material damage',        fmt(hse.accidentWithMaterialDamage), hse.accidentWithMaterialDamageComment || ''],
      ['Safety violation notice',              fmt(hse.safetyViolationNotice),      hse.safetyViolationNoticeComment || ''],
      [{ content: '', styles: { fillColor: [245, 245, 245] } }, { content: '', styles: { fillColor: [245, 245, 245] } }, { content: '', styles: { fillColor: [245, 245, 245] } }],
      ['Safety induction sessions',            fmt(hse.safetyInductions),           hse.safetyInductionsComment || ''],
      ['Safety tool box talk',                 fmt(hse.toolboxTalks),               hse.toolboxTalksComment || ''],
      ['Specific training',                    fmt(hse.specificTraining),           hse.specificTrainingComment || ''],
      [{ content: `Lost Of Working Hours: ${fmt(hse.lostWorkingHours)} H`, colSpan: 3, styles: { halign: 'center', fontStyle: 'bold', fillColor: [255, 250, 220] } }],
    ],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 85 },
      1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  // Remarks
  const remarks = (hse.remarks || []).filter((r: string) => r && r.trim());
  if (remarks.length > 0 || true) {
    autoTable(doc, {
      startY: y,
      head: [[{ content: 'Remarks', colSpan: 2, styles: { halign: 'center', fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 10 } }]],
      body: Array.from({ length: Math.max(remarks.length, 3) }, (_, i) => [
        { content: String(i + 1).padStart(2, '0'), styles: { fontStyle: 'bold', cellWidth: 12 } },
        remarks[i] || '',
      ]),
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.5, minCellHeight: 8 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 5;
  }

  // 9. Signatures page
  doc.addPage();
  y = 20;
  y = sectionTitle(doc, y, 'APPROVALS & SIGNATURES');
  autoTable(doc, {
    startY: y,
    body: [
      [{ content: 'Site Engineer', styles: { fontStyle: 'bold', fillColor: LIGHT } }, '',
       { content: 'Project Manager', styles: { fontStyle: 'bold', fillColor: LIGHT } }, ''],
      ['Name:', '________________________', 'Name:', '________________________'],
      ['Signature:', '________________________', 'Signature:', '________________________'],
      ['Date:', formatDate(report.reportDate, 'dd/MM/yyyy'), 'Date:', '________________________'],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 5, minCellHeight: 12 },
    columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 55 }, 2: { cellWidth: 40 }, 3: { cellWidth: 55 } },
    margin: { left: 14, right: 14 },
  });

  // Footers
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) { doc.setPage(i); addFooter(doc, i, total); }

  doc.save(`Daily_Report_${report.reportNumber}_${formatDate(report.reportDate, 'yyyy-MM-dd')}.pdf`);
}

// ─── Weekly Report PDF ─────────────────────────────────────────────────────────

export function exportWeeklyReportPDF(report: WeeklyReport, project: Project) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = addHeader(
    doc,
    `Weekly Report — Week ${report.weekNumber}/${report.year}`,
    `Period: ${formatDate(report.startDate, 'dd/MM/yyyy')} to ${formatDate(report.endDate, 'dd/MM/yyyy')} — Status: ${report.status}`,
    project
  );

  // Summary KPIs
  y = sectionTitle(doc, y, 'KEY PERFORMANCE INDICATORS');
  autoTable(doc, {
    startY: y,
    body: [
      ['Actual Progress', `${report.overallProgress}%`, 'Planned Progress', `${report.plannedProgress}%`],
      ['Total Man-Days', String(report.totalManpowerWeek), 'Peak Workforce', String(report.peakManpower)],
      ['Activities Completed', String(report.activitiesCompleted), 'Activities Delayed', String(report.activitiesDelayed)],
      ['SPI', report.spi ? String(report.spi) : '—', 'CPI', report.cpi ? String(report.cpi) : '—'],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: LIGHT },
      2: { fontStyle: 'bold', fillColor: LIGHT },
    },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Manpower breakdown
  const breakdown = parseJSON<Record<string, { direct: number; indirect: number; total: number }>>(report.manpowerBreakdown, {});
  const entries = Object.entries(breakdown);
  if (entries.length > 0) {
    y = checkPageBreak(doc, y, 35);
    y = sectionTitle(doc, y, 'MANPOWER BREAKDOWN BY COMPANY');
    const totalDirect = entries.reduce((s, [, v]) => s + (v.direct || 0), 0);
    const totalIndirect = entries.reduce((s, [, v]) => s + (v.indirect || 0), 0);
    autoTable(doc, {
      startY: y,
      head: [['Company', 'Direct', 'Indirect', 'Total']],
      body: [
        ...entries.map(([company, v]) => [company || '—', String(v.direct || 0), String(v.indirect || 0), String(v.total || 0)]),
        [{ content: 'TOTAL', styles: { fontStyle: 'bold', fillColor: PRIMARY, textColor: [255,255,255] } },
         { content: String(totalDirect), styles: { fontStyle: 'bold', fillColor: PRIMARY, textColor: [255,255,255] } },
         { content: String(totalIndirect), styles: { fontStyle: 'bold', fillColor: PRIMARY, textColor: [255,255,255] } },
         { content: String(totalDirect + totalIndirect), styles: { fontStyle: 'bold', fillColor: PRIMARY, textColor: [255,255,255] } }],
      ],
      theme: 'striped',
      headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center', fontStyle: 'bold' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // LOT Production Status
  const lots = parseJSON<LotProgress[]>(report.lotsData, []);
  if (lots.length > 0) {
    y = checkPageBreak(doc, y, 50);
    y = sectionTitle(doc, y, 'LOT PRODUCTION STATUS');
    autoTable(doc, {
      startY: y,
      head: [['LOT N°', 'Description', 'Unit', 'Prev. Cumul. (%)', 'Week (%)', 'New Cumul. (%)', 'Remaining (%)', 'KPI Eff.']],
      body: lots.map(l => [
        l.lotNumber,
        l.description,
        l.unit,
        `${l.previousCumulPct}%`,
        `${l.weeklyPct}%`,
        `${l.newCumulPct}%`,
        `${l.remainingPct}%`,
        { content: `${l.kpiEfficiency}%`, styles: { textColor: (l.kpiEfficiency || 0) >= 100 ? GREEN : RED as any, fontStyle: 'bold' } },
      ]),
      theme: 'striped',
      headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 14, halign: 'center' },
        2: { cellWidth: 12, halign: 'center' },
        3: { halign: 'center' }, 4: { halign: 'center' },
        5: { halign: 'center' }, 6: { halign: 'center' },
        7: { halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // Narrative sections
  if (report.highlightsAchieved || report.issuesEncountered) {
    y = checkPageBreak(doc, y, 40);
    y = sectionTitle(doc, y, 'HIGHLIGHTS & ISSUES');
    if (report.highlightsAchieved) {
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(22, 163, 74);
      doc.text('Highlights & Achievements:', 14, y); y += 5;
      doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
      const h = doc.splitTextToSize(report.highlightsAchieved, 180);
      doc.text(h, 14, y); y += h.length * 4.5 + 4;
    }
    if (report.issuesEncountered) {
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(220, 38, 38);
      doc.text('Issues & Challenges:', 14, y); y += 5;
      doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
      const lines = doc.splitTextToSize(report.issuesEncountered, 180);
      doc.text(lines, 14, y); y += lines.length * 4.5 + 4;
    }
  }

  if (report.nextWeekPlan) {
    y = checkPageBreak(doc, y, 30);
    y = sectionTitle(doc, y, 'NEXT WEEK PLAN');
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(report.nextWeekPlan, 180);
    doc.text(lines, 14, y);
  }

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) { doc.setPage(i); addFooter(doc, i, total); }
  doc.save(`Weekly_Report_W${report.weekNumber}_${report.year}.pdf`);
}

// ─── Monthly Report PDF ────────────────────────────────────────────────────────

export function exportMonthlyReportPDF(report: MonthlyReport, project: Project) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = addHeader(
    doc,
    `Monthly Report — ${MONTHS[report.month - 1]} ${report.year}`,
    `Monthly Progress Report — ${MONTHS[report.month - 1]} ${report.year} — Status: ${report.status}`,
    project
  );

  // KPIs
  y = sectionTitle(doc, y, 'KEY PERFORMANCE INDICATORS');
  autoTable(doc, {
    startY: y,
    head: [['KPI', 'Value', 'KPI', 'Value']],
    body: [
      ['Actual Progress', `${report.overallProgress}%`, 'Planned Progress', `${report.plannedProgress}%`],
      ['Total Man-Days', String(report.totalManpowerDays), 'Peak Workers', String(report.peakManpower)],
      ['Avg Daily Workers', report.avgDailyManpower.toFixed(1), 'Open Risks', String(report.openRisks)],
      ['Open NCRs', String(report.openNCRs), 'Closed NCRs', String(report.closedNCRs)],
      ['Milestones Achieved', String(report.completedMilestones), 'Milestones Delayed', String(report.delayedMilestones)],
    ],
    theme: 'grid',
    headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: LIGHT },
      2: { fontStyle: 'bold', fillColor: LIGHT },
    },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Discipline Progress
  y = checkPageBreak(doc, y, 45);
  y = sectionTitle(doc, y, 'PROGRESS BY DISCIPLINE');
  const disciplines = [
    ['Structure',       report.structureProgress],
    ['Architecture',    report.architectureProgress],
    ['Mechanical',      (report as any).mecaniqueProgress ?? report.mepProgress ?? 0],
    ['Electrical',      (report as any).electriciteProgress ?? 0],
    ['Plumbing',        (report as any).plomberieProgress ?? 0],
    ['Infrastructure',  report.infrastructureProgress],
  ];
  autoTable(doc, {
    startY: y,
    head: [['Discipline', 'Progress (%)', 'Progress Bar']],
    body: disciplines.map(([name, val]) => [
      String(name),
      `${val}%`,
      { content: '█'.repeat(Math.round(Number(val) / 5)) + '░'.repeat(20 - Math.round(Number(val) / 5)), styles: { font: 'courier', fontSize: 7 } },
    ]),
    theme: 'striped',
    headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 8 },
    styles: { fontSize: 8 },
    columnStyles: { 1: { halign: 'center', fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Milestones
  y = checkPageBreak(doc, y, 35);
  y = sectionTitle(doc, y, 'MILESTONES');
  autoTable(doc, {
    startY: y,
    body: [
      [{ content: String(report.completedMilestones), styles: { fontStyle: 'bold', fontSize: 16, halign: 'center', fillColor: [220, 252, 231] } },
       { content: String(report.pendingMilestones), styles: { fontStyle: 'bold', fontSize: 16, halign: 'center', fillColor: [254, 249, 195] } },
       { content: String(report.delayedMilestones), styles: { fontStyle: 'bold', fontSize: 16, halign: 'center', fillColor: [254, 226, 226] } }],
      [{ content: 'Achieved', styles: { halign: 'center', fillColor: [220, 252, 231], textColor: [22, 101, 52] } },
       { content: 'Pending', styles: { halign: 'center', fillColor: [254, 249, 195], textColor: [113, 63, 18] } },
       { content: 'Delayed', styles: { halign: 'center', fillColor: [254, 226, 226], textColor: [153, 27, 27] } }],
    ],
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 5 },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Budget
  if (report.budgetExpended || report.forecastFinalCost) {
    y = checkPageBreak(doc, y, 30);
    y = sectionTitle(doc, y, 'FINANCIAL STATUS');
    autoTable(doc, {
      startY: y,
      body: [
        ['Budget Expended', report.budgetExpended ? `${report.budgetExpended.toLocaleString()} ${project.currency}` : '—',
         'Forecast Final Cost', report.forecastFinalCost ? `${report.forecastFinalCost.toLocaleString()} ${project.currency}` : '—'],
        ['Variance', report.variance ? `${report.variance.toLocaleString()} ${project.currency}` : '—', '', ''],
      ],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: { 0: { fontStyle: 'bold', fillColor: LIGHT }, 2: { fontStyle: 'bold', fillColor: LIGHT } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // Narrative
  const narratives = [
    { label: 'EXECUTIVE SUMMARY', value: report.executiveSummary },
    { label: 'KEY ACHIEVEMENTS', value: report.keyAchievements },
    { label: 'MAJOR CHALLENGES', value: report.majorChallenges },
    { label: 'NEXT MONTH PLAN', value: report.nextMonthPlan },
  ];
  for (const { label, value } of narratives) {
    if (!value) continue;
    y = checkPageBreak(doc, y, 30);
    y = sectionTitle(doc, y, label);
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(value, 180);
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 6;
  }

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) { doc.setPage(i); addFooter(doc, i, total); }
  doc.save(`Rapport_Mensuel_${MONTHS[report.month - 1]}_${report.year}.pdf`);
}
