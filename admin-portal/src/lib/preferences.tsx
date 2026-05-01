import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { callRpc, RpcError } from './rpc';

/**
 * Admin preferences (timezone, default period, currency display, notification email).
 *
 * Loaded once from `admin_get_preferences()` on app mount, exposed via context.
 * Updates persist via `admin_set_preferences(patch)`.
 *
 * Use `useFormatDate()`, `useFormatRelativeTime()`, `useDefaultPeriod()` derived
 * hooks pra formatação consistente em todo o portal.
 */

export interface Preferences {
  timezone?: string;
  default_period_days?: number;
  currency_display?: 'AUD' | 'BRL' | 'USD';
  notification_email?: string;
}

const DEFAULTS: Required<Pick<Preferences, 'timezone' | 'default_period_days' | 'currency_display'>> = {
  timezone: 'Australia/Sydney',
  default_period_days: 30,
  currency_display: 'AUD',
};

interface PrefsContextValue {
  prefs: Preferences;
  loading: boolean;
  refresh: () => Promise<void>;
  update: (patch: Preferences) => Promise<void>;
}

const PrefsContext = createContext<PrefsContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const p = await callRpc<Preferences>('admin_get_preferences', {});
      setPrefs(p ?? {});
    } catch (e) {
      // Silent — RPC may not exist in this env (older deployment) or not authed yet.
      if (!(e instanceof RpcError)) {
        // eslint-disable-next-line no-console
        console.warn('[preferences] failed to load', e);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (patch: Preferences) => {
    try {
      const updated = await callRpc<Preferences>('admin_set_preferences', {
        p_patch: patch,
      });
      setPrefs(updated);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[preferences] failed to update', e);
      throw e;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<PrefsContextValue>(
    () => ({ prefs, loading, refresh, update }),
    [prefs, loading, refresh, update],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePreferences(): PrefsContextValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) {
    throw new Error('usePreferences must be used inside <PreferencesProvider>');
  }
  return ctx;
}

/** Effective values with defaults filled. */
export function useResolvedPrefs(): Required<
  Pick<Preferences, 'timezone' | 'default_period_days' | 'currency_display'>
> {
  const { prefs } = usePreferences();
  return {
    timezone: prefs.timezone ?? DEFAULTS.timezone,
    default_period_days: prefs.default_period_days ?? DEFAULTS.default_period_days,
    currency_display: prefs.currency_display ?? DEFAULTS.currency_display,
  };
}

/** Date formatter respecting user timezone. */
export function useFormatDate() {
  const { timezone } = useResolvedPrefs();
  return useCallback(
    (iso: string | null | undefined) => {
      if (!iso) return '—';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '—';
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        timeZone: timezone,
      });
    },
    [timezone],
  );
}

/** Date+time formatter. */
export function useFormatDateTime() {
  const { timezone } = useResolvedPrefs();
  return useCallback(
    (iso: string | null | undefined) => {
      if (!iso) return '—';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '—';
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone,
      });
    },
    [timezone],
  );
}
