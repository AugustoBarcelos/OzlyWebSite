import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/Spinner';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { EmptyState } from '@/components/EmptyState';
import { UsersIcon } from '@/components/Icons';
import { MemberStatusBadge } from '@/components/StatusBadge';
import { Avatar } from '@/components/Avatar';
import { formatDate } from '@/lib/format';
import { toCsv, downloadCsv, timestampSuffix } from '@/lib/csv';
import { logOrgEvent } from '@/lib/telemetry';
import { fetchPayState } from '@/lib/payments';
import { fetchMixedBillingByMember, type BillingSource } from '@/lib/orgMembers';
import { MixedBillingBadge } from '@/components/MixedBillingBadge';
import { useSeqGuard } from '@/lib/use-seq-guard';
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
  rateOverride?: number | null;
  /** End of this participant's 14-day trial (accepted members only). */
  trialEndsAt?: string | null;
  // Only set on pending-invite cards: surface a warning badge when Resend
  // failed (or we never tried, e.g. SMS channel) so the admin doesn't
  // assume an unsent invite was actually delivered.
  deliveryStatus?: 'pending' | 'sent' | 'failed' | 'skipped' | null;
  // Pending-invite cards only: the single-use token, so the admin can copy
  // the share link or re-send the email without re-creating the invite.
  inviteToken?: string;
}

/** Per-participant trial state derived from trial_ends_at + whether they're
 *  already covered. `covered` participants don't show a trial badge — they're
 *  paid, the trial is moot. */
type TrialState =
  | { kind: 'none' }
  | { kind: 'active'; daysLeft: number }
  | { kind: 'expired' };

function trialStateFor(trialEndsAt: string | null | undefined, covered: boolean): TrialState {
  if (covered || !trialEndsAt) return { kind: 'none' };
  const ends = new Date(trialEndsAt).getTime();
  const now = Date.now();
  if (ends <= now) return { kind: 'expired' };
  // Math.ceil: with 0–24h left we still want to say "1 day", not "0".
  const daysLeft = Math.max(1, Math.ceil((ends - now) / (24 * 60 * 60 * 1000)));
  return { kind: 'active', daysLeft };
}

export function MembersPage() {
  const { currentOrg } = useOrg();
  const { notify } = useToast();
  const orgId = currentOrg?.id ?? null;
  const plan = currentOrg?.billing_plan ?? 'free';

  const [members, setMembers] = useState<OrgMembership[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [pending, setPending] = useState<{ id: string; email_or_phone: string; invited_name: string | null; token: string; role: MembershipRole; created_at: string; delivery_status: 'pending' | 'sent' | 'failed' | 'skipped' | null }[]>([]);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailMember, setDetailMember] = useState<MemberCard | null>(null);
  const [payStatus, setPayStatus] = useState<Record<string, PayState>>({});
  const [mixedBilling, setMixedBilling] = useState<Record<string, BillingSource>>({});
  const seq = useSeqGuard();

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const token = seq.start();
    const [{ data: mem }, { data: inv }] = await Promise.all([
      supabase
        .from('org_memberships')
        .select('id, org_id, user_id, role, status, invited_at, accepted_at, trial_ends_at, billing_frequency, billing_anchor, auto_invoice_request, admin_tags, admin_notes, rate_override')
        .eq('org_id', orgId)
        // Live memberships only — drop declined/removed so the count + cards
        // match the rest of the system (dashboard active_subs, admin portal).
        .in('status', ['accepted', 'pending']),
      supabase
        .from('org_invitations')
        .select('id, email_or_phone, invited_name, token, role, created_at, expires_at, delivery_status')
        .eq('org_id', orgId)
        .is('accepted_at', null)
        // Hide expired invites so "pending" mirrors what the invitee can act on.
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`),
    ]);

    if (!seq.isCurrent(token)) return;
    const memberships = (mem ?? []) as OrgMembership[];
    setMembers(memberships);
    setPending((inv ?? []) as typeof pending);

    // org_memberships → auth.users has no FK to profiles, so fetch names separately.
    const ids = memberships.map((m) => m.user_id);
    let profileMap: Record<string, ProfileLite> = {};
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ids);
      for (const p of (profs ?? []) as ProfileLite[]) profileMap[p.id] = p;
    }
    if (!seq.isCurrent(token)) return;
    setProfiles(profileMap);

    // Who's actually paying for each member (company subsidy OR self-pay)?
    const payState = await fetchPayState(orgId);
    if (!seq.isCurrent(token)) return;
    setPayStatus(payState);
    // V2: granular mixed-billing breakdown (org-only / +ABN topup / +PRO topup / self / none).
    const mixed = await fetchMixedBillingByMember(orgId);
    if (!seq.isCurrent(token)) return;
    setMixedBilling(mixed);

    setLoading(false);
  }, [orgId, seq]);

  useEffect(() => {
    void load();
  }, [load]);

  // Re-send the invite email for an existing pending invitation (the token is
  // reused — no new invite row). Mirrors the tri-state delivery toast from the
  // InviteModal so the admin is never told "sent" when it actually skipped/failed.
  const resendInvite = useCallback(async (inviteId: string) => {
    setResendingId(inviteId);
    const { data, error } = await supabase.functions.invoke('send-org-invite', {
      body: { invitation_id: inviteId },
    });
    setResendingId(null);
    const delivery = (data as { delivery?: string } | null)?.delivery;
    if (error) {
      notify("Couldn't resend the email. Copy the link and share it manually.", 'error');
    } else if (delivery === 'skipped') {
      notify("We don't send SMS yet — copy the link and share it directly.", 'info');
    } else if (delivery === 'sent') {
      notify('Invitation resent — email on its way.', 'success');
    } else {
      notify('Invitation re-sent.', 'info');
    }
    void load();
  }, [notify, load]);

  const copyInviteLink = useCallback((token: string) => {
    void navigator.clipboard.writeText(`${env.inviteBaseUrl}/invite/${token}`);
    notify('Invite link copied', 'success');
  }, [notify]);

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
        rateOverride: m.rate_override ?? null,
        trialEndsAt: m.trial_ends_at ?? null,
      };
    });
    const pendingCards: MemberCard[] = pending.map((i) => ({
      key: i.id,
      name: i.invited_name?.trim() || i.email_or_phone,
      role: i.role,
      status: 'pending',
      date: i.created_at,
      deliveryStatus: i.delivery_status,
      inviteToken: i.token,
    }));
    return [...pendingCards, ...memberCards];
  }, [members, profiles, pending]);

  const acceptedCount = members.filter((m) => m.status === 'accepted').length;
  const seatLimit = SEAT_LIMIT[plan];
  const atSeatLimit = seatLimit !== null && acceptedCount >= seatLimit;
  // "Approaching cap" = within 1 seat of the limit (so 4/5 on free plan).
  // Triggers a gentle yellow warning that doesn't block invites; the hard
  // cap (atSeatLimit) is still the gate. Plans with seatLimit === null
  // (unlimited tiers) never trip either.
  const approachingSeatLimit =
    seatLimit !== null && acceptedCount === seatLimit - 1 && !atSeatLimit;

  return (
    <div>
      <PageHeader
        kicker="Team"
        title="Team"
        subtitle={`Sub-contractors engaged by ${currentOrg?.name ?? ''}`}
        action={
          <button
            onClick={() => setModalOpen(true)}
            disabled={atSeatLimit}
            title={atSeatLimit ? `Upgrade your plan to invite past ${seatLimit} members` : undefined}
            className="btn-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Invite member
          </button>
        }
      />

      {(approachingSeatLimit || atSeatLimit) && (
        <div
          role="alert"
          className={`mb-4 flex flex-wrap items-start gap-3 rounded-lg border p-3 text-[12.5px] ${
            atSeatLimit
              ? 'border-rose-200 bg-rose-50 text-rose-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          <span aria-hidden className="text-base leading-none">{atSeatLimit ? '🛑' : '⚠️'}</span>
          <div className="flex-1 space-y-1">
            <div className="font-semibold">
              {atSeatLimit
                ? `Seat cap reached (${acceptedCount} of ${seatLimit})`
                : `Approaching seat cap (${acceptedCount} of ${seatLimit})`}
            </div>
            <div>
              {atSeatLimit
                ? "You've reached your plan's member limit. Upgrade your plan to invite more."
                : 'You have one seat left on your current plan. Upgrade now to keep onboarding without interruption.'}
              {' '}
              <Link to="/billing" className="font-semibold underline">
                {atSeatLimit ? 'Upgrade plan →' : 'See plans →'}
              </Link>
            </div>
          </div>
        </div>
      )}

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
        <>
        {/* Numbers first — the team's shape at a glance before the roster. */}
        <h2 className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy-300">
          Overview
        </h2>
        <div className="mb-5 grid grid-cols-3 gap-3">
          <KpiCard tone="brand" label="Active members" value={String(acceptedCount)} />
          <KpiCard tone="lime"  label="Pending invites" value={String(cards.length - acceptedCount)} />
          <KpiCard
            tone="navy"
            label="Seats"
            value={seatLimit === null ? `${acceptedCount} · ∞` : `${acceptedCount} of ${seatLimit}`}
            to="/billing"
          />
        </div>

        {/* Roster folds behind a summary header (collapsed-first pattern). */}
        <CollapsibleSection
          id="members-roster"
          title="Roster"
          badge={cards.length}
          subtitle="Click an active member to see pay status and remove options"
          defaultOpen={true}
        >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => {
            const accepted = c.status === 'accepted' && !!c.userId;
            const pay: PayState = accepted ? payStatus[c.userId!] ?? 'none' : 'none';
            const trial = accepted ? trialStateFor(c.trialEndsAt, pay !== 'none') : { kind: 'none' as const };
            // Dim only when the org is neither covering them nor in trial — i.e.
            // their invoices are actually being blocked.
            const dim = accepted && pay === 'none' && trial.kind === 'expired';
            return (
              <div
                key={c.key}
                onClick={accepted ? () => setDetailMember(c) : undefined}
                className={`ozly-card p-4 ${accepted ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}`}
              >
                <div className={`flex items-start justify-between gap-2 ${dim ? 'opacity-60' : ''}`}>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={c.name} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-navy-800">{c.name}</div>
                      <div className="mt-0.5 text-xs capitalize text-navy-400">{c.role}</div>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1">
                    <MemberStatusBadge status={c.status} />
                    {trial.kind === 'active' && (
                      <span
                        title={`Free trial for this participant — ends in ${trial.daysLeft} day${trial.daysLeft === 1 ? '' : 's'}. After that you'll need to pay for them to keep receiving their invoices.`}
                        className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700"
                      >
                        Trial · {trial.daysLeft}d left
                      </span>
                    )}
                    {trial.kind === 'expired' && (
                      <span
                        title="This participant's trial ended and you're not covering them — their invoices are paused. Pay for them to resume."
                        className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700"
                      >
                        <span aria-hidden>⚠</span> trial ended
                      </span>
                    )}
                    {c.status === 'pending' && c.deliveryStatus === 'failed' && (
                      <span
                        title="Email delivery failed. Copy the invite link and share manually."
                        className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700"
                      >
                        <span aria-hidden>⚠</span> email failed
                      </span>
                    )}
                    {c.status === 'pending' && c.deliveryStatus === 'skipped' && (
                      <span
                        title="No SMS provider wired yet. Copy the invite link and share manually."
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800"
                      >
                        share link
                      </span>
                    )}
                  </div>
                </div>
                {accepted ? (
                  <>
                    {/* ABN/insurance compliance intentionally omitted here: there
                        is no real verification source wired to the portal yet.
                        (Was rendering fabricated mockComplianceFor data.) */}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${PAY_LABEL[pay].cls}`}
                        >
                          {PAY_LABEL[pay].text}
                        </span>
                        {c.userId && mixedBilling[c.userId] && mixedBilling[c.userId] !== 'none' && (
                          <MixedBillingBadge source={mixedBilling[c.userId]!} />
                        )}
                      </div>
                      <span className={`text-[11px] font-medium ${trial.kind === 'expired' ? 'text-rose-600' : 'text-navy-300'}`}>
                        {trial.kind === 'expired' ? 'Pay to resume →' : 'Manage →'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-navy-400">Invited {formatDate(c.date)}</span>
                    <div className="flex items-center gap-1.5">
                      {c.deliveryStatus !== 'skipped' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); void resendInvite(c.key); }}
                          disabled={resendingId === c.key}
                          className="rounded-md px-2 py-1 text-[11px] font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50 disabled:opacity-50"
                        >
                          {resendingId === c.key ? 'Resending…' : 'Resend'}
                        </button>
                      )}
                      {c.inviteToken && (
                        <button
                          onClick={(e) => { e.stopPropagation(); copyInviteLink(c.inviteToken!); }}
                          className="rounded-md px-2 py-1 text-[11px] font-medium text-navy-600 ring-1 ring-navy-100 hover:bg-navy-50"
                        >
                          Copy link
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </CollapsibleSection>
        </>
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
  const [rateOverride, setRateOverride] = useState(
    member.rateOverride != null ? String(member.rateOverride) : '',
  );
  const [savingRate, setSavingRate] = useState(false);

  async function saveRate() {
    const value = rateOverride.trim() === '' ? null : Number(rateOverride);
    if (value != null && (Number.isNaN(value) || value < 0)) {
      return notify('Enter a valid rate or leave blank to use the org default.', 'error');
    }
    setSavingRate(true);
    const { error } = await supabase
      .from('org_memberships')
      .update({ rate_override: value })
      .eq('org_id', orgId)
      .eq('user_id', userId);
    setSavingRate(false);
    if (error) return notify(friendlyError(error), 'error');
    notify(value != null ? 'Member rate saved' : 'Member rate cleared (uses org default)', 'success');
    onChanged();
  }

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

  // Per-member statement — every invoice this member sent the org, as CSV
  // with a totals row. The "extract one profile" path: works directly off
  // the invoices table, no RPC dependency.
  const [exportingStatement, setExportingStatement] = useState(false);
  async function exportStatement() {
    setExportingStatement(true);
    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number, issue_date, due_date, status, subtotal, tax_amount, total, paid_at')
      .eq('org_visible_id', orgId)
      .eq('user_id', userId)
      .order('issue_date', { ascending: true })
      .limit(5000);
    setExportingStatement(false);
    if (error) return notify(friendlyError(error), 'error');
    const rows = (data ?? []) as Array<{
      invoice_number: string | null; issue_date: string; due_date: string | null;
      status: string; subtotal: number | null; tax_amount: number | null;
      total: number | null; paid_at: string | null;
    }>;
    if (rows.length === 0) return notify('No invoices from this member yet.', 'info');
    const sum = rows.reduce(
      (acc, r) => {
        acc.subtotal += Number(r.subtotal) || 0;
        acc.gst += Number(r.tax_amount) || 0;
        acc.total += Number(r.total) || 0;
        return acc;
      },
      { subtotal: 0, gst: 0, total: 0 },
    );
    const csv = toCsv(
      ['Invoice #', 'Issue date', 'Due date', 'Status', 'Subtotal', 'GST', 'Total', 'Paid at'],
      [
        ...rows.map((r) => [
          r.invoice_number ?? '', r.issue_date, r.due_date ?? '', r.status,
          (Number(r.subtotal) || 0).toFixed(2), (Number(r.tax_amount) || 0).toFixed(2),
          (Number(r.total) || 0).toFixed(2), r.paid_at ?? '',
        ]),
        ['TOTAL', '', '', `${rows.length} invoices`, sum.subtotal.toFixed(2), sum.gst.toFixed(2), sum.total.toFixed(2), ''],
      ],
    );
    const slug = member.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'member';
    downloadCsv(`ozly-statement-${slug}-${timestampSuffix()}.csv`, csv);
    notify(`Statement exported — ${rows.length} invoice${rows.length === 1 ? '' : 's'}.`, 'success');
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

        {/* Statement export — "extract this profile" in one click. */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-navy-50/60 px-3 py-2">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-navy-700">Statement — every invoice to you</div>
            <div className="text-[11px] text-navy-400">CSV with a totals row · ready for Excel or your accountant</div>
          </div>
          <button
            onClick={() => void exportStatement()}
            disabled={exportingStatement}
            className="shrink-0 rounded-md bg-white px-3 py-1.5 text-[11.5px] font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50 disabled:opacity-50"
          >
            {exportingStatement ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>

        {/* Rate override */}
        <div className="mt-5">
          <div className={sectionLabel}>Hourly rate</div>
          <p className="mt-1 text-[11px] text-navy-400">
            Used when you offer work to {member.name}. Leave blank to use the org default rate.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-navy-400">$</span>
            <input
              type="number"
              min="0"
              step="0.50"
              value={rateOverride}
              onChange={(e) => setRateOverride(e.target.value)}
              placeholder="org default"
              className="w-32 rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <button
              onClick={() => void saveRate()}
              disabled={savingRate}
              className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
            >
              {savingRate ? 'Saving…' : 'Save rate'}
            </button>
          </div>
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

// Plain-words description of what each role can do, shown under the role
// picker. 'owner' is never invitable but the Record stays total for safety.
const ROLE_HELP: Record<MembershipRole, string> = {
  owner: 'Full control of the organisation.',
  admin: 'Can do everything you can.',
  member: 'Does the work and sends you invoices.',
  accountant: "Can see and download everything, but can't change anything.",
};

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
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [role, setRole] = useState<MembershipRole>('member');
  const [submitting, setSubmitting] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!value.trim() || !name.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('org_invitations')
        .insert({ org_id: orgId, email_or_phone: value.trim(), invited_name: name.trim() || null, role })
        .select('id, token')
        .single();
      // Throw original error so friendlyError can map RLS / 23505 / etc.
      if (error || !data) throw error ?? new Error('Could not create invitation');

      setShareLink(`${env.inviteBaseUrl}/invite/${data.token}`);

      // Fire-and-handle: email delivery via edge function. Link works regardless.
      // Tri-state outcome: sent | skipped (no provider for the channel) | failed
      // (Resend down or rate-limited). The shareable link works in all three,
      // but the toast must not lie — "sent" toast on a skipped/failed delivery
      // makes the admin think the recipient got the email when they didn't.
      const { data: fnData, error: fnErr } = await supabase.functions.invoke('send-org-invite', {
        body: { invitation_id: data.id },
      });
      const delivery = (fnData as { delivery?: string } | null)?.delivery;
      if (fnErr) {
        notify(
          "Invitation created, but the email couldn't be delivered. Copy the link and share it manually.",
          'error',
        );
      } else if (delivery === 'skipped') {
        notify(
          "Invitation created. We don't send SMS yet — copy the link and share it directly.",
          'info',
        );
      } else if (delivery === 'sent') {
        notify('Invitation sent — email on its way.', 'success');
      } else {
        // Edge function returned 200 but no delivery field — treat as sent
        // for back-compat, but log so we notice if the contract drifts.
        try {
          const { captureException } = await import('@/lib/sentry');
          captureException(new Error('send-org-invite missing delivery field'), {
            source: 'members.invite.delivery_missing',
          });
        } catch { /* sentry not configured */ }
        notify('Invitation created. Share the link if the email is slow.', 'info');
      }
    } catch (err) {
      notify(friendlyError(err, 'Could not send invitation.'), 'error');
    } finally {
      // Always reset; previous version only reset on error which left the
      // button locked when the user opened the modal from another flow.
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
            <label className="mb-3 block text-xs font-medium text-navy-600">
              Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Smith"
                autoFocus
                maxLength={80}
                className="mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </label>

            <div className="inline-flex rounded-md bg-navy-50 p-0.5 text-xs font-medium">
              {/* "phone" channel never sends an SMS — the flow only produces a
                  copyable link, so the label says what actually happens. */}
              {(['email', 'phone'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChannel(c)}
                  className={`rounded px-3 py-1 ${
                    channel === c ? 'bg-white text-brand-700 shadow-sm' : 'text-navy-400'
                  }`}
                >
                  {c === 'email' ? 'Email' : 'Share link'}
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
              <p className="mt-1 text-[11px] text-navy-400">{ROLE_HELP[role]}</p>
            </label>

            {channel === 'phone' && (
              <p className="mt-2 text-[11px] text-navy-400">
                Copy the invite link and send it any way you like.
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !name.trim() || !value.trim()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:bg-brand-300 disabled:cursor-not-allowed"
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
