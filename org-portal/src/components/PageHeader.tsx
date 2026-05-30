import type { ReactNode } from 'react';

/**
 * Sticky page header — title + optional subtitle on the left, primary action on
 * the right. Bleeds to the content gutter (-mx-8) and sticks with a translucent
 * backdrop + hairline so content scrolls cleanly under it.
 */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-navy-100 bg-[#f7f8fa]/85 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-navy-800">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-[13px] text-navy-400">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
