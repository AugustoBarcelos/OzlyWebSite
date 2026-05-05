import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import {
  ActivityIcon,
  ExternalLinkIcon,
  WorkflowIcon,
} from '@/components/Icons';
import { callEdge } from '@/lib/edge';

/**
 * /tech/cicd — GitHub Actions runs (read-only)
 *
 * Calls `github-actions-proxy` edge function which holds the PAT server-side
 * and verifies admin role. The browser never sees the token.
 */

interface Workflow {
  id: number;
  name: string;
  path: string;
  state: string;
  badge_url?: string;
  html_url: string;
}

interface WorkflowRun {
  id: number;
  name: string;
  display_title: string;
  head_branch: string;
  head_sha: string;
  status: 'queued' | 'in_progress' | 'completed' | string;
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
  workflow_id: number;
  run_number: number;
  event: string;
  created_at: string;
  updated_at: string;
  run_started_at?: string;
  html_url: string;
  actor?: { login: string; avatar_url: string };
}

interface Job {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string;
  completed_at: string | null;
  html_url: string;
  steps?: Array<{
    name: string;
    status: string;
    conclusion: string | null;
    number: number;
    started_at?: string;
    completed_at?: string;
  }>;
}

interface SummaryPayload {
  workflows: { ok: boolean; status: number; body: { workflows?: Workflow[]; total_count?: number } };
  runs: { ok: boolean; status: number; body: { workflow_runs?: WorkflowRun[]; total_count?: number } };
  repo: string;
}

interface JobsPayload {
  ok: boolean;
  status: number;
  body: { jobs?: Job[]; total_count?: number };
}

const REPOS = [
  { id: 'AugustoBarcelos/OzlyWebSite', label: 'Ozly Web (admin + site público)' },
  { id: 'AugustoBarcelos/AusClean', label: 'AusClean (Flutter app + Supabase)' },
];

export function TechCICDPage() {
  const [repo, setRepo] = useState<string>('AugustoBarcelos/OzlyWebSite');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setError(null);
      setSelectedRun(null);
      setJobs([]);
      const r = await callEdge<SummaryPayload>('github-actions-proxy', {
        query: { op: 'summary', repo },
      });
      if (cancel) return;
      if (!r.ok) {
        setError(r.error);
        setLoading(false);
        return;
      }
      const wfList = r.data.workflows.body.workflows ?? [];
      const runList = r.data.runs.body.workflow_runs ?? [];
      setWorkflows(wfList);
      setRuns(runList);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [repo]);

  const stats = useMemo(() => {
    const total = runs.length;
    const success = runs.filter((r) => r.conclusion === 'success').length;
    const failure = runs.filter((r) => r.conclusion === 'failure').length;
    const inProgress = runs.filter((r) => r.status !== 'completed').length;
    const last = runs[0];
    const successRate = total > 0 ? (success / total) * 100 : 0;
    return { total, success, failure, inProgress, last, successRate };
  }, [runs]);

  async function loadJobs(run: WorkflowRun) {
    setSelectedRun(run);
    setJobsLoading(true);
    setJobs([]);
    const r = await callEdge<JobsPayload>('github-actions-proxy', {
      query: { op: 'jobs', run: String(run.id), repo },
    });
    if (r.ok) {
      setJobs(r.data.body.jobs ?? []);
    }
    setJobsLoading(false);
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
            <WorkflowIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              CI/CD — GitHub Actions
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Workflow runs em <code className="font-mono text-[12px]">{repo}</code>. Read-only via PAT no servidor.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start md:self-end">
          <label className="flex items-center gap-2 rounded-md border border-navy-100 bg-white px-2.5 py-1.5 text-xs text-navy-600 shadow-sm">
            <span className="font-semibold uppercase tracking-wider text-navy-400">Repo</span>
            <select
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="cursor-pointer bg-transparent pr-1 text-xs font-medium text-navy-700 focus:outline-none"
            >
              {REPOS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <Link
            to="/tech"
            className="rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700"
          >
            ← Tech Hub
          </Link>
        </div>
      </header>

      {error && (
        <div className="ozly-card border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <strong className="font-semibold">Erro:</strong> {error}
          {error.includes('not configured') && (
            <p className="mt-1 text-xs text-rose-600">
              Setar secret <code>ADMIN_PORTAL_GITHUB_PAT</code> via{' '}
              <code>npx supabase secrets set</code>.
            </p>
          )}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Workflows ativos" value={workflows.filter((w) => w.state === 'active').length} loading={loading} />
        <Tile label="Last 20 runs" value={stats.total} loading={loading} />
        <Tile
          label="Success rate"
          value={loading ? '—' : `${stats.successRate.toFixed(0)}%`}
          tone={stats.successRate >= 90 ? 'good' : stats.successRate >= 70 ? 'warn' : 'bad'}
          loading={loading}
        />
        <Tile
          label="Failed"
          value={stats.failure}
          tone={stats.failure === 0 ? 'good' : 'bad'}
          loading={loading}
        />
      </section>

      <Card className="ozly-card">
        <div className="flex items-center justify-between">
          <Title className="!text-sm !font-semibold text-navy-700">Recent runs</Title>
          <a
            href={`https://github.com/${repo}/actions`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-md border border-navy-100 bg-white px-2 py-1 text-xs font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700"
          >
            GitHub Actions <ExternalLinkIcon className="h-3 w-3" />
          </a>
        </div>

        {loading ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-md bg-navy-50" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <p className="mt-4 text-sm text-navy-400">Nenhum run encontrado.</p>
        ) : (
          <ul className="mt-3 space-y-1">
            {runs.map((run) => (
              <li key={run.id}>
                <button
                  type="button"
                  onClick={() => loadJobs(run)}
                  className={`flex w-full flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
                    selectedRun?.id === run.id
                      ? 'border-brand-300 bg-brand-50/40'
                      : 'border-navy-50 bg-white hover:border-brand-200 hover:bg-brand-50/20'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <StatusDot status={run.status} conclusion={run.conclusion} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-navy-700">
                          {run.display_title || run.name}
                        </span>
                        <span className="rounded bg-navy-50 px-1.5 py-0.5 font-mono text-[10px] text-navy-500">
                          #{run.run_number}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-navy-400">
                        <span className="truncate">{run.name}</span>
                        <span>·</span>
                        <span className="font-mono">{run.head_branch}</span>
                        <span>·</span>
                        <span>{run.event}</span>
                        <span>·</span>
                        <span>{relativeTime(run.run_started_at ?? run.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ConclusionBadge status={run.status} conclusion={run.conclusion} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {selectedRun && (
        <Card className="ozly-card border-brand-200 bg-brand-50/30">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ActivityIcon className="h-4 w-4 text-brand-600" />
                <Title className="!text-sm !font-semibold text-navy-700">
                  Jobs — Run #{selectedRun.run_number}
                </Title>
              </div>
              <p className="mt-1 truncate text-xs text-navy-500">
                {selectedRun.display_title}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={selectedRun.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-md border border-navy-100 bg-white px-2 py-1 text-xs font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700"
              >
                Ver no GitHub <ExternalLinkIcon className="h-3 w-3" />
              </a>
              <button
                type="button"
                onClick={() => {
                  setSelectedRun(null);
                  setJobs([]);
                }}
                className="rounded-md border border-navy-100 bg-white px-2 py-1 text-xs text-navy-500 hover:border-rose-200 hover:text-rose-600"
              >
                Fechar
              </button>
            </div>
          </div>

          {jobsLoading ? (
            <div className="mt-3 space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-md bg-white" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <p className="mt-3 text-sm text-navy-400">Nenhum job encontrado.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {jobs.map((job) => (
                <li key={job.id} className="rounded-md border border-navy-100 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <StatusDot status={job.status} conclusion={job.conclusion} />
                      <span className="text-sm font-medium text-navy-700">{job.name}</span>
                      <span className="text-[11px] text-navy-400">
                        {jobDuration(job.started_at, job.completed_at)}
                      </span>
                    </div>
                    <ConclusionBadge status={job.status} conclusion={job.conclusion} />
                  </div>
                  {job.steps && job.steps.length > 0 && (
                    <ul className="mt-2 space-y-0.5 pl-5 text-[11px]">
                      {job.steps.map((s) => (
                        <li key={s.number} className="flex items-center gap-2 text-navy-500">
                          <StepDot conclusion={s.conclusion} status={s.status} />
                          <span>{s.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card className="ozly-card">
        <Title className="!text-sm !font-semibold text-navy-700">Workflows</Title>
        {loading ? (
          <div className="mt-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-navy-50" />
            ))}
          </div>
        ) : (
          <ul className="mt-3 space-y-1">
            {workflows.map((wf) => (
              <li
                key={wf.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-navy-50 bg-white px-3 py-2"
              >
                <div className="min-w-0">
                  <span className="text-sm font-medium text-navy-700">{wf.name}</span>
                  <code className="ml-2 font-mono text-[11px] text-navy-400">{wf.path}</code>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ring-1 ${
                      wf.state === 'active'
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        : 'bg-navy-50 text-navy-500 ring-navy-200'
                    }`}
                  >
                    {wf.state}
                  </span>
                  <a
                    href={wf.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-navy-500 hover:text-brand-600"
                  >
                    GitHub <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
  loading,
}: {
  label: string;
  value: number | string;
  tone?: 'good' | 'warn' | 'bad';
  loading?: boolean;
}) {
  const toneClass =
    tone === 'good'
      ? 'text-emerald-600'
      : tone === 'warn'
        ? 'text-amber-600'
        : tone === 'bad'
          ? 'text-rose-600'
          : 'text-brand-600';
  return (
    <div className="ozly-card ozly-card-hero relative px-5 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>
        {loading ? '…' : value}
      </div>
    </div>
  );
}

function StatusDot({ status, conclusion }: { status: string; conclusion: string | null }) {
  const color = dotColor(status, conclusion);
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${color} ${status !== 'completed' ? 'animate-pulse' : ''}`}
      aria-label={conclusion ?? status}
    />
  );
}

function StepDot({ status, conclusion }: { status: string; conclusion: string | null }) {
  const color = dotColor(status, conclusion);
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />;
}

function dotColor(status: string, conclusion: string | null): string {
  if (status !== 'completed') return 'bg-amber-400';
  if (conclusion === 'success') return 'bg-emerald-500';
  if (conclusion === 'failure') return 'bg-rose-500';
  if (conclusion === 'cancelled') return 'bg-navy-300';
  if (conclusion === 'skipped') return 'bg-navy-200';
  return 'bg-navy-300';
}

function ConclusionBadge({ status, conclusion }: { status: string; conclusion: string | null }) {
  if (status !== 'completed') {
    return (
      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-700 ring-1 ring-amber-200">
        {status.replace('_', ' ')}
      </span>
    );
  }
  const tone =
    conclusion === 'success'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : conclusion === 'failure'
        ? 'bg-rose-50 text-rose-700 ring-rose-200'
        : 'bg-navy-50 text-navy-500 ring-navy-200';
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ring-1 ${tone}`}>
      {conclusion ?? 'unknown'}
    </span>
  );
}

function relativeTime(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!ts) return '';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}m atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

function jobDuration(start: string, end: string | null): string {
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const sec = Math.floor((e - s) / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  return `${m}m ${sec % 60}s`;
}
