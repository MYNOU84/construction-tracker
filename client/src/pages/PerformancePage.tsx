import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  projectsApi, dailyReportsApi, activitiesApi, milestonesApi,
  risksApi, ncrsApi, analyticsApi
} from '../api/endpoints';
import { parseJSON, formatDate } from '../utils/helpers';
import { PageLoader } from '../components/ui/LoadingSpinner';
import ProgressBar from '../components/ui/ProgressBar';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, CheckCircle2, AlertTriangle,
  XCircle, Target, Users, ShieldCheck, BarChart2, Clock,
  Activity, Layers, DollarSign, Flag
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type RAG = 'green' | 'amber' | 'red' | 'neutral';

function rag(value: number, greenMin: number, amberMin: number): RAG {
  if (value >= greenMin) return 'green';
  if (value >= amberMin) return 'amber';
  return 'red';
}

const RAG_STYLES: Record<RAG, { bg: string; text: string; border: string; icon: any }> = {
  green:   { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-400', icon: CheckCircle2 },
  amber:   { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-400', icon: AlertTriangle },
  red:     { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-400',   icon: XCircle },
  neutral: { bg: 'bg-gray-50',   text: 'text-gray-600',   border: 'border-gray-300',  icon: Minus },
};

function KPICard({
  label, value, unit = '', subLabel, status, trend, icon: Icon, size = 'normal'
}: {
  label: string; value: string | number; unit?: string;
  subLabel?: string; status: RAG; trend?: 'up' | 'down' | 'flat';
  icon: any; size?: 'normal' | 'large';
}) {
  const s = RAG_STYLES[status];
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  return (
    <div className={`card border-l-4 ${s.border} ${s.bg}`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider leading-tight">{label}</p>
        <div className="flex items-center gap-1">
          {trend && <TrendIcon size={13} className={s.text} />}
          <Icon size={16} className={s.text} />
        </div>
      </div>
      <p className={`font-black ${size === 'large' ? 'text-4xl' : 'text-3xl'} ${s.text}`}>
        {value}<span className="text-base font-semibold ml-1">{unit}</span>
      </p>
      {subLabel && <p className="text-xs text-gray-500 mt-1">{subLabel}</p>}
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-6 w-1 rounded-full bg-primary-500" />
      <div>
        <h2 className="font-bold text-gray-900 text-base">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!).then(r => r.data),
    enabled: !!projectId,
  });

  const { data: analytics } = useQuery({
    queryKey: ['project-analytics', projectId, 90],
    queryFn: () => analyticsApi.project(projectId!, 90).then(r => r.data),
    enabled: !!projectId,
  });

  const { data: dailyReports = [] } = useQuery({
    queryKey: ['daily-reports', projectId],
    queryFn: () => dailyReportsApi.list(projectId!).then(r => r.data),
    enabled: !!projectId,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', projectId],
    queryFn: () => activitiesApi.list(projectId!).then(r => r.data),
    enabled: !!projectId,
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => milestonesApi.list(projectId!).then(r => r.data),
    enabled: !!projectId,
  });

  const { data: risks = [] } = useQuery({
    queryKey: ['risks', projectId],
    queryFn: () => risksApi.list(projectId!).then(r => r.data),
    enabled: !!projectId,
  });

  const { data: ncrs = [] } = useQuery({
    queryKey: ['ncrs', projectId],
    queryFn: () => ncrsApi.list(projectId!).then(r => r.data),
    enabled: !!projectId,
  });

  if (loadingProject) return <PageLoader text="Calculating KPIs..." />;
  if (!project) return null;

  // ── Calculations ──────────────────────────────────────────────────────────

  // Schedule
  const totalActs = activities.length;
  const completedActs = activities.filter(a => a.status === 'COMPLETED').length;
  const delayedActs = activities.filter(a => a.status === 'DELAYED').length;
  const inProgressActs = activities.filter(a => a.status === 'IN_PROGRESS').length;
  const notStartedActs = activities.filter(a => a.status === 'NOT_STARTED').length;
  const actCompletionRate = totalActs > 0 ? Math.round((completedActs / totalActs) * 100) : 0;

  const overallProgress = project.progress ?? 0;
  const plannedProgress = (() => {
    const start = new Date(project.startDate).getTime();
    const end = new Date(project.endDate).getTime();
    const now = Date.now();
    if (now >= end) return 100;
    if (now <= start) return 0;
    return Math.round(((now - start) / (end - start)) * 100);
  })();

  const spi = plannedProgress > 0 ? +(overallProgress / plannedProgress).toFixed(2) : 1;
  const scheduleVariance = overallProgress - plannedProgress;

  // Cost
  const budget = project.budget ?? 0;
  const actualCost = project.actualCost ?? 0;
  const budgetExpendedPct = budget > 0 ? Math.round((actualCost / budget) * 100) : 0;
  const cpi = budgetExpendedPct > 0 && overallProgress > 0
    ? +(overallProgress / budgetExpendedPct).toFixed(2) : 1;
  const costVariance = budget > 0 ? budget - actualCost : 0;

  // Milestones
  const totalMilestones = milestones.length;
  const achievedMilestones = milestones.filter(m => m.status === 'ACHIEVED').length;
  const delayedMilestones = milestones.filter(m => m.status === 'DELAYED').length;
  const milestoneRate = totalMilestones > 0 ? Math.round((achievedMilestones / totalMilestones) * 100) : 0;

  // Quality (NCRs)
  const totalNCRs = ncrs.length;
  const openNCRs = ncrs.filter(n => n.status === 'OPEN').length;
  const closedNCRs = ncrs.filter(n => n.status === 'CLOSED').length;
  const ncrCloseRate = totalNCRs > 0 ? Math.round((closedNCRs / totalNCRs) * 100) : 100;

  // Risks
  const openRisks = risks.filter(r => r.status === 'OPEN').length;
  const highRisks = risks.filter(r => r.riskScore >= 15).length;
  const mitigatedRisks = risks.filter(r => r.status === 'MITIGATED').length;

  // HSE
  const reportsWithHSE = dailyReports.map(r => ({ ...r, hse: parseJSON<any>(r.hseData, {}) }));
  const totalLTI = reportsWithHSE.reduce((s, r) => s + (Number(r.hse.accidentsWithLTI) || 0), 0);
  const totalToolbox = reportsWithHSE.reduce((s, r) => s + (Number(r.hse.toolboxTalks) || 0), 0);
  const totalInductions = reportsWithHSE.reduce((s, r) => s + (Number(r.hse.safetyInductions) || 0), 0);
  const totalLostHours = reportsWithHSE.reduce((s, r) => s + (Number(r.hse.lostWorkingHours) || 0), 0);
  const totalManpowerDays = dailyReports.reduce((s, r) => s + r.totalManpower, 0);
  const ltifr = totalManpowerDays > 0 ? +((totalLTI / (totalManpowerDays * 8)) * 1_000_000).toFixed(2) : 0;
  const avgDailyManpower = dailyReports.length > 0 ? Math.round(totalManpowerDays / dailyReports.length) : 0;

  // Manpower trend
  const manpowerTrend = dailyReports
    .slice(-14).sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime())
    .map(r => ({ date: formatDate(r.reportDate).slice(0, 5), manpower: r.totalManpower }));

  // Activity donut data
  const actPieData = [
    { name: 'Completed',   value: completedActs,  color: '#22c55e' },
    { name: 'In Progress', value: inProgressActs, color: '#3b82f6' },
    { name: 'Delayed',     value: delayedActs,    color: '#ef4444' },
    { name: 'Not Started', value: notStartedActs, color: '#cbd5e1' },
  ].filter(d => d.value > 0);

  // Risk matrix data
  const riskData = [
    { name: 'Low (1-4)',      value: risks.filter(r => r.riskScore <= 4).length,              color: '#22c55e' },
    { name: 'Medium (5-9)',   value: risks.filter(r => r.riskScore >= 5 && r.riskScore <= 9).length, color: '#f59e0b' },
    { name: 'High (10-14)',   value: risks.filter(r => r.riskScore >= 10 && r.riskScore <= 14).length, color: '#f97316' },
    { name: 'Critical (15+)', value: risks.filter(r => r.riskScore >= 15).length,            color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Radar KPIs
  const radarData = [
    { subject: 'Planning',   value: Math.min(100, spi * 100) },
    { subject: 'Cost',       value: Math.min(100, cpi * 100) },
    { subject: 'Quality',    value: ncrCloseRate },
    { subject: 'HSE',        value: totalLTI === 0 ? 100 : Math.max(0, 100 - totalLTI * 20) },
    { subject: 'Milestones', value: milestoneRate },
    { subject: 'Activities', value: actCompletionRate },
  ];

  // Progress over time (from monthly reports in project)
  const progressTrend = dailyReports
    .slice(-20).sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime())
    .map(r => ({ date: formatDate(r.reportDate).slice(0, 5), manpower: r.totalManpower }));

  const currency = project.currency || 'USD';
  const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="page-title">Performance & KPIs</h1>
          <p className="page-subtitle">{project.name} — Project Performance Indices</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm border-2 ${
          spi >= 0.9 && cpi >= 0.9 ? 'bg-green-50 border-green-400 text-green-700' :
          spi >= 0.75 || cpi >= 0.75 ? 'bg-yellow-50 border-yellow-400 text-yellow-700' :
          'bg-red-50 border-red-400 text-red-700'
        }`}>
          <Activity size={16} />
          {spi >= 0.9 && cpi >= 0.9 ? 'Project On Track' :
           spi >= 0.75 || cpi >= 0.75 ? 'Attention Required' : 'Project At Risk'}
        </div>
      </div>

      {/* ── 1. Radar global ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-1">
          <SectionTitle title="Score Global" subtitle="Vue d'ensemble des 6 dimensions" />
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontWeight: 600, fill: '#475569' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} tickCount={4} />
              <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} />
              <Tooltip formatter={(v: any) => [`${v.toFixed(0)}%`]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4 content-start">
          <KPICard label="SPI — Schedule" value={spi} subLabel={`Variance: ${scheduleVariance > 0 ? '+' : ''}${scheduleVariance.toFixed(0)}%`}
            status={rag(spi, 0.9, 0.75)} trend={spi >= 1 ? 'up' : 'down'} icon={TrendingUp} />
          <KPICard label="CPI — Cost" value={cpi} subLabel={`Variance: ${costVariance >= 0 ? '+' : ''}${fmt(costVariance)} ${currency}`}
            status={budget === 0 ? 'neutral' : rag(cpi, 0.9, 0.75)} trend={cpi >= 1 ? 'up' : 'down'} icon={DollarSign} />
          <KPICard label="Progress" value={overallProgress} unit="%" subLabel={`Planned: ${plannedProgress}%`}
            status={rag(overallProgress, plannedProgress * 0.95, plannedProgress * 0.85)} icon={Target} />
          <KPICard label="Milestones" value={`${achievedMilestones}/${totalMilestones}`} subLabel={`${delayedMilestones} delayed`}
            status={totalMilestones === 0 ? 'neutral' : rag(milestoneRate, 80, 60)} icon={Flag} />
          <KPICard label="NCR Quality" value={ncrCloseRate} unit="%" subLabel={`${openNCRs} open / ${closedNCRs} closed`}
            status={rag(ncrCloseRate, 80, 50)} icon={CheckCircle2} />
          <KPICard label="LTI Accidents" value={totalLTI} subLabel={`LTIFR : ${ltifr}`}
            status={totalLTI === 0 ? 'green' : totalLTI <= 1 ? 'amber' : 'red'} icon={ShieldCheck} />
        </div>
      </div>

      {/* ── 2. Schedule Performance ─────────────────────────────────────────── */}
      <div className="card">
        <SectionTitle title="Performance Planning (Schedule)" subtitle="Actual vs planned progress + activity status" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress bars */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1 text-sm font-semibold">
                <span className="text-gray-700">Actual Progress</span>
                <span className="text-primary-600">{overallProgress}%</span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full" style={{ width: `${overallProgress}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1 text-sm font-semibold">
                <span className="text-gray-700">Planned Progress</span>
                <span className="text-gray-500">{plannedProgress}%</span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-400 rounded-full" style={{ width: `${plannedProgress}%` }} />
              </div>
            </div>
            <div className={`rounded-xl p-3 text-center font-bold text-sm border-2 ${
              scheduleVariance >= 0 ? 'bg-green-50 border-green-300 text-green-700' : 'bg-red-50 border-red-300 text-red-700'
            }`}>
              SPI = {spi} &nbsp;|&nbsp; {scheduleVariance >= 0 ? '▲' : '▼'} {Math.abs(scheduleVariance).toFixed(0)}% vs plan
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: 'Completed', val: completedActs, color: 'text-green-600 bg-green-50' },
                { label: 'In Progress', val: inProgressActs, color: 'text-blue-600 bg-blue-50' },
                { label: 'Delayed',    val: delayedActs,   color: 'text-red-600 bg-red-50' },
                { label: 'Not Started', val: notStartedActs, color: 'text-gray-500 bg-gray-50' },
              ].map(item => (
                <div key={item.label} className={`rounded-lg p-2 text-center ${item.color}`}>
                  <p className="text-xl font-black">{item.val}</p>
                  <p className="font-semibold">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pie chart activities */}
          <div className="flex flex-col items-center justify-center">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Activity Status</p>
            {actPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={actPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {actPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any, name: any) => [v, name]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm">No activities</p>
            )}
          </div>

          {/* Activity completion by discipline */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Completion by Discipline</p>
            {analytics?.disciplineBreakdown && analytics.disciplineBreakdown.length > 0 ? (
              <div className="space-y-2">
                {analytics.disciplineBreakdown.slice(0, 6).map(d => (
                  <div key={d.discipline}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="font-medium text-gray-700">{d.discipline}</span>
                      <span className="text-gray-500">{d.completed}/{d.total} · {d.avgProgress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-400 rounded-full" style={{ width: `${d.avgProgress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-6">No discipline data</p>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Cost Performance ─────────────────────────────────────────────── */}
      {budget > 0 && (
        <div className="card">
          <SectionTitle title="Cost Performance (EVM)" subtitle="Earned Value Management — Budget vs Expenditure" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Total Budget (BAC)',   value: `${fmt(budget)} ${currency}`,      color: 'text-gray-900' },
              { label: 'Actual Cost (AC)',      value: `${fmt(actualCost)} ${currency}`,  color: actualCost > budget ? 'text-red-600' : 'text-blue-600' },
              { label: 'Earned Value (EV)',     value: `${fmt(budget * overallProgress / 100)} ${currency}`, color: 'text-green-600' },
              { label: 'Cost Variance (CV)',    value: `${costVariance >= 0 ? '+' : ''}${fmt(costVariance)} ${currency}`, color: costVariance >= 0 ? 'text-green-600' : 'text-red-600' },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 font-semibold uppercase mb-1">{item.label}</p>
                <p className={`text-lg font-black ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            {[
              { label: 'CPI', value: cpi, good: cpi >= 1, desc: cpi >= 1 ? 'Under budget' : 'Overrun' },
              { label: 'SPI', value: spi, good: spi >= 1, desc: spi >= 1 ? 'On track' : 'Behind' },
              { label: 'Budget Used', value: `${budgetExpendedPct}%`, good: budgetExpendedPct <= overallProgress + 5, desc: `Progress ${overallProgress}%` },
            ].map(item => (
              <div key={item.label} className={`flex-1 rounded-xl p-3 text-center border-2 ${item.good ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                <p className="text-xs font-semibold text-gray-500 mb-1">{item.label}</p>
                <p className={`text-2xl font-black ${item.good ? 'text-green-700' : 'text-red-700'}`}>{item.value}</p>
                <p className="text-xs mt-1 font-medium text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. HSE Performance ──────────────────────────────────────────────── */}
      <div className="card">
        <SectionTitle title="HSE Performance" subtitle="Safety & Occupational Health" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <KPICard label="LTIFR" value={ltifr} subLabel="LTI Accidents / 1M hours" status={ltifr === 0 ? 'green' : ltifr < 1 ? 'amber' : 'red'} icon={ShieldCheck} />
          <KPICard label="LTI Total" value={totalLTI} subLabel="Lost Time Injuries" status={totalLTI === 0 ? 'green' : totalLTI === 1 ? 'amber' : 'red'} icon={AlertTriangle} />
          <KPICard label="Toolbox Talks" value={totalToolbox} subLabel={`/ ${dailyReports.length} reports`} status={totalToolbox >= dailyReports.length * 0.8 ? 'green' : totalToolbox >= dailyReports.length * 0.5 ? 'amber' : 'red'} icon={Users} />
          <KPICard label="Lost Hours" value={totalLostHours} unit="h" subLabel="Lost Working Hours" status={totalLostHours === 0 ? 'green' : totalLostHours < 8 ? 'amber' : 'red'} icon={Clock} />
        </div>

        {manpowerTrend.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Manpower — last 14 reports</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={manpowerTrend} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Area type="monotone" dataKey="manpower" stroke="#3b82f6" fill="#bfdbfe" strokeWidth={2} name="Manpower" />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {/* ── 5. Qualité & Risques ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* NCRs */}
        <div className="card">
          <SectionTitle title="Qualité — NCRs" subtitle="Non-Conformity Reports" />
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Total', value: totalNCRs, color: 'text-gray-900 bg-gray-50' },
              { label: 'Open', value: openNCRs, color: openNCRs > 0 ? 'text-red-700 bg-red-50' : 'text-gray-400 bg-gray-50' },
              { label: 'Closed', value: closedNCRs, color: 'text-green-700 bg-green-50' },
            ].map(item => (
              <div key={item.label} className={`rounded-xl p-3 text-center ${item.color}`}>
                <p className="text-2xl font-black">{item.value}</p>
                <p className="text-xs font-semibold mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-gray-600">Closure Rate</span>
              <span className="font-bold text-green-600">{ncrCloseRate}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${ncrCloseRate >= 80 ? 'bg-green-500' : ncrCloseRate >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`}
                style={{ width: `${ncrCloseRate}%` }} />
            </div>
          </div>
          {analytics?.ncrStats && (
            <div className="mt-3 text-xs text-gray-400 text-center">
              Severity: {ncrs.filter(n => n.severity === 'HIGH').length} high · {ncrs.filter(n => n.severity === 'MEDIUM').length} medium · {ncrs.filter(n => n.severity === 'LOW').length} low
            </div>
          )}
        </div>

        {/* Risks */}
        <div className="card">
          <SectionTitle title="Risk Management" subtitle="Risk Register Summary" />
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Open', value: openRisks, color: openRisks > 0 ? 'text-orange-700 bg-orange-50' : 'text-gray-400 bg-gray-50' },
              { label: 'Critical', value: highRisks, color: highRisks > 0 ? 'text-red-700 bg-red-50' : 'text-gray-400 bg-gray-50' },
              { label: 'Mitigated', value: mitigatedRisks, color: 'text-green-700 bg-green-50' },
            ].map(item => (
              <div key={item.label} className={`rounded-xl p-3 text-center ${item.color}`}>
                <p className="text-2xl font-black">{item.value}</p>
                <p className="text-xs font-semibold mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
          {riskData.length > 0 ? (
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={riskData} layout="vertical" barSize={14} margin={{ left: 0, right: 30 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {riskData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-6">No risks recorded</p>
          )}
        </div>
      </div>

      {/* ── 6. Milestones ───────────────────────────────────────────────────── */}
      {milestones.length > 0 && (
        <div className="card">
          <SectionTitle title="Milestones — Milestone Tracker" subtitle="Key milestones timeline" />
          <div className="space-y-2">
            {milestones.map(m => {
              const s = m.status;
              const cfg = s === 'ACHIEVED' ? { color: 'text-green-600', bg: 'bg-green-100', dot: 'bg-green-500' }
                : s === 'DELAYED' ? { color: 'text-red-600', bg: 'bg-red-100', dot: 'bg-red-500' }
                : s === 'AT_RISK' ? { color: 'text-yellow-600', bg: 'bg-yellow-100', dot: 'bg-yellow-500' }
                : { color: 'text-gray-500', bg: 'bg-gray-100', dot: 'bg-gray-400' };
              return (
                <div key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  <span className="flex-1 font-medium text-gray-800 text-sm">{m.name}</span>
                  <span className="text-xs text-gray-400">{formatDate(m.plannedDate)}</span>
                  {m.actualDate && <span className="text-xs text-green-600 font-medium">{formatDate(m.actualDate)}</span>}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{s}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
