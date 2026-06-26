import { useCallback, useEffect, useState } from 'react';
import { Card, Grid, Title, Text, Badge } from '@tremor/react';
import { KpiCard } from '@/components/KpiCard';
import { Spinner } from '@/components/Spinner';
import { IntegrationStub } from '../marketing/PlaceholderCard';
import {
  fetchPaidChannel,
  fetchPaidRuns,
  formatCents,
  triggerPaidSnapshot,
  type PaidChannelDetail,
  type PaidChannel,
  type PaidSnapshotRun,
} from '@/lib/paid';
import { RpcError } from '@/lib/rpc';
import { formatRelativeTime } from '@/lib/format';
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
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  const [run, setRun] = useState<PaidSnapshotRun | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchPaidChannel(channel, 30));
    } catch (e) {
      setError(e instanceof RpcError ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
    // Saúde do último sync deste canal (não bloqueia a tela se falhar).
    fetchPaidRuns()
      .then((r) => setRun(r.runs.find((x) => x.channel === channel) ?? null))
      .catch(() => undefined);
  }, [channel]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncNote('Sincronizando com a loja…');
    try {
      const r = await triggerPaidSnapshot();
      setSyncNote(r.note ?? 'Sync disparado. Aguardando…');
    } catch (e) {
      setSyncNote(e instanceof RpcError ? e.message : 'Falha ao sincronizar');
      setSyncing(false);
      return;
    }
    // Dá tempo do edge function chamar a Apple e gravar, então re-busca.
    window.setTimeout(() => {
      void load();
      setSyncing(false);
      setSyncNote('Atualizado. Se ainda não aparecer, o Apple pode não ter reportado ainda.');
    }, 18000);
  }, [load]);

  const syncBar = (
    <div className="space-y-1.5 rounded-md border border-navy-50 bg-white px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-navy-400">
          {syncNote ?? 'Snapshot atualiza 1×/h (cron :17). Não quer esperar?'}
        </span>
        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={syncing}
          className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-50"
        >
          {syncing && <Spinner size="sm" />}
          {syncing ? 'Sincronizando…' : 'Sincronizar agora'}
        </button>
      </div>
      {run && (
        <div className="text-[11px]">
          {run.status === 'ok' ? (
            <span className="text-navy-400">
              Último sync {formatRelativeTime(run.ran_at)}: OK · {run.rows} linha(s) gravadas
              {run.rows === 0 && ' (Apple ainda não reportou dados da campanha)'}.
            </span>
          ) : (
            <span className="text-rose-600">
              ⚠ Último sync {formatRelativeTime(run.ran_at)} falhou ({run.status}):{' '}
              <span className="font-mono">{run.error ?? '—'}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (loading && !data) {
    return (
      <div className="space-y-3">
        {syncBar}
        <div className="flex justify-center py-10">
          <Spinner size="md" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        {syncBar}
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      </div>
    );
  }

  const hasData = data && data.campaigns && data.campaigns.length > 0;
  if (!hasData) {
    return (
      <div className="space-y-3">
        {syncBar}
        <IntegrationStub {...stubProps} />
      </div>
    );
  }

  const totals = data.totals;
  const currency = data.campaigns[0]?.currency ?? 'AUD';

  return (
    <div className="space-y-4">
      {syncBar}
      {/* KPIs */}
      <Grid numItemsSm={2} numItemsLg={4} className="gap-4">
        <KpiCard
          title="Gasto (30d)"
          value={totals.total_spend_cents}
          formatter={(v) => (v === null ? '—' : formatCents(v, currency))}
          href="#campaigns-table"
          subtitle="clique pra ver por campanha"
        />
        <KpiCard
          title="Conversões (30d)"
          value={totals.total_conversions}
          to="/growth/funnel"
          subtitle="clique pra ver o funil completo"
        />
        <KpiCard
          title="Custo por conversão (CPA)"
          value={totals.avg_cpa_cents}
          formatter={(v) => (v === null ? '—' : formatCents(v, currency))}
          isIncreasePositive={false}
          href="#campaigns-table"
          subtitle="quanto custa trazer 1 pessoa"
        />
        <KpiCard
          title="Campanhas ativas"
          value={totals.campaigns_count}
          href="#campaigns-table"
          subtitle="clique pra ver a lista"
        />
      </Grid>

      {/* Campaigns table */}
      <Card id="campaigns-table">
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
