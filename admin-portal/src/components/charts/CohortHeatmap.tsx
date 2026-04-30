import { Card, Text, Title } from '@tremor/react';

export interface CohortRow {
  /** Cohort label, e.g. "2026-W14" or "Apr 2026" */
  cohort: string;
  /** Total users in this cohort */
  size: number;
  /** retention[i] = fraction (0..1) returning at offset cells[i] */
  retention: Array<number | null>;
}

export interface CohortHeatmapProps {
  title: string;
  cells: string[]; // header labels e.g. ['D0','D1','D7','D14','D30','D60']
  rows: CohortRow[];
  loading?: boolean;
}

/**
 * Compact retention heatmap. Cell intensity scales with the retention
 * fraction (0..1) using brand-color tints. NULL renders muted.
 */
function bgFor(v: number | null): string {
  if (v === null) return 'bg-navy-50/40 text-navy-200';
  const pct = Math.max(0, Math.min(1, v));
  if (pct >= 0.8) return 'bg-brand-700 text-white';
  if (pct >= 0.6) return 'bg-brand-500 text-white';
  if (pct >= 0.4) return 'bg-brand-400 text-white';
  if (pct >= 0.25) return 'bg-brand-300 text-navy-900';
  if (pct >= 0.1) return 'bg-brand-200 text-navy-900';
  if (pct >= 0.02) return 'bg-brand-100 text-navy-700';
  return 'bg-navy-50 text-navy-300';
}

export function CohortHeatmap({
  title,
  cells,
  rows,
  loading = false,
}: CohortHeatmapProps) {
  return (
    <Card>
      <Title>{title}</Title>
      <Text className="mt-1 text-xs text-navy-300">
        % of cohort returning by interval (darker = better retention)
      </Text>
      {loading ? (
        <div className="mt-4 h-48 animate-pulse rounded bg-navy-50/60" />
      ) : rows.length === 0 ? (
        <div className="mt-4 flex h-40 items-center justify-center rounded-md border border-dashed border-navy-100 bg-navy-50/30 text-sm text-navy-300">
          Pending cohort data
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-separate border-spacing-1 text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white px-2 py-1 text-left font-medium text-navy-300">
                  Cohort
                </th>
                <th className="px-2 py-1 text-right font-medium text-navy-300">
                  Size
                </th>
                {cells.map((c) => (
                  <th
                    key={c}
                    className="min-w-[44px] px-1 py-1 text-center font-medium text-navy-300"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.cohort}>
                  <td className="sticky left-0 bg-white px-2 py-1 text-left font-medium text-navy-700">
                    {r.cohort}
                  </td>
                  <td className="px-2 py-1 text-right text-navy-500">{r.size}</td>
                  {cells.map((_, i) => {
                    const v = r.retention[i] ?? null;
                    return (
                      <td
                        key={i}
                        className={
                          'rounded-sm px-1 py-1 text-center font-medium ' + bgFor(v)
                        }
                      >
                        {v === null
                          ? '—'
                          : `${(v * 100).toFixed(0)}%`}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
