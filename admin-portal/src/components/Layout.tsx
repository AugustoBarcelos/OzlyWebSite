import { useMemo, useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import {
  DollarSignIcon,
  ExternalLinkIcon,
  GiftIcon,
  LayoutDashboardIcon,
  LogOutIcon,
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
 *  - Topbar with breadcrumbs + external dashboard links
 *  - Main area renders nested routes via <Outlet />.
 */

type IconComponent = ComponentType<Omit<SVGProps<SVGSVGElement>, 'children'>>;

interface NavItem {
  label: string;
  to: string;
  icon: IconComponent;
  /** If true, only treat as active when path === to. */
  end?: boolean;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const NAV: ReadonlyArray<NavGroup> = [
  {
    items: [
      { label: 'Dashboard', to: '/', icon: LayoutDashboardIcon, end: true },
      { label: 'Users', to: '/users', icon: UsersIcon },
      { label: 'Revenue', to: '/revenue', icon: DollarSignIcon },
      { label: 'Growth', to: '/growth', icon: TrendingUpIcon },
      { label: 'Reliability', to: '/reliability', icon: ShieldCheckIcon },
    ],
  },
  {
    label: 'Ops',
    items: [
      { label: 'Grants', to: '/ops/grants', icon: GiftIcon },
      { label: 'Audit', to: '/ops/audit', icon: ScrollTextIcon },
    ],
  },
];

/** Build human-readable breadcrumbs from the current pathname. */
function useBreadcrumbs(): string[] {
  const { pathname } = useLocation();
  return useMemo(() => {
    if (pathname === '/' || pathname === '') return ['Dashboard'];
    const parts = pathname.split('/').filter(Boolean);
    return parts.map((p) => {
      // Heuristic: titlecase, leave UUID-ish segments truncated.
      if (/^[0-9a-f-]{8,}$/i.test(p)) return `${p.slice(0, 8)}…`;
      return p.charAt(0).toUpperCase() + p.slice(1);
    });
  }, [pathname]);
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth();

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
        {NAV.map((group, idx) => (
          <div key={idx} className="mb-4">
            {group.label && (
              <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-navy-200/70">
                {group.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end ?? false}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        [
                          'group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
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
                          <Icon
                            className={
                              'h-4 w-4 shrink-0 ' +
                              (isActive
                                ? 'text-brand-300'
                                : 'text-navy-200 group-hover:text-brand-300')
                            }
                          />
                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: external resources + user + sign out */}
      <div className="border-t border-navy-800/60 p-3">
        <a
          href="https://supabase.com/dashboard/project/jnhwgwnphlnhjlgygjql/functions"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-navy-200 transition-colors hover:bg-navy-800/60 hover:text-white"
        >
          <ExternalLinkIcon className="h-3 w-3" />
          Edge Functions
        </a>
        {user?.email && (
          <div className="mb-2 truncate px-1 text-[11px] text-navy-200">
            {user.email}
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
