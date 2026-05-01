import { useEffect, useState } from 'react';
import { Card, Grid, Text, Title, Badge } from '@tremor/react';
import { Link } from 'react-router-dom';
import { IntegrationStub } from '../marketing/PlaceholderCard';
import { PageHeader } from '../marketing/_PageHeader';
import { ADS_PLATFORMS } from './_configs';
import { KpiCard } from '@/components/KpiCard';
import { Spinner } from '@/components/Spinner';
import { fetchPaidOverview, formatCents, type PaidOverview } from '@/lib/paid';
import { RpcError } from '@/lib/rpc';

/**
 * Tráfego Pago — visão geral consolidada.
 *
 * Mostra (em cima): KPIs blended de spend/conv/CPA + breakdown por canal.
 * Embaixo: stubs com setup instructions pros canais ainda não plugados.
 *
 * Quando dados existirem em paid_campaigns_snapshot, o KPI hero aparece;
 * senão cai direto pra os stubs (= API ainda não plugada em nenhum canal).
 */

const CHANNEL_LABEL: Record<string, string> = {
  paid_google: '🎯 Google Ads',
  paid_meta: '📘 Meta Ads',
  paid_asa: '🍎 Apple Search Ads',
  paid_tiktok: '🎵 TikTok Ads',
};

const CHANNEL_ROUTE: Record<string, string> = {
  paid_google: '/ads/google',
  paid_meta: '/ads/meta',
  paid_asa: '/ads/asa',
  paid_tiktok: '/ads/tiktok',
};

export function AdsOverviewPage() {
  const [data, setData] = useState<PaidOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchPaidOverview(30)
      .then((d) => {
        if (alive) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (alive) {
          setError(e instanceof RpcError ? e.message : 'Failed');
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const hasData = data && data.totals.total_spend_cents > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tráfego Pago — Visão Geral"
        description="Estado de todas as plataformas de ads em uma tela. Cada uma também tem página dedicada na sidebar."
      />

      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner size="md" />
        </div>
      ) : error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : hasData ? (
        <>
          <Grid numItemsSm={2} numItemsLg={3} className="gap-4">
            <KpiCard
              title="Spend total · 30d"
              value={data.totals.total_spend_cents}
              formatter={(v) => (v === null ? '—' : formatCents(v))}
            />
            <KpiCard
              title="Conversões · 30d"
              value={data.totals.total_conversions}
            />
            <KpiCard
              title="CPA médio"
              value={data.totals.avg_cpa_cents}
              formatter={(v) => (v === null ? '—' : formatCents(v))}
              isIncreasePositive={false}
            />
          </Grid>

          <Card>
            <Title>Breakdown por canal · 30d</Title>
            <Text className="mt-1 text-xs text-navy-300">
              Click numa linha pra abrir o detalhe da plataforma.
            </Text>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-navy-50 text-left text-[11px] uppercase tracking-wide text-navy-400">
                  <tr>
                    <th className="py-2">Canal</th>
                    <th className="py-2 text-right">Spend</th>
                    <th className="py-2 text-right">Conv.</th>
                    <th className="py-2 text-right">CPA</th>
                    <th className="py-2 text-right">Campanhas</th>
                    <th className="py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.channels.map((c) => (
                    <tr key={c.channel} className="border-b border-navy-50 last:border-0">
                      <td className="py-3 font-medium text-navy-700">
                        {CHANNEL_LABEL[c.channel] ?? c.channel}
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        {formatCents(c.spend_cents)}
                      </td>
                      <td className="py-3 text-right tabular-nums">{c.conversions}</td>
                      <td className="py-3 text-right tabular-nums">
                        {c.cpa_cents !== null ? formatCents(c.cpa_cents) : '—'}
                      </td>
                      <td className="py-3 text-right tabular-nums text-navy-500">
                        {c.campaigns_count}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to={CHANNEL_ROUTE[c.channel] ?? '/ads'}
                          className="text-xs text-brand-600 hover:underline"
                        >
                          Detalhes →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <Title>Sem dados ainda</Title>
              <Text className="mt-2 text-sm text-navy-500">
                Nenhuma plataforma de ads conectada. Setup nas seções abaixo —
                quando você passar tokens, snapshots começam a chegar 1×/h.
              </Text>
            </div>
            <Badge color="amber">Pending</Badge>
          </div>
        </Card>
      )}

      <Card>
        <Title className="!text-base">Como funciona</Title>
        <Text className="mt-2 text-sm text-navy-500">
          Cada plataforma roda 1×/h via edge function `paid-snapshot-dispatch`.
          Os dados são gravados em <code>paid_campaigns_snapshot</code> e
          aparecem aqui agregados + por canal nas páginas dedicadas.
        </Text>
        <Text className="mt-2 text-xs text-navy-400">
          Atribuição de conversão: cada conversão (trial → paid) é atribuída a
          uma campanha via UTM (web), IDFA/GAID (mobile) ou referral_code.
        </Text>
      </Card>

      <div className="space-y-3">
        <Title className="!text-base !text-navy-600">Configuração por canal</Title>
        {Object.values(ADS_PLATFORMS).map((p) => (
          <IntegrationStub key={p.title} {...p} />
        ))}
      </div>
    </div>
  );
}
