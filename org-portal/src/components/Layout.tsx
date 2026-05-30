import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useOrg } from '@/lib/org';
import { FullScreenSpinner } from '@/components/Spinner';

const NAV = [
  { to: '/invoices', label: 'Invoices' },
  { to: '/work', label: 'Work' },
  { to: '/members', label: 'Members' },
  { to: '/activity', label: 'Activity' },
  { to: '/billing', label: 'Billing' },
  { to: '/settings', label: 'Settings' },
];

function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 font-display text-base font-bold text-white">
        O
      </div>
      <div className="leading-tight">
        <div className="font-display text-lg font-bold tracking-tight text-navy-800">
          oz<span className="text-brand-500">·</span>ly
        </div>
        <div className="text-[11px] font-medium uppercase tracking-wide text-navy-300">for Organisations</div>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { signOut, user } = useAuth();
  const { orgs, currentOrg, setCurrentOrgId } = useOrg();
  if (!currentOrg) return null;

  return (
    <>
      <div className="px-2">
        <Wordmark />
      </div>

      {orgs.length > 1 ? (
        <select
          value={currentOrg.id}
          onChange={(e) => setCurrentOrgId(e.target.value)}
          className="mt-6 w-full rounded-lg border border-navy-100 bg-white px-2.5 py-2 text-sm font-medium text-navy-700 focus:border-brand-500 focus:outline-none"
        >
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      ) : (
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-navy-100 bg-navy-50/50 px-2.5 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-navy-700 text-xs font-bold uppercase text-white">
            {currentOrg.name.slice(0, 1)}
          </div>
          <div className="truncate text-sm font-medium text-navy-700">{currentOrg.name}</div>
        </div>
      )}

      <div className="mt-6 px-3 text-[10px] font-semibold uppercase tracking-wider text-navy-300">Menu</div>
      <nav className="mt-1 flex flex-1 flex-col gap-0.5">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `relative rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                isActive ? 'nav-active' : 'text-navy-400 hover:bg-navy-50 hover:text-navy-700'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-3 flex items-center gap-2 border-t border-navy-100 pt-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-100 text-[11px] font-semibold uppercase text-navy-600">
          {(user?.email ?? '?').slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] text-navy-400">{user?.email}</div>
          <button onClick={() => void signOut()} className="text-[11px] font-medium text-navy-500 hover:text-navy-700">
            Sign out
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
      <aside className="hidden w-60 shrink-0 flex-col border-r border-navy-100 bg-white px-3 py-5 lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-900/40" onClick={() => setNavOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white px-3 py-5 shadow-xl">
            <SidebarContent onNavigate={() => setNavOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-navy-100 bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
            className="-ml-1 rounded-md p-1 text-navy-600 hover:bg-navy-50"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="font-display text-base font-bold tracking-tight text-navy-800">
            oz<span className="text-brand-500">·</span>ly
          </div>
          <span className="ml-auto truncate text-sm font-medium text-navy-500">{currentOrg.name}</span>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
