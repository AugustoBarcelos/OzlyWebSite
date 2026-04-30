import { Card, Title } from '@tremor/react';
import { formatNumber } from '@/lib/format';

export interface FunnelStep {
  name: string;
  value: number | null;
  /** Optional helper text shown below the count */
  hint?: string;
}

export interface FunnelChartProps {
  title: string;
  steps: FunnelStep[];
  loading?: boolean;
}

/**
 * Pure-CSS horizontal funnel:
 *   bar width  = value / steps[0].value (relative to top of funnel)
 *   drop-off % = 1 - currentStep / previousStep
 *
 * Steps with `value === null` render as muted "Pending sync" rows so the
 * shape of the funnel is preserved for whoever is reading it.
 */
export function FunnelChart({ title, steps, loading = false }: FunnelChartProps) {
  const top = steps.find((s) => s.value !== null && s.value > 0)?.value ?? 0;

  return (
    <Card>
      <Title>{title}</Title>
      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-navy-50/60" />
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {steps.map((step, i) => {
            const prev = i > 0 ? steps[i - 1] : null;
            const widthPct =
              step.value !== null && top > 0
                ? Math.max(8, (step.value / top) * 100)
                : 8;
            const dropPct =
              prev && prev.value !== null && step.value !== null && prev.value > 0
                ? 1 - step.value / prev.value
                : null;
            const isMissing = step.value === null;

            return (
              <div key={step.name} className="flex items-center gap-3">
                <div className="w-32 shrink-0 text-sm font-medium text-navy-600">
                  {step.name}
                </div>
                <div className="relative flex-1">
                  <div
                    className={
                      'flex h-10 items-center justify-between rounded-md px-3 text-sm transition-all ' +
                      (isMissing
                        ? 'bg-navy-50 text-navy-300'
                        : 'bg-gradient-to-r from-brand-500 to-brand-400 text-white shadow-sm')
                    }
                    style={{ width: `${widthPct}%` }}
                  >
                    <span className="font-semibold">
                      {isMissing ? '—' : formatNumber(step.value)}
                    </span>
                    {step.hint && (
                      <span className="ml-2 text-[11px] opacity-80">{step.hint}</span>
                    )}
                  </div>
                </div>
                <div className="w-20 shrink-0 text-right text-xs text-navy-400">
                  {dropPct !== null
                    ? `${(dropPct * 100).toFixed(1)}% drop`
                    : i === 0
                      ? '—'
                      : 'pending'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
