import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import { Spinner } from '@/components/Spinner';
import { formatDate, formatMoney } from '@/lib/format';
import { toCsv, downloadCsv, timestampSuffix } from '@/lib/csv';
import { friendlyError } from '@/lib/errors';
import { useSeqGuard } from '@/lib/use-seq-guard';

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

// Demo timeline shown when the org has zero real events yet. Lets the user
// see what Activity WILL look like as they use the product, instead of an
// "empty" screen that reads as "broken". Tagged so we can render the demo
// banner above it. Times are anchored relative to render so they always
// look fresh.
function buildDemoActivity(): ActivityRow[] {
  const now = Date.now();
  const mins = (n: number) => new Date(now - n * 60_000).toISOString();
  return [
    {
      id: 'demo-1', event_name: 'org_invoice_marked_paid', user_id: null,
      metadata: { invoice_number: 'INV-3046', total: 3589 },
      created_at: mins(8),
      actor: { full_name: 'Lucas Ribeiro', email: 'lucas.ribeiro@example.com' },
    },
    {
      id: 'demo-2', event_name: 'org_invite_accepted', user_id: null,
      metadata: null, created_at: mins(95),
      actor: { full_name: 'Sofia Santos', email: 'sofia.santos@example.com' },
    },
    {
      id: 'demo-3', event_name: 'org_invoice_marked_paid', user_id: null,
      metadata: { invoice_number: 'INV-3043', total: 2190 },
      created_at: mins(180),
      actor: { full_name: 'Maria Pereira', email: 'maria.pereira@example.com' },
    },
    {
      id: 'demo-4', event_name: 'org_invoice_requested', user_id: null,
      metadata: null, created_at: mins(720),
      actor: { full_name: 'João Trades', email: 'joao.trades@example.com' },
    },
    {
      id: 'demo-5', event_name: 'org_member_subsidy_changed', user_id: null,
      metadata: { on: true }, created_at: mins(1_440),
      actor: { full_name: 'Akira Tanaka', email: 'akira.tanaka@example.com' },
    },
    {
      id: 'demo-6', event_name: 'org_invite_sent', user_id: null,
      metadata: { role: 'member' }, created_at: mins(2_880),
      actor: null,
    },
    {
      id: 'demo-7', event_name: 'org_billing_plan_changed', user_id: null,
      metadata: { from: 'starter', to: 'growth' },
      created_at: mins(5_760), actor: null,
    },
    {
      id: 'demo-8', event_name: 'org_signup', user_id: null,
      metadata: null, created_at: mins(11_520), actor: null,
    },
  ];
}

export function ActivityPage() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id ?? null;
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const seq = useSeqGuard();
  const { notify } = useToast();

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const token = seq.start();
    // Read org_events for this org. RLS restricts to org admins, but we also
    // pass org_id explicitly to take advantage of the index.
    const { data, error } = await supabase
      .from('org_events')
      .select('id, event_name, user_id, metadata, created_at, actor:profiles!org_events_user_id_fkey(full_name, email)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (!seq.isCurrent(token)) return;
    if (error) {
      notify(friendlyError(error), 'error');
      const { captureException } = await import('@/lib/sentry');
      captureException(error, { source: 'activity.load' });
      setRows([]);
    } else {
      setRows((data ?? []) as unknown as ActivityRow[]);
    }
    setLoading(false);
  }, [orgId, seq, notify]);

  useEffect(() => { void load(); }, [load]);

  if (!currentOrg) return null;

  return (
    <div>
      <PageHeader
        kicker="Insights"
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
      ) : (
        <>
          {rows.length === 0 && (
            <div
              className="mb-4 flex items-start gap-3 rounded-xl border border-navy-100 bg-navy-50/50 px-4 py-3 text-[12.5px] text-navy-500"
              role="note"
            >
              <span aria-hidden="true" className="text-base leading-none">👋</span>
              <div>
                <span className="font-semibold text-navy-700">Preview timeline.</span>{' '}
                Your org has no events yet. The entries below are examples — real activity will
                replace them automatically as you invite members, mark invoices paid, and offer work.
              </div>
            </div>
          )}
          <div className="ozly-card divide-y divide-navy-50">
            {(rows.length === 0 ? buildDemoActivity() : rows).map((r) => {
              const cfg = EVENT_PRESENTATION[r.event_name];
              const line = cfg ? cfg.line(r) : `${r.event_name.replace(/_/g, ' ')}${actorName(r) ? ` · ${actorName(r)}` : ''}`;
              const icon = cfg?.icon ?? '·';
              const tone = cfg?.tone ?? 'info';
              const toneCls =
                tone === 'positive' ? 'bg-brand-50 text-brand-700'
                : tone === 'warning' ? 'bg-amber-50 text-amber-700'
                : 'bg-navy-50 text-navy-500';
              const isDemo = rows.length === 0;
              return (
                <div key={r.id} className={`flex items-start gap-3 px-5 py-3 ${isDemo ? 'opacity-85' : ''}`}>
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
        </>
      )}
    </div>
  );
}
