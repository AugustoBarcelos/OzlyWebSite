import { useEffect, useState } from 'react';
import { Card, Grid, Title, Text, Badge } from '@tremor/react';
import { KpiCard } from '@/components/KpiCard';
import { Spinner } from '@/components/Spinner';
import { IntegrationStub } from '../marketing/PlaceholderCard';
import {
  fetchPaidChannel,
  formatCents,
  type PaidChannelDetail,
  type PaidChannel,
} from '@/lib/paid';
import { RpcError } from '@/lib/rpc';
import type { ComponentProps } from 'react';

interface Props {
  channel: PaidChannel;
  stubProps: ComponentProps<typeof IntegrationStub>;
}

/**
 * Mostra dados reais de paid_campaigns_snapshot quando há.
 * Fallback pra IntegrationStub quando o canal nunca recebeu dados (= API
 * não plugada ainda).
 */
export function PaidChannelView({ channel, stubProps }: Props) {
  const [data, setData] = useState<PaidChannelDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchPaidChannel(channel, 30)
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
  }, [channel]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="md" />
      </div>
    );
  }

  // Sem dados → mostra integration stub. Permission denied? show error.
  if (error) {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
        {error}
      </div>
    );
  }

  const hasData = data && data.campaigns && data.campaigns.length > 0;
  if (!hasData) {
    return <IntegrationStub {...stubProps} />;
  }

  const totals = data.totals;
  const currency = data.campaigns[0]?.currency ?? 'AUD';

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <Grid numItemsSm={2} numItemsLg={4} className="gap-4">
        <KpiCard
          title="Spend (30d)"
          value={totals.total_spend_cents}
          formatter={(v) => (v === null ? '—' : formatCents(v, currency))}
        />
        <KpiCard
          title="Conversões (30d)"
          value={totals.total_conversions}
        />
        <KpiCard
          title="CPA médio"
          value={totals.avg_cpa_cents}
          formatter={(v) => (v === null ? '—' : formatCents(v, currency))}
          isIncreasePositive={false}
        />
        <KpiCard
          title="Campanhas ativas"
          value={totals.campaigns_count}
        />
      </Grid>

      {/* Campaigns table */}
      <Card>
        <Title>Campanhas</Title>
        <Text className="mt-1 text-xs text-navy-300">
          Ordenadas por spend (30d). Status reflete o snapshot mais recente.
        </Text>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-navy-50 text-left text-[11px] uppercase tracking-wide text-navy-400">
              <tr>
                <th className="py-2">Campaign</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Spend</th>
                <th className="py-2 text-right">Impr.</th>
                <th className="py-2 text-right">CTR</th>
                <th className="py-2 text-right">Conv.</th>
                <th className="py-2 text-right">CPA</th>
              </tr>
            </thead>
            <tbody>
              {data.campaigns.map((c) => (
                <tr key={c.campaign_external_id} className="border-b border-navy-50 last:border-0">
                  <td className="py-3">
                    <div className="font-medium text-navy-700">
                      {c.campaign_label ?? c.campaign_external_id}
                    </div>
                    <div className="font-mono text-[10px] text-navy-300">
                      {c.campaign_external_id}
                    </div>
                  </td>
                  <td className="py-3">
                    <Badge
                      color={
                        c.last_status === 'active'
                          ? 'emerald'
                          : c.last_status === 'paused'
                            ? 'amber'
                            : 'gray'
                      }
                      size="xs"
                    >
                      {c.last_status ?? 'unknown'}
                    </Badge>
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {formatCents(c.spend_cents, c.currency)}
                  </td>
                  <td className="py-3 text-right tabular-nums text-navy-500">
                    {c.impressions.toLocaleString()}
                  </td>
                  <td className="py-3 text-right tabular-nums text-navy-500">
                    {c.ctr_pct !== null ? `${c.ctr_pct}%` : '—'}
                  </td>
                  <td className="py-3 text-right tabular-nums text-navy-700">
                    {c.conversions.toLocaleString()}
                  </td>
                  <td className="py-3 text-right tabular-nums text-navy-700">
                    {c.cpa_cents !== null ? formatCents(c.cpa_cents, c.currency) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
