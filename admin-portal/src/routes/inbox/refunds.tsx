import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import { DollarSignIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { GlobalFilterBar } from '@/components/GlobalFilterBar';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callRpc, RpcError } from '@/lib/rpc';
import { useGlobalFilters } from '@/lib/useGlobalFilters';
import { formatRelativeTime } from '@/lib/format';

interface RefundRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  plan: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  last_seen_at: string | null;
}

interface RefundsResponse {
  period_days: number;
  count: number;
  rows: RefundRow[];
  note?: string;
}

/**
 * /inbox/refunds — refund request queue.
 *
 * MVP: queue derivada de trials que expiraram no período. Pipeline real
 * (webhooks RC com refund events) vem em V2 quando estiver wirado.
 */
export function InboxRefundsPage() {
  const { periodDays } = useGlobalFilters();
  const period = Math.min(periodDays, 90);
  const [data, setData] = useState<RefundsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrationPending, setMigrationPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    callRpc<RefundsResponse>('admin_pending_refunds', { p_period_days: period })
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        if (
          e instanceof RpcError &&
          (e.code === '42883' || e.message.includes('does not exist'))
        ) {
          setMigrationPending(true);
        } else {
          setError(e instanceof RpcError ? e.message : 'Erro');
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [period]);

  const byPlan = useMemo(() => {
    if (!data) return { tfn: 0, abn: 0, pro: 0, other: 0 };
    const c = { tfn: 0, abn: 0, pro: 0, other: 0 };
    for (const r of data.rows) {
      if (r.plan === 'tfn') c.tfn += 1;
      else if (r.plan === 'abn') c.abn += 1;
      else if (r.plan === 'pro') c.pro += 1;
      else c.other += 1;
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
            <DollarSignIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Refund queue
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Trials expirados — candidatos a win-back ou refund follow-up.
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

      <GlobalFilterBar show={['period']} />

      {migrationPending && (
        <div className="ozly-card border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
          <strong>Migration pendente.</strong> Aplique{' '}
          <code className="font-mono">20260504020000_admin_misc_rpcs.sql</code>.
        </div>
      )}

      {error && (
        <div className="ozly-card border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      {data?.note && (
        <div className="ozly-card border-navy-100 bg-navy-50/40 p-3 text-[12px] text-navy-500">
          {data.note}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-navy-400">
          <Spinner size="sm" /> Carregando…
        </div>
      ) : !data ? null : (
        <>
          <section className="grid gap-3 sm:grid-cols-4">
            <Tile label="Total" value={data.count} tone="warning" />
            <Tile label="TFN" value={byPlan.tfn} tone="brand" />
            <Tile label="ABN" value={byPlan.abn} tone="brand" />
            <Tile label="PRO" value={byPlan.pro} tone="lime" />
          </section>

          <Card className="ozly-card">
            <Title className="!text-sm !font-semibold text-navy-700">
              Trials expirados ({period} dias)
            </Title>
            {data.rows.length === 0 ? (
              <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-700">
                Sem trials expirados no período. Bom sinal.
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[10px] font-semibold uppercase tracking-wider text-navy-300">
                    <tr className="border-b border-navy-50">
                      <th className="py-2 text-left">User</th>
                      <th className="py-2 text-left">Email</th>
                      <th className="py-2 text-left">Plano</th>
                      <th className="py-2 text-left">Trial start</th>
                      <th className="py-2 text-left">Expirou</th>
                      <th className="py-2 text-left">Last seen</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="text-navy-700">
                    {data.rows.map((r) => (
                      <tr key={r.user_id} className="border-b border-navy-50/60 last:border-0">
                        <td className="py-2 font-mono text-[11px]">
                          {r.user_id.slice(0, 8)}…
                        </td>
                        <td className="py-2 text-[11px]">
                          {r.full_name && (
                            <div className="font-medium text-navy-700">{r.full_name}</div>
                          )}
                          <div className="text-navy-500">{r.email ?? '—'}</div>
                        </td>
                        <td className="py-2">
                          {r.plan ? (
                            <span className="rounded bg-navy-50 px-1.5 py-0.5 text-[10px] font-medium uppercase">
                              {r.plan}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2 text-[11px] text-navy-500">
                          {r.trial_started_at ? formatRelativeTime(r.trial_started_at) : '—'}
                        </td>
                        <td className="py-2 text-[11px] text-amber-700">
                          {r.trial_ends_at ? formatRelativeTime(r.trial_ends_at) : '—'}
                        </td>
                        <td className="py-2 text-[11px] text-navy-500">
                          {r.last_seen_at ? formatRelativeTime(r.last_seen_at) : '—'}
                        </td>
                        <td className="py-2">
                          <Link
                            to={`/users/${r.user_id}`}
                            className="rounded border border-navy-100 bg-white px-1.5 py-0.5 text-[10px] text-navy-600 hover:border-brand-300 hover:text-brand-700"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      <RawDataPanel
        page="inbox-refunds"
        sources={[{ rpc: 'admin_pending_refunds', params: { p_period_days: period }, data }]}
      />
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'brand' | 'lime' | 'warning';
}) {
  const TONE: Record<typeof tone, string> = {
    brand: 'text-brand-600',
    lime: 'text-lime-600',
    warning: 'text-amber-600',
  };
  return (
    <div className="ozly-card ozly-card-hero relative px-5 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${TONE[tone]}`}>{value}</div>
    </div>
  );
}
