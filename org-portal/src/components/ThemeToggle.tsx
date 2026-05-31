import { useTheme, type Theme } from '@/lib/theme';

// Three-way segmented control: Light · System · Dark.
// Sits at the bottom of the sidebar. Each option = small icon + tooltip.
//
// Why segmented instead of a simple sun/moon toggle: respecting OS preference
// is the right default for accessibility (a user who flips their OS to dark
// at 6pm shouldn't see Ozly stay light). The 3rd "system" option makes that
// explicit instead of hidden behind a long-press.

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

const OPTIONS: { value: Theme; icon: () => React.ReactNode; label: string }[] = [
  { value: 'light',  icon: SunIcon,     label: 'Light' },
  { value: 'system', icon: MonitorIcon, label: 'System' },
  { value: 'dark',   icon: MoonIcon,    label: 'Dark' },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { pref, set } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex items-center gap-0.5 rounded-full p-0.5"
      style={{
        background: 'var(--surface-soft)',
        boxShadow: '0 0 0 1px var(--border-hairline) inset',
      }}
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = pref === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => set(opt.value)}
            className="flex h-6 w-6 items-center justify-center rounded-full transition-all"
            style={
              active
                ? {
                    background:
                      'linear-gradient(135deg, var(--color-brand-500) 0%, var(--color-lime-400) 100%)',
                    color: '#ffffff',
                    boxShadow: '0 2px 6px -2px rgba(43, 187, 151, 0.5)',
                  }
                : {
                    color: 'var(--ink-tertiary)',
                  }
            }
          >
            <Icon />
            {!compact && (
              <span className="sr-only">{opt.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
