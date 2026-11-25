import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, FileSpreadsheet } from 'lucide-react';
import { projectsApi } from '../../api/endpoints';
import { exportTablePDF, exportTableExcel, type ExportSection } from '../../utils/exportTable';

interface Props {
  projectId?: string;
  title: string;
  fileBase: string;
  sections: ExportSection[];
}

/** Branded PDF / Excel export of the rows a module page currently shows (its filters apply). Allowed for demo visitors. */
export default function TableExportButtons({ projectId, title, fileBase, sections }: Props) {
  const [busy, setBusy] = useState(false);
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!).then(r => r.data),
    enabled: !!projectId,
  });
  const empty = sections.every(s => s.rows.length === 0);
  const run = async (kind: 'pdf' | 'xlsx') => {
    setBusy(true);
    try {
      const opts = { title, fileBase, project, sections, subtitle: project ? `${project.name} (${project.code})` : undefined };
      if (kind === 'pdf') exportTablePDF(opts); else await exportTableExcel(opts);
    } catch (e) {
      alert('Export failed. Please try again.');
      console.error(e);
    } finally { setBusy(false); }
  };
  return (
    <div className="flex gap-2" data-allow-demo>
      <button type="button" data-allow-demo disabled={busy || empty} onClick={() => run('pdf')} className="btn-secondary btn-sm" title="Export PDF">
        <FileText size={14} /> PDF
      </button>
      <button type="button" data-allow-demo disabled={busy || empty} onClick={() => run('xlsx')} className="btn-secondary btn-sm" title="Export Excel">
        <FileSpreadsheet size={14} /> Excel
      </button>
    </div>
  );
}
