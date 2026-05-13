import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts';
import { projectsApi, analyticsApi } from '../api/endpoints';
import { formatDate, formatCurrency, getDisciplineColor, getStatusLabel, getDisciplineLabel } from '../utils/helpers';
import ProgressBar from '../components/ui/ProgressBar';
import StatusBadge from '../components/ui/StatusBadge';
import { PageLoader } from '../components/ui/LoadingSpinner';
import {
  Building2, MapPin, Calendar, DollarSign, ClipboardList, Flag,
  Shield, Files, ArrowRight, TrendingUp, Users, CheckCircle2, AlertTriangle
} from 'lucide-react';

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: project, isLoading: loadProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!).then(r => r.data),
    enabled: !!projectId,
  });

  const { data: analytics, isLoading: loadAnalytics } = useQuery({
    queryKey: ['project-analytics', projectId],
    queryFn: () => analyticsApi.project(projectId!, 30).then(r => r.data),
    enabled: !!projectId,
  });

  if (loadProject || loadAnalytics) return <PageLoader text="Loading project..." />;
  if (!project) return <div className="text-center py-20 text-gray-400">Project not found</div>;

  const daysTotal = Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.ceil((Date.now() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24));
  const scheduleProgress = Math.min(100, Math.round((daysElapsed / daysTotal) * 100));

  const quickLinks = [
    { to: 'reports/daily', icon: ClipboardList, label: 'Daily Reports', count: project._count?.dailyReports, color: 'bg-blue-50 text-blue-600' },
    { to: 'schedule', icon: Calendar, label: 'Schedule', count: project._count?.activities, color: 'bg-green-50 text-green-600' },
    { to: 'documents', icon: Files, label: 'Documents', count: project._count?.documents, color: 'bg-purple-50 text-purple-600' },
    { to: 'risks', icon: Shield, label: 'Risks & NCRs', count: project._count?.ncrs, color: 'bg-red-50 text-red-600' },
  ];

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="card bg-gradient-to-r from-navy-900 to-primary-800 text-white">
        <div className="flex flex-wrap gap-4 items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge bg-white/20 text-white text-xs">{project.code}</span>
              <StatusBadge status={project.status} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{project.name}</h1>
            <p className="text-white/70 text-sm max-w-xl">{project.description}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link to="reports/daily/new" className="btn bg-construction-500 text-white hover:bg-construction-600">
              <ClipboardList size={16} /> New Report
            </Link>
            <Link to="reports/daily" className="btn bg-white/10 text-white hover:bg-white/20">
              View Reports
            </Link>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between text-sm text-white/80 mb-2">
              <span>Overall Progress</span>
              <span className="font-bold text-white">{project.progress}%</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-construction-400 rounded-full transition-all" style={{ width: `${project.progress}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm text-white/80 mb-2">
              <span>Schedule Progress</span>
              <span className="font-bold text-white">{scheduleProgress}%</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${scheduleProgress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Info + Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Info */}
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4">Project Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: Building2, label: 'Client', value: project.client },
              { icon: Building2, label: 'Contractor', value: project.contractor || '—' },
              { icon: Building2, label: 'Consultant', value: project.consultant || '—' },
              { icon: MapPin, label: 'Location', value: project.location },
              { icon: Calendar, label: 'Start Date', value: formatDate(project.startDate) },
              { icon: Calendar, label: 'End Date', value: formatDate(project.endDate) },
              { icon: DollarSign, label: 'Budget', value: project.budget ? formatCurrency(project.budget, project.currency) : '—' },
              { icon: DollarSign, label: 'Actual Cost', value: project.actualCost ? formatCurrency(project.actualCost, project.currency) : '—' },
              { icon: Users, label: 'Team Members', value: String(project.members?.length ?? 0) },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-2">
                <item.icon size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">{item.label}</p>
                  <p className="text-sm font-medium text-gray-800">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Team */}
          {project.members && project.members.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">Team</p>
              <div className="flex flex-wrap gap-2">
                {project.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1 text-xs">
                    <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {m.user?.name?.charAt(0)}
                    </div>
                    <span className="font-medium text-gray-700">{m.user?.name}</span>
                    <span className="text-gray-400">({getStatusLabel(m.role)})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="space-y-3">
          {quickLinks.map((link) => (
            <Link key={link.to} to={link.to}
              className="card-sm flex items-center gap-3 hover:shadow-card-lg transition-shadow group">
              <div className={`w-10 h-10 rounded-lg ${link.color} flex items-center justify-center flex-shrink-0`}>
                <link.icon size={18} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 group-hover:text-primary-600 text-sm">{link.label}</p>
                <p className="text-xs text-gray-400">{link.count ?? 0} items</p>
              </div>
              <ArrowRight size={16} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* Analytics Row */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card text-center">
            <div className="text-3xl font-bold text-primary-600 mb-1">{analytics.totalWorkingDays}</div>
            <div className="text-sm text-gray-600">Working Days</div>
            <div className="text-xs text-gray-400">last 30 days</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">{analytics.avgDailyManpower}</div>
            <div className="text-sm text-gray-600">Avg. Daily Workers</div>
            <div className="text-xs text-gray-400">last 30 days</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-orange-600 mb-1">{analytics.activityStats.delayed}</div>
            <div className="text-sm text-gray-600">Delayed Activities</div>
            <div className="text-xs text-gray-400">of {analytics.activityStats.total} total</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-red-600 mb-1">{analytics.ncrStats.open}</div>
            <div className="text-sm text-gray-600">Open NCRs</div>
            <div className="text-xs text-gray-400">{analytics.ncrStats.closed} closed</div>
          </div>
        </div>
      )}

      {/* Discipline Progress */}
      {analytics?.disciplineBreakdown && analytics.disciplineBreakdown.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Progress by Discipline</h3>
          <div className="space-y-3">
            {analytics.disciplineBreakdown.map((d) => (
              <div key={d.discipline} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-gray-700 flex-shrink-0">{getDisciplineLabel(d.discipline)}</div>
                <div className="flex-1">
                  <ProgressBar value={d.avgProgress} size="md" color={`bg-[${getDisciplineColor(d.discipline)}]`} />
                </div>
                <div className="text-sm font-bold text-gray-900 w-10 text-right">{d.avgProgress}%</div>
                <div className="text-xs text-gray-400 w-20 text-right">{d.completed}/{d.total} tasks</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Milestones */}
      {project.milestones && project.milestones.length > 0 && (
        <div className="card">
          <div className="section-header">
            <h3 className="font-semibold text-gray-900">Milestones</h3>
            <Link to="schedule?tab=milestones" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              View in Schedule <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {project.milestones.map((m) => {
              const isAchieved = m.status === 'ACHIEVED';
              const isDelayed = m.status === 'DELAYED';
              return (
                <Link key={m.id} to="schedule?tab=milestones"
                  className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 hover:bg-primary-50 hover:shadow-sm transition-all group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isAchieved ? 'bg-green-100' : isDelayed ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    {isAchieved ? <CheckCircle2 size={16} className="text-green-600" />
                      : isDelayed ? <AlertTriangle size={16} className="text-red-600" />
                      : <Flag size={16} className="text-gray-400" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-primary-700">{m.name}</p>
                    <p className="text-xs text-gray-400">
                      Planned: {formatDate(m.plannedDate)}
                      {m.actualDate && ` · Actual: ${formatDate(m.actualDate)}`}
                    </p>
                  </div>
                  <StatusBadge status={m.status} />
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
