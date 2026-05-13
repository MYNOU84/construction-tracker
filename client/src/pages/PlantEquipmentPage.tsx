import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { plantApi } from '../api/endpoints';
import { formatDate } from '../utils/helpers';
import { PageLoader } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { Plus, Edit2, Trash2, Truck, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import type { PlantEquipment } from '../types';

const CATEGORIES = [
  'EARTHMOVING', 'LIFTING', 'CONCRETE', 'TRANSPORT', 'COMPACTION',
  'DRILLING', 'PUMPING', 'ELECTRICAL', 'SCAFFOLDING', 'GENERAL',
];

const CATEGORY_LABELS: Record<string, string> = {
  EARTHMOVING: 'Earthmoving',
  LIFTING: 'Lifting',
  CONCRETE: 'Concrete',
  TRANSPORT: 'Transport',
  COMPACTION: 'Compaction',
  DRILLING: 'Drilling',
  PUMPING: 'Pumping',
  ELECTRICAL: 'Electrical',
  SCAFFOLDING: 'Scaffolding',
  GENERAL: 'General',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  ON_SITE:           { label: 'On Site',          color: 'badge-green',  icon: CheckCircle },
  IDLE:              { label: 'Idle',             color: 'badge-yellow', icon: Clock },
  UNDER_MAINTENANCE: { label: 'Under Maintenance', color: 'badge-orange', icon: AlertTriangle },
  BREAKDOWN:         { label: 'Breakdown',         color: 'badge-red',    icon: XCircle },
  OFF_SITE:          { label: 'Off Site',          color: 'badge-gray',   icon: Truck },
};

const defaultValues = {
  name: '', category: 'GENERAL', make: '', model: '',
  serialNumber: '', plateNumber: '', owner: '', hireCompany: '',
  dateOnSite: new Date().toISOString().split('T')[0],
  dateOffSite: '', certExpiry: '', lastInspection: '',
  status: 'ON_SITE', hoursOnSite: 0, notes: '',
};

export default function PlantEquipmentPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PlantEquipment | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['plant', projectId],
    queryFn: () => plantApi.list(projectId!).then(r => r.data as PlantEquipment[]),
    enabled: !!projectId,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues });

  const createMutation = useMutation({
    mutationFn: (data: any) => plantApi.create(projectId!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plant', projectId] }); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => plantApi.update(projectId!, editing!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plant', projectId] }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => plantApi.delete(projectId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plant', projectId] }),
  });

  const openCreate = () => { setEditing(null); reset(defaultValues); setShowModal(true); };
  const openEdit = (item: PlantEquipment) => {
    setEditing(item);
    reset({
      ...item,
      dateOnSite: item.dateOnSite?.split('T')[0] || '',
      dateOffSite: item.dateOffSite?.split('T')[0] || '',
      certExpiry: item.certExpiry?.split('T')[0] || '',
      lastInspection: item.lastInspection?.split('T')[0] || '',
    });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  const onSubmit = (data: any) => {
    const clean = {
      ...data,
      hoursOnSite: Number(data.hoursOnSite) || 0,
      dateOffSite: data.dateOffSite || undefined,
      certExpiry: data.certExpiry || undefined,
      lastInspection: data.lastInspection || undefined,
    };
    editing ? updateMutation.mutate(clean) : createMutation.mutate(clean);
  };

  const filtered = items.filter(i =>
    (!statusFilter || i.status === statusFilter) &&
    (!categoryFilter || i.category === categoryFilter)
  );

  const onSite = items.filter(i => i.status === 'ON_SITE').length;
  const maintenance = items.filter(i => i.status === 'UNDER_MAINTENANCE').length;
  const breakdown = items.filter(i => i.status === 'BREAKDOWN').length;

  if (isLoading) return <PageLoader text="Loading plant & equipment..." />;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="page-title">Plant & Equipment Register</h1>
          <p className="page-subtitle">Plant & Equipment Site Register — {items.length} items</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Add Equipment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total On Site', value: items.filter(i => i.status !== 'OFF_SITE').length, color: 'text-gray-900', bg: 'bg-gray-50' },
          { label: 'Operational', value: onSite, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Maintenance', value: maintenance, color: 'text-orange-700', bg: 'bg-orange-50' },
          { label: 'Breakdown', value: breakdown, color: 'text-red-700', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`card-sm text-center ${s.bg}`}>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select className="input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>
        <select className="input w-auto" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Truck} title="No equipment registered"
          description="Add the machinery and equipment present on site"
          action={<button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Equipment</button>}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table">
            <thead>
              <tr>
                <th className="text-left">Equipment Name</th>
                <th className="text-left">Category</th>
                <th className="text-left">Make / Model</th>
                <th className="text-left">Serial # / Plate #</th>
                <th className="text-left">Owner</th>
                <th className="text-center">Date On Site</th>
                <th className="text-center">Hours</th>
                <th className="text-center">Last Inspection</th>
                <th className="text-center">Cert. Expiry</th>
                <th className="text-center">Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.GENERAL;
                const certExpired = item.certExpiry && new Date(item.certExpiry) < new Date();
                return (
                  <tr key={item.id}>
                    <td className="font-semibold text-gray-900">{item.name}</td>
                    <td><span className="badge badge-blue text-xs">{CATEGORY_LABELS[item.category] || item.category}</span></td>
                    <td className="text-sm text-gray-600">{[item.make, item.model].filter(Boolean).join(' ') || '—'}</td>
                    <td className="text-sm text-gray-500">{item.serialNumber || item.plateNumber || '—'}</td>
                    <td className="text-sm text-gray-600">{item.owner || item.hireCompany || '—'}</td>
                    <td className="text-center text-sm">{formatDate(item.dateOnSite, 'dd/MM/yy')}</td>
                    <td className="text-center font-semibold text-blue-700">{item.hoursOnSite}h</td>
                    <td className="text-center text-sm">{item.lastInspection ? formatDate(item.lastInspection, 'dd/MM/yy') : '—'}</td>
                    <td className="text-center text-sm">
                      {item.certExpiry ? (
                        <span className={certExpired ? 'text-red-600 font-semibold' : 'text-green-700'}>
                          {formatDate(item.certExpiry, 'dd/MM/yy')}
                          {certExpired && ' ⚠️'}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="text-center">
                      <span className={`badge ${sc.color} text-xs`}>{sc.label}</span>
                    </td>
                    <td className="text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => openEdit(item)} className="btn-secondary btn-sm p-1"><Edit2 size={13} /></button>
                        <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(item.id); }} className="btn-danger btn-sm p-1"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={closeModal}
        title={editing ? 'Edit Equipment' : 'Add Plant & Equipment'}
        footer={
          <>
            <button onClick={closeModal} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit(onSubmit)} disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary">
              {editing ? 'Save Changes' : 'Add Equipment'}
            </button>
          </>
        }>
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Equipment Name *</label>
              <input className="input" placeholder="e.g. Tower Crane, Excavator..." {...register('name', { required: true })} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" {...register('category')}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" {...register('status')}>
                {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Make</label>
              <input className="input" placeholder="Ex: Liebherr, Caterpillar..." {...register('make')} />
            </div>
            <div>
              <label className="label">Model</label>
              <input className="input" placeholder="Ex: LTM 1050, 320D..." {...register('model')} />
            </div>
            <div>
              <label className="label">Serial Number</label>
              <input className="input" {...register('serialNumber')} />
            </div>
            <div>
              <label className="label">Plate Number</label>
              <input className="input" {...register('plateNumber')} />
            </div>
            <div>
              <label className="label">Owner</label>
              <input className="input" placeholder="Owning company" {...register('owner')} />
            </div>
            <div>
              <label className="label">Hire Company</label>
              <input className="input" placeholder="If hired / rented" {...register('hireCompany')} />
            </div>
            <div>
              <label className="label">Date On Site *</label>
              <input type="date" className="input" {...register('dateOnSite', { required: true })} />
            </div>
            <div>
              <label className="label">Date Off Site</label>
              <input type="date" className="input" {...register('dateOffSite')} />
            </div>
            <div>
              <label className="label">Hours on Site</label>
              <input type="number" className="input" min={0} step={0.5} {...register('hoursOnSite', { valueAsNumber: true })} />
            </div>
            <div>
              <label className="label">Last Inspection</label>
              <input type="date" className="input" {...register('lastInspection')} />
            </div>
            <div>
              <label className="label">Certificate Expiry</label>
              <input type="date" className="input" {...register('certExpiry')} />
            </div>
            <div className="col-span-2">
              <label className="label">Notes / Observations</label>
              <textarea className="input" rows={2} {...register('notes')} />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
