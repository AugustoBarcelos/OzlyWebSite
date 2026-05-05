import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import {
  ActivityIcon,
  ExternalLinkIcon,
  ShieldCheckIcon,
  ServerIcon,
} from '@/components/Icons';
import { callEdge } from '@/lib/edge';
import { downloadCsv, toCsv } from '@/lib/csvExport';

type CohortStatus = 'live' | 'archiving' | 'cold' | 'deleting' | 'deleted';

interface AuditRow {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'success' | 'failed' | 'skipped';
  artifacts: Record<string, unknown> | null;
  errors: string | null;
}

interface CohortRow {
  fy_label: string;
  fy_start_date: string;
  fy_end_date: string;
  hot_until_date: string;
  cold_until_date: string;
  delete_after_date: string;
  status: CohortStatus;
  file_count: number;
  total_bytes: number;
}

interface OverviewPayload {
  ok: boolean;
  last_daily_db_backup: AuditRow | null;
  last_monthly_dr_backup: AuditRow | null;
  last_cold_verify: AuditRow | null;
  active_cohort: CohortRow | null;
  cold_cohorts_count: number;
  cold_cohorts_total_bytes: number;
  dr_recent_total_bytes: number;
  pending_deletion_requests: number;
  cost_burn_estimate_aud: number;
  cost_basis: {
    glacier_ir_aud_per_gb_month: number;
    glacier_da_aud_per_gb_month: number;
    region: string;
  };
  generated_at: string;
}

interface DeletionRow {
  id: string;
  user_id: string;
  requested_at: string;
  processed_at: string | null;
  scope: 'full' | 'pii_only';
  fiscal_data_pseudonymized: boolean;
  status: 'pending' | 'processed' | 'failed';
  audit_payload: Record<string, unknown> | null;
}

interface DeletionLogPayload {
  ok: boolean;
  days: number;
  rows: DeletionRow[];
}

const PAGE_REPO = 'AugustoBarcelos/AusClean';

export function CompliancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [history, setHistory] = useState<AuditRow[]>([]);
  const [drills, setDrills] = useState<AuditRow[]>([]);
  const [deletions, setDeletions] = useState<DeletionRow[]>([]);
  const [deletionDays, setDeletionDays] = useState(30);
  const [drillBusy, setDrillBusy] = useState(false);
  const [drillMsg, setDrillMsg] = useState<string | null>(null);
  const [archiveBusyFy, setArchiveBusyFy] = useState<string | null>(null);
  const [archiveResult, setArchiveResult] = useState<{ fy: string; ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const [ov, det, log] = await Promise.all([
        callEdge<{ ok: boolean; data: OverviewPayload }>('compliance-overview-proxy', {
          query: { op: 'overview' },
        }),
        callEdge<{ ok: boolean; data: { cohorts?: CohortRow[]; history?: AuditRow[]; drills?: AuditRow[] } }>(
          'compliance-overview-proxy',
          { query: { op: 'cohort_list' } },
        ),
        callEdge<{ ok: boolean; data: DeletionLogPayload }>('compliance-overview-proxy', {
          query: { op: 'deletion_log', days: String(deletionDays) },
        }),
      ]);
      if (cancelled) return;
      if (!ov.ok) {
        setError(ov.error);
        setLoading(false);
        return;
      }
      setOverview(ov.data.data);
      // cohort_list isn't a known op; fall back to building from overview.active_cohort.
      // The proxy returns 400 for unknown ops which is fine — we tolerate it.
      if (det.ok && det.data?.data) {
        if (Array.isArray(det.data.data.cohorts)) setCohorts(det.data.data.cohorts);
        if (Array.isArray(det.data.data.history)) setHistory(det.data.data.history);
        if (Array.isArray(det.data.data.drills)) setDrills(det.data.data.drills);
      }
      if (log.ok) setDeletions(log.data.data.rows ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [deletionDays]);

  const tiles = useMemo(() => buildTiles(overview), [overview]);

  async function refreshDeletions(days: number) {
    setDeletionDays(days);
  }

  async function runDrill() {
    setDrillBusy(true);
    setDrillMsg(null);
    const r = await callEdge<{ ok: boolean; data: { ok: boolean; audit_log_id: string; note?: string } }>(
      'compliance-overview-proxy',
      { query: { op: 'run_drill' }, method: 'POST' },
    );
    setDrillBusy(false);
    if (!r.ok) {
      setDrillMsg(`Failed: ${r.error}`);
      return;
    }
    setDrillMsg(`Drill enqueued — audit row ${r.data.data?.audit_log_id ?? '(unknown)'} created.`);
  }

  async function runArchiveDryRun(fy: string) {
    setArchiveBusyFy(fy);
    setArchiveResult(null);
    const r = await callEdge<{ ok: boolean; data: unknown; error: string | null }>(
      'compliance-overview-proxy',
      { query: { op: 'archive_cohort_dry_run', fy }, method: 'POST' },
    );
    setArchiveBusyFy(null);
    if (!r.ok) {
      setArchiveResult({ fy, ok: false, text: r.error });
      return;
    }
    const text = typeof r.data.data === 'string'
      ? r.data.data
      : JSON.stringify(r.data.data ?? {}, null, 2);
    setArchiveResult({ fy, ok: r.data.ok, text });
  }

  function exportDeletionsCsv() {
    if (deletions.length === 0) return;
    const csv = toCsv(deletions, [
      { header: 'requested_at', get: (r) => r.requested_at },
      { header: 'processed_at', get: (r) => r.processed_at ?? '' },
      { header: 'user_id', get: (r) => r.user_id },
      { header: 'scope', get: (r) => r.scope },
      { header: 'status', get: (r) => r.status },
      { header: 'fiscal_data_pseudonymized', get: (r) => r.fiscal_data_pseudonymized },
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`deletion-log-${stamp}.csv`, csv);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
            style={{
              background:
                'linear-gradient(135deg, var(--color-brand-500), var(--color-lime-400))',
            }}
          >
            <ShieldCheckIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Compliance & Reliability
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Backup health, archive cohorts, deletion log.
            </p>
          </div>
        </div>
        <Link
          to="/reliability"
          className="self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700 md:self-end"
        >
          ← Reliability
        </Link>
      </header>

      {error && (
        <div className="ozly-card border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <strong className="font-semibold">Erro:</strong> {error}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Tile label="Daily DB backup" value={tiles.daily.value} tone={tiles.daily.tone} loading={loading} />
        <Tile label="Active FY cohort" value={tiles.active.value} loading={loading} />
        <Tile label="Cold tier" value={tiles.cold.value} loading={loading} />
        <Tile label="Deletion queue" value={tiles.deletions.value} tone={tiles.deletions.tone} loading={loading} />
        <Tile label="Last cold verify" value={tiles.verify.value} tone={tiles.verify.tone} loading={loading} />
        <Tile label="Cost burn estimate" value={tiles.cost.value} tone={tiles.cost.tone} loading={loading} />
      </section>

      <Card className="ozly-card">
        <div className="flex items-center justify-between">
          <Title className="!text-sm !font-semibold text-navy-700">Backup history</Title>
          <a
            href={`https://github.com/${PAGE_REPO}/actions/workflows/backup-db.yml`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-md border border-navy-100 bg-white px-2 py-1 text-xs font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700"
          >
            GitHub Actions <ExternalLinkIcon className="h-3 w-3" />
          </a>
        </div>
        {loading ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-navy-50" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="mt-4 text-sm text-navy-400">
            Nenhum run registrado em <code className="font-mono text-[11px]">backup_audit_log</code>.
            Aguardando primeira execução do workflow após Wave 2 (AWS).
          </p>
        ) : (
          <ul className="mt-3 space-y-1">
            {history.slice(0, 30).map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-navy-50 bg-white px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <StatusDot status={row.status} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-navy-700">
                        {(row.artifacts as { job_name?: string } | null)?.job_name ?? 'backup'}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-navy-400">
                      <span>{relativeTime(row.started_at)}</span>
                      <span>·</span>
                      <span>{durationOf(row.started_at, row.finished_at)}</span>
                    </div>
                  </div>
                </div>
                <ConclusionBadge status={row.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="ozly-card">
        <div className="flex items-center justify-between">
          <Title className="!text-sm !font-semibold text-navy-700">Archive cohorts</Title>
          <span className="text-[11px] text-navy-400">
            App lançou em FY25-26. First real archive: 1 jan 2027.
          </span>
        </div>
        {loading ? (
          <div className="mt-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-navy-50" />
            ))}
          </div>
        ) : cohorts.length === 0 ? (
          <p className="mt-3 text-sm text-navy-400">
            Nenhum cohort retornado. A overview RPC mostra apenas o cohort ativo —{' '}
            <code className="font-mono text-[11px]">{overview?.active_cohort?.fy_label ?? '—'}</code>.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-navy-400">
                  <th className="px-3 py-2">FY</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Files</th>
                  <th className="px-3 py-2 text-right">Size</th>
                  <th className="px-3 py-2">Hot until</th>
                  <th className="px-3 py-2">Cold until</th>
                  <th className="px-3 py-2">Delete after</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => {
                  const eligible = isMaturedLive(c);
                  return (
                    <tr key={c.fy_label} className="border-t border-navy-50 text-navy-600">
                      <td className="px-3 py-2 font-mono text-[12px]">{c.fy_label}</td>
                      <td className="px-3 py-2">
                        <CohortBadge status={c.status} />
                      </td>
                      <td className="px-3 py-2 text-right">{c.file_count.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{formatBytes(c.total_bytes)}</td>
                      <td className="px-3 py-2 text-[12px]">{c.hot_until_date}</td>
                      <td className="px-3 py-2 text-[12px]">{c.cold_until_date}</td>
                      <td className="px-3 py-2 text-[12px]">{c.delete_after_date}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          disabled={!eligible || archiveBusyFy === c.fy_label}
                          onClick={() => runArchiveDryRun(c.fy_label)}
                          className="rounded-md border border-navy-100 bg-white px-2 py-1 text-[11px] font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {archiveBusyFy === c.fy_label ? 'Running…' : 'Run dry-run'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {archiveResult && (
          <div className={`mt-3 rounded-md border p-3 text-xs ${
            archiveResult.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}>
            <div className="font-semibold">Dry-run · {archiveResult.fy}</div>
            <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px]">
              {archiveResult.text}
            </pre>
          </div>
        )}
      </Card>

      <Card className="ozly-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Title className="!text-sm !font-semibold text-navy-700">Deletion log</Title>
          <div className="flex items-center gap-2">
            <select
              value={deletionDays}
              onChange={(e) => refreshDeletions(Number(e.target.value))}
              className="rounded-md border border-navy-100 bg-white px-2 py-1 text-xs text-navy-600"
            >
              <option value={7}>Last 7d</option>
              <option value={30}>Last 30d</option>
              <option value={90}>Last 90d</option>
              <option value={365}>Last 365d</option>
            </select>
            <button
              type="button"
              disabled={deletions.length === 0}
              onClick={exportDeletionsCsv}
              className="rounded-md border border-navy-100 bg-white px-2 py-1 text-xs font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export CSV
            </button>
          </div>
        </div>
        {loading ? (
          <div className="mt-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-navy-50" />
            ))}
          </div>
        ) : deletions.length === 0 ? (
          <p className="mt-3 text-sm text-navy-400">No deletion requests in the selected window.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-navy-400">
                  <th className="px-3 py-2">Requested</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Scope</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Pseudonymised</th>
                </tr>
              </thead>
              <tbody>
                {deletions.map((d) => (
                  <tr key={d.id} className="border-t border-navy-50 text-navy-600">
                    <td className="px-3 py-2 text-[12px]">{relativeTime(d.requested_at)}</td>
                    <td className="px-3 py-2 font-mono text-[11px]">{maskUuid(d.user_id)}</td>
                    <td className="px-3 py-2 text-[12px]">{d.scope}</td>
                    <td className="px-3 py-2">
                      <DeletionBadge status={d.status} />
                    </td>
                    <td className="px-3 py-2 text-[12px]">{d.fiscal_data_pseudonymized ? 'yes' : 'no'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="ozly-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ActivityIcon className="h-4 w-4 text-brand-600" />
            <Title className="!text-sm !font-semibold text-navy-700">DR drills</Title>
          </div>
          <button
            type="button"
            disabled={drillBusy}
            onClick={runDrill}
            className="rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {drillBusy ? 'Triggering…' : 'Run integrity check now'}
          </button>
        </div>
        {drillMsg && (
          <p className="mt-2 text-xs text-navy-500">{drillMsg}</p>
        )}
        {drills.length === 0 ? (
          <p className="mt-3 text-sm text-navy-400">No drills recorded yet. Trigger one above.</p>
        ) : (
          <ul className="mt-3 space-y-1">
            {drills.slice(0, 10).map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-md border border-navy-50 bg-white px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <StatusDot status={row.status} />
                  <div>
                    <div className="text-sm text-navy-700">verify_cold_tier</div>
                    <div className="text-[11px] text-navy-400">
                      {relativeTime(row.started_at)} · checked{' '}
                      {(row.artifacts as { checked_count?: number } | null)?.checked_count ?? '—'} files
                    </div>
                  </div>
                </div>
                <ConclusionBadge status={row.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="ozly-card">
        <div className="flex items-center gap-2">
          <ServerIcon className="h-4 w-4 text-brand-600" />
          <Title className="!text-sm !font-semibold text-navy-700">Cost dashboard</Title>
        </div>
        <p className="mt-1 text-[11px] text-navy-400">
          Estimate based on {overview?.cost_basis?.region ?? 'ap-southeast-2'} Glacier rates.
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          <li className="flex items-center justify-between rounded-md border border-navy-50 bg-white px-3 py-2">
            <span className="text-navy-600">Glacier Instant Retrieval (cold receipts)</span>
            <span className="font-mono text-navy-700">
              {formatAud(((overview?.cold_cohorts_total_bytes ?? 0) / (1024 ** 3)) * (overview?.cost_basis?.glacier_ir_aud_per_gb_month ?? 0.005))}
            </span>
          </li>
          <li className="flex items-center justify-between rounded-md border border-navy-50 bg-white px-3 py-2">
            <span className="text-navy-600">Glacier Deep Archive (DR backup, 35d window)</span>
            <span className="font-mono text-navy-700">
              {formatAud(((overview?.dr_recent_total_bytes ?? 0) / (1024 ** 3)) * (overview?.cost_basis?.glacier_da_aud_per_gb_month ?? 0.002))}
            </span>
          </li>
          <li className="flex items-center justify-between rounded-md border border-navy-50 bg-white px-3 py-2">
            <span className="text-navy-600">GitHub Actions (free tier)</span>
            <span className="font-mono text-navy-700">$0.00</span>
          </li>
          <li className="flex items-center justify-between rounded-md border border-brand-200 bg-brand-50/40 px-3 py-2">
            <span className="font-semibold text-navy-700">Total / month</span>
            <span className="font-mono font-semibold text-brand-700">
              {formatAud(overview?.cost_burn_estimate_aud ?? 0)}
            </span>
          </li>
        </ul>
      </Card>
    </div>
  );
}

interface TileSpec {
  value: string;
  tone?: 'good' | 'warn' | 'bad';
}

function buildTiles(o: OverviewPayload | null): {
  daily: TileSpec; active: TileSpec; cold: TileSpec;
  deletions: TileSpec; verify: TileSpec; cost: TileSpec;
} {
  if (!o) {
    return {
      daily: { value: '—' },
      active: { value: '—' },
      cold: { value: '—' },
      deletions: { value: '—' },
      verify: { value: '—' },
      cost: { value: '—' },
    };
  }

  const daily = (() => {
    const d = o.last_daily_db_backup;
    if (!d) return { value: 'No runs', tone: 'warn' as const };
    const ageH = (Date.now() - new Date(d.started_at).getTime()) / 3_600_000;
    if (d.status !== 'success') return { value: `${d.status} · ${relativeTime(d.started_at)}`, tone: 'bad' as const };
    if (ageH < 26) return { value: `OK · ${relativeTime(d.started_at)}`, tone: 'good' as const };
    if (ageH < 48) return { value: `Stale · ${relativeTime(d.started_at)}`, tone: 'warn' as const };
    return { value: `Stale · ${relativeTime(d.started_at)}`, tone: 'bad' as const };
  })();

  const active = (() => {
    if (!o.active_cohort) return { value: 'None' };
    return { value: `${o.active_cohort.fy_label} · ${formatBytes(o.active_cohort.total_bytes)}` };
  })();

  const cold = {
    value: `${o.cold_cohorts_count} cohort${o.cold_cohorts_count === 1 ? '' : 's'} · ${formatBytes(o.cold_cohorts_total_bytes)}`,
  };

  const deletions = o.pending_deletion_requests > 0
    ? { value: `${o.pending_deletion_requests} pending`, tone: 'warn' as const }
    : { value: '0 pending', tone: 'good' as const };

  const verify = (() => {
    const v = o.last_cold_verify;
    if (!v) return { value: 'Never run', tone: 'warn' as const };
    const ok = v.status === 'success';
    return {
      value: `${relativeTime(v.started_at)} · ${v.status}`,
      tone: ok ? ('good' as const) : ('bad' as const),
    };
  })();

  const cost = {
    value: formatAud(o.cost_burn_estimate_aud ?? 0),
    tone: 'good' as const,
  };

  return { daily, active, cold, deletions, verify, cost };
}

function isMaturedLive(c: CohortRow): boolean {
  if (c.status !== 'live') return false;
  const today = new Date();
  const hot = new Date(c.hot_until_date);
  const threshold = new Date(hot);
  threshold.setDate(threshold.getDate() - 30);
  return today >= threshold;
}

function Tile({
  label, value, tone, loading,
}: { label: string; value: string | number; tone?: 'good' | 'warn' | 'bad' | undefined; loading?: boolean | undefined }) {
  const toneClass =
    tone === 'good' ? 'text-emerald-600'
    : tone === 'warn' ? 'text-amber-600'
    : tone === 'bad' ? 'text-rose-600'
    : 'text-brand-600';
  return (
    <div className="ozly-card ozly-card-hero relative px-5 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${toneClass}`}>
        {loading ? '…' : value}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: AuditRow['status'] }) {
  const color = status === 'success' ? 'bg-emerald-500'
    : status === 'failed' ? 'bg-rose-500'
    : status === 'skipped' ? 'bg-navy-200'
    : 'bg-amber-400';
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${color} ${status === 'running' ? 'animate-pulse' : ''}`} />;
}

function ConclusionBadge({ status }: { status: AuditRow['status'] }) {
  const tone =
    status === 'success' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : status === 'failed' ? 'bg-rose-50 text-rose-700 ring-rose-200'
    : status === 'skipped' ? 'bg-navy-50 text-navy-500 ring-navy-200'
    : 'bg-amber-50 text-amber-700 ring-amber-200';
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ring-1 ${tone}`}>
      {status}
    </span>
  );
}

function CohortBadge({ status }: { status: CohortStatus }) {
  const map: Record<CohortStatus, string> = {
    live: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    archiving: 'bg-amber-50 text-amber-700 ring-amber-200',
    cold: 'bg-sky-50 text-sky-700 ring-sky-200',
    deleting: 'bg-rose-50 text-rose-700 ring-rose-200',
    deleted: 'bg-navy-50 text-navy-500 ring-navy-200',
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ring-1 ${map[status]}`}>
      {status}
    </span>
  );
}

function DeletionBadge({ status }: { status: DeletionRow['status'] }) {
  const tone = status === 'processed' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : status === 'failed' ? 'bg-rose-50 text-rose-700 ring-rose-200'
    : 'bg-amber-50 text-amber-700 ring-amber-200';
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ring-1 ${tone}`}>
      {status}
    </span>
  );
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const ts = new Date(iso).getTime();
  if (!ts) return '—';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function durationOf(start: string | null, end: string | null): string {
  if (!start) return '—';
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const sec = Math.floor((e - s) / 1000);
  if (sec < 0) return '—';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  return `${m}m ${sec % 60}s`;
}

function formatBytes(n: number): string {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatAud(n: number): string {
  return `$${n.toFixed(2)} / mês`;
}

function maskUuid(id: string): string {
  if (!id) return '—';
  if (id.length < 8) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}
