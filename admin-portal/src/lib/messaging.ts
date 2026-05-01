import { callRpc } from './rpc';
import type { ChannelKind } from './auth';

export type MsgChannel = Extract<ChannelKind, `msg_${string}`>;

export const MESSAGING_SEGMENTS = [
  { value: 'all-active', label: 'Todos signups (30d)', hint: 'Qualquer signup nos últimos 30 dias' },
  { value: 'trial-2d', label: 'Trial expirando (2d)', hint: 'Trial picked há 12-14 dias' },
  { value: 'trial-7d-no-pay', label: 'Trial expirou sem pagar (7d)', hint: 'Trial expirou 7d e nunca pagou' },
  { value: 'paid-30d', label: 'Pagantes ativos (30d)', hint: 'Pagaram pelo menos 1× nos últimos 30 dias' },
  { value: 'paid-renewed', label: 'Pagantes renovados', hint: 'Já pagaram 2 ou mais vezes' },
  { value: 'affiliate-active', label: 'Vindos de afiliado', hint: 'Conversões de programa de afiliados' },
] as const;

export type SegmentValue = (typeof MESSAGING_SEGMENTS)[number]['value'];

export type BroadcastStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'cancelled';

export interface BroadcastRow {
  id: string;
  channel: MsgChannel;
  segment: string;
  subject: string | null;
  body_preview: string;
  scheduled_at: string | null;
  status: BroadcastStatus;
  audience_count: number | null;
  sent_count: number;
  failed_count: number;
  opened_count: number;
  clicked_count: number;
  open_rate_pct: number | null;
  created_at: string;
  sent_at: string | null;
}

export async function fetchAudienceCount(segment: string) {
  return callRpc<{ segment: string; count: number }>('admin_audience_count', {
    p_segment: segment,
  });
}

export interface CreateBroadcastInput {
  channel: MsgChannel;
  segment: string;
  subject?: string | null;
  body: string;
  scheduledAt?: string | null;
}

export async function createBroadcast(input: CreateBroadcastInput) {
  return callRpc<{ ok: boolean; broadcast_id: string; audience_count: number; status: BroadcastStatus }>(
    'messaging_create_broadcast',
    {
      p_channel: input.channel,
      p_segment: input.segment,
      p_subject: input.subject ?? null,
      p_body: input.body,
      p_scheduled_at: input.scheduledAt ?? null,
    },
  );
}

export async function listBroadcasts(channel?: MsgChannel, limit = 50) {
  return callRpc<{ broadcasts: BroadcastRow[] }>('messaging_list_broadcasts', {
    p_channel: channel ?? null,
    p_limit: limit,
  });
}

export async function deleteBroadcast(id: string) {
  return callRpc<{ ok: boolean }>('messaging_delete_broadcast', { p_id: id });
}
