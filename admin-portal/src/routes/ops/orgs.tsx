import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Title,
  Text,
} from '@tremor/react';
import { callRpc, RpcError } from '@/lib/rpc';
import { formatRelativeTime } from '@/lib/format';

/**
 * /ops/orgs — Ozly-admin view of B2B organisations (Org Portal).
 *
 * v0 billing is manual: there's no Stripe yet, so an admin sets each org's
 * billing_plan by hand here. Backed by admin_set_org_billing_plan() (gated by
 * is_admin()). Changing the plan drives the abn_access subsidy via the
 * sync-org-entitlement webhook.
 */

type BillingPlan = 'free' | 'starter' | 'growth';
const PLANS: BillingPlan[] = ['free', 'starter', 'growth'];

interface OrgRow {
  id: string;
  name: string;
  abn: string | null;
  admin_email: string;
  billing_plan: BillingPlan;
  trial_ends_at: string | null;
  created_at: string;
  accepted_members: number;
}

export function OrgsAdminPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const rows = await callRpc<OrgRow[]>('admin_list_organizations');
      setOrgs(rows ?? []);
    } catch (err) {
      setError(err instanceof RpcError ? err.message : 'Failed to load organisations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function changePlan(org: OrgRow, plan: BillingPlan) {
    if (plan === org.billing_plan) return;
    setSavingId(org.id);
    const prev = org.billing_plan;
    setOrgs((rows) => rows.map((r) => (r.id === org.id ? { ...r, billing_plan: plan } : r)));
    try {
      await callRpc('admin_set_org_billing_plan', { p_org_id: org.id, p_plan: plan });
    } catch (err) {
      // revert on failure
      setOrgs((rows) => rows.map((r) => (r.id === org.id ? { ...r, billing_plan: prev } : r)));
      setError(err instanceof RpcError ? err.message : 'Could not change plan');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Title>Organisations</Title>
        <Text>B2B Org Portal accounts. Set billing_plan manually until Stripe (v1).</Text>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <Card>
        {loading ? (
          <Text>Loading…</Text>
        ) : orgs.length === 0 ? (
          <Text>No organisations yet.</Text>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Admin email</TableHeaderCell>
                <TableHeaderCell>ABN</TableHeaderCell>
                <TableHeaderCell>Members</TableHeaderCell>
                <TableHeaderCell>Plan</TableHeaderCell>
                <TableHeaderCell>Trial ends</TableHeaderCell>
                <TableHeaderCell>Created</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orgs.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium text-navy-700">{o.name}</TableCell>
                  <TableCell>{o.admin_email}</TableCell>
                  <TableCell>{o.abn ?? '—'}</TableCell>
                  <TableCell>{o.accepted_members}</TableCell>
                  <TableCell>
                    <select
                      value={o.billing_plan}
                      disabled={savingId === o.id}
                      onChange={(e) => void changePlan(o, e.target.value as BillingPlan)}
                      className="rounded-md border border-navy-100 bg-white px-2 py-1 text-sm text-navy-700 focus:border-brand-500 focus:outline-none disabled:opacity-50"
                    >
                      {PLANS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>{o.trial_ends_at ? formatRelativeTime(o.trial_ends_at) : '—'}</TableCell>
                  <TableCell>{formatRelativeTime(o.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
