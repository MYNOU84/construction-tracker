import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { weeklyReportsApi, projectsApi } from '../api/endpoints';
import { formatDate, parseJSON } from '../utils/helpers';
import { WeeklyReportExportButtons } from '../components/reports/ExportButtons';
import StatusBadge from '../components/ui/StatusBadge';
import ProgressBar from '../components/ui/ProgressBar';
import { PageLoader } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Plus, Trash2, FileText, Users, Edit2, BookOpen, Package } from 'lucide-react';
import type { WeeklyReport, LotProgress, StudyItem, MaterialItem, Project } from '../types';

export default function WeeklyReportPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const qc = useQueryClient();
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { weekNumber: getCurrentWeek(), year: new Date().getFullYear() }
  });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['weekly-reports', projectId],
    queryFn: () => weeklyReportsApi.list(projectId!).then(r => r.data),
    enabled: !!projectId,
  });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!).then(r => r.data),
    enabled: !!projectId,
  });

  const generateMutation = useMutation({
    mutationFn: (data: any) => weeklyReportsApi.generate(projectId!, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['weekly-reports', projectId] });
      setShowGenerate(false);
      setSelectedReport(res.data);
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => weeklyReportsApi.update(projectId!, id, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['weekly-reports', projectId] });
      setSelectedReport(res.data);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (reportId: string) => weeklyReportsApi.delete(projectId!, reportId),
    onSuccess: (_, reportId) => {
      qc.invalidateQueries({ queryKey: ['weekly-reports', projectId] });
      if (selectedReport?.id === reportId) setSelectedReport(null);
      setConfirmDeleteId(null);
    },
  });

  if (isLoading) return <PageLoader text="Loading weekly reports..." />;

  return (
    <div className="space-y-6 fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Weekly Reports</h1>
          <p className="page-subtitle">{reports.length} report{reports.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowGenerate(true)} className="btn-primary">
          <Plus size={16} /> Generate Weekly Report
        </button>
      </div>

      {reports.length === 0 ? (
        <EmptyState icon={FileText} title="No weekly reports yet"
          description="Generate a weekly summary from your daily reports"
          action={<button onClick={() => setShowGenerate(true)} className="btn-primary">Generate Report</button>}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report List */}
          <div className="space-y-3">
            {reports.map((r: WeeklyReport) => (
              <div key={r.id}
                className={`card-sm hover:shadow-card-lg transition-shadow cursor-pointer ${selectedReport?.id === r.id ? 'border-primary-500 border-2' : ''}`}
                onClick={() => setSelectedReport(r)}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">Week {r.weekNumber} / {r.year}</span>
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
                <p className="text-xs text-gray-500">{formatDate(r.startDate)} — {formatDate(r.endDate)}</p>
                <div className="mt-2">
                  <ProgressBar value={r.overallProgress} size="sm" showLabel label="Progress" />
                </div>
                <div className="flex gap-3 mt-2 text-xs text-gray-400">
                  <span><Users size={11} className="inline" /> {r.totalManpowerWeek} man-days</span>
                </div>
              </div>
            ))}
          </div>

          {/* Report Detail */}
          {selectedReport && (
            <div className="lg:col-span-2 space-y-4">
              <WeeklyReportDetail
                report={selectedReport}
                project={project}
                onUpdate={(data) => updateMutation.mutate({ id: selectedReport.id, data })}
              />
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showGenerate} onClose={() => setShowGenerate(false)} title="Generate Weekly Report"
        footer={
          <>
            <button onClick={() => setShowGenerate(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit(d => generateMutation.mutate(d))} disabled={generateMutation.isPending} className="btn-primary">
              {generateMutation.isPending ? 'Generating...' : 'Generate Report'}
            </button>
          </>
        }>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Auto-generates a weekly summary from daily reports for the selected week.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Week Number</label>
              <input type="number" className="input" min={1} max={53} {...register('weekNumber', { valueAsNumber: true })} />
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
        <p className="text-gray-600">Are you sure you want to delete this weekly report? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}

function WeeklyReportDetail({ report, project, onUpdate }: { report: WeeklyReport; project?: Project; onUpdate: (data: any) => void }) {
  const [editingNarrative, setEditingNarrative] = useState(false);
  const [editingLots, setEditingLots] = useState(false);
  const [editingStudies, setEditingStudies] = useState(false);
  const [editingMaterials, setEditingMaterials] = useState(false);

  const { register, handleSubmit } = useForm({
    defaultValues: {
      executiveSummary: report.executiveSummary || '',
      highlightsAchieved: report.highlightsAchieved || '',
      issuesEncountered: report.issuesEncountered || '',
      nextWeekPlan: report.nextWeekPlan || '',
    }
  });

  const lotsForm = useForm<{ lots: LotProgress[] }>({
    defaultValues: { lots: parseJSON<LotProgress[]>(report.lotsData, []) }
  });
  const lotsFields = useFieldArray({ control: lotsForm.control, name: 'lots' });

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

  const manpowerByDay = parseJSON<Record<string, number>>(report.manpowerByDay, {});
  const manpowerBreakdown = parseJSON<Record<string, { direct: number; indirect: number; total: number }>>(report.manpowerBreakdown, {});

  const chartData = Object.entries(manpowerByDay).map(([date, manpower]) => ({
    date: formatDate(date, 'EEE dd'),
    manpower,
  }));

  const breakdownEntries = Object.entries(manpowerBreakdown);
  const totalDirect = breakdownEntries.reduce((s, [, v]) => s + (v.direct || 0), 0);
  const totalIndirect = breakdownEntries.reduce((s, [, v]) => s + (v.indirect || 0), 0);

  const lots = parseJSON<LotProgress[]>(report.lotsData, []);

  const saveLots = (data: { lots: LotProgress[] }) => {
    onUpdate({ lotsData: JSON.stringify(data.lots) });
    setEditingLots(false);
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="card bg-gradient-to-r from-primary-700 to-primary-900 text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold">Weekly Report — Week {report.weekNumber}/{report.year}</h2>
            <p className="text-white/70 text-sm">{formatDate(report.startDate)} to {formatDate(report.endDate)}</p>
          </div>
          <div className="flex items-center gap-2">
            {project && <WeeklyReportExportButtons report={report} project={project} />}
            <StatusBadge status={report.status} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Overall Progress', value: `${report.overallProgress}%` },
            { label: 'Planned Progress', value: `${report.plannedProgress}%` },
            { label: 'Total Man-Days', value: report.totalManpowerWeek },
            { label: 'Peak Workforce', value: report.peakManpower },
          ].map(k => (
            <div key={k.label} className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{k.value}</div>
              <div className="text-xs text-white/70">{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Manpower by Day Chart */}
      {chartData.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Daily Manpower</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="manpower" fill="#1e40af" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* HR Breakdown: Direct vs Indirect */}
      {breakdownEntries.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">HR Breakdown by Company</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary-700 text-white text-xs">
                  <th className="px-3 py-2 text-left">Company</th>
                  <th className="px-3 py-2 text-center">Direct</th>
                  <th className="px-3 py-2 text-center">Indirect</th>
                  <th className="px-3 py-2 text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {breakdownEntries.map(([company, v]) => (
                  <tr key={company} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-800">{company || '—'}</td>
                    <td className="px-3 py-2 text-center text-blue-700 font-semibold">{v.direct || 0}</td>
                    <td className="px-3 py-2 text-center text-amber-700 font-semibold">{v.indirect || 0}</td>
                    <td className="px-3 py-2 text-center font-bold text-gray-900">{v.total || 0}</td>
                  </tr>
                ))}
                <tr className="bg-primary-700/10 font-bold">
                  <td className="px-3 py-2 text-primary-900">TOTAL</td>
                  <td className="px-3 py-2 text-center text-blue-900">{totalDirect}</td>
                  <td className="px-3 py-2 text-center text-amber-900">{totalIndirect}</td>
                  <td className="px-3 py-2 text-center text-gray-900">{totalDirect + totalIndirect}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LOT-Based Production Status */}
      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-900">LOT Production Status</h3>
          <button onClick={() => setEditingLots(!editingLots)} className="btn-secondary btn-sm">
            <Edit2 size={13} /> {editingLots ? 'Cancel' : 'Edit Lots'}
          </button>
        </div>

        {editingLots ? (
          <form onSubmit={lotsForm.handleSubmit(saveLots)} className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-primary-700 text-white">
                    <th className="px-2 py-2 text-left">LOT N°</th>
                    <th className="px-2 py-2 text-left">Description</th>
                    <th className="px-2 py-2 text-center">Unit</th>
                    <th className="px-2 py-2 text-center">Prev. Cumul. (%)</th>
                    <th className="px-2 py-2 text-center">Week (%)</th>
                    <th className="px-2 py-2 text-center">New Cumul. (%)</th>
                    <th className="px-2 py-2 text-center">Remaining (%)</th>
                    <th className="px-2 py-2 text-center">KPI Eff.</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {lotsFields.fields.map((field, i) => (
                    <tr key={field.id} className="border-b border-gray-100">
                      <td className="px-1 py-1"><input className="input text-xs py-1 w-14 text-center" {...lotsForm.register(`lots.${i}.lotNumber`)} /></td>
                      <td className="px-1 py-1"><input className="input text-xs py-1" {...lotsForm.register(`lots.${i}.description`)} /></td>
                      <td className="px-1 py-1"><input className="input text-xs py-1 w-14 text-center" {...lotsForm.register(`lots.${i}.unit`)} /></td>
                      <td className="px-1 py-1"><input type="number" className="input text-xs py-1 w-16 text-center" min={0} max={100} step={0.1}
                        {...lotsForm.register(`lots.${i}.previousCumulPct`, { valueAsNumber: true })} /></td>
                      <td className="px-1 py-1"><input type="number" className="input text-xs py-1 w-16 text-center" min={0} max={100} step={0.1}
                        {...lotsForm.register(`lots.${i}.weeklyPct`, { valueAsNumber: true })} /></td>
                      <td className="px-1 py-1"><input type="number" className="input text-xs py-1 w-16 text-center" min={0} max={100} step={0.1}
                        {...lotsForm.register(`lots.${i}.newCumulPct`, { valueAsNumber: true })} /></td>
                      <td className="px-1 py-1"><input type="number" className="input text-xs py-1 w-16 text-center" min={0} max={100} step={0.1}
                        {...lotsForm.register(`lots.${i}.remainingPct`, { valueAsNumber: true })} /></td>
                      <td className="px-1 py-1"><input type="number" className="input text-xs py-1 w-16 text-center" min={0} step={1}
                        {...lotsForm.register(`lots.${i}.kpiEfficiency`, { valueAsNumber: true })} /></td>
                      <td className="px-1 py-1">
                        <button type="button" onClick={() => lotsFields.remove(i)} className="btn-danger btn-sm p-1"><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <button type="button"
                onClick={() => lotsFields.append({ lotNumber: '', description: '', unit: '', budgetQty: 0, previousCumulPct: 0, weeklyPct: 0, newCumulPct: 0, remainingPct: 100, kpiEfficiency: 100 })}
                className="btn-secondary btn-sm">
                <Plus size={13} /> Add LOT
              </button>
              <button type="submit" className="btn-primary btn-sm">Save LOTs</button>
            </div>
          </form>
        ) : lots.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100 text-gray-600 font-semibold">
                  <th className="px-3 py-2 text-left">LOT N°</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-center">Unit</th>
                  <th className="px-3 py-2 text-center">Prev. Cumul.</th>
                  <th className="px-3 py-2 text-center">Week</th>
                  <th className="px-3 py-2 text-center">New Cumul.</th>
                  <th className="px-3 py-2 text-center">Remaining</th>
                  <th className="px-3 py-2 text-center">KPI Eff.</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((lot, i) => (
                  <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-3 py-2 font-bold text-primary-700">{lot.lotNumber}</td>
                    <td className="px-3 py-2 text-gray-800">{lot.description}</td>
                    <td className="px-3 py-2 text-center text-gray-500">{lot.unit}</td>
                    <td className="px-3 py-2 text-center">{lot.previousCumulPct}%</td>
                    <td className="px-3 py-2 text-center font-semibold text-blue-700">{lot.weeklyPct}%</td>
                    <td className="px-3 py-2 text-center font-bold text-green-700">{lot.newCumulPct}%</td>
                    <td className="px-3 py-2 text-center text-gray-600">{lot.remainingPct}%</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-bold ${(lot.kpiEfficiency || 0) >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                        {lot.kpiEfficiency}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">Click "Edit Lots" to add LOT production data</p>
        )}
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
                          {['STRUCTURE','ARCHITECTURE','MECANIQUE','ELECTRICITE','PLOMBERIE','CIVIL','INFRASTRUCTURE','GENERAL'].map(d =>
                            <option key={d} value={d}>{d}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1"><input className="input text-xs py-1 w-12 text-center" {...studiesForm.register(`items.${i}.rev`)} /></td>
                      <td className="px-1 py-1"><input type="date" className="input text-xs py-1 w-32" {...studiesForm.register(`items.${i}.plannedDate`)} /></td>
                      <td className="px-1 py-1"><input type="date" className="input text-xs py-1 w-32" {...studiesForm.register(`items.${i}.actualDate`)} /></td>
                      <td className="px-1 py-1">
                        <select className="input text-xs py-1 w-28" {...studiesForm.register(`items.${i}.status`)}>
                          {['NOT_STARTED','IN_PROGRESS','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED'].map(s =>
                            <option key={s} value={s}>{s.replace('_',' ')}</option>)}
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
              <button type="button" onClick={() => studiesFields.append({ id: Date.now().toString(), docNumber: '', description: '', discipline: 'GENERAL', rev: 'A', plannedDate: '', status: 'NOT_STARTED', progress: 0, observations: '' })} className="btn-secondary btn-sm">
                <Plus size={13} /> Add Study
              </button>
              <button type="submit" className="btn-primary btn-sm">Save</button>
            </div>
          </form>
        ) : studyItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100 text-gray-600 font-semibold">
                  <th className="px-3 py-2 text-left">N° Doc</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-center">Discipline</th>
                  <th className="px-3 py-2 text-center">Rev.</th>
                  <th className="px-3 py-2 text-center">Planned Date</th>
                  <th className="px-3 py-2 text-center">Actual Date</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-3 py-2 text-center">%</th>
                  <th className="px-3 py-2 text-left">Observations</th>
                </tr>
              </thead>
              <tbody>
                {studyItems.map((s, i) => {
                  const statusColor: Record<string, string> = { APPROVED: 'text-green-700 bg-green-50', REJECTED: 'text-red-700 bg-red-50', SUBMITTED: 'text-blue-700 bg-blue-50', UNDER_REVIEW: 'text-orange-700 bg-orange-50', IN_PROGRESS: 'text-purple-700 bg-purple-50', NOT_STARTED: 'text-gray-600 bg-gray-100' };
                  return (
                    <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-3 py-2 font-bold text-primary-700">{s.docNumber}</td>
                      <td className="px-3 py-2 text-gray-800">{s.description}</td>
                      <td className="px-3 py-2 text-center text-gray-500">{s.discipline}</td>
                      <td className="px-3 py-2 text-center font-medium">{s.rev}</td>
                      <td className="px-3 py-2 text-center">{s.plannedDate ? formatDate(s.plannedDate) : '—'}</td>
                      <td className="px-3 py-2 text-center">{s.actualDate ? formatDate(s.actualDate) : '—'}</td>
                      <td className="px-3 py-2 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[s.status] || 'text-gray-600 bg-gray-100'}`}>{s.status.replace('_', ' ')}</span></td>
                      <td className="px-3 py-2 text-center font-bold text-blue-700">{s.progress}%</td>
                      <td className="px-3 py-2 text-gray-500 max-w-xs truncate">{s.observations || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">Click "Edit" to add study progress entries</p>
        )}
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
                    <th className="px-2 py-2 text-left">Ref.</th>
                    <th className="px-2 py-2 text-left">Description</th>
                    <th className="px-2 py-2 text-center">Discipline</th>
                    <th className="px-2 py-2 text-left">Submitted By</th>
                    <th className="px-2 py-2 text-center">Submission Date</th>
                    <th className="px-2 py-2 text-center">Review Date</th>
                    <th className="px-2 py-2 text-center">Status</th>
                    <th className="px-2 py-2 text-left">Observations</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {materialsFields.fields.map((field, i) => (
                    <tr key={field.id} className="border-b border-gray-100">
                      <td className="px-1 py-1"><input className="input text-xs py-1 w-20" {...materialsForm.register(`items.${i}.ref`)} /></td>
                      <td className="px-1 py-1"><input className="input text-xs py-1" {...materialsForm.register(`items.${i}.description`)} /></td>
                      <td className="px-1 py-1">
                        <select className="input text-xs py-1 w-28" {...materialsForm.register(`items.${i}.discipline`)}>
                          {['STRUCTURE','ARCHITECTURE','MECANIQUE','ELECTRICITE','PLOMBERIE','CIVIL','INFRASTRUCTURE','GENERAL'].map(d =>
                            <option key={d} value={d}>{d}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1"><input className="input text-xs py-1 w-28" {...materialsForm.register(`items.${i}.submittedBy`)} /></td>
                      <td className="px-1 py-1"><input type="date" className="input text-xs py-1 w-32" {...materialsForm.register(`items.${i}.submissionDate`)} /></td>
                      <td className="px-1 py-1"><input type="date" className="input text-xs py-1 w-32" {...materialsForm.register(`items.${i}.reviewDate`)} /></td>
                      <td className="px-1 py-1">
                        <select className="input text-xs py-1 w-28" {...materialsForm.register(`items.${i}.status`)}>
                          {['PENDING','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','RESUBMITTED'].map(s =>
                            <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1"><input className="input text-xs py-1" {...materialsForm.register(`items.${i}.observations`)} /></td>
                      <td className="px-1 py-1"><button type="button" onClick={() => materialsFields.remove(i)} className="btn-danger btn-sm p-1"><Trash2 size={12} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => materialsFields.append({ id: Date.now().toString(), ref: '', description: '', discipline: 'GENERAL', submittedBy: '', submissionDate: '', status: 'PENDING', observations: '' })} className="btn-secondary btn-sm">
                <Plus size={13} /> Add Material
              </button>
              <button type="submit" className="btn-primary btn-sm">Save</button>
            </div>
          </form>
        ) : materialItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100 text-gray-600 font-semibold">
                  <th className="px-3 py-2 text-left">Ref.</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-center">Discipline</th>
                  <th className="px-3 py-2 text-left">Submitted By</th>
                  <th className="px-3 py-2 text-center">Submission Date</th>
                  <th className="px-3 py-2 text-center">Review Date</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-3 py-2 text-left">Observations</th>
                </tr>
              </thead>
              <tbody>
                {materialItems.map((m, i) => {
                  const statusColor: Record<string, string> = { APPROVED: 'text-green-700 bg-green-50', REJECTED: 'text-red-700 bg-red-50', RESUBMITTED: 'text-purple-700 bg-purple-50', SUBMITTED: 'text-blue-700 bg-blue-50', UNDER_REVIEW: 'text-orange-700 bg-orange-50', PENDING: 'text-gray-600 bg-gray-100' };
                  return (
                    <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-3 py-2 font-bold text-construction-700">{m.ref}</td>
                      <td className="px-3 py-2 text-gray-800">{m.description}</td>
                      <td className="px-3 py-2 text-center text-gray-500">{m.discipline}</td>
                      <td className="px-3 py-2 text-gray-700">{m.submittedBy}</td>
                      <td className="px-3 py-2 text-center">{m.submissionDate ? formatDate(m.submissionDate) : '—'}</td>
                      <td className="px-3 py-2 text-center">{m.reviewDate ? formatDate(m.reviewDate) : '—'}</td>
                      <td className="px-3 py-2 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[m.status] || 'text-gray-600 bg-gray-100'}`}>{m.status.replace('_', ' ')}</span></td>
                      <td className="px-3 py-2 text-gray-500 max-w-xs truncate">{m.observations || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">Click "Edit" to add material approval entries</p>
        )}
      </div>

      {/* Highlights & Narrative */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900">Report Narrative</h3>
          <button onClick={() => setEditingNarrative(!editingNarrative)} className="btn-secondary btn-sm">
            <Edit2 size={13} /> {editingNarrative ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editingNarrative ? (
          <form className="space-y-3">
            {[
              { field: 'executiveSummary', label: 'Executive Summary' },
              { field: 'highlightsAchieved', label: 'Highlights & Achievements' },
              { field: 'issuesEncountered', label: 'Issues & Challenges' },
              { field: 'nextWeekPlan', label: 'Next Week Plan' },
            ].map(f => (
              <div key={f.field}>
                <label className="label">{f.label}</label>
                <textarea className="input" rows={3} {...register(f.field as any)} />
              </div>
            ))}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setEditingNarrative(false)} className="btn-secondary btn-sm">Cancel</button>
              <button type="button" onClick={handleSubmit(data => { onUpdate(data); setEditingNarrative(false); })} className="btn-primary btn-sm">Save</button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {[
              { label: 'Executive Summary', value: report.executiveSummary },
              { label: 'Highlights', value: report.highlightsAchieved },
              { label: 'Issues', value: report.issuesEncountered },
              { label: 'Next Week Plan', value: report.nextWeekPlan },
            ].map(item => item.value && (
              <div key={item.label}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{item.label}</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{item.value}</p>
              </div>
            ))}
            {!report.executiveSummary && !report.highlightsAchieved && (
              <p className="text-sm text-gray-400 text-center py-4">Click Edit to add narrative content</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getCurrentWeek(): number {
  const d = new Date();
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
