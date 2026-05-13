import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { risksApi, ncrsApi } from '../api/endpoints';
import { formatDate, getStatusColor, getStatusLabel, getRiskLevel, RISK_CATEGORIES, getDisciplineLabel } from '../utils/helpers';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { PageLoader } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { Plus, Shield, AlertTriangle, Edit2, Trash2 } from 'lucide-react';
import type { Risk, NCR } from '../types';

const RISK_COLORS: Record<string, string> = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e' };

export default function RisksPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'risks' | 'ncr'>('risks');
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [showNCRModal, setShowNCRModal] = useState(false);
  const [editRisk, setEditRisk] = useState<Risk | null>(null);

  const { data: risks = [], isLoading: loadRisks } = useQuery({
    queryKey: ['risks', projectId],
    queryFn: () => risksApi.list(projectId!).then(r => r.data),
    enabled: !!projectId,
  });

  const { data: ncrs = [], isLoading: loadNCRs } = useQuery({
    queryKey: ['ncrs', projectId],
    queryFn: () => ncrsApi.list(projectId!).then(r => r.data),
    enabled: !!projectId,
  });

  const { register: regR, handleSubmit: handleR, reset: resetR, setValue: setRVal } = useForm<any>({ defaultValues: { probability: 3, impact: 3 } });
  const { register: regN, handleSubmit: handleN, reset: resetN } = useForm<any>();

  const createRisk = useMutation({
    mutationFn: (data: any) => editRisk ? risksApi.update(projectId!, editRisk.id, data) : risksApi.create(projectId!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risks', projectId] }); setShowRiskModal(false); resetR(); setEditRisk(null); },
  });

  const updateRisk = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => risksApi.update(projectId!, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks', projectId] }),
  });

  const createNCR = useMutation({
    mutationFn: (data: any) => ncrsApi.create(projectId!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ncrs', projectId] }); setShowNCRModal(false); resetN(); },
  });

  const openEditRisk = (r: Risk) => {
    setEditRisk(r);
    setRVal('title', r.title);
    setRVal('description', r.description);
    setRVal('category', r.category);
    setRVal('probability', r.probability);
    setRVal('impact', r.impact);
    setRVal('status', r.status);
    setRVal('mitigation', r.mitigation || '');
    setRVal('owner', r.owner || '');
    setShowRiskModal(true);
  };

  if (loadRisks || loadNCRs) return <PageLoader text="Loading risks & NCRs..." />;

  const scatterData = risks.map(r => ({
    x: r.probability, y: r.impact, name: r.title, level: getRiskLevel(r.riskScore), id: r.id,
  }));

  return (
    <div className="space-y-6 fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Risks & NCRs</h1>
          <p className="page-subtitle">Risk register and non-conformance reports</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowNCRModal(true); resetN(); }} className="btn-secondary">
            <AlertTriangle size={16} /> New NCR
          </button>
          <button onClick={() => { setEditRisk(null); resetR(); setShowRiskModal(true); }} className="btn-primary">
            <Plus size={16} /> New Risk
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Risks', value: risks.length, color: 'text-gray-700' },
          { label: 'Critical/High', value: risks.filter(r => r.riskScore >= 10).length, color: 'text-red-600' },
          { label: 'Open NCRs', value: ncrs.filter(n => n.status === 'OPEN').length, color: 'text-orange-600' },
          { label: 'Closed NCRs', value: ncrs.filter(n => n.status === 'CLOSED').length, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="card-sm text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[{ id: 'risks', label: `Risk Register (${risks.length})` }, { id: 'ncr', label: `NCR Log (${ncrs.length})` }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Risks Tab */}
      {tab === 'risks' && (
        <div className="space-y-4">
          {/* Risk Matrix */}
          {risks.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Risk Matrix (Probability vs Impact)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <ScatterChart margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
                  <CartesianGrid />
                  <XAxis type="number" dataKey="x" name="Probability" domain={[0, 6]} label={{ value: 'Probability', position: 'bottom' }} tick={{ fontSize: 11 }} />
                  <YAxis type="number" dataKey="y" name="Impact" domain={[0, 6]} label={{ value: 'Impact', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                    if (!payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white p-2 border rounded shadow text-xs">
                        <p className="font-medium">{d.name}</p>
                        <p>Probability: {d.x} · Impact: {d.y}</p>
                        <p className={`font-bold ${RISK_COLORS[d.level] ? 'text-red-500' : 'text-gray-700'}`}>Risk: {d.level}</p>
                      </div>
                    );
                  }} />
                  <Scatter data={scatterData} fill="#3b82f6">
                    {scatterData.map((entry, i) => (
                      <Cell key={i} fill={RISK_COLORS[entry.level] || '#6b7280'} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Risk Table */}
          {risks.length === 0 ? (
            <EmptyState icon={Shield} title="No risks registered" description="Document project risks for tracking and mitigation" />
          ) : (
            <div className="card">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Risk Title</th>
                      <th>Category</th>
                      <th>P</th>
                      <th>I</th>
                      <th>Score</th>
                      <th>Level</th>
                      <th>Status</th>
                      <th>Owner</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {risks.map(r => {
                      const level = getRiskLevel(r.riskScore);
                      return (
                        <tr key={r.id}>
                          <td>
                            <div>
                              <p className="font-medium text-gray-900">{r.title}</p>
                              <p className="text-xs text-gray-400 max-w-xs truncate">{r.description}</p>
                            </div>
                          </td>
                          <td><span className="badge badge-gray">{r.category}</span></td>
                          <td className="text-center font-bold">{r.probability}</td>
                          <td className="text-center font-bold">{r.impact}</td>
                          <td className="text-center">
                            <span className={`badge ${level === 'CRITICAL' ? 'badge-red' : level === 'HIGH' ? 'badge-orange' : level === 'MEDIUM' ? 'badge-yellow' : 'badge-green'}`}>
                              {r.riskScore}
                            </span>
                          </td>
                          <td><span className={`badge ${level === 'CRITICAL' ? 'badge-red' : level === 'HIGH' ? 'badge-orange' : level === 'MEDIUM' ? 'badge-yellow' : 'badge-green'}`}>{level}</span></td>
                          <td><StatusBadge status={r.status} /></td>
                          <td className="text-xs text-gray-500">{r.owner || '—'}</td>
                          <td>
                            <button onClick={() => openEditRisk(r)} className="btn-secondary btn-sm">
                              <Edit2 size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NCRs Tab */}
      {tab === 'ncr' && (
        ncrs.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="No NCRs raised" description="Non-Conformance Reports (NCRs) will appear here" />
        ) : (
          <div className="card">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>NCR Number</th>
                    <th>Title</th>
                    <th>Area</th>
                    <th>Discipline</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Raised Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {ncrs.map(n => (
                    <tr key={n.id}>
                      <td><span className="font-mono text-xs text-gray-600">{n.ncrNumber}</span></td>
                      <td>
                        <p className="font-medium text-gray-900">{n.title}</p>
                        <p className="text-xs text-gray-400 max-w-xs truncate">{n.description}</p>
                      </td>
                      <td className="text-xs">{n.area || '—'}</td>
                      <td>{n.discipline ? <span className="badge badge-blue">{getDisciplineLabel(n.discipline)}</span> : '—'}</td>
                      <td>
                        <span className={`badge ${n.severity === 'HIGH' || n.severity === 'CRITICAL' ? 'badge-red' : n.severity === 'MEDIUM' ? 'badge-yellow' : 'badge-green'}`}>
                          {n.severity}
                        </span>
                      </td>
                      <td><StatusBadge status={n.status} /></td>
                      <td className="text-xs">{formatDate(n.raisedDate)}</td>
                      <td>
                        <button onClick={() => updateNCR(n, qc, projectId!)} className="btn-secondary btn-sm">
                          <Edit2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Risk Modal */}
      <Modal isOpen={showRiskModal} onClose={() => { setShowRiskModal(false); resetR(); setEditRisk(null); }}
        title={editRisk ? 'Edit Risk' : 'New Risk'} size="lg"
        footer={
          <>
            <button onClick={() => { setShowRiskModal(false); resetR(); setEditRisk(null); }} className="btn-secondary">Cancel</button>
            <button onClick={handleR(d => createRisk.mutate(d))} disabled={createRisk.isPending} className="btn-primary">
              {createRisk.isPending ? 'Saving...' : 'Save Risk'}
            </button>
          </>
        }>
        <form className="space-y-4">
          <div>
            <label className="label">Risk Title *</label>
            <input className="input" {...regR('title', { required: true })} />
          </div>
          <div>
            <label className="label">Description *</label>
            <textarea className="input" rows={2} {...regR('description', { required: true })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Category</label>
              <select className="input" {...regR('category')}>
                {RISK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Probability (1-5)</label>
              <input type="number" className="input" min={1} max={5} {...regR('probability', { valueAsNumber: true })} />
            </div>
            <div>
              <label className="label">Impact (1-5)</label>
              <input type="number" className="input" min={1} max={5} {...regR('impact', { valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Status</label>
              <select className="input" {...regR('status')}>
                {['OPEN', 'MITIGATED', 'CLOSED', 'ACCEPTED'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Owner</label>
              <input className="input" placeholder="Responsible person" {...regR('owner')} />
            </div>
          </div>
          <div>
            <label className="label">Mitigation Plan</label>
            <textarea className="input" rows={2} {...regR('mitigation')} />
          </div>
        </form>
      </Modal>

      {/* NCR Modal */}
      <Modal isOpen={showNCRModal} onClose={() => { setShowNCRModal(false); resetN(); }}
        title="New Non-Conformance Report (NCR)"
        footer={
          <>
            <button onClick={() => { setShowNCRModal(false); resetN(); }} className="btn-secondary">Cancel</button>
            <button onClick={handleN(d => createNCR.mutate(d))} disabled={createNCR.isPending} className="btn-primary">
              {createNCR.isPending ? 'Saving...' : 'Save NCR'}
            </button>
          </>
        }>
        <form className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" {...regN('title', { required: true })} />
          </div>
          <div>
            <label className="label">Description *</label>
            <textarea className="input" rows={3} {...regN('description', { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Area</label>
              <input className="input" {...regN('area')} />
            </div>
            <div>
              <label className="label">Discipline</label>
              <select className="input" {...regN('discipline')}>
                <option value="">Select...</option>
                {[
                  ['STRUCTURE',     'Structure'],
                  ['ARCHITECTURE',  'Architecture'],
                  ['MECANIQUE',     'Mechanical'],
                  ['ELECTRICITE',   'Electrical'],
                  ['PLOMBERIE',     'Plumbing'],
                  ['CIVIL',         'Civil'],
                  ['INFRASTRUCTURE','Infrastructure'],
                  ['GENERAL',       'General'],
                ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Severity</label>
              <select className="input" {...regN('severity')}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="label">Raised Date</label>
              <input type="date" className="input" defaultValue={new Date().toISOString().split('T')[0]} {...regN('raisedDate')} />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function updateNCR(ncr: NCR, qc: any, projectId: string) {
  // Simple status cycling
  const statuses = ['OPEN', 'UNDER_REVIEW', 'CLOSED'];
  const nextIdx = (statuses.indexOf(ncr.status) + 1) % statuses.length;
  ncrsApi.update(projectId, ncr.id, { status: statuses[nextIdx] })
    .then(() => qc.invalidateQueries({ queryKey: ['ncrs', projectId] }));
}
