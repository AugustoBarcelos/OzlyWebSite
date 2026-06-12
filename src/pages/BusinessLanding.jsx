// /business — B2B landing page for the Org Portal ("Ozly for Organisations").
// Linked from the home hero audience split, navbar and footer. CTAs go to the
// Org Portal signup (app.ozly.au/signup) — Cloudflare DNS resolves that to
// the React app deployed by org-portal.yml.
//
// Copy is i18n'd (t.business.*) and deliberately mirrors the legal docs:
// /terms-of-service (tiers, seats, cover, not-employer-of-record) and
// /privacy-policy/business (what orgs see / never see, 7-year retention,
// DPA for 15+ seats). If pricing changes, update BOTH this page's table and
// the org-portal billing page.

import { Link } from 'react-router-dom';
import {
  Inbox,
  LayoutDashboard,
  BadgeCheck,
  HandCoins,
  History,
  FileDown,
  ShieldCheck,
  EyeOff,
  Archive,
  ChevronDown,
} from 'lucide-react';
import { useI18n } from '../i18n';

const ORG_PORTAL = 'https://app.ozly.au';

export default function BusinessLanding() {
  const { t } = useI18n();
  const b = t.business;

  const features = [
    { icon: Inbox, title: b.feat1Title, body: b.feat1Body },
    { icon: LayoutDashboard, title: b.feat2Title, body: b.feat2Body },
    { icon: BadgeCheck, title: b.feat3Title, body: b.feat3Body },
    { icon: HandCoins, title: b.feat4Title, body: b.feat4Body },
    { icon: History, title: b.feat5Title, body: b.feat5Body },
    { icon: FileDown, title: b.feat6Title, body: b.feat6Body },
  ];

  const legalCards = [
    { icon: ShieldCheck, title: b.legal1Title, body: b.legal1Body },
    { icon: EyeOff, title: b.legal2Title, body: b.legal2Body },
    { icon: Archive, title: b.legal3Title, body: b.legal3Body },
  ];

  const faqs = [
    { q: b.faq1Q, a: b.faq1A },
    { q: b.faq2Q, a: b.faq2A },
    { q: b.faq3Q, a: b.faq3A },
    { q: b.faq4Q, a: b.faq4A },
    { q: b.faq5Q, a: b.faq5A },
  ];

  return (
    <main className="text-navy-800 dark:text-slate-100">
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-50 to-white dark:from-slate-900 dark:to-slate-800 px-4 pt-32 pb-20 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">{b.eyebrow}</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-navy-800 dark:text-white sm:text-5xl">
            {b.heroTitle}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-navy-600 dark:text-slate-300">
            {b.heroSubtitle}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`${ORG_PORTAL}/signup`}
              className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-500"
            >
              {b.ctaTrial}
            </a>
            <a
              href="#pricing"
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-navy-700 ring-1 ring-navy-200 hover:bg-navy-50"
            >
              {b.ctaPricing}
            </a>
          </div>
          <p className="mt-3 text-xs text-navy-400 dark:text-slate-400">{b.noCard}</p>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-3xl font-bold tracking-tight text-navy-800 dark:text-white">
            {b.howTitle}
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <StepCard title={b.how1Title} body={b.how1Body} />
            <StepCard title={b.how2Title} body={b.how2Body} />
            <StepCard title={b.how3Title} body={b.how3Body} />
          </div>
        </div>
      </section>

      {/* Portal features */}
      <section className="bg-navy-50/50 dark:bg-slate-800/40 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-3xl font-bold tracking-tight text-navy-800 dark:text-white">
            {b.featTitle}
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm ring-1 ring-navy-100 dark:ring-slate-700">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/30">
                  <Icon size={20} className="text-brand-600" />
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-navy-800 dark:text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-600 dark:text-slate-300">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center font-display text-3xl font-bold tracking-tight text-navy-800 dark:text-white">
            {b.pricingTitle}
          </h2>
          <p className="mt-2 text-center text-navy-500 dark:text-slate-400">{b.pricingSubtitle}</p>

          <div className="mt-10 overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-sm ring-1 ring-navy-100 dark:ring-slate-700">
            <table className="w-full text-left">
              <thead className="bg-navy-50 dark:bg-slate-700/50 text-xs uppercase tracking-wider text-navy-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 sm:px-6">{b.thTier}</th>
                  <th className="px-4 py-3 sm:px-6">{b.thSeats}</th>
                  <th className="px-4 py-3 text-right sm:px-6">{b.thMonthly}</th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell sm:px-6">{b.thAnnual}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <PricingRow tier="Crew" seats="1–5" m="$14.99" a="$149.90" b={b} />
                <PricingRow tier="Squad" seats="6–15" m="$12.99" a="$129.90" b={b} highlight />
                <PricingRow tier="Fleet" seats="16–30" m="$9.99" a="$99.90" b={b} />
                <PricingRow tier="Operation" seats="31–100" m="$7.99" a="$79.90" b={b} />
                <PricingRow tier="Custom" seats="100+" m={b.contact} a={b.contact} b={b} isContact />
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-center text-xs text-navy-400 dark:text-slate-500">{b.addons}</p>
        </div>
      </section>

      {/* Compliance & legal */}
      <section className="bg-navy-50/50 dark:bg-slate-800/40 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-3xl font-bold tracking-tight text-navy-800 dark:text-white">
            {b.legalTitle}
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {legalCards.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm ring-1 ring-navy-100 dark:ring-slate-700">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-50 dark:bg-lime-900/30">
                  <Icon size={20} className="text-lime-600" />
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-navy-800 dark:text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-600 dark:text-slate-300">{body}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-navy-400 dark:text-slate-500">
            {b.legalLinks}{' '}
            <Link to="/terms-of-service" className="underline hover:text-brand-600">{b.legalTos}</Link>
            <span className="mx-1.5">·</span>
            <Link to="/privacy-policy/business" className="underline hover:text-brand-600">{b.legalPrivacy}</Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-display text-3xl font-bold tracking-tight text-navy-800 dark:text-white">
            {b.faqTitle}
          </h2>
          <div className="mt-8 space-y-3">
            {faqs.map(({ q, a }) => (
              <details
                key={q}
                className="group rounded-2xl bg-white dark:bg-slate-800 px-5 py-4 shadow-sm ring-1 ring-navy-100 dark:ring-slate-700"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-navy-800 dark:text-white">
                  {q}
                  <ChevronDown size={16} className="shrink-0 text-navy-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-navy-600 dark:text-slate-300">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-2xl rounded-2xl bg-navy-700 px-6 py-12 text-center text-white shadow-lg sm:px-10">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">{b.finalTitle}</h2>
          <p className="mt-3 text-sm text-navy-200">{b.finalSub}</p>
          <a
            href={`${ORG_PORTAL}/signup`}
            className="mt-6 inline-block rounded-lg bg-brand-500 px-6 py-3 text-sm font-semibold text-navy-900 hover:bg-brand-400"
          >
            {b.finalCta} →
          </a>
        </div>
      </section>
    </main>
  );
}

function StepCard({ title, body }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm ring-1 ring-navy-100 dark:ring-slate-700">
      <h3 className="font-display text-lg font-bold text-navy-800 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-navy-600 dark:text-slate-300">{body}</p>
    </div>
  );
}

function PricingRow({ tier, seats, m, a, b, highlight = false, isContact = false }) {
  return (
    <tr className={`border-t border-navy-100 dark:border-slate-700 ${highlight ? 'bg-brand-50/40 dark:bg-brand-900/20 font-medium' : ''}`}>
      <td className="px-4 py-3 sm:px-6">
        {tier}
        {highlight && (
          <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-brand-700">
            {b.popular}
          </span>
        )}
      </td>
      <td className="px-4 py-3 sm:px-6">{seats}</td>
      <td className="px-4 py-3 text-right sm:px-6">
        {m}
        {!isContact && <span className="ml-1 text-xs text-navy-400 dark:text-slate-500">{b.perSeat}</span>}
      </td>
      <td className="hidden px-4 py-3 text-right sm:table-cell sm:px-6">
        {a}
        {!isContact && <span className="ml-1 text-xs text-navy-400 dark:text-slate-500">{b.perSeatYr}</span>}
      </td>
    </tr>
  );
}
