import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { monthlyReportsApi, projectsApi } from '../api/endpoints';
import { MonthlyReportExportButtons } from '../components/reports/ExportButtons';
import { formatDate, formatCurrency, getDisciplineColor } from '../utils/helpers';
import StatusBadge from '../components/ui/StatusBadge';
import ProgressBar from '../components/ui/ProgressBar';
import { PageLoader } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { useForm, useFieldArray } from 'react-hook-form';
import { parseJSON } from '../utils/helpers';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, LabelList, Legend
} from 'recharts';
import { Plus, BarChart2, TrendingUp, Users, Shield, BookOpen, Package, Trash2, Edit2 } from 'lucide-react';
import type { MonthlyReport, StudyItem, MaterialItem, Project } from '../types';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const DISC_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  STRUCTURE:      { label: 'Structure',      color: '#00d4ff', bg: 'bg-cyan-500' },
  ARCHITECTURE:   { label: 'Architecture',   color: '#fb923c', bg: 'bg-orange-400' },
  MECANIQUE:      { label: 'Mechanical',     color: '#8c3aff', bg: 'bg-violet-500' },
  ELECTRICITE:    { label: 'Electrical',     color: '#ffb800', bg: 'bg-yellow-400' },
  PLOMBERIE:      { label: 'Plumbing',       color: '#06b6d4', bg: 'bg-sky-400' },
  CIVIL:          { label: 'Civil',          color: '#64748b', bg: 'bg-slate-500' },
  INFRASTRUCTURE: { label: 'Infrastructure', color: '#00d68f', bg: 'bg-emerald-500' },
  GENERAL:        { label: 'General',        color: '#94a3b8', bg: 'bg-slate-300' },
};

function DisciplineDashboard({ report }: { report: MonthlyReport }) {
  const discStats = parseJSON<Record<string, any>>((report as any).progressByDiscipline, {});

  const disciplines = [
    { code: 'STRUCTURE',      value: report.structureProgress      ?? 0 },
    { code: 'ARCHITECTURE',   value: report.architectureProgress   ?? 0 },
    { code: 'MECANIQUE',      value: report.mecaniqueProgress      ?? 0 },
    { code: 'ELECTRICITE',    value: report.electriciteProgress    ?? 0 },
    { code: 'PLOMBERIE',      value: report.plomberieProgress      ?? 0 },
    { code: 'INFRASTRUCTURE', value: report.infrastructureProgress ?? 0 },
  ];

  const radarData = disciplines.map(d => ({
    subject: DISC_CONFIG[d.code]?.label ?? d.code,
    progress: d.value,
    fullMark: 100,
  }));

  // Stacked bar data for activity distribution per discipline
  const barData = Object.entries(discStats)
    .filter(([, s]: any) => s.total > 0)
    .map(([code, s]: any) => ({
      name: DISC_CONFIG[code]?.label ?? code,
      color: DISC_CONFIG[code]?.color ?? '#94a3b8',
      Completed: s.completed,
      'In Progress': s.inProgress,
      Delayed: s.delayed,
      'Not Started': s.notStarted,
      total: s.total,
      progress: s.avgProgress,
    }));

  const hasStats = barData.length > 0;
  const hasDisciplines = true; // always show all disciplines

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-bold text-gray-900 text-base">Progress by Discipline</h3>
          <p className="text-xs text-gray-400 mt-0.5">Progress by Discipline & Activity Status</p>
        </div>
        {hasStats && (
          <div className="flex items-center gap-3 text-xs">
            {[
              { label: 'Completed', color: '#22c55e' },
              { label: 'In Progress', color: '#3b82f6' },
              { label: 'Delayed', color: '#ef4444' },
              { label: 'Not Started', color: '#cbd5e1' },
            ].map(l => (
              <span key={l.label} className="flex items-center gap-1 text-gray-500">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={`grid gap-6 ${hasStats ? 'grid-cols-1 lg:grid-cols-5' : 'grid-cols-1 lg:grid-cols-3'}`}>

        {/* Left: Progress bars per discipline */}
        <div className={hasStats ? 'lg:col-span-2' : 'lg:col-span-2'}>
          {hasDisciplines ? (
            <div className="space-y-4">
              {disciplines.map(d => {
                const cfg = DISC_CONFIG[d.code];
                const stats = discStats[d.code];
                return (
                  <div key={d.code}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cfg?.color }} />
                        <span className="text-sm font-semibold text-gray-800">{cfg?.label ?? d.code}</span>
                        {stats && (
                          <span className="text-xs text-gray-400">
                            {stats.completed}/{stats.total} tasks
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-bold" style={{ color: cfg?.color }}>{d.value}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${d.value}%`, backgroundColor: cfg?.color }} />
                    </div>
                    {stats && stats.total > 0 && (
                      <div className="flex gap-1 mt-1">
                        {stats.completed > 0 && <div className="h-1 rounded-full bg-green-500 transition-all" style={{ width: `${(stats.completed / stats.total) * 100}%` }} title={`Completed: ${stats.completed}`} />}
                        {stats.inProgress > 0 && <div className="h-1 rounded-full bg-blue-500 transition-all" style={{ width: `${(stats.inProgress / stats.total) * 100}%` }} title={`In Progress: ${stats.inProgress}`} />}
                        {stats.delayed > 0 && <div className="h-1 rounded-full bg-red-500 transition-all" style={{ width: `${(stats.delayed / stats.total) * 100}%` }} title={`Delayed: ${stats.delayed}`} />}
                        {stats.notStarted > 0 && <div className="h-1 rounded-full bg-slate-200 transition-all" style={{ width: `${(stats.notStarted / stats.total) * 100}%` }} title={`Not Started: ${stats.notStarted}`} />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No discipline data — generate the report after adding activities</p>
          )}
        </div>

        {/* Middle: Stacked bar chart (activities per discipline) */}
        {hasStats && (
          <div className="lg:col-span-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Activities by discipline</p>
            <ResponsiveContainer width="100%" height={Math.max(180, barData.length * 44)}>
              <BarChart data={barData} layout="vertical" barSize={14} margin={{ left: 0, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} width={90} />
                <Tooltip
                  formatter={(v, name) => [v, name]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="Completed" stackId="a" fill="#22c55e" radius={[0,0,0,0]} />
                <Bar dataKey="In Progress" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Delayed" stackId="a" fill="#ef4444" />
                <Bar dataKey="Not Started" stackId="a" fill="#cbd5e1" radius={[0,4,4,0]}>
                  <LabelList dataKey="total" position="right" style={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} formatter={(v: any) => `${v} act.`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Right: Radar Chart */}
        <div className="lg:col-span-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Overview</p>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 600, fill: '#475569' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} tickCount={4} />
              <Radar name="Progress" dataKey="progress" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} />
              <Tooltip formatter={(v: any) => [`${v}%`, 'Progress']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function MonthlyReportPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const qc = useQueryClient();
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { month: new Date().getMonth() + 1, year: new Date().getFullYear() }
  });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['monthly-reports', projectId],
    queryFn: () => monthlyReportsApi.list(projectId!).then(r => r.data),
    enabled: !!projectId,
  });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!).then(r => r.data),
    enabled: !!projectId,
  });

  const generateMutation = useMutation({
    mutationFn: (data: any) => monthlyReportsApi.generate(projectId!, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['monthly-reports', projectId] });
      setShowGenerate(false);
      setSelectedReport(res.data);
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => monthlyReportsApi.update(projectId!, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['monthly-reports', projectId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (reportId: string) => monthlyReportsApi.delete(projectId!, reportId),
    onSuccess: (_, reportId) => {
      qc.invalidateQueries({ queryKey: ['monthly-reports', projectId] });
      if (selectedReport?.id === reportId) setSelectedReport(null);
      setConfirmDeleteId(null);
    },
    onError: (err: any) => {
      alert('Delete error: ' + (err?.response?.data?.message || err?.message || String(err)));
    },
  });

  if (isLoading) return <PageLoader text="Loading monthly reports..." />;

  return (
    <div className="space-y-6 fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Monthly Reports</h1>
          <p className="page-subtitle">{reports.length} report{reports.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowGenerate(true)} className="btn-primary">
          <Plus size={16} /> Generate Monthly Report
        </button>
      </div>

      {reports.length === 0 ? (
        <EmptyState icon={BarChart2} title="No monthly reports yet"
          description="Generate a monthly progress summary with KPIs and analytics"
          action={<button onClick={() => setShowGenerate(true)} className="btn-primary">Generate Report</button>}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report List */}
          <div className="space-y-3">
            {reports.map(r => (
              <div key={r.id}
                className={`card-sm hover:shadow-card-lg transition-shadow cursor-pointer ${selectedReport?.id === r.id ? 'border-primary-500 border-2' : ''}`}
                onClick={() => setSelectedReport(r)}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-gray-900">{MONTHS[r.month - 1]} {r.year}</span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(r.id); }}
                      className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete report"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <ProgressBar value={r.overallProgress} size="sm" showLabel />
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-500">
                  <span><Users size={10} className="inline mr-1" />{r.totalManpowerDays} man-days</span>
                  <span><Shield size={10} className="inline mr-1" />{r.openNCRs} open NCRs</span>
                </div>
              </div>
            ))}
          </div>

          {/* Report Detail */}
          {selectedReport && (
            <div className="lg:col-span-2 space-y-4">
              <MonthlyReportDetail
                report={selectedReport}
                project={project}
                onUpdate={(data) => updateMutation.mutate({ id: selectedReport.id, data })}
              />
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showGenerate} onClose={() => setShowGenerate(false)} title="Generate Monthly Report"
        footer={
          <>
            <button onClick={() => setShowGenerate(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit(d => generateMutation.mutate(d))} disabled={generateMutation.isPending} className="btn-primary">
              {generateMutation.isPending ? 'Generating...' : 'Generate'}
            </button>
          </>
        }>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Month</label>
              <select className="input" {...register('month', { valueAsNumber: true })}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Year</label>
              <input type="number" className="input" min={2020} max={2030} {...register('year', { valueAsNumber: true })} />
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} title="Delete Report"
        footer={
          <>
            <button onClick={() => setConfirmDeleteId(null)} className="btn-secondary">Cancel</button>
            <button onClick={() => confirmDeleteId && deleteMutation.mutate(confirmDeleteId)} disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </>
        }>
        <p className="text-gray-600">Are you sure you want to delete this monthly report? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}

function MonthlyReportDetail({ report, project, onUpdate }: { report: MonthlyReport; project?: Project; onUpdate: (data: any) => void }) {
  const [editing, setEditing] = useState(false);
  const [editingStudies, setEditingStudies] = useState(false);
  const [editingMaterials, setEditingMaterials] = useState(false);

  const studiesForm = useForm<{ items: StudyItem[] }>({
    defaultValues: { items: parseJSON<StudyItem[]>((report as any).studiesProgress, []) }
  });
  const studiesFields = useFieldArray({ control: studiesForm.control, name: 'items' });

  const materialsForm = useForm<{ items: MaterialItem[] }>({
    defaultValues: { items: parseJSON<MaterialItem[]>((report as any).materialApprovals, []) }
  });
  const materialsFields = useFieldArray({ control: materialsForm.control, name: 'items' });

  const studyItems = parseJSON<StudyItem[]>((report as any).studiesProgress, []);
  const materialItems = parseJSON<MaterialItem[]>((report as any).materialApprovals, []);

  const { register, handleSubmit } = useForm({
    defaultValues: {
      executiveSummary: report.executiveSummary || '',
      keyAchievements: report.keyAchievements || '',
      majorChallenges: report.majorChallenges || '',
      nextMonthPlan: report.nextMonthPlan || '',
      architectureProgress: report.architectureProgress,
      structureProgress: report.structureProgress,
      mecaniqueProgress: report.mecaniqueProgress ?? 0,
      electriciteProgress: report.electriciteProgress ?? 0,
      plomberieProgress: report.plomberieProgress ?? 0,
      infrastructureProgress: report.infrastructureProgress,
    }
  });

  const disciplines = [
    { name: 'Structure',      value: report.structureProgress,      color: '#00d4ff' },
    { name: 'Architecture',   value: report.architectureProgress,   color: '#fb923c' },
    { name: 'Mechanical',     value: report.mecaniqueProgress ?? 0,  color: '#8c3aff' },
    { name: 'Electrical',     value: report.electriciteProgress ?? 0, color: '#ffb800' },
    { name: 'Plomberie',      value: report.plomberieProgress ?? 0,  color: '#06b6d4' },
    { name: 'Infrastructure', value: report.infrastructureProgress, color: '#00d68f' },
  ];

  const radarData = disciplines.map(d => ({ subject: d.name, progress: d.value }));

  const kpiCards = [
    { label: 'Overall Progress', value: `${report.overallProgress}%`, icon: TrendingUp, color: 'bg-blue-500' },
    { label: 'Total Man-Days', value: report.totalManpowerDays, icon: Users, color: 'bg-green-500' },
    { label: 'Peak Workers', value: report.peakManpower, icon: Users, color: 'bg-purple-500' },
    { label: 'Open NCRs', value: report.openNCRs, icon: Shield, color: 'bg-red-500' },
    { label: 'Open Risks', value: report.openRisks, icon: Shield, color: 'bg-orange-500' },
    { label: 'Milestones Done', value: report.completedMilestones, icon: TrendingUp, color: 'bg-teal-500' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card bg-gradient-to-r from-navy-900 to-primary-800 text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">{MONTHS[report.month - 1]} {report.year} — Monthly Report</h2>
            <p className="text-white/70 text-sm">Monthly Progress Report</p>
          </div>
          <div className="flex items-center gap-2">
            {project && <MonthlyReportExportButtons report={report} project={project} />}
            <StatusBadge status={report.status} />
          </div>
        </div>
        <ProgressBar value={report.overallProgress} size="lg" color="bg-construction-400" showLabel />
        <div className="mt-2 flex justify-between text-xs text-white/60">
          <span>Actual: {report.overallProgress}%</span>
          <span>Planned: {report.plannedProgress}%</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-3 gap-3">
        {kpiCards.map(k => (
          <div key={k.label} className="card-sm text-center">
            <div className={`w-8 h-8 ${k.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
              <k.icon size={16} className="text-white" />
            </div>
            <div className="text-xl font-bold text-gray-900">{k.value}</div>
            <div className="text-xs text-gray-500">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Discipline Dashboard */}
      <DisciplineDashboard report={report} />

      {/* Milestone Status */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Milestone Status</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{report.completedMilestones}</div>
            <div className="text-xs text-green-700">Achieved</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{report.pendingMilestones}</div>
            <div className="text-xs text-yellow-700">Pending</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{report.delayedMilestones}</div>
            <div className="text-xs text-red-700">Delayed</div>
          </div>
        </div>
      </div>

      {/* ── State of Progress of Studies ── */}
      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-primary-600" />
            <h3 className="font-semibold text-gray-900">State of Progress of Studies</h3>
            <span className="badge badge-blue">{studyItems.length}</span>
          </div>
          <button onClick={() => setEditingStudies(!editingStudies)} className="btn-secondary btn-sm">
            <Edit2 size={13} /> {editingStudies ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editingStudies ? (
          <form onSubmit={studiesForm.handleSubmit(d => { onUpdate({ studiesProgress: JSON.stringify(d.items) }); setEditingStudies(false); })} className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-primary-700 text-white">
                    <th className="px-2 py-2 text-left">N° Doc</th>
                    <th className="px-2 py-2 text-left">Description</th>
                    <th className="px-2 py-2 text-center">Discipline</th>
                    <th className="px-2 py-2 text-center">Rev.</th>
                    <th className="px-2 py-2 text-center">Planned Date</th>
                    <th className="px-2 py-2 text-center">Actual Date</th>
                    <th className="px-2 py-2 text-center">Status</th>
                    <th className="px-2 py-2 text-center">%</th>
                    <th className="px-2 py-2 text-left">Observations</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {studiesFields.fields.map((field, i) => (
                    <tr key={field.id} className="border-b border-gray-100">
                      <td className="px-1 py-1"><input className="input text-xs py-1 w-20" {...studiesForm.register(`items.${i}.docNumber`)} /></td>
                      <td className="px-1 py-1"><input className="input text-xs py-1" {...studiesForm.register(`items.${i}.description`)} /></td>
                      <td className="px-1 py-1">
                        <select className="input text-xs py-1 w-28" {...studiesForm.register(`items.${i}.discipline`)}>
                          {['STRUCTURE','ARCHITECTURE','MECANIQUE','ELECTRICITE','PLOMBERIE','CIVIL','INFRASTRUCTURE','GENERAL'].map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1"><input className="input text-xs py-1 w-12 text-center" {...studiesForm.register(`items.${i}.rev`)} /></td>
                      <td className="px-1 py-1"><input type="date" className="input text-xs py-1 w-32" {...studiesForm.register(`items.${i}.plannedDate`)} /></td>
                      <td className="px-1 py-1"><input type="date" className="input text-xs py-1 w-32" {...studiesForm.register(`items.${i}.actualDate`)} /></td>
                      <td className="px-1 py-1">
                        <select className="input text-xs py-1 w-28" {...studiesForm.register(`items.${i}.status`)}>
                          {['NOT_STARTED','IN_PROGRESS','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1"><input type="number" className="input text-xs py-1 w-14 text-center" min={0} max={100} {...studiesForm.register(`items.${i}.progress`, { valueAsNumber: true })} /></td>
                      <td className="px-1 py-1"><input className="input text-xs py-1" {...studiesForm.register(`items.${i}.observations`)} /></td>
                      <td className="px-1 py-1"><button type="button" onClick={() => studiesFields.remove(i)} className="btn-danger btn-sm p-1"><Trash2 size={12} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => studiesFields.append({ id: Date.now().toString(), docNumber: '', description: '', discipline: 'GENERAL', rev: 'A', plannedDate: '', status: 'NOT_STARTED', progress: 0, observations: '' })} className="btn-secondary btn-sm"><Plus size={13} /> Add</button>
              <button type="submit" className="btn-primary btn-sm">Save</button>
            </div>
          </form>
        ) : studyItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-100 text-gray-600 font-semibold">
                <th className="px-3 py-2 text-left">N° Doc</th><th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-center">Discipline</th><th className="px-3 py-2 text-center">Rev.</th>
                <th className="px-3 py-2 text-center">Planned Date</th><th className="px-3 py-2 text-center">Actual Date</th>
                <th className="px-3 py-2 text-center">Status</th><th className="px-3 py-2 text-center">%</th>
                <th className="px-3 py-2 text-left">Observations</th>
              </tr></thead>
              <tbody>
                {studyItems.map((s, i) => {
                  const c: Record<string,string> = { APPROVED:'text-green-700 bg-green-50', REJECTED:'text-red-700 bg-red-50', SUBMITTED:'text-blue-700 bg-blue-50', UNDER_REVIEW:'text-orange-700 bg-orange-50', IN_PROGRESS:'text-purple-700 bg-purple-50', NOT_STARTED:'text-gray-600 bg-gray-100' };
                  return <tr key={i} className={`border-b border-gray-100 ${i%2===0?'bg-white':'bg-gray-50'}`}>
                    <td className="px-3 py-2 font-bold text-primary-700">{s.docNumber}</td>
                    <td className="px-3 py-2 text-gray-800">{s.description}</td>
                    <td className="px-3 py-2 text-center text-gray-500">{s.discipline}</td>
                    <td className="px-3 py-2 text-center font-medium">{s.rev}</td>
                    <td className="px-3 py-2 text-center">{s.plannedDate ? s.plannedDate : '—'}</td>
                    <td className="px-3 py-2 text-center">{s.actualDate || '—'}</td>
                    <td className="px-3 py-2 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c[s.status]||'text-gray-600 bg-gray-100'}`}>{s.status.replace('_',' ')}</span></td>
                    <td className="px-3 py-2 text-center font-bold text-blue-700">{s.progress}%</td>
                    <td className="px-3 py-2 text-gray-500 max-w-xs truncate">{s.observations||'—'}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-gray-400 text-center py-6">Click "Edit" to add study progress entries</p>}
      </div>

      {/* ── Material Approval Follow-Up ── */}
      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-construction-600" />
            <h3 className="font-semibold text-gray-900">Material Approval Follow-Up</h3>
            <span className="badge badge-orange">{materialItems.length}</span>
          </div>
          <button onClick={() => setEditingMaterials(!editingMaterials)} className="btn-secondary btn-sm">
            <Edit2 size={13} /> {editingMaterials ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editingMaterials ? (
          <form onSubmit={materialsForm.handleSubmit(d => { onUpdate({ materialApprovals: JSON.stringify(d.items) }); setEditingMaterials(false); })} className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-construction-600 text-white">
                    <th className="px-2 py-2 text-left">Ref.</th><th className="px-2 py-2 text-left">Description</th>
                    <th className="px-2 py-2 text-center">Discipline</th><th className="px-2 py-2 text-left">Submitted By</th>
                    <th className="px-2 py-2 text-center">Submission Date</th><th className="px-2 py-2 text-center">Review Date</th>
                    <th className="px-2 py-2 text-center">Status</th><th className="px-2 py-2 text-left">Observations</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {materialsFields.fields.map((field, i) => (
                    <tr key={field.id} className="border-b border-gray-100">
                      <td className="px-1 py-1"><input className="input text-xs py-1 w-20" {...materialsForm.register(`items.${i}.ref`)} /></td>
                      <td className="px-1 py-1"><input className="input text-xs py-1" {...materialsForm.register(`items.${i}.description`)} /></td>
                      <td className="px-1 py-1"><select className="input text-xs py-1 w-28" {...materialsForm.register(`items.${i}.discipline`)}>{['STRUCTURE','ARCHITECTURE','MECANIQUE','ELECTRICITE','PLOMBERIE','CIVIL','INFRASTRUCTURE','GENERAL'].map(d=><option key={d} value={d}>{d}</option>)}</select></td>
                      <td className="px-1 py-1"><input className="input text-xs py-1 w-28" {...materialsForm.register(`items.${i}.submittedBy`)} /></td>
                      <td className="px-1 py-1"><input type="date" className="input text-xs py-1 w-32" {...materialsForm.register(`items.${i}.submissionDate`)} /></td>
                      <td className="px-1 py-1"><input type="date" className="input text-xs py-1 w-32" {...materialsForm.register(`items.${i}.reviewDate`)} /></td>
                      <td className="px-1 py-1"><select className="input text-xs py-1 w-28" {...materialsForm.register(`items.${i}.status`)}>{['PENDING','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','RESUBMITTED'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}</select></td>
                      <td className="px-1 py-1"><input className="input text-xs py-1" {...materialsForm.register(`items.${i}.observations`)} /></td>
                      <td className="px-1 py-1"><button type="button" onClick={() => materialsFields.remove(i)} className="btn-danger btn-sm p-1"><Trash2 size={12} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => materialsFields.append({ id: Date.now().toString(), ref: '', description: '', discipline: 'GENERAL', submittedBy: '', submissionDate: '', status: 'PENDING', observations: '' })} className="btn-secondary btn-sm"><Plus size={13} /> Add</button>
              <button type="submit" className="btn-primary btn-sm">Save</button>
            </div>
          </form>
        ) : materialItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-100 text-gray-600 font-semibold">
                <th className="px-3 py-2 text-left">Ref.</th><th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-center">Discipline</th><th className="px-3 py-2 text-left">Submitted By</th>
                <th className="px-3 py-2 text-center">Submission Date</th><th className="px-3 py-2 text-center">Review Date</th>
                <th className="px-3 py-2 text-center">Status</th><th className="px-3 py-2 text-left">Observations</th>
              </tr></thead>
              <tbody>
                {materialItems.map((m, i) => {
                  const c: Record<string,string> = { APPROVED:'text-green-700 bg-green-50', REJECTED:'text-red-700 bg-red-50', RESUBMITTED:'text-purple-700 bg-purple-50', SUBMITTED:'text-blue-700 bg-blue-50', UNDER_REVIEW:'text-orange-700 bg-orange-50', PENDING:'text-gray-600 bg-gray-100' };
                  return <tr key={i} className={`border-b border-gray-100 ${i%2===0?'bg-white':'bg-gray-50'}`}>
                    <td className="px-3 py-2 font-bold text-construction-700">{m.ref}</td>
                    <td className="px-3 py-2 text-gray-800">{m.description}</td>
                    <td className="px-3 py-2 text-center text-gray-500">{m.discipline}</td>
                    <td className="px-3 py-2 text-gray-700">{m.submittedBy}</td>
                    <td className="px-3 py-2 text-center">{m.submissionDate||'—'}</td>
                    <td className="px-3 py-2 text-center">{m.reviewDate||'—'}</td>
                    <td className="px-3 py-2 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c[m.status]||'text-gray-600 bg-gray-100'}`}>{m.status.replace('_',' ')}</span></td>
                    <td className="px-3 py-2 text-gray-500 max-w-xs truncate">{m.observations||'—'}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-gray-400 text-center py-6">Click "Edit" to add material approval entries</p>}
      </div>

      {/* Narrative */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900">Report Narrative</h3>
          <button onClick={() => setEditing(!editing)} className="btn-secondary btn-sm">{editing ? 'Cancel' : 'Edit'}</button>
        </div>
        {editing ? (
          <form className="space-y-3">
            {[
              { field: 'executiveSummary', label: 'Executive Summary' },
              { field: 'keyAchievements', label: 'Key Achievements' },
              { field: 'majorChallenges', label: 'Major Challenges' },
              { field: 'nextMonthPlan', label: 'Next Month Plan' },
              { field: 'architectureProgress',  label: 'Architecture (%)',  type: 'number' },
              { field: 'structureProgress',     label: 'Structure (%)',     type: 'number' },
              { field: 'mecaniqueProgress',     label: 'Mechanical (%)',    type: 'number' },
              { field: 'electriciteProgress',   label: 'Electrical (%)',    type: 'number' },
              { field: 'plomberieProgress',     label: 'Plumbing (%)',      type: 'number' },
              { field: 'infrastructureProgress',label: 'Infrastructure (%)',type: 'number' },
            ].map(f => (
              <div key={f.field}>
                <label className="label">{f.label}</label>
                {f.type === 'number'
                  ? <input type="number" className="input" min={0} max={100} {...register(f.field as any, { valueAsNumber: f.type === 'number' })} />
                  : <textarea className="input" rows={3} {...register(f.field as any)} />
                }
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary btn-sm">Cancel</button>
              <button type="button" onClick={handleSubmit(data => { onUpdate(data); setEditing(false); })} className="btn-primary btn-sm">Save</button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {[
              { label: 'Executive Summary', value: report.executiveSummary },
              { label: 'Key Achievements', value: report.keyAchievements },
              { label: 'Major Challenges', value: report.majorChallenges },
              { label: 'Next Month Plan', value: report.nextMonthPlan },
            ].filter(i => i.value).map(item => (
              <div key={item.label}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{item.label}</p>
                <p className="text-sm text-gray-700">{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
