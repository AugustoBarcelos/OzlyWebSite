import { AreaChart, Card, LineChart, Title, Text } from '@tremor/react';
import { formatNumber } from '@/lib/format';

export interface TimeSeriesPoint {
  date: string; // ISO yyyy-mm-dd
  [series: string]: string | number;
}

export interface TimeSeriesChartProps {
  title: string;
  subtitle?: string;
  data: TimeSeriesPoint[] | null;
  categories: string[];
  /** Tremor color names */
  colors?: Array<'emerald' | 'lime' | 'amber' | 'red' | 'slate' | 'sky' | 'violet'>;
  variant?: 'area' | 'line';
  loading?: boolean;
  emptyMessage?: string;
  valueFormatter?: (n: number) => string;
  /** Total height in tailwind units (default h-64). */
  className?: string;
}

export function TimeSeriesChart({
  title,
  subtitle,
  data,
  categories,
  colors = ['emerald'],
  variant = 'area',
  loading = false,
  emptyMessage = 'No data yet',
  valueFormatter = formatNumber,
  className = 'h-64',
}: TimeSeriesChartProps) {
  const Chart = variant === 'line' ? LineChart : AreaChart;

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <Title>{title}</Title>
        {subtitle && (
          <Text className="text-xs text-navy-300">{subtitle}</Text>
        )}
      </div>
      {loading ? (
        <div className={`mt-4 ${className} animate-pulse rounded bg-navy-50/60`} />
      ) : !data || data.length === 0 ? (
        <div
          className={`mt-4 flex ${className} items-center justify-center rounded-md border border-dashed border-navy-100 bg-navy-50/30 text-sm text-navy-300`}
        >
          {emptyMessage}
        </div>
      ) : (
        <Chart
          className={`mt-4 ${className}`}
          data={data}
          index="date"
          categories={categories}
          colors={colors}
          valueFormatter={valueFormatter}
          showAnimation={false}
          showLegend={categories.length > 1}
          curveType="monotone"
          yAxisWidth={48}
        />
      )}
    </Card>
  );
}
