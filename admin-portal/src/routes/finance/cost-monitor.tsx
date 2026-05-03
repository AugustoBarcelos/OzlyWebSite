import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, BarList, Card, DonutChart, Title } from '@tremor/react';
import {
  ArrowDownRightIcon,
  ServerIcon,
  SparklesIcon,
} from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { GlobalFilterBar } from '@/components/GlobalFilterBar';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callRpc, RpcError } from '@/lib/rpc';
import { useGlobalFilters } from '@/lib/useGlobalFilters';
import { formatCurrencyAUD, formatNumber } from '@/lib/format';

interface CostsOverview {
  period_days: number;
  snapshot_at: string;
  usd_to_aud: number;
  totals: {
    manual_aud: number;
    ai_aud: number;
    ai_usd: number;
    db_estimate_aud: number;
    grand_total_aud: number;
  };
  manual: {
    total_aud: number;
    by_category: Array<{ category: string; total: number }>;
  };
  ai: { cost_usd: number; calls: number; tokens: number };
  db: { bytes: number; gb: number; estimate_aud: number; pricing_note: string };
}

interface AiSummary {
  period_days: number;
  total_calls: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_cost_usd: number;
  by_model: Array<{
    model: string;
    calls: number;
    tokens_in: number;
    tokens_out: number;
    cost_usd: number;
  }>;
  by_source: Array<{
    source: string;
    calls: number;
    tokens: number;
    cost_usd: number;
  }>;
  by_day: Array<{ day: string; calls: number; cost_usd: number }>;
}

const CATEGORY_LABEL: Record<string, string> = {
  ad_spend: 'Ad spend (não-snapshot)',
  infra: 'Infra',
  tools: 'Tools',
  affiliate: 'Affiliate payouts',
  whatsapp: 'WhatsApp Business',
  ai: 'AI inference (manual)',
  other: 'Other',
};

/**
 * /finance/cost-monitor — painel de custos consolidado.
 *
 * Junta:
 *   - Manual entries (finance_costs)
 *   - AI inference (ai_inference_log) — Gemini tokens em USD
 *   - DB size estimate (Supabase Pro pricing)
 *
 * Tudo num só lugar pra Augusto monitorar onde tá saindo dinheiro.
 */
export function FinanceCostMonitorPage() {
  const { periodDays } = useGlobalFilters();
  const [overview, setOverview] = useState<CostsOverview | null>(null);
  const [ai, setAi] = useState<AiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrationPending, setMigrationPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    void Promise.allSettled([
      callRpc<CostsOverview>('admin_finance_costs_overview', {
        p_period_days: periodDays,
      }),
      callRpc<AiSummary>('admin_ai_costs_summary', {
        p_period_days: periodDays,
      }),
    ]).then((results) => {
      if (!alive) return;
      const [r0, r1] = results;
      if (r0.status === 'fulfilled') {
        setOverview(r0.value);
        setMigrationPending(false);
      } else if (
        r0.reason instanceof RpcError &&
        (r0.reason.code === '42883' || r0.reason.message.includes('does not exist'))
      ) {
        setMigrationPending(true);
      } else if (r0.reason instanceof RpcError) {
        setError(r0.reason.message);
      }
      if (r1.status === 'fulfilled') setAi(r1.value);
      // Don't fail if AI summary 404s — overview already covers it
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [periodDays]);

  const distribution = useMemo(() => {
    if (!overview) return [];
    return [
      { name: 'Manual entries', value: overview.totals.manual_aud },
      { name: 'AI inference (auto)', value: overview.totals.ai_aud },
      { name: 'DB infra (estimate)', value: overview.totals.db_estimate_aud },
    ].filter((d) => d.value > 0);
  }, [overview]);

  const aiTimeseries = useMemo(() => {
    if (!ai) return [];
    return ai.by_day.map((d) => ({
      date: d.day,
      cost_aud: Number((d.cost_usd * (overview?.usd_to_aud ?? 1.5)).toFixed(2)),
    }));
  }, [ai, overview]);

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
            <ArrowDownRightIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Cost Monitor
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Tudo que sai do caixa: manual + AI tokens + DB infra.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-end">
          <Link
            to="/finance/costs"
            className="rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700"
          >
            Editar manual
          </Link>
          <Link
            to="/finance"
            className="rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700"
          >
            ← Finance Hub
          </Link>
        </div>
      </header>

      <GlobalFilterBar show={['period']} />

      {migrationPending && (
        <div className="ozly-card border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
          <strong>Migration pendente.</strong> Aplique{' '}
          <code className="font-mono">
            20260504030000_ai_inference_log_and_cost_overview.sql
          </code>
          .
        </div>
      )}

      {error && (
        <div className="ozly-card border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-navy-400">
          <Spinner size="sm" /> Carregando custos…
        </div>
      ) : !overview ? null : (
        <>
          {/* Headline KPIs */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile
              label="Total estimado"
              value={overview.totals.grand_total_aud}
              tone="warning"
              hint={`últimos ${overview.period_days} dias`}
            />
            <KpiTile
              label="Manual entries"
              value={overview.totals.manual_aud}
              tone="brand"
              hint={`${overview.manual.by_category.length} categorias`}
            />
            <KpiTile
              label="AI (Gemini etc)"
              value={overview.totals.ai_aud}
              tone="lime"
              hint={`${formatNumber(overview.ai.calls)} calls · ${formatNumber(overview.ai.tokens)} tokens`}
            />
            <KpiTile
              label="DB infra (estim.)"
              value={overview.totals.db_estimate_aud}
              tone="neutral"
              hint={`${overview.db.gb.toFixed(2)} GB`}
            />
          </section>

          {/* Distribution chart */}
          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="ozly-card lg:col-span-1">
              <Title className="!text-sm !font-semibold text-navy-700">
                Distribuição
              </Title>
              {distribution.length > 0 ? (
                <DonutChart
                  data={distribution}
                  category="value"
                  index="name"
                  colors={['emerald', 'lime', 'slate']}
                  valueFormatter={(v: number) => formatCurrencyAUD(v)}
                  className="mt-3 h-48"
                />
              ) : (
                <div className="mt-3 text-xs text-navy-300">Sem custos no período.</div>
              )}
            </Card>

            {/* Manual breakdown */}
            <Card className="ozly-card lg:col-span-2">
              <div className="flex items-center justify-between">
                <Title className="!text-sm !font-semibold text-navy-700">
                  Manual entries por categoria
                </Title>
                <Link
                  to="/finance/costs"
                  className="text-xs text-brand-600 hover:text-brand-700"
                >
                  Cadastrar mais →
                </Link>
              </div>
              {overview.manual.by_category.length === 0 ? (
                <div className="mt-3 rounded-md border border-navy-100 bg-navy-50/40 p-3 text-xs text-navy-500">
                  Sem custos manuais cadastrados pra esse período. Cadastra em{' '}
                  <Link to="/finance/costs" className="text-brand-600 hover:underline">
                    /finance/costs
                  </Link>{' '}
                  pra ver aqui.
                </div>
              ) : (
                <BarList
                  data={overview.manual.by_category.map((c) => ({
                    name: CATEGORY_LABEL[c.category] ?? c.category,
                    value: c.total,
                  }))}
                  color="emerald"
                  valueFormatter={(v: number) => formatCurrencyAUD(v)}
                  className="mt-3"
                />
              )}
            </Card>
          </section>

          {/* AI section */}
          <Card className="ozly-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-4 w-4 text-brand-600" />
                <Title className="!text-sm !font-semibold text-navy-700">
                  AI inference (auto-tracked)
                </Title>
              </div>
              <span className="text-[11px] text-navy-400">
                FX USD→AUD: {overview.usd_to_aud.toFixed(2)}
              </span>
            </div>

            {overview.ai.calls === 0 ? (
              <div className="mt-3 rounded-md border border-navy-100 bg-navy-50/40 p-3 text-xs text-navy-500">
                Nenhuma chamada de IA logada ainda. Quando o AI Composer (W7.5) ou
                qualquer feature do app chamar Gemini com a função{' '}
                <code className="font-mono">logAiInference()</code>, vai começar a
                aparecer aqui — token count, custo USD/AUD, breakdown por modelo e
                source.
              </div>
            ) : (
              <>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <MiniStat
                    label="Calls"
                    value={formatNumber(overview.ai.calls)}
                  />
                  <MiniStat
                    label="Tokens (in+out)"
                    value={formatNumber(overview.ai.tokens)}
                  />
                  <MiniStat
                    label="USD spent"
                    value={`$${overview.ai.cost_usd.toFixed(4)}`}
                  />
                </div>
                {ai && ai.by_day.length > 1 && (
                  <AreaChart
                    data={aiTimeseries}
                    index="date"
                    categories={['cost_aud']}
                    colors={['lime']}
                    valueFormatter={(v: number) => formatCurrencyAUD(v)}
                    showLegend={false}
                    className="mt-4 h-40"
                  />
                )}
                {ai && ai.by_model.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="text-[10px] font-semibold uppercase tracking-wider text-navy-300">
                        <tr className="border-b border-navy-50">
                          <th className="py-2 text-left">Modelo</th>
                          <th className="py-2 text-right">Calls</th>
                          <th className="py-2 text-right">Tokens in</th>
                          <th className="py-2 text-right">Tokens out</th>
                          <th className="py-2 text-right">Custo USD</th>
                        </tr>
                      </thead>
                      <tbody className="text-navy-700">
                        {ai.by_model.map((m) => (
                          <tr key={m.model} className="border-b border-navy-50/60 last:border-0">
                            <td className="py-1.5 font-mono text-[11px]">{m.model}</td>
                            <td className="py-1.5 text-right tabular-nums">
                              {formatNumber(m.calls)}
                            </td>
                            <td className="py-1.5 text-right tabular-nums text-navy-500">
                              {formatNumber(m.tokens_in)}
                            </td>
                            <td className="py-1.5 text-right tabular-nums text-navy-500">
                              {formatNumber(m.tokens_out)}
                            </td>
                            <td className="py-1.5 text-right font-mono tabular-nums text-brand-700">
                              ${m.cost_usd.toFixed(4)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {ai && ai.by_source.length > 0 && (
                  <div className="mt-4">
                    <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-navy-300">
                      Por source
                    </h3>
                    <BarList
                      data={ai.by_source.map((s) => ({
                        name: s.source,
                        value: Number(s.cost_usd.toFixed(4)),
                      }))}
                      color="emerald"
                      valueFormatter={(v: number) => `$${v.toFixed(4)}`}
                    />
                  </div>
                )}
              </>
            )}
          </Card>

          {/* DB section */}
          <Card className="ozly-card">
            <div className="flex items-center gap-2">
              <ServerIcon className="h-4 w-4 text-brand-600" />
              <Title className="!text-sm !font-semibold text-navy-700">
                DB infra (auto-estimated)
              </Title>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <MiniStat label="DB size" value={`${overview.db.gb.toFixed(2)} GB`} />
              <MiniStat
                label="Bytes"
                value={formatNumber(overview.db.bytes)}
              />
              <MiniStat
                label="Estimate (período)"
                value={formatCurrencyAUD(overview.totals.db_estimate_aud)}
              />
            </div>
            <div className="mt-3 rounded-md border border-navy-100 bg-navy-50/40 p-2.5 text-[11px] leading-relaxed text-navy-500">
              <strong>Pricing model:</strong> {overview.db.pricing_note}
              <br />
              <strong>Real cost:</strong> confirma no{' '}
              <a
                href="https://supabase.com/dashboard/project/jnhwgwnphlnhjlgygjql/settings/billing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:underline"
              >
                billing do Supabase
              </a>{' '}
              — esta é uma estimativa baseada apenas em DB size; bandwidth, edge
              function invocations e storage não estão incluídos no calc atual.
            </div>
          </Card>

          {/* Footer hint */}
          <div className="ozly-card border-navy-100 bg-navy-50/40 p-3 text-[12px] text-navy-500">
            <strong>O que falta pra ser 100% automático:</strong>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              <li>
                Quando o AI Composer (W7.5) ligar, cada chamada Gemini vai logar
                automaticamente em <code className="font-mono">ai_inference_log</code>.
              </li>
              <li>
                Bandwidth + edge function invocations + storage GB precisam Supabase
                Management API (Parte 2).
              </li>
              <li>
                Apple/Google fees (15-30%) já são deduzidos no MRR pelo RC — não
                aparecem aqui de propósito (já são "custo embutido").
              </li>
              <li>
                FX USD→AUD ({overview.usd_to_aud.toFixed(2)}) é fixo agora; refinar com
                FX RPC quando a oscilação importar.
              </li>
            </ul>
          </div>
        </>
      )}

      <RawDataPanel
        page="finance-cost-monitor"
        sources={[
          { rpc: 'admin_finance_costs_overview', params: { p_period_days: periodDays }, data: overview },
          { rpc: 'admin_ai_costs_summary', params: { p_period_days: periodDays }, data: ai },
        ]}
      />
    </div>
  );
}

function KpiTile({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone: 'brand' | 'lime' | 'warning' | 'neutral';
  hint?: string;
}) {
  const TONE: Record<typeof tone, string> = {
    brand: 'text-brand-600',
    lime: 'text-lime-600',
    warning: 'text-amber-600',
    neutral: 'text-navy-700',
  };
  return (
    <div className="ozly-card ozly-card-hero relative px-5 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${TONE[tone]}`}>
        {formatCurrencyAUD(value)}
      </div>
      {hint && <div className="mt-1 text-[11px] text-navy-400">{hint}</div>}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-navy-50 bg-white p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-navy-400">
        {label}
      </div>
      <div className="mt-1 font-mono text-base font-semibold text-navy-700">
        {value}
      </div>
    </div>
  );
}
