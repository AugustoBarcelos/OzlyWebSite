import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Card,
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
} from '@tremor/react';
import { Spinner } from './Spinner';
import { useToast } from './Toast';
import { formatRelativeTime } from '@/lib/format';
import {
  fetchAppErrors,
  markErrorSignature,
  type AppErrorRow,
  type TriageStatus,
} from '@/lib/appTriage';

/**
 * "App Triage" section — sits below the Sentry section on /errors.
 *
 * Data source: public.app_events (Supabase) grouped by message signature,
 * joined with public.admin_error_signatures for triage state. The RPC
 * `admin_errors_with_status` does both the aggregation and the join.
 *
 * Why a separate section from Sentry: Sentry has stack traces and release
 * mapping but no triage state we control. app_events has structured metadata
 * (screen, operation, app_version, build_number, platform) from the client
 * AppErrorHandler, which lets us auto-reopen a "fixed" signature when a
 * regression lands on a newer build.
 */

const PERIODS: ReadonlyArray<{ days: number; short: number; label: string }> = [
  { days: 2, short: 1, label: '2d' },
  { days: 7, short: 2, label: '7d' },
  { days: 30, short: 7, label: '30d' },
];

const STATUS_FILTERS: ReadonlyArray<{ key: string; label: string; value: TriageStatus[] | null }> = [
  { key: 'actionable', label: 'Open + fixed', value: ['open', 'fixed'] },
  { key: 'open', label: 'Open only', value: ['open'] },
  { key: 'all', label: 'All', value: null },
];

function statusBadge(status: TriageStatus): {
  color: 'red' | 'emerald' | 'gray' | 'yellow';
  label: string;
} {
  switch (status) {
    case 'open':
      return { color: 'red', label: 'open' };
    case 'fixed':
      return { color: 'emerald', label: 'fixed' };
    case 'wontfix':
      return { color: 'yellow', label: 'wontfix' };
    case 'noise':
      return { color: 'gray', label: 'noise' };
  }
}

export function AppTriageSection() {
  const { toast } = useToast();
  const [periodIdx, setPeriodIdx] = useState(1); // default 7d
  const [statusFilterKey, setStatusFilterKey] = useState<string>('actionable');
  const [rows, setRows] = useState<AppErrorRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutatingSig, setMutatingSig] = useState<string | null>(null);

  const period = PERIODS[periodIdx] ?? PERIODS[1]!;
  const statusFilter = useMemo(
    () => STATUS_FILTERS.find((f) => f.key === statusFilterKey) ?? STATUS_FILTERS[0]!,
    [statusFilterKey],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetchAppErrors({
        periodDays: period.days,
        shortWindow: period.short,
        limit: 100,
        status: statusFilter.value,
      });
      setRows(resp.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load app errors');
      setRows(null);
    } finally {
      setLoading(false);
    }
  }, [period.days, period.short, statusFilter.value]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleMark = useCallback(
    async (
      row: AppErrorRow,
      status: TriageStatus,
      opts: { askBuild?: boolean; askNotes?: boolean } = {},
    ) => {
      let fixedInBuild: number | null = null;
      if (opts.askBuild) {
        const input = window.prompt(
          'Build number that ships the fix (e.g. 411):',
          row.fixed_in_build ? String(row.fixed_in_build) : '',
        );
        if (input === null) return;
        const parsed = Number.parseInt(input.trim(), 10);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          toast({ title: 'Invalid build number', variant: 'error' });
          return;
        }
        fixedInBuild = parsed;
      }
      let fixNotes: string | null = null;
      if (opts.askNotes) {
        fixNotes =
          window.prompt('Optional fix notes (file:line, PR, etc):', row.fix_notes ?? '') ||
          null;
      }
      setMutatingSig(row.signature);
      try {
        await markErrorSignature({
          signature: row.signature,
          status,
          fixedInBuild,
          fixNotes,
        });
        toast({
          title: `Marked "${status}"`,
          description: row.message.slice(0, 80),
          variant: 'success',
        });
        await reload();
      } catch (e) {
        const description = e instanceof Error ? e.message : '';
        toast({
          title: 'Action failed',
          ...(description ? { description } : {}),
          variant: 'error',
        });
      } finally {
        setMutatingSig(null);
      }
    },
    [reload, toast],
  );

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Text className="font-medium text-navy-700">App Triage</Text>
          <Text className="text-xs text-navy-400">
            Grouped from <code>public.app_events</code> · status persists in{' '}
            <code>admin_error_signatures</code> · auto-reopens on regression.
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TabGroup index={periodIdx} onIndexChange={setPeriodIdx}>
            <TabList variant="solid">
              {PERIODS.map((p) => (
                <Tab key={p.label}>{p.label}</Tab>
              ))}
            </TabList>
          </TabGroup>
          <select
            value={statusFilterKey}
            onChange={(e) => setStatusFilterKey(e.target.value)}
            className="rounded-md border border-navy-100 bg-white px-2 py-1.5 text-xs text-navy-700 shadow-sm"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              void reload();
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 shadow-sm transition-colors hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Spinner size="sm" /> : null}
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800"
        >
          {error}
        </div>
      )}

      {loading && !rows ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded bg-navy-50" />
          ))}
        </div>
      ) : !rows || rows.length === 0 ? (
        <div className="mt-4 flex h-32 items-center justify-center rounded-md border border-dashed border-navy-100 bg-navy-50 text-sm text-navy-400">
          No app-side errors for this filter.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Message</TableHeaderCell>
                <TableHeaderCell>Screen / Op</TableHeaderCell>
                <TableHeaderCell className="text-right">
                  {period.label}
                </TableHeaderCell>
                <TableHeaderCell className="text-right">
                  {period.short}d
                </TableHeaderCell>
                <TableHeaderCell className="text-right">Users</TableHeaderCell>
                <TableHeaderCell>Versions</TableHeaderCell>
                <TableHeaderCell>Fix build</TableHeaderCell>
                <TableHeaderCell>Last seen</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const badge = statusBadge(row.status);
                const busy = mutatingSig === row.signature;
                const screenOp = [
                  (row.screens ?? []).join(', '),
                  (row.operations ?? []).join(', '),
                ]
                  .filter((s) => s.length > 0)
                  .join(' / ');
                const versions = (row.app_versions ?? []).join(', ');
                return (
                  <TableRow key={row.signature}>
                    <TableCell>
                      <Badge color={badge.color} size="xs">
                        {badge.label}
                      </Badge>
                      {row.reopened_at && row.status === 'open' && (
                        <Badge
                          color="orange"
                          size="xs"
                          className="ml-1"
                          tooltip="Reopened by regression detection"
                        >
                          regressed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <span
                        className="block truncate text-navy-700"
                        title={row.message}
                      >
                        {row.message}
                      </span>
                      {row.fix_notes && (
                        <span className="block truncate text-xs text-navy-400" title={row.fix_notes}>
                          note: {row.fix_notes}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span className="block truncate text-navy-400" title={screenOp}>
                        {screenOp || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.occurrences.toLocaleString('en-AU')}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.occ_short.toLocaleString('en-AU')}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.users.toLocaleString('en-AU')}
                    </TableCell>
                    <TableCell className="max-w-[10rem]">
                      <span className="block truncate text-xs text-navy-400" title={versions}>
                        {versions || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-navy-500">
                      {row.fixed_in_build != null ? `+${row.fixed_in_build}` : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-navy-400">
                      {formatRelativeTime(row.last_seen)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {row.status !== 'fixed' && (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                void handleMark(row, 'fixed', {
                                  askBuild: true,
                                  askNotes: true,
                                });
                              }}
                              className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                              title="Fix shipped in a specific app build; auto-reopens if a newer build still throws this"
                            >
                              Fixed (build)
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                void handleMark(row, 'fixed', { askNotes: true });
                              }}
                              className="rounded border border-emerald-200 bg-white px-2 py-0.5 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                              title="Backend/config fix; no auto-reopen logic"
                            >
                              Fixed (backend)
                            </button>
                          </>
                        )}
                        {row.status !== 'noise' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              void handleMark(row, 'noise');
                            }}
                            className="rounded border border-navy-200 bg-white px-2 py-0.5 text-xs text-navy-600 hover:bg-navy-50 disabled:opacity-50"
                          >
                            Noise
                          </button>
                        )}
                        {row.status !== 'open' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              void handleMark(row, 'open');
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
  );
}
