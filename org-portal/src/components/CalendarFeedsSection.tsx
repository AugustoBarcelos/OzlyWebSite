// Calendar feeds (iCal) — connect a Google Calendar / Outlook / Apple
// calendar by pasting its secret iCal URL. The org-calendar-sync edge fn
// runs every 15 min and creates offer drafts from matched events.
//
// This is the V0 of "company schedules in their own tool → Ozly pulls it
// in", deliberately simpler than full OAuth: one URL field + matching.
//
// Where to find the URL the admin needs to paste:
//   Google Calendar: Settings → Settings for my calendars → Integrate
//     calendar → Secret address in iCal format (https://…/private-XXX/basic.ics)
//   Outlook / Microsoft 365: Calendar → Share → Publish a calendar → ICS link
//   Apple iCloud: ical.icloud.com share links (read-only).

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { friendlyError } from '@/lib/errors';
import { Spinner } from '@/components/Spinner';

interface CalendarConnection {
  id: string;
  label: string;
  auth_type: 'ical' | 'google_oauth';
  ical_url_preview: string | null;
  google_account_email: string | null;
  google_calendar_id: string | null;
  default_member_id: string | null;
  default_member_name: string | null;
  auto_send: boolean;
  paused: boolean;
  last_sync_at: string | null;
  last_sync_event_count: number | null;
  last_sync_error: string | null;
  created_at: string;
}

interface MemberOption {
  user_id: string;
  label: string;
}

function relTime(iso: string | null): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.round(ms / 1_000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

type AddMode = null | 'choose' | 'google' | 'ical';

export function CalendarFeedsSection({ orgId }: { orgId: string }) {
  const { notify } = useToast();
  const [rows, setRows] = useState<CalendarConnection[] | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Handle the OAuth callback redirect from google-oauth-callback: it lands
  // on /settings?calendar=ok or ?calendar=error&reason=…. We surface the
  // result as a toast and clear the query so refresh doesn't re-fire it.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const status = url.searchParams.get('calendar');
    if (!status) return;
    if (status === 'ok') {
      notify('Google Calendar connected — first sync runs in a few seconds.', 'success');
    } else {
      const reason = url.searchParams.get('reason') ?? 'unknown';
      notify(`Could not connect Google Calendar: ${reason}`, 'error');
    }
    url.searchParams.delete('calendar');
    url.searchParams.delete('reason');
    window.history.replaceState({}, '', url.pathname + (url.search ? '?' + url.searchParams.toString() : ''));
  }, [notify]);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('org_list_calendar_connections', { p_org_id: orgId });
    if (error) {
      notify(friendlyError(error, 'Could not load calendar feeds.'), 'error');
      setRows([]);
      return;
    }
    setRows((data ?? []) as CalendarConnection[]);
  }, [orgId, notify]);

  useEffect(() => {
    void load();
    // Load members for the default-member picker (one query, scoped to org)
    void (async () => {
      const { data: mem } = await supabase
        .from('org_memberships')
        .select('user_id')
        .eq('org_id', orgId)
        .eq('status', 'accepted');
      const ids = ((mem ?? []) as { user_id: string }[]).map((m) => m.user_id);
      if (ids.length === 0) { setMembers([]); return; }
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ids);
      setMembers(
        ((profs ?? []) as { id: string; full_name: string | null; email: string }[]).map((p) => ({
          user_id: p.id,
          label: p.full_name?.trim() || p.email,
        })),
      );
    })();
  }, [orgId, load]);

  async function togglePause(c: CalendarConnection) {
    setBusyId(c.id);
    const { error } = await supabase.rpc('org_set_calendar_connection_paused', {
      p_org_id:        orgId,
      p_connection_id: c.id,
      p_paused:        !c.paused,
    });
    setBusyId(null);
    if (error) { notify(friendlyError(error), 'error'); return; }
    notify(c.paused ? `${c.label} resumed.` : `${c.label} paused.`, 'success');
    await load();
  }

  async function remove(c: CalendarConnection) {
    if (!window.confirm(`Remove ${c.label}? Already-imported events stay; no new events will be pulled.`)) return;
    setBusyId(c.id);
    const { error } = await supabase.rpc('org_remove_calendar_connection', {
      p_org_id:        orgId,
      p_connection_id: c.id,
    });
    setBusyId(null);
    if (error) { notify(friendlyError(error), 'error'); return; }
    notify(`${c.label} removed.`, 'success');
    await load();
  }

  async function syncNow(c: CalendarConnection) {
    setBusyId(c.id);
    const { error } = await supabase.functions.invoke('org-calendar-sync', {
      body: { connection_id: c.id },
    });
    setBusyId(null);
    if (error) { notify(friendlyError(error, 'Sync failed.'), 'error'); return; }
    notify(`Synced ${c.label}.`, 'success');
    await load();
  }

  return (
    <section className="ozly-card mb-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-navy-700">Calendar feeds</h2>
          <p className="mt-1 max-w-md text-xs text-navy-400">
            Connect your Google Calendar (official OAuth) so events
            matching an accepted member become job offers automatically.
            iCal URL is supported as a fallback for Outlook / Apple.
          </p>
        </div>
        {addMode === null && (
          <button
            type="button"
            onClick={() => setAddMode('choose')}
            className="shrink-0 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500"
          >
            + Add feed
          </button>
        )}
      </div>

      {addMode === 'choose' && (
        <AddModeChooser
          onPick={(m) => setAddMode(m)}
          onCancel={() => setAddMode(null)}
        />
      )}

      {addMode === 'google' && (
        <AddGoogleFlow
          orgId={orgId}
          members={members}
          onCancel={() => setAddMode(null)}
          notify={notify}
        />
      )}

      {addMode === 'ical' && (
        <AddFeedForm
          orgId={orgId}
          members={members}
          onCancel={() => setAddMode(null)}
          onAdded={async () => { setAddMode(null); await load(); }}
        />
      )}

      <div className="mt-4 space-y-2">
        {rows === null && (
          <div className="flex items-center gap-2 rounded-lg bg-navy-50/40 p-4 text-xs text-navy-400">
            <Spinner size="sm" label="Loading feeds" /> Loading feeds…
          </div>
        )}

        {rows && rows.length === 0 && addMode === null && (
          <div className="rounded-lg border border-dashed border-navy-100 bg-navy-50/40 p-4 text-center text-xs text-navy-500">
            No calendar feeds yet — add one above to stop re-typing jobs.
          </div>
        )}

        {rows?.map((c) => (
          <div
            key={c.id}
            className={`rounded-xl border p-3 ${
              c.paused
                ? 'border-amber-200 bg-amber-50/40'
                : c.last_sync_error
                  ? 'border-rose-200 bg-rose-50/40'
                  : 'border-navy-100 bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-navy-800">{c.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    c.auth_type === 'google_oauth'
                      ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                      : 'bg-navy-50 text-navy-600 ring-1 ring-navy-100'
                  }`}>
                    {c.auth_type === 'google_oauth' ? 'Google' : 'iCal'}
                  </span>
                  {c.paused && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                      Paused
                    </span>
                  )}
                  {c.auto_send && !c.paused && (
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-700">
                      Auto-send
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate font-mono text-[10.5px] text-navy-400">
                  {c.auth_type === 'google_oauth'
                    ? (c.google_account_email ?? c.google_calendar_id ?? '—')
                    : (c.ical_url_preview ?? '—')}
                </div>
                <div className="mt-1 text-[11px] text-navy-500">
                  {c.default_member_name
                    ? <>Default member: <strong className="text-navy-700">{c.default_member_name}</strong> · </>
                    : <>No default member · </>}
                  Last sync: {relTime(c.last_sync_at)}
                  {c.last_sync_event_count !== null && c.last_sync_event_count > 0
                    ? ` · ${c.last_sync_event_count} event${c.last_sync_event_count === 1 ? '' : 's'} imported`
                    : ''}
                </div>
                {c.last_sync_error && (
                  <div className="mt-1 text-[11px] font-medium text-rose-700">
                    Last error: {c.last_sync_error}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => void syncNow(c)}
                  disabled={busyId === c.id || c.paused}
                  className="rounded-md px-2 py-1 text-[11px] font-semibold text-navy-700 ring-1 ring-navy-100 hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title={c.paused ? 'Resume to sync' : 'Pull events now'}
                >
                  {busyId === c.id ? '…' : 'Sync now'}
                </button>
                <button
                  onClick={() => void togglePause(c)}
                  disabled={busyId === c.id}
                  className="rounded-md px-2 py-1 text-[11px] font-semibold text-navy-700 ring-1 ring-navy-100 hover:bg-navy-50 disabled:opacity-40"
                >
                  {c.paused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={() => void remove(c)}
                  disabled={busyId === c.id}
                  className="rounded-md px-2 py-1 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AddFeedForm(props: {
  orgId: string;
  members: MemberOption[];
  onCancel: () => void;
  onAdded: () => Promise<void>;
}) {
  const { orgId, members, onCancel, onAdded } = props;
  const { notify } = useToast();
  const [label, setLabel] = useState('Dispatch calendar');
  const [url, setUrl] = useState('');
  const [defaultMember, setDefaultMember] = useState<string>('');
  const [autoSend, setAutoSend] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!url.trim()) {
      notify('iCal URL is required.', 'error');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc('org_add_calendar_connection', {
      p_org_id:         orgId,
      p_label:          label.trim() || 'Calendar',
      p_ical_url:       url.trim(),
      p_default_member: defaultMember || null,
      p_auto_send:      autoSend,
    });
    setSubmitting(false);
    if (error) { notify(friendlyError(error), 'error'); return; }
    notify('Calendar connected — first sync runs in a minute.', 'success');
    await onAdded();
  }

  const field =
    'mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';

  return (
    <form onSubmit={onSubmit} className="mt-4 rounded-xl border border-brand-200 bg-brand-50/30 p-4">
      <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-brand-700">
        Add a calendar feed
      </div>
      <label className="block text-xs font-medium text-navy-700">
        Label
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Dispatch calendar"
          className={field}
        />
      </label>
      <label className="mt-3 block text-xs font-medium text-navy-700">
        iCal URL <span className="text-rose-600">*</span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          type="url"
          placeholder="https://calendar.google.com/calendar/ical/.../private-…/basic.ics"
          className={`${field} font-mono text-[12px]`}
          required
        />
        <span className="mt-1 block text-[10.5px] text-navy-400">
          Google: Calendar settings → Integrate calendar → <strong>Secret address in iCal format</strong>. The URL is sensitive — anyone with it can read your calendar. We store it server-side and never display it back.
        </span>
      </label>
      <label className="mt-3 block text-xs font-medium text-navy-700">
        Default member <span className="text-navy-300">(optional)</span>
        <select
          value={defaultMember}
          onChange={(e) => setDefaultMember(e.target.value)}
          className={field}
        >
          <option value="">— none, skip unmatched events —</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>{m.label}</option>
          ))}
        </select>
        <span className="mt-1 block text-[10.5px] text-navy-400">
          We match by attendee email or by member name in the event title. Unmatched events go to the default member (or are skipped).
        </span>
      </label>
      <label className="mt-3 flex items-start gap-2 text-xs text-navy-700">
        <input
          type="checkbox"
          checked={autoSend}
          onChange={(e) => setAutoSend(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-navy-300 text-brand-600 focus:ring-brand-200"
        />
        <span>
          <strong>Auto-send to the matched member.</strong> When off (recommended for the first week), imported events sit as drafts in /work for you to review and send manually.
        </span>
      </label>
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={submitting || !url.trim()}
          className="flex-1 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
        >
          {submitting ? 'Connecting…' : 'Connect calendar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-2 text-sm font-medium text-navy-600 ring-1 ring-navy-100 hover:bg-navy-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AddModeChooser — picks between Google OAuth (recommended) and iCal URL.
// Google is the primary path now; iCal is kept as a fallback for Outlook /
// Apple Calendar users until those get their own OAuth integration.
function AddModeChooser(props: {
  onPick: (mode: 'google' | 'ical') => void;
  onCancel: () => void;
}) {
  const { onPick, onCancel } = props;
  return (
    <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/30 p-4">
      <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-wider text-brand-700">
        Pick a connection method
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onPick('google')}
          className="group flex flex-col items-start gap-2 rounded-lg border border-navy-100 bg-white p-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/20"
        >
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-base">🅖</span>
            <span className="text-sm font-semibold text-navy-800">Google Calendar</span>
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-700">
              Recommended
            </span>
          </div>
          <p className="text-[11.5px] leading-snug text-navy-500">
            Official OAuth — events appear within a minute, no secret URL to
            paste. Works with personal Gmail and Google Workspace.
          </p>
        </button>
        <button
          type="button"
          onClick={() => onPick('ical')}
          className="group flex flex-col items-start gap-2 rounded-lg border border-navy-100 bg-white p-3 text-left transition-colors hover:border-navy-300 hover:bg-navy-50/40"
        >
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-base">🔗</span>
            <span className="text-sm font-semibold text-navy-800">iCal URL</span>
          </div>
          <p className="text-[11.5px] leading-snug text-navy-500">
            Paste a secret iCal URL from Outlook / Apple / Google Calendar.
            Polled every 15 minutes. Use this if Google OAuth isn't available.
          </p>
        </button>
      </div>
      <div className="mt-3 text-right">
        <button
          type="button"
          onClick={onCancel}
          className="text-[11px] font-semibold text-navy-500 hover:text-navy-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AddGoogleFlow — collects label / default member / auto-send (mirrors the
// iCal form), then calls org_create_calendar_oauth_intent to mint a `state`,
// asks the google-oauth-start edge fn for the consent URL, and redirects.
// On return, the page reads ?calendar=ok|error in the useEffect at the top
// of the parent component.
function AddGoogleFlow(props: {
  orgId: string;
  members: MemberOption[];
  onCancel: () => void;
  notify: (m: string, k?: 'success' | 'error' | 'info') => void;
}) {
  const { orgId, members, onCancel, notify } = props;
  const [label, setLabel] = useState('Google Calendar');
  const [defaultMember, setDefaultMember] = useState('');
  const [autoSend, setAutoSend] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onConnect() {
    setSubmitting(true);
    try {
      const { data: state, error } = await supabase.rpc('org_create_calendar_oauth_intent', {
        p_org_id:         orgId,
        p_label:          label.trim() || 'Google Calendar',
        p_default_member: defaultMember || null,
        p_auto_send:      autoSend,
      });
      if (error || !state) {
        notify(friendlyError(error, 'Could not start the OAuth flow.'), 'error');
        setSubmitting(false);
        return;
      }
      const { data: urlData, error: urlErr } = await supabase.functions.invoke(
        'google-oauth-start',
        { body: { state } },
      );
      if (urlErr || !urlData || typeof (urlData as { url?: string }).url !== 'string') {
        notify(friendlyError(urlErr, 'Could not get the Google consent URL.'), 'error');
        setSubmitting(false);
        return;
      }
      // Redirect — the user comes back to /settings?calendar=ok or ?calendar=error
      window.location.href = (urlData as { url: string }).url;
    } catch (e) {
      notify(friendlyError(e, 'Could not start the OAuth flow.'), 'error');
      setSubmitting(false);
    }
  }

  const field =
    'mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';

  return (
    <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/30 p-4">
      <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-brand-700">
        Connect Google Calendar
      </div>
      <label className="block text-xs font-medium text-navy-700">
        Label
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Google Calendar"
          className={field}
        />
      </label>
      <label className="mt-3 block text-xs font-medium text-navy-700">
        Default member <span className="text-navy-300">(optional)</span>
        <select
          value={defaultMember}
          onChange={(e) => setDefaultMember(e.target.value)}
          className={field}
        >
          <option value="">— none, skip unmatched events —</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>{m.label}</option>
          ))}
        </select>
        <span className="mt-1 block text-[10.5px] text-navy-400">
          We match by attendee email or by member name in the event title.
          Unmatched events go to the default member (or are skipped).
        </span>
      </label>
      <label className="mt-3 flex items-start gap-2 text-xs text-navy-700">
        <input
          type="checkbox"
          checked={autoSend}
          onChange={(e) => setAutoSend(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-navy-300 text-brand-600 focus:ring-brand-200"
        />
        <span>
          <strong>Auto-send to the matched member.</strong> When off (recommended
          for the first week), imported events sit as drafts in /work for you
          to review and send manually.
        </span>
      </label>
      <div className="mt-3 rounded-md bg-white px-3 py-2 text-[10.5px] leading-snug text-navy-500 ring-1 ring-navy-100">
        Clicking <strong>Continue with Google</strong> will redirect you to a
        Google consent screen. We only ask for read access to your calendar
        events — we never write or delete anything.
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => void onConnect()}
          disabled={submitting}
          className="flex-1 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:bg-brand-300"
        >
          {submitting ? 'Redirecting…' : 'Continue with Google →'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-md px-3 py-2 text-sm font-medium text-navy-600 ring-1 ring-navy-100 hover:bg-navy-50 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
