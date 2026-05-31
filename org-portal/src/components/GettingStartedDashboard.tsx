// Day-1 onboarding checklist surfaced on the Dashboard hero. Compact, links
// directly to each next step. Auto-hides itself when all 4 items are done.
//
// Today the "done" check is heuristic (counts members + invoices). When we
// have a real integration backend, swap step 1 to read the connected count.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface ChecklistItem {
  key: string;
  label: string;
  to: string;
  done: boolean;
  cta: string;
}

interface Props {
  orgId: string;
}

export function GettingStartedDashboard({ orgId }: Props) {
  const [items, setItems] = useState<ChecklistItem[] | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const key = `ozly.gs.dismissed.${orgId}`;
    setDismissed(localStorage.getItem(key) === '1');

    (async () => {
      const [{ count: memberCount }, { count: invoiceCount }] = await Promise.all([
        supabase.from('org_memberships').select('id', { count: 'exact', head: true })
          .eq('org_id', orgId).eq('status', 'accepted'),
        supabase.from('invoices').select('id', { count: 'exact', head: true })
          .eq('org_visible_id', orgId),
      ]);

      const list: ChecklistItem[] = [
        {
          key: 'org_created',
          label: 'Organisation created',
          to: '/settings',
          done: true, // by definition — they're logged in seeing this
          cta: 'View settings',
        },
        {
          key: 'integration',
          // Real integrations backend doesn't exist yet — treat as "explored"
          // via localStorage flag. Toggle when user opens the page.
          label: 'Connect a job source',
          to: '/settings/integrations',
          done: localStorage.getItem(`ozly.gs.int.${orgId}`) === '1',
          cta: 'Connect ServiceM8 / Tradify / Calendar',
        },
        {
          key: 'invite',
          label: 'Invite your first sub-contractor',
          to: '/members',
          done: (memberCount ?? 0) >= 2, // owner + at least 1
          cta: 'Invite member',
        },
        {
          key: 'invoice',
          label: 'Receive your first invoice',
          to: '/invoices',
          done: (invoiceCount ?? 0) > 0,
          cta: 'See how it lands',
        },
      ];
      setItems(list);
    })();
  }, [orgId]);

  if (!items || dismissed) return null;

  const doneCount = items.filter((i) => i.done).length;
  const pct = Math.round((doneCount / items.length) * 100);
  if (doneCount === items.length) return null;

  function dismiss() {
    localStorage.setItem(`ozly.gs.dismissed.${orgId}`, '1');
    setDismissed(true);
  }

  return (
    <section className="ozly-card mb-5 overflow-hidden p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-base">🚀</span>
            <h2 className="font-display text-sm font-bold text-navy-800">Get started — {doneCount}/{items.length}</h2>
          </div>
          <p className="mt-1 text-[12px] text-navy-500">
            Finish setup so invoices start flowing. Takes about 10 minutes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[11px] font-semibold text-brand-700">{pct}%</div>
          <button
            onClick={dismiss}
            className="text-[11px] font-medium text-navy-400 hover:text-navy-700"
            title="Hide this card — you can revisit from Settings"
          >
            Dismiss
          </button>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-navy-50">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--color-brand-500) 0%, var(--color-lime-400) 100%)',
          }}
        />
      </div>

      <ol className="mt-4 grid gap-2">
        {items.map((it, i) => (
          <li key={it.key}>
            <Link
              to={it.to}
              onClick={() => {
                if (it.key === 'integration') {
                  localStorage.setItem(`ozly.gs.int.${orgId}`, '1');
                }
              }}
              className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${
                it.done
                  ? 'border-brand-200 bg-brand-50/40'
                  : 'border-navy-100 bg-white hover:border-brand-200 hover:bg-brand-50/20'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  style={
                    it.done
                      ? {
                          background:
                            'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))',
                          color: '#fff',
                        }
                      : {
                          background: 'var(--surface-soft)',
                          color: 'var(--ink-tertiary)',
                          boxShadow: 'inset 0 0 0 1px var(--border-soft)',
                        }
                  }
                >
                  {it.done ? '✓' : i + 1}
                </span>
                <div className="min-w-0">
                  <div className={`text-[13px] font-semibold ${it.done ? 'text-navy-500 line-through' : 'text-navy-800'}`}>
                    {it.label}
                  </div>
                  {!it.done && (
                    <div className="mt-0.5 text-[11px] text-navy-400">{it.cta}</div>
                  )}
                </div>
              </div>
              {!it.done && (
                <span className="shrink-0 text-[11px] font-semibold text-brand-700">→</span>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
