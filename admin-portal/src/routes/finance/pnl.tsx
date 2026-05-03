import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Card, Title } from '@tremor/react';
import { ArrowDownRightIcon, TrendingUpIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callRpc, RpcError } from '@/lib/rpc';
import { formatCurrencyAUD } from '@/lib/format';
import type { RevenueSummaryResponse } from '@/routes/dashboard/types';

interface CostsByMonth {
  month: string;
  total: number;
}
interface CostsListResponse {
  total_aud: number;
  by_month: CostsByMonth[];
  by_category: Array<{ category: string; total: number }>;
}

/**
 * /finance/pnl — profit & loss derived client-side from revenue + costs.
 *
 * Sources:
 *   - admin_revenue_summary (current MRR + period totals)
 *   - admin_finance_costs_list (manual cost entries by month)
 *
 * Computes monthly P&L: gross revenue, total costs, net profit/loss,
 * with trend chart and YTD summary.
 *
 * MVP: revenue is approximated as MRR × N months (linear) since
 * `admin_revenue_summary` returns period total but not month-level
 * breakdown. Once an RPC like admin_revenue_by_month exists, swap in.
 */
export function FinancePnlPage() {
  const [revenue, setRevenue] = useState<RevenueSummaryResponse | null>(null);
  const [costs, setCosts] = useState<CostsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrationPending, setMigrationPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    void Promise.allSettled([
      callRpc<RevenueSummaryResponse>('admin_revenue_summary', { p_period_days: 30 }),
      callRpc<CostsListResponse>('admin_finance_costs_list', { p_period_days: 365 }),
    ]).then((results) => {
      if (!alive) return;
      const [r0, r1] = results;
      if (r0.status === 'fulfilled') setRevenue(r0.value);
      else if (r0.reason instanceof RpcError) setError(r0.reason.message);
      if (r1.status === 'fulfilled') setCosts(r1.value);
      else if (
        r1.reason instanceof RpcError &&
        (r1.reason.code === '42883' || r1.reason.message.includes('does not exist'))
      ) {
        setMigrationPending(true);
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const mrr = revenue?.mrr_total ?? 0;

  // Build monthly P&L from cost months × MRR estimate
  const monthlyPnl = useMemo(() => {
    if (!costs || costs.by_month.length === 0) return [];
    return costs.by_month.map((m) => ({
      month: m.month,
      revenue: Math.round(mrr),  // linear approximation — same MRR across months for now
      cost: Math.round(m.total),
      profit: Math.round(mrr - m.total),
    }));
  }, [costs, mrr]);

  const ytdRevenue = useMemo(
    () => monthlyPnl.reduce((s, m) => s + m.revenue, 0),
    [monthlyPnl],
  );
  const ytdCost = costs?.total_aud ?? 0;
  const ytdProfit = ytdRevenue - ytdCost;
  const ytdMargin = ytdRevenue > 0 ? (ytdProfit / ytdRevenue) * 100 : null;

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
            <TrendingUpIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              P&amp;L (Profit &amp; Loss)
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Derivado de revenue (MRR) e costs cadastrados manualmente.
            </p>
          </div>
        </div>
        <Link
          to="/finance"
          className="self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700 md:self-end"
        >
          ← Finance Hub
        </Link>
      </header>

      {migrationPending && (
        <div className="ozly-card border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
          <strong>Migration de costs pendente.</strong> Aplique{' '}
          <code className="font-mono">20260503160000_finance_costs.sql</code> e cadastre
          custos em <Link to="/finance/costs" className="underline">Costs</Link> pra ver
          o P&amp;L.
        </div>
      )}

      {error && (
        <div className="ozly-card border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-navy-400">
          <Spinner size="sm" /> Carregando…
        </div>
      ) : (
        <>
          {/* YTD KPIs */}
          <section className="grid gap-3 sm:grid-cols-4">
            <PnlTile
              label="Revenue (estim.)"
              value={ytdRevenue || null}
              tone="brand"
              hint={`MRR × ${monthlyPnl.length} meses`}
            />
            <PnlTile
              label="Custos totais"
              value={ytdCost || null}
              tone="warning"
              hint={`${costs?.by_month.length ?? 0} meses cadastrados`}
            />
            <PnlTile
              label="Profit"
              value={ytdProfit}
              tone={ytdProfit >= 0 ? 'lime' : 'warning'}
              hint={ytdProfit >= 0 ? 'lucro acumulado' : 'prejuízo acumulado'}
            />
            <PnlTile
              label="Margin"
              value={ytdMargin}
              formatter={(v) => (v === null ? '—' : `${v.toFixed(1)}%`)}
              tone={ytdMargin !== null && ytdMargin >= 0 ? 'lime' : 'warning'}
              hint="profit ÷ revenue"
            />
          </section>

          {/* Monthly chart */}
          {monthlyPnl.length > 0 && (
            <Card className="ozly-card">
              <Title className="!text-sm !font-semibold text-navy-700">
                Mensal: Revenue vs Cost vs Profit
              </Title>
              <BarChart
                data={monthlyPnl}
                index="month"
                categories={['revenue', 'cost', 'profit']}
                colors={['emerald', 'amber', 'sky']}
                valueFormatter={(v: number) => formatCurrencyAUD(v)}
                showLegend
                stack={false}
                className="mt-3 h-64"
              />
            </Card>
          )}

          {/* Cost breakdown */}
          {costs && costs.by_category.length > 0 && (
            <Card className="ozly-card">
              <Title className="!text-sm !font-semibold text-navy-700">
                Custos por categoria
              </Title>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[10px] font-semibold uppercase tracking-wider text-navy-300">
                    <tr className="border-b border-navy-50">
                      <th className="py-2 text-left">Categoria</th>
                      <th className="py-2 text-right">Total</th>
                      <th className="py-2 text-right">% do total</th>
                    </tr>
                  </thead>
                  <tbody className="text-navy-700">
                    {costs.by_category.map((c) => {
                      const pct = ytdCost > 0 ? (c.total / ytdCost) * 100 : 0;
                      return (
                        <tr key={c.category} className="border-b border-navy-50/60 last:border-0">
                          <td className="py-2 capitalize">{c.category.replace('_', ' ')}</td>
                          <td className="py-2 text-right tabular-nums font-semibold">
                            {formatCurrencyAUD(c.total)}
                          </td>
                          <td className="py-2 text-right tabular-nums text-navy-500">
                            {pct.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {monthlyPnl.length === 0 && !migrationPending && (
            <Card className="ozly-card">
              <div className="py-8 text-center text-sm text-navy-300">
                Sem custos cadastrados. Vai em{' '}
                <Link to="/finance/costs" className="text-brand-600 hover:underline">
                  Costs
                </Link>{' '}
                e cadastra alguns meses pra ver o P&amp;L.
              </div>
            </Card>
          )}
        </>
      )}

      <div className="flex items-center justify-end gap-2">
        <Link
          to="/finance/costs"
          className="flex items-center gap-1 rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:border-brand-200 hover:text-brand-700"
        >
          <ArrowDownRightIcon className="h-3.5 w-3.5" /> Editar custos
        </Link>
      </div>

      <RawDataPanel
        page="finance-pnl"
        sources={[
          { rpc: 'admin_revenue_summary', params: { p_period_days: 30 }, data: revenue },
          { rpc: 'admin_finance_costs_list', params: { p_period_days: 365 }, data: costs },
        ]}
      />
    </div>
  );
}

function PnlTile({
  label,
  value,
  formatter,
  tone,
  hint,
}: {
  label: string;
  value: number | null;
  formatter?: (v: number | null) => string;
  tone: 'brand' | 'lime' | 'warning';
  hint?: string;
}) {
  const TONE: Record<typeof tone, string> = {
    brand: 'text-brand-600',
    lime: 'text-lime-600',
    warning: 'text-amber-600',
  };
  const fmt = formatter ?? formatCurrencyAUD;
  return (
    <div className="ozly-card ozly-card-hero relative px-5 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${TONE[tone]}`}>
        {fmt(value)}
      </div>
      {hint && <div className="mt-1 text-[11px] text-navy-400">{hint}</div>}
    </div>
  );
}
