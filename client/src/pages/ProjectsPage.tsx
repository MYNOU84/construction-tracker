import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { projectsApi } from '../api/endpoints';
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from '../utils/helpers';
import ProgressBar from '../components/ui/ProgressBar';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { PageLoader } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { Plus, FolderOpen, MapPin, Calendar, DollarSign, Building2, Search, Trash2, Edit2 } from 'lucide-react';
import type { Project } from '../types';

const STATUS_OPTIONS = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];

export default function ProjectsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>();

  const createMutation = useMutation({
    mutationFn: (data: any) => projectsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setShowModal(false); reset(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (isLoading) return <PageLoader text="Loading projects..." />;

  return (
    <div className="space-y-6 fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} projects in portfolio</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9" placeholder="Search projects..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
        </select>
      </div>

      {/* Project Cards */}
      {filtered.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No projects found"
          description="Create your first construction project to get started"
          action={<button onClick={() => setShowModal(true)} className="btn-primary">Create Project</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project}
              onDelete={() => {
                if (confirm(`Delete project "${project.name}"? This action cannot be undone.`))
                  deleteMutation.mutate(project.id);
              }}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); reset(); }} title="New Construction Project" size="xl"
        footer={
          <>
            <button onClick={() => { setShowModal(false); reset(); }} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit(d => createMutation.mutate(d))} disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </>
        }>
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Project Name *</label>
              <input className="input" placeholder="Résidence Al Nour" {...register('name', { required: true })} />
            </div>
            <div>
              <label className="label">Project Code *</label>
              <input className="input" placeholder="PRJ-2024-001" {...register('code', { required: true })} />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} placeholder="Brief project description..." {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Client *</label>
              <input className="input" placeholder="Client name" {...register('client', { required: true })} />
            </div>
            <div>
              <label className="label">Location *</label>
              <input className="input" placeholder="City, Country" {...register('location', { required: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Contractor</label>
              <input className="input" placeholder="Main contractor" {...register('contractor')} />
            </div>
            <div>
              <label className="label">Consultant</label>
              <input className="input" placeholder="Consulting firm" {...register('consultant')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date *</label>
              <input type="date" className="input" {...register('startDate', { required: true })} />
            </div>
            <div>
              <label className="label">End Date *</label>
              <input type="date" className="input" {...register('endDate', { required: true })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Status</label>
              <select className="input" {...register('status')}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Budget</label>
              <input type="number" className="input" placeholder="0" {...register('budget', { valueAsNumber: true })} />
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="input" {...register('currency')}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="DZD">DZD</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function ProjectCard({ project, onDelete }: { project: Project; onDelete: () => void }) {
  const navigate = useNavigate();
  const daysLeft = Math.ceil((new Date(project.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysLeft < 0;

  return (
    <div
      className="card hover:shadow-card-lg transition-shadow group relative cursor-pointer"
      onClick={() => navigate(`/projects/${project.id}`)}>

      {/* Delete button — stops propagation so it doesn't navigate */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 z-10"
        title="Delete project">
        <Trash2 size={14} />
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-3 pr-6">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors truncate">{project.name}</p>
          <p className="text-xs text-gray-400">{project.code}</p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-gray-600">Overall Progress</span>
          <span className="font-bold text-gray-900">{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} size="md" />
      </div>

      {/* Info Grid */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2 text-gray-500">
          <Building2 size={13} className="text-gray-400" />
          <span className="truncate">{project.client}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <MapPin size={13} className="text-gray-400" />
          <span>{project.location}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <Calendar size={13} className="text-gray-400" />
          <span>{formatDate(project.startDate)} — {formatDate(project.endDate)}</span>
        </div>
        {project.budget && (
          <div className="flex items-center gap-2 text-gray-500">
            <DollarSign size={13} className="text-gray-400" />
            <span>{formatCurrency(project.budget, project.currency)}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <div className="flex gap-3 text-xs text-gray-400">
          <span>{project._count?.dailyReports ?? 0} reports</span>
          <span>{project._count?.activities ?? 0} activities</span>
        </div>
        <span className={`text-xs font-medium ${isOverdue ? 'text-red-500' : daysLeft < 30 ? 'text-yellow-600' : 'text-gray-400'}`}>
          {isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
        </span>
      </div>
    </div>
  );
}
