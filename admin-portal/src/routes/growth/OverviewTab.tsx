import { useEffect, useState } from 'react';
import { Card, Grid, Title, Text } from '@tremor/react';
import { ExternalLinkIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { callRpc, RpcError } from '@/lib/rpc';
import { callEdge } from '@/lib/edge';
import { formatNumber } from '@/lib/format';

/**
 * Growth Overview — single-pane glance at "where new paying users come from".
 *
 * Today shows:
 *   - Site sessions / users 30d (GA4) — real
 *   - New signups 30d (admin_kpi_dashboard) — real
 *   - New paying 30d (admin_revenue_summary) — real
 *   - Site → signup conversion rate (computed) — real
 *
 * Paid spend/conv/CAC/ROAS placeholders aguardando primeiro provider de Ads
 * plugar. Quando o primeiro plugar (Google Ads / Meta / TikTok / ASA), o
 * frame fica igual e os números acendem automaticamente.
 */

interface KpiData {
  ga4_sessions: number | null;
  ga4_users: number | null;
  signups_30d: number | null;
  paying_total: number | null;
  mrr_aud: number | null;
}

interface KpiResponse {
  kpi?: { signups_period?: number; paid_active?: { tfn?: number; abn?: number; pro?: number } };
}

interface RevenueResponse {
  mrr_estimate_aud?: number | null;
  paid_active?: { tfn?: number; abn?: number; pro?: number };
}

interface Ga4Response {
  ga4?: { sessions?: number; users?: number };
}

export function OverviewTab() {
  const [data, setData] = useState<KpiData>({
    ga4_sessions: null,
    ga4_users: null,
    signups_30d: null,
    paying_total: null,
    mrr_aud: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);

      // Fire all 3 in parallel; degrade gracefully if any fails.
      const [kpiRes, revRes, ga4Res] = await Promise.allSettled([
        callRpc<KpiResponse | null>('admin_kpi_dashboard', { p_period_days: 30 }),
        callRpc<RevenueResponse | null>('admin_revenue_summary', { p_period_days: 30 }),
        callEdge<Ga4Response>('ga4-stats', { query: { op: 'summary' } }),
      ]);

      if (!alive) return;

      const kpi = kpiRes.status === 'fulfilled' ? (kpiRes.value as KpiResponse | null) : null;
      const rev = revRes.status === 'fulfilled' ? (revRes.value as RevenueResponse | null) : null;
      const ga4 =
        ga4Res.status === 'fulfilled' && ga4Res.value.ok
          ? ga4Res.value.data?.ga4
          : null;

      if (kpiRes.status === 'rejected' && kpiRes.reason instanceof RpcError) {
        setError(kpiRes.reason.message);
      }

      const paid_active = rev?.paid_active ?? kpi?.kpi?.paid_active ?? {};
      const paying_total =
        (paid_active.tfn ?? 0) + (paid_active.abn ?? 0) + (paid_active.pro ?? 0);

      setData({
        ga4_sessions: ga4?.sessions ?? null,
        ga4_users: ga4?.users ?? null,
        signups_30d: kpi?.kpi?.signups_period ?? null,
        paying_total: paying_total > 0 ? paying_total : null,
        mrr_aud: rev?.mrr_estimate_aud ?? null,
      });
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Site → signup conversion: signups / sessions × 100
  const siteConv =
    data.ga4_sessions != null && data.signups_30d != null && data.ga4_sessions > 0
      ? (data.signups_30d / data.ga4_sessions) * 100
      : null;

  // Trial → Paying (proxy: paying_total / signups_30d). Não é attribution real
  // mas dá um indicador grosseiro até a gente plugar UTM tracking.
  const signupToPaying =
    data.signups_30d != null && data.paying_total != null && data.signups_30d > 0
      ? (data.paying_total / data.signups_30d) * 100
      : null;

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {error}
        </div>
      )}

      {/* Hero KPIs — real where possible */}
      <Grid numItemsSm={2} numItemsLg={4} className="gap-4">
        <KpiCard
          icon="🌐"
          label="Site sessions · 30d"
          value={data.ga4_sessions}
          loading={loading && data.ga4_sessions === null}
          formatter={formatNumber}
          hint={
            data.ga4_users != null
              ? `${formatNumber(data.ga4_users)} usuários únicos`
              : 'GA4 ozly.au'
          }
        />
        <KpiCard
          icon="✨"
          label="Signups · 30d"
          value={data.signups_30d}
          loading={loading && data.signups_30d === null}
          formatter={formatNumber}
          hint={
            siteConv != null
              ? `${siteConv.toFixed(2)}% de site → app`
              : 'Novos cadastros no app'
          }
        />
        <KpiCard
          icon="💰"
          label="Pagantes ativos"
          value={data.paying_total}
          loading={loading && data.paying_total === null}
          formatter={formatNumber}
          hint={
            signupToPaying != null
              ? `${signupToPaying.toFixed(1)}% signup → paying (30d)`
              : 'TFN + ABN + PRO'
          }
        />
        <KpiCard
          icon="📈"
          label="MRR estimado"
          value={data.mrr_aud}
          loading={loading && data.mrr_aud === null}
          formatter={(v) => (v == null ? '—' : `$${v.toFixed(0)}`)}
          hint="AUD · pagantes ativos × preço médio"
        />
      </Grid>

      {/* Paid spend channel comparison — placeholder until first ads API */}
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Title>Paid · comparativo por plataforma</Title>
            <Text className="mt-1 text-xs text-navy-300">
              Quando você plugar pelo menos 1 provedor de paid, esta tabela
              acende com Spend · Conv · CPA · ROAS lado-a-lado. Por enquanto,
              configure na tab <strong>Paid</strong>.
            </Text>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-md border border-navy-50">
          <table className="min-w-full divide-y divide-navy-50 text-xs">
            <thead className="bg-navy-50/60 text-left text-[10px] font-semibold uppercase tracking-wide text-navy-400">
              <tr>
                <th className="px-3 py-2">Plataforma</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Spend</th>
                <th className="px-3 py-2 text-right">Conv</th>
                <th className="px-3 py-2 text-right">CPA</th>
                <th className="px-3 py-2 text-right">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50 bg-white">
              {[
                { icon: '🎯', name: 'Google Ads (incl. YouTube Ads)' },
                { icon: '📘', name: 'Meta Ads (Facebook + Instagram)' },
                { icon: '🍎', name: 'Apple Search Ads' },
                { icon: '🎵', name: 'TikTok Ads' },
              ].map((p) => (
                <tr key={p.name} className="text-navy-500">
                  <td className="px-3 py-2 font-medium text-navy-700">
                    <span className="mr-1.5">{p.icon}</span>
                    {p.name}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                      Not connected
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-navy-300">—</td>
                  <td className="px-3 py-2 text-right font-mono text-navy-300">—</td>
                  <td className="px-3 py-2 text-right font-mono text-navy-300">—</td>
                  <td className="px-3 py-2 text-right font-mono text-navy-300">—</td>
                </tr>
              ))}
              <tr className="bg-navy-50/40 font-medium text-navy-700">
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2 text-right font-mono">$0</td>
                <td className="px-3 py-2 text-right font-mono">0</td>
                <td className="px-3 py-2 text-right font-mono">—</td>
                <td className="px-3 py-2 text-right font-mono">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* External quick links */}
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Text className="font-medium text-navy-700">Atalhos externos</Text>
            <Text className="mt-0.5 text-xs text-navy-300">
              Abre direto no painel do provider — útil enquanto não plugamos as APIs.
            </Text>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'GA4', href: 'https://analytics.google.com' },
              { label: 'Search Console', href: 'https://search.google.com/search-console' },
              { label: 'Google Ads', href: 'https://ads.google.com' },
              { label: 'Meta Business', href: 'https://business.facebook.com' },
              { label: 'YT Studio', href: 'https://studio.youtube.com' },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-navy-100 bg-white px-2.5 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-300 hover:text-brand-700"
              >
                {s.label}
                <ExternalLinkIcon className="h-3 w-3" />
              </a>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  loading,
  formatter,
  hint,
}: {
  icon: string;
  label: string;
  value: number | null;
  loading: boolean;
  formatter: (v: number) => string;
  hint: string;
}) {
  return (
    <Card className="!p-4">
      <div className="flex items-start gap-3">
        <span className="text-xl">{icon}</span>
        <div className="min-w-0 flex-1">
          <Text className="text-[11px] font-medium uppercase tracking-wide text-navy-400">
            {label}
          </Text>
          <div className="mt-1 text-2xl font-semibold text-navy-700">
            {loading ? (
              <span className="inline-flex items-center gap-2 text-base text-navy-300">
                <Spinner size="sm" />
              </span>
            ) : value == null ? (
              <span className="text-navy-300">—</span>
            ) : (
              formatter(value)
            )}
          </div>
          <Text className="mt-1 text-[11px] text-navy-300">{hint}</Text>
        </div>
      </div>
    </Card>
  );
}
