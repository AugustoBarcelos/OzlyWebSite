// Exit-interview modal shown before a downgrade is committed. Captures
// reason + optional "contact me" tickbox. On confirm, calls the
// org_tier_change RPC which inserts a row in org_downgrade_log and (if
// contact_requested) fires org-downgrade-notify email to Augusto.

import { useState } from 'react';
import { DOWNGRADE_REASONS, type TierDefinition, type BillingInterval, totalAmount } from '@/lib/tier-pricing';
import { formatMoney } from '@/lib/format';

interface Props {
  fromTier: TierDefinition;
  toTier: TierDefinition;
  interval: BillingInterval;
  seats: number;
  onCancel: () => void;
  onConfirm: (args: { reason: string; reasonOther: string | null; contactRequested: boolean }) => Promise<void>;
}

export function DowngradeReasonModal({ fromTier, toTier, interval, seats, onCancel, onConfirm }: Props) {
  const [reason, setReason] = useState('');
  const [other, setOther] = useState('');
  const [contact, setContact] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentBill = totalAmount(seats, fromTier, interval);
  const newBill = totalAmount(seats, toTier, interval);

  async function submit() {
    if (!reason) return;
    setSubmitting(true);
    try {
      await onConfirm({
        reason,
        reasonOther: reason === 'other' && other.trim() ? other.trim() : null,
        contactRequested: contact,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-navy-900/50" onClick={onCancel} />
      <div role="dialog" aria-modal="true" className="relative w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="border-b border-navy-100 px-5 py-4">
          <h2 className="font-display text-lg font-bold text-navy-800">Before you go</h2>
          <p className="mt-1 text-xs text-navy-500">
            Help us understand — we'd rather fix it than lose you. Takes 10 seconds.
          </p>
        </div>

        <div className="px-5 py-4">
          <div className="rounded-lg bg-navy-50 p-3 text-[12px] text-navy-600">
            <div>
              <strong className="text-navy-800">{fromTier.label}</strong>
              <span className="text-navy-400"> → </span>
              <strong className="text-navy-800">{toTier.label}</strong>
            </div>
            <div className="mt-1 text-navy-500">
              {formatMoney(currentBill)} → <strong className="text-brand-700">{formatMoney(newBill)}</strong> per {interval === 'year' ? 'year' : 'month'} ({seats} seats)
            </div>
          </div>

          <label className="mt-4 block text-xs font-medium text-navy-700">
            What's the main reason?
          </label>
          <div className="mt-2 space-y-1.5">
            {DOWNGRADE_REASONS.map((r) => (
              <label
                key={r.key}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  reason === r.key
                    ? 'border-brand-400 bg-brand-50 text-navy-800'
                    : 'border-navy-100 bg-white text-navy-600 hover:border-navy-200'
                }`}
              >
                <input
                  type="radio"
                  name="downgrade-reason"
                  value={r.key}
                  checked={reason === r.key}
                  onChange={() => setReason(r.key)}
                  className="h-3.5 w-3.5"
                />
                <span>{r.label}</span>
              </label>
            ))}
          </div>

          {reason === 'other' && (
            <textarea
              placeholder="Tell us briefly…"
              value={other}
              onChange={(e) => setOther(e.target.value)}
              rows={2}
              className="mt-3 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none"
            />
          )}

          <label className="mt-4 flex items-start gap-2 rounded-lg border border-navy-100 bg-white px-3 py-2.5 hover:bg-navy-50/40 cursor-pointer">
            <input
              type="checkbox"
              checked={contact}
              onChange={(e) => setContact(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5"
            />
            <span className="text-xs text-navy-600">
              Contact me first — maybe there's something we can do. (Augusto, founder, calls within 24h.)
            </span>
          </label>
        </div>

        <div className="border-t border-navy-100 bg-navy-50/40 px-5 py-3">
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              disabled={submitting}
              className="rounded-md px-3 py-2 text-sm font-medium text-navy-600 hover:bg-white"
            >
              Cancel
            </button>
            <button
              onClick={() => void submit()}
              disabled={!reason || submitting}
              className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:bg-rose-300"
            >
              {submitting ? 'Processing…' : 'Confirm downgrade'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
