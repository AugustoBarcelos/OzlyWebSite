// Action Inbox — the Linear-style triage queue at /inbox. ONE place listing
// everything that needs the admin's action, each item with its verb inline:
//
//   1. Review edited invoices  (divergence_status = pending)
//   2. Chase missing invoices  (org_invoice_stragglers — last 30 days)
//   3. Overdue invoices        (status = overdue, worst first)
//   4. Delivery problems       (org_inbox_list bounced/failed)
//   5. Stalled invites         (pending org_invitations w/ failed delivery
//                               or expiring within 7 days)
//
// Every section renders ONLY when it has items — an empty queue collapses to
// the inbox-zero state. All data is real; nothing here is mocked. The old
// email-delivery tracking page moved to /inbox/deliveries.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import { Spinner } from '@/components/Spinner';
import { Avatar } from '@/components/Avatar';
import { formatMoney, formatDate } from '@/lib/format';
import { friendlyError } from '@/lib/errors';
import { notifyInboxCountChanged } from '@/lib/use-inbox-count';

const STRAGGLER_PERIOD_DAYS = 30;

// ── Row shapes ───────────────────────────────────────────────────────────────

interface DivergentInvoice {
  id: string;
  invoice_number: string;
  total: number;
  last_edited_at: string | null;
  issuer: { full_name: string | null; email: string } | null;
}

interface OverdueInvoice {
  id: string;
  invoice_number: string;
  total: number;
  due_date: string | null;
  issuer: { full_name: string | null; email: string } | null;
}

interface StragglerRow {
  member_user_id: string;
  member_name: string;
  member_email: string;
  completed_job_count: number;
  uninvoiced_count: number;
  last_reminder_at?: string | null;
}

interface DeliveryProblem {
  id: string;
  invoice_number: string;
  sender_name: string | null;
  sender_email: string;
  status: string;
  total_rows: number;
}

interface StalledInvite {
  id: string;
  email_or_phone: string;
  expires_at: string | null;
  delivery_status: string | null;
}

interface InboxData {
  divergent: DivergentInvoice[];
  overdue: OverdueInvoice[];
  overdueTotal: number;
  stragglers: StragglerRow[];
  deliveries: DeliveryProblem[];
  deliveriesTotal: number;
  invites: StalledInvite[];
}

function relativeAgo(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function daysOverdue(due: string | null): number {
  if (!due) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(`${due}T00:00:00`).getTime()) / 86_400_000));
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function ActionInboxPage() {
  const { currentOrg } = useOrg();
  const { notify } = useToast();
  const orgId = currentOrg?.id ?? null;
  const orgName = currentOrg?.name ?? 'Your organisation';

  const [data, setData] = useState<InboxData | null>(null);
  const [reminding, setReminding] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    const from = new Date(Date.now() - STRAGGLER_PERIOD_DAYS * 86_400_000).toISOString();
    const to = new Date().toISOString();

    // Independent sources fetched together. Each one degrades to empty on
    // error (e.g. RPC migration missing) so one failure never blanks the page.
    const [divergentRes, overdueRes, stragglersRes, bouncedRes, failedRes, invitesRes] =
      await Promise.all([
        supabase
          .from('invoices')
          .select('id, invoice_number, total, last_edited_at, issuer:profiles!invoices_user_id_fkey(full_name,email)')
          .eq('org_visible_id', orgId)
          .eq('divergence_status', 'pending')
          .order('last_edited_at', { ascending: false })
          .limit(10),
        supabase
          .from('invoices')
          .select('id, invoice_number, total, due_date, issuer:profiles!invoices_user_id_fkey(full_name,email)', { count: 'exact' })
          .eq('org_visible_id', orgId)
          .eq('status', 'overdue')
          .order('due_date', { ascending: true })
          .limit(5),
        supabase.rpc('org_invoice_stragglers', {
          p_org_id: orgId,
          p_period_from: from,
          p_period_to: to,
        }),
        supabase.rpc('org_inbox_list', {
          p_org_id: orgId, p_status: 'bounced', p_date_from: null, p_date_to: null,
          p_search: null, p_limit: 3, p_offset: 0,
        }),
        supabase.rpc('org_inbox_list', {
          p_org_id: orgId, p_status: 'failed', p_date_from: null, p_date_to: null,
          p_search: null, p_limit: 3, p_offset: 0,
        }),
        supabase
          .from('org_invitations')
          .select('id, email_or_phone, expires_at, delivery_status')
          .eq('org_id', orgId)
          .is('accepted_at', null)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`),
      ]);

    const divergent = (divergentRes.error ? [] : (divergentRes.data ?? [])) as unknown as DivergentInvoice[];
    const overdue = (overdueRes.error ? [] : (overdueRes.data ?? [])) as unknown as OverdueInvoice[];
    const overdueTotal = overdueRes.error ? 0 : (overdueRes.count ?? overdue.length);
    const stragglers = ((stragglersRes.error ? [] : (stragglersRes.data ?? [])) as StragglerRow[])
      .filter((r) => r.uninvoiced_count > 0);

    const bounced = (bouncedRes.error ? [] : (bouncedRes.data ?? [])) as DeliveryProblem[];
    const failed = (failedRes.error ? [] : (failedRes.data ?? [])) as DeliveryProblem[];
    const deliveries = [...bounced.map((r) => ({ ...r, status: 'bounced' })), ...failed.map((r) => ({ ...r, status: 'failed' }))];
    const deliveriesTotal =
      (bounced[0] ? Number(bounced[0].total_rows ?? 0) : 0) +
      (failed[0] ? Number(failed[0].total_rows ?? 0) : 0);

    // An invite needs attention when its email failed outright, or it's been
    // sitting unanswered and expires within 7 days.
    const soonMs = Date.now() + 7 * 86_400_000;
    const invites = ((invitesRes.error ? [] : (invitesRes.data ?? [])) as StalledInvite[]).filter(
      (i) =>
        i.delivery_status === 'failed' ||
        (i.expires_at !== null && new Date(i.expires_at).getTime() < soonMs),
    );

    setData({ divergent, overdue, overdueTotal, stragglers, deliveries, deliveriesTotal, invites });
  }, [orgId]);

  useEffect(() => { void load(); }, [load]);

  // Reminder actions — same org_invoice_requests insert the dashboard uses;
  // the table trigger fans out email + push to the member.
  async function sendReminder(r: StragglerRow) {
    if (!orgId) return;
    setReminding(r.member_user_id);
    const dueBy = new Date();
    dueBy.setDate(dueBy.getDate() + 3);
    const { error } = await supabase.from('org_invoice_requests').insert({
      org_id: orgId,
      member_user_id: r.member_user_id,
      message: `${orgName} — please send invoice for ${r.uninvoiced_count} completed job${r.uninvoiced_count === 1 ? '' : 's'}`,
      due_by: dueBy.toISOString().slice(0, 10),
      status: 'open',
    });
    setReminding(null);
    if (error) { notify(friendlyError(error, 'Could not send reminder.'), 'error'); return; }
    notify(`Reminder sent to ${r.member_name}.`, 'success');
    const nowIso = new Date().toISOString();
    setData((prev) => prev && ({
      ...prev,
      stragglers: prev.stragglers.map((row) =>
        row.member_user_id === r.member_user_id ? { ...row, last_reminder_at: nowIso } : row),
    }));
  }

  async function remindAll(targets: StragglerRow[]) {
    if (!orgId || targets.length === 0) return;
    setBulkSending(true);
    const dueBy = new Date();
    dueBy.setDate(dueBy.getDate() + 3);
    const due = dueBy.toISOString().slice(0, 10);
    const { error } = await supabase.from('org_invoice_requests').insert(
      targets.map((r) => ({
        org_id: orgId,
        member_user_id: r.member_user_id,
        message: `${orgName} — please send invoice for ${r.uninvoiced_count} completed job${r.uninvoiced_count === 1 ? '' : 's'}`,
        due_by: due,
        status: 'open',
      })),
    );
    setBulkSending(false);
    if (error) { notify(friendlyError(error, 'Could not send reminders.'), 'error'); return; }
    notify(`${targets.length} reminder${targets.length === 1 ? '' : 's'} sent.`, 'success');
    const nowIso = new Date().toISOString();
    const ids = new Set(targets.map((t) => t.member_user_id));
    setData((prev) => prev && ({
      ...prev,
      stragglers: prev.stragglers.map((row) =>
        ids.has(row.member_user_id) ? { ...row, last_reminder_at: nowIso } : row),
    }));
  }

  const totalItems = useMemo(() => {
    if (!data) return 0;
    return (
      data.divergent.length +
      data.stragglers.length +
      data.overdueTotal +
      data.deliveriesTotal +
      data.invites.length
    );
  }, [data]);

  // Keep the sidebar badge honest after the admin acts on items here.
  useEffect(() => {
    if (data) notifyInboxCountChanged();
  }, [data]);

  if (!currentOrg) return null;

  return (
    <div>
      <PageHeader
        kicker="Inbox"
        title="Needs your action"
        subtitle="Everything waiting on you, in one queue — it empties as you act"
        action={
          <Link
            to="/inbox/deliveries"
            className="rounded-md bg-navy-50 px-3 py-1.5 text-xs font-medium text-navy-700 hover:bg-navy-100"
          >
            Email deliveries →
          </Link>
        }
      />

      {data === null ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : totalItems === 0 ? (
        <InboxZero />
      ) : (
        <div className="space-y-4">
          {data.divergent.length > 0 && (
            <InboxSection
              tone="rose"
              title="Review edited invoices"
              count={data.divergent.length}
              sub="A member changed these after you could already see them — accept or reject the change."
            >
              <ul className="space-y-1">
                {data.divergent.map((inv) => (
                  <li key={inv.id}>
                    <Link
                      to={`/invoices?invoice=${inv.id}`}
                      className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-navy-50/60"
                    >
                      <Avatar name={inv.issuer?.full_name ?? inv.issuer?.email ?? '?'} email={inv.issuer?.email ?? null} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold text-navy-800">
                          {inv.invoice_number} · {inv.issuer?.full_name ?? inv.issuer?.email}
                        </div>
                        <div className="text-[11px] text-navy-400">
                          Edited {relativeAgo(inv.last_edited_at) ?? 'recently'} · {formatMoney(inv.total)}
                        </div>
                      </div>
                      <span className="shrink-0 text-[11.5px] font-semibold text-brand-700">Review →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </InboxSection>
          )}

          {data.stragglers.length > 0 && (
            <InboxSection
              tone="amber"
              title="Chase missing invoices"
              count={data.stragglers.length}
              sub={`Finished jobs, no invoice yet · last ${STRAGGLER_PERIOD_DAYS} days. A reminder nudges them by push + email.`}
              action={
                data.stragglers.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => void remindAll(data.stragglers)}
                    disabled={bulkSending}
                    className="rounded-md bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
                  >
                    {bulkSending ? 'Sending…' : `Remind all ${data.stragglers.length}`}
                  </button>
                ) : undefined
              }
            >
              <ul className="space-y-1">
                {data.stragglers.map((r) => {
                  const ago = relativeAgo(r.last_reminder_at);
                  const recentlyReminded = r.last_reminder_at
                    ? Date.now() - new Date(r.last_reminder_at).getTime() < 4 * 3_600_000
                    : false;
                  return (
                    <li key={r.member_user_id} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2">
                      <Avatar name={r.member_name} email={r.member_email} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-[13px] font-semibold text-navy-800">
                          <span className="truncate">{r.member_name}</span>
                          {ago && (
                            <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                              Reminded {ago}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-navy-400">
                          <strong className="text-amber-700">{r.uninvoiced_count} uninvoiced</strong>
                          {' · '}{r.completed_job_count} job{r.completed_job_count === 1 ? '' : 's'} done
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void sendReminder(r)}
                        disabled={reminding === r.member_user_id}
                        className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50 ${
                          recentlyReminded
                            ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-200 hover:bg-amber-200'
                            : 'bg-amber-600 text-white hover:bg-amber-500'
                        }`}
                      >
                        {reminding === r.member_user_id ? 'Sending…' : recentlyReminded ? 'Remind again' : 'Send reminder'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </InboxSection>
          )}

          {data.overdueTotal > 0 && (
            <InboxSection
              tone="rose"
              title="Overdue invoices"
              count={data.overdueTotal}
              sub="Past their due date and still unpaid — oldest first."
              action={
                <Link
                  to="/invoices?status=overdue"
                  className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50"
                >
                  View all →
                </Link>
              }
            >
              <ul className="space-y-1">
                {data.overdue.map((inv) => (
                  <li key={inv.id}>
                    <Link
                      to={`/invoices?invoice=${inv.id}`}
                      className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-navy-50/60"
                    >
                      <Avatar name={inv.issuer?.full_name ?? inv.issuer?.email ?? '?'} email={inv.issuer?.email ?? null} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold text-navy-800">
                          {inv.invoice_number} · {inv.issuer?.full_name ?? inv.issuer?.email}
                        </div>
                        <div className="text-[11px] text-navy-400">
                          Due {inv.due_date ? formatDate(inv.due_date) : '—'}
                          {daysOverdue(inv.due_date) > 0 && (
                            <strong className="text-rose-600"> · {daysOverdue(inv.due_date)}d overdue</strong>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-[13px] font-semibold text-rose-600">{formatMoney(inv.total)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </InboxSection>
          )}

          {data.deliveriesTotal > 0 && (
            <InboxSection
              tone="amber"
              title="Delivery problems"
              count={data.deliveriesTotal}
              sub="Invoices members emailed to your inbox address that didn't arrive."
              action={
                <Link
                  to="/inbox/deliveries"
                  className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50"
                >
                  All deliveries →
                </Link>
              }
            >
              <ul className="space-y-1">
                {data.deliveries.map((d) => (
                  <li key={d.id} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-navy-800">
                        {d.invoice_number} · {d.sender_name || d.sender_email}
                      </div>
                      <div className="text-[11px] text-navy-400">
                        {d.status === 'bounced' ? 'Bounced — check your inbox email in Settings' : 'Failed to send'}
                      </div>
                    </div>
                    <Link
                      to="/settings#billing-email"
                      className="shrink-0 text-[11.5px] font-semibold text-brand-700 hover:text-brand-600"
                    >
                      Fix email →
                    </Link>
                  </li>
                ))}
              </ul>
            </InboxSection>
          )}

          {data.invites.length > 0 && (
            <InboxSection
              tone="navy"
              title="Stalled invites"
              count={data.invites.length}
              sub="Invites that failed to deliver or expire within 7 days."
              action={
                <Link
                  to="/members"
                  className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50"
                >
                  Manage team →
                </Link>
              }
            >
              <ul className="space-y-1">
                {data.invites.map((i) => (
                  <li key={i.id} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-navy-800">{i.email_or_phone}</div>
                      <div className="text-[11px] text-navy-400">
                        {i.delivery_status === 'failed'
                          ? 'Email failed — share the invite link manually'
                          : i.expires_at
                            ? `Expires ${formatDate(i.expires_at)}`
                            : 'Pending'}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </InboxSection>
          )}
        </div>
      )}
    </div>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

const SECTION_TONES = {
  rose:  { badge: 'bg-rose-100 text-rose-700' },
  amber: { badge: 'bg-amber-100 text-amber-700' },
  navy:  { badge: 'bg-navy-50 text-navy-500' },
} as const;

function InboxSection({
  tone,
  title,
  count,
  sub,
  action,
  children,
}: {
  tone: keyof typeof SECTION_TONES;
  title: string;
  count: number;
  sub: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="ozly-card p-5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold text-navy-800">
            {title}
            <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${SECTION_TONES[tone].badge}`}>
              {count}
            </span>
          </h2>
          <p className="mt-0.5 text-[11.5px] text-navy-400">{sub}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function InboxZero() {
  return (
    <section className="ozly-card flex flex-col items-center px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-xl font-bold text-brand-600" aria-hidden="true">
        ✓
      </span>
      <h2 className="mt-4 font-display text-lg font-bold text-navy-800">Inbox zero</h2>
      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-navy-400">
        Nothing needs your action right now. New items land here the moment a
        member edits an invoice, goes overdue, or forgets to bill you.
      </p>
      <Link
        to="/dashboard"
        className="mt-5 rounded-md bg-navy-50 px-4 py-2 text-xs font-semibold text-navy-700 hover:bg-navy-100"
      >
        Back to dashboard
      </Link>
    </section>
  );
}
