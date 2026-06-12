// Settings → "Savings assumptions" — the editable table behind the
// dashboard's "Saved with Ozly" figure. Each row is one input of the model
// in lib/savings.ts; saving persists to localStorage (per-org) and pings the
// dashboard card via the assumptions-changed event so it repaints live.

import { useState } from 'react';
import { useToast } from '@/components/Toast';
import {
  DEFAULT_ASSUMPTIONS,
  loadAssumptions,
  saveAssumptions,
  clampAssumptions,
  notifyAssumptionsChanged,
  type SavingsAssumptions,
} from '@/lib/savings';

interface RowDef {
  key: keyof SavingsAssumptions;
  label: string;
  description: string;
  unit: string;
}

const ROWS: ReadonlyArray<RowDef> = [
  {
    key: 'hourlyRate',
    label: 'Admin hourly rate',
    description: 'What an hour of admin time costs your business.',
    unit: '$/hour',
  },
  {
    key: 'minutesPerInvoice',
    label: 'Invoice received & filed',
    description: 'Manual data entry, filing and matching replaced per invoice that arrives through Ozly.',
    unit: 'min each',
  },
  {
    key: 'minutesPerCleanInvoice',
    label: 'Invoice with no rework',
    description: 'Back-and-forth avoided per invoice that needed no edit or correction.',
    unit: 'min each',
  },
  {
    key: 'minutesPerReminder',
    label: 'Automated reminder',
    description: 'Manual chasing (call / text / email) replaced per reminder Ozly sends for you.',
    unit: 'min each',
  },
];

export function SavingsAssumptionsSection({ orgId }: { orgId: string }) {
  const { notify } = useToast();
  const [draft, setDraft] = useState<Record<keyof SavingsAssumptions, string>>(() => {
    const a = loadAssumptions(orgId);
    return {
      hourlyRate:             String(a.hourlyRate),
      minutesPerInvoice:      String(a.minutesPerInvoice),
      minutesPerCleanInvoice: String(a.minutesPerCleanInvoice),
      minutesPerReminder:     String(a.minutesPerReminder),
    };
  });

  function commit(next: SavingsAssumptions) {
    const clamped = clampAssumptions(next);
    saveAssumptions(orgId, clamped);
    notifyAssumptionsChanged();
    setDraft({
      hourlyRate:             String(clamped.hourlyRate),
      minutesPerInvoice:      String(clamped.minutesPerInvoice),
      minutesPerCleanInvoice: String(clamped.minutesPerCleanInvoice),
      minutesPerReminder:     String(clamped.minutesPerReminder),
    });
  }

  function save() {
    commit({
      hourlyRate:             Number(draft.hourlyRate),
      minutesPerInvoice:      Number(draft.minutesPerInvoice),
      minutesPerCleanInvoice: Number(draft.minutesPerCleanInvoice),
      minutesPerReminder:     Number(draft.minutesPerReminder),
    });
    notify('Savings assumptions saved.', 'success');
  }

  function reset() {
    commit(DEFAULT_ASSUMPTIONS);
    notify('Savings assumptions reset to defaults.', 'success');
  }

  return (
    <div>
      <p className="text-xs leading-relaxed text-navy-400">
        These power the <strong className="text-navy-600">Saved with Ozly</strong> figure on your
        dashboard. Each automated activity replaces the manual minutes below, priced at your admin
        rate. Billing discrepancies caught are always counted at their real dollar value — no
        assumption applies there.
      </p>

      <div className="mt-3 overflow-hidden rounded-lg border border-navy-100">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="bg-navy-50/60 text-[10.5px] uppercase tracking-wider text-navy-400">
              <th className="px-3 py-2 font-semibold">Activity</th>
              <th className="w-28 px-3 py-2 text-right font-semibold">Value</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key} className="border-t border-navy-50">
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-navy-700">{row.label}</div>
                  <div className="text-[11px] leading-snug text-navy-400">{row.description}</div>
                </td>
                <td className="px-3 py-2.5 text-right align-top">
                  <span className="inline-flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      inputMode="decimal"
                      value={draft[row.key]}
                      onChange={(e) => setDraft((d) => ({ ...d, [row.key]: e.target.value }))}
                      aria-label={`${row.label} (${row.unit})`}
                      className="w-16 rounded-md border border-navy-100 bg-white px-2 py-1 text-right text-[13px] text-navy-700 focus:border-brand-500 focus:outline-none"
                    />
                    <span className="w-12 text-left text-[10.5px] text-navy-400">{row.unit}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={save}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
        >
          Save assumptions
        </button>
        <button
          onClick={reset}
          className="text-[12px] font-medium text-navy-400 hover:text-navy-600"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
