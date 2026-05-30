import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/Spinner';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { UsersIcon } from '@/components/Icons';
import { MemberStatusBadge } from '@/components/StatusBadge';
import { formatDate } from '@/lib/format';
import { logOrgEvent } from '@/lib/telemetry';
import { fetchPayState } from '@/lib/payments';
import { cycleSummary } from '@/lib/period';
import type { BillingConfig, Frequency } from '@/lib/period';
import { env } from '@/lib/env';
import { SEAT_LIMIT, type MembershipRole, type MembershipStatus, type OrgMembership, type PayState } from '@/lib/types';
import { friendlyError } from '@/lib/errors';

interface ProfileLite { id: string; full_name: string; email: string }

const PAY_LABEL: Record<PayState, { text: string; cls: string }> = {
  company: { text: 'Paid by company', cls: 'bg-brand-50 text-brand-700' },
  self: { text: 'Self-paid', cls: 'bg-blue-50 text-blue-700' },
  none: { text: 'Needs ABN cover', cls: 'bg-amber-50 text-amber-700' },
};

interface MemberCard {
  key: string;
  name: string;
  role: MembershipRole;
  status: MembershipStatus;
  date: string | null;
  userId?: string;
  billing?: BillingConfig;
  autoInvoiceRequest?: boolean;
  adminTags?: string[];
  adminNotes?: string;
}

export function MembersPage() {
  const { currentOrg } = useOrg();
  const { notify } = useToast();
  const orgId = currentOrg?.id ?? null;
  const plan = currentOrg?.billing_plan ?? 'free';

  const [members, setMembers] = useState<OrgMembership[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [pending, setPending] = useState<{ id: string; email_or_phone: string; role: MembershipRole; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailMember, setDetailMember] = useState<MemberCard | null>(null);
  const [payStatus, setPayStatus] = useState<Record<string, PayState>>({});

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const [{ data: mem }, { data: inv }] = await Promise.all([
      supabase
        .from('org_memberships')
        .select('id, org_id, user_id, role, status, invited_at, accepted_at, billing_frequency, billing_anchor, auto_invoice_request, admin_tags, admin_notes')
        .eq('org_id', orgId),
      supabase
        .from('org_invitations')
        .select('id, email_or_phone, role, created_at')
        .eq('org_id', orgId)
        .is('accepted_at', null),
    ]);

    const memberships = (mem ?? []) as OrgMembership[];
    setMembers(memberships);
    setPending((inv ?? []) as typeof pending);

    // org_memberships → auth.users has no FK to profiles, so fetch names separately.
    const ids = memberships.map((m) => m.user_id);
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ids);
      const map: Record<string, ProfileLite> = {};
      for (const p of (profs ?? []) as ProfileLite[]) map[p.id] = p;
      setProfiles(map);
    }

    // Who's actually paying for each member (company subsidy OR self-pay)?
    setPayStatus(await fetchPayState(orgId));

    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = useMemo<MemberCard[]>(() => {
    const memberCards: MemberCard[] = members.map((m) => {
      const p = profiles[m.user_id];
      return {
        key: m.id,
        name: p?.full_name?.trim() || p?.email || 'Sub-contractor',
        role: m.role,
        status: m.status,
        date: m.accepted_at ?? m.invited_at,
        userId: m.user_id,
        billing: { frequency: m.billing_frequency, anchor: m.billing_anchor },
        autoInvoiceRequest: m.auto_invoice_request ?? false,
        adminTags: m.admin_tags ?? [],
        adminNotes: m.admin_notes ?? '',
      };
    });
    const pendingCards: MemberCard[] = pending.map((i) => ({
      key: i.id,
      name: i.email_or_phone,
      role: i.role,
      status: 'pending',
      date: i.created_at,
    }));
    return [...pendingCards, ...memberCards];
  }, [members, profiles, pending]);

  const acceptedCount = members.filter((m) => m.status === 'accepted').length;
  const seatLimit = SEAT_LIMIT[plan];
  const atSeatLimit = seatLimit !== null && acceptedCount >= seatLimit;

  return (
    <div>
      <PageHeader
        title="Members"
        subtitle={`Sub-contractors engaged by ${currentOrg?.name ?? ''}`}
        action={
          <button
            onClick={() => setModalOpen(true)}
            className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
          >
            Invite member
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : cards.length === 0 ? (
        <EmptyState
          icon={<UsersIcon />}
          title="No members yet"
          description="Invite your first sub-contractor — they accept in the Ozly app, then their invoices to you show up automatically."
          action={
            <button
              onClick={() => setModalOpen(true)}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
            >
              Invite a sub-contractor
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => {
            const accepted = c.status === 'accepted' && !!c.userId;
            const pay: PayState = accepted ? payStatus[c.userId!] ?? 'none' : 'none';
            const dim = accepted && pay === 'none';
            return (
              <div
                key={c.key}
                onClick={accepted ? () => setDetailMember(c) : undefined}
                className={`ozly-card p-4 ${accepted ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}`}
              >
                <div className={`flex items-start justify-between gap-2 ${dim ? 'opacity-60' : ''}`}>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-navy-700">{c.name}</div>
                    <div className="mt-0.5 text-xs capitalize text-navy-400">{c.role}</div>
                  </div>
                  <MemberStatusBadge status={c.status} />
                </div>
                {accepted ? (
                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${PAY_LABEL[pay].cls}`}
                    >
                      {PAY_LABEL[pay].text}
                    </span>
                    <span className="text-[11px] text-navy-300">Manage →</span>
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-navy-400">Invited {formatDate(c.date)}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && orgId && (
        <InviteModal
          orgId={orgId}
          planIsFree={plan === 'free'}
          atSeatLimit={atSeatLimit}
          seatLimit={seatLimit}
          onClose={() => setModalOpen(false)}
          onSent={() => {
            setModalOpen(false);
            void load();
          }}
          notify={notify}
        />
      )}

      {detailMember && detailMember.userId && orgId && (
        <MemberDetailModal
          orgId={orgId}
          member={detailMember}
          pay={payStatus[detailMember.userId] ?? 'none'}
          notify={notify}
          onClose={() => setDetailMember(null)}
          onChanged={() => {
            void load();
            setDetailMember(null);
          }}
        />
      )}
    </div>
  );
}

function MemberDetailModal(props: {
  orgId: string;
  member: MemberCard;
  pay: PayState;
  notify: (m: string, k?: 'success' | 'error' | 'info') => void;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { orgId, member, pay, notify, onClose, onChanged } = props;
  const userId = member.userId!;
  const cfg: BillingConfig = member.billing ?? { frequency: 'fortnightly', anchor: null };

  const [busy, setBusy] = useState(false);
  const [editingCycle, setEditingCycle] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>(cfg.frequency);
  const [anchor, setAnchor] = useState(cfg.anchor ?? '');
  const [requesting, setRequesting] = useState(false);
  const [dueBy, setDueBy] = useState('');
  const [message, setMessage] = useState('');
  const [autoRequest, setAutoRequest] = useState<boolean>(member.autoInvoiceRequest ?? false);
  const [tags, setTags] = useState<string[]>(member.adminTags ?? []);
  const [notes, setNotes] = useState<string>(member.adminNotes ?? '');
  const [tagDraft, setTagDraft] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);

  function addTag() {
    const t = tagDraft.trim().slice(0, 24);
    if (!t || tags.includes(t) || tags.length >= 8) { setTagDraft(''); return; }
    setTags([...tags, t]);
    setTagDraft('');
  }
  function removeTag(t: string) { setTags(tags.filter((x) => x !== t)); }

  async function saveMeta() {
    setSavingMeta(true);
    const { error } = await supabase.rpc('org_set_member_admin_meta', {
      p_org_id: orgId,
      p_member: userId,
      p_tags: tags,
      p_notes: notes.slice(0, 2000),
    });
    setSavingMeta(false);
    if (error) return notify(friendlyError(error), 'error');
    notify('Saved', 'success');
    onChanged();
  }

  async function toggleAutoRequest(on: boolean) {
    setBusy(true);
    const { error } = await supabase.rpc('org_set_auto_invoice_request', {
      p_org_id: orgId,
      p_member: userId,
      p_enabled: on,
    });
    setBusy(false);
    if (error) return notify(friendlyError(error), 'error');
    setAutoRequest(on);
    notify(
      on ? `Ozly will ask for an invoice every ${member.billing?.frequency ?? 'cycle'}.` : 'Recurring requests stopped.',
      'success',
    );
    onChanged();
  }

  const field =
    'mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';
  const sectionLabel = 'text-[11px] font-medium uppercase tracking-wide text-navy-400';

  async function togglePay(on: boolean) {
    setBusy(true);
    const { error } = await supabase.rpc('org_set_member_subsidy', { p_org_id: orgId, p_member: userId, p_on: on });
    setBusy(false);
    if (error) return notify(friendlyError(error), 'error');
    notify(on ? 'Marked as company-covered' : 'Stopped covering this member', 'success');
    onChanged();
  }

  async function saveCycle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase
      .from('org_memberships')
      .update({ billing_frequency: frequency, billing_anchor: frequency === 'monthly' ? null : anchor || null })
      .eq('org_id', orgId)
      .eq('user_id', userId);
    setBusy(false);
    if (error) return notify(friendlyError(error), 'error');
    notify('Billing cycle updated — the sub-contractor is notified', 'success');
    onChanged();
  }

  async function sendRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase
      .from('org_invoice_requests')
      .insert({ org_id: orgId, member_user_id: userId, due_by: dueBy || null, message: message.trim() || null });
    setBusy(false);
    if (error) return notify(friendlyError(error), 'error');
    void logOrgEvent(orgId, 'org_invoice_requested', { member: userId, due_by: dueBy || null });
    notify('Invoice requested', 'success');
    onChanged();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy-900/30 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-base font-semibold text-navy-700">{member.name}</div>
            <div className="mt-0.5 text-xs capitalize text-navy-400">
              {member.role} · invited {formatDate(member.date)}
            </div>
          </div>
          <button onClick={onClose} className="text-navy-300 hover:text-navy-500" aria-label="Close">
            ✕
          </button>
        </div>

        {/* ABN coverage */}
        <div className="mt-5">
          <div className={sectionLabel}>ABN coverage</div>
          <div className="mt-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PAY_LABEL[pay].cls}`}>
              {PAY_LABEL[pay].text}
            </span>
          </div>
          {pay === 'none' && (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-700">
              No one is covering {member.name}'s ABN. The invoices they send you may not include a valid
              ABN — they can self-pay in the app, or you can cover them.
            </p>
          )}
          {pay === 'self' && (
            <p className="mt-2 text-[11px] text-navy-400">{member.name} pays for their own ABN in the app.</p>
          )}
          <div className="mt-2">
            {pay === 'company' ? (
              <button
                onClick={() => void togglePay(false)}
                disabled={busy}
                className="rounded-md px-3 py-2 text-sm font-medium text-navy-500 ring-1 ring-navy-100 hover:bg-navy-50 disabled:opacity-50"
              >
                Stop covering
              </button>
            ) : (
              <>
                <button
                  onClick={() => void togglePay(true)}
                  disabled={busy}
                  className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
                >
                  {pay === 'self' ? 'Cover them too' : 'Pay for this member'}
                </button>
                <p className="mt-1 text-[11px] text-navy-300">
                  Marks them as company-covered. Card billing starts in a later release.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Billing cycle */}
        <div className="mt-5 border-t border-navy-50 pt-4">
          <div className="flex items-center justify-between">
            <div className={sectionLabel}>Billing cycle</div>
            {!editingCycle && (
              <button onClick={() => setEditingCycle(true)} className="text-xs font-medium text-brand-600 hover:underline">
                Edit
              </button>
            )}
          </div>
          {!editingCycle ? (
            <>
              <div className="mt-1 text-sm text-navy-700">{cycleSummary(cfg)}</div>
              <p className="mt-1 text-[11px] text-navy-300">
                How their work &amp; invoices are grouped. The sub-contractor sees this in the app.
              </p>
            </>
          ) : (
            <form onSubmit={saveCycle} className="mt-2">
              <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className={field}>
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
              </select>
              {frequency !== 'monthly' && (
                <input
                  type="date"
                  value={anchor}
                  onChange={(e) => setAnchor(e.target.value)}
                  className={field}
                  aria-label="Cycle day"
                />
              )}
              <p className="mt-2 text-[11px] text-navy-300">
                Pick any date on the cycle day (e.g. a Friday). The sub-contractor is notified of this cycle.
              </p>
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setEditingCycle(false)} className="rounded-md px-3 py-2 text-sm font-medium text-navy-500 hover:bg-navy-50">
                  Cancel
                </button>
                <button type="submit" disabled={busy} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:bg-brand-300">
                  Save
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Admin-only tags + notes */}
        <div className="mt-5 border-t border-navy-50 pt-4">
          <div className={sectionLabel}>Private notes & tags</div>
          <p className="mt-1 text-[11px] text-navy-400">Only org admins see this. Never surfaced to the sub-contractor.</p>
          <div className="mt-3 flex flex-wrap items-center gap-1">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-navy-100 px-2 py-0.5 text-[11px] font-medium text-navy-700">
                {t}
                <button onClick={() => removeTag(t)} className="text-navy-400 hover:text-rose-600" aria-label={`Remove ${t}`}>×</button>
              </span>
            ))}
            {tags.length < 8 && (
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                onBlur={addTag}
                placeholder="Add tag…"
                maxLength={24}
                className="min-w-0 rounded-full bg-navy-50 px-2 py-0.5 text-[11px] text-navy-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-200"
              />
            )}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Anything you want to remember about this member…"
            className={`mt-3 ${field}`}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-navy-300">{notes.length} / 2000</span>
            <button
              onClick={() => void saveMeta()}
              disabled={savingMeta || (
                JSON.stringify(tags) === JSON.stringify(member.adminTags ?? []) &&
                notes === (member.adminNotes ?? '')
              )}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
            >
              {savingMeta ? 'Saving…' : 'Save notes & tags'}
            </button>
          </div>
        </div>

        {/* Auto-schedule */}
        <div className="mt-5 border-t border-navy-50 pt-4">
          <div className={sectionLabel}>Recurring invoice request</div>
          <label className="mt-2 flex items-start gap-3 rounded-md bg-navy-50/40 p-3">
            <input
              type="checkbox"
              checked={autoRequest}
              onChange={(e) => void toggleAutoRequest(e.target.checked)}
              disabled={busy}
              className="mt-0.5 h-4 w-4 rounded border-navy-200 text-brand-600 focus:ring-brand-200"
            />
            <span className="flex-1 text-xs text-navy-600">
              <span className="font-medium text-navy-700">Auto-ask every {member.billing?.frequency ?? 'cycle'}</span>
              <br />
              Ozly schedules an invoice request {member.billing?.frequency === 'weekly' ? 'every week' : member.billing?.frequency === 'monthly' ? 'every month' : 'every fortnight'} so you don't have to remember.
            </span>
          </label>
        </div>

        {/* Request invoice */}
        <div className="mt-5 border-t border-navy-50 pt-4">
          <div className={sectionLabel}>Request an invoice now</div>
          {!requesting ? (
            <button
              onClick={() => setRequesting(true)}
              className="mt-2 rounded-md px-3 py-2 text-sm font-medium text-brand-600 ring-1 ring-brand-100 hover:bg-brand-50"
            >
              Request invoice
            </button>
          ) : (
            <form onSubmit={sendRequest} className="mt-2">
              <label className="block text-xs font-medium text-navy-600">
                Send invoice by
                <input type="date" value={dueBy} onChange={(e) => setDueBy(e.target.value)} className={field} />
              </label>
              <label className="mt-3 block text-xs font-medium text-navy-600">
                Message <span className="text-navy-300">(optional)</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  placeholder="Please send your invoice for last week's cleans to get paid this cycle."
                  className={field}
                />
              </label>
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setRequesting(false)} className="rounded-md px-3 py-2 text-sm font-medium text-navy-500 hover:bg-navy-50">
                  Cancel
                </button>
                <button type="submit" disabled={busy} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:bg-brand-300">
                  Send request
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function InviteModal(props: {
  orgId: string;
  planIsFree: boolean;
  atSeatLimit: boolean;
  seatLimit: number | null;
  onClose: () => void;
  onSent: () => void;
  notify: (m: string, k?: 'success' | 'error' | 'info') => void;
}) {
  const { orgId, planIsFree, atSeatLimit, seatLimit, onClose, onSent, notify } = props;
  const [channel, setChannel] = useState<'email' | 'phone'>('email');
  const [value, setValue] = useState('');
  const [role, setRole] = useState<MembershipRole>('member');
  const [submitting, setSubmitting] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!value.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('org_invitations')
        .insert({ org_id: orgId, email_or_phone: value.trim(), role })
        .select('id, token')
        .single();
      if (error || !data) throw new Error(error?.message ?? 'Could not create invitation');

      setShareLink(`${env.inviteBaseUrl}/invite/${data.token}`);

      // Fire-and-handle: email delivery via edge function. Link works regardless.
      const { error: fnErr } = await supabase.functions.invoke('send-org-invite', {
        body: { invitation_id: data.id },
      });
      if (fnErr) notify('Invitation created — email delivery failed, share the link.', 'info');
      else notify('Invitation sent', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Something went wrong', 'error');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-navy-900/30 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-navy-700">Invite a sub-contractor</h2>
          <button onClick={onClose} className="text-navy-300 hover:text-navy-500" aria-label="Close">
            ✕
          </button>
        </div>

        {(planIsFree || atSeatLimit) && (
          <p
            className={`mt-3 rounded-md px-3 py-2 text-xs leading-relaxed ${
              atSeatLimit ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {atSeatLimit
              ? `Seat limit reached (${seatLimit}). Upgrade your plan to invite more members.`
              : 'Each member you add is $9.99/month — it includes their ABN on the invoices they send you.'}
          </p>
        )}

        {shareLink ? (
          <div className="mt-4">
            <p className="text-sm text-navy-600">Share this link with your sub-contractor:</p>
            <div className="mt-2 flex gap-2">
              <input
                readOnly
                value={shareLink}
                className="w-full rounded-md border border-navy-100 bg-navy-50 px-3 py-2 text-xs text-navy-600"
              />
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(shareLink);
                  notify('Link copied', 'success');
                }}
                className="shrink-0 rounded-md bg-navy-100 px-3 py-2 text-xs font-medium text-navy-700 hover:bg-navy-200"
              >
                Copy
              </button>
            </div>
            <button
              onClick={onSent}
              className="mt-4 w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-4">
            <div className="inline-flex rounded-md bg-navy-50 p-0.5 text-xs font-medium">
              {(['email', 'phone'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChannel(c)}
                  className={`rounded px-3 py-1 capitalize ${
                    channel === c ? 'bg-white text-brand-700 shadow-sm' : 'text-navy-400'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <input
              type={channel === 'email' ? 'email' : 'tel'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={channel === 'email' ? 'subcontractor@email.com' : '+61 4xx xxx xxx'}
              className="mt-3 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />

            <label className="mt-3 block text-xs font-medium text-navy-600">
              Role
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as MembershipRole)}
                className="mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none"
              >
                <option value="member">Member (sub-contractor)</option>
                <option value="admin">Admin (full access)</option>
                <option value="accountant">Accountant (read-only, can export)</option>
              </select>
              <p className="mt-1 text-[11px] text-navy-400">
                Accountants see invoices/work/activity and run exports but can't mark paid, request invoices, or change settings.
              </p>
            </label>

            {channel === 'phone' && (
              <p className="mt-2 text-[11px] text-navy-400">
                SMS delivery isn't available yet — we'll create the invitation and give you a link to
                share.
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
            >
              {submitting && <Spinner size="sm" label="Sending" />}
              {submitting ? 'Sending…' : 'Send invitation'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
