import { useEffect, useState } from 'react';
import { Card, Text, Title, Badge } from '@tremor/react';
import { callRpc, RpcError } from '@/lib/rpc';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';

interface PendingByAff {
  id: string;
  code: string;
  name: string | null;
  email: string | null;
  pay_id: string | null;
  currency: string;
  count: number;
  cents: number;
  breakdown_conv_count: number;
  breakdown_conv_cents: number;
  breakdown_volume_count: number;
  breakdown_volume_cents: number;
  breakdown_milestone_count: number;
  breakdown_milestone_cents: number;
  oldest_ready_at: string | null;
}

interface PendingSummary {
  currency: string;
  count: number;
  cents: number;
}

interface HistoryRow {
  month: string;
  currency: string;
  payouts: number;
  cents: number;
}

interface PlanningResponse {
  pending_by_affiliate: PendingByAff[];
  pending_summary: PendingSummary[];
  history_by_month: HistoryRow[];
  generated_at: string;
}

function formatMoney(cents: number, currency: string): string {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

interface Props {
  /** Refresh trigger — incrementar pra recarregar (ex: depois de marcar pago). */
  refreshKey?: number;
  /** Callback ao clicar num afiliado pendente — abre o detail panel. */
  onSelectAffiliate?: (affiliateId: string) => void;
}

/**
 * Card de "Pagar agora" + histórico — gestão de cash flow do programa de afiliados.
 *
 * Resumo:
 *   - Total a pagar agora (split por moeda)
 *   - Lista por afiliado: quanto + há quanto tempo está esperando
 *   - Histórico últimos 12 meses (quanto pagou cada mês × moeda)
 */
export function PendingPayoutsCard({ refreshKey, onSelectAffiliate }: Props) {
  const { toast } = useToast();
  const [data, setData] = useState<PlanningResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [localRefresh, setLocalRefresh] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    callRpc<PlanningResponse>('admin_affiliate_payout_planning', {})
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
  }, [refreshKey, localRefresh]);

  async function bulkPay(aff: PendingByAff) {
    const total = formatMoney(aff.cents, aff.currency);
    const ref = window.prompt(
      `Vai marcar TUDO de ${aff.code} (${total}, ${aff.count} itens) como pago.\n\nReferência opcional (ex: PIX-2026-05-01):`,
      '',
    );
    if (ref === null) return;
    setPaying(aff.id);
    try {
      await callRpc<{ success: boolean; payout_id: string; total_cents: number }>(
        'admin_bulk_pay_affiliate',
        {
          p_affiliate_id: aff.id,
          p_method: 'pix',
          p_reference: ref || null,
        },
      );
      toast({
        variant: 'success',
        title: `${aff.code} pago`,
        description: `${total} consolidado em 1 payout (${aff.count} itens marcados).`,
      });
      setLocalRefresh((k) => k + 1);
    } catch (e) {
      toast({
        variant: 'error',
        title: 'Falha ao pagar',
        description: e instanceof RpcError ? e.message : 'Unknown',
      });
    } finally {
      setPaying(null);
    }
  }

  if (loading && !data) {
    return (
      <Card>
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-navy-400">
          <Spinner size="sm" />
          Carregando payouts pendentes…
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

  const totalCount = data.pending_summary.reduce((sum, s) => sum + s.count, 0);

  // Histórico agrupado por mês (várias moedas no mesmo mês ficam na mesma linha)
  const historyByMonth = data.history_by_month.reduce<Record<string, HistoryRow[]>>(
    (acc, r) => {
      const arr = acc[r.month] ?? [];
      arr.push(r);
      acc[r.month] = arr;
      return acc;
    },
    {},
  );
  const months = Object.keys(historyByMonth).sort().reverse();

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Title className="!text-base">💸 Pagar agora</Title>
          <Text className="mt-0.5 text-xs text-navy-300">
            Conversões com status <code>commission_ready</code> aguardando payout
          </Text>
        </div>
        {totalCount === 0 ? (
          <Badge color="emerald" size="xs">tudo em dia</Badge>
        ) : (
          <Badge color="amber" size="xs">{totalCount} pendentes</Badge>
        )}
      </div>

      {/* Summary por moeda */}
      {data.pending_summary.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {data.pending_summary.map((s) => (
            <div
              key={s.currency}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
            >
              <div className="text-[10px] font-medium uppercase tracking-wide text-amber-700">
                {s.currency} a pagar
              </div>
              <div className="text-lg font-bold tabular-nums text-amber-900">
                {formatMoney(s.cents, s.currency)}
              </div>
              <div className="text-[10px] text-amber-700">
                {s.count} conv
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lista por afiliado */}
      {data.pending_by_affiliate.length > 0 && (
        <ul className="mt-4 divide-y divide-navy-50 rounded-md border border-navy-100">
          {data.pending_by_affiliate.map((a) => {
            const oldestDays = a.oldest_ready_at
              ? Math.floor(
                  (Date.now() - new Date(a.oldest_ready_at).getTime()) /
                    (1000 * 60 * 60 * 24),
                )
              : null;
            const breakdown: string[] = [];
            if (a.breakdown_conv_count > 0)
              breakdown.push(`${a.breakdown_conv_count} convs $${(a.breakdown_conv_cents / 100).toFixed(2)}`);
            if (a.breakdown_volume_count > 0)
              breakdown.push(`${a.breakdown_volume_count} vol $${(a.breakdown_volume_cents / 100).toFixed(2)}`);
            if (a.breakdown_milestone_count > 0)
              breakdown.push(`${a.breakdown_milestone_count} ret $${(a.breakdown_milestone_cents / 100).toFixed(2)}`);

            return (
              <li
                key={a.id}
                className="flex items-center gap-3 px-3 py-2.5 text-sm"
              >
                <button
                  type="button"
                  onClick={() => onSelectAffiliate?.(a.id)}
                  className="flex-1 truncate text-left transition-colors hover:text-brand-700"
                >
                  <span className="font-mono text-xs font-semibold text-navy-700">
                    {a.code}
                  </span>
                  {a.name && (
                    <span className="ml-2 text-xs text-navy-500">· {a.name}</span>
                  )}
                  <div className="text-[11px] text-navy-300">
                    {a.pay_id ?? a.email ?? '—'}
                    {oldestDays !== null && (
                      <span className={oldestDays > 30 ? 'ml-2 text-rose-600' : 'ml-2'}>
                        · há {oldestDays}d esperando
                      </span>
                    )}
                  </div>
                  {breakdown.length > 0 && (
                    <div className="mt-0.5 text-[10px] text-navy-400">
                      {breakdown.join(' · ')}
                    </div>
                  )}
                </button>
                <div className="text-right">
                  <div className="font-semibold tabular-nums text-amber-700">
                    {formatMoney(a.cents, a.currency)}
                  </div>
                  <div className="text-[10px] text-navy-400">
                    {a.count} {a.count === 1 ? 'item' : 'itens'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void bulkPay(a);
                  }}
                  disabled={paying === a.id}
                  className="rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                  {paying === a.id ? '…' : 'Pagar tudo'}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Histórico */}
      {months.length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-navy-400">
            Histórico · últimos 12 meses
          </div>
          <ul className="mt-2 space-y-1">
            {months.map((m) => (
              <li
                key={m}
                className="flex items-center justify-between rounded px-2 py-1 text-xs hover:bg-navy-50"
              >
                <span className="font-mono text-navy-500">{m}</span>
                <span className="flex gap-3 tabular-nums">
                  {(historyByMonth[m] ?? []).map((row) => (
                    <span key={row.currency} className="text-navy-700">
                      {formatMoney(row.cents, row.currency)}{' '}
                      <span className="text-[10px] text-navy-400">
                        ({row.payouts} pgto{row.payouts > 1 ? 's' : ''})
                      </span>
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {totalCount === 0 && months.length === 0 && (
        <div className="mt-4 rounded-md bg-navy-50/60 px-3 py-4 text-center text-xs text-navy-400">
          Sem payouts pendentes nem histórico ainda.
        </div>
      )}
    </Card>
  );
}
