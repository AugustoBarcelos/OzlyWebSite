import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import { NotificationPreferences } from '@/components/NotificationPreferences';
import { CalendarFeedsSection } from '@/components/CalendarFeedsSection';
import { formatDate } from '@/lib/format';
import { SEAT_LIMIT } from '@/lib/types';
import { friendlyError } from '@/lib/errors';
import { useSeqGuard } from '@/lib/use-seq-guard';

export function SettingsPage() {
  const { currentOrg, refresh } = useOrg();
  const { user } = useAuth();
  const { notify } = useToast();
  const orgId = currentOrg?.id ?? null;

  const [name, setName] = useState(currentOrg?.name ?? '');
  const [abn, setAbn] = useState(currentOrg?.abn ?? '');
  const [saving, setSaving] = useState(false);
  const [memberCount, setMemberCount] = useState<number | null>(null);

  const [periodFreq, setPeriodFreq] = useState(currentOrg?.period_frequency ?? 'fortnightly');
  const [periodAnchor, setPeriodAnchor] = useState(currentOrg?.period_anchor ?? '');
  const [savingPeriod, setSavingPeriod] = useState(false);

  const [billingEmail, setBillingEmail] = useState(currentOrg?.billing_email ?? '');
  const [savingBillingEmail, setSavingBillingEmail] = useState(false);

  const [defaultRate, setDefaultRate] = useState(
    currentOrg?.default_hourly_rate ? String(currentOrg.default_hourly_rate) : '',
  );
  const [savingRate, setSavingRate] = useState(false);

  useEffect(() => {
    setName(currentOrg?.name ?? '');
    setAbn(currentOrg?.abn ?? '');
    setPeriodFreq(currentOrg?.period_frequency ?? 'fortnightly');
    setPeriodAnchor(currentOrg?.period_anchor ?? '');
    setBillingEmail(currentOrg?.billing_email ?? '');
    setDefaultRate(currentOrg?.default_hourly_rate ? String(currentOrg.default_hourly_rate) : '');
  }, [currentOrg?.id, currentOrg?.name, currentOrg?.abn, currentOrg?.billing_email, currentOrg?.period_frequency, currentOrg?.period_anchor, currentOrg?.default_hourly_rate]);

  async function saveDefaultRate() {
    if (!orgId) return;
    const value = defaultRate.trim() === '' ? 0 : Number(defaultRate);
    if (Number.isNaN(value) || value < 0) {
      notify('Enter a valid rate (e.g. 45) or leave blank.', 'error');
      return;
    }
    setSavingRate(true);
    const { error } = await supabase
      .from('organizations')
      .update({ default_hourly_rate: value })
      .eq('id', orgId);
    if (error) notify(friendlyError(error), 'error');
    else {
      notify('Default rate saved', 'success');
      await refresh();
    }
    setSavingRate(false);
  }

  async function saveBillingEmail() {
    if (!orgId) return;
    const trimmed = billingEmail.trim();
    if (trimmed.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      notify('Enter a valid email or leave blank.', 'error');
      return;
    }
    setSavingBillingEmail(true);
    const { error } = await supabase
      .from('organizations')
      .update({ billing_email: trimmed || null })
      .eq('id', orgId);
    if (error) {
      // PG error 42703 = column does not exist (migration 20260602100000
      // not applied yet). Surface a clear message instead of a generic one.
      if ((error as { code?: string }).code === '42703') {
        notify(
          "Inbox feature isn't enabled on this DB yet. Apply migration 20260602100000 to use it.",
          'error',
        );
      } else {
        notify(friendlyError(error), 'error');
      }
    } else {
      notify(trimmed ? 'Inbox email saved' : 'Inbox email cleared', 'success');
      await refresh();
    }
    setSavingBillingEmail(false);
  }

  async function savePeriod() {
    if (!orgId) return;
    setSavingPeriod(true);
    const { error } = await supabase
      .from('organizations')
      .update({
        period_frequency: periodFreq,
        period_anchor: periodFreq === 'monthly' ? null : periodAnchor || null,
      })
      .eq('id', orgId);
    if (error) notify(friendlyError(error), 'error');
    else {
      notify('Reporting period updated', 'success');
      await refresh();
    }
    setSavingPeriod(false);
  }

  const countSeq = useSeqGuard();
  const loadCount = useCallback(async () => {
    if (!orgId) return;
    const token = countSeq.start();
    const { count } = await supabase
      .from('org_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'accepted');
    if (!countSeq.isCurrent(token)) return;
    setMemberCount(count ?? 0);
  }, [orgId, countSeq]);

  useEffect(() => {
    void loadCount();
  }, [loadCount]);

  async function saveOrg() {
    if (!orgId) return;
    const trimmedAbn = abn.trim();
    // Validate ABN format: 11 digits (with optional spacing). Reject "12345" / "abc".
    if (trimmedAbn.length > 0 && !/^\d{11}$/.test(trimmedAbn.replace(/\s/g, ''))) {
      notify('ABN must be 11 digits (e.g. 12 345 678 901) or left blank.', 'error');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('organizations')
      .update({ name: name.trim(), abn: trimmedAbn || null })
      .eq('id', orgId);
    if (error) notify(friendlyError(error), 'error');
    else {
      notify('Saved', 'success');
      await refresh();
    }
    setSaving(false);
  }

  if (!currentOrg) return null;

  const plan = currentOrg.billing_plan;
  const limit = SEAT_LIMIT[plan];
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <>
      <PageHeader kicker="Account" title="Settings" subtitle="Organisation, plan and members" />

      <div className="max-w-2xl">
      {/* Onboarding guide — print-ready PDF for handing to team / customers. */}
      <Link
        to="/print/onboarding"
        target="_blank"
        rel="noopener"
        className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-navy-100 bg-white p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/20"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
            style={{
              background: 'linear-gradient(135deg, var(--color-brand-500) 0%, var(--color-lime-400) 100%)',
              color: '#ffffff',
            }}
            aria-hidden="true"
          >
            📖
          </div>
          <div>
            <div className="text-sm font-semibold text-navy-800">Onboarding guide (PDF)</div>
            <div className="text-[12px] text-navy-500">
              6-page setup walkthrough — open + print to share with your team.
            </div>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-brand-700">Open →</span>
      </Link>

      {/* Integrations entry-point — full UI lives at /settings/integrations. */}
      <Link
        to="/settings/integrations"
        className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-navy-100 bg-white p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/20"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
            style={{
              background: 'linear-gradient(135deg, var(--color-brand-500) 0%, var(--color-lime-400) 100%)',
              color: '#ffffff',
            }}
            aria-hidden="true"
          >
            🔌
          </div>
          <div>
            <div className="text-sm font-semibold text-navy-800">Integrations</div>
            <div className="text-[12px] text-navy-500">
              Sync with Xero, MYOB, Google Calendar and more.
            </div>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-brand-700">Open →</span>
      </Link>

      {/* Organization */}
      <section className="ozly-card mb-4 p-5">
        <h2 className="text-sm font-semibold text-navy-700">Organisation</h2>
        <label className="mt-4 block text-xs font-medium text-navy-600">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <label className="mt-3 block text-xs font-medium text-navy-600">
          ABN
          <input
            value={abn}
            onChange={(e) => setAbn(e.target.value)}
            placeholder="12 345 678 901"
            className="mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <div className="mt-3 text-xs font-medium text-navy-600">
          Admin email
          <div className="mt-1 rounded-md bg-navy-50 px-3 py-2 text-sm text-navy-500">
            {currentOrg.admin_email}
          </div>
        </div>
        <button
          onClick={() => void saveOrg()}
          disabled={saving || name.trim().length === 0}
          className="mt-4 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </section>

      {/* Inbox email */}
      <section id="billing-email" className="ozly-card mb-4 p-5">
        <h2 className="text-sm font-semibold text-navy-700">Inbox email</h2>
        <p className="mt-1 text-xs text-navy-400">
          Where invoices sent directly by members will arrive (and where you'll see them surface in the{' '}
          <Link to="/inbox" className="text-brand-600 hover:underline">Inbox</Link>). Leave blank to disable direct delivery.
        </p>
        <label className="mt-4 block text-xs font-medium text-navy-600">
          Email
          <input
            type="email"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
            placeholder={currentOrg.admin_email}
            className="mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>
        {billingEmail.trim() && billingEmail.trim() !== (currentOrg.billing_email ?? '') && (
          <p className="mt-2 text-[11px] text-navy-400">
            Tip: use a shared inbox like <code className="rounded bg-navy-50 px-1">invoices@yourdomain.com</code> so multiple admins see it.
          </p>
        )}
        <button
          onClick={() => void saveBillingEmail()}
          disabled={savingBillingEmail || billingEmail.trim() === (currentOrg.billing_email ?? '')}
          className="mt-4 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
        >
          {savingBillingEmail ? 'Saving…' : 'Save inbox email'}
        </button>
      </section>

      {/* Reporting period */}
      <section className="ozly-card mb-4 p-5">
        <h2 className="text-sm font-semibold text-navy-700">Reporting period</h2>
        <p className="mt-1 text-xs text-navy-400">
          How you view and total invoices — the Invoices screen offers “This{' '}
          {periodFreq === 'monthly' ? 'month' : periodFreq === 'weekly' ? 'week' : 'fortnight'} / Last …”.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-navy-600">
            Frequency
            <select
              value={periodFreq}
              onChange={(e) => setPeriodFreq(e.target.value as typeof periodFreq)}
              className="mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none"
            >
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          {periodFreq !== 'monthly' && (
            <label className="block text-xs font-medium text-navy-600">
              When the cycle starts <span className="text-navy-300">(pick a day on that weekday)</span>
              <input
                type="date"
                value={periodAnchor ?? ''}
                onChange={(e) => setPeriodAnchor(e.target.value)}
                className="mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none"
              />
            </label>
          )}
        </div>
        <button
          onClick={() => void savePeriod()}
          disabled={savingPeriod}
          className="mt-4 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
        >
          {savingPeriod ? 'Saving…' : 'Save period'}
        </button>
      </section>

      {/* Default rate */}
      <section className="ozly-card mb-4 p-5">
        <h2 className="text-sm font-semibold text-navy-700">Default hourly rate</h2>
        <p className="mt-1 text-xs text-navy-400">
          Pre-fills the rate when you offer work. You can override it per member (Members → Rate) or
          per shift. Leave blank for no default.
        </p>
        <label className="mt-4 block text-xs font-medium text-navy-600">
          Rate (AUD/hour)
          <div className="mt-1 flex items-center gap-2">
            <span className="text-navy-400">$</span>
            <input
              type="number"
              min="0"
              step="0.50"
              value={defaultRate}
              onChange={(e) => setDefaultRate(e.target.value)}
              placeholder="45.00"
              className="w-40 rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </label>
        <button
          onClick={() => void saveDefaultRate()}
          disabled={savingRate}
          className="mt-4 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
        >
          {savingRate ? 'Saving…' : 'Save default rate'}
        </button>
      </section>

      {/* Plan */}
      <section className="ozly-card mb-4 p-5">
        <h2 className="text-sm font-semibold text-navy-700">Plan</h2>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-navy-700">{planLabel}</div>
            <div className="mt-0.5 text-xs text-navy-400">
              {memberCount ?? '—'} active {memberCount === 1 ? 'member' : 'members'}
              {limit !== null ? ` of ${limit}` : ''}
            </div>
            {currentOrg.trial_ends_at && (
              <div className="mt-0.5 text-xs text-navy-400">
                Trial ends {formatDate(currentOrg.trial_ends_at)}
              </div>
            )}
          </div>
          <button
            disabled
            title="Coming soon — contact us"
            className="cursor-not-allowed rounded-md bg-navy-100 px-4 py-2 text-sm font-medium text-navy-400"
          >
            Upgrade
          </button>
        </div>
        <p className="mt-3 rounded-md bg-navy-50 px-3 py-2 text-[11px] leading-relaxed text-navy-500">
          $9.99 per member / month — each sub-contractor you add includes their ABN on the invoices
          they send you.
        </p>
      </section>

      {/* How org-subsidy works — admin awareness */}
      <section className="ozly-card mb-4 border border-amber-100 bg-amber-50/40 p-5">
        <h2 className="text-sm font-semibold text-amber-800">How the ABN cover affects the sub-contractor</h2>
        <p className="mt-2 text-xs leading-relaxed text-amber-900/80">
          When you cover a member's ABN, their invoices are <strong>locked to your organisation</strong> — they
          can only bill you while you're paying. If they want to bill other clients, they pay for their own
          ABN access on top (one-tap upgrade in the Ozly app). This protects your seat fee from cross-subsidising
          unrelated work and keeps the commercial relationship clean.
        </p>
      </section>

      {/* Members shortcut */}
      <section className="ozly-card mb-4 p-5">
        <h2 className="text-sm font-semibold text-navy-700">Members</h2>
        <p className="mt-1 text-xs text-navy-400">Invite and manage your sub-contractors.</p>
        <Link
          to="/members"
          className="mt-3 inline-block rounded-md bg-navy-50 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-navy-100"
        >
          Manage members
        </Link>
      </section>

      {orgId && <CalendarFeedsSection orgId={orgId} />}

      {user?.id && <NotificationPreferences userKey={user.id} />}

      <DangerZone />
      </div>
    </>
  );
}

function DangerZone() {
  const { signOut } = useAuth();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function onConfirm() {
    if (typed !== 'DELETE') return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-user');
      if (error) throw error;
      notify('Your account has been deleted.', 'success');
      await signOut();
      // Hard reload so any in-memory state is purged.
      window.location.replace('/login');
    } catch (err) {
      notify(friendlyError(err, 'Could not delete the account. Please try again.'), 'error');
      setDeleting(false);
    }
  }

  return (
    <section className="ozly-card border border-rose-200 p-5">
      <h2 className="text-sm font-semibold text-rose-700">Danger zone</h2>
      <p className="mt-1 text-xs text-navy-500">
        Delete your Ozly account. This removes your sign-in, your contractor records, and your
        membership in any organisations. If you're the only owner of an organisation, transfer
        ownership first (or your team loses access).
      </p>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-4 rounded-md bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
        >
          Delete my account
        </button>
      ) : (
        <div className="mt-4 rounded-md bg-rose-50 p-4">
          <p className="text-sm font-medium text-rose-700">
            Are you sure? This cannot be undone.
          </p>
          <p className="mt-2 text-xs text-rose-600">
            Type <span className="font-mono font-bold">DELETE</span> below to confirm.
          </p>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="mt-2 w-full rounded-md border border-rose-200 bg-white px-3 py-2 text-sm text-navy-700 focus:border-rose-500 focus:outline-none"
            disabled={deleting}
            autoFocus
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => void onConfirm()}
              disabled={typed !== 'DELETE' || deleting}
              className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:bg-rose-300"
            >
              {deleting ? 'Deleting…' : 'Permanently delete'}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setTyped('');
              }}
              disabled={deleting}
              className="rounded-md px-4 py-2 text-sm font-medium text-navy-500 hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
