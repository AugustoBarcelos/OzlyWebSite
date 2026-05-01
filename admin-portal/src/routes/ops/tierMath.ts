// Helpers do modelo de comissão tiered (lump-sum) + retention bonuses.
//
// MODELO:
//   - Base: $X por conversão (commission_cents na affiliates table)
//   - Volume tiers: lump-sum [{ threshold, bonus_cents }] pago UMA VEZ
//     quando afiliado atinge threshold conversões no bonus_period.
//   - Retention bonuses: [{ months, bonus_cents }] pago por user que
//     fica X meses ativo após first_purchase.

export interface VolumeTier {
  threshold: number;   // conversões necessárias no período
  bonus_cents: number; // lump-sum quando atinge essa quantidade
}

export interface RetentionBonus {
  months: 3 | 6 | 12;
  bonus_cents: number;
}

export const BONUS_PERIODS = [
  { value: 'monthly',   label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly',    label: 'Anual' },
  { value: 'lifetime',  label: 'Lifetime (sem reset)' },
] as const;

export type BonusPeriod = (typeof BONUS_PERIODS)[number]['value'];

/** Default volume tiers: $100 lump em ≥50, $300 em ≥100. */
export const DEFAULT_VOLUME_TIERS: VolumeTier[] = [
  { threshold: 50,  bonus_cents: 10000 },
  { threshold: 100, bonus_cents: 30000 },
];

/** Default retention: $5 a cada milestone (3/6/12 meses). */
export const DEFAULT_RETENTION: RetentionBonus[] = [
  { months: 3,  bonus_cents: 500 },
  { months: 6,  bonus_cents: 500 },
  { months: 12, bonus_cents: 500 },
];

/** Base default = $10 cents = 1000. */
export const DEFAULT_BASE_CENTS = 1000;

/** Highest threshold reached, given count. -1 if none. */
export function activeVolumeIdx(tiers: VolumeTier[], count: number): number {
  if (!Array.isArray(tiers) || tiers.length === 0) return -1;
  const sorted = [...tiers].sort((a, b) => a.threshold - b.threshold);
  let idx = -1;
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    if (t && count >= t.threshold) idx = i;
  }
  return idx;
}

/** Lump-sum cents already triggered if user counted up to `count`. */
export function volumeBonusEarnedCents(
  tiers: VolumeTier[],
  count: number,
): number {
  return tiers
    .filter((t) => count >= t.threshold)
    .reduce((sum, t) => sum + t.bonus_cents, 0);
}

/** Effective avg rate per conversion (base + spreaded lump bonuses). */
export function effectiveAvgCents(
  baseCents: number,
  tiers: VolumeTier[],
  count: number,
): number {
  if (count <= 0) return baseCents;
  const lumps = volumeBonusEarnedCents(tiers, count);
  return baseCents + Math.round(lumps / count);
}

/** Next volume tier to aim for, or null if topped out. */
export function nextVolumeTier(
  tiers: VolumeTier[],
  count: number,
): { tier: VolumeTier; needs: number } | null {
  const sorted = [...tiers].sort((a, b) => a.threshold - b.threshold);
  for (const t of sorted) {
    if (count < t.threshold) {
      return { tier: t, needs: t.threshold - count };
    }
  }
  return null;
}

/** Total payable for ONE user that stays N months: base + retention crossed. */
export function lifetimePayoutCents(
  baseCents: number,
  retention: RetentionBonus[],
  monthsAlive: number,
): number {
  return (
    baseCents +
    retention
      .filter((r) => monthsAlive >= r.months)
      .reduce((sum, r) => sum + r.bonus_cents, 0)
  );
}

/** Sum of base + ALL retention bonuses (max payout per user, after 12 months). */
export function maxLifetimePayoutCents(
  baseCents: number,
  retention: RetentionBonus[],
): number {
  return baseCents + retention.reduce((sum, r) => sum + r.bonus_cents, 0);
}

export function formatMoneyCents(cents: number, currency: string): string {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

// Backwards-compat aliases (algumas tels antigas ainda usam o nome velho).
export type BonusTier = VolumeTier;
export const DEFAULT_TIERS = DEFAULT_VOLUME_TIERS;
export const activeTierIdx = activeVolumeIdx;
export const nextTier = nextVolumeTier;
/** @deprecated use volumeBonusEarnedCents */
export function totalCentsAtCount(
  baseCents: number,
  tiers: VolumeTier[],
  count: number,
): number {
  return effectiveAvgCents(baseCents, tiers, count);
}
