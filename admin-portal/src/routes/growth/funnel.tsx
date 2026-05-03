import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarList, Card, Title } from '@tremor/react';
import { GlobalFilterBar } from '@/components/GlobalFilterBar';
import { RawDataPanel } from '@/components/RawDataPanel';
import {
  ArrowUpRightIcon,
  FunnelIcon,
  TrendingUpIcon,
} from '@/components/Icons';
import { formatCurrencyAUD, formatNumber, formatPercent } from '@/lib/format';
import { callRpc, RpcError } from '@/lib/rpc';
import { useGlobalFilters } from '@/lib/useGlobalFilters';

/**
 * Sales Funnel (W3) — full Impression → Retained funnel with conversion %
 * between each stage, breakdown by channel, and CAC/spend KPIs.
 *
 * Reads from RPC `admin_acquisition_overview(p_period_days)` which gracefully
 * returns null for stages that depend on pipelines not yet wired (installs,
 * retained_30d). The UI renders "—" for those and a small banner explaining
 * what's pending.
 */

interface FunnelData {
  impressions: number | null;
  clicks: number | null;
  installs: number | null;
  signups: number | null;
  activations: number | null;
  trials: number | null;
  paid: number | null;
  retained_30d: number | null;
}

interface ChannelCac {
  channel: string;
  spend: number;
  conversions: number;
  cpa: number | null;
}

interface SourceRow {
  source: string;
  signups: number;
}

interface AcquisitionOverview {
  snapshot_at: string | null;
  period_days: number;
  cac_blended: number | null;
  total_spend_aud: number;
  new_paying: number | null;
  funnel: FunnelData;
  top_sources: SourceRow[];
  cac_by_channel: ChannelCac[];
}

interface Stage {
  key: keyof FunnelData;
  label: string;
  hint?: string;
}

const STAGES: ReadonlyArray<Stage> = [
  { key: 'impressions', label: 'Impressions', hint: 'Anúncios servidos (paid + organic)' },
  { key: 'clicks', label: 'Clicks', hint: 'Cliques nos anúncios + tráfego pra site' },
  { key: 'installs', label: 'Installs', hint: 'App instalado (App Store + Play)' },
  { key: 'signups', label: 'Signups', hint: 'Conta criada' },
  { key: 'activations', label: 'Activations', hint: 'Primeira ação significativa em 48h' },
  { key: 'trials', label: 'Trials', hint: 'Trial iniciado via RevenueCat' },
  { key: 'paid', label: 'Paid', hint: 'Conversão pra plano pago' },
  { key: 'retained_30d', label: 'Retained 30d', hint: 'Ainda ativo após 30 dias' },
];

export function SalesFunnelPage() {
  const { periodDays } = useGlobalFilters();
  const [data, setData] = useState<AcquisitionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    callRpc<AcquisitionOverview>('admin_acquisition_overview', {
      p_period_days: periodDays,
    })
      .then((result) => {
        if (cancelled) return;
        setData(result);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (
          e instanceof RpcError &&
          (e.code === '42883' || e.message.includes('does not exist'))
        ) {
          // Migration not deployed in this env — render empty state.
          setData(null);
          setError(
            'RPC admin_acquisition_overview ainda não foi aplicada neste ambiente. Aplique a migration 20260503150000_admin_acquisition_overview.sql.',
          );
        } else {
          const msg =
            e instanceof RpcError
              ? `${e.rpcName}: ${e.message}`
              : e instanceof Error
                ? e.message
                : 'Unknown error';
          setError(msg);
        }
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [periodDays]);

  const funnelRows = useMemo(() => {
    if (!data) return [];
    return STAGES.map((stage) => ({
      ...stage,
      value: data.funnel[stage.key],
    }));
  }, [data]);

  // Find the largest known stage value to compute relative bar widths.
  const maxValue = useMemo(() => {
    let max = 0;
    for (const r of funnelRows) {
      if (r.value !== null && r.value > max) max = r.value;
    }
    return max;
  }, [funnelRows]);

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
              Sales Funnel
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Impression → Click → Install → Signup → Activation → Trial → Paid → Retained
            </p>
          </div>
        </div>
        <Link
          to="/growth"
          className="self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700 md:self-end"
        >
          ← Growth Hub
        </Link>
      </header>

      <GlobalFilterBar show={['period', 'channel', 'plan']} />

      {error && (
        <div className="ozly-card border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-700">
          <strong>Heads up:</strong> {error}
        </div>
      )}

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-3">
        <KpiTile
          label="CAC blended"
          value={data?.cac_blended ?? null}
          formatter={formatCurrencyAUD}
          loading={loading}
          tone="brand"
          hint="Spend total ÷ novos paid"
        />
        <KpiTile
          label="Spend total"
          value={data?.total_spend_aud ?? null}
          formatter={formatCurrencyAUD}
          loading={loading}
          tone="neutral"
          hint={`últimos ${periodDays} dias`}
        />
        <KpiTile
          label="Novos paid"
          value={data?.new_paying ?? null}
          formatter={formatNumber}
          loading={loading}
          tone="lime"
          hint="Conversões pra plano pago"
        />
      </section>

      {/* Funnel */}
      <Card className="ozly-card">
        <Title className="!text-sm !font-semibold text-navy-700">
          Funil completo (8 etapas)
        </Title>
        {loading ? (
          <div className="mt-4 space-y-2">
            {STAGES.map((s) => (
              <div key={s.key} className="h-10 animate-pulse rounded-md bg-navy-50" />
            ))}
          </div>
        ) : (
          <ol className="mt-4 space-y-2">
            {funnelRows.map((row, i) => {
              const prev = i > 0 ? funnelRows[i - 1] : null;
              const conversionPct =
                row.value !== null && prev && prev.value !== null && prev.value > 0
                  ? row.value / prev.value
                  : null;
              const widthPct = row.value !== null && maxValue > 0
                ? Math.max((row.value / maxValue) * 100, 2)
                : 0;

              return (
                <li
                  key={row.key}
                  className="rounded-md border border-navy-50 bg-white p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-[11px] font-mono text-navy-300">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-navy-700">
                          {row.label}
                        </div>
                        {row.hint && (
                          <div className="text-[11px] text-navy-400">{row.hint}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-base font-semibold text-navy-700">
                        {formatNumber(row.value)}
                      </span>
                      {conversionPct !== null ? (
                        <span className="text-[11px] text-brand-600">
                          {formatPercent(row.value, prev?.value ?? null)} conv.
                        </span>
                      ) : i > 0 ? (
                        <span className="text-[11px] text-navy-300">
                          conv. n/a
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {/* Visual bar */}
                  <div className="mt-2 h-1.5 w-full rounded-full bg-navy-50">
                    {row.value !== null && (
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${widthPct}%`,
                          background:
                            'linear-gradient(90deg, var(--color-brand-400), var(--color-lime-400))',
                        }}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <div className="mt-3 rounded-md border border-navy-50 bg-navy-50/50 p-2.5 text-[11px] leading-relaxed text-navy-500">
          <strong>Stages com &ldquo;—&rdquo;</strong> aguardam pipeline maduro:
          installs (attribution → App Store/Play install hooks), retained_30d
          (cohort retention pipeline). Resto sai dos dados existentes.
        </div>
      </Card>

      {/* Top sources + CAC by channel */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="ozly-card">
          <div className="mb-3 flex items-center justify-between">
            <Title className="!text-sm !font-semibold text-navy-700">
              Top sources de signup
            </Title>
            <Link
              to="/ads/attribution"
              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
            >
              UTM Attribution <ArrowUpRightIcon className="h-3 w-3" />
            </Link>
          </div>
          {data?.top_sources && data.top_sources.length > 0 ? (
            <BarList
              data={data.top_sources.map((s) => ({
                name: s.source,
                value: s.signups,
              }))}
              color="emerald"
              valueFormatter={formatNumber}
            />
          ) : (
            <div className="rounded-md border border-amber-100 bg-amber-50/60 p-3 text-xs text-amber-700">
              Aguardando attribution pipeline maduro (`marketing_utm_links_signups`).
            </div>
          )}
        </Card>

        <Card className="ozly-card">
          <div className="mb-3 flex items-center justify-between">
            <Title className="!text-sm !font-semibold text-navy-700">
              CAC por canal
            </Title>
            <Link
              to="/growth"
              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
            >
              Channels <ArrowUpRightIcon className="h-3 w-3" />
            </Link>
          </div>
          {data?.cac_by_channel && data.cac_by_channel.length > 0 ? (
            <table className="w-full text-xs">
              <thead className="text-[10px] font-semibold uppercase tracking-wider text-navy-300">
                <tr className="border-b border-navy-50">
                  <th className="py-1 text-left">Canal</th>
                  <th className="py-1 text-right">Spend</th>
                  <th className="py-1 text-right">Conv.</th>
                  <th className="py-1 text-right">CPA</th>
                </tr>
              </thead>
              <tbody className="text-navy-700">
                {data.cac_by_channel.map((row) => (
                  <tr key={row.channel} className="border-b border-navy-50/60 last:border-0">
                    <td className="py-1.5 font-medium capitalize">{row.channel}</td>
                    <td className="py-1.5 text-right font-mono">
                      {formatCurrencyAUD(row.spend)}
                    </td>
                    <td className="py-1.5 text-right font-mono">
                      {formatNumber(row.conversions)}
                    </td>
                    <td className="py-1.5 text-right font-mono">
                      {formatCurrencyAUD(row.cpa ?? null)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-xs text-navy-300">Sem spend agregado no período.</div>
          )}
        </Card>
      </section>

      <div className="flex items-center justify-end gap-2">
        <Link
          to="/growth"
          className="flex items-center gap-1 rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700"
        >
          <TrendingUpIcon className="h-3.5 w-3.5" />
          Voltar pro Growth Hub
        </Link>
      </div>

      <RawDataPanel
        page="sales-funnel"
        sources={[
          {
            rpc: 'admin_acquisition_overview',
            params: { p_period_days: periodDays },
            data,
            ...(error ? { note: error } : {}),
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
  loading: boolean;
  tone: 'brand' | 'lime' | 'neutral';
  hint?: string;
}

const TONE_CLASS: Record<KpiTileProps['tone'], string> = {
  brand: 'text-brand-600',
  lime: 'text-lime-600',
  neutral: 'text-navy-700',
};

function KpiTile({ label, value, formatter, loading, tone, hint }: KpiTileProps) {
  return (
    <div className="ozly-card ozly-card-hero relative px-5 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300">
        {label}
      </div>
      {loading ? (
        <div className="mt-2 h-8 w-24 animate-pulse rounded bg-navy-50" />
      ) : (
        <div className={`mt-1 text-2xl font-semibold ${TONE_CLASS[tone]}`}>
          {formatter(value)}
        </div>
      )}
      {hint && !loading && (
        <div className="mt-1 text-[11px] text-navy-400">{hint}</div>
      )}
    </div>
  );
}
