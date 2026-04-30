/**
 * Avatar — initials in a colored circle.
 *
 * BRIEFING § 11.3: search results and User 360 show an avatar even when the
 * actual photo is unavailable. We never load remote images here (CSP /
 * privacy: a profile photo URL would expose Supabase storage paths to the
 * client and could be a tracking vector).
 *
 * Color is derived deterministically from the user id, so the same user
 * always has the same colored circle.
 */
import { useMemo } from 'react';

interface AvatarProps {
  /** User id used to derive a stable color. */
  userId: string;
  /** Display name; first letters become the initials. May be null. */
  name: string | null;
  /** Tailwind-friendly size token. */
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASS: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-14 w-14 text-base',
};

// Curated palette: high-contrast on white, distinct enough to glance at.
const PALETTE: ReadonlyArray<{ bg: string; fg: string }> = [
  { bg: 'bg-rose-100', fg: 'text-rose-800' },
  { bg: 'bg-amber-100', fg: 'text-amber-800' },
  { bg: 'bg-emerald-100', fg: 'text-emerald-800' },
  { bg: 'bg-sky-100', fg: 'text-sky-800' },
  { bg: 'bg-violet-100', fg: 'text-violet-800' },
  { bg: 'bg-fuchsia-100', fg: 'text-fuchsia-800' },
  { bg: 'bg-teal-100', fg: 'text-teal-800' },
  { bg: 'bg-brand-100', fg: 'text-brand-800' },
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

function initialsFrom(name: string | null): string {
  if (!name) return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    const first = parts[0];
    if (!first) return '?';
    return first.slice(0, 2).toUpperCase();
  }
  const a = parts[0];
  const b = parts[parts.length - 1];
  if (!a || !b) return '?';
  return `${a.charAt(0)}${b.charAt(0)}`.toUpperCase();
}

export function Avatar({ userId, name, size = 'md' }: AvatarProps) {
  const color = useMemo(() => {
    const idx = hash(userId) % PALETTE.length;
    return PALETTE[idx] ?? PALETTE[0];
  }, [userId]);
  const initials = useMemo(() => initialsFrom(name), [name]);

  // Defensive — TS narrowing for noUncheckedIndexedAccess
  const bg = color?.bg ?? 'bg-navy-50';
  const fg = color?.fg ?? 'text-navy-600';

  return (
    <span
      aria-hidden="true"
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        SIZE_CLASS[size],
        bg,
        fg,
      ].join(' ')}
    >
      {initials}
    </span>
  );
}
