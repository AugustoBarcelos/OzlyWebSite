// Remembers the email last typed on the auth screens so the user doesn't have
// to retype it when moving login ⇄ forgot-password, or after a password reset
// bounces them back to /login. An email address isn't a secret and the value
// is session-scoped (cleared when the tab closes), so this is safe to persist.
const KEY = 'ozly-org-last-email';

/** Persist the email (trimmed). No-ops on empty input or storage failure. */
export function rememberEmail(email: string): void {
  try {
    const trimmed = email.trim();
    if (trimmed) sessionStorage.setItem(KEY, trimmed);
  } catch {
    // sessionStorage can throw (private mode, disabled storage) — pre-fill is
    // a convenience, never a requirement, so swallow.
  }
}

/** Read the remembered email, or '' if none / unavailable. */
export function recallEmail(): string {
  try {
    return sessionStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}
