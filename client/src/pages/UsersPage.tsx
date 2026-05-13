import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { usersApi } from '../api/endpoints';
import { formatDate, getStatusLabel, USER_ROLES } from '../utils/helpers';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { PageLoader } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { Plus, Users, Edit2, UserX, Search } from 'lucide-react';
import type { User } from '../types';

export default function UsersPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then(r => r.data),
  });

  const { register, handleSubmit, reset, setValue } = useForm<any>();

  const saveMutation = useMutation({
    mutationFn: (data: any) => editUser ? usersApi.update(editUser.id, data) : usersApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowModal(false); reset(); setEditUser(null); },
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => usersApi.delete(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const openEdit = (u: User) => {
    setEditUser(u);
    setValue('name', u.name);
    setValue('email', u.email);
    setValue('role', u.role);
    setValue('company', u.company || '');
    setValue('phone', u.phone || '');
    setShowModal(true);
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  if (isLoading) return <PageLoader text="Loading users..." />;

  const roleSummary = USER_ROLES.map(r => ({
    ...r,
    count: users.filter(u => u.role === r.value).length,
  }));

  return (
    <div className="space-y-6 fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{users.filter(u => u.isActive).length} active users</p>
        </div>
        <button onClick={() => { setEditUser(null); reset(); setShowModal(true); }} className="btn-primary">
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Role Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {roleSummary.map(r => (
          <button key={r.value} onClick={() => setRoleFilter(roleFilter === r.value ? '' : r.value)}
            className={`card-sm text-center transition-colors ${roleFilter === r.value ? 'border-primary-500 border' : ''}`}>
            <div className="text-xl font-bold text-gray-900">{r.count}</div>
            <div className="text-xs text-gray-500 truncate">{r.label}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {USER_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No users found" />
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Company</th>
                  <th>Phone</th>
                  <th>Reports</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold text-sm">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        u.role === 'ADMIN' ? 'badge-red' :
                        u.role === 'PROJECT_MANAGER' ? 'badge-blue' :
                        u.role === 'SITE_ENGINEER' ? 'badge-green' :
                        u.role === 'CONSULTANT' ? 'badge-purple' :
                        'badge-gray'
                      }`}>
                        {getStatusLabel(u.role)}
                      </span>
                    </td>
                    <td className="text-gray-500 text-xs">{u.company || '—'}</td>
                    <td className="text-gray-500 text-xs">{u.phone || '—'}</td>
                    <td className="text-xs">
                      <span className="badge badge-gray">{(u as any)._count?.dailyReports ?? 0}</span>
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-green' : 'badge-gray'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-xs text-gray-400">{formatDate(u.createdAt)}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(u)} className="btn-secondary btn-sm"><Edit2 size={12} /></button>
                        {u.isActive && (
                          <button onClick={() => { if (confirm(`Deactivate ${u.name}?`)) deactivateMutation.mutate(u.id); }} className="btn-danger btn-sm">
                            <UserX size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); reset(); setEditUser(null); }}
        title={editUser ? `Edit — ${editUser.name}` : 'Add New User'} size="lg"
        footer={
          <>
            <button onClick={() => { setShowModal(false); reset(); setEditUser(null); }} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit(d => saveMutation.mutate(d))} disabled={saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending ? 'Saving...' : editUser ? 'Update User' : 'Create User'}
            </button>
          </>
        }>
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" {...register('name', { required: true })} />
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" disabled={!!editUser} {...register('email', { required: !editUser })} />
            </div>
          </div>
          {!editUser && (
            <div>
              <label className="label">Password *</label>
              <input type="password" className="input" placeholder="Minimum 6 characters" {...register('password', { required: true, minLength: 6 })} />
            </div>
          )}
          {editUser && (
            <div>
              <label className="label">New Password (leave blank to keep current)</label>
              <input type="password" className="input" placeholder="Leave blank to keep current" {...register('password')} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Role *</label>
              <select className="input" {...register('role', { required: true })}>
                {USER_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Company</label>
              <input className="input" {...register('company')} />
            </div>
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" placeholder="+213 555 0100" {...register('phone')} />
          </div>
          {editUser && (
            <div>
              <label className="label">Status</label>
              <select className="input" {...register('isActive', { setValueAs: v => v === 'true' })}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
