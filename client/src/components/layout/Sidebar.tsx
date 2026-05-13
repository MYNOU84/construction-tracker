import { NavLink, useParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/helpers';
import {
  LayoutDashboard, FolderOpen, FileText, Calendar, BarChart2,
  Users, Building2, ClipboardList, Shield, Files, TrendingUp,
  ChevronRight, LogOut, Settings, Truck, HardHat, BookOpen, Map, ShieldCheck, FileStack, Gauge
} from 'lucide-react';

const mainNav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/analytics', icon: TrendingUp, label: 'Analytics' },
  { to: '/users', icon: Users, label: 'Users', roles: ['ADMIN', 'PROJECT_MANAGER'] },
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

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { projectId } = useParams();
  const location = useLocation();
  const isProjectRoute = !!projectId;

  return (
    <div className="w-64 bg-navy-900 flex flex-col h-screen fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-navy-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--cyan), var(--violet))', boxShadow: '0 0 16px rgba(0,212,255,0.4)' }}>
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">BuildTrack Pro</p>
            <p className="text-gray-400 text-xs">Construction Manager</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        {/* Main Nav */}
        <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Main Menu</p>
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
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        {/* Project Nav */}
        {isProjectRoute && (
          <>
            <div className="my-3 border-t border-navy-800" />
            <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Project</p>
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
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </>
        )}
      </nav>

      {/* User Info */}
      <div className="px-3 py-4 border-t border-navy-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-navy-800">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--cyan), var(--violet))' }}>
            <span className="text-white text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-gray-400 text-xs truncate">{user?.role?.replace('_', ' ')}</p>
          </div>
          <button onClick={logout} className="text-gray-400 hover:text-red-400 transition-colors" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
