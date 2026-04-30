import { BadgeDelta, Card, Metric, Text } from '@tremor/react';
import { formatNumber } from '@/lib/format';

/**
 * KpiCard — Tremor Card wrapper with consistent props for every KPI tile.
 *
 *  - `value === null` → renders "—" (e.g. metrics that depend on RC sync
 *    we haven't built yet; never show "0" because that's misleading).
 *  - `loading` → renders an animate-pulse skeleton instead of the metric.
 *  - `delta` → optional BadgeDelta. Sign of delta drives the badge type
 *    unless `isIncreasePositive` is overridden (e.g. churn going up is bad).
 */

export interface KpiCardProps {
  title: string;
  value: number | null;
  /** Optional delta vs previous period. Pass +0.123 for +12.3%. */
  delta?: number;
  /** Defaults to true. Pass `false` for metrics where increase is bad (churn). */
  isIncreasePositive?: boolean;
  subtitle?: string;
  /** Custom formatter; defaults to `formatNumber`. */
  formatter?: (n: number | null) => string;
  loading?: boolean;
}

function deltaTypeFor(delta: number): 'increase' | 'decrease' | 'unchanged' {
  if (delta > 0.005) return 'increase';
  if (delta < -0.005) return 'decrease';
  return 'unchanged';
}

export function KpiCard({
  title,
  value,
  delta,
  isIncreasePositive = true,
  subtitle,
  formatter = formatNumber,
  loading = false,
}: KpiCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <Text>{title}</Text>
        {!loading && delta !== undefined && Number.isFinite(delta) && (
          <BadgeDelta
            deltaType={deltaTypeFor(delta)}
            isIncreasePositive={isIncreasePositive}
            size="xs"
          >
            {`${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`}
          </BadgeDelta>
        )}
      </div>

      {loading ? (
        <div className="mt-2 h-8 w-24 animate-pulse rounded bg-navy-100" />
      ) : (
        <Metric className="mt-2">{formatter(value)}</Metric>
      )}

      {subtitle && !loading && (
        <Text className="mt-2 text-xs text-navy-400">{subtitle}</Text>
      )}
      {subtitle && loading && (
        <div className="mt-2 h-3 w-32 animate-pulse rounded bg-navy-50" />
      )}
    </Card>
  );
}
