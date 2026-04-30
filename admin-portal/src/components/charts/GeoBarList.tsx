import { BarList, Card, Text, Title } from '@tremor/react';
import { formatNumber } from '@/lib/format';

export interface GeoRow {
  /** State name or code: NSW, VIC, QLD, SA, WA, TAS, ACT, NT */
  name: string;
  value: number;
  href?: string;
}

export interface GeoBarListProps {
  title: string;
  subtitle?: string;
  rows: GeoRow[] | null;
  loading?: boolean;
}

const AU_STATES_FULL: Record<string, string> = {
  NSW: 'New South Wales',
  VIC: 'Victoria',
  QLD: 'Queensland',
  WA: 'Western Australia',
  SA: 'South Australia',
  TAS: 'Tasmania',
  ACT: 'Australian Capital Territory',
  NT: 'Northern Territory',
};

export function GeoBarList({
  title,
  subtitle,
  rows,
  loading = false,
}: GeoBarListProps) {
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <Title>{title}</Title>
        {subtitle && <Text className="text-xs text-navy-300">{subtitle}</Text>}
      </div>
      {loading ? (
        <div className="mt-4 h-48 animate-pulse rounded bg-navy-50/60" />
      ) : !rows || rows.length === 0 ? (
        <div className="mt-4 flex h-40 items-center justify-center rounded-md border border-dashed border-navy-100 bg-navy-50/30 text-sm text-navy-300">
          No geo data yet
        </div>
      ) : (
        <BarList
          className="mt-4"
          color="emerald"
          data={rows.map((r) => ({
            name: AU_STATES_FULL[r.name] ?? r.name,
            value: r.value,
            ...(r.href ? { href: r.href } : {}),
          }))}
          valueFormatter={formatNumber}
        />
      )}
    </Card>
  );
}
