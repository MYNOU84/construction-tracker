import { useEffect } from 'react';
import { FileViewerHost } from '../ui/FileViewer';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Notice from '../ui/Notice';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { enableDemoReadOnly, enableReadOnly, type ControlAction } from './demoReadOnly';
import { useProjectPermissions } from '../../hooks/useProjectPermissions';
import type { PermissionModule } from '../../types';
import { Eye } from 'lucide-react';

/** Project page (path segment after /projects/:id) → the permission modules its controls write to. */
const PAGE_MODULES: Record<string, PermissionModule[]> = {
  '': ['project'], presentation: ['project'], map: ['project'], performance: ['project'], hse: ['ncrs'],
  'reports/daily': ['daily'], 'reports/weekly': ['weekly'], 'reports/monthly': ['monthly'],
  schedule: ['schedule', 'documents'], risks: ['risks', 'ncrs'], plant: ['plant'], resources: ['resources'],
  documents: ['documents'], contracts: ['documents'],
};

const projectPage = (pathname: string) => {
  const m = /^\/projects\/([^/]+)(?:\/(reports\/[a-z]+|[a-z]+))?/.exec(pathname);
  return m ? { projectId: m[1], modules: PAGE_MODULES[m[2] ?? ''] ?? ['project' as PermissionModule] } : null;
};

export default function Layout() {
  const { pathname } = useLocation();
  const { sidebarOpen, setSidebarOpen } = useUiStore();
  const demo = !!useAuthStore(s => s.user?.demo);

  // Public demo accounts are read-only (enforced by the server); hide write controls in the interface too.
  useEffect(() => (demo ? enableDemoReadOnly() : undefined), [demo]);

  // On a project page, hide the controls the user's role on that project may not use (also enforced by the server).
  const page = demo ? null : projectPage(pathname);
  const { data: perms } = useProjectPermissions(page?.projectId);
  const modulesKey = page?.modules.join(',') ?? '';
  useEffect(() => {
    if (!page) return undefined;
    const modules = modulesKey.split(',') as PermissionModule[];
    const has = (a: string) => modules.some(m => perms?.permissions?.[m]?.includes(a as never));
    // Until the permissions arrive nothing that writes is shown.
    const allowed = (a: ControlAction) => (a === 'write' ? has('create') || has('edit') : has(a));
    return enableReadOnly(allowed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.projectId, modulesKey, perms]);

  // Close the mobile drawer on navigation
  useEffect(() => { setSidebarOpen(false); }, [pathname, setSidebarOpen]);

  // Close the drawer with Escape
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sidebarOpen, setSidebarOpen]);

  return (
    <div className="min-h-screen">
      <Sidebar />
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden fade-in"
          style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(2px)' }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="lg:ml-64 flex flex-col min-h-screen min-w-0">
        <Header />
        {demo && (
          <div className="px-4 sm:px-6 xl:px-8 py-2 text-xs flex items-center gap-2" role="status"
            style={{ background: 'var(--accent-soft)', color: 'var(--text-2)', borderBottom: '1px solid var(--border)' }}>
            <Eye size={14} style={{ color: 'var(--accent)' }} />
            Public demo — read-only access to fictional projects. You can browse and export; changes are disabled.
          </div>
        )}
        <main className="flex-1 p-4 sm:p-6 xl:p-8 min-w-0">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
            <FileViewerHost />
          </div>
        </main>
      </div>
      <Notice />
    </div>
  );
}
