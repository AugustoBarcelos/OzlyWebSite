/**
 * iTunes Search API — public endpoints, no auth required.
 *
 * Two endpoints we use:
 *   1. Lookup: app metadata (name, rating, version, last update)
 *      GET https://itunes.apple.com/lookup?id={trackId}&country={cc}
 *
 *   2. Customer reviews RSS (most-recent / most-helpful sort)
 *      GET https://itunes.apple.com/{cc}/rss/customerreviews/id={trackId}/sortBy={sort}/json
 *
 * Both return JSON. No rate limit cap publicly documented; we cache for 5 min
 * client-side via in-memory map to be polite.
 */

const APPLE_APP_ID = '6760398649';
const COUNTRY_CODE_DEFAULT = 'au';

const cache = new Map<string, { at: number; data: unknown }>();
const TTL_MS = 5 * 60 * 1000;

async function cachedJson<T>(url: string): Promise<T | null> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return hit.data as T;
  }
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

export interface ItunesAppInfo {
  name: string | null;
  version: string | null;
  rating: number | null;
  ratingCount: number | null;
  ratingCurrentVersion: number | null;
  ratingCurrentVersionCount: number | null;
  releaseDate: string | null;
  currentVersionDate: string | null;
  fileSizeBytes: number | null;
  languages: string[];
  artworkUrl: string | null;
  appStoreUrl: string | null;
}

interface RawLookupResp {
  results?: Array<{
    trackName?: string;
    version?: string;
    averageUserRating?: number;
    userRatingCount?: number;
    averageUserRatingForCurrentVersion?: number;
    userRatingCountForCurrentVersion?: number;
    releaseDate?: string;
    currentVersionReleaseDate?: string;
    fileSizeBytes?: string;
    languageCodesISO2A?: string[];
    artworkUrl512?: string;
    trackViewUrl?: string;
  }>;
}

export async function fetchAppInfo(
  appId: string = APPLE_APP_ID,
  country: string = COUNTRY_CODE_DEFAULT,
): Promise<ItunesAppInfo | null> {
  const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(appId)}&country=${country}`;
  const data = await cachedJson<RawLookupResp>(url);
  const r = data?.results?.[0];
  if (!r) return null;
  return {
    name: r.trackName ?? null,
    version: r.version ?? null,
    rating: typeof r.averageUserRating === 'number' ? r.averageUserRating : null,
    ratingCount: typeof r.userRatingCount === 'number' ? r.userRatingCount : null,
    ratingCurrentVersion:
      typeof r.averageUserRatingForCurrentVersion === 'number'
        ? r.averageUserRatingForCurrentVersion
        : null,
    ratingCurrentVersionCount:
      typeof r.userRatingCountForCurrentVersion === 'number'
        ? r.userRatingCountForCurrentVersion
        : null,
    releaseDate: r.releaseDate ?? null,
    currentVersionDate: r.currentVersionReleaseDate ?? null,
    fileSizeBytes: r.fileSizeBytes ? Number(r.fileSizeBytes) : null,
    languages: Array.isArray(r.languageCodesISO2A) ? r.languageCodesISO2A : [],
    artworkUrl: r.artworkUrl512 ?? null,
    appStoreUrl: r.trackViewUrl ?? null,
  };
}

export interface ItunesReview {
  id: string;
  title: string;
  body: string;
  rating: number | null;
  author: string;
  version: string | null;
  updated: string | null;
}

interface RawReviewsResp {
  feed?: {
    entry?: Array<{
      id?: { label?: string };
      title?: { label?: string };
      content?: { label?: string };
      author?: { name?: { label?: string } };
      'im:rating'?: { label?: string };
      'im:version'?: { label?: string };
      updated?: { label?: string };
    }>;
  };
}

export async function fetchReviews(
  appId: string = APPLE_APP_ID,
  country: string = COUNTRY_CODE_DEFAULT,
  limit: number = 20,
): Promise<ItunesReview[]> {
  const url = `https://itunes.apple.com/${country}/rss/customerreviews/id=${appId}/sortBy=mostRecent/json`;
  const data = await cachedJson<RawReviewsResp>(url);
  const entries = data?.feed?.entry ?? [];
  // First entry is the app itself, skip it.
  const reviewEntries = entries.length > 1 ? entries.slice(1) : entries;
  return reviewEntries.slice(0, limit).map((e) => ({
    id: e.id?.label ?? Math.random().toString(36),
    title: e.title?.label ?? '(no title)',
    body: e.content?.label ?? '',
    rating: e['im:rating']?.label ? Number(e['im:rating'].label) : null,
    author: e.author?.name?.label ?? 'anonymous',
    version: e['im:version']?.label ?? null,
    updated: e.updated?.label ?? null,
  }));
}
