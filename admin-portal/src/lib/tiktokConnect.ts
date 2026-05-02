/**
 * Reusable TikTok OAuth connect flow. Used by:
 *   - ConnectionsCard (Marketing → Connections)
 *   - TiktokCard (Growth → Organic) — keeps the connect button next to the
 *     stats so the admin doesn't have to leave the page.
 *
 * Opens the TikTok auth URL in a popup, then the popup-callback page (same
 * origin) postMessages back. We also fall back to localStorage events for
 * browsers that sever window.opener under COOP.
 */

import { callEdge } from './edge';

export interface ConnectResult {
  ok: boolean;
  error?: string;
}

export async function startTiktokConnect(opts: {
  redirectAfter?: string;
} = {}): Promise<ConnectResult> {
  const r = await callEdge<{ authorize_url?: string; error?: string }>(
    'tiktok-oauth-init',
    {
      method: 'POST',
      body: { redirect_after: opts.redirectAfter ?? '/ops/growth' },
    },
  );
  if (!r.ok || !r.data.authorize_url) {
    return {
      ok: false,
      error: r.ok ? r.data.error ?? 'no_url_returned' : r.error ?? 'edge_fn_failed',
    };
  }
  const popup = window.open(
    r.data.authorize_url,
    'oauth_connect',
    'width=600,height=720,scrollbars=yes',
  );
  if (!popup) return { ok: false, error: 'popup_blocked' };
  return { ok: true };
}

export type OauthEvent =
  | { type: 'oauth_connected'; provider: string; ts: number }
  | { type: 'oauth_failed'; provider: string; ts: number; desc?: string };

/**
 * Listen for OAuth completion events from the popup. Returns an unsubscribe
 * function. Same dedup logic as ConnectionsCard so we don't double-fire.
 */
export function subscribeOauthEvents(handler: (e: OauthEvent) => void): () => void {
  const consumed = new Set<string>();

  function consume(payload: unknown) {
    const data = payload as Partial<OauthEvent> | null;
    if (!data?.type) return;
    const dedupeKey = `${data.type}:${data.provider ?? ''}:${data.ts ?? ''}`;
    if (consumed.has(dedupeKey)) return;
    consumed.add(dedupeKey);
    handler(data as OauthEvent);
  }

  function onMessage(e: MessageEvent) {
    if (e.origin !== window.location.origin) return;
    consume(e.data);
  }
  function onStorage(e: StorageEvent) {
    if (e.key !== 'ozly_oauth_event' || !e.newValue) return;
    try {
      consume(JSON.parse(e.newValue));
    } catch {
      /* ignore */
    }
  }
  window.addEventListener('message', onMessage);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('message', onMessage);
    window.removeEventListener('storage', onStorage);
  };
}
