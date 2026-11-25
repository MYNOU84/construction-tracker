import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Notice from '../ui/Notice';
import { useUiStore } from '../../store/uiStore';

export default function Layout() {
  const { pathname } = useLocation();
  const { sidebarOpen, setSidebarOpen } = useUiStore();

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
        <main className="flex-1 p-4 sm:p-6 xl:p-8 min-w-0">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
      <Notice />
    </div>
  );
}
