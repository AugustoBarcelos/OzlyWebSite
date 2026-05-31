// ⌘K Spotlight-style command palette. Searches across the org's invoices,
// sub-contractors, and jobs. Also surfaces static navigation actions ("Open
// Dashboard", "Open Integrations", etc).
//
// Wiring: mounted once in Layout. The keyboard shortcut handler lives here
// so consumers don't need to know about it.
//
// Query strategy: debounced 180ms. Each open does 1 read per source (so 3
// queries total) limited to 8 hits each. We deliberately don't search across
// org_events / activity log — those grow boundless and noise the results.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { Avatar } from '@/components/Avatar';
import { formatMoney, formatDate } from '@/lib/format';

interface InvoiceHit {
  kind: 'invoice';
  id: string;
  title: string;     // invoice number
  subtitle: string;  // sub-contractor name + amount
  meta: string;      // status + date
  to: string;
}
interface MemberHit {
  kind: 'member';
  id: string;
  title: string;     // sub-contractor name
  subtitle: string;  // email
  meta: string;      // role
  to: string;
}
interface JobHit {
  kind: 'job';
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  to: string;
}
interface NavHit {
  kind: 'nav';
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  to: string;
}
type Hit = InvoiceHit | MemberHit | JobHit | NavHit;

const NAV_ACTIONS: NavHit[] = [
  { kind: 'nav', id: 'nav-dashboard',    title: 'Dashboard',       subtitle: 'KPIs + revenue chart', meta: 'Page',   to: '/dashboard' },
  { kind: 'nav', id: 'nav-invoices',     title: 'Invoices',        subtitle: 'All invoices',         meta: 'Page',   to: '/invoices' },
  { kind: 'nav', id: 'nav-inbox',        title: 'Inbox',           subtitle: 'Direct-sent invoices', meta: 'Page',   to: '/inbox' },
  { kind: 'nav', id: 'nav-work',         title: 'Work',            subtitle: 'Jobs offered',         meta: 'Page',   to: '/work' },
  { kind: 'nav', id: 'nav-members',      title: 'Members',         subtitle: 'Sub-contractors',     meta: 'Page',   to: '/members' },
  { kind: 'nav', id: 'nav-activity',     title: 'Activity',        subtitle: 'Timeline of events',   meta: 'Page',   to: '/activity' },
  { kind: 'nav', id: 'nav-reports',      title: 'Reports',         subtitle: 'BAS + P&L exports',    meta: 'Page',   to: '/reports' },
  { kind: 'nav', id: 'nav-billing',      title: 'Billing',         subtitle: 'Plan + seats',         meta: 'Page',   to: '/billing' },
  { kind: 'nav', id: 'nav-integrations', title: 'Integrations',    subtitle: 'Connect ServiceM8...', meta: 'Page',   to: '/settings/integrations' },
  { kind: 'nav', id: 'nav-settings',     title: 'Settings',        subtitle: 'Org + notifications', meta: 'Page',   to: '/settings' },
  { kind: 'nav', id: 'nav-onboarding',   title: 'Onboarding guide', subtitle: 'Printable PDF',       meta: 'Action', to: '/print/onboarding' },
  // Action shortcuts
  { kind: 'nav', id: 'act-overdue',      title: 'Show overdue invoices', subtitle: 'Filter applied',  meta: 'Action', to: '/invoices?status=overdue' },
  { kind: 'nav', id: 'act-unpaid',       title: 'Show outstanding invoices', subtitle: 'Filter applied', meta: 'Action', to: '/invoices?status=sent,overdue' },
];

function tonalIcon(kind: Hit['kind']): { icon: string; tone: string } {
  switch (kind) {
    case 'invoice': return { icon: '📄', tone: 'rgba(43, 187, 151, 0.14)' };
    case 'member':  return { icon: '👤', tone: 'rgba(157, 215, 96, 0.18)' };
    case 'job':     return { icon: '💼', tone: 'rgba(201, 164, 60, 0.18)' };
    case 'nav':     return { icon: '→',  tone: 'rgba(20, 36, 47, 0.06)' };
  }
}

function tonalLabel(kind: Hit['kind']): string {
  return kind === 'invoice' ? 'Invoice' : kind === 'member' ? 'Member' : kind === 'job' ? 'Job' : 'Page';
}

export function CommandPalette() {
  const navigate = useNavigate();
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id ?? null;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>(NAV_ACTIONS);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcut: ⌘K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const modPressed = isMac ? e.metaKey : e.ctrlKey;
      if (modPressed && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Focus input + reset on open
  useEffect(() => {
    if (open) {
      setActiveIdx(0);
      setQuery('');
      setHits(NAV_ACTIONS);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Debounced server search
  const debouncedQuery = useDebounced(query, 180);
  useEffect(() => {
    if (!orgId) return;
    const q = debouncedQuery.trim();
    if (q.length === 0) {
      setHits(NAV_ACTIONS);
      return;
    }
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const lower = q.toLowerCase();
        const ilike = `%${q}%`;
        const [invoices, members, jobs] = await Promise.all([
          supabase
            .from('invoices')
            .select('id, invoice_number, status, total, issue_date, user_id, issuer:profiles!invoices_user_id_fkey(full_name,email)')
            .eq('org_visible_id', orgId)
            .ilike('invoice_number', ilike)
            .order('issue_date', { ascending: false })
            .limit(8),
          supabase
            .from('org_memberships')
            .select('user_id, role, profiles:profiles!org_memberships_user_id_fkey(full_name,email)')
            .eq('org_id', orgId)
            .eq('status', 'accepted')
            .limit(40),
          supabase
            .from('jobs')
            .select('id, title, start_datetime, hourly_rate, user_id, issuer:profiles!jobs_user_id_fkey(full_name,email), contractors!inner(org_id)')
            .eq('contractors.org_id', orgId)
            .ilike('title', ilike)
            .order('start_datetime', { ascending: false })
            .limit(8),
        ]);

        const invHits: InvoiceHit[] = ((invoices.data ?? []) as unknown as Array<{ id: string; invoice_number: string | null; status: string; total: number; issue_date: string; issuer: { full_name: string | null; email: string | null } | null }>).map((r) => ({
          kind: 'invoice',
          id: r.id,
          title: r.invoice_number ?? 'Invoice',
          subtitle: r.issuer?.full_name?.trim() || r.issuer?.email || 'Sub-contractor',
          meta: `${formatMoney(Number(r.total))} · ${r.status} · ${formatDate(r.issue_date)}`,
          to: `/invoices`,
        }));

        // Members are filtered client-side because profiles is joined.
        const memHits: MemberHit[] = ((members.data ?? []) as unknown as Array<{ user_id: string; role: string; profiles: { full_name: string | null; email: string | null } | null }>)
          .filter((m) => {
            const name = (m.profiles?.full_name ?? '').toLowerCase();
            const email = (m.profiles?.email ?? '').toLowerCase();
            return name.includes(lower) || email.includes(lower);
          })
          .slice(0, 8)
          .map((m) => ({
            kind: 'member',
            id: m.user_id,
            title: m.profiles?.full_name?.trim() || m.profiles?.email || 'Sub-contractor',
            subtitle: m.profiles?.email ?? '',
            meta: m.role,
            to: `/members`,
          }));

        const jobHits: JobHit[] = ((jobs.data ?? []) as unknown as Array<{ id: string; title: string | null; start_datetime: string; hourly_rate: number; issuer: { full_name: string | null; email: string | null } | null }>).map((j) => ({
          kind: 'job',
          id: j.id,
          title: j.title ?? 'Untitled job',
          subtitle: j.issuer?.full_name?.trim() || j.issuer?.email || 'Sub-contractor',
          meta: `${formatDate(j.start_datetime)} · ${formatMoney(Number(j.hourly_rate))}/h`,
          to: '/work',
        }));

        const navMatches = NAV_ACTIONS.filter((n) =>
          n.title.toLowerCase().includes(lower) || n.subtitle.toLowerCase().includes(lower),
        );

        if (active) {
          setHits([...invHits, ...memHits, ...jobHits, ...navMatches]);
          setActiveIdx(0);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [debouncedQuery, orgId]);

  const navigateTo = useCallback((to: string) => {
    setOpen(false);
    navigate(to);
  }, [navigate]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(hits.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && hits[activeIdx]) {
      e.preventDefault();
      navigateTo(hits[activeIdx]!.to);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[10vh]" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl rounded-2xl shadow-2xl"
        style={{ background: 'var(--surface-elevated)', boxShadow: '0 24px 60px -20px rgba(8, 18, 26, 0.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-navy-100 px-4 py-3.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-navy-400">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search invoices, subs, jobs, or jump to a page…"
            className="flex-1 bg-transparent text-[14px] text-navy-800 placeholder:text-navy-400 focus:outline-none"
          />
          <kbd className="rounded bg-navy-50 px-1.5 py-0.5 text-[10px] font-semibold text-navy-500 ring-1 ring-navy-100">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {loading && hits.length === 0 && (
            <div className="flex items-center justify-center py-10 text-[12px] text-navy-400">Searching…</div>
          )}
          {!loading && hits.length === 0 && query.trim() && (
            <div className="px-4 py-8 text-center text-[12.5px] text-navy-400">
              Nothing matches <span className="font-semibold text-navy-700">"{query}"</span>.
            </div>
          )}
          {hits.map((h, i) => {
            const t = tonalIcon(h.kind);
            const active = i === activeIdx;
            return (
              <button
                key={`${h.kind}-${h.id}`}
                type="button"
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => navigateTo(h.to)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  active ? 'bg-brand-50/60' : 'hover:bg-navy-50/40'
                }`}
              >
                {h.kind === 'member' ? (
                  <Avatar name={h.title} email={h.subtitle} size="sm" />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-base"
                    style={{ background: t.tone }}
                  >
                    {t.icon}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-navy-800">{h.title}</div>
                  <div className="truncate text-[11.5px] text-navy-500">{h.subtitle}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[10.5px] font-semibold uppercase tracking-wider text-navy-400">
                    {tonalLabel(h.kind)}
                  </div>
                  <div className="text-[10.5px] text-navy-400">{h.meta}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-navy-100 px-4 py-2 text-[10.5px] text-navy-400">
          <div className="flex gap-3">
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span>esc close</span>
          </div>
          <span>
            <kbd className="rounded bg-navy-50 px-1 py-0.5 text-[9.5px] font-semibold text-navy-500 ring-1 ring-navy-100">⌘K</kbd>
            <span className="ml-1">anywhere</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}
