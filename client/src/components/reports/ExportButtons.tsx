import { useState } from 'react';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { exportDailyReportPDF, exportWeeklyReportPDF, exportMonthlyReportPDF } from '../../utils/exportPDF';
import { exportDailyReportExcel, exportMonthlyReportExcel } from '../../utils/exportExcel';
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
        className="btn-secondary btn-sm">
        <FileText size={14} /> PDF
      </button>
      <button disabled={loading} onClick={() => handle(() => exportDailyReportExcel(report, project))}
        className="btn-secondary btn-sm">
        <FileSpreadsheet size={14} /> Excel
      </button>
    </div>
  );
}

export function WeeklyReportExportButtons({ report, project }: WeeklyExportProps) {
  return (
    <button onClick={() => exportWeeklyReportPDF(report, project)} className="btn-secondary btn-sm">
      <Download size={14} /> Export PDF
    </button>
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
      <button disabled={loading} onClick={() => handle(() => exportMonthlyReportPDF(report, project))} className="btn-secondary btn-sm">
        <FileText size={14} /> PDF
      </button>
      <button disabled={loading} onClick={() => handle(() => exportMonthlyReportExcel(report, project, allDailyReports))} className="btn-secondary btn-sm">
        <FileSpreadsheet size={14} /> Excel
      </button>
    </div>
  );
}
