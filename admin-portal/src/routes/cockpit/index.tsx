import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, BarList, Card, Title } from '@tremor/react';
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
 *   1. Quem está usando?        (ativos por dia, novos cadastros)
 *   2. O que estão fazendo?     (trabalhos registrados, telas mais usadas)
 *   3. Como está o dinheiro?    (pagantes, receita/mês, cancelamentos)
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
  const churn = data.kpi?.churn_period ?? null;
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

      {/* Semáforo geral */}
      <div
        className={`ozly-card flex items-center gap-4 p-5 ${
          overall === 'red'
            ? 'border-rose-200 bg-rose-50/70'
            : overall === 'yellow'
              ? 'border-amber-200 bg-amber-50/70'
              : 'border-emerald-200 bg-emerald-50/70'
        }`}
      >
        <span
          className={`h-4 w-4 shrink-0 rounded-full ${LIGHT_DOT[loading ? 'grey' : overall]}`}
        />
        <div>
          <div className="text-base font-semibold text-navy-700">
            {overallCopy[loading ? 'grey' : overall].title}
          </div>
          <div className="mt-0.5 text-sm text-navy-500">
            {overallCopy[loading ? 'grey' : overall].sub}
          </div>
        </div>
      </div>

      {/* 1 · Quem está usando? */}
      <SectionCard
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

      {/* 2 · O que estão fazendo? */}
      <SectionCard
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

      {/* 3 · Como está o dinheiro? */}
      <SectionCard
        light={loading ? 'grey' : moneyLight}
        title="Como está o dinheiro?"
        subtitle="Assinaturas e receita"
        linkTo="/revenue"
        linkLabel="Ver receita"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <PlainStat
            value={formatNumber(paidActiveTotal)}
            label="pessoas pagando assinatura hoje"
            loading={loading}
            to="/revenue"
          />
          <PlainStat
            value={mrr === null ? '—' : formatCurrencyAUD(mrr)}
            label="entram por mês se nada mudar"
            loading={loading}
            to="/revenue"
          />
          <PlainStat
            value={formatNumber(cancelPaying)}
            label={
              cancelPaying
                ? `pagante${cancelPaying > 1 ? 's' : ''} pediu cancelamento${mrrAtRisk ? ` — ${formatCurrencyAUD(mrrAtRisk)}/mês em risco` : ''}`
                : 'pagantes pediram cancelamento (ninguém 🎉)'
            }
            loading={loading}
            tone={cancelPaying ? 'warn' : 'ok'}
            to="/inbox"
          />
          <PlainStat
            value={formatNumber(cancelTrial)}
            label={
              cancelTrial
                ? 'no teste grátis e não vão continuar'
                : 'no teste grátis desistiram (ninguém)'
            }
            loading={loading}
            to="/inbox"
          />
          <PlainStat
            value={formatNumber(churn)}
            label={`assinaturas acabaram de vez em ${period} dias`}
            loading={loading}
            tone={(churn ?? 0) > 5 ? 'warn' : undefined}
            to="/revenue"
          />
        </div>
        <p className="mt-3 text-xs text-navy-400">
          "Pediu cancelamento" = pagante que desligou a renovação mas ainda tem
          acesso — dá pra tentar recuperar. Quem está no teste grátis e não
          continua nunca chegou a pagar, então não conta como dinheiro perdido.
        </p>
      </SectionCard>

      {/* 4 · O app está funcionando? */}
      <SectionCard
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
  light,
  title,
  subtitle,
  linkTo,
  linkLabel,
  children,
}: {
  light: Light;
  title: string;
  subtitle: string;
  linkTo: string;
  linkLabel: string;
  children: ReactNode;
}) {
  return (
    <Card className="ozly-card">
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
