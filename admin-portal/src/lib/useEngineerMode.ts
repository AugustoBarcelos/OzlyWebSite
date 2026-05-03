import { useEffect, useState } from 'react';

const KEY = 'ozly-admin-engineer-mode';

function read(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function write(v: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, v ? '1' : '0');
  } catch {
    /* ignore */
  }
}

let listeners = new Set<(v: boolean) => void>();

function notify(v: boolean): void {
  listeners.forEach((l) => l(v));
}

/**
 * Engineer mode — when ON, pages render `<RawDataPanel/>` slots showing
 * the raw RPC payload, source RPCs, params used, etc.
 *
 * Persisted in localStorage. Toggleable via `r` key (when not in input).
 *
 * Cross-tab sync: storage events update other tabs automatically; in-tab
 * subscribers notified via internal listener set.
 */
export function useEngineerMode() {
  const [enabled, setEnabled] = useState<boolean>(read);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setEnabled(e.newValue === '1');
    };
    const onLocal = (v: boolean) => setEnabled(v);
    listeners.add(onLocal);
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(onLocal);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const toggle = () => {
    const next = !enabled;
    write(next);
    setEnabled(next);
    notify(next);
  };

  return { enabled, toggle };
}

/**
 * Mounted once in Layout — registers the `r` keyboard shortcut globally.
 */
export function useEngineerModeShortcut() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        (target as HTMLElement | null)?.isContentEditable;
      if (isInput) return;
      // Ignore when chord handling: don't fire on `g` follow-ups, modifiers, etc.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === 'r' && !e.shiftKey) {
        e.preventDefault();
        const next = !read();
        write(next);
        notify(next);
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, []);
}
