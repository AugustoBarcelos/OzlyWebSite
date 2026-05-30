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
    <div className="flex min-h-screen items-center justify-center bg-navy-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-navy-700">Reset your password</h1>
        {sent ? (
          <>
            <p className="mt-3 text-sm text-navy-500">
              If an account exists for that email, we've sent a reset link. Check your inbox
              (and spam folder) — the link is valid for one hour.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-navy-500">
              Enter the email you use to sign in. We'll send a link to set a new password.
            </p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-navy-600">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  placeholder="you@example.com"
                  required
                />
              </div>
              {error && (
                <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
              >
                {submitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <div className="mt-4 text-sm text-navy-500">
              Remembered it?{' '}
              <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
