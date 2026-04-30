import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

/**
 * Lightweight toast system. No external dependency — BRIEFING § 4 keeps deps
 * minimal. Toasts auto-dismiss after 4s and stack at the top-right.
 *
 * Wrap the app once with <ToastProvider>, then call `useToast()` from any
 * descendant. Used by DangerZone confirmations and admin action handlers
 * (BRIEFING § 11.4).
 */

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Override the default 4 second dismiss. */
  durationMs?: number;
}

interface ToastRecord extends Required<Pick<ToastOptions, 'title' | 'variant'>> {
  id: number;
  description: string | undefined;
  durationMs: number;
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 4000;

/** Hook returning `{ toast }` from the nearest ToastProvider. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
  info: 'border-navy-100 bg-white text-navy-700',
};

const VARIANT_DOT: Record<ToastVariant, string> = {
  success: 'bg-emerald-500',
  error: 'bg-rose-500',
  info: 'bg-navy-300',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastRecord[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (opts: ToastOptions) => {
      const id = ++idRef.current;
      const record: ToastRecord = {
        id,
        title: opts.title,
        description: opts.description,
        variant: opts.variant ?? 'info',
        durationMs: opts.durationMs ?? DEFAULT_DURATION_MS,
      };
      setItems((prev) => [...prev, record]);

      const t = setTimeout(() => {
        dismiss(id);
      }, record.durationMs);
      timersRef.current.set(id, t);
    },
    [dismiss]
  );

  // Cleanup timers on unmount.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={[
              'pointer-events-auto rounded-lg border px-3 py-2.5 shadow-md',
              VARIANT_STYLES[t.variant],
            ].join(' ')}
          >
            <div className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className={[
                  'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                  VARIANT_DOT[t.variant],
                ].join(' ')}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{t.title}</div>
                {t.description && (
                  <div className="mt-0.5 break-words text-xs opacity-80">
                    {t.description}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="shrink-0 rounded p-0.5 text-current opacity-60 transition-opacity hover:opacity-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
