import { useCallback, useEffect, useState } from 'react';
import { callRpc, RpcError } from '@/lib/rpc';

export type ItemKind = 'task' | 'incident' | 'release' | 'runbook';
export type ItemStatus = 'todo' | 'doing' | 'done' | 'open' | 'resolved';
export type ItemPriority = 'p0' | 'p1' | 'p2' | 'p3';

export interface OpsItem {
  id: string;
  kind: ItemKind;
  status: ItemStatus;
  priority: ItemPriority;
  title: string;
  description: string | null;
  area: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ListResponse {
  kind: ItemKind;
  rows: OpsItem[];
}

export function useOpsItems(kind: ItemKind) {
  const [rows, setRows] = useState<OpsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationPending, setMigrationPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    callRpc<ListResponse>('admin_operations_list', { p_kind: kind })
      .then((d) => {
        if (!alive) return;
        setRows(d.rows ?? []);
        setMigrationPending(false);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        if (
          e instanceof RpcError &&
          (e.code === '42883' || e.message.includes('does not exist'))
        ) {
          setMigrationPending(true);
        } else {
          setError(e instanceof RpcError ? e.message : 'Erro desconhecido');
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [kind, refreshKey]);

  return { rows, loading, error, migrationPending, refresh };
}

export const PRIORITY_LABEL: Record<ItemPriority, string> = {
  p0: 'P0',
  p1: 'P1',
  p2: 'P2',
  p3: 'P3',
};

export const PRIORITY_TONE: Record<
  ItemPriority,
  { bg: string; text: string; ring: string }
> = {
  p0: { bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-200' },
  p1: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' },
  p2: { bg: 'bg-brand-50', text: 'text-brand-700', ring: 'ring-brand-200' },
  p3: { bg: 'bg-navy-50', text: 'text-navy-600', ring: 'ring-navy-200' },
};
