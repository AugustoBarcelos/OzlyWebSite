import { Card, Text, Title } from '@tremor/react';
import { formatRelativeTime } from '@/lib/format';
import type { TopErrorRow } from '@/routes/dashboard/types';

export interface TopErrorsListProps {
  title: string;
  rows: TopErrorRow[] | null;
  loading?: boolean;
}

export function TopErrorsList({
  title,
  rows,
  loading = false,
}: TopErrorsListProps) {
  return (
    <Card>
      <Title>{title}</Title>
      <Text className="mt-1 text-xs text-navy-300">
        Grouped by error message · from public.app_events
      </Text>
      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-navy-50/60" />
          ))}
        </div>
      ) : !rows || rows.length === 0 ? (
        <div className="mt-4 flex h-32 items-center justify-center rounded-md border border-dashed border-navy-100 bg-navy-50/30 text-sm text-navy-300">
          No errors in period
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((r, i) => (
            <li
              key={`${r.message}-${i}`}
              className="rounded-md border border-navy-50 bg-white p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-navy-700" title={r.message}>
                    {r.message}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-navy-300">
                    <span className="font-medium text-navy-500">
                      {r.count}×
                    </span>
                    <span>· {r.users} user{r.users === 1 ? '' : 's'}</span>
                    <span>· last seen {formatRelativeTime(r.last_seen)}</span>
                    {r.screens && r.screens.length > 0 && (
                      <>
                        <span>·</span>
                        {r.screens.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="rounded bg-navy-50 px-1.5 py-0.5 font-mono text-navy-600"
                          >
                            {s}
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
