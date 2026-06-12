// DetailModal — the portal's drill-down surface. Cards on the Home grid (and
// anywhere else) stay compact; clicking one opens this popup with the full
// detail + actions. Same visual shell as the Savings popup: backdrop,
// bottom-sheet on mobile / centred dialog on desktop, sticky header, Esc to
// close.

import { useEffect, type ReactNode } from 'react';

export function DetailModal({
  title,
  subtitle,
  onClose,
  wide = false,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  /** max-w-2xl instead of max-w-md — for charts and long lists. */
  wide?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-navy-900/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl ${
          wide ? 'max-w-2xl' : 'max-w-md'
        }`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-navy-100 bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-navy-800">{title}</h2>
            {subtitle && <div className="mt-0.5 text-xs text-navy-500">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-sm text-navy-400 hover:bg-navy-50 hover:text-navy-700"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
