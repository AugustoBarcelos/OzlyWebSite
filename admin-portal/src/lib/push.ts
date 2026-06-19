import { callRpc } from './rpc';
import { MESSAGING_SEGMENTS } from './messaging';

// Push reuses the email composer's segments, plus a "tudo" sentinel meaning
// "everyone with a registered device".
export const PUSH_SEGMENTS = [
  { value: '__all__', label: 'Todos com app', hint: 'Todos os aparelhos com push registrado' },
  ...MESSAGING_SEGMENTS,
] as const;

export type PushSegmentValue = (typeof PUSH_SEGMENTS)[number]['value'];

export type PushStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'cancelled';

export interface PushBroadcastRow {
  id: string;
  segment: string;
  title: string;
  body_preview: string;
  scheduled_at: string | null;
  status: PushStatus;
  audience_count: number | null;
  sent_count: number;
  failed_count: number;
  opened_count: number;
  open_rate_pct: number | null;
  created_at: string;
  sent_at: string | null;
}

export async function fetchPushAudienceCount(segment: string) {
  return callRpc<{ segment: string; count: number }>('push_audience_count', {
    p_segment: segment,
  });
}

// Sentinel segment for hand-picked recipients (mirrors the backend '__users__').
export const PUSH_USERS_SEGMENT = '__users__';

export interface CreatePushInput {
  segment: string;
  title: string;
  body: string;
  scheduledAt?: string | null;
  /** Required when segment === '__users__': the hand-picked recipient ids. */
  userIds?: string[] | null;
}

export async function createPushBroadcast(input: CreatePushInput) {
  return callRpc<{ ok: boolean; broadcast_id: string; audience_count: number; status: PushStatus }>(
    'push_create_broadcast',
    {
      p_segment: input.segment,
      p_title: input.title,
      p_body: input.body,
      p_data: {},
      p_scheduled_at: input.scheduledAt ?? null,
      p_user_ids: input.userIds ?? null,
    },
  );
}

export interface PushUserHit {
  id: string;
  full_name: string | null;
  email_masked: string | null;
  has_device: boolean;
}

/** Admin-only user search for the "specific clients" picker (email/name prefix). */
export async function searchPushUsers(query: string, limit = 20) {
  return callRpc<{ users: PushUserHit[] }>('push_search_users', {
    p_query: query,
    p_limit: limit,
  });
}

export async function listPushBroadcasts(limit = 50) {
  return callRpc<{ broadcasts: PushBroadcastRow[] }>('push_list_broadcasts', {
    p_limit: limit,
  });
}

export async function deletePushBroadcast(id: string) {
  return callRpc<{ ok: boolean }>('push_delete_broadcast', { p_id: id });
}

/**
 * Arm a draft/scheduled/failed push to send now: flips it to scheduled@now so
 * the `push-broadcast-dispatch` cron (every minute) hands it to the
 * push-broadcast edge function. Delivery is near-real-time (≤1 min), not instant.
 */
export async function sendPushNow(id: string) {
  return callRpc<{ ok: boolean; broadcast_id: string; status: PushStatus }>(
    'push_send_now',
    { p_id: id },
  );
}
