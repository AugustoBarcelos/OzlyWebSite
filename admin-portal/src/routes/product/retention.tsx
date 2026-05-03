import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import { ActivityIcon, PackageIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callRpc, RpcError } from '@/lib/rpc';
import { formatNumber } from '@/lib/format';
import type { CohortRetentionResponse, CohortRow } from '@/routes/dashboard/types';

/**
 * /product/retention — cohort retention heatmap.
 *
 * Two views: signup-cohort retention (admin_cohort_retention) and login
 * retention (admin_login_retention). Heatmap with D1/D7/D14/D30/D60 columns.
 */
export function ProductRetentionPage() {
  const [signupRetention, setSignupRetention] = useState<CohortRetentionResponse | null>(null);
  const [loginRetention, setLoginRetention] = useState<CohortRetentionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    void Promise.allSettled([
      callRpc<CohortRetentionResponse>('admin_cohort_retention', {}),
      callRpc<CohortRetentionResponse>('admin_login_retention', {}),
    ]).then((results) => {
      if (!alive) return;
      const [r0, r1] = results;
      if (r0.status === 'fulfilled') setSignupRetention(r0.value);
      else if (r0.reason instanceof RpcError) setError(r0.reason.message);
      if (r1.status === 'fulfilled') setLoginRetention(r1.value);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

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
            <ActivityIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Retention Cohorts
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Heatmap de retenção por cohort de signup + retenção de login.
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

      {error && (
        <div className="ozly-card border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-navy-400">
          <Spinner size="sm" /> Carregando cohorts…
        </div>
      ) : (
        <>
          <RetentionHeatmap
            title="Signup retention"
            subtitle="% de usuários ainda ativos D dias após signup"
            data={signupRetention}
          />
          <RetentionHeatmap
            title="Login retention"
            subtitle="% de usuários que fizeram login D dias após signup"
            data={loginRetention}
          />
        </>
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
        page="product-retention"
        sources={[
          { rpc: 'admin_cohort_retention', params: {}, data: signupRetention },
          { rpc: 'admin_login_retention', params: {}, data: loginRetention },
        ]}
      />
    </div>
  );
}

function RetentionHeatmap({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  data: CohortRetentionResponse | null;
}) {
  if (!data || data.cohorts.length === 0) {
    return (
      <Card className="ozly-card">
        <Title className="!text-sm !font-semibold text-navy-700">{title}</Title>
        <p className="mt-1 text-[11px] text-navy-400">{subtitle}</p>
        <div className="mt-3 text-xs text-navy-300">Sem cohorts disponíveis.</div>
      </Card>
    );
  }

  return (
    <Card className="ozly-card">
      <Title className="!text-sm !font-semibold text-navy-700">{title}</Title>
      <p className="mt-1 text-[11px] text-navy-400">{subtitle}</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-[10px] font-semibold uppercase tracking-wider text-navy-300">
            <tr className="border-b border-navy-50">
              <th className="py-2 text-left">Cohort</th>
              <th className="py-2 text-right">Size</th>
              <th className="py-2 text-right">D1</th>
              <th className="py-2 text-right">D7</th>
              <th className="py-2 text-right">D14</th>
              <th className="py-2 text-right">D30</th>
              <th className="py-2 text-right">D60</th>
            </tr>
          </thead>
          <tbody className="text-navy-700">
            {data.cohorts.map((cohort) => (
              <tr key={cohort.cohort} className="border-b border-navy-50/60 last:border-0">
                <td className="py-1.5 font-mono text-[11px]">{cohort.cohort}</td>
                <td className="py-1.5 text-right tabular-nums">{formatNumber(cohort.size)}</td>
                <RetentionCell value={cohort.d1} base={cohort.size} />
                <RetentionCell value={cohort.d7} base={cohort.size} />
                <RetentionCell value={cohort.d14} base={cohort.size} />
                <RetentionCell value={cohort.d30} base={cohort.size} />
                <RetentionCell value={cohort.d60} base={cohort.size} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function RetentionCell({ value, base }: { value: CohortRow['d1']; base: number }) {
  if (value === null || base === 0) {
    return <td className="py-1.5 text-right text-navy-300">—</td>;
  }
  const pct = (value / base) * 100;
  // Color intensity based on retention %
  const tone =
    pct >= 50 ? 'bg-emerald-100 text-emerald-800' :
    pct >= 30 ? 'bg-lime-100 text-lime-800' :
    pct >= 15 ? 'bg-amber-100 text-amber-800' :
    pct > 0 ? 'bg-rose-50 text-rose-700' :
    'text-navy-300';
  return (
    <td className="py-1.5 text-right">
      <span className={`inline-block min-w-[44px] rounded px-1.5 py-0.5 font-mono tabular-nums ${tone}`}>
        {pct.toFixed(0)}%
      </span>
    </td>
  );
}
