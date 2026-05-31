// Initials avatar with deterministic colour from a stable seed (email or id).
// Used in row-level lists so data feels person-shaped, not anonymous.
//
// Why a palette of 8 instead of HSL hash: a curated set keeps every avatar
// looking on-brand. HSL hashes give muddy oranges + yellows that fight with
// the navy/brand/lime tokens.

const PALETTE: { bg: string; fg: string }[] = [
  { bg: 'linear-gradient(135deg, #2BBB97 0%, #1d8a6e 100%)', fg: '#ffffff' }, // brand
  { bg: 'linear-gradient(135deg, #9DD760 0%, #6fa83d 100%)', fg: '#0e1a23' }, // lime
  { bg: 'linear-gradient(135deg, #607387 0%, #243b4f 100%)', fg: '#ffffff' }, // navy
  { bg: 'linear-gradient(135deg, #c9a43c 0%, #8a6f1d 100%)', fg: '#ffffff' }, // sand
  { bg: 'linear-gradient(135deg, #d97757 0%, #a64a2a 100%)', fg: '#ffffff' }, // terracotta
  { bg: 'linear-gradient(135deg, #5b8def 0%, #2d5fb8 100%)', fg: '#ffffff' }, // blue
  { bg: 'linear-gradient(135deg, #b07cd8 0%, #6f3ea4 100%)', fg: '#ffffff' }, // purple
  { bg: 'linear-gradient(135deg, #3d566b 0%, #14242f 100%)', fg: '#ffffff' }, // graphite
];

function hash(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = (h * 33) ^ seed.charCodeAt(i);
  return Math.abs(h);
}

function initialsOf(name: string | null | undefined, fallback: string | null | undefined): string {
  const src = (name?.trim() || fallback?.trim() || '?');
  // Prefer two-letter initials from "First Last"; fall back to first char.
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

interface AvatarProps {
  name?: string | null;
  email?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ name, email, size = 'md', className = '' }: AvatarProps) {
  const seed = (email ?? name ?? '?').toLowerCase();
  const palette = PALETTE[hash(seed) % PALETTE.length]!;
  const sizeClass = size === 'sm' ? 'avatar-sm' : size === 'lg' ? 'avatar-lg' : '';

  return (
    <span
      className={`avatar ${sizeClass} ${className}`}
      style={{ background: palette.bg, color: palette.fg }}
      aria-label={name ?? email ?? 'User'}
    >
      {initialsOf(name, email)}
    </span>
  );
}
