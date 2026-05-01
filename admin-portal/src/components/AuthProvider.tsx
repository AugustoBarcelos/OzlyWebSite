import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { callRpc, RpcError } from '@/lib/rpc';
import { identify as identifyPostHog, reset as resetPostHog } from '@/lib/posthog';
import { Sentry } from '@/lib/sentry';
import { appUrl } from '@/lib/env';
import {
  AuthContext,
  type AdminRole,
  type AuthContextValue,
  type ChannelGrant,
  type ChannelKind,
  type ChannelPerm,
  type TeamMemberInfo,
} from '@/lib/auth';

/**
 * AuthProvider — wraps the app. Listens to Supabase auth state, calls the
 * `team_my_grants()` RPC after every sign-in to determine role + grants,
 * and exposes the resolved value through `useAuth()`.
 *
 * `team_my_grants()` returns:
 *   - is_admin: whether profiles.role='admin' (full access)
 *   - is_team_member: whether row exists in team_members table
 *   - member: { id, role, display_name, status, ... }
 *   - grants: array of channel_grant rows (admin sees synthetic "all access")
 *
 * Fail-secure: any RPC failure → no role, no grants. UI guards still render
 * but every RPC will reject server-side too.
 */

interface MyGrantsResult {
  authenticated: boolean;
  is_admin: boolean;
  is_team_member: boolean;
  member: TeamMemberInfo | null;
  grants: ChannelGrant[];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [member, setMember] = useState<TeamMemberInfo | null>(null);
  const [grants, setGrants] = useState<ChannelGrant[]>([]);
  const [loading, setLoading] = useState(true);

  const lastCheckedUserId = useRef<string | null>(null);

  const resolveGrants = useCallback(async (): Promise<MyGrantsResult | null> => {
    try {
      return await callRpc<MyGrantsResult>('team_my_grants');
    } catch (err) {
      if (!(err instanceof RpcError)) {
        Sentry.captureException(err);
      }
      return null;
    }
  }, []);

  const applySession = useCallback(
    async (session: Session | null) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (!nextUser) {
        setRole(null);
        setMember(null);
        setGrants([]);
        lastCheckedUserId.current = null;
        return;
      }

      if (lastCheckedUserId.current === nextUser.id && role !== null) {
        return;
      }

      const result = await resolveGrants();
      lastCheckedUserId.current = nextUser.id;

      if (!result) {
        setRole('non-admin');
        setMember(null);
        setGrants([]);
        resetPostHog();
        Sentry.setUser(null);
        return;
      }

      setRole(result.is_admin ? 'admin' : 'non-admin');
      setMember(result.member);
      setGrants(result.grants ?? []);

      if (result.is_admin || result.is_team_member) {
        identifyPostHog(nextUser.id);
        Sentry.setUser({ id: nextUser.id });
      } else {
        resetPostHog();
        Sentry.setUser(null);
      }
    },
    [resolveGrants, role],
  );

  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      await applySession(data.session);
      if (active) setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      void applySession(session);
    });

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
      Sentry.captureException(error);
      throw new Error(
        error.message.toLowerCase().includes('rate')
          ? 'Too many requests. Please wait a minute and try again.'
          : 'Could not send magic link. Please try again.',
      );
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    resetPostHog();
    Sentry.setUser(null);
    setUser(null);
    setRole(null);
    setMember(null);
    setGrants([]);
    lastCheckedUserId.current = null;
  }, []);

  const hasChannelGrant = useCallback(
    (kind: ChannelKind, perm: ChannelPerm): boolean => {
      if (role === 'admin') return true;
      const g = grants.find((x) => x.channel_kind === kind);
      if (!g) return false;
      switch (perm) {
        case 'read':
          return g.can_read;
        case 'publish':
          return g.can_publish;
        case 'edit':
          return g.can_edit;
        case 'manage_budget':
          return g.can_manage_budget;
      }
    },
    [role, grants],
  );

  const isAdmin = role === 'admin';
  const hasPortalAccess = isAdmin || (member !== null && member.status === 'active');

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      member,
      grants,
      loading,
      isAdmin,
      hasPortalAccess,
      hasChannelGrant,
      signIn,
      signOut,
    }),
    [user, role, member, grants, loading, isAdmin, hasPortalAccess, hasChannelGrant, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
