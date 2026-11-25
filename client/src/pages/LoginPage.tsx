import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Lock, Mail, Eye, EyeOff, AlertCircle, PlayCircle, Sun, Moon } from 'lucide-react';
import { authApi } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import BrandMark from '../components/ui/BrandMark';

interface LoginForm { email: string; password: string; }
interface AuthConfig { demoMode: boolean; passwordLogin: boolean; registrationOpen: boolean }
interface DemoAccount { email: string; name: string; role: string }

// Seeded local accounts, offered as one-click fill-ins in development builds only.
// Production builds never ship these credentials.
const DEV_ACCOUNTS = import.meta.env.DEV ? [
  { label: 'Admin', email: 'admin@buildtrack.com', pw: 'admin123' },
  { label: 'PM', email: 'pm@buildtrack.com', pw: 'pm123456' },
  { label: 'Engineer', email: 'engineer@buildtrack.com', pw: 'eng12345' },
  { label: 'Consultant', email: 'consultant@buildtrack.com', pw: 'cons1234' },
] : [];

const roleLabel = (r: string) => r.split('_').map(w => w[0] + w.slice(1).toLowerCase()).join(' ');

export default function LoginPage() {
  const { login } = useAuthStore();
  const { theme, toggleTheme } = useUiStore();
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [config, setConfig] = useState<AuthConfig>({ demoMode: false, passwordLogin: true, registrationOpen: false });
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginForm>();

  useEffect(() => {
    authApi.config().then(r => {
      setConfig(r.data);
      if (r.data.demoMode) authApi.demoAccounts().then(a => setDemoAccounts(a.data)).catch(() => {});
    }).catch(() => {});
  }, []);

  const enterDemo = async (email: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await authApi.demoLogin(email);
      login(res.data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Demo sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: LoginForm) => {
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(data);
      login(res.data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email: string, password: string) => {
    setValue('email', email);
    setValue('password', password);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]" style={{ background: 'var(--bg-base)' }}>
      {/* Architectural panel (always black) */}
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 xl:p-16"
        style={{ background: '#050505', color: '#F5F1E8' }} aria-hidden="true">
        <div className="absolute inset-0 opacity-[0.55]" style={{
          backgroundImage:
            'linear-gradient(rgba(201,152,44,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(201,152,44,0.07) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }} />
        <svg className="absolute -right-24 bottom-0 w-[620px] h-[620px] opacity-[0.22]" viewBox="0 0 400 400" fill="none">
          <path d="M40 380V170L200 60l160 110v210" stroke="#C9982C" strokeWidth="1.2" />
          <path d="M100 380V210l100-68 100 68v170" stroke="#C9982C" strokeWidth="0.8" />
          <path d="M160 380v-120h80v120" stroke="#E0BC63" strokeWidth="0.8" />
          <path d="M0 380h400" stroke="#7A5A12" strokeWidth="1" />
          <path d="M200 60v320" stroke="#7A5A12" strokeWidth="0.5" strokeDasharray="4 6" />
        </svg>

        <div className="relative flex items-center gap-3">
          <BrandMark size={40} />
          <span className="font-display text-xl">BuildTrack <span style={{ color: '#E0BC63' }}>Pro</span></span>
        </div>

        <div className="relative max-w-lg">
          <p className="text-[11px] uppercase mb-5" style={{ color: '#C9982C', letterSpacing: '0.28em' }}>Construction progress management</p>
          <h1 className="font-display text-5xl xl:text-6xl leading-[1.05] font-semibold" style={{ color: '#F5F1E8' }}>
            Every site,<br />measured with <em className="not-italic" style={{ color: '#E0BC63' }}>precision.</em>
          </h1>
          <div className="w-20 h-px my-8" style={{ background: '#C9982C' }} />
          <p className="text-[15px] leading-relaxed" style={{ color: 'rgba(245,241,232,0.68)' }}>
            Daily, weekly and monthly reporting, schedules, HSE, risks and resources in one place.
          </p>
        </div>

        <p className="relative text-xs" style={{ color: 'rgba(245,241,232,0.4)' }}>
          BuildTrack Pro v1.0 — © 2024 All rights reserved
        </p>
      </section>

      {/* Sign-in panel */}
      <section className="relative flex items-center justify-center p-5 sm:p-10">
        <button onClick={toggleTheme} className="icon-btn absolute top-4 right-4"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <div className="w-full max-w-[420px] fade-in">
          {/* Compact brand on small screens */}
          <div className="lg:hidden flex flex-col items-center text-center mb-8">
            <BrandMark size={52} />
            <h1 className="font-display text-3xl mt-4" style={{ color: 'var(--text-1)' }}>
              BuildTrack <span style={{ color: 'var(--accent)' }}>Pro</span>
            </h1>
            <p className="eyebrow mt-2">Construction progress management</p>
          </div>

          <div className="card !p-7 sm:!p-9">
            <p className="eyebrow mb-2">{config.passwordLogin ? 'Welcome back' : 'Public demo'}</p>
            <h2 className="font-display text-[26px] font-semibold mb-6" style={{ color: 'var(--text-1)' }}>
              {config.passwordLogin ? 'Sign in to your account' : 'Explore the demo'}
            </h2>

            {error && (
              <div role="alert" className="mb-4 p-3 rounded-lg flex items-center gap-2 text-sm"
                style={{ background: 'var(--red-soft)', border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)', color: 'var(--red)' }}>
                <AlertCircle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {config.passwordLogin && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="label" htmlFor="login-email">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="input pl-9 !min-h-[44px]"
                    {...register('email', { required: 'Email is required' })}
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs" style={{ color: 'var(--red)' }}>{errors.email.message}</p>}
              </div>

              <div>
                <label className="label" htmlFor="login-password">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
                  <input
                    id="login-password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="input pl-9 pr-10 !min-h-[44px]"
                    {...register('password', { required: 'Password is required' })}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="crumb-link absolute right-3 top-1/2 -translate-y-1/2"
                    aria-label={showPw ? 'Hide password' : 'Show password'}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs" style={{ color: 'var(--red)' }}>{errors.password.message}</p>}
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full btn-lg !mt-6">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full animate-spin" style={{ border: '2px solid rgba(5,5,5,0.25)', borderTopColor: '#050505' }} />
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>
            )}

            {/* Public demo: password-less access to read-only demonstration accounts */}
            {config.demoMode && (
              <div className={config.passwordLogin ? 'mt-6 pt-6 border-t' : ''}>
                <p className="text-sm mb-3" style={{ color: 'var(--text-2)' }}>
                  Public demo: read-only access to two fictional projects (browse and export only). All projects, people and documents are fictional. Owner and team accounts sign in with their own credentials.
                </p>
                <div className="grid gap-2">
                  {demoAccounts.map(acc => (
                    <button key={acc.email} type="button" disabled={loading}
                      onClick={() => enterDemo(acc.email)}
                      className="btn-secondary w-full justify-start gap-2">
                      <PlayCircle size={16} style={{ color: 'var(--accent)' }} />
                      Explore as {roleLabel(acc.role)}
                    </button>
                  ))}
                  {demoAccounts.length === 0 && (
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>Demo accounts are not available right now.</p>
                  )}
                </div>
              </div>
            )}

            {/* Local development: seeded accounts (never included in production builds) */}
            {config.passwordLogin && DEV_ACCOUNTS.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-[10px] uppercase text-center mb-3" style={{ color: 'var(--text-3)', letterSpacing: '0.18em' }}>Local development accounts</p>
                <div className="grid grid-cols-2 gap-2">
                  {DEV_ACCOUNTS.map(acc => (
                    <button key={acc.label} type="button"
                      onClick={() => fillDemo(acc.email, acc.pw)}
                      className="btn-secondary btn-sm text-xs justify-start gap-2">
                      <span className="w-5 h-5 rounded text-[10px] flex items-center justify-center font-bold"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                        {acc.label[0]}
                      </span>
                      {acc.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className="lg:hidden text-center text-xs mt-6" style={{ color: 'var(--text-3)' }}>
            BuildTrack Pro v1.0 — © 2024 All rights reserved
          </p>
        </div>
      </section>
    </div>
  );
}
