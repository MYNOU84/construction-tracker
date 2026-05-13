import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { analyticsApi, projectsApi } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { formatDate, getStatusLabel } from '../utils/helpers';
import ProgressBar from '../components/ui/ProgressBar';
import StatusBadge from '../components/ui/StatusBadge';
import { PageLoader } from '../components/ui/LoadingSpinner';
import {
  FolderOpen, TrendingUp, ClipboardList, CheckCircle2, ArrowUpRight,
  Building2, ChevronLeft, ChevronRight, X,
} from 'lucide-react';

type KpiDrill = 'totalProjects' | 'avgProgress' | 'totalReports' | 'completedProjects' | null;

const STATUS_COLORS = {
  ACTIVE:    '#00d68f',
  PLANNING:  '#ffb800',
  ON_HOLD:   '#fb923c',
  COMPLETED: '#00d4ff',
  CANCELLED: '#ff4d6d',
};

const GRID_COLOR = 'rgba(255,255,255,0.06)';
const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#111c3a',
    border: '1px solid rgba(0,212,255,0.28)',
    borderRadius: 10,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  labelStyle: { color: '#e8eef8', fontWeight: 600 },
  itemStyle:  { color: '#8899bb' },
};

const KPI_CARDS = [
  { key: 'totalProjects',    icon: FolderOpen,    label: 'Total Projects',  changeKey: 'activeProjects', changeSuffix: 'active',  grad: 'linear-gradient(135deg,#00d4ff,#0099cc)', glow: 'rgba(0,212,255,0.35)' },
  { key: 'avgProgress',      icon: TrendingUp,    label: 'Avg. Progress',   change: 'across all projects',                         grad: 'linear-gradient(135deg,#00d68f,#009966)', glow: 'rgba(0,214,143,0.35)' },
  { key: 'totalReports',     icon: ClipboardList, label: 'Total Reports',   change: 'daily reports filed',                         grad: 'linear-gradient(135deg,#8c3aff,#6020cc)', glow: 'rgba(140,58,255,0.35)' },
  { key: 'completedProjects',icon: CheckCircle2,  label: 'Completed',       change: 'projects finished',                           grad: 'linear-gradient(135deg,#ff006e,#cc0050)', glow: 'rgba(255,0,110,0.35)' },
];

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.dashboard().then(r => r.data),
  });

  const { data: projectsList = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then(r => r.data),
  });

  const [featIdx, setFeatIdx] = useState(0);
  const [kpiDrill, setKpiDrill] = useState<KpiDrill>(null);

  /* prefer ACTIVE/PLANNING, fall back to all */
  const bannerList = useMemo(() => {
    const active = projectsList.filter(p => p.status === 'ACTIVE' || p.status === 'PLANNING');
    return active.length ? active : projectsList;
  }, [projectsList]);

  const proj = bannerList[featIdx] ?? null;

  /* wait for both queries */
  if (loadingStats || loadingProjects) return <PageLoader text="Loading dashboard..." />;

  const pieData = Object.entries(stats?.projectsByStatus ?? {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6 fade-in">

      {/* ══════════════════════════════════════════════════════════
          SECTION PRÉSENTATION GÉNÉRALE — exactement comme la page
          Présentation, en première ligne avant tout
          ══════════════════════════════════════════════════════════ */}
      {proj ? (
        <div className="card relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0d1428 0%, #111c3a 100%)',
            border: '1px solid var(--border-neon)',
            minHeight: 140,
          }}>

          {/* Barre de couleur en haut */}
          <div className="absolute top-0 left-0 right-0 h-1"
            style={{ background: 'linear-gradient(90deg, var(--cyan), var(--violet))' }} />

          <div className="flex items-start gap-5">

            {/* Icône projet */}
            <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--cyan), var(--violet))',
                boxShadow: '0 0 24px rgba(0,212,255,0.4)',
              }}>
              <Building2 size={28} className="text-white" />
            </div>

            {/* Nom + code + infos */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold mb-0.5" style={{ color: 'var(--text-1)' }}>
                {proj.name}
              </h2>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-sm" style={{ color: 'var(--cyan)' }}>{proj.code}</p>
                <StatusBadge status={proj.status} />
              </div>

              {/* Grille 4 infos — identique à la page Présentation */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {[
                  { l: 'Client',      v: proj.client      },
                  { l: 'Location',    v: proj.location    },
                  { l: 'Start Date',  v: formatDate(proj.startDate) },
                  { l: 'End Date',    v: formatDate(proj.endDate)   },
                ].map(({ l, v }) => (
                  <div key={l}>
                    <p style={{ color: 'var(--text-3)' }}>{l}</p>
                    <p className="font-semibold mt-0.5" style={{ color: 'var(--text-1)' }}>{v || '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Avancement — identique à la page Présentation */}
            <div className="text-right flex-shrink-0">
              <div className="text-3xl font-bold" style={{ color: 'var(--cyan)' }}>
                {proj.progress}%
              </div>
              <div className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>Progress</div>
              <ProgressBar value={proj.progress} size="sm" className="w-24" />
            </div>
          </div>

          {/* Navigation multi-projets + lien */}
          <div className="flex items-center justify-between mt-4 pt-3"
            style={{ borderTop: '1px solid var(--border)' }}>

            <Link to={`/projects/${proj.id}/presentation`}
              className="text-xs flex items-center gap-1"
              style={{ color: 'var(--cyan)' }}>
              View full presentation <ChevronRight size={12} />
            </Link>

            {bannerList.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFeatIdx(i => (i - 1 + bannerList.length) % bannerList.length)}
                  className="btn-secondary btn-sm p-1.5">
                  <ChevronLeft size={13} />
                </button>
                <span className="text-xs tabular-nums" style={{ color: 'var(--text-3)' }}>
                  {featIdx + 1} / {bannerList.length}
                </span>
                <button
                  onClick={() => setFeatIdx(i => (i + 1) % bannerList.length)}
                  className="btn-secondary btn-sm p-1.5">
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Aucun projet */
        <div className="card relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0d1428, #111c3a)', border: '1px solid var(--border-neon)', minHeight: 100 }}>
          <div className="absolute top-0 left-0 right-0 h-1"
            style={{ background: 'linear-gradient(90deg, var(--cyan), var(--violet))' }} />
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--cyan), var(--violet))', opacity: 0.4 }}>
              <Building2 size={28} className="text-white" />
            </div>
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-2)' }}>No projects</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Create a project to display its overview here.</p>
            </div>
            <Link to="/projects" className="btn-primary ml-auto">Create a project</Link>
          </div>
        </div>
      )}

      {/* ── Welcome ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">
            {getGreeting()}, <span style={{ color: 'var(--cyan)' }}>{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="page-subtitle">{formatDate(new Date().toISOString(), 'EEEE, dd MMMM yyyy')} — Construction Dashboard</p>
        </div>
        <Link to="/projects" className="btn-primary">
          <FolderOpen size={16} /> View All Projects
        </Link>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map((card) => {
          const raw = stats?.[card.key as keyof typeof stats] ?? 0;
          const value = card.key === 'avgProgress' ? `${raw}%` : raw;
          const change = card.changeKey
            ? `${stats?.[card.changeKey as keyof typeof stats] ?? 0} ${card.changeSuffix}`
            : card.change;
          const isActive = kpiDrill === card.key;
          return (
            <div
              key={card.label}
              className="card kpi-card flex items-center gap-4 relative overflow-hidden cursor-pointer select-none transition-all duration-150"
              style={isActive ? { boxShadow: `0 0 0 2px ${card.glow.replace('0.35','0.9')}, 0 0 24px ${card.glow}`, transform: 'scale(1.02)' } : undefined}
              title="Double-click to drill down"
              onDoubleClick={() => setKpiDrill(isActive ? null : card.key as KpiDrill)}
            >
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: card.grad }} />
              <div className="kpi-icon w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: card.grad, boxShadow: `0 0 22px ${card.glow}, 0 0 44px ${card.glow.replace('0.35', '0.12')}` }}>
                <card.icon size={22} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>{String(value)}</p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>{card.label}</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>{change}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── KPI Drill-down panel ── */}
      {kpiDrill && (
        <div className="card" style={{ border: '1px solid var(--border-neon)', background: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>
              {kpiDrill === 'totalProjects'     && 'All Projects'}
              {kpiDrill === 'avgProgress'       && 'Progress by Project'}
              {kpiDrill === 'totalReports'      && 'Reports by Project'}
              {kpiDrill === 'completedProjects' && 'Completed Projects'}
            </h3>
            <button onClick={() => setKpiDrill(null)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-3)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
              <X size={16} />
            </button>
          </div>

          {/* All Projects */}
          {kpiDrill === 'totalProjects' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {projectsList.map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--text-1)' }}>{p.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{p.code} — {p.location || '—'}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
              {projectsList.length === 0 && <p className="text-sm col-span-3 text-center py-6" style={{ color: 'var(--text-3)' }}>No projects found</p>}
            </div>
          )}

          {/* Progress by Project */}
          {kpiDrill === 'avgProgress' && (
            <div className="space-y-3">
              {[...projectsList].sort((a: any, b: any) => (b.progress ?? 0) - (a.progress ?? 0)).map((p: any) => (
                <div key={p.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium truncate max-w-xs" style={{ color: 'var(--text-2)' }}>{p.name}</span>
                    <span className="font-bold ml-2 flex-shrink-0" style={{ color: 'var(--cyan)' }}>{p.progress ?? 0}%</span>
                  </div>
                  <ProgressBar value={p.progress ?? 0} size="sm" />
                </div>
              ))}
              {projectsList.length === 0 && <p className="text-sm text-center py-6" style={{ color: 'var(--text-3)' }}>No projects</p>}
            </div>
          )}

          {/* Reports by Project */}
          {kpiDrill === 'totalReports' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {projectsList.map((p: any) => (
                <div key={p.id} className="p-3 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <p className="font-medium text-sm truncate mb-2" style={{ color: 'var(--text-1)' }}>{p.name}</p>
                  <div className="flex gap-4 text-xs">
                    <Link to={`/projects/${p.id}/reports/daily`} className="text-center hover:opacity-75 transition-opacity">
                      <div className="text-lg font-bold" style={{ color: 'var(--cyan)' }}>{p._count?.dailyReports ?? 0}</div>
                      <div style={{ color: 'var(--text-3)' }}>Reports</div>
                    </Link>
                    <Link to={`/projects/${p.id}/schedule`} className="text-center hover:opacity-75 transition-opacity">
                      <div className="text-lg font-bold" style={{ color: 'var(--violet)' }}>{p._count?.activities ?? 0}</div>
                      <div style={{ color: 'var(--text-3)' }}>Activities</div>
                    </Link>
                    <Link to={`/projects/${p.id}/schedule?tab=milestones`} className="text-center hover:opacity-75 transition-opacity">
                      <div className="text-lg font-bold" style={{ color: 'var(--green)' }}>{p._count?.milestones ?? 0}</div>
                      <div style={{ color: 'var(--text-3)' }}>Milestones</div>
                    </Link>
                  </div>
                </div>
              ))}
              {projectsList.length === 0 && <p className="text-sm col-span-3 text-center py-6" style={{ color: 'var(--text-3)' }}>No projects</p>}
            </div>
          )}

          {/* Completed Projects */}
          {kpiDrill === 'completedProjects' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {projectsList.filter((p: any) => p.status === 'COMPLETED').map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--text-1)' }}>{p.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{p.client || '—'} · {p.location || '—'}</p>
                  </div>
                </div>
              ))}
              {projectsList.filter((p: any) => p.status === 'COMPLETED').length === 0 && (
                <p className="text-sm col-span-3 text-center py-6" style={{ color: 'var(--text-3)' }}>No completed projects yet</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>Manpower Trend</h3>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Last 7 days across all projects</p>
            </div>
            <span className="badge badge-blue">Workers/Day</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats?.manpowerTrend ?? []}>
              <defs>
                <linearGradient id="mpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#4a5f85' }}
                tickFormatter={(d) => formatDate(d, 'dd MMM')} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#4a5f85' }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE}
                formatter={(v) => [v, 'Workers']}
                labelFormatter={(d) => formatDate(d, 'dd MMM yyyy')} />
              <Area type="monotone" dataKey="manpower" stroke="#00d4ff" strokeWidth={2.5}
                fill="url(#mpGrad)" dot={false}
                activeDot={{ r: 5, fill: '#00d4ff', stroke: '#0a0e1f', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="mb-4">
            <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>Projects by Status</h3>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>Current portfolio overview</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="45%" innerRadius={52} outerRadius={82}
                paddingAngle={4} dataKey="value" strokeWidth={0}>
                {pieData.map((entry) => (
                  <Cell key={entry.name}
                    fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || '#4a5f85'} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} formatter={(v, n) => [v, getStatusLabel(String(n))]} />
              <Legend formatter={(v) => getStatusLabel(v)} iconType="circle"
                wrapperStyle={{ fontSize: 11, color: '#8899bb' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Active Projects table ── */}
      <div className="card">
        <div className="section-header">
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>Active Projects</h3>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>Progress overview and key metrics</p>
          </div>
          <Link to="/projects" className="btn-secondary btn-sm">
            View All <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Project</th><th>Status</th><th>Progress</th>
                <th>End Date</th><th>Reports</th><th></th>
              </tr>
            </thead>
            <tbody>
              {(stats?.projects ?? []).map((p) => (
                <tr key={p.id}>
                  <td>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--text-1)' }}>{p.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>{p.code}</p>
                    </div>
                  </td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <ProgressBar value={p.progress} className="flex-1" size="sm" />
                      <span className="text-xs font-medium w-8" style={{ color: 'var(--cyan)' }}>{p.progress}%</span>
                    </div>
                  </td>
                  <td className="text-xs" style={{ color: 'var(--text-3)' }}>{formatDate(p.endDate)}</td>
                  <td><span className="badge badge-gray">{p.reportCount}</span></td>
                  <td>
                    <Link to={`/projects/${p.id}`} className="btn-secondary btn-sm">View</Link>
                  </td>
                </tr>
              ))}
              {!stats?.projects?.length && (
                <tr>
                  <td colSpan={6} className="text-center py-8" style={{ color: 'var(--text-3)' }}>
                    No projects found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
