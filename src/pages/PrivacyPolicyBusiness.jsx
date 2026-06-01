// V2 B2B addendum to the standard Privacy Policy. Linked from the Org Portal
// signup footer and the /business landing page. Covers data that flows when
// an org subscribes to Ozly: PII of sub-contractor members, invoice metadata,
// and the org owner's controller role.

import { Link } from 'react-router-dom';

export default function PrivacyPolicyBusiness() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-navy-800 sm:px-6">
      <p className="text-sm text-navy-400">
        <Link to="/" className="hover:underline">Ozly</Link> ·{' '}
        <Link to="/privacy-policy" className="hover:underline">Privacy Policy</Link> ·{' '}
        <span>Business addendum</span>
      </p>

      <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Privacy — Business addendum</h1>
      <p className="mt-2 text-sm text-navy-500">Last updated: 2026-05-31</p>

      <p className="mt-6 leading-relaxed">
        This addendum applies <strong>in addition to</strong> our standard{' '}
        <Link to="/privacy-policy" className="text-brand-600 hover:underline">Privacy Policy</Link>{' '}
        whenever you use Ozly as an Organisation (the <em>Org Portal</em>) — typically a cleaning
        company managing sub-contractors who use the Ozly app. It explains what personal information
        flows between you and us when you use the Org Portal, what rights your sub-contractors
        retain, and how we handle data shared with you about them.
      </p>

      <h2 className="mt-10 text-lg font-semibold">1. Roles under Australian Privacy Principles</h2>
      <p className="mt-2 leading-relaxed">
        Under the <strong>Privacy Act 1988 (Cth)</strong> and the <strong>Australian Privacy
        Principles (APPs)</strong>, both Ozly and your organisation are <strong>APP entities</strong>.
        For data your sub-contractors create in the Ozly app (jobs, invoices, payment confirmations
        sent to you), <strong>the member remains the individual to whom the information relates</strong>.
        When you receive that data in the Org Portal — invoice PDFs in your inbox, member earnings
        totals, hours visible in the Work tab — Ozly handles it <strong>on your behalf</strong> for
        bookkeeping/retention, and <strong>in its own right</strong> only for the minimal identifying
        details necessary to operate the engagement (name, email, role, billing cadence). We do not
        use the controller/processor distinction, which is an EU (GDPR) concept and does not apply
        under Australian law.
      </p>

      <h2 className="mt-10 text-lg font-semibold">2. What you see about your members</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
        <li>Name and contact email (from their Ozly profile)</li>
        <li>The invoices they have addressed to your organisation (only — never invoices to other
            clients, unless they explicitly chose to share)</li>
        <li>Hours of work logged against contractor records linked to your org</li>
        <li>Payment receipts they have confirmed for invoices you sent them</li>
      </ul>
      <p className="mt-3 leading-relaxed">
        You <strong>do not see</strong>: their ABN access cost (if they pay themselves), their
        TFN / tax records, their visa subclass, their personal expenses or income from other
        engagements, their location, their device IDs, or any aspect of their use of the Ozly app
        outside the work they did for your org.
      </p>

      <h2 className="mt-10 text-lg font-semibold">3. Sub-contractor relationship — not employment</h2>
      <p className="mt-2 leading-relaxed">
        Ozly does <strong>not</strong> create or imply an employment relationship between your org
        and the members. Members accept engagements individually under their own ABN, remain free
        to engage with other clients (unless covered by your ABN subsidy, in which case they may
        choose to add a personal top-up — see Terms §5), and are not your employees, agents,
        casuals, or contractors-at-will. You agree to treat them in line with the{' '}
        <a href="https://www.fairwork.gov.au/" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">Fair Work Act 2009 (Cth)</a>{' '}
        and the ATO's contractor/employee classification framework.
      </p>

      <h2 className="mt-10 text-lg font-semibold">4. Retention</h2>
      <p className="mt-2 leading-relaxed">
        For invoices delivered into your inbox we retain the metadata (sender, amount, status,
        delivered_to) for <strong>7 years</strong> in line with ATO bookkeeping requirements (ITAA
        s262A). Member contact info is retained as long as the membership is active and 30 days
        thereafter, then deleted unless required for an open invoice cycle. Members' Tax File Numbers
        are never exposed to your organisation and are handled by Ozly in accordance with the{' '}
        <strong>Tax File Number Rule 2015</strong> (s 17 Privacy Act).
      </p>

      <h2 className="mt-10 text-lg font-semibold">5. Your access and your members' access</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
        <li>Members can revoke their membership at any time in the Ozly app. We notify you, then
            stop showing their data to you within 24 hours (cached PDFs remain in your inbox).</li>
        <li>If you delete your org from Ozly, members remain unaffected — their personal Ozly
            account, their tax records and their invoices to other clients are untouched.</li>
        <li>To exercise an access / correction / deletion request affecting member data, contact us
            at <a href="mailto:augusto@ozly.au" className="text-brand-600 hover:underline">augusto@ozly.au</a>.</li>
      </ul>
      <p className="mt-3 leading-relaxed">
        We maintain a data-breach response process consistent with the Notifiable Data Breaches
        scheme under the Privacy Act, as amended in 2024.
      </p>

      <h2 className="mt-10 text-lg font-semibold">6. Data Processing Agreement (DPA)</h2>
      <p className="mt-2 leading-relaxed">
        We provide a standard DPA on request for B2B accounts that need one (typical for orgs over
        15 seats). Email us and we'll send a PDF within 2 business days.
      </p>

      <p className="mt-12 text-sm text-navy-400">
        Questions? <a href="mailto:augusto@ozly.au" className="text-brand-600 hover:underline">augusto@ozly.au</a>
      </p>
    </main>
  );
}
