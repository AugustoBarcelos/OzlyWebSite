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

export type PeriodValue = '1' | '7' | '14' | '30' | '90' | 'custom';
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

const VALID_PERIODS: ReadonlyArray<PeriodValue> = ['1', '7', '14', '30', '90', 'custom'];
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

// Persist the chosen filters so they survive navigation even when a target
// page's link doesn't carry the query string (e.g. cockpit cards). URL param
// wins when present (shareable links); otherwise we fall back to the last
// choice from localStorage.
const STORAGE_KEY = 'ozly_admin_global_filters';
function readFilterStore(): Partial<Record<keyof GlobalFilters, string>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<keyof GlobalFilters, string>) : {};
  } catch {
    return {};
  }
}
function writeFilterStore(patch: Partial<Record<keyof GlobalFilters, string>>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readFilterStore(), ...patch }));
  } catch {
    /* ignore */
  }
}

export function useGlobalFilters() {
  const [params, setParams] = useSearchParams();

  const filters: GlobalFilters = useMemo(
    () => {
      const s = readFilterStore();
      return {
        period: parsePeriod(params.get('period') ?? s.period ?? null),
        channel: parseChannel(params.get('channel') ?? s.channel ?? null),
        plan: parsePlan(params.get('plan') ?? s.plan ?? null),
        geo: params.get('geo') || s.geo || DEFAULTS.geo,
      };
    },
    [params],
  );

  const setFilter = useCallback(
    <K extends keyof GlobalFilters>(key: K, value: GlobalFilters[K]) => {
      // Persist every explicit choice (incl. default) so it carries across
      // navigation even when the URL param is dropped.
      writeFilterStore({ [key]: String(value) } as Partial<Record<keyof GlobalFilters, string>>);
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
      writeFilterStore({ [key]: String(DEFAULTS[key]) } as Partial<Record<keyof GlobalFilters, string>>);
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
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
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
