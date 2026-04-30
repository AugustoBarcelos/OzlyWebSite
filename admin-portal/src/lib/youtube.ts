/**
 * YouTube Data API v3 client — read-only.
 *
 * Public API key (browser-exposed) restricted to specific endpoints / referers.
 * Endpoints used:
 *   GET /channels?part=snippet,statistics,brandingSettings&id={ch}&key={k}
 *   GET /search?part=snippet&channelId={ch}&order=date&type=video&maxResults=N
 *   GET /videos?part=statistics,snippet&id={ids}&key={k}
 *
 * 5-min in-memory cache to be polite with quota (10k units / day default).
 */

import { env } from './env';

const BASE = 'https://www.googleapis.com/youtube/v3';
const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; data: unknown }>();

async function cachedJson<T>(url: string): Promise<T | null> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data as T;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as T;
    cache.set(url, { at: Date.now(), data });
    return data;
  } catch (_e) {
    return null;
  }
}

export function isYoutubeConfigured(): boolean {
  return Boolean(env.ytApiKey && env.ytChannelId);
}

export interface YtChannelStats {
  channelId: string;
  title: string | null;
  description: string | null;
  customUrl: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  subscriberCount: number | null;
  videoCount: number | null;
  viewCount: number | null;
}

interface RawChannelResp {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      customUrl?: string;
      publishedAt?: string;
      thumbnails?: { medium?: { url?: string } };
    };
    statistics?: {
      subscriberCount?: string;
      hiddenSubscriberCount?: boolean;
      videoCount?: string;
      viewCount?: string;
    };
  }>;
}

function asInt(v: string | undefined | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function fetchChannelStats(): Promise<YtChannelStats | null> {
  if (!isYoutubeConfigured()) return null;
  const url = `${BASE}/channels?part=snippet,statistics&id=${env.ytChannelId}&key=${env.ytApiKey}`;
  const data = await cachedJson<RawChannelResp>(url);
  const item = data?.items?.[0];
  if (!item) return null;
  return {
    channelId: item.id ?? env.ytChannelId ?? '',
    title: item.snippet?.title ?? null,
    description: item.snippet?.description ?? null,
    customUrl: item.snippet?.customUrl ?? null,
    thumbnailUrl: item.snippet?.thumbnails?.medium?.url ?? null,
    publishedAt: item.snippet?.publishedAt ?? null,
    subscriberCount: item.statistics?.hiddenSubscriberCount
      ? null
      : asInt(item.statistics?.subscriberCount),
    videoCount: asInt(item.statistics?.videoCount),
    viewCount: asInt(item.statistics?.viewCount),
  };
}

export interface YtVideoSummary {
  videoId: string;
  title: string;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  duration: string | null;
  url: string;
}

interface RawSearchResp {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      publishedAt?: string;
      thumbnails?: { medium?: { url?: string } };
    };
  }>;
}

interface RawVideosResp {
  items?: Array<{
    id?: string;
    contentDetails?: { duration?: string };
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
  }>;
}

export async function fetchRecentVideos(limit = 10): Promise<YtVideoSummary[]> {
  if (!isYoutubeConfigured()) return [];
  const channelId = env.ytChannelId!;
  const apiKey = env.ytApiKey!;
  const searchUrl = `${BASE}/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=${limit}&key=${apiKey}`;
  const search = await cachedJson<RawSearchResp>(searchUrl);
  const items = search?.items ?? [];
  if (items.length === 0) return [];

  // Resolve stats for the same set of video ids.
  type VideoStats = NonNullable<RawVideosResp['items']>[number];
  const ids = items
    .map((i) => i.id?.videoId)
    .filter((v): v is string => Boolean(v));
  const statsMap = new Map<string, VideoStats>();
  if (ids.length > 0) {
    const statsUrl = `${BASE}/videos?part=statistics,contentDetails&id=${ids.join(',')}&key=${apiKey}`;
    const stats = await cachedJson<RawVideosResp>(statsUrl);
    for (const s of stats?.items ?? []) {
      if (s.id) statsMap.set(s.id, s);
    }
  }

  return items.map((i) => {
    const id = i.id?.videoId ?? '';
    const s = statsMap.get(id);
    return {
      videoId: id,
      title: i.snippet?.title ?? '(untitled)',
      publishedAt: i.snippet?.publishedAt ?? null,
      thumbnailUrl: i.snippet?.thumbnails?.medium?.url ?? null,
      views: asInt(s?.statistics?.viewCount),
      likes: asInt(s?.statistics?.likeCount),
      comments: asInt(s?.statistics?.commentCount),
      duration: s?.contentDetails?.duration ?? null,
      url: `https://www.youtube.com/watch?v=${id}`,
    };
  });
}

/** Convert ISO 8601 PT4M13S → "4:13" */
export function formatYtDuration(iso: string | null): string {
  if (!iso) return '—';
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return '—';
  const [, h, mm, s] = m;
  const hh = h ? Number(h) : 0;
  const mins = mm ? Number(mm) : 0;
  const secs = s ? Number(s) : 0;
  if (hh > 0) return `${hh}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
