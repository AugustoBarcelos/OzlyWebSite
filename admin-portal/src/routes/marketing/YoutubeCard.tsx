import { useEffect, useState } from 'react';
import { Card, Grid, Text, Title } from '@tremor/react';
import { ExternalLinkIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { Collapsible } from '@/components/Collapsible';
import {
  fetchChannelStats,
  fetchRecentVideos,
  formatYtDuration,
  type YtChannelStats,
  type YtVideoSummary,
} from '@/lib/youtube';
import { formatNumber, formatRelativeTime } from '@/lib/format';

/**
 * YouTube channel summary — uses VITE_YT_API_KEY + VITE_YT_CHANNEL_ID.
 *
 * Shows channel KPIs (subs / total views / video count) + the 6 most recent
 * videos with their stats. The Data API quota is 10k units/day; channel +
 * search + videos = ~3 units per page load, so we're nowhere near limit.
 *
 * Collapsed by default — fetches lazy on first open so the page doesn't burn
 * YT quota every time someone lands on /growth.
 */
export function YoutubeCard() {
  return (
    <Collapsible
      icon="▶️"
      title="YouTube"
      subtitle="Channel KPIs · subscribers, views, recent videos"
    >
      <YoutubeCardContent />
    </Collapsible>
  );
}

function YoutubeCardContent() {
  const [stats, setStats] = useState<YtChannelStats | null>(null);
  const [videos, setVideos] = useState<YtVideoSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [c, v] = await Promise.all([fetchChannelStats(), fetchRecentVideos(6)]);
      if (!alive) return;
      setStats(c);
      setVideos(v);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const channelUrl = stats?.customUrl
    ? `https://youtube.com/${stats.customUrl}`
    : stats
      ? `https://youtube.com/channel/${stats.channelId}`
      : 'https://studio.youtube.com';

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {stats?.thumbnailUrl && (
            <img
              src={stats.thumbnailUrl}
              alt={stats.title ?? 'YouTube channel'}
              className="h-12 w-12 rounded-full border border-navy-50"
            />
          )}
          <div>
            <Title>
              <span className="mr-1.5 text-xl">▶️</span>
              {stats?.title ?? 'YouTube'}
            </Title>
            <Text className="text-xs text-navy-300">
              {stats?.customUrl ?? 'Channel'} · created{' '}
              {stats?.publishedAt ? formatRelativeTime(stats.publishedAt) : '—'}
            </Text>
          </div>
        </div>
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-navy-100 bg-white px-2.5 py-1 text-xs text-navy-600 hover:border-brand-300 hover:text-brand-700"
        >
          Open channel
          <ExternalLinkIcon className="h-3 w-3" />
        </a>
      </div>

      <Grid numItemsSm={3} className="mt-4 gap-3">
        <div className="rounded-md border border-navy-50 bg-navy-50/40 p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-navy-400">
            Subscribers
          </div>
          {loading && !stats ? (
            <div className="mt-1 h-7 w-20 animate-pulse rounded bg-navy-100/60" />
          ) : (
            <div className="mt-1 text-2xl font-semibold text-brand-700">
              {stats?.subscriberCount === null ? 'hidden' : formatNumber(stats?.subscriberCount ?? 0)}
            </div>
          )}
        </div>
        <div className="rounded-md border border-navy-50 bg-navy-50/40 p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-navy-400">
            Total views
          </div>
          {loading && !stats ? (
            <div className="mt-1 h-7 w-20 animate-pulse rounded bg-navy-100/60" />
          ) : (
            <div className="mt-1 text-2xl font-semibold text-navy-700">
              {formatNumber(stats?.viewCount ?? 0)}
            </div>
          )}
        </div>
        <div className="rounded-md border border-navy-50 bg-navy-50/40 p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-navy-400">
            Videos
          </div>
          {loading && !stats ? (
            <div className="mt-1 h-7 w-20 animate-pulse rounded bg-navy-100/60" />
          ) : (
            <div className="mt-1 text-2xl font-semibold text-navy-700">
              {formatNumber(stats?.videoCount ?? 0)}
            </div>
          )}
        </div>
      </Grid>

      <div className="mt-5">
        <Text className="text-xs font-medium uppercase tracking-wide text-navy-400">
          Recent videos
        </Text>
        {loading && videos.length === 0 ? (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-md bg-navy-50/60" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="mt-2 flex h-32 items-center justify-center rounded-md border border-dashed border-navy-100 bg-navy-50/30 text-sm text-navy-300">
            No videos yet
          </div>
        ) : (
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {videos.map((v) => (
              <li key={v.videoId}>
                <a
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col rounded-md border border-navy-50 bg-white p-2 transition-colors hover:border-brand-300"
                >
                  {v.thumbnailUrl && (
                    <div className="relative">
                      <img
                        src={v.thumbnailUrl}
                        alt=""
                        className="h-20 w-full rounded object-cover"
                      />
                      {v.duration && (
                        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[10px] font-medium text-white">
                          {formatYtDuration(v.duration)}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-1.5 line-clamp-2 text-xs font-medium text-navy-700 group-hover:text-brand-700">
                    {v.title}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-navy-300">
                    <span>{formatNumber(v.views)} views</span>
                    <span>{v.publishedAt ? formatRelativeTime(v.publishedAt) : '—'}</span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {loading && (
        <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-navy-400">
          <Spinner size="sm" />
          Loading YouTube…
        </div>
      )}
    </Card>
  );
}
