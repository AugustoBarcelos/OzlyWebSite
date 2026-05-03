import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Card, Title } from '@tremor/react';
import { SparklesIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { callRpc, RpcError } from '@/lib/rpc';
import { formatCurrencyAUD } from '@/lib/format';

interface RunwayResponse {
  mrr_aud: number;
  avg_monthly_cost_aud: number;
  burn_rate_aud: number;
  profit_margin: number | null;
  runway_months: number | null;
  cash_on_hand_aud: number | null;
}

/**
 * /finance/forecast — projeção MRR/Cash com sliders client-side.
 *
 * Usa admin_finance_runway() pra puxar baselines (MRR atual, custo médio
 * mensal). Sliders modificam multiplicadores e o gráfico re-renderiza
 * imediatamente (sem chamada extra ao server).
 *
 * Modelo MVP:
 *   Para cada mês t (1..12):
 *     mrr_t   = mrr_0 * (1 + signups_growth)^t * (1 - churn_pp)^t
 *     cost_t  = base_cost * (1 + ad_spend_multiplier)
 *     cash_t  = cash_t-1 + (mrr_t - cost_t)
 *
 * Pré-requisito: ter `cash_on_hand` informado pelo usuário (campo no form
 * — admin_finance_runway ainda não retorna esse valor).
 */
export function FinanceForecastPage() {
  const [runway, setRunway] = useState<RunwayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrationPending, setMigrationPending] = useState(false);

  // Manual cash on hand (since RPC doesn't have it yet)
  const [cashInput, setCashInput] = useState('');

  // Sliders
  const [signupsGrowth, setSignupsGrowth] = useState(0); // monthly % growth
  const [churnDelta, setChurnDelta] = useState(0); // change in churn (pp)
  const [adSpendMult, setAdSpendMult] = useState(0); // ad spend multiplier

  useEffect(() => {
    let alive = true;
    setLoading(true);
    callRpc<RunwayResponse>('admin_finance_runway', {})
      .then((r) => {
        if (alive) setRunway(r);
      })
      .catch((e: unknown) => {
        if (
          e instanceof RpcError &&
          (e.code === '42883' || e.message.includes('does not exist'))
        ) {
          if (alive) setMigrationPending(true);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const baseMrr = runway?.mrr_aud ?? 0;
  const baseCost = runway?.avg_monthly_cost_aud ?? 0;
  const cash = parseFloat(cashInput) || 0;

  const projection = useMemo(() => {
    const months = 12;
    const data: Array<{
      month: string;
      mrr: number;
      cost: number;
      cash: number;
    }> = [];
    let runningCash = cash;
    const now = new Date();
    for (let t = 1; t <= months; t += 1) {
      const date = new Date(now.getFullYear(), now.getMonth() + t, 1);
      const mrr = baseMrr * Math.pow(1 + signupsGrowth, t) * Math.pow(1 - churnDelta, t);
      const cost = baseCost * (1 + adSpendMult);
      runningCash += mrr - cost;
      data.push({
        month: date.toISOString().slice(0, 7),
        mrr: Math.round(mrr),
        cost: Math.round(cost),
        cash: Math.round(runningCash),
      });
    }
    return data;
  }, [baseMrr, baseCost, signupsGrowth, churnDelta, adSpendMult, cash]);

  const runwayMonths = useMemo(() => {
    if (cash <= 0) return null;
    let runningCash = cash;
    for (let t = 1; t <= 60; t += 1) {
      const mrr = baseMrr * Math.pow(1 + signupsGrowth, t) * Math.pow(1 - churnDelta, t);
      const cost = baseCost * (1 + adSpendMult);
      runningCash += mrr - cost;
      if (runningCash < 0) return t - 1;
    }
    return 60; // 60+ months
  }, [baseMrr, baseCost, signupsGrowth, churnDelta, adSpendMult, cash]);

  const finalMrr = projection.at(-1)?.mrr ?? 0;
  const finalCash = projection.at(-1)?.cash ?? 0;

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
            <SparklesIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Forecast & Runway
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Projeção de 12 meses com sliders de cenário.
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
          <strong>Migration pendente.</strong> Aplique{' '}
          <code className="font-mono">20260503160000_finance_costs.sql</code> em prod
          (cria a RPC <code className="font-mono">admin_finance_runway</code>).
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-navy-400">
          <Spinner size="sm" /> Carregando baseline…
        </div>
      )}

      {!loading && !migrationPending && (
        <>
          {/* Baseline */}
          <Card className="ozly-card">
            <Title className="!text-sm !font-semibold text-navy-700">Baseline (atual)</Title>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Stat label="MRR atual" value={formatCurrencyAUD(baseMrr)} />
              <Stat label="Custo médio/mês (3m)" value={formatCurrencyAUD(baseCost)} />
              <Stat
                label="Burn / Profit"
                value={
                  baseCost - baseMrr >= 0
                    ? formatCurrencyAUD(baseCost - baseMrr)
                    : `+${formatCurrencyAUD(Math.abs(baseCost - baseMrr))}`
                }
                tone={baseCost > baseMrr ? 'warning' : 'lime'}
              />
            </div>
            <div className="mt-3">
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-semibold uppercase tracking-wider text-navy-400">
                  Cash on hand (informe manual — banking integration vem em V2)
                </span>
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  placeholder="ex: 50000"
                  className="w-full max-w-xs rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                />
              </label>
            </div>
          </Card>

          {/* Sliders */}
          <Card className="ozly-card">
            <Title className="!text-sm !font-semibold text-navy-700">Sliders de cenário</Title>
            <div className="mt-4 space-y-5">
              <Slider
                label="Crescimento de MRR (mensal)"
                value={signupsGrowth}
                min={-0.2}
                max={0.5}
                step={0.01}
                format={(v) => `${(v * 100).toFixed(1)}%/mês`}
                onChange={setSignupsGrowth}
              />
              <Slider
                label="Aumento de churn (pp por mês)"
                value={churnDelta}
                min={-0.05}
                max={0.1}
                step={0.005}
                format={(v) => `${(v * 100).toFixed(2)}pp/mês`}
                onChange={setChurnDelta}
              />
              <Slider
                label="Multiplicador de custo total"
                value={adSpendMult}
                min={-0.5}
                max={2}
                step={0.05}
                format={(v) => (v >= 0 ? `+${(v * 100).toFixed(0)}%` : `${(v * 100).toFixed(0)}%`)}
                onChange={setAdSpendMult}
              />
            </div>
          </Card>

          {/* Outcome */}
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiTile label="MRR daqui 12m" value={formatCurrencyAUD(finalMrr)} tone="brand" />
            <KpiTile label="Cash daqui 12m" value={formatCurrencyAUD(finalCash)} tone={finalCash >= 0 ? 'lime' : 'warning'} />
            <KpiTile
              label="Runway"
              value={
                runwayMonths === null
                  ? 'informe cash'
                  : runwayMonths >= 60
                    ? '60+ meses'
                    : `${runwayMonths} meses`
              }
              tone={runwayMonths !== null && runwayMonths < 6 ? 'warning' : 'brand'}
            />
          </div>

          <Card className="ozly-card">
            <Title className="!text-sm !font-semibold text-navy-700">Projeção 12 meses</Title>
            <AreaChart
              data={projection}
              index="month"
              categories={['mrr', 'cost', 'cash']}
              colors={['emerald', 'amber', 'sky']}
              valueFormatter={(v) => formatCurrencyAUD(v)}
              className="mt-3 h-72"
              showLegend
            />
            <div className="mt-2 text-[11px] text-navy-400">
              Modelo simples: MRR cresce/diminui composto · custo total escala pelo multiplicador · cash cumulativo.
              Isso não substitui o forecast do contador — é pra brainstorming de cenários.
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'brand' | 'lime' | 'warning';
}) {
  const toneClass = tone === 'warning' ? 'text-amber-600' : tone === 'lime' ? 'text-lime-600' : 'text-navy-700';
  return (
    <div className="rounded-md border border-navy-50 bg-white p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300">
        {label}
      </div>
      <div className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'brand' | 'lime' | 'warning';
}) {
  const toneClass =
    tone === 'warning'
      ? 'text-amber-600'
      : tone === 'lime'
        ? 'text-lime-600'
        : 'text-brand-600';
  return (
    <div className="ozly-card ozly-card-hero relative px-5 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-medium text-navy-600">{label}</span>
        <span className="font-mono text-xs font-semibold text-brand-600">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-brand-500"
      />
      <div className="flex items-center justify-between text-[10px] text-navy-300">
        <span>{format(min)}</span>
        <button
          type="button"
          onClick={() => onChange(0)}
          className="text-navy-400 hover:text-navy-600"
        >
          reset
        </button>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}
