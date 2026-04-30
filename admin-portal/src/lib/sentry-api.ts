/**
 * Lightweight Sentry REST API client.
 *
 * BRIEFING § 11 (Wave 6) — surfaces aggregated mobile-app error data inside the
 * admin portal so on-call admins don't need to bounce to sentry.io for every
 * triage. The portal already has its own Sentry SDK init for capturing portal
 * errors (see `src/lib/sentry.ts`); this module is purely about querying the
 * REST API of the *mobile* project to display its data.
 *
 * Authentication: Personal Auth Token (Bearer). The token is exposed at build
 * time via `VITE_SENTRY_API_TOKEN` because Cloudflare Pages doesn't have a
 * server we can proxy through. That means the token is visible to anyone who
 * can reach the admin portal — which is fine, since this whole app is gated
 * behind admin-only auth (BRIEFING § 4) and the token only carries read scopes.
 *
 * All functions return `null` on failure (network error, 4xx/5xx, malformed
 * JSON). The UI is expected to fall back to the quick-link "no data" mode
 * rather than crash. Callers that want to surface a message can inspect
 * `getLastError()`.
 */

import { env } from './env';

const SENTRY_API_BASE = 'https://sentry.io/api/0';

export type SentryPeriod = '24h' | '14d' | '30d';

export interface SentryIssue {
  id: string;
  shortId: string;
  title: string;
  culprit: string;
  level: string;
  count: number;
  userCount: number;
  lastSeen: string;
  permalink: string;
}

export interface SentryEventCounts {
  count: number;
  previous: number;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

let lastErrorMessage: string | null = null;

function setLastError(msg: string | null): void {
  lastErrorMessage = msg;
}

export function getLastError(): string | null {
  return lastErrorMessage;
}

/** True only when token + org + project are all configured. */
export function isConfigured(): boolean {
  return Boolean(
    env.sentryApiToken && env.sentryOrg && env.sentryProject,
  );
}

/**
 * Hostname-aware base for browser-facing Sentry URLs (issue lists, etc).
 * If the org slug is `ozly`, this returns `https://ozly.sentry.io`. The /api/0
 * REST endpoints stay on sentry.io regardless, so we keep them separate.
 */
export function sentryWebBase(): string {
  const org = env.sentryOrg ?? 'organizations';
  return `https://${org}.sentry.io`;
}

interface FetchOptions {
  signal?: AbortSignal;
}

async function fetchSentry<T>(
  path: string,
  opts: FetchOptions = {},
): Promise<T | null> {
  if (!isConfigured()) return null;

  const token = env.sentryApiToken;
  if (!token) return null;

  try {
    const init: RequestInit = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    };
    if (opts.signal) init.signal = opts.signal;

    const res = await fetch(`${SENTRY_API_BASE}${path}`, init);
    if (!res.ok) {
      // Surface the Sentry-provided detail so 400s are diagnosable
      // (otherwise "Sentry API 400" tells the admin nothing).
      let detail = '';
      try {
        const body = await res.text();
        if (body) {
          // Sentry returns JSON like {"detail": "..."} or {"non_field_errors": ["..."]}
          // — accept either, fall back to raw body.
          try {
            const parsed = JSON.parse(body) as Record<string, unknown>;
            detail =
              (typeof parsed.detail === 'string' && parsed.detail) ||
              (Array.isArray(parsed.non_field_errors) &&
                String(parsed.non_field_errors[0])) ||
              body.slice(0, 200);
          } catch {
            detail = body.slice(0, 200);
          }
        }
      } catch {
        /* response body unreadable — fall through */
      }
      const msg = detail
        ? `Sentry API ${res.status}: ${detail}`
        : `Sentry API ${res.status} ${res.statusText}`;
      setLastError(msg);
      // Helpful for paste-in-bug-reports: keep one line in the console too.
      // eslint-disable-next-line no-console
      console.warn('[sentry-api]', path, msg);
      return null;
    }
    const data = (await res.json()) as T;
    setLastError(null);
    return data;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    setLastError(msg);
    return null;
  }
}

function periodToDays(period: SentryPeriod): number {
  if (period === '24h') return 1;
  if (period === '14d') return 14;
  return 30;
}

function periodToStatsParam(period: SentryPeriod): string {
  // Sentry's /stats_v2/ accepts statsPeriod with values like '24h', '7d', '30d'.
  return period;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Aggregate error event counts for a period plus the previous matching window.
 *
 * Uses `/api/0/organizations/{org}/stats_v2/` with `category=error` and
 * `field=sum(quantity)`. We make 2 requests (current + previous) so we can
 * show a delta on the KPI card. If either fetch fails, returns null and the
 * UI falls back to "—".
 */
export async function fetchEventCounts(
  period: SentryPeriod,
  opts: FetchOptions = {},
): Promise<SentryEventCounts | null> {
  if (!isConfigured()) return null;
  const org = env.sentryOrg;
  if (!org) return null;

  const days = periodToDays(period);
  const now = Math.floor(Date.now() / 1000);
  const periodSeconds = days * 24 * 60 * 60;

  const currentParams = new URLSearchParams({
    field: 'sum(quantity)',
    category: 'error',
    interval: '1d',
    statsPeriod: periodToStatsParam(period),
  });
  const prevParams = new URLSearchParams({
    field: 'sum(quantity)',
    category: 'error',
    interval: '1d',
    start: new Date((now - periodSeconds * 2) * 1000).toISOString(),
    end: new Date((now - periodSeconds) * 1000).toISOString(),
  });

  const [current, previous] = await Promise.all([
    fetchSentry<SentryStatsResponse>(
      `/organizations/${encodeURIComponent(org)}/stats_v2/?${currentParams.toString()}`,
      opts,
    ),
    fetchSentry<SentryStatsResponse>(
      `/organizations/${encodeURIComponent(org)}/stats_v2/?${prevParams.toString()}`,
      opts,
    ),
  ]);

  if (!current && !previous) return null;
  return {
    count: aggregateStats(current),
    previous: aggregateStats(previous),
  };
}

/**
 * Top issues sorted by frequency for the period.
 *
 * Uses `/api/0/projects/{org}/{project}/issues/?statsPeriod=...&sort=freq`.
 * Returns at most `limit` items. Each row is sanitized (no HTML, just text).
 */
export async function fetchTopIssues(
  period: SentryPeriod,
  limit = 10,
  opts: FetchOptions = {},
): Promise<SentryIssue[] | null> {
  if (!isConfigured()) return null;
  const org = env.sentryOrg;
  const project = env.sentryProject;
  if (!org || !project) return null;

  // `sort=freq` foi deprecado e devolve 400 em projetos novos; `sort=new` (ou
  // `date`) é o substituto recomendado. `query=is:unresolved` espelha o
  // comportamento padrão do Sentry web — sem ele, o endpoint pode 400 quando
  // o projeto tem grouping rules complexas.
  const params = new URLSearchParams({
    statsPeriod: periodToStatsParam(period),
    sort: 'new',
    query: 'is:unresolved',
    limit: String(limit),
  });

  const data = await fetchSentry<unknown[]>(
    `/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/issues/?${params.toString()}`,
    opts,
  );
  if (!data || !Array.isArray(data)) return null;

  return data.map(parseIssue).filter((x): x is SentryIssue => x !== null);
}

// ---------------------------------------------------------------------------
// Parsing helpers — defensive: never trust the wire shape blindly.
// ---------------------------------------------------------------------------

interface SentryStatsResponse {
  groups?: Array<{
    series?: Record<string, number[]>;
    totals?: Record<string, number>;
  }>;
}

function aggregateStats(stats: SentryStatsResponse | null): number {
  if (!stats || !Array.isArray(stats.groups)) return 0;
  let total = 0;
  for (const group of stats.groups) {
    const t = group?.totals?.['sum(quantity)'];
    if (typeof t === 'number' && Number.isFinite(t)) {
      total += t;
    } else if (group?.series) {
      const series = group.series['sum(quantity)'];
      if (Array.isArray(series)) {
        for (const v of series) {
          if (typeof v === 'number' && Number.isFinite(v)) total += v;
        }
      }
    }
  }
  return total;
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function parseIssue(raw: unknown): SentryIssue | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = asString(r['id']);
  if (!id) return null;
  return {
    id,
    shortId: asString(r['shortId'], id),
    title: asString(r['title'], '(untitled)'),
    culprit: asString(r['culprit']),
    level: asString(r['level'], 'error'),
    count: asNumber(r['count']),
    userCount: asNumber(r['userCount']),
    lastSeen: asString(r['lastSeen']),
    permalink: asString(r['permalink']),
  };
}
