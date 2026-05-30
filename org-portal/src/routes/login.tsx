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
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f7f8fa] p-6">
      <section className="w-full max-w-md rounded-2xl border border-navy-100 bg-white p-8 shadow-[0_12px_50px_-16px_rgba(14,26,35,0.25)]">
        <div className="mb-7 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 font-display text-lg font-bold text-white">
            O
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-bold tracking-tight text-navy-800">
              oz<span className="text-brand-500">·</span>ly
            </div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-navy-300">
              for Organisations
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} noValidate>
          <h1 className="text-xl font-semibold text-navy-800">Sign in</h1>
          <p className="mt-1 text-sm text-navy-400">Your sub-contractors' invoices, in one place.</p>

          <label htmlFor="email" className="mt-6 block text-xs font-medium text-navy-600">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            className="mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 placeholder:text-navy-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            placeholder="you@company.com.au"
          />

          <div className="mt-4 flex items-baseline justify-between">
            <label htmlFor="password" className="block text-xs font-medium text-navy-600">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            className="mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />

          {error && (
            <p role="alert" className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:bg-brand-300"
          >
            {submitting && <Spinner size="sm" label="Signing in" />}
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-sm text-navy-500">
          New here?{' '}
          <Link to="/signup" className="font-medium text-brand-600 hover:text-brand-700">
            Create an organisation
          </Link>
        </p>
      </section>
    </main>
  );
}
