import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Archive, ArchiveRestore, UserPlus, Trash2, FileSpreadsheet, FileJson, Settings2 } from 'lucide-react';
import { projectsApi } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { getStatusLabel } from '../../utils/helpers';
import { exportProjectWorkbook, exportProjectJSON } from '../../utils/exportTable';
import Modal from '../ui/Modal';
import type { Project } from '../../types';

const STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'ARCHIVED'];
const MEMBER_ROLES = ['PROJECT_MANAGER', 'SITE_ENGINEER', 'CONSULTANT', 'CONTRACTOR', 'CLIENT_VIEWER'];

const errMsg = (e: any) => e?.response?.data?.message || 'The request failed';
const day = (v?: string) => (v ? v.slice(0, 10) : '');

/**
 * Owner / project-manager controls for one project: edit details, archive, manage members, and the
 * complete project export (every member, including demo visitors, may export). The server enforces the
 * same rules; this panel only hides what the signed-in account cannot do.
 */
export default function ProjectAdminPanel({ project }: { project: Project }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [exporting, setExporting] = useState<'' | 'xlsx' | 'json'>('');
  const [error, setError] = useState('');

  const isPM = !!project.members?.some(m => m.userId === user?.id && m.role === 'PROJECT_MANAGER');
  const canManage = !user?.demo && (user?.role === 'ADMIN' || isPM);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['project', project.id] });
    qc.invalidateQueries({ queryKey: ['projects'] });
  };

  const update = useMutation({
    mutationFn: (data: object) => projectsApi.update(project.id, data),
    onSuccess: () => { refresh(); setEditing(false); setError(''); },
    onError: (e) => setError(errMsg(e)),
  });

  const runExport = async (kind: 'xlsx' | 'json') => {
    setExporting(kind); setError('');
    try {
      const { data } = await projectsApi.exportAll(project.id);
      if (kind === 'xlsx') await exportProjectWorkbook(data); else exportProjectJSON(data);
    } catch (e) { setError(errMsg(e)); } finally { setExporting(''); }
  };

  const archived = project.status === 'ARCHIVED';

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Settings2 size={16} className="text-gray-400" />
          <h3 className="font-semibold text-gray-900">Project Administration</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" data-allow-demo className="btn-secondary btn-sm" disabled={!!exporting} onClick={() => runExport('xlsx')} title="Export the complete project (all modules) to Excel">
            <FileSpreadsheet size={14} /> {exporting === 'xlsx' ? 'Exporting…' : 'Complete export (Excel)'}
          </button>
          <button type="button" data-allow-demo className="btn-secondary btn-sm" disabled={!!exporting} onClick={() => runExport('json')} title="Export the complete project as JSON">
            <FileJson size={14} /> {exporting === 'json' ? 'Exporting…' : 'JSON'}
          </button>
          {canManage && (
            <>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setEditing(true)}>
                <Pencil size={14} /> Edit project
              </button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setMembersOpen(true)}>
                <UserPlus size={14} /> Manage members
              </button>
              <button type="button" className="btn-secondary btn-sm" disabled={update.isPending}
                onClick={() => {
                  if (archived || confirm(`Archive "${project.name}"? It will be hidden from the project list until unarchived. No data is deleted.`))
                    update.mutate({ status: archived ? 'ACTIVE' : 'ARCHIVED' });
                }}>
                {archived ? <><ArchiveRestore size={14} /> Unarchive</> : <><Archive size={14} /> Archive</>}
              </button>
            </>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      {canManage && editing && (
        <EditProjectModal project={project} onClose={() => setEditing(false)} saving={update.isPending}
          onSave={(d) => update.mutate(d)} error={error} />
      )}
      {canManage && membersOpen && (
        <MembersModal project={project} onClose={() => setMembersOpen(false)} onChanged={refresh} />
      )}
    </div>
  );
}

function EditProjectModal({ project, onClose, onSave, saving, error }: {
  project: Project; onClose: () => void; onSave: (d: object) => void; saving: boolean; error: string;
}) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: project.name, code: project.code, description: project.description ?? '', client: project.client,
      contractor: project.contractor ?? '', consultant: project.consultant ?? '', location: project.location,
      startDate: day(project.startDate), endDate: day(project.endDate), budget: project.budget ?? '',
      actualCost: project.actualCost ?? '', currency: project.currency, status: project.status, progress: project.progress,
    },
  });
  const submit = handleSubmit((v: any) => onSave({
    ...v,
    budget: v.budget === '' ? null : Number(v.budget),
    actualCost: v.actualCost === '' ? null : Number(v.actualCost),
    progress: Number(v.progress) || 0,
  }));
  return (
    <Modal isOpen onClose={onClose} title="Edit project" size="2xl"
      footer={<>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn-primary" disabled={saving} onClick={submit}>{saving ? 'Saving…' : 'Save changes'}</button>
      </>}>
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label">Project name *</label><input className="input" {...register('name', { required: true })} /></div>
          <div><label className="label">Project code *</label><input className="input" {...register('code', { required: true })} /></div>
        </div>
        <div><label className="label">Description</label><textarea className="input" rows={2} {...register('description')} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><label className="label">Client *</label><input className="input" {...register('client', { required: true })} /></div>
          <div><label className="label">Contractor</label><input className="input" {...register('contractor')} /></div>
          <div><label className="label">Consultant</label><input className="input" {...register('consultant')} /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><label className="label">Location *</label><input className="input" {...register('location', { required: true })} /></div>
          <div><label className="label">Start date</label><input type="date" className="input" {...register('startDate')} /></div>
          <div><label className="label">End date</label><input type="date" className="input" {...register('endDate')} /></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div><label className="label">Budget</label><input type="number" step="any" min="0" className="input" {...register('budget')} /></div>
          <div><label className="label">Actual cost</label><input type="number" step="any" min="0" className="input" {...register('actualCost')} /></div>
          <div><label className="label">Currency</label><input className="input" {...register('currency')} /></div>
          <div><label className="label">Progress %</label><input type="number" min="0" max="100" className="input" {...register('progress')} /></div>
          <div><label className="label">Status</label>
            <select className="input" {...register('status')}>
              {STATUSES.map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}

function MembersModal({ project, onClose, onChanged }: { project: Project; onClose: () => void; onChanged: () => void }) {
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('SITE_ENGINEER');
  const [error, setError] = useState('');
  const { data: candidates = [] } = useQuery({
    queryKey: ['member-candidates', project.id],
    queryFn: () => projectsApi.candidates(project.id).then(r => r.data),
  });
  const memberIds = new Set(project.members?.map(m => m.userId));
  const available = candidates.filter(c => !memberIds.has(c.id));

  const add = useMutation({
    mutationFn: () => projectsApi.addMember(project.id, { userId, role }),
    onSuccess: () => { setUserId(''); setError(''); onChanged(); },
    onError: (e) => setError(errMsg(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => projectsApi.removeMember(project.id, id),
    onSuccess: () => { setError(''); onChanged(); },
    onError: (e) => setError(errMsg(e)),
  });
  const changeRole = useMutation({
    mutationFn: ({ id, r }: { id: string; r: string }) => projectsApi.addMember(project.id, { userId: id, role: r }),
    onSuccess: () => { setError(''); onChanged(); },
    onError: (e) => setError(errMsg(e)),
  });

  return (
    <Modal isOpen onClose={onClose} title={`Members — ${project.name}`} size="2xl"
      footer={<button type="button" className="btn-secondary" onClick={onClose}>Close</button>}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="label">User</label>
            <select className="input" value={userId} onChange={e => setUserId(e.target.value)}>
              <option value="">Select a user…</option>
              {available.map(c => <option key={c.id} value={c.id}>{c.name} — {c.email}{c.company ? ` (${c.company})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Project role</label>
            <select className="input" value={role} onChange={e => setRole(e.target.value)}>
              {MEMBER_ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <button type="button" className="btn-primary" disabled={!userId || add.isPending} onClick={() => add.mutate()}>
            <UserPlus size={15} /> Add member
          </button>
        </div>
        {available.length === 0 && <p className="text-xs text-gray-400">Every active account is already a member. Create accounts on the Users page.</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
          {(project.members ?? []).map(m => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
              <div className="flex-1 min-w-[180px]">
                <p className="text-sm font-medium text-gray-800">{m.user?.name}</p>
                <p className="text-xs text-gray-400">{m.user?.email}</p>
              </div>
              <select className="input w-auto text-sm" value={m.role} disabled={changeRole.isPending}
                onChange={e => changeRole.mutate({ id: m.userId, r: e.target.value })}>
                {MEMBER_ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
              <button type="button" className="btn-secondary btn-sm" disabled={remove.isPending} title="Remove from project"
                onClick={() => { if (confirm(`Remove ${m.user?.name} from this project?`)) remove.mutate(m.userId); }}>
                <Trash2 size={14} /> Remove
              </button>
            </div>
          ))}
          {(project.members ?? []).length === 0 && <p className="text-sm text-gray-400 px-3 py-3">No members yet.</p>}
        </div>
      </div>
    </Modal>
  );
}
