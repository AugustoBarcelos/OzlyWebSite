import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRightIcon } from '@/components/Icons';

/**
 * CardLink — wraps any card-shaped child (chart cards, list cards) and makes
 * the whole block clickable, following the Cockpit drill-down pattern:
 * hover ring + ↗ arrow in the corner. Use around components that render
 * their own <Card> (FunnelChart, TimeSeriesChart, CohortHeatmap, …).
 *
 * `to` = internal route (react-router). External http(s) URLs open in a new
 * tab. Don't wrap cards that already contain links/buttons (nested anchors).
 */
export function CardLink({
  to,
  label,
  className: extraClass,
  children,
}: {
  to: string;
  /** Accessible label, e.g. "Ver funil de ativação". */
  label: string;
  /** Extra classes for the wrapper (e.g. grid spans like "lg:col-span-2"). */
  className?: string;
  children: ReactNode;
}) {
  const className = `group relative block cursor-pointer rounded-xl transition-shadow hover:shadow-md hover:ring-1 hover:ring-brand-200 ${extraClass ?? ''}`;
  const arrow = (
    <ArrowUpRightIcon className="pointer-events-none absolute right-3 top-3 z-10 h-3.5 w-3.5 text-navy-100 transition-colors group-hover:text-brand-500" />
  );
  if (to.startsWith('http')) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className={className}
      >
        {arrow}
        {children}
      </a>
    );
  }
  return (
    <Link to={to} aria-label={label} className={className}>
      {arrow}
      {children}
    </Link>
  );
}
