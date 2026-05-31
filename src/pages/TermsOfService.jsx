// Standalone B2B Terms of Service for "Ozly for Organisations" (the Org Portal
// at app.ozly.app). This is the complete contract an organisation agrees to when
// it subscribes — it supersedes the older /terms-of-use/business addendum, which
// is kept only for backward links. Routed at /terms-of-service and linked from
// the Org Portal billing/signup footer.
//
// ⚠️ ENTITY: Ozly is a sole-trader business (ABN 72 203 548 158) — NOT a Pty Ltd.

import { Link } from 'react-router-dom';

const ABN = 'ABN 72 203 548 158';
const ENTITY = `Ozly, a sole-trader business (${ABN}) based in New South Wales, Australia`;

export default function TermsOfService() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-navy-800 sm:px-6">
      <p className="text-sm text-navy-400">
        <Link to="/" className="hover:underline">Ozly</Link> ·{' '}
        <Link to="/business" className="hover:underline">Ozly for Organisations</Link> ·{' '}
        <span>Terms of Service</span>
      </p>

      <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
        Ozly for Organisations — Terms of Service
      </h1>
      <p className="mt-2 text-sm text-navy-500">Last updated: 2026-05-31</p>

      <p className="mt-6 leading-relaxed">
        These Terms of Service (the <strong>&ldquo;Terms&rdquo;</strong>) form a binding agreement
        between <strong>{ENTITY}</strong> (<strong>&ldquo;Ozly&rdquo;</strong>, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;, &ldquo;our&rdquo;) and the organisation that registers for or uses{' '}
        <strong>Ozly for Organisations</strong> (the <strong>&ldquo;Org Portal&rdquo;</strong>) —
        typically a cleaning or services company that manages sub-contractors who use the Ozly
        mobile app (<strong>&ldquo;you&rdquo;</strong>, &ldquo;your&rdquo;, the
        <strong> &ldquo;Organisation&rdquo;</strong>). By creating an organisation, inviting members,
        or paying for a plan, the person accepting these Terms warrants they are authorised to bind
        the Organisation.
      </p>
      <p className="mt-3 leading-relaxed">
        These Terms govern the B2B relationship. Your sub-contractors&rsquo; own use of the Ozly app
        is governed by the consumer{' '}
        <Link to="/terms-of-use" className="text-brand-600 hover:underline">Terms of Use</Link>. Our
        handling of personal information for the Org Portal is described in the{' '}
        <Link to="/privacy-policy/business" className="text-brand-600 hover:underline">Privacy — Business addendum</Link>.
      </p>

      {/* 1 */}
      <h2 className="mt-10 text-lg font-semibold">1. Definitions</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
        <li><strong>Member</strong> — an independent sub-contractor who has accepted an invitation to your Organisation and uses the Ozly app under their own ABN.</li>
        <li><strong>Seat</strong> — a Member whose ABN or PRO access you actively cover (sponsor) under your plan. Members you do not sponsor are visible in your dashboard at no charge.</li>
        <li><strong>Owner</strong> — the individual who controls the Organisation&rsquo;s account, billing and tier. <strong>Admins</strong> and <strong>accountants</strong> have limited, read-only billing access.</li>
        <li><strong>Cover / Sponsorship</strong> — the optional arrangement under which your seat fee subsidises a Member&rsquo;s Ozly subscription (clause 7).</li>
      </ul>

      {/* 2 */}
      <h2 className="mt-10 text-lg font-semibold">2. The service</h2>
      <p className="mt-2 leading-relaxed">
        The Org Portal lets you invite Members, receive the invoices they address to your
        Organisation, record payments, view hours logged against your work, export bookkeeping data,
        and optionally cover Members&rsquo; Ozly access. Ozly is a <strong>record-keeping and
        workflow tool</strong>. It is not a marketplace, an employer-of-record, a payroll provider,
        or a payment processor, and it does not match Members to work.
      </p>

      {/* 3 */}
      <h2 className="mt-10 text-lg font-semibold">3. Accounts &amp; authority</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
        <li>You must provide accurate registration details (including a valid ABN where requested) and keep them current.</li>
        <li>You are responsible for all activity under your Organisation&rsquo;s account and for the conduct of your Owner, Admins and accountants.</li>
        <li>Only the Owner can change tiers, start or stop Cover, or cancel the plan.</li>
      </ul>

      {/* 4 */}
      <h2 className="mt-10 text-lg font-semibold">4. Pricing &amp; tiers</h2>
      <p className="mt-2 leading-relaxed">
        The dashboard is free. You pay only for sponsored Seats, on tiered, commitment-based per-seat
        pricing (AUD, inclusive of GST where applicable). Your tier is derived automatically from the
        number of active sponsored Seats; the current rates are shown on the{' '}
        <Link to="/business" className="text-brand-600 hover:underline">pricing page</Link> and in your
        Org Portal billing screen. <strong>You commit to your tier for the duration of the billing
        cycle</strong> (annual = 12 months). We will not silently reprice; material changes are
        notified in advance.
      </p>

      {/* 5 */}
      <h2 className="mt-10 text-lg font-semibold">5. Billing, payment &amp; taxes</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
        <li>Subscriptions are billed through <strong>Stripe</strong>, monthly or annually in advance, to the payment method you provide.</li>
        <li><strong>Upgrades</strong> take effect immediately, with the prorated difference billed at the next invoice. <strong>Downgrades</strong> take effect at the next renewal.</li>
        <li>You may switch monthly ↔ annual; the annual discount applies from the next renewal.</li>
        <li>Prices are in Australian dollars. Where Ozly is registered for GST, GST is included and a compliant tax invoice is provided; you are responsible for any other taxes applicable to you.</li>
        <li>Failed or overdue payments may lead to suspension of Cover after a 7-day grace period (clause 13).</li>
      </ul>

      {/* 6 */}
      <h2 className="mt-10 text-lg font-semibold">6. Free trial</h2>
      <p className="mt-2 leading-relaxed">
        New Organisations receive a <strong>14-day free trial</strong>; no payment method is required
        to start. At the end of the trial you must add a payment method to keep Cover running. If you
        do not, Cover stops and your Members revert to self-paying their own Ozly access, with a
        7-day grace period before access is affected.
      </p>

      {/* 7 */}
      <h2 className="mt-10 text-lg font-semibold">7. ABN / PRO cover scheme</h2>
      <p className="mt-2 leading-relaxed">
        When you cover a Member&rsquo;s ABN or PRO access, your seat fee subsidises their Ozly
        subscription and their Ozly invoicing is <strong>directed to your Organisation</strong> while
        the Cover is active. <strong>This is not a restraint on the Member.</strong> The Member
        remains free to accept work from, and invoice, any other party by any means they choose. To
        additionally re-open Ozly invoicing to other clients while covered, the Member may purchase a
        personal top-up — a personal arrangement between the Member and the Apple App Store / Google
        Play, not Ozly or you.
      </p>
      <p className="mt-3 leading-relaxed">
        A Member can be sponsored by <strong>at most one</strong> Organisation at a time, and can
        release a Cover from their Ozly app at any time. Released or revoked Cover ends after a 7-day
        grace period.
      </p>

      {/* 8 */}
      <h2 className="mt-10 text-lg font-semibold">8. Members are not your employees</h2>
      <p className="mt-2 leading-relaxed">
        Ozly is a software tool and <strong>does not determine</strong> the legal character of your
        relationship with Members. You acknowledge that Members engage as independent sub-contractors
        under their own ABN and retain freedom to accept or decline engagements.{' '}
        <strong>The classification of each engagement, and all resulting obligations, are yours</strong>{' '}
        — including under the{' '}
        <a href="https://www.fairwork.gov.au/" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Fair Work Act 2009 (Cth)</a>,
        the ATO contractor/employee framework, the{' '}
        <strong>Superannuation Guarantee (Administration) Act 1992 (Cth)</strong> (payments wholly or
        principally for a person&rsquo;s labour may attract superannuation even where an ABN is held —
        s 12(3)), state <strong>payroll tax</strong> (&lsquo;relevant contract&rsquo; provisions) and
        state <strong>workers&rsquo; compensation</strong> (&lsquo;deemed worker&rsquo; provisions).
        Ozly gives no warranty, indemnity or compliance guarantee in respect of these obligations.
      </p>

      {/* 9 */}
      <h2 className="mt-10 text-lg font-semibold">9. No legal, tax or accounting advice</h2>
      <p className="mt-2 leading-relaxed">
        Nothing in the Org Portal, these Terms or our marketing constitutes legal, tax, accounting or
        compliance advice. Statements about the sub-contractor framework are general information only.
        You should obtain your own professional advice before relying on the service for compliance
        decisions.
      </p>

      {/* 10 */}
      <h2 className="mt-10 text-lg font-semibold">10. Your data &amp; privacy</h2>
      <p className="mt-2 leading-relaxed">
        We handle personal information in accordance with the Privacy Act 1988 (Cth) and the
        Australian Privacy Principles, as described in the{' '}
        <Link to="/privacy-policy/business" className="text-brand-600 hover:underline">Privacy — Business addendum</Link>.
        You see only the data your Members address to your Organisation; you never see their TFN, visa
        status, other clients&rsquo; invoices, or personal expenses. Invoice metadata delivered to your
        inbox is retained for <strong>7 years</strong> in line with ATO bookkeeping requirements (ITAA
        s 262A). A standard Data Processing Agreement is available on request.
      </p>

      {/* 11 */}
      <h2 className="mt-10 text-lg font-semibold">11. Data export &amp; portability</h2>
      <p className="mt-2 leading-relaxed">
        You may export your Organisation&rsquo;s data (invoices in CSV / PDF, member list, audit log)
        at any time. BAS-quarterly export and Xero / MYOB integration are available as add-ons. You
        retain access to your historical data for <strong>30 days</strong> after cancellation.
      </p>

      {/* 12 */}
      <h2 className="mt-10 text-lg font-semibold">12. Acceptable use &amp; intellectual property</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
        <li>You will not use the Org Portal for any unlawful purpose, to facilitate tax fraud or evasion, to misrepresent an employment relationship, or to harass or coerce Members.</li>
        <li>You retain ownership of the data you and your Members create. You grant Ozly a limited licence to host, process and display that data solely to provide the service.</li>
        <li>The Org Portal, its software, design and trademarks remain the property of Ozly. You receive a limited, non-exclusive, non-transferable, revocable licence to use it under these Terms.</li>
        <li>Each party will keep the other&rsquo;s non-public information confidential and use it only to perform under these Terms.</li>
      </ul>

      {/* 13 */}
      <h2 className="mt-10 text-lg font-semibold">13. Suspension, cancellation &amp; termination</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
        <li>You may cancel at any time via the Stripe Customer Portal. Cancellation takes effect at the end of the current billing period; Members lose Cover at that point with a 7-day grace window.</li>
        <li>We may suspend or terminate your account for non-payment, breach of these Terms, or where required by law, with reasonable notice where practicable.</li>
        <li>On termination, your licence to the Org Portal ends; clauses that by their nature should survive (data retention, confidentiality, liability, governing law) continue.</li>
      </ul>

      {/* 14 */}
      <h2 className="mt-10 text-lg font-semibold">14. Warranties, consumer law &amp; liability</h2>
      <p className="mt-2 leading-relaxed">
        The Org Portal is provided on an <strong>&ldquo;as is&rdquo; and &ldquo;as available&rdquo;</strong>{' '}
        basis. To the maximum extent permitted by law, we exclude all implied warranties and are not
        liable for indirect, incidental, special or consequential loss, or for loss of profits, data,
        business opportunities or goodwill. To the extent we can limit liability, our total liability
        is capped at the fees you paid us in the 12 months before the claim.
      </p>
      <p className="mt-3 leading-relaxed">
        <strong>Nothing in these Terms excludes, restricts or modifies any guarantee, right or remedy
        you have under the Australian Consumer Law</strong> or other law that cannot lawfully be
        excluded. Where the ACL applies and a guarantee cannot be excluded, our liability is limited
        (where permitted) to re-supplying the service or paying the cost of re-supply.
      </p>
      <p className="mt-3 leading-relaxed">
        We acknowledge that the unfair contract terms regime may apply to small-business customers.
        Annual plans paid in advance carry a <strong>14-day cooling-off period</strong> from the start
        of the cycle, during which you may cancel for a full refund of the prepaid amount; after that,
        annual fees are non-refundable except as required by law or where we are at fault (e.g.
        prolonged unavailability), in which case a fair pro-rata refund applies.
      </p>

      {/* 15 */}
      <h2 className="mt-10 text-lg font-semibold">15. Indemnity</h2>
      <p className="mt-2 leading-relaxed">
        You agree to indemnify Ozly against claims, losses and reasonable costs arising from your
        breach of these Terms, your misuse of the Org Portal, or your treatment or mis-classification
        of Members — except to the extent caused by Ozly&rsquo;s own breach or negligence.
      </p>

      {/* 16 */}
      <h2 className="mt-10 text-lg font-semibold">16. Changes to these Terms</h2>
      <p className="mt-2 leading-relaxed">
        We may update these Terms from time to time. Material changes will be notified by email or
        in-portal with a new &ldquo;Last updated&rdquo; date before they take effect. Continued use
        after that date constitutes acceptance.
      </p>

      {/* 17 */}
      <h2 className="mt-10 text-lg font-semibold">17. Governing law &amp; disputes</h2>
      <p className="mt-2 leading-relaxed">
        These Terms are governed by the laws of <strong>New South Wales, Australia</strong>. The
        parties will first attempt to resolve any dispute in good faith; failing that, the dispute may
        be brought before the courts of New South Wales, to whose jurisdiction the parties submit.
        Nothing limits either party&rsquo;s rights under the Australian Consumer Law or before any
        tribunal of competent jurisdiction.
      </p>

      <p className="mt-12 text-sm text-navy-400">
        Questions? <a href="mailto:augusto@ozly.app" className="text-brand-600 hover:underline">augusto@ozly.app</a>
      </p>
    </main>
  );
}
