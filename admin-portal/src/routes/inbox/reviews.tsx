import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import { ExternalLinkIcon, SparklesIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callEdge } from '@/lib/edge';

/**
 * /inbox/reviews — Reviews unificadas iOS + Android.
 *
 * Tabs:
 *   - App Store (via appstore-connect-proxy)
 *   - Play Store (via play-developer-proxy)
 *
 * Each store has its own response shape; we normalize into a common
 * NormalizedReview type before rendering.
 */

type Store = 'apple' | 'play';

interface NormalizedReview {
  id: string;
  store: Store;
  rating: number;
  title?: string;
  body: string;
  author: string;
  territoryOrLanguage: string;
  createdAt: string;
}

// ─── App Store types ────────────────────────────────────────────────────
interface AppleReviewAttributes {
  rating: number;
  title: string;
  body: string;
  reviewerNickname: string;
  createdDate: string;
  territory: string;
}
interface AppleReview {
  id: string;
  attributes: AppleReviewAttributes;
}
interface AppleProxyResult {
  ok: boolean;
  status: number;
  body: {
    data?: AppleReview[];
    errors?: Array<{ status?: string; title?: string; detail?: string; code?: string }>;
  };
}

// ─── Play Store types ───────────────────────────────────────────────────
interface PlayUserComment {
  text: string;
  lastModified: { seconds?: string };
  starRating: number;
  reviewerLanguage?: string;
}
interface PlayReview {
  reviewId: string;
  authorName: string;
  comments?: Array<{ userComment?: PlayUserComment; developerComment?: { text: string } }>;
}
interface PlayProxyResult {
  ok: boolean;
  status: number;
  body: {
    reviews?: PlayReview[];
    error?: { code: number; message: string };
  };
}

const APPLE_DEEP_LINK =
  'https://appstoreconnect.apple.com/apps/6760398649/distribution/activity/ios/ratings';
const PLAY_DEEP_LINK =
  'https://play.google.com/console/u/0/developers/-/app-list';

function fmtRel(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!ts) return '';
  const days = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
  if (days < 1) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 30) return `${days}d atrás`;
  if (days < 365) return `${Math.floor(days / 30)}mo atrás`;
  return `${Math.floor(days / 365)}y atrás`;
}

function normalizeApple(reviews: AppleReview[]): NormalizedReview[] {
  return reviews.map((r) => ({
    id: r.id,
    store: 'apple' as const,
    rating: r.attributes.rating,
    title: r.attributes.title,
    body: r.attributes.body,
    author: r.attributes.reviewerNickname,
    territoryOrLanguage: r.attributes.territory,
    createdAt: r.attributes.createdDate,
  }));
}

function normalizePlay(reviews: PlayReview[]): NormalizedReview[] {
  const out: NormalizedReview[] = [];
  for (const r of reviews) {
    const userComment = r.comments?.find((c) => c.userComment)?.userComment;
    if (!userComment) continue;
    const seconds = userComment.lastModified?.seconds;
    const createdAt = seconds ? new Date(parseInt(seconds, 10) * 1000).toISOString() : '';
    out.push({
      id: r.reviewId,
      store: 'play',
      rating: userComment.starRating,
      body: userComment.text,
      author: r.authorName || '(anônimo)',
      territoryOrLanguage: userComment.reviewerLanguage ?? '—',
      createdAt,
    });
  }
  return out;
}

export function InboxReviewsPage() {
  const [store, setStore] = useState<Store>('apple');
  const [appleData, setAppleData] = useState<AppleProxyResult | null>(null);
  const [playData, setPlayData] = useState<PlayProxyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | '1-2' | '3' | '4-5'>('all');

  // Fetch when tab changes
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    const fn = store === 'apple'
      ? callEdge<AppleProxyResult>('appstore-connect-proxy', { query: { op: 'reviews', limit: '100' } })
      : callEdge<PlayProxyResult>('play-developer-proxy', { query: { op: 'reviews', limit: '100' } });

    fn.then((r) => {
      if (!alive) return;
      if (!r.ok) {
        setError(r.error);
        setLoading(false);
        return;
      }
      if (store === 'apple') setAppleData(r.data as AppleProxyResult);
      else setPlayData(r.data as PlayProxyResult);
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [store]);

  const reviews: NormalizedReview[] = useMemo(() => {
    if (store === 'apple') {
      return normalizeApple(appleData?.body?.data ?? []);
    }
    return normalizePlay(playData?.body?.reviews ?? []);
  }, [store, appleData, playData]);

  const apiErrorMsg = useMemo(() => {
    if (store === 'apple') {
      const errs = appleData?.body?.errors;
      if (!errs || errs.length === 0) return null;
      return errs.map((e) => `${e.status} ${e.code}: ${e.title} ${e.detail ?? ''}`).join('; ');
    }
    return playData?.body?.error?.message ?? null;
  }, [store, appleData, playData]);

  const filtered = useMemo(() => {
    if (filter === 'all') return reviews;
    if (filter === '1-2') return reviews.filter((r) => r.rating <= 2);
    if (filter === '3') return reviews.filter((r) => r.rating === 3);
    return reviews.filter((r) => r.rating >= 4);
  }, [reviews, filter]);

  const stats = useMemo(() => {
    if (reviews.length === 0) return { avg: 0, total: 0, dist: [0, 0, 0, 0, 0] };
    const dist = [0, 0, 0, 0, 0];
    let sum = 0;
    for (const r of reviews) {
      const idx = Math.min(4, Math.max(0, r.rating - 1));
      dist[idx] = (dist[idx] ?? 0) + 1;
      sum += r.rating;
    }
    return { avg: sum / reviews.length, total: reviews.length, dist };
  }, [reviews]);

  const deepLink = store === 'apple' ? APPLE_DEEP_LINK : PLAY_DEEP_LINK;
  const consoleLabel = store === 'apple' ? 'Responder na Apple' : 'Abrir Play Console';

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
            <SparklesIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              Store Reviews
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              App Store + Play Store via APIs oficiais — read-only.
            </p>
          </div>
        </div>
        <Link
          to="/inbox"
          className="self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700 md:self-end"
        >
          ← Inbox
        </Link>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-navy-100">
        <TabBtn active={store === 'apple'} onClick={() => setStore('apple')}>
          App Store (iOS)
        </TabBtn>
        <TabBtn active={store === 'play'} onClick={() => setStore('play')}>
          Play Store (Android)
        </TabBtn>
      </div>

      {error && (
        <div className="ozly-card border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <strong className="font-semibold">Erro:</strong> {error}
          {error.includes('not configured') && (
            <p className="mt-1 text-xs text-rose-600">
              Configure em{' '}
              <Link to="/settings/integrations" className="underline">
                /settings/integrations
              </Link>{' '}
              → {store === 'apple' ? 'App Store Connect' : 'Google Play Developer API'}.
            </p>
          )}
        </div>
      )}

      {apiErrorMsg && (
        <div className="ozly-card border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
          <strong>API retornou erro:</strong> <code className="font-mono">{apiErrorMsg}</code>
        </div>
      )}

      {store === 'play' && !error && !loading && reviews.length === 0 && !apiErrorMsg && (
        <div className="ozly-card border-navy-100 bg-navy-50/40 p-4 text-sm text-navy-600">
          <strong>Sem reviews recentes no Play Store.</strong> A Google Play API só retorna reviews
          dos <strong>últimos 7 dias</strong>. Pra histórico completo, exporte o CSV no{' '}
          <a
            href="https://play.google.com/console"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 underline"
          >
            Play Console
          </a>
          .
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Avg rating"
          value={loading ? '…' : stats.total === 0 ? '—' : stats.avg.toFixed(1)}
          tone={
            stats.avg >= 4.5
              ? 'good'
              : stats.avg >= 3.5
                ? 'warn'
                : stats.total === 0
                  ? 'muted'
                  : 'bad'
          }
        />
        <Tile
          label={store === 'apple' ? 'Total (last 100)' : 'Last 7 days'}
          value={loading ? '…' : String(stats.total)}
          tone="brand"
        />
        <Tile label="5★" value={loading ? '…' : String(stats.dist[4])} tone="good" />
        <Tile
          label="1–2★"
          value={loading ? '…' : String((stats.dist[0] ?? 0) + (stats.dist[1] ?? 0))}
          tone={(stats.dist[0] ?? 0) + (stats.dist[1] ?? 0) === 0 ? 'good' : 'bad'}
        />
      </section>

      <Card className="ozly-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Title className="!text-sm !font-semibold text-navy-700">
            Reviews ({filtered.length})
          </Title>
          <div className="flex items-center gap-2">
            <select
              className="rounded-md border border-navy-100 bg-white px-2 py-1 text-xs text-navy-700"
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
            >
              <option value="all">Todas estrelas</option>
              <option value="4-5">4–5★</option>
              <option value="3">3★</option>
              <option value="1-2">1–2★ (urgente)</option>
            </select>
            <a
              href={deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md border border-navy-100 bg-white px-2 py-1 text-xs font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700"
            >
              {consoleLabel} <ExternalLinkIcon className="h-3 w-3" />
            </a>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-navy-400">
            <Spinner size="sm" /> Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-4 text-sm text-navy-400">
            {reviews.length === 0
              ? 'Sem reviews ainda.'
              : 'Sem reviews com esse filtro.'}
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {filtered.map((r) => (
              <li
                key={r.id}
                className="rounded-md border border-navy-50 bg-white p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Stars rating={r.rating} />
                    {r.title && (
                      <span className="text-sm font-semibold text-navy-700">
                        {r.title}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-navy-400">
                    {r.author} · {r.territoryOrLanguage}
                    {r.createdAt && (
                      <>
                        {' '}
                        ·{' '}
                        <span title={new Date(r.createdAt).toLocaleString('en-AU')}>
                          {fmtRel(r.createdAt)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {r.body && (
                  <p className="mt-2 whitespace-pre-line text-sm text-navy-600">
                    {r.body}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <RawDataPanel
        page="inbox-reviews"
        sources={[
          {
            rpc: store === 'apple'
              ? 'edge:appstore-connect-proxy?op=reviews'
              : 'edge:play-developer-proxy?op=reviews',
            params: { limit: 100 },
            data: store === 'apple' ? appleData : playData,
          },
        ]}
      />
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'text-brand-700'
          : 'text-navy-500 hover:text-navy-700'
      }`}
    >
      {children}
      {active && (
        <span
          className="absolute inset-x-2 bottom-0 h-0.5 rounded-full"
          style={{
            background: 'linear-gradient(90deg, var(--color-brand-500), var(--color-lime-400))',
          }}
        />
      )}
    </button>
  );
}

function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className="font-mono text-sm" aria-label={`${r} out of 5 stars`}>
      <span className={r >= 1 ? 'text-amber-500' : 'text-navy-200'}>★</span>
      <span className={r >= 2 ? 'text-amber-500' : 'text-navy-200'}>★</span>
      <span className={r >= 3 ? 'text-amber-500' : 'text-navy-200'}>★</span>
      <span className={r >= 4 ? 'text-amber-500' : 'text-navy-200'}>★</span>
      <span className={r >= 5 ? 'text-amber-500' : 'text-navy-200'}>★</span>
    </span>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
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
    </div>
  );
}
