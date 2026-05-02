/**
 * TikTok stats client — wraps the `tiktok-stats` edge function.
 *
 * The browser cannot call the TikTok API directly (no CORS, and the access
 * token must stay server-side), so this module just talks to our edge fn,
 * which proxies the call using the OAuth connection the admin previously
 * created via the Marketing → Connections card.
 *
 * Usage:
 *   const stats = await fetchTiktokStats();
 *   if (stats.kind === 'connected') { ... }
 *   if (stats.kind === 'not_connected') { ... show hint to connect ... }
 */

import { callEdge } from './edge';

export interface TiktokVideo {
  id?: string;
  title?: string;
  video_description?: string;
  duration?: number;
  cover_image_url?: string;
  embed_link?: string;
  share_url?: string;
  create_time?: number;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
}

export interface TiktokProfileStats {
  open_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio_description: string | null;
  profile_deep_link: string | null;
  is_verified: boolean;
  follower_count: number | null;
  following_count: number | null;
  likes_count: number | null;
  video_count: number | null;
  scope: string | null;
  /** Null when scope is missing or endpoint failed — see videos_error. */
  videos: TiktokVideo[] | null;
  videos_error: string | null;
}

export type TiktokStatsResult =
  | { kind: 'connected'; data: TiktokProfileStats }
  | { kind: 'not_connected' }
  | { kind: 'error'; message: string };

const TTL_MS = 5 * 60 * 1000;
let cache: { at: number; data: TiktokProfileStats } | null = null;

export async function fetchTiktokStats(opts: { force?: boolean } = {}): Promise<TiktokStatsResult> {
  if (!opts.force && cache && Date.now() - cache.at < TTL_MS) {
    return { kind: 'connected', data: cache.data };
  }
  const res = await callEdge<TiktokProfileStats>('tiktok-stats', { method: 'GET' });
  if (res.ok) {
    cache = { at: Date.now(), data: res.data };
    return { kind: 'connected', data: res.data };
  }
  if (res.status === 404) return { kind: 'not_connected' };
  return { kind: 'error', message: res.error };
}

export function clearTiktokStatsCache(): void {
  cache = null;
}
