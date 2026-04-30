import { useCallback, useEffect, useId, useState } from 'react';
import { Button } from '@tremor/react';
import { useToast } from './Toast';

/**
 * Reusable destructive-action card. BRIEFING § 11.4 — every soft delete /
 * ban / refund-style call needs typed confirmation.
 *
 * Renders a red-bordered card with a button that opens a modal. The user
 * must type `confirmPhrase` exactly (case-sensitive) before "Confirm" enables.
 *
 * On success: closes modal + emits a success toast.
 * On error: keeps modal open + shows an inline error message.
 */
export interface DangerZoneProps {
  title: string;
  description: string;
  /** Phrase the operator must type verbatim to enable the confirm button. */
  confirmPhrase: string;
  /** Action handler. Throw to display an error inline; resolve cleanly to close.
   *  When `requireReason` is true, receives the trimmed reason string. */
  onConfirm: (reason?: string) => Promise<void>;
  /** Optional: disable the trigger entirely (e.g. while data loads). */
  disabled?: boolean;
  /** Override the default trigger label. */
  buttonLabel?: string;
  /** Override the default success-toast title. */
  successMessage?: string;
  /** When true, also requires a reason (5–1000 chars) before confirm enables. */
  requireReason?: boolean;
}

export function DangerZone({
  title,
  description,
  confirmPhrase,
  onConfirm,
  disabled = false,
  buttonLabel = 'Confirm action…',
  successMessage,
  requireReason = false,
}: DangerZoneProps) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const inputId = useId();
  const reasonId = useId();
  const titleId = useId();
  const descId = useId();

  const phraseMatches = typed === confirmPhrase;
  const reasonValid = !requireReason || (reason.trim().length >= 5 && reason.trim().length <= 1000);
  const matches = phraseMatches && reasonValid;

  // Reset transient state whenever the modal closes.
  useEffect(() => {
    if (!open) {
      setTyped('');
      setReason('');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting]);

  const handleConfirm = useCallback(async () => {
    if (!matches || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(requireReason ? reason.trim() : undefined);
      toast({
        title: successMessage ?? `${title} succeeded`,
        variant: 'success',
      });
      setOpen(false);
    } catch (err) {
      const msg =
        err instanceof Error && err.message ? err.message : 'Action failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [matches, submitting, onConfirm, title, successMessage, toast, requireReason, reason]);

  return (
    <section
      className="rounded-lg border border-rose-300 bg-rose-50/40 p-4"
      aria-labelledby={`${titleId}-label`}
    >
      <h3
        id={`${titleId}-label`}
        className="text-sm font-semibold text-rose-900"
      >
        {title}
      </h3>
      <p className="mt-1 text-xs text-rose-800/80">{description}</p>
      <div className="mt-3">
        <Button
          variant="secondary"
          color="rose"
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          {buttonLabel}
        </Button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label="Close dialog"
            onClick={() => {
              if (!submitting) setOpen(false);
            }}
            className="absolute inset-0 bg-navy-700/50"
          />
          <div className="relative z-10 w-full max-w-md rounded-lg border border-rose-200 bg-white p-5 shadow-xl">
            <h2
              id={titleId}
              className="text-base font-semibold text-rose-900"
            >
              {title}
            </h2>
            <p id={descId} className="mt-1 text-sm text-navy-600">
              {description}
            </p>

            <label
              htmlFor={inputId}
              className="mt-4 block text-xs font-medium text-navy-600"
            >
              Type{' '}
              <code className="rounded bg-navy-50 px-1 py-0.5 text-[11px] text-rose-800">
                {confirmPhrase}
              </code>{' '}
              to confirm:
            </label>
            <input
              id={inputId}
              type="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={submitting}
              className="mt-1 block w-full rounded-md border border-navy-100 px-3 py-2 text-sm shadow-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 disabled:bg-navy-50"
            />

            {requireReason && (
              <>
                <label
                  htmlFor={reasonId}
                  className="mt-4 block text-xs font-medium text-navy-600"
                >
                  Reason (5–1000 chars, logged in audit):
                </label>
                <textarea
                  id={reasonId}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={submitting}
                  rows={3}
                  maxLength={1000}
                  className="mt-1 block w-full rounded-md border border-navy-100 px-3 py-2 text-sm shadow-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 disabled:bg-navy-50"
                />
                <p className="mt-1 text-[11px] text-navy-400">
                  {reason.trim().length}/1000 chars
                </p>
              </>
            )}

            {error && (
              <div
                role="alert"
                className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900"
              >
                {error}
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                disabled={submitting}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                color="rose"
                loading={submitting}
                disabled={!matches || submitting}
                onClick={() => {
                  void handleConfirm();
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
