import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface State {
  hasMember: boolean;
  hasAcceptedMember: boolean;
  hasInvoice: boolean;
  hasMarkedPaid: boolean;
}

const DISMISS_KEY = 'ozly:gs:dismissed';

/**
 * Three-step "Getting started" banner that surfaces on the Invoices page
 * until the user has completed the basic flow:
 *   1. Invite a sub-contractor
 *   2. Wait for them to accept (informational — no action)
 *   3. Mark your first invoice as paid
 *
 * Dismissal is permanent (localStorage) once the user clicks the X — they
 * can re-enable from /settings if we ever expose a "Reset onboarding" toggle.
 */
export function GettingStarted({ orgId }: { orgId: string }) {
  const [state, setState] = useState<State | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    if (!orgId || dismissed) return;
    let active = true;
    (async () => {
      const [{ count: memberCount }, { count: acceptedCount }, { count: invoiceCount }, { count: paidCount }] =
        await Promise.all([
          supabase.from('org_memberships').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
          supabase.from('org_memberships').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'accepted'),
          supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('org_visible_id', orgId),
          supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('org_visible_id', orgId).eq('status', 'paid'),
        ]);
      if (!active) return;
      setState({
        hasMember: (memberCount ?? 0) > 0,
        hasAcceptedMember: (acceptedCount ?? 0) > 0,
        hasInvoice: (invoiceCount ?? 0) > 0,
        hasMarkedPaid: (paidCount ?? 0) > 0,
      });
    })();
    return () => { active = false; };
  }, [orgId, dismissed]);

  if (dismissed || !state) return null;

  // Hide the whole banner once the user has marked at least one paid — they're
  // through the activation funnel.
  if (state.hasMarkedPaid) return null;

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* noop */ }
    setDismissed(true);
  }

  const steps: { done: boolean; label: string; hint: string; cta: { to: string; text: string } | null }[] = [
    {
      done: state.hasMember,
      label: 'Invite your first sub-contractor',
      hint: 'They accept in the Ozly app — then their invoices land here automatically.',
      cta: state.hasMember ? null : { to: '/members', text: 'Invite a member' },
    },
    {
      done: state.hasAcceptedMember,
      label: 'Wait for them to accept the invite',
      hint: state.hasAcceptedMember
        ? "They're in — invoices will appear here when they bill you."
        : "They'll get an email with a deep link to the Ozly app.",
      cta: null,
    },
    {
      done: state.hasMarkedPaid,
      label: 'Mark your first invoice as paid',
      hint: state.hasInvoice
        ? 'Swipe right on an invoice, or use the inline "Mark as paid" button.'
        : 'The first invoice will arrive once a member emits one to you.',
      cta: state.hasInvoice && !state.hasMarkedPaid ? { to: '/invoices', text: 'Open invoices' } : null,
    },
  ];

  const completed = steps.filter((s) => s.done).length;

  return (
    <div className="mb-5 rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            Getting started — {completed}/3 done
          </div>
          <h3 className="mt-1 text-base font-semibold text-navy-700">
            Three steps to your first invoice paid through Ozly
          </h3>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-xs font-medium text-navy-400 hover:text-navy-600"
        >
          Dismiss
        </button>
      </div>
      <ol className="mt-3 space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-3 rounded-md bg-white p-3">
            <div
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                s.done ? 'bg-brand-600 text-white' : 'bg-navy-100 text-navy-500'
              }`}
            >
              {s.done ? '✓' : i + 1}
            </div>
            <div className="flex-1">
              <div className={`text-sm font-medium ${s.done ? 'text-navy-400 line-through' : 'text-navy-700'}`}>
                {s.label}
              </div>
              <div className="mt-0.5 text-xs text-navy-500">{s.hint}</div>
            </div>
            {s.cta && (
              <Link
                to={s.cta.to}
                className="shrink-0 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500"
              >
                {s.cta.text}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
