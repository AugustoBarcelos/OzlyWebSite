/**
 * Formatting helpers for the admin portal.
 *
 * Locale: en-AU (the product is Australia-only). All numeric helpers
 * return "—" when the input is null / undefined / NaN — admin RPCs
 * frequently return null for metrics that depend on RevenueCat sync.
 */

const EN_AU = 'en-AU';

/** True when v is null, undefined, or NaN. */
function isMissing(v: number | null | undefined): v is null | undefined {
  return v === null || v === undefined || Number.isNaN(v);
}

/**
 * Locale en-AU integer formatting (e.g. 12345 → "12,345").
 * Returns "—" for null / undefined.
 */
export function formatNumber(n: number | null | undefined): string {
  if (isMissing(n)) return '—';
  return n.toLocaleString(EN_AU, { maximumFractionDigits: 0 });
}

/**
 * Currency formatting in AUD with no decimals (e.g. 1234 → "$1,234").
 * Returns "—" for null / undefined.
 */
export function formatCurrencyAUD(n: number | null | undefined): string {
  if (isMissing(n)) return '—';
  return n.toLocaleString(EN_AU, {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
}

/**
 * Safe percentage of `num / denom`, formatted with one decimal.
 * Returns "—" when either side is null / NaN, or the denom is 0.
 */
export function formatPercent(
  num: number | null | undefined,
  denom: number | null | undefined,
): string {
  if (isMissing(num) || isMissing(denom)) return '—';
  if (denom === 0) return '—';
  const pct = (num / denom) * 100;
  if (!Number.isFinite(pct)) return '—';
  return `${pct.toLocaleString(EN_AU, { maximumFractionDigits: 1 })}%`;
}

/**
 * Tiny relative-time formatter. Avoids pulling in date-fns / dayjs.
 *
 * Accepts a Date, ISO string, or epoch ms. Returns short forms like
 * "just now", "3 min ago", "2 hours ago", "yesterday", "5 days ago".
 *
 * Returns "—" if the input is unparseable.
 */
export function formatRelativeTime(input: Date | string | number | null | undefined): string {
  if (input === null || input === undefined) return '—';
  const d = input instanceof Date ? input : new Date(input);
  const ms = d.getTime();
  if (!Number.isFinite(ms)) return '—';

  const diffSec = Math.round((Date.now() - ms) / 1000);
  if (diffSec < 0) {
    // Future timestamp — likely clock skew on a fresh snapshot. Treat as "now".
    return 'just now';
  }
  if (diffSec < 45) return 'just now';
  if (diffSec < 90) return '1 min ago';

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;

  const diffDay = Math.round(diffHour / 24);
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 30) return `${diffDay} days ago`;

  const diffMonth = Math.round(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} month${diffMonth === 1 ? '' : 's'} ago`;

  const diffYear = Math.round(diffDay / 365);
  return `${diffYear} year${diffYear === 1 ? '' : 's'} ago`;
}
