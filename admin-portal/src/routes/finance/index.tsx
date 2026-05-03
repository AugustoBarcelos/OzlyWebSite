import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  DollarSignIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrendingUpIcon,
} from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callRpc, RpcError } from '@/lib/rpc';
import { formatCurrencyAUD } from '@/lib/format';
import type {
  KpiDashboardResponse,
  RevenueSummaryResponse,
} from '@/routes/dashboard/types';

interface RunwayResponse {
  mrr_aud: number;
  avg_monthly_cost_aud: number;
  burn_rate_aud: number;
  profit_margin: number | null;
  runway_months: number | null;
  cash_on_hand_aud: number | null;
  snapshot_at: string;
}

/**
 * Finance Hub (W5) — landing for revenue/costs/forecast/reconciliation.
 *
 * Renders: MRR/ARR/Burn/Profit headline KPIs + sub-page cards.
 * Reuses existing RPCs (admin_revenue_summary, admin_kpi_dashboard) +
 * new admin_finance_runway when migration is applied.
 */
export function FinanceHubPage() {
  const [kpi, setKpi] = useState<KpiDashboardResponse | null>(null);
  const [revenue, setRevenue] = useState<RevenueSummaryResponse | null>(null);
  const [runway, setRunway] = useState<RunwayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [runwayPending, setRunwayPending] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void Promise.allSettled([
      callRpc<KpiDashboardResponse>('admin_kpi_dashboard', { p_period_days: 30 }),
      callRpc<RevenueSummaryResponse>('admin_revenue_summary', { p_period_days: 30 }),
      callRpc<RunwayResponse>('admin_finance_runway', {}),
    ]).then((results) => {
      if (!alive) return;
      const [r0, r1, r2] = results;
      if (r0.status === 'fulfilled') setKpi(r0.value);
      if (r1.status === 'fulfilled') setRevenue(r1.value);
      if (r2.status === 'fulfilled') setRunway(r2.value);
      else if (
        r2.reason instanceof RpcError &&
        (r2.reason.code === '42883' || r2.reason.message.includes('does not exist'))
      ) {
        setRunwayPending(true);
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const mrr = kpi?.mrr_estimate_aud ?? null;
  const arr = mrr !== null ? mrr * 12 : null;
  const burn = runway?.burn_rate_aud ?? null;
  const margin = runway?.profit_margin ?? null;

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
              Finance
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              MRR, ARR, custos, P&L, runway, reconciliation.
            </p>
          </div>
        </div>
        {loading && <Spinner size="sm" />}
      </header>

      {/* Headline KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="MRR" value={mrr} formatter={formatCurrencyAUD} tone="brand" hint="atual (AUD)" />
        <KpiTile label="ARR projetado" value={arr} formatter={formatCurrencyAUD} tone="lime" hint="MRR × 12" />
        <KpiTile
          label="Burn rate / mês"
          value={burn}
          formatter={(v) => (v === null ? '—' : v >= 0 ? formatCurrencyAUD(v) : `+${formatCurrencyAUD(Math.abs(v))} profit`)}
          tone={burn !== null && burn > 0 ? 'warning' : 'lime'}
          hint={runwayPending ? 'aplique a migration de costs' : 'avg últimos 3 meses'}
        />
        <KpiTile
          label="Profit margin"
          value={margin}
          formatter={(v) => (v === null ? '—' : `${(v * 100).toFixed(1)}%`)}
          tone={margin !== null && margin > 0 ? 'lime' : 'warning'}
          hint="MRR vs custos"
        />
      </section>

      {/* Trial→Paid + Plan mix details */}
      {revenue && (
        <Card className="ozly-card">
          <Title className="!text-sm !font-semibold text-navy-700">
            Resumo de receita (30d)
          </Title>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Detail label="Trial → Paid" value={revenue.conversion_trial_to_paid_period} formatter={(v) =>
              v === null ? '—' : `${(v * 100).toFixed(1)}%`
            } />
            <Detail label="Novos paying" value={revenue.new_paying_period} />
            <Detail label="Churn" value={revenue.churn_period} />
            <Detail label="LTV est." value={revenue.ltv_estimate_aud} formatter={formatCurrencyAUD} />
          </div>
          {revenue.mrr_by_plan && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <PlanRow label="TFN" amount={revenue.mrr_by_plan.tfn} />
              <PlanRow label="ABN" amount={revenue.mrr_by_plan.abn} />
              <PlanRow label="PRO" amount={revenue.mrr_by_plan.pro} />
            </div>
          )}
        </Card>
      )}

      {runwayPending && (
        <div className="ozly-card border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-700">
          Aplique a migration <code className="font-mono">20260503160000_finance_costs.sql</code>{' '}
          pra ativar Costs, Burn rate e Runway.
        </div>
      )}

      {/* Sub-pages */}
      <div>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-navy-300">
          Sub-pages
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SubPage to="/revenue" icon={DollarSignIcon} label="Revenue" desc="MRR, subscriptions, trials, plan mix, cohorts & LTV." status="live" />
          <SubPage to="/finance/cost-monitor" icon={ArrowDownRightIcon} label="Cost Monitor" desc="Painel consolidado: manual + AI tokens (Gemini) + DB infra estimado." status="live" />
          <SubPage to="/finance/costs" icon={ArrowDownRightIcon} label="Costs (manual)" desc="Cadastro manual de custos por categoria." status={runwayPending ? 'parte2' : 'live'} />
          <SubPage to="/finance/forecast" icon={SparklesIcon} label="Forecast & Runway" desc="Projeção com sliders de cenário." status="live" />
          <SubPage to="/finance/pnl" icon={TrendingUpIcon} label="P&L" desc="Profit & Loss mensal e YTD." status="live" />
          <SubPage to="/finance/reconciliation" icon={ShieldCheckIcon} label="Reconciliation" desc="Diff RevenueCat × App Store × Play." status="live" />
          <SubPage to="/finance/tax" icon={ScrollTextIcon} label="Tax & Reports" desc="GST AU, Apple Small Business, exports pro contador." status="wip" />
        </div>
      </div>

      <RawDataPanel
        page="finance-hub"
        sources={[
          { rpc: 'admin_kpi_dashboard', params: { p_period_days: 30 }, data: kpi },
          { rpc: 'admin_revenue_summary', params: { p_period_days: 30 }, data: revenue },
          {
            rpc: 'admin_finance_runway',
            params: {},
            data: runway,
            ...(runwayPending ? { note: 'migration pendente' } : {}),
          },
        ]}
      />
    </div>
  );
}

interface KpiTileProps {
  label: string;
  value: number | null;
  formatter: (v: number | null) => string;
  tone: 'brand' | 'lime' | 'warning' | 'neutral';
  hint?: string;
}
const TILE_TONE: Record<KpiTileProps['tone'], string> = {
  brand: 'text-brand-600',
  lime: 'text-lime-600',
  warning: 'text-amber-600',
  neutral: 'text-navy-700',
};
function KpiTile({ label, value, formatter, tone, hint }: KpiTileProps) {
  return (
    <div className="ozly-card ozly-card-hero relative px-5 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${TILE_TONE[tone]}`}>
        {formatter(value)}
      </div>
      {hint && <div className="mt-1 text-[11px] text-navy-400">{hint}</div>}
    </div>
  );
}

function Detail({
  label,
  value,
  formatter,
}: {
  label: string;
  value: number | null;
  formatter?: (v: number | null) => string;
}) {
  const fmt = formatter ?? ((v) => (v === null ? '—' : v.toLocaleString('en-AU')));
  return (
    <div className="rounded-md border border-navy-50 bg-white p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold text-navy-700">{fmt(value)}</div>
    </div>
  );
}

function PlanRow({ label, amount }: { label: string; amount: number | null }) {
  return (
    <div className="rounded-md border border-navy-50 bg-navy-50/40 p-2 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-navy-500">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-navy-700">
        {formatCurrencyAUD(amount)}
      </div>
    </div>
  );
}

function SubPage({
  to,
  icon: Icon,
  label,
  desc,
  status,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  status: 'live' | 'wip' | 'parte2';
}) {
  const STATUS_BADGE: Record<typeof status, string> = {
    live: '',
    wip: 'bg-amber-50 text-amber-700 border border-amber-200',
    parte2: 'bg-navy-50 text-navy-500 border border-navy-100',
  };
  const STATUS_LABEL: Record<typeof status, string> = {
    live: '',
    wip: 'WIP',
    parte2: 'Migration',
  };
  return (
    <Link
      to={to}
      className="ozly-card group flex items-start gap-3 bg-white p-4 transition-all hover:border-brand-200 hover:shadow-md"
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-navy-700">{label}</span>
          {status !== 'live' && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_BADGE[status]}`}>
              {STATUS_LABEL[status]}
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-navy-400">{desc}</p>
      </div>
      <ArrowUpRightIcon className="mt-1 h-3.5 w-3.5 shrink-0 text-navy-200 transition-colors group-hover:text-brand-500" />
    </Link>
  );
}

