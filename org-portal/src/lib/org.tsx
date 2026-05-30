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
import type { Organization } from '@/lib/types';

// Org payload stashed at signup. If email confirmation is enabled in Supabase,
// signUp returns no session, so the org can't be created until the user
// confirms + lands back authenticated — at which point this bootstrap fires.
export const PENDING_ORG_KEY = 'ozly-org-portal-pending-org';
export interface PendingOrg { name: string; abn: string; admin_email: string }

interface OrgContextValue {
  orgs: Organization[];
  currentOrg: Organization | null;
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

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(
    () => localStorage.getItem(SELECTED_KEY),
  );
  const [loading, setLoading] = useState(true);
  // Guards against double org creation (React StrictMode re-runs effects, and
  // an auth-state change can race the initial load). org_create_with_owner is
  // NOT idempotent — without this we'd create two orgs.
  const creatingRef = useRef(false);

  const load = useCallback(async () => {
    if (!user) {
      setOrgs([]);
      setLoading(false);
      return;
    }
    // Orgs where this user is an accepted owner/admin. RLS already restricts
    // organizations to is_org_admin, so a plain select is safe.
    const { data } = await supabase
      .from('organizations')
      .select('id, name, abn, admin_email, billing_plan, trial_ends_at, created_at, period_frequency, period_anchor')
      .order('created_at', { ascending: true });
    let list = (data ?? []) as Organization[];

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
            const { data: after } = await supabase
              .from('organizations')
              .select('id, name, abn, admin_email, billing_plan, trial_ends_at, created_at, period_frequency, period_anchor')
              .order('created_at', { ascending: true });
            list = (after ?? []) as Organization[];
          } else {
            creatingRef.current = false; // allow a retry on next load
          }
        } catch {
          creatingRef.current = false;
        }
      }
    }

    setOrgs(list);
    setLoading(false);
  }, [user]);

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

  const value = useMemo<OrgContextValue>(
    () => ({ orgs, currentOrg, loading, setCurrentOrgId, refresh: load }),
    [orgs, currentOrg, loading, setCurrentOrgId, load],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}
