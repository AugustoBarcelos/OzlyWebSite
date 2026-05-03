import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import { ActivityIcon, AlertTriangleIcon, InboxIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callRpc, RpcError } from '@/lib/rpc';
import { formatRelativeTime } from '@/lib/format';
import type {
  RecentAdminActionRow,
  RecentAdminActionsResponse,
} from '@/routes/dashboard/types';

type FilterKind = 'all' | 'errors' | 'admin' | 'system';

const FILTERS: ReadonlyArray<{ kind: FilterKind; label: string }> = [
  { kind: 'all', label: 'Todos' },
  { kind: 'errors', label: 'Erros' },
  { kind: 'admin', label: 'Admin actions' },
  { kind: 'system', label: 'System / Cron' },
];

/**
 * /inbox/system — system events feed.
 *
 * Reuses admin_recent_admin_actions (last 100). Filter chips classify rows
 * by action prefix:
 *   - errors: result in ('error', 'forbidden', 'failed')
 *   - admin: actions starting with admin_*, member_*, grant_*
 *   - system: actions starting with snapshot_, sync_, cron_, webhook_
 */
export function InboxSystemPage() {
  const [data, setData] = useState<RecentAdminActionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKind>('all');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    callRpc<RecentAdminActionsResponse>('admin_recent_admin_actions', { p_limit: 100 })
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof RpcError ? e.message : 'Erro');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === 'all') return data.rows;
    return data.rows.filter((r) => classify(r) === filter);
  }, [data, filter]);

  const counts = useMemo(() => {
    const c = { all: 0, errors: 0, admin: 0, system: 0 };
    if (!data) return c;
    c.all = data.rows.length;
    for (const r of data.rows) {
      const k = classify(r);
      if (k === 'errors') c.errors += 1;
      else if (k === 'admin') c.admin += 1;
      else if (k === 'system') c.system += 1;
    }
    return c;
  }, [data]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
            style={{
              background:
                'linear-gradient(135deg, var(--color-brand-500), var(--color-lime-400))',
            }}
          >
            <ActivityIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              System events
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Feed das últimas 100 ações administrativas + sync/cron events.
            </p>
          </div>
        </div>
        <Link
          to="/inbox"
          className="self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700 md:self-end"
        >
          ← Inbox
        </Link>
      </header>

      {error && (
        <div className="ozly-card border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.kind}
            type="button"
            onClick={() => setFilter(f.kind)}
            className={[
              'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
              filter === f.kind
                ? 'border-brand-300 bg-brand-50 text-brand-700'
                : 'border-navy-100 bg-white text-navy-500 hover:border-brand-200',
            ].join(' ')}
          >
            {f.label}{' '}
            <span className="rounded-full bg-navy-50 px-1.5 py-0.5 text-[10px] font-mono text-navy-500">
              {counts[f.kind]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-navy-400">
          <Spinner size="sm" /> Carregando eventos…
        </div>
      ) : !data || filtered.length === 0 ? (
        <Card className="ozly-card">
          <div className="py-8 text-center text-sm text-navy-300">
            {data && data.rows.length === 0
              ? 'Sem eventos recentes.'
              : 'Nenhum evento bate com o filtro atual.'}
          </div>
        </Card>
      ) : (
        <Card className="ozly-card">
          <Title className="!text-sm !font-semibold text-navy-700">
            Últimos eventos
          </Title>
          <ul className="mt-3 divide-y divide-navy-50">
            {filtered.map((row) => (
              <li key={row.id} className="flex items-start gap-3 py-2 text-sm">
                <span
                  className={[
                    'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                    row.result === 'forbidden' || row.result === 'error' || row.result === 'failed'
                      ? 'bg-rose-50 text-rose-600'
                      : classify(row) === 'system'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-brand-50 text-brand-600',
                  ].join(' ')}
                >
                  {row.result === 'forbidden' || row.result === 'error' || row.result === 'failed' ? (
                    <AlertTriangleIcon className="h-3.5 w-3.5" />
                  ) : (
                    <ActivityIcon className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <code className="font-mono text-[12px] font-semibold text-navy-700">
                      {row.action}
                    </code>
                    {row.target && (
                      <span className="rounded bg-navy-50 px-1.5 py-0.5 text-[10px] text-navy-500">
                        {row.target}
                      </span>
                    )}
                    {row.result && row.result !== 'ok' && (
                      <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-700">
                        {row.result}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-navy-400">
                    {row.admin_id ? row.admin_id.slice(0, 8) : 'system'} ·{' '}
                    {formatRelativeTime(row.created_at)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <RawDataPanel
        page="inbox-system"
        sources={[
          { rpc: 'admin_recent_admin_actions', params: { p_limit: 100 }, data },
        ]}
      />

      <div className="flex items-center justify-end">
        <Link
          to="/ops/audit"
          className="flex items-center gap-1 rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:border-brand-200 hover:text-brand-700"
        >
          <InboxIcon className="h-3.5 w-3.5" /> Audit completo
        </Link>
      </div>
    </div>
  );
}

function classify(row: RecentAdminActionRow): FilterKind {
  if (row.result === 'forbidden' || row.result === 'error' || row.result === 'failed') {
    return 'errors';
  }
  const a = row.action.toLowerCase();
  if (a.startsWith('snapshot') || a.startsWith('sync') || a.startsWith('cron') || a.startsWith('webhook')) {
    return 'system';
  }
  if (a.startsWith('admin') || a.startsWith('member') || a.startsWith('grant')) {
    return 'admin';
  }
  return 'admin';
}
