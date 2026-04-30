// Shared types for the Users list + filters.

export type UserPlan = 'tfn' | 'abn' | 'pro' | 'free';
export type UserStatus = 'paying' | 'trial' | 'churned' | 'never';

export interface UserListRow {
  id: string;
  full_name: string | null;
  email_masked: string;
  role: string;
  plan: UserPlan;
  status: UserStatus;
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
  banned: number;
  deleted: number;
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

export const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;

/** Convert UserFilters → the jsonb the RPC accepts. Null/empty = no filter. */
export function filtersToRpc(f: UserFilters): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const trimmed = f.query.trim();
  if (trimmed.length >= 3) out.query = trimmed;
  if (f.plans.length > 0) out.plans = f.plans;
  if (f.statuses.length > 0) out.statuses = f.statuses;
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
  const role = sp.get('role');
  const banned = sp.get('banned');
  const deleted = sp.get('deleted');
  const sort = (sp.get('sort') ?? 'signup_desc') as SortKey;

  return {
    filters: {
      query: sp.get('q') ?? '',
      plans,
      statuses,
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

/** Active-filter count for the "Limpar filtros" pill. Excludes the search box. */
export function countActiveFilters(f: UserFilters): number {
  let n = 0;
  if (f.plans.length) n++;
  if (f.statuses.length) n++;
  if (f.signup_within_days) n++;
  if (f.active_within_days) n++;
  if (f.inactive) n++;
  if (f.role) n++;
  if (f.state.length) n++;
  if (f.banned !== null) n++;
  if (f.deleted !== null) n++;
  return n;
}
