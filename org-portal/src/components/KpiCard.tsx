import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Sparkline } from '@/components/Sparkline';

// KPI card with optional sparkline + trend chip. Renders as <button> when
// onClick is set (the KPI is acting as a filter toggle); otherwise plain div.
//
// `tone` picks the tint:
//   brand   = teal — primary/positive metric
//   lime    = lime — engagement / activity
//   sand    = gold — PRO / premium / earnings ceiling
//   rose    = red — danger / overdue / churn
//   navy    = neutral — counts / housekeeping

export type KpiTone = 'brand' | 'lime' | 'sand' | 'rose' | 'navy';

interface KpiCardProps {
  label: string;
  value: ReactNode;
  /** Chronological values for trend sparkline (oldest → newest). */
  trend?: number[];
  /** Optional pre-computed delta — "+12.4%", "-5", "flat". */
  delta?: { value: string; direction: 'up' | 'down' | 'flat' };
  tone?: KpiTone;
  /** When set, KPI becomes a button (used as filter toggle). */
  onClick?: () => void;
  /** When set, the whole card becomes a router Link (preferred for drill-downs). */
  to?: string;
  active?: boolean;
  className?: string;
  /** Overrides the colour of the value text (e.g. red for overdue total). */
  valueColor?: string;
}

const TONE_STROKE: Record<KpiTone, string> = {
  brand: 'text-brand-600',
  lime:  'text-lime-700',
  sand:  'text-sand-400',
  rose:  'text-rose-600',
  navy:  'text-navy-400',
};

const TONE_FILL: Record<KpiTone, string> = {
  brand: '#2BBB97',
  lime:  '#9DD760',
  sand:  '#c9a43c',
  rose:  '#e11d48',
  navy:  '#607387',
};

export function KpiCard({
  label,
  value,
  trend,
  delta,
  tone = 'brand',
  onClick,
  to,
  active,
  className = '',
  valueColor,
}: KpiCardProps) {
  const inner = (
    <>
      <div className="kpi-label">{label}</div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="kpi-value" style={valueColor ? { color: valueColor } : undefined}>
            {value}
          </div>
          {delta && (
            <span
              className={
                delta.direction === 'up'
                  ? 'kpi-trend kpi-trend-up'
                  : delta.direction === 'down'
                    ? 'kpi-trend kpi-trend-down'
                    : 'kpi-trend kpi-trend-flat'
              }
            >
              {delta.direction === 'up' ? '▲' : delta.direction === 'down' ? '▼' : '—'} {delta.value}
            </span>
          )}
        </div>
        {trend && trend.length > 0 && (
          <Sparkline
            values={trend}
            width={72}
            height={26}
            className={TONE_STROKE[tone]}
            fill={TONE_FILL[tone]}
          />
        )}
      </div>
    </>
  );

  const classes = `kpi kpi-tone-${tone} ${className}`;

  if (to) {
    return (
      <Link
        to={to}
        className={`${classes} block no-underline hover:no-underline`}
        aria-label={typeof label === 'string' ? label : undefined}
      >
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={classes}
      >
        {inner}
      </button>
    );
  }
  return <div className={classes}>{inner}</div>;
}
