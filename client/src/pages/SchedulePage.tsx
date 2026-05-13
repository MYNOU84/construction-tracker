import { useState, useRef, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { activitiesApi, milestonesApi, projectsApi, documentsApi } from '../api/endpoints';
import { formatDate, getDisciplineColor, getStatusLabel, DISCIPLINES, getDisciplineLabel } from '../utils/helpers';
import StatusBadge from '../components/ui/StatusBadge';
import ProgressBar from '../components/ui/ProgressBar';
import Modal from '../components/ui/Modal';
import { PageLoader } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { Plus, Calendar, Flag, Edit2, Upload, Download, FileText, Copy, CheckCircle, BarChart2, FileStack, Trash2 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import type { Activity, Milestone } from '../types';

type Tab = 'activities' | 'milestones' | 'gantt' | 'analyse' | 'documents';

const VALID_TABS: Tab[] = ['activities', 'milestones', 'gantt', 'analyse', 'documents'];

export default function SchedulePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();

  const urlTab = searchParams.get('tab') as Tab | null;
  const [tab, setTab] = useState<Tab>(
    urlTab && VALID_TABS.includes(urlTab) ? urlTab : 'activities'
  );

  useEffect(() => {
    const t = searchParams.get('tab') as Tab | null;
    if (t && VALID_TABS.includes(t)) setTab(t);
  }, [searchParams]);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const planDocRef = useRef<HTMLInputElement>(null);
  const [uploadingPlanDoc, setUploadingPlanDoc] = useState(false);
  const [planDocType, setPlanDocType] = useState<'PLANNING_INITIAL' | 'PLANNING_REVISED'>('PLANNING_INITIAL');

  const { data: activities = [], isLoading: loadAct } = useQuery({
    queryKey: ['activities', projectId],
    queryFn: () => activitiesApi.list(projectId!).then(r => r.data),
    enabled: !!projectId,
  });

  const { data: milestones = [], isLoading: loadMs } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => milestonesApi.list(projectId!).then(r => r.data),
    enabled: !!projectId,
  });

  const { data: planningDocs = [], refetch: refetchPlanDocs } = useQuery({
    queryKey: ['planning-docs', projectId],
    queryFn: () => documentsApi.list(projectId!).then(r =>
      (r.data as any[]).filter((d: any) =>
        d.type === 'PLANNING_INITIAL' || d.type === 'PLANNING_REVISED'
      )
    ),
    enabled: !!projectId,
  });

  const { register: regAct, handleSubmit: handleAct, reset: resetAct, setValue: setActVal } = useForm<any>();
  const { register: regMs, handleSubmit: handleMs, reset: resetMs, setValue: setMsVal } = useForm<any>();

  const createActivity = useMutation({
    mutationFn: (data: any) => editingActivity
      ? activitiesApi.update(projectId!, editingActivity.id, data)
      : activitiesApi.create(projectId!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['activities', projectId] }); setShowActivityModal(false); resetAct(); setEditingActivity(null); },
  });

  const createMilestone = useMutation({
    mutationFn: (data: any) => editingMilestone
      ? milestonesApi.update(projectId!, editingMilestone.id, data)
      : milestonesApi.create(projectId!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['milestones', projectId] }); setShowMilestoneModal(false); resetMs(); setEditingMilestone(null); },
  });

  const handlePlanDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;
    setUploadingPlanDoc(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('name', file.name);
      form.append('type', planDocType);
      form.append('description', planDocType === 'PLANNING_INITIAL' ? 'Baseline Planning' : 'Revised Planning');
      await documentsApi.upload(projectId, form);
      refetchPlanDocs();
    } catch { /* ignore */ } finally {
      setUploadingPlanDoc(false);
      if (planDocRef.current) planDocRef.current.value = '';
    }
  };

  const deletePlanDoc = async (docId: string) => {
    if (!projectId) return;
    try {
      await documentsApi.delete(projectId, docId);
      refetchPlanDocs();
    } catch { /* ignore */ }
  };

  const openEditActivity = (a: Activity) => {
    setEditingActivity(a);
    setActVal('name', a.name);
    setActVal('discipline', a.discipline);
    setActVal('area', a.area || '');
    setActVal('phase', a.phase || '');
    setActVal('plannedStart', a.plannedStart.split('T')[0]);
    setActVal('plannedEnd', a.plannedEnd.split('T')[0]);
    setActVal('actualProgress', a.actualProgress);
    setActVal('status', a.status);
    setActVal('priority', a.priority);
    setShowActivityModal(true);
  };

  const openEditMilestone = (m: Milestone) => {
    setEditingMilestone(m);
    setMsVal('name', m.name);
    setMsVal('description', m.description || '');
    setMsVal('plannedDate', m.plannedDate.split('T')[0]);
    setMsVal('status', m.status);
    setShowMilestoneModal(true);
  };

  if (loadAct || loadMs) return <PageLoader text="Loading schedule..." />;

  const normDiscipline = (d: string): string => ({
    'MEP':          'MECANIQUE',
    'Civilisation': 'CIVIL',
    'CIVILISATION': 'CIVIL',
    'Civil':        'CIVIL',
    'Génie Civil':  'CIVIL',
    'GENIE CIVIL':  'CIVIL',
    'Mechanical':   'MECANIQUE',
    'Electrical':   'ELECTRICITE',
    'Plumbing':     'PLOMBERIE',
    'ELECTRICAL':   'ELECTRICITE',
    'MECHANICAL':   'MECANIQUE',
    'PLUMBING':     'PLOMBERIE',
  }[d] ?? d);

  const disciplineGroups = DISCIPLINES.reduce<Record<string, Activity[]>>((acc, d) => {
    const acts = activities.filter(a => normDiscipline(a.discipline) === d);
    if (acts.length > 0) acc[d] = acts;
    return acc;
  }, {});

  const tabs = [
    { id: 'activities' as Tab, label: `Activities (${activities.length})` },
    { id: 'milestones' as Tab, label: `Milestones (${milestones.length})` },
    { id: 'gantt' as Tab, label: 'Comparative Gantt' },
    { id: 'analyse' as Tab, label: 'Analysis & Variance' },
    { id: 'documents' as Tab, label: 'Planning Documents' },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Schedule & Tasks</h1>
          <p className="page-subtitle">Overall schedule and activity tracking</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImportModal(true)} className="btn-secondary flex items-center gap-2">
            <Upload size={15} /> Import
          </button>
          <button onClick={() => { setEditingMilestone(null); resetMs(); setShowMilestoneModal(true); }} className="btn-secondary">
            <Flag size={16} /> Milestone
          </button>
          <button onClick={() => { setEditingActivity(null); resetAct(); setShowActivityModal(true); }} className="btn-primary">
            <Plus size={16} /> Activity
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: activities.length, class: 'text-gray-700' },
          { label: 'Not Started', value: activities.filter(a => a.status === 'NOT_STARTED').length, class: 'text-gray-500' },
          { label: 'In Progress', value: activities.filter(a => a.status === 'IN_PROGRESS').length, class: 'text-blue-600' },
          { label: 'Completed', value: activities.filter(a => a.status === 'COMPLETED').length, class: 'text-green-600' },
          { label: 'Delayed', value: activities.filter(a => a.status === 'DELAYED').length, class: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="card-sm text-center">
            <div className={`text-2xl font-bold ${s.class}`}>{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Activities Tab */}
      {tab === 'activities' && (
        activities.length === 0 ? (
          <div className="card text-center py-16">
            <Calendar size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="font-semibold text-gray-500 mb-1">No activities for this project</p>
            <p className="text-sm text-gray-400 mb-6">Add activities manually or import from a CSV file / another project</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setShowImportModal(true)} className="btn-secondary flex items-center gap-2">
                <Upload size={15} /> Import activities
              </button>
              <button onClick={() => { setEditingActivity(null); resetAct(); setShowActivityModal(true); }} className="btn-primary">
                <Plus size={15} /> Add activity
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(disciplineGroups).map(([discipline, acts]) => (
              <div key={discipline} className="card">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getDisciplineColor(discipline) }} />
                  <h3 className="font-semibold text-gray-900">{getDisciplineLabel(discipline)}</h3>
                  <span className="badge badge-gray">{acts.length}</span>
                </div>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Activity</th>
                        <th>Area</th>
                        <th>Planned Start</th>
                        <th>Planned End</th>
                        <th>Progress</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {acts.map(a => (
                        <tr key={a.id}>
                          <td className="font-medium text-gray-900">{a.name}</td>
                          <td className="text-gray-500 text-xs">{a.area || '—'}</td>
                          <td className="text-xs">{formatDate(a.plannedStart)}</td>
                          <td className="text-xs">{formatDate(a.plannedEnd)}</td>
                          <td>
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <ProgressBar value={a.actualProgress} size="sm" className="flex-1" />
                              <span className="text-xs font-medium">{a.actualProgress}%</span>
                            </div>
                          </td>
                          <td><StatusBadge status={a.status} /></td>
                          <td>
                            <button onClick={() => openEditActivity(a)} className="btn-secondary btn-sm">
                              <Edit2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Milestones Tab */}
      {tab === 'milestones' && (
        milestones.length === 0 ? (
          <EmptyState icon={Flag} title="No milestones yet" description="Add project milestones to track key deliverables" />
        ) : (
          <div className="card">
            <div className="space-y-3">
              {milestones.map((m, i) => {
                const isAchieved = m.status === 'ACHIEVED';
                const isDelayed = m.status === 'DELAYED';
                return (
                  <div key={m.id} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      isAchieved ? 'bg-green-100 text-green-700' :
                      isDelayed ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{m.name}</p>
                      {m.description && <p className="text-xs text-gray-500">{m.description}</p>}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>Planned: {formatDate(m.plannedDate)}</span>
                        {m.actualDate && <span>Actual: {formatDate(m.actualDate)}</span>}
                      </div>
                    </div>
                    <StatusBadge status={m.status} />
                    <button onClick={() => openEditMilestone(m)} className="btn-secondary btn-sm">
                      <Edit2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* Gantt Comparatif */}
      {tab === 'gantt' && (
        <div className="card overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Comparative Gantt — Planned vs Actual</h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-2.5 rounded" style={{background:'rgba(59,130,246,0.35)',border:'1px solid #3b82f6'}}></span>Planned</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-2.5 rounded" style={{background:'#10b981'}}></span>Actual</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-0.5 h-4 bg-red-500"></span>Today</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rotate-45" style={{background:'#f59e0b'}}></span>Milestone</span>
            </div>
          </div>
          <PlanningGantt activities={activities} milestones={milestones} />
        </div>
      )}

      {/* Analysis & Variance */}
      {tab === 'analyse' && <AnalyseTab activities={activities} milestones={milestones} />}

      {/* Documents Planning */}
      {tab === 'documents' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Upload Planning Document</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Planning Type</label>
                <select className="input" value={planDocType} onChange={e => setPlanDocType(e.target.value as any)}>
                  <option value="PLANNING_INITIAL">Baseline Planning</option>
                  <option value="PLANNING_REVISED">Revised / Current Planning</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 btn-primary cursor-pointer w-full justify-center">
                  <Upload size={14} />
                  {uploadingPlanDoc ? 'Uploading...' : 'Upload PDF / Excel'}
                  <input ref={planDocRef} type="file" className="hidden" accept=".pdf,.xlsx,.xls,.mpp"
                    onChange={handlePlanDocUpload} disabled={uploadingPlanDoc} />
                </label>
              </div>
            </div>
            <p className="text-xs text-gray-400">Accepted formats: PDF, Excel (.xlsx/.xls), MS Project (.mpp)</p>
          </div>

          {/* Document list */}
          {planningDocs.length === 0 ? (
            <div className="card text-center py-12">
              <FileStack size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-500">No planning documents uploaded</p>
              <p className="text-xs text-gray-400 mt-1">Upload your planning PDF or Excel to store it here</p>
            </div>
          ) : (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Planning Documents ({planningDocs.length})</h3>
              <div className="space-y-2">
                {(planningDocs as any[]).map((doc: any) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                      doc.type === 'PLANNING_INITIAL' ? 'bg-blue-100' : 'bg-amber-100'
                    }`}>
                      <FileText size={16} className={doc.type === 'PLANNING_INITIAL' ? 'text-blue-600' : 'text-amber-600'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                      <p className="text-xs text-gray-400">
                        {doc.type === 'PLANNING_INITIAL' ? 'Baseline Planning' : 'Revised Planning'}
                        {' · '}{formatDate(doc.createdAt)}
                        {doc.fileSize && ` · ${(doc.fileSize / 1024).toFixed(0)} KB`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {doc.fileUrl && (
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="btn-secondary btn-sm" title="Télécharger">
                          <Download size={13} />
                        </a>
                      )}
                      <button onClick={() => deletePlanDoc(doc.id)} className="btn-secondary btn-sm text-red-400 hover:text-red-600" title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          projectId={projectId!}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['activities', projectId] })}
        />
      )}

      {/* Activity Modal */}
      <Modal isOpen={showActivityModal} onClose={() => { setShowActivityModal(false); resetAct(); setEditingActivity(null); }}
        title={editingActivity ? 'Edit Activity' : 'New Activity'} size="lg"
        footer={
          <>
            <button onClick={() => { setShowActivityModal(false); resetAct(); setEditingActivity(null); }} className="btn-secondary">Cancel</button>
            <button onClick={handleAct(d => createActivity.mutate(d))} disabled={createActivity.isPending} className="btn-primary">
              {createActivity.isPending ? 'Saving...' : 'Save Activity'}
            </button>
          </>
        }>
        <form className="space-y-4">
          <div>
            <label className="label">Activity Name *</label>
            <input className="input" {...regAct('name', { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Discipline</label>
              <select className="input" {...regAct('discipline')}>
                {DISCIPLINES.map(d => <option key={d} value={d}>{getDisciplineLabel(d)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Area/Zone</label>
              <input className="input" placeholder="Bâtiment A, Zone 1..." {...regAct('area')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Planned Start</label>
              <input type="date" className="input" {...regAct('plannedStart', { required: true })} />
            </div>
            <div>
              <label className="label">Planned End</label>
              <input type="date" className="input" {...regAct('plannedEnd', { required: true })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Progress (%)</label>
              <input type="number" className="input" min={0} max={100} {...regAct('actualProgress', { valueAsNumber: true })} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" {...regAct('status')}>
                {['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'ON_HOLD'].map(s =>
                  <option key={s} value={s}>{getStatusLabel(s)}</option>
                )}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" {...regAct('priority')}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Milestone Modal */}
      <Modal isOpen={showMilestoneModal} onClose={() => { setShowMilestoneModal(false); resetMs(); setEditingMilestone(null); }}
        title={editingMilestone ? 'Edit Milestone' : 'New Milestone'}
        footer={
          <>
            <button onClick={() => { setShowMilestoneModal(false); resetMs(); setEditingMilestone(null); }} className="btn-secondary">Cancel</button>
            <button onClick={handleMs(d => createMilestone.mutate(d))} disabled={createMilestone.isPending} className="btn-primary">
              {createMilestone.isPending ? 'Saving...' : 'Save Milestone'}
            </button>
          </>
        }>
        <form className="space-y-4">
          <div>
            <label className="label">Milestone Name *</label>
            <input className="input" {...regMs('name', { required: true })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} {...regMs('description')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Planned Date *</label>
              <input type="date" className="input" {...regMs('plannedDate', { required: true })} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" {...regMs('status')}>
                {['PENDING', 'ACHIEVED', 'DELAYED', 'AT_RISK'].map(s =>
                  <option key={s} value={s}>{getStatusLabel(s)}</option>
                )}
              </select>
            </div>
          </div>
          {editingMilestone && (
            <div>
              <label className="label">Actual Date</label>
              <input type="date" className="input" {...regMs('actualDate')} />
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}

// ─── Import Modal ─────────────────────────────────────────────────────────────

function ImportModal({ projectId, onClose, onSuccess }: {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [tab, setTab] = useState<'csv' | 'copy'>('csv');
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [csvError, setCsvError] = useState('');
  const [importError, setImportError] = useState('');
  const [copySourceId, setCopySourceId] = useState('');
  const [copySelected, setCopySelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState<number | null>(null);

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then(r => r.data),
  });

  const { data: sourceActivities = [] } = useQuery({
    queryKey: ['activities', copySourceId],
    queryFn: () => activitiesApi.list(copySourceId).then(r => r.data),
    enabled: !!copySourceId,
  });

  const otherProjects = (allProjects as any[]).filter((p: any) => p.id !== projectId);

  // ── Normalizers ──
  const normDisciplineCSV = (v: string): string => ({
    'structure': 'STRUCTURE',
    'architecture': 'ARCHITECTURE',
    'mécanique': 'MECANIQUE', 'mecanique': 'MECANIQUE', 'mechanical': 'MECANIQUE', 'cvc': 'MECANIQUE',
    'électricité': 'ELECTRICITE', 'electricite': 'ELECTRICITE', 'electrical': 'ELECTRICITE', 'electrique': 'ELECTRICITE',
    'plomberie': 'PLOMBERIE', 'plumbing': 'PLOMBERIE',
    'civil': 'CIVIL', 'génie civil': 'CIVIL', 'genie civil': 'CIVIL', 'civilisation': 'CIVIL',
    'infrastructure': 'INFRASTRUCTURE',
    'général': 'GENERAL', 'general': 'GENERAL',
  }[v.toLowerCase().trim()] ?? v.toUpperCase().trim());

  const normStatus = (v: string): string => ({
    'not started': 'NOT_STARTED', 'non commencé': 'NOT_STARTED', 'non commence': 'NOT_STARTED', 'non_started': 'NOT_STARTED',
    'in progress': 'IN_PROGRESS', 'en cours': 'IN_PROGRESS', 'in_progress': 'IN_PROGRESS',
    'completed': 'COMPLETED', 'terminé': 'COMPLETED', 'termine': 'COMPLETED',
    'delayed': 'DELAYED', 'en retard': 'DELAYED',
    'on hold': 'ON_HOLD', 'en attente': 'ON_HOLD', 'on_hold': 'ON_HOLD',
  }[v.toLowerCase().trim()] ?? 'NOT_STARTED');

  const normPriority = (v: string): string => ({
    'low': 'LOW', 'faible': 'LOW', 'basse': 'LOW',
    'medium': 'MEDIUM', 'moyen': 'MEDIUM', 'normale': 'MEDIUM', 'normal': 'MEDIUM',
    'high': 'HIGH', 'élevé': 'HIGH', 'eleve': 'HIGH', 'haute': 'HIGH',
    'critical': 'CRITICAL', 'critique': 'CRITICAL',
  }[v.toLowerCase().trim()] ?? 'MEDIUM');

  const normDate = (v: string): string => {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
      const [d, m, y] = v.split('/');
      return `${y}-${m}-${d}`;
    }
    return v.trim();
  };

  // ── CSV parser ──
  const parseCSV = (text: string) => {
    setCsvError('');
    setCsvRows([]);
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) { setCsvError('The file must contain at least one data row after the header.'); return; }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const rows: any[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i];
      if (!raw.trim()) continue;
      const vals = raw.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));

      const get = (...keys: string[]) => {
        for (const key of keys) {
          const idx = headers.indexOf(key);
          if (idx >= 0 && vals[idx]) return vals[idx];
        }
        return '';
      };

      const name = get('nom', 'name', 'activité', 'activite', 'tâche', 'tache', 'task');
      const plannedStart = normDate(get('date début', 'date debut', 'planned start', 'début', 'debut', 'start'));
      const plannedEnd = normDate(get('date fin', 'planned end', 'fin', 'end'));

      if (!name) { errors.push(`Row ${i + 1}: Missing name`); continue; }
      if (!plannedStart) { errors.push(`Row ${i + 1}: Missing start date`); continue; }
      if (!plannedEnd) { errors.push(`Row ${i + 1}: Missing end date`); continue; }
      if (isNaN(new Date(plannedStart).getTime())) { errors.push(`Row ${i + 1}: Invalid start date ("${plannedStart}")`); continue; }
      if (isNaN(new Date(plannedEnd).getTime())) { errors.push(`Row ${i + 1}: Invalid end date ("${plannedEnd}")`); continue; }

      rows.push({
        name,
        discipline: normDisciplineCSV(get('discipline') || 'GENERAL'),
        area: get('zone', 'area', 'secteur') || null,
        phase: get('phase') || null,
        plannedStart,
        plannedEnd,
        actualProgress: Math.min(100, Math.max(0, Number(get('avancement (%)', 'avancement', 'progress', '%') || 0))),
        status: normStatus(get('statut', 'status') || 'NOT_STARTED'),
        priority: normPriority(get('priorité', 'priorite', 'priority') || 'MEDIUM'),
      });
    }

    if (errors.length > 0) setCsvError(errors.join('\n'));
    setCsvRows(rows);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => parseCSV(ev.target?.result as string);
    reader.readAsText(file, 'UTF-8');
  };

  const downloadTemplate = () => {
    const bom = '﻿';
    const header = 'Name,Discipline,Area,Planned Start,Planned End,Progress (%),Status,Priority';
    const examples = [
      'Deep Foundations,STRUCTURE,Zone A,2024-03-01,2024-04-30,100,COMPLETED,HIGH',
      'Exterior Facades,ARCHITECTURE,Building A,2024-05-01,2024-08-31,0,NOT_STARTED,MEDIUM',
      'HVAC Level 1,MECANIQUE,Zone B,2024-06-01,2024-09-30,0,NOT_STARTED,MEDIUM',
      'Electrical Wiring,ELECTRICITE,Zone A,2024-05-15,2024-08-15,0,NOT_STARTED,HIGH',
      'Plumbing GF,PLOMBERIE,Zone A,2024-05-01,2024-07-31,0,NOT_STARTED,LOW',
      'Main Road,CIVIL,Site,2024-07-01,2024-12-31,0,NOT_STARTED,MEDIUM',
    ].join('\n');
    const blob = new Blob([bom + header + '\n' + examples], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'activities_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Import handler ──
  const handleImport = async () => {
    setImporting(true);
    setImportError('');
    try {
      let toImport: any[];
      if (tab === 'csv') {
        toImport = csvRows;
      } else {
        toImport = sourceActivities
          .filter((a: any) => copySelected.has(a.id))
          .map((a: any) => ({
            name: a.name,
            description: a.description,
            discipline: a.discipline,
            area: a.area,
            phase: a.phase,
            wbsCode: a.wbsCode,
            plannedStart: a.plannedStart,
            plannedEnd: a.plannedEnd,
            actualProgress: a.actualProgress,
            plannedProgress: a.plannedProgress,
            status: a.status,
            priority: a.priority,
          }));
      }
      // Use existing createActivity endpoint sequentially (no new backend route needed)
      for (const activity of toImport) {
        await activitiesApi.create(projectId, activity);
      }
      onSuccess();
      setImportDone(toImport.length);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Import failed. Please check that the server is running.';
      setImportError(msg);
    } finally {
      setImporting(false);
    }
  };

  const toggleAll = () => {
    if (copySelected.size === sourceActivities.length) {
      setCopySelected(new Set());
    } else {
      setCopySelected(new Set(sourceActivities.map((a: any) => a.id)));
    }
  };

  const importCount = tab === 'csv' ? csvRows.length : copySelected.size;
  const canImport = importCount > 0 && !importing;

  // ── Success screen ──
  if (importDone !== null) {
    return (
      <Modal isOpen onClose={onClose} title="Import successful" size="sm"
        footer={<button onClick={onClose} className="btn-primary w-full">Close</button>}>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">{importDone} {importDone === 1 ? 'activity' : 'activities'} imported</p>
          <p className="text-sm text-gray-500 mt-2">The schedule has been updated successfully.</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={onClose} title="Import Activities" size="xl"
      footer={
        <div className="flex gap-3 justify-end w-full">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleImport} disabled={!canImport} className="btn-primary">
            {importing
              ? 'Importing...'
              : canImport
                ? `Import ${importCount} ${importCount === 1 ? 'activity' : 'activities'}`
                : 'Import'}
          </button>
        </div>
      }>

      {/* Global error */}
      {importError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <span className="text-red-500 text-sm font-semibold flex-shrink-0">⚠</span>
          <p className="text-sm text-red-700">{importError}</p>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5">
        <button onClick={() => setTab('csv')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${tab === 'csv' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
          <FileText size={14} /> Import CSV / Excel
        </button>
        <button onClick={() => setTab('copy')}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${tab === 'copy' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
          <Copy size={14} /> Copy from project
        </button>
      </div>

      {/* ── CSV Tab ── */}
      {tab === 'csv' && (
        <div className="space-y-4">
          {/* Template download banner */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100">
            <div>
              <p className="text-sm font-semibold text-blue-800">CSV Template</p>
              <p className="text-xs text-blue-600 mt-0.5">Download the template with all required columns (Excel-compatible)</p>
            </div>
            <button onClick={downloadTemplate} className="btn-secondary text-xs flex items-center gap-1.5 flex-shrink-0">
              <Download size={13} /> Télécharger
            </button>
          </div>

          {/* Columns guide */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { col: 'Name', req: true, hint: 'Activity name' },
              { col: 'Discipline', req: false, hint: 'STRUCTURE, MECANIQUE…' },
              { col: 'Area', req: false, hint: 'Building A, Zone 1…' },
              { col: 'Planned Start', req: true, hint: 'YYYY-MM-DD or DD/MM/YYYY' },
              { col: 'Planned End', req: true, hint: 'YYYY-MM-DD or DD/MM/YYYY' },
              { col: 'Progress (%)', req: false, hint: '0 to 100' },
              { col: 'Status', req: false, hint: 'NOT_STARTED, IN_PROGRESS…' },
              { col: 'Priority', req: false, hint: 'LOW, MEDIUM, HIGH, CRITICAL' },
            ].map(c => (
              <div key={c.col} className="text-xs rounded-lg border border-gray-100 p-2 bg-gray-50">
                <span className="font-semibold text-gray-700">{c.col}</span>
                {c.req && <span className="text-red-500 ml-1">*</span>}
                <p className="text-gray-400 mt-0.5">{c.hint}</p>
              </div>
            ))}
          </div>

          {/* File upload zone */}
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group">
            <Upload size={28} className="text-gray-300 group-hover:text-blue-400 mb-2 transition-colors" />
            <p className="text-sm font-medium text-gray-600">Click or drag your CSV file here</p>
            <p className="text-xs text-gray-400 mt-1">Format .csv — comma separator — UTF-8 encoding</p>
            <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
          </label>

          {/* Errors */}
          {csvError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-semibold text-red-700 mb-1">Errors detected:</p>
              <pre className="text-xs text-red-600 whitespace-pre-wrap font-mono">{csvError}</pre>
            </div>
          )}

          {/* Preview table */}
          {csvRows.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Preview — <span className="text-green-600">{csvRows.length} {csvRows.length === 1 ? 'activity' : 'activities'} ready to import</span>
              </p>
              <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-100">
                <table className="table text-xs">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Discipline</th>
                      <th>Area</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Progress</th>
                      <th>Status</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.map((r, i) => (
                      <tr key={i}>
                        <td className="font-medium text-gray-900 max-w-[160px] truncate">{r.name}</td>
                        <td>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getDisciplineColor(r.discipline) }} />
                            <span>{getDisciplineLabel(r.discipline)}</span>
                          </span>
                        </td>
                        <td className="text-gray-500">{r.area || '—'}</td>
                        <td>{r.plannedStart}</td>
                        <td>{r.plannedEnd}</td>
                        <td className="font-medium">{r.actualProgress}%</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td className="text-gray-500">{r.priority}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Copy from Project Tab ── */}
      {tab === 'copy' && (
        <div className="space-y-4">
          <div>
            <label className="label">Select source project</label>
            <select className="input" value={copySourceId}
              onChange={e => { setCopySourceId(e.target.value); setCopySelected(new Set()); }}>
              <option value="">Choose a project...</option>
              {otherProjects.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p._count?.activities ?? 0} {(p._count?.activities ?? 0) !== 1 ? 'activities' : 'activity'}
                </option>
              ))}
            </select>
          </div>

          {copySourceId && (
            sourceActivities.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Calendar size={32} className="mx-auto mb-2 text-gray-200" />
                <p className="text-sm">This project has no activities to copy</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-700">
                    {sourceActivities.length} activities available
                    {copySelected.size > 0 && <span className="text-primary-600 ml-2">· {copySelected.size} selected</span>}
                  </p>
                  <button onClick={toggleAll} className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors">
                    {copySelected.size === sourceActivities.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-50">
                  {sourceActivities.map((a: any) => (
                    <label key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={copySelected.has(a.id)}
                        onChange={e => {
                          const next = new Set(copySelected);
                          e.target.checked ? next.add(a.id) : next.delete(a.id);
                          setCopySelected(next);
                        }}
                        className="rounded border-gray-300 text-primary-600 w-4 h-4 flex-shrink-0"
                      />
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getDisciplineColor(a.discipline) }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{a.name}</p>
                        <p className="text-xs text-gray-400">
                          {getDisciplineLabel(a.discipline)}
                          {a.area ? ` · ${a.area}` : ''}
                          {' · '}{formatDate(a.plannedStart)} → {formatDate(a.plannedEnd)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-medium text-gray-600">{a.actualProgress}%</span>
                        <StatusBadge status={a.status} />
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Dates will be copied as-is. You can edit them after import.
                </p>
              </div>
            )
          )}

          {!copySourceId && (
            <div className="text-center py-12 text-gray-400">
              <Copy size={36} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm font-medium">Select a project to see its activities</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ─── Planning Gantt ───────────────────────────────────────────────────────────

function PlanningGantt({ activities, milestones }: { activities: Activity[]; milestones: Milestone[] }) {
  if (activities.length === 0) return (
    <div className="text-center py-12 text-gray-400">
      <Calendar size={40} className="mx-auto mb-2 text-gray-200" />
      <p className="text-sm">No activities to display</p>
    </div>
  );

  const allDates = [
    ...activities.map(a => new Date(a.plannedStart).getTime()),
    ...activities.map(a => new Date(a.plannedEnd).getTime()),
    ...milestones.map(m => new Date(m.plannedDate).getTime()),
  ];
  const minTs = Math.min(...allDates);
  const maxTs = Math.max(...allDates);
  const minDate = new Date(minTs);
  const maxDate = new Date(maxTs);
  const totalDays = Math.max(1, Math.ceil((maxTs - minTs) / 86400000) + 1);
  const today = new Date();
  const todayPct = Math.min(100, Math.max(0, ((today.getTime() - minTs) / (maxTs - minTs)) * 100));
  const showToday = today >= minDate && today <= maxDate;

  // Build month headers
  const months: { label: string; leftPct: number; widthPct: number }[] = [];
  let cur = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  while (cur <= maxDate) {
    const mStart = Math.max(cur.getTime(), minTs);
    const mEnd = Math.min(new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getTime(), maxTs);
    const leftPct = ((mStart - minTs) / (maxTs - minTs)) * 100;
    const widthPct = ((mEnd - mStart) / (maxTs - minTs)) * 100;
    months.push({
      label: cur.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
      leftPct,
      widthPct: Math.max(widthPct, 0),
    });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }

  const pct = (ts: number) => Math.max(0, Math.min(100, ((ts - minTs) / (maxTs - minTs)) * 100));
  const widthPct = (s: number, e: number) => Math.max(0.5, pct(e) - pct(s));

  return (
    <div className="min-w-[900px]">
      {/* Month header */}
      <div className="flex ml-48 mb-1 relative h-6 border-b border-gray-100">
        {months.map((m, i) => (
          <div key={i} className="absolute text-xs text-gray-400 font-medium truncate px-1"
            style={{ left: `${m.leftPct}%`, width: `${m.widthPct}%` }}>
            {m.label}
          </div>
        ))}
      </div>

      {/* Activity rows */}
      <div className="space-y-1">
        {activities.map(a => {
          const ps = new Date(a.plannedStart).getTime();
          const pe = new Date(a.plannedEnd).getTime();
          const planLeft = pct(ps);
          const planWidth = widthPct(ps, pe);
          // Actual progress bar: covers planLeft to planLeft + planWidth * progress%
          const actualWidth = planWidth * (a.actualProgress / 100);
          return (
            <div key={a.id} className="flex items-center gap-2 group">
              <div className="w-48 text-xs text-gray-700 font-medium truncate flex-shrink-0 pr-2"
                title={a.name}>{a.name}</div>
              <div className="flex-1 relative" style={{ height: 22 }}>
                {/* Today line */}
                {showToday && (
                  <div className="absolute top-0 bottom-0 w-px bg-red-400 z-10 pointer-events-none"
                    style={{ left: `${todayPct}%` }} />
                )}
                {/* Planned bar (background) */}
                <div className="absolute top-1 rounded h-4 opacity-40"
                  style={{
                    left: `${planLeft}%`,
                    width: `${planWidth}%`,
                    backgroundColor: getDisciplineColor(a.discipline),
                    border: `1px solid ${getDisciplineColor(a.discipline)}`,
                  }} />
                {/* Actual progress bar */}
                {a.actualProgress > 0 && (
                  <div className="absolute top-1 rounded h-4"
                    style={{
                      left: `${planLeft}%`,
                      width: `${actualWidth}%`,
                      backgroundColor: getDisciplineColor(a.discipline),
                      opacity: 0.9,
                    }} />
                )}
                {/* Progress label */}
                <div className="absolute top-1 h-4 flex items-center pointer-events-none"
                  style={{ left: `${planLeft}%`, width: `${planWidth}%` }}>
                  <span className="text-xs text-white font-semibold px-1 truncate"
                    style={{ textShadow: '0 0 3px rgba(0,0,0,0.6)' }}>
                    {a.actualProgress > 0 ? `${a.actualProgress}%` : ''}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Milestone rows */}
        {milestones.map(m => {
          const mTs = new Date(m.plannedDate).getTime();
          const mPct = pct(mTs);
          return (
            <div key={m.id} className="flex items-center gap-2">
              <div className="w-48 text-xs text-amber-700 font-medium truncate flex-shrink-0 pr-2 flex items-center gap-1">
                <Flag size={10} className="flex-shrink-0" />{m.name}
              </div>
              <div className="flex-1 relative" style={{ height: 18 }}>
                {showToday && (
                  <div className="absolute top-0 bottom-0 w-px bg-red-400 z-10 pointer-events-none"
                    style={{ left: `${todayPct}%` }} />
                )}
                <div className="absolute w-3 h-3 rotate-45 bg-amber-400 border border-amber-600"
                  style={{ left: `calc(${mPct}% - 6px)`, top: 3 }}
                  title={m.name} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Today legend */}
      {showToday && (
        <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-400">
          Period: {formatDate(minDate.toISOString())} → {formatDate(maxDate.toISOString())}
          <span className="ml-4 text-red-400">▏ Today: {formatDate(today.toISOString())}</span>
        </div>
      )}
    </div>
  );
}

// ─── Analyse Tab ──────────────────────────────────────────────────────────────

function AnalyseTab({ activities, milestones }: { activities: Activity[]; milestones: Milestone[] }) {
  if (activities.length === 0) return (
    <div className="card text-center py-16">
      <BarChart2 size={48} className="mx-auto text-gray-200 mb-3" />
      <p className="text-sm font-medium text-gray-500">No activities to generate analysis</p>
    </div>
  );

  const today = new Date();

  // Build S-curve data — monthly cumulative % planned vs actual
  const allDates = activities.flatMap(a => [new Date(a.plannedStart), new Date(a.plannedEnd)]);
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

  const scurveData: { month: string; planned: number; actual: number }[] = [];
  let cur = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  while (cur <= maxDate) {
    const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59);
    let plannedDone = 0, totalWeight = activities.length;
    let actualDone = 0;
    activities.forEach(a => {
      const ps = new Date(a.plannedStart);
      const pe = new Date(a.plannedEnd);
      // planned progress at monthEnd: linear interpolation
      if (pe <= monthEnd) {
        plannedDone += 1;
      } else if (ps < monthEnd && pe > monthEnd) {
        const elapsed = (monthEnd.getTime() - ps.getTime());
        const dur = (pe.getTime() - ps.getTime());
        plannedDone += Math.min(1, elapsed / dur);
      }
      // actual progress: use actualProgress if activity end <= today, else proportional
      if (cur <= today) {
        if (pe <= today) {
          actualDone += a.actualProgress / 100;
        } else if (ps <= today) {
          actualDone += a.actualProgress / 100;
        }
      }
    });
    scurveData.push({
      month: cur.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
      planned: Math.round((plannedDone / totalWeight) * 100),
      actual: cur > today ? null as any : Math.round((actualDone / totalWeight) * 100),
    });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }

  // Variance table
  const nowTs = today.getTime();
  const varianceRows = activities.map(a => {
    const ps = new Date(a.plannedStart).getTime();
    const pe = new Date(a.plannedEnd).getTime();
    const dur = Math.max(1, (pe - ps) / 86400000);
    // Expected progress at today
    let expectedPct = 0;
    if (nowTs >= pe) expectedPct = 100;
    else if (nowTs > ps) expectedPct = Math.round(((nowTs - ps) / (pe - ps)) * 100);
    const variance = a.actualProgress - expectedPct;
    // Delay estimate in days
    const delayDays = variance < 0 ? Math.round((Math.abs(variance) / 100) * dur) : 0;
    return { ...a, expectedPct, variance, delayDays };
  });

  const delayed = varianceRows.filter(r => r.variance < -10);
  const ontrack = varianceRows.filter(r => r.variance >= -10 && r.variance <= 10);
  const ahead = varianceRows.filter(r => r.variance > 10);

  const overallPlanned = (() => {
    let done = 0;
    activities.forEach(a => {
      const ps = new Date(a.plannedStart).getTime();
      const pe = new Date(a.plannedEnd).getTime();
      if (nowTs >= pe) done += 1;
      else if (nowTs > ps) done += (nowTs - ps) / (pe - ps);
    });
    return Math.round((done / activities.length) * 100);
  })();
  const overallActual = Math.round(activities.reduce((s, a) => s + a.actualProgress, 0) / activities.length);
  const scheduleVariance = overallActual - overallPlanned;

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Planned Progress', value: `${overallPlanned}%`, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Actual Progress', value: `${overallActual}%`, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Schedule Variance', value: `${scheduleVariance > 0 ? '+' : ''}${scheduleVariance}%`,
            color: scheduleVariance >= 0 ? 'text-green-600' : 'text-red-600',
            bg: scheduleVariance >= 0 ? 'bg-green-50' : 'bg-red-50' },
          { label: 'Delayed Activities', value: delayed.length.toString(), color: 'text-red-600', bg: 'bg-red-50' },
        ].map(k => (
          <div key={k.label} className={`card-sm ${k.bg}`}>
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* S-Curve */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">S-Curve — Planned vs Actual Progress</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={scurveData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="planGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: any) => `${v}%`} />
            <Legend />
            <Area type="monotone" dataKey="planned" name="Planned" stroke="#3b82f6" strokeWidth={2}
              fill="url(#planGrad)" strokeDasharray="5 3" dot={false} />
            <Area type="monotone" dataKey="actual" name="Actual" stroke="#10b981" strokeWidth={2.5}
              fill="url(#realGrad)" dot={false} connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Variance Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Variance Table by Activity</h3>
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>Ahead ({ahead.length})</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span>On track ({ontrack.length})</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>Delayed ({delayed.length})</span>
          </div>
        </div>
        <div className="table-container">
          <table className="table text-xs">
            <thead>
              <tr>
                <th>Activity</th>
                <th>Discipline</th>
                <th>Planned End</th>
                <th>% Planned</th>
                <th>% Actual</th>
                <th>Variance</th>
                <th>Est. Delay</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {varianceRows.sort((a, b) => a.variance - b.variance).map(r => (
                <tr key={r.id} className={r.variance < -10 ? 'bg-red-50/40' : r.variance > 10 ? 'bg-green-50/40' : ''}>
                  <td className="font-medium text-gray-900 max-w-[180px] truncate">{r.name}</td>
                  <td>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getDisciplineColor(r.discipline) }} />
                      {getDisciplineLabel(r.discipline)}
                    </span>
                  </td>
                  <td>{formatDate(r.plannedEnd)}</td>
                  <td className="text-blue-600 font-medium">{r.expectedPct}%</td>
                  <td className="text-gray-700 font-medium">{r.actualProgress}%</td>
                  <td>
                    <span className={`font-semibold ${r.variance > 0 ? 'text-green-600' : r.variance < -10 ? 'text-red-600' : 'text-gray-500'}`}>
                      {r.variance > 0 ? '+' : ''}{r.variance}%
                    </span>
                  </td>
                  <td className={r.delayDays > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                    {r.delayDays > 0 ? `~${r.delayDays}j` : '—'}
                  </td>
                  <td><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Milestones status */}
      {milestones.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Milestone Status</h3>
          <div className="grid grid-cols-2 gap-2">
            {milestones.map(m => {
              const isLate = m.status !== 'ACHIEVED' && new Date(m.plannedDate) < today;
              return (
                <div key={m.id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                  m.status === 'ACHIEVED' ? 'border-green-200 bg-green-50' :
                  isLate ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'
                }`}>
                  <Flag size={14} className={
                    m.status === 'ACHIEVED' ? 'text-green-500' :
                    isLate ? 'text-red-500' : 'text-amber-500'
                  } />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{m.name}</p>
                    <p className="text-xs text-gray-400">{formatDate(m.plannedDate)}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
