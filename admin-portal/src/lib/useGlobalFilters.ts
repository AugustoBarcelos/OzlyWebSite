import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Global filters persisted via URL query params.
 *
 * Allows the user to set period/channel/plan/geo on one page and have those
 * carry over when they navigate to another page (since URL params are part of
 * navigation).
 *
 * Usage:
 *   const { filters, setFilter, clearFilter } = useGlobalFilters();
 *   const period = filters.period; // '7' | '14' | '30' | '90' | 'custom'
 *   setFilter('period', '30');
 */

export type PeriodValue = '7' | '14' | '30' | '90' | 'custom';
export type ChannelValue = 'all' | 'organic' | 'google' | 'meta' | 'asa' | 'tiktok' | 'referral' | 'affiliate';
export type PlanValue = 'all' | 'tfn' | 'abn' | 'pro';

export interface GlobalFilters {
  period: PeriodValue;
  channel: ChannelValue;
  plan: PlanValue;
  geo: string; // ISO country code or 'all'
}

const DEFAULTS: GlobalFilters = {
  period: '30',
  channel: 'all',
  plan: 'all',
  geo: 'all',
};

const VALID_PERIODS: ReadonlyArray<PeriodValue> = ['7', '14', '30', '90', 'custom'];
const VALID_CHANNELS: ReadonlyArray<ChannelValue> = [
  'all',
  'organic',
  'google',
  'meta',
  'asa',
  'tiktok',
  'referral',
  'affiliate',
];
const VALID_PLANS: ReadonlyArray<PlanValue> = ['all', 'tfn', 'abn', 'pro'];

function parsePeriod(v: string | null): PeriodValue {
  if (v && (VALID_PERIODS as ReadonlyArray<string>).includes(v)) return v as PeriodValue;
  return DEFAULTS.period;
}
function parseChannel(v: string | null): ChannelValue {
  if (v && (VALID_CHANNELS as ReadonlyArray<string>).includes(v)) return v as ChannelValue;
  return DEFAULTS.channel;
}
function parsePlan(v: string | null): PlanValue {
  if (v && (VALID_PLANS as ReadonlyArray<string>).includes(v)) return v as PlanValue;
  return DEFAULTS.plan;
}

export function useGlobalFilters() {
  const [params, setParams] = useSearchParams();

  const filters: GlobalFilters = useMemo(
    () => ({
      period: parsePeriod(params.get('period')),
      channel: parseChannel(params.get('channel')),
      plan: parsePlan(params.get('plan')),
      geo: params.get('geo') || DEFAULTS.geo,
    }),
    [params],
  );

  const setFilter = useCallback(
    <K extends keyof GlobalFilters>(key: K, value: GlobalFilters[K]) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === DEFAULTS[key]) {
            next.delete(key);
          } else {
            next.set(key, String(value));
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const clearFilter = useCallback(
    (key: keyof GlobalFilters) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete(key);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const clearAll = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const k of ['period', 'channel', 'plan', 'geo'] as const) next.delete(k);
        return next;
      },
      { replace: true },
    );
  }, [setParams]);

  const periodDays = useMemo<number>(() => {
    if (filters.period === 'custom') return 30; // fallback until custom dates wired
    return Number(filters.period);
  }, [filters.period]);

  return { filters, setFilter, clearFilter, clearAll, periodDays };
}
