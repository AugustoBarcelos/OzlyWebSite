import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import { ServerIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callRpc, RpcError } from '@/lib/rpc';
import { formatNumber } from '@/lib/format';
import type { DbHealthResponse } from '@/routes/dashboard/types';

/**
 * /tech/database — DB size + top tables.
 *
 * Reuses admin_db_health (returns total size + top tables by size).
 * Future: add slow query stats via pg_stat_statements wrapper.
 */
export function TechDatabasePage() {
  const [data, setData] = useState<DbHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const totalRows = data?.top_tables.reduce((s, t) => s + t.rows, 0) ?? 0;

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

          <div className="ozly-card border-navy-100 bg-navy-50/40 p-3 text-[12px] text-navy-500">
            <strong>Slow query stats em V2.</strong> Precisa de wrapper RPC sobre{' '}
            <code className="font-mono">pg_stat_statements</code> com agg + filtro pra
            evitar PII. Por agora, abre o Supabase Studio → Database → Performance pra
            ver queries individuais.
          </div>
        </>
      )}

      <RawDataPanel
        page="tech-database"
        sources={[{ rpc: 'admin_db_health', params: {}, data }]}
      />
    </div>
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
