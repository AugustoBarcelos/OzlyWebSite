import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Card, Title } from '@tremor/react';
import { FunnelIcon, PackageIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { GlobalFilterBar } from '@/components/GlobalFilterBar';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callRpc, RpcError } from '@/lib/rpc';
import { useGlobalFilters } from '@/lib/useGlobalFilters';
import { formatNumber, formatPercent } from '@/lib/format';
import type {
  ActivationFunnelResponse,
  TimeToActivationResponse,
} from '@/routes/dashboard/types';

/**
 * /product/activation — activation funnel.
 *
 * Signup → onboard → trial picked → first session → first job. Plus the
 * time-to-activation distribution. Both fed by existing RPCs.
 */
export function ProductActivationPage() {
  const { periodDays } = useGlobalFilters();
  const [funnel, setFunnel] = useState<ActivationFunnelResponse | null>(null);
  const [tta, setTta] = useState<TimeToActivationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    void Promise.allSettled([
      callRpc<ActivationFunnelResponse>('admin_activation_funnel', {
        p_period_days: periodDays,
      }),
      callRpc<TimeToActivationResponse>('admin_time_to_activation', {}),
    ]).then((results) => {
      if (!alive) return;
      const [r0, r1] = results;
      if (r0.status === 'fulfilled') setFunnel(r0.value);
      else if (r0.reason instanceof RpcError) setError(r0.reason.message);
      if (r1.status === 'fulfilled') setTta(r1.value);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [periodDays]);

  const stages = useMemo(() => {
    if (!funnel) return [];
    return [
      { key: 'signed_up', label: 'Signed up', value: funnel.signed_up, hint: 'Conta criada' },
      { key: 'onboarded', label: 'Onboarded', value: funnel.onboarded, hint: 'Concluiu onboarding' },
      { key: 'trial_picked', label: 'Trial picked', value: funnel.trial_picked, hint: 'Plano de trial escolhido' },
      { key: 'first_session', label: 'First session', value: funnel.first_session, hint: 'Abriu app + navegou' },
      { key: 'first_job', label: 'First job', value: funnel.first_job, hint: 'Cadastrou primeiro trabalho' },
    ];
  }, [funnel]);

  const maxValue = Math.max(0, ...stages.map((s) => s.value ?? 0));

  const ttaChart = useMemo(() => {
    if (!tta) return [];
    return tta.buckets.map((b) => ({ bucket: b.bucket, count: b.count }));
  }, [tta]);

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
            <FunnelIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Activation Funnel
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Signup → onboard → trial picked → first session → first job.
            </p>
          </div>
        </div>
        <Link
          to="/product"
          className="self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700 md:self-end"
        >
          ← Product Hub
        </Link>
      </header>

      <GlobalFilterBar show={['period']} />

      {error && (
        <div className="ozly-card border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      {/* Funnel stages */}
      <Card className="ozly-card">
        <Title className="!text-sm !font-semibold text-navy-700">
          Etapas do funil ({periodDays} dias)
        </Title>
        {loading ? (
          <div className="mt-4 flex items-center gap-2 text-xs text-navy-400">
            <Spinner size="sm" /> Carregando…
          </div>
        ) : !funnel ? (
          <div className="mt-3 text-xs text-navy-300">Sem dados.</div>
        ) : (
          <ol className="mt-4 space-y-2">
            {stages.map((stage, i) => {
              const prev = i > 0 ? stages[i - 1] : null;
              const conv = prev && prev.value > 0 ? stage.value / prev.value : null;
              const widthPct = maxValue > 0 ? Math.max((stage.value / maxValue) * 100, 2) : 0;
              return (
                <li
                  key={stage.key}
                  className="rounded-md border border-navy-50 bg-white p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-navy-300">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-navy-700">
                          {stage.label}
                        </div>
                        <div className="text-[11px] text-navy-400">{stage.hint}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-base font-semibold text-navy-700">
                        {formatNumber(stage.value)}
                      </span>
                      {conv !== null ? (
                        <span className="text-[11px] text-brand-600">
                          {formatPercent(stage.value, prev?.value ?? null)} conv.
                        </span>
                      ) : i > 0 ? (
                        <span className="text-[11px] text-navy-300">conv. n/a</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-navy-50">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${widthPct}%`,
                        background:
                          'linear-gradient(90deg, var(--color-brand-400), var(--color-lime-400))',
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      {/* Time to activation */}
      {tta && tta.buckets.length > 0 && (
        <Card className="ozly-card">
          <Title className="!text-sm !font-semibold text-navy-700">
            Tempo até primeira ativação
          </Title>
          <p className="mt-0.5 text-[11px] text-navy-400">
            Cohort window: {tta.cohort_window_days} dias · Nunca ativaram:{' '}
            <strong>{formatNumber(tta.never_activated)}</strong>
          </p>
          <BarChart
            data={ttaChart}
            index="bucket"
            categories={['count']}
            colors={['emerald']}
            valueFormatter={(v: number) => formatNumber(v)}
            className="mt-3 h-56"
            showLegend={false}
          />
        </Card>
      )}

      <div className="flex items-center justify-end">
        <Link
          to="/product"
          className="flex items-center gap-1 rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:border-brand-200 hover:text-brand-700"
        >
          <PackageIcon className="h-3.5 w-3.5" />
          Voltar pro Product Hub
        </Link>
      </div>

      <RawDataPanel
        page="product-activation"
        sources={[
          { rpc: 'admin_activation_funnel', params: { p_period_days: periodDays }, data: funnel },
          { rpc: 'admin_time_to_activation', params: {}, data: tta },
        ]}
      />
    </div>
  );
}
