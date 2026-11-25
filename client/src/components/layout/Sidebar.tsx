import { NavLink, useParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { cn } from '../../utils/helpers';
import BrandMark from '../ui/BrandMark';
import {
  LayoutDashboard, FolderOpen, FileText, Calendar, BarChart2,
  Users, Building2, ClipboardList, Shield, Files, TrendingUp,
  LogOut, Truck, HardHat, BookOpen, Map, ShieldCheck, FileStack, Gauge, X,
} from 'lucide-react';

const mainNav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/analytics', icon: TrendingUp, label: 'Analytics' },
  { to: '/users', icon: Users, label: 'Users', roles: ['ADMIN'] },
];

const projectNav = [
  { to: '', icon: Building2, label: 'Overview' },
  { to: '/performance', icon: Gauge, label: 'Performance & KPIs' },
  { to: '/reports/daily', icon: ClipboardList, label: 'Daily Reports' },
  { to: '/reports/weekly', icon: FileText, label: 'Weekly Reports' },
  { to: '/reports/monthly', icon: BarChart2, label: 'Monthly Reports' },
  { to: '/schedule', icon: Calendar, label: 'Schedule & Tasks' },
  { to: '/documents', icon: Files, label: 'Documents' },
  { to: '/contracts', icon: FileStack, label: 'Contracts & Submittals' },
  { to: '/hse', icon: ShieldCheck, label: 'HSE' },
  { to: '/risks', icon: Shield, label: 'Risks & NCRs' },
  { to: '/plant', icon: Truck, label: 'Plant & Equipment' },
  { to: '/resources', icon: HardHat, label: 'Site Resources' },
  { to: '/presentation', icon: BookOpen, label: 'Presentation' },
  { to: '/map', icon: Map, label: 'Carte du Site' },
];

// The sidebar stays black in both themes: it is the architectural frame of the app.
export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { projectId } = useParams();
  const location = useLocation();
  const isProjectRoute = !!projectId;
  const { sidebarOpen, setSidebarOpen } = useUiStore();

  return (
    <aside
      className={cn(
        'w-64 flex flex-col h-[100dvh] fixed left-0 top-0 z-40 transition-transform duration-300 ease-out lg:translate-x-0',
        sidebarOpen ? 'translate-x-0 shadow-card-lg' : '-translate-x-full',
      )}
      style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid rgba(201,152,44,0.16)' }}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(245,241,232,0.07)' }}>
        <div className="flex items-center gap-3">
          <BrandMark />
          <div className="flex-1 min-w-0">
            <p className="font-display text-[17px] leading-tight" style={{ color: '#F5F1E8' }}>
              BuildTrack <span style={{ color: '#E0BC63' }}>Pro</span>
            </p>
            <p className="text-[10px] uppercase mt-0.5" style={{ color: 'rgba(245,241,232,0.45)', letterSpacing: '0.2em' }}>
              Construction Manager
            </p>
          </div>
          <button
            className="lg:hidden p-1.5 rounded-md"
            style={{ color: 'rgba(245,241,232,0.6)' }}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        <p className="sidebar-heading">Main Menu</p>
        {mainNav.map((item) => {
          const show = !item.roles || (user && item.roles.includes(user.role));
          if (!show) return null;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => cn('sidebar-link', isActive && 'sidebar-link-active')}
            >
              <item.icon size={17} strokeWidth={1.75} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        {isProjectRoute && (
          <>
            <div className="my-4 h-px" style={{ background: 'linear-gradient(90deg, rgba(201,152,44,0.35), transparent)' }} />
            <p className="sidebar-heading">Project</p>
            {projectNav.map((item) => {
              const fullPath = `/projects/${projectId}${item.to}`;
              const isActive = item.to === ''
                ? location.pathname === `/projects/${projectId}`
                : location.pathname.startsWith(fullPath);
              return (
                <NavLink
                  key={item.to}
                  to={fullPath}
                  className={cn('sidebar-link', isActive && 'sidebar-link-active')}
                >
                  <item.icon size={17} strokeWidth={1.75} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </>
        )}
      </nav>

      {/* User Info */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(245,241,232,0.07)' }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
          style={{ background: 'rgba(245,241,232,0.04)', border: '1px solid rgba(245,241,232,0.06)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(201,152,44,0.14)', border: '1px solid rgba(201,152,44,0.5)' }}>
            <span className="text-xs font-semibold" style={{ color: '#E0BC63' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: '#F5F1E8' }}>{user?.name}</p>
            <p className="text-[11px] truncate uppercase" style={{ color: 'rgba(245,241,232,0.5)', letterSpacing: '0.08em' }}>
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
          <button onClick={logout} className="sidebar-logout" title="Logout" aria-label="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
