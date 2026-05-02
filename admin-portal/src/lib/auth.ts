import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';

/**
 * Auth context — populated by `<AuthProvider>`. Consumers read this via
 * `useAuth()`. Keep this file free of React component code so it can be
 * imported anywhere without circular deps.
 *
 * BRIEFING § 7-L4: role is determined server-side by `team_my_grants()` RPC.
 * We cache the result in state but the source of truth is the database
 * (every RPC re-checks via SECURITY DEFINER + has_channel_grant()).
 */

export type AdminRole = 'admin' | 'non-admin';

export type ChannelKind =
  | 'org_instagram'
  | 'org_facebook'
  | 'org_tiktok'
  | 'org_youtube'
  | 'paid_google'
  | 'paid_meta'
  | 'paid_asa'
  | 'paid_tiktok'
  | 'msg_email'
  | 'msg_whatsapp'
  | 'msg_sms';

export type ChannelPerm = 'read' | 'publish' | 'edit' | 'manage_budget';

export type TeamRole =
  | 'admin'
  | 'content_creator'
  | 'traffic_manager'
  | 'messaging_manager';

export interface ChannelGrant {
  channel_kind: ChannelKind;
  can_read: boolean;
  can_publish: boolean;
  can_edit: boolean;
  can_manage_budget: boolean;
}

export interface TeamMemberInfo {
  id: string;
  role: TeamRole;
  display_name: string | null;
  status: 'active' | 'disabled';
  created_at: string;
  last_login_at: string | null;
}

export interface AuthContextValue {
  user: User | null;
  /** Resolved role. `null` while still loading. */
  role: AdminRole | null;
  /** Team member record, if the user is a non-admin team member. */
  member: TeamMemberInfo | null;
  /** Per-channel grants (admin sees everything; non-admin sees only their grants). */
  grants: ChannelGrant[];
  loading: boolean;
  isAdmin: boolean;
  /** True if user is admin OR an active team_member with at least one grant. */
  hasPortalAccess: boolean;
  /** Convenience helper — re-check is also enforced server-side. */
  hasChannelGrant: (kind: ChannelKind, perm: ChannelPerm) => boolean;
  signIn: (email: string) => Promise<void>;
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

/** Filter helpers for navigation — `hasAnyOrganic`, etc. */
export function hasAnyChannelOfKind(
  grants: ChannelGrant[],
  prefix: 'org_' | 'paid_' | 'msg_',
  perm: ChannelPerm = 'read',
): boolean {
  return grants.some(
    (g) =>
      g.channel_kind.startsWith(prefix) &&
      ((perm === 'read' && g.can_read) ||
        (perm === 'publish' && g.can_publish) ||
        (perm === 'edit' && g.can_edit) ||
        (perm === 'manage_budget' && g.can_manage_budget)),
  );
}
