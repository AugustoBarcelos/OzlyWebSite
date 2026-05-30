import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { PageHeader } from '@/components/PageHeader';
import { Spinner } from '@/components/Spinner';
import { EmptyState } from '@/components/EmptyState';
import { formatDate, formatMoney } from '@/lib/format';
import { toCsv, downloadCsv, timestampSuffix } from '@/lib/csv';

interface ActivityRow {
  id: string;
  event_name: string;
  user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor?: { full_name: string | null; email: string | null } | null;
}

// Human-friendly rendering of the events the org RPCs emit.
// Edits over time as we add new event types — the default fallback below
// keeps things readable even for events not in the map.
const EVENT_PRESENTATION: Record<string, { icon: string; line: (r: ActivityRow) => string; tone: 'info' | 'positive' | 'warning' }> = {
  org_signup: {
    icon: '🚀',
    line: () => 'Organisation created',
    tone: 'positive',
  },
  org_invite_sent: {
    icon: '✉️',
    line: (r) => {
      const role = (r.metadata?.role as string) ?? 'member';
      return `Invitation sent to a ${role}`;
    },
    tone: 'info',
  },
  org_invite_accepted: {
    icon: '✅',
    line: (r) => `${actorName(r)} accepted the invitation`,
    tone: 'positive',
  },
  org_invite_declined: {
    icon: '🚪',
    line: (r) => `${actorName(r)} declined the invitation`,
    tone: 'warning',
  },
  org_invoice_marked_paid: {
    icon: '💰',
    line: (r) => {
      const num = (r.metadata?.invoice_number as string) ?? 'an invoice';
      const total = r.metadata?.total ? formatMoney(Number(r.metadata.total)) : '';
      return `${num} marked as paid${total ? ` · ${total}` : ''}`;
    },
    tone: 'positive',
  },
  org_invoice_unmarked_paid: {
    icon: '↩️',
    line: (r) => `${(r.metadata?.invoice_number as string) ?? 'An invoice'} marked unpaid (undo)`,
    tone: 'warning',
  },
  org_invoice_requested: {
    icon: '📨',
    line: (r) => `Asked ${actorName(r) || 'a member'} to send an invoice`,
    tone: 'info',
  },
  org_member_subsidy_changed: {
    icon: '🛡️',
    line: (r) => {
      const on = r.metadata?.on === true;
      return `ABN cover ${on ? 'enabled' : 'removed'} for ${actorName(r) || 'a member'}`;
    },
    tone: 'info',
  },
  org_billing_plan_changed: {
    icon: '💳',
    line: (r) => {
      const from = (r.metadata?.from as string) ?? '?';
      const to = (r.metadata?.to as string) ?? '?';
      return `Plan changed: ${from} → ${to}`;
    },
    tone: 'info',
  },
  org_member_billing_cycle_changed: {
    icon: '🔁',
    line: (r) => {
      const freq = (r.metadata?.frequency as string) ?? '?';
      return `Billing cycle set to ${freq} for ${actorName(r) || 'a member'}`;
    },
    tone: 'info',
  },
};

function actorName(r: ActivityRow): string {
  return r.actor?.full_name?.trim() || r.actor?.email || '';
}

function exportActivity(rows: ActivityRow[]): void {
  const csv = toCsv(
    ['Timestamp (UTC)', 'Event', 'Actor', 'Actor email', 'Metadata'],
    rows.map((r) => [
      r.created_at,
      r.event_name,
      r.actor?.full_name ?? '',
      r.actor?.email ?? '',
      r.metadata ? JSON.stringify(r.metadata) : '',
    ]),
  );
  downloadCsv(`ozly-activity-${timestampSuffix()}.csv`, csv);
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return formatDate(iso);
}

export function ActivityPage() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id ?? null;
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    // Read org_events for this org. RLS restricts to org admins, but we also
    // pass org_id explicitly to take advantage of the index.
    const { data } = await supabase
      .from('org_events')
      .select('id, event_name, user_id, metadata, created_at, actor:profiles!org_events_user_id_fkey(full_name, email)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(200);
    setRows((data ?? []) as unknown as ActivityRow[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { void load(); }, [load]);

  if (!currentOrg) return null;

  return (
    <div>
      <PageHeader
        title="Activity"
        subtitle="What happened in your organisation"
        action={rows.length > 0 ? (
          <button
            onClick={() => exportActivity(rows)}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-navy-700 ring-1 ring-navy-100 hover:bg-navy-50"
          >
            Export CSV
          </button>
        ) : undefined}
      />
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : rows.length === 0 ? (
        <EmptyState title="No activity yet" description="Once you invite members and mark invoices paid, the timeline appears here." />
      ) : (
        <div className="ozly-card divide-y divide-navy-50">
          {rows.map((r) => {
            const cfg = EVENT_PRESENTATION[r.event_name];
            const line = cfg ? cfg.line(r) : `${r.event_name.replace(/_/g, ' ')}${actorName(r) ? ` · ${actorName(r)}` : ''}`;
            const icon = cfg?.icon ?? '·';
            const tone = cfg?.tone ?? 'info';
            const toneCls =
              tone === 'positive' ? 'bg-brand-50 text-brand-700'
              : tone === 'warning' ? 'bg-amber-50 text-amber-700'
              : 'bg-navy-50 text-navy-500';
            return (
              <div key={r.id} className="flex items-start gap-3 px-5 py-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${toneCls}`}>
                  {icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-navy-700">{line}</div>
                  <div className="mt-0.5 text-[11px] text-navy-400">{formatRelative(r.created_at)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
