/**
 * UserTimeline — vertical timeline of subscription/account events.
 *
 * BRIEFING § 11.4 (Subscription tab): renders RC events as a timeline so the
 * admin can see "trial → paid → refund" at a glance. We keep the prop API
 * stable so Wave 5 can plug real data once the RC sync RPC ships.
 *
 * Today: when `events` is null (no data source), we show a documented
 * placeholder. When `events` is an empty array, we show a "no events" state.
 * When `events` has rows, we render them as a timeline.
 */

export interface TimelineEvent {
  /** ISO date string. */
  date: string;
  /** Short event type, e.g. "trial_started", "renewed". */
  type: string;
  /** Human-readable description. */
  description: string;
}

interface UserTimelineProps {
  /**
   * Events to render. `null` means "no data source connected yet" (shows the
   * placeholder); `[]` means "we have a source, but this user has no events".
   */
  events: TimelineEvent[] | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export function UserTimeline({ events }: UserTimelineProps) {
  if (events === null) {
    return (
      <div className="rounded-md border border-dashed border-navy-100 bg-navy-50 p-4 text-xs text-navy-400">
        RevenueCat events will be embedded here once the RC sync RPC ships
        (Wave 5+). Until then, use the &ldquo;Open in RevenueCat&rdquo; link
        above to inspect this user&apos;s subscription history.
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-md border border-navy-100 bg-white p-4 text-xs text-navy-400">
        No subscription events recorded for this user.
      </div>
    );
  }

  return (
    <ol className="relative ml-3 border-l border-navy-100">
      {events.map((ev, idx) => (
        <li key={`${ev.date}-${idx}`} className="ml-4 pb-4 last:pb-0">
          <span
            aria-hidden="true"
            className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border border-white bg-brand-500 ring-2 ring-brand-100"
          />
          <div className="text-[11px] font-medium uppercase tracking-wide text-navy-400">
            {formatDate(ev.date)}
          </div>
          <div className="mt-0.5 text-sm font-medium text-navy-700">
            {ev.type}
          </div>
          <div className="text-xs text-navy-500">{ev.description}</div>
        </li>
      ))}
    </ol>
  );
}
