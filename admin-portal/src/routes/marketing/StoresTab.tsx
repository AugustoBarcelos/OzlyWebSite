import { useEffect, useState } from 'react';
import { Card, Grid, Text, Title } from '@tremor/react';
import { KpiHero } from '@/components/charts/KpiHero';
import { ExternalLinkIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { fetchAppInfo, fetchReviews, type ItunesAppInfo, type ItunesReview } from '@/lib/itunes';
import { formatNumber, formatRelativeTime } from '@/lib/format';

/**
 * Stores tab — App Store + Play Store metadata.
 *
 * App Store: free public iTunes Search + Customer Reviews RSS APIs (no auth).
 * Play Store: no public API; we link out to the listing and document the
 * scraping option (SerpAPI / scraperapi.com) as an upgrade path.
 */

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.augusto.ozly';
const APPLE_APP_ID = '6760398649';

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-navy-300">—</span>;
  const full = Math.floor(rating);
  const half = rating - full >= 0.25 && rating - full < 0.75;
  const stars = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) stars.push('★');
    else if (i === full && half) stars.push('⯨');
    else stars.push('☆');
  }
  return (
    <span className="font-mono text-sm text-amber-500" title={`${rating.toFixed(2)} of 5`}>
      {stars.join('')}
    </span>
  );
}

export function StoresTab() {
  const [info, setInfo] = useState<ItunesAppInfo | null>(null);
  const [reviews, setReviews] = useState<ItunesReview[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [i, r] = await Promise.all([fetchAppInfo(), fetchReviews()]);
      if (!alive) return;
      setInfo(i);
      setReviews(r);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <Grid numItemsSm={2} numItemsLg={4} className="gap-4">
        <KpiHero
          label="App Store rating"
          value={info?.rating ?? null}
          formatter={(v) => (v === null ? '—' : `${v.toFixed(2)} ★`)}
          hint={
            info?.ratingCount
              ? `${formatNumber(info.ratingCount)} ratings all-time`
              : 'No ratings yet'
          }
          loading={loading && !info}
          tone="brand"
        />
        <KpiHero
          label="Current version"
          value={info?.version ? Number(info.version) : null}
          formatter={(_) => info?.version ?? '—'}
          hint={
            info?.currentVersionDate
              ? `Released ${formatRelativeTime(info.currentVersionDate)}`
              : 'Loading…'
          }
          loading={loading && !info}
          tone="lime"
        />
        <KpiHero
          label="Ratings (current ver)"
          value={info?.ratingCurrentVersionCount ?? null}
          hint={
            info?.ratingCurrentVersion
              ? `${info.ratingCurrentVersion.toFixed(2)}★ avg this version`
              : 'No ratings on this version'
          }
          loading={loading && !info}
          tone="neutral"
        />
        <KpiHero
          label="Recent reviews shown"
          value={reviews?.length ?? null}
          hint="Most-recent App Store reviews · AU"
          loading={loading && !reviews}
          tone="brand"
        />
      </Grid>

      <Grid numItemsLg={3} className="gap-4">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <Title>App Store reviews · AU</Title>
              <a
                href={info?.appStoreUrl ?? `https://apps.apple.com/au/app/id${APPLE_APP_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-navy-400 hover:text-brand-700"
              >
                Open in App Store
                <ExternalLinkIcon className="h-3 w-3" />
              </a>
            </div>
            {loading ? (
              <div className="mt-4 space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded bg-navy-50/60" />
                ))}
              </div>
            ) : !reviews || reviews.length === 0 ? (
              <div className="mt-4 flex h-40 items-center justify-center rounded-md border border-dashed border-navy-100 bg-navy-50/30 text-sm text-navy-300">
                No reviews yet for this app
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-md border border-navy-50 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <StarRating rating={r.rating} />
                          <span className="truncate text-sm font-medium text-navy-700">
                            {r.title}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-navy-500 line-clamp-3">{r.body}</p>
                        <div className="mt-1 text-[11px] text-navy-300">
                          by {r.author} · v{r.version ?? '?'} ·{' '}
                          {r.updated ? formatRelativeTime(r.updated) : '—'}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card>
          <Title>Google Play</Title>
          <Text className="mt-1 text-xs text-navy-300">
            No public API — link-out for now
          </Text>
          <div className="mt-4 flex h-44 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-navy-100 bg-navy-50/30 px-4 text-center text-xs text-navy-400">
            <span>
              Play Store doesn't expose a free metadata API. Options to enable
              ratings + reviews here:
            </span>
            <ul className="space-y-1 text-left">
              <li>• Google Play Console API (auth req'd, free)</li>
              <li>• SerpAPI / scraperapi.com (paid, easier)</li>
            </ul>
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1 text-xs font-medium text-navy-600 shadow-sm hover:text-brand-700"
            >
              Open in Play Store
              <ExternalLinkIcon className="h-3 w-3" />
            </a>
          </div>
        </Card>
      </Grid>

      {info && (
        <Card>
          <Title>App metadata</Title>
          <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between border-b border-navy-50 py-1.5">
              <span className="text-navy-400">Name</span>
              <span className="font-medium text-navy-700">{info.name ?? '—'}</span>
            </div>
            <div className="flex justify-between border-b border-navy-50 py-1.5">
              <span className="text-navy-400">First released</span>
              <span className="font-medium text-navy-700">
                {info.releaseDate
                  ? new Date(info.releaseDate).toLocaleDateString('en-AU')
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between border-b border-navy-50 py-1.5">
              <span className="text-navy-400">Current version date</span>
              <span className="font-medium text-navy-700">
                {info.currentVersionDate
                  ? new Date(info.currentVersionDate).toLocaleDateString('en-AU')
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between border-b border-navy-50 py-1.5">
              <span className="text-navy-400">Bundle size</span>
              <span className="font-medium text-navy-700">
                {info.fileSizeBytes
                  ? `${(info.fileSizeBytes / 1_000_000).toFixed(1)} MB`
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between border-b border-navy-50 py-1.5">
              <span className="text-navy-400">Languages</span>
              <span className="font-medium text-navy-700">
                {info.languages.join(', ') || '—'}
              </span>
            </div>
            <div className="flex justify-between border-b border-navy-50 py-1.5">
              <span className="text-navy-400">Apple App ID</span>
              <span className="font-mono text-xs text-navy-700">{APPLE_APP_ID}</span>
            </div>
          </div>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-navy-400">
          <Spinner size="sm" />
          Loading store data…
        </div>
      )}
    </div>
  );
}
