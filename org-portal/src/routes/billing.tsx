import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import { Spinner } from '@/components/Spinner';
import { formatDate, formatMoney } from '@/lib/format';
import { friendlyError } from '@/lib/errors';
import { SEAT_LIMIT } from '@/lib/types';

interface BillingState {
  plan: 'free' | 'starter' | 'growth';
  status: string; // active | trialing | past_due | canceled | unconfigured
  seatCount: number;       // total accepted members (free dashboard)
  sponsoredAbn: number;    // active org_entitlement_grants for abn_access
  sponsoredPro: number;    // active org_entitlement_grants for pro_access (future)
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  manageUrl: string | null; // Stripe customer-portal URL (when configured)
}

const PRICE_PER_SEAT_AUD = 9.99;

// V2 pricing model (rollout pending — see docs/PRICING_V2_SPEC.md).
// Dashboard is free; orgs only pay for SPONSORED seats (worker ABN/PRO coverage).
// Tier is auto-derived from total sponsored seat count, NOT chosen by the org.
type Tier = {
  label: string;
  min: number;
  max: number;
  abn: number; // AUD per sponsored ABN seat / month
  pro: number; // AUD per sponsored PRO seat / month
};

const SPONSORED_TIERS: Tier[] = [
  { label: 'Crew',       min: 1,  max: 4,        abn: 14.99, pro: 19.99 },
  { label: 'Squad',      min: 5,  max: 14,       abn: 11.99, pro: 15.99 },
  { label: 'Fleet',      min: 15, max: 29,       abn:  9.99, pro: 12.99 },
  { label: 'Enterprise', min: 30, max: Infinity, abn:  7.99, pro:  9.99 },
];

function tierFor(sponsoredCount: number): Tier | null {
  if (sponsoredCount <= 0) return null;
  return SPONSORED_TIERS.find(t => sponsoredCount >= t.min && sponsoredCount <= t.max) ?? null;
}

export function BillingPage() {
  const { currentOrg, refresh } = useOrg();
  const { notify } = useToast();
  const orgId = currentOrg?.id ?? null;

  const [state, setState] = useState<BillingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<'checkout' | 'manage' | null>(null);

  const load = useCallback(async () => {
    if (!orgId || !currentOrg) return;
    setLoading(true);
    const { count: seatCount } = await supabase
      .from('org_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'accepted');

    // Sponsored seat counts power the V2 pricing preview. Today only
    // abn_access exists; pro_access is reserved for the PRO sponsorship SKU
    // shipping with V2 (see docs/PRICING_V2_SPEC.md §3).
    const { count: sponsoredAbn } = await supabase
      .from('org_entitlement_grants')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'active')
      .eq('entitlement', 'abn_access');
    const { count: sponsoredPro } = await supabase
      .from('org_entitlement_grants')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'active')
      .eq('entitlement', 'pro_access');

    // org_subscriptions is created by the Stripe billing migration. When the
    // migration isn't applied yet the table doesn't exist — handle that
    // gracefully so this page works in the "free, no Stripe" baseline.
    type StripeRow = { status?: string | null; current_period_end?: string | null; manage_url?: string | null };
    let stripe: StripeRow | null = null;
    try {
      const { data } = await supabase
        .from('org_subscriptions')
        .select('status, current_period_end, manage_url')
        .eq('org_id', orgId)
        .maybeSingle<StripeRow>();
      stripe = data ?? null;
    } catch {
      // Table doesn't exist yet (Stripe migration not run) — fall through.
    }

    setState({
      plan: currentOrg.billing_plan,
      status: stripe?.status ?? (currentOrg.billing_plan === 'free' ? 'unconfigured' : 'active'),
      seatCount: seatCount ?? 0,
      sponsoredAbn: sponsoredAbn ?? 0,
      sponsoredPro: sponsoredPro ?? 0,
      trialEndsAt: currentOrg.trial_ends_at,
      currentPeriodEnd: stripe?.current_period_end ?? null,
      manageUrl: stripe?.manage_url ?? null,
    });
    setLoading(false);
  }, [orgId, currentOrg]);

  useEffect(() => {
    void load();
  }, [load]);

  async function startCheckout() {
    if (!orgId) return;
    setBusyAction('checkout');
    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout-session', {
        body: { org_id: orgId },
      });
      if (error) throw error;
      const url = (data as { url?: string } | null)?.url;
      if (!url) throw new Error('Checkout URL not returned. Billing may not be configured yet.');
      window.location.href = url;
    } catch (err) {
      notify(friendlyError(err, 'Could not start checkout. Billing may not be configured yet.'), 'error');
    } finally {
      setBusyAction(null);
    }
  }

  async function openManage() {
    if (!orgId) return;
    if (state?.manageUrl) {
      window.location.href = state.manageUrl;
      return;
    }
    setBusyAction('manage');
    try {
      const { data, error } = await supabase.functions.invoke('stripe-portal-session', {
        body: { org_id: orgId },
      });
      if (error) throw error;
      const url = (data as { url?: string } | null)?.url;
      if (!url) throw new Error('Customer portal URL not returned.');
      window.location.href = url;
    } catch (err) {
      notify(friendlyError(err, 'Could not open billing portal.'), 'error');
    } finally {
      setBusyAction(null);
    }
  }

  if (!currentOrg) return null;
  if (loading || !state) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  const limit = SEAT_LIMIT[state.plan];
  const planLabel = state.plan.charAt(0).toUpperCase() + state.plan.slice(1);
  const monthlyCost = state.plan === 'free' ? 0 : state.seatCount * PRICE_PER_SEAT_AUD;
  const onPaidPlan = state.plan !== 'free';
  const inTrial = state.status === 'trialing' || (state.trialEndsAt && new Date(state.trialEndsAt) > new Date());

  // V2 preview math — auto-tier from total sponsored count (ABN + PRO).
  const sponsoredTotal = state.sponsoredAbn + state.sponsoredPro;
  const activeTier = tierFor(sponsoredTotal);
  const v2MonthlyAbn = activeTier ? state.sponsoredAbn * activeTier.abn : 0;
  const v2MonthlyPro = activeTier ? state.sponsoredPro * activeTier.pro : 0;
  const v2MonthlyTotal = v2MonthlyAbn + v2MonthlyPro;
  const v2AnnualTotal = v2MonthlyTotal * 10; // ×10 = 2 months free

  return (
    <>
      <PageHeader title="Billing" subtitle="Plan, seats and invoices from Ozly" />

      <div className="max-w-2xl">
        {/* Current plan */}
        <section className="ozly-card mb-4 p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-navy-700">Current plan</h2>
              <div className="mt-1 text-2xl font-display font-bold text-navy-700">{planLabel}</div>
              <div className="mt-1 text-xs text-navy-400">
                ${PRICE_PER_SEAT_AUD.toFixed(2)} AUD per active member / month
                {limit !== null && ` · up to ${limit} members`}
              </div>
            </div>
            {inTrial && state.trialEndsAt && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                Trial ends {formatDate(state.trialEndsAt)}
              </span>
            )}
            {state.status === 'past_due' && (
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                Payment overdue
              </span>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-navy-400">Active members</div>
              <div className="mt-0.5 text-base font-semibold text-navy-700">
                {state.seatCount}
                {limit !== null && <span className="text-navy-400"> / {limit}</span>}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-navy-400">This month</div>
              <div className="mt-0.5 text-base font-semibold text-navy-700">{formatMoney(monthlyCost)}</div>
            </div>
            {state.currentPeriodEnd && (
              <div className="col-span-2">
                <div className="text-[11px] uppercase tracking-wide text-navy-400">Next renewal</div>
                <div className="mt-0.5 text-sm text-navy-700">{formatDate(state.currentPeriodEnd)}</div>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {!onPaidPlan && (
              <button
                onClick={() => void startCheckout()}
                disabled={busyAction === 'checkout'}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
              >
                {busyAction === 'checkout' ? 'Opening checkout…' : 'Upgrade to paid'}
              </button>
            )}
            {onPaidPlan && (
              <button
                onClick={() => void openManage()}
                disabled={busyAction === 'manage'}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
              >
                {busyAction === 'manage' ? 'Opening…' : 'Manage billing'}
              </button>
            )}
            <button
              onClick={() => void refresh()}
              className="rounded-md px-4 py-2 text-sm font-medium text-navy-500 ring-1 ring-navy-100 hover:bg-navy-50"
            >
              Refresh
            </button>
          </div>
        </section>

        {/* New pricing model preview (V2 — see docs/PRICING_V2_SPEC.md) */}
        <section className="ozly-card mb-4 p-5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-navy-700">New pricing</h2>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
              Rolling out
            </span>
          </div>
          <p className="mt-2 text-sm text-navy-600">
            <strong>Dashboard, members, invoices and work feed are free</strong> — you only pay when
            you choose to <em>sponsor</em> a sub-contractor (cover their ABN or PRO access so they
            don't pay Solo). Volume break is automatic.
          </p>

          {/* Tier table */}
          <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-navy-100">
            <table className="w-full text-sm">
              <thead className="bg-navy-50 text-[11px] uppercase tracking-wide text-navy-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Tier</th>
                  <th className="px-3 py-2 text-left font-semibold">Sponsored seats</th>
                  <th className="px-3 py-2 text-right font-semibold">ABN / seat / mo</th>
                  <th className="px-3 py-2 text-right font-semibold">PRO / seat / mo</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-navy-100 text-navy-700">
                  <td className="px-3 py-2 font-medium">Free</td>
                  <td className="px-3 py-2 text-navy-500">0 (dashboard only)</td>
                  <td className="px-3 py-2 text-right">—</td>
                  <td className="px-3 py-2 text-right">—</td>
                </tr>
                {SPONSORED_TIERS.map((tier) => {
                  const isActive = activeTier?.label === tier.label;
                  return (
                    <tr
                      key={tier.label}
                      className={
                        'border-t border-navy-100 ' +
                        (isActive ? 'bg-brand-50 font-semibold text-brand-800' : 'text-navy-700')
                      }
                    >
                      <td className="px-3 py-2">
                        {tier.label}
                        {isActive && <span className="ml-2 text-[10px] uppercase">Your tier</span>}
                      </td>
                      <td className="px-3 py-2">
                        {tier.min}
                        {tier.max === Infinity ? '+' : `–${tier.max}`}
                      </td>
                      <td className="px-3 py-2 text-right">${tier.abn.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">${tier.pro.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-navy-400">
            Annual pricing = ×10 monthly (≈17% off, 2 months free). All amounts AUD.
          </p>

          {/* Your effective cost preview */}
          <div className="mt-4 rounded-lg bg-navy-50 p-4">
            <div className="text-[11px] uppercase tracking-wide text-navy-500">
              Your sponsored seats today
            </div>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-navy-400">ABN sponsorships</div>
                <div className="text-base font-semibold text-navy-700">{state.sponsoredAbn}</div>
              </div>
              <div>
                <div className="text-xs text-navy-400">PRO sponsorships</div>
                <div className="text-base font-semibold text-navy-700">{state.sponsoredPro}</div>
              </div>
            </div>
            <div className="mt-3 border-t border-navy-200 pt-3">
              {activeTier ? (
                <>
                  <div className="text-xs text-navy-500">
                    Tier: <strong className="text-navy-700">{activeTier.label}</strong> ({sponsoredTotal} sponsored total)
                  </div>
                  <div className="mt-1 text-sm text-navy-700">
                    Monthly: <strong>{formatMoney(v2MonthlyTotal)}</strong>
                    <span className="ml-2 text-navy-400">
                      · Annual: <strong>{formatMoney(v2AnnualTotal)}</strong>
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-sm text-navy-600">
                  You're on Free. Sponsor a member from the Members page to start coverage.
                </div>
              )}
            </div>
            <p className="mt-3 text-[11px] text-navy-400">
              Preview only — current billing still uses the legacy ${PRICE_PER_SEAT_AUD.toFixed(2)}/active-member model
              shown above. V2 rollout pending Stripe migration.
            </p>
          </div>
        </section>

        {/* What sponsorship unlocks */}
        <section className="ozly-card mb-4 p-5">
          <h2 className="text-sm font-semibold text-navy-700">What sponsoring a seat unlocks</h2>
          <ul className="mt-3 space-y-2 text-sm text-navy-600">
            <li>· The sub-contractor's ABN (or PRO) access is fully covered — they pay $0</li>
            <li>· Their ABN auto-appears on every invoice they send your org</li>
            <li>· Auto-renews monthly; cancel any time (7-day grace before access stops)</li>
            <li>· If they also work for other orgs, only one org sponsors at a time</li>
          </ul>
        </section>

        {/* Legal */}
        <section className="ozly-card p-5 text-xs text-navy-400">
          By using Ozly for Organisations you agree to our{' '}
          <a
            href="https://ozly.au/terms-of-service/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Terms of Service
          </a>{' '}
          and{' '}
          <a
            href="https://ozly.au/privacy-policy/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Privacy Policy
          </a>
          . Ozly does not create an employment relationship — sub-contractors accept engagements
          individually and remain independent.
        </section>
      </div>
    </>
  );
}
