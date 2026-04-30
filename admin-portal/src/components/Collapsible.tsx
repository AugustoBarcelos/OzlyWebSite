import { useState, type ReactNode } from 'react';

interface Props {
  /** Title shown in the collapsed header. */
  title: ReactNode;
  /** Optional subtitle / description under the title. */
  subtitle?: ReactNode;
  /** Optional left-side icon or emoji. */
  icon?: ReactNode;
  /** Optional right-side meta (badge, link, count). Stays visible when collapsed. */
  meta?: ReactNode;
  /** Default state. Defaults to closed — caller can pass true to start open. */
  defaultOpen?: boolean;
  /** Children render lazily (only when open) so heavy fetches don't fire on mount. */
  children: ReactNode;
  /** Override the wrapper class — default is the same surface as Tremor Card. */
  className?: string;
}

/**
 * Collapsible card. Closed by default to keep dense pages scannable.
 *
 *  - Header is the click target (full-width button for keyboard / a11y).
 *  - Children mount lazily — important for cards that hit external APIs
 *    (YouTube, Resend) so we don't burn quota on every page render.
 *  - Animated chevron, no layout shift on toggle.
 */
export function Collapsible({
  title,
  subtitle,
  icon,
  meta,
  defaultOpen = false,
  children,
  className,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={
        className ??
        'overflow-hidden rounded-xl border border-navy-100 bg-white shadow-sm transition-shadow hover:shadow'
      }
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-navy-50/50"
      >
        {icon && <span className="text-xl leading-none">{icon}</span>}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-navy-700">
            {title}
          </div>
          {subtitle && (
            <div className="mt-0.5 truncate text-xs text-navy-300">{subtitle}</div>
          )}
        </div>
        {meta && (
          <div className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
            {meta}
          </div>
        )}
        <span
          aria-hidden
          className={[
            'shrink-0 text-navy-300 transition-transform duration-200',
            open ? 'rotate-90' : 'rotate-0',
          ].join(' ')}
        >
          ▸
        </span>
      </button>
      {open && (
        <div className="border-t border-navy-50 px-4 py-4">{children}</div>
      )}
    </section>
  );
}
