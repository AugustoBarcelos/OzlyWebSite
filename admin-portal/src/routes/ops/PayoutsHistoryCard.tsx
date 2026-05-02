import { useEffect, useMemo, useState } from 'react';
import { Card, Title, Text, Badge } from '@tremor/react';
import { callRpc, RpcError } from '@/lib/rpc';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';
import { formatRelativeTime } from '@/lib/format';

interface PayoutRow {
  id: string;
  affiliate_id: string;
  affiliate_code: string;
  affiliate_name: string | null;
  pay_id: string | null;
  total_cents: number;
  currency: string;
  method: string;
  reference: string | null;
  notes: string | null;
  paid_at: string;
  created_by: string | null;
}

interface MonthSummary {
  month: string;
  currency: string;
  payouts: number;
  cents: number;
}

interface HistoryResponse {
  rows: PayoutRow[];
  total: number;
  total_filtered: number;
  limit: number;
  offset: number;
  summary_by_month: MonthSummary[];
}

const PAGE_SIZE = 50;

function formatMoney(cents: number, currency: string): string {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows: PayoutRow[]): string {
  const head = [
    'paid_at',
    'affiliate_code',
    'affiliate_name',
    'pay_id',
    'method',
    'reference',
    'currency',
    'total',
    'notes',
  ];
  const body = rows.map((r) =>
    [
      r.paid_at,
      r.affiliate_code,
      r.affiliate_name ?? '',
      r.pay_id ?? '',
      r.method,
      r.reference ?? '',
      r.currency,
      (r.total_cents / 100).toFixed(2),
      r.notes ?? '',
    ]
      .map(csvEscape)
      .join(','),
  );
  return [head.join(','), ...body].join('\n');
}

function downloadCsv(name: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface Props {
  refreshKey?: number;
}

/**
 * Histórico completo de payouts dos afiliados — pra contabilidade.
 *
 * Filtros: mês (YYYY-MM), moeda. Paginado 50/page. CSV export do filtro atual.
 */
export function PayoutsHistoryCard({ refreshKey }: Props) {
  const { toast } = useToast();
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [monthFilter, setMonthFilter] = useState<string>(''); // YYYY-MM
  const [currencyFilter, setCurrencyFilter] = useState<string>('');
  const [page, setPage] = useState(0);

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (currencyFilter) f.currency = currencyFilter;
    if (monthFilter) {
      // monthFilter = "2026-05" → start = 2026-05-01, end = 2026-06-01
      const [y, m] = monthFilter.split('-').map(Number);
      if (y && m) {
        const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
        const end = new Date(Date.UTC(y, m, 1)).toISOString();
        f.month_start = start;
        f.month_end = end;
      }
    }
    return f;
  }, [monthFilter, currencyFilter]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    callRpc<HistoryResponse>('admin_affiliate_payouts_history', {
      p_filters: filters,
      p_limit: PAGE_SIZE,
      p_offset: page * PAGE_SIZE,
    })
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e: unknown) => {
        if (alive)
          setError(e instanceof RpcError ? e.message : 'Falha ao carregar');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [filters, page, refreshKey]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filters]);

  async function exportCsv() {
    if (!data) return;
    // Stream chunked download — 500 rows/page, surface progress in toast.
    // The heavy lifting (filtering) already happened server-side.
    setLoading(true);
    const total = data.total_filtered;
    if (total > 50000) {
      const ok = window.confirm(
        `Vai exportar ${total} payouts em CSV. Isso pode levar ${Math.ceil(total / 500)} requests. Continuar?`,
      );
      if (!ok) {
        setLoading(false);
        return;
      }
    }
    try {
      const all: PayoutRow[] = [];
      const pageSize = 500;
      for (let off = 0; off < total; off += pageSize) {
        const chunk = await callRpc<HistoryResponse>(
          'admin_affiliate_payouts_history',
          { p_filters: filters, p_limit: pageSize, p_offset: off },
        );
        all.push(...chunk.rows);
        // Defensive: if the server sends fewer rows than expected, stop —
        // prevents infinite loop on schema drift.
        if (chunk.rows.length === 0) break;
      }
      const filename = monthFilter
        ? `affiliate-payouts-${monthFilter}.csv`
        : `affiliate-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCsv(filename, rowsToCsv(all));
      toast({
        variant: 'success',
        title: `Exportado ${all.length} payouts`,
      });
    } catch (e) {
      toast({
        variant: 'error',
        title: 'Falha no export',
        description: e instanceof RpcError ? e.message : 'Unknown',
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading && !data) {
    return (
      <Card>
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-navy-400">
          <Spinner size="sm" />
          Carregando histórico de payouts...
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </div>
      </Card>
    );
  }

  if (!data) return null;

  const totalPages = Math.max(1, Math.ceil(data.total_filtered / PAGE_SIZE));

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Title className="!text-base">📒 Histórico de payouts</Title>
          <Text className="mt-0.5 text-xs text-navy-300">
            Todos os pagamentos consolidados ({data.total_filtered} de {data.total}).
            Use o filtro de mês pra exportar pra contabilidade.
          </Text>
        </div>
        {loading && <Spinner size="sm" />}
      </div>

      {/* Filtros */}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-navy-600">Mês</span>
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="rounded-md border border-navy-100 bg-white px-2 py-1.5 text-xs"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-navy-600">Moeda</span>
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="rounded-md border border-navy-100 bg-white px-2 py-1.5 text-xs"
          >
            <option value="">Todas</option>
            <option value="AUD">AUD</option>
            <option value="BRL">BRL</option>
            <option value="USD">USD</option>
          </select>
        </label>
        {(monthFilter || currencyFilter) && (
          <button
            type="button"
            onClick={() => {
              setMonthFilter('');
              setCurrencyFilter('');
            }}
            className="rounded-md border border-navy-100 bg-white px-2 py-1.5 text-xs font-medium text-navy-500 hover:border-rose-200 hover:text-rose-700"
          >
            ✕ Limpar
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            void exportCsv();
          }}
          disabled={loading || data.total_filtered === 0}
          className="ml-auto rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
        >
          ⬇ CSV
        </button>
      </div>

      {/* Resumo por mês */}
      {data.summary_by_month.length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">
            Resumo do filtro
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.summary_by_month.map((s) => (
              <div
                key={`${s.month}-${s.currency}`}
                className="rounded-md border border-navy-100 bg-navy-50/40 px-3 py-1.5 text-xs"
              >
                <span className="font-mono text-navy-500">{s.month}</span>
                <span className="ml-2 font-semibold text-navy-700">
                  {formatMoney(s.cents, s.currency)}
                </span>
                <span className="ml-1 text-[10px] text-navy-300">
                  ({s.payouts} pgto{s.payouts > 1 ? 's' : ''})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabela */}
      {data.rows.length === 0 ? (
        <div className="mt-6 py-10 text-center text-sm text-navy-400">
          {data.total === 0
            ? 'Nenhum payout registrado ainda.'
            : 'Nenhum payout bate com os filtros.'}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-md border border-navy-100">
          <table className="min-w-full divide-y divide-navy-50 text-xs">
            <thead className="bg-navy-50/60 text-left text-[10px] font-semibold uppercase tracking-wide text-navy-400">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Afiliado</th>
                <th className="px-3 py-2">PayID / método</th>
                <th className="px-3 py-2">Referência</th>
                <th className="px-3 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50 bg-white">
              {data.rows.map((r) => (
                <tr key={r.id} className="hover:bg-navy-50/60">
                  <td className="px-3 py-2 text-navy-500">
                    <div>{r.paid_at.slice(0, 10)}</div>
                    <div className="text-[10px] text-navy-300">
                      {formatRelativeTime(r.paid_at)}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-mono text-navy-700">
                      {r.affiliate_code}
                    </div>
                    {r.affiliate_name && (
                      <div className="text-[10px] text-navy-400">
                        {r.affiliate_name}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-navy-500">
                    <div>{r.pay_id ?? '—'}</div>
                    <Badge color="slate" size="xs">
                      {r.method}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-navy-500">
                    {r.reference ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="font-semibold tabular-nums text-emerald-700">
                      {formatMoney(r.total_cents, r.currency)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {data.total_filtered > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-between text-xs text-navy-500">
          <span>
            Página <strong>{page + 1}</strong> de <strong>{totalPages}</strong>{' '}
            <span className="text-navy-300">
              ({(page * PAGE_SIZE + 1).toLocaleString()}–
              {Math.min(
                (page + 1) * PAGE_SIZE,
                data.total_filtered,
              ).toLocaleString()}{' '}
              de {data.total_filtered.toLocaleString()})
            </span>
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="rounded-md border border-navy-100 bg-white px-3 py-1 font-medium hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="rounded-md border border-navy-100 bg-white px-3 py-1 font-medium hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
            >
              →
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
