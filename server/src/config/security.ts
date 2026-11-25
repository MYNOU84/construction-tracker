/**
 * Runtime security switches, all read from environment variables so the same
 * build runs locally (full access, original roles) and as a public demo.
 *
 *   DEMO_MODE=true            Offer the public one-click demo sign-in (/auth/demo).
 *                             Registration stays off. Real accounts keep password login.
 *   DEMO_USER_EMAILS=a,b      Demo accounts (first = default). Whatever DEMO_MODE says,
 *                             these accounts are read-only, cannot sign in with a
 *                             password and only ever see demo projects (id "demo-…").
 *   DISABLE_PASSWORD_LOGIN=true  Turn password login off for every account.
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
  get passwordLoginEnabled() { return !flag('DISABLE_PASSWORD_LOGIN'); },
  /**
   * Where uploaded bytes go. "database" (PostgreSQL table StoredFile, created by db:prod-init) on Vercel,
   * whose filesystem is read-only and ephemeral; the local disk otherwise. UPLOAD_STORAGE overrides it.
   */
  get uploadStorage(): 'disk' | 'database' {
    const v = (process.env.UPLOAD_STORAGE || '').toLowerCase();
    if (v === 'disk' || v === 'database') return v;
    return process.env.VERCEL ? 'database' : 'disk';
  },
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

/** Demo projects are the seeded fictional ones; their ids all start with this prefix. */
export const DEMO_PROJECT_PREFIX = 'demo-';
export const isDemoProjectId = (id: string | undefined | null) => !!id && id.startsWith(DEMO_PROJECT_PREFIX);
/** A demo account is listed in DEMO_USER_EMAILS: read-only and confined to demo projects. */
export const isDemoAccount = (email: string | undefined | null) =>
  !!email && security.demoUserEmails.includes(email.toLowerCase());
