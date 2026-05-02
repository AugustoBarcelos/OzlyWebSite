import { useEffect, useState } from 'react';
import {
  Card,
  Title,
  Text,
  Metric,
  Badge,
  TabGroup,
  TabList,
  Tab,
} from '@tremor/react';
import { callRpc, RpcError } from '@/lib/rpc';
import { Spinner } from '@/components/Spinner';
import { formatRelativeTime } from '@/lib/format';

/**
 * Central de info do programa de afiliados — funnel + retry queue health +
 * failure reasons + top afiliados + fraud signals. Backed por uma única RPC
 * `admin_affiliate_insights(period_days, affiliate_id?)`.
 *
 * Substitui dashboard externo (PostHog) — toda info fica no admin portal.
 */

interface FunnelData {
  views: number;
  signups: number;
  first_purchase: number;
  first_renewal: number;
  cancelled: number;
  view_to_signup_pct: number;
  signup_to_purchase_pct: number;
  purchase_to_renewal_pct: number;
}

interface RetryQueueData {
  enqueued: number;
  succeeded: number;
  transient: number;
  exhausted: number;
  permanent_fail: number;
  health_score: number;
}

interface FailedReason {
  reason: string;
  count: number;
}

interface TopAffiliate {
  id: string;
  code: string;
  name: string | null;
  views: number;
  signups: number;
  purchases: number;
  renewals: number;
}

interface DailyView {
  day: string;
  views: number;
}

interface RecentCancellation {
  affiliate_code: string;
  affiliate_name: string | null;
  signup_at: string;
  first_purchase_at: string | null;
  updated_at: string;
}

interface InsightsResponse {
  period_days: number;
  period_start: string;
  snapshot_at: string;
  affiliate_id: string | null;
  funnel: FunnelData;
  retry_queue: RetryQueueData;
  failed_reasons: FailedReason[];
  top_affiliates: TopAffiliate[];
  daily_views: DailyView[];
  recent_cancellations: RecentCancellation[];
  earnings: { pending_commission_cents: number };
}

const PERIODS = [7, 30, 90] as const;

function formatNumber(n: number): string {
  return n.toLocaleString('en-AU');
}

function pctTone(pct: number, threshold: { good: number; warn: number }):
  'emerald' | 'amber' | 'rose' {
  if (pct >= threshold.good) return 'emerald';
  if (pct >= threshold.warn) return 'amber';
  return 'rose';
}

function healthTone(score: number): 'emerald' | 'amber' | 'rose' {
  if (score >= 80) return 'emerald';
  if (score >= 50) return 'amber';
  return 'rose';
}

function reasonLabel(r: string): string {
  return (
    {
      not_found: 'Code não encontrado',
      already_applied: 'Já aplicado',
      self_referral: 'Auto-indicação',
      invalid_format: 'Formato inválido',
      empty: 'Vazio',
      rate_limit: 'Rate limit',
      network: 'Erro de rede',
      unknown: 'Desconhecido',
    }[r] ?? r
  );
}

interface Props {
  /** Se passado, mostra insights só desse afiliado. Senão, agregado. */
  affiliateId?: string;
}

export function AffiliateInsightsCard({ affiliateId }: Props) {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(30);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    callRpc<InsightsResponse>('admin_affiliate_insights', {
      p_period_days: period,
      p_affiliate_id: affiliateId ?? null,
    })
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof RpcError ? e.message : 'Falha');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [period, affiliateId]);

  if (loading && !data) {
    return (
      <Card>
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-navy-400">
          <Spinner size="sm" />
          Carregando insights...
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </div>
      </Card>
    );
  }

  if (!data) return null;

  const { funnel, retry_queue, failed_reasons, top_affiliates, daily_views, recent_cancellations } =
    data;

  return (
    <div className="space-y-4">
      {/* Header com period selector */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Title>📊 Insights do programa</Title>
            <Text className="mt-0.5 text-xs text-navy-300">
              Funnel + saúde da retry queue + top afiliados + fraud signals.{' '}
              {affiliateId
                ? 'Filtrado por afiliado.'
                : 'Agregado de todos os afiliados ativos.'}{' '}
              Atualizado {formatRelativeTime(data.snapshot_at)}.
            </Text>
          </div>
          <TabGroup
            index={PERIODS.indexOf(period)}
            onIndexChange={(i) => {
              const next = PERIODS[i];
              if (next !== undefined) setPeriod(next);
            }}
          >
            <TabList variant="solid">
              {PERIODS.map((p) => (
                <Tab key={p}>{p}d</Tab>
              ))}
            </TabList>
          </TabGroup>
        </div>
      </Card>

      {/* Funnel */}
      <Card>
        <Title className="!text-sm">Funnel de aquisição</Title>
        <Text className="mt-0.5 text-xs text-navy-300">
          Landing → signup → 1ª compra → renovação. Cada % é a conversão entre etapas.
        </Text>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FunnelStep label="Views" value={funnel.views} />
          <FunnelStep
            label="Signups"
            value={funnel.signups}
            pct={funnel.view_to_signup_pct}
            tone={pctTone(funnel.view_to_signup_pct, { good: 5, warn: 2 })}
          />
          <FunnelStep
            label="1ª compra"
            value={funnel.first_purchase}
            pct={funnel.signup_to_purchase_pct}
            tone={pctTone(funnel.signup_to_purchase_pct, { good: 30, warn: 15 })}
          />
          <FunnelStep
            label="Renovou"
            value={funnel.first_renewal}
            pct={funnel.purchase_to_renewal_pct}
            tone={pctTone(funnel.purchase_to_renewal_pct, { good: 60, warn: 30 })}
          />
        </div>
        {funnel.cancelled > 0 && (
          <div className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800">
            ⚠️ {formatNumber(funnel.cancelled)} conversão(ões) marcadas como{' '}
            <strong>cancelled/refunded</strong> no período — proteção contra fraude
            ativa (não viraram comissão).
          </div>
        )}
      </Card>

      {/* Retry queue health */}
      <Card>
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <Title className="!text-sm">🔄 Retry queue health</Title>
            <Text className="mt-0.5 text-xs text-navy-300">
              Saúde do retry de <code>apply_referral_code</code> no app. Quando tudo
              ok, succeeded &gt;&gt; permanent_fail.
            </Text>
          </div>
          <Badge color={healthTone(retry_queue.health_score)} size="sm">
            {retry_queue.health_score}% health
          </Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <RetryStat label="Enqueued" value={retry_queue.enqueued} tone="slate" />
          <RetryStat label="Succeeded" value={retry_queue.succeeded} tone="emerald" />
          <RetryStat label="Transient" value={retry_queue.transient} tone="amber" />
          <RetryStat label="Exhausted" value={retry_queue.exhausted} tone="rose" />
          <RetryStat
            label="Permanent fail"
            value={retry_queue.permanent_fail}
            tone="rose"
          />
        </div>
        {retry_queue.enqueued === 0 && (
          <div className="mt-3 text-xs text-navy-300">
            Nenhum retry registrado no período — pode ser app antigo (sem
            ReferralRetryService) ou tudo passou na primeira tentativa.
          </div>
        )}
      </Card>

      {/* Failed reasons */}
      {failed_reasons.length > 0 && (
        <Card>
          <Title className="!text-sm">🎯 Falhas em apply_referral_code</Title>
          <Text className="mt-0.5 text-xs text-navy-300">
            Breakdown por <code>reason</code> dos eventos{' '}
            <code>referral_apply_failed</code>. Rate_limit/network = transient
            (vai pra fila); not_found/already_applied = permanent (drop).
          </Text>
          <ul className="mt-3 space-y-1.5">
            {failed_reasons.map((r) => (
              <li
                key={r.reason}
                className="flex items-center justify-between rounded-md border border-navy-50 bg-white px-3 py-2 text-sm"
              >
                <span className="text-navy-700">{reasonLabel(r.reason)}</span>
                <span className="font-mono text-navy-500">{formatNumber(r.count)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Top afiliados (só no agregado) */}
      {!affiliateId && top_affiliates.length > 0 && (
        <Card>
          <Title className="!text-sm">🏆 Top afiliados (período)</Title>
          <Text className="mt-0.5 text-xs text-navy-300">
            Ordenado por views. Comparar com signups mostra qual afiliado distribui
            mais (views) vs qual converte (signups/views).
          </Text>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-navy-400 border-b border-navy-50">
                  <th className="pb-2 pr-2 font-medium">Code</th>
                  <th className="pb-2 pr-2 font-medium">Nome</th>
                  <th className="pb-2 pr-2 font-medium text-right">Views</th>
                  <th className="pb-2 pr-2 font-medium text-right">Signups</th>
                  <th className="pb-2 pr-2 font-medium text-right">Compras</th>
                  <th className="pb-2 pr-2 font-medium text-right">CTR</th>
                </tr>
              </thead>
              <tbody>
                {top_affiliates.map((a) => {
                  const ctr = a.views > 0 ? (a.signups / a.views) * 100 : 0;
                  return (
                    <tr key={a.id} className="border-b border-navy-50/60 last:border-0">
                      <td className="py-2 pr-2 font-mono text-xs text-navy-700">
                        {a.code}
                      </td>
                      <td className="py-2 pr-2 text-navy-600">{a.name ?? '—'}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {formatNumber(a.views)}
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {formatNumber(a.signups)}
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {formatNumber(a.purchases)}
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums text-navy-500">
                        {ctr.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Daily views sparkline */}
      {daily_views.length > 0 && (
        <Card>
          <Title className="!text-sm">📈 Views diárias</Title>
          <Text className="mt-0.5 text-xs text-navy-300">
            Impressões por dia em <code>/v/:code</code>.
          </Text>
          <DailyBars data={daily_views} />
        </Card>
      )}

      {/* Recent cancellations (fraud signal) */}
      {recent_cancellations.length > 0 && (
        <Card>
          <Title className="!text-sm">🚨 Cancellations / Refunds recentes</Title>
          <Text className="mt-0.5 text-xs text-navy-300">
            Conversões que viraram <code>cancelled</code> ou <code>refunded</code> antes
            de gerar comissão. Padrão suspeito = mesmo afiliado aparecer várias vezes
            aqui.
          </Text>
          <ul className="mt-3 space-y-1.5">
            {recent_cancellations.slice(0, 10).map((c, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-navy-50 bg-white px-3 py-2 text-xs"
              >
                <div>
                  <span className="font-mono font-semibold text-navy-700">
                    {c.affiliate_code}
                  </span>{' '}
                  <span className="text-navy-400">· {c.affiliate_name ?? '—'}</span>
                </div>
                <span className="text-navy-400">
                  signup {formatRelativeTime(c.signup_at)} · cancelled{' '}
                  {formatRelativeTime(c.updated_at)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

// ── Sub-componentes ─────────────────────────────────────────────────────────

function FunnelStep({
  label,
  value,
  pct,
  tone,
}: {
  label: string;
  value: number;
  pct?: number;
  tone?: 'emerald' | 'amber' | 'rose';
}) {
  return (
    <div className="rounded-md border border-navy-50 bg-white p-3">
      <Text className="text-[11px] text-navy-300">{label}</Text>
      <Metric className="!text-2xl">{formatNumber(value)}</Metric>
      {pct !== undefined && (
        <Badge color={tone ?? 'slate'} size="xs" className="mt-1">
          {pct.toFixed(1)}% conv
        </Badge>
      )}
    </div>
  );
}

function RetryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'slate' | 'emerald' | 'amber' | 'rose';
}) {
  const toneClasses = {
    slate: 'border-navy-50 bg-navy-50/30 text-navy-700',
    emerald: 'border-emerald-100 bg-emerald-50/40 text-emerald-800',
    amber: 'border-amber-100 bg-amber-50/40 text-amber-800',
    rose: 'border-rose-100 bg-rose-50/40 text-rose-800',
  }[tone];
  return (
    <div className={`rounded-md border p-2.5 ${toneClasses}`}>
      <div className="text-[11px] opacity-80">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{formatNumber(value)}</div>
    </div>
  );
}

function DailyBars({ data }: { data: DailyView[] }) {
  const max = Math.max(...data.map((d) => d.views), 1);
  return (
    <div className="mt-3 flex h-24 items-end gap-1">
      {data.map((d) => {
        const h = (d.views / max) * 100;
        return (
          <div
            key={d.day}
            className="flex-1 rounded-t bg-brand-300 hover:bg-brand-500 transition-colors"
            style={{ height: `${Math.max(h, 2)}%` }}
            title={`${d.day}: ${d.views} views`}
          />
        );
      })}
    </div>
  );
}
