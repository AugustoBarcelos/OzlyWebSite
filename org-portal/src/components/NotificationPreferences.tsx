// Notification preferences section for /settings.
//
// Backend stub: prefs are stored in localStorage keyed by user_id (or 'me'
// when we don't have the user yet). When the real `profiles.notification_prefs`
// jsonb column lands, swap the persistence layer — the UI doesn't change.
//
// Event categories cover the events our edge functions + DB triggers ALREADY
// fire (push-send, org-notify-email). Off-by-default we don't ship anything
// even if the cron's wired up. Default ON we ship.

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';

interface PrefRow {
  key: string;
  label: string;
  description: string;
  defaultOn: boolean;
}

const CATEGORIES: { title: string; rows: PrefRow[] }[] = [
  {
    title: 'Invoices',
    rows: [
      { key: 'invoice_received', label: 'New invoice from a sub-contractor', description: 'Push + email when a sub sends you an invoice.',           defaultOn: true },
      { key: 'invoice_overdue',  label: 'Invoice goes overdue',              description: 'Daily digest of invoices past their due date.',           defaultOn: true },
      { key: 'payment_confirmed', label: 'Sub confirmed they got paid',       description: 'Push when the sub-contractor confirms the bank transfer.', defaultOn: false },
    ],
  },
  {
    title: 'Work + members',
    rows: [
      { key: 'work_unclaimed',   label: 'Offered job not accepted in 2h',     description: 'Push so you can re-offer to another sub before the start time.', defaultOn: true },
      { key: 'member_joined',    label: 'Sub-contractor accepted invite',     description: 'Push when an invited sub installs the app and accepts.',        defaultOn: true },
      { key: 'member_compliance', label: 'Insurance / ABN issue surfaces',   description: 'Email when a sub\'s insurance is 14 days from expiry or ABN deregistered.', defaultOn: true },
    ],
  },
  {
    title: 'Billing + integrations',
    rows: [
      { key: 'trial_ending',     label: 'Trial 3 days from ending',          description: 'Email to the org admin.',                                          defaultOn: true },
      { key: 'sync_failed',      label: 'Integration sync failed',            description: 'Push when ServiceM8 / Xero / etc. errors during sync.',           defaultOn: true },
      { key: 'monthly_summary',  label: 'Monthly business summary',          description: 'Email on the 1st with last month\'s numbers (revenue, top subs).', defaultOn: false },
    ],
  },
];

interface Prefs {
  channels: { email: boolean; push: boolean };
  events: Record<string, boolean>;
}

function loadPrefs(userKey: string): Prefs {
  try {
    const raw = localStorage.getItem(`ozly.notif.${userKey}`);
    if (raw) return JSON.parse(raw) as Prefs;
  } catch { /* fall through */ }
  const events: Record<string, boolean> = {};
  CATEGORIES.forEach((c) => c.rows.forEach((r) => (events[r.key] = r.defaultOn)));
  return { channels: { email: true, push: true }, events };
}

function savePrefs(userKey: string, prefs: Prefs): void {
  localStorage.setItem(`ozly.notif.${userKey}`, JSON.stringify(prefs));
}

export function NotificationPreferences({ userKey }: { userKey: string }) {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const { notify } = useToast();

  useEffect(() => { setPrefs(loadPrefs(userKey)); }, [userKey]);

  function toggleChannel(ch: 'email' | 'push') {
    if (!prefs) return;
    const next = { ...prefs, channels: { ...prefs.channels, [ch]: !prefs.channels[ch] } };
    setPrefs(next);
    savePrefs(userKey, next);
  }

  function toggleEvent(key: string) {
    if (!prefs) return;
    const next = { ...prefs, events: { ...prefs.events, [key]: !prefs.events[key] } };
    setPrefs(next);
    savePrefs(userKey, next);
  }

  function resetDefaults() {
    const events: Record<string, boolean> = {};
    CATEGORIES.forEach((c) => c.rows.forEach((r) => (events[r.key] = r.defaultOn)));
    const next: Prefs = { channels: { email: true, push: true }, events };
    setPrefs(next);
    savePrefs(userKey, next);
    notify('Reset to defaults.', 'success');
  }

  if (!prefs) return null;

  return (
    <section className="ozly-card mb-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-display text-sm font-bold text-navy-800">Notifications</h2>
          <p className="mt-1 text-[12px] text-navy-500">
            What lands in your inbox + on your phone. Toggle anything off you don't want.
          </p>
        </div>
        <button
          onClick={resetDefaults}
          className="text-[11px] font-semibold text-navy-500 hover:text-brand-700"
        >
          Reset defaults
        </button>
      </div>

      {/* Channels — master switches */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Toggle
          on={prefs.channels.email}
          onChange={() => toggleChannel('email')}
          label="Email"
          icon="✉️"
          sublabel={prefs.channels.email ? 'On — sent to your admin email' : 'Off — no emails will be sent'}
        />
        <Toggle
          on={prefs.channels.push}
          onChange={() => toggleChannel('push')}
          label="Push"
          icon="🔔"
          sublabel={prefs.channels.push ? 'On — Ozly mobile app' : 'Off — no push notifications'}
        />
      </div>

      {/* Events grouped by category */}
      <div className="mt-5 space-y-5">
        {CATEGORIES.map((cat) => (
          <div key={cat.title}>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy-300">
              {cat.title}
            </div>
            <div className="mt-2 space-y-1.5">
              {cat.rows.map((row) => (
                <Toggle
                  key={row.key}
                  on={prefs.events[row.key] ?? row.defaultOn}
                  onChange={() => toggleEvent(row.key)}
                  label={row.label}
                  sublabel={row.description}
                  disabled={!prefs.channels.email && !prefs.channels.push}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-5 text-[11px] text-navy-400">
        Changes save automatically. Push notifications require the Ozly mobile app installed and signed in.
      </p>
    </section>
  );
}

function Toggle({
  on, onChange, label, sublabel, icon, disabled,
}: {
  on: boolean;
  onChange: () => void;
  label: string;
  sublabel?: string;
  icon?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      role="switch"
      aria-checked={on}
      className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors ${
        on
          ? 'border-brand-200 bg-brand-50/40'
          : 'border-navy-100 bg-white hover:border-navy-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <span aria-hidden="true" className="text-base">{icon}</span>}
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-navy-800">{label}</div>
          {sublabel && <div className="mt-0.5 text-[11px] text-navy-500">{sublabel}</div>}
        </div>
      </div>
      <span
        className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors"
        style={{
          background: on
            ? 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))'
            : 'var(--surface-soft)',
          boxShadow: on ? 'none' : 'inset 0 0 0 1px var(--border-soft)',
        }}
      >
        <span
          className="absolute inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform"
          style={{ transform: on ? 'translateX(20px)' : 'translateX(3px)' }}
        />
      </span>
    </button>
  );
}
