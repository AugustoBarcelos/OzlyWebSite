import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';

/**
 * Auth context — populated by `<AuthProvider>`. Consumers read this via
 * `useAuth()`. Keep this file free of React component code so it can be
 * imported anywhere without circular deps.
 *
 * BRIEFING § 7-L4: role is determined by the `is_admin()` RPC, not by any
 * client claim. We cache the result in state but the source of truth is
 * the database (RLS policies on every admin RPC re-check).
 */

export type AdminRole = 'admin' | 'non-admin';

export interface AuthContextValue {
  /** The Supabase user, or null when signed out / loading. */
  user: User | null;
  /** Resolved role. `null` while we haven't checked yet. */
  role: AdminRole | null;
  /** True until the initial session + role check completes. */
  loading: boolean;
  /** Convenience: `role === 'admin'`. */
  isAdmin: boolean;
  /** Send a magic link. Resolves on success, rejects with a friendly error. */
  signIn: (email: string) => Promise<void>;
  /** Sign out, reset PostHog, clear Sentry user. */
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Hook. Throws if used outside `<AuthProvider>` — fail-loud, never silently
 * pretend the user is signed out.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
