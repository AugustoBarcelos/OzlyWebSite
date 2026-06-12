import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useOrg } from '@/lib/org';
import { useInboxCount } from '@/lib/use-inbox-count';
import { FullScreenSpinner } from '@/components/Spinner';
import { TrialBanner } from '@/components/TrialBanner';
import { Avatar } from '@/components/Avatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CommandPalette, openCommandPalette } from '@/components/CommandPalette';
import {
  FileTextIcon,
  InboxIcon,
  BriefcaseIcon,
  UsersIcon,
  ChartIcon,
  SettingsIcon,
  GridIcon,
} from '@/components/Icons';

// Nav is FLAT and short — six destinations, ordered by how often the admin
// needs them (the Linear rule: every extra item dilutes all the others).
// Everything that used to be a top-level page still exists but is reached
// from where it belongs: Import → button inside Invoices, email-delivery
// tracking → /inbox/deliveries, exports → Reports, Billing + Activity →
// Settings. Settings itself lives at the bottom, by the user chip.
interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  /** Show the Action-Inbox count badge on this item. */
  showInboxBadge?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Home',     icon: <GridIcon /> },
  { to: '/inbox',     label: 'Inbox',    icon: <InboxIcon />, showInboxBadge: true },
  { to: '/invoices',  label: 'Invoices', icon: <FileTextIcon /> },
  { to: '/work',      label: 'Work',     icon: <BriefcaseIcon /> },
  { to: '/members',   label: 'Team',     icon: <UsersIcon /> },
  { to: '/reports',   label: 'Reports',  icon: <ChartIcon /> },
];

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {/* Logo lives at /OSLY.svg in /public — already brand-coloured + animated
          gradients baked in. We don't tint it; it's the real mark. */}
      <img
        src="/OSLY.svg"
        alt="Ozly"
        width={36}
        height={36}
        className="shrink-0 drop-shadow-[0_4px_10px_rgba(43,187,151,0.35)]"
      />
      {!compact && (
        <div className="leading-tight">
          <div className="font-display text-[17px] font-bold tracking-tight text-navy-800">
            oz<span className="text-brand-500">·</span>ly
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-700">
            for Organisations
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { signOut, user } = useAuth();
  const { orgs, currentOrg, setCurrentOrgId } = useOrg();
  const inboxCount = useInboxCount(currentOrg?.id ?? null);
  if (!currentOrg) return null;

  return (
    <>
      <div className="px-2">
        <Wordmark />
      </div>

      {orgs.length > 1 ? (
        <div className="mt-6">
          <div className="sidebar-section-label mb-1">Organisation</div>
          <select
            value={currentOrg.id}
            onChange={(e) => setCurrentOrgId(e.target.value)}
            className="w-full rounded-lg border border-navy-100 bg-white px-2.5 py-2 text-sm font-medium text-navy-700 focus:border-brand-500 focus:outline-none"
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          {/* Theme picker tucked right under the workspace selector — it's a
              setting of the workspace, not a footer afterthought. */}
          <div className="mt-2 flex justify-end">
            <ThemeToggle />
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-navy-100 bg-white p-2.5">
          <div className="flex items-center gap-2.5">
            <Avatar name={currentOrg.name} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-navy-800">{currentOrg.name}</div>
              <div className="truncate text-[10.5px] font-medium uppercase tracking-wider text-navy-300">
                Workspace
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-navy-100 pt-2">
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-navy-300">
              Theme
            </span>
            <ThemeToggle />
          </div>
        </div>
      )}

      {/* Search hint — the ⌘K palette exists but nobody discovers a shortcut
          they can't see. The button IS the discoverability (Linear pattern). */}
      <button
        type="button"
        onClick={() => { openCommandPalette(); onNavigate?.(); }}
        className="mt-4 flex w-full items-center gap-2 rounded-lg border border-navy-100 bg-white px-2.5 py-2 text-[12.5px] text-navy-400 transition-colors hover:border-brand-300 hover:text-navy-600"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        Search…
        <kbd className="ml-auto rounded border border-navy-100 bg-navy-50/60 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-navy-400">
          ⌘K
        </kbd>
      </button>

      <nav className="mt-3 flex flex-1 flex-col gap-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
          >
            <span className="flex h-4 w-4 items-center justify-center text-current opacity-80">
              {item.icon}
            </span>
            {item.label}
            {item.showInboxBadge && inboxCount > 0 && (
              <span className="ml-auto inline-flex min-w-[20px] items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10.5px] font-bold text-amber-700">
                {inboxCount > 99 ? '99+' : inboxCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Settings sits with the housekeeping cluster at the bottom — visited
          ~monthly, it shouldn't compete with the daily-flow items above. */}
      <NavLink
        to="/settings"
        onClick={onNavigate}
        className={({ isActive }) => `nav-item mb-1 ${isActive ? 'nav-active' : ''}`}
      >
        <span className="flex h-4 w-4 items-center justify-center text-current opacity-80">
          <SettingsIcon />
        </span>
        Settings
      </NavLink>

      <div className="flex items-center gap-2.5 border-t border-navy-100 pt-3">
        <Avatar email={user?.email ?? null} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11.5px] font-medium text-navy-500">{user?.email}</div>
          <button
            onClick={() => void signOut()}
            className="text-[11px] font-semibold text-brand-700 hover:text-brand-600"
          >
            Sign out →
          </button>
        </div>
      </div>
    </>
  );
}

export function Layout() {
  const { signOut } = useAuth();
  const { currentOrg, loading } = useOrg();
  const [navOpen, setNavOpen] = useState(false);

  // Escape closes the mobile drawer — listener only attached while it's open.
  useEffect(() => {
    if (!navOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setNavOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navOpen]);

  if (loading) return <FullScreenSpinner label="Loading your organisation…" />;

  if (!currentOrg) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-6 text-center">
        <Wordmark />
        <p className="max-w-sm text-sm text-navy-500">
          No organisation is linked to this account yet. If you just confirmed your email, refresh the page.
        </p>
        <button onClick={() => void signOut()} className="text-sm font-medium text-brand-600 hover:text-brand-700">
          Sign out
        </button>
      </main>
    );
  }

  return (
    <div className="flex min-h-[100dvh]">
      {/* Desktop sidebar */}
      <aside className="sidebar-surface hidden w-64 shrink-0 flex-col px-3 py-5 lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" onClick={() => setNavOpen(false)} />
          <aside className="sidebar-surface absolute inset-y-0 left-0 flex w-72 flex-col px-3 py-5 shadow-2xl">
            <SidebarContent onNavigate={() => setNavOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-navy-100 bg-white/70 px-4 py-3 backdrop-blur lg:hidden">
          <button
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
            className="-ml-1 rounded-md p-1 text-navy-600 hover:bg-navy-50"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Wordmark compact />
          <span className="ml-auto truncate text-sm font-medium text-navy-500">{currentOrg.name}</span>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-8">
            <TrialBanner />
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global ⌘K command palette — mounted once, listens for the shortcut. */}
      <CommandPalette />
    </div>
  );
}
