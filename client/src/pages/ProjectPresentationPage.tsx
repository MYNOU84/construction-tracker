import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../api/endpoints';
import { formatDate, formatCurrency } from '../utils/helpers';
import { PageLoader } from '../components/ui/LoadingSpinner';
import ProgressBar from '../components/ui/ProgressBar';
import { exportPresentationPDF } from '../utils/exportPresentation';
import {
  FileDown, Plus, Trash2, Save, Building2, Users, MapPin,
  Layers, DollarSign, FileText, BarChart2, CheckCircle2, Clock, XCircle, AlertCircle
} from 'lucide-react';
import type {
  ProjectPresentationData, ZoneEntry, IntervanantsRow,
  BillingEntry, WeightingEntry, PlanEntry
} from '../types';

const newId = () => Math.random().toString(36).slice(2);

const DEFAULT_DATA: ProjectPresentationData = {
  surface: '', floors: '', totalLots: '', structureType: '', generalDescription: '',
  intervenants: [], zones: [], billing: [], weighting: [], plans: [],
};

const TABS = [
  { id: 'cover',        label: 'Cover',        icon: Building2 },
  { id: 'intervenants', label: 'Stakeholders',  icon: Users     },
  { id: 'zones',        label: 'Zones & Levels', icon: Layers   },
  { id: 'billing',      label: 'Billing',       icon: DollarSign},
  { id: 'weighting',    label: 'Weighting',     icon: BarChart2 },
  { id: 'plans',        label: 'Plans',         icon: FileText  },
];

const APPROVAL_CFG: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: 'Draft',     color: 'var(--text-3)' },
  SUBMITTED: { label: 'Submitted', color: 'var(--amber)'  },
  APPROVED:  { label: 'Approved',  color: 'var(--green)'  },
  REJECTED:  { label: 'Rejected',  color: 'var(--red)'    },
};
const BILLING_CFG: Record<string, { label: string; color: string }> = {
  PENDING:  { label: 'Pending',   color: 'var(--amber)' },
  PAID:     { label: 'Paid',      color: 'var(--green)' },
  LATE:     { label: 'Overdue',   color: 'var(--red)'   },
  DISPUTED: { label: 'Disputed',  color: 'var(--violet)'},
};
const PLAN_CFG: Record<string, { label: string; color: string }> = {
  DRAFT:      { label: 'Draft',      color: 'var(--text-3)' },
  ISSUED:     { label: 'Issued',     color: 'var(--cyan)'   },
  APPROVED:   { label: 'Approved',   color: 'var(--green)'  },
  FOR_INFO:   { label: 'For Info',   color: 'var(--amber)'  },
  SUPERSEDED: { label: 'Superseded', color: 'var(--red)'    },
};

export default function ProjectPresentationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState('cover');
  const [data, setData] = useState<ProjectPresentationData>(DEFAULT_DATA);
  const [saved, setSaved] = useState(true);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!).then(r => r.data),
    enabled: !!projectId,
  });

  useEffect(() => {
    if (project?.presentationData) {
      try { setData({ ...DEFAULT_DATA, ...JSON.parse(project.presentationData) }); }
      catch { setData(DEFAULT_DATA); }
    }
  }, [project?.presentationData]);

  const saveMutation = useMutation({
    mutationFn: (d: ProjectPresentationData) =>
      projectsApi.update(projectId!, { presentationData: JSON.stringify(d) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', projectId] }); setSaved(true); },
  });

  const update = useCallback((patch: Partial<ProjectPresentationData>) => {
    setData(prev => { const next = { ...prev, ...patch }; setSaved(false); return next; });
  }, []);

  const save = () => saveMutation.mutate(data);

  if (isLoading || !project) return <PageLoader text="Loading presentation..." />;

  const totalBilledAmt  = data.billing.reduce((s, b) => s + (b.amount || 0), 0);
  const totalPaidAmt    = data.billing.filter(b => b.status === 'PAID').reduce((s, b) => s + (b.amount || 0), 0);
  const weightedProg    = data.weighting.reduce((s, w) => s + (w.weighting / 100) * (w.progress / 100), 0) * 100;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Project Presentation</h1>
          <p className="page-subtitle">{project.name} — {project.code}</p>
        </div>
        <div className="flex gap-2">
          {!saved && (
            <button onClick={save} disabled={saveMutation.isPending} className="btn-primary">
              <Save size={15} />{saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          )}
          {saved && <span className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg" style={{ color: 'var(--green)', background: 'rgba(0,214,143,0.1)', border: '1px solid rgba(0,214,143,0.2)' }}><CheckCircle2 size={13} /> Saved</span>}
          <button onClick={() => exportPresentationPDF(project, data)} className="btn-secondary">
            <FileDown size={15} /> Export PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200"
            style={tab === t.id
              ? { background: 'rgba(0,212,255,0.12)', color: 'var(--cyan)', border: '1px solid rgba(0,212,255,0.25)' }
              : { color: 'var(--text-3)', border: '1px solid transparent' }}>
            <t.icon size={13} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ─── TAB: COUVERTURE ─── */}
      {tab === 'cover' && (
        <div className="space-y-5">
          {/* Cover preview card */}
          <div className="card relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d1428 0%, #111c3a 100%)', border: '1px solid var(--border-neon)', minHeight: 220 }}>
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, var(--cyan), var(--violet))' }} />
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--cyan), var(--violet))', boxShadow: '0 0 24px rgba(0,212,255,0.4)' }}>
                <Building2 size={28} className="text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-0.5" style={{ color: 'var(--text-1)' }}>{project.name}</h2>
                <p className="text-sm mb-3" style={{ color: 'var(--cyan)' }}>{project.code}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {[
                    { l: 'Client', v: project.client },
                    { l: 'Location', v: project.location },
                    { l: 'Start Date', v: formatDate(project.startDate) },
                    { l: 'End Date', v: formatDate(project.endDate) },
                  ].map(({ l, v }) => (
                    <div key={l}>
                      <p style={{ color: 'var(--text-3)' }}>{l}</p>
                      <p className="font-semibold mt-0.5" style={{ color: 'var(--text-1)' }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-3xl font-bold" style={{ color: 'var(--cyan)' }}>{project.progress}%</div>
                <div className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>Progress</div>
                <ProgressBar value={project.progress} size="sm" className="w-24" />
              </div>
            </div>
          </div>

          {/* Editable info grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card space-y-4">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--cyan)' }}>General Characteristics</h3>
              {[
                { label: 'Total Area (m²)', key: 'surface' as const, placeholder: 'e.g. 12,500 m²' },
                { label: 'Number of Floors', key: 'floors' as const, placeholder: 'e.g. G+5 + B2' },
                { label: 'Number of Lots', key: 'totalLots' as const, placeholder: 'e.g. G+5, B2...' },
                { label: 'Structure Type', key: 'structureType' as const, placeholder: 'e.g. Reinforced concrete, Steel...' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input className="input" placeholder={placeholder} value={data[key]}
                    onChange={e => update({ [key]: e.target.value })} />
                </div>
              ))}
            </div>
            <div className="card">
              <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--cyan)' }}>General Description</h3>
              <textarea className="input" rows={8}
                placeholder="General project description, objectives, context..."
                value={data.generalDescription}
                onChange={e => update({ generalDescription: e.target.value })} />
            </div>
          </div>

          {/* KPIs from existing data */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Daily Reports', value: project._count?.dailyReports ?? 0, color: 'var(--cyan)'   },
              { label: 'Budget',        value: project.budget ? formatCurrency(project.budget, project.currency) : '—', color: 'var(--green)'  },
              { label: 'Open Risks',    value: project._count?.ncrs ?? 0,         color: 'var(--amber)'  },
              { label: 'Documents',            value: project._count?.documents ?? 0,    color: 'var(--violet)' },
            ].map(k => (
              <div key={k.label} className="card-sm text-center">
                <div className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB: INTERVENANTS ─── */}
      {tab === 'intervenants' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>Stakeholders Table</h3>
            <button className="btn-primary btn-sm" onClick={() => update({
              intervenants: [...data.intervenants, { id: newId(), role: '', company: '', contact: '', phone: '', email: '' }]
            })}><Plus size={13} /> Add</button>
          </div>
          <div className="table-container">
            <table className="table">
              <thead><tr>
                <th>Role / Function</th><th>Company / Organization</th>
                <th>Representative</th><th>Phone</th><th>Email</th><th></th>
              </tr></thead>
              <tbody>
                {data.intervenants.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--text-3)' }}>No stakeholders — click Add to get started</td></tr>
                )}
                {data.intervenants.map((row, i) => (
                  <tr key={row.id}>
                    {(['role','company','contact','phone','email'] as (keyof IntervanantsRow)[]).map(f => (
                      <td key={f}><input className="input" style={{ padding: '4px 8px', fontSize: 12 }}
                        placeholder={f === 'role' ? 'Client / Owner...' : f === 'email' ? 'email@...' : ''}
                        value={row[f] as string}
                        onChange={e => {
                          const rows = [...data.intervenants];
                          rows[i] = { ...rows[i], [f]: e.target.value };
                          update({ intervenants: rows });
                        }} /></td>
                    ))}
                    <td><button onClick={() => update({ intervenants: data.intervenants.filter((_, j) => j !== i) })}
                      className="btn-danger btn-sm p-1"><Trash2 size={12} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB: ZONES & NIVEAUX ─── */}
      {tab === 'zones' && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>Zones & Levels Breakdown</h3>
              <button className="btn-primary btn-sm" onClick={() => update({
                zones: [...data.zones, { id: newId(), zone: '', description: '', surface: '', level: '', progress: 0 }]
              })}><Plus size={13} /> Zone</button>
            </div>
            <div className="table-container">
              <table className="table">
                <thead><tr>
                  <th>Zone / Lot</th><th>Description</th><th>Surface (m²)</th>
                  <th>Level</th><th style={{ width: 180 }}>Progress</th><th></th>
                </tr></thead>
                <tbody>
                  {data.zones.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--text-3)' }}>No zones defined</td></tr>
                  )}
                  {data.zones.map((z, i) => (
                    <tr key={z.id}>
                      <td><input className="input" style={{ padding: '4px 8px', fontSize: 12 }} placeholder="Zone A" value={z.zone}
                        onChange={e => { const arr = [...data.zones]; arr[i] = { ...arr[i], zone: e.target.value }; update({ zones: arr }); }} /></td>
                      <td><input className="input" style={{ padding: '4px 8px', fontSize: 12 }} placeholder="Description" value={z.description}
                        onChange={e => { const arr = [...data.zones]; arr[i] = { ...arr[i], description: e.target.value }; update({ zones: arr }); }} /></td>
                      <td><input className="input" style={{ padding: '4px 8px', fontSize: 12 }} placeholder="1200" value={z.surface}
                        onChange={e => { const arr = [...data.zones]; arr[i] = { ...arr[i], surface: e.target.value }; update({ zones: arr }); }} /></td>
                      <td><input className="input" style={{ padding: '4px 8px', fontSize: 12 }} placeholder="RDC, R+1..." value={z.level}
                        onChange={e => { const arr = [...data.zones]; arr[i] = { ...arr[i], level: e.target.value }; update({ zones: arr }); }} /></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <input type="range" min={0} max={100} value={z.progress} className="flex-1" style={{ accentColor: 'var(--cyan)' }}
                            onChange={e => { const arr = [...data.zones]; arr[i] = { ...arr[i], progress: +e.target.value }; update({ zones: arr }); }} />
                          <span className="text-xs font-bold w-8 text-right" style={{ color: 'var(--cyan)' }}>{z.progress}%</span>
                        </div>
                        <ProgressBar value={z.progress} size="sm" className="mt-1" />
                      </td>
                      <td><button onClick={() => update({ zones: data.zones.filter((_, j) => j !== i) })}
                        className="btn-danger btn-sm p-1"><Trash2 size={12} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {data.zones.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card-sm text-center" style={{ gridColumn: '1' }}>
                <div className="text-2xl font-bold" style={{ color: 'var(--cyan)' }}>{data.zones.length}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Defined Zones</div>
              </div>
              <div className="card-sm text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--green)' }}>
                  {Math.round(data.zones.reduce((s, z) => s + z.progress, 0) / data.zones.length)}%
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Average Progress</div>
              </div>
              <div className="card-sm text-center">
                <div className="text-lg font-bold" style={{ color: 'var(--violet)' }}>
                  {data.zones.filter(z => z.surface).reduce((s, z) => s + (parseFloat(z.surface) || 0), 0).toLocaleString()} m²
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Total Calculated Area</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: FACTURATION ─── */}
      {tab === 'billing' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Billed', value: formatCurrency(totalBilledAmt, project.currency), color: 'var(--cyan)' },
              { label: 'Total Paid',   value: formatCurrency(totalPaidAmt,   project.currency), color: 'var(--green)' },
              { label: 'Pending',      value: formatCurrency(totalBilledAmt - totalPaidAmt, project.currency), color: 'var(--amber)' },
            ].map(k => (
              <div key={k.label} className="card-sm text-center">
                <div className="text-xl font-bold" style={{ color: k.color }}>{k.value}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{k.label}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>Billing Statements</h3>
              <button className="btn-primary btn-sm" onClick={() => update({
                billing: [...data.billing, { id: newId(), number: `S${String(data.billing.length + 1).padStart(2,'0')}`, description: '', amount: 0, dateIssued: '', delayDays: 30, datePaid: '', status: 'PENDING' }]
              })}><Plus size={13} /> Statement</button>
            </div>
            <div className="table-container">
              <table className="table">
                <thead><tr>
                  <th>Statement #</th><th>Description</th><th>Amount (excl. tax)</th>
                  <th>Issue Date</th><th>Delay (days)</th><th>Payment Date</th><th>Status</th><th></th>
                </tr></thead>
                <tbody>
                  {data.billing.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8" style={{ color: 'var(--text-3)' }}>No payment statements</td></tr>
                  )}
                  {data.billing.map((b, i) => {
                    const cfg = BILLING_CFG[b.status];
                    const upd = (patch: Partial<BillingEntry>) => {
                      const arr = [...data.billing]; arr[i] = { ...arr[i], ...patch }; update({ billing: arr });
                    };
                    return (
                      <tr key={b.id}>
                        <td><input className="input" style={{ padding: '4px 8px', fontSize: 12, width: 70 }} value={b.number} onChange={e => upd({ number: e.target.value })} /></td>
                        <td><input className="input" style={{ padding: '4px 8px', fontSize: 12 }} value={b.description} onChange={e => upd({ description: e.target.value })} /></td>
                        <td><input type="number" className="input" style={{ padding: '4px 8px', fontSize: 12, width: 100 }} value={b.amount || ''} onChange={e => upd({ amount: +e.target.value })} /></td>
                        <td><input type="date" className="input" style={{ padding: '4px 8px', fontSize: 12, width: 130 }} value={b.dateIssued} onChange={e => upd({ dateIssued: e.target.value })} /></td>
                        <td><input type="number" className="input" style={{ padding: '4px 8px', fontSize: 12, width: 60 }} value={b.delayDays || ''} onChange={e => upd({ delayDays: +e.target.value })} /></td>
                        <td><input type="date" className="input" style={{ padding: '4px 8px', fontSize: 12, width: 130 }} value={b.datePaid} onChange={e => upd({ datePaid: e.target.value })} /></td>
                        <td>
                          <select className="input" style={{ padding: '4px 8px', fontSize: 11, color: cfg.color, width: 110 }} value={b.status} onChange={e => upd({ status: e.target.value as BillingEntry['status'] })}>
                            {Object.entries(BILLING_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </td>
                        <td><button onClick={() => update({ billing: data.billing.filter((_, j) => j !== i) })} className="btn-danger btn-sm p-1"><Trash2 size={12} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: PONDÉRATION ─── */}
      {tab === 'weighting' && (
        <div className="space-y-4">
          {data.weighting.length > 0 && (
            <div className="card-sm flex items-center gap-4">
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Weighted Overall Progress</div>
                <ProgressBar value={weightedProg} size="lg" />
              </div>
              <div className="text-2xl font-bold flex-shrink-0" style={{ color: 'var(--cyan)' }}>{weightedProg.toFixed(1)}%</div>
            </div>
          )}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>Weighting & Approval Status</h3>
              <button className="btn-primary btn-sm" onClick={() => update({
                weighting: [...data.weighting, { id: newId(), lot: '', description: '', weighting: 0, progress: 0, sendRef: '', sendDate: '', approvalRef: '', approvalDate: '', approvalStatus: 'DRAFT' }]
              })}><Plus size={13} /> Lot</button>
            </div>
            <div className="table-container overflow-x-auto">
              <table className="table" style={{ minWidth: 900 }}>
                <thead><tr>
                  <th>Lot #</th><th>Description</th><th>Weight %</th><th>Progress %</th>
                  <th>Weighted Prog.</th><th>Submission #</th><th>Submission Date</th>
                  <th>Approval #</th><th>Approval Date</th><th>Status</th><th></th>
                </tr></thead>
                <tbody>
                  {data.weighting.length === 0 && (
                    <tr><td colSpan={11} className="text-center py-8" style={{ color: 'var(--text-3)' }}>No lots — click Add to get started</td></tr>
                  )}
                  {data.weighting.map((w, i) => {
                    const cfg = APPROVAL_CFG[w.approvalStatus];
                    const weightedVal = ((w.weighting / 100) * (w.progress / 100) * 100).toFixed(1);
                    const upd = (patch: Partial<WeightingEntry>) => {
                      const arr = [...data.weighting]; arr[i] = { ...arr[i], ...patch }; update({ weighting: arr });
                    };
                    return (
                      <tr key={w.id}>
                        <td><input className="input" style={{ padding: '4px 8px', fontSize: 12, width: 60 }} value={w.lot} onChange={e => upd({ lot: e.target.value })} /></td>
                        <td><input className="input" style={{ padding: '4px 8px', fontSize: 12 }} value={w.description} onChange={e => upd({ description: e.target.value })} /></td>
                        <td><input type="number" min={0} max={100} className="input" style={{ padding: '4px 8px', fontSize: 12, width: 60 }} value={w.weighting || ''} onChange={e => upd({ weighting: +e.target.value })} /></td>
                        <td>
                          <div className="flex items-center gap-1">
                            <input type="number" min={0} max={100} className="input" style={{ padding: '4px 8px', fontSize: 12, width: 55 }} value={w.progress || ''} onChange={e => upd({ progress: +e.target.value })} />
                          </div>
                        </td>
                        <td className="text-center font-bold text-xs" style={{ color: 'var(--cyan)' }}>{weightedVal}%</td>
                        <td><input className="input" style={{ padding: '4px 8px', fontSize: 12, width: 80 }} value={w.sendRef} onChange={e => upd({ sendRef: e.target.value })} /></td>
                        <td><input type="date" className="input" style={{ padding: '4px 8px', fontSize: 12, width: 120 }} value={w.sendDate} onChange={e => upd({ sendDate: e.target.value })} /></td>
                        <td><input className="input" style={{ padding: '4px 8px', fontSize: 12, width: 80 }} value={w.approvalRef} onChange={e => upd({ approvalRef: e.target.value })} /></td>
                        <td><input type="date" className="input" style={{ padding: '4px 8px', fontSize: 12, width: 120 }} value={w.approvalDate} onChange={e => upd({ approvalDate: e.target.value })} /></td>
                        <td>
                          <select className="input" style={{ padding: '4px 8px', fontSize: 11, color: cfg.color, width: 100 }} value={w.approvalStatus} onChange={e => upd({ approvalStatus: e.target.value as WeightingEntry['approvalStatus'] })}>
                            {Object.entries(APPROVAL_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </td>
                        <td><button onClick={() => update({ weighting: data.weighting.filter((_, j) => j !== i) })} className="btn-danger btn-sm p-1"><Trash2 size={12} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: PLANS ─── */}
      {tab === 'plans' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>Transmitted Plans Register</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{data.plans.length} plan(s) registered</p>
            </div>
            <button className="btn-primary btn-sm" onClick={() => update({
              plans: [...data.plans, { id: newId(), number: '', title: '', revision: 'A', format: 'A1', issuedBy: '', date: '', status: 'DRAFT', remarks: '' }]
            })}><Plus size={13} /> Plan</button>
          </div>
          <div className="table-container overflow-x-auto">
            <table className="table" style={{ minWidth: 850 }}>
              <thead><tr>
                <th>Plan #</th><th>Title / Description</th><th>Revision</th>
                <th>Format</th><th>Issued By</th><th>Date</th><th>Status</th><th>Remarks</th><th></th>
              </tr></thead>
              <tbody>
                {data.plans.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-8" style={{ color: 'var(--text-3)' }}>No plans registered</td></tr>
                )}
                {data.plans.map((p, i) => {
                  const cfg = PLAN_CFG[p.status];
                  const upd = (patch: Partial<PlanEntry>) => {
                    const arr = [...data.plans]; arr[i] = { ...arr[i], ...patch }; update({ plans: arr });
                  };
                  return (
                    <tr key={p.id}>
                      <td><input className="input" style={{ padding: '4px 8px', fontSize: 12, width: 90 }} placeholder="ARC-001" value={p.number} onChange={e => upd({ number: e.target.value })} /></td>
                      <td><input className="input" style={{ padding: '4px 8px', fontSize: 12 }} placeholder="Site plan..." value={p.title} onChange={e => upd({ title: e.target.value })} /></td>
                      <td><input className="input" style={{ padding: '4px 8px', fontSize: 12, width: 55 }} value={p.revision} onChange={e => upd({ revision: e.target.value })} /></td>
                      <td>
                        <select className="input" style={{ padding: '4px 8px', fontSize: 12, width: 65 }} value={p.format} onChange={e => upd({ format: e.target.value })}>
                          {['A0','A1','A2','A3','A4'].map(f => <option key={f}>{f}</option>)}
                        </select>
                      </td>
                      <td><input className="input" style={{ padding: '4px 8px', fontSize: 12, width: 100 }} value={p.issuedBy} onChange={e => upd({ issuedBy: e.target.value })} /></td>
                      <td><input type="date" className="input" style={{ padding: '4px 8px', fontSize: 12, width: 120 }} value={p.date} onChange={e => upd({ date: e.target.value })} /></td>
                      <td>
                        <select className="input" style={{ padding: '4px 8px', fontSize: 11, color: cfg.color, width: 105 }} value={p.status} onChange={e => upd({ status: e.target.value as PlanEntry['status'] })}>
                          {Object.entries(PLAN_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </td>
                      <td><input className="input" style={{ padding: '4px 8px', fontSize: 12 }} value={p.remarks} onChange={e => upd({ remarks: e.target.value })} /></td>
                      <td><button onClick={() => update({ plans: data.plans.filter((_, j) => j !== i) })} className="btn-danger btn-sm p-1"><Trash2 size={12} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
