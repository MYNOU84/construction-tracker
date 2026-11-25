import { useState } from 'react';
import { FileText, FileSpreadsheet } from 'lucide-react';
import { exportDailyReportPDF, exportWeeklyReportPDF, exportMonthlyReportPDF } from '../../utils/exportPDF';
import { exportDailyReportExcel, exportMonthlyReportExcel } from '../../utils/exportExcel';
import { exportTableExcel } from '../../utils/exportTable';
import type { DailyReport, WeeklyReport, MonthlyReport, Project } from '../../types';

interface DailyExportProps { report: DailyReport; project: Project; }
interface WeeklyExportProps { report: WeeklyReport; project: Project; }
interface MonthlyExportProps { report: MonthlyReport; project: Project; allDailyReports?: DailyReport[]; }

export function DailyReportExportButtons({ report, project }: DailyExportProps) {
  const [loading, setLoading] = useState(false);

  const handle = async (fn: () => Promise<void> | void) => {
    setLoading(true);
    try { await fn(); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex gap-2">
      <button disabled={loading} onClick={() => handle(() => exportDailyReportPDF(report, project))}
        data-allow-demo className="btn-secondary btn-sm">
        <FileText size={14} /> PDF
      </button>
      <button disabled={loading} onClick={() => handle(() => exportDailyReportExcel(report, project))}
        data-allow-demo className="btn-secondary btn-sm">
        <FileSpreadsheet size={14} /> Excel
      </button>
    </div>
  );
}

const parse = (v: unknown, d: any) => { if (typeof v !== 'string') return v ?? d; try { return JSON.parse(v); } catch { return d; } };

/** Weekly report as a branded workbook: summary sheet plus the structured tables the report carries. */
export async function exportWeeklyReportExcel(report: WeeklyReport, project: Project) {
  const kv = (label: string, value: unknown) => ({ label, value });
  const disc = parse(report.progressByDiscipline, {}) as Record<string, number>;
  const manDay = parse(report.manpowerByDay, {}) as Record<string, number>;
  const list = (v: unknown) => { const x = parse(v, []); return Array.isArray(x) ? x : []; };
  const auto = (rows: any[]) => Object.keys(rows[0] ?? {}).map(k => ({ header: k, value: (r: any) => r[k] }));
  const lots = list(report.lotsData), studies = list(report.studiesProgress), materials = list(report.materialApprovals);
  await exportTableExcel({
    title: `Weekly Report W${report.weekNumber}/${report.year}`,
    fileBase: `Weekly_Report_W${report.weekNumber}_${report.year}`,
    project,
    sections: [
      { name: 'Summary', columns: [{ header: 'Item', value: (r: any) => r.label, width: 30 }, { header: 'Value', value: (r: any) => r.value, width: 80 }], rows: [
        kv('Week', `W${report.weekNumber} ${report.year}`), kv('Start', report.startDate), kv('End', report.endDate), kv('Status', report.status),
        kv('Overall progress %', report.overallProgress), kv('Planned progress %', report.plannedProgress),
        kv('SPI', report.spi), kv('CPI', report.cpi), kv('Total manpower (week)', report.totalManpowerWeek), kv('Peak manpower', report.peakManpower),
        kv('Activities completed', report.activitiesCompleted), kv('Activities ongoing', report.activitiesOngoing), kv('Activities delayed', report.activitiesDelayed),
        kv('Weather', report.weatherSummary), kv('Executive summary', report.executiveSummary), kv('Highlights', report.highlightsAchieved),
        kv('Issues', report.issuesEncountered), kv('Next week plan', report.nextWeekPlan)] },
      { name: 'Progress by discipline', columns: [{ header: 'Discipline', value: (r: any) => r[0] }, { header: 'Progress %', value: (r: any) => r[1] }], rows: Object.entries(disc) },
      { name: 'Manpower by day', columns: [{ header: 'Day', value: (r: any) => r[0] }, { header: 'Manpower', value: (r: any) => r[1] }], rows: Object.entries(manDay) },
      ...(lots.length ? [{ name: 'Lots', columns: auto(lots), rows: lots }] : []),
      ...(studies.length ? [{ name: 'Studies', columns: auto(studies), rows: studies }] : []),
      ...(materials.length ? [{ name: 'Material approvals', columns: auto(materials), rows: materials }] : []),
    ],
  });
}

export function WeeklyReportExportButtons({ report, project }: WeeklyExportProps) {
  const [loading, setLoading] = useState(false);
  const handle = async (fn: () => Promise<void> | void) => {
    setLoading(true);
    try { await fn(); }
    finally { setLoading(false); }
  };
  return (
    <div className="flex gap-2">
      <button disabled={loading} onClick={() => handle(() => exportWeeklyReportPDF(report, project))} data-allow-demo className="btn-secondary btn-sm">
        <FileText size={14} /> PDF
      </button>
      <button disabled={loading} onClick={() => handle(() => exportWeeklyReportExcel(report, project))} data-allow-demo className="btn-secondary btn-sm">
        <FileSpreadsheet size={14} /> Excel
      </button>
    </div>
  );
}

export function MonthlyReportExportButtons({ report, project, allDailyReports = [] }: MonthlyExportProps) {
  const [loading, setLoading] = useState(false);

  const handle = async (fn: () => Promise<void> | void) => {
    setLoading(true);
    try { await fn(); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex gap-2">
      <button disabled={loading} onClick={() => handle(() => exportMonthlyReportPDF(report, project))} data-allow-demo className="btn-secondary btn-sm">
        <FileText size={14} /> PDF
      </button>
      <button disabled={loading} onClick={() => handle(() => exportMonthlyReportExcel(report, project, allDailyReports))} data-allow-demo className="btn-secondary btn-sm">
        <FileSpreadsheet size={14} /> Excel
      </button>
    </div>
  );
}
