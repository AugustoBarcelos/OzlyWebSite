import { useEffect, useMemo, useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth, hasAnyChannelOfKind } from '@/lib/auth';
import {
  ChevronDownIcon,
  DollarSignIcon,
  ExternalLinkIcon,
  GiftIcon,
  HandshakeIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MailIcon,
  MegaphoneIcon,
  MenuIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  UsersIcon,
  XIcon,
} from './Icons';
import { MessagingFab } from './MessagingFab';

/**
 * Persistent layout for authenticated admin routes.
 *
 * BRIEFING § 11 — sidebar + topbar shell that hosts every later screen.
 *  - Sidebar (240px desktop, off-canvas on mobile)
 *  - Top-level entries can be leaves (links) or branches (expandable groups)
 *  - Branch state is auto-expanded when a child route is active, and user
 *    toggles persist in localStorage.
 *  - Topbar with breadcrumbs + external dashboard links
 *  - Main area renders nested routes via <Outlet />.
 */

type IconComponent = ComponentType<Omit<SVGProps<SVGSVGElement>, 'children'>>;

interface NavLeaf {
  label: string;
  to: string;
  icon?: IconComponent;
  /** If true, only treat as active when path === to. */
  end?: boolean;
}

interface NavBranch {
  label: string;
  icon: IconComponent;
  children: ReadonlyArray<NavLeaf>;
}

type NavItem = NavLeaf | NavBranch;

interface NavGroup {
  label?: string;
  items: ReadonlyArray<NavItem>;
}

function isBranch(item: NavItem): item is NavBranch {
  return 'children' in item;
}

const SIDEBAR_STATE_KEY = 'ozly-admin-sidebar-overrides';

/**
 * Sidebar branch state precedence:
 *   1. User explicit override (open/closed) — wins always
 *   2. Auto-expanded (current route is inside this branch)
 *   3. Collapsed (default)
 *
 * Old impl used Set<string> which OR'd with autoExpanded → user's "close"
 * could never win. New impl uses Map<string, boolean> = user override.
 */
function loadOverrides(): Map<string, boolean> {
  if (typeof window === 'undefined') return new Map();
  try {
    const raw = window.localStorage.getItem(SIDEBAR_STATE_KEY);
    if (!raw) return new Map();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Map();
    const out = new Map<string, boolean>();
    for (const e of parsed) {
      if (Array.isArray(e) && typeof e[0] === 'string' && typeof e[1] === 'boolean') {
        out.set(e[0], e[1]);
      }
    }
    return out;
  } catch {
    return new Map();
  }
}

function saveOverrides(state: Map<string, boolean>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify([...state.entries()]));
  } catch {
    /* localStorage quota / disabled — silently ignore */
  }
}

/**
 * Build nav groups dynamically based on the user's grants.
 *
 *  - Admin: vê tudo, com Marketing/Tráfego Pago/Mensageria como branches expansíveis.
 *  - content_creator (qualquer grant org_*): vê Dashboard + Marketing.
 *  - traffic_manager (qualquer grant paid_*): vê Dashboard + Tráfego Pago.
 *  - messaging_manager (qualquer grant msg_*): vê Dashboard + Mensageria.
 *  - Híbrido (grants em múltiplos prefixos): vê todos os branches correspondentes.
 *
 * Server re-checa via RPC; sidebar é só UX.
 */
function useNavGroups(): ReadonlyArray<NavGroup> {
  const { isAdmin, grants } = useAuth();
  return useMemo(() => {
    if (isAdmin) {
      return [
        {
          items: [
            { label: 'Dashboard', to: '/', icon: LayoutDashboardIcon, end: true },
            { label: 'Users', to: '/users', icon: UsersIcon },
            { label: 'Revenue', to: '/revenue', icon: DollarSignIcon },
            { label: 'Affiliates', to: '/affiliates', icon: HandshakeIcon },
          ],
        },
        {
          label: 'Crescimento',
          items: [
            { label: 'Insights', to: '/insights', icon: TrendingUpIcon },
            {
              label: 'Marketing',
              icon: MegaphoneIcon,
              children: [
                { label: 'Calendário', to: '/marketing/calendar' },
                { label: 'Composer', to: '/marketing/composer' },
                { label: 'Publicações', to: '/marketing/posts' },
                { label: 'Canais Orgânicos', to: '/marketing/channels' },
                { label: 'SEO & Site', to: '/marketing/seo' },
                { label: 'Lojas (ASO)', to: '/marketing/aso' },
              ],
            },
            {
              label: 'Tráfego Pago',
              icon: DollarSignIcon,
              children: [
                { label: 'Visão Geral', to: '/ads', end: true },
                { label: 'Google Ads', to: '/ads/google' },
                { label: 'Meta Ads', to: '/ads/meta' },
                { label: 'Apple Search Ads', to: '/ads/asa' },
                { label: 'TikTok Ads', to: '/ads/tiktok' },
                { label: 'UTM & Atribuição', to: '/ads/attribution' },
              ],
            },
            {
              label: 'Mensageria',
              icon: MailIcon,
              children: [
                { label: 'Email', to: '/messaging/email' },
                { label: 'WhatsApp', to: '/messaging/whatsapp' },
                { label: 'SMS', to: '/messaging/sms' },
              ],
            },
          ],
        },
        {
          label: 'Plataforma',
          items: [
            { label: 'Reliability', to: '/reliability', icon: ShieldCheckIcon },
          ],
        },
        {
          label: 'Ops',
          items: [
            { label: 'Team', to: '/team', icon: UsersIcon },
            { label: 'Grants', to: '/ops/grants', icon: GiftIcon },
            { label: 'Audit', to: '/ops/audit', icon: ScrollTextIcon },
          ],
        },
      ];
    }

    // Non-admin members — show only branches whose grants they hold.
    const items: NavItem[] = [
      { label: 'Dashboard', to: '/', icon: LayoutDashboardIcon, end: true },
    ];
    if (hasAnyChannelOfKind(grants, 'org_')) {
      items.push({
        label: 'Marketing',
        icon: MegaphoneIcon,
        children: [
          { label: 'Calendário', to: '/marketing/calendar' },
          { label: 'Composer', to: '/marketing/composer' },
          { label: 'Publicações', to: '/marketing/posts' },
          { label: 'Canais Orgânicos', to: '/marketing/channels' },
        ],
      });
    }
    if (hasAnyChannelOfKind(grants, 'paid_')) {
      items.push({
        label: 'Tráfego Pago',
        icon: DollarSignIcon,
        children: [
          { label: 'Visão Geral', to: '/ads', end: true },
          { label: 'Google Ads', to: '/ads/google' },
          { label: 'Meta Ads', to: '/ads/meta' },
          { label: 'Apple Search Ads', to: '/ads/asa' },
          { label: 'TikTok Ads', to: '/ads/tiktok' },
        ],
      });
    }
    if (hasAnyChannelOfKind(grants, 'msg_')) {
      items.push({
        label: 'Mensageria',
        icon: MailIcon,
        children: [
          { label: 'Email', to: '/messaging/email' },
          { label: 'WhatsApp', to: '/messaging/whatsapp' },
          { label: 'SMS', to: '/messaging/sms' },
        ],
      });
    }
    return [{ items }];
  }, [isAdmin, grants]);
}

function useExpandedBranches(items: ReadonlyArray<NavItem>) {
  const { pathname } = useLocation();

  const autoExpanded = useMemo(() => {
    const out = new Set<string>();
    for (const it of items) {
      if (isBranch(it)) {
        const match = it.children.some((c) =>
          c.end ? pathname === c.to : pathname.startsWith(c.to),
        );
        if (match) out.add(it.label);
      }
    }
    return out;
  }, [items, pathname]);

  const [overrides, setOverrides] = useState<Map<string, boolean>>(loadOverrides);

  useEffect(() => {
    saveOverrides(overrides);
  }, [overrides]);

  const isExpanded = (label: string): boolean => {
    const ov = overrides.get(label);
    if (ov !== undefined) return ov; // explicit user choice wins
    return autoExpanded.has(label);
  };

  const toggle = (label: string) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      const current = prev.get(label) ?? autoExpanded.has(label);
      next.set(label, !current);
      return next;
    });
  };

  return { isExpanded, toggle };
}

/** Build human-readable breadcrumbs from the current pathname. */
function useBreadcrumbs(): string[] {
  const { pathname } = useLocation();
  return useMemo(() => {
    if (pathname === '/' || pathname === '') return ['Dashboard'];
    const parts = pathname.split('/').filter(Boolean);
    return parts.map((p) => {
      if (/^[0-9a-f-]{8,}$/i.test(p)) return `${p.slice(0, 8)}…`;
      return p.charAt(0).toUpperCase() + p.slice(1);
    });
  }, [pathname]);
}

function NavLeafItem({
  item,
  onNavigate,
  indent = false,
}: {
  item: NavLeaf;
  onNavigate?: (() => void) | undefined;
  indent?: boolean | undefined;
}) {
  const Icon = item.icon;
  return (
    <li>
      <NavLink
        to={item.to}
        end={item.end ?? false}
        onClick={onNavigate}
        className={({ isActive }) =>
          [
            'group relative flex items-center gap-2.5 rounded-md py-2 text-sm transition-colors',
            indent ? 'pl-9 pr-3' : 'px-3',
            isActive
              ? 'bg-brand-500/15 text-white'
              : 'text-navy-100 hover:bg-navy-800/60 hover:text-white',
          ].join(' ')
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span
                aria-hidden
                className="absolute inset-y-1 left-0 w-0.5 rounded-r bg-brand-400"
              />
            )}
            {Icon && (
              <Icon
                className={
                  'h-4 w-4 shrink-0 ' +
                  (isActive
                    ? 'text-brand-300'
                    : 'text-navy-200 group-hover:text-brand-300')
                }
              />
            )}
            <span className="truncate">{item.label}</span>
          </>
        )}
      </NavLink>
    </li>
  );
}

function NavBranchItem({
  item,
  expanded,
  onToggle,
  onNavigate,
}: {
  item: NavBranch;
  expanded: boolean;
  onToggle: () => void;
  onNavigate?: (() => void) | undefined;
}) {
  const Icon = item.icon;
  const { pathname } = useLocation();
  const hasActiveChild = item.children.some((c) =>
    c.end ? pathname === c.to : pathname.startsWith(c.to),
  );

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={[
          'group relative flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
          hasActiveChild
            ? 'text-white'
            : 'text-navy-100 hover:bg-navy-800/60 hover:text-white',
        ].join(' ')}
      >
        <Icon
          className={
            'h-4 w-4 shrink-0 ' +
            (hasActiveChild
              ? 'text-brand-300'
              : 'text-navy-200 group-hover:text-brand-300')
          }
        />
        <span className="flex-1 truncate text-left">{item.label}</span>
        <ChevronDownIcon
          className={[
            'h-3.5 w-3.5 shrink-0 text-navy-300 transition-transform',
            expanded ? 'rotate-0' : '-rotate-90',
          ].join(' ')}
        />
      </button>
      {expanded && (
        <ul className="mt-0.5 space-y-0.5">
          {item.children.map((child) => (
            <NavLeafItem
              key={child.to}
              item={child}
              onNavigate={onNavigate}
              indent
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function SidebarContent({
  onNavigate,
}: {
  onNavigate?: (() => void) | undefined;
}) {
  const { user, signOut, isAdmin, member } = useAuth();
  const navGroups = useNavGroups();
  const allItems = useMemo(
    () => navGroups.flatMap((g) => g.items),
    [navGroups],
  );
  const { isExpanded, toggle } = useExpandedBranches(allItems);

  return (
    <div className="flex h-full flex-col bg-navy-700 text-navy-50">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-navy-800/60 px-4">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white shadow-md"
          style={{
            background:
              'linear-gradient(135deg, var(--color-brand-500), var(--color-lime-400))',
          }}
        >
          O
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">Ozly Admin</span>
          <span className="text-[11px] text-navy-200">Internal</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {navGroups.map((group, idx) => (
          <div key={idx} className="mb-4">
            {group.label && (
              <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-navy-200/70">
                {group.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) =>
                isBranch(item) ? (
                  <NavBranchItem
                    key={item.label}
                    item={item}
                    expanded={isExpanded(item.label)}
                    onToggle={() => toggle(item.label)}
                    onNavigate={onNavigate}
                  />
                ) : (
                  <NavLeafItem
                    key={item.to}
                    item={item}
                    onNavigate={onNavigate}
                  />
                ),
              )}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: external resources + user + sign out */}
      <div className="border-t border-navy-800/60 p-3">
        {isAdmin && (
          <>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                [
                  'mb-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] transition-colors',
                  isActive
                    ? 'bg-navy-800/60 text-white'
                    : 'text-navy-200 hover:bg-navy-800/60 hover:text-white',
                ].join(' ')
              }
            >
              ⚙ Settings
            </NavLink>
            <a
              href="https://supabase.com/dashboard/project/jnhwgwnphlnhjlgygjql/functions"
              target="_blank"
              rel="noopener noreferrer"
              className="mb-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-navy-200 transition-colors hover:bg-navy-800/60 hover:text-white"
            >
              <ExternalLinkIcon className="h-3 w-3" />
              Edge Functions
            </a>
          </>
        )}
        {user?.email && (
          <div className="mb-1 truncate px-1 text-[11px] text-navy-200">
            {user.email}
          </div>
        )}
        {!isAdmin && member && (
          <div className="mb-2 px-1 text-[10px] uppercase tracking-wide text-navy-300">
            {member.role.replace('_', ' ')}
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            void signOut();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-navy-600 bg-navy-800/60 px-3 py-1.5 text-xs font-medium text-navy-50 transition-colors hover:bg-navy-800 hover:text-white"
        >
          <LogOutIcon className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );
}

function Topbar({
  onMenuClick,
  crumbs,
}: {
  onMenuClick: () => void;
  crumbs: string[];
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-navy-50 bg-white/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="rounded-md p-1.5 text-navy-500 hover:bg-navy-50 md:hidden"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-sm text-navy-300">
            {crumbs.map((c, i) => (
              <li key={`${c}-${i}`} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-navy-100">/</span>}
                <span
                  className={
                    i === crumbs.length - 1
                      ? 'font-medium text-navy-700'
                      : ''
                  }
                >
                  {c}
                </span>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <div className="flex items-center gap-1">
        <a
          href="https://eu.posthog.com"
          target="_blank"
          rel="noopener noreferrer"
          title="Open PostHog dashboard"
          aria-label="Open PostHog dashboard"
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-navy-400 transition-colors hover:bg-brand-50 hover:text-brand-700"
        >
          PostHog
          <ExternalLinkIcon className="h-3.5 w-3.5" />
        </a>
        <a
          href="https://sentry.io"
          target="_blank"
          rel="noopener noreferrer"
          title="Open Sentry dashboard"
          aria-label="Open Sentry dashboard"
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-navy-400 transition-colors hover:bg-brand-50 hover:text-brand-700"
        >
          Sentry
          <ExternalLinkIcon className="h-3.5 w-3.5" />
        </a>
      </div>
    </header>
  );
}

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const crumbs = useBreadcrumbs();

  return (
    <div className="ozly-bg flex min-h-[100dvh]">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 md:block">
        <div className="fixed inset-y-0 left-0 w-60">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile off-canvas */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-navy-900/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-60">
            <div className="relative h-full">
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
                className="absolute right-2 top-3 z-10 rounded-md p-1.5 text-navy-100 hover:bg-navy-800"
              >
                <XIcon className="h-4 w-4" />
              </button>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onMenuClick={() => setMobileOpen(true)}
          crumbs={crumbs}
        />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Floating WhatsApp + Email shortcut — visible on every protected page */}
      <MessagingFab />
    </div>
  );
}
