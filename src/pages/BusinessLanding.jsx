// /business — B2B landing page for the Org Portal ("Ozly for Organisations").
// Linked from the home hero audience split, navbar and footer. CTAs go to the
// Org Portal signup (app.ozly.au/signup) — Cloudflare DNS resolves that to
// the React app deployed by org-portal.yml.
//
// Visual language: Apple-style — typography-first, generous whitespace,
// borderless soft-fill tiles (#f5f5f7), a dark "privacy" band for the
// compliance story, hairline dividers, one CSS-drawn portal mockup instead
// of stock imagery. Copy is i18n'd (t.business.*) and deliberately mirrors
// the legal docs: /terms-of-service and /privacy-policy/business. If pricing
// changes, update BOTH this table and the org-portal billing page.

import { useEffect } from 'react';
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
import { useI18n, useSeoMeta } from '../i18n';
import { trackEvent } from '../lib/track';

const ORG_PORTAL = 'https://app.ozly.au';

// Signup deep-link with attribution: which placement converted (hero,
// pricing row, final band) survives into the portal's analytics via UTM.
function signupHref(placement, plan) {
  const params = new URLSearchParams({
    utm_source: 'ozly_web',
    utm_medium: 'website',
    utm_campaign: `business_${placement}`,
  });
  if (plan) params.set('plan', plan);
  return `${ORG_PORTAL}/signup?${params}`;
}

export default function BusinessLanding() {
  const { t, lang } = useI18n();
  const b = t.business;
  useSeoMeta('business');

  const trackSignup = (placement, plan) => () =>
    trackEvent('cta_click', { cta: 'business_signup', placement, plan, lang });

  // Landing here counts as choosing "business" for this visit — going back
  // to the home in the same session shouldn't re-open the audience gate.
  useEffect(() => {
    try {
      window.sessionStorage.setItem('ozly_audience', 'business');
    } catch {
      /* best-effort only */
    }
  }, []);

  const features = [
    { icon: Inbox, title: b.feat1Title, body: b.feat1Body, wide: true },
    { icon: LayoutDashboard, title: b.feat2Title, body: b.feat2Body },
    { icon: BadgeCheck, title: b.feat3Title, body: b.feat3Body },
    { icon: HandCoins, title: b.feat4Title, body: b.feat4Body, wide: true },
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
    <main className="bg-white text-navy-800 dark:bg-slate-950 dark:text-slate-100">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="px-6 pb-16 pt-36 sm:pb-20 sm:pt-44">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-brand-600">
            {b.eyebrow}
          </p>
          <h1 className="mt-4 text-[40px] font-semibold leading-[1.05] tracking-tight text-navy-800 dark:text-white sm:text-6xl">
            {b.heroTitle}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-slate-500 dark:text-slate-400 sm:text-lg">
            {b.heroSubtitle}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-5">
            <a
              href={signupHref('hero')}
              onClick={trackSignup('hero')}
              className="rounded-full bg-brand-600 px-7 py-3 text-[15px] font-medium text-white transition-colors hover:bg-brand-500"
            >
              {b.ctaTrial}
            </a>
            <a
              href="#pricing"
              className="text-[15px] font-medium text-brand-600 transition-colors hover:text-brand-500"
            >
              {b.ctaPricing} →
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">{b.noCard}</p>
        </div>

        {/* CSS-drawn portal preview — no stock screenshots, no AI art */}
        <PortalMock className="mx-auto mt-16 max-w-4xl" />
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-navy-800 dark:text-white sm:text-4xl">
            {b.howTitle}
          </h2>
          <div className="mt-14 grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-10">
            <Step n="01" title={b.how1Title} body={b.how1Body} />
            <Step n="02" title={b.how2Title} body={b.how2Body} />
            <Step n="03" title={b.how3Title} body={b.how3Body} />
          </div>
        </div>
      </section>

      {/* ── Portal features (bento) ──────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-navy-800 dark:text-white sm:text-4xl">
            {b.featTitle}
          </h2>
          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, body, wide }) => (
              <div
                key={title}
                className={`rounded-3xl bg-[#f5f5f7] p-7 dark:bg-slate-800/60 sm:p-8 ${
                  wide ? 'sm:col-span-2' : ''
                }`}
              >
                <Icon size={22} strokeWidth={1.6} className="text-brand-600 dark:text-brand-400" />
                <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-navy-800 dark:text-white">
                  {title}
                </h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────── */}
      <section id="pricing" className="scroll-mt-20 px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-navy-800 dark:text-white sm:text-4xl">
            {b.pricingTitle}
          </h2>
          <p className="mt-3 text-center text-[15px] text-slate-500 dark:text-slate-400">
            {b.pricingSubtitle}
          </p>

          <table className="mt-12 w-full text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                <th className="pb-3 font-medium">{b.thTier}</th>
                <th className="pb-3 font-medium">{b.thSeats}</th>
                <th className="pb-3 text-right font-medium">{b.thMonthly}</th>
                <th className="hidden pb-3 text-right font-medium sm:table-cell">{b.thAnnual}</th>
                <th className="pb-3" aria-hidden="true" />
              </tr>
            </thead>
            <tbody className="text-[15px]">
              <PricingRow tier="Crew" seats="1–5" m="$14.99" a="$149.90" b={b} onSelect={trackSignup('pricing', 'crew')} />
              <PricingRow tier="Squad" seats="6–15" m="$12.99" a="$129.90" b={b} highlight onSelect={trackSignup('pricing', 'squad')} />
              <PricingRow tier="Fleet" seats="16–30" m="$9.99" a="$99.90" b={b} onSelect={trackSignup('pricing', 'fleet')} />
              <PricingRow tier="Operation" seats="31–100" m="$7.99" a="$79.90" b={b} onSelect={trackSignup('pricing', 'operation')} />
              <PricingRow tier="Custom" seats="100+" m={b.contact} a={b.contact} b={b} isContact onSelect={trackSignup('pricing', 'custom')} />
            </tbody>
          </table>

          {/* Mobile fallback — the per-row buttons are hidden on small screens */}
          <div className="mt-8 text-center sm:hidden">
            <a
              href={signupHref('pricing')}
              onClick={trackSignup('pricing')}
              className="inline-block rounded-full bg-brand-600 px-7 py-3 text-[15px] font-medium text-white transition-colors hover:bg-brand-500"
            >
              {b.ctaTrial}
            </a>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">{b.addons}</p>
        </div>
      </section>

      {/* ── Compliance — dark privacy band ───────────────────────────── */}
      <section className="bg-navy-900 px-6 py-20 dark:bg-black sm:py-28">
        <div className="mx-auto max-w-5xl">
          <h2 className="mx-auto max-w-2xl text-center text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {b.legalTitle}
          </h2>
          <div className="mt-14 grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-10">
            {legalCards.map(({ icon: Icon, title, body }) => (
              <div key={title} className="text-center md:text-left">
                <Icon size={24} strokeWidth={1.6} className="mx-auto text-lime-400 md:mx-0" />
                <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-white">{title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-slate-400">{body}</p>
              </div>
            ))}
          </div>
          <p className="mt-14 text-center text-[13px] text-slate-500">
            {b.legalLinks}{' '}
            <Link to="/terms-of-service" className="text-slate-300 underline-offset-4 hover:underline">
              {b.legalTos}
            </Link>
            <span className="mx-2">·</span>
            <Link to="/privacy-policy/business" className="text-slate-300 underline-offset-4 hover:underline">
              {b.legalPrivacy}
            </Link>
            <span className="mx-2">·</span>
            <Link to="/guide/business" className="text-slate-300 underline-offset-4 hover:underline">
              {b.guideLink}
            </Link>
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-navy-800 dark:text-white sm:text-4xl">
            {b.faqTitle}
          </h2>
          <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {faqs.map(({ q, a }) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-navy-800 dark:text-white">
                  {q}
                  <ChevronDown
                    size={16}
                    className="shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="mt-3 max-w-[60ch] text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="px-6 pb-28 pt-8 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-navy-800 dark:text-white sm:text-4xl">
          {b.finalTitle}
        </h2>
        <p className="mt-3 text-[15px] text-slate-500 dark:text-slate-400">{b.finalSub}</p>
        <a
          href={signupHref('final')}
          onClick={trackSignup('final')}
          className="mt-8 inline-block rounded-full bg-brand-600 px-7 py-3 text-[15px] font-medium text-white transition-colors hover:bg-brand-500"
        >
          {b.finalCta}
        </a>
      </section>
    </main>
  );
}

/* ── pieces ──────────────────────────────────────────────────────────── */

function Step({ n, title, body }) {
  return (
    <div>
      <span className="text-5xl font-semibold tracking-tight text-slate-200 dark:text-slate-700">
        {n}
      </span>
      <h3 className="mt-3 text-[17px] font-semibold tracking-tight text-navy-800 dark:text-white">
        {title}
      </h3>
      <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500 dark:text-slate-400">{body}</p>
    </div>
  );
}

function PricingRow({ tier, seats, m, a, b, highlight = false, isContact = false, onSelect }) {
  return (
    <tr className="border-t border-slate-200/80 dark:border-slate-800">
      <td className="py-4 font-medium text-navy-800 dark:text-white">
        {tier}
        {highlight && (
          <span className="ml-2 align-middle text-[11px] font-semibold uppercase tracking-wider text-brand-600">
            {b.popular}
          </span>
        )}
      </td>
      <td className="py-4 text-slate-500 dark:text-slate-400">{seats}</td>
      <td className="py-4 text-right tabular-nums">
        {m}
        {!isContact && <span className="ml-1 text-xs text-slate-400">{b.perSeat}</span>}
      </td>
      <td className="hidden py-4 text-right tabular-nums sm:table-cell">
        {a}
        {!isContact && <span className="ml-1 text-xs text-slate-400">{b.perSeatYr}</span>}
      </td>
      {/* Row-level action — nobody should have to hunt for the signup button
          after picking a tier. Hidden on mobile (single CTA under the table). */}
      <td className="hidden py-4 pl-4 text-right sm:table-cell">
        <a
          href={isContact ? 'mailto:contact@ozly.com.au' : signupHref('pricing', tier.toLowerCase())}
          onClick={onSelect}
          className={`inline-block whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
            highlight
              ? 'bg-brand-600 text-white hover:bg-brand-500'
              : 'border border-slate-300 text-navy-800 hover:border-brand-400 hover:text-brand-600 dark:border-slate-600 dark:text-slate-200'
          }`}
        >
          {isContact ? b.contact : b.rowCta}
        </a>
      </td>
    </tr>
  );
}

/**
 * A small, honest mock of the portal inbox drawn entirely in CSS — enough to
 * show "invoices land here" without screenshots that age or stocky AI art.
 * Decorative only (aria-hidden); the real thing lives at app.ozly.au.
 */
function PortalMock({ className = '' }) {
  const rows = [
    { initials: 'MM', name: 'Maria M.', amount: '$840.00', tone: 'new' },
    { initials: 'JS', name: 'João S.', amount: '$1,210.50', tone: 'paid' },
    { initials: 'AL', name: 'Anh L.', amount: '$465.00', tone: 'paid' },
  ];
  const chip = {
    new: 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
    paid: 'bg-lime-50 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
  };
  return (
    <div aria-hidden="true" className={className}>
      <div className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
        {/* window chrome */}
        <div className="flex items-center gap-2 bg-[#f5f5f7] px-4 py-3 dark:bg-slate-800">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="mx-auto rounded-md bg-white px-12 py-1 text-[11px] text-slate-400 shadow-sm dark:bg-slate-700 dark:text-slate-400">
            app.ozly.au
          </span>
          <span className="w-14" />
        </div>
        <div className="grid grid-cols-[150px_1fr] max-sm:grid-cols-1">
          {/* sidebar */}
          <div className="hidden border-r border-slate-100 p-4 text-[13px] dark:border-slate-800 sm:block">
            <div className="space-y-1 text-slate-500 dark:text-slate-400">
              <div className="rounded-lg px-3 py-1.5">Dashboard</div>
              <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-1.5 font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                Inbox
                <span className="rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold text-white">3</span>
              </div>
              <div className="rounded-lg px-3 py-1.5">Invoices</div>
              <div className="rounded-lg px-3 py-1.5">Members</div>
              <div className="rounded-lg px-3 py-1.5">Billing</div>
            </div>
          </div>
          {/* inbox rows */}
          <div className="p-5 sm:p-6">
            <div className="text-[15px] font-semibold tracking-tight text-navy-800 dark:text-white">
              Inbox
            </div>
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map(({ initials, name, amount, tone }) => (
                <div key={initials} className="flex items-center gap-3 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7] text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-navy-800 dark:text-white">
                      {name}
                    </div>
                    <div className="text-[11px] text-slate-400">Invoice</div>
                  </div>
                  <span className="text-[13px] font-medium tabular-nums text-navy-800 dark:text-white">
                    {amount}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${chip[tone]}`}>
                    {tone}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
