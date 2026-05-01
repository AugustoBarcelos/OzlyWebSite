import { useEffect, useState } from 'react';
import { Card, Title, Text, Badge } from '@tremor/react';
import { callRpc, RpcError } from '@/lib/rpc';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';
import { formatRelativeTime } from '@/lib/format';
import { formatMoneyCents } from './tierMath';

interface VolumeAwardRow {
  id: string;
  period_start: string;
  threshold: number;
  bonus_cents: number;
  currency: string;
  awarded_at: string;
  paid_at: string | null;
  payout_id: string | null;
  notes: string | null;
}

interface MilestoneRow {
  id: string;
  conversion_id: string;
  months_alive: number;
  bonus_cents: number;
  currency: string;
  awarded_at: string;
  paid_at: string | null;
  payout_id: string | null;
  referred_user_id: string;
  signup_at: string;
  first_purchase_at: string | null;
}

interface Props {
  affiliateId: string;
  refreshKey?: number;
  onPaid?: () => void;
}

export function AffiliateAwardsList({ affiliateId, refreshKey, onPaid }: Props) {
  const { toast } = useToast();
  const [awards, setAwards] = useState<VolumeAwardRow[]>([]);
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [aw, ms] = await Promise.all([
        callRpc<{ rows: VolumeAwardRow[] }>('admin_affiliate_volume_awards', {
          p_affiliate_id: affiliateId,
        }),
        callRpc<{ rows: MilestoneRow[] }>('admin_affiliate_milestones', {
          p_affiliate_id: affiliateId,
        }),
      ]);
      setAwards(aw.rows ?? []);
      setMilestones(ms.rows ?? []);
    } catch (e) {
      toast({
        variant: 'error',
        title: 'Falha ao carregar awards',
        description: e instanceof RpcError ? e.message : 'Unknown',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affiliateId, refreshKey]);

  async function payAward(id: string) {
    if (!window.confirm('Marcar este volume bonus como pago?')) return;
    setMarking(id);
    try {
      await callRpc('admin_mark_volume_award_paid', { p_award_id: id });
      toast({ variant: 'success', title: 'Award marcado como pago' });
      await load();
      onPaid?.();
    } catch (e) {
      toast({
        variant: 'error',
        title: 'Falha',
        description: e instanceof RpcError ? e.message : 'Unknown',
      });
    } finally {
      setMarking(null);
    }
  }

  async function payMilestone(id: string) {
    if (!window.confirm('Marcar este retention milestone como pago?')) return;
    setMarking(id);
    try {
      await callRpc('admin_mark_milestone_paid', { p_milestone_id: id });
      toast({ variant: 'success', title: 'Milestone marcado como pago' });
      await load();
      onPaid?.();
    } catch (e) {
      toast({
        variant: 'error',
        title: 'Falha',
        description: e instanceof RpcError ? e.message : 'Unknown',
      });
    } finally {
      setMarking(null);
    }
  }

  if (loading && awards.length === 0 && milestones.length === 0) {
    return (
      <Card>
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-navy-400">
          <Spinner size="sm" />
          Carregando awards...
        </div>
      </Card>
    );
  }

  if (awards.length === 0 && milestones.length === 0) {
    return null;
  }

  return (
    <Card>
      <Title className="!text-sm">🎁 Awards & Milestones</Title>
      <Text className="mt-0.5 text-xs text-navy-300">
        Lump-sum awards (volume tiers) + retention milestones. Marque como pago
        quando liquidar via PayID/PIX.
      </Text>

      {awards.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-navy-500">
            💰 Volume awards (lump-sum)
          </div>
          <ul className="divide-y divide-navy-50 rounded-md border border-navy-100">
            {awards.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <div className="flex-1">
                  <div className="text-xs">
                    Atingiu <strong>≥{a.threshold}</strong> conv no período
                    iniciado em{' '}
                    <span className="font-mono text-[11px]">
                      {a.period_start.slice(0, 10)}
                    </span>
                  </div>
                  <div className="text-[10px] text-navy-400">
                    Awarded {formatRelativeTime(a.awarded_at)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold tabular-nums text-amber-700">
                    {formatMoneyCents(a.bonus_cents, a.currency)}
                  </div>
                </div>
                {a.paid_at ? (
                  <Badge color="emerald" size="xs">
                    paid {formatRelativeTime(a.paid_at)}
                  </Badge>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      void payAward(a.id);
                    }}
                    disabled={marking === a.id}
                    className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    {marking === a.id ? '…' : 'Marcar pago'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {milestones.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-navy-500">
            ⏰ Retention milestones (per user)
          </div>
          <ul className="divide-y divide-navy-50 rounded-md border border-navy-100">
            {milestones.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <div className="flex-1">
                  <div className="text-xs">
                    User{' '}
                    <span className="font-mono text-[11px] text-navy-600">
                      {m.referred_user_id.slice(0, 8)}…
                    </span>{' '}
                    cruzou <strong>{m.months_alive} meses</strong>
                  </div>
                  <div className="text-[10px] text-navy-400">
                    Signup {formatRelativeTime(m.signup_at)}
                    {m.first_purchase_at && (
                      <> · pago {formatRelativeTime(m.first_purchase_at)}</>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold tabular-nums text-amber-700">
                    {formatMoneyCents(m.bonus_cents, m.currency)}
                  </div>
                </div>
                {m.paid_at ? (
                  <Badge color="emerald" size="xs">
                    paid {formatRelativeTime(m.paid_at)}
                  </Badge>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      void payMilestone(m.id);
                    }}
                    disabled={marking === m.id}
                    className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    {marking === m.id ? '…' : 'Marcar pago'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
