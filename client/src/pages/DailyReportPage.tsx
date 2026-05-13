import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dailyReportsApi, projectsApi } from '../api/endpoints';
import { formatDate, getStatusColor, parseJSON, translatePosition } from '../utils/helpers';
import StatusBadge from '../components/ui/StatusBadge';
import { PageLoader } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { DailyReportExportButtons } from '../components/reports/ExportButtons';
import {
  Plus, ClipboardList, Search, Edit2, Trash2,
  Cloud, Thermometer, Users
} from 'lucide-react';
import type { DailyReport, Project } from '../types';

const WEATHER_ICONS: Record<string, string> = {
  SUNNY: '☀️', CLOUDY: '⛅', RAINY: '🌧️', WINDY: '💨',
  Clear: '☀️', Sunny: '☀️', 'Partly Cloudy': '⛅', Overcast: '☁️',
  'Light Rain': '🌦️', 'Heavy Rain': '🌧️', Windy: '💨', Foggy: '🌫️', Hot: '🌡️',
};

export default function DailyReportPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['daily-reports', projectId],
    queryFn: () => dailyReportsApi.list(projectId!).then(r => r.data),
    enabled: !!projectId,
  });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!).then(r => r.data),
    enabled: !!projectId,
  });

  const deleteMutation = useMutation({
    mutationFn: (reportId: string) => dailyReportsApi.delete(projectId!, reportId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-reports', projectId] }),
  });

  const filtered = reports.filter(r => {
    const matchSearch = !search || formatDate(r.reportDate).toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (isLoading) return <PageLoader text="Loading daily reports..." />;

  return (
    <div className="space-y-6 fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Daily Reports</h1>
          <p className="page-subtitle">{reports.length} report{reports.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="new" className="btn-primary">
          <Plus size={16} /> New Report
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: reports.length, color: 'text-gray-900' },
          { label: 'Approved', value: reports.filter(r => r.status === 'APPROVED').length, color: 'text-green-600' },
          { label: 'Pending', value: reports.filter(r => r.status === 'SUBMITTED').length, color: 'text-yellow-600' },
          { label: 'Draft', value: reports.filter(r => r.status === 'DRAFT').length, color: 'text-gray-500' },
        ].map(s => (
          <div key={s.label} className="card-sm text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search by date..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No daily reports yet"
          description="Create the first daily site report to track progress, manpower, and activities"
          action={<Link to="new" className="btn-primary"><Plus size={16} />Create First Report</Link>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => (
            <ReportRow
              key={report.id}
              report={report}
              project={project}
              projectId={projectId!}
              expanded={expandedId === report.id}
              onToggle={() => setExpandedId(expandedId === report.id ? null : report.id)}
              onDelete={() => { if (confirm('Delete this report?')) deleteMutation.mutate(report.id); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReportRow({ report, project, projectId, expanded, onToggle, onDelete }: {
  report: DailyReport; project?: Project; projectId: string; expanded: boolean;
  onToggle: () => void; onDelete: () => void;
}) {
  const manpower = parseJSON<any[]>(report.manpowerData, []);
  const activities = parseJSON<any[]>(report.activitiesData, []);
  const delays = parseJSON<any[]>(report.delays, []);

  return (
    <div className="card-sm">
      {/* Header Row */}
      <div className="flex items-center gap-4 cursor-pointer" onClick={onToggle}>
        <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-lg">{WEATHER_ICONS[report.weather] || '🌤️'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">
              Report #{report.reportNumber} — {formatDate(report.reportDate, 'EEEE, dd MMMM yyyy')}
            </span>
            <StatusBadge status={report.status} />
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
            <span className="flex items-center gap-1"><Cloud size={11} />{report.weather}</span>
            {report.temperature && <span className="flex items-center gap-1"><Thermometer size={11} />{report.temperature}°C</span>}
            <span className="flex items-center gap-1"><Users size={11} />{report.totalManpower} workers</span>
            {activities.length > 0 && <span>{activities.length} activities</span>}
            {delays.length > 0 && <span className="text-red-500">{delays.length} delays</span>}
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {project && <DailyReportExportButtons report={report} project={project} />}
          <Link to={`${report.id}`} className="btn-secondary btn-sm">
            <Edit2 size={13} />
          </Link>
          <button onClick={onDelete} className="btn-danger btn-sm">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
          {report.generalSummary && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Summary</p>
              <p className="text-sm text-gray-700">{report.generalSummary}</p>
            </div>
          )}

          {/* Manpower */}
          {manpower.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Manpower ({report.totalManpower} workers)</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {manpower.map((m, i) => (
                  <div key={i} className={`rounded-lg px-3 py-2 ${m.type === 'INDIRECT' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                    <p className={`text-xs font-medium ${m.type === 'INDIRECT' ? 'text-amber-600' : 'text-blue-600'}`}>{translatePosition(m.position || m.trade || '—')}</p>
                    <p className={`text-lg font-bold ${m.type === 'INDIRECT' ? 'text-amber-800' : 'text-blue-800'}`}>{m.np || m.count || 0}</p>
                    <p className={`text-xs ${m.type === 'INDIRECT' ? 'text-amber-400' : 'text-blue-400'}`}>{m.company || '—'} · {m.hours || '—'}h</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          {activities.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tasks Executed</p>
              <div className="space-y-1.5">
                {activities.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                    {a.lot && <span className="badge badge-blue text-xs">LOT {a.lot}</span>}
                    {a.area && <span className="text-gray-500 text-xs">{a.area}</span>}
                    <span className="flex-1 text-gray-800 text-xs">{a.description}</span>
                    {a.producedQty !== undefined && <span className="text-xs font-bold text-gray-700">{a.producedQty} {a.unit}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delays */}
          {delays.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Delays / Issues</p>
              <div className="space-y-2">
                {delays.map((d, i) => (
                  <div key={i} className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm">
                    <p className="text-red-800 font-medium">{d.description}</p>
                    <p className="text-red-500 text-xs">Duration: {d.duration} · Responsibility: {d.responsibility}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
