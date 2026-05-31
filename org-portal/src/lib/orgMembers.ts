import { supabase } from '@/lib/supabase';
import { captureException } from '@/lib/sentry';
import type { BillingConfig } from '@/lib/period';

// PG error codes that mean "missing schema element" (column / table / RPC).
// These are migration-not-applied conditions — we degrade silently because
// the UI defends against them with a banner.
function isSchemaDriftError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  const code = err.code ?? '';
  if (code === '42P01' || code === '42703' || code === 'PGRST202' || code === 'PGRST205' || code === '42883') {
    return true;
  }
  const msg = (err.message ?? '').toLowerCase();
  return msg.includes('could not find the function') || msg.includes('does not exist');
}

// Per-member billing cycle (frequency + anchor), keyed by user_id. Used to group
// the Work and Invoices screens by member → period. Missing members fall back to
// the default cycle inside periodFor(). Schema-drift errors are silenced;
// genuine RLS / network errors surface to Sentry.
export async function fetchBillingConfigs(orgId: string): Promise<Record<string, BillingConfig>> {
  const { data, error } = await supabase
    .from('org_memberships')
    .select('user_id, billing_frequency, billing_anchor')
    .eq('org_id', orgId)
    .eq('status', 'accepted');
  if (error && !isSchemaDriftError(error)) {
    try { captureException(error, { source: 'fetchBillingConfigs' }); } catch { /* no-op */ }
  }
  const map: Record<string, BillingConfig> = {};
  for (const r of (data ?? []) as {
    user_id: string;
    billing_frequency: BillingConfig['frequency'];
    billing_anchor: string | null;
  }[]) {
    map[r.user_id] = { frequency: r.billing_frequency, anchor: r.billing_anchor };
  }
  return map;
}

export function configFor(map: Record<string, BillingConfig>, userId: string): BillingConfig {
  return map[userId] ?? { frequency: 'fortnightly', anchor: null };
}

// V2 mixed-billing visibility. Each member resolves to ONE of these labels in
// the Members table. The org owner uses it to spot conflicts ("why is this
// person on a top-up when I'm already covering them?") and to understand who
// is actually billed where.
export type BillingSource =
  | 'org_only'      // org_subsidy active, no topup, no self-paid
  | 'topup_abn'     // org_subsidy active + topup_abn_active
  | 'topup_pro'     // org_subsidy active + topup_pro_active
  | 'self_paid_abn' // self-paid ABN (no subsidy or subsidy overridden)
  | 'self_paid_pro' // self-paid PRO
  | 'none';

interface BillingSourceInput {
  hasOrgSubsidy: boolean;
  topupAbn: boolean;
  topupPro: boolean;
  selfAbn: boolean;
  selfPro: boolean;
}

export function resolveBillingSource(i: BillingSourceInput): BillingSource {
  if (i.selfPro) return 'self_paid_pro';
  if (i.selfAbn) return 'self_paid_abn';
  if (i.hasOrgSubsidy && i.topupPro) return 'topup_pro';
  if (i.hasOrgSubsidy && i.topupAbn) return 'topup_abn';
  if (i.hasOrgSubsidy) return 'org_only';
  return 'none';
}

/**
 * Fetches the mixed-billing source for every accepted member of an org in
 * ONE round-trip (3 queries: memberships, grants, entitlements). Centralised
 * here so the Members table doesn't N+1.
 */
export async function fetchMixedBillingByMember(orgId: string): Promise<Record<string, BillingSource>> {
  const [
    membersRes,
    grantsRes,
    entsRes,
    rcRes,
  ] = await Promise.all([
    supabase
      .from('org_memberships')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('status', 'accepted'),
    supabase
      .from('org_entitlement_grants')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('source', 'org_subsidy')
      .eq('entitlement', 'abn_access')
      .eq('status', 'active'),
    // Defensive: if migration 20260603100000 (entitlement_v2) hasn't been
    // applied yet (column missing), fall back silently. Other errors surface.
    supabase
      .from('user_entitlements')
      .select('user_id, topup_abn_active, topup_abn_expires_at, topup_pro_active, topup_pro_expires_at'),
    supabase
      .from('revenuecat_snapshot')
      .select('user_id, plan, is_active, store'),
  ]);

  // Per-query error reporting (Sentry) — silence only schema-drift errors.
  for (const [name, res] of Object.entries({
    members: membersRes,
    grants:  grantsRes,
    ents:    entsRes,
    rc:      rcRes,
  })) {
    if (res.error && !isSchemaDriftError(res.error)) {
      try { captureException(res.error, { source: `fetchMixedBillingByMember.${name}` }); } catch { /* no-op */ }
    }
  }

  const members = membersRes.data;
  const grants  = grantsRes.data;
  const ents    = entsRes.error ? [] : entsRes.data;
  const rc      = rcRes.data;

  const subsidyByUser = new Set((grants ?? []).map((g: { user_id: string }) => g.user_id));
  const entsByUser = new Map<string, { abn: boolean; pro: boolean }>();
  const now = Date.now();
  for (const e of (ents ?? []) as Array<{
    user_id: string;
    topup_abn_active?: boolean;
    topup_abn_expires_at?: string | null;
    topup_pro_active?: boolean;
    topup_pro_expires_at?: string | null;
  }>) {
    const abn = !!e.topup_abn_active && (!e.topup_abn_expires_at || new Date(e.topup_abn_expires_at).getTime() > now);
    const pro = !!e.topup_pro_active && (!e.topup_pro_expires_at || new Date(e.topup_pro_expires_at).getTime() > now);
    entsByUser.set(e.user_id, { abn, pro });
  }
  const rcByUser = new Map<string, { abn: boolean; pro: boolean }>();
  for (const r of (rc ?? []) as Array<{ user_id: string; plan: string | null; is_active: boolean; store: string | null }>) {
    const promotional = (r.store ?? '').toLowerCase() === 'promotional';
    if (!r.is_active || promotional) continue;
    rcByUser.set(r.user_id, {
      abn: r.plan === 'abn',
      pro: r.plan === 'pro',
    });
  }

  const result: Record<string, BillingSource> = {};
  for (const m of (members ?? []) as Array<{ user_id: string }>) {
    const ent = entsByUser.get(m.user_id) ?? { abn: false, pro: false };
    const r = rcByUser.get(m.user_id) ?? { abn: false, pro: false };
    result[m.user_id] = resolveBillingSource({
      hasOrgSubsidy: subsidyByUser.has(m.user_id),
      topupAbn: ent.abn,
      topupPro: ent.pro,
      selfAbn: r.abn,
      selfPro: r.pro,
    });
  }
  return result;
}
