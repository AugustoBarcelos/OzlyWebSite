// Visual seat-tier meter for /billing.
// Shows current tier, seats used, the boundary to next tier, and unit price.
//
// Dark mode: previous version used `from-brand-50 to-white` which left a
// massive white card on the dark canvas. Now uses `.ozly-card-hero` + the
// brand gradient overlay so the card adapts to both themes.

import { useMemo } from 'react';
import { formatMoney } from '@/lib/format';
import { tierForSeats, totalAmount, unitMonthlyPrice, savingsAtNextTier, isAnnual } from '@/lib/tier-pricing';
import type { BillingInterval } from '@/lib/tier-pricing';

export function TierMeter({
  seats,
  lookupKey,
}: {
  seats: number;
  lookupKey: string | null;
}) {
  const interval: BillingInterval = isAnnual(lookupKey) ? 'year' : 'month';
  const tier = useMemo(() => tierForSeats(Math.max(seats, 1)), [seats]);
  const unit = unitMonthlyPrice(tier, interval);
  const total = totalAmount(seats, tier, interval);
  const next = savingsAtNextTier(seats, tier, interval);
  const isCustom = !!tier.contactSales;

  const visualMin = tier.minSeats;
  const visualMax = tier.maxSeats ?? Math.max(seats * 1.5, 50);
  const fillPct = Math.min(100, Math.max(2, ((seats - visualMin) / (visualMax - visualMin)) * 100));

  return (
    <div className="ozly-card-hero relative overflow-hidden p-5">
      {/* Decorative brand glow in the corner — same signature as page-hero. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full"
        style={{
          background:
            'radial-gradient(circle at center, rgba(43, 187, 151, 0.18), transparent 60%)',
        }}
      />

      <div className="relative flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-brand-700">
              Current plan
            </span>
            <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-700">
              {tier.seatsLabel}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-display text-[1.8rem] font-bold leading-none tracking-tight text-navy-800">
              {tier.label}
            </span>
            {!isCustom && (
              <span className="text-sm font-medium text-navy-400">
                · {formatMoney(unit)} / seat / month
              </span>
            )}
          </div>
          <div className="mt-1 text-[12.5px] text-navy-500">{tier.tagline}</div>
        </div>
        <div className="shrink-0 text-right">
          {isCustom ? (
            <>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">
                Custom pricing
              </div>
              <a
                href="mailto:sales@ozly.au?subject=Custom%20org%20plan"
                className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-navy-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-600"
              >
                Talk to sales →
              </a>
            </>
          ) : (
            <>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">
                {interval === 'year' ? 'Billed annually' : 'Billed monthly'}
              </div>
              <div className="mt-1 font-display text-[1.4rem] font-bold leading-none tracking-tight text-navy-800">
                {formatMoney(total)}
                <span className="ml-1 text-sm font-medium text-navy-400">/mo</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Seat usage bar — only meaningful when the tier has a max */}
      {tier.maxSeats !== null && (
        <div className="relative mt-5">
          <div className="flex items-center justify-between text-[11px] font-medium text-navy-500">
            <span>{seats} {seats === 1 ? 'seat' : 'seats'}</span>
            <span>{tier.minSeats}–{tier.maxSeats}</span>
          </div>
          <div
            className="mt-1.5 h-2 overflow-hidden rounded-full"
            style={{ background: 'var(--border-hairline)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${fillPct}%`,
                background:
                  'linear-gradient(90deg, var(--color-brand-500) 0%, var(--color-lime-400) 100%)',
              }}
            />
          </div>
        </div>
      )}

      {next && (
        <div
          className="relative mt-4 rounded-lg border p-3 text-xs text-navy-600"
          style={{ borderColor: 'var(--border-hairline)', background: 'var(--surface-soft)' }}
        >
          {next.seatsNeeded > 0 ? (
            <>
              Add <strong className="text-navy-800">{next.seatsNeeded}</strong> more seat{next.seatsNeeded === 1 ? '' : 's'} to unlock{' '}
              <strong className="text-brand-700">{next.next.label}</strong> at{' '}
              <strong>{formatMoney(unitMonthlyPrice(next.next, interval))}/seat</strong>
              {next.savingMonthly > 0 && (
                <span className="ml-1">— saves {formatMoney(next.savingMonthly)}/mo at break-even</span>
              )}
              .
            </>
          ) : (
            <>You're already eligible for <strong className="text-brand-700">{next.next.label}</strong>. Upgrading saves money.</>
          )}
        </div>
      )}
    </div>
  );
}
