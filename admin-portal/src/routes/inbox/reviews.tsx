import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import { ExternalLinkIcon, SparklesIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { RawDataPanel } from '@/components/RawDataPanel';
import { callEdge } from '@/lib/edge';

/**
 * /inbox/reviews — App Store customer reviews via App Store Connect API.
 *
 * Calls the appstore-connect-proxy edge function which holds the ASC private
 * key server-side and signs JWTs in-memory. Browser only sees results.
 */

interface ReviewAttributes {
  rating: number;
  title: string;
  body: string;
  reviewerNickname: string;
  createdDate: string;
  territory: string;
}

interface Review {
  id: string;
  attributes: ReviewAttributes;
}

interface ProxyResult {
  ok: boolean;
  status: number;
  body: {
    data?: Review[];
    errors?: Array<{ status?: string; title?: string; detail?: string; code?: string }>;
    meta?: { paging?: { total?: number } };
  };
}

const APPLE_REVIEWS_DEEP_LINK =
  'https://appstoreconnect.apple.com/apps/6760398649/distribution/activity/ios/ratings';

function fmtDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtRel(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!ts) return '';
  const diff = Date.now() - ts;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 30) return `${days}d atrás`;
  if (days < 365) return `${Math.floor(days / 30)}mo atrás`;
  return `${Math.floor(days / 365)}y atrás`;
}

export function InboxReviewsPage() {
  const [data, setData] = useState<ProxyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | '1-2' | '3' | '4-5'>('all');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      const r = await callEdge<ProxyResult>('appstore-connect-proxy', {
        query: { op: 'reviews', limit: '100' },
      });
      if (!alive) return;
      if (!r.ok) {
        setError(r.error);
        setLoading(false);
        return;
      }
      setData(r.data);
      setLoading(false);
    })();
    return () => {
      alive = true;
    };
  }, []);

  const reviews = useMemo(() => data?.body?.data ?? [], [data]);
  const apiErrors = data?.body?.errors;

  const filtered = useMemo(() => {
    if (filter === 'all') return reviews;
    if (filter === '1-2')
      return reviews.filter((r) => r.attributes.rating <= 2);
    if (filter === '3') return reviews.filter((r) => r.attributes.rating === 3);
    return reviews.filter((r) => r.attributes.rating >= 4);
  }, [reviews, filter]);

  const stats = useMemo(() => {
    if (reviews.length === 0) return { avg: 0, total: 0, dist: [0, 0, 0, 0, 0] };
    const dist = [0, 0, 0, 0, 0];
    let sum = 0;
    for (const r of reviews) {
      const idx = Math.min(4, Math.max(0, r.attributes.rating - 1));
      dist[idx] = (dist[idx] ?? 0) + 1;
      sum += r.attributes.rating;
    }
    return { avg: sum / reviews.length, total: reviews.length, dist };
  }, [reviews]);

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
              App Store Reviews
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Reviews via App Store Connect API. Read-only — pra responder, abre na Apple.
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

      {error && (
        <div className="ozly-card border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <strong className="font-semibold">Erro:</strong> {error}
          {error.includes('not configured') && (
            <p className="mt-1 text-xs text-rose-600">
              Setar secrets <code>APPSTORE_CONNECT_*</code> via{' '}
              <code>npx supabase secrets set</code>.
            </p>
          )}
        </div>
      )}

      {apiErrors && apiErrors.length > 0 && (
        <div className="ozly-card border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
          <strong>Apple API retornou erro:</strong>
          <ul className="mt-2 list-disc pl-5">
            {apiErrors.map((e, i) => (
              <li key={i}>
                <code className="font-mono">{e.status} {e.code}</code> — {e.title}
                {e.detail && <span>: {e.detail}</span>}
              </li>
            ))}
          </ul>
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
          label="Total (last 100)"
          value={loading ? '…' : String(stats.total)}
          tone="brand"
        />
        <Tile
          label="5★"
          value={loading ? '…' : String(stats.dist[4])}
          tone="good"
        />
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
              href={APPLE_REVIEWS_DEEP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md border border-navy-100 bg-white px-2 py-1 text-xs font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700"
            >
              Responder na Apple <ExternalLinkIcon className="h-3 w-3" />
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
                    <Stars rating={r.attributes.rating} />
                    <span className="text-sm font-semibold text-navy-700">
                      {r.attributes.title || '(no title)'}
                    </span>
                  </div>
                  <div className="text-[11px] text-navy-400">
                    {r.attributes.reviewerNickname} · {r.attributes.territory} ·{' '}
                    <span title={fmtDate(r.attributes.createdDate)}>
                      {fmtRel(r.attributes.createdDate)}
                    </span>
                  </div>
                </div>
                {r.attributes.body && (
                  <p className="mt-2 whitespace-pre-line text-sm text-navy-600">
                    {r.attributes.body}
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
            rpc: 'edge:appstore-connect-proxy?op=reviews',
            params: { limit: 100 },
            data,
          },
        ]}
      />
    </div>
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
