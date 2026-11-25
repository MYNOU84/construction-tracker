import { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, CheckCheck, AlertTriangle, ArrowLeft, TrendingUp, ClipboardList, CalendarClock, Menu, Sun, Moon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../../api/endpoints';
import { formatDate } from '../../utils/helpers';
import { useUiStore } from '../../store/uiStore';

const getBreadcrumbs = (pathname: string) => {
  const parts = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; to: string }[] = [{ label: 'Home', to: '/' }];
  let path = '';
  for (const part of parts) {
    path += `/${part}`;
    const label = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
    crumbs.push({ label, to: path });
  }
  return crumbs;
};

type Notif = {
  id: string;
  projectId: string;
  type: 'warning' | 'info' | 'success' | 'progress';
  title: string;
  desc: string;
  time: string;
  route: string;
};

export default function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const crumbs = getBreadcrumbs(pathname);
  const [showNotif, setShowNotif] = useState(false);
  const [read, setRead] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const canGoBack = pathname !== '/';
  const { theme, toggleTheme, setSidebarOpen } = useUiStore();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then(r => r.data),
    staleTime: 60000,
  });

  const notifications: Notif[] = [];
  projects.forEach((p: any) => {
    if (p.status === 'COMPLETED') return; // skip completed — no alerts needed

    const now = Date.now();
    const endMs = new Date(p.endDate).getTime();
    const startMs = new Date(p.startDate).getTime();
    const daysLeft = Math.ceil((endMs - now) / 86400000);
    const totalDays = Math.max(1, Math.ceil((endMs - startMs) / 86400000));
    const daysElapsed = Math.ceil((now - startMs) / 86400000);
    const progress = p.progress ?? 0;
    const reportCount = p._count?.dailyReports ?? 0;

    // 1. Overdue
    if (daysLeft < 0) {
      notifications.push({ id: `overdue-${p.id}`, projectId: p.id, type: 'warning', title: 'Project Overdue', desc: `${p.name} is ${Math.abs(daysLeft)} days past deadline (${progress}% done)`, time: p.endDate, route: `/projects/${p.id}` });
      return; // don't stack more alerts on the same overdue project
    }

    // 2. Deadline approaching (≤ 14 days)
    if (daysLeft <= 14) {
      notifications.push({ id: `due-${p.id}`, projectId: p.id, type: 'warning', title: 'Deadline in ' + daysLeft + ' day' + (daysLeft === 1 ? '' : 's'), desc: `${p.name} — ${progress}% complete, ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`, time: p.endDate, route: `/projects/${p.id}` });
    } else if (daysLeft <= 30) {
      notifications.push({ id: `due-${p.id}`, projectId: p.id, type: 'info', title: 'Deadline Approaching', desc: `${p.name} ends in ${daysLeft} days — currently at ${progress}%`, time: p.endDate, route: `/projects/${p.id}` });
    }

    // 3. Project on hold
    if (p.status === 'ON_HOLD') {
      notifications.push({ id: `hold-${p.id}`, projectId: p.id, type: 'warning', title: 'Project On Hold', desc: `${p.name} is paused — last progress: ${progress}%`, time: p.updatedAt, route: `/projects/${p.id}` });
    }

    // 4. Delayed status
    if (p.status === 'DELAYED') {
      notifications.push({ id: `delayed-${p.id}`, projectId: p.id, type: 'warning', title: 'Project Delayed', desc: `${p.name} is marked delayed at ${progress}% — ${reportCount} report${reportCount === 1 ? '' : 's'} filed`, time: p.updatedAt, route: `/projects/${p.id}/reports/daily` });
    }

    // 5. Behind schedule: more than 40% of time elapsed but progress < half of expected
    if (p.status === 'IN_PROGRESS' && daysElapsed > 0 && totalDays > 0) {
      const pctElapsed = daysElapsed / totalDays;
      const expectedProgress = Math.min(100, pctElapsed * 100);
      if (pctElapsed >= 0.4 && progress < expectedProgress * 0.5) {
        notifications.push({ id: `behind-${p.id}`, projectId: p.id, type: 'warning', title: 'Behind Schedule', desc: `${p.name} is at ${progress}% — expected ~${Math.round(expectedProgress)}% by now`, time: p.updatedAt, route: `/projects/${p.id}` });
      }
    }

    // 6. Reports + progress — one combined notification per project that has any reports
    if (reportCount > 0) {
      const hasProgress = progress > 0;
      notifications.push({
        id: `report-${p.id}`,
        projectId: p.id,
        type: progress >= 25 ? 'progress' : 'success',
        title: progress >= 25 ? `Work Progress — ${progress}%` : 'Reports Active',
        desc: hasProgress
          ? `${p.name} · ${progress}% complete · ${reportCount} report${reportCount === 1 ? '' : 's'} filed · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
          : `${p.name} · ${reportCount} daily report${reportCount === 1 ? '' : 's'} filed`,
        time: p.updatedAt,
        route: `/projects/${p.id}/reports/daily`,
      });
    }

    // 7. No daily reports filed for an active project
    if (p.status === 'IN_PROGRESS' && reportCount === 0) {
      notifications.push({ id: `no-report-${p.id}`, projectId: p.id, type: 'info', title: 'No Reports Filed', desc: `${p.name} has no daily reports — start tracking site activity`, time: p.updatedAt, route: `/projects/${p.id}/reports/daily` });
    }
  });

  const unread = !read && notifications.length > 0;

  const icons: Record<string, JSX.Element> = {
    warning:  <AlertTriangle size={14} style={{ color: 'var(--orange)', flexShrink: 0, marginTop: 1 }} />,
    info:     <CalendarClock size={14} style={{ color: 'var(--info)',   flexShrink: 0, marginTop: 1 }} />,
    success:  <ClipboardList size={14} style={{ color: 'var(--green)',  flexShrink: 0, marginTop: 1 }} />,
    progress: <TrendingUp    size={14} style={{ color: 'var(--accent)',  flexShrink: 0, marginTop: 1 }} />,
  };

  const typeOrder = ['warning', 'info', 'progress', 'success'];
  const sortedNotifications = [...notifications].sort(
    (a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)
  );

  const handleNotifClick = (n: Notif) => {
    setShowNotif(false);
    navigate(n.route);
  };

  return (
    <header className="h-16 flex items-center px-3 sm:px-6 gap-2 sm:gap-3 sticky top-0 z-20"
      style={{
        background: 'color-mix(in srgb, var(--bg-card) 88%, transparent)',
        backdropFilter: 'saturate(140%) blur(10px)',
        WebkitBackdropFilter: 'saturate(140%) blur(10px)',
        borderBottom: '1px solid var(--border)',
      }}>

      {/* Mobile / tablet: open navigation drawer */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="icon-btn lg:hidden flex-shrink-0"
        aria-label="Open navigation">
        <Menu size={18} />
      </button>

      {/* Back button */}
      {canGoBack && (
        <button
          onClick={() => navigate(-1)}
          className="icon-btn flex-shrink-0 hidden sm:inline-flex"
          title="Go back"
          aria-label="Go back">
          <ArrowLeft size={16} />
        </button>
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm flex-1 min-w-0" aria-label="Breadcrumb">
        {crumbs.slice(-3).map((crumb, i, arr) => (
          <span key={crumb.to} className={`items-center gap-1 min-w-0 ${i === arr.length - 1 ? 'flex' : 'hidden md:flex'}`}>
            {i > 0 && <ChevronRight size={13} className="hidden md:block" style={{ color: 'var(--text-3)', flexShrink: 0 }} />}
            {i === arr.length - 1
              ? <span className="font-semibold truncate" style={{ color: 'var(--text-1)' }}>{crumb.label}</span>
              : <Link to={crumb.to} className="crumb-link truncate">{crumb.label}</Link>
            }
          </span>
        ))}
      </nav>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="icon-btn flex-shrink-0"
        title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      {/* Notification Bell */}
      <div className="relative flex-shrink-0" ref={ref}>
        <button
          onClick={() => { setShowNotif(v => !v); setRead(true); }}
          className="icon-btn relative"
          style={showNotif ? { color: 'var(--accent)', borderColor: 'var(--border-accent)', background: 'var(--accent-faint)' } : undefined}
          aria-label="Notifications"
          aria-expanded={showNotif}>
          <Bell size={17} />
          {unread && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{ background: 'var(--red)', color: '#fff' }}>
              {sortedNotifications.length}
            </span>
          )}
        </button>

        {showNotif && (
          <div className="absolute right-0 top-full mt-2 w-[min(340px,calc(100vw-24px))] rounded-xl z-50 overflow-hidden fade-in"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-accent)', boxShadow: 'var(--shadow-lg)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              <span className="font-display font-semibold text-[15px]" style={{ color: 'var(--text-1)' }}>Notifications</span>
              {sortedNotifications.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {sortedNotifications.filter(n => n.type === 'warning').length > 0 && (
                    <span className="badge badge-orange">
                      {sortedNotifications.filter(n => n.type === 'warning').length} warning{sortedNotifications.filter(n => n.type === 'warning').length > 1 ? 's' : ''}
                    </span>
                  )}
                  {sortedNotifications.filter(n => n.type !== 'warning').length > 0 && (
                    <span className="badge badge-gold">
                      {sortedNotifications.filter(n => n.type !== 'warning').length} info
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {sortedNotifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <CheckCheck size={28} className="mx-auto mb-2" style={{ color: 'var(--green)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>All caught up!</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>No active alerts</p>
                </div>
              ) : (
                sortedNotifications.slice(0, 10).map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className="menu-row w-full flex gap-3 px-4 py-3 text-left"
                    style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="mt-0.5">{icons[n.type]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>{n.title}</p>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-2)', whiteSpace: 'normal', wordBreak: 'break-word' }}>{n.desc}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{formatDate(n.time)}</p>
                    </div>
                    <ChevronRight size={13} style={{ color: 'var(--text-3)', flexShrink: 0, marginTop: 2 }} />
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5"
              style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              <Link to="/projects" onClick={() => setShowNotif(false)}
                className="text-xs font-semibold transition-colors"
                style={{ color: 'var(--accent)' }}>
                View all projects →
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
