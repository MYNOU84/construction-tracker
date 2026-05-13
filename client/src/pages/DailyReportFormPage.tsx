import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { dailyReportsApi } from '../api/endpoints';
import { parseJSON, translatePosition } from '../utils/helpers';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { Plus, Trash2, Save, Send, ChevronDown, ChevronUp, Sun, Cloud, CloudRain, Wind } from 'lucide-react';

type Section = 'info' | 'manpower' | 'equipment' | 'materials' | 'tasks' | 'delays' | 'hse' | 'actions';

const DIRECT_POSITIONS = [
  'Site Manager',
  'Civil Engineer',
  'Electrical Engineer',
  'Mechanical Engineer',
  'Foreman',
  'Mason',
  'Steel Fixer',
  'Carpenter',
  'Formwork',
  'Electrician',
  'Plumber',
  'Crane Operator',
  'Welder',
  'Painter',
  'Tiler',
  'Driver',
  'Helper',
];

const INDIRECT_POSITIONS = [
  'Project Manager',
  'Construction Manager',
  'Technical Director',
  'HSE Manager',
  'Surveyor',
  'QS',
  'Storekeeper',
  'Accountant',
  'Secretary',
  'Security Guard',
];

const WEATHER_OPTIONS = [
  { value: 'SUNNY', label: 'Sunny', Icon: Sun, color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-400' },
  { value: 'CLOUDY', label: 'Cloudy', Icon: Cloud, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-400' },
  { value: 'RAINY', label: 'Rainy', Icon: CloudRain, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-400' },
  { value: 'WINDY', label: 'Windy', Icon: Wind, color: 'text-teal-500', bg: 'bg-teal-50 border-teal-400' },
];

const EQUIPMENT_STATUS = ['OPERATIONAL', 'IDLE', 'UNDER_MAINTENANCE', 'BREAKDOWN'];

const defaultHSE = {
  accidentsWithLTI: 0, accidentsWithLTIComment: '',
  accidentsWithoutLTI: 0, accidentsWithoutLTIComment: '',
  recruitmentMedicalCheckup: 0, recruitmentMedicalCheckupComment: '',
  periodicMedicalCheckup: 0, periodicMedicalCheckupComment: '',
  fireIncident: 0, fireIncidentComment: '',
  accidentWithMaterialDamage: 0, accidentWithMaterialDamageComment: '',
  safetyViolationNotice: 0, safetyViolationNoticeComment: '',
  safetyInductions: 0, safetyInductionsComment: '',
  toolboxTalks: 0, toolboxTalksComment: '',
  specificTraining: 0, specificTrainingComment: '',
  lostWorkingHours: 0,
  remarks: ['', '', ''],
  nearMisses: 0,
  subcontractingPct: 0,
};

const defaultManpower = [
  { position: 'Site Manager', type: 'DIRECT', company: '', np: 0, hours: 8 },
  { position: 'Mason', type: 'DIRECT', company: '', np: 0, hours: 8 },
  { position: 'Helper', type: 'DIRECT', company: '', np: 0, hours: 8 },
  { position: 'HSE Manager', type: 'INDIRECT', company: '', np: 0, hours: 8 },
];

export default function DailyReportFormPage() {
  const { projectId, reportId } = useParams<{ projectId: string; reportId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!reportId && reportId !== 'new';
  const [openSection, setOpenSection] = useState<Section>('info');

  const { data: existing, isLoading } = useQuery({
    queryKey: ['daily-report', projectId, reportId],
    queryFn: () => dailyReportsApi.get(projectId!, reportId!).then(r => r.data),
    enabled: isEdit,
  });

  const { register, control, handleSubmit, reset, watch, setValue } = useForm<any>({
    defaultValues: {
      reportDate: new Date().toISOString().split('T')[0],
      weather: 'SUNNY',
      temperature: 25,
      humidity: 50,
      windSpeed: 0,
      generalSummary: '',
      workCompleted: '',
      plannedWork: '',
      manpowerData: defaultManpower,
      equipmentData: [{ name: '', count: 1, hours: 8, status: 'OPERATIONAL' }],
      materialsData: [{ designation: '', unit: 'm³', qtyDelivered: 0, qtyExpected: 0, remarks: '' }],
      activitiesData: [{ lot: '', area: '', description: '', resources: '', unit: '', producedQty: 0, status: 'IN_PROGRESS' }],
      delays: [],
      hseData: defaultHSE,
      safetyNotes: '',
      pendingActions: [],
      inspections: [],
      status: 'DRAFT',
    },
  });

  const manpowerFields = useFieldArray({ control, name: 'manpowerData' });
  const equipmentFields = useFieldArray({ control, name: 'equipmentData' });
  const materialsFields = useFieldArray({ control, name: 'materialsData' });
  const tasksFields = useFieldArray({ control, name: 'activitiesData' });
  const delaysFields = useFieldArray({ control, name: 'delays' });
  const pendingFields = useFieldArray({ control, name: 'pendingActions' });
  const inspFields = useFieldArray({ control, name: 'inspections' });

  const weatherValue = watch('weather');
  const manpowerData = watch('manpowerData') || [];
  const directTotal = manpowerData.filter((m: any) => m.type !== 'INDIRECT').reduce((s: number, m: any) => s + (Number(m.np) || 0), 0);
  const indirectTotal = manpowerData.filter((m: any) => m.type === 'INDIRECT').reduce((s: number, m: any) => s + (Number(m.np) || 0), 0);

  useEffect(() => {
    if (existing) {
      reset({
        ...existing,
        reportDate: existing.reportDate.split('T')[0],
        manpowerData: parseJSON<any[]>(existing.manpowerData, defaultManpower).map((m: any) => ({
          ...m,
          position: translatePosition(m.position || m.trade || ''),
        })),
        equipmentData: parseJSON(existing.equipmentData, []),
        materialsData: parseJSON(existing.materialsData, []),
        activitiesData: parseJSON(existing.activitiesData, []),
        delays: parseJSON(existing.delays, []),
        pendingActions: parseJSON(existing.pendingActions, []),
        inspections: parseJSON(existing.inspections, []),
        hseData: parseJSON(existing.hseData, defaultHSE),
      });
    }
  }, [existing, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      isEdit
        ? dailyReportsApi.update(projectId!, reportId!, data)
        : dailyReportsApi.create(projectId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-reports', projectId] });
      navigate(`/projects/${projectId}/reports/daily`);
    },
  });

  const onSave = (data: any) => saveMutation.mutate({ ...data, status: 'DRAFT' });
  const onSubmit = (data: any) => saveMutation.mutate({ ...data, status: 'SUBMITTED' });

  if (isEdit && isLoading) return <PageLoader text="Loading report..." />;

  const toggle = (id: Section) => setOpenSection(openSection === id ? 'info' : id);

  const SectionHeader = ({ id, title, badge }: { id: Section; title: string; badge?: string }) => (
    <button type="button" onClick={() => toggle(id)}
      className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors text-left">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-gray-900">{title}</span>
        {badge && <span className="badge badge-blue text-xs">{badge}</span>}
      </div>
      {openSection === id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-4 fade-in">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Daily Report' : 'New Daily Site Report'}</h1>
          <p className="page-subtitle">Daily Site Report</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSubmit(onSave)} disabled={saveMutation.isPending} className="btn-secondary">
            <Save size={16} /> Save Draft
          </button>
          <button onClick={handleSubmit(onSubmit)} disabled={saveMutation.isPending} className="btn-primary">
            <Send size={16} /> {saveMutation.isPending ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>

      <form className="space-y-4">
        {/* ─── 1. Informations Générales ─── */}
        <div className="card space-y-4">
          <SectionHeader id="info" title="1. General Information" />
          {openSection === 'info' && (
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="label">Report Date *</label>
                  <input type="date" className="input" {...register('reportDate', { required: true })} />
                </div>
                <div>
                  <label className="label">Temperature (°C)</label>
                  <input type="number" className="input" {...register('temperature', { valueAsNumber: true })} />
                </div>
                <div>
                  <label className="label">Humidity (%)</label>
                  <input type="number" className="input" {...register('humidity', { valueAsNumber: true })} />
                </div>
                <div>
                  <label className="label">Wind (km/h)</label>
                  <input type="number" className="input" {...register('windSpeed', { valueAsNumber: true })} />
                </div>
              </div>

              {/* Weather Picker */}
              <div>
                <label className="label mb-2">Weather</label>
                <div className="flex gap-3 flex-wrap">
                  {WEATHER_OPTIONS.map(({ value, label, Icon, color, bg }) => (
                    <button key={value} type="button"
                      onClick={() => setValue('weather', value)}
                      className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 transition-all ${
                        weatherValue === value ? bg + ' shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}>
                      <Icon size={28} className={weatherValue === value ? color : 'text-gray-400'} />
                      <span className={`text-xs font-medium ${weatherValue === value ? 'text-gray-800' : 'text-gray-500'}`}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">General Summary</label>
                <textarea className="input" rows={3} placeholder="Brief overview of today's activities..."
                  {...register('generalSummary')} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Work Completed Today</label>
                  <textarea className="input" rows={2} placeholder="Work completed..." {...register('workCompleted')} />
                </div>
                <div>
                  <label className="label">Planned Work Tomorrow</label>
                  <textarea className="input" rows={2} placeholder="Planned work..." {...register('plannedWork')} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── 2. Main d'Oeuvre / Manpower ─── */}
        <div className="card space-y-3">
          <SectionHeader id="manpower" title="2. Manpower"
            badge={`${directTotal + indirectTotal} total — ${directTotal} direct / ${indirectTotal} indirect`} />
          {openSection === 'manpower' && (
            <div className="space-y-3 pt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary-700 text-white text-xs">
                    <th className="px-3 py-2 text-left w-8">SN</th>
                    <th className="px-3 py-2 text-left">Position</th>
                    <th className="px-3 py-2 text-center w-28">Type</th>
                    <th className="px-3 py-2 text-left">Company</th>
                    <th className="px-3 py-2 text-center w-16">N/P</th>
                    <th className="px-3 py-2 text-center w-16">Hours</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {manpowerFields.fields.map((field, i) => {
                    const rowType = watch(`manpowerData.${i}.type`);
                    return (
                      <tr key={field.id} className={`border-b border-gray-100 ${rowType === 'INDIRECT' ? 'bg-amber-50' : 'bg-white'}`}>
                        <td className="px-3 py-1.5 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-2 py-1">
                          <Controller control={control} name={`manpowerData.${i}.position`}
                            render={({ field: f }) => (
                              <input list={`pos-list-${i}`} className="input text-xs py-1" placeholder="Position" {...f} />
                            )} />
                          <datalist id={`pos-list-${i}`}>
                            {DIRECT_POSITIONS.map(p => <option key={p} value={p} />)}
                            {INDIRECT_POSITIONS.map(p => <option key={p} value={p} />)}
                          </datalist>
                        </td>
                        <td className="px-2 py-1">
                          <select className="input text-xs py-1" {...register(`manpowerData.${i}.type`)}>
                            <option value="DIRECT">Direct</option>
                            <option value="INDIRECT">Indirect</option>
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <input className="input text-xs py-1" placeholder="Company" {...register(`manpowerData.${i}.company`)} />
                        </td>
                        <td className="px-2 py-1">
                          <input type="number" className="input text-xs py-1 text-center" min={0} {...register(`manpowerData.${i}.np`, { valueAsNumber: true })} />
                        </td>
                        <td className="px-2 py-1">
                          <input type="number" className="input text-xs py-1 text-center" min={0} max={24} step={0.5}
                            {...register(`manpowerData.${i}.hours`, { valueAsNumber: true })} />
                        </td>
                        <td className="px-2 py-1">
                          <button type="button" onClick={() => manpowerFields.remove(i)} className="btn-danger btn-sm p-1">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-primary-700/10 font-semibold text-sm">
                    <td className="px-3 py-2" colSpan={4}><span className="text-primary-800">TOTAL</span></td>
                    <td className="px-3 py-2 text-center text-primary-900 font-bold">{directTotal + indirectTotal}</td>
                    <td className="px-3 py-2 text-center text-xs text-gray-500">
                      {directTotal}D / {indirectTotal}I
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
              <div className="flex gap-2 pt-1">
                <button type="button"
                  onClick={() => manpowerFields.append({ position: '', type: 'DIRECT', company: '', np: 0, hours: 8 })}
                  className="btn-secondary btn-sm">
                  <Plus size={13} /> Add Direct
                </button>
                <button type="button"
                  onClick={() => manpowerFields.append({ position: '', type: 'INDIRECT', company: '', np: 0, hours: 8 })}
                  className="btn-secondary btn-sm">
                  <Plus size={13} /> Add Indirect
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── 3. Matériel / Equipment ─── */}
        <div className="card space-y-3">
          <SectionHeader id="equipment" title="3. Equipment"
            badge={`${equipmentFields.fields.length} items`} />
          {openSection === 'equipment' && (
            <div className="space-y-3 pt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary-700 text-white text-xs">
                    <th className="px-3 py-2 text-left w-8">SN</th>
                    <th className="px-3 py-2 text-left">Equipment</th>
                    <th className="px-3 py-2 text-center w-16">Qty</th>
                    <th className="px-3 py-2 text-center w-20">Working Hours</th>
                    <th className="px-3 py-2 text-center w-36">Status</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {equipmentFields.fields.map((field, i) => (
                    <tr key={field.id} className="border-b border-gray-100">
                      <td className="px-3 py-1.5 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-2 py-1">
                        <input className="input text-xs py-1" placeholder="Ex: Concrete Mixer" {...register(`equipmentData.${i}.name`)} />
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" className="input text-xs py-1 text-center" min={1} {...register(`equipmentData.${i}.count`, { valueAsNumber: true })} />
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" className="input text-xs py-1 text-center" min={0} max={24} step={0.5}
                          {...register(`equipmentData.${i}.hours`, { valueAsNumber: true })} />
                      </td>
                      <td className="px-2 py-1">
                        <select className="input text-xs py-1" {...register(`equipmentData.${i}.status`)}>
                          {EQUIPMENT_STATUS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <button type="button" onClick={() => equipmentFields.remove(i)} className="btn-danger btn-sm p-1">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button"
                onClick={() => equipmentFields.append({ name: '', count: 1, hours: 8, status: 'OPERATIONAL' })}
                className="btn-secondary btn-sm">
                <Plus size={13} /> Add Equipment
              </button>
            </div>
          )}
        </div>

        {/* ─── 4. Matériaux / Materials ─── */}
        <div className="card space-y-3">
          <SectionHeader id="materials" title="4. Materials"
            badge={`${materialsFields.fields.length} items`} />
          {openSection === 'materials' && (
            <div className="space-y-3 pt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary-700 text-white text-xs">
                    <th className="px-3 py-2 text-left w-8">SN</th>
                    <th className="px-3 py-2 text-left">Material</th>
                    <th className="px-3 py-2 text-center w-16">Unit</th>
                    <th className="px-3 py-2 text-center w-24">QTY Delivered</th>
                    <th className="px-3 py-2 text-center w-24">QTY Expected</th>
                    <th className="px-3 py-2 text-left">Observations</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {materialsFields.fields.map((field, i) => (
                    <tr key={field.id} className="border-b border-gray-100">
                      <td className="px-3 py-1.5 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-2 py-1">
                        <input className="input text-xs py-1" placeholder="Ex: Cement" {...register(`materialsData.${i}.designation`)} />
                      </td>
                      <td className="px-2 py-1">
                        <input className="input text-xs py-1 text-center" placeholder="m³" {...register(`materialsData.${i}.unit`)} />
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" className="input text-xs py-1 text-center" min={0}
                          {...register(`materialsData.${i}.qtyDelivered`, { valueAsNumber: true })} />
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" className="input text-xs py-1 text-center" min={0}
                          {...register(`materialsData.${i}.qtyExpected`, { valueAsNumber: true })} />
                      </td>
                      <td className="px-2 py-1">
                        <input className="input text-xs py-1" placeholder="Remarks..." {...register(`materialsData.${i}.remarks`)} />
                      </td>
                      <td className="px-2 py-1">
                        <button type="button" onClick={() => materialsFields.remove(i)} className="btn-danger btn-sm p-1">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button"
                onClick={() => materialsFields.append({ designation: '', unit: 'm³', qtyDelivered: 0, qtyExpected: 0, remarks: '' })}
                className="btn-secondary btn-sm">
                <Plus size={13} /> Add Material
              </button>
            </div>
          )}
        </div>

        {/* ─── 5. Travaux Exécutés / Tasks Executed ─── */}
        <div className="card space-y-3">
          <SectionHeader id="tasks" title="5. Tasks Executed"
            badge={`${tasksFields.fields.length} tasks`} />
          {openSection === 'tasks' && (
            <div className="space-y-3 pt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary-700 text-white text-xs">
                    <th className="px-3 py-2 text-left w-8">SN</th>
                    <th className="px-3 py-2 text-center w-16">LOT</th>
                    <th className="px-3 py-2 text-left w-24">Area</th>
                    <th className="px-3 py-2 text-left">Task Description</th>
                    <th className="px-3 py-2 text-left w-28">Resources</th>
                    <th className="px-3 py-2 text-center w-16">Unit</th>
                    <th className="px-3 py-2 text-center w-20">QTY Produced</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {tasksFields.fields.map((field, i) => (
                    <tr key={field.id} className="border-b border-gray-100">
                      <td className="px-3 py-1.5 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-2 py-1">
                        <input className="input text-xs py-1 text-center" placeholder="01" {...register(`activitiesData.${i}.lot`)} />
                      </td>
                      <td className="px-2 py-1">
                        <input className="input text-xs py-1" placeholder="Zone A" {...register(`activitiesData.${i}.area`)} />
                      </td>
                      <td className="px-2 py-1">
                        <textarea className="input text-xs py-1" rows={1}
                          placeholder="Task description..."
                          {...register(`activitiesData.${i}.description`)} />
                      </td>
                      <td className="px-2 py-1">
                        <input className="input text-xs py-1" placeholder="Resources" {...register(`activitiesData.${i}.resources`)} />
                      </td>
                      <td className="px-2 py-1">
                        <input className="input text-xs py-1 text-center" placeholder="m³" {...register(`activitiesData.${i}.unit`)} />
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" className="input text-xs py-1 text-center" min={0}
                          {...register(`activitiesData.${i}.producedQty`, { valueAsNumber: true })} />
                      </td>
                      <td className="px-2 py-1">
                        <button type="button" onClick={() => tasksFields.remove(i)} className="btn-danger btn-sm p-1">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button"
                onClick={() => tasksFields.append({ lot: '', area: '', description: '', resources: '', unit: '', producedQty: 0 })}
                className="btn-secondary btn-sm">
                <Plus size={13} /> Add Task
              </button>
            </div>
          )}
        </div>

        {/* ─── 6. Retards & Problèmes / Delays & Issues ─── */}
        <div className="card space-y-3">
          <SectionHeader id="delays" title="6. Delays & Issues"
            badge={delaysFields.fields.length > 0 ? `${delaysFields.fields.length}` : undefined} />
          {openSection === 'delays' && (
            <div className="space-y-3 pt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-red-700 text-white text-xs">
                    <th className="px-3 py-2 text-left">Issue Description</th>
                    <th className="px-3 py-2 text-center w-24">Duration</th>
                    <th className="px-3 py-2 text-left w-32">Responsibility</th>
                    <th className="px-3 py-2 text-center w-24">Impact</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {delaysFields.fields.map((field, i) => (
                    <tr key={field.id} className="border-b border-gray-100">
                      <td className="px-2 py-1">
                        <textarea className="input text-xs py-1" rows={2} placeholder="Description..." {...register(`delays.${i}.description`)} />
                      </td>
                      <td className="px-2 py-1">
                        <input className="input text-xs py-1 text-center" placeholder="2h / 1 day" {...register(`delays.${i}.duration`)} />
                      </td>
                      <td className="px-2 py-1">
                        <input className="input text-xs py-1" placeholder="Contractor / Client..." {...register(`delays.${i}.responsibility`)} />
                      </td>
                      <td className="px-2 py-1">
                        <select className="input text-xs py-1" {...register(`delays.${i}.impact`)}>
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <button type="button" onClick={() => delaysFields.remove(i)} className="btn-danger btn-sm p-1">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button"
                onClick={() => delaysFields.append({ description: '', duration: '', responsibility: '', impact: 'MEDIUM' })}
                className="btn-secondary btn-sm">
                <Plus size={13} /> Add Delay
              </button>
            </div>
          )}
        </div>

        {/* ─── 7. HSE / Sécurité ─── */}
        <div className="card space-y-4">
          <SectionHeader id="hse" title="7. Health, Safety & Environment (HSE)" />
          {openSection === 'hse' && (
            <div className="space-y-5 pt-2">
              {/* HSE Table */}
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-red-600 text-white">
                      <th colSpan={3} className="text-center font-bold py-2 text-base tracking-wide">HSE</th>
                    </tr>
                    <tr className="bg-yellow-400 text-gray-900">
                      <th className="text-left px-3 py-2 font-bold w-1/2">Indicator</th>
                      <th className="text-center px-3 py-2 font-bold w-24">Numbers</th>
                      <th className="text-left px-3 py-2 font-bold">Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'accidentsWithLTI',          label: 'Accident with Lost Time Injury' },
                      { key: 'accidentsWithoutLTI',        label: 'Accident without Lost Time Injury' },
                      { key: 'recruitmentMedicalCheckup',  label: 'Recruitment medical check-up' },
                      { key: 'periodicMedicalCheckup',     label: 'Periodic medical check-up' },
                      { key: 'fireIncident',               label: 'Fire incident' },
                      { key: 'accidentWithMaterialDamage', label: 'Accident with material damage' },
                      { key: 'safetyViolationNotice',      label: 'Safety violation notice' },
                      null,
                      { key: 'safetyInductions',           label: 'Safety induction sessions' },
                      { key: 'toolboxTalks',               label: 'Safety tool box talk' },
                      { key: 'specificTraining',           label: 'Specific training' },
                    ].map((row, i) =>
                      row === null ? (
                        <tr key={`sep-${i}`}><td colSpan={3} className="py-1 bg-gray-50 border-t border-b border-gray-200" /></tr>
                      ) : (
                        <tr key={row.key} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-1.5 border-b border-gray-100 font-medium text-gray-800">{row.label}</td>
                          <td className="px-3 py-1.5 border-b border-gray-100">
                            <input type="number" min={0}
                              className="w-full text-center font-bold border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
                              {...register(`hseData.${row.key}`, { valueAsNumber: true })} />
                          </td>
                          <td className="px-3 py-1.5 border-b border-gray-100">
                            <input type="text" placeholder="Comment..."
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
                              {...register(`hseData.${row.key}Comment`)} />
                          </td>
                        </tr>
                      )
                    )}
                    <tr className="bg-yellow-50 border-t-2 border-yellow-400">
                      <td colSpan={3} className="px-3 py-2 font-bold text-gray-800 text-center">
                        Lost Of Working Hours:&nbsp;
                        <input type="number" min={0}
                          className="inline-block w-20 text-center font-bold border-b-2 border-gray-400 bg-transparent focus:outline-none focus:border-blue-500 text-sm"
                          {...register('hseData.lostWorkingHours', { valueAsNumber: true })} />
                        &nbsp;H
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Remarks */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 text-center font-bold py-2 text-gray-800 border-b border-gray-200 text-base">Remarks</div>
                <table className="w-full text-sm">
                  <tbody>
                    {[0, 1, 2].map(i => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 border-b border-gray-100 font-bold text-gray-500 w-10">{String(i + 1).padStart(2, '0')}</td>
                        <td className="px-3 py-2 border-b border-gray-100">
                          <input type="text" placeholder={`Remark ${i + 1}...`}
                            className="w-full border-0 bg-transparent focus:outline-none text-sm"
                            {...register(`hseData.remarks.${i}`)} />
                        </td>
                      </tr>
                    ))}
                    {[3, 4, 5].map(i => (
                      <tr key={i} className="bg-white">
                        <td className="px-3 py-2 border-b border-gray-100 w-10"></td>
                        <td className="px-3 py-2 border-b border-gray-100">
                          <input type="text" placeholder=""
                            className="w-full border-0 bg-transparent focus:outline-none text-sm"
                            {...register(`hseData.remarks.${i}`)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="label">Safety Notes & Observations</label>
                <textarea className="input" rows={2}
                  placeholder="HSE observations, PPE compliance, hazard identification..."
                  {...register('safetyNotes')} />
              </div>
            </div>
          )}
        </div>

        {/* ─── 8. Constats & Actions / Inspections & Pending Actions ─── */}
        <div className="card space-y-3">
          <SectionHeader id="actions" title="8. Inspections & Pending Actions"
            badge={`${inspFields.fields.length + pendingFields.fields.length}`} />
          {openSection === 'actions' && (
            <div className="space-y-5 pt-2">
              {/* Inspections */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Inspections & Controls</p>
                {inspFields.fields.map((field, i) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-center mb-2">
                    <input className="input col-span-5 text-sm" placeholder="Inspection description" {...register(`inspections.${i}.description`)} />
                    <select className="input col-span-3 text-sm" {...register(`inspections.${i}.result`)}>
                      <option value="PASS">Pass</option>
                      <option value="FAIL">Fail</option>
                      <option value="CONDITIONAL">Conditional</option>
                    </select>
                    <input className="input col-span-3 text-sm" placeholder="Inspector" {...register(`inspections.${i}.inspector`)} />
                    <button type="button" onClick={() => inspFields.remove(i)} className="btn-danger btn-sm col-span-1 p-1"><Trash2 size={13} /></button>
                  </div>
                ))}
                <button type="button" onClick={() => inspFields.append({ description: '', result: 'PASS', inspector: '' })} className="btn-secondary btn-sm">
                  <Plus size={13} /> Add Inspection
                </button>
              </div>

              {/* Pending Actions */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Pending Actions</p>
                {pendingFields.fields.map((field, i) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-center mb-2">
                    <input className="input col-span-5 text-sm" placeholder="Required action" {...register(`pendingActions.${i}.action`)} />
                    <input className="input col-span-3 text-sm" placeholder="Responsible" {...register(`pendingActions.${i}.responsible`)} />
                    <input type="date" className="input col-span-3 text-sm" {...register(`pendingActions.${i}.dueDate`)} />
                    <button type="button" onClick={() => pendingFields.remove(i)} className="btn-danger btn-sm col-span-1 p-1"><Trash2 size={13} /></button>
                  </div>
                ))}
                <button type="button" onClick={() => pendingFields.append({ action: '', responsible: '', dueDate: '' })} className="btn-secondary btn-sm">
                  <Plus size={13} /> Add Action
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-end gap-3 pb-6">
          <button type="button" onClick={() => navigate(`/projects/${projectId}/reports/daily`)} className="btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit(onSave)} disabled={saveMutation.isPending} className="btn-secondary">
            <Save size={16} /> Save Draft
          </button>
          <button type="button" onClick={handleSubmit(onSubmit)} disabled={saveMutation.isPending} className="btn-primary">
            <Send size={16} /> {saveMutation.isPending ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </div>
  );
}
