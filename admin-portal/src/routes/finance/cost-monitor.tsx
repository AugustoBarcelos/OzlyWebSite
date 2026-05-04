import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, BarList, Card, DonutChart, Title } from '@tremor/react';
import {
  ArrowDownRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  ServerIcon,
  SparklesIcon,
  XIcon,
} from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { GlobalFilterBar } from '@/components/GlobalFilterBar';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callRpc, RpcError } from '@/lib/rpc';
import { useGlobalFilters } from '@/lib/useGlobalFilters';
import { formatCurrencyAUD, formatNumber } from '@/lib/format';

type SupabaseTier = 'free' | 'pro' | 'team';

interface DbComponent {
  used_gb: number | null;
  included_gb: number;
  extra_gb: number | null;
  rate_per_gb_usd: number;
  overage_usd_monthly: number | null;
  note?: string;
}
interface EgressComponent {
  used_gb: number | null;
  included_gb: number;
  rate_per_gb_usd: number;
  note: string;
}
interface InvokesComponent {
  used: number | null;
  included: number;
  rate_per_million_usd: number;
  note: string;
}
interface MauComponent {
  used: number | null;
  included: number;
  rate_per_mau_usd: number;
  note: string;
}

interface SupabaseBreakdown {
  tier: SupabaseTier;
  tier_base_usd_monthly: number;
  period_factor: number;
  monthly_subtotal_usd: number;
  period_subtotal_usd: number;
  period_subtotal_aud: number;
  database: DbComponent;
  storage: DbComponent;
  egress: EgressComponent;
  edge_invokes: InvokesComponent;
  mau: MauComponent;
  pricing_source: string;
  caveat: string;
}

interface CostsOverview {
  period_days: number;
  snapshot_at: string;
  usd_to_aud: number;
  supabase_tier: SupabaseTier;
  totals: {
    manual_aud: number;
    ai_aud: number;
    ai_usd: number;
    supabase_aud: number;
    supabase_usd: number;
    grand_total_aud: number;
  };
  manual: {
    total_aud: number;
    by_category: Array<{ category: string; total: number; entries: number }>;
  };
  ai: { cost_usd: number; calls: number; tokens: number };
  supabase: SupabaseBreakdown;
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

const TIER_KEY = 'ozly-admin-supabase-tier';

function loadTier(): SupabaseTier {
  if (typeof window === 'undefined') return 'pro';
  try {
    const v = window.localStorage.getItem(TIER_KEY);
    if (v === 'free' || v === 'pro' || v === 'team') return v;
  } catch {
    /* ignore */
  }
  return 'pro';
}

/**
 * /finance/cost-monitor — painel de custos consolidado v2.
 *
 *   - Manual (finance_costs)            → categoria + entries
 *   - AI inference (ai_inference_log)   → tokens + USD/AUD
 *   - Supabase (tier-aware)             → DB + Storage medidos +
 *                                         Egress/Edge/MAU como TODO
 *
 * Cards principais são clicáveis: abrem drawer com memória de cálculo
 * completa (tier + included + measured + rate + subtotal).
 */
export function FinanceCostMonitorPage() {
  const { periodDays } = useGlobalFilters();
  const [tier, setTier] = useState<SupabaseTier>(loadTier);
  const [overview, setOverview] = useState<CostsOverview | null>(null);
  const [ai, setAi] = useState<AiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrationPending, setMigrationPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drilldown, setDrilldown] = useState<'manual' | 'ai' | 'supabase' | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(TIER_KEY, tier);
    } catch {
      /* ignore */
    }
  }, [tier]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    void Promise.allSettled([
      callRpc<CostsOverview>('admin_finance_costs_overview', {
        p_period_days: periodDays,
        p_supabase_tier: tier,
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
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [periodDays, tier]);

  const distribution = useMemo(() => {
    if (!overview) return [];
    return [
      { name: 'Manual entries', value: overview.totals.manual_aud },
      { name: 'AI inference', value: overview.totals.ai_aud },
      { name: 'Supabase infra', value: overview.totals.supabase_aud },
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
              Tudo que sai do caixa — manual + AI tokens + Supabase infra. Click
              em qualquer card pra ver memória de cálculo.
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

      <div className="flex flex-wrap items-center gap-3">
        <GlobalFilterBar show={['period']} />
        <div className="ozly-card flex items-center gap-2 bg-white p-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">
            Supabase tier
          </span>
          <div className="inline-flex rounded-md border border-navy-100 bg-white p-0.5 text-xs">
            {(['free', 'pro', 'team'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                className={
                  tier === t
                    ? 'rounded bg-brand-500 px-2.5 py-1 font-semibold uppercase text-white'
                    : 'rounded px-2.5 py-1 uppercase text-navy-500 hover:bg-navy-50'
                }
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {migrationPending && (
        <div className="ozly-card border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
          <strong>Migration v2 pendente.</strong> Aplique{' '}
          <code className="font-mono">
            20260504040000_finance_costs_overview_v2.sql
          </code>{' '}
          em prod (extende a função com tier-aware pricing + admin_log_ai_inference).
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
          {/* Headline KPIs (clickable cards) */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile
              label="Total estimado"
              value={overview.totals.grand_total_aud}
              tone="warning"
              hint={`${overview.period_days} dias`}
            />
            <KpiTile
              label="Manual entries"
              value={overview.totals.manual_aud}
              tone="brand"
              hint={`${overview.manual.by_category.length} categorias · click pra ver`}
              onClick={() => setDrilldown('manual')}
            />
            <KpiTile
              label="AI (Gemini etc)"
              value={overview.totals.ai_aud}
              tone="lime"
              hint={`${formatNumber(overview.ai.calls)} calls · click pra detalhar`}
              onClick={() => setDrilldown('ai')}
            />
            <KpiTile
              label="Supabase infra"
              value={overview.totals.supabase_aud}
              tone="neutral"
              hint={`tier ${overview.supabase.tier} · click pra ver memória`}
              onClick={() => setDrilldown('supabase')}
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

            <Card className="ozly-card lg:col-span-2">
              <div className="flex items-center justify-between">
                <Title className="!text-sm !font-semibold text-navy-700">
                  Manual entries por categoria
                </Title>
                <button
                  type="button"
                  onClick={() => setDrilldown('manual')}
                  className="text-xs text-brand-600 hover:text-brand-700"
                >
                  Ver detalhes →
                </button>
              </div>
              {overview.manual.by_category.length === 0 ? (
                <div className="mt-3 rounded-md border border-navy-100 bg-navy-50/40 p-3 text-xs text-navy-500">
                  Sem custos manuais cadastrados pra esse período.{' '}
                  <Link to="/finance/costs" className="text-brand-600 hover:underline">
                    Cadastrar
                  </Link>
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
                  AI inference
                </Title>
              </div>
              <button
                type="button"
                onClick={() => setDrilldown('ai')}
                className="text-xs text-brand-600 hover:text-brand-700"
              >
                Memória de cálculo →
              </button>
            </div>

            {overview.ai.calls === 0 ? (
              <div className="mt-3 rounded-md border border-navy-100 bg-navy-50/40 p-3 text-xs text-navy-500">
                Nenhuma chamada de IA logada ainda. Quando você usar{' '}
                <Link to="/marketing/ai-composer" className="text-brand-600 hover:underline">
                  AI Composer
                </Link>{' '}
                ou clicar em &ldquo;Sugerir com AI&rdquo; em algum broadcast, vai aparecer
                aqui automaticamente.
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
              </>
            )}
          </Card>

          {/* Supabase section — collapsible per component */}
          <Card className="ozly-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ServerIcon className="h-4 w-4 text-brand-600" />
                <Title className="!text-sm !font-semibold text-navy-700">
                  Supabase infra (tier {overview.supabase.tier})
                </Title>
              </div>
              <a
                href="https://supabase.com/dashboard/project/jnhwgwnphlnhjlgygjql/settings/billing"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
              >
                Billing real <ExternalLinkIcon className="h-3 w-3" />
              </a>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <MiniStat
                label="Base do tier"
                value={`$${overview.supabase.tier_base_usd_monthly}/mo`}
              />
              <MiniStat
                label="Mensal estim."
                value={`$${overview.supabase.monthly_subtotal_usd.toFixed(2)}`}
              />
              <MiniStat
                label={`No período (${overview.period_days}d)`}
                value={formatCurrencyAUD(overview.totals.supabase_aud)}
              />
            </div>

            <div className="mt-4 space-y-2">
              <SupabaseComponent
                title="Database (postgres)"
                used={overview.supabase.database.used_gb}
                included={overview.supabase.database.included_gb}
                extra={overview.supabase.database.extra_gb ?? 0}
                rate={overview.supabase.database.rate_per_gb_usd}
                rateUnit="GB-mês"
                overage={overview.supabase.database.overage_usd_monthly ?? 0}
                measured
              />
              <SupabaseComponent
                title="Storage (buckets)"
                used={overview.supabase.storage.used_gb}
                included={overview.supabase.storage.included_gb}
                extra={overview.supabase.storage.extra_gb ?? 0}
                rate={overview.supabase.storage.rate_per_gb_usd}
                rateUnit="GB-mês"
                overage={overview.supabase.storage.overage_usd_monthly ?? 0}
                measured
              />
              <SupabaseComponent
                title="Egress (bandwidth)"
                used={overview.supabase.egress.used_gb}
                included={overview.supabase.egress.included_gb}
                extra={null}
                rate={overview.supabase.egress.rate_per_gb_usd}
                rateUnit="GB"
                overage={null}
                measured={false}
                note={overview.supabase.egress.note}
              />
              <SupabaseComponent
                title="Edge function invocations"
                used={overview.supabase.edge_invokes.used}
                included={overview.supabase.edge_invokes.included}
                extra={null}
                rate={overview.supabase.edge_invokes.rate_per_million_usd}
                rateUnit="1M invokes"
                overage={null}
                measured={false}
                isCount
                note={overview.supabase.edge_invokes.note}
              />
              <SupabaseComponent
                title="Monthly Active Users (MAU)"
                used={overview.supabase.mau.used}
                included={overview.supabase.mau.included}
                extra={null}
                rate={overview.supabase.mau.rate_per_mau_usd}
                rateUnit="MAU"
                overage={null}
                measured={false}
                isCount
                note={overview.supabase.mau.note}
              />
            </div>

            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50/60 p-2.5 text-[11px] leading-relaxed text-amber-800">
              <strong>Caveat:</strong> {overview.supabase.caveat}{' '}
              <a
                href={overview.supabase.pricing_source.split(' ')[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 underline"
              >
                Tabela de preços oficial
              </a>
            </div>
          </Card>
        </>
      )}

      {/* Drilldown drawer */}
      {drilldown && overview && (
        <DrilldownDrawer
          kind={drilldown}
          overview={overview}
          ai={ai}
          onClose={() => setDrilldown(null)}
        />
      )}

      <RawDataPanel
        page="finance-cost-monitor"
        sources={[
          {
            rpc: 'admin_finance_costs_overview',
            params: { p_period_days: periodDays, p_supabase_tier: tier },
            data: overview,
          },
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
  onClick,
}: {
  label: string;
  value: number;
  tone: 'brand' | 'lime' | 'warning' | 'neutral';
  hint?: string;
  onClick?: () => void;
}) {
  const TONE: Record<typeof tone, string> = {
    brand: 'text-brand-600',
    lime: 'text-lime-600',
    warning: 'text-amber-600',
    neutral: 'text-navy-700',
  };
  const interactive = Boolean(onClick);
  const inner = (
    <div
      className={`ozly-card ozly-card-hero relative px-5 py-4 ${
        interactive ? 'cursor-pointer transition-shadow hover:shadow-md hover:ring-1 hover:ring-brand-200' : ''
      }`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${TONE[tone]}`}>
        {formatCurrencyAUD(value)}
      </div>
      {hint && (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-navy-400">
          {hint}
          {interactive && <ChevronRightIcon className="h-3 w-3" />}
        </div>
      )}
    </div>
  );
  if (!onClick) return inner;
  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      {inner}
    </button>
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

function SupabaseComponent({
  title,
  used,
  included,
  extra,
  rate,
  rateUnit,
  overage,
  measured,
  isCount = false,
  note,
}: {
  title: string;
  used: number | null;
  included: number;
  extra: number | null;
  rate: number;
  rateUnit: string;
  overage: number | null;
  measured: boolean;
  isCount?: boolean;
  note?: string;
}) {
  const [open, setOpen] = useState(false);
  const fmt = (v: number | null): string => {
    if (v === null) return '—';
    if (isCount) return formatNumber(v);
    return v < 0.01 ? `${(v * 1024).toFixed(1)} MB` : `${v.toFixed(2)} GB`;
  };
  const status = !measured
    ? 'Não medido'
    : extra !== null && extra > 0
      ? 'Excede incluído'
      : 'Dentro do incluído';
  const statusTone = !measured
    ? 'bg-navy-50 text-navy-500'
    : extra !== null && extra > 0
      ? 'bg-amber-50 text-amber-700'
      : 'bg-emerald-50 text-emerald-700';

  return (
    <div className="rounded-md border border-navy-100 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-navy-50/40"
      >
        <div className="flex items-center gap-2">
          <ChevronDownIcon
            className={`h-3.5 w-3.5 text-navy-300 transition-transform ${
              open ? 'rotate-0' : '-rotate-90'
            }`}
          />
          <span className="text-sm font-medium text-navy-700">{title}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusTone}`}>
            {status}
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-navy-500">
          <span>
            <span className="text-navy-400">used:</span> {fmt(used)}
          </span>
          <span>
            <span className="text-navy-400">incl:</span> {fmt(included)}
          </span>
          {overage !== null && overage > 0 && (
            <span className="font-semibold text-amber-700">+${overage.toFixed(4)}/mo</span>
          )}
        </div>
      </button>
      {open && (
        <div className="border-t border-navy-50 bg-navy-50/30 px-3 py-3 text-[12px] text-navy-600">
          <div className="grid gap-1.5 font-mono">
            <Row label="Used" value={fmt(used)} />
            <Row label="Included no tier" value={fmt(included)} />
            <Row
              label="Extra (overage)"
              value={extra === null ? 'N/A (não medido)' : fmt(extra)}
            />
            <Row
              label="Rate"
              value={`$${rate}${isCount ? '' : '/'}/${rateUnit}`}
            />
            <Row
              label="Subtotal mensal"
              value={
                overage === null
                  ? 'N/A'
                  : `$${overage.toFixed(4)} USD`
              }
              bold
            />
          </div>
          {note && (
            <div className="mt-2 rounded-md border border-navy-100 bg-white p-2 text-[11px] text-navy-500">
              {note}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between border-b border-navy-100/40 pb-1 last:border-0">
      <span className="text-navy-500">{label}</span>
      <span className={bold ? 'font-semibold text-navy-700' : 'text-navy-700'}>{value}</span>
    </div>
  );
}

// ─── Drilldown drawer ────────────────────────────────────────────────────

function DrilldownDrawer({
  kind,
  overview,
  ai,
  onClose,
}: {
  kind: 'manual' | 'ai' | 'supabase';
  overview: CostsOverview;
  ai: AiSummary | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onEsc);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="ozly-card relative z-10 flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-navy-50 px-4 py-3">
          <h2 className="text-base font-semibold text-navy-700">
            {kind === 'manual'
              ? 'Manual entries — detalhe'
              : kind === 'ai'
                ? 'AI inference — memória de cálculo'
                : 'Supabase infra — memória de cálculo'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-navy-300 hover:bg-navy-50 hover:text-navy-500"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 text-sm">
          {kind === 'manual' && <ManualDrilldown overview={overview} />}
          {kind === 'ai' && <AiDrilldown overview={overview} ai={ai} />}
          {kind === 'supabase' && <SupabaseDrilldown overview={overview} />}
        </div>
      </aside>
    </div>
  );
}

function ManualDrilldown({ overview }: { overview: CostsOverview }) {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-navy-100 bg-navy-50/40 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">
          Total no período
        </div>
        <div className="mt-1 text-2xl font-semibold text-brand-600">
          {formatCurrencyAUD(overview.manual.total_aud)}
        </div>
      </div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-navy-400">
        Por categoria
      </h3>
      {overview.manual.by_category.length === 0 ? (
        <p className="text-xs text-navy-300">
          Sem custos cadastrados.{' '}
          <Link to="/finance/costs" className="text-brand-600 hover:underline">
            Cadastrar
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-navy-50">
          {overview.manual.by_category.map((c) => (
            <li key={c.category} className="flex items-baseline justify-between py-2">
              <div>
                <div className="text-sm font-medium text-navy-700">
                  {CATEGORY_LABEL[c.category] ?? c.category}
                </div>
                <div className="text-[11px] text-navy-400">
                  {c.entries} entrada{c.entries === 1 ? '' : 's'}
                </div>
              </div>
              <div className="font-mono text-sm font-semibold text-navy-700">
                {formatCurrencyAUD(c.total)}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/finance/costs"
        className="block rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-center text-xs font-medium text-brand-700 hover:bg-brand-100"
      >
        Editar custos manuais →
      </Link>
    </div>
  );
}

function AiDrilldown({ overview, ai }: { overview: CostsOverview; ai: AiSummary | null }) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-navy-100 bg-navy-50/40 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">
          Total no período
        </div>
        <div className="mt-1 text-2xl font-semibold text-brand-600">
          ${overview.ai.cost_usd.toFixed(4)} USD
        </div>
        <div className="mt-1 text-xs text-navy-500">
          ≈ {formatCurrencyAUD(overview.totals.ai_aud)} (×{overview.usd_to_aud.toFixed(2)})
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Stat label="Calls totais" value={formatNumber(overview.ai.calls)} />
        <Stat label="Tokens (in+out)" value={formatNumber(overview.ai.tokens)} />
      </div>

      {ai && ai.by_model.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy-400">
            Por modelo
          </h3>
          <table className="w-full text-xs">
            <thead className="text-[10px] text-navy-400">
              <tr className="border-b border-navy-100">
                <th className="py-1 text-left">Modelo</th>
                <th className="py-1 text-right">Calls</th>
                <th className="py-1 text-right">Tokens</th>
                <th className="py-1 text-right">USD</th>
              </tr>
            </thead>
            <tbody className="text-navy-700">
              {ai.by_model.map((m) => (
                <tr key={m.model} className="border-b border-navy-50/60 last:border-0">
                  <td className="py-1 font-mono text-[11px]">{m.model}</td>
                  <td className="py-1 text-right tabular-nums">{m.calls}</td>
                  <td className="py-1 text-right tabular-nums text-navy-500">
                    {formatNumber(m.tokens_in + m.tokens_out)}
                  </td>
                  <td className="py-1 text-right font-mono tabular-nums">
                    ${m.cost_usd.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ai && ai.by_source.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy-400">
            Por source (de onde vem)
          </h3>
          <ul className="space-y-1">
            {ai.by_source.map((s) => (
              <li
                key={s.source}
                className="flex items-baseline justify-between rounded border border-navy-50 bg-white px-2 py-1.5 text-xs"
              >
                <code className="font-mono text-navy-700">{s.source}</code>
                <span className="font-mono text-navy-500">
                  {s.calls} calls · ${s.cost_usd.toFixed(4)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-md border border-navy-100 bg-navy-50/40 p-2.5 text-[11px] text-navy-500">
        <strong>Fórmula de custo:</strong> tokens_in × in_per_1m_usd / 1M +
        tokens_out × out_per_1m_usd / 1M. Tabela de preços hardcoded em{' '}
        <code className="font-mono">lib/aiInferenceLog.ts</code> (Gemini Flash:
        $0.075/1M in, $0.30/1M out).
      </div>
    </div>
  );
}

function SupabaseDrilldown({ overview }: { overview: CostsOverview }) {
  const sb = overview.supabase;
  const measuredOverage =
    (sb.database.overage_usd_monthly ?? 0) + (sb.storage.overage_usd_monthly ?? 0);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-navy-100 bg-navy-50/40 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">
          Estimativa no período ({overview.period_days}d)
        </div>
        <div className="mt-1 text-2xl font-semibold text-brand-600">
          {formatCurrencyAUD(sb.period_subtotal_aud)}
        </div>
        <div className="mt-1 text-xs text-navy-500">
          ≈ ${sb.period_subtotal_usd.toFixed(2)} USD (mensal: $
          {sb.monthly_subtotal_usd.toFixed(2)})
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy-400">
          Memória de cálculo (mensal)
        </h3>
        <div className="space-y-2 rounded-md border border-navy-100 bg-white p-3 font-mono text-xs">
          <Row label={`Tier (${sb.tier}) base`} value={`$${sb.tier_base_usd_monthly}`} />
          <Row
            label="DB overage"
            value={`$${(sb.database.overage_usd_monthly ?? 0).toFixed(4)}`}
          />
          <Row
            label="Storage overage"
            value={`$${(sb.storage.overage_usd_monthly ?? 0).toFixed(4)}`}
          />
          <Row label="Egress" value="N/A (não medido)" />
          <Row label="Edge invokes" value="N/A (não medido)" />
          <Row label="MAU" value="N/A (não medido)" />
          <div className="mt-1 border-t border-navy-100 pt-1.5">
            <Row
              label="Total mensal"
              value={`$${sb.monthly_subtotal_usd.toFixed(2)} USD`}
              bold
            />
            <Row
              label={`× period_factor (${sb.period_factor})`}
              value={`$${sb.period_subtotal_usd.toFixed(2)} USD`}
            />
            <Row
              label={`× FX ${overview.usd_to_aud}`}
              value={formatCurrencyAUD(sb.period_subtotal_aud)}
              bold
            />
          </div>
        </div>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50/60 p-2.5 text-[11px] text-amber-800">
        <strong>Não medido ainda:</strong>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>Egress: precisa Management API</li>
          <li>Edge function invocations: precisa Management API</li>
          <li>MAU (auth users): precisa Management API ou snapshot diário</li>
        </ul>
        <p className="mt-2">
          Adicionando esses 3, a estimativa fica precisa. Por agora, comparar com{' '}
          <a
            href="https://supabase.com/dashboard/project/jnhwgwnphlnhjlgygjql/settings/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            billing real
          </a>{' '}
          dá a referência.
        </p>
      </div>

      <p className="text-[11px] text-navy-500">
        Total medido (DB + Storage): ${measuredOverage.toFixed(4)} USD/mês de overage.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-navy-50 bg-white p-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-navy-400">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-sm font-semibold text-navy-700">{value}</div>
    </div>
  );
}
