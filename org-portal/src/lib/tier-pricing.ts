// Single source of truth for V2 seat-tier pricing in the org portal.
//
// Mirrors the Stripe Prices you created with the lookup_keys below
// (V2_USER_CONFIG.md §Stripe). The org portal NEVER hardcodes price_ids —
// it always references lookup_keys, and the edge function `org-update-tier`
// resolves them via Stripe's prices/search API at runtime.
//
// Annual = monthly × 10 (≈17% off — "2 months free" framing).
//
// Naming: cleaning-industry-shaped progression — Crew → Squad → Fleet →
// Operation → Custom. "Fleet" intentionally evokes the white-van + uniformed-
// crew picture cleaning companies have of themselves. The custom tier
// (org_custom) has null prices — it's a sales-led "contact us" entry.

export type TierKey = 'org_t1' | 'org_t2' | 'org_t3' | 'org_t4' | 'org_custom';
export type BillingInterval = 'month' | 'year';
export type PriceLookupKey =
  | 'org_t1_monthly' | 'org_t1_annual'
  | 'org_t2_monthly' | 'org_t2_annual'
  | 'org_t3_monthly' | 'org_t3_annual'
  | 'org_t4_monthly' | 'org_t4_annual';

export interface TierDefinition {
  key: TierKey;
  rank: number; // 1..5 — useful for comparing
  minSeats: number;
  maxSeats: number | null; // null = unbounded (custom)
  /** AUD inc GST. 0 for the custom tier — sales-led. */
  unitMonthly: number;
  /** AUD inc GST per seat per year (monthly × 10). 0 for custom. */
  unitAnnualPerYear: number;
  /** Stripe lookup keys — null for the custom tier (not in Stripe). */
  monthlyLookupKey: PriceLookupKey | null;
  annualLookupKey: PriceLookupKey | null;
  /** Display name shown to users (e.g. "Fleet"). */
  label: string;
  /** Seat-range subtitle (e.g. "16–30 seats"). */
  seatsLabel: string;
  /** One-line pitch for the plan picker. */
  tagline: string;
  /** True when there's no self-serve checkout — opens the contact path. */
  contactSales?: boolean;
}

export const TIERS: ReadonlyArray<TierDefinition> = [
  {
    key: 'org_t1',  rank: 1,
    minSeats: 1, maxSeats: 5,
    unitMonthly: 14.99, unitAnnualPerYear: 149.90,
    monthlyLookupKey: 'org_t1_monthly', annualLookupKey: 'org_t1_annual',
    label: 'Crew',
    seatsLabel: '1–5 seats',
    tagline: 'Starting out — your first hires.',
  },
  {
    key: 'org_t2',  rank: 2,
    minSeats: 6, maxSeats: 15,
    unitMonthly: 12.99, unitAnnualPerYear: 129.90,
    monthlyLookupKey: 'org_t2_monthly', annualLookupKey: 'org_t2_annual',
    label: 'Squad',
    seatsLabel: '6–15 seats',
    tagline: 'A real team, organised across shifts.',
  },
  {
    key: 'org_t3',  rank: 3,
    minSeats: 16, maxSeats: 30,
    unitMonthly: 9.99, unitAnnualPerYear: 99.90,
    monthlyLookupKey: 'org_t3_monthly', annualLookupKey: 'org_t3_annual',
    label: 'Fleet',
    seatsLabel: '16–30 seats',
    tagline: 'Multiple crews, multiple sites.',
  },
  {
    key: 'org_t4',  rank: 4,
    minSeats: 31, maxSeats: 100,
    unitMonthly: 7.99, unitAnnualPerYear: 79.90,
    monthlyLookupKey: 'org_t4_monthly', annualLookupKey: 'org_t4_annual',
    label: 'Operation',
    seatsLabel: '31–100 seats',
    tagline: 'Regional player — invoices flowing daily.',
  },
  {
    key: 'org_custom',  rank: 5,
    minSeats: 101, maxSeats: null,
    unitMonthly: 0, unitAnnualPerYear: 0,
    monthlyLookupKey: null, annualLookupKey: null,
    label: 'Custom',
    seatsLabel: '100+ seats',
    tagline: 'Custom pricing, dedicated success contact, SSO.',
    contactSales: true,
  },
];

export const DOWNGRADE_REASONS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'team_shrunk',     label: 'Our team shrunk' },
  { key: 'cost',            label: 'Cost is too high' },
  { key: 'underused',       label: "We don't use it enough" },
  { key: 'missing_feature', label: "We're missing a feature" },
  { key: 'other',           label: 'Other' },
];

export function tierForSeats(seats: number): TierDefinition {
  // Zero / negative seats: fall to lowest tier. Otherwise an org with no
  // accepted members yet (or a Supabase row with null) would silently price
  // at the most expensive tier, which violates principle of least surprise.
  if (seats <= 0) return TIERS[0]!;
  for (const t of TIERS) {
    if (seats >= t.minSeats && (t.maxSeats === null || seats <= t.maxSeats)) return t;
  }
  // >max → custom (the array now ends with the 100+ custom tier).
  return TIERS[TIERS.length - 1]!;
}

export function tierByLookupKey(key: string | null | undefined): TierDefinition | null {
  if (!key) return null;
  return TIERS.find((t) => t.monthlyLookupKey === key || t.annualLookupKey === key) ?? null;
}

export function isAnnual(key: string | null | undefined): boolean {
  return !!key && key.endsWith('_annual');
}

export function intervalFromKey(key: string | null | undefined): BillingInterval {
  return isAnnual(key) ? 'year' : 'month';
}

/** Effective AUD/month per seat for a tier+interval pair (annual amortized). */
export function unitMonthlyPrice(t: TierDefinition, interval: BillingInterval): number {
  return interval === 'year' ? t.unitAnnualPerYear / 12 : t.unitMonthly;
}

/** Total monthly bill (or annualised) at given seats, tier and interval. */
export function totalAmount(seats: number, t: TierDefinition, interval: BillingInterval): number {
  return Math.round(unitMonthlyPrice(t, interval) * seats * 100) / 100;
}

/** Suggest the next tier UP (or null if already top). */
export function nextTier(current: TierDefinition): TierDefinition | null {
  return TIERS.find((t) => t.rank === current.rank + 1) ?? null;
}

/** Saving versus current — comparing same seats at next tier. */
export function savingsAtNextTier(seats: number, current: TierDefinition, interval: BillingInterval): {
  next: TierDefinition;
  seatsNeeded: number;
  savingMonthly: number;
} | null {
  const next = nextTier(current);
  if (!next || next.contactSales) return null; // can't compute savings without a price
  const seatsNeeded = Math.max(0, next.minSeats - seats);
  const currentBill = totalAmount(seats, current, interval);
  const nextBill = totalAmount(Math.max(seats, next.minSeats), next, interval);
  return { next, seatsNeeded, savingMonthly: Math.max(0, currentBill - nextBill) };
}
