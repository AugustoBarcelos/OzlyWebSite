// Persistent banner shown above page content when the org's trial is in its
// final stretch (≤14 days, default; configurable via prop). Renders nothing
// outside that window so it can be dropped into the Layout once and forgotten.

import { Link } from 'react-router-dom';
import { useOrg } from '@/lib/org';

interface Props {
  thresholdDays?: number;
}

function daysBetween(a: Date, b: Date): number {
  // Math.floor (not ceil) — "ends in 1 day" should mean ≥24h. With ceil, a
  // trial ending in 30 minutes would display "1 day", which is deceptive.
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)));
}

export function TrialBanner({ thresholdDays = 14 }: Props) {
  const { currentOrg } = useOrg();
  if (!currentOrg?.trial_ends_at) return null;

  const trialEnds = new Date(currentOrg.trial_ends_at);
  const now = new Date();
  if (trialEnds.getTime() <= now.getTime()) return null; // expired

  const days = daysBetween(now, trialEnds);
  if (days > thresholdDays) return null;
  // Special-cased label for the final day (under 24h remaining).
  const isLastDay = days === 0;
  const dayLabel = isLastDay
    ? 'today'
    : days === 1
      ? 'in 1 day'
      : `in ${days} days`;

  const isUrgent = days <= 3;
  // Theme-aware tokens defined in index.css flip light↔dark automatically.
  // Light → dark text on cream wash. Dark → light text on tinted backdrop.
  const tone = isUrgent ? 'danger' : 'warn';
  return (
    <div
      className="-mx-4 mb-4 flex flex-wrap items-center gap-1.5 border-b px-4 py-2.5 text-[12.5px] sm:-mx-8 sm:px-8"
      style={{
        background: `var(--${tone}-bg)`,
        borderColor: `var(--${tone}-border)`,
        color: `var(--${tone}-text-body)`,
      }}
    >
      <span className="font-semibold" style={{ color: `var(--${tone}-text-strong)` }}>
        {isUrgent ? '🔥' : '🕒'} Trial ends {dayLabel}.
      </span>{' '}
      <span>Add a payment method now to keep coverage flowing —</span>{' '}
      <Link
        to="/billing"
        className="font-semibold underline hover:no-underline"
        style={{ color: `var(--${tone}-link)` }}
      >
        open Billing →
      </Link>
    </div>
  );
}
