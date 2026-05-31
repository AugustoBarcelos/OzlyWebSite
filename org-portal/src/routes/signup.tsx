import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import { PENDING_ORG_KEY, type PendingOrg } from '@/lib/org';
import { Spinner } from '@/components/Spinner';

const FormSchema = z.object({
  name: z.string().trim().min(1, 'Company name is required').max(120),
  abn: z.string().trim().max(20).optional(),
  email: z.string().trim().max(200).email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(72),
});

export function SignupPage() {
  const { user, loading, signUpWithPassword } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [abn, setAbn] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  if (!loading && user) return <Navigate to="/invoices" replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const parsed = FormSchema.safeParse({ name, abn, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    setSubmitting(true);
    try {
      const pending: PendingOrg = {
        name: parsed.data.name,
        abn: parsed.data.abn ?? '',
        admin_email: parsed.data.email,
      };
      sessionStorage.setItem(PENDING_ORG_KEY, JSON.stringify(pending));

      const { hasSession } = await signUpWithPassword(parsed.data.email, parsed.data.password);
      if (hasSession) {
        navigate('/invoices', { replace: true });
      } else {
        setConfirmSent(true);
        setSubmitting(false);
      }
    } catch (err) {
      sessionStorage.removeItem(PENDING_ORG_KEY);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  if (confirmSent) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center p-6">
        <section className="ozly-card-hero w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <h1 className="font-display text-xl font-bold text-navy-800">Confirm your email</h1>
          <p className="mt-2 text-sm leading-relaxed text-navy-500">
            We sent a confirmation link to <span className="font-semibold text-navy-700">{email}</span>.
            Confirm it, then sign in — your organisation will be ready.
          </p>
          <Link to="/login" className="btn-primary mt-6 inline-flex">
            Go to sign in →
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-[100dvh] lg:grid-cols-[1fr_1.05fr]">
      {/* Form panel (left on signup — reverses login layout for visual rhythm) */}
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
            <div className="page-hero-kicker mb-1">Get started · 14-day trial</div>
            <h1 className="font-display text-[1.7rem] font-bold leading-tight tracking-tight text-navy-800">
              Create your organisation
            </h1>
            <p className="mt-1.5 text-sm text-navy-400">
              See the invoices your sub-contractors send you.
            </p>

            <label htmlFor="name" className="mt-6 block text-[11px] font-semibold uppercase tracking-wider text-navy-500">
              Company name
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              className="mt-1.5 w-full rounded-lg border border-navy-100 bg-white px-3.5 py-2.5 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              placeholder="Bright Clean Pty Ltd"
            />

            <label htmlFor="abn" className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-navy-500">
              ABN <span className="font-normal lowercase tracking-normal text-navy-300">(optional)</span>
            </label>
            <input
              id="abn"
              value={abn}
              onChange={(e) => setAbn(e.target.value)}
              disabled={submitting}
              className="mt-1.5 w-full rounded-lg border border-navy-100 bg-white px-3.5 py-2.5 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              placeholder="12 345 678 901"
            />

            <label htmlFor="email" className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-navy-500">
              Admin email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="mt-1.5 w-full rounded-lg border border-navy-100 bg-white px-3.5 py-2.5 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              placeholder="you@company.com.au"
            />

            <label htmlFor="password" className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-navy-500">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
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
              {submitting && <Spinner size="sm" label="Creating" />}
              {submitting ? 'Creating…' : 'Start free trial →'}
            </button>

            {/* Compliance (non-negotiable): no employment relationship. */}
            <p className="mt-4 rounded-lg bg-navy-50/70 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-navy-500">
              Ozly is a tool and does not determine your relationship with members. Sub-contractors
              accept engagements individually and remain independent under their own ABN — your Fair
              Work, super and tax obligations remain yours.
            </p>
          </form>

          <p className="mt-5 text-sm text-navy-500">
            Already have an organisation?{' '}
            <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-600">
              Sign in →
            </Link>
          </p>
        </div>
      </section>

      {/* Brand panel — mirrored from login (same contrast tuning) */}
      <aside
        className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        style={{
          background:
            'radial-gradient(at 100% 100%, rgba(43, 187, 151, 0.85) 0%, transparent 38%), ' +
            'radial-gradient(at 0% 0%, rgba(157, 215, 96, 0.7) 0%, transparent 32%), ' +
            'linear-gradient(135deg, #0a1820 0%, #050b11 100%)',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
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
            14 days, no card
          </div>
          <h2
            className="font-display text-[2.6rem] font-bold leading-[1.05] tracking-tight text-white"
            style={{ textShadow: '0 2px 12px rgba(0, 0, 0, 0.35)' }}
          >
            Stop chasing<br />invoices on WhatsApp.
          </h2>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/90">
            Every sub-contractor on Ozly sends ATO-compliant invoices directly to your inbox.
            Reconcile, export to Xero, BAS-ready at year end.
          </p>
        </div>

        <div className="relative z-10 grid max-w-md grid-cols-3 gap-3 text-[11.5px] text-white/80">
          <div>
            <div className="font-display text-xl font-bold text-white">3 min</div>
            to first invoice
          </div>
          <div>
            <div className="font-display text-xl font-bold text-white">$0</div>
            until you grow
          </div>
          <div>
            <div className="font-display text-xl font-bold text-white">AU</div>
            built for here
          </div>
        </div>
      </aside>
    </main>
  );
}
