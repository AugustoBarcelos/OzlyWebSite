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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useOrg } from '@/lib/org';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/Spinner';
import { friendlyError } from '@/lib/errors';
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
  type DashboardKpi, type StatusMix, type TopSub,
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

  // ── Real-data fetches (RPCs deployed via 20260613020100_org_dashboard_real_kpis).
  // First fetch wins, then we switch off the "Preview data" banner. While loading
  // we still show the mock-scaled values so the layout doesn't jump.
  const orgId = currentOrg?.id ?? null;
  const [kpisReal, setKpisReal] = useState<{
    outstanding: number; overdue: number; paid_period: number; active_subs: number;
    prev: { outstanding: number; overdue: number; paid_period: number; active_subs: number };
    status_mix: { paid: number; sent: number; overdue: number; draft: number };
  } | null>(null);
  const [revenueReal, setRevenueReal] = useState<Array<{ date: string; paid: number }> | null>(null);
  const [topSubsReal, setTopSubsReal] = useState<TopSub[] | null>(null);

  useEffect(() => {
    if (!orgId) return;
    let active = true;
    const to = new Date().toISOString();
    const from = new Date(Date.now() - days * 86_400_000).toISOString();
    (async () => {
      const [overviewRes, trendRes, topSubsRes] = await Promise.all([
        supabase.rpc('org_dashboard_overview', { p_org_id: orgId, p_from: from, p_to: to }),
        supabase.rpc('org_dashboard_revenue_trend', { p_org_id: orgId, p_from: from, p_to: to }),
        supabase.rpc('org_dashboard_top_subs', { p_org_id: orgId, p_from: from, p_to: to, p_limit: 5 }),
      ]);
      if (!active) return;
      type OverviewRes = {
        kpis: { outstanding: number; overdue: number; paid_period: number; active_subs: number };
        kpis_prev: { outstanding: number; overdue: number; paid_period: number; active_subs: number };
        status_mix: { paid: number; sent: number; overdue: number; draft: number };
      };
      if (!overviewRes.error && overviewRes.data) {
        const d = overviewRes.data as OverviewRes;
        setKpisReal({
          outstanding: Number(d.kpis.outstanding) || 0,
          overdue:     Number(d.kpis.overdue)     || 0,
          paid_period: Number(d.kpis.paid_period) || 0,
          active_subs: Number(d.kpis.active_subs) || 0,
          prev: {
            outstanding: Number(d.kpis_prev.outstanding) || 0,
            overdue:     Number(d.kpis_prev.overdue)     || 0,
            paid_period: Number(d.kpis_prev.paid_period) || 0,
            active_subs: Number(d.kpis_prev.active_subs) || 0,
          },
          status_mix: {
            paid:    Number(d.status_mix.paid)    || 0,
            sent:    Number(d.status_mix.sent)    || 0,
            overdue: Number(d.status_mix.overdue) || 0,
            draft:   Number(d.status_mix.draft)   || 0,
          },
        });
      }
      if (!trendRes.error && trendRes.data) {
        const rows = trendRes.data as Array<{ date: string; paid: number }>;
        setRevenueReal(rows.map((r) => ({ date: r.date, paid: Number(r.paid) || 0 })));
      }
      if (!topSubsRes.error && topSubsRes.data) {
        const rows = topSubsRes.data as Array<{ user_id: string; full_name: string; email: string; total_paid: number; invoice_count: number }>;
        setTopSubsReal(rows.map((r) => ({
          id: r.user_id,
          name: r.full_name ?? r.email,
          email: r.email,
          totalPaid: Number(r.total_paid) || 0,
          // The mock TopSub schema has `jobsDone` from a different angle;
          // we approximate it with the paid-invoice count, which is the
          // closest real signal the org has of "how active was this sub".
          jobsDone: Number(r.invoice_count) || 0,
        })));
      }
    })();
    return () => { active = false; };
  }, [orgId, days]);

  // KPIs: real data when loaded, mocks scaled by period as fallback while
  // initial fetch is in flight (avoids layout jump on first paint).
  const kpis: DashboardKpi = useMemo(() => {
    if (kpisReal) {
      return {
        outstanding: kpisReal.outstanding,
        overdue:     kpisReal.overdue,
        paidPeriod:  kpisReal.paid_period,
        activeSubs:  kpisReal.active_subs,
      };
    }
    const scaled = scaleByDays(
      { outstanding: MOCK_KPIS.outstanding, overdue: MOCK_KPIS.overdue, paidPeriod: MOCK_KPIS.paidPeriod },
      days,
    );
    return { ...scaled, activeSubs: MOCK_KPIS.activeSubs };
  }, [kpisReal, days]);

  // Deltas: compute from real prev when available, else mock.
  const deltas = useMemo(() => {
    if (!kpisReal) return MOCK_KPI_DELTAS;
    const pct = (cur: number, prev: number): { direction: 'up' | 'down' | 'flat'; pct: number } => {
      if (prev <= 0) return { direction: cur > 0 ? 'up' : 'flat', pct: 0 };
      const change = ((cur - prev) / prev) * 100;
      if (Math.abs(change) < 0.5) return { direction: 'flat', pct: 0 };
      return { direction: change > 0 ? 'up' : 'down', pct: Math.abs(change) };
    };
    const abs = (cur: number, prev: number): { direction: 'up' | 'down' | 'flat'; pct: number; abs: number } => {
      const diff = cur - prev;
      return {
        direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
        pct: 0,
        abs: Math.abs(diff),
      };
    };
    return {
      outstanding: pct(kpisReal.outstanding, kpisReal.prev.outstanding),
      overdue:     pct(kpisReal.overdue,     kpisReal.prev.overdue),
      paid:        pct(kpisReal.paid_period, kpisReal.prev.paid_period),
      active:      abs(kpisReal.active_subs, kpisReal.prev.active_subs),
    };
  }, [kpisReal]);

  // Trends: keep mock sparklines until a follow-up adds 14-day history per KPI.
  const trends = MOCK_KPI_TRENDS;

  // Revenue trend: real or build mock as fallback.
  const revenue = useMemo(() => {
    if (revenueReal) return revenueReal;
    return buildMockRevenueTrend(days);
  }, [revenueReal, days]);

  // Status mix: real if loaded, else scaled mock.
  const statusMix: StatusMix = useMemo(() => {
    if (kpisReal) return kpisReal.status_mix;
    return scaleByDays(
      { paid: MOCK_STATUS_MIX.paid, sent: MOCK_STATUS_MIX.sent, overdue: MOCK_STATUS_MIX.overdue, draft: MOCK_STATUS_MIX.draft },
      days,
    );
  }, [kpisReal, days]);

  // Top subs: real list (may be empty for fresh orgs — show empty state) or mock.
  const topSubs = useMemo(() => {
    if (topSubsReal !== null) return topSubsReal;
    return MOCK_TOP_SUBS.map((s) => ({ ...s, totalPaid: Math.round(s.totalPaid * (days / 30)) }));
  }, [topSubsReal, days]);

  // Upcoming jobs still come from /work; keeping mock until that fetch wires in.
  const upcoming = useMemo(() => buildMockUpcomingJobs(), []);

  // Preview banner only shows while initial real data hasn't landed yet.
  const isPreview = kpisReal === null;

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
            {/* Sync pill — surfaces the calendar-feed status (or invites to
                connect one). Real data from org_list_calendar_connections. */}
            {currentOrg && <CalendarSyncPill orgId={currentOrg.id} />}
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

      {/* Invoice stragglers — REAL data from org_invoice_stragglers RPC.
          Highest-signal panel on the dashboard: who sent, who didn't.
          Sits above KPI strip because action follows the eye top→bottom. */}
      {currentOrg && (
        <StragglersPanel
          orgId={currentOrg.id}
          orgName={currentOrg.name ?? 'Your organisation'}
          days={days}
          periodLabel={periodLabel}
        />
      )}

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

// ─────────────────────────────────────────────────────────────────────────────
// CalendarSyncPill — shows last sync time for the org's calendar feeds.
// Surfaces the real status of the iCal pull, replacing the old fake
// "2 jobs pulled from ServiceM8" placeholder.
function CalendarSyncPill({ orgId }: { orgId: string }) {
  const [state, setState] = useState<{
    label: string;
    error?: string;
    count: number;
  } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.rpc('org_list_calendar_connections', { p_org_id: orgId });
      if (!active) return;
      if (error || !data || (data as unknown[]).length === 0) {
        setState({ label: 'Connect a calendar to auto-import jobs', count: 0 });
        return;
      }
      const rows = data as Array<{
        last_sync_at: string | null;
        last_sync_event_count: number | null;
        last_sync_error: string | null;
        paused: boolean;
      }>;
      const active_ = rows.filter((r) => !r.paused);
      if (active_.length === 0) {
        setState({ label: 'All calendar feeds paused', count: 0 });
        return;
      }
      const mostRecent = [...active_].sort((a, b) => {
        const at = a.last_sync_at ? Date.parse(a.last_sync_at) : 0;
        const bt = b.last_sync_at ? Date.parse(b.last_sync_at) : 0;
        return bt - at;
      })[0]!;
      const lastErr = mostRecent.last_sync_error;
      const last = mostRecent.last_sync_at;
      const count = mostRecent.last_sync_event_count ?? 0;
      const rel = last ? relativeShort(last) : 'pending';
      const label = lastErr
        ? `Calendar sync error · ${rel}`
        : `Calendar sync · last ${rel}${count > 0 ? ` · ${count} events` : ''}`;
      setState(lastErr ? { label, error: lastErr, count } : { label, count });
    })();
    return () => { active = false; };
  }, [orgId]);

  if (!state) return null;
  const ok = !state.error && state.count >= 0;
  return (
    <Link
      to="/settings"
      className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors hover:bg-brand-100"
      style={{
        background: state.error
          ? 'rgba(244, 63, 94, 0.12)'
          : 'rgba(43, 187, 151, 0.15)',
        color: state.error ? 'var(--color-rose-700, #be123c)' : 'var(--color-brand-700)',
      }}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${
          state.error ? 'bg-rose-400' : 'bg-brand-400'} opacity-60`} />
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
          state.error ? 'bg-rose-500' : ok ? 'bg-brand-500' : 'bg-amber-500'}`} />
      </span>
      {state.label}
    </Link>
  );
}

function relativeShort(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1)  return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
// StragglersPanel — real-data panel showing who's billed, who's pending, who's
// silent for the selected period. Driven by the `org_invoice_stragglers` RPC.
// "Send reminder" inserts an org_invoice_requests row which the trigger
// fan-outs into email + push to the member.
interface StragglerRow {
  member_user_id: string;
  member_name: string;
  member_email: string;
  completed_job_count: number;
  completed_job_value: number;
  invoiced_count: number;
  uninvoiced_count: number;
  invoice_count_in_period: number;
  last_activity_at: string | null;
}

function StragglersPanel(props: {
  orgId: string;
  orgName: string;
  days: number;
  periodLabel: string;
}) {
  const { orgId, orgName, days, periodLabel } = props;
  const { notify } = useToast();
  const [rows, setRows] = useState<StragglerRow[] | null>(null);
  const [reminding, setReminding] = useState<string | null>(null);

  const load = useCallback(async () => {
    const from = new Date(Date.now() - days * 86_400_000).toISOString();
    const to   = new Date().toISOString();
    const { data, error } = await supabase.rpc('org_invoice_stragglers', {
      p_org_id:      orgId,
      p_period_from: from,
      p_period_to:   to,
    });
    if (error) {
      // RPC isn't available yet (migration not deployed) — fail silent
      // so the rest of the dashboard renders.
      setRows([]);
      return;
    }
    setRows((data ?? []) as StragglerRow[]);
  }, [orgId, days]);

  useEffect(() => { void load(); }, [load]);

  async function sendReminder(r: StragglerRow) {
    setReminding(r.member_user_id);
    const dueBy = new Date();
    dueBy.setDate(dueBy.getDate() + 3);
    const { error } = await supabase.from('org_invoice_requests').insert({
      org_id:         orgId,
      member_user_id: r.member_user_id,
      message:        `${orgName} — please send invoice for ${r.uninvoiced_count} completed job${r.uninvoiced_count === 1 ? '' : 's'}`,
      due_by:         dueBy.toISOString().slice(0, 10),
      status:         'open',
    });
    setReminding(null);
    if (error) { notify(friendlyError(error, 'Could not send reminder.'), 'error'); return; }
    notify(`Reminder sent to ${r.member_name}.`, 'success');
  }

  if (rows === null) {
    return (
      <section className="ozly-card mb-5 p-5">
        <div className="flex items-center gap-2 text-xs text-navy-400">
          <Spinner size="sm" label="Loading stragglers" /> Loading invoice status…
        </div>
      </section>
    );
  }

  if (rows.length === 0) {
    return null; // no accepted members yet → suppress entirely
  }

  const stragglers = rows.filter((r) => r.uninvoiced_count > 0);
  const allDone    = rows.filter((r) => r.completed_job_count > 0 && r.uninvoiced_count === 0);
  const inactive   = rows.filter((r) => r.completed_job_count === 0);

  return (
    <section className="ozly-card mb-5 p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <h2 className="font-display text-sm font-bold text-navy-800">
            Who's billed · {periodLabel.toLowerCase()}
          </h2>
          <p className="mt-0.5 text-[11.5px] text-navy-400">
            Stragglers first. <strong>Send reminder</strong> pushes a notification + email asking for the invoice.
          </p>
        </div>
        <div className="flex shrink-0 gap-2 text-[10.5px] font-semibold">
          {stragglers.length > 0 && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
              {stragglers.length} pending
            </span>
          )}
          {allDone.length > 0 && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
              {allDone.length} all-clear
            </span>
          )}
        </div>
      </div>

      {stragglers.length === 0 && allDone.length === 0 && inactive.length > 0 && (
        <div className="rounded-lg border border-dashed border-navy-100 bg-navy-50/40 p-3 text-[12.5px] text-navy-500">
          No completed work this period yet. Members will show here once they finish jobs.
        </div>
      )}

      <ul className="space-y-1">
        {[...stragglers, ...allDone, ...inactive].map((r) => {
          const status: 'pending' | 'done' | 'inactive' =
            r.uninvoiced_count > 0 ? 'pending'
            : r.completed_job_count > 0 ? 'done'
            : 'inactive';
          return (
            <li
              key={r.member_user_id}
              className={`flex items-center gap-3 rounded-lg p-2 ${
                status === 'pending'
                  ? 'bg-amber-50/50'
                  : status === 'done'
                    ? 'bg-brand-50/40'
                    : 'bg-navy-50/30'
              }`}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  status === 'pending' ? 'bg-amber-500'
                  : status === 'done'    ? 'bg-brand-500'
                  : 'bg-navy-300'
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-navy-800">{r.member_name}</div>
                <div className="truncate text-[11px] text-navy-500">
                  {status === 'pending' && (
                    <>
                      <strong className="text-amber-700">{r.uninvoiced_count} uninvoiced</strong>
                      {' · '}
                      {r.completed_job_count} done
                      {r.invoiced_count > 0 && <> · {r.invoiced_count} billed</>}
                      {r.completed_job_value > 0 && <> · ~${Math.round(r.completed_job_value)}</>}
                    </>
                  )}
                  {status === 'done' && (
                    <>
                      All {r.completed_job_count} job{r.completed_job_count === 1 ? '' : 's'} invoiced
                      {r.invoice_count_in_period > 0 && <> · {r.invoice_count_in_period} sent</>}
                    </>
                  )}
                  {status === 'inactive' && (
                    <>No completed work this period</>
                  )}
                </div>
              </div>
              {status === 'pending' && (
                <button
                  onClick={() => void sendReminder(r)}
                  disabled={reminding === r.member_user_id}
                  className="shrink-0 rounded-md bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
                >
                  {reminding === r.member_user_id ? 'Sending…' : 'Send reminder'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
