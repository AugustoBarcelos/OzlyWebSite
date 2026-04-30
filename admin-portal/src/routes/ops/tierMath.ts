// Pure helpers pra trabalhar com tiered commission de afiliados.

export interface BonusTier {
  threshold: number;   // conversões necessárias no período
  bonus_cents: number; // bonus por conversão quando esse tier ativo
}

export const BONUS_PERIODS = [
  { value: 'monthly',   label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly',    label: 'Anual' },
  { value: 'lifetime',  label: 'Lifetime (sem reset)' },
] as const;

export type BonusPeriod = (typeof BONUS_PERIODS)[number]['value'];

/** Default tiers: $5 base + $2/$5/$10 bonuses (top tier = $15 total). */
export const DEFAULT_TIERS: BonusTier[] = [
  { threshold: 10,  bonus_cents: 200 },
  { threshold: 50,  bonus_cents: 500 },
  { threshold: 100, bonus_cents: 1000 },
];

/** Base default = $5 cents = 500. */
export const DEFAULT_BASE_CENTS = 500;

/** Find the highest tier reached given current period count. -1 if none. */
export function activeTierIdx(tiers: BonusTier[], count: number): number {
  if (!Array.isArray(tiers) || tiers.length === 0) return -1;
  const sorted = [...tiers].sort((a, b) => a.threshold - b.threshold);
  let idx = -1;
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    if (t && count >= t.threshold) idx = i;
  }
  return idx;
}

/** Per-conversion total cents at given count. */
export function totalCentsAtCount(
  baseCents: number,
  tiers: BonusTier[],
  count: number,
): number {
  const idx = activeTierIdx(tiers, count);
  if (idx === -1) return baseCents;
  const tier = [...tiers].sort((a, b) => a.threshold - b.threshold)[idx];
  return baseCents + (tier?.bonus_cents ?? 0);
}

/** Next tier to aim for, or null if topped out. */
export function nextTier(
  tiers: BonusTier[],
  count: number,
): { tier: BonusTier; needs: number } | null {
  const sorted = [...tiers].sort((a, b) => a.threshold - b.threshold);
  for (const t of sorted) {
    if (count < t.threshold) {
      return { tier: t, needs: t.threshold - count };
    }
  }
  return null;
}

export function formatMoneyCents(cents: number, currency: string): string {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}
