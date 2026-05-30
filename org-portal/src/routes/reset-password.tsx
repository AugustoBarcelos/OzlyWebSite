import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';

const FormSchema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: 'Passwords do not match.', path: ['confirm'] });

export function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);

  // Supabase delivers the recovery token in the URL hash. The client SDK
  // auto-exchanges it into a session on auth state change. We wait one cycle
  // of `onAuthStateChange` for that exchange to land before enabling the
  // form — otherwise calling updateUser() would error.
  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => {
      if (active) setLinkInvalid(true);
    }, 6000);
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
        clearTimeout(timeout);
      }
    });
    // If the user landed here with an already-active session (e.g. clicked
    // the link while signed in), enable immediately.
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) {
        setReady(true);
        clearTimeout(timeout);
      }
    });
    return () => {
      active = false;
      clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const parsed = FormSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input.');
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(parsed.data.password);
      setDone(true);
      // Sign out and redirect to login so the user re-authenticates with the
      // new password. Otherwise the recovery session lingers.
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
      }, 1500);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-navy-700">Set a new password</h1>
        {linkInvalid && !ready && (
          <>
            <p className="mt-3 text-sm text-navy-500">
              This reset link is invalid or has expired. Request a new one and follow the link
              from the latest email.
            </p>
            <Link
              to="/forgot-password"
              className="mt-6 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
            >
              Request a new link
            </Link>
          </>
        )}
        {!linkInvalid && !done && (
          <>
            <p className="mt-2 text-sm text-navy-500">
              Choose a new password. You'll be signed out and asked to sign in again with it.
            </p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-navy-600">New password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  disabled={!ready}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-navy-600">Confirm new password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  required
                  disabled={!ready}
                />
              </div>
              {error && (
                <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
              )}
              {!ready && !linkInvalid && (
                <p className="rounded-md bg-navy-50 px-3 py-2 text-sm text-navy-500">
                  Verifying your reset link…
                </p>
              )}
              <button
                type="submit"
                disabled={submitting || !ready}
                className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
              >
                {submitting ? 'Saving…' : 'Save new password'}
              </button>
            </form>
          </>
        )}
        {done && (
          <p className="mt-3 rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">
            Password updated. Redirecting to sign in…
          </p>
        )}
      </div>
    </div>
  );
}
