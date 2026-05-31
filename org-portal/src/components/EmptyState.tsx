import type { ReactNode } from 'react';

/**
 * Empty state — soft tinted card, decorative dot accent, friendlier copy
 * spacing. Empty states are first impressions; this one tries to feel like
 * "ready and waiting" instead of "broken".
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = 'brand',
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: 'brand' | 'lime' | 'navy';
}) {
  const iconBg =
    tone === 'lime'
      ? 'bg-lime-100 text-lime-700'
      : tone === 'navy'
        ? 'bg-navy-100 text-navy-500'
        : 'bg-brand-100 text-brand-700';

  return (
    <div className="ozly-card-soft relative flex flex-col items-center gap-3 overflow-hidden px-6 py-16 text-center">
      {/* Decorative arc — small visual hook in the corner. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full"
        style={{
          background:
            'radial-gradient(circle at center, rgba(43, 187, 151, 0.08), transparent 60%)',
        }}
      />
      {icon && (
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg}`}>
          {icon}
        </div>
      )}
      <div className="relative">
        <p className="font-display text-base font-semibold text-navy-800">{title}</p>
        {description && (
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-navy-400">
            {description}
          </p>
        )}
      </div>
      {action && <div className="relative mt-1">{action}</div>}
    </div>
  );
}
