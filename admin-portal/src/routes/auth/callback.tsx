import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { FullScreenSpinner } from '@/components/Spinner';

/**
 * Magic-link callback page.
 *
 * Supabase JS auto-handles the URL fragment (`#access_token=...`) when
 * `detectSessionInUrl: true` is set on the client (BRIEFING § 7-L3 — and
 * verified in src/lib/supabase.ts). We just wait for the session to
 * appear, then redirect.
 *
 * If we don't have a session within a short window, fall back to /login
 * so the user isn't stuck on a blank page.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function check() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (cancelled) return;
        if (error) {
          setError('Could not complete sign-in. Please try again.');
          return;
        }
        if (data.session) {
          navigate('/', { replace: true });
        }
      } catch {
        if (!cancelled) {
          setError('Could not complete sign-in. Please try again.');
        }
      }
    }

    // Initial check (Supabase may have already parsed the URL fragment).
    void check();

    // Listen for the SIGNED_IN event in case the parse races our first call.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'SIGNED_IN' && session) {
        navigate('/', { replace: true });
      }
    });

    // Safety net: if nothing happens in 8s, send the user back to /login.
    timeoutId = setTimeout(() => {
      if (cancelled) return;
      setError('Sign-in is taking longer than expected. Please try again.');
      navigate('/login', { replace: true });
    }, 8000);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, [navigate]);

  if (error) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-navy-50 p-6">
        <section className="w-full max-w-md rounded-xl border border-rose-200 bg-white p-8 text-center">
          <h1 className="text-base font-semibold text-navy-700">
            Sign-in failed
          </h1>
          <p className="mt-2 text-sm text-navy-500">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="mt-4 rounded-md border border-navy-100 bg-white px-3 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50"
          >
            Back to sign in
          </button>
        </section>
      </main>
    );
  }

  return <FullScreenSpinner label="Signing you in…" />;
}
