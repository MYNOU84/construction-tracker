import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { resourcesApi } from '../api/endpoints';
import { formatDate } from '../utils/helpers';
import { PageLoader } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { Plus, Edit2, Trash2, Users, UserCheck, UserX } from 'lucide-react';
import type { SiteResource } from '../types';

const TRADES = [
  'Chef de Chantier / Site Manager', 'Ingénieur Civil / Civil Engineer',
  'Ingénieur Électrique / Electrical Engineer', 'Ingénieur Mécanique / Mechanical Engineer',
  'Responsable HSE / HSE Manager', 'Chef d\'Équipe / Foreman',
  'Maçon / Mason', 'Ferrailleur / Steel Fixer', 'Charpentier / Carpenter',
  'Coffreur / Formwork', 'Électricien / Electrician', 'Plombier / Plumber',
  'Soudeur / Welder', 'Grutier / Crane Operator', 'Chauffeur / Driver',
  'Manœuvre / Helper', 'Topographe / Surveyor', 'Magasinier / Storekeeper',
  'Comptable / Accountant', 'Agent Sécurité / Security Guard',
];

const defaultValues = {
  fullName: '', company: '', trade: '', position: '',
  type: 'DIRECT', idNumber: '', inductionDate: '', status: 'ACTIVE', notes: '',
};

export default function SiteResourcesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SiteResource | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['resources', projectId],
    queryFn: () => resourcesApi.list(projectId!).then(r => r.data as SiteResource[]),
    enabled: !!projectId,
  });

  const { register, handleSubmit, reset } = useForm({ defaultValues });

  const createMutation = useMutation({
    mutationFn: (data: any) => resourcesApi.create(projectId!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['resources', projectId] }); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => resourcesApi.update(projectId!, editing!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['resources', projectId] }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => resourcesApi.delete(projectId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resources', projectId] }),
  });

  const openCreate = () => { setEditing(null); reset(defaultValues); setShowModal(true); };
  const openEdit = (item: SiteResource) => {
    setEditing(item);
    reset({ ...item, inductionDate: item.inductionDate?.split('T')[0] || '' });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  const onSubmit = (data: any) => {
    const clean = { ...data, inductionDate: data.inductionDate || undefined };
    editing ? updateMutation.mutate(clean) : createMutation.mutate(clean);
  };

  const filtered = items.filter(i =>
    (!typeFilter || i.type === typeFilter) &&
    (!statusFilter || i.status === statusFilter) &&
    (!search || i.fullName.toLowerCase().includes(search.toLowerCase()) || (i.company || '').toLowerCase().includes(search.toLowerCase()))
  );

  const direct = items.filter(i => i.type === 'DIRECT' && i.status === 'ACTIVE').length;
  const indirect = items.filter(i => i.type === 'INDIRECT' && i.status === 'ACTIVE').length;
  const inactive = items.filter(i => i.status !== 'ACTIVE').length;

  if (isLoading) return <PageLoader text="Loading site resources..." />;

  return (
    <div className="space-y-6 fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Site Resources / Ressources Chantier</h1>
          <p className="page-subtitle">Registre du Personnel de Chantier — {items.length} registered</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Resource</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Actifs / Active', value: direct + indirect, color: 'text-gray-900', bg: 'bg-gray-50' },
          { label: 'Main d\'Oeuvre Directe', value: direct, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Main d\'Oeuvre Indirecte', value: indirect, color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Inactifs / Inactive', value: inactive, color: 'text-gray-500', bg: 'bg-gray-50' },
        ].map(s => (
          <div key={s.label} className={`card-sm text-center ${s.bg}`}>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input className="input flex-1 max-w-xs" placeholder="Search name or company..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input w-auto" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">Direct & Indirect</option>
          <option value="DIRECT">Direct</option>
          <option value="INDIRECT">Indirect</option>
        </select>
        <select className="input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Tous statuts</option>
          <option value="ACTIVE">Actif / Active</option>
          <option value="INACTIVE">Inactif / Inactive</option>
          <option value="SUSPENDED">Suspendu / Suspended</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No resources registered"
          description="Register the workers and personnel present on site"
          action={<button onClick={openCreate} className="btn-primary"><Plus size={16} /> Add Resource</button>}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table">
            <thead>
              <tr>
                <th className="text-left">Nom / Full Name</th>
                <th className="text-left">Entreprise / Company</th>
                <th className="text-left">Métier / Trade</th>
                <th className="text-left">Poste / Position</th>
                <th className="text-center">Type</th>
                <th className="text-center">N° CIN/Passeport</th>
                <th className="text-center">Date Induction</th>
                <th className="text-center">Statut</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td className="font-semibold text-gray-900">{item.fullName}</td>
                  <td className="text-sm text-gray-600">{item.company || '—'}</td>
                  <td className="text-sm text-gray-600">{item.trade || '—'}</td>
                  <td className="text-sm text-gray-500">{item.position || '—'}</td>
                  <td className="text-center">
                    <span className={`badge text-xs ${item.type === 'DIRECT' ? 'badge-blue' : 'badge-orange'}`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="text-center text-sm text-gray-500">{item.idNumber || '—'}</td>
                  <td className="text-center text-sm">
                    {item.inductionDate ? formatDate(item.inductionDate, 'dd/MM/yy') : <span className="text-red-500 text-xs">Non induit</span>}
                  </td>
                  <td className="text-center">
                    <span className={`badge text-xs ${item.status === 'ACTIVE' ? 'badge-green' : item.status === 'SUSPENDED' ? 'badge-red' : 'badge-gray'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => openEdit(item)} className="btn-secondary btn-sm p-1"><Edit2 size={13} /></button>
                      <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(item.id); }} className="btn-danger btn-sm p-1"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={closeModal}
        title={editing ? 'Edit Resource' : 'Add Site Resource / Personnel'}
        footer={
          <>
            <button onClick={closeModal} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit(onSubmit)} disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary">
              {editing ? 'Save Changes' : 'Add Resource'}
            </button>
          </>
        }>
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Nom Complet / Full Name *</label>
              <input className="input" placeholder="Prénom et Nom" {...register('fullName', { required: true })} />
            </div>
            <div>
              <label className="label">Entreprise / Company</label>
              <input className="input" placeholder="Nom de l'entreprise" {...register('company')} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" {...register('type')}>
                <option value="DIRECT">Direct</option>
                <option value="INDIRECT">Indirect</option>
              </select>
            </div>
            <div>
              <label className="label">Métier / Trade</label>
              <input list="trade-list" className="input" placeholder="Métier..." {...register('trade')} />
              <datalist id="trade-list">
                {TRADES.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div>
              <label className="label">Poste / Position</label>
              <input className="input" placeholder="Titre du poste" {...register('position')} />
            </div>
            <div>
              <label className="label">N° CIN / Passeport</label>
              <input className="input" {...register('idNumber')} />
            </div>
            <div>
              <label className="label">Date d'Induction HSE</label>
              <input type="date" className="input" {...register('inductionDate')} />
            </div>
            <div>
              <label className="label">Statut</label>
              <select className="input" {...register('status')}>
                <option value="ACTIVE">Actif / Active</option>
                <option value="INACTIVE">Inactif / Inactive</option>
                <option value="SUSPENDED">Suspendu / Suspended</option>
              </select>
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
