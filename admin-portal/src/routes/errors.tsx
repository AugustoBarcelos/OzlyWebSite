import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Card,
  Grid,
  Tab,
  TabGroup,
  TabList,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  Title,
} from '@tremor/react';
import { KpiCard } from '@/components/KpiCard';
import { AlertTriangleIcon, ExternalLinkIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { AppTriageSection } from '@/components/AppTriageSection';
import { useToast } from '@/components/Toast';
import { formatRelativeTime } from '@/lib/format';
import {
  fetchEventCounts,
  fetchRecentReleases,
  fetchTopIssues,
  getLastError as sentryLastError,
  isConfigured as sentryIsConfigured,
  isOriginBlocked as sentryOriginBlocked,
  sentryWebBase,
  updateIssueStatus,
  type IssueMutation,
  type SentryEventCounts,
  type SentryIssue,
  type SentryPeriod,
  type SentryRelease,
} from '@/lib/sentry-api';

/**
 * BRIEFING § 11 (Wave 6) — `/errors`.
 *
 * Portal-wide aggregated view of mobile-app Sentry errors. Complements the
 * per-user "Errors" tab in User 360 (which just deep-links to a filtered
 * Sentry search) by giving on-call admins a single screen with:
 *
 *  - Event-count KPIs (24h / 7d / 30d) with deltas vs previous matching window
 *  - Top issues table for the selected period (severity, title, culprit,
 *    counts, last-seen)
 *  - Quick-link cards out to Sentry / PostHog when the API token is missing
 *
 * Two operating modes:
 *  - Configured: fetches REST API data, refreshes on period change
 *  - Not configured (default): renders the same layout but with link-only
 *    cards explaining how to set `VITE_SENTRY_API_TOKEN`
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Top-issues endpoint only accepts 24h / 14d on the Developer plan.
// The KPI cards above use stats_v2 which does accept 30d — so the period
// selector here scoping just the issues list is the right shape.
const PERIODS: ReadonlyArray<{ key: SentryPeriod; label: string }> = [
  { key: '24h', label: '24h' },
  { key: '14d', label: '14d' },
];

interface KpiSlotState {
  data: SentryEventCounts | null;
  loading: boolean;
}

const EMPTY_KPI: KpiSlotState = { data: null, loading: false };

// ---------------------------------------------------------------------------
// Severity badge — Sentry levels are: fatal | error | warning | info | debug
// ---------------------------------------------------------------------------

function severityColor(
  level: string,
): 'red' | 'orange' | 'yellow' | 'blue' | 'gray' {
  switch (level.toLowerCase()) {
    case 'fatal':
      return 'red';
    case 'error':
      return 'orange';
    case 'warning':
      return 'yellow';
    case 'info':
      return 'blue';
    default:
      return 'gray';
  }
}

// ---------------------------------------------------------------------------
// Sentry web links (used in both modes — quick exits to the source of truth)
// ---------------------------------------------------------------------------

interface QuickLink {
  label: string;
  href: string;
  hint: string;
}

function buildSentryQuickLinks(): QuickLink[] {
  const base = sentryWebBase();
  return [
    {
      label: 'Open all issues',
      href: `${base}/issues/`,
      hint: 'All unresolved issues in Sentry',
    },
    {
      label: 'Issues last 24h',
      href: `${base}/issues/?statsPeriod=24h&sort=freq`,
      hint: 'Most frequent issues in the last 24 hours',
    },
    {
      label: 'Highest user impact',
      href: `${base}/issues/?statsPeriod=14d&sort=user`,
      hint: 'Sorted by users affected',
    },
    {
      label: 'Critical only',
      href: `${base}/issues/?query=level%3Afatal`,
      hint: 'Fatal-level events only',
    },
  ];
}

function buildExternalToolLinks(): QuickLink[] {
  const base = sentryWebBase();
  return [
    {
      label: 'Releases',
      href: `${base}/releases/`,
      hint: 'Helpful for "did this just regress?"',
    },
    {
      label: 'Alerts',
      href: `${base}/alerts/`,
      hint: 'Alert rules and recent triggers',
    },
    {
      label: 'PostHog',
      href: 'https://eu.posthog.com',
      hint: 'Cross-reference behavior with errors',
    },
  ];
}

// ---------------------------------------------------------------------------
// Compute a delta ratio used by KpiCard. Returns undefined when previous is 0.
// ---------------------------------------------------------------------------

function computeDelta(counts: SentryEventCounts | null): number | undefined {
  if (!counts) return undefined;
  if (counts.previous === 0) return undefined;
  return (counts.count - counts.previous) / counts.previous;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ErrorsPage() {
  // `configured` here means "we should actually try to render Sentry data".
  // Falls back to false when Sentry returns "Invalid origin" — Personal
  // Tokens can't be used from the browser at this org, and the UI degrades
  // to link-only cards instead of looping a red error banner.
  const [originBlocked, setOriginBlocked] = useState(sentryOriginBlocked());
  const configured = sentryIsConfigured() && !originBlocked;

  // Hero KPIs — independent slots so a partial failure doesn't blank them all.
  const [kpi24h, setKpi24h] = useState<KpiSlotState>(EMPTY_KPI);
  const [kpi7d, setKpi7d] = useState<KpiSlotState>(EMPTY_KPI);
  const [kpi30d, setKpi30d] = useState<KpiSlotState>(EMPTY_KPI);

  // Top-issues table state.
  const [period, setPeriod] = useState<SentryPeriod>('24h');
  const [issues, setIssues] = useState<SentryIssue[] | null>(null);
  const [issuesLoading, setIssuesLoading] = useState<boolean>(false);
  const [issuesError, setIssuesError] = useState<string | null>(null);

  // Recent Sentry releases — used as suggestions when the operator picks
  // "Resolve in release". Loaded once when configured; failures are silent
  // because the fallback is "type the release name".
  const [releases, setReleases] = useState<SentryRelease[]>([]);
  const [mutatingIssueId, setMutatingIssueId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAllKpis = useCallback(async () => {
    if (!configured) return;
    setKpi24h({ data: null, loading: true });
    setKpi7d({ data: null, loading: true });
    setKpi30d({ data: null, loading: true });

    const [r24, r14, r30] = await Promise.all([
      fetchEventCounts('24h'),
      fetchEventCounts('14d'),
      fetchEventCounts('30d'),
    ]);
    setKpi24h({ data: r24, loading: false });
    setKpi7d({ data: r14, loading: false });
    setKpi30d({ data: r30, loading: false });
    if (sentryOriginBlocked()) setOriginBlocked(true);
  }, [configured]);

  const fetchIssues = useCallback(
    async (p: SentryPeriod) => {
      if (!configured) {
        setIssues(null);
        setIssuesLoading(false);
        return;
      }
      setIssuesLoading(true);
      setIssuesError(null);
      try {
        const rows = await fetchTopIssues(p, 10);
        if (rows === null) {
          // Origin-blocked: degrade silently to link-only mode. Flip the
          // configured flag so the rest of the section renders the same as
          // when no token is present.
          if (sentryOriginBlocked()) {
            setOriginBlocked(true);
            setIssues(null);
            return;
          }
          // Surface the actual Sentry API error (e.g. "Sentry API 400 Bad
          // Request" with details) instead of a generic "check scopes" hint.
          const detail = sentryLastError();
          setIssuesError(
            detail
              ? `Could not load issues from Sentry. ${detail}`
              : 'Could not load issues from Sentry. Check token scopes (org:read project:read event:read).',
          );
          setIssues(null);
        } else {
          setIssues(rows);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        setIssuesError(msg);
        setIssues(null);
      } finally {
        setIssuesLoading(false);
      }
    },
    [configured],
  );

  useEffect(() => {
    void fetchAllKpis();
  }, [fetchAllKpis]);

  useEffect(() => {
    void fetchIssues(period);
  }, [fetchIssues, period]);

  // Hydrate the recent-releases list. Done lazily and tolerantly — used only
  // as a hint when the operator clicks "Resolve in release".
  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    void (async () => {
      const rows = await fetchRecentReleases(15);
      if (!cancelled && rows) setReleases(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [configured]);

  /**
   * Mutate a single Sentry issue. For `resolveInRelease` we prompt the
   * operator with the most recent releases as a hint — they paste / pick one.
   * Other actions go through without confirmation.
   */
  const handleMutate = useCallback(
    async (issue: SentryIssue, action: IssueMutation['action']) => {
      let mutation: IssueMutation;
      if (action === 'resolveInRelease') {
        const hint = releases
          .slice(0, 5)
          .map((r) => r.shortVersion)
          .join('\n');
        const defaultRelease = releases[0]?.version ?? '';
        const input = window.prompt(
          hint
            ? `Release name (recent):\n${hint}\n\nPaste/type the full release identifier:`
            : 'Release name (full identifier, e.g. com.augusto.ozly@1.0.18+411):',
          defaultRelease,
        );
        if (input === null) return;
        const release = input.trim();
        if (!release) {
          toast({ title: 'Release name required', variant: 'error' });
          return;
        }
        mutation = { action: 'resolveInRelease', release };
      } else if (action === 'resolve') {
        mutation = { action: 'resolve' };
      } else if (action === 'ignore') {
        mutation = { action: 'ignore' };
      } else {
        mutation = { action: 'reopen' };
      }

      setMutatingIssueId(issue.id);
      try {
        const ok = await updateIssueStatus(issue.id, mutation);
        if (!ok) {
          const detail = sentryLastError();
          toast({
            title: 'Sentry mutation failed',
            ...(detail ? { description: detail } : {}),
            variant: 'error',
          });
          return;
        }
        toast({
          title: `Issue ${
            mutation.action === 'reopen'
              ? 'reopened'
              : mutation.action === 'ignore'
                ? 'ignored'
                : 'resolved'
          }`,
          description: issue.shortId || issue.id,
          variant: 'success',
        });
        await fetchIssues(period);
      } finally {
        setMutatingIssueId(null);
      }
    },
    [releases, fetchIssues, period, toast],
  );

  const periodIndex = PERIODS.findIndex((p) => p.key === period);
  const sentryQuickLinks = useMemo(buildSentryQuickLinks, []);
  const externalToolLinks = useMemo(buildExternalToolLinks, []);

  const subtitleNotConfigured = 'Configure Sentry API token to enable';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangleIcon className="h-5 w-5 text-amber-500" />
          <Title>Errors</Title>
        </div>

        {configured && (
          <button
            type="button"
            onClick={() => {
              void fetchAllKpis();
              void fetchIssues(period);
            }}
            disabled={issuesLoading}
            className="inline-flex items-center gap-2 self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 shadow-sm transition-colors hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          >
            {issuesLoading ? <Spinner size="sm" /> : null}
            Refresh
          </button>
        )}
      </div>

      {/* Educational banner when not configured (or origin-blocked) */}
      {!configured && (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>
            {originBlocked ? (
              <>
                <strong className="font-semibold">
                  Sentry blocks Personal Auth Tokens from the browser.
                </strong>{' '}
                Use the quick links below, or proxy the REST API through a
                Cloudflare Worker that injects the token server-side.
              </>
            ) : (
              <>
                <strong className="font-semibold">
                  Sentry data is not wired up.
                </strong>{' '}
                Add{' '}
                <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">
                  VITE_SENTRY_API_TOKEN
                </code>
                ,{' '}
                <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">
                  VITE_SENTRY_ORG
                </code>{' '}
                and{' '}
                <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">
                  VITE_SENTRY_PROJECT
                </code>{' '}
                to enable in-portal data. Until then, use the quick links below.
              </>
            )}
          </span>
          <a
            href="https://sentry.io/settings/account/api/auth-tokens/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 self-start rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 shadow-sm transition-colors hover:bg-amber-100 sm:self-auto"
          >
            Create token
            <ExternalLinkIcon className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {/* Hero KPI row */}
      <section aria-label="Error KPI snapshot">
        <Grid numItemsSm={1} numItemsMd={3} className="gap-4">
          <KpiCard
            title="Errors (24h)"
            value={kpi24h.data?.count ?? null}
            {...(computeDelta(kpi24h.data) !== undefined
              ? { delta: computeDelta(kpi24h.data) as number }
              : {})}
            isIncreasePositive={false}
            loading={kpi24h.loading}
            subtitle={
              configured
                ? kpi24h.data
                  ? 'Total error events vs previous 24h'
                  : 'No data yet'
                : subtitleNotConfigured
            }
          />
          <KpiCard
            title="Errors (14d)"
            value={kpi7d.data?.count ?? null}
            {...(computeDelta(kpi7d.data) !== undefined
              ? { delta: computeDelta(kpi7d.data) as number }
              : {})}
            isIncreasePositive={false}
            loading={kpi7d.loading}
            subtitle={
              configured
                ? kpi7d.data
                  ? 'Total error events vs previous 14d'
                  : 'No data yet'
                : subtitleNotConfigured
            }
          />
          <KpiCard
            title="Errors (30d)"
            value={kpi30d.data?.count ?? null}
            {...(computeDelta(kpi30d.data) !== undefined
              ? { delta: computeDelta(kpi30d.data) as number }
              : {})}
            isIncreasePositive={false}
            loading={kpi30d.loading}
            subtitle={
              configured
                ? kpi30d.data
                  ? 'Total error events vs previous 30d'
                  : 'No data yet'
                : subtitleNotConfigured
            }
          />
        </Grid>
      </section>

      {/* Top Issues */}
      <section aria-label="Top issues">
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Text className="font-medium text-navy-700">Top Issues</Text>
              <Text className="text-xs text-navy-400">
                Most frequent issues in the selected period.
              </Text>
            </div>
            <TabGroup
              index={periodIndex === -1 ? 0 : periodIndex}
              onIndexChange={(i) => {
                const next = PERIODS[i];
                if (next) setPeriod(next.key);
              }}
            >
              <TabList variant="solid">
                {PERIODS.map((p) => (
                  <Tab key={p.key}>{p.label}</Tab>
                ))}
              </TabList>
            </TabGroup>
          </div>

          {/* Error banner */}
          {issuesError && (
            <div
              role="alert"
              className="mt-4 flex flex-col gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
            >
              <span>
                <strong className="font-semibold">Sentry API error:</strong>{' '}
                {issuesError}
              </span>
              <button
                type="button"
                onClick={() => {
                  void fetchIssues(period);
                }}
                className="inline-flex items-center self-start rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 shadow-sm transition-colors hover:bg-red-100 sm:self-auto"
              >
                Retry
              </button>
            </div>
          )}

          {/* Body */}
          {!configured ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {sentryQuickLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start justify-between gap-3 rounded-md border border-navy-100 bg-white p-3 text-sm text-navy-600 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50/40"
                >
                  <span className="flex flex-col">
                    <span className="font-medium text-navy-700">
                      {link.label}
                    </span>
                    <span className="mt-0.5 text-xs text-navy-400">
                      {link.hint}
                    </span>
                  </span>
                  <ExternalLinkIcon className="mt-1 h-4 w-4 shrink-0 text-navy-300 group-hover:text-brand-500" />
                </a>
              ))}
            </div>
          ) : issuesLoading && !issues ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 w-full animate-pulse rounded bg-navy-50"
                />
              ))}
            </div>
          ) : !issues || issues.length === 0 ? (
            <div className="mt-4 flex h-32 items-center justify-center rounded-md border border-dashed border-navy-100 bg-navy-50 text-sm text-navy-400">
              No issues for this period.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Severity</TableHeaderCell>
                    <TableHeaderCell>Title</TableHeaderCell>
                    <TableHeaderCell>Culprit</TableHeaderCell>
                    <TableHeaderCell className="text-right">
                      Count
                    </TableHeaderCell>
                    <TableHeaderCell className="text-right">
                      Users
                    </TableHeaderCell>
                    <TableHeaderCell>Last seen</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {issues.map((issue) => {
                    const busy = mutatingIssueId === issue.id;
                    const statusBadgeColor =
                      issue.status === 'resolved'
                        ? 'emerald'
                        : issue.status === 'ignored'
                          ? 'gray'
                          : 'red';
                    return (
                      <TableRow key={issue.id}>
                        <TableCell>
                          <Badge color={statusBadgeColor} size="xs">
                            {issue.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge color={severityColor(issue.level)} size="xs">
                            {issue.level || 'error'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {issue.permalink ? (
                            <a
                              href={issue.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block truncate text-brand-600 hover:underline"
                              title={issue.title}
                            >
                              {issue.shortId
                                ? `${issue.shortId} · ${issue.title}`
                                : issue.title}
                            </a>
                          ) : (
                            <span
                              className="block truncate text-navy-600"
                              title={issue.title}
                            >
                              {issue.title}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <span
                            className="block truncate text-navy-400"
                            title={issue.culprit}
                          >
                            {issue.culprit || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {issue.count.toLocaleString('en-AU')}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {issue.userCount.toLocaleString('en-AU')}
                        </TableCell>
                        <TableCell className="text-navy-400">
                          {formatRelativeTime(issue.lastSeen)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {issue.status !== 'resolved' && (
                              <>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => {
                                    void handleMutate(issue, 'resolveInRelease');
                                  }}
                                  className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                                  title="Mark resolved against a specific Sentry release; auto-reopens if newer build still throws this"
                                >
                                  Resolve (release)
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => {
                                    void handleMutate(issue, 'resolve');
                                  }}
                                  className="rounded border border-emerald-200 bg-white px-2 py-0.5 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                                  title="Mark resolved without release tracking"
                                >
                                  Resolve
                                </button>
                              </>
                            )}
                            {issue.status !== 'ignored' && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  void handleMutate(issue, 'ignore');
                                }}
                                className="rounded border border-navy-200 bg-white px-2 py-0.5 text-xs text-navy-600 hover:bg-navy-50 disabled:opacity-50"
                              >
                                Ignore
                              </button>
                            )}
                            {issue.status !== 'unresolved' && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  void handleMutate(issue, 'reopen');
                                }}
                                className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                              >
                                Reopen
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </section>

      {/* App-side triage — populated from public.app_events with persistent
          status per signature. Independent from Sentry. */}
      <section aria-label="App triage">
        <AppTriageSection />
      </section>

      {/* External tools row */}
      <section aria-label="External tools">
        <Card>
          <Text className="font-medium text-navy-700">External tools</Text>
          <Text className="text-xs text-navy-400">
            Cross-reference releases, alert rules, and behavioral analytics.
          </Text>
          <div className="mt-3 flex flex-wrap gap-2">
            {externalToolLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                title={link.hint}
                className="inline-flex items-center gap-1.5 rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 shadow-sm transition-colors hover:bg-navy-50"
              >
                {link.label}
                <ExternalLinkIcon className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
