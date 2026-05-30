import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import { formatDate } from '@/lib/format';
import { SEAT_LIMIT } from '@/lib/types';
import { friendlyError } from '@/lib/errors';

export function SettingsPage() {
  const { currentOrg, refresh } = useOrg();
  const { notify } = useToast();
  const orgId = currentOrg?.id ?? null;

  const [name, setName] = useState(currentOrg?.name ?? '');
  const [abn, setAbn] = useState(currentOrg?.abn ?? '');
  const [saving, setSaving] = useState(false);
  const [memberCount, setMemberCount] = useState<number | null>(null);

  const [periodFreq, setPeriodFreq] = useState(currentOrg?.period_frequency ?? 'fortnightly');
  const [periodAnchor, setPeriodAnchor] = useState(currentOrg?.period_anchor ?? '');
  const [savingPeriod, setSavingPeriod] = useState(false);

  useEffect(() => {
    setName(currentOrg?.name ?? '');
    setAbn(currentOrg?.abn ?? '');
    setPeriodFreq(currentOrg?.period_frequency ?? 'fortnightly');
    setPeriodAnchor(currentOrg?.period_anchor ?? '');
  }, [currentOrg?.id, currentOrg?.name, currentOrg?.abn, currentOrg?.period_frequency, currentOrg?.period_anchor]);

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

  const loadCount = useCallback(async () => {
    if (!orgId) return;
    const { count } = await supabase
      .from('org_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'accepted');
    setMemberCount(count ?? 0);
  }, [orgId]);

  useEffect(() => {
    void loadCount();
  }, [loadCount]);

  async function saveOrg() {
    if (!orgId) return;
    setSaving(true);
    const { error } = await supabase
      .from('organizations')
      .update({ name: name.trim(), abn: abn.trim() || null })
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
      <PageHeader title="Settings" subtitle="Organisation, plan and members" />

      <div className="max-w-2xl">
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
