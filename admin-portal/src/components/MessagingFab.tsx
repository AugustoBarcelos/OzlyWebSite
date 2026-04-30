import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  InstagramIcon,
  MailIcon,
  MessengerIcon,
  PhoneIcon,
  WhatsAppIcon,
  XIcon,
} from './Icons';

/**
 * Painel "Comunicação" — single FAB (canto inf. direito) que abre uma janela
 * com TODOS os canais 1:1 num lugar só.
 *
 *   💬 WhatsApp        (Meta Cloud API)
 *   🔵 Messenger       (Meta Graph API)
 *   📸 Instagram DM    (Meta Graph API — mesmo system user dos outros)
 *   📧 Email           (Resend)
 *   📱 SMS             (Twilio futuro)
 *
 * Hoje cada linha = link out pro dashboard externo + counter placeholder
 * (bolinha amarela). Quando uma API plugar:
 *   1. O counter substitui o dot pelo número real (RPC `admin_inbox_unread`).
 *   2. O click abre um painel lateral inline (chat embutido) em vez de nova aba.
 *   3. As outras linhas seguem como link-out até suas APIs também ligarem.
 *
 * Arquitetura prevista pro inbox unificado:
 *   - Tabela `inbox_messages` (channel, contact_id, body, direction, read_at)
 *   - Webhooks: `wa-receive`, `messenger-receive`, `ig-receive`, `email-inbound`
 *   - RPCs: `admin_inbox_list(channel?, limit)`, `admin_inbox_send(channel,
 *     contact_id, body)`, `admin_inbox_mark_read(message_ids[])`
 *   - Mesma tabela serve UI unificada e relatórios em /growth/messaging.
 */

type ChannelId = 'whatsapp' | 'messenger' | 'instagram' | 'email' | 'sms';

interface Channel {
  id: ChannelId;
  label: string;
  /** External fallback while no API is wired. */
  href: string;
  icon: ReactNode;
  /** Tailwind classes for the colored circle on the left of each row. */
  bg: string;
  description: string;
}

const CHANNELS: Channel[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    href: 'https://business.facebook.com/wa/manage/messages',
    icon: <WhatsAppIcon className="h-4 w-4 text-white" />,
    bg: 'bg-[#25D366]',
    description: 'Cloud API · Meta Business',
  },
  {
    id: 'messenger',
    label: 'Messenger',
    href: 'https://business.facebook.com/latest/inbox',
    icon: <MessengerIcon className="h-4 w-4 text-white" />,
    bg: 'bg-[#0084FF]',
    description: 'FB Messenger · Meta Inbox',
  },
  {
    id: 'instagram',
    label: 'Instagram DM',
    href: 'https://business.facebook.com/latest/inbox',
    icon: <InstagramIcon className="h-4 w-4 text-white" />,
    bg: 'bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#962fbf]',
    description: 'IG Direct · Meta Inbox',
  },
  {
    id: 'email',
    label: 'Email',
    href: 'https://resend.com/emails',
    icon: <MailIcon className="h-4 w-4 text-white" />,
    bg: 'bg-brand-500',
    description: 'Resend · transactional + broadcast',
  },
  {
    id: 'sms',
    label: 'SMS',
    href: 'https://console.twilio.com',
    icon: <PhoneIcon className="h-4 w-4 text-white" />,
    bg: 'bg-amber-500',
    description: 'Twilio (futuro)',
  },
];

type Counts = Record<ChannelId, number | null>;

const PLACEHOLDER_COUNTS: Counts = {
  whatsapp: null,
  messenger: null,
  instagram: null,
  email: null,
  sms: null,
};

export function MessagingFab() {
  const [open, setOpen] = useState(false);
  const [counts] = useState<Counts>(PLACEHOLDER_COUNTS);
  const panelRef = useRef<HTMLDivElement>(null);

  // Click outside + Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const totalUnread = CHANNELS.reduce(
    (sum, c) => sum + (counts[c.id] ?? 0),
    0,
  );
  const allPending = CHANNELS.every((c) => counts[c.id] === null);

  return (
    <div ref={panelRef} className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="w-72 overflow-hidden rounded-xl border border-navy-100 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-navy-50 bg-navy-700 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-white">Comunicação</div>
              <div className="text-[11px] text-navy-200">
                {allPending
                  ? 'Aguardando Business Verification (Meta) pra ligar APIs'
                  : `${totalUnread} mensagens não lidas`}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="rounded-md p-1 text-navy-200 hover:bg-navy-800 hover:text-white"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Channel list */}
          <ul className="divide-y divide-navy-50">
            {CHANNELS.map((c) => (
              <li key={c.id}>
                <a
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-navy-50"
                >
                  <span
                    className={[
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      c.bg,
                    ].join(' ')}
                  >
                    {c.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-navy-700">
                        {c.label}
                      </span>
                      <UnreadBadge value={counts[c.id]} />
                    </div>
                    <div className="truncate text-[11px] text-navy-300">
                      {c.description}
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>

          {/* Footer hint */}
          <div className="border-t border-navy-50 bg-amber-50/60 px-4 py-2 text-[11px] text-amber-800">
            ⚠️ Bloqueado em Business Verification (Meta) — sem BV aprovado, não
            há acesso a App / System User / Token. Quando aprovar, ligo as APIs e
            o chat passa a rodar inline aqui.
          </div>
        </div>
      )}

      {/* Single FAB */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Fechar comunicação' : 'Abrir comunicação'}
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-navy-700 text-white shadow-lg transition-all hover:bg-navy-800 hover:shadow-xl"
      >
        {open ? (
          <XIcon className="h-5 w-5" />
        ) : (
          <>
            <ChatBubbleIcon />
            {totalUnread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
            {allPending && (
              <span
                aria-hidden
                className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white"
                title="Counters wired pending Cloud APIs"
              />
            )}
          </>
        )}
      </button>
    </div>
  );
}

function UnreadBadge({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span
        className="inline-block h-2 w-2 rounded-full bg-amber-400"
        title="Counter wired pending Cloud API"
        aria-label="API not connected yet"
      />
    );
  }
  if (value <= 0) return null;
  return (
    <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
      {value > 99 ? '99+' : value}
    </span>
  );
}

function ChatBubbleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
