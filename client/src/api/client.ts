import axios from 'axios';

/**
 * Sessions use an httpOnly cookie set by the server; the token is never
 * readable from JavaScript. X-Requested-With is the CSRF header the API
 * requires on every state-changing request.
 */
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
});

/** Shows a short message in the app-wide notice banner (see components/ui/Notice). */
export const notify = (message: string) =>
  window.dispatchEvent(new CustomEvent('bt:notice', { detail: message }));

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const status = error.response?.status;
    const url: string = error.config?.url ?? '';
    if (status === 401 && !url.startsWith('/auth/')) {
      // Session expired or revoked: clear local state and go to sign-in once.
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    } else if (status === 403 && error.response?.data?.demo) {
      notify(error.response.data.message);
    }
    return Promise.reject(error);
  }
);

export default api;
