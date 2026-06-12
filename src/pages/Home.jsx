import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Camera,
  ClipboardCheck,
  TrendingUp,
  CheckCircle,
  XCircle,
  SprayCan,
  Wrench,
  Bike,
  Sparkles,
  ChefHat,
  Coffee,
  Heart,
  Users,
  ChevronRight,
  ChevronDown,
  DollarSign,
  Fuel,
  Smartphone,
  Car,
  Shield,
  Minus,
  ArrowDown,
} from "lucide-react";
import { useI18n } from "../i18n";
import ScrollReveal from "../components/ScrollReveal";
import PhoneMockup from "../components/PhoneMockup";
import AudienceGate from "../components/AudienceGate";

/* ═══════════════════════════ HERO ═══════════════════════════ */
function Hero() {
  const { t } = useI18n();

  const subtitle = t.hero.subtitle
    .replace("{price}", `<strong class="text-brand-500">${t.hero.price}</strong>`);

  return (
    <section
      id="download"
      className="relative min-h-screen flex items-center"
    >
      {/* Blobs */}
      <div className="pointer-events-none absolute -top-32 left-1/4 h-[250px] w-[250px] sm:h-[400px] sm:w-[400px] md:h-[500px] md:w-[500px] rounded-full bg-brand-100/50 dark:bg-brand-900/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-[200px] w-[200px] sm:h-[300px] sm:w-[300px] md:h-[400px] md:w-[400px] rounded-full bg-lime-100/40 dark:bg-lime-900/15 blur-3xl" />

      <div className="relative mx-auto max-w-7xl w-full px-6 pt-28 pb-16 md:pt-32 md:pb-24">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          {/* Copy */}
          <div className="flex-1 text-center lg:text-left">
            <span
              className="block mb-5 text-[13px] font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400 anim-fade-in-up-sm"
              style={{ animationDelay: "0.1s" }}
            >
              {t.hero.badge}
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-semibold tracking-tight leading-[1.05] text-navy-700 dark:text-white">
              {t.hero.title}
              <br />
              <span className="text-brand-500">{t.hero.titleHighlight}</span>
            </h1>

            <p
              className="mt-7 max-w-lg mx-auto lg:mx-0 text-lg text-slate-500 dark:text-slate-400 leading-relaxed anim-fade-in-up"
              style={{ animationDelay: "0.35s" }}
              dangerouslySetInnerHTML={{ __html: subtitle }}
            />

            <div
              className="mt-9 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start anim-fade-in-up"
              style={{ animationDelay: "0.5s" }}
            >
              <a href="https://apps.apple.com/au/app/ozly/id6760398649" target="_blank" rel="noopener noreferrer" className="store-badge-link hover:opacity-80 transition">
                <img src={`${import.meta.env.BASE_URL}app-store.svg`} alt="Download Ozly on the App Store" width="189" height="56" className="h-14" />
              </a>
              <a href="https://play.google.com/store/apps/details?id=com.augusto.ozly" target="_blank" rel="noopener noreferrer" className="store-badge-link hover:opacity-80 transition">
                <img src={`${import.meta.env.BASE_URL}google-play.svg`} alt="Get Ozly on Google Play" width="189" height="56" className="h-14" />
              </a>
            </div>

            {/* Audience split — two terse hairline rows, Apple-style: plain
                text + a coloured "Learn more →" affordance. No cards. */}
            <div
              className="mt-10 max-w-md mx-auto lg:mx-0 border-y border-slate-200/80 dark:border-slate-700/60 divide-y divide-slate-200/80 dark:divide-slate-700/60 text-left anim-fade-in-up"
              style={{ animationDelay: "0.65s" }}
            >
              <button
                type="button"
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                className="flex w-full items-center justify-between gap-6 py-4 cursor-pointer group"
              >
                <span className="text-[15px] font-medium text-navy-700 dark:text-white">
                  {t.audienceSplit.contractorTitle}
                </span>
                <span className="shrink-0 max-w-[55%] text-right text-[14px] font-medium leading-snug text-brand-600 dark:text-brand-400 group-hover:underline underline-offset-4">
                  {t.audienceSplit.contractorCta} ↓
                </span>
              </button>
              <Link
                to="/business"
                className="flex w-full items-center justify-between gap-6 py-4 group"
              >
                <span className="text-[15px] font-medium text-navy-700 dark:text-white">
                  {t.audienceSplit.businessTitle}
                </span>
                <span className="shrink-0 max-w-[55%] text-right text-[14px] font-medium leading-snug text-brand-600 dark:text-brand-400 group-hover:underline underline-offset-4">
                  {t.audienceSplit.businessCta} →
                </span>
              </Link>
            </div>
          </div>

          {/* Phone */}
          <div
            className="flex-shrink-0 anim-fade-in-scale"
            style={{ animationDelay: "0.3s" }}
          >
            <PhoneMockup>
              {/* Dashboard screen — realistic content, not skeleton bars */}
              <div className="space-y-3 text-left">
                <div>
                  <div className="text-[9px] text-slate-400">Good morning</div>
                  <div className="text-[13px] font-semibold text-navy-700">Maria 👋</div>
                </div>
                {/* This-week card with mini bar chart */}
                <div className="rounded-2xl bg-navy-700 p-3.5">
                  <div className="text-[8px] font-medium uppercase tracking-wider text-navy-100/60">This week</div>
                  <div className="mt-0.5 text-[20px] font-semibold tracking-tight text-white">$1,240.50</div>
                  <div className="mt-2 flex items-end gap-1 h-8">
                    {[35, 55, 40, 75, 60, 90, 50].map((h, i) => (
                      <div
                        key={i}
                        style={{ height: `${h}%` }}
                        className={`flex-1 rounded-sm ${i === 5 ? "bg-brand-400" : "bg-white/20"}`}
                      />
                    ))}
                  </div>
                </div>
                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-[#f5f5f7] p-2.5">
                    <div className="text-[8px] text-slate-400">Invoices</div>
                    <div className="text-[12px] font-semibold text-navy-700">3 unpaid</div>
                  </div>
                  <div className="rounded-xl bg-[#f5f5f7] p-2.5">
                    <div className="text-[8px] text-slate-400">Tax set aside</div>
                    <div className="text-[12px] font-semibold text-navy-700">$310</div>
                  </div>
                  <div className="rounded-xl bg-[#f5f5f7] p-2.5">
                    <div className="text-[8px] text-slate-400">Hours</div>
                    <div className="text-[12px] font-semibold text-navy-700">38.5h</div>
                  </div>
                  <div className="rounded-xl bg-[#f5f5f7] p-2.5">
                    <div className="text-[8px] text-slate-400">Expenses</div>
                    <div className="text-[12px] font-semibold text-navy-700">$86.40</div>
                  </div>
                </div>
              </div>
            </PhoneMockup>
          </div>
        </div>
      </div>

      {/* Scroll indicator — clicks to below the fold */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block cursor-pointer anim-fade-in"
        style={{ animationDelay: "1.2s" }}
        onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
      >
        <div className="w-6 h-10 rounded-full border-2 border-slate-300 flex justify-center pt-2 anim-bounce-soft">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════ AUDIENCE BANNER ═══════════════════════ */
const audienceIcons = [
  { key: "cleaners", icon: SprayCan },
  { key: "tradies", icon: Wrench },
  // { key: "delivery", icon: Bike },
  { key: "kitchen", icon: ChefHat },
  { key: "waitstaff", icon: Coffee },
  { key: "hospitality", icon: Sparkles },
  { key: "petsitting", icon: Heart },
  { key: "agedcare", icon: Users },
];

function AudienceBanner() {
  const { t } = useI18n();

  return (
    <section className="py-14 border-y border-brand-100/50 dark:border-brand-800/30">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <ScrollReveal>
          <p className="text-slate-400 dark:text-slate-500 font-semibold text-[12px] uppercase tracking-[0.2em] mb-7">
            {t.audience.title}
          </p>
        </ScrollReveal>
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
          {audienceIcons.map(({ key, icon: Icon }, i) => (
            <ScrollReveal key={key} delay={0.1 * i}>
              <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-medium">
                <Icon size={16} className="text-brand-500" />
                {t.audience[key]}
              </span>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════ REAL EARNINGS BREAKDOWN ═══════════════════ */
function RealEarnings() {
  const { t } = useI18n();
  const r = t.realEarnings;

  const costs = [
    { label: r.fuel, value: "-$3.20", icon: Fuel, color: "text-red-500" },
    { label: r.phonePlan, value: "-$0.90", icon: Smartphone, color: "text-red-400" },
    { label: r.carWear, value: "-$1.80", icon: Car, color: "text-red-400" },
    { label: r.insurance, value: "-$0.60", icon: Shield, color: "text-red-300" },
  ];

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

          {/* Receipt card */}
          <ScrollReveal className="w-full max-w-sm flex-shrink-0">
            <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-brand-500 to-lime-500 px-6 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/80 text-sm font-medium">{r.delivery}</span>
                  <span className="text-white text-2xl font-extrabold">$12.00</span>
                </div>
              </div>

              {/* Cost breakdown */}
              <div className="px-6 py-5 space-y-3">
                {costs.map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                        <Icon size={16} className={color} />
                      </div>
                      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
                    </div>
                    <span className="text-sm font-semibold text-red-500">{value}</span>
                  </div>
                ))}

                {/* Divider */}
                <div className="border-t-2 border-dashed border-slate-200 dark:border-slate-600 my-2" />

                {/* Real total */}
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-slate-900 dark:text-white">{r.realTotal}</span>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-brand-500">$5.50</span>
                    <p className="text-xs text-slate-400 mt-0.5">≈ $8.25{r.perHour}</p>
                  </div>
                </div>
              </div>

              {/* Animated arrow hint */}
              <div className="flex justify-center pb-4">
                <div className="anim-bounce-arrow">
                  <ArrowDown size={20} className="text-brand-400" />
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Text content */}
          <div className="text-center lg:text-left">
            <ScrollReveal delay={0.1}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy-700 dark:text-white leading-tight">
                {r.title}{" "}
                <span className="text-brand-500">{r.titleHighlight}</span>
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <p className="mt-5 text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                {r.subtitle}
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <p className="mt-4 text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg">
                {r.bottomLine}
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.4}>
              <div className="mt-8">
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-2 rounded-full bg-brand-800 px-7 py-3.5 text-white font-semibold hover:bg-brand-900 transition shadow-lg shadow-brand-500/20"
                >
                  <DollarSign size={18} />
                  {r.cta}
                </a>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════ FEATURE SHOWCASE SECTIONS ═══════════════════ */

const featureSections = [
  {
    titleKey: "shifts",
    descKey: "shiftsDesc",
    icon: FileText,
    color: "brand",
    mockupVariant: "teal",
    screen: (
      <div className="space-y-2.5 text-left">
        <div className="text-[13px] font-semibold text-navy-700">Invoices</div>
        {[
          { id: "INV-0042", client: "Sparkle Cleaning Co.", amount: "$480.00", status: "SENT", chip: "bg-brand-50 text-brand-600" },
          { id: "INV-0041", client: "Harbour Strata", amount: "$320.00", status: "PAID", chip: "bg-lime-50 text-lime-600" },
          { id: "INV-0040", client: "J. Nguyen", amount: "$185.50", status: "DUE", chip: "bg-amber-50 text-amber-600" },
        ].map(({ id, client, amount, status, chip }) => (
          <div key={id} className="rounded-xl bg-[#f5f5f7] p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-medium text-slate-400">{id}</span>
              <span className={`rounded-full px-1.5 py-px text-[7px] font-semibold tracking-wide ${chip}`}>{status}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[10px] font-medium text-navy-700">{client}</span>
              <span className="text-[11px] font-semibold tabular-nums text-navy-700">{amount}</span>
            </div>
          </div>
        ))}
        <div className="h-9 rounded-full bg-brand-600 flex items-center justify-center">
          <span className="text-[10px] font-semibold text-white">Send as PDF</span>
        </div>
      </div>
    ),
  },
  {
    titleKey: "ocr",
    descKey: "ocrDesc",
    icon: Camera,
    color: "brand",
    mockupVariant: "teal",
    screen: (
      <div className="space-y-2.5 text-left">
        <div className="text-[13px] font-semibold text-navy-700">Scan receipt</div>
        {/* Camera viewfinder with a readable receipt */}
        <div className="h-36 rounded-2xl bg-[#17181c] relative overflow-hidden flex items-center justify-center">
          <div className="w-24 rounded-md bg-white p-2 shadow-lg">
            <div className="text-center text-[7px] font-bold tracking-wider text-navy-700">BUNNINGS</div>
            <div className="mt-1.5 space-y-1 text-[6.5px] text-slate-500">
              <div className="flex justify-between"><span>Gloves ×2</span><span>12.90</span></div>
              <div className="flex justify-between"><span>Spray bottle</span><span>8.45</span></div>
              <div className="flex justify-between"><span>Microfibre kit</span><span>21.15</span></div>
            </div>
            <div className="mt-1.5 border-t border-dashed border-slate-200 pt-1 flex justify-between text-[7px] font-semibold text-navy-700">
              <span>TOTAL</span><span>$42.50</span>
            </div>
          </div>
          {/* scan corners */}
          <div className="absolute inset-5 rounded-lg border border-white/25" />
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-2 border-white/80" />
        </div>
        {/* OCR result */}
        <div className="rounded-xl bg-[#f5f5f7] p-2.5 flex items-center justify-between">
          <div>
            <div className="text-[8px] text-slate-400">Detected</div>
            <div className="text-[11px] font-semibold text-navy-700">$42.50 · 04 Mar</div>
          </div>
          <span className="rounded-full bg-lime-50 px-2 py-0.5 text-[7px] font-semibold text-lime-600">DEDUCTIBLE</span>
        </div>
      </div>
    ),
  },
  {
    titleKey: "tracker",
    descKey: "trackerDesc",
    icon: ClipboardCheck,
    color: "lime",
    mockupVariant: "lime",
    screen: (
      <div className="space-y-2.5 text-left">
        <div className="text-[13px] font-semibold text-navy-700">Payments</div>
        {[
          { job: "Office clean — CBD", when: "Tue · 4h", amount: "$320", status: "PAID", dot: "bg-lime-500", chip: "bg-lime-50 text-lime-600" },
          { job: "End of lease — Bondi", when: "Thu · 3h", amount: "$180", status: "PENDING", dot: "bg-amber-400", chip: "bg-amber-50 text-amber-600" },
          { job: "Weekly — Harbour Strata", when: "Fri · 5h", amount: "$250", status: "OVERDUE", dot: "bg-red-400", chip: "bg-red-50 text-red-500" },
        ].map(({ job, when, amount, status, dot, chip }) => (
          <div key={job} className="flex items-center gap-2 rounded-xl bg-[#f5f5f7] p-2.5">
            <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
            <div className="flex-1 min-w-0">
              <div className="truncate text-[10px] font-medium text-navy-700">{job}</div>
              <div className="text-[8px] text-slate-400">{when}</div>
            </div>
            <span className={`rounded-full px-1.5 py-px text-[7px] font-semibold ${chip}`}>{status}</span>
            <span className="text-[11px] font-semibold tabular-nums text-navy-700">{amount}</span>
          </div>
        ))}
        {/* Summary bar */}
        <div className="rounded-xl bg-navy-700 p-2.5 flex justify-between items-center">
          <span className="text-[9px] font-medium text-navy-100/70">Outstanding</span>
          <span className="text-[12px] font-semibold tabular-nums text-white">$430.00</span>
        </div>
      </div>
    ),
  },
  {
    titleKey: "forecast",
    descKey: "forecastDesc",
    icon: TrendingUp,
    color: "brand",
    mockupVariant: "teal",
    screen: (
      <div className="space-y-2.5 text-left">
        <div className="text-[13px] font-semibold text-navy-700">June forecast</div>
        {[
          { label: "Revenue", value: "$4,200", width: "100%", bar: "bg-brand-500", text: "text-navy-700" },
          { label: "Expenses", value: "−$680", width: "16%", bar: "bg-slate-400", text: "text-slate-500" },
          { label: "Tax (ATO)", value: "−$820", width: "20%", bar: "bg-amber-400", text: "text-slate-500" },
        ].map(({ label, value, width, bar, text }) => (
          <div key={label} className="rounded-xl bg-[#f5f5f7] p-2.5 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-medium text-slate-400">{label}</span>
              <span className={`text-[11px] font-semibold tabular-nums ${text}`}>{value}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200/70 overflow-hidden">
              <div style={{ width }} className={`h-full rounded-full ${bar}`} />
            </div>
          </div>
        ))}
        {/* Net profit highlight */}
        <div className="rounded-xl bg-navy-700 p-3 flex items-center justify-between">
          <span className="text-[9px] font-medium text-navy-100/70">Net profit</span>
          <span className="text-[16px] font-semibold tracking-tight tabular-nums text-lime-300">$2,700</span>
        </div>
        <div className="text-[8px] text-slate-400 text-center">Set aside $820 for tax · BAS due 28 Jul</div>
      </div>
    ),
  },
];

const colorStyles = {
  lime: { eyebrow: "text-lime-600 dark:text-lime-400" },
  brand: { eyebrow: "text-brand-600 dark:text-brand-400" },
};

function FeatureShowcase({ feature, index }) {
  const { t } = useI18n();
  const isEven = index % 2 === 0;
  const { titleKey, descKey, icon: Icon, color, mockupVariant, screen } = feature;
  const moduleKey = `${titleKey}Module`;
  const cs = colorStyles[color];

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className={`flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} items-center gap-10 sm:gap-16 lg:gap-24`}>
          {/* Text */}
          <div className="flex-1 text-center lg:text-left max-w-full sm:max-w-md lg:max-w-lg">
            <ScrollReveal>
              <div className="mb-5 flex items-center gap-2.5 justify-center lg:justify-start">
                <Icon size={20} strokeWidth={1.8} className={cs.eyebrow} />
                {t.features[moduleKey] && (
                  <span className={`text-[13px] font-semibold uppercase tracking-[0.16em] ${cs.eyebrow}`}>
                    {t.features[moduleKey]}
                  </span>
                )}
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-semibold tracking-tight text-navy-700 dark:text-white leading-[1.1]">
                {t.features[titleKey]}
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <p className="mt-5 text-[17px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {t.features[descKey]}
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <div className="mt-6 flex justify-center lg:justify-start">
                <a
                  href="#pricing"
                  className="text-[15px] font-medium text-brand-600 dark:text-brand-400 hover:underline underline-offset-4"
                >
                  {t.features.ctaPlans} →
                </a>
              </div>
            </ScrollReveal>
          </div>

          {/* Phone */}
          <ScrollReveal delay={0.15} y={80} className="flex-shrink-0">
            <PhoneMockup variant={mockupVariant}>
              {screen}
            </PhoneMockup>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

function FeaturesShowcase() {
  return (
    <div id="features">
      {featureSections.map((feature, i) => (
        <FeatureShowcase key={feature.titleKey} feature={feature} index={i} />
      ))}
    </div>
  );
}

/* ═══════════════════════ COMPARISON ═══════════════════════ */
const comparisonKeys = [
  "unlimitedInvoices",
  "noPercentFee",
  "taxCalc",
  "ocrReceipts",
  "paymentTracking",
  "profitForecast",
  "offline",
  "fixedPrice",
];

function Comparison() {
  const { t } = useI18n();

  return (
    <section id="comparison" className="py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <ScrollReveal>
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-navy-700 dark:text-white">
              {t.comparison.title}{" "}
              <span className="text-brand-500">{t.comparison.titleHighlight}</span>
            </h2>
            <p className="mt-4 text-slate-500 dark:text-slate-400 max-w-xl mx-auto">{t.comparison.subtitle}</p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4 max-w-2xl mx-auto">
            {comparisonKeys.map((key, i) => (
              <ScrollReveal key={key} delay={0.04 * i}>
                <div className="flex items-center gap-3">
                  <CheckCircle size={18} strokeWidth={1.8} className="text-brand-500 flex-shrink-0" />
                  <span className="text-[15px] text-slate-600 dark:text-slate-300">{t.comparison[key]}</span>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

/* ═══════════════════════ PRICING ═══════════════════════ */
// ABN feature list (PRO includes all of these plus the Pro-exclusive extras below)
const allFeatures = [
  { key: "invoices",         abn: true },
  { key: "contractors",      abn: true },
  { key: "expensesOcr",      abn: true },
  { key: "taxAnalytics",     abn: true },
  { key: "shifts",           abn: true },
  { key: "calendarSync",     abn: true },
  { key: "quickExpense",     abn: true },
  { key: "messageTemplates", abn: true },
  { key: "bulkEdit",         abn: true },
  { key: "multiBusinesses",  abn: true },
  { key: "levelUp",          abn: true },
];

// Features shown by default (first 9 — key highlights)
const coreFeatures = allFeatures.slice(0, 9);

// Extra features revealed on "See all"
const extraFeatures = allFeatures.slice(9);

// Pro-exclusive value (shown instead of the full ABN list)
const proExclusiveFeatures = [
  { key: "proAllAbn" },
  { key: "rateComparison" },
  { key: "hoursComparison" },
  { key: "visaShield" },
];

function Pricing() {
  const { t } = useI18n();
  const p = t.pricing;
  const [expanded, setExpanded] = useState(false);
  const visibleFeatures = expanded ? [...coreFeatures, ...extraFeatures] : coreFeatures;

  // Sort features per plan: included (✓) first, excluded (—) last
  const sortedForPlan = (features, planId) => {
    return [...features].sort((a, b) => {
      const aHas = a[planId] ? 1 : 0;
      const bHas = b[planId] ? 1 : 0;
      return bHas - aHas;
    });
  };

  const plans = [
    { id: "abn", ...p.abn, color: "brand",  highlight: false },
    { id: "pro", ...p.pro, color: "amber",  highlight: true  },
  ];

  return (
    <section id="pricing" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal>
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-navy-700 dark:text-white mb-4">{p.title}</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">{p.subtitle}</p>
            <p className="mt-3 text-[15px] font-medium text-lime-600 dark:text-lime-400">{p.trialBadge}</p>
          </div>
        </ScrollReveal>

        {/* ── Pricing cards (3 side by side on desktop, stacked on mobile) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-16 max-w-3xl mx-auto">
          {plans.map((plan, pi) => (
            <ScrollReveal key={plan.id} delay={0.1 * pi}>
              <div className={`relative rounded-3xl p-6 sm:p-8 h-full flex flex-col ${
                plan.highlight
                  ? "bg-navy-700 text-white"
                  : "bg-[#f5f5f7] dark:bg-slate-800/60"
              }`}>
                {/* Plan header */}
                {plan.highlight ? (
                  <div className="text-center mb-6">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-lime-300">{p.bestValue}</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white mb-1">{plan.name}</h3>
                    <p className="text-navy-100/80 text-sm">{plan.desc}</p>
                    <div className="mt-5">
                      <span className="text-5xl font-semibold tracking-tight text-white">{plan.price}</span>
                      <span className="text-lg text-navy-100/70">{p.perWeek}</span>
                    </div>
                    {plan.priceNote && <p className="text-sm text-navy-100/70 mt-2">{plan.priceNote}</p>}
                  </div>
                ) : (
                  <div className="text-center mb-6">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-transparent select-none" aria-hidden="true">·</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-navy-700 dark:text-white mb-1">{plan.name}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{plan.desc}</p>
                    <div className="mt-5">
                      <span className="text-5xl font-semibold tracking-tight text-navy-700 dark:text-white">{plan.price}</span>
                      <span className="text-lg text-slate-400">{p.perWeek}</span>
                    </div>
                    {plan.priceNote && <p className="text-sm text-slate-400 mt-2">{plan.priceNote}</p>}
                  </div>
                )}

                {/* Feature list */}
                <ul className="space-y-3 mb-4 flex-1">
                  {plan.id === "pro" ? (
                    // Pro: simplified list — "Everything in ABN + Pro extras"
                    proExclusiveFeatures.map(({ key }) => (
                      <li key={key} className="flex items-center gap-3 text-sm">
                        <CheckCircle size={16} strokeWidth={1.8} className="text-lime-300 flex-shrink-0" />
                        <span className="text-navy-50">{p.features[key]}</span>
                      </li>
                    ))
                  ) : (
                    // ABN: sorted (included first, excluded last)
                    sortedForPlan(visibleFeatures, plan.id).map(({ key, [plan.id]: has }) => (
                      <li key={key} className="flex items-center gap-3 text-sm">
                        {has
                          ? <CheckCircle size={16} strokeWidth={1.8} className="text-brand-500 flex-shrink-0" />
                          : <span className="w-4 h-4 flex-shrink-0 text-center text-slate-300 dark:text-slate-600">&mdash;</span>
                        }
                        <span className={has ? "text-slate-600 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"}>{p.features[key]}</span>
                      </li>
                    ))
                  )}
                </ul>
                {!expanded && plan.id !== "pro" && (
                  <button
                    onClick={() => setExpanded(true)}
                    className="text-brand-600 dark:text-brand-400 text-[13px] font-medium hover:underline underline-offset-4 transition mb-4 flex items-center gap-1 cursor-pointer"
                  >
                    {p.seeAll || "Ver todas as features"}
                    <ChevronDown size={14} />
                  </button>
                )}

                {/* CTA */}
                <a
                  href="#download"
                  className={`flex items-center justify-center rounded-full px-6 py-3 font-medium text-[15px] transition-colors ${
                    plan.highlight
                      ? "bg-white text-navy-700 hover:bg-navy-50"
                      : "bg-brand-600 text-white hover:bg-brand-500"
                  }`}
                >
                  {p.cta}
                </a>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Footnotes */}
        <div className="text-center space-y-1">
          {p.annualNote && <p className="text-xs text-slate-400">{p.annualNote}</p>}
          {p.monthlyNote && <p className="text-xs text-slate-400">{p.monthlyNote}</p>}
          {p.calendarNote && <p className="text-xs text-slate-400">{p.calendarNote}</p>}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════ CTA BOTTOM ═══════════════════════ */
function BottomCta() {
  const { t } = useI18n();

  return (
    <section className="bg-navy-800 py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <ScrollReveal>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white leading-[1.1] mb-6">
            {t.bottomCta.title}
          </h2>
          <p className="text-navy-100/70 text-lg mb-10 max-w-xl mx-auto">
            {t.bottomCta.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
            <a href="https://apps.apple.com/au/app/ozly/id6760398649" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center hover:opacity-80 transition">
              <img src={`${import.meta.env.BASE_URL}app-store.svg`} alt="Download Ozly on the App Store" width="189" height="56" className="h-14" />
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.augusto.ozly" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center hover:opacity-80 transition">
              <img src={`${import.meta.env.BASE_URL}google-play.svg`} alt="Get Ozly on Google Play" width="189" height="56" className="h-14" />
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

/* ═══════════════════════ HOME FAQ ═══════════════════════ */
function HomeFaq() {
  const { t } = useI18n();
  const [openIndex, setOpenIndex] = useState(null);
  const faqKeys = ["q1", "q2", "q3", "q4", "q5", "q6"];

  return (
    <section id="faq" className="py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-navy-700 dark:text-white mb-4">
              {t.homeFaq.title}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">{t.homeFaq.subtitle}</p>
          </div>
        </ScrollReveal>

        <div className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-700/70 dark:border-slate-700/70">
          {faqKeys.map((key, i) => (
            <div key={key}>
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 py-5 text-left cursor-pointer"
              >
                <span className="text-[15px] font-medium text-navy-700 dark:text-slate-100">{t.faq[key]}</span>
                <ChevronDown
                  size={16}
                  className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${openIndex === i ? "rotate-180" : ""}`}
                />
              </button>
              {openIndex === i && (
                <div className="pb-5 max-w-[62ch] text-[14px] text-slate-500 dark:text-slate-300 leading-relaxed">
                  {t.faq[key.replace("q", "a")]}
                </div>
              )}
            </div>
          ))}
        </div>

        <ScrollReveal delay={0.2}>
          <div className="mt-16 text-center">
            <h3 className="text-2xl font-semibold tracking-tight text-navy-700 dark:text-white mb-2">{t.homeFaq.stillQuestions}</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-7 max-w-md mx-auto">{t.homeFaq.stillQuestionsDesc}</p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              <a
                href="mailto:support@ozly.com.au"
                className="rounded-full bg-brand-600 px-6 py-3 text-[15px] font-medium text-white hover:bg-brand-500 transition-colors"
              >
                {t.homeFaq.contact}
              </a>
              <Link
                to="/guide"
                className="text-[15px] font-medium text-brand-600 dark:text-brand-400 hover:underline underline-offset-4"
              >
                {t.homeFaq.cta} →
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

/* ═══════════════════════ HOME ═══════════════════════ */
export default function Home() {
  return (
    <div className="ozly-gradient">
      <AudienceGate />
      <Hero />
      <AudienceBanner />
      <FeaturesShowcase />
      {/* <RealEarnings /> */}
      <Comparison />
      <Pricing />
      <HomeFaq />
      <BottomCta />
    </div>
  );
}
