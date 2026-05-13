import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dailyReportsApi } from '../api/endpoints';
import { parseJSON, formatDate } from '../utils/helpers';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { ShieldCheck, AlertTriangle, Flame, Stethoscope, BookOpen, Clock, Users, AlertOctagon } from 'lucide-react';
import type { DailyReport, HSEData } from '../types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const HSE_ROWS: { key: keyof HSEData; label: string }[] = [
  { key: 'accidentsWithLTI',          label: 'Accident with Lost Time Injury' },
  { key: 'accidentsWithoutLTI',        label: 'Accident without Lost Time Injury' },
  { key: 'recruitmentMedicalCheckup',  label: 'Recruitment medical check-up' },
  { key: 'periodicMedicalCheckup',     label: 'Periodic medical check-up' },
  { key: 'fireIncident',               label: 'Fire incident' },
  { key: 'accidentWithMaterialDamage', label: 'Accident with material damage' },
  { key: 'safetyViolationNotice',      label: 'Safety violation notice' },
  { key: 'safetyInductions',           label: 'Safety induction sessions' },
  { key: 'toolboxTalks',               label: 'Safety tool box talk' },
  { key: 'specificTraining',           label: 'Specific training' },
  { key: 'lostWorkingHours',           label: 'Lost Working Hours (H)' },
];

const KPI_CONFIG = [
  { key: 'accidentsWithLTI',          label: 'Accidents LTI',        icon: AlertOctagon, color: 'text-red-500',    bg: 'bg-red-50 border-red-200',    bad: true },
  { key: 'accidentsWithoutLTI',       label: 'Accidents without LTI',   icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200', bad: true },
  { key: 'fireIncident',              label: 'Fire Incidents',         icon: Flame,        color: 'text-red-400',    bg: 'bg-red-50 border-red-100',    bad: true },
  { key: 'safetyViolationNotice',     label: 'Safety Violations',  icon: ShieldCheck,  color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', bad: true },
  { key: 'toolboxTalks',              label: 'Toolbox Talks',         icon: BookOpen,     color: 'text-blue-500',   bg: 'bg-blue-50 border-blue-200',  bad: false },
  { key: 'safetyInductions',          label: 'Safety Inductions',  icon: Users,        color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-200', bad: false },
  { key: 'periodicMedicalCheckup',    label: 'Medical Check-ups',     icon: Stethoscope,  color: 'text-green-500',  bg: 'bg-green-50 border-green-200', bad: false },
  { key: 'lostWorkingHours',          label: 'Lost Working Hours (H)',    icon: Clock,        color: 'text-gray-500',   bg: 'bg-gray-50 border-gray-200',  bad: true },
];

export default function HSEPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['daily-reports', projectId],
    queryFn: () => dailyReportsApi.list(projectId!).then(r => r.data),
    enabled: !!projectId,
  });

  if (isLoading) return <PageLoader text="Loading HSE data..." />;

  const reportsWithHSE = reports
    .map(r => ({ ...r, hse: parseJSON<any>(r.hseData, {}) }))
    .sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime());

  // Totals (zero if no reports)
  const totals: Record<string, number> = {};
  for (const kpi of KPI_CONFIG) {
    totals[kpi.key] = reportsWithHSE.reduce((s, r) => s + (Number(r.hse[kpi.key]) || 0), 0);
  }

  // Trend data (last 10 reports)
  const trendData = reportsWithHSE.slice(-10).map(r => ({
    date: formatDate(r.reportDate),
    LTI: Number(r.hse.accidentsWithLTI) || 0,
    'Toolbox Talks': Number(r.hse.toolboxTalks) || 0,
    'Inductions': Number(r.hse.safetyInductions) || 0,
    'Lost Hours': Number(r.hse.lostWorkingHours) || 0,
  }));

  const fmt = (n: any) => String(Number(n) || 0).padStart(2, '0');

  return (
    <div className="space-y-6 fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">HSE Dashboard</h1>
          <p className="page-subtitle">
            Health, Safety & Environment —&nbsp;
            {reportsWithHSE.length === 0
              ? 'No daily reports yet — create reports to populate HSE data'
              : `Based on ${reportsWithHSE.length} daily report${reportsWithHSE.length > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPI_CONFIG.map(kpi => {
          const val = totals[kpi.key] || 0;
          const isAlert = kpi.bad && val > 0;
          return (
            <div key={kpi.key} className={`card border ${isAlert ? 'border-red-300 bg-red-50' : kpi.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{kpi.label}</span>
                <kpi.icon size={18} className={isAlert ? 'text-red-500' : kpi.color} />
              </div>
              <p className={`text-3xl font-black ${isAlert ? 'text-red-600' : 'text-gray-900'}`}>
                {val}
              </p>
              <p className="text-xs text-gray-400 mt-1">cumulative total</p>
            </div>
          );
        })}
      </div>

      {/* Trend Chart */}
      <div className="card">
        <h3 className="font-bold text-gray-900 mb-4">HSE Trends (last 10 reports)</h3>
        {trendData.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            No daily reports — trends will appear here
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Toolbox Talks" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Inductions" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="LTI" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Lost Hours" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* HSE Table per report */}
      <div className="card">
        <h3 className="font-bold text-gray-900 mb-4">Detail by Daily Report</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-red-600 text-white">
                <th className="px-3 py-2 text-left font-bold rounded-tl-lg">Date</th>
                {HSE_ROWS.map(r => (
                  <th key={r.key} className="px-2 py-2 text-center font-bold whitespace-nowrap">{r.label}</th>
                ))}
                <th className="px-3 py-2 text-left font-bold rounded-tr-lg">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {reportsWithHSE.length === 0 ? (
                <tr>
                  <td colSpan={HSE_ROWS.length + 2} className="px-3 py-8 text-center text-gray-400">
                    No daily reports — create reports to populate this table
                  </td>
                </tr>
              ) : (
                reportsWithHSE.slice().reverse().map((r, i) => {
                  const remarks = (r.hse.remarks || []).filter((s: string) => s && s.trim());
                  const hasAlert = (Number(r.hse.accidentsWithLTI) || 0) > 0 || (Number(r.hse.fireIncident) || 0) > 0;
                  return (
                    <tr key={r.id} className={`border-b border-gray-100 ${hasAlert ? 'bg-red-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-3 py-2 font-semibold text-gray-700 whitespace-nowrap">{formatDate(r.reportDate)}</td>
                      {HSE_ROWS.map(row => {
                        const val = Number(r.hse[row.key]) || 0;
                        const isBad = ['accidentsWithLTI','accidentsWithoutLTI','fireIncident','accidentWithMaterialDamage','safetyViolationNotice','lostWorkingHours'].includes(row.key as string) && val > 0;
                        return (
                          <td key={row.key} className="px-2 py-2 text-center">
                            <span className={`font-bold ${isBad ? 'text-red-600' : val > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                              {fmt(val)}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-gray-600 text-xs">
                        {remarks.length > 0 ? remarks.join(' / ') : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  );
                })
              )}
              {/* Totals row */}
              <tr className="bg-yellow-50 border-t-2 border-yellow-400 font-bold">
                <td className="px-3 py-2 text-gray-800">TOTAL</td>
                {HSE_ROWS.map(row => {
                  const total = reportsWithHSE.reduce((s, r) => s + (Number(r.hse[row.key]) || 0), 0);
                  return (
                    <td key={row.key} className="px-2 py-2 text-center font-black text-gray-900">{total}</td>
                  );
                })}
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
