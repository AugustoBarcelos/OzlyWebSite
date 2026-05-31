import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/Spinner';
import { friendlyError } from '@/lib/errors';
import type { ThreadMessageRow } from '@/lib/types';

/**
 * Two-way message thread attached to an invoice or a job. The org admin reads
 * and posts here; the sub-contractor sees the same thread in the Ozly app.
 * Org messages right-aligned (this is the org portal), member messages left.
 */
export function ThreadPanel({
  subjectType,
  subjectId,
  memberName,
  notify,
}: {
  subjectType: 'invoice' | 'job';
  subjectId: string;
  memberName: string;
  notify: (m: string, k?: 'success' | 'error' | 'info') => void;
}) {
  const [messages, setMessages] = useState<ThreadMessageRow[] | null>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const listEnd = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('thread_messages')
      .select('id, subject_type, subject_id, org_id, sender_user_id, sender_role, body, created_at')
      .eq('subject_type', subjectType)
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: true });
    setMessages((data ?? []) as ThreadMessageRow[]);
  }, [subjectType, subjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    listEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [messages]);

  async function send() {
    const text = body.trim();
    if (!text) return;
    setSending(true);
    const { error } = await supabase.rpc('post_thread_message', {
      p_subject_type: subjectType,
      p_subject_id: subjectId,
      p_body: text,
    });
    setSending(false);
    if (error) {
      notify(friendlyError(error), 'error');
      return;
    }
    setBody('');
    await load();
  }

  return (
    <div className="mt-4 rounded-lg border border-navy-100 bg-navy-50/40 p-3">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-navy-400">
        Messages with {memberName}
      </div>

      {messages === null ? (
        <div className="py-2"><Spinner size="sm" /></div>
      ) : messages.length === 0 ? (
        <p className="py-2 text-xs text-navy-400">
          No messages yet. Use this to ask about a change or clarify an invoice — the sub-contractor
          sees it in the Ozly app.
        </p>
      ) : (
        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {messages.map((m) => {
            const fromOrg = m.sender_role === 'org';
            return (
              <div key={m.id} className={`flex ${fromOrg ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-xs ${
                    fromOrg ? 'bg-brand-600 text-white' : 'bg-white text-navy-700 ring-1 ring-navy-100'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div className={`mt-0.5 text-[10px] ${fromOrg ? 'text-brand-100' : 'text-navy-300'}`}>
                    {fromOrg ? 'You' : memberName} ·{' '}
                    {new Date(m.created_at).toLocaleString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={listEnd} />
        </div>
      )}

      <div className="mt-2 flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send();
            }
          }}
          rows={2}
          placeholder="Write a message…"
          className="flex-1 rounded-md border border-navy-100 bg-white px-2.5 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
        />
        <button
          onClick={() => void send()}
          disabled={sending || !body.trim()}
          className="rounded-md bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
        >
          {sending ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
