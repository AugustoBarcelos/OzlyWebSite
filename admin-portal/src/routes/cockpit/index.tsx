import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, BarList, Card, Title } from '@tremor/react';
import { callRpc } from '@/lib/rpc';
import { GlobalFilterBar } from '@/components/GlobalFilterBar';
import { HubPlaceholder } from '@/components/HubPlaceholder';
import { PendingPayoutsAlert } from '@/components/PendingPayoutsAlert';
import { RawDataPanel } from '@/components/RawDataPanel';
import {
  AlertTriangleIcon,
  ArrowUpRightIcon,
  DollarSignIcon,
  HomeIcon,
  InboxIcon,
  TrendingUpIcon,
  UsersIcon,
} from '@/components/Icons';
import { formatCurrencyAUD, formatNumber } from '@/lib/format';
import { useGlobalFilters } from '@/lib/useGlobalFilters';
import { useDashboardData } from '@/routes/dashboard/useDashboardData';
import type { PendingCancellationRow, Period } from '@/routes/dashboard/types';

/**
 * Cockpit — "como está o app?" em 30 segundos, em linguagem de gente.
 *
 * O trabalho desta tela: responder a saúde do app SEM jargão. Quatro perguntas:
 *   1. Como está o dinheiro?    (pagantes, receita/mês, cancelamentos)
 *   2. Quem está usando?        (ativos por dia, novos cadastros)
 *   3. O que estão fazendo?     (trabalhos registrados, telas mais usadas)
 *   4. O app está funcionando?  (erros vs período anterior)
 *
 * Cada bloco tem um semáforo 🟢🟡🔴 e uma frase explicando o número.
 * Métricas de marketing/aquisição (CAC, GA4, funil) moram no Growth Hub —
 * aqui só entra o que o fundador precisa olhar todo dia.
 */

type Light = 'green' | 'yellow' | 'red' | 'grey';

const LIGHT_DOT: Record<Light, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
  red: 'bg-rose-500',
  grey: 'bg-navy-200',
};

const LIGHT_LABEL: Record<Light, string> = {
  green: 'Tudo certo',
  yellow: 'Atenção',
  red: 'Precisa de ação',
  grey: 'Sem dados',
};

/** Pior status ganha (red > yellow > green > grey). */
function worst(lights: Light[]): Light {
  if (lights.includes('red')) return 'red';
  if (lights.includes('yellow')) return 'yellow';
  if (lights.includes('green')) return 'green';
  return 'grey';
}

/** Tendência simples: média da 2ª metade da série vs a 1ª. */
function trend(series: Array<{ count: number }> | undefined): number | null {
  if (!series || series.length < 4) return null;
  const half = Math.floor(series.length / 2);
  const avg = (s: Array<{ count: number }>) =>
    s.reduce((a, p) => a + p.count, 0) / s.length;
  const first = avg(series.slice(0, half));
  const second = avg(series.slice(half));
  if (first === 0) return null;
  return (second - first) / first;
}

/** Nomes amigáveis pras telas do app (feature usage / screen_view). */
const SCREEN_PT: Record<string, string> = {
  dashboard: 'Painel inicial',
  home: 'Painel inicial',
  invoices: 'Notas (invoices)',
  invoice_create: 'Criar nota',
  financial: 'Financeiro',
  jobs: 'Trabalhos',
  job_create: 'Registrar trabalho',
  contractors: 'Contratantes',
  settings: 'Ajustes',
  profile: 'Perfil',
  reports: 'Relatórios',
  paywall: 'Tela de assinatura',
  onboarding: 'Primeiros passos',
  login: 'Login',
};

function screenLabel(screen: string): string {
  const key = screen.toLowerCase().replace(/screen$/i, '').replace(/[-\s]/g, '_');
  return (
    SCREEN_PT[key] ??
    screen.replace(/[_-]/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
  );
}

export function CockpitPage() {
  const { periodDays } = useGlobalFilters();
  const period = periodDays as Period;
  const { data, loading, error, refetch } = useDashboardData(period);

  // ── Centro de Comando — fetches extra (não estão no useDashboardData) ───────
  const [atRisk, setAtRisk] = useState<Array<{ segment: string; count: number }> | null>(null);
  const [sources, setSources] = useState<Array<{ source: string; signups: number }> | null>(null);
  useEffect(() => {
    let alive = true;
    callRpc<{ segments: Array<{ segment: string; count: number }> }>('admin_at_risk_board', {
      p_limit_per_segment: 1,
      p_period_days: period,
    })
      .then((r) => alive && setAtRisk(r.segments.map((s) => ({ segment: s.segment, count: s.count }))))
      .catch(() => alive && setAtRisk([]));
    callRpc<{ top_sources?: Array<{ source: string; signups: number }> }>('admin_acquisition_overview', {
      p_period_days: period,
      p_channel: null,
    })
      .then((r) => alive && setSources(r.top_sources ?? []))
      .catch(() => alive && setSources([]));
    return () => {
      alive = false;
    };
  }, [period]);
  const riskBy = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of atRisk ?? []) m[s.segment] = s.count;
    return m;
  }, [atRisk]);
  // 3 grupos mutuamente exclusivos — cada estágio em UM só, pra não inflar:
  //  A) Em risco de perder (AINDA salvável — MRR real em risco)
  //  B) Já perdemos (período/trial acabou — reativação, NÃO risco)
  //  C) Conversão (free que nunca pagou — oportunidade)
  const riskChurn = atRisk
    ? (riskBy['paying_at_risk'] ?? 0) + (riskBy['cancel_winback'] ?? 0)
    : null;
  const lostReactivate = atRisk
    ? (riskBy['churned'] ?? 0) + (riskBy['trial_expired'] ?? 0)
    : null;
  const riskConv = atRisk
    ? (riskBy['activated_no_convert'] ?? 0) + (riskBy['trial_idle'] ?? 0)
    : null;
  const latestCohort = useMemo(() => {
    const cs = data.cohort?.cohorts ?? [];
    for (let i = cs.length - 1; i >= 0; i--) {
      const c = cs[i];
      if (c && c.d7 !== null) return c;
    }
    return cs.length ? cs[cs.length - 1] ?? null : null;
  }, [data.cohort]);
  const signupsPeriod = data.kpi?.signups_period ?? null;
  const activationPct =
    data.kpi && signupsPeriod && signupsPeriod > 0
      ? (data.kpi.activations_period ?? 0) / signupsPeriod
      : null;

  // ── Pessoas usando ─────────────────────────────────────────────────────────
  const activeSeries = data.activeUsers?.series ?? [];
  const activeToday = activeSeries.length
    ? activeSeries[activeSeries.length - 1]?.count ?? null
    : null;
  const activeAvg = activeSeries.length
    ? Math.round(activeSeries.reduce((a, p) => a + p.count, 0) / activeSeries.length)
    : null;
  const activeTrend = trend(activeSeries);
  const peopleLight: Light =
    activeAvg === null
      ? 'grey'
      : activeTrend !== null && activeTrend < -0.3
        ? 'red'
        : activeTrend !== null && activeTrend < -0.1
          ? 'yellow'
          : 'green';

  // ── O que estão fazendo ────────────────────────────────────────────────────
  const jobsTotal = data.jobsTimeseries?.series.reduce((a, p) => a + p.count, 0) ?? null;
  const jobsTrend = trend(data.jobsTimeseries?.series);
  const usageRows = useMemo(
    () =>
      (data.featureUsage?.rows ?? []).slice(0, 5).map((r) => ({
        name: screenLabel(r.screen),
        value: r.views,
      })),
    [data.featureUsage],
  );
  const doingLight: Light =
    jobsTotal === null
      ? 'grey'
      : jobsTrend !== null && jobsTrend < -0.3
        ? 'red'
        : jobsTrend !== null && jobsTrend < -0.1
          ? 'yellow'
          : 'green';

  // ── Dinheiro ───────────────────────────────────────────────────────────────
  const paidActiveTotal = useMemo(() => {
    const p = data.kpi?.paid_active;
    if (!p) return null;
    return (p.tfn ?? 0) + (p.abn ?? 0) + (p.pro ?? 0);
  }, [data.kpi]);
  const mrr = data.kpi?.mrr_estimate_aud ?? data.revenue?.mrr_total ?? null;
  // Trials em andamento AGORA (não é receita, mas é o pipeline que vira pagante).
  const trialsActive = data.kpi?.trials_active ?? null;
  const churn = data.kpi?.churn_period ?? null;
  // Churn como taxa (% da base de pagantes do período).
  const churnBase = (paidActiveTotal ?? 0) + (churn ?? 0);
  const churnRate = churn !== null && churnBase > 0 ? churn / churnBase : null;
  // Conversão trial→pago (o RPC já devolve em pontos percentuais).
  const convTrialPaid = data.revenue?.conversion_trial_to_paid_period ?? null;
  const pctTrialPaid = convTrialPaid === null ? '—' : `${convTrialPaid.toFixed(0)}%`;
  const pc = data.pendingCancellations;
  const mrrAtRisk = pc?.potential_mrr_loss_aud ?? null;
  // Trial que não vai converter ≠ pagante que pediu cancelamento — situações
  // diferentes, ações diferentes. O RPC novo manda count_paying/count_trial;
  // antes da migração 20260619 inferimos pelas rows (trial = sem preço mensal
  // e não-promocional — trials nunca têm monthly_price_aud).
  const isTrialRow = (r: PendingCancellationRow) =>
    r.status != null
      ? r.status === 'trial'
      : r.monthly_price_aud === null && r.store !== 'promotional';
  const cancelPaying = pc
    ? pc.count_paying ?? pc.rows.filter((r) => !isTrialRow(r)).length
    : null;
  const cancelTrial = pc
    ? pc.count_trial ?? pc.rows.filter(isTrialRow).length
    : null;
  // Mesmos thresholds do inbox/alerts.tsx: churn > 5 amarelo, > 10 vermelho.
  // Trial que não converte NÃO acende o semáforo — é normal, não é dinheiro saindo.
  const moneyLight: Light =
    paidActiveTotal === null
      ? 'grey'
      : (churn ?? 0) > 10
        ? 'red'
        : (churn ?? 0) > 5 || (cancelPaying ?? 0) > 0
          ? 'yellow'
          : 'green';

  // ── Funcionamento (erros) ──────────────────────────────────────────────────
  const errNow = data.errorRate?.current ?? null;
  const errBefore = data.errorRate?.previous ?? null;
  const techLight: Light =
    errNow === null
      ? 'grey'
      : errNow === 0
        ? 'green'
        : errBefore !== null && errBefore > 0 && errNow > errBefore * 2
          ? 'red'
          : errBefore !== null && errNow > errBefore
            ? 'yellow'
            : 'green';

  const overall = worst([peopleLight, doingLight, moneyLight, techLight]);
  const overallCopy: Record<Light, { title: string; sub: string }> = {
    green: {
      title: 'Tudo certo com o app 👍',
      sub: 'Pessoas usando, dinheiro entrando, sem erros fora do normal.',
    },
    yellow: {
      title: 'Atenção em alguns pontos',
      sub: 'Nada quebrado, mas tem número piorando — veja os blocos amarelos abaixo.',
    },
    red: {
      title: 'Tem coisa precisando de ação',
      sub: 'Algum número está bem fora do normal — veja os blocos vermelhos abaixo.',
    },
    grey: {
      title: 'Carregando os dados…',
      sub: 'Aguarde um instante ou toque em Atualizar.',
    },
  };

  const activeChart = activeSeries.map((p) => ({ date: p.date, Ativos: p.count }));

  // Banner geral → leva direto pro primeiro bloco com problema (ordem do DOM).
  const sectionLights: Array<{ id: string; light: Light }> = [
    { id: 'sec-money', light: moneyLight },
    { id: 'sec-people', light: peopleLight },
    { id: 'sec-doing', light: doingLight },
    { id: 'sec-tech', light: techLight },
  ];
  const scrollToWorst = () => {
    const target =
      sectionLights.find((s) => s.light === 'red') ??
      sectionLights.find((s) => s.light === 'yellow');
    if (target) {
      document
        .getElementById(target.id)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  const overallClickable = !loading && (overall === 'yellow' || overall === 'red');

  // "em 1 dias" não existe — período de 24h vira "no último dia".
  const periodLabel = period === 1 ? 'no último dia' : `nos últimos ${period} dias`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
            style={{
              background:
                'linear-gradient(135deg, var(--color-brand-500), var(--color-lime-400))',
            }}
          >
            <HomeIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Cockpit
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Como está o app — em 30 segundos, sem jargão.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={loading}
          className="self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700 disabled:opacity-50 md:self-end"
        >
          {loading ? 'Atualizando…' : 'Atualizar'}
        </button>
      </header>

      <GlobalFilterBar show={['period']} />

      <PendingPayoutsAlert />

      {error && (
        <div className="ozly-card border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Erro ao carregar:</strong> {error}
        </div>
      )}

      {/* Semáforo geral — amarelo/vermelho é clicável e rola até o bloco com problema */}
      <button
        type="button"
        onClick={overallClickable ? scrollToWorst : undefined}
        disabled={!overallClickable}
        className={`ozly-card flex w-full items-center gap-4 p-5 text-left ${
          overall === 'red'
            ? 'border-rose-200 bg-rose-50/70'
            : overall === 'yellow'
              ? 'border-amber-200 bg-amber-50/70'
              : 'border-emerald-200 bg-emerald-50/70'
        } ${overallClickable ? 'cursor-pointer transition-shadow hover:shadow-md' : 'cursor-default'}`}
      >
        <span
          className={`h-4 w-4 shrink-0 rounded-full ${LIGHT_DOT[loading ? 'grey' : overall]}`}
        />
        <div className="flex-1">
          <div className="text-base font-semibold text-navy-700">
            {overallCopy[loading ? 'grey' : overall].title}
          </div>
          <div className="mt-0.5 text-sm text-navy-500">
            {overallCopy[loading ? 'grey' : overall].sub}
          </div>
        </div>
        {overallClickable && (
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-navy-500">
            Me leva lá <ArrowUpRightIcon className="h-3.5 w-3.5 rotate-90" />
          </span>
        )}
      </button>

      {/* ═══ CENTRO DE COMANDO — grade 360, tudo num scan ═══ */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <Title className="!text-base !font-semibold text-navy-700">Centro de Comando</Title>
          <span className="text-[11px] text-navy-400">{periodLabel}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Crescimento */}
          <CommandCard title="Crescimento" to="/product/activation" tone="brand">
            <CmdStat label="Signups" value={signupsPeriod === null ? '—' : formatNumber(signupsPeriod)} />
            <CmdStat
              label="Ativação"
              value={activationPct === null ? '—' : `${(activationPct * 100).toFixed(0)}%`}
              hint="emitiu 1ª invoice"
            />
          </CommandCard>

          {/* Dinheiro */}
          <CommandCard title="Dinheiro" to="/revenue" tone="emerald">
            <CmdStat label="MRR" value={mrr === null ? '—' : formatCurrencyAUD(mrr)} />
            <CmdStat label="Pagantes" value={paidActiveTotal === null ? '—' : formatNumber(paidActiveTotal)} />
            <CmdStat
              label="Trials ativos"
              value={trialsActive === null ? '—' : formatNumber(trialsActive)}
              hint="em teste agora — pipeline"
            />
            <CmdStat
              label="Churn"
              value={churnRate === null ? '—' : `${(churnRate * 100).toFixed(0)}%`}
              hint={churn === null ? '' : `${churn} de ${churnBase} saíram`}
            />
            <CmdStat label="Conversão trial→pago" value={pctTrialPaid} hint="do funil de trial" />
          </CommandCard>

          {/* A · Em risco de perder — AINDA salvável (MRR real em risco) */}
          <CommandCard title="Em risco de perder" to="/product/at-risk" tone="rose" cta="Salvar">
            <CmdStat
              label="Pagantes salváveis"
              value={riskChurn === null ? '—' : formatNumber(riskChurn)}
              hint="ainda paga ou tem acesso — dá pra reverter"
            />
            <div className="mt-1 space-y-0.5 text-[11px] text-navy-500">
              <div>Pagante em risco: <b>{riskBy['paying_at_risk'] ?? 0}</b></div>
              <div>Cancelando (resgatável): <b>{riskBy['cancel_winback'] ?? 0}</b></div>
            </div>
          </CommandCard>

          {/* B · Já perdemos — período/trial acabou (reativação, NÃO risco) */}
          <CommandCard title="Já perdemos" to="/product/at-risk" tone="slate" cta="Reativar">
            <CmdStat
              label="Pra reativar"
              value={lostReactivate === null ? '—' : formatNumber(lostReactivate)}
              hint="já saíram — campanha de reativação, não é risco"
            />
            <div className="mt-1 space-y-0.5 text-[11px] text-navy-500">
              <div>Pagante que saiu: <b>{riskBy['churned'] ?? 0}</b></div>
              <div>Trial expirou: <b>{riskBy['trial_expired'] ?? 0}</b></div>
            </div>
          </CommandCard>

          {/* C · Conversão — free que nunca pagou (oportunidade) */}
          <CommandCard title="Conversão (free)" to="/product/at-risk" tone="teal" cta="Converter">
            <CmdStat
              label="Nunca pagaram"
              value={riskConv === null ? '—' : formatNumber(riskConv)}
              hint="oportunidade — ainda no funil"
            />
            <div className="mt-1 space-y-0.5 text-[11px] text-navy-500">
              <div>Ativou s/ converter: <b>{riskBy['activated_no_convert'] ?? 0}</b></div>
              <div>Trial parado: <b>{riskBy['trial_idle'] ?? 0}</b></div>
            </div>
          </CommandCard>

          {/* Funil */}
          <CommandCard title="Funil" to="/product/activation" tone="brand">
            {data.funnel ? (
              <div className="space-y-0.5 text-[11px] text-navy-500">
                <div>Signups: <b>{formatNumber(data.funnel.signups)}</b></div>
                <div>Ativações: <b>{formatNumber(data.funnel.activations)}</b></div>
                <div>Trials: <b>{formatNumber(data.funnel.trials)}</b></div>
                <div>Pagantes: <b>{formatNumber(data.funnel.paid)}</b></div>
              </div>
            ) : (
              <div className="text-xs text-navy-300">—</div>
            )}
          </CommandCard>

          {/* De onde vêm */}
          <CommandCard title="De onde vêm" to="/growth/funnel" tone="violet">
            {sources === null ? (
              <div className="text-xs text-navy-300">Carregando…</div>
            ) : sources.length === 0 ? (
              <div className="text-xs text-navy-300">Sem dados de fonte (UTM)</div>
            ) : (
              <BarList
                data={sources.slice(0, 4).map((s) => ({ name: s.source, value: s.signups }))}
                className="mt-1"
              />
            )}
          </CommandCard>

          {/* Retenção */}
          <CommandCard title="Retenção" to="/product/retention" tone="amber">
            {latestCohort ? (
              <div className="space-y-0.5 text-[11px] text-navy-500">
                <div className="text-navy-400">cohort {latestCohort.cohort} · {latestCohort.size} users</div>
                <div>D1: <b>{pctOrDash(latestCohort.d1)}</b></div>
                <div>D7: <b>{pctOrDash(latestCohort.d7)}</b></div>
                <div>D30: <b>{pctOrDash(latestCohort.d30)}</b></div>
              </div>
            ) : (
              <div className="text-xs text-navy-300">—</div>
            )}
          </CommandCard>
        </div>
      </section>

      {/* 1 · Como está o dinheiro? — uma história em dois lados: o que entra
          (MRR + assinantes, um número só) e o que está saindo ou em risco
          (lista com contexto, em vez de 5 cards iguais competindo). */}
      <SectionCard
        id="sec-money"
        light={loading ? 'grey' : moneyLight}
        title="Como está o dinheiro?"
        subtitle="Assinaturas e receita"
        linkTo="/revenue"
        linkLabel="Ver receita"
      >
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Entrando */}
          <Link
            to="/revenue"
            className="group relative flex flex-col justify-center rounded-md border border-emerald-100 bg-emerald-50/50 p-4 transition-all hover:border-emerald-300 hover:shadow-sm lg:col-span-2"
          >
            <ArrowUpRightIcon className="absolute right-2 top-2 h-3.5 w-3.5 text-emerald-200 transition-colors group-hover:text-emerald-600" />
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Entrando todo mês
            </div>
            {loading ? (
              <div className="mt-2 h-9 w-28 animate-pulse rounded bg-emerald-100/60" />
            ) : (
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold tabular-nums text-navy-700">
                  {mrr === null ? '—' : formatCurrencyAUD(mrr)}
                </span>
                <span className="text-sm font-medium text-navy-400">/mês</span>
              </div>
            )}
            <div className="mt-1.5 text-sm text-navy-500">
              {paidActiveTotal === null
                ? 'receita recorrente das assinaturas'
                : paidActiveTotal === 1
                  ? 'vindo de 1 assinante pagando hoje'
                  : `vindo de ${formatNumber(paidActiveTotal)} assinantes pagando hoje`}
            </div>
            {!loading && trialsActive !== null && trialsActive > 0 && (
              <div className="mt-0.5 text-xs text-navy-400">
                + {formatNumber(trialsActive)} em trial ativo{' '}
                <span className="text-navy-300">(ainda não paga)</span>
              </div>
            )}
          </Link>

          {/* Saindo ou em risco */}
          <div className="rounded-md border border-navy-50 bg-white p-4 lg:col-span-3">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-navy-300">
              Saindo ou em risco
            </div>
            <div className="divide-y divide-navy-50">
              <FlowRow
                loading={loading}
                tone={cancelPaying ? 'warn' : 'ok'}
                text={
                  cancelPaying
                    ? `${cancelPaying} pagante${cancelPaying > 1 ? 's' : ''} pediu cancelamento${mrrAtRisk ? ` — ${formatCurrencyAUD(mrrAtRisk)}/mês em risco` : ''}`
                    : 'Ninguém pediu cancelamento 🎉'
                }
                sub={
                  cancelPaying
                    ? 'ainda tem acesso — dá pra tentar recuperar'
                    : undefined
                }
                to="/inbox"
                linkLabel={cancelPaying ? 'Recuperar' : 'Inbox'}
              />
              <FlowRow
                loading={loading}
                tone={undefined}
                text={
                  cancelTrial
                    ? `${cancelTrial} no teste grátis não ${cancelTrial > 1 ? 'vão' : 'vai'} continuar`
                    : 'Ninguém desistiu no teste grátis'
                }
                sub={
                  cancelTrial
                    ? 'nunca pagou — não é dinheiro saindo'
                    : undefined
                }
                to="/inbox"
                linkLabel="Ver quem"
              />
              <FlowRow
                loading={loading}
                tone={(churn ?? 0) > 5 ? 'warn' : (churn ?? 0) === 0 ? 'ok' : undefined}
                text={
                  churn
                    ? `${churn} assinatura${churn > 1 ? 's' : ''} terminou de vez ${periodLabel}`
                    : `Nenhuma assinatura terminou ${periodLabel}`
                }
                to="/revenue"
                linkLabel="Ver receita"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 2 · Quem está usando? */}
      <SectionCard
        id="sec-people"
        light={loading ? 'grey' : peopleLight}
        title="Quem está usando?"
        subtitle="Pessoas que abriram o app"
        linkTo="/users"
        linkLabel="Ver usuários"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <PlainStat
            value={formatNumber(activeToday)}
            label="abriram o app no último dia"
            loading={loading}
            to="/users"
          />
          <PlainStat
            value={formatNumber(activeAvg)}
            label={`usam por dia, em média (${period}d)`}
            loading={loading}
            {...trendNote(activeTrend)}
            to="/product/engagement"
          />
          <PlainStat
            value={formatNumber(data.kpi?.signups_period ?? null)}
            label={`novos cadastros em ${period} dias`}
            loading={loading}
            to="/users"
          />
        </div>
        {activeChart.length > 1 && (
          <AreaChart
            data={activeChart}
            categories={['Ativos']}
            index="date"
            colors={['emerald']}
            showLegend={false}
            valueFormatter={formatNumber}
            className="mt-4 h-40"
          />
        )}
      </SectionCard>

      {/* 3 · O que estão fazendo? */}
      <SectionCard
        id="sec-doing"
        light={loading ? 'grey' : doingLight}
        title="O que estão fazendo?"
        subtitle="Atividade dentro do app"
        linkTo="/dashboard"
        linkLabel="Ver detalhe"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid content-start gap-3 sm:grid-cols-2">
            <PlainStat
              value={formatNumber(jobsTotal)}
              label={`trabalhos registrados em ${period} dias`}
              loading={loading}
              {...trendNote(jobsTrend)}
              to="/product/engagement"
            />
            <PlainStat
              value={formatNumber(data.kpi?.activations_period ?? null)}
              label="novatos que já registraram trabalho nas primeiras 48h"
              loading={loading}
              to="/product/activation"
            />
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy-300">
              Telas mais usadas
            </div>
            {usageRows.length > 0 ? (
              <BarList data={usageRows} color="emerald" valueFormatter={formatNumber} />
            ) : (
              <div className="text-xs text-navy-300">
                {loading ? 'Carregando…' : 'Sem dados de uso no período.'}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* 4 · O app está funcionando? */}
      <SectionCard
        id="sec-tech"
        light={loading ? 'grey' : techLight}
        title="O app está funcionando?"
        subtitle="Erros que os usuários encontraram"
        linkTo="/tech/errors"
        linkLabel="Ver erros (e quem foi afetado)"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <PlainStat
            value={formatNumber(errNow)}
            label={`erros nos últimos ${Math.min(period, 90)} dias`}
            loading={loading}
            tone={techLight === 'red' ? 'warn' : techLight === 'green' ? 'ok' : undefined}
            to="/tech/errors"
          />
          <PlainStat
            value={formatNumber(errBefore)}
            label="erros no período anterior (comparação)"
            loading={loading}
            to="/tech/errors"
          />
          <PlainStat
            value={
              errNow === null || errBefore === null
                ? '—'
                : errNow === errBefore
                  ? 'igual'
                  : errNow > errBefore
                    ? `+${formatNumber(errNow - errBefore)}`
                    : `−${formatNumber(errBefore - errNow)}`
            }
            label={
              errNow !== null && errBefore !== null && errNow > errBefore
                ? 'a mais que antes — vale olhar'
                : 'diferença vs período anterior'
            }
            loading={loading}
            tone={
              errNow !== null && errBefore !== null
                ? errNow > errBefore
                  ? 'warn'
                  : 'ok'
                : undefined
            }
            to="/tech/errors"
          />
        </div>
      </SectionCard>

      {/* Atalhos */}
      <HubPlaceholder
        title="Onde agir"
        subtitle="Atalhos pros lugares onde você resolve as coisas."
        links={[
          {
            label: 'Inbox',
            to: '/inbox',
            description: 'Alertas, cancelamentos, refunds — o que pede ação.',
            icon: InboxIcon,
          },
          {
            label: 'Usuários',
            to: '/users',
            description: 'Buscar uma pessoa e ver tudo sobre ela.',
            icon: UsersIcon,
          },
          {
            label: 'Receita',
            to: '/revenue',
            description: 'Assinaturas, planos e cancelamentos em detalhe.',
            icon: DollarSignIcon,
          },
          {
            label: 'Erros',
            to: '/tech/errors',
            description: 'O que quebrou, pra quem, em qual aparelho.',
            icon: AlertTriangleIcon,
          },
          {
            label: 'Growth / Marketing',
            to: '/growth',
            description: 'CAC, canais, funil, tráfego do site — o lado investidor.',
            icon: TrendingUpIcon,
          },
        ]}
      />

      {/* Engineer mode raw data — only visible when toggled on */}
      <RawDataPanel
        page="cockpit"
        sources={[
          { rpc: 'admin_kpi_dashboard', params: { p_period_days: period }, data: data.kpi },
          { rpc: 'admin_revenue_summary', params: { p_period_days: period }, data: data.revenue },
          {
            rpc: 'admin_active_users_timeseries',
            params: { p_period_days: Math.min(period, 90) },
            data: data.activeUsers,
          },
          {
            rpc: 'admin_jobs_timeseries',
            params: { p_period_days: period },
            data: data.jobsTimeseries,
          },
          {
            rpc: 'admin_feature_usage_top',
            params: { p_period_days: Math.min(period, 90), p_limit: 12 },
            data: data.featureUsage,
          },
          {
            rpc: 'admin_app_error_rate',
            params: { p_period_days: Math.min(period, 90) },
            data: data.errorRate,
          },
          {
            rpc: 'admin_pending_cancellations',
            params: { p_window_days: 30 },
            data: data.pendingCancellations,
          },
        ]}
      />
    </div>
  );
}

/** Frase de tendência pro PlainStat (sobe/desce vs metade anterior do período). */
function trendNote(t: number | null): { note?: string; tone?: 'ok' | 'warn' } {
  if (t === null || !Number.isFinite(t) || Math.abs(t) < 0.05) return {};
  const pct = Math.round(Math.abs(t) * 100);
  return t > 0
    ? { note: `↑ subindo ${pct}%`, tone: 'ok' }
    : { note: `↓ caindo ${pct}%`, tone: 'warn' };
}

function SectionCard({
  id,
  light,
  title,
  subtitle,
  linkTo,
  linkLabel,
  children,
}: {
  /** Âncora pro scroll do banner geral ("Me leva lá"). */
  id?: string | undefined;
  light: Light;
  title: string;
  subtitle: string;
  linkTo: string;
  linkLabel: string;
  children: ReactNode;
}) {
  return (
    <Card id={id} className="ozly-card scroll-mt-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`h-3 w-3 shrink-0 rounded-full ${LIGHT_DOT[light]}`} />
          <div>
            <Title className="!text-base !font-semibold text-navy-700">{title}</Title>
            <div className="text-xs text-navy-400">
              {subtitle} · <span className="font-medium">{LIGHT_LABEL[light]}</span>
            </div>
          </div>
        </div>
        <Link
          to={linkTo}
          className="flex items-center gap-1 self-start text-xs font-medium text-brand-600 hover:text-brand-700 sm:self-auto"
        >
          {linkLabel} <ArrowUpRightIcon className="h-3 w-3" />
        </Link>
      </div>
      {children}
    </Card>
  );
}

/**
 * Linha do bloco "Saindo ou em risco" — um fato por linha, com a explicação
 * embutida (sub) em vez de uma nota de rodapé longa, e a ação à direita.
 */
function FlowRow({
  loading,
  tone,
  text,
  sub,
  to,
  linkLabel,
}: {
  loading: boolean;
  tone?: 'ok' | 'warn' | undefined;
  text: string;
  sub?: string | undefined;
  to: string;
  linkLabel: string;
}) {
  if (loading) {
    return (
      <div className="py-2.5 first:pt-0 last:pb-0">
        <div className="h-5 w-2/3 animate-pulse rounded bg-navy-50" />
      </div>
    );
  }
  const dot =
    tone === 'warn' ? 'bg-amber-400' : tone === 'ok' ? 'bg-emerald-500' : 'bg-navy-200';
  return (
    <Link
      to={to}
      className="group flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
    >
      <div className="flex items-start gap-2.5">
        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
        <div>
          <div
            className={`text-sm font-medium ${tone === 'warn' ? 'text-rose-700' : 'text-navy-600'}`}
          >
            {text}
          </div>
          {sub && <div className="text-xs text-navy-400">{sub}</div>}
        </div>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand-600 opacity-0 transition-opacity group-hover:opacity-100">
        {linkLabel} <ArrowUpRightIcon className="h-3 w-3" />
      </span>
    </Link>
  );
}

function PlainStat({
  value,
  label,
  loading,
  note,
  tone,
  to,
}: {
  value: string;
  label: string;
  loading: boolean;
  note?: string | undefined;
  tone?: 'ok' | 'warn' | undefined;
  /** Todo card abre o detalhe ao clicar — sempre passe o destino. */
  to?: string | undefined;
}) {
  const inner = (
    <>
      {loading ? (
        <div className="h-8 w-20 animate-pulse rounded bg-navy-50" />
      ) : (
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-navy-700">{value}</span>
          {note && (
            <span
              className={`text-[11px] font-medium ${tone === 'warn' ? 'text-rose-600' : 'text-emerald-600'}`}
            >
              {note}
            </span>
          )}
        </div>
      )}
      <div
        className={`mt-1 text-xs ${!note && tone === 'warn' ? 'text-rose-600' : !note && tone === 'ok' ? 'text-emerald-700' : 'text-navy-400'}`}
      >
        {label}
      </div>
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="group relative block rounded-md border border-navy-50 bg-white p-3 transition-all hover:border-brand-200 hover:shadow-sm"
      >
        <ArrowUpRightIcon className="absolute right-2 top-2 h-3.5 w-3.5 text-navy-100 transition-colors group-hover:text-brand-500" />
        {inner}
      </Link>
    );
  }
  return <div className="rounded-md border border-navy-50 bg-white p-3">{inner}</div>;
}

// ── Centro de Comando helpers ────────────────────────────────────────────────
function pctOrDash(v: number | null): string {
  return v === null ? '—' : `${(v * 100).toFixed(0)}%`;
}

const CMD_TONE: Record<string, string> = {
  brand: 'hover:border-brand-200',
  emerald: 'hover:border-emerald-200',
  rose: 'hover:border-rose-200',
  violet: 'hover:border-violet-200',
  amber: 'hover:border-amber-200',
  teal: 'hover:border-teal-200',
  slate: 'hover:border-navy-200',
};

function CommandCard({
  title,
  to,
  tone,
  cta,
  children,
}: {
  title: string;
  to: string;
  tone: keyof typeof CMD_TONE;
  cta?: string;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`group relative block rounded-lg border border-navy-50 bg-white p-4 transition-all hover:shadow-sm ${CMD_TONE[tone]}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-navy-400">{title}</span>
        <span className="flex items-center gap-1 text-[11px] font-medium text-navy-300 group-hover:text-brand-600">
          {cta ?? 'Ver'} <ArrowUpRightIcon className="h-3 w-3" />
        </span>
      </div>
      {children}
    </Link>
  );
}

function CmdStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="mb-1.5 last:mb-0">
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums text-navy-700">{value}</span>
        <span className="text-[11px] text-navy-400">{label}</span>
      </div>
      {hint && <div className="text-[10px] text-navy-300">{hint}</div>}
    </div>
  );
}
