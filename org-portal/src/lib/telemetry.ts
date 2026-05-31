import { supabase } from '@/lib/supabase';

// Client-side org telemetry. Server-side events (signup, invite sent/accepted/
// declined, invoice marked paid, billing changes, member snapshots) are emitted
// by the RPCs / edge functions / cron. The portal only emits view-level events.
// RLS (org_events_insert_admin) restricts inserts to org admins; failures are
// swallowed so analytics never blocks the UI.
type ClientOrgEvent =
  | 'org_invoice_viewed'
  | 'org_invoice_requested'
  | 'org_integration_requested';

export async function logOrgEvent(
  orgId: string,
  eventName: ClientOrgEvent,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await supabase.from('org_events').insert({ org_id: orgId, event_name: eventName, metadata });
  } catch {
    /* non-blocking */
  }
}
