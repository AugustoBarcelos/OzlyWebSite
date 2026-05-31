// V2 B2B addendum to the Terms of Use. Linked from the Org Portal billing
// footer and signup. Covers seat-tier commitment, downgrade flow, and the
// org-subsidy → sub-contractor exclusivity contract that's central to V2.

import { Link } from 'react-router-dom';

export default function TermsBusiness() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-navy-800 sm:px-6">
      <p className="text-sm text-navy-400">
        <Link to="/" className="hover:underline">Ozly</Link> ·{' '}
        <Link to="/terms-of-use" className="hover:underline">Terms of Use</Link> ·{' '}
        <span>Business addendum</span>
      </p>

      <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Terms — Business addendum</h1>
      <p className="mt-2 text-sm text-navy-500">Last updated: 2026-05-31</p>

      <p className="mt-6 leading-relaxed">
        These terms apply <strong>in addition to</strong> our standard{' '}
        <Link to="/terms-of-use" className="text-brand-600 hover:underline">Terms of Use</Link>{' '}
        whenever you use Ozly as an Organisation. They govern seat-tier pricing, downgrade
        commitments, the sub-contractor cover scheme, and the obligations of the org owner.
      </p>

      <h2 className="mt-10 text-lg font-semibold">1. Pricing &amp; tiers</h2>
      <p className="mt-2 leading-relaxed">
        Tiered, commitment-based per-seat pricing (AUD inc. GST):
      </p>
      <table className="mt-3 w-full border-collapse text-sm">
        <thead className="bg-navy-50 text-xs text-navy-500">
          <tr><th className="px-3 py-2 text-left">Tier</th><th className="px-3 py-2 text-left">Seats</th><th className="px-3 py-2 text-right">Monthly</th><th className="px-3 py-2 text-right">Annual (17% off)</th></tr>
        </thead>
        <tbody>
          <tr className="border-t border-navy-100"><td className="px-3 py-2">Tier 1</td><td className="px-3 py-2">1–5</td><td className="px-3 py-2 text-right">$12.99/seat</td><td className="px-3 py-2 text-right">$129.90/seat/year</td></tr>
          <tr className="border-t border-navy-100"><td className="px-3 py-2">Tier 2</td><td className="px-3 py-2">6–15</td><td className="px-3 py-2 text-right">$10.99/seat</td><td className="px-3 py-2 text-right">$109.90/seat/year</td></tr>
          <tr className="border-t border-navy-100"><td className="px-3 py-2">Tier 3</td><td className="px-3 py-2">16–30</td><td className="px-3 py-2 text-right">$8.99/seat</td><td className="px-3 py-2 text-right">$89.90/seat/year</td></tr>
          <tr className="border-t border-navy-100"><td className="px-3 py-2">Tier 4</td><td className="px-3 py-2">31–100</td><td className="px-3 py-2 text-right">$6.99/seat</td><td className="px-3 py-2 text-right">$69.90/seat/year</td></tr>
          <tr className="border-t border-navy-100"><td className="px-3 py-2">Custom</td><td className="px-3 py-2">100+</td><td className="px-3 py-2 text-right">contact us</td><td className="px-3 py-2 text-right">contact us</td></tr>
        </tbody>
      </table>
      <p className="mt-3 leading-relaxed">
        Seats are the count of accepted sub-contractor memberships in your org. Pricing is per seat,
        billed monthly or annually. <strong>You commit to the tier for the duration of the billing
        cycle</strong> (annual = 12 months); downgrades take effect at the next renewal.
      </p>

      <h2 className="mt-10 text-lg font-semibold">2. Upgrades &amp; downgrades</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
        <li>Upgrades take effect immediately, with Stripe-prorated difference billed at the next
            invoice.</li>
        <li>Downgrades take effect at the next renewal date. The downgrade flow asks for a brief
            reason and an optional contact request — these are used solely for retention; we'll
            not share them outside Ozly.</li>
        <li>You may switch monthly ↔ annual at any time; annual prepay applies the 17% discount
            from the next renewal.</li>
        <li>Only the org <strong>owner</strong> can change tiers. Admins and accountants have
            read-only billing access.</li>
      </ul>

      <h2 className="mt-10 text-lg font-semibold">3. Trial</h2>
      <p className="mt-2 leading-relaxed">
        New organisations receive a 14-day free trial. No payment method is required to start. At
        the end of the trial, you must add a payment method to keep coverage running for your
        members; failure to do so results in coverage stopping (with a 7-day grace period before
        members lose access).
      </p>

      <h2 className="mt-10 text-lg font-semibold">4. ABN cover scheme</h2>
      <p className="mt-2 leading-relaxed">
        When you cover a sub-contractor's ABN access via your org plan, their Ozly invoicing is{' '}
        <strong>directed to your organisation</strong> while the cover is active. This reflects the
        commercial trade-off: your seat fee subsidises their access. <strong>It is not a restraint
        on the member</strong> — they remain free to accept work from, and invoice, any other party
        by any other means. To additionally re-open Ozly invoicing to other clients while covered,
        the member may purchase a <strong>$5/mo personal top-up</strong> (or{' '}
        <strong>$9/mo PRO top-up</strong>) — a personal arrangement between the member and
        Apple/Google App Store, not Ozly or you.
      </p>

      <h2 className="mt-10 text-lg font-semibold">5. Member relationship — not employment</h2>
      <p className="mt-2 leading-relaxed">
        Ozly is a software tool and <strong>does not determine</strong> the legal character of your
        relationship with members. You acknowledge that members engage as independent
        sub-contractors under their own ABN and retain freedom to accept or decline engagements.{' '}
        <strong>The classification of each engagement, and all resulting obligations, are yours</strong>{' '}
        — including under the <strong>Fair Work Act 2009 (Cth)</strong>, the ATO contractor/employee
        framework, the <strong>Superannuation Guarantee (Administration) Act 1992 (Cth)</strong>{' '}
        (note: payments wholly or principally for a person's labour may attract superannuation even
        where an ABN is held — s 12(3)), state <strong>payroll tax</strong> ('relevant contract'
        provisions) and state <strong>workers' compensation</strong> ('deemed worker' provisions).
        Ozly provides no warranty, indemnity or compliance guarantee in respect of these obligations
        and recommends you obtain your own advice.
      </p>

      <h2 className="mt-10 text-lg font-semibold">5A. No legal, tax or accounting advice</h2>
      <p className="mt-2 leading-relaxed">
        Nothing in the Org Portal, this addendum or our marketing constitutes legal, tax, accounting
        or compliance advice. Statements about the sub-contractor framework are general information
        only.
      </p>

      <h2 className="mt-10 text-lg font-semibold">6. Add-ons (Phase 3)</h2>
      <p className="mt-2 leading-relaxed">
        Add-ons (Visa Shield, Xero/MYOB Export, Priority SLA, White-label) ship in Phase 3. Pricing
        is published on the catalog page in your portal once activated. Add-ons are billed
        per-cycle in addition to seat pricing; cancellation is prorated.
      </p>

      <h2 className="mt-10 text-lg font-semibold">7. Cancellation</h2>
      <p className="mt-2 leading-relaxed">
        You may cancel at any time via Stripe Customer Portal. Cancellation takes effect at the
        end of the current billing period. Members lose ABN cover at that point with a 7-day grace
        window. You retain access to your historical data (invoices, inbox, audit log) for 30 days
        post-cancellation.
      </p>

      <h2 className="mt-10 text-lg font-semibold">8. Data export &amp; portability</h2>
      <p className="mt-2 leading-relaxed">
        You may export your org data (invoices in CSV / PDF, member list, audit log) at any time
        from the Org Portal. We provide BAS-quarterly export and Xero / MYOB integration as
        add-ons (Phase 3).
      </p>

      <p className="mt-12 text-sm text-navy-400">
        Questions? <a href="mailto:augusto@ozly.app" className="text-brand-600 hover:underline">augusto@ozly.app</a>
      </p>
    </main>
  );
}
