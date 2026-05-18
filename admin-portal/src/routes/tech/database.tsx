import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, LineChart, Title } from '@tremor/react';
import { ServerIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { RawDataPanel } from '@/components/RawDataPanel';
import { useToast } from '@/components/Toast';
import { callRpc, RpcError } from '@/lib/rpc';
import { formatNumber } from '@/lib/format';
import type { DbHealthResponse } from '@/routes/dashboard/types';

interface DbSizeHistoryPoint {
  captured_at: string;
  db_total_bytes: number;
  table_breakdown: Array<{ name: string; bytes: number; rows: number }>;
}

interface DbSizeHistoryResponse {
  days: number;
  series: DbSizeHistoryPoint[];
}

interface SnapshotResponse {
  ok: boolean;
  captured_at: string;
  db_total_bytes: number;
}

const RANGE_OPTIONS: Array<{ days: number; label: string }> = [
  { days: 1, label: '24h' },
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
  { days: 365, label: '1y' },
];

const BYTES_PER_MB = 1024 * 1024;

function bytesToMB(bytes: number): number {
  return Math.round((bytes / BYTES_PER_MB) * 100) / 100;
}

function formatMB(mb: number): string {
  if (Math.abs(mb) >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short' });
}

export function TechDatabasePage() {
  const { toast } = useToast();
  const [data, setData] = useState<DbHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [historyDays, setHistoryDays] = useState(30);
  const [history, setHistory] = useState<DbSizeHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [snapshotting, setSnapshotting] = useState(false);
  const [showPerTable, setShowPerTable] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    callRpc<DbHealthResponse>('admin_db_health', {})
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

  useEffect(() => {
    let alive = true;
    setHistoryLoading(true);
    setHistoryError(null);
    callRpc<DbSizeHistoryResponse>('admin_db_size_history', { p_days: historyDays })
      .then((d) => {
        if (alive) setHistory(d);
      })
      .catch((e: unknown) => {
        if (alive) setHistoryError(e instanceof RpcError ? e.message : 'Erro');
      })
      .finally(() => {
        if (alive) setHistoryLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [historyDays]);

  const totalRows = data?.top_tables.reduce((s, t) => s + t.rows, 0) ?? 0;

  const totalSeries = useMemo(() => {
    if (!history) return [];
    return history.series.map((p) => ({
      date: formatTimestamp(p.captured_at),
      'DB total': bytesToMB(p.db_total_bytes),
    }));
  }, [history]);

  const topTablesNames = useMemo(() => {
    if (!history || history.series.length === 0) return [];
    const last = history.series[history.series.length - 1];
    if (!last) return [];
    return last.table_breakdown.slice(0, 5).map((t) => t.name);
  }, [history]);

  const perTableSeries = useMemo(() => {
    if (!history || topTablesNames.length === 0) return [];
    return history.series.map((p) => {
      const row: Record<string, number | string> = {
        date: formatTimestamp(p.captured_at),
      };
      const lookup = new Map(p.table_breakdown.map((t) => [t.name, t.bytes]));
      for (const name of topTablesNames) {
        row[name] = bytesToMB(lookup.get(name) ?? 0);
      }
      return row;
    });
  }, [history, topTablesNames]);

  const delta = useMemo(() => {
    if (!history || history.series.length < 2) return null;
    const first = history.series[0];
    const last = history.series[history.series.length - 1];
    if (!first || !last) return null;
    const diffBytes = last.db_total_bytes - first.db_total_bytes;
    const diffMB = bytesToMB(diffBytes);
    return { diffMB, diffBytes };
  }, [history]);

  async function handleSnapshot() {
    setSnapshotting(true);
    try {
      const r = await callRpc<SnapshotResponse>('snapshot_db_size', {});
      toast({
        variant: 'success',
        title: 'Snapshot capturado',
        description: `${formatMB(bytesToMB(r.db_total_bytes))} em ${new Date(r.captured_at).toLocaleString()}`,
      });
      const refreshed = await callRpc<DbSizeHistoryResponse>('admin_db_size_history', {
        p_days: historyDays,
      });
      setHistory(refreshed);
    } catch (e) {
      toast({
        variant: 'error',
        title: 'Snapshot falhou',
        description: e instanceof RpcError ? e.message : 'Erro inesperado',
      });
    } finally {
      setSnapshotting(false);
    }
  }

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
            <ServerIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Database
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Tamanho total + top tabelas por tamanho.
            </p>
          </div>
        </div>
        <Link
          to="/tech"
          className="self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700 md:self-end"
        >
          ← Tech Hub
        </Link>
      </header>

      {error && (
        <div className="ozly-card border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-navy-400">
          <Spinner size="sm" /> Carregando…
        </div>
      ) : !data ? null : (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <Tile label="DB size total" value={data.db_size_pretty} />
            <Tile label="Tabelas analisadas" value={data.top_tables.length.toString()} />
            <Tile label="Linhas (top tabelas)" value={formatNumber(totalRows)} />
          </section>

          <Card className="ozly-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Title className="!text-sm !font-semibold text-navy-700">
                  Evolução (últimos {historyDays} dias)
                </Title>
                <p className="mt-0.5 text-xs text-navy-400">
                  Snapshot diário às 02:30 UTC. Útil pra detectar growth descontrolado.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-md border border-navy-100 bg-white p-0.5">
                  {RANGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setHistoryDays(opt.days)}
                      className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        historyDays === opt.days
                          ? 'bg-brand-500 text-white shadow-sm'
                          : 'text-navy-500 hover:bg-navy-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleSnapshot}
                  disabled={snapshotting}
                  className="rounded-md border border-navy-200 bg-white px-3 py-1.5 text-xs font-medium text-navy-700 hover:bg-navy-50 disabled:opacity-50"
                  title="Captura uma linha nova em db_size_history agora."
                >
                  {snapshotting ? 'Capturando…' : 'Snapshot now'}
                </button>
              </div>
            </div>

            {historyError && (
              <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
                {historyError}
              </div>
            )}

            {historyLoading && !history ? (
              <div className="mt-4 flex items-center justify-center gap-2 py-8 text-xs text-navy-400">
                <Spinner size="sm" /> Carregando…
              </div>
            ) : !history || history.series.length === 0 ? (
              <div className="mt-4 rounded-md border border-dashed border-navy-100 bg-navy-50/30 px-4 py-6 text-center text-xs text-navy-400">
                Sem snapshots ainda. Clique em <strong>Snapshot now</strong> pra capturar o
                primeiro.
              </div>
            ) : history.series.length === 1 ? (
              <div className="mt-4 rounded-md border border-dashed border-navy-100 bg-navy-50/30 px-4 py-6 text-center text-xs text-navy-400">
                Histórico inicial criado hoje. Volte amanhã pra ver evolução.
              </div>
            ) : (
              <>
                {delta && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                        delta.diffMB >= 0
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {delta.diffMB >= 0 ? '+' : ''}
                      {formatMB(delta.diffMB)} nos últimos {historyDays} dias
                    </span>
                    <span className="text-[11px] text-navy-400">
                      {history.series.length} snapshots
                    </span>
                  </div>
                )}
                <LineChart
                  className="mt-4 h-64"
                  data={totalSeries}
                  index="date"
                  categories={['DB total']}
                  colors={['emerald']}
                  valueFormatter={(v: number) => formatMB(v)}
                  showAnimation={false}
                  showLegend={false}
                  curveType="monotone"
                  yAxisWidth={56}
                />

                <div className="mt-4 border-t border-navy-50 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowPerTable((v) => !v)}
                    className="flex w-full items-center justify-between text-left text-xs font-semibold text-navy-600 hover:text-brand-700"
                  >
                    <span>Evolução por tabela (top 5)</span>
                    <span className="text-navy-300">{showPerTable ? '−' : '+'}</span>
                  </button>
                  {showPerTable && (
                    <LineChart
                      className="mt-3 h-72"
                      data={perTableSeries}
                      index="date"
                      categories={topTablesNames}
                      colors={['emerald', 'lime', 'amber', 'sky', 'violet']}
                      valueFormatter={(v: number) => formatMB(v)}
                      showAnimation={false}
                      showLegend
                      curveType="monotone"
                      yAxisWidth={56}
                    />
                  )}
                </div>
              </>
            )}
          </Card>

          <Card className="ozly-card">
            <Title className="!text-sm !font-semibold text-navy-700">
              Top tabelas por tamanho
            </Title>
            {data.top_tables.length === 0 ? (
              <div className="mt-3 text-xs text-navy-300">Sem dados.</div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[10px] font-semibold uppercase tracking-wider text-navy-300">
                    <tr className="border-b border-navy-50">
                      <th className="py-2 text-left">Tabela</th>
                      <th className="py-2 text-right">Tamanho</th>
                      <th className="py-2 text-right">Bytes</th>
                      <th className="py-2 text-right">Linhas</th>
                    </tr>
                  </thead>
                  <tbody className="text-navy-700">
                    {data.top_tables.map((t) => (
                      <tr key={t.table} className="border-b border-navy-50/60 last:border-0">
                        <td className="py-1.5 font-mono text-[11px]">{t.table}</td>
                        <td className="py-1.5 text-right tabular-nums font-semibold">
                          {t.size_pretty}
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-navy-400">
                          {formatNumber(t.bytes)}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">{formatNumber(t.rows)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <SlowQueriesCard />
        </>
      )}

      <RawDataPanel
        page="tech-database"
        sources={[
          { rpc: 'admin_db_health', params: {}, data },
          { rpc: 'admin_db_size_history', params: { p_days: historyDays }, data: history },
        ]}
      />
    </div>
  );
}

// ─── Slow queries (pg_stat_statements wrapper) ────────────────────────────

interface SlowQueryRow {
  queryid: string;
  query: string;
  query_length: number;
  calls: number;
  total_ms: number;
  mean_ms: number;
  rows: number;
  shared_blks_hit: number;
  shared_blks_read: number;
  cache_hit_pct: number | null;
}

interface SlowQueriesResponse {
  available: boolean;
  note?: string;
  snapshot_at?: string;
  limit?: number;
  min_calls?: number;
  min_mean_ms?: number;
  rows: SlowQueryRow[];
}

function SlowQueriesCard() {
  const { toast } = useToast();
  const [data, setData] = useState<SlowQueriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migrationPending, setMigrationPending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useMemo(
    () => () => {
      setLoading(true);
      setError(null);
      callRpc<SlowQueriesResponse>('admin_slow_queries', {
        p_limit: 25,
        p_min_calls: 10,
        p_min_mean_ms: 50,
      })
        .then((d) => setData(d))
        .catch((e: unknown) => {
          if (
            e instanceof RpcError &&
            (e.code === '42883' || e.message.includes('does not exist'))
          ) {
            setMigrationPending(true);
          } else {
            setError(e instanceof RpcError ? e.message : 'Erro');
          }
        })
        .finally(() => setLoading(false));
    },
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function handleReset() {
    if (
      !window.confirm(
        'Resetar pg_stat_statements? Apaga TODO o histórico agregado de queries (não afeta dados de usuário, só métricas).',
      )
    ) {
      return;
    }
    setResetting(true);
    try {
      await callRpc('admin_slow_queries_reset', {});
      toast({
        variant: 'success',
        title: 'pg_stat_statements resetado',
        description: 'Próximas queries vão popular o agregado do zero.',
      });
      load();
    } catch (e) {
      toast({
        variant: 'error',
        title: 'Falha ao resetar',
        description: e instanceof RpcError ? e.message : 'Erro inesperado',
      });
    } finally {
      setResetting(false);
    }
  }

  if (migrationPending) {
    return (
      <div className="ozly-card border-amber-200 bg-amber-50/60 p-3 text-[12px] text-amber-800">
        <strong>Migration pendente:</strong> rode{' '}
        <code className="font-mono">supabase db push</code> para aplicar{' '}
        <code className="font-mono">admin_slow_queries</code>.
      </div>
    );
  }

  return (
    <Card className="ozly-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Title className="!text-sm !font-semibold text-navy-700">
            Slow queries (mean ≥ 50ms, ≥ 10 calls)
          </Title>
          <p className="mt-0.5 text-xs text-navy-400">
            Top 25 por mean exec time. Literais já normalizados pelo pg_stat_statements — sem PII.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-md border border-navy-100 bg-white px-2.5 py-1 text-xs font-medium text-navy-600 hover:bg-navy-50 disabled:opacity-50"
          >
            {loading ? 'Atualizando…' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            title="Limpa o agregado do pg_stat_statements."
          >
            {resetting ? 'Resetando…' : 'Reset stats'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
          {error}
        </div>
      )}

      {data && !data.available && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-800">
          {data.note ?? 'pg_stat_statements não disponível.'}
        </div>
      )}

      {loading && !data ? (
        <div className="mt-3 flex items-center justify-center gap-2 py-8 text-xs text-navy-400">
          <Spinner size="sm" /> Carregando…
        </div>
      ) : !data || !data.available ? null : data.rows.length === 0 ? (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-6 text-center text-sm text-emerald-700">
          Nenhuma query devagar acima do threshold.
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] font-semibold uppercase tracking-wider text-navy-300">
              <tr className="border-b border-navy-50">
                <th className="py-2 text-left">Query</th>
                <th className="py-2 text-right">Mean (ms)</th>
                <th className="py-2 text-right">Total (ms)</th>
                <th className="py-2 text-right">Calls</th>
                <th className="py-2 text-right">Rows</th>
                <th className="py-2 text-right">Cache hit</th>
              </tr>
            </thead>
            <tbody className="text-navy-700">
              {data.rows.map((r) => {
                const isOpen = expanded === r.queryid;
                return (
                  <tr
                    key={r.queryid}
                    className="cursor-pointer border-b border-navy-50/60 last:border-0 hover:bg-navy-50/40"
                    onClick={() => setExpanded(isOpen ? null : r.queryid)}
                  >
                    <td className="max-w-[40rem] py-1.5 pr-3">
                      <code
                        className={`block font-mono text-[11px] ${
                          isOpen ? 'whitespace-pre-wrap' : 'truncate'
                        }`}
                        title={r.query}
                      >
                        {r.query}
                      </code>
                      {r.query_length > 600 && (
                        <span className="mt-0.5 inline-block text-[10px] text-navy-300">
                          truncado em 600 chars · {r.query_length} total
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 text-right tabular-nums font-semibold">
                      {r.mean_ms.toFixed(2)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-navy-500">
                      {formatNumber(Math.round(r.total_ms))}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {formatNumber(r.calls)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-navy-500">
                      {formatNumber(r.rows)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {r.cache_hit_pct === null
                        ? '—'
                        : `${r.cache_hit_pct.toFixed(1)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="ozly-card ozly-card-hero relative px-5 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-brand-600">{value}</div>
    </div>
  );
}
