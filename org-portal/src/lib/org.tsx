import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useSeqGuard } from '@/lib/use-seq-guard';
import type { Organization, MembershipRole } from '@/lib/types';

// Org payload stashed at signup. If email confirmation is enabled in Supabase,
// signUp returns no session, so the org can't be created until the user
// confirms + lands back authenticated — at which point this bootstrap fires.
export const PENDING_ORG_KEY = 'ozly-org-portal-pending-org';
export interface PendingOrg { name: string; abn: string; admin_email: string }

interface OrgContextValue {
  orgs: Organization[];
  currentOrg: Organization | null;
  /** This user's role in the currently selected org (null while loading). */
  currentRole: MembershipRole | null;
  /** Convenience: is the current user the owner of the current org. */
  isOwner: boolean;
  loading: boolean;
  setCurrentOrgId: (id: string) => void;
  refresh: () => Promise<void>;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used inside <OrgProvider>');
  return ctx;
}

const SELECTED_KEY = 'ozly-org-portal-selected-org';

// Defensive org SELECT: tries the full V2 schema first (including
// `billing_email`, added in migration 20260602100000), and falls back to the
// V0 columns ONLY when that exact column is missing (`42703`). Other errors
// (RLS, network, JWT expired) are surfaced to Sentry instead of being
// masquerading as a degraded schema.
async function selectOrgs(): Promise<Organization[]> {
  const v2 = await supabase
    .from('organizations')
    .select('id, name, abn, admin_email, billing_email, billing_plan, trial_ends_at, created_at, period_frequency, period_anchor, default_hourly_rate')
    .order('created_at', { ascending: true });
  if (!v2.error) {
    return (v2.data ?? []).map((r) => ({
      ...(r as Organization),
      default_hourly_rate: (r as { default_hourly_rate?: number }).default_hourly_rate ?? 0,
    }));
  }
  const code = (v2.error as { code?: string }).code;
  if (code === '42703') {
    // V2 column missing — fall back to V0 + null out billing_email + zero rate.
    const v0 = await supabase
      .from('organizations')
      .select('id, name, abn, admin_email, billing_plan, trial_ends_at, created_at, period_frequency, period_anchor')
      .order('created_at', { ascending: true });
    const rows = (v0.data ?? []) as Array<Omit<Organization, 'billing_email' | 'default_hourly_rate'>>;
    return rows.map((r) => ({ ...r, billing_email: null, default_hourly_rate: 0 }));
  }
  // Real error: surface to Sentry and propagate empty list (auth errors
  // should produce "No org linked" anyway; RLS/network deserve telemetry).
  try {
    const { captureException } = await import('@/lib/sentry');
    captureException(v2.error, { source: 'selectOrgs' });
  } catch { /* sentry not configured in dev */ }
  return [];
}

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [rolesByOrg, setRolesByOrg] = useState<Record<string, MembershipRole>>({});
  const [currentId, setCurrentId] = useState<string | null>(
    () => localStorage.getItem(SELECTED_KEY),
  );
  const [loading, setLoading] = useState(true);
  // Guards against double org creation (React StrictMode re-runs effects, and
  // an auth-state change can race the initial load). org_create_with_owner is
  // NOT idempotent — without this we'd create two orgs.
  const creatingRef = useRef(false);
  const seq = useSeqGuard();

  const load = useCallback(async () => {
    if (!user) {
      setOrgs([]);
      setRolesByOrg({});
      setLoading(false);
      return;
    }
    const token = seq.start();
    // Orgs where this user is an accepted owner/admin. RLS already restricts
    // organizations to is_org_admin, so a plain select is safe. Defensive
    // `selectOrgs` falls back to V0 schema when migration 20260602100000
    // hasn't been applied yet (`billing_email` column).
    let list = await selectOrgs();
    if (!seq.isCurrent(token)) return; // aborted by auth flip or unmount

    // Signup bootstrap fallback (see PENDING_ORG_KEY).
    if (list.length === 0 && !creatingRef.current) {
      const raw = sessionStorage.getItem(PENDING_ORG_KEY);
      if (raw) {
        creatingRef.current = true;
        try {
          const p = JSON.parse(raw) as PendingOrg;
          const { error } = await supabase.rpc('org_create_with_owner', {
            p_name: p.name,
            p_abn: p.abn,
            p_admin_email: p.admin_email,
          });
          if (!error) {
            sessionStorage.removeItem(PENDING_ORG_KEY);
            list = await selectOrgs();
            if (!seq.isCurrent(token)) return; // user changed mid-bootstrap
          } else {
            creatingRef.current = false; // allow a retry on next load
          }
        } catch {
          creatingRef.current = false;
        }
      }
    }

    if (!seq.isCurrent(token)) return;
    setOrgs(list);

    // Hydrate this user's role per org (one query for the lot).
    if (list.length > 0 && user) {
      const { data: memberships } = await supabase
        .from('org_memberships')
        .select('org_id, role')
        .eq('user_id', user.id)
        .eq('status', 'accepted');
      if (!seq.isCurrent(token)) return;
      const byOrg: Record<string, MembershipRole> = {};
      for (const m of (memberships ?? []) as Array<{ org_id: string; role: MembershipRole }>) {
        byOrg[m.org_id] = m.role;
      }
      setRolesByOrg(byOrg);
    } else {
      setRolesByOrg({});
    }

    setLoading(false);
  }, [user, seq]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const currentOrg = useMemo(() => {
    if (orgs.length === 0) return null;
    return orgs.find((o) => o.id === currentId) ?? orgs[0] ?? null;
  }, [orgs, currentId]);

  const setCurrentOrgId = useCallback((id: string) => {
    setCurrentId(id);
    localStorage.setItem(SELECTED_KEY, id);
  }, []);

  const currentRole = useMemo<MembershipRole | null>(
    () => (currentOrg ? rolesByOrg[currentOrg.id] ?? null : null),
    [currentOrg, rolesByOrg],
  );
  const isOwner = currentRole === 'owner';

  const value = useMemo<OrgContextValue>(
    () => ({ orgs, currentOrg, currentRole, isOwner, loading, setCurrentOrgId, refresh: load }),
    [orgs, currentOrg, currentRole, isOwner, loading, setCurrentOrgId, load],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}
