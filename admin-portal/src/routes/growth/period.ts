import { useSearchParams } from 'react-router-dom';

/** Periods available across Growth tabs. Mirrors dashboard convention. */
export const GROWTH_PERIODS = [
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
  { days: 365, label: '12m' },
] as const;

export type GrowthPeriodDays = (typeof GROWTH_PERIODS)[number]['days'];

const DEFAULT: GrowthPeriodDays = 30;

/**
 * URL-persisted period selector for Growth tabs. `?period=30` etc.
 *
 * Single source of truth so switching tabs preserves the picker, and bookmarks
 * include the time window. All Growth tabs that consume time-bound data take
 * this as a prop.
 */
export function useGrowthPeriod(): {
  period: GrowthPeriodDays;
  setPeriod: (days: GrowthPeriodDays) => void;
} {
  const [sp, setSp] = useSearchParams();
  const raw = sp.get('period');
  const parsed = raw ? Number(raw) : NaN;
  const period: GrowthPeriodDays = (
    GROWTH_PERIODS.find((p) => p.days === parsed)?.days ?? DEFAULT
  );

  const setPeriod = (days: GrowthPeriodDays) => {
    const next = new URLSearchParams(sp);
    if (days === DEFAULT) next.delete('period');
    else next.set('period', String(days));
    setSp(next, { replace: true });
  };

  return { period, setPeriod };
}
