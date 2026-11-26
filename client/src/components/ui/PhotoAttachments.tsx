import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { photosApi } from '../../api/endpoints';
import type { Photo } from '../../types';

interface Props {
  /** Exactly one parent. */
  dailyReportId?: string;
  ncrId?: string;
  photos?: Photo[];
  canEdit: boolean;
  /** Called after an upload or removal so the parent can refetch. */
  onChanged: () => void;
  compact?: boolean;
}

/** Photos attached to a daily report or an NCR: thumbnails open the stored file; upload / remove need edit rights (enforced server-side too). */
export default function PhotoAttachments({ dailyReportId, ncrId, photos = [], canEdit, onChanged, compact }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setErr('');
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        if (dailyReportId) fd.append('dailyReportId', dailyReportId);
        if (ncrId) fd.append('ncrId', ncrId);
        await photosApi.upload(fd);
      }
      onChanged();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Photo upload failed');
    } finally { setBusy(false); if (input.current) input.current.value = ''; }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Remove this photo?')) return;
    try { await photosApi.delete(id); onChanged(); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Could not remove the photo'); }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {photos.map(p => (
        <div key={p.id} className="relative group">
          <a href={p.url} target="_blank" rel="noreferrer" data-allow-demo title={p.fileName}>
            <img src={p.url} alt={p.fileName} className="rounded border object-cover" style={{ width: compact ? 36 : 72, height: compact ? 36 : 72 }} />
          </a>
          {canEdit && (
            <button type="button" onClick={() => remove(p.id)} title="Remove photo"
              className="absolute -top-1 -right-1 hidden group-hover:flex bg-red-600 text-white rounded-full p-0.5"><Trash2 size={10} /></button>
          )}
        </div>
      ))}
      {canEdit && (
        <>
          <button type="button" className="btn-secondary btn-sm" disabled={busy} onClick={() => input.current?.click()} title="Add photos">
            <Camera size={compact ? 12 : 14} /> {compact ? '' : (busy ? 'Uploading…' : 'Add photos')}
          </button>
          <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={e => upload(e.target.files)} />
        </>
      )}
      {!canEdit && photos.length === 0 && <span className="text-xs text-gray-400">No photos</span>}
      {err && <span className="text-xs" style={{ color: '#dc2626' }}>{err}</span>}
    </div>
  );
}
