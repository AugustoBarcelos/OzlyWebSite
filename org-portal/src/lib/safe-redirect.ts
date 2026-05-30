// Pure helper: normalises an attacker-controlled `?from=` query value into a
// safe in-app redirect target. Refuses anything that resolves to a different
// origin from `currentOrigin` (kills protocol-relative URLs, backslash
// tricks, Unicode-encoded variants, etc.).
//
// Returns the fallback when the input is empty, doesn't start with '/', or
// resolves to a different origin.

export function safeRedirect(
  rawFrom: string | null | undefined,
  currentOrigin: string,
  fallback = '/invoices',
): string {
  if (!rawFrom || rawFrom[0] !== '/') return fallback;
  try {
    const parsed = new URL(rawFrom, currentOrigin);
    if (parsed.origin !== currentOrigin) return fallback;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}
