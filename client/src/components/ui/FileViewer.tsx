import { useEffect, useState } from 'react';
import { X, Download, Loader2, FileQuestion } from 'lucide-react';

interface Props {
  /** Stored file URL (e.g. /uploads/documents/x.pdf). Null/undefined closes the viewer. */
  url: string | null | undefined;
  name?: string;
  onClose: () => void;
}

type Kind = 'pdf' | 'image' | 'text' | 'sheet' | 'other';

const kindOf = (name: string): Kind => {
  const ext = name.split('?')[0].split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
  if (['txt', 'csv'].includes(ext)) return 'text';
  if (ext === 'xlsx') return 'sheet';
  return 'other';
};

/**
 * In-app document viewer: opens PDFs, images, text/CSV and Excel files in a modal instead of leaving the app.
 * The file is fetched with the user's session (same access rules as a download); formats a browser cannot render
 * (Word, DWG, MS Project…) show a message with a Download button.
 */
export default function FileViewer({ url, name, onClose }: Props) {
  const [state, setState] = useState<{ kind: Kind; blobUrl?: string; text?: string; rows?: string[][]; error?: string } | null>(null);
  const label = name || (url ? decodeURIComponent(url.split('/').pop() || 'File') : '');

  useEffect(() => {
    if (!url) { setState(null); return; }
    let revoked: string | undefined;
    let cancelled = false;
    setState(null);
    (async () => {
      const kind = kindOf(name || url);
      try {
        const res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) throw new Error(res.status === 404 ? 'File not found or you do not have access' : `Could not load the file (${res.status})`);
        const blob = await res.blob();
        if (cancelled) return;
        if (kind === 'text') setState({ kind, text: (await blob.text()).slice(0, 200000), blobUrl: (revoked = URL.createObjectURL(blob)) });
        else if (kind === 'sheet') {
          const ExcelJS = (await import('exceljs')).default;
          const wb = new ExcelJS.Workbook();
          await wb.xlsx.load(await blob.arrayBuffer());
          const ws = wb.worksheets[0];
          const rows: string[][] = [];
          ws?.eachRow({ includeEmpty: false }, (row) => {
            if (rows.length >= 500) return;
            const cells: string[] = [];
            for (let c = 1; c <= Math.min(row.cellCount, 30); c++) {
              const v: any = row.getCell(c).value;
              cells.push(v == null ? '' : typeof v === 'object' ? String(v.text ?? v.result ?? v.richText?.map((r: any) => r.text).join('') ?? '') : String(v));
            }
            rows.push(cells);
          });
          if (!cancelled) setState({ kind, rows, blobUrl: (revoked = URL.createObjectURL(blob)) });
        } else setState({ kind, blobUrl: (revoked = URL.createObjectURL(blob)) });
      } catch (e: any) {
        if (!cancelled) setState({ kind, error: e?.message || 'Could not open the file' });
      }
    })();
    return () => { cancelled = true; if (revoked) URL.revokeObjectURL(revoked); };
  }, [url, name]);

  useEffect(() => {
    if (!url) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [url, onClose]);

  if (!url) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-6" data-allow-demo
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'var(--bg-overlay)' }} onClick={onClose} />
      <div className="relative w-full max-w-6xl h-[92vh] rounded-2xl flex flex-col overflow-hidden fade-in"
        style={{ background: 'var(--bg-card, #fff)', border: '1px solid var(--border, #e5e7eb)' }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border, #e5e7eb)' }}>
          <p className="font-medium text-sm truncate flex-1" title={label}>{label}</p>
          {state?.blobUrl && (
            <a href={state.blobUrl} download={label} className="btn-secondary btn-sm" data-allow-demo title="Download"><Download size={13} /> Download</a>
          )}
          <button type="button" onClick={onClose} className="btn-secondary btn-sm" data-allow-demo title="Close"><X size={14} /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center" style={{ background: 'var(--bg-subtle, #f3f4f6)' }}>
          {!state && <Loader2 className="animate-spin text-gray-400" size={28} />}
          {state?.error && <p className="text-sm text-red-600 p-6 text-center">{state.error}</p>}
          {state && !state.error && state.kind === 'pdf' && <iframe src={state.blobUrl} title={label} className="w-full h-full border-0 bg-white" />}
          {state && !state.error && state.kind === 'image' && <img src={state.blobUrl} alt={label} className="max-w-full max-h-full object-contain" />}
          {state && !state.error && state.kind === 'text' && <pre className="w-full h-full overflow-auto p-4 text-xs bg-white whitespace-pre-wrap text-left">{state.text}</pre>}
          {state && !state.error && state.kind === 'sheet' && (
            <div className="w-full h-full overflow-auto bg-white self-start">
              <table className="text-xs border-collapse">
                <tbody>
                  {(state.rows || []).map((r, i) => (
                    <tr key={i}>{r.map((c, j) => <td key={j} className="border px-2 py-1 whitespace-nowrap" style={{ fontWeight: i === 0 ? 600 : 400 }}>{c}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {state && !state.error && state.kind === 'other' && (
            <div className="text-center p-8 text-sm text-gray-500">
              <FileQuestion size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="mb-3">This file type cannot be previewed in the browser.</p>
              {state.blobUrl && <a href={state.blobUrl} download={label} className="btn-primary btn-sm" data-allow-demo><Download size={13} /> Download to open it</a>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Opens the in-app viewer from anywhere (a <FileViewerHost/> is mounted once in the layout). */
export const openFile = (url: string, name?: string) =>
  window.dispatchEvent(new CustomEvent('open-file-viewer', { detail: { url, name } }));

export function FileViewerHost() {
  const [file, setFile] = useState<{ url: string; name?: string } | null>(null);
  useEffect(() => {
    const h = (e: Event) => setFile((e as CustomEvent).detail);
    window.addEventListener('open-file-viewer', h);
    return () => window.removeEventListener('open-file-viewer', h);
  }, []);
  return <FileViewer url={file?.url} name={file?.name} onClose={() => setFile(null)} />;
}
