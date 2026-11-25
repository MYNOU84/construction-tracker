import { create } from 'zustand';

export type Theme = 'dark' | 'light';

const THEME_KEY = 'bt-theme';

function readTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#F5F1E8' : '#050505');
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* storage unavailable */ }
}

interface UiState {
  theme: Theme;
  sidebarOpen: boolean;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: readTheme(),
  sidebarOpen: false,
  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    set({ theme: next });
  },
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
