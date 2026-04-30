/**
 * MaskedField — display potentially-sensitive values with a deliberate
 * "Reveal" gesture.
 *
 * BRIEFING § 11.3 + § 11.4: email, phone, address (and TFN, when surfaced)
 * default to masked. To unmask, the parent must re-fetch user 360 with
 * `p_include_pii=true` — that's the audit trigger; the RPC itself logs a
 * `pii_revealed` row. This component is intentionally dumb: it just renders
 * the right UI for the current state and asks the parent to flip the flag.
 *
 * Props summary:
 *  - `masked=true`  → show a masked preview + "Reveal" button (calls
 *                     onReveal — that re-fetches with PII).
 *  - `masked=false` → show the actual `value` + 🔓 indicator + "Re-mask"
 *                     button (UI-only toggle; no RPC call).
 *
 * Special TFN mode: BRIEFING § 11.4 — TFN is NEVER fully unmasked; only the
 * last 3 digits are shown. The current `admin_get_user_360` RPC does not
 * return TFN, so this branch is dormant; we keep the prop API stable for
 * when/if a TFN-bearing RPC ships.
 */
import { useState } from 'react';
import { EyeIcon, EyeOffIcon, LockOpenIcon } from './Icons';

interface MaskedFieldProps {
  /** Field label, e.g. "Email". */
  label: string;
  /** Raw value. May be null (renders em-dash). */
  value: string | null;
  /**
   * Whether the parent is currently holding the unmasked value.
   * - true  → component shows the value
   * - false → component shows a masked preview (+ Reveal button)
   */
  masked: boolean;
  /**
   * Called when the user clicks "Reveal". Parent should re-fetch with
   * `p_include_pii=true` (which audit-logs a `pii_revealed` row).
   */
  onReveal?: () => void;
  /**
   * Whether a Reveal request is currently in flight. While true the button
   * is disabled and shows a spinner-ish state.
   */
  revealLoading?: boolean;
  /**
   * TFN mode: BRIEFING § 11.4. When true, the field is NEVER fully shown;
   * only the last 3 digits. No reveal button is rendered.
   */
  tfnMode?: boolean;
}

/** Build a generic mask preview from any string. */
function maskGeneric(raw: string): string {
  if (raw.length === 0) return '';
  // If it looks like an email, mask the local part except the first char.
  if (raw.includes('@')) {
    const [local, domain] = raw.split('@');
    if (!local || !domain) return '***';
    const visible = local.charAt(0);
    return `${visible}***@${domain}`;
  }
  // Otherwise show first char and dots.
  return `${raw.charAt(0)}${'•'.repeat(Math.max(3, raw.length - 2))}`;
}

/** TFN-style preview: only last 3 digits, e.g. "XXX-XXX-123". */
function maskTfn(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return '———';
  const tail = digits.slice(-3).padStart(3, 'X');
  return `XXX-XXX-${tail}`;
}

export function MaskedField({
  label,
  value,
  masked,
  onReveal,
  revealLoading = false,
  tfnMode = false,
}: MaskedFieldProps) {
  // UI-only "re-mask" toggle. Parent still holds the unmasked value, but the
  // user wants to hide it on screen again. We do NOT call any RPC for this.
  const [reMasked, setReMasked] = useState(false);

  const isNull = value === null || value === '';
  const showMasked = tfnMode || masked || reMasked;

  let display: string;
  if (isNull) {
    display = '—';
  } else if (tfnMode) {
    display = maskTfn(value);
  } else if (showMasked) {
    display = maskGeneric(value);
  } else {
    display = value;
  }

  return (
    <div className="flex items-start justify-between gap-3 border-b border-navy-50 py-2 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-wide text-navy-400">
          {label}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 break-words text-sm text-navy-700">
          <span className="font-mono">{display}</span>
          {!showMasked && !isNull && !tfnMode && (
            <span
              title="Value is currently revealed (PII)"
              aria-label="PII revealed"
              className="inline-flex items-center text-amber-600"
            >
              <LockOpenIcon className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>

      {/* Action area */}
      {!isNull && !tfnMode && (
        <div className="shrink-0">
          {showMasked ? (
            // Currently masked → offer to reveal (RPC re-fetch)
            <button
              type="button"
              onClick={() => {
                setReMasked(false);
                onReveal?.();
              }}
              disabled={revealLoading || !onReveal}
              className="inline-flex items-center gap-1 rounded-md border border-navy-100 bg-white px-2 py-1 text-[11px] font-medium text-navy-600 transition-colors hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <EyeIcon className="h-3.5 w-3.5" />
              {revealLoading ? 'Revealing…' : 'Reveal'}
            </button>
          ) : (
            // Currently revealed → offer to re-mask (UI only)
            <button
              type="button"
              onClick={() => setReMasked(true)}
              className="inline-flex items-center gap-1 rounded-md border border-navy-100 bg-white px-2 py-1 text-[11px] font-medium text-navy-600 transition-colors hover:bg-navy-50"
            >
              <EyeOffIcon className="h-3.5 w-3.5" />
              Re-mask
            </button>
          )}
        </div>
      )}
    </div>
  );
}
