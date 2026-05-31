import type { ReactNode } from 'react';

/**
 * Page hero — small kicker (eyebrow), big display title, subtitle, optional
 * right-side action. Replaces the old sticky-blur header. Hero now sits in
 * the content flow instead of sticking, because the sidebar is the constant
 * chrome — and the hero deserves a moment to breathe at the top.
 *
 * For pages with critical bulk actions still in scroll-view (Invoices), pass
 * `sticky` and we keep the sticky+blur behaviour with a compact rendering.
 */
export function PageHeader({
  kicker,
  title,
  subtitle,
  action,
  sticky = false,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  sticky?: boolean;
}) {
  if (sticky) {
    return (
      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-navy-100 bg-[color:var(--canvas)]/85 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            {kicker && (
              <div className="page-hero-kicker mb-1">{kicker}</div>
            )}
            <h1 className="text-lg font-semibold text-navy-800">{title}</h1>
            {subtitle && <p className="mt-0.5 truncate text-[13px] text-navy-400">{subtitle}</p>}
          </div>
          {action}
        </div>
      </div>
    );
  }

  return (
    <div className="page-hero mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {kicker && <div className="page-hero-kicker">{kicker}</div>}
          <h1 className="page-hero-title">{title}</h1>
          {subtitle && <p className="page-hero-sub">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
