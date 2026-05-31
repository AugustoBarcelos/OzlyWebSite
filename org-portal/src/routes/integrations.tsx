// /settings/integrations — gallery of integrations Ozly connects to.
//
// The primary purpose of integrations here is to PULL JOBS IN from the
// scheduling/CRM tools the cleaning company already uses (ServiceM8, Tradify,
// Google Calendar, etc.) so the admin can offer them to sub-contractors in
// one click instead of re-typing every job. Accounting/Payments are secondary
// — they close the loop by pushing the financial outcome out.
//
// Backend is stubbed. To make the sync UX visible, the whole flow is
// simulated client-side:
//   1. "Connect" opens a 3-step wizard (Sign in → Scopes → First sync)
//   2. After the wizard, the integration flips to 'connected' (in-memory)
//   3. Connected state shows last-sync, what's flowing, activity log,
//      a manual "Sync now" button, and a Disconnect.
// State doesn't persist past page reload — replace `INITIAL_INTEGRATIONS`
// with a Supabase-backed store when the real backend lands.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrg } from '@/lib/org';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import { logOrgEvent } from '@/lib/telemetry';

type IntegrationCategory = 'Job sources' | 'Accounting' | 'Payments';
type IntegrationState = 'available' | 'coming_soon' | 'connected';

interface SyncLogEntry {
  at: string;        // ISO timestamp
  message: string;
  status: 'ok' | 'partial' | 'failed';
}

interface Integration {
  key: string;
  name: string;
  category: IntegrationCategory;
  monogram: string;
  /** Hex/CSS colour for the monogram tile gradient. */
  tone: string;
  /** Two-tone gradient end. */
  toneEnd: string;
  oneliner: string;
  longDescription: string;
  state: IntegrationState;
  /** Sync scopes the integration could enable. Used by the wizard. */
  scopes: { key: string; label: string; description: string; defaultOn: boolean }[];
  /** Populated when state === 'connected'. */
  connectedAt?: string;
  lastSyncAt?: string;
  syncFrequency?: string;     // e.g. "Every 15 minutes"
  syncCount?: number;          // last-sync record count
  activityLog?: SyncLogEntry[];
}

function relativeFromNow(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.round(ms / 1_000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function isoMinutesAgo(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString();
}

const INITIAL_INTEGRATIONS: Integration[] = [
  // ── JOB SOURCES — the primary integration category ────────────────────
  {
    key: 'servicem8',
    name: 'ServiceM8',
    category: 'Job sources',
    monogram: 'S8',
    tone: '#ff6c00', toneEnd: '#c44d00',
    oneliner: 'Pull scheduled jobs into Ozly, offer to subs in one click.',
    longDescription:
      'When a job is scheduled in ServiceM8 (status: queued or scheduled), it auto-appears in Ozly\'s Work inbox. You pick a sub, hit Offer, and the sub gets a push to accept. No re-typing job details, location or customer notes.',
    state: 'connected',
    scopes: [
      { key: 'jobs_pull',  label: 'Scheduled jobs → Work inbox', description: 'New / scheduled ServiceM8 jobs appear in Ozly\'s Work list.',        defaultOn: true },
      { key: 'customer',   label: 'Customer notes + address',     description: 'Include customer info so subs know what they\'re walking into.',     defaultOn: true },
      { key: 'attachments',label: 'Photos + attachments',         description: 'Pull site photos / quote PDFs the dispatcher uploaded.',             defaultOn: false },
      { key: 'jobs_push',  label: 'Status back to ServiceM8',      description: 'When a sub completes a job, mark it complete in ServiceM8 too.',     defaultOn: true },
    ],
    connectedAt: isoMinutesAgo(60 * 24 * 11), // 11 days ago
    lastSyncAt:  isoMinutesAgo(4),
    syncFrequency: 'Every 5 minutes',
    syncCount: 2,
    activityLog: [
      { at: isoMinutesAgo(4),   message: '2 new jobs pulled — Bondi + Surry Hills',  status: 'ok' },
      { at: isoMinutesAgo(9),   message: '1 job status pushed back — completed',     status: 'ok' },
      { at: isoMinutesAgo(14),  message: '3 new jobs pulled — CBD office round',     status: 'ok' },
      { at: isoMinutesAgo(19),  message: 'No changes',                                status: 'ok' },
      { at: isoMinutesAgo(24),  message: '1 new job pulled — Parramatta carpets',    status: 'ok' },
    ],
  },
  {
    key: 'tradify',
    name: 'Tradify',
    category: 'Job sources',
    monogram: 'T',
    tone: '#1e88e5', toneEnd: '#1565c0',
    oneliner: 'AU/NZ trades scheduler — jobs flow into Ozly automatically.',
    longDescription:
      'Tradify users dispatch from a calendar; Ozly listens and pulls each scheduled job into Work the moment it lands. Quotes still live in Tradify — we only sync the dispatched job.',
    state: 'available',
    scopes: [
      { key: 'jobs',     label: 'Scheduled jobs → Work inbox', description: 'Each Tradify job becomes an Ozly job to offer.',         defaultOn: true },
      { key: 'customer', label: 'Customer + site details',     description: 'Pull the customer record + site address.',               defaultOn: true },
      { key: 'status',   label: 'Status writeback',             description: 'When subs complete, mark the Tradify job done.',         defaultOn: true },
    ],
  },
  {
    key: 'google_calendar',
    name: 'Google Calendar',
    category: 'Job sources',
    monogram: 'G',
    tone: '#4285f4', toneEnd: '#1a73e8',
    oneliner: 'Calendar events → job offers. Two-way sync with subs.',
    longDescription:
      'Pick a calendar — every new event becomes an Ozly job ready to offer. Confirmed jobs also push back to the sub-contractor\'s primary calendar so they don\'t double-book.',
    state: 'available',
    scopes: [
      { key: 'events_read',  label: 'Read events from a calendar', description: 'Pick the calendars to watch. New events become jobs.', defaultOn: true },
      { key: 'events_write', label: 'Push confirmed jobs back',     description: 'Accepted jobs land on the sub\'s primary calendar.',    defaultOn: true },
      { key: 'busy',         label: 'Respect busy times',           description: 'Avoid offering work when a sub is busy elsewhere.',     defaultOn: false },
    ],
  },
  {
    key: 'microsoft_365',
    name: 'Microsoft 365 Calendar',
    category: 'Job sources',
    monogram: 'M',
    tone: '#0078d4', toneEnd: '#005a9e',
    oneliner: 'Office 365 / Outlook calendar events as job offers.',
    longDescription:
      'For teams on Microsoft 365 — same flow as Google Calendar. Pick one or more shared calendars, every event becomes a job in Ozly. Optional writeback when accepted.',
    state: 'coming_soon',
    scopes: [],
  },
  {
    key: 'csv_jobs',
    name: 'CSV upload',
    category: 'Job sources',
    monogram: '↑',
    tone: '#3d566b', toneEnd: '#14242f',
    oneliner: 'Drop a spreadsheet of jobs — we\'ll match the columns.',
    longDescription:
      'No API? No problem. Upload a CSV with columns like Date / Address / Customer / Duration — we\'ll map them, preview each row, and import as Ozly jobs. Useful for one-off batch imports or migrating from Excel.',
    state: 'available',
    scopes: [
      { key: 'upload',  label: 'One-shot upload',              description: 'Manual — pick a file and import.',                     defaultOn: true },
      { key: 'mapping', label: 'Remember column mapping',      description: 'Save your column → field mapping for future uploads.', defaultOn: true },
    ],
  },
  {
    key: 'zapier',
    name: 'Zapier',
    category: 'Job sources',
    monogram: 'Z',
    tone: '#ff4a00', toneEnd: '#cc3a00',
    oneliner: 'Webhook trigger — anything that can fire Zapier becomes a job.',
    longDescription:
      'For tools we don\'t integrate with directly — connect via Zapier. Trigger: "new row in Google Sheets / new Typeform response / new HubSpot deal" → Action: "create Ozly job". Fully bidirectional.',
    state: 'coming_soon',
    scopes: [],
  },

  // ── ACCOUNTING — secondary: push the financial outcome out ────────────
  {
    key: 'xero',
    name: 'Xero',
    category: 'Accounting',
    monogram: 'X',
    tone: '#13b5ea', toneEnd: '#0c84ad',
    oneliner: 'Push paid invoices straight into Bills to pay.',
    longDescription:
      'When a sub-contractor invoice is marked paid in Ozly, the bill auto-imports into Xero with the right contact, GST split and date. No CSV gymnastics. Best for AU teams already on Xero.',
    state: 'connected',
    scopes: [
      { key: 'bills',    label: 'Paid invoices → Bills',     description: 'Each paid invoice creates a Bill in Xero.',           defaultOn: true },
      { key: 'contacts', label: 'Sub-contractors → Contacts', description: 'New subs sync as Xero suppliers automatically.',     defaultOn: true },
      { key: 'gst',      label: 'GST split',                  description: 'Tax-component lines mapped to the right GST code.',  defaultOn: true },
      { key: 'projects', label: 'Tracking (Project / Class)', description: 'Optional — tag bills with a Xero project or class.', defaultOn: false },
    ],
    connectedAt: isoMinutesAgo(60 * 24 * 6),
    lastSyncAt:  isoMinutesAgo(8),
    syncFrequency: 'Every 15 minutes',
    syncCount: 3,
    activityLog: [
      { at: isoMinutesAgo(8),   message: '3 paid invoices → Bills',  status: 'ok' },
      { at: isoMinutesAgo(23),  message: '2 paid invoices → Bills',  status: 'ok' },
      { at: isoMinutesAgo(38),  message: '1 new sub → Xero contact', status: 'ok' },
      { at: isoMinutesAgo(53),  message: 'No changes',                status: 'ok' },
      { at: isoMinutesAgo(68),  message: '4 paid invoices → Bills',  status: 'ok' },
    ],
  },
  {
    key: 'myob',
    name: 'MYOB',
    category: 'Accounting',
    monogram: 'M',
    tone: '#7e3eff', toneEnd: '#5b2bbf',
    oneliner: 'Supplier bills sync with MYOB Business / AccountRight.',
    longDescription:
      'Same flow as Xero — paid invoices land as supplier bills in MYOB so your bookkeeper sees the truth in one place. We support MYOB Business and AccountRight Live.',
    state: 'available',
    scopes: [
      { key: 'bills',    label: 'Paid invoices → Supplier bills', description: 'Each paid invoice becomes a supplier bill.', defaultOn: true },
      { key: 'contacts', label: 'Sub-contractors → Cards',         description: 'Subs sync as MYOB supplier cards.',         defaultOn: true },
      { key: 'gst',      label: 'GST split',                       description: 'Tax codes mapped to your MYOB chart.',      defaultOn: true },
    ],
  },
  {
    key: 'qbo',
    name: 'QuickBooks Online',
    category: 'Accounting',
    monogram: 'Q',
    tone: '#2ca01c', toneEnd: '#1f7414',
    oneliner: 'Bills + contacts sync for QBO users.',
    longDescription:
      'QuickBooks Online integration creates the supplier contact (if missing), then files each paid invoice as a Bill. We respect class + location if you use them.',
    state: 'coming_soon',
    scopes: [],
  },

  // ── PAYMENTS ──────────────────────────────────────────────────────────
  {
    key: 'stripe',
    name: 'Stripe (collect from clients)',
    category: 'Payments',
    monogram: '$',
    tone: '#635bff', toneEnd: '#4a40d6',
    oneliner: 'Pay-by-link on your clients\' invoices — separate from your Ozly subscription.',
    longDescription:
      'Currently Stripe powers your Ozly subscription. We\'re building a second Stripe surface so you can attach a Pay link to each invoice your subs send through you — separate from the Stripe account billing you for Ozly.',
    state: 'coming_soon',
    scopes: [],
  },
];

const CATEGORY_ORDER: IntegrationCategory[] = ['Job sources', 'Accounting', 'Payments'];

const STATE_PILL: Record<IntegrationState, { label: string; cls: string }> = {
  available:    { label: 'Available',    cls: 'bg-brand-50 text-brand-700 ring-1 ring-brand-100' },
  coming_soon:  { label: 'Coming soon',  cls: 'bg-navy-50 text-navy-500 ring-1 ring-navy-100' },
  connected:    { label: '✓ Connected',  cls: 'bg-brand-100 text-brand-800 ring-1 ring-brand-200' },
};

const STATUS_DOT: Record<SyncLogEntry['status'], string> = {
  ok:      'bg-brand-500',
  partial: 'bg-amber-400',
  failed:  'bg-rose-500',
};

export function IntegrationsPage() {
  const { currentOrg } = useOrg();
  const { notify } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>(INITIAL_INTEGRATIONS);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const open = integrations.find((i) => i.key === openKey) ?? null;
  const orgId = currentOrg?.id ?? null;

  // Wizard state — separate so opening the panel for a connected integration
  // shows the connected view, not the wizard.
  const [wizardStep, setWizardStep] = useState<0 | 1 | 2 | 3>(0);
  const [wizardScopes, setWizardScopes] = useState<Record<string, boolean>>({});
  const [syncingKey, setSyncingKey] = useState<string | null>(null);

  useEffect(() => {
    setWizardStep(0);
    if (open && open.state === 'available') {
      const s: Record<string, boolean> = {};
      open.scopes.forEach((sc) => { s[sc.key] = sc.defaultOn; });
      setWizardScopes(s);
    }
  }, [openKey, open]);

  function patch(key: string, patchObj: Partial<Integration>): void {
    setIntegrations((prev) => prev.map((i) => (i.key === key ? { ...i, ...patchObj } : i)));
  }

  function startWizard(): void {
    if (!open) return;
    setWizardStep(1);
  }

  function completeWizard(): void {
    if (!open || !orgId) return;
    setWizardStep(3);
    window.setTimeout(() => {
      const isJobSource = open.category === 'Job sources';
      patch(open.key, {
        state: 'connected',
        connectedAt: new Date().toISOString(),
        lastSyncAt:  new Date().toISOString(),
        syncFrequency: isJobSource ? 'Every 5 minutes' : 'Every 15 minutes',
        syncCount: 0,
        activityLog: [
          { at: new Date().toISOString(), message: 'First sync complete — no changes yet', status: 'ok' },
        ],
      });
      notify(`${open.name} connected.`, 'success');
      setWizardStep(0);
      void logOrgEvent(orgId, 'org_integration_requested', {
        integration_key: open.key,
        state: 'connected_mock',
      });
    }, 1_400);
  }

  function syncNow(int: Integration): void {
    if (syncingKey) return;
    setSyncingKey(int.key);
    window.setTimeout(() => {
      const isJobSource = int.category === 'Job sources';
      const count = Math.floor(Math.random() * 4) + 1;
      const nowIso = new Date().toISOString();
      const msg = isJobSource
        ? (count === 1 ? '1 new job pulled' : `${count} new jobs pulled`)
        : (count === 1 ? '1 paid invoice → Bill' : `${count} paid invoices → Bills`);
      const entry: SyncLogEntry = { at: nowIso, message: msg, status: 'ok' };
      patch(int.key, {
        lastSyncAt: nowIso,
        syncCount: count,
        activityLog: [entry, ...(int.activityLog ?? [])].slice(0, 8),
      });
      notify(`Synced — ${msg.toLowerCase()}.`, 'success');
      setSyncingKey(null);
    }, 1_200);
  }

  function disconnect(int: Integration): void {
    const yes = window.confirm(`Disconnect ${int.name}? Your data stays in ${int.name}, but Ozly stops pushing new updates.`);
    if (!yes) return;
    setIntegrations((prev) =>
      prev.map((i) => {
        if (i.key !== int.key) return i;
        return {
          key: i.key,
          name: i.name,
          category: i.category,
          monogram: i.monogram,
          tone: i.tone,
          toneEnd: i.toneEnd,
          oneliner: i.oneliner,
          longDescription: i.longDescription,
          state: 'available',
          scopes: i.scopes,
        };
      }),
    );
    notify(`${int.name} disconnected.`, 'info');
  }

  function requestComingSoon(int: Integration): void {
    if (!orgId) return;
    void logOrgEvent(orgId, 'org_integration_requested', {
      integration_key: int.key,
      state: 'coming_soon',
    });
    notify(`Got it — we'll email you when ${int.name} is ready.`, 'success');
    setOpenKey(null);
  }

  // Hero stats above the gallery — connected + total job sources
  const connectedCount = integrations.filter((i) => i.state === 'connected').length;
  const jobSourceConnected = integrations.filter((i) => i.category === 'Job sources' && i.state === 'connected').length;
  const lastSyncAt = integrations
    .filter((i) => i.state === 'connected' && i.lastSyncAt)
    .map((i) => i.lastSyncAt!)
    .sort()
    .pop();

  return (
    <div>
      <PageHeader
        kicker="Account"
        title="Integrations"
        subtitle="Pull jobs from your scheduling tools — offer them to sub-contractors in one click. Push the financial outcome out to your accounting."
        action={
          <Link
            to="/settings"
            className="rounded-md px-3 py-1.5 text-xs font-medium text-navy-700 ring-1 ring-navy-100 hover:bg-navy-50"
          >
            ← Settings
          </Link>
        }
      />

      {/* Connection summary strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div
          className="rounded-xl border border-brand-200 bg-brand-50/40 p-3"
        >
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-brand-700">Active</div>
          <div className="mt-0.5 font-display text-xl font-bold text-navy-800">
            {connectedCount} <span className="text-sm font-medium text-navy-400">connected</span>
          </div>
        </div>
        <div className="rounded-xl border border-navy-100 bg-white p-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-navy-400">Jobs flowing in</div>
          <div className="mt-0.5 font-display text-xl font-bold text-navy-800">
            {jobSourceConnected} <span className="text-sm font-medium text-navy-400">source{jobSourceConnected === 1 ? '' : 's'}</span>
          </div>
        </div>
        <div className="col-span-2 rounded-xl border border-navy-100 bg-white p-3 sm:col-span-1">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-navy-400">Last sync</div>
          <div className="mt-0.5 font-display text-xl font-bold text-navy-800">
            {lastSyncAt ? relativeFromNow(lastSyncAt) : '—'}
          </div>
        </div>
      </div>

      <div
        className="mb-5 flex items-start gap-3 rounded-xl border border-navy-100 bg-navy-50/50 px-4 py-3 text-[12.5px] text-navy-500"
        role="note"
      >
        <span aria-hidden="true" className="text-base leading-none">🔌</span>
        <div>
          <span className="font-semibold text-navy-700">The point of integrations:</span>{' '}
          stop re-typing jobs. Connect ServiceM8 / Tradify / your calendar — every scheduled job
          shows up in <Link to="/work" className="font-semibold text-brand-700 underline">Work</Link>,
          ready to offer to a sub. Sync runs in the background, every 5 minutes.
        </div>
      </div>

      <div className="space-y-6">
        {CATEGORY_ORDER.map((cat) => {
          const items = integrations.filter((i) => i.category === cat);
          if (items.length === 0) return null;
          const catDescription = cat === 'Job sources'
            ? 'Pull scheduled work in. Primary integration target.'
            : cat === 'Accounting'
              ? 'Push the financial outcome out to your books.'
              : 'Collect payments from your clients.';
          return (
            <section key={cat}>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <div>
                  <h2 className="font-display text-sm font-bold text-navy-800">{cat}</h2>
                  <div className="text-[11px] text-navy-400">{catDescription}</div>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-navy-300">
                  {items.length}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((int) => {
                  const pill = STATE_PILL[int.state];
                  return (
                    <button
                      key={int.key}
                      type="button"
                      onClick={() => setOpenKey(int.key)}
                      className="group flex flex-col gap-3 rounded-xl border border-navy-100 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-xl font-display text-base font-bold text-white shadow-sm"
                          style={{ background: `linear-gradient(135deg, ${int.tone} 0%, ${int.toneEnd} 100%)` }}
                          aria-hidden="true"
                        >
                          {int.monogram}
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${pill.cls}`}>
                          {pill.label}
                        </span>
                      </div>
                      <div>
                        <div className="font-display text-[15px] font-bold text-navy-800">{int.name}</div>
                        <div className="mt-1 text-[12.5px] leading-snug text-navy-500">{int.oneliner}</div>
                      </div>
                      {int.state === 'connected' && int.lastSyncAt ? (
                        <div className="mt-auto flex items-center gap-1.5 text-[11px] font-semibold text-brand-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                          Synced {relativeFromNow(int.lastSyncAt)}
                        </div>
                      ) : (
                        <div className="mt-auto text-[11px] font-semibold text-brand-700 opacity-0 transition-opacity group-hover:opacity-100">
                          {int.state === 'available' ? 'Connect →' : 'Learn more →'}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm"
            onClick={() => setOpenKey(null)}
            aria-hidden="true"
          />
          <aside
            className="relative flex w-full max-w-md flex-col overflow-y-auto p-6 shadow-2xl"
            style={{ background: 'var(--surface-elevated)' }}
          >
            <button
              onClick={() => setOpenKey(null)}
              className="absolute right-4 top-4 rounded-md p-1 text-navy-400 hover:bg-navy-50 hover:text-navy-700"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>

            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl font-display text-2xl font-bold text-white shadow-md"
              style={{ background: `linear-gradient(135deg, ${open.tone} 0%, ${open.toneEnd} 100%)` }}
            >
              {open.monogram}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <h2 className="font-display text-2xl font-bold tracking-tight text-navy-800">
                {open.name}
              </h2>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATE_PILL[open.state].cls}`}>
                {STATE_PILL[open.state].label}
              </span>
            </div>
            <div className="mt-1 text-[12px] font-medium uppercase tracking-wider text-navy-400">
              {open.category}
            </div>

            {open.state === 'connected' && (
              <ConnectedPanel
                int={open}
                onSyncNow={() => syncNow(open)}
                onDisconnect={() => disconnect(open)}
                isSyncing={syncingKey === open.key}
              />
            )}

            {open.state === 'coming_soon' && (
              <>
                <p className="mt-4 text-sm leading-relaxed text-navy-600">{open.longDescription}</p>
                <div className="mt-6 rounded-xl border border-navy-100 bg-navy-50/40 p-4 text-[12.5px] text-navy-500">
                  <div className="font-semibold text-navy-700">We're building this now.</div>
                  <p className="mt-1">Join the waitlist and we'll email you the moment it's ready — usually 2-3 weeks once a quorum of orgs ask for it.</p>
                </div>
                <button
                  onClick={() => requestComingSoon(open)}
                  className="btn-primary mt-6 justify-center"
                >
                  Notify me when {open.name} is ready
                </button>
              </>
            )}

            {open.state === 'available' && wizardStep === 0 && (
              <>
                <p className="mt-4 text-sm leading-relaxed text-navy-600">{open.longDescription}</p>
                <div className="mt-6 rounded-xl border border-navy-100 bg-navy-50/40 p-4 text-[12.5px] text-navy-500">
                  <div className="font-semibold text-navy-700">3 steps. ~30 seconds.</div>
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    <li>Sign in to {open.name} with one click (OAuth — we never see your password).</li>
                    <li>Choose what to sync (you can change this later).</li>
                    <li>First sync runs in the background. You're done.</li>
                  </ol>
                </div>
                <button onClick={startWizard} className="btn-primary mt-6 justify-center">
                  Connect {open.name} →
                </button>
              </>
            )}

            {open.state === 'available' && wizardStep > 0 && (
              <ConnectWizard
                int={open}
                step={wizardStep as 1 | 2 | 3}
                scopes={wizardScopes}
                setScopes={setWizardScopes}
                onBack={() => setWizardStep((s) => (Math.max(1, s - 1) as 1 | 2 | 3))}
                onNext={() => setWizardStep((s) => (Math.min(3, s + 1) as 1 | 2 | 3))}
                onFinish={completeWizard}
                onCancel={() => setWizardStep(0)}
              />
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function ConnectedPanel({
  int,
  onSyncNow,
  onDisconnect,
  isSyncing,
}: {
  int: Integration;
  onSyncNow: () => void;
  onDisconnect: () => void;
  isSyncing: boolean;
}) {
  return (
    <>
      <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-500" />
            </span>
            <span className="font-display text-sm font-bold text-navy-800">Live sync active</span>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
            {int.syncFrequency}
          </span>
        </div>
        <div className="mt-2 text-[12.5px] text-navy-500">
          Last sync <span className="font-semibold text-navy-700">{int.lastSyncAt ? relativeFromNow(int.lastSyncAt) : '—'}</span>
          {int.connectedAt && <> · connected {relativeFromNow(int.connectedAt)}</>}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy-300">
          What's flowing
        </div>
        <ul className="space-y-1.5">
          {int.scopes.filter((s) => s.defaultOn).map((s) => (
            <li key={s.key} className="flex items-start gap-2 rounded-lg border border-navy-100 bg-navy-50/30 p-2.5 text-[12.5px]">
              <span aria-hidden="true" className="mt-0.5 text-brand-600">✓</span>
              <div>
                <div className="font-semibold text-navy-800">{s.label}</div>
                <div className="mt-0.5 text-[11.5px] text-navy-500">{s.description}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {int.activityLog && int.activityLog.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy-300">
            Recent activity
          </div>
          <ul className="space-y-1">
            {int.activityLog.map((e, i) => (
              <li key={i} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12px] hover:bg-navy-50/40">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[e.status]}`} />
                <span className="flex-1 truncate text-navy-700">{e.message}</span>
                <span className="shrink-0 text-[10.5px] text-navy-400">{relativeFromNow(e.at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <button
          onClick={onSyncNow}
          disabled={isSyncing}
          className="btn-primary justify-center"
        >
          {isSyncing ? (
            <>
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 12a9 9 0 1 1-3-6.7" />
              </svg>
              Syncing…
            </>
          ) : 'Sync now'}
        </button>
        <button
          onClick={onDisconnect}
          className="rounded-lg px-3.5 py-2 text-[12.5px] font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50"
        >
          Disconnect {int.name}
        </button>
      </div>
    </>
  );
}

function ConnectWizard({
  int,
  step,
  scopes,
  setScopes,
  onBack,
  onNext,
  onFinish,
  onCancel,
}: {
  int: Integration;
  step: 1 | 2 | 3;
  scopes: Record<string, boolean>;
  setScopes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div className="mt-5 flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              n <= step
                ? 'bg-gradient-to-r from-brand-500 to-lime-400'
                : 'bg-navy-100'
            }`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-wider text-navy-400">
        <span>Step {step} of 3</span>
        <button onClick={onCancel} className="hover:text-navy-700">Cancel</button>
      </div>

      {step === 1 && (
        <>
          <h3 className="mt-5 font-display text-lg font-bold text-navy-800">Sign in to {int.name}</h3>
          <p className="mt-1 text-[13px] text-navy-500">
            We'll redirect you to {int.name} to sign in. Ozly never sees your password.
          </p>

          <div className="mt-4 rounded-xl border-2 border-dashed border-navy-200 bg-navy-50/30 p-5">
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg font-display text-sm font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${int.tone} 0%, ${int.toneEnd} 100%)` }}
              >
                {int.monogram}
              </div>
              <span className="font-semibold text-navy-700">{int.name} authorisation</span>
            </div>
            <div className="mt-3 text-[12.5px] text-navy-500">
              <strong className="text-navy-700">Ozly</strong> is requesting access to:
              <ul className="mt-1.5 ml-4 list-disc space-y-0.5">
                {int.category === 'Job sources' ? (
                  <>
                    <li>Read your account profile</li>
                    <li>Read scheduled jobs</li>
                    <li>Update job status (when subs complete work)</li>
                  </>
                ) : (
                  <>
                    <li>Read your account profile</li>
                    <li>Create supplier records</li>
                    <li>Create bills + bill payments</li>
                  </>
                )}
              </ul>
            </div>
            <button
              onClick={onNext}
              className="mt-4 w-full rounded-lg py-2 text-sm font-semibold text-white"
              style={{ background: `linear-gradient(135deg, ${int.tone} 0%, ${int.toneEnd} 100%)` }}
            >
              Authorise Ozly →
            </button>
            <div className="mt-2 text-center text-[10.5px] text-navy-400">
              This is a preview — no real connection is made.
            </div>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h3 className="mt-5 font-display text-lg font-bold text-navy-800">What should sync?</h3>
          <p className="mt-1 text-[13px] text-navy-500">
            You can change these later. We default to the conservative choice — only the things you'll use.
          </p>

          <div className="mt-4 space-y-2">
            {int.scopes.map((s) => (
              <label
                key={s.key}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                  scopes[s.key]
                    ? 'border-brand-300 bg-brand-50/40'
                    : 'border-navy-100 bg-white hover:border-navy-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!scopes[s.key]}
                  onChange={() => setScopes((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
                  className="mt-0.5 h-4 w-4 rounded border-navy-300 text-brand-600 focus:ring-brand-200"
                />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-navy-800">{s.label}</div>
                  <div className="mt-0.5 text-[11.5px] text-navy-500">{s.description}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-6 flex gap-2">
            <button
              onClick={onBack}
              className="rounded-lg px-3.5 py-2 text-[13px] font-semibold text-navy-700 ring-1 ring-navy-100 hover:bg-navy-50"
            >
              ← Back
            </button>
            <button onClick={onNext} className="btn-primary flex-1 justify-center">
              Looks good — finish setup →
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h3 className="mt-5 font-display text-lg font-bold text-navy-800">Running your first sync…</h3>
          <p className="mt-1 text-[13px] text-navy-500">
            {int.category === 'Job sources'
              ? "We're pulling your scheduled jobs and matching them to your subs. Usually takes 5-10 seconds."
              : "We're pulling your existing data and matching it up. Usually takes 5-10 seconds."}
          </p>

          <div className="mt-5 rounded-xl border border-navy-100 bg-navy-50/30 p-5">
            <div className="h-1.5 overflow-hidden rounded-full bg-navy-100">
              <div
                className="h-full w-1/3 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, var(--color-brand-500) 0%, var(--color-lime-400) 100%)',
                  animation: 'indeterminate 1.4s ease-in-out infinite',
                }}
              />
            </div>
            <ul className="mt-4 space-y-2 text-[12.5px]">
              <li className="flex items-center gap-2 text-brand-700">
                <span aria-hidden="true">✓</span>
                Connected to {int.name}
              </li>
              <li className="flex items-center gap-2 text-brand-700">
                <span aria-hidden="true">✓</span>
                Scopes confirmed
              </li>
              <li className="flex items-center gap-2 text-navy-500">
                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-3-6.7" />
                </svg>
                {int.category === 'Job sources' ? 'Pulling scheduled jobs' : 'Matching existing records'}
              </li>
            </ul>
          </div>

          <button onClick={onFinish} className="btn-primary mt-6 w-full justify-center">
            Start using {int.name} →
          </button>
        </>
      )}

      <style>{`@keyframes indeterminate { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
    </>
  );
}
