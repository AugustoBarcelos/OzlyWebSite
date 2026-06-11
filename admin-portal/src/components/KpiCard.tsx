import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BadgeDelta, Card, Metric, Text } from '@tremor/react';
import { ArrowUpRightIcon } from '@/components/Icons';
import { formatNumber } from '@/lib/format';

/**
 * KpiCard — Tremor Card wrapper with consistent props for every KPI tile.
 *
 *  - `value === null` → renders "—" (e.g. metrics that depend on RC sync
 *    we haven't built yet; never show "0" because that's misleading).
 *  - `loading` → renders an animate-pulse skeleton instead of the metric.
 *  - `delta` → optional BadgeDelta. Sign of delta drives the badge type
 *    unless `isIncreasePositive` is overridden (e.g. churn going up is bad).
 *  - `to` / `href` → todo quadro deve ser clicável e levar pro detalhe.
 *    `to` = rota interna (react-router); `href` = âncora na própria página
 *    ("#tabela") ou link externo (http…, abre em nova aba).
 */

export interface KpiCardProps {
  title: string;
  value: number | null;
  /** Optional delta vs previous period. Pass +0.123 for +12.3%. */
  delta?: number;
  /** Defaults to true. Pass `false` for metrics where increase is bad (churn). */
  isIncreasePositive?: boolean;
  subtitle?: string;
  /** Custom formatter; defaults to `formatNumber`. */
  formatter?: (n: number | null) => string;
  loading?: boolean;
  /** Internal route — card becomes a react-router Link. */
  to?: string;
  /** Anchor ("#id") or external URL — card becomes an <a>. */
  href?: string;
}

function deltaTypeFor(delta: number): 'increase' | 'decrease' | 'unchanged' {
  if (delta > 0.005) return 'increase';
  if (delta < -0.005) return 'decrease';
  return 'unchanged';
}

const CLICKABLE_CARD_CLASS =
  'group relative block cursor-pointer transition-all hover:border-brand-200 hover:shadow-md';

function ClickableArrow() {
  return (
    <ArrowUpRightIcon className="absolute right-3 top-3 h-3.5 w-3.5 text-navy-100 transition-colors group-hover:text-brand-500" />
  );
}

export function KpiCard({
  title,
  value,
  delta,
  isIncreasePositive = true,
  subtitle,
  formatter = formatNumber,
  loading = false,
  to,
  href,
}: KpiCardProps) {
  const clickable = Boolean(to ?? href);
  const body: ReactNode = (
    <>
      {clickable && <ClickableArrow />}
      <div className="flex items-start justify-between gap-2">
        <Text>{title}</Text>
        {!loading && delta !== undefined && Number.isFinite(delta) && (
          <BadgeDelta
            deltaType={deltaTypeFor(delta)}
            isIncreasePositive={isIncreasePositive}
            size="xs"
            className={clickable ? 'mr-4' : undefined}
          >
            {`${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`}
          </BadgeDelta>
        )}
      </div>

      {loading ? (
        <div className="mt-2 h-8 w-24 animate-pulse rounded bg-navy-100" />
      ) : (
        <Metric className="mt-2">{formatter(value)}</Metric>
      )}

      {subtitle && !loading && (
        <Text className="mt-2 text-xs text-navy-400">{subtitle}</Text>
      )}
      {subtitle && loading && (
        <div className="mt-2 h-3 w-32 animate-pulse rounded bg-navy-50" />
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        <Card className={CLICKABLE_CARD_CLASS}>{body}</Card>
      </Link>
    );
  }
  if (href) {
    const external = href.startsWith('http');
    return (
      <a
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className="block"
      >
        <Card className={CLICKABLE_CARD_CLASS}>{body}</Card>
      </a>
    );
  }
  return <Card>{body}</Card>;
}
