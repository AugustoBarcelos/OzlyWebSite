// Dashboard — the new default landing route. Designed to answer "is my org
// OK today?" in under 5 seconds of glance.
//
// Layout (top → bottom):
//   1. Hero greet with time-of-day, contextual subtitle, quick-action chips
//   2. 4 KPI cards with sparklines (Outstanding · Overdue · Paid · Subs)
//   3. 2 charts side-by-side: Revenue 30d line + Invoice status mix donut
//   4. 2 lists side-by-side: Top subs this period + Coming up next 7 days
//
// All data is mocked from lib/dashboard-mock.ts until real KPI fetches land.
// A "Preview data" banner makes the mock explicit when org has zero real
// activity (mirrors the activity.tsx preview pattern).

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useOrg } from '@/lib/org';
import { useAuth } from '@/lib/auth';
import { KpiCard } from '@/components/KpiCard';
import { GettingStartedDashboard } from '@/components/GettingStartedDashboard';
import { LineChart } from '@/components/charts/LineChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { Avatar } from '@/components/Avatar';
import { formatMoney, formatDate } from '@/lib/format';
import {
  MOCK_KPIS, MOCK_KPI_DELTAS, MOCK_KPI_TRENDS,
  MOCK_STATUS_MIX, MOCK_TOP_SUBS,
  buildMockRevenueTrend, buildMockUpcomingJobs, scaleByDays,
  type DashboardKpi, type StatusMix,
} from '@/lib/dashboard-mock';

// Period filter — same set of options across the app's "Reporting period"
// pickers (invoices, work, reports). Keep them in sync if you add new ones.
type PeriodKey = '7d' | '14d' | '30d' | '90d' | 'fy_current' | 'fy_last' | 'custom';
interface PeriodOption {
  key: PeriodKey;
  label: string;
  /** Approximate number of days for mock scaling. null = computed. */
  days: number | null;
}
const PERIOD_OPTIONS: ReadonlyArray<PeriodOption> = [
  { key: '7d',         label: 'Last 7 days',           days:   7 },
  { key: '14d',        label: 'Last fortnight',        days:  14 },
  { key: '30d',        label: 'Last 30 days',          days:  30 },
  { key: '90d',        label: 'Last 90 days',          days:  90 },
  { key: 'fy_current', label: 'This fiscal year (AU)', days: null },
  { key: 'fy_last',    label: 'Last fiscal year (AU)', days: null },
  { key: 'custom',     label: 'Custom range…',         days: null },
];

function fyDays(prevFy: boolean): number {
  // AU fiscal year starts 1 Jul.
  const today = new Date();
  const fyStartYear = today.getUTCMonth() >= 6 ? today.getUTCFullYear() : today.getUTCFullYear() - 1;
  const y = prevFy ? fyStartYear - 1 : fyStartYear;
  const start = new Date(Date.UTC(y, 6, 1));
  const end = prevFy
    ? new Date(Date.UTC(y + 1, 6, 1))
    : today;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

function daysOf(period: PeriodKey, customFrom: string, customTo: string): number {
  if (period === '7d')  return 7;
  if (period === '14d') return 14;
  if (period === '30d') return 30;
  if (period === '90d') return 90;
  if (period === 'fy_current') return fyDays(false);
  if (period === 'fy_last')    return fyDays(true);
  // Custom
  if (customFrom && customTo) {
    const a = new Date(`${customFrom}T00:00:00`).getTime();
    const b = new Date(`${customTo}T00:00:00`).getTime();
    return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
  }
  return 30;
}

// Quick action chip — sits in the hero. Single primary action (Invite) +
// three secondaries deep-linking into the route that owns the verb.
function QuickAction({
  to,
  label,
  primary = false,
}: { to: string; label: string; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={
        primary
          ? 'btn-primary text-[12.5px]'
          : 'inline-flex items-center gap-1.5 rounded-lg bg-white/70 px-3.5 py-2 text-[12.5px] font-semibold text-navy-700 ring-1 ring-navy-100 backdrop-blur transition-colors hover:bg-white hover:text-brand-700'
      }
    >
      {label}
    </Link>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return 'Burning the midnight oil';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function timeUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return 'now';
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `in ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `in ${h}h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'tomorrow' : `in ${d}d`;
}

export function DashboardPage() {
  const { currentOrg } = useOrg();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [customRange, setCustomRange] = useState<{ from: string; to: string }>({ from: '', to: '' });

  const days = daysOf(period, customRange.from, customRange.to);
  const periodLabel = PERIOD_OPTIONS.find((p) => p.key === period)?.label ?? '';

  // Mocks scale with the selected window. Real fetches will replace these.
  const kpis: DashboardKpi = useMemo(() => {
    const scaled = scaleByDays(
      {
        outstanding: MOCK_KPIS.outstanding,
        overdue:     MOCK_KPIS.overdue,
        paidPeriod:  MOCK_KPIS.paidPeriod,
      },
      days,
    );
    return {
      outstanding: scaled.outstanding,
      overdue:     scaled.overdue,
      paidPeriod:  scaled.paidPeriod,
      // Active subs is a "right now" snapshot — doesn't scale with window.
      activeSubs:  MOCK_KPIS.activeSubs,
    };
  }, [days]);
  const trends = MOCK_KPI_TRENDS;
  const deltas = MOCK_KPI_DELTAS;
  const revenue = useMemo(() => buildMockRevenueTrend(days), [days]);
  const statusMix: StatusMix = useMemo(
    () => scaleByDays(
      { paid: MOCK_STATUS_MIX.paid, sent: MOCK_STATUS_MIX.sent, overdue: MOCK_STATUS_MIX.overdue, draft: MOCK_STATUS_MIX.draft },
      days,
    ),
    [days],
  );
  const topSubs = useMemo(
    () => MOCK_TOP_SUBS.map((s) => ({ ...s, totalPaid: Math.round(s.totalPaid * (days / 30)) })),
    [days],
  );
  const upcoming = useMemo(() => buildMockUpcomingJobs(), []); // forward-looking, not scoped by period
  const isPreview = true;

  const firstName = (user?.email?.split('@')[0] ?? '').split('+')[0]!;
  const cap = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : '';

  const totalStatusMix =
    statusMix.paid + statusMix.sent + statusMix.overdue + statusMix.draft;
  const paidPct = totalStatusMix > 0
    ? Math.round((statusMix.paid / totalStatusMix) * 100)
    : 0;

  return (
    <div>
      {/* Hero strip — greeting + quick actions */}
      <div className="page-hero mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="page-hero-kicker">Dashboard</div>
            <h1 className="page-hero-title">
              {greeting()}{cap ? `, ${cap}` : ''}
            </h1>
            <p className="page-hero-sub">
              {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' · '}
              <span className="font-semibold text-navy-700">{currentOrg?.name ?? 'Your organisation'}</span>
            </p>
            {/* Sync pill — primary value prop is "jobs in", so we surface the
                top job-source first. Linka pra /settings/integrations. */}
            <Link
              to="/settings/integrations"
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors hover:bg-brand-100"
              style={{ background: 'rgba(43, 187, 151, 0.15)', color: 'var(--color-brand-700)' }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
              </span>
              2 jobs pulled from ServiceM8 · 4 min ago
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <QuickAction to="/members" label="+ Invite member" primary />
            <QuickAction to="/work"     label="Offer work" />
            <QuickAction to="/invoices" label="Mark paid" />
            <QuickAction to="/inbox"    label="Open inbox" />
          </div>
        </div>
      </div>

      {/* Day-1 onboarding checklist — auto-hides once all 4 items done. */}
      {currentOrg && <GettingStartedDashboard orgId={currentOrg.id} />}

      {isPreview && (
        <div
          className="mb-4 flex items-start gap-3 rounded-xl border border-navy-100 bg-navy-50/50 px-4 py-3 text-[12.5px] text-navy-500"
          role="note"
        >
          <span aria-hidden="true" className="text-base leading-none">📊</span>
          <div>
            <span className="font-semibold text-navy-700">Preview data.</span>{' '}
            These are illustrative numbers. Once your subs start sending invoices and you mark
            payments, every chart and KPI here updates with your real numbers — no setup needed.
          </div>
        </div>
      )}

      {/* Period filter — scopes the KPI strip + charts + top subs. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy-300">
          Period
        </span>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as PeriodKey)}
          className="rounded-lg border border-navy-100 bg-white px-3 py-1.5 text-[13px] font-medium text-navy-700 focus:border-brand-500 focus:outline-none"
        >
          {PERIOD_OPTIONS.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
        {period === 'custom' && (
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={customRange.from}
              onChange={(e) => setCustomRange((r) => ({ ...r, from: e.target.value }))}
              className="rounded-md border border-navy-100 bg-white px-2 py-1 text-[13px] text-navy-700 focus:border-brand-500 focus:outline-none"
            />
            <span className="text-xs text-navy-400">→</span>
            <input
              type="date"
              value={customRange.to}
              onChange={(e) => setCustomRange((r) => ({ ...r, to: e.target.value }))}
              className="rounded-md border border-navy-100 bg-white px-2 py-1 text-[13px] text-navy-700 focus:border-brand-500 focus:outline-none"
            />
          </div>
        )}
        <span className="text-[11.5px] text-navy-400">
          Totals + charts reflect <span className="font-semibold text-navy-500">{periodLabel.toLowerCase()}</span>
          {period !== 'custom' && (
            <> · {days} {days === 1 ? 'day' : 'days'}</>
          )}
        </span>
      </div>

      {/* KPI strip — each card is a drill-down link into the relevant route
          with a status query param. invoices.tsx reads ?status= on mount and
          seeds its filter automatically. */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          tone="navy" label="Outstanding"
          value={formatMoney(kpis.outstanding)}
          trend={trends.outstanding}
          delta={{ direction: deltas.outstanding.direction, value: `${deltas.outstanding.pct.toFixed(1)}%` }}
          to="/invoices?status=sent,overdue"
        />
        <KpiCard
          tone="rose" label="Overdue"
          value={formatMoney(kpis.overdue)}
          trend={trends.overdue}
          delta={{ direction: deltas.overdue.direction, value: `${deltas.overdue.pct.toFixed(1)}%` }}
          to="/invoices?status=overdue"
        />
        <KpiCard
          tone="brand" label="Paid (period)"
          value={formatMoney(kpis.paidPeriod)}
          trend={trends.paid}
          delta={{ direction: deltas.paid.direction, value: `${deltas.paid.pct.toFixed(1)}%` }}
          to="/invoices?status=paid"
        />
        <KpiCard
          tone="lime" label="Active subs"
          value={String(kpis.activeSubs)}
          trend={trends.active}
          delta={{ direction: deltas.active.direction, value: `+${deltas.active.abs}` }}
          to="/members"
        />
      </div>

      {/* Charts row — Revenue trend + Status mix */}
      <div className="mb-5 grid gap-3 lg:grid-cols-2">
        <section className="ozly-card p-5">
          <div className="mb-1 flex items-baseline justify-between">
            <h2 className="font-display text-sm font-bold text-navy-800">
              Revenue paid · {periodLabel.toLowerCase()}
            </h2>
            <Link to="/reports" className="text-[11px] font-semibold text-brand-700 hover:text-brand-600">
              See reports →
            </Link>
          </div>
          <p className="mb-3 text-[11.5px] text-navy-400">
            Daily total of invoices marked as paid. Hover the line to see any day.
          </p>
          <LineChart
            data={revenue.map((p) => ({ label: p.date, value: p.paid }))}
            height={200}
            ariaLabel={`Revenue paid · ${periodLabel}`}
            onClick={() => navigate('/invoices?status=paid')}
          />
        </section>

        <section className="ozly-card p-5">
          <div className="mb-1 flex items-baseline justify-between">
            <h2 className="font-display text-sm font-bold text-navy-800">Invoice status</h2>
            <Link to="/invoices" className="text-[11px] font-semibold text-brand-700 hover:text-brand-600">
              See invoices →
            </Link>
          </div>
          <p className="mb-3 text-[11.5px] text-navy-400">
            How {formatMoney(totalStatusMix)} in invoices split across status for {periodLabel.toLowerCase()}.
          </p>
          <DonutChart
            data={[
              { key: 'paid',    label: 'Paid',    value: statusMix.paid,    colour: '#2bbb97' },
              { key: 'sent',    label: 'Sent',    value: statusMix.sent,    colour: '#9dd760' },
              { key: 'overdue', label: 'Overdue', value: statusMix.overdue, colour: '#e11d48' },
              { key: 'draft',   label: 'Draft',   value: statusMix.draft,   colour: '#607387' },
            ]}
            centreLabel={`${paidPct}%`}
            centreSub="Paid"
            formatValue={(n) => formatMoney(n)}
            onSliceClick={(key) => navigate(`/invoices?status=${key}`)}
          />
        </section>
      </div>

      {/* Bottom row — Top subs + Coming up */}
      <div className="grid gap-3 lg:grid-cols-2">
        <section className="ozly-card p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              <h2 className="font-display text-sm font-bold text-navy-800">Top sub-contractors</h2>
              <div className="text-[11px] text-navy-400">By paid amount · {periodLabel.toLowerCase()}</div>
            </div>
            <Link to="/members" className="text-[11px] font-semibold text-brand-700 hover:text-brand-600">
              All members →
            </Link>
          </div>
          <ul className="space-y-1">
            {topSubs.map((s, i) => (
              <li key={s.id}>
                <Link
                  to={`/members?email=${encodeURIComponent(s.email)}`}
                  className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-navy-50/60"
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{
                      background: i === 0
                        ? 'linear-gradient(135deg, #c9a43c, #8a6f1d)'
                        : 'var(--surface-soft)',
                      color: i === 0 ? '#ffffff' : 'var(--ink-tertiary)',
                    }}
                    aria-label={`Rank ${i + 1}`}
                  >
                    {i + 1}
                  </span>
                  <Avatar name={s.name} email={s.email} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-navy-800">{s.name}</div>
                    <div className="text-[11px] text-navy-400">{s.jobsDone} jobs done</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display text-sm font-bold text-navy-800">{formatMoney(s.totalPaid)}</div>
                    <div className="text-[10px] uppercase tracking-wider text-navy-400">paid</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="ozly-card p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-sm font-bold text-navy-800">Coming up · next 7 days</h2>
            <Link to="/work" className="text-[11px] font-semibold text-brand-700 hover:text-brand-600">
              All work →
            </Link>
          </div>
          <ul className="space-y-1">
            {upcoming.map((j) => (
              <li key={j.id}>
                <Link
                  to="/work"
                  className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-navy-50/60"
                >
                  <Avatar name={j.subName} email={j.subEmail} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-navy-800">{j.title}</div>
                    <div className="truncate text-[11px] text-navy-400">
                      {j.subName} · {j.durationHours}h
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[12px] font-semibold text-navy-700">{timeUntil(j.startsAt)}</div>
                    <div className="text-[10px] uppercase tracking-wider text-navy-400">
                      {formatDate(j.startsAt)}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
