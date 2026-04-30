import { useEffect, useMemo, useState } from 'react';
import { Grid, Text } from '@tremor/react';
import { Spinner } from '@/components/Spinner';
import { ExternalLinkIcon } from '@/components/Icons';
import { Collapsible } from '@/components/Collapsible';
import { callEdge } from '@/lib/edge';
import { formatNumber, formatRelativeTime } from '@/lib/format';

/**
 * Resend dashboard. Two surfaces in one card:
 *
 *   1. Broadcasts (campaigns) — bulk sends to an audience. Each has its own
 *      sent / delivered / opened / clicked / bounced counters, so the section
 *      is a list of campaigns with stats inline.
 *
 *   2. Transactional emails — 1:1 sends (welcome, password reset, etc).
 *      Backend returns the last 100. We compute a tag breakdown from each
 *      email's `tags[]` and offer a filter dropdown so the admin can drill
 *      "show me only `category=welcome`" without leaving the page.
 *
 *   Backend:  admin-resend-stats?op=summary
 *   Returns:  { domains, emails, broadcasts }
 */

interface ResendApiWrap<T> {
  ok: boolean;
  status: number;
  body: T | null;
}

interface ResendDomain {
  id: string;
  name: string;
  status?: string;
}

interface ResendTag {
  name: string;
  value: string;
}

interface ResendEmail {
  id: string;
  to: string[];
  from: string;
  subject: string;
  created_at: string;
  last_event?: string;
  tags?: ResendTag[];
}

interface ResendBroadcast {
  id: string;
  name?: string;
  audience_id?: string;
  status?: string;          // 'draft' | 'queued' | 'sent' | etc
  sent_at?: string | null;
  scheduled_at?: string | null;
  // The summary endpoint /v1/broadcasts may or may not include stats per row
  // depending on Resend API version. We render whatever's there.
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  bounced?: number;
  complained?: number;
  subject?: string;
}

interface SummaryPayload {
  domains: ResendApiWrap<{ data?: ResendDomain[] }>;
  emails: ResendApiWrap<{ data?: ResendEmail[] }>;
  broadcasts?: ResendApiWrap<{ data?: ResendBroadcast[] }>;
}

const STATUS_COLOR: Record<string, string> = {
  delivered: 'bg-brand-100 text-brand-700',
  sent: 'bg-sky-100 text-sky-700',
  opened: 'bg-emerald-100 text-emerald-700',
  clicked: 'bg-emerald-200 text-emerald-800',
  bounced: 'bg-red-100 text-red-700',
  complained: 'bg-red-100 text-red-700',
  delivery_delayed: 'bg-amber-100 text-amber-800',
};

/** Renders the email's primary tag (the first one) as a small chip. */
function tagLabel(e: ResendEmail): string {
  const t = e.tags?.[0];
  if (!t) return 'untagged';
  return t.value || t.name;
}

/** Collapsed by default — only fires the edge fn when opened. */
export function ResendCard() {
  return (
    <Collapsible
      icon="📧"
      title="Resend (Email)"
      subtitle="Broadcasts (campanhas) + transactional (welcome, invoice, reset)"
    >
      <ResendCardContent />
    </Collapsible>
  );
}

function ResendCardContent() {
  const [data, setData] = useState<SummaryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tagFilter, setTagFilter] = useState<string>('all');

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await callEdge<SummaryPayload>('admin-resend-stats', {
        query: { op: 'summary' },
      });
      if (!alive) return;
      if (!r.ok) {
        setError(r.error);
      } else {
        setData(r.data);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ── Derive ───────────────────────────────────────────────────────────────
  const domainsErr =
    data?.domains && !data.domains.ok
      ? `${data.domains.status}: ${
          (data.domains.body as { message?: string } | null)?.message ?? 'Resend API error'
        }`
      : null;
  const emailsErr =
    data?.emails && !data.emails.ok
      ? `${data.emails.status}: ${
          (data.emails.body as { message?: string } | null)?.message ?? 'Resend API error'
        }`
      : null;
  const broadcastsErr =
    data?.broadcasts && !data.broadcasts.ok
      ? `${data.broadcasts.status}: ${
          (data.broadcasts.body as { message?: string } | null)?.message ?? 'Resend API error'
        }`
      : null;

  const domains = data?.domains?.ok ? data.domains.body?.data ?? [] : [];
  const emails = data?.emails?.ok ? data.emails.body?.data ?? [] : [];
  const broadcasts = data?.broadcasts?.ok ? data.broadcasts.body?.data ?? [] : [];

  // Tag breakdown — counts per tag across all emails.
  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of emails) {
      const t = tagLabel(e);
      m.set(t, (m.get(t) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [emails]);

  const filteredEmails = useMemo(() => {
    if (tagFilter === 'all') return emails;
    return emails.filter((e) => tagLabel(e) === tagFilter);
  }, [emails, tagFilter]);

  // Status breakdown across the visible (filtered) emails.
  const breakdown = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const e of filteredEmails) {
      const k = e.last_event ?? 'sent';
      acc[k] = (acc[k] ?? 0) + 1;
    }
    return acc;
  }, [filteredEmails]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-navy-400">
        <Spinner size="sm" />
        Loading Resend stats…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header bar — verified domains + open in resend */}
      <div className="flex items-start justify-between gap-3">
        <Text className="text-xs text-navy-300">
          {domains.filter((d) => d.status === 'verified').map((d) => d.name).join(', ')
            || 'No verified domains yet'}
        </Text>
        <a
          href="https://resend.com/emails"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-navy-100 bg-white px-2.5 py-1 text-xs text-navy-600 hover:border-brand-300 hover:text-brand-700"
        >
          Open Resend
          <ExternalLinkIcon className="h-3 w-3" />
        </a>
      </div>

      {/* Errors */}
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          <strong>Edge function failed:</strong> {error}
        </div>
      )}
      {(domainsErr || emailsErr || broadcastsErr) && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <strong>Resend API error:</strong> {domainsErr || emailsErr || broadcastsErr}
        </div>
      )}

      {/* KPIs over the (currently filtered) set */}
      <Grid numItemsSm={4} className="gap-3">
        <KpiBox
          label={tagFilter === 'all' ? 'Emails (last 100)' : `Emails · ${tagFilter}`}
          value={filteredEmails.length}
          tone="navy"
        />
        <KpiBox
          label="Delivered"
          value={(breakdown.delivered ?? 0) + (breakdown.opened ?? 0) + (breakdown.clicked ?? 0)}
          tone="brand"
        />
        <KpiBox
          label="Bounced"
          value={breakdown.bounced ?? 0}
          tone="rose"
        />
        <KpiBox
          label="Domains verified"
          value={domains.filter((d) => d.status === 'verified').length}
          tone="navy"
        />
      </Grid>

      {/* ── Broadcasts (campanhas) ─────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between">
          <Text className="text-xs font-semibold uppercase tracking-wide text-navy-400">
            Broadcasts (campanhas)
          </Text>
          <Text className="text-[11px] text-navy-300">
            {broadcasts.length} total
          </Text>
        </div>
        {broadcasts.length === 0 ? (
          <div className="mt-2 rounded-md border border-dashed border-navy-100 bg-navy-50/30 p-4 text-xs text-navy-400">
            <p className="font-medium text-navy-600">Nenhuma campanha enviada ainda.</p>
            <p className="mt-1">
              Use Broadcasts pra newsletter / anúncio em massa. Cada campanha terá
              suas próprias stats (sent / delivered / opened / clicked / bounced).
              Crie uma em{' '}
              <a
                href="https://resend.com/broadcasts"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-700 underline"
              >
                resend.com/broadcasts
              </a>
              .
            </p>
          </div>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {broadcasts.slice(0, 8).map((b) => (
              <li
                key={b.id}
                className="flex items-center gap-3 rounded-md border border-navy-50 bg-white px-3 py-2"
              >
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    STATUS_COLOR[b.status ?? 'sent'] ?? 'bg-navy-50 text-navy-600'
                  }`}
                >
                  {b.status ?? 'sent'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-navy-700">
                    {b.name ?? b.subject ?? '(unnamed)'}
                  </div>
                  <div className="text-[11px] text-navy-300">
                    sent {b.sent_at ? formatRelativeTime(b.sent_at) : '—'}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-[11px] text-navy-500">
                  {typeof b.sent === 'number' && (
                    <span title="Sent">{formatNumber(b.sent)} sent</span>
                  )}
                  {typeof b.opened === 'number' && (
                    <span className="text-emerald-600" title="Opened">
                      {formatNumber(b.opened)} opens
                    </span>
                  )}
                  {typeof b.clicked === 'number' && (
                    <span className="text-emerald-700" title="Clicked">
                      {formatNumber(b.clicked)} clicks
                    </span>
                  )}
                  {typeof b.bounced === 'number' && b.bounced > 0 && (
                    <span className="text-rose-600" title="Bounced">
                      {formatNumber(b.bounced)} bounced
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Transactional + tag filter ─────────────────────────────────── */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Text className="text-xs font-semibold uppercase tracking-wide text-navy-400">
            Transactional emails
          </Text>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-navy-300">Filter:</span>
            <FilterChip
              label={`All · ${emails.length}`}
              active={tagFilter === 'all'}
              onClick={() => setTagFilter('all')}
            />
            {tagCounts.map(([t, c]) => (
              <FilterChip
                key={t}
                label={`${t} · ${c}`}
                active={tagFilter === t}
                onClick={() => setTagFilter(t)}
              />
            ))}
          </div>
        </div>

        {filteredEmails.length === 0 ? (
          <div className="mt-2 flex h-24 items-center justify-center rounded-md border border-dashed border-navy-100 bg-navy-50/30 text-sm text-navy-300">
            {emails.length === 0 ? 'No transactional emails yet' : 'No emails for this tag'}
          </div>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {filteredEmails.slice(0, 12).map((e) => {
              const tone = STATUS_COLOR[e.last_event ?? 'sent'] ?? 'bg-navy-50 text-navy-600';
              const tag = tagLabel(e);
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-2 rounded-md border border-navy-50 bg-white px-3 py-2 text-xs"
                >
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone}`}
                  >
                    {e.last_event ?? 'sent'}
                  </span>
                  {tag !== 'untagged' && (
                    <span className="rounded bg-navy-50 px-1.5 py-0.5 font-mono text-[10px] text-navy-600">
                      {tag}
                    </span>
                  )}
                  <span className="truncate font-medium text-navy-700">{e.subject}</span>
                  <span className="ml-auto truncate text-[10px] text-navy-300">
                    to {e.to[0] ?? ''}
                  </span>
                  <span className="text-[10px] text-navy-300">
                    {formatRelativeTime(e.created_at)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {tagCounts.length === 0 && emails.length > 0 && (
          <div className="mt-3 rounded-md border border-amber-100 bg-amber-50/50 p-2.5 text-[11px] text-amber-800">
            💡 <strong>Dica:</strong> none of your emails have <code>tags</code> set yet.
            Pass <code>{`tags: [{ name: 'category', value: 'welcome' }]`}</code> in
            your Resend send call (Flutter side) — depois, esse filtro vai ficar
            cheio e tu segmenta por categoria de email.
          </div>
        )}
      </section>
    </div>
  );
}

function KpiBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'navy' | 'brand' | 'rose';
}) {
  const colorClass =
    tone === 'brand'
      ? 'text-brand-700'
      : tone === 'rose'
        ? 'text-rose-600'
        : 'text-navy-700';
  return (
    <div className="rounded-md border border-navy-50 bg-navy-50/40 p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-navy-400">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${colorClass}`}>
        {formatNumber(value)}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full border px-2.5 py-0.5 text-[11px] transition-colors',
        active
          ? 'border-brand-500 bg-brand-50 text-brand-700'
          : 'border-navy-100 bg-white text-navy-500 hover:bg-navy-50',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
