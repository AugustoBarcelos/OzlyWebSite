// V2 Billing page — Tier-meter + self-serve upgrade + downgrade exit-interview.
//
// Owner-only enforcement is layered:
//   • UI: hide actions when !isOwner, show explanatory banner
//   • RPC org_tier_change raises owner_only_for_tier_change (server-side)
//   • Edge fn org-update-tier re-validates JWT before calling Stripe

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import { Spinner } from '@/components/Spinner';
import { TierMeter } from '@/components/TierMeter';
import { DowngradeReasonModal } from '@/components/DowngradeReasonModal';
import { Avatar } from '@/components/Avatar';
import { formatDate, formatMoney } from '@/lib/format';
import { friendlyError } from '@/lib/errors';
import { useSeqGuard } from '@/lib/use-seq-guard';
import {
  TIERS, tierForSeats, tierByLookupKey, isAnnual, intervalFromKey, totalAmount,
  type TierDefinition, type BillingInterval, type PriceLookupKey,
} from '@/lib/tier-pricing';

// Light-weight shape used only for the seats panel — full member management
// lives on /members.
interface SeatMember {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string;
}
interface PendingInvite {
  id: string;
  email_or_phone: string;
  role: string;
  created_at: string;
}

interface BillingState {
  status: string;
  seatQuantity: number;          // from org_subscriptions
  acceptedMemberCount: number;   // from org_memberships
  priceLookupKey: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  manageUrl: string | null;
  hasSubscription: boolean;
}

export function BillingPage() {
  const { currentOrg, refresh, isOwner } = useOrg();
  const { notify } = useToast();
  const orgId = currentOrg?.id ?? null;

  const [state, setState] = useState<BillingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showDowngrade, setShowDowngrade] = useState<{ from: TierDefinition; to: TierDefinition; interval: BillingInterval; seats: number } | null>(null);
  const [tierRpcMissing, setTierRpcMissing] = useState(false);
  const [members, setMembers] = useState<SeatMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const seq = useSeqGuard();

  const load = useCallback(async () => {
    if (!orgId || !currentOrg) return;
    setLoading(true);
    const token = seq.start();

    const { count: acceptedMemberCount } = await supabase
      .from('org_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'accepted');

    type SubRow = {
      status?: string | null;
      seat_quantity?: number | null;
      price_lookup_key?: string | null;
      current_period_end?: string | null;
      manage_url?: string | null;
    };
    let sub: SubRow | null = null;
    try {
      const { data, error } = await supabase
        .from('org_subscriptions')
        .select('status, seat_quantity, price_lookup_key, current_period_end, manage_url')
        .eq('org_id', orgId)
        .maybeSingle<SubRow>();
      // PG 42P01 = table missing (Stripe migration not applied in dev).
      // Any other error gets surfaced to Sentry so we don't silently degrade.
      if (error && (error as { code?: string }).code !== '42P01') {
        const { captureException } = await import('@/lib/sentry');
        captureException(error, { source: 'billing.load.org_subscriptions' });
      }
      sub = data ?? null;
    } catch (e) {
      const { captureException } = await import('@/lib/sentry');
      captureException(e, { source: 'billing.load.catch' });
    }

    // Members + pending invites — drives the Seats panel. Limit small lists
    // because /members is the full management UI; this is just a preview.
    const { data: memberRows } = await supabase
      .from('org_memberships')
      .select('user_id, role, profiles:profiles!org_memberships_user_id_fkey(full_name, email)')
      .eq('org_id', orgId)
      .eq('status', 'accepted')
      .order('accepted_at', { ascending: false })
      .limit(8);

    const { data: inviteRows } = await supabase
      .from('org_invitations')
      .select('id, email_or_phone, role, created_at')
      .eq('org_id', orgId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (!seq.isCurrent(token)) return;
    setMembers(
      ((memberRows ?? []) as unknown as Array<{ user_id: string; role: string; profiles: { full_name: string | null; email: string | null } | null }>).map((m) => ({
        user_id: m.user_id,
        full_name: m.profiles?.full_name ?? null,
        email: m.profiles?.email ?? null,
        role: m.role,
      })),
    );
    setPendingInvites((inviteRows ?? []) as PendingInvite[]);
    setState({
      status: sub?.status ?? 'unconfigured',
      seatQuantity: sub?.seat_quantity ?? acceptedMemberCount ?? 0,
      acceptedMemberCount: acceptedMemberCount ?? 0,
      priceLookupKey: sub?.price_lookup_key ?? null,
      trialEndsAt: currentOrg.trial_ends_at,
      currentPeriodEnd: sub?.current_period_end ?? null,
      manageUrl: sub?.manage_url ?? null,
      hasSubscription: !!sub?.status && sub.status !== 'unconfigured',
    });
    setLoading(false);
  }, [orgId, currentOrg, seq]);

  useEffect(() => { void load(); }, [load]);

  const currentTier = useMemo(
    () => tierByLookupKey(state?.priceLookupKey) ?? (state ? tierForSeats(Math.max(state.seatQuantity, 1)) : null),
    [state],
  );
  const currentInterval: BillingInterval = intervalFromKey(state?.priceLookupKey);

  async function startCheckout() {
    if (!orgId) return;
    setBusy('checkout');
    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout-session', { body: { org_id: orgId } });
      if (error) throw error;
      const url = (data as { url?: string } | null)?.url;
      if (!url) throw new Error('No checkout URL returned.');
      window.location.href = url;
    } catch (err) {
      notify(friendlyError(err, 'Could not start checkout.'), 'error');
    } finally {
      setBusy(null);
    }
  }

  async function openManage() {
    if (!orgId) return;
    setBusy('manage');
    try {
      if (state?.manageUrl) {
        window.location.href = state.manageUrl;
        return;
      }
      const { data, error } = await supabase.functions.invoke('stripe-portal-session', { body: { org_id: orgId } });
      if (error) throw error;
      const url = (data as { url?: string } | null)?.url;
      if (!url) throw new Error('No portal URL returned.');
      window.location.href = url;
    } catch (err) {
      notify(friendlyError(err, 'Could not open billing portal.'), 'error');
    } finally {
      setBusy(null);
    }
  }

  async function changeTier(targetKey: PriceLookupKey) {
    if (!orgId || !currentTier || !state) return;
    const targetTier = tierByLookupKey(targetKey);
    if (!targetTier) return;
    const targetInterval: BillingInterval = isAnnual(targetKey) ? 'year' : 'month';

    const isDowngrade = targetTier.rank < currentTier.rank;
    if (isDowngrade) {
      setShowDowngrade({ from: currentTier, to: targetTier, interval: targetInterval, seats: state.seatQuantity });
      return;
    }

    // Plain upgrade — no modal.
    setBusy('change');
    try {
      const { error } = await supabase.rpc('org_tier_change', {
        p_org_id: orgId,
        p_target_lookup_key: targetKey,
      });
      if (error) throw error;
      notify('Plan updated — Stripe will reflect the change shortly.', 'success');
      await Promise.all([load(), refresh()]);
    } catch (err) {
      const code = (err as { code?: string }).code;
      const isMissing = code === 'PGRST202' || code === '42883'
        || ((err as Error).message ?? '').includes('Could not find the function');
      if (isMissing) {
        setTierRpcMissing(true);
      } else {
        notify(friendlyError(err, 'Could not update the plan.'), 'error');
      }
    } finally {
      setBusy(null);
    }
  }

  async function confirmDowngrade(reason: { reason: string; reasonOther: string | null; contactRequested: boolean }) {
    if (!orgId || !showDowngrade) return;
    const targetKey = showDowngrade.interval === 'year' ? showDowngrade.to.annualLookupKey : showDowngrade.to.monthlyLookupKey;
    try {
      const { error } = await supabase.rpc('org_tier_change', {
        p_org_id: orgId,
        p_target_lookup_key: targetKey,
        p_downgrade_reason: reason.reason,
        p_reason_other: reason.reasonOther,
        p_contact_requested: reason.contactRequested,
      });
      if (error) throw error;
      notify('Downgrade scheduled. Thanks for the feedback.', 'success');
      setShowDowngrade(null);
      await Promise.all([load(), refresh()]);
    } catch (err) {
      notify(friendlyError(err, 'Could not process the downgrade.'), 'error');
    }
  }

  async function switchInterval() {
    if (!orgId || !currentTier || !state) return;
    const targetKey = currentInterval === 'year' ? currentTier.monthlyLookupKey : currentTier.annualLookupKey;
    setBusy('interval');
    try {
      const { error } = await supabase.rpc('org_tier_change', {
        p_org_id: orgId,
        p_target_lookup_key: targetKey,
      });
      if (error) throw error;
      notify(`Switched to ${currentInterval === 'year' ? 'monthly' : 'annual'} billing.`, 'success');
      await Promise.all([load(), refresh()]);
    } catch (err) {
      notify(friendlyError(err, 'Could not switch billing interval.'), 'error');
    } finally {
      setBusy(null);
    }
  }

  if (!currentOrg) return null;
  if (loading || !state) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  const inTrial = state.status === 'trialing' || (state.trialEndsAt && new Date(state.trialEndsAt) > new Date());

  return (
    <>
      <PageHeader kicker="Account" title="Billing" subtitle="Plan, seats and invoices from Ozly" />

      <div className="max-w-2xl space-y-4">
        {tierRpcMissing && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-900">
            <strong className="font-semibold">Tier management not enabled yet.</strong>{' '}
            Apply Supabase migration <code className="rounded bg-blue-100 px-1">20260602110000_org_tier_management.sql</code>{' '}
            to enable self-serve upgrade/downgrade.
          </div>
        )}

        {!isOwner && (
          <div className="rounded-lg border border-navy-100 bg-navy-50/60 px-4 py-3 text-xs leading-relaxed text-navy-700">
            <strong>Read-only:</strong> only the organisation owner can change the plan. Ask{' '}
            <span className="font-medium">{currentOrg.admin_email}</span> to upgrade or downgrade.
          </div>
        )}

        {inTrial && state.trialEndsAt && (
          <div
            className="rounded-xl border p-4 text-[13px] leading-relaxed"
            style={{
              background: 'var(--warn-bg)',
              borderColor: 'var(--warn-border)',
              color: 'var(--warn-text-body)',
            }}
          >
            <span className="font-semibold" style={{ color: 'var(--warn-text-strong)' }}>
              🕒 Your trial ends {formatDate(state.trialEndsAt)}.
            </span>
            {isOwner && !state.hasSubscription && (
              <>
                {' '}Add a payment method to keep going —{' '}
                <button
                  onClick={() => void startCheckout()}
                  className="font-semibold underline hover:no-underline"
                  style={{ color: 'var(--warn-link)' }}
                >
                  Start subscription →
                </button>
              </>
            )}
          </div>
        )}

        {/* Tier meter */}
        {currentTier && (
          <section>
            <TierMeter seats={state.seatQuantity} lookupKey={state.priceLookupKey} />
          </section>
        )}

        {/* Seats — occupied vs empty + quick member overview. /members is the
            full management surface; this is the at-a-glance view. */}
        {(() => {
          const billed = state.seatQuantity || state.acceptedMemberCount;
          const occupied = state.acceptedMemberCount;
          const empty = Math.max(0, billed - occupied);
          const occupiedPct = billed > 0 ? Math.round((occupied / billed) * 100) : 0;
          const atCap = empty === 0 && billed > 0;

          return (
            <section className="ozly-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-navy-700">Seats</h2>
                  <p className="mt-1 text-[12.5px] text-navy-500">
                    {occupied} of {billed} occupied · {empty} {empty === 1 ? 'seat' : 'seats'} available
                    {pendingInvites.length > 0 && (
                      <> · {pendingInvites.length} pending {pendingInvites.length === 1 ? 'invite' : 'invites'}</>
                    )}
                  </p>
                </div>
                <Link
                  to="/members"
                  className="rounded-md px-3 py-1.5 text-xs font-semibold text-navy-700 ring-1 ring-navy-100 hover:bg-navy-50"
                >
                  Manage members →
                </Link>
              </div>

              {/* Slot grid — every seat is a square. Filled = avatar; pending
                  = dashed pill with the invitee email; empty = ghost slot. */}
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {members.map((m) => (
                  <div
                    key={m.user_id}
                    className="flex items-center gap-2 rounded-lg border border-brand-100 bg-brand-50/40 p-2"
                    title={m.email ?? ''}
                  >
                    <Avatar name={m.full_name} email={m.email} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-medium text-navy-800">
                        {m.full_name?.trim() || m.email || 'Member'}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-navy-400">{m.role}</div>
                    </div>
                  </div>
                ))}
                {pendingInvites.slice(0, Math.max(0, empty + pendingInvites.length - members.length)).map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-2"
                    title={`Invited ${formatDate(inv.created_at)}`}
                  >
                    <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-semibold text-amber-700">
                      ⋯
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium text-amber-900">
                        {inv.email_or_phone}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-amber-700">Pending</div>
                    </div>
                  </div>
                ))}
                {/* Empty slots — capped at 6 to avoid a wall of placeholders. */}
                {Array.from({ length: Math.min(6, Math.max(0, empty - pendingInvites.length)) }).map((_, i) => (
                  <Link
                    key={`empty-${i}`}
                    to="/members"
                    className="flex items-center justify-center rounded-lg border border-dashed border-navy-200 p-2 text-[12px] text-navy-400 transition-colors hover:border-brand-300 hover:bg-brand-50/30 hover:text-brand-700"
                  >
                    + Invite
                  </Link>
                ))}
              </div>

              {/* Utilisation bar */}
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-navy-400">
                  <span>Utilisation</span>
                  <span>{occupiedPct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-navy-50">
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{
                      width: `${occupiedPct}%`,
                      background:
                        'linear-gradient(90deg, var(--color-brand-500) 0%, var(--color-lime-400) 100%)',
                    }}
                  />
                </div>
              </div>

              {atCap && isOwner && state.hasSubscription && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                  <strong>You're at seat cap.</strong> Upgrade to the next tier below to add more
                  members. Stripe pro-rates the difference automatically.
                </div>
              )}
            </section>
          );
        })()}

        {/* Plan picker */}
        <section className="ozly-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-navy-700">Plan</h2>
            {isOwner && currentTier && state.hasSubscription && (
              <button
                onClick={() => void switchInterval()}
                disabled={busy === 'interval'}
                className="rounded-md bg-navy-50 px-3 py-1.5 text-xs font-medium text-navy-700 hover:bg-navy-100 disabled:opacity-50"
              >
                {busy === 'interval'
                  ? 'Switching…'
                  : currentInterval === 'year'
                    ? 'Switch to monthly'
                    : 'Switch to annual (save 17%)'}
              </button>
            )}
          </div>

          <p className="mt-2 text-xs text-navy-500">
            Commitment-based per-seat pricing. Higher tiers unlock automatically — you pay the lower per-seat rate as your team grows.
          </p>

          <div className="mt-4 grid gap-2">
            {TIERS.map((t) => {
              const isCurrent = currentTier?.key === t.key;
              const seatPreview = state.seatQuantity || acceptedFloor(t.minSeats, state.acceptedMemberCount);
              const isCustom = !!t.contactSales;
              const monthlyBill = isCustom ? 0 : totalAmount(seatPreview, t, currentInterval);
              const unit = isCustom ? 0 : (currentInterval === 'year' ? t.unitAnnualPerYear / 12 : t.unitMonthly);
              const targetKey: PriceLookupKey | null = isCustom
                ? null
                : (currentInterval === 'year' ? t.annualLookupKey : t.monthlyLookupKey);
              const isUpgrade = !isCurrent && t.rank > (currentTier?.rank ?? 0);
              const canSelfServe = isOwner && state.hasSubscription && !isCustom && targetKey !== null;

              return (
                <div
                  key={t.key}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
                    isCurrent
                      ? 'border-brand-300 bg-brand-50/40'
                      : isCustom
                        ? 'border-sand-200 bg-sand-50/40 hover:bg-sand-50/60'
                        : 'border-navy-100 bg-white hover:border-brand-200 hover:bg-brand-50/20'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-base font-bold text-navy-800">{t.label}</span>
                      <span className="text-[11px] font-medium uppercase tracking-wider text-navy-400">
                        {t.seatsLabel}
                      </span>
                      {isCurrent && (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-800">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[12px] text-navy-500">{t.tagline}</div>
                    <div className="mt-1 text-[12px] text-navy-500">
                      {isCustom ? (
                        <span className="font-semibold text-navy-700">Custom pricing · talk to sales</span>
                      ) : (
                        <>
                          <span className="font-semibold text-navy-700">{formatMoney(unit)}</span>
                          <span className="text-navy-400"> / seat / mo</span>
                          <span className="mx-1.5 text-navy-300">·</span>
                          <span>{formatMoney(monthlyBill)}/mo at {seatPreview} seats</span>
                        </>
                      )}
                    </div>
                  </div>

                  {!isCurrent && (
                    isCustom ? (
                      <a
                        href="mailto:sales@ozly.au?subject=Custom%20org%20plan%20(100%2B%20seats)"
                        className="rounded-lg bg-navy-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-navy-600"
                      >
                        Talk to sales →
                      </a>
                    ) : canSelfServe ? (
                      <button
                        onClick={() => targetKey && void changeTier(targetKey)}
                        disabled={busy === 'change'}
                        className={`rounded-lg px-3.5 py-2 text-xs font-semibold disabled:opacity-50 ${
                          isUpgrade
                            ? 'bg-brand-600 text-white hover:bg-brand-500'
                            : 'bg-navy-50 text-navy-700 hover:bg-navy-100'
                        }`}
                      >
                        {isUpgrade ? 'Upgrade →' : 'Downgrade'}
                      </button>
                    ) : null
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-navy-400">
            Annual prepay = 17% off (monthly × 10). All AUD inc GST. Higher tiers unlock automatically as your team grows.
          </p>
        </section>

        {/* Subscription state + manage */}
        {state.hasSubscription && (
          <section className="ozly-card p-5">
            <h2 className="text-sm font-semibold text-navy-700">Subscription</h2>
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-navy-400">Status</div>
                <div className="mt-0.5 font-medium capitalize text-navy-700">{state.status.replace('_', ' ')}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-navy-400">Seats billed</div>
                <div className="mt-0.5 font-medium text-navy-700">{state.seatQuantity}</div>
              </div>
              {state.currentPeriodEnd && (
                <div className="col-span-2">
                  <div className="text-[11px] uppercase tracking-wide text-navy-400">Next renewal</div>
                  <div className="mt-0.5 text-sm text-navy-700">{formatDate(state.currentPeriodEnd)}</div>
                </div>
              )}
            </div>
            <button
              onClick={() => void openManage()}
              disabled={busy === 'manage'}
              className="mt-4 rounded-md bg-navy-50 px-3 py-1.5 text-xs font-semibold text-navy-700 hover:bg-navy-100 disabled:opacity-50"
            >
              {busy === 'manage' ? 'Opening…' : 'Open Stripe portal (update card, view invoices)'}
            </button>
          </section>
        )}

        {!state.hasSubscription && isOwner && (
          <section className="ozly-card p-5">
            <h2 className="text-sm font-semibold text-navy-700">Start subscription</h2>
            <p className="mt-2 text-xs text-navy-500">
              You're not on a paid plan yet. Adding a payment method via Stripe Checkout activates the
              tier that matches your current seat count automatically.
            </p>
            <button
              onClick={() => void startCheckout()}
              disabled={busy === 'checkout'}
              className="mt-3 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {busy === 'checkout' ? 'Opening…' : 'Add payment method'}
            </button>
          </section>
        )}

        <section className="ozly-card p-5 text-xs text-navy-400">
          By using Ozly for Organisations you agree to our{' '}
          <a href="https://ozly.au/terms-of-service" target="_blank" rel="noopener noreferrer" className="font-medium text-brand-600 hover:text-brand-700">Terms of Service</a>{' '}
          and{' '}
          <a href="https://ozly.au/privacy-policy/business" target="_blank" rel="noopener noreferrer" className="font-medium text-brand-600 hover:text-brand-700">Privacy Policy</a>.
          Ozly is a tool and does not determine your relationship with members — sub-contractors accept engagements individually and remain independent under their own ABN.
        </section>
      </div>

      {showDowngrade && (
        <DowngradeReasonModal
          fromTier={showDowngrade.from}
          toTier={showDowngrade.to}
          interval={showDowngrade.interval}
          seats={showDowngrade.seats}
          onCancel={() => setShowDowngrade(null)}
          onConfirm={confirmDowngrade}
        />
      )}
    </>
  );
}

function acceptedFloor(min: number, accepted: number): number {
  return Math.max(min, accepted);
}
