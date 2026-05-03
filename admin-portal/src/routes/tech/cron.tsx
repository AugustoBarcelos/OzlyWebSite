import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import { ActivityIcon, ServerIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callRpc, RpcError } from '@/lib/rpc';
import { formatRelativeTime } from '@/lib/format';

interface CronJob {
  jobid: number;
  jobname: string;
  schedule: string;
  command: string;
  active: boolean;
  last_run_at: string | null;
  last_status: string | null;
  last_duration_s: number | null;
}

interface CronResponse {
  has_pg_cron: boolean;
  jobs: CronJob[];
  note?: string;
}

export function TechCronPage() {
  const [data, setData] = useState<CronResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrationPending, setMigrationPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    callRpc<CronResponse>('admin_cron_jobs_list', {})
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        if (
          e instanceof RpcError &&
          (e.code === '42883' || e.message.includes('does not exist'))
        ) {
          setMigrationPending(true);
        } else {
          setError(e instanceof RpcError ? e.message : 'Erro');
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

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
            <ActivityIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Cron Jobs
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              pg_cron schedule + última execução por job.
            </p>
          </div>
        </div>
        <Link
          to="/tech"
          className="self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700 md:self-end"
        >
          ← Tech Hub
        </Link>
      </header>

      {migrationPending && (
        <div className="ozly-card border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
          <strong>Migration pendente.</strong> Aplique{' '}
          <code className="font-mono">20260504020000_admin_misc_rpcs.sql</code> em prod.
        </div>
      )}

      {error && (
        <div className="ozly-card border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-navy-400">
          <Spinner size="sm" /> Carregando…
        </div>
      ) : !data ? null : !data.has_pg_cron ? (
        <Card className="ozly-card">
          <div className="py-8 text-center text-sm text-navy-300">
            <ServerIcon className="mx-auto mb-2 h-8 w-8 text-navy-200" />
            pg_cron não está instalado neste banco.
          </div>
        </Card>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <Tile label="Total jobs" value={data.jobs.length} tone="brand" />
            <Tile
              label="Ativos"
              value={data.jobs.filter((j) => j.active).length}
              tone="lime"
            />
            <Tile
              label="Última 1h falharam"
              value={
                data.jobs.filter(
                  (j) =>
                    j.last_status === 'failed' &&
                    j.last_run_at &&
                    new Date(j.last_run_at).getTime() > Date.now() - 60 * 60 * 1000,
                ).length
              }
              tone="warning"
            />
          </section>

          <Card className="ozly-card">
            <Title className="!text-sm !font-semibold text-navy-700">Jobs</Title>
            {data.jobs.length === 0 ? (
              <div className="mt-3 text-xs text-navy-300">Nenhum cron job cadastrado.</div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[10px] font-semibold uppercase tracking-wider text-navy-300">
                    <tr className="border-b border-navy-50">
                      <th className="py-2 text-left">Nome</th>
                      <th className="py-2 text-left">Schedule</th>
                      <th className="py-2 text-left">Status</th>
                      <th className="py-2 text-left">Última execução</th>
                      <th className="py-2 text-right">Duração</th>
                    </tr>
                  </thead>
                  <tbody className="text-navy-700">
                    {data.jobs.map((j) => (
                      <tr
                        key={j.jobid}
                        className="border-b border-navy-50/60 last:border-0"
                      >
                        <td className="py-2">
                          <div className="font-mono text-[11px] font-semibold">{j.jobname}</div>
                          <div className="line-clamp-1 max-w-md text-[10px] text-navy-400">
                            {j.command}
                          </div>
                        </td>
                        <td className="py-2 font-mono text-[11px] text-navy-500">
                          {j.schedule}
                        </td>
                        <td className="py-2">
                          {!j.active ? (
                            <Badge tone="neutral">paused</Badge>
                          ) : j.last_status === 'succeeded' ? (
                            <Badge tone="lime">ok</Badge>
                          ) : j.last_status === 'failed' ? (
                            <Badge tone="warning">fail</Badge>
                          ) : (
                            <Badge tone="neutral">{j.last_status ?? '—'}</Badge>
                          )}
                        </td>
                        <td className="py-2 text-[11px] text-navy-500">
                          {j.last_run_at ? formatRelativeTime(j.last_run_at) : '—'}
                        </td>
                        <td className="py-2 text-right font-mono text-[11px] tabular-nums text-navy-500">
                          {j.last_duration_s !== null ? `${j.last_duration_s}s` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      <RawDataPanel
        page="tech-cron"
        sources={[{ rpc: 'admin_cron_jobs_list', params: {}, data }]}
      />
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'brand' | 'lime' | 'warning';
}) {
  const TONE: Record<typeof tone, string> = {
    brand: 'text-brand-600',
    lime: 'text-lime-600',
    warning: 'text-amber-600',
  };
  return (
    <div className="ozly-card ozly-card-hero relative px-5 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${TONE[tone]}`}>{value}</div>
    </div>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: 'lime' | 'warning' | 'neutral';
  children: React.ReactNode;
}) {
  const TONE: Record<typeof tone, string> = {
    lime: 'bg-lime-50 text-lime-700 ring-lime-200',
    warning: 'bg-amber-50 text-amber-700 ring-amber-200',
    neutral: 'bg-navy-50 text-navy-500 ring-navy-200',
  };
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ring-1 ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}
