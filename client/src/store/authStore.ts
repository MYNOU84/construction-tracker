import { create } from 'zustand';
import type { User } from '../types';
import api from '../api/client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  /** Confirms the cookie session with the server; clears local state if it is gone. */
  refresh: () => Promise<void>;
}

// Only the public profile is cached locally (for a fast first paint); the
// session itself lives in an httpOnly cookie.
localStorage.removeItem('token'); // left over from the previous token-in-storage scheme
const storedUser = localStorage.getItem('user');

export const useAuthStore = create<AuthState>((set) => ({
  user: storedUser ? JSON.parse(storedUser) : null,
  isAuthenticated: !!storedUser,
  login: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },
  logout: async () => {
    try { await api.post('/auth/logout'); } catch { /* cookie may already be gone */ }
    localStorage.removeItem('user');
    set({ user: null, isAuthenticated: false });
  },
  updateUser: (updates) =>
    set((state) => {
      const updated = state.user ? { ...state.user, ...updates } : null;
      if (updated) localStorage.setItem('user', JSON.stringify(updated));
      return { user: updated };
    }),
  refresh: async () => {
    try {
      const { data } = await api.get<User>('/auth/profile');
      localStorage.setItem('user', JSON.stringify(data));
      set({ user: data, isAuthenticated: true });
    } catch {
      localStorage.removeItem('user');
      set({ user: null, isAuthenticated: false });
    }
  },
}));
