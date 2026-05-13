import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '../api/endpoints';
import { formatDate, formatFileSize, parseJSON, DOCUMENT_TYPES } from '../utils/helpers';
import { PageLoader } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { useForm } from 'react-hook-form';
import {
  Files, Upload, Trash2, Download, Search, Filter, Eye,
  FileText, Image, File, FileSpreadsheet, Loader2
} from 'lucide-react';
import type { Document } from '../types';

const DOC_ICONS: Record<string, any> = {
  PHOTO: Image, DRAWING: FileText, REPORT: FileSpreadsheet,
  RFI: FileText, PERMIT: FileText, CONTRACT: FileText,
  SPECIFICATION: FileText, OTHER: File,
};

export default function DocumentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const qc = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { register, handleSubmit, reset } = useForm<any>();
  const directRef = useRef<HTMLInputElement>(null);
  const [directType, setDirectType] = useState('');
  const [directUploading, setDirectUploading] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', projectId, typeFilter],
    queryFn: () => documentsApi.list(projectId!, typeFilter || undefined).then(r => r.data),
    enabled: !!projectId,
  });

  const uploadMutation = useMutation({
    mutationFn: (data: any) => {
      const formData = new FormData();
      if (selectedFile) formData.append('file', selectedFile);
      Object.entries(data).forEach(([k, v]) => formData.append(k, String(v)));
      return documentsApi.upload(projectId!, formData);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents', projectId] }); setShowUpload(false); reset(); setSelectedFile(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => documentsApi.delete(projectId!, docId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', projectId] }),
  });

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;
    setDirectUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name.replace(/\.[^/.]+$/, ''));
      formData.append('type', directType || 'OTHER');
      await documentsApi.upload(projectId, formData);
      qc.invalidateQueries({ queryKey: ['documents', projectId] });
    } finally {
      setDirectUploading(false);
      e.target.value = '';
    }
  };

  const filtered = documents.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.fileName.toLowerCase().includes(search.toLowerCase())
  );

  // Group by type
  const grouped = DOCUMENT_TYPES.reduce<Record<string, Document[]>>((acc, t) => {
    const docs = filtered.filter(d => d.type === t);
    if (docs.length > 0) acc[t] = docs;
    return acc;
  }, {});

  if (isLoading) return <PageLoader text="Loading documents..." />;

  return (
    <div className="space-y-6 fade-in">
      {/* Hidden direct-upload input */}
      <input ref={directRef} type="file" className="hidden" onChange={handleDirectUpload} />

      <div className="section-header">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">{documents.length} files — Drawings, RFIs, Permits, Reports</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary">
          <Upload size={16} /> Upload Document
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['DRAWING', 'RFI', 'PERMIT', 'PHOTO'].map(type => {
          const count = documents.filter(d => d.type === type).length;
          const Icon = DOC_ICONS[type] || File;
          const isUploading = directUploading && directType === type;
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
              onDoubleClick={e => {
                e.preventDefault();
                setDirectType(type);
                setTimeout(() => directRef.current?.click(), 0);
              }}
              title={`Click to filter · Double-click to upload ${type}`}
              className={`card-sm flex items-center gap-3 text-left transition-all select-none group ${typeFilter === type ? 'border-primary-500 border' : ''}`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${isUploading ? 'bg-primary-100' : 'bg-primary-50 group-hover:bg-primary-100'}`}>
                {isUploading
                  ? <Loader2 size={18} className="text-primary-600 animate-spin" />
                  : <Icon size={18} className="text-primary-600" />
                }
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{count}</div>
                <div className="text-xs text-gray-500">{type}</div>
                <div className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity leading-tight">
                  double-click to upload
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Files} title="No documents" description="Upload project documents, drawings, permits, and photos"
          action={<button onClick={() => setShowUpload(true)} className="btn-primary"><Upload size={16} />Upload</button>}
        />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([type, docs]) => (
            <div key={type} className="card">
              <div className="flex items-center gap-2 mb-3">
                {(() => { const Icon = DOC_ICONS[type] || File; return <Icon size={18} className="text-gray-500" />; })()}
                <h3 className="font-semibold text-gray-900">{type}</h3>
                <span className="badge badge-gray">{docs.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {docs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {(() => { const Icon = DOC_ICONS[doc.type] || File; return <Icon size={18} className="text-gray-500" />; })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{doc.name}</p>
                      <p className="text-xs text-gray-400 truncate">{doc.fileName}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                        {doc.revision && <span>Rev. {doc.revision}</span>}
                        {doc.fileSize && <span>{formatFileSize(doc.fileSize)}</span>}
                        <span>{formatDate(doc.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
                        <Eye size={12} />
                      </a>
                      <button onClick={() => { if (confirm('Delete document?')) deleteMutation.mutate(doc.id); }} className="btn-danger btn-sm">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal isOpen={showUpload} onClose={() => { setShowUpload(false); reset(); setSelectedFile(null); }}
        title="Upload Document" size="lg"
        footer={
          <>
            <button onClick={() => { setShowUpload(false); reset(); setSelectedFile(null); }} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit(d => uploadMutation.mutate(d))} disabled={uploadMutation.isPending || !selectedFile} className="btn-primary">
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </button>
          </>
        }>
        <form className="space-y-4">
          {/* File Drop Zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
            <input ref={fileRef} type="file" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
            <Upload size={32} className="mx-auto mb-2 text-gray-400" />
            {selectedFile ? (
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-700">Click to select file</p>
                <p className="text-xs text-gray-400 mt-1">PDF, DWG, DXF, JPG, PNG, XLSX, DOCX — Max 50MB</p>
              </div>
            )}
          </div>

          <div>
            <label className="label">Document Name</label>
            <input className="input" placeholder="Drawing A-001 — Ground Floor Plan" {...register('name')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Document Type</label>
              <select className="input" {...register('type')}>
                {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Revision</label>
              <input className="input" placeholder="A, B, 1, 2..." {...register('revision')} />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} {...register('description')} />
          </div>
          <div>
            <label className="label">Tags (comma-separated)</label>
            <input className="input" placeholder="floor plan, architecture, revision B" {...register('tags')} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
