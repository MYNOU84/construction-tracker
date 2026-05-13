import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, projectsApi } from '../api/endpoints';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart,
  Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import { formatDate, getDisciplineColor, getDisciplineLabel } from '../utils/helpers';
import ProgressBar from '../components/ui/ProgressBar';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { TrendingUp, BarChart2, Users, Activity, X } from 'lucide-react';

type DrillDown = 'totalProjects' | 'activeProjects' | 'avgProgress' | 'totalReports' | null;

export default function AnalyticsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [period, setPeriod] = useState(30);
  const [drillDown, setDrillDown] = useState<DrillDown>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then(r => r.data),
  });

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['project-analytics', selectedProjectId, period],
    queryFn: () => analyticsApi.project(selectedProjectId, period).then(r => r.data),
    enabled: !!selectedProjectId,
  });

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.dashboard().then(r => r.data),
  });

  const COLORS = ['#3b82f6', '#f97316', '#8b5cf6', '#10b981', '#eab308', '#ef4444'];

  return (
    <div className="space-y-6 fade-in">
      <div className="section-header">
        <div>
          <h1 className="page-title">Analytics & Reports</h1>
          <p className="page-subtitle">Performance insights and productivity metrics</p>
        </div>
        <div className="flex gap-3">
          <select className="input w-auto"
            value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
            <option value="">Select Project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="input w-auto" value={period} onChange={e => setPeriod(Number(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Portfolio Overview */}
      {dashboard && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {([
              { key: 'totalProjects' as DrillDown,  label: 'Total Projects',  value: dashboard.totalProjects,       icon: BarChart2,   color: 'bg-blue-500',   ring: 'ring-blue-400' },
              { key: 'activeProjects' as DrillDown, label: 'Active Projects', value: dashboard.activeProjects,      icon: Activity,    color: 'bg-green-500',  ring: 'ring-green-400' },
              { key: 'avgProgress' as DrillDown,    label: 'Avg Progress',    value: `${dashboard.avgProgress}%`,   icon: TrendingUp,  color: 'bg-purple-500', ring: 'ring-purple-400' },
              { key: 'totalReports' as DrillDown,   label: 'Total Reports',   value: dashboard.totalReports,        icon: Users,       color: 'bg-orange-500', ring: 'ring-orange-400' },
            ]).map(k => (
              <div
                key={k.label}
                className={`card flex items-center gap-3 cursor-pointer select-none transition-all duration-150
                  hover:scale-[1.02] hover:shadow-lg
                  ${drillDown === k.key ? `ring-2 ${k.ring} scale-[1.02]` : ''}`}
                title="Double-click to drill down"
                onDoubleClick={() => setDrillDown(drillDown === k.key ? null : k.key)}
              >
                <div className={`w-10 h-10 ${k.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <k.icon size={18} className="text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-2xl font-bold text-gray-900">{k.value}</div>
                  <div className="text-xs text-gray-500">{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Drill-down panel */}
          {drillDown && (
            <div className="card border-2 border-dashed border-gray-200 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  {drillDown === 'totalProjects'  && 'All Projects'}
                  {drillDown === 'activeProjects' && 'Active Projects'}
                  {drillDown === 'avgProgress'    && 'Progress by Project'}
                  {drillDown === 'totalReports'   && 'Reports by Project'}
                </h3>
                <button onClick={() => setDrillDown(null)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={16} />
                </button>
              </div>

              {/* Total Projects */}
              {drillDown === 'totalProjects' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {projects.map((p: any) => (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.code} — {p.location || '—'}</p>
                      </div>
                      <span className={`badge text-xs flex-shrink-0 ${
                        p.status === 'ACTIVE' ? 'badge-green' :
                        p.status === 'COMPLETED' ? 'badge-blue' :
                        p.status === 'ON_HOLD' ? 'badge-orange' : 'badge-gray'
                      }`}>{p.status}</span>
                    </div>
                  ))}
                  {projects.length === 0 && <p className="text-sm text-gray-400 col-span-3 text-center py-6">No projects found</p>}
                </div>
              )}

              {/* Active Projects */}
              {drillDown === 'activeProjects' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {projects.filter((p: any) => p.status === 'ACTIVE').map((p: any) => (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
                      <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.client || '—'} · {p.location || '—'}</p>
                      </div>
                    </div>
                  ))}
                  {projects.filter((p: any) => p.status === 'ACTIVE').length === 0 && (
                    <p className="text-sm text-gray-400 col-span-3 text-center py-6">No active projects</p>
                  )}
                </div>
              )}

              {/* Avg Progress */}
              {drillDown === 'avgProgress' && (
                <div className="space-y-3">
                  {[...projects].sort((a: any, b: any) => (b.progress ?? 0) - (a.progress ?? 0)).map((p: any) => (
                    <div key={p.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700 truncate max-w-xs">{p.name}</span>
                        <span className="font-bold text-gray-900 ml-2 flex-shrink-0">{p.progress ?? 0}%</span>
                      </div>
                      <ProgressBar value={p.progress ?? 0} size="sm" />
                    </div>
                  ))}
                  {projects.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No projects</p>}
                </div>
              )}

              {/* Total Reports */}
              {drillDown === 'totalReports' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {projects.map((p: any) => (
                    <div key={p.id} className="p-3 rounded-lg bg-orange-50 border border-orange-100">
                      <p className="font-medium text-gray-900 text-sm truncate mb-2">{p.name}</p>
                      <div className="flex gap-3 text-xs">
                        <div className="text-center">
                          <div className="font-bold text-blue-600 text-lg">{p._count?.dailyReports ?? 0}</div>
                          <div className="text-gray-400">Reports</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-purple-600 text-lg">{p._count?.activities ?? 0}</div>
                          <div className="text-gray-400">Activities</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-green-600 text-lg">{p._count?.milestones ?? 0}</div>
                          <div className="text-gray-400">Milestones</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {projects.length === 0 && <p className="text-sm text-gray-400 col-span-3 text-center py-6">No projects</p>}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!selectedProjectId ? (
        <div className="card text-center py-16">
          <BarChart2 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Select a project to view detailed analytics</p>
          <p className="text-xs text-gray-400 mt-1">Choose from the dropdown above</p>
        </div>
      ) : isLoading ? (
        <PageLoader text="Loading analytics..." />
      ) : analytics ? (
        <div className="space-y-6">
          {/* Manpower Trend */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">Daily Manpower Trend</h3>
                <p className="text-xs text-gray-500">Last {period} days · Total: {analytics.totalManpowerDays} man-days</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary-600">{analytics.avgDailyManpower}</p>
                <p className="text-xs text-gray-400">avg/day</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={analytics.manpowerTrend}>
                <defs>
                  <linearGradient id="mpG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => formatDate(d, 'dd MMM')} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={d => formatDate(d, 'dd MMM yyyy')} formatter={v => [v, 'Workers']} />
                <Area type="monotone" dataKey="manpower" stroke="#3b82f6" strokeWidth={2} fill="url(#mpG)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Discipline & Activity Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Discipline Breakdown */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Progress by Discipline</h3>
              {analytics.disciplineBreakdown.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No activities data</p>
              ) : (
                <div className="space-y-3">
                  {analytics.disciplineBreakdown.map(d => (
                    <div key={d.discipline}>
                      <div className="flex justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getDisciplineColor(d.discipline) }} />
                          <span className="font-medium text-gray-700">{getDisciplineLabel(d.discipline)}</span>
                          <span className="text-xs text-gray-400">({d.completed}/{d.total})</span>
                        </div>
                        <span className="font-bold text-gray-900">{d.avgProgress}%</span>
                      </div>
                      <ProgressBar value={d.avgProgress} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity Status Pie */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Activity Status Distribution</h3>
              {analytics.activityStats.total === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No activities</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Not Started', value: analytics.activityStats.notStarted },
                          { name: 'In Progress', value: analytics.activityStats.inProgress },
                          { name: 'Completed', value: analytics.activityStats.completed },
                          { name: 'Delayed', value: analytics.activityStats.delayed },
                        ].filter(d => d.value > 0)}
                        cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                        {['#94a3b8', '#3b82f6', '#22c55e', '#ef4444'].map((c, i) => <Cell key={i} fill={c} />)}
                      </Pie>
                      <Tooltip />
                      <Legend iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      { label: 'Total', v: analytics.activityStats.total, c: 'text-gray-700' },
                      { label: 'Completed', v: analytics.activityStats.completed, c: 'text-green-600' },
                      { label: 'In Progress', v: analytics.activityStats.inProgress, c: 'text-blue-600' },
                      { label: 'Delayed', v: analytics.activityStats.delayed, c: 'text-red-600' },
                    ].map(s => (
                      <div key={s.label} className="text-center bg-gray-50 rounded-lg p-2">
                        <div className={`text-xl font-bold ${s.c}`}>{s.v}</div>
                        <div className="text-xs text-gray-500">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Milestone Timeline */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Milestone Timeline</h3>
            {analytics.milestoneTimeline.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No milestones</p>
            ) : (
              <div className="space-y-3">
                {analytics.milestoneTimeline.map(m => (
                  <div key={m.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      m.status === 'ACHIEVED' ? 'bg-green-500' :
                      m.status === 'DELAYED' ? 'bg-red-500' :
                      m.status === 'AT_RISK' ? 'bg-orange-500' : 'bg-gray-300'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-500">
                        Planned: {formatDate(m.plannedDate)}
                        {m.actualDate && ` · Actual: ${formatDate(m.actualDate)}`}
                        {m.variance !== null && m.variance !== undefined && (
                          <span className={m.variance > 0 ? 'text-red-500' : 'text-green-500'}>
                            {' '}({m.variance > 0 ? '+' : ''}{m.variance} days)
                          </span>
                        )}
                      </p>
                    </div>
                    <span className={`badge ${m.status === 'ACHIEVED' ? 'badge-green' : m.status === 'DELAYED' ? 'badge-red' : m.status === 'AT_RISK' ? 'badge-orange' : 'badge-gray'}`}>
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Risk Matrix & Weather */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Risk Summary</h3>
              <div className="space-y-2">
                {analytics.riskMatrix.slice(0, 8).map(r => (
                  <div key={r.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                      r.riskScore >= 15 ? 'bg-red-500' : r.riskScore >= 10 ? 'bg-orange-500' : r.riskScore >= 6 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}>
                      {r.riskScore}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{r.title}</p>
                      <p className="text-xs text-gray-400">{r.category}</p>
                    </div>
                    <span className={`badge ${r.status === 'OPEN' ? 'badge-red' : r.status === 'MITIGATED' ? 'badge-blue' : 'badge-green'}`}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Weather Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.weatherBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="weather" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Days" />
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="card-sm text-center !p-2">
                  <div className="text-lg font-bold text-blue-600">{analytics.totalWorkingDays}</div>
                  <div className="text-xs text-gray-500">Working Days</div>
                </div>
                <div className="card-sm text-center !p-2">
                  <div className="text-lg font-bold text-green-600">{analytics.ncrStats.closed}</div>
                  <div className="text-xs text-gray-500">NCRs Closed</div>
                </div>
                <div className="card-sm text-center !p-2">
                  <div className="text-lg font-bold text-red-600">{analytics.ncrStats.open}</div>
                  <div className="text-xs text-gray-500">NCRs Open</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
