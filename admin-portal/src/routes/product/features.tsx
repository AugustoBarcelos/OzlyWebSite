import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarList, Card, Title } from '@tremor/react';
import { PackageIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { GlobalFilterBar } from '@/components/GlobalFilterBar';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callRpc, RpcError } from '@/lib/rpc';
import { useGlobalFilters } from '@/lib/useGlobalFilters';
import { formatNumber } from '@/lib/format';
import type { FeatureUsageResponse } from '@/routes/dashboard/types';

/**
 * /product/features — feature adoption (top screens by views & users).
 *
 * Reuses admin_feature_usage_top with bigger limit. Two views:
 *   - Top by views (raw page-views)
 *   - Top by unique users (engagement breadth)
 */
export function ProductFeaturesPage() {
  const { periodDays } = useGlobalFilters();
  const period = Math.min(periodDays, 90);
  const [features, setFeatures] = useState<FeatureUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    callRpc<FeatureUsageResponse>('admin_feature_usage_top', {
      p_period_days: period,
      p_limit: 30,
    })
      .then((d) => {
        if (alive) setFeatures(d);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof RpcError ? e.message : 'Erro');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [period]);

  const byViews = useMemo(
    () =>
      features?.rows.map((r) => ({ name: r.screen, value: r.views })) ?? [],
    [features],
  );
  const byUsers = useMemo(
    () =>
      [...(features?.rows ?? [])]
        .sort((a, b) => b.users - a.users)
        .map((r) => ({ name: r.screen, value: r.users })),
    [features],
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
            <PackageIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Feature Adoption
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Quais telas são usadas, por quem, com que frequência.
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

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-navy-400">
          <Spinner size="sm" /> Carregando…
        </div>
      ) : !features || features.rows.length === 0 ? (
        <Card className="ozly-card">
          <div className="py-8 text-center text-sm text-navy-300">
            Sem dados de feature usage no período.
          </div>
        </Card>
      ) : (
        <>
          {/* Total tile */}
          <section className="grid gap-3 sm:grid-cols-3">
            <Tile label="Telas únicas" value={features.rows.length} />
            <Tile label="Total views" value={features.total_views} />
            <Tile
              label="Avg views/screen"
              value={features.rows.length > 0 ? Math.round(features.total_views / features.rows.length) : 0}
            />
          </section>

          {/* Top by views */}
          <Card className="ozly-card">
            <Title className="!text-sm !font-semibold text-navy-700">
              Top telas por views
            </Title>
            <BarList
              data={byViews}
              color="emerald"
              valueFormatter={(v: number) => formatNumber(v)}
              className="mt-3"
            />
          </Card>

          {/* Top by unique users */}
          <Card className="ozly-card">
            <Title className="!text-sm !font-semibold text-navy-700">
              Top telas por unique users
            </Title>
            <BarList
              data={byUsers}
              color="lime"
              valueFormatter={(v: number) => formatNumber(v)}
              className="mt-3"
            />
          </Card>

          {/* Detailed table */}
          <Card className="ozly-card">
            <Title className="!text-sm !font-semibold text-navy-700">Detalhado</Title>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] font-semibold uppercase tracking-wider text-navy-300">
                  <tr className="border-b border-navy-50">
                    <th className="py-2 text-left">Tela</th>
                    <th className="py-2 text-right">Views</th>
                    <th className="py-2 text-right">Users</th>
                    <th className="py-2 text-right">Views/user</th>
                  </tr>
                </thead>
                <tbody className="text-navy-700">
                  {features.rows.map((r) => (
                    <tr key={r.screen} className="border-b border-navy-50/60 last:border-0">
                      <td className="py-1.5 font-mono text-[11px]">{r.screen}</td>
                      <td className="py-1.5 text-right tabular-nums">{formatNumber(r.views)}</td>
                      <td className="py-1.5 text-right tabular-nums">{formatNumber(r.users)}</td>
                      <td className="py-1.5 text-right tabular-nums text-navy-500">
                        {r.users > 0 ? (r.views / r.users).toFixed(1) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <RawDataPanel
        page="product-features"
        sources={[
          {
            rpc: 'admin_feature_usage_top',
            params: { p_period_days: period, p_limit: 30 },
            data: features,
          },
        ]}
      />
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="ozly-card ozly-card-hero relative px-5 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-brand-600">
        {formatNumber(value)}
      </div>
    </div>
  );
}
