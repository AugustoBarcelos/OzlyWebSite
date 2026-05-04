import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import { ActivityIcon, BookIcon, MailIcon, PackageIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callRpc, RpcError } from '@/lib/rpc';

/**
 * /product/feedback — aggregates qualitative signal across surfaces.
 *
 * Today: NPS responses (admin_nps_overview, see /users/nps).
 * Tomorrow (blocked on App Store Connect API key): App Store reviews + ratings.
 *
 * This page is the "macro" view; details live in /users/nps.
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

interface NpsOverview {
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

function fmtRel(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!ts) return '';
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function ProductFeedbackPage() {
  const [data, setData] = useState<NpsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrationPending, setMigrationPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setMigrationPending(false);
    callRpc<NpsOverview>('admin_nps_overview', { p_days_back: 90 })
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

  const commentCount = data?.recent.filter((r) => r.comment != null && r.comment.trim() !== '').length ?? 0;
  const promoterShare =
    data && data.responded_count > 0
      ? Math.round((data.promoters / data.responded_count) * 100)
      : null;

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
            <BookIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Feedback
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              NPS + App Store reviews — visão agregada da voz do usuário.
            </p>
          </div>
        </div>
        <Link
          to="/product"
          className="self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700 md:self-end"
        >
          ← Product Hub
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
              label="NPS (90d)"
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
              hint={`${data.responded_count} respostas`}
            />
            <Tile
              label="Response rate"
              value={`${data.response_rate_pct.toFixed(1)}%`}
              tone={data.response_rate_pct >= 20 ? 'good' : 'warn'}
              hint={`${data.sent_count} surveys enviadas`}
            />
            <Tile
              label="Promoters"
              value={
                promoterShare == null
                  ? '—'
                  : `${data.promoters} (${promoterShare}%)`
              }
              tone="good"
            />
            <Tile
              label="Detractors"
              value={String(data.detractors)}
              tone={data.detractors === 0 ? 'good' : 'bad'}
              hint="score 0–6"
            />
          </section>

          <section className="grid gap-3 lg:grid-cols-2">
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
              <div className="mt-3 flex justify-end">
                <Link
                  to="/users/nps"
                  className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
                >
                  <MailIcon className="h-3 w-3" /> Send batch & details →
                </Link>
              </div>
            </Card>

            <Card className="ozly-card border-navy-100 bg-navy-50/30">
              <div className="flex items-center gap-2">
                <PackageIcon className="h-4 w-4 text-navy-400" />
                <Title className="!text-sm !font-semibold text-navy-700">App Store Reviews</Title>
              </div>
              <p className="mt-2 text-sm text-navy-500">
                Aguardando <strong>App Store Connect API key</strong> pra ingestion automática
                de ratings + reviews. Hoje você lê manualmente em{' '}
                <a
                  href="https://appstoreconnect.apple.com/apps/6760398649/distribution/activity/ios/ratings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:underline"
                >
                  appstoreconnect.apple.com
                </a>.
              </p>
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50/60 p-3 text-[12px] text-amber-800">
                <strong>Pra desbloquear:</strong> gere uma API key em{' '}
                <a
                  href="https://appstoreconnect.apple.com/access/integrations/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Access → Integrations → App Store Connect API
                </a>
                . Role mínimo: <em>Developer</em>. Manda Key ID + Issuer ID + .p8 file.
              </div>
            </Card>
          </section>

          <Card className="ozly-card">
            <div className="flex items-center justify-between">
              <Title className="!text-sm !font-semibold text-navy-700">
                Recent comments ({commentCount})
              </Title>
              <Link
                to="/users/nps"
                className="text-xs text-navy-500 hover:text-brand-600"
              >
                Ver todas →
              </Link>
            </div>
            {commentCount === 0 ? (
              <div className="mt-3 text-xs text-navy-300">
                Sem comentários ainda. Mande um batch em{' '}
                <Link to="/users/nps" className="text-brand-600 hover:underline">
                  /users/nps
                </Link>
                .
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.recent
                  .filter((r) => r.comment != null && r.comment.trim() !== '')
                  .slice(0, 10)
                  .map((r) => (
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
                          <ActivityIcon className="h-3 w-3" />
                          <code className="truncate font-mono">{r.email_to}</code>
                          <span>·</span>
                          <span>{fmtRel(r.responded_at)}</span>
                        </div>
                        <p className="mt-1 text-sm text-navy-700">{r.comment}</p>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </Card>

          <RawDataPanel
            page="product-feedback"
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
  tone: 'good' | 'warn' | 'bad' | 'muted';
}) {
  const TONE: Record<typeof tone, string> = {
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
