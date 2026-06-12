// SavingsCard — the dashboard's "Saved with Ozly" strip. One compact row:
// headline dollar figure + mini bar chart + its own (subtle) analysis-period
// selector, independent from the page's reporting period. Clicking the card
// opens a popup with the activity breakdown; the small ⓘ opens the same popup
// scrolled to "How this is calculated".
//
// Every line of the maths is real activity (invoices, reminders, divergence
// flags) priced with the org's editable assumptions from Settings →
// "Savings assumptions" (lib/savings.ts). Fails silent to a quiet zero state
// so the dashboard never breaks on a fetch error.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/format';
import {
  loadAssumptions,
  computeSavings,
  bucketSavings,
  ASSUMPTIONS_CHANGED_EVENT,
  type SavingsActivity,
  type SavingsAssumptions,
  type DatedActivity,
} from '@/lib/savings';

type SavingsPeriod = '30d' | '90d' | '12m' | 'fy';
const PERIODS: ReadonlyArray<{ key: SavingsPeriod; label: string }> = [
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: '12m', label: 'Last 12 months' },
  { key: 'fy',  label: 'This fiscal year' },
];

function periodRange(p: SavingsPeriod): { fromMs: number; toMs: number } {
  const toMs = Date.now();
  if (p === '30d') return { fromMs: toMs - 30 * 86_400_000, toMs };
  if (p === '90d') return { fromMs: toMs - 90 * 86_400_000, toMs };
  if (p === '12m') return { fromMs: toMs - 365 * 86_400_000, toMs };
  // AU fiscal year starts 1 Jul.
  const now = new Date();
  const fyYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return { fromMs: new Date(fyYear, 6, 1).getTime(), toMs };
}

interface InvoiceRow {
  issue_date: string | null;
  sent_at: string | null;
  is_edited: boolean | null;
  divergence_status: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total: number | null;
}

interface FetchResult {
  activity: SavingsActivity;
  events: DatedActivity[];
}

const EMPTY: SavingsActivity = {
  invoicesReceived: 0, cleanInvoices: 0, remindersSent: 0,
  discrepancyDollars: 0, discrepancyCount: 0,
};

export function SavingsCard({ orgId }: { orgId: string }) {
  const [period, setPeriod] = useState<SavingsPeriod>(() => {
    try {
      const v = localStorage.getItem('ozly:savings-period');
      if (v === '30d' || v === '90d' || v === '12m' || v === 'fy') return v;
    } catch { /* defaults below */ }
    return '90d';
  });
  const [assumptions, setAssumptions] = useState<SavingsAssumptions>(() => loadAssumptions(orgId));
  const [result, setResult] = useState<FetchResult | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  // When opened via the ⓘ, scroll the popup to the methodology section.
  const [showHow, setShowHow] = useState(false);

  function setPeriodPersist(p: SavingsPeriod) {
    setPeriod(p);
    try { localStorage.setItem('ozly:savings-period', p); } catch { /* no-op */ }
  }

  // Re-load assumptions when Settings saves them (same-tab custom event).
  useEffect(() => {
    const onChange = () => setAssumptions(loadAssumptions(orgId));
    window.addEventListener(ASSUMPTIONS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(ASSUMPTIONS_CHANGED_EVENT, onChange);
  }, [orgId]);

  const { fromMs, toMs } = useMemo(() => periodRange(period), [period]);

  useEffect(() => {
    let active = true;
    const fromIso = new Date(fromMs).toISOString();
    const fromDate = fromIso.slice(0, 10);
    (async () => {
      const [invRes, remRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('issue_date, sent_at, is_edited, divergence_status, subtotal, tax_amount, total')
          .eq('org_visible_id', orgId)
          .gte('issue_date', fromDate)
          .limit(2000),
        supabase
          .from('org_invoice_requests')
          .select('created_at')
          .eq('org_id', orgId)
          .gte('created_at', fromIso)
          .limit(2000),
      ]);
      if (!active) return;

      const invoices: InvoiceRow[] = invRes.error ? [] : ((invRes.data ?? []) as InvoiceRow[]);
      const reminders: Array<{ created_at: string }> = remRes.error
        ? []
        : ((remRes.data ?? []) as Array<{ created_at: string }>);

      const activity: SavingsActivity = { ...EMPTY };
      const events: DatedActivity[] = [];

      for (const inv of invoices) {
        const at = inv.sent_at ?? (inv.issue_date ? `${inv.issue_date}T12:00:00` : null);
        if (!at) continue;
        activity.invoicesReceived += 1;
        events.push({ at, kind: 'invoice' });
        const flagged = Boolean(inv.is_edited) || (inv.divergence_status ?? 'none') !== 'none';
        if (!flagged) {
          activity.cleanInvoices += 1;
          events.push({ at, kind: 'clean' });
        } else {
          // Real dollar gap the divergence check surfaced: stated total vs
          // what the line items + GST actually add up to.
          const expected = (inv.subtotal ?? 0) + (inv.tax_amount ?? 0);
          const gap = Math.abs((inv.total ?? 0) - expected);
          if (gap > 0.005) {
            activity.discrepancyCount += 1;
            activity.discrepancyDollars += gap;
            events.push({ at, kind: 'discrepancy', dollars: gap });
          }
        }
      }
      for (const r of reminders) {
        activity.remindersSent += 1;
        events.push({ at: r.created_at, kind: 'reminder' });
      }

      setResult({ activity, events });
    })();
    return () => { active = false; };
  }, [orgId, fromMs]);

  const breakdown = useMemo(
    () => computeSavings(result?.activity ?? EMPTY, assumptions),
    [result, assumptions],
  );
  const buckets = useMemo(
    () => bucketSavings(result?.events ?? [], fromMs, toMs, assumptions),
    [result, fromMs, toMs, assumptions],
  );

  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? '';
  const hours = breakdown.minutes / 60;
  const hasActivity = breakdown.total > 0;

  return (
    <>
      {/* Vertical tile — same shape as the other Home grid cards: label row
          (with ⓘ + the subtle period select), headline value, one context
          line, mini chart pinned to the bottom. */}
      <section className="ozly-card flex h-full min-h-[96px] flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy-300">
            <span className="truncate">Saved with Ozly</span>
            <InfoDot onClick={(e) => { e.stopPropagation(); setShowHow(true); setPopupOpen(true); }} />
          </span>
          <select
            value={period}
            onChange={(e) => setPeriodPersist(e.target.value as SavingsPeriod)}
            aria-label="Savings analysis period"
            className="shrink-0 cursor-pointer rounded-md border-0 bg-transparent py-0.5 pl-1 pr-4 text-[10.5px] font-medium text-navy-400 hover:text-navy-600 focus:outline-none"
          >
            {PERIODS.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => { setShowHow(false); setPopupOpen(true); }}
          className="mt-1 flex min-h-0 flex-1 flex-col text-left"
          aria-label={`Saved with Ozly: ${formatMoney(Math.round(breakdown.total))} estimated, ${periodLabel}. Open activity breakdown.`}
        >
          <span className="truncate font-display text-lg font-bold text-brand-700">
            {hasActivity ? `~${formatMoney(Math.round(breakdown.total))}` : '$0'}
          </span>
          <span className="truncate text-[11px] text-navy-400">
            {hasActivity
              ? <>est. {hours >= 1 ? `${hours.toFixed(1)}h` : `${Math.round(breakdown.minutes)} min`} of admin time
                  {breakdown.lines.some((l) => l.key === 'discrepancies') && ' + discrepancies caught'}</>
              : <>Savings appear as invoices flow through Ozly</>}
          </span>
          <span className="mt-auto block pt-1.5">
            <MiniBars buckets={buckets} />
          </span>
        </button>
      </section>

      {popupOpen && (
        <SavingsPopup
          breakdown={breakdown}
          assumptions={assumptions}
          periodLabel={periodLabel}
          showHow={showHow}
          onClose={() => setPopupOpen(false)}
        />
      )}
    </>
  );
}

function InfoDot({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <span
      role="button"
      tabIndex={0}
      title="How is this calculated?"
      aria-label="How is this calculated?"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e as unknown as React.MouseEvent);
        }
      }}
      className="inline-flex h-3.5 w-3.5 shrink-0 cursor-pointer items-center justify-center rounded-full bg-navy-100 text-[9px] font-bold text-navy-500 transition-colors hover:bg-navy-200"
    >
      i
    </span>
  );
}

// Tiny inline SVG bar chart — one bar per bucket, brand-coloured, with a
// native title tooltip per bar. Fluid width (fills the tile), quiet on
// purpose; the popup carries the real numbers.
function MiniBars({ buckets }: { buckets: Array<{ label: string; total: number }> }) {
  const W = 140; // internal coordinate space; rendered fluid via viewBox
  const H = 30;
  if (buckets.length === 0) return null;
  const max = Math.max(1, ...buckets.map((b) => b.total));
  const gap = 2;
  const barW = Math.max(2, (W - gap * (buckets.length - 1)) / buckets.length);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-8 w-full"
      role="img"
      aria-hidden="true"
    >
      {buckets.map((b, i) => {
        const h = b.total > 0 ? Math.max(2, (b.total / max) * (H - 2)) : 1.5;
        return (
          <rect
            key={i}
            x={i * (barW + gap)}
            y={H - h}
            width={barW}
            height={h}
            rx={1.5}
            fill={b.total > 0 ? 'var(--color-brand-400, #4eccab)' : 'var(--color-navy-100, #dfe5ea)'}
          >
            <title>{`${b.label} · ~${formatMoney(Math.round(b.total))}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

function SavingsPopup({
  breakdown,
  assumptions,
  periodLabel,
  showHow,
  onClose,
}: {
  breakdown: ReturnType<typeof computeSavings>;
  assumptions: SavingsAssumptions;
  periodLabel: string;
  showHow: boolean;
  onClose: () => void;
}) {
  const howRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showHow) howRef.current?.scrollIntoView({ block: 'nearest' });
  }, [showHow]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const hours = breakdown.minutes / 60;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-navy-900/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Saved with Ozly — breakdown"
        className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-navy-100 bg-white px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-navy-800">Saved with Ozly</h2>
            <p className="mt-0.5 text-xs text-navy-500">{periodLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-sm text-navy-400 hover:bg-navy-50 hover:text-navy-700"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="rounded-xl bg-brand-50/70 px-4 py-3 text-center">
            <div className="font-display text-2xl font-bold text-brand-700">
              ~{formatMoney(Math.round(breakdown.total))}
            </div>
            <div className="mt-0.5 text-[11.5px] text-navy-500">
              {breakdown.minutes > 0 && (
                <>≈ {hours >= 1 ? `${hours.toFixed(1)} hours` : `${Math.round(breakdown.minutes)} minutes`} of admin work avoided</>
              )}
            </div>
          </div>

          {breakdown.lines.length === 0 ? (
            <p className="mt-4 text-center text-[12.5px] text-navy-400">
              No tracked activity in this period yet — savings build up as
              invoices and reminders flow through Ozly.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {breakdown.lines.map((l) => (
                <li key={l.key} className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="min-w-0 text-navy-700">
                    {l.label}
                    {l.detail && <span className="text-navy-400"> · {l.detail}</span>}
                  </span>
                  <span className="shrink-0 font-semibold text-navy-800">
                    {l.key === 'discrepancies' ? formatMoney(l.dollars) : `~${formatMoney(Math.round(l.dollars))}`}
                  </span>
                </li>
              ))}
              <li className="flex items-baseline justify-between gap-3 border-t border-navy-100 pt-2 text-[13px] font-bold text-navy-800">
                <span>Total estimated</span>
                <span>~{formatMoney(Math.round(breakdown.total))}</span>
              </li>
            </ul>
          )}

          <div ref={howRef} className="mt-5 rounded-lg bg-navy-50/60 px-3.5 py-3">
            <h3 className="text-[12px] font-bold text-navy-700">How this is calculated</h3>
            <p className="mt-1 text-[11.5px] leading-relaxed text-navy-500">
              Each automated activity replaces manual admin minutes, priced at your
              admin rate of <strong className="text-navy-700">{formatMoney(assumptions.hourlyRate)}/hour</strong>:
              invoices received & filed ({assumptions.minutesPerInvoice} min),
              invoices needing no rework ({assumptions.minutesPerCleanInvoice} min),
              automated reminders ({assumptions.minutesPerReminder} min).
              Billing discrepancies are the <em>real</em> dollar gaps Ozly flagged
              between an invoice's stated total and what its line items add up to —
              no assumption there.
            </p>
            <Link
              to="/settings#savings-assumptions"
              className="mt-2 inline-block text-[11.5px] font-semibold text-brand-700 hover:text-brand-600"
              onClick={onClose}
            >
              Adjust the assumptions in Settings →
            </Link>
          </div>

          <p className="mt-3 text-center text-[10.5px] text-navy-300">
            Estimate for your own planning — never used for billing.
          </p>
        </div>
      </div>
    </div>
  );
}
