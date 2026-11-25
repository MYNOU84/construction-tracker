/**
 * Runtime security switches, all read from environment variables so the same
 * build runs locally (full access, original roles) and as a public demo.
 *
 *   DEMO_MODE=true            Public portfolio demo: the whole API is read-only,
 *                             visitors sign in through /auth/demo, password
 *                             login and registration are off.
 *   DEMO_USER_EMAILS=a,b      Accounts offered by /auth/demo (first = default).
 *   ALLOW_PASSWORD_LOGIN=true Re-enable password login while DEMO_MODE is on.
 *   ALLOW_REGISTRATION=true   Allow self-registration in production
 *                             (always allowed in local development).
 */
const flag = (name: string) => (process.env[name] || '').toLowerCase() === 'true';
const isProd = () => process.env.NODE_ENV === 'production';

export const security = {
  get demoMode() { return flag('DEMO_MODE'); },
  get demoUserEmails(): string[] {
    return (process.env.DEMO_USER_EMAILS || '')
      .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  },
  get passwordLoginEnabled() { return !flag('DEMO_MODE') || flag('ALLOW_PASSWORD_LOGIN'); },
  get registrationOpen() {
    if (flag('DEMO_MODE')) return false;
    return !isProd() || flag('ALLOW_REGISTRATION');
  },
};

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MINUTES = 15;

export const ROLES = [
  'ADMIN', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'CONSULTANT', 'CONTRACTOR', 'CLIENT_VIEWER',
] as const;
export const SELF_REGISTER_ROLES = ROLES.filter(r => r !== 'ADMIN');
