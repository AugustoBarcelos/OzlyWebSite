import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/Spinner';

/**
 * Login page (BRIEFING § 11.1).
 *
 * Magic-link only flow. After submit we show a "check your inbox" success
 * state. Cloudflare Access is the outer auth layer in production; this is
 * the second-factor identity check inside the app.
 *
 * Note: 2FA / Passkey enrollment (§ 7-L3) is deferred to a later wave —
 * Augusto's prod user is the only admin today and Cloudflare Access already
 * gates the subdomain.
 */

const EmailSchema = z
  .string()
  .trim()
  .max(200, 'Email is too long')
  .email('Enter a valid email address');

export function LoginPage() {
  const { user, role, loading, signIn } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // If already signed in as admin, bounce to the intended destination.
  const from = searchParams.get('from') ?? '/';
  const safeFrom = from.startsWith('/') && !from.startsWith('//') ? from : '/';

  // Avoid showing the form during initial bootstrap.
  useEffect(() => {
    setError(null);
  }, [location.pathname]);

  if (!loading && user && role === 'admin') {
    return <Navigate to={safeFrom} replace />;
  }
  if (!loading && user && role && role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const parsed = EmailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid email');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(parsed.data);
      setSentTo(parsed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-navy-50 p-6">
      <section
        aria-labelledby="login-title"
        className="w-full max-w-md rounded-xl border border-navy-100 bg-white p-8 shadow-sm"
      >
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-500 text-base font-bold text-white">
            O
          </div>
          <div className="leading-tight">
            <div className="text-base font-semibold text-navy-700">
              Ozly Admin
            </div>
            <div className="text-xs text-navy-400">Internal portal</div>
          </div>
        </div>

        {sentTo ? (
          <div role="status" aria-live="polite">
            <h1
              id="login-title"
              className="text-lg font-semibold text-navy-700"
            >
              Check your inbox
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-navy-500">
              We sent a magic link to{' '}
              <span className="font-medium text-navy-700">{sentTo}</span>.
              Click it to finish signing in. The link expires in a few
              minutes.
            </p>
            <button
              type="button"
              onClick={() => {
                setSentTo(null);
                setEmail('');
              }}
              className="mt-4 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <h1
              id="login-title"
              className="text-lg font-semibold text-navy-700"
            >
              Sign in
            </h1>
            <p className="mt-1 text-sm text-navy-500">
              We&apos;ll send a one-time link to your email.
            </p>

            <label
              htmlFor="email"
              className="mt-6 block text-xs font-medium text-navy-600"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              spellCheck={false}
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              placeholder="you@ozly.au"
              className="mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 shadow-sm placeholder:text-navy-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-navy-50"
            />

            {error && (
              <p
                role="alert"
                className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || email.length === 0}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-brand-300"
            >
              {submitting && <Spinner size="sm" label="Sending" />}
              {submitting ? 'Sending…' : 'Send magic link'}
            </button>

            <p className="mt-6 text-[11px] leading-relaxed text-navy-400">
              By signing in you agree to follow the internal access policy.
              All admin actions are audited.
            </p>
          </form>
        )}
      </section>
    </main>
  );
}
