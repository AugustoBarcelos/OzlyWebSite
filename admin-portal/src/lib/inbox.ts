// Helpers for the WhatsApp + Messenger inboxes.
// Wraps admin_messaging_* RPCs (read) and {whatsapp,messenger}-send edge
// functions (write). Channel determines table + edge function dispatched.

import { callRpc } from './rpc';
import { callEdge, type EdgeResult } from './edge';

export type InboxChannel = 'whatsapp' | 'messenger';

export interface InboxConversation {
  id: string;
  external_id: string;            // wa_id or psid
  display_name: string | null;
  last_message_at: string;
  last_inbound_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  archived: boolean;
  created_at: string;
}

export interface InboxMessage {
  id: string;
  direction: 'in' | 'out';
  type: string;
  body: string | null;
  // WhatsApp-specific
  media_url?: string | null;
  media_mime?: string | null;
  template_name?: string | null;
  // Messenger-specific
  attachment_url?: string | null;
  attachment_type?: string | null;
  message_tag?: string | null;
  // Common
  status: string | null;
  status_error: Record<string, unknown> | null;
  sent_by_admin: string | null;
  created_at: string;
}

export async function listConversations(channel: InboxChannel, opts: { includeArchived?: boolean; limit?: number } = {}) {
  return callRpc<{ rows: InboxConversation[]; channel: InboxChannel }>(
    'admin_messaging_conversations_list',
    {
      p_channel: channel,
      p_include_archived: opts.includeArchived ?? false,
      p_limit: opts.limit ?? 50,
    },
  );
}

export async function listMessages(channel: InboxChannel, conversationId: string, limit = 100) {
  return callRpc<{ rows: InboxMessage[]; channel: InboxChannel; conversation_id: string }>(
    'admin_messaging_messages_list',
    {
      p_channel: channel,
      p_conversation_id: conversationId,
      p_limit: limit,
    },
  );
}

export async function markConversationRead(channel: InboxChannel, conversationId: string) {
  return callRpc<{ success: boolean }>('admin_messaging_mark_read', {
    p_channel: channel,
    p_conversation_id: conversationId,
  });
}

export interface SendWhatsAppTextInput {
  conversation_id: string;
  body: string;
}

export interface SendWhatsAppTemplateInput {
  conversation_id: string;
  template_name: string;
  language?: string;
  components?: unknown[];
}

export async function sendWhatsAppText(input: SendWhatsAppTextInput): Promise<EdgeResult<{ ok: true; wa_message_id: string | null }>> {
  return callEdge('whatsapp-send', {
    method: 'POST',
    body: { conversation_id: input.conversation_id, type: 'text', body: input.body },
  });
}

export async function sendWhatsAppTemplate(input: SendWhatsAppTemplateInput): Promise<EdgeResult<{ ok: true; wa_message_id: string | null }>> {
  return callEdge('whatsapp-send', {
    method: 'POST',
    body: {
      conversation_id: input.conversation_id,
      type: 'template',
      template_name: input.template_name,
      language: input.language,
      components: input.components,
    },
  });
}

export interface SendMessengerInput {
  conversation_id: string;
  body: string;
  message_tag?: 'ACCOUNT_UPDATE' | 'CONFIRMED_EVENT_UPDATE' | 'POST_PURCHASE_UPDATE' | 'HUMAN_AGENT' | 'CUSTOMER_FEEDBACK';
}

export async function sendMessenger(input: SendMessengerInput): Promise<EdgeResult<{ ok: true; mid: string | null }>> {
  return callEdge('messenger-send', {
    method: 'POST',
    body: input,
  });
}

/** True if last_inbound_at is within 24h — i.e. free-form replies allowed. */
export function isWithin24hWindow(conv: Pick<InboxConversation, 'last_inbound_at'>): boolean {
  if (!conv.last_inbound_at) return false;
  const lastIn = new Date(conv.last_inbound_at).getTime();
  return Date.now() - lastIn < 24 * 60 * 60 * 1000;
}
