// DB row shapes (subset) — mirror 20260528130000_org_portal_v0.sql.

export type BillingPlan = 'free' | 'starter' | 'growth';

// Who (if anyone) is paying for a member's ABN access. 'none' → greyed out
// everywhere (member card + their invoices + their jobs).
export type PayState = 'company' | 'self' | 'none';
export type MembershipRole = 'owner' | 'admin' | 'member' | 'accountant';
export type MembershipStatus = 'pending' | 'accepted' | 'declined' | 'removed';
export type InvoiceStatus = 'draft' | 'sent' | 'overdue' | 'paid';

export interface Organization {
  id: string;
  name: string;
  abn: string | null;
  admin_email: string;
  /** Inbox destination for direct invoice deliveries from members. Nullable
   *  until the owner sets it in Settings → Inbox. */
  billing_email: string | null;
  billing_plan: BillingPlan;
  trial_ends_at: string | null;
  created_at: string;
  period_frequency: 'weekly' | 'fortnightly' | 'monthly';
  period_anchor: string | null;
  /** Default hourly rate applied when offering work, unless a member has a
   *  rate_override. 0 means "no default set". */
  default_hourly_rate: number;
}

export type InboxStatus = 'queued' | 'sent' | 'bounced' | 'failed';

export interface InboxRow {
  id: string;
  invoice_id: string;
  invoice_number: string;
  invoice_total: number;
  invoice_issue: string;
  sender_user_id: string;
  sender_name: string | null;
  sender_email: string;
  delivered_to: string;
  cc_sender: boolean;
  status: InboxStatus;
  status_detail: string | null;
  sent_at: string | null;
  created_at: string;
  total_rows: number;
}

export interface OrgMembership {
  id: string;
  org_id: string;
  user_id: string;
  role: MembershipRole;
  status: MembershipStatus;
  invited_at: string | null;
  accepted_at: string | null;
  billing_frequency: 'weekly' | 'fortnightly' | 'monthly';
  billing_anchor: string | null;
  /** Per-member override of the org default hourly rate. Null = use org default. */
  rate_override?: number | null;
  /** When true, the daily cron schedules an invoice request at the configured
   *  cadence. Defaults to false until the admin turns it on per member. */
  auto_invoice_request?: boolean;
  /** Admin-only free-form labels. Never surfaced to the member. */
  admin_tags?: string[];
  /** Admin-only free-form note about this member. Same visibility scope. */
  admin_notes?: string;
}

export interface OrgInvitation {
  id: string;
  org_id: string;
  email_or_phone: string;
  token: string;
  role: MembershipRole;
  expires_at: string;
  delivery_status: 'pending' | 'sent' | 'failed' | 'skipped';
  accepted_at: string | null;
  created_at: string;
}

export interface InvoiceRow {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  sent_at: string | null;
  paid_at: string | null;
  payment_confirmed_at: string | null;
  user_id: string;
  org_visible_id: string | null;
  // Divergence: the member edited the invoice after it became visible to the
  // org. divergence_status drives the warning column + confirm/reject flow.
  is_edited: boolean;
  divergence_status: 'none' | 'pending' | 'confirmed' | 'rejected';
  last_edit_comment: string | null;
  last_edited_at: string | null;
  // The sub-contractor who issued the invoice (invoices.user_id → profiles).
  // This is the member the org cares about — NOT contractors (that row is the
  // org itself, from the member's address book).
  issuer: { full_name: string; email: string } | null;
}

export interface ThreadMessageRow {
  id: string;
  subject_type: 'invoice' | 'job';
  subject_id: string;
  org_id: string | null;
  sender_user_id: string | null;
  sender_role: 'member' | 'org';
  body: string;
  created_at: string;
}

export interface InvoiceChangeRow {
  id: string;
  invoice_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  comment: string;
  created_at: string;
}

export type JobStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface JobRow {
  id: string;
  user_id: string;
  title: string;
  start_datetime: string;
  end_datetime: string;
  status: JobStatus;
  location: string;
  hourly_rate: number;
  unpaid_break_minutes: number;
  // A change the org proposed that awaits the member's confirmation in the app.
  pending_changes: Record<string, unknown> | null;
  change_status: 'none' | 'pending' | 'confirmed' | 'rejected';
  change_comment: string | null;
  // jobs.user_id → profiles (the member who owns/confirmed the work)
  issuer: { full_name: string; email: string } | null;
}

export const SEAT_LIMIT: Record<BillingPlan, number | null> = {
  free: null, // unlimited members on Free in v0 (paid plans not sold yet)
  starter: 5,
  growth: 25,
};
