import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';

const FormSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});

export function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const parsed = FormSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input.');
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordReset(parsed.data.email);
      // Always show the same confirmation — never confirm whether the email
      // exists. That prevents user enumeration (Supabase returns 200 either
      // way, so the UI doesn't need to branch).
      setSent(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center p-6">
      <section className="ozly-card-hero w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-2.5">
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

        <div className="page-hero-kicker mb-1">Account recovery</div>
        <h1 className="font-display text-[1.6rem] font-bold leading-tight tracking-tight text-navy-800">
          Reset your password
        </h1>

        {sent ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-navy-500">
              If an account exists for that email, we've sent a reset link. Check your inbox
              (and spam folder) — the link is valid for one hour.
            </p>
            <Link to="/login" className="btn-primary mt-6 inline-flex">
              Back to sign in →
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-navy-500">
              Enter the email you use to sign in. We'll send a link to set a new password.
            </p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-navy-500">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-navy-100 bg-white px-3.5 py-2.5 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  placeholder="you@example.com"
                  required
                />
              </div>
              {error && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
              )}
              <button type="submit" disabled={submitting} className="btn-primary w-full justify-center">
                {submitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <div className="mt-4 text-sm text-navy-500">
              Remembered it?{' '}
              <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-600">
                Back to sign in →
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
