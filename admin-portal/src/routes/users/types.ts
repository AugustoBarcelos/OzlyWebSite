// Shared types for the Users list + filters.

export type UserPlan = 'tfn' | 'abn' | 'pro' | 'free';
export type UserStatus = 'paying' | 'trial' | 'churned' | 'never';
export type UserStore = 'app_store' | 'play_store' | 'promotional';

/** Six-bucket lifecycle classification derived from RC snapshot.
 *  Distinguishes signup-only / trial-lapsed / churned-paying / etc.
 *  See migration 20260524104427_admin_list_users_lifecycle.sql for derivation. */
export type LifecycleState =
  | 'paying'
  | 'trial'
  | 'promo'
  | 'trial_expired'
  | 'churned'
  | 'never_engaged';

export interface UserListRow {
  id: string;
  full_name: string | null;
  email_masked: string;
  role: string;
  plan: UserPlan;
  status: UserStatus;
  lifecycle_state: LifecycleState;
  store: UserStore | null;
  is_active: boolean;
  monthly_price_aud: number | null;
  signup_date: string;
  last_seen_at: string | null;
  last_seen_country: string | null;
  last_seen_platform: string | null;
  last_seen_app_version: string | null;
  country: string | null;
  state: string | null;
  is_banned: boolean;
  is_deleted: boolean;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  total_revenue_usd_cents: number | null;
}

export interface UserListStats {
  paying: number;
  trial: number;
  churned: number;
  never: number;
  plan_tfn: number;
  plan_abn: number;
  plan_pro: number;
  plan_free: number;
  store_app_store: number;
  store_play_store: number;
  store_promotional: number;
  banned: number;
  deleted: number;
  // Lifecycle counters (from migration 20260524104427)
  lc_paying: number;
  lc_trial: number;
  lc_promo: number;
  lc_trial_expired: number;
  lc_churned: number;
  lc_never_engaged: number;
}

export interface UserListResponse {
  total_unfiltered: number;
  total_filtered: number;
  limit: number;
  offset: number;
  sort: SortKey;
  rows: UserListRow[];
  stats: UserListStats;
}

export type SortKey =
  | 'signup_desc'
  | 'signup_asc'
  | 'last_seen_desc'
  | 'last_seen_asc'
  | 'mrr_desc';

export interface UserFilters {
  query: string;
  plans: UserPlan[];
  statuses: UserStatus[];
  lifecycles: LifecycleState[];
  stores: UserStore[];
  signup_within_days: number | null; // 7|30|90|365|null=all
  active_within_days: number | null; // 7|30|null=all
  inactive: boolean; // last_seen > 30d OR never_seen
  role: 'admin' | 'user' | null;
  state: string[];
  banned: boolean | null;
  deleted: boolean | null;
}

export const EMPTY_FILTERS: UserFilters = {
  query: '',
  plans: [],
  statuses: [],
  lifecycles: [],
  stores: [],
  signup_within_days: null,
  active_within_days: null,
  inactive: false,
  role: null,
  state: [],
  banned: null,
  deleted: null,
};

export const PLAN_LABEL: Record<UserPlan, string> = {
  tfn: 'TFN',
  abn: 'ABN',
  pro: 'PRO',
  free: 'Free',
};

export const STATUS_LABEL: Record<UserStatus, string> = {
  paying: 'Pagando',
  trial: 'Trial',
  churned: 'Cancelou',
  never: 'Nunca pagou',
};

export const LIFECYCLE_LABEL: Record<LifecycleState, string> = {
  paying: 'Pagando',
  trial: 'Trial',
  promo: 'Promo',
  trial_expired: 'Trial expirou',
  churned: 'Churn',
  never_engaged: 'Nunca engajou',
};

/** Short description of what each lifecycle state means — used as tooltip
 *  and on the User 360 lifecycle card. */
export const LIFECYCLE_HINT: Record<LifecycleState, string> = {
  paying: 'Assinatura ativa, pagando agora.',
  trial: 'Em trial. Convém win-back se vence em < 3d.',
  promo: 'Tem grant promocional ativo.',
  trial_expired: 'Tinha trial, expirou sem converter. Alvo de win-back.',
  churned: 'Era pagante e cancelou — período acabou. Alvo de reativação.',
  never_engaged: 'Signup, mas nunca abriu o paywall.',
};

export const STORE_LABEL: Record<UserStore, string> = {
  app_store: 'App Store',
  play_store: 'Play Store',
  promotional: 'Promo',
};

export const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;

/** Convert UserFilters → the jsonb the RPC accepts. Null/empty = no filter. */
export function filtersToRpc(f: UserFilters): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const trimmed = f.query.trim();
  if (trimmed.length >= 3) out.query = trimmed;
  if (f.plans.length > 0) out.plans = f.plans;
  if (f.statuses.length > 0) out.statuses = f.statuses;
  if (f.lifecycles.length > 0) out.lifecycles = f.lifecycles;
  if (f.stores.length > 0) out.stores = f.stores;
  if (f.signup_within_days) out.signup_within_days = f.signup_within_days;
  if (f.active_within_days) out.active_within_days = f.active_within_days;
  if (f.inactive) out.inactive = true;
  if (f.role) out.role = f.role;
  if (f.state.length > 0) out.state = f.state;
  if (f.banned !== null) out.banned = f.banned;
  if (f.deleted !== null) out.deleted = f.deleted;
  return out;
}

/** Encode filters into URLSearchParams so users can bookmark/share. */
export function filtersToSearchParams(f: UserFilters, sort: SortKey): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.query.trim()) sp.set('q', f.query.trim());
  if (f.plans.length) sp.set('plan', f.plans.join(','));
  if (f.statuses.length) sp.set('status', f.statuses.join(','));
  if (f.lifecycles.length) sp.set('lifecycle', f.lifecycles.join(','));
  if (f.stores.length) sp.set('store', f.stores.join(','));
  if (f.signup_within_days) sp.set('signup', String(f.signup_within_days));
  if (f.active_within_days) sp.set('active', String(f.active_within_days));
  if (f.inactive) sp.set('inactive', '1');
  if (f.role) sp.set('role', f.role);
  if (f.state.length) sp.set('state', f.state.join(','));
  if (f.banned !== null) sp.set('banned', f.banned ? '1' : '0');
  if (f.deleted !== null) sp.set('deleted', f.deleted ? '1' : '0');
  if (sort !== 'signup_desc') sp.set('sort', sort);
  return sp;
}

export function searchParamsToFilters(
  sp: URLSearchParams,
): { filters: UserFilters; sort: SortKey } {
  const csv = (k: string): string[] =>
    (sp.get(k) ?? '').split(',').map((s) => s.trim()).filter(Boolean);

  const plans = csv('plan').filter(
    (p): p is UserPlan => p === 'tfn' || p === 'abn' || p === 'pro' || p === 'free',
  );
  const statuses = csv('status').filter(
    (s): s is UserStatus =>
      s === 'paying' || s === 'trial' || s === 'churned' || s === 'never',
  );
  const lifecycles = csv('lifecycle').filter(
    (s): s is LifecycleState =>
      s === 'paying' || s === 'trial' || s === 'promo' ||
      s === 'trial_expired' || s === 'churned' || s === 'never_engaged',
  );
  const stores = csv('store').filter(
    (s): s is UserStore =>
      s === 'app_store' || s === 'play_store' || s === 'promotional',
  );
  const role = sp.get('role');
  const banned = sp.get('banned');
  const deleted = sp.get('deleted');
  const sort = (sp.get('sort') ?? 'signup_desc') as SortKey;

  return {
    filters: {
      query: sp.get('q') ?? '',
      plans,
      statuses,
      lifecycles,
      stores,
      signup_within_days: sp.get('signup') ? Number(sp.get('signup')) : null,
      active_within_days: sp.get('active') ? Number(sp.get('active')) : null,
      inactive: sp.get('inactive') === '1',
      role: role === 'admin' || role === 'user' ? role : null,
      state: csv('state'),
      banned: banned === '1' ? true : banned === '0' ? false : null,
      deleted: deleted === '1' ? true : deleted === '0' ? false : null,
    },
    sort,
  };
}

/** Mirror of the SQL CASE in admin_list_users (migration 20260524104427).
 *  Used to derive lifecycle on the User 360 page where the RPC payload is
 *  different. Inputs are RC snapshot fields; null-safe everywhere. */
export function deriveLifecycleState(input: {
  has_rc_row: boolean;
  status?: string | null | undefined;
  is_active?: boolean | null | undefined;
  store?: string | null | undefined;
  trial_started_at?: string | null | undefined;
  /** Either dollars (User 360) or cents (list RPC). Either is fine — we just
   *  check whether it's > 0. */
  total_revenue?: number | null | undefined;
}): LifecycleState {
  if (!input.has_rc_row) return 'never_engaged';
  const active = !!input.is_active;
  const revenue = input.total_revenue ?? 0;
  const store = input.store ?? '';
  const status = input.status ?? '';

  if (active && store === 'promotional') return 'promo';
  if (active && status === 'paying') return 'paying';
  if (active && status === 'trial') return 'trial';
  if (active) return 'paying';
  if (!active && revenue > 0) return 'churned';
  if (!active && input.trial_started_at && revenue === 0) return 'trial_expired';
  if (status === 'churned' && revenue > 0) return 'churned';
  if (status === 'churned') return 'trial_expired';
  return 'never_engaged';
}

/** Active-filter count for the "Limpar filtros" pill. Excludes the search box. */
export function countActiveFilters(f: UserFilters): number {
  let n = 0;
  if (f.plans.length) n++;
  if (f.statuses.length) n++;
  if (f.lifecycles.length) n++;
  if (f.stores.length) n++;
  if (f.signup_within_days) n++;
  if (f.active_within_days) n++;
  if (f.inactive) n++;
  if (f.role) n++;
  if (f.state.length) n++;
  if (f.banned !== null) n++;
  if (f.deleted !== null) n++;
  return n;
}
