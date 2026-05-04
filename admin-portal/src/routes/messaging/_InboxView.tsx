import { useEffect, useMemo, useState } from 'react';
import {
  type InboxChannel,
  type InboxConversation,
  type InboxMessage,
  isWithin24hWindow,
  listConversations,
  listMessages,
  markConversationRead,
  sendMessenger,
  sendWhatsAppText,
} from '@/lib/inbox';
import { Spinner } from '@/components/Spinner';

interface InboxViewProps {
  channel: InboxChannel;
  /** Shown above the list when there are no conversations yet. */
  emptyHint: string;
}

/**
 * Two-pane inbox shared by WhatsApp + Messenger pages.
 * Left: conversation list (real-time refresh on focus).
 * Right: message thread + reply composer.
 *
 * Outside the 24h window, WhatsApp requires a template (composer disabled
 * with hint), Messenger requires a message_tag (selector appears).
 */
export function InboxView({ channel, emptyHint }: InboxViewProps) {
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  async function refreshConversations() {
    try {
      const res = await listConversations(channel);
      setConversations(res.rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshConversations();
    const onFocus = () => void refreshConversations();
    window.addEventListener('focus', onFocus);
    const t = setInterval(refreshConversations, 30_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
      <aside className="rounded-lg border border-navy-100 bg-white p-2 md:max-h-[640px] md:overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8"><Spinner /></div>
        ) : error ? (
          <p className="px-2 py-3 text-xs text-rose-600">{error}</p>
        ) : conversations.length === 0 ? (
          <p className="px-2 py-3 text-xs text-navy-500">{emptyHint}</p>
        ) : (
          <ul className="space-y-1">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(c.id);
                    if (c.unread_count > 0) void markConversationRead(channel, c.id).then(refreshConversations);
                  }}
                  className={`w-full rounded-md px-2.5 py-2 text-left transition-colors ${
                    activeId === c.id ? 'bg-brand-50' : 'hover:bg-navy-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-navy-700">
                      {c.display_name ?? c.external_id}
                    </span>
                    {c.unread_count > 0 && (
                      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold text-white">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-navy-500">
                    {c.last_message_preview ?? '—'}
                  </p>
                  <p className="mt-0.5 text-[10px] text-navy-400">
                    {new Date(c.last_message_at).toLocaleString()}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="rounded-lg border border-navy-100 bg-white">
        {active ? (
          <ConversationPanel
            channel={channel}
            conversation={active}
            onSent={refreshConversations}
          />
        ) : (
          <div className="flex h-full min-h-[400px] items-center justify-center px-6 py-12 text-center">
            <p className="text-sm text-navy-500">
              Selecione uma conversa pra ver as mensagens.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

interface ConversationPanelProps {
  channel: InboxChannel;
  conversation: InboxConversation;
  onSent: () => void;
}

function ConversationPanel({ channel, conversation, onSent }: ConversationPanelProps) {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [tag, setTag] = useState<'' | 'ACCOUNT_UPDATE' | 'CONFIRMED_EVENT_UPDATE' | 'POST_PURCHASE_UPDATE' | 'HUMAN_AGENT' | 'CUSTOMER_FEEDBACK'>('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const within24h = isWithin24hWindow(conversation);

  async function loadMessages() {
    setLoading(true);
    try {
      const res = await listMessages(channel, conversation.id);
      setMessages(res.rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, channel]);

  async function handleSend() {
    if (!reply.trim() || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const result = channel === 'whatsapp'
        ? await sendWhatsAppText({ conversation_id: conversation.id, body: reply.trim() })
        : await sendMessenger(
            tag === ''
              ? { conversation_id: conversation.id, body: reply.trim() }
              : { conversation_id: conversation.id, body: reply.trim(), message_tag: tag },
          );
      if (!result.ok) {
        setSendError(result.error);
        return;
      }
      setReply('');
      setTag('');
      await loadMessages();
      onSent();
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setSending(false);
    }
  }

  const composerDisabled = channel === 'whatsapp' && !within24h;

  return (
    <div className="flex h-full min-h-[400px] flex-col">
      <header className="border-b border-navy-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-navy-700">
              {conversation.display_name ?? conversation.external_id}
            </h3>
            <p className="text-[11px] text-navy-400">{conversation.external_id}</p>
          </div>
          {!within24h && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              {channel === 'whatsapp' ? 'Template required' : '24h window expired'}
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3 md:max-h-[480px]">
        {loading ? (
          <div className="flex items-center justify-center py-8"><Spinner /></div>
        ) : error ? (
          <p className="text-xs text-rose-600">{error}</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-navy-500">Nenhuma mensagem ainda.</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                  m.direction === 'out'
                    ? 'bg-brand-600 text-white'
                    : 'bg-navy-50 text-navy-700'
                }`}
              >
                {m.body ?? <em className="opacity-70">[{m.type}]</em>}
                {m.template_name && (
                  <p className="mt-1 text-[10px] opacity-70">template: {m.template_name}</p>
                )}
                {m.message_tag && (
                  <p className="mt-1 text-[10px] opacity-70">tag: {m.message_tag}</p>
                )}
                <p className={`mt-1 text-[10px] ${m.direction === 'out' ? 'text-brand-100' : 'text-navy-400'}`}>
                  {new Date(m.created_at).toLocaleTimeString()}
                  {m.direction === 'out' && m.status && ` · ${m.status}`}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <footer className="border-t border-navy-100 px-4 py-3">
        {composerDisabled ? (
          <p className="text-xs text-navy-500">
            Última mensagem do contato &gt; 24h. WhatsApp exige <strong>template aprovado</strong> pra responder agora — UI de templates ainda não implementada.
          </p>
        ) : (
          <>
            {channel === 'messenger' && !within24h && (
              <div className="mb-2">
                <label className="block text-[11px] font-medium text-navy-500">Message Tag (obrigatório &gt; 24h)</label>
                <select
                  value={tag}
                  onChange={(e) => setTag(e.target.value as typeof tag)}
                  className="mt-1 w-full rounded-md border border-navy-200 px-2 py-1 text-xs"
                >
                  <option value="">— Selecione —</option>
                  <option value="HUMAN_AGENT">HUMAN_AGENT (recomendado p/ suporte)</option>
                  <option value="ACCOUNT_UPDATE">ACCOUNT_UPDATE</option>
                  <option value="CONFIRMED_EVENT_UPDATE">CONFIRMED_EVENT_UPDATE</option>
                  <option value="POST_PURCHASE_UPDATE">POST_PURCHASE_UPDATE</option>
                  <option value="CUSTOMER_FEEDBACK">CUSTOMER_FEEDBACK</option>
                </select>
              </div>
            )}
            <div className="flex gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Escreva uma resposta…"
                rows={2}
                className="flex-1 resize-none rounded-md border border-navy-200 px-3 py-2 text-sm"
                disabled={sending}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !reply.trim() || (channel === 'messenger' && !within24h && !tag)}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? '...' : 'Enviar'}
              </button>
            </div>
            {sendError && <p className="mt-2 text-xs text-rose-600">{sendError}</p>}
          </>
        )}
      </footer>
    </div>
  );
}
