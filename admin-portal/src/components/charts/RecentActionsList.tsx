import { Card, Text, Title } from '@tremor/react';
import { formatRelativeTime } from '@/lib/format';
import type { RecentAdminActionRow } from '@/routes/dashboard/types';

export interface RecentActionsListProps {
  title: string;
  rows: RecentAdminActionRow[] | null;
  loading?: boolean;
}

const RESULT_COLOR: Record<string, string> = {
  success: 'bg-brand-100 text-brand-700',
  forbidden: 'bg-red-100 text-red-700',
  error: 'bg-red-100 text-red-700',
  rejected: 'bg-amber-100 text-amber-800',
};

function formatAction(action: string): string {
  // 'admin_force_resync' -> 'Force resync', 'admin_grant_promo' -> 'Grant promo'
  return action
    .replace(/^admin_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function RecentActionsList({
  title,
  rows,
  loading = false,
}: RecentActionsListProps) {
  return (
    <Card>
      <Title>{title}</Title>
      <Text className="mt-1 text-xs text-navy-300">
        Mutating actions only — read RPCs filtered out
      </Text>
      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-navy-50/60" />
          ))}
        </div>
      ) : !rows || rows.length === 0 ? (
        <div className="mt-4 flex h-32 items-center justify-center rounded-md border border-dashed border-navy-100 bg-navy-50/30 text-sm text-navy-300">
          No recent admin activity
        </div>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {rows.map((r) => {
            const tone = RESULT_COLOR[r.result ?? ''] ?? 'bg-navy-100 text-navy-700';
            return (
              <li
                key={r.id}
                className="flex items-center gap-2 rounded-md border border-navy-50 bg-white px-3 py-2 text-xs"
              >
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone}`}
                >
                  {r.result ?? '—'}
                </span>
                <span className="font-medium text-navy-700">
                  {formatAction(r.action)}
                </span>
                {r.target && (
                  <span className="font-mono text-[10px] text-navy-300">
                    {r.target.slice(0, 8)}…
                  </span>
                )}
                <span className="ml-auto text-[10px] text-navy-300">
                  {formatRelativeTime(r.created_at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
