// Theme primitive — light/dark with localStorage persistence and `system`
// auto-follow. Designed to coexist with the no-flash init script in index.html
// (see `applyInitialTheme` inline there).
//
// API:
//   getStoredTheme()                — 'light' | 'dark' | 'system'
//   setTheme(t)                     — persist + apply to <html>
//   useTheme()                      — React hook for components
//   subscribeThemeChange(handler)   — non-React subscription

import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'ozly.org.theme';

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}

export function resolveTheme(t: Theme): ResolvedTheme {
  return t === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : t;
}

/** Apply the resolved theme to <html> and persist the user's preference. */
export function setTheme(t: Theme): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, t);
  const resolved = resolveTheme(t);
  const html = document.documentElement;
  // Add a transition-only class for the swap then remove it so live
  // interactions don't constantly run a 240ms ease.
  html.classList.add('theme-fade');
  html.setAttribute('data-theme', resolved);
  window.setTimeout(() => html.classList.remove('theme-fade'), 260);
  notify();
}

type Listener = () => void;
const listeners = new Set<Listener>();
function notify(): void { listeners.forEach((l) => l()); }

export function subscribeThemeChange(handler: Listener): () => void {
  listeners.add(handler);
  return () => { listeners.delete(handler); };
}

// React hook — returns [storedPref, resolved, setPref].
export function useTheme(): {
  pref: Theme;
  resolved: ResolvedTheme;
  set: (t: Theme) => void;
} {
  const [pref, setPref] = useState<Theme>(() => getStoredTheme());
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    typeof document !== 'undefined'
      ? ((document.documentElement.getAttribute('data-theme') as ResolvedTheme) || 'light')
      : 'light',
  );

  useEffect(() => {
    const unsub = subscribeThemeChange(() => {
      setPref(getStoredTheme());
      setResolved(
        (document.documentElement.getAttribute('data-theme') as ResolvedTheme) || 'light',
      );
    });

    // When preference is `system`, follow OS changes live.
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystem = () => {
      if (getStoredTheme() === 'system') {
        setTheme('system'); // re-applies + notifies
      }
    };
    mq.addEventListener('change', onSystem);

    return () => {
      unsub();
      mq.removeEventListener('change', onSystem);
    };
  }, []);

  return { pref, resolved, set: setTheme };
}
