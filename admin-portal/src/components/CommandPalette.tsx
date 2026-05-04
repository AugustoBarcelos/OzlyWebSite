import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActivityIcon,
  BellIcon,
  CommandIcon,
  DollarSignIcon,
  FunnelIcon,
  HandshakeIcon,
  HomeIcon,
  InboxIcon,
  MailIcon,
  MegaphoneIcon,
  PackageIcon,
  PenSquareIcon,
  ScrollTextIcon,
  SearchIcon,
  ServerIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrendingUpIcon,
  UsersIcon,
  WorkflowIcon,
  XIcon,
} from './Icons';

/**
 * Command palette (cmd-K / ctrl-K). Universal navigation + actions.
 *
 * MVP scope:
 *  - Navigate to any hub or sub-page
 *  - Show shortcuts inline
 *
 * Future (V2):
 *  - Find user by email/id
 *  - Find campaign by name
 *  - Trigger actions (refund, send win-back, etc)
 *  - Recent items
 */

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  group: 'Hubs' | 'Growth' | 'Marketing' | 'Finance' | 'Tech' | 'Operations' | 'Users' | 'Product' | 'Inbox' | 'Quick Actions';
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  onAction?: () => void;
  keywords?: string[];
}

const ALL_COMMANDS: CommandItem[] = [
  // Hubs
  { id: 'cockpit', label: 'Cockpit', hint: 'g c', group: 'Hubs', icon: HomeIcon, to: '/cockpit', keywords: ['home', 'dashboard', 'north star', 'kpis'] },
  { id: 'inbox', label: 'Inbox', hint: 'g i', group: 'Hubs', icon: InboxIcon, to: '/inbox', keywords: ['alerts', 'tickets', 'support'] },
  { id: 'growth', label: 'Growth Hub', hint: 'g g', group: 'Hubs', icon: TrendingUpIcon, to: '/growth', keywords: ['acquisition', 'channels'] },
  { id: 'marketing', label: 'Marketing Studio', hint: 'g m', group: 'Hubs', icon: MegaphoneIcon, to: '/marketing', keywords: ['compose', 'post', 'social'] },
  { id: 'finance', label: 'Finance Hub', hint: 'g f', group: 'Hubs', icon: DollarSignIcon, to: '/finance', keywords: ['mrr', 'revenue', 'costs', 'runway'] },
  { id: 'product', label: 'Product Hub', hint: 'g p', group: 'Hubs', icon: PackageIcon, to: '/product', keywords: ['activation', 'retention', 'engagement'] },
  { id: 'users', label: 'Users', hint: 'g u', group: 'Hubs', icon: UsersIcon, to: '/users', keywords: ['crm', 'search'] },
  { id: 'operations', label: 'Operations', hint: 'g o', group: 'Hubs', icon: ScrollTextIcon, to: '/operations', keywords: ['roadmap', 'incidents', 'releases'] },
  { id: 'tech', label: 'Tech Hub', hint: 'g t', group: 'Hubs', icon: ServerIcon, to: '/tech', keywords: ['errors', 'edge functions', 'cicd', 'reliability'] },

  // Growth
  { id: 'funnel', label: 'Sales Funnel', group: 'Growth', icon: FunnelIcon, to: '/growth/funnel', keywords: ['impression', 'click', 'conversion'] },
  { id: 'attribution', label: 'Attribution / UTM Links', group: 'Growth', icon: ActivityIcon, to: '/ads/attribution', keywords: ['utm', 'tracking', 'links'] },
  { id: 'channels-google', label: 'Google Ads', group: 'Growth', icon: TrendingUpIcon, to: '/ads/google' },
  { id: 'channels-meta', label: 'Meta Ads', group: 'Growth', icon: TrendingUpIcon, to: '/ads/meta' },
  { id: 'channels-asa', label: 'Apple Search Ads', group: 'Growth', icon: TrendingUpIcon, to: '/ads/asa' },
  { id: 'channels-tiktok', label: 'TikTok Ads', group: 'Growth', icon: TrendingUpIcon, to: '/ads/tiktok' },
  { id: 'affiliates', label: 'Affiliates', group: 'Growth', icon: HandshakeIcon, to: '/affiliates', keywords: ['payouts', 'commission'] },

  // Marketing
  { id: 'mkt-calendar', label: 'Marketing Calendar', group: 'Marketing', icon: PenSquareIcon, to: '/marketing/calendar' },
  { id: 'mkt-composer', label: 'Composer', group: 'Marketing', icon: PenSquareIcon, to: '/marketing/composer', keywords: ['create post', 'publish'] },
  { id: 'mkt-ai', label: 'AI Composer', group: 'Marketing', icon: SparklesIcon, to: '/marketing/composer', keywords: ['gemini', 'generate'] },
  { id: 'mkt-posts', label: 'Posts', group: 'Marketing', icon: ScrollTextIcon, to: '/marketing/posts' },
  { id: 'mkt-channels', label: 'Channels (organic)', group: 'Marketing', icon: MegaphoneIcon, to: '/marketing/channels' },
  { id: 'mkt-aso', label: 'ASO (App Store)', group: 'Marketing', icon: PackageIcon, to: '/marketing/aso' },
  { id: 'mkt-seo', label: 'SEO & Site', group: 'Marketing', icon: TrendingUpIcon, to: '/marketing/seo' },
  { id: 'msg-email', label: 'Messaging — Email', group: 'Marketing', icon: MailIcon, to: '/messaging/email' },
  { id: 'msg-whatsapp', label: 'Messaging — WhatsApp', group: 'Marketing', icon: MailIcon, to: '/messaging/whatsapp' },
  { id: 'msg-sms', label: 'Messaging — SMS', group: 'Marketing', icon: MailIcon, to: '/messaging/sms' },

  // Finance
  { id: 'fin-revenue', label: 'Revenue', group: 'Finance', icon: DollarSignIcon, to: '/revenue', keywords: ['mrr', 'subscriptions'] },
  { id: 'fin-costs', label: 'Costs (V2)', group: 'Finance', icon: DollarSignIcon, to: '/finance/costs' },
  { id: 'fin-forecast', label: 'Forecast & Runway (V2)', group: 'Finance', icon: TrendingUpIcon, to: '/finance/forecast' },
  { id: 'fin-tax', label: 'Tax & Reports (CSV)', group: 'Finance', icon: ScrollTextIcon, to: '/finance/tax', keywords: ['bas', 'gst', 'apple fee', 'accountant'] },

  // Users
  { id: 'users-nps', label: 'NPS — Net Promoter Score', group: 'Users', icon: ActivityIcon, to: '/users/nps', keywords: ['survey', 'feedback', 'satisfaction', 'resend'] },

  // Product
  { id: 'prod-activation', label: 'Activation Funnel', group: 'Product', icon: FunnelIcon, to: '/product/activation', keywords: ['onboard', 'trial', 'signup'] },
  { id: 'prod-retention', label: 'Retention Cohorts', group: 'Product', icon: ActivityIcon, to: '/product/retention' },
  { id: 'prod-engagement', label: 'Engagement (DAU/WAU/MAU)', group: 'Product', icon: TrendingUpIcon, to: '/product/engagement' },
  { id: 'prod-features', label: 'Feature Adoption', group: 'Product', icon: PackageIcon, to: '/product/features' },
  { id: 'prod-feedback', label: 'Feedback (NPS + reviews)', group: 'Product', icon: SparklesIcon, to: '/product/feedback' },

  // Inbox
  { id: 'inbox-alerts', label: 'Alerts (anomalias)', group: 'Inbox', icon: BellIcon, to: '/inbox/alerts' },
  { id: 'inbox-refunds', label: 'Refund requests', group: 'Inbox', icon: DollarSignIcon, to: '/inbox/refunds' },
  { id: 'inbox-system', label: 'System events', group: 'Inbox', icon: ActivityIcon, to: '/inbox/system' },
  { id: 'inbox-reviews', label: 'App Store reviews', group: 'Inbox', icon: SparklesIcon, to: '/inbox/reviews', keywords: ['ratings', 'apple', 'feedback'] },

  // Tech
  { id: 'tech-cicd', label: 'CI/CD (V2)', group: 'Tech', icon: WorkflowIcon, to: '/tech/cicd', keywords: ['github actions', 'tests', 'workflows'] },
  { id: 'tech-reliability', label: 'Reliability', group: 'Tech', icon: ShieldCheckIcon, to: '/reliability', keywords: ['errors', 'uptime'] },

  // Operations
  { id: 'ops-grants', label: 'Grants', group: 'Operations', icon: ScrollTextIcon, to: '/ops/grants' },
  { id: 'ops-audit', label: 'Audit', group: 'Operations', icon: ScrollTextIcon, to: '/ops/audit' },

  // Quick actions
  { id: 'qa-alerts', label: 'View pending alerts', group: 'Quick Actions', icon: BellIcon, to: '/inbox' },
  {
    id: 'qa-glossary',
    label: 'Glossário & abreviações (CAC, MRR, ABN…)',
    group: 'Quick Actions',
    icon: SparklesIcon,
    to: '/help/glossary',
    keywords: ['cac', 'mrr', 'arr', 'ltv', 'abn', 'tfn', 'bas', 'gst', 'abreviacao', 'termo', 'help', 'tutorial'],
  },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when opened
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    // Defer focus until after render
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(id);
    };
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_COMMANDS;
    return ALL_COMMANDS.filter((c) => {
      const haystack = [c.label, c.hint, c.group, ...(c.keywords ?? [])].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const c of filtered) {
      const arr = map.get(c.group) ?? [];
      arr.push(c);
      map.set(c.group, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const runItem = useCallback(
    (item: CommandItem) => {
      onClose();
      if (item.onAction) item.onAction();
      else if (item.to) navigate(item.to);
    },
    [navigate, onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[activeIndex];
        if (item) runItem(item);
      }
    },
    [activeIndex, filtered, onClose, runItem],
  );

  // Reset active index when query changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  // Compute global indexes per item to highlight selected
  const flatIndex = new Map<string, number>();
  let i = 0;
  for (const [, items] of grouped) {
    for (const it of items) {
      flatIndex.set(it.id, i++);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-20"
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        aria-label="Close command palette"
        className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="ozly-card relative z-10 w-full max-w-xl overflow-hidden bg-white">
        <div className="flex items-center gap-2 border-b border-navy-50 px-4 py-3">
          <SearchIcon className="h-4 w-4 text-navy-300" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search hubs, pages, actions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-navy-700 placeholder:text-navy-300 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-navy-300 hover:bg-navy-50 hover:text-navy-500"
            aria-label="Close"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {grouped.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-navy-300">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} className="mb-1">
                <div className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-navy-300">
                  {group}
                </div>
                {items.map((item) => {
                  const Icon = item.icon;
                  const idx = flatIndex.get(item.id);
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => runItem(item)}
                      onMouseEnter={() => idx !== undefined && setActiveIndex(idx)}
                      className={[
                        'flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors',
                        isActive
                          ? 'bg-brand-500/10 text-navy-700'
                          : 'text-navy-600 hover:bg-navy-50',
                      ].join(' ')}
                    >
                      <Icon className={isActive ? 'h-4 w-4 text-brand-600' : 'h-4 w-4 text-navy-400'} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.hint && (
                        <kbd className="rounded border border-navy-100 bg-navy-50 px-1.5 py-0.5 font-mono text-[10px] text-navy-400">
                          {item.hint}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-navy-50 px-4 py-2 text-[11px] text-navy-300">
          <div className="flex items-center gap-3">
            <span><kbd className="rounded border border-navy-100 px-1 py-0.5 font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="rounded border border-navy-100 px-1 py-0.5 font-mono">↵</kbd> select</span>
            <span><kbd className="rounded border border-navy-100 px-1 py-0.5 font-mono">esc</kbd> close</span>
          </div>
          <div className="flex items-center gap-1">
            <CommandIcon className="h-3 w-3" />
            <span className="font-mono">K</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook that wires global cmd-K / ctrl-K shortcut and `g+letter` quick-jumps.
 * Mount this once in Layout.
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const lastKey = useRef<{ key: string; at: number } | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        (target as HTMLElement | null)?.isContentEditable;

      // cmd-K / ctrl-K opens palette regardless
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      if (isInput) return;

      // `g` then letter quick-jumps
      const now = Date.now();
      if (lastKey.current && now - lastKey.current.at < 800 && lastKey.current.key === 'g') {
        const letter = e.key.toLowerCase();
        const map: Record<string, string> = {
          c: '/cockpit',
          i: '/inbox',
          g: '/growth',
          m: '/marketing',
          f: '/finance',
          p: '/product',
          u: '/users',
          o: '/operations',
          t: '/tech',
        };
        const path = map[letter];
        if (path) {
          e.preventDefault();
          navigate(path);
          lastKey.current = null;
          return;
        }
      }
      if (e.key.toLowerCase() === 'g') {
        lastKey.current = { key: 'g', at: now };
      } else {
        lastKey.current = null;
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [navigate]);

  return { open, setOpen };
}
