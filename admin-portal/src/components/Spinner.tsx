/**
 * Spinner — minimal Tailwind-only loading indicator. Used by ProtectedRoute
 * and the login page while async work is in flight.
 */
interface SpinnerProps {
  /** Tailwind size class. Defaults to a sensible mid size. */
  size?: 'sm' | 'md' | 'lg';
  /** Accessible label, read by screen readers. */
  label?: string;
}

const SIZE_CLASS: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

export function Spinner({ size = 'md', label = 'Loading' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`inline-block animate-spin rounded-full border-navy-100 border-t-navy-600 ${SIZE_CLASS[size]}`}
    />
  );
}

/** Full-screen centered spinner — used during initial auth bootstrap. */
export function FullScreenSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[100dvh] items-center justify-center bg-navy-50"
    >
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" label={label} />
        <span className="text-sm text-navy-400">{label}</span>
      </div>
    </div>
  );
}
