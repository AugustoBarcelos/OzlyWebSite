import { useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/Spinner';
import { safeRedirect } from '@/lib/safe-redirect';

const FormSchema = z.object({
  email: z.string().trim().max(200).email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export function LoginPage() {
  const { user, loading, signInWithPassword } = useAuth();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Open-redirect guard: see src/lib/safe-redirect.ts (covered by unit tests).
  const safeFrom = safeRedirect(params.get('from'), window.location.origin);

  if (!loading && user) return <Navigate to={safeFrom} replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const parsed = FormSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    setSubmitting(true);
    try {
      await signInWithPassword(parsed.data.email, parsed.data.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-[100dvh] lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — gradient, big quote, decorative dots. Hidden on small screens. */}
      <aside
        className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        style={{
          // Darker base + tighter radials so the text always sits on a
          // dim-enough field. The previous tuning had the lime/teal radials
          // covering ~55% of the panel which pushed the heading onto a
          // mid-luminance zone (legibility regression).
          background:
            'radial-gradient(at 0% 100%, rgba(43, 187, 151, 0.85) 0%, transparent 38%), ' +
            'radial-gradient(at 100% 0%, rgba(157, 215, 96, 0.7) 0%, transparent 32%), ' +
            'linear-gradient(135deg, #0a1820 0%, #050b11 100%)',
        }}
      >
        {/* Decorative grid of dots — gives the panel texture without an image asset. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Subtle bottom-up shade so the heading/copy always have a darker
            backdrop, regardless of where the radial highlights land. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, transparent 0%, transparent 30%, rgba(5, 11, 17, 0.45) 100%)',
          }}
        />
        <div className="relative z-10 flex items-center gap-3">
          <img src="/OSLY.svg" alt="Ozly" width={40} height={40} className="shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]" />
          <div className="font-display text-[19px] font-bold tracking-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
            oz<span className="text-lime-300">·</span>ly
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-lime-100 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-300" />
            For Organisations
          </div>
          <h2
            className="font-display text-[2.6rem] font-bold leading-[1.05] tracking-tight text-white"
            style={{ textShadow: '0 2px 12px rgba(0, 0, 0, 0.35)' }}
          >
            Every sub<span className="text-lime-300">·</span>contractor's invoice,<br />
            in one calm inbox.
          </h2>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/90">
            Engage cleaners, surface what they billed, reconcile in one click.
            Built for Australian cleaning companies that hate spreadsheets.
          </p>
        </div>

        <div className="relative z-10 grid max-w-md grid-cols-3 gap-3 text-[11.5px] text-white/80">
          <div>
            <div className="font-display text-xl font-bold text-white">14d</div>
            free trial
          </div>
          <div>
            <div className="font-display text-xl font-bold text-white">ATO</div>
            BAS export
          </div>
          <div>
            <div className="font-display text-xl font-bold text-white">Xero</div>
            CSV ready
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-7 flex items-center gap-2.5 lg:hidden">
            <img src="/OSLY.svg" alt="Ozly" width={36} height={36} className="shrink-0" />
            <div className="leading-tight">
              <div className="font-display text-lg font-bold tracking-tight text-navy-800">
                oz<span className="text-brand-500">·</span>ly
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-700">
                for Organisations
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} noValidate>
            <div className="page-hero-kicker mb-1">Welcome back</div>
            <h1 className="font-display text-[1.7rem] font-bold leading-tight tracking-tight text-navy-800">
              Sign in to your workspace
            </h1>
            <p className="mt-1.5 text-sm text-navy-400">
              Your sub-contractors' invoices, ready when you are.
            </p>

            <label htmlFor="email" className="mt-7 block text-[11px] font-semibold uppercase tracking-wider text-navy-500">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="mt-1.5 w-full rounded-lg border border-navy-100 bg-white px-3.5 py-2.5 text-sm text-navy-700 placeholder:text-navy-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              placeholder="you@company.com.au"
            />

            <div className="mt-4 flex items-baseline justify-between">
              <label htmlFor="password" className="block text-[11px] font-semibold uppercase tracking-wider text-navy-500">
                Password
              </label>
              <Link to="/forgot-password" className="text-[11px] font-semibold text-brand-700 hover:text-brand-600">
                Forgot?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className="mt-1.5 w-full rounded-lg border border-navy-100 bg-white px-3.5 py-2.5 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />

            {error && (
              <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className="btn-primary mt-6 w-full justify-center">
              {submitting && <Spinner size="sm" label="Signing in" />}
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-sm text-navy-500">
            New here?{' '}
            <Link to="/signup" className="font-semibold text-brand-700 hover:text-brand-600">
              Create an organisation →
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
