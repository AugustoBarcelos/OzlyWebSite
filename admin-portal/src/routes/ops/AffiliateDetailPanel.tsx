import { useEffect, useState } from 'react';
import { Card, Tab, TabGroup, TabList, Title, Text } from '@tremor/react';
import { callRpc, RpcError } from '@/lib/rpc';
import { Spinner } from '@/components/Spinner';
import { QrCode } from '@/components/QrCode';
import { ExternalLinkIcon } from '@/components/Icons';
import { formatRelativeTime } from '@/lib/format';
import { AffiliateAwardsList } from './AffiliateAwardsList';
import {
  BONUS_PERIODS,
  activeVolumeIdx,
  effectiveAvgCents,
  formatMoneyCents,
  maxLifetimePayoutCents,
  nextVolumeTier,
  volumeBonusEarnedCents,
  type BonusPeriod,
  type RetentionBonus,
  type VolumeTier,
} from './tierMath';

interface Props {
  affiliateId: string;
  code: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  pay_id: string | null;
  currency: string;
  baseCents: number;
  bonusTiers: VolumeTier[];
  bonusPeriod: BonusPeriod;
  retentionBonuses: RetentionBonus[];
  currentPeriodCount: number;
  volumeAwardsCents: number;
  milestoneCents: number;
  onEdit?: () => void;
}

interface FunnelStep {
  name: string;
  count: number;
  pct_of_first: number;
}

interface FunnelResponse {
  period_days: number;
  steps: FunnelStep[];
}

interface TimeseriesPoint {
  date: string;
  signups: number;
  purchases: number;
  renewals: number;
}

interface TimeseriesResponse {
  period_days: number;
  series: TimeseriesPoint[];
}

const PERIODS = [7, 30, 90] as const;
type Period = (typeof PERIODS)[number];

/**
 * Onboarding template enviado via WhatsApp ao afiliado recém-cadastrado.
 * Pré-preenche {nome}, {code}, {link} pra zero atrito ao admin.
 * Espelha o template do MARKETING_AFFILIATES_PLAN.md §3.
 */
function buildWhatsAppOnboarding(
  code: string,
  name: string,
  shareUrl: string,
): string {
  const firstName = name.split(/\s+/)[0] ?? name;
  const dashboardUrl = `https://ozly.au/me/${code}`;
  return `Oi ${firstName}! 🎉

Tudo certo, você tá cadastrado no programa Ozly. Suas infos:

🔗 Seu link de indicação:
${shareUrl}

💵 Seu dashboard pessoal (acompanha ganhos):
${dashboardUrl}

📧 Pra entrar no dashboard, acessa o link acima, clica em "Receber meu link de acesso", aí abre o email e clica no link do Ozly. Sua sessão fica salva por 30 dias.

📱 Como compartilhar:
1. Salva o link como contato no celular ou na bio do IG
2. Compartilha pessoalmente nos grupos que você participa
3. Manda no WhatsApp pra amigos brasileiros que são sole traders

⚠️ IMPORTANTE: o Ozly tem que ser baixado E o usuário precisa pagar a 1ª renovação (mês 2) pra você ganhar a comissão. Tem que esperar ~30 dias depois do signup.

Qualquer dúvida me chama aqui.`;
}

/**
 * Painel de detalhe do afiliado — substitui a card simples antiga.
 *
 * Inclui:
 *   - QR code + share link (ozly.au/?ref=CODE)
 *   - Funil 4 steps (signups → trial → paying → churned) por período
 *   - Timeseries diário (mini chart inline)
 *   - Drill-down conversions table (passa o callback de markPaid de fora)
 */
export function AffiliateDetailPanel({
  affiliateId,
  code,
  name,
  email,
  phone,
  pay_id,
  currency,
  baseCents,
  bonusTiers,
  bonusPeriod,
  retentionBonuses,
  currentPeriodCount,
  volumeAwardsCents,
  milestoneCents,
  onEdit,
  conversionsTable,
}: Props & { conversionsTable: React.ReactNode }) {
  const [period, setPeriod] = useState<Period>(30);
  const [funnel, setFunnel] = useState<FunnelResponse | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    Promise.all([
      callRpc<FunnelResponse>('admin_affiliate_funnel', {
        p_affiliate_id: affiliateId,
        p_period_days: period,
      }),
      callRpc<TimeseriesResponse>('admin_affiliate_timeseries', {
        p_affiliate_id: affiliateId,
        p_period_days: period,
      }),
    ])
      .then(([f, t]) => {
        if (!alive) return;
        setFunnel(f);
        setTimeseries(t);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof RpcError ? e.message : 'Falha ao carregar dados');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [affiliateId, period]);

  const shareUrl = `https://ozly.au/v/${code}`;
  const periodIdx = PERIODS.indexOf(period);

  // Volume tier maths (lump-sum)
  const tierIdx = activeVolumeIdx(bonusTiers, currentPeriodCount);
  const sortedTiers = [...bonusTiers].sort((a, b) => a.threshold - b.threshold);
  const currentTier = tierIdx >= 0 ? sortedTiers[tierIdx] : null;
  const nextT = nextVolumeTier(bonusTiers, currentPeriodCount);
  const earnedLumpCents = volumeBonusEarnedCents(bonusTiers, currentPeriodCount);
  const avgRateCents = effectiveAvgCents(baseCents, bonusTiers, currentPeriodCount);
  const periodLabel =
    BONUS_PERIODS.find((p) => p.value === bonusPeriod)?.label ?? bonusPeriod;
  const progressPct = nextT
    ? Math.min(
        100,
        Math.max(
          0,
          ((currentPeriodCount - (currentTier?.threshold ?? 0)) /
            (nextT.tier.threshold - (currentTier?.threshold ?? 0))) *
            100,
        ),
      )
    : 100;
  const maxPerUser = maxLifetimePayoutCents(baseCents, retentionBonuses);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Title>
              <span className="font-mono text-base">{code}</span>
              {name && <span className="ml-2 text-base text-navy-500">· {name}</span>}
            </Title>
            <Text className="mt-0.5 text-xs text-navy-300">
              {email ?? '—'} {pay_id ? `· PayID: ${pay_id}` : ''}
            </Text>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700"
              >
                ✎ Editar
              </button>
            )}
            <TabGroup
              index={periodIdx === -1 ? 1 : periodIdx}
              onIndexChange={(i) => setPeriod(PERIODS[i] ?? 30)}
            >
              <TabList variant="solid">
                {PERIODS.map((p) => (
                  <Tab key={p}>{p}d</Tab>
                ))}
              </TabList>
            </TabGroup>
          </div>
        </div>
      </Card>

      {/* Volume bonus progress */}
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <Title className="!text-sm">
              💰 Volume bonus · avg{' '}
              <span className="text-emerald-700">
                {formatMoneyCents(avgRateCents, currency)} / conv
              </span>
            </Title>
            <Text className="mt-0.5 text-xs text-navy-300">
              {currentPeriodCount} conv em {periodLabel.toLowerCase()} · base{' '}
              {formatMoneyCents(baseCents, currency)} ·{' '}
              {formatMoneyCents(earnedLumpCents, currency)} de bonus já ganho
              {currentTier && (
                <>
                  {' '}· tier ativo: ≥{currentTier.threshold} (lump{' '}
                  {formatMoneyCents(currentTier.bonus_cents, currency)})
                </>
              )}
            </Text>
          </div>
          {!nextT && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
              🏆 top tier
            </span>
          )}
        </div>

        {/* Pending awards alert */}
        {volumeAwardsCents > 0 && (
          <div className="mt-3 rounded-md bg-amber-100 px-3 py-2 text-xs font-medium text-amber-900">
            💵 {formatMoneyCents(volumeAwardsCents, currency)} em volume
            bonuses pendentes de pagamento
          </div>
        )}

        <div className="mt-4 space-y-2">
          {sortedTiers.length === 0 ? (
            <div className="text-xs text-navy-400">
              Sem tiers configurados. Click "Editar" pra adicionar.
            </div>
          ) : (
            <>
              {nextT && (
                <div className="rounded-md bg-amber-50/60 px-3 py-2 text-xs text-amber-800">
                  📈 Faltam <strong>{nextT.needs}</strong> conversões pra atingir
                  ≥{nextT.tier.threshold} e ganhar lump{' '}
                  <strong>{formatMoneyCents(nextT.tier.bonus_cents, currency)}</strong>
                </div>
              )}

              <ul className="space-y-1.5">
                {sortedTiers.map((t, i) => {
                  const reached = currentPeriodCount >= t.threshold;
                  const isCurrent = i === tierIdx;
                  return (
                    <li
                      key={i}
                      className={[
                        'flex items-center gap-3 rounded-md border px-3 py-1.5 text-xs',
                        isCurrent
                          ? 'border-brand-300 bg-brand-50'
                          : reached
                            ? 'border-emerald-200 bg-emerald-50/50'
                            : 'border-navy-100 bg-white',
                      ].join(' ')}
                    >
                      <span className="w-16 font-mono text-navy-600">
                        ≥{t.threshold}
                      </span>
                      <span className="flex-1 text-navy-500">
                        lump{' '}
                        <strong className="text-navy-700">
                          {formatMoneyCents(t.bonus_cents, currency)}
                        </strong>{' '}
                        quando atinge
                      </span>
                      <span className="text-[10px]">{reached ? '✓ ganho' : '—'}</span>
                    </li>
                  );
                })}
              </ul>

              {nextT && (
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-navy-50">
                  <div
                    className="h-full bg-brand-500 transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Retention bonuses */}
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <Title className="!text-sm">⏰ Retention · max {formatMoneyCents(maxPerUser, currency)} / user em 12m</Title>
            <Text className="mt-0.5 text-xs text-navy-300">
              Pago por user que mantém assinatura X meses após signup.
            </Text>
          </div>
        </div>

        {milestoneCents > 0 && (
          <div className="mt-3 rounded-md bg-amber-100 px-3 py-2 text-xs font-medium text-amber-900">
            💵 {formatMoneyCents(milestoneCents, currency)} em retention
            milestones pendentes de pagamento
          </div>
        )}

        <ul className="mt-3 space-y-1.5">
          {retentionBonuses
            .slice()
            .sort((a, b) => a.months - b.months)
            .map((r) => (
              <li
                key={r.months}
                className="flex items-center gap-3 rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs"
              >
                <span className="w-16 font-mono text-navy-600">
                  {r.months}m
                </span>
                <span className="flex-1 text-navy-500">
                  +{formatMoneyCents(r.bonus_cents, currency)} quando user fica{' '}
                  {r.months} meses ativo
                </span>
              </li>
            ))}
          {retentionBonuses.length === 0 && (
            <li className="text-xs text-navy-400">Sem retention bonuses configurados.</li>
          )}
        </ul>

        <div className="mt-3 rounded-md bg-navy-50/60 px-3 py-2 text-[11px] text-navy-500">
          ⚙️ Detecção automática (Phase 2): pg_cron checa users de cada conv
          que cruzaram 3/6/12m e ainda estão ativos no RC. Por enquanto a
          estrutura fica salva mas o pagamento é registrado manualmente.
        </div>
      </Card>

      {/* QR + Funnel side by side */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* QR + landing actions */}
        <Card>
          <Title className="!text-sm">Compartilhar</Title>
          <Text className="mb-3 mt-0.5 text-xs text-navy-300">
            Página pública <code>ozly.au/v/{code}</code> com QR + download buttons.
          </Text>
          <QrCode data={shareUrl} size={180} alt={`QR para ${code}`} />
          <div className="mt-3 flex flex-col gap-1.5">
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
            >
              <ExternalLinkIcon className="h-3 w-3" />
              Abrir landing pública
            </a>
            {phone && (
              <a
                href={`https://wa.me/${phone.replace(/[^0-9+]/g, '').replace(/^\+/, '')}?text=${encodeURIComponent(buildWhatsAppOnboarding(code, name ?? code, shareUrl))}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Enviar template de onboarding via WhatsApp"
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:border-emerald-500 hover:bg-emerald-100"
              >
                <span>💬</span>
                Enviar onboarding (WhatsApp)
              </a>
            )}
            {!phone && (
              <span className="text-center text-[11px] text-navy-300">
                💬 Cadastra phone pra enviar onboarding via WhatsApp
              </span>
            )}
          </div>
        </Card>

        {/* Funnel */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <Title className="!text-sm">Funil · {period}d</Title>
            {loading && <Spinner size="sm" />}
          </div>
          <Text className="mt-0.5 text-xs text-navy-300">
            Conversion rate em cada etapa, calculado sobre signups do período.
          </Text>

          {error && (
            <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {error}
            </div>
          )}

          {funnel && <FunnelChart steps={funnel.steps} />}
        </Card>
      </div>

      {/* Timeseries */}
      <Card>
        <Title className="!text-sm">Atividade diária · {period}d</Title>
        <Text className="mt-0.5 text-xs text-navy-300">
          Signups · trials · renewals por dia.
        </Text>
        {timeseries && <Sparkbars data={timeseries.series} />}
      </Card>

      {/* Awards & Milestones — pagos vs pendentes */}
      <AffiliateAwardsList affiliateId={affiliateId} />

      {/* Conversions table — passada de fora */}
      {conversionsTable}
    </div>
  );
}

function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  const max = Math.max(...steps.map((s) => s.count), 1);
  const tones: Record<string, string> = {
    'Signups': 'bg-sky-500',
    'Started trial': 'bg-amber-500',
    'Paying (renewed)': 'bg-emerald-500',
    'Churned': 'bg-rose-500',
  };
  return (
    <ul className="mt-4 space-y-2">
      {steps.map((step) => {
        const widthPct = (step.count / max) * 100;
        return (
          <li key={step.name} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-xs font-medium text-navy-600">
              {step.name}
            </span>
            <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-navy-50">
              <div
                className={`h-full ${tones[step.name] ?? 'bg-navy-400'}`}
                style={{ width: `${widthPct}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-mono font-semibold text-navy-800 mix-blend-difference">
                {step.count}
              </span>
            </div>
            <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-navy-500">
              {step.pct_of_first.toFixed(0)}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Sparkbars({ data }: { data: TimeseriesPoint[] }) {
  const max = Math.max(
    ...data.map((p) => Math.max(p.signups, p.purchases, p.renewals)),
    1,
  );
  if (data.length === 0) return null;
  return (
    <div className="mt-3">
      {/* legenda */}
      <div className="mb-2 flex gap-3 text-[10px] text-navy-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-sky-500" /> Signups
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Trial
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Paying
        </span>
      </div>

      <div className="flex h-24 items-end gap-px overflow-hidden">
        {data.map((p) => (
          <div
            key={p.date}
            title={`${p.date}: ${p.signups} signups · ${p.purchases} trial · ${p.renewals} paying`}
            className="flex flex-1 flex-col-reverse items-stretch justify-end"
          >
            <div
              className="w-full bg-sky-500"
              style={{ height: `${(p.signups / max) * 100}%` }}
            />
            <div
              className="w-full bg-amber-500"
              style={{ height: `${(p.purchases / max) * 100}%` }}
            />
            <div
              className="w-full bg-emerald-500"
              style={{ height: `${(p.renewals / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-navy-400">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

export function affiliateRelativeActivity(
  last_signup_at: string | null,
  last_paid_at: string | null,
): string {
  const parts: string[] = [];
  if (last_signup_at) parts.push(`signup ${formatRelativeTime(last_signup_at)}`);
  if (last_paid_at) parts.push(`pago ${formatRelativeTime(last_paid_at)}`);
  return parts.join(' · ') || 'sem atividade';
}
