import { useEffect, useState } from 'react';
import { Card, Grid, Text, Title } from '@tremor/react';
import { callRpc, RpcError } from '@/lib/rpc';
import { FunnelChart } from '@/components/charts/FunnelChart';
import { HistogramChart } from '@/components/charts/HistogramChart';
import { CohortHeatmap } from '@/components/charts/CohortHeatmap';
import type { GrowthPeriodDays } from '../growth/period';
import { ActivityHeatmap, type HeatmapCell } from './ActivityHeatmap';
import { TopActionsList, type TopAction } from './TopActionsList';
import { FeatureAdoptionList, type FeatureAdoption } from './FeatureAdoptionList';

/**
 * /insights → User Activity tab.
 *
 * Reads from app_events via 7 admin RPCs:
 *  1. admin_activation_funnel(period)        → 5-step funnel
 *  2. admin_event_top_actions(period, 15)    → top events
 *  3. admin_time_to_activation()             → histogram (90d cohort, fixo)
 *  4. admin_event_heatmap(period)            → 7×24 grid
 *  5. admin_feature_adoption(period)         → % active users per feature
 *  6. admin_login_retention()                → 8-week login cohorts (fixo)
 *
 * Período é controlado pelo seletor global (`useGrowthPeriod`). Time-to-activation
 * e retention têm janela própria fixa (90d / 8 semanas) — escala diferente da
 * do filtro de "atividade no período".
 */

interface FunnelResult {
  signed_up: number;
  onboarded: number;
  trial_picked: number;
  first_session: number;
  first_job: number;
}

interface TopActionsResult {
  actions: TopAction[];
}

interface HeatmapResult {
  cells: HeatmapCell[];
  max_count: number;
  total: number;
}

interface FeatureAdoptionResult {
  active_users: number;
  features: FeatureAdoption[];
}

interface TimeToActivationResult {
  cohort_window_days: number;
  buckets: Array<{ bucket: string; count: number }>;
  never_activated: number;
}

interface RetentionCohort {
  cohort: string;
  size: number;
  d1: number | null;
  d7: number | null;
  d14: number | null;
  d30: number | null;
  d60: number | null;
}

interface RetentionResult {
  cohorts: RetentionCohort[];
}

export function UserActivityTab({ period }: { period: GrowthPeriodDays }) {
  const [funnel, setFunnel] = useState<FunnelResult | null>(null);
  const [actions, setActions] = useState<TopAction[] | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapResult | null>(null);
  const [adoption, setAdoption] = useState<FeatureAdoptionResult | null>(null);
  const [tta, setTta] = useState<TimeToActivationResult | null>(null);
  const [retention, setRetention] = useState<RetentionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.allSettled([
      callRpc<FunnelResult>('admin_activation_funnel', { p_period_days: period }),
      callRpc<TopActionsResult>('admin_event_top_actions', { p_period_days: period, p_limit: 15 }),
      callRpc<HeatmapResult>('admin_event_heatmap', { p_period_days: period }),
      callRpc<FeatureAdoptionResult>('admin_feature_adoption', { p_period_days: period }),
      callRpc<TimeToActivationResult>('admin_time_to_activation'),
      callRpc<RetentionResult>('admin_login_retention'),
    ]).then((results) => {
      if (!alive) return;
      const [f, a, h, ad, t, r] = results;
      if (f.status === 'fulfilled') setFunnel(f.value);
      if (a.status === 'fulfilled') setActions(a.value.actions);
      if (h.status === 'fulfilled') setHeatmap(h.value);
      if (ad.status === 'fulfilled') setAdoption(ad.value);
      if (t.status === 'fulfilled') setTta(t.value);
      if (r.status === 'fulfilled') setRetention(r.value);
      // Surface first error.
      const firstErr = results.find((x) => x.status === 'rejected');
      if (firstErr && firstErr.status === 'rejected') {
        const err = firstErr.reason;
        setError(err instanceof RpcError ? err.message : 'Failed to load some metrics');
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [period]);

  const funnelSteps = funnel
    ? [
        { name: 'Signup',          value: funnel.signed_up,    hint: 'novos usuários' },
        { name: 'Onboarding done', value: funnel.onboarded,    hint: 'completaram setup' },
        { name: 'Trial picked',    value: funnel.trial_picked, hint: 'escolheram plano' },
        { name: 'First session',   value: funnel.first_session, hint: 'abriram app outra vez' },
        { name: 'First job',       value: funnel.first_job,    hint: 'ativaram (criaram job)' },
      ]
    : [
        { name: 'Signup',          value: null },
        { name: 'Onboarding done', value: null },
        { name: 'Trial picked',    value: null },
        { name: 'First session',   value: null },
        { name: 'First job',       value: null },
      ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          ⚠️ {error}
        </div>
      )}

      {/* Funnel + Top Actions */}
      <Grid numItemsLg={2} className="gap-4">
        <FunnelChart
          title={`Activation funnel · ${period}d`}
          steps={funnelSteps}
          loading={loading && !funnel}
        />
        <TopActionsList actions={actions} loading={loading && !actions} />
      </Grid>

      {/* Heatmap */}
      <ActivityHeatmap
        cells={heatmap?.cells ?? null}
        maxCount={heatmap?.max_count ?? 0}
        total={heatmap?.total ?? 0}
        loading={loading && !heatmap}
      />

      {/* Feature adoption + Time-to-activation */}
      <Grid numItemsLg={2} className="gap-4">
        <FeatureAdoptionList
          features={adoption?.features ?? null}
          activeUsers={adoption?.active_users ?? 0}
          loading={loading && !adoption}
        />
        <HistogramChart
          title="Time-to-activation"
          subtitle="Tempo do signup ao primeiro job · cohort de 90d (fixo)"
          buckets={tta?.buckets ?? null}
          footnote={tta ? `${tta.never_activated.toLocaleString()} ainda não ativados` : undefined}
          loading={loading && !tta}
        />
      </Grid>

      {/* Login retention */}
      <CohortHeatmap
        title="Retention semanal · login-based"
        cells={['size', 'D1', 'D7', 'D14', 'D30', 'D60']}
        rows={
          retention?.cohorts.map((c) => ({
            cohort: c.cohort,
            size: c.size,
            retention: [c.d1, c.d7, c.d14, c.d30, c.d60],
          })) ?? []
        }
        loading={loading && !retention}
      />

      {/* PostHog deeplink */}
      <Card className="!bg-navy-50/40">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Title className="!text-base !text-navy-700">Quer ir mais fundo?</Title>
            <Text className="mt-1 text-xs text-navy-500">
              Os mesmos eventos são enviados pra PostHog (eu.posthog.com). Lá você
              tem funnels custom, paths, retention, A/B test e feature flags.
            </Text>
          </div>
          <a
            href="https://eu.posthog.com"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
          >
            Abrir PostHog →
          </a>
        </div>
      </Card>
    </div>
  );
}
