// /business — B2B landing page for the Org Portal.
// Linked from the marketing nav (footer) and inbound channels. CTAs go to the
// Org Portal signup (app.ozly.au/signup) — Cloudflare DNS resolves that to
// the React app deployed by org-portal.yml.

import { Link } from 'react-router-dom';

const ORG_PORTAL = 'https://app.ozly.au';

export default function BusinessLanding() {
  return (
    <main className="text-navy-800">
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-50 to-white px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">For cleaning organisations</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-navy-800 sm:text-5xl">
            Manage your sub-contractors without spreadsheets
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-navy-600">
            Ozly for Organisations gives you a single place to invite sub-contractors, receive their
            invoices, pay them, and (optionally) cover their ABN access — with sub-contractor
            relationships kept clean and properly documented. You stay in control of your Fair Work,
            super and tax obligations; Ozly keeps the paperwork.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`${ORG_PORTAL}/signup`}
              className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-500"
            >
              Start free 14-day trial
            </a>
            <a
              href="#pricing"
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-navy-700 ring-1 ring-navy-200 hover:bg-navy-50"
            >
              See pricing
            </a>
          </div>
          <p className="mt-3 text-xs text-navy-400">No payment method required to start.</p>
        </div>
      </section>

      {/* Value props */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card title="Invoices flow in" body="Your sub-contractors emit their own ABN invoices in the Ozly app — you receive them in the portal Inbox, ready to pay or export." />
          <Card title="Cover ABN access (optional)" body="From $7.99/seat/mo, cover your sub-contractors' ABN access on Ozly. While you cover their access, their Ozly invoicing is set to your org. They stay free to work and bill anyone else — a $5/mo personal top-up simply re-opens Ozly invoicing to other clients too." />
          <Card title="Built on the sub-contractor framework" body="Ozly is a record-keeping tool, not your employer-of-record. Flows and retention are built around the sub-contractor framework — but your Fair Work, super, payroll-tax and workers'-comp obligations remain yours. We help you document them, not avoid them." />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-navy-50/50 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center font-display text-3xl font-bold tracking-tight text-navy-800">Pricing per seat</h2>
          <p className="mt-2 text-center text-navy-500">Commitment-based, per-seat, AUD inc. GST. Annual saves 17%.</p>

          <div className="mt-10 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-navy-100">
            <table className="w-full text-left">
              <thead className="bg-navy-50 text-xs uppercase tracking-wider text-navy-500">
                <tr>
                  <th className="px-4 py-3 sm:px-6">Tier</th>
                  <th className="px-4 py-3 sm:px-6">Seats</th>
                  <th className="px-4 py-3 text-right sm:px-6">Monthly</th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell sm:px-6">Annual</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <PricingRow tier="Crew" seats="1–5" m="$14.99" a="$149.90" />
                <PricingRow tier="Squad" seats="6–15" m="$12.99" a="$129.90" highlight />
                <PricingRow tier="Fleet" seats="16–30" m="$9.99" a="$99.90" />
                <PricingRow tier="Operation" seats="31–100" m="$7.99" a="$79.90" />
                <PricingRow tier="Custom" seats="100+" m="contact" a="contact" />
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-center text-xs text-navy-400">
            Add-ons (Visa Shield, Xero/MYOB export, SLA, white-label) launch in Phase 3.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl rounded-2xl bg-navy-700 px-6 py-12 text-center text-white shadow-lg sm:px-10">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Try it free for 14 days</h2>
          <p className="mt-3 text-sm text-navy-200">No card required. Invite your first sub-contractor in 2 minutes.</p>
          <a
            href={`${ORG_PORTAL}/signup`}
            className="mt-6 inline-block rounded-lg bg-brand-500 px-6 py-3 text-sm font-semibold text-navy-900 hover:bg-brand-400"
          >
            Open the portal →
          </a>
        </div>
      </section>

      <footer className="px-4 py-8 text-center text-xs text-navy-400 sm:px-6">
        <Link to="/terms-of-service" className="hover:underline">Terms of Service</Link>
        <span className="mx-2">·</span>
        <Link to="/privacy-policy/business" className="hover:underline">Privacy — Business</Link>
        <span className="mx-2">·</span>
        <a href="mailto:augusto@ozly.au" className="hover:underline">augusto@ozly.au</a>
      </footer>
    </main>
  );
}

function Card({ title, body }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-navy-100">
      <h3 className="font-display text-lg font-bold text-navy-800">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-navy-600">{body}</p>
    </div>
  );
}

function PricingRow({ tier, seats, m, a, highlight = false }) {
  return (
    <tr className={`border-t border-navy-100 ${highlight ? 'bg-brand-50/40 font-medium' : ''}`}>
      <td className="px-4 py-3 sm:px-6">{tier}{highlight && <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-brand-700">Popular</span>}</td>
      <td className="px-4 py-3 sm:px-6">{seats}</td>
      <td className="px-4 py-3 text-right sm:px-6">{m}{m !== 'contact' && <span className="ml-1 text-xs text-navy-400">/seat</span>}</td>
      <td className="hidden px-4 py-3 text-right sm:table-cell sm:px-6">{a}{a !== 'contact' && <span className="ml-1 text-xs text-navy-400">/seat/yr</span>}</td>
    </tr>
  );
}
