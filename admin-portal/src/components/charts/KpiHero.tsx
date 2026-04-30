import { BadgeDelta, SparkAreaChart } from '@tremor/react';
import { formatNumber } from '@/lib/format';

/**
 * KpiHero — large headline KPI used at the top of each dashboard tab.
 *
 * - Renders "—" when value is null (metric pending RC sync etc.) instead of "0".
 * - Optional sparkline (`series`) shown on the right.
 * - Optional delta badge (`delta` is a fraction, e.g. 0.123 = +12.3%).
 * - Skeleton when `loading` and no value yet.
 */
export interface KpiHeroProps {
  label: string;
  value: number | null;
  formatter?: (n: number | null) => string;
  delta?: number;
  isIncreasePositive?: boolean;
  hint?: string;
  loading?: boolean;
  series?: Array<Record<string, number | string>> | undefined;
  /** key in series data to use for the y axis (default 'value') */
  seriesIndex?: string;
  seriesCategory?: string;
  /** Tone drives the accent color: brand (default), warning (churn), neutral. */
  tone?: 'brand' | 'lime' | 'warning' | 'neutral';
}

const TONE_CLASS: Record<NonNullable<KpiHeroProps['tone']>, string> = {
  brand: 'text-brand-600',
  lime: 'text-lime-600',
  warning: 'text-red-600',
  neutral: 'text-navy-700',
};

const SPARK_COLOR: Record<NonNullable<KpiHeroProps['tone']>, 'emerald' | 'lime' | 'red' | 'slate'> = {
  brand: 'emerald',
  lime: 'lime',
  warning: 'red',
  neutral: 'slate',
};

function deltaTypeFor(d: number): 'increase' | 'decrease' | 'unchanged' {
  if (d > 0.005) return 'increase';
  if (d < -0.005) return 'decrease';
  return 'unchanged';
}

export function KpiHero({
  label,
  value,
  formatter = formatNumber,
  delta,
  isIncreasePositive = true,
  hint,
  loading = false,
  series,
  seriesIndex = 'date',
  seriesCategory = 'value',
  tone = 'brand',
}: KpiHeroProps) {
  return (
    <div className="ozly-card ozly-card-hero relative px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300">
            {label}
          </div>
          {loading ? (
            <div className="mt-2 h-9 w-28 animate-pulse rounded bg-navy-50" />
          ) : (
            <div className={`mt-1 text-3xl font-semibold ${TONE_CLASS[tone]}`}>
              {formatter(value)}
            </div>
          )}
          {hint && !loading && (
            <div className="mt-1 text-xs text-navy-300">{hint}</div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {!loading && delta !== undefined && Number.isFinite(delta) && (
            <BadgeDelta
              deltaType={deltaTypeFor(delta)}
              isIncreasePositive={isIncreasePositive}
              size="xs"
            >
              {`${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`}
            </BadgeDelta>
          )}
          {series && series.length > 1 && !loading && (
            <SparkAreaChart
              data={series}
              categories={[seriesCategory]}
              index={seriesIndex}
              colors={[SPARK_COLOR[tone]]}
              className="h-10 w-28"
            />
          )}
        </div>
      </div>
    </div>
  );
}
