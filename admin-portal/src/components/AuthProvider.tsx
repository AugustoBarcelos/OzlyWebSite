import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { callRpc, RpcError } from '@/lib/rpc';
import { identify as identifyPostHog, reset as resetPostHog } from '@/lib/posthog';
import { Sentry } from '@/lib/sentry';
import { appUrl } from '@/lib/env';
import { AuthContext, type AdminRole, type AuthContextValue } from '@/lib/auth';

/**
 * AuthProvider — wraps the app. Listens to Supabase auth state, calls the
 * `is_admin()` RPC after every sign-in to determine role, and exposes the
 * resolved value through `useAuth()`.
 *
 * BRIEFING § 7-L3 / § 7-L4 / § 11.1.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Track the last user we ran a role check for, so we don't re-fetch on
  // token-refresh events that don't change identity.
  const lastCheckedUserId = useRef<string | null>(null);

  /**
   * Resolve role by calling the `is_admin()` RPC. The RPC reads `auth.uid()`
   * server-side, so we don't pass anything from the client. On any failure
   * we treat the user as non-admin (fail-secure, BRIEFING § 3 #4).
   */
  const resolveRole = useCallback(async (): Promise<AdminRole> => {
    try {
      const result = await callRpc<boolean>('is_admin');
      return result === true ? 'admin' : 'non-admin';
    } catch (err) {
      // Don't leak details — Sentry has the real error (already scrubbed).
      if (!(err instanceof RpcError)) {
        Sentry.captureException(err);
      }
      return 'non-admin';
    }
  }, []);

  /** Apply a session: set user, resolve role, identify in PostHog/Sentry. */
  const applySession = useCallback(
    async (session: Session | null) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (!nextUser) {
        setRole(null);
        lastCheckedUserId.current = null;
        return;
      }

      // Skip RPC if we already resolved role for this user id.
      if (lastCheckedUserId.current === nextUser.id && role !== null) {
        return;
      }

      const resolved = await resolveRole();
      lastCheckedUserId.current = nextUser.id;
      setRole(resolved);

      if (resolved === 'admin') {
        identifyPostHog(nextUser.id);
        Sentry.setUser({ id: nextUser.id });
      } else {
        // Non-admins still authenticated, but we don't tag them in
        // PostHog/Sentry — admin telemetry only (BRIEFING § 13).
        resetPostHog();
        Sentry.setUser(null);
      }
    },
    [resolveRole, role]
  );

  // Bootstrap: hydrate from existing session, then subscribe to changes.
  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      await applySession(data.session);
      if (active) setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        // Do not block the listener; the promise resolves asynchronously.
        void applySession(session);
      }
    );

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [applySession]);

  const signIn = useCallback(async (email: string) => {
    const redirectTo = `${appUrl()}/auth/callback`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      // Surface a friendly message but log the real one.
      Sentry.captureException(error);
      throw new Error(
        error.message.toLowerCase().includes('rate')
          ? 'Too many requests. Please wait a minute and try again.'
          : 'Could not send magic link. Please try again.'
      );
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    resetPostHog();
    Sentry.setUser(null);
    setUser(null);
    setRole(null);
    lastCheckedUserId.current = null;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      loading,
      isAdmin: role === 'admin',
      signIn,
      signOut,
    }),
    [user, role, loading, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
