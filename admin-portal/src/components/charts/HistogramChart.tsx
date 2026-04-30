import { Card, Text, Title } from '@tremor/react';
import { formatNumber } from '@/lib/format';

export interface HistogramBucket {
  bucket: string;
  count: number;
}

export interface HistogramChartProps {
  title: string;
  subtitle?: string;
  buckets: HistogramBucket[] | null;
  /** Optional callout (e.g. "12 never activated") shown right of the title */
  footnote?: string | undefined;
  loading?: boolean;
}

/**
 * Compact horizontal histogram used for time-to-activation buckets.
 * The bar width is proportional to the largest bucket; counts shown inline.
 */
export function HistogramChart({
  title,
  subtitle,
  buckets,
  footnote,
  loading = false,
}: HistogramChartProps) {
  const max = buckets ? Math.max(1, ...buckets.map((b) => b.count)) : 1;

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <Title>{title}</Title>
        {footnote && <Text className="text-xs text-navy-300">{footnote}</Text>}
      </div>
      {subtitle && (
        <Text className="mt-1 text-xs text-navy-300">{subtitle}</Text>
      )}
      {loading ? (
        <div className="mt-4 h-48 animate-pulse rounded bg-navy-50/60" />
      ) : !buckets || buckets.length === 0 ? (
        <div className="mt-4 flex h-32 items-center justify-center rounded-md border border-dashed border-navy-100 bg-navy-50/30 text-sm text-navy-300">
          No data in window
        </div>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {buckets.map((b) => {
            const pct = (b.count / max) * 100;
            return (
              <li key={b.bucket}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-navy-600">{b.bucket}</span>
                  <span className="font-medium text-navy-700">
                    {formatNumber(b.count)}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-navy-50">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-500"
                    style={{ width: `${Math.max(2, pct)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
