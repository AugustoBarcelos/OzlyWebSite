/**
 * Post-build: emit per-route index.html files with unique SEO metadata
 * (title, description, canonical, Open Graph) and pre-rendered H1 + body
 * content. React replaces #root on mount; crawlers see the static content.
 *
 * Static HTML files already shipped in public/ (privacy-policy, terms-of-use,
 * delete-account, refer) are preserved.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, "..", "dist");

const ORIGIN = "https://ozly.au";

const routes = [
  {
    path: "/",
    title: "Ozly — Free Invoicing & Tax Tracker for Australian Sole Traders",
    description:
      "Ozly helps Australian sole traders, contractors, and tradies send unlimited invoices, scan receipts, track expenses, and stay on top of GST and PAYG tax. Free on iOS and Android.",
    h1: "Ozly — Free Invoicing & Tax Tracker for Australian Sole Traders",
    body: `
      <p>Ozly is the free, all-in-one mobile app built for Australian sole traders, independent contractors, tradies, freelancers, and small-business owners. From the moment you register an ABN, Ozly helps you run every financial side of your business: unlimited professional invoices, AI receipt scanning, ATO-aligned expense tracking, real-time GST estimates, PAYG income-tax projections, jobs and quotes, contractor payments, and end-of-financial-year reporting — all from your phone, on iOS or Android, with encrypted cloud sync across devices.</p>

      <h2>Invoicing without limits</h2>
      <p>Create and send professional invoices in under a minute. Add line items, GST (10%), PAYG withholding, due dates, purchase orders, and custom notes. Attach your logo and payment details. Track payment status in real time, send automatic reminders for overdue invoices, and keep a clean audit trail. There are no monthly invoice caps, no per-invoice fees, and no paywalls on the basics — unlimited invoicing is free for every Ozly user.</p>

      <h2>AI-powered receipt scanning</h2>
      <p>Scan any paper or digital receipt with your phone camera. Ozly's AI reads the total, date, supplier, GST amount, and product category automatically, so you never type an expense by hand. Matched receipts are saved to encrypted cloud storage and linked back to the right job or tax period. At tax time, everything is already sorted, categorised, and export-ready.</p>

      <h2>Expense tracking aligned with the ATO</h2>
      <p>Every expense category in Ozly maps to a deductible classification recognised by the Australian Taxation Office: motor vehicle, tools and equipment, phone and internet, home office, subscriptions, travel, uniforms, training, and more. Add mileage with the built-in logbook, split mixed-use purchases, and attach notes for audit evidence. Your deductions stay defensible, so at EOFY you pay what you owe — and not a dollar more.</p>

      <h2>Live GST, BAS & PAYG estimates</h2>
      <p>Ozly's tax dashboard updates every time you invoice or spend. See exactly what you owe in GST this quarter, how your BAS is shaping up, and your projected PAYG instalment for the year. Get alerts before you cross the $75,000 GST registration threshold. Export BAS-ready summaries directly to your accountant or straight into the ATO Business Portal.</p>

      <h2>Jobs, quotes & contractor payments</h2>
      <p>Quote jobs, schedule work, track materials, and convert accepted quotes to invoices with one tap. Manage subbies and contractors, capture their ABN details, track what you paid them across the year, and generate Taxable Payments Annual Report (TPAR) data when the ATO needs it. Ideal for cleaners, tradies, delivery drivers, bike mechanics, hair stylists, freelance consultants, and cafe owners with a second income.</p>

      <h2>Built specifically for Australian sole traders</h2>
      <p>Ozly is not a generic bookkeeping tool retrofitted for Australia. It is designed from day one around the Australian Taxation Office, the Australian Privacy Principles, and the realities of sole-trader life. The app ships in English, Portuguese, and Spanish so newcomers and migrant workers feel at home. Whether you are cleaning homes in Sydney, fixing bikes in Melbourne, delivering food in Brisbane, styling hair in Perth, or running a cafe on the side in Adelaide, Ozly keeps your books tidy, your GST tracked, and your tax reports ready for the ATO.</p>

      <h2>Free forever on the basics</h2>
      <p>Unlimited invoices, unlimited expenses, unlimited receipts, and live tax estimates are included at no cost. Ozly Pro unlocks advanced reports, multi-business support, contractor batch payments, and priority human support — for a flat, transparent monthly price. No lock-in contracts, no setup fees, no surprise charges, cancel anytime. Your data is always yours, always exportable.</p>

      <h2>Private, secure, Australian-owned</h2>
      <p>Your data is encrypted in transit and at rest. You decide what syncs to the cloud and what stays on-device. We never sell your data. Ozly is operated by Ozly Pty Ltd, based in Australia, and complies with the Privacy Act 1988 and the Australian Privacy Principles. Delete your account at any time and every byte of your data is permanently purged within 30 days.</p>

      <h2>Get started with Ozly in 2 minutes</h2>
      <p>Install Ozly on your phone, sign up with Apple, Google, or email, add your ABN, and send your first invoice before the kettle boils. No credit card required, no demo call, no trial timer.</p>
      <p><a href="https://apps.apple.com/app/ozly/id6760398649">Download Ozly on the App Store</a> · <a href="https://play.google.com/store/apps/details?id=com.augusto.ozly">Get Ozly on Google Play</a></p>
      <p>Need more detail? Read the full <a href="/guide">Ozly user guide</a>, browse the <a href="/support">Support &amp; FAQ</a>, or review our <a href="/privacy-policy">Privacy Policy</a> and <a href="/terms-of-use">Terms of Use</a>.</p>
    `,
  },
  {
    path: "/support",
    title: "Ozly Support & FAQ — Help for Australian Sole Traders",
    description:
      "Answers to common questions about Ozly: invoicing, expenses, GST, PAYG tax, receipt scanning, subscriptions, and account management for Australian sole traders and contractors.",
    h1: "Ozly Support & Frequently Asked Questions",
    body: `
      <p>Find answers to the most common questions about using Ozly — the free invoicing and tax app for Australian sole traders. Our FAQ covers account setup, invoicing, expenses, GST, PAYG tax, receipts, subscriptions, and more.</p>

      <h2>Popular topics</h2>
      <ul>
        <li><strong>Getting started:</strong> Create your account, set up your ABN, and send your first invoice in minutes.</li>
        <li><strong>Invoicing:</strong> Add line items, GST, PAYG withholding, due dates, and track payments.</li>
        <li><strong>Expenses &amp; receipts:</strong> Scan receipts with your camera and categorise deductible expenses.</li>
        <li><strong>Tax:</strong> Understand GST thresholds, BAS, PAYG instalments, and end-of-financial-year reports.</li>
        <li><strong>Jobs &amp; contractors:</strong> Manage clients, quotes, recurring jobs, and contractor payments.</li>
        <li><strong>Subscriptions:</strong> Free vs. Pro, cancellations, refunds, and App Store / Play Store billing.</li>
      </ul>

      <h2>Need personal help?</h2>
      <p>Email us at <!--email_off--><a href="mailto:support@ozly.au">support@ozly.au</a><!--/email_off--> or check the full <a href="/guide">Ozly user guide</a> for step-by-step instructions.</p>
    `,
  },
  {
    path: "/guide",
    title: "Ozly User Guide — How to Invoice, Track Expenses & Manage Tax",
    description:
      "Step-by-step Ozly user guide for Australian sole traders: create invoices, scan receipts, manage jobs and contractors, track GST and PAYG tax, and close out the financial year.",
    h1: "Ozly User Guide",
    body: `
      <p>The Ozly user guide walks you through every feature of the app, with screenshots and step-by-step instructions written for Australian sole traders, contractors, and tradies.</p>

      <h2>What is covered</h2>
      <ul>
        <li><strong>Getting started:</strong> Creating an account, setting up your ABN, and choosing your plan.</li>
        <li><strong>Dashboard:</strong> Reading your income, expense, GST, and tax estimates at a glance.</li>
        <li><strong>Invoicing:</strong> Creating and sending invoices, adding GST and PAYG withholding, tracking payments.</li>
        <li><strong>Expenses:</strong> Capturing receipts, matching categories, and claiming ATO-deductible expenses.</li>
        <li><strong>Jobs:</strong> Quoting, scheduling, completing, and invoicing jobs for clients.</li>
        <li><strong>Contractors:</strong> Paying subbies, tracking contractor totals, and preparing TPAR data.</li>
        <li><strong>Tax reports:</strong> GST, BAS, PAYG instalments, and end-of-financial-year summaries.</li>
        <li><strong>Settings:</strong> Business details, invoice branding, notifications, language, and sync.</li>
      </ul>

      <h2>Questions?</h2>
      <p>Visit the <a href="/support">Support &amp; FAQ</a> page or email <!--email_off--><a href="mailto:support@ozly.au">support@ozly.au</a><!--/email_off-->.</p>
    `,
  },
];

const srcHtml = readFileSync(join(dist, "index.html"), "utf8");

function escapeAttr(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function render(route) {
  const canonical = `${ORIGIN}${route.path === "/" ? "/" : route.path}`;
  const titleAttr = escapeAttr(route.title);
  const descAttr = escapeAttr(route.description);

  let html = srcHtml;

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${route.title}</title>`);
  html = html.replace(
    /<meta name="description"[^>]*>/,
    `<meta name="description" content="${descAttr}" />`
  );
  html = html.replace(
    /<link rel="canonical"[^>]*>/,
    `<link rel="canonical" href="${canonical}" />`
  );
  html = html.replace(
    /<meta property="og:title"[^>]*>/,
    `<meta property="og:title" content="${titleAttr}" />`
  );
  html = html.replace(
    /<meta property="og:description"[^>]*>/,
    `<meta property="og:description" content="${descAttr}" />`
  );
  html = html.replace(
    /<meta property="og:url"[^>]*>/,
    `<meta property="og:url" content="${canonical}" />`
  );
  html = html.replace(
    /<meta name="twitter:title"[^>]*>/,
    `<meta name="twitter:title" content="${titleAttr}" />`
  );
  html = html.replace(
    /<meta name="twitter:description"[^>]*>/,
    `<meta name="twitter:description" content="${descAttr}" />`
  );

  // Rewrite the prerender block with this route's H1 + body
  const prerender = `<div class="seo-prerender"><h1>${route.h1}</h1>${route.body}<noscript>Ozly requires JavaScript. Please enable JavaScript or download the app on iOS or Android.</noscript></div>`;
  html = html.replace(
    /<div class="seo-prerender">[\s\S]*?<\/div>/,
    prerender
  );

  return html;
}

// Root index.html — rewrite in place with route[0]
writeFileSync(join(dist, "index.html"), render(routes[0]), "utf8");
console.log(`  ✓ /index.html`);

// Non-root routes
for (const route of routes.slice(1)) {
  const dir = join(dist, route.path);
  const target = join(dir, "index.html");
  if (existsSync(target)) {
    console.log(`  ⏭ ${route.path}/index.html (static file exists)`);
    continue;
  }
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(target, render(route), "utf8");
  console.log(`  ✓ ${route.path}/index.html`);
}

console.log("Post-build: done.");
