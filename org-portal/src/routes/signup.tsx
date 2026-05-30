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
      // Stash org details first; the org is created (via org_create_with_owner)
      // once an authenticated session exists — immediately if email confirmation
      // is off, or after the user confirms + signs in.
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
        <section className="w-full max-w-md rounded-2xl border border-navy-50 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-navy-700">Confirm your email</h1>
          <p className="mt-2 text-sm leading-relaxed text-navy-500">
            We sent a confirmation link to <span className="font-medium text-navy-700">{email}</span>.
            Confirm it, then sign in — your organisation will be ready.
          </p>
          <Link to="/login" className="mt-5 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
            Go to sign in
          </Link>
        </section>
      </main>
    );
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
          <h1 className="text-xl font-semibold text-navy-800">Create your organisation</h1>
          <p className="mt-1 text-sm text-navy-400">See the invoices your sub-contractors send you.</p>

          <label htmlFor="name" className="mt-5 block text-xs font-medium text-navy-600">
            Company name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            className="mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            placeholder="Bright Clean Pty Ltd"
          />

          <label htmlFor="abn" className="mt-4 block text-xs font-medium text-navy-600">
            ABN <span className="text-navy-300">(optional)</span>
          </label>
          <input
            id="abn"
            value={abn}
            onChange={(e) => setAbn(e.target.value)}
            disabled={submitting}
            className="mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            placeholder="12 345 678 901"
          />

          <label htmlFor="email" className="mt-4 block text-xs font-medium text-navy-600">
            Admin email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            className="mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            placeholder="you@company.com.au"
          />

          <label htmlFor="password" className="mt-4 block text-xs font-medium text-navy-600">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
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
            {submitting && <Spinner size="sm" label="Creating" />}
            {submitting ? 'Creating…' : 'Start free trial'}
          </button>

          {/* Compliance (non-negotiable): no employment relationship. */}
          <p className="mt-4 rounded-md bg-navy-50 px-3 py-2 text-[11px] leading-relaxed text-navy-500">
            Ozly does not create an employment relationship. Sub-contractors accept engagements
            individually and remain independent.
          </p>
        </form>

        <p className="mt-5 text-sm text-navy-500">
          Already have an organisation?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
