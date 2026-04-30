import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Spinner } from './Spinner';

/**
 * Real page (not placeholder). Shown when:
 *  - Login succeeded but profile.role !== 'admin' (BRIEFING § 7-L4 / § 11.1)
 *  - Manual navigation to a route the user can't access
 *
 * Sign out goes through the AuthProvider so PostHog and Sentry are reset
 * consistently.
 */
export function UnauthorizedPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <main
      role="main"
      className="flex min-h-[100dvh] items-center justify-center bg-navy-50 p-6"
    >
      <section
        aria-labelledby="unauthorized-title"
        className="w-full max-w-lg rounded-xl border border-navy-100 bg-white p-8 shadow-sm"
      >
        <h1
          id="unauthorized-title"
          className="text-xl font-semibold text-navy-700"
        >
          Access denied
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-navy-500">
          You don&apos;t have access to the Ozly Admin Portal. If you believe
          this is wrong, contact{' '}
          <a
            href="mailto:admin@ozly.au"
            className="font-medium text-brand-600 underline-offset-2 hover:underline"
          >
            admin@ozly.au
          </a>
          .
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="mt-6 inline-flex items-center gap-2 rounded-md border border-navy-100 bg-white px-3 py-1.5 text-sm font-medium text-navy-700 transition-colors hover:bg-navy-50 disabled:cursor-not-allowed disabled:bg-navy-50"
        >
          {signingOut && <Spinner size="sm" label="Signing out" />}
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </section>
    </main>
  );
}
