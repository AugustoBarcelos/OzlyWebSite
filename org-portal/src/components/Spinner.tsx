interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
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
      className={`inline-block animate-spin rounded-full border-navy-100 border-t-brand-600 ${SIZE_CLASS[size]}`}
    />
  );
}

export function FullScreenSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[100dvh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" label={label} />
        <span className="text-sm text-navy-400">{label}</span>
      </div>
    </div>
  );
}
