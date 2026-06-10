import { useState, type ReactNode, type SyntheticEvent } from 'react';

// Persisted-collapse panel. Visually identical to the standard
// `<section className="ozly-card mb-4 p-5">` settings/reports card, but the
// header is a native <details>/<summary> so it collapses with full keyboard
// support (Enter/Space, focusable, announced to screen readers) and zero
// ARIA wiring. Open state persists per panel id — a personal reading
// preference, same rationale as ozly:dashboard:hide-reminded.

const KEY_PREFIX = 'ozly:section:';

export function CollapsibleSection({
  id,
  title,
  subtitle,
  badge,
  defaultOpen = true,
  action,
  children,
}: {
  /** Stable unique id, e.g. "settings-danger-zone". Used as the localStorage key. */
  id: string;
  title: string;
  subtitle?: string;
  /** Count or status pill next to the title. Numbers get the standard pill. */
  badge?: ReactNode;
  defaultOpen?: boolean;
  /** Optional right-side control (e.g. Export CSV). Clicks won't toggle the panel. */
  action?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(KEY_PREFIX + id);
      return v === null ? defaultOpen : v === '1';
    } catch {
      return defaultOpen;
    }
  });

  function onToggle(e: SyntheticEvent<HTMLDetailsElement>) {
    const next = e.currentTarget.open;
    setOpen(next);
    try {
      localStorage.setItem(KEY_PREFIX + id, next ? '1' : '0');
    } catch {
      // localStorage unavailable — session-only state is fine.
    }
  }

  return (
    <details className="ozly-card group mb-4" open={open} onToggle={onToggle}>
      <summary className="flex cursor-pointer select-none list-none items-center gap-3 rounded-[14px] px-5 py-4 hover:bg-navy-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-700">
            <span className="truncate">{title}</span>
            {typeof badge === 'number' ? (
              <span className="inline-flex shrink-0 items-center rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                {badge}
              </span>
            ) : (
              badge
            )}
          </h2>
          {subtitle && <p className="mt-1 text-xs text-navy-400">{subtitle}</p>}
        </div>
        {action && (
          <span
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {action}
          </span>
        )}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0 text-navy-400 transition-transform duration-200 group-open:rotate-180"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="border-t border-navy-50 px-5 pb-5 pt-4">{children}</div>
    </details>
  );
}
