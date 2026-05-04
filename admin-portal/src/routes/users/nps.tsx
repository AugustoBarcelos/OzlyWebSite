import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import { ActivityIcon, MailIcon, UsersIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callRpc, RpcError } from '@/lib/rpc';
import { callEdge } from '@/lib/edge';

/**
 * /users/nps — NPS overview (option B: email survey via Resend).
 *
 * Calls admin_nps_overview for the rolling 90-day metric, plus
 * admin_nps_candidates / nps-send-batch edge fn for the "Send survey" flow.
 */

interface DistRow {
  score: number;
  count: number;
}

interface RecentRow {
  id: string;
  score: number;
  comment: string | null;
  responded_at: string;
  email_to: string;
}

interface OverviewResponse {
  days_back: number;
  sent_count: number;
  responded_count: number;
  response_rate_pct: number;
  nps_score: number | null;
  promoters: number;
  passives: number;
  detractors: number;
  distribution: DistRow[];
  recent: RecentRow[];
}

interface SendResult {
  candidates: number;
  sent: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
  dry_run?: boolean;
  would_send?: number;
  sample?: string[];
}

function fmtRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!ts) return '';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function UsersNpsPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrationPending, setMigrationPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [sendLimit, setSendLimit] = useState(50);

  const reload = () => {
    setLoading(true);
    setError(null);
    setMigrationPending(false);
    callRpc<OverviewResponse>('admin_nps_overview', { p_days_back: 90 })
      .then((d) => setData(d))
      .catch((e: unknown) => {
        if (
          e instanceof RpcError &&
          (e.code === '42883' || e.message.includes('does not exist'))
        ) {
          setMigrationPending(true);
        } else {
          setError(e instanceof RpcError ? e.message : 'Erro');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  async function sendSurvey(dryRun: boolean) {
    setSending(true);
    setSendResult(null);
    const r = await callEdge<SendResult>('nps-send-batch', {
      method: 'POST',
      body: { p_limit: sendLimit, dry_run: dryRun },
    });
    if (r.ok) {
      setSendResult(r.data);
      if (!dryRun) reload();
    } else {
      setSendResult({
        candidates: 0,
        sent: 0,
        failed: 1,
        errors: [{ email: '—', error: r.error }],
      });
    }
    setSending(false);
  }

  const maxDist = Math.max(1, ...(data?.distribution.map((d) => d.count) ?? [1]));

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
              NPS — Net Promoter Score
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Pesquisa email-only. Janela rolling de 90 dias.
            </p>
          </div>
        </div>
        <Link
          to="/users"
          className="self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700 md:self-end"
        >
          ← Users
        </Link>
      </header>

      {migrationPending && (
        <div className="ozly-card border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
          <strong>Migration pendente.</strong> Aplicar{' '}
          <code className="font-mono">20260504070000_nps_responses.sql</code> em prod.
        </div>
      )}

      {error && (
        <div className="ozly-card border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-navy-400">
          <Spinner size="sm" /> Carregando…
        </div>
      ) : !data ? null : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              label="NPS score"
              value={data.nps_score == null ? '—' : data.nps_score.toFixed(0)}
              tone={
                data.nps_score == null
                  ? 'muted'
                  : data.nps_score >= 50
                    ? 'good'
                    : data.nps_score >= 0
                      ? 'warn'
                      : 'bad'
              }
              hint={
                data.nps_score == null
                  ? 'sem respostas'
                  : `${data.responded_count} respostas`
              }
            />
            <Tile
              label="Sent (90d)"
              value={String(data.sent_count)}
              tone="brand"
              hint="surveys enviadas"
            />
            <Tile
              label="Response rate"
              value={`${data.response_rate_pct.toFixed(1)}%`}
              tone={data.response_rate_pct >= 20 ? 'good' : 'warn'}
              hint="responderam / enviadas"
            />
            <Tile
              label="P / Pa / D"
              value={`${data.promoters} / ${data.passives} / ${data.detractors}`}
              tone="muted"
              hint="promoters / passives / detractors"
            />
          </section>

          <Card className="ozly-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Title className="!text-sm !font-semibold text-navy-700">
                Send survey batch
              </Title>
              <div className="flex items-center gap-2">
                <select
                  className="rounded-md border border-navy-100 bg-white px-2 py-1 text-xs text-navy-700"
                  value={sendLimit}
                  onChange={(e) => setSendLimit(Number(e.target.value))}
                  disabled={sending}
                >
                  <option value={10}>10 users</option>
                  <option value={50}>50 users</option>
                  <option value={100}>100 users</option>
                  <option value={200}>200 users</option>
                </select>
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => sendSurvey(true)}
                  className="rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:border-brand-200 hover:text-brand-700 disabled:opacity-50"
                >
                  Dry run
                </button>
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => {
                    if (window.confirm(`Enviar survey pra até ${sendLimit} usuários reais? Esta ação dispara emails de verdade via Resend.`)) {
                      sendSurvey(false);
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-brand-700 disabled:bg-navy-200"
                >
                  <MailIcon className="h-3.5 w-3.5" /> Send for real
                </button>
              </div>
            </div>

            {sending && (
              <div className="mt-3 flex items-center gap-2 text-sm text-navy-500">
                <Spinner size="sm" /> Enviando…
              </div>
            )}

            {sendResult && (
              <div className="mt-3 rounded-md border border-navy-100 bg-navy-50/40 p-3 text-xs text-navy-600">
                {sendResult.dry_run ? (
                  <>
                    <strong className="text-brand-600">Dry run.</strong> Mandaria pra{' '}
                    <strong>{sendResult.would_send}</strong> usuários.
                    {(sendResult.sample?.length ?? 0) > 0 && (
                      <div className="mt-1 font-mono text-[11px] text-navy-400">
                        Sample: {sendResult.sample?.join(', ')}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <strong>Enviado.</strong> {sendResult.sent} ok / {sendResult.failed}{' '}
                    falhou (de {sendResult.candidates} candidatos).
                    {sendResult.errors.length > 0 && (
                      <ul className="mt-1 list-disc pl-5 text-[11px] text-rose-600">
                        {sendResult.errors.map((e, i) => (
                          <li key={i}>
                            <code>{e.email}</code> — {e.error}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            )}

            <p className="mt-3 text-[11px] text-navy-400">
              Pega usuários paying com sub ativa há 30+ dias e que não receberam survey nos últimos 90 dias.
            </p>
          </Card>

          <Card className="ozly-card">
            <Title className="!text-sm !font-semibold text-navy-700">Distribution (0–10)</Title>
            <div className="mt-3 grid grid-cols-11 gap-1">
              {data.distribution.map((d) => {
                const tone =
                  d.score >= 9
                    ? 'bg-emerald-500'
                    : d.score >= 7
                      ? 'bg-amber-400'
                      : 'bg-rose-400';
                return (
                  <div key={d.score} className="flex flex-col items-center">
                    <div
                      className={`w-full rounded-t-md ${tone}`}
                      style={{
                        height: `${Math.max(4, (d.count / maxDist) * 80)}px`,
                      }}
                      title={`${d.count} respostas`}
                    />
                    <div className="mt-1 text-[10px] font-mono text-navy-400">{d.score}</div>
                    <div className="text-[10px] tabular-nums text-navy-500">{d.count}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="ozly-card">
            <Title className="!text-sm !font-semibold text-navy-700">
              Recent responses ({data.recent.length})
            </Title>
            {data.recent.length === 0 ? (
              <div className="mt-3 text-xs text-navy-300">Sem respostas ainda.</div>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.recent.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-start gap-3 rounded-md border border-navy-50 bg-white p-3"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white ${
                        r.score >= 9
                          ? 'bg-emerald-500'
                          : r.score >= 7
                            ? 'bg-amber-400'
                            : 'bg-rose-500'
                      }`}
                    >
                      {r.score}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[11px] text-navy-400">
                        <UsersIcon className="h-3 w-3" />
                        <code className="truncate font-mono">{r.email_to}</code>
                        <span>·</span>
                        <span>{fmtRelative(r.responded_at)} atrás</span>
                      </div>
                      {r.comment && (
                        <p className="mt-1 text-sm text-navy-700">{r.comment}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <RawDataPanel
            page="users-nps"
            sources={[
              {
                rpc: 'admin_nps_overview',
                params: { p_days_back: 90 },
                data,
              },
            ]}
          />
        </>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: 'brand' | 'good' | 'warn' | 'bad' | 'muted';
}) {
  const TONE: Record<typeof tone, string> = {
    brand: 'text-brand-600',
    good: 'text-emerald-600',
    warn: 'text-amber-600',
    bad: 'text-rose-600',
    muted: 'text-navy-400',
  };
  return (
    <div className="ozly-card ozly-card-hero relative px-5 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${TONE[tone]}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-navy-400">{hint}</div>}
    </div>
  );
}
