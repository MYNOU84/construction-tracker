import { useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '../api/endpoints';
import { formatDate, formatFileSize } from '../utils/helpers';
import { PageLoader } from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import { useForm } from 'react-hook-form';
import {
  FileText, Upload, Trash2, Download, Search, Plus,
  FileStack, Package, ScrollText, Layers, PenTool, Eye, Loader2,
  ClipboardList, BookOpen, FilePlus, Shield
} from 'lucide-react';
import type { Document } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

const CONTRACT_TYPES = [
  { value: 'CONTRACT',       label: 'Contract' },
  { value: 'SPECIFICATION',  label: 'Specification' },
  { value: 'ADDENDUM',       label: 'Addendum' },
  { value: 'BOQ',            label: 'Bill of Quantities (BOQ)' },
  { value: 'INSURANCE',      label: 'Insurance' },
  { value: 'PERMIT',         label: 'Permit' },
  { value: 'OTHER_CONTRACT', label: 'Other' },
];

const SUBMITTAL_TYPES = [
  { value: 'MATERIAL_SUBMITTAL', label: 'Material Submittal',  icon: Package,    color: 'bg-blue-100 text-blue-700' },
  { value: 'SHOP_DRAWING',       label: 'Shop Drawing',        icon: PenTool,    color: 'bg-purple-100 text-purple-700' },
  { value: 'METHOD_STATEMENT',   label: 'Method Statement',    icon: ScrollText, color: 'bg-green-100 text-green-700' },
  { value: 'MOCKUP',             label: 'Mockup',              icon: Layers,     color: 'bg-orange-100 text-orange-700' },
];

const SUBMITTAL_STATUSES = [
  { value: 'PENDING',       label: 'Pending',       color: 'bg-gray-100 text-gray-600' },
  { value: 'SUBMITTED',     label: 'Submitted',     color: 'bg-blue-100 text-blue-700' },
  { value: 'UNDER_REVIEW',  label: 'Under Review',  color: 'bg-yellow-100 text-yellow-700' },
  { value: 'APPROVED',      label: 'Approved',      color: 'bg-green-100 text-green-700' },
  { value: 'REJECTED',      label: 'Rejected',      color: 'bg-red-100 text-red-700' },
  { value: 'RESUBMITTED',   label: 'Resubmitted',   color: 'bg-indigo-100 text-indigo-700' },
];

const CONTRACT_CARDS = [
  { value: 'CONTRACT',       label: 'Contract',     icon: FileStack,     color: 'bg-blue-100 text-blue-700' },
  { value: 'SPECIFICATION',  label: 'Specification', icon: BookOpen,      color: 'bg-purple-100 text-purple-700' },
  { value: 'PERMIT',         label: 'Permit',        icon: Shield,        color: 'bg-green-100 text-green-700' },
  { value: 'BOQ',            label: 'BOQ',           icon: ClipboardList, color: 'bg-orange-100 text-orange-700' },
];

const ALL_SUBMITTAL_VALUES = SUBMITTAL_TYPES.map(t => t.value);
const ALL_CONTRACT_VALUES  = CONTRACT_TYPES.map(t => t.value);

function statusColor(status: string) {
  return SUBMITTAL_STATUSES.find(s => s.value === status)?.color ?? 'bg-gray-100 text-gray-600';
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({
  isOpen, onClose, onUpload, uploading, tab
}: {
  isOpen: boolean; onClose: () => void;
  onUpload: (data: any, file: File | null) => void;
  uploading: boolean; tab: 'contracts' | 'submittals';
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      name: '', type: tab === 'contracts' ? 'CONTRACT' : 'MATERIAL_SUBMITTAL',
      revision: '', status: 'PENDING', description: '',
    }
  });

  const submit = (data: any) => {
    onUpload(data, selectedFile);
    reset();
    setSelectedFile(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={tab === 'contracts' ? 'Add Contract / Specification' : 'Add Submittal'}
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit(submit)} disabled={uploading} className="btn-primary">
            {uploading ? 'Uploading...' : 'Add'}
          </button>
        </>
      }>
      <div className="space-y-4">
        <div>
          <label className="label">Name / Title *</label>
          <input className="input" placeholder="e.g. Contract Lot 1, Shop Drawing - Facade..." {...register('name', { required: true })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Type *</label>
            <select className="input" {...register('type')}>
              {(tab === 'contracts' ? CONTRACT_TYPES : SUBMITTAL_TYPES).map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Revision</label>
            <input className="input" placeholder="e.g. A, B, Rev1..." {...register('revision')} />
          </div>
        </div>
        {tab === 'submittals' && (
          <div>
            <label className="label">Status</label>
            <select className="input" {...register('status')}>
              {SUBMITTAL_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label">Description / Notes</label>
          <textarea className="input" rows={2} placeholder="Notes, observations..." {...register('description')} />
        </div>
        <div>
          <label className="label">File</label>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-primary-400 transition-colors"
          >
            {selectedFile ? (
              <p className="text-sm text-gray-700 font-medium">{selectedFile.name} ({formatFileSize(selectedFile.size)})</p>
            ) : (
              <p className="text-sm text-gray-400">Click to select a file (PDF, DWG, DOCX...)</p>
            )}
          </div>
          <input type="file" ref={fileRef} className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf,.png,.jpg,.jpeg"
            onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContractsSubmittalsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'contracts' | 'submittals'>('contracts');
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const directRef = useRef<HTMLInputElement>(null);
  const [directType, setDirectType] = useState('');
  const [directUploading, setDirectUploading] = useState(false);

  const allTypes = [...ALL_CONTRACT_VALUES, ...ALL_SUBMITTAL_VALUES];

  const { data: allDocs = [], isLoading } = useQuery({
    queryKey: ['documents', projectId, 'submittals-contracts'],
    queryFn: async () => {
      const res = await documentsApi.list(projectId!);
      return res.data.filter((d: Document) => allTypes.includes(d.type));
    },
    enabled: !!projectId,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ data, file }: { data: any; file: File | null }) => {
      const formData = new FormData();
      if (file) formData.append('file', file);
      // Store status in tags field
      const tags = data.status ? [data.status] : [];
      formData.append('name', data.name);
      formData.append('type', data.type);
      formData.append('revision', data.revision || '');
      formData.append('description', data.description || '');
      formData.append('tags', JSON.stringify(tags));
      if (!file) {
        formData.append('fileUrl', '#');
        formData.append('fileName', data.name);
      }
      return documentsApi.upload(projectId!, formData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', projectId] });
      setShowUpload(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => documentsApi.delete(projectId!, docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', projectId] });
      setConfirmDeleteId(null);
    },
  });

  const handleDirectUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;
    setDirectUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name.replace(/\.[^/.]+$/, ''));
      formData.append('type', directType || 'CONTRACT');
      formData.append('fileUrl', '');
      formData.append('fileName', file.name);
      await documentsApi.upload(projectId, formData);
      qc.invalidateQueries({ queryKey: ['documents', projectId] });
    } finally {
      setDirectUploading(false);
      e.target.value = '';
    }
  }, [projectId, directType, qc]);

  if (isLoading) return <PageLoader text="Loading..." />;

  const tabTypes = tab === 'contracts' ? ALL_CONTRACT_VALUES : ALL_SUBMITTAL_VALUES;
  const docs = allDocs.filter((d: Document) => {
    if (!tabTypes.includes(d.type)) return false;
    if (filterType && d.type !== filterType) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus) {
      const tags = Array.isArray(d.tags) ? d.tags : (typeof d.tags === 'string' ? JSON.parse(d.tags || '[]') : []);
      if (!tags.includes(filterStatus)) return false;
    }
    return true;
  });

  const getStatus = (doc: Document) => {
    const tags = Array.isArray(doc.tags) ? doc.tags : (typeof doc.tags === 'string' ? (() => { try { return JSON.parse(doc.tags as string); } catch { return []; } })() : []);
    return tags.find((t: string) => SUBMITTAL_STATUSES.some(s => s.value === t)) || 'PENDING';
  };

  const getTypeCfg = (type: string) =>
    SUBMITTAL_TYPES.find(t => t.value === type) || CONTRACT_TYPES.find(t => t.value === type);

  return (
    <div className="space-y-6 fade-in">
      {/* Hidden direct-upload input */}
      <input ref={directRef} type="file" className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf,.png,.jpg,.jpeg"
        onChange={handleDirectUpload} />

      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="page-title">Contracts & Submittals</h1>
          <p className="page-subtitle">{docs.length} document{docs.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary">
          <Plus size={16} /> Add
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => { setTab('contracts'); setFilterType(''); setFilterStatus(''); }}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'contracts' ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
          <FileStack size={16} /> Contracts & Specs
        </button>
        <button
          onClick={() => { setTab('submittals'); setFilterType(''); setFilterStatus(''); }}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'submittals' ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
          <Package size={16} /> Submittals
        </button>
      </div>

      {/* Contract quick-upload cards (contracts tab) */}
      {tab === 'contracts' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CONTRACT_CARDS.map(t => {
            const count = allDocs.filter((d: Document) => d.type === t.value).length;
            const Icon = t.icon;
            const isUploading = directUploading && directType === t.value;
            return (
              <button key={t.value}
                onClick={() => setFilterType(filterType === t.value ? '' : t.value)}
                onDoubleClick={e => {
                  e.preventDefault();
                  setDirectType(t.value);
                  setTimeout(() => directRef.current?.click(), 0);
                }}
                title={`Click to filter · Double-click to upload ${t.label}`}
                className={`card-sm flex items-center gap-3 text-left transition-all select-none group ${filterType === t.value ? 'border-primary-500 border-2' : ''}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${t.color} transition-colors`}>
                  {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">{count}</div>
                  <div className="text-xs text-gray-500">{t.label}</div>
                  <div className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity leading-tight">double-click to upload</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Submittal type cards (submittals tab) */}
      {tab === 'submittals' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SUBMITTAL_TYPES.map(t => {
            const count = allDocs.filter((d: Document) => d.type === t.value).length;
            const Icon = t.icon;
            const isUploading = directUploading && directType === t.value;
            return (
              <button key={t.value}
                onClick={() => setFilterType(filterType === t.value ? '' : t.value)}
                onDoubleClick={e => {
                  e.preventDefault();
                  setDirectType(t.value);
                  setTimeout(() => directRef.current?.click(), 0);
                }}
                title={`Click to filter · Double-click to upload ${t.label}`}
                className={`card text-left transition-all hover:shadow-card-lg select-none group ${filterType === t.value ? 'border-primary-500 border-2' : ''}`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`p-2 rounded-lg ${t.color}`}>
                    {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
                  </span>
                  <span className="font-semibold text-gray-800 text-sm">{t.label}</span>
                </div>
                <p className="text-2xl font-black text-gray-900">{count}</p>
                <p className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1">double-click to upload</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {tab === 'contracts' && (
          <select className="input w-48" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {CONTRACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        )}
        {tab === 'submittals' && (
          <select className="input w-48" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {SUBMITTAL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {docs.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No documents</p>
            <p className="text-sm mt-1">Click "Add" to get started</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Revision</th>
                {tab === 'submittals' && <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>}
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Description</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc: Document, i: number) => {
                const typeCfg = getTypeCfg(doc.type);
                const status = getStatus(doc);
                const statusCfg = SUBMITTAL_STATUSES.find(s => s.value === status);
                return (
                  <tr key={doc.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-800">{doc.name}</span>
                      </div>
                      {doc.fileName && doc.fileName !== doc.name && (
                        <p className="text-xs text-gray-400 ml-5 mt-0.5">{doc.fileName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {(typeCfg as any)?.label?.split('/')[0]?.trim() ?? doc.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                      {doc.revision || <span className="text-gray-300">—</span>}
                    </td>
                    {tab === 'submittals' && (
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusCfg?.color ?? 'bg-gray-100 text-gray-600'}`}>
                          {statusCfg?.label ?? status}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(doc.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                      {doc.description || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {doc.fileUrl && doc.fileUrl !== '#' && (
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors" title="Download">
                            <Download size={15} />
                          </a>
                        )}
                        <button onClick={() => setConfirmDeleteId(doc.id)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        uploading={uploadMutation.isPending}
        tab={tab}
        onUpload={(data, file) => uploadMutation.mutate({ data, file })}
      />

      {/* Confirm Delete */}
      <Modal isOpen={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} title="Delete Document"
        footer={
          <>
            <button onClick={() => setConfirmDeleteId(null)} className="btn-secondary">Cancel</button>
            <button onClick={() => confirmDeleteId && deleteMutation.mutate(confirmDeleteId)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
              Delete
            </button>
          </>
        }>
        <p className="text-gray-600">Are you sure you want to delete this document?</p>
      </Modal>
    </div>
  );
}
