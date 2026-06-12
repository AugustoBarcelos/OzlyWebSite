import { describe, it, expect } from 'vitest';
import {
  computeTotals,
  suggestInvoiceNumber,
  loadIssuedInvoices,
  saveIssuedInvoice,
  deleteIssuedInvoice,
  buildIssuedInvoiceHtml,
  type IssuedInvoice,
} from './issued-invoices';

const inv = (over: Partial<IssuedInvoice> = {}): IssuedInvoice => ({
  id: 'a1',
  invoiceNumber: 'INV-0001',
  issueDate: '2026-06-12',
  dueDate: '2026-06-26',
  clientName: 'Acme Pty Ltd',
  clientEmail: 'ap@acme.com',
  clientAbn: '12 345 678 901',
  clientAddress: '1 Main St\nSydney NSW',
  items: [{ description: 'Cleaning', qty: 4, unitPrice: 55 }],
  gstEnabled: true,
  notes: '',
  payTo: 'BSB 062-000 · Acc 1234 5678',
  createdAt: '2026-06-12T00:00:00Z',
  ...over,
});

describe('computeTotals', () => {
  it('sums qty × unitPrice, adds 10% GST when enabled, rounds to cents', () => {
    const t = computeTotals(
      [
        { description: 'a', qty: 3, unitPrice: 33.335 },
        { description: 'b', qty: 1, unitPrice: 10 },
      ],
      true,
    );
    expect(t.subtotal).toBe(110.01); // 100.005 + 10 → 110.01 after rounding
    expect(t.gst).toBe(11.0);
    expect(t.total).toBe(121.01);
  });

  it('zero GST when disabled and tolerates NaN inputs', () => {
    const t = computeTotals([{ description: '', qty: NaN, unitPrice: 50 }], false);
    expect(t).toEqual({ subtotal: 0, gst: 0, total: 0 });
  });
});

describe('suggestInvoiceNumber', () => {
  it('starts at INV-0001 and increments past the highest trailing number', () => {
    expect(suggestInvoiceNumber([])).toBe('INV-0001');
    expect(
      suggestInvoiceNumber([
        inv({ invoiceNumber: 'INV-0007' }),
        inv({ id: 'b', invoiceNumber: 'ACME-12' }),
      ]),
    ).toBe('INV-0013');
  });
});

describe('localStorage CRUD', () => {
  it('round-trips save / update / delete per org', () => {
    expect(loadIssuedInvoices('org-1')).toEqual([]);
    saveIssuedInvoice('org-1', inv());
    expect(loadIssuedInvoices('org-1')).toHaveLength(1);
    // update in place (same id)
    saveIssuedInvoice('org-1', inv({ clientName: 'New name' }));
    const list = loadIssuedInvoices('org-1');
    expect(list).toHaveLength(1);
    expect(list[0]!.clientName).toBe('New name');
    // newest first
    saveIssuedInvoice('org-1', inv({ id: 'a2', invoiceNumber: 'INV-0002' }));
    expect(loadIssuedInvoices('org-1')[0]!.id).toBe('a2');
    // other orgs isolated
    expect(loadIssuedInvoices('org-2')).toEqual([]);
    deleteIssuedInvoice('org-1', 'a1');
    expect(loadIssuedInvoices('org-1').map((i) => i.id)).toEqual(['a2']);
  });

  it('survives corrupt storage', () => {
    localStorage.setItem('ozly:issued-invoices:org-x', '{not json');
    expect(loadIssuedInvoices('org-x')).toEqual([]);
  });
});

describe('buildIssuedInvoiceHtml', () => {
  it('renders a tax invoice with issuer ABN, client, line items, GST and escaped HTML', () => {
    const html = buildIssuedInvoiceHtml(
      inv({ clientName: 'Acme <script>alert(1)</script>' }),
      { orgName: 'Augusto Co', orgAbn: '98 765 432 109', orgEmail: 'admin@ozly.au' },
    );
    expect(html).toContain('Tax invoice');
    expect(html).toContain('ABN 98 765 432 109');
    expect(html).toContain('Acme &lt;script&gt;'); // escaped
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('GST (10%)');
    expect(html).toContain('$242.00'); // 4 × 55 = 220 + 22 GST
    expect(html).toContain('Pay to');
  });

  it('renders a plain invoice (no GST line) when gst is disabled', () => {
    const html = buildIssuedInvoiceHtml(inv({ gstEnabled: false }), {
      orgName: 'Augusto Co', orgAbn: null, orgEmail: null,
    });
    expect(html).not.toContain('GST (10%)');
    expect(html).toContain('No GST has been charged');
    expect(html).toContain('$220.00');
  });
});
