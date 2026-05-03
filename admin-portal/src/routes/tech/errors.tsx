import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import { AlertTriangleIcon, ServerIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { GlobalFilterBar } from '@/components/GlobalFilterBar';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callRpc, RpcError } from '@/lib/rpc';
import { useGlobalFilters } from '@/lib/useGlobalFilters';
import { formatNumber, formatRelativeTime } from '@/lib/format';
import type { ErrorRateResponse, TopErrorsResponse } from '@/routes/dashboard/types';

/**
 * /tech/errors — top app errors + error rate trend.
 *
 * Shows: error rate (current vs previous period), top 20 most frequent
 * error messages with users impacted + last seen.
 */
export function TechErrorsPage() {
  const { periodDays } = useGlobalFilters();
  const period = Math.min(periodDays, 90);
  const [topErrors, setTopErrors] = useState<TopErrorsResponse | null>(null);
  const [errorRate, setErrorRate] = useState<ErrorRateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    void Promise.allSettled([
      callRpc<TopErrorsResponse>('admin_top_errors', { p_period_days: period, p_limit: 20 }),
      callRpc<ErrorRateResponse>('admin_app_error_rate', { p_period_days: period }),
    ]).then((results) => {
      if (!alive) return;
      const [r0, r1] = results;
      if (r0.status === 'fulfilled') setTopErrors(r0.value);
      else if (r0.reason instanceof RpcError) setError(r0.reason.message);
      if (r1.status === 'fulfilled') setErrorRate(r1.value);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [period]);

  const rateDelta = useMemo(() => {
    if (!errorRate) return null;
    if (errorRate.previous === 0) return null;
    return ((errorRate.current - errorRate.previous) / errorRate.previous) * 100;
  }, [errorRate]);

  const totalOccurrences = useMemo(
    () => topErrors?.rows.reduce((s, r) => s + r.count, 0) ?? 0,
    [topErrors],
  );
  const totalUsersImpacted = useMemo(
    () => topErrors?.rows.reduce((s, r) => s + r.users, 0) ?? 0,
    [topErrors],
  );

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
            <AlertTriangleIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Errors
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Top errors do app + tendência da taxa de erro.
            </p>
          </div>
        </div>
        <Link
          to="/tech"
          className="self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700 md:self-end"
        >
          ← Tech Hub
        </Link>
      </header>

      <GlobalFilterBar show={['period']} />

      {error && (
        <div className="ozly-card border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      {/* KPI tiles */}
      <section className="grid gap-3 sm:grid-cols-3">
        <KpiTile
          label="Erros (período)"
          value={errorRate?.current ?? null}
          loading={loading}
          tone={errorRate && errorRate.current > 0 ? 'warning' : 'lime'}
          delta={rateDelta}
        />
        <KpiTile
          label="Ocorrências totais"
          value={totalOccurrences || null}
          loading={loading}
          tone="neutral"
          hint="soma top 20 erros"
        />
        <KpiTile
          label="Users impactados"
          value={totalUsersImpacted || null}
          loading={loading}
          tone="warning"
          hint="únicos top 20 erros"
        />
      </section>

      {/* Top errors table */}
      <Card className="ozly-card">
        <Title className="!text-sm !font-semibold text-navy-700">
          Top errors ({period} dias)
        </Title>
        {loading ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-navy-400">
            <Spinner size="sm" /> Carregando…
          </div>
        ) : !topErrors || topErrors.rows.length === 0 ? (
          <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-700">
            Sem erros recentes — nada pra reportar.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] font-semibold uppercase tracking-wider text-navy-300">
                <tr className="border-b border-navy-50">
                  <th className="py-2 text-left">Mensagem</th>
                  <th className="py-2 text-right">Ocorrências</th>
                  <th className="py-2 text-right">Users</th>
                  <th className="py-2 text-left">Telas</th>
                  <th className="py-2 text-left">Última</th>
                </tr>
              </thead>
              <tbody className="text-navy-700">
                {topErrors.rows.map((err, i) => (
                  <tr key={`${err.message}-${i}`} className="border-b border-navy-50/60 last:border-0">
                    <td className="py-2 font-mono text-[11px]" title={err.message}>
                      <span className="line-clamp-2 max-w-md">{err.message}</span>
                    </td>
                    <td className="py-2 text-right tabular-nums font-semibold">
                      {formatNumber(err.count)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-navy-500">
                      {formatNumber(err.users)}
                    </td>
                    <td className="py-2 text-[11px] text-navy-400">
                      {err.screens && err.screens.length > 0 ? (
                        <span className="line-clamp-1 max-w-[160px]">
                          {err.screens.slice(0, 3).join(', ')}
                          {err.screens.length > 3 && ` +${err.screens.length - 3}`}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2 text-[11px] text-navy-500">
                      {formatRelativeTime(err.last_seen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Link
          to="/reliability"
          className="flex items-center gap-1 rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:border-brand-200 hover:text-brand-700"
        >
          Reliability dashboard →
        </Link>
        <Link
          to="/tech"
          className="flex items-center gap-1 rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:border-brand-200 hover:text-brand-700"
        >
          <ServerIcon className="h-3.5 w-3.5" /> Tech Hub
        </Link>
      </div>

      <RawDataPanel
        page="tech-errors"
        sources={[
          { rpc: 'admin_top_errors', params: { p_period_days: period, p_limit: 20 }, data: topErrors },
          { rpc: 'admin_app_error_rate', params: { p_period_days: period }, data: errorRate },
        ]}
      />
    </div>
  );
}

function KpiTile({
  label,
  value,
  loading,
  tone,
  hint,
  delta,
}: {
  label: string;
  value: number | null;
  loading: boolean;
  tone: 'brand' | 'lime' | 'warning' | 'neutral';
  hint?: string;
  delta?: number | null;
}) {
  const TONE_CLASS: Record<typeof tone, string> = {
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
      {loading ? (
        <div className="mt-2 h-8 w-24 animate-pulse rounded bg-navy-50" />
      ) : (
        <div className="mt-1 flex items-baseline gap-2">
          <div className={`text-2xl font-semibold ${TONE_CLASS[tone]}`}>
            {formatNumber(value)}
          </div>
          {delta !== null && delta !== undefined && Number.isFinite(delta) && (
            <span
              className={`text-[11px] font-medium ${delta > 0 ? 'text-rose-600' : delta < 0 ? 'text-emerald-600' : 'text-navy-400'}`}
            >
              {delta >= 0 ? '+' : ''}
              {delta.toFixed(1)}%
            </span>
          )}
        </div>
      )}
      {hint && !loading && <div className="mt-1 text-[11px] text-navy-400">{hint}</div>}
    </div>
  );
}
