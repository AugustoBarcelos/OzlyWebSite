import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
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
  BookOpen,
  Mail,
} from "lucide-react";
import { useI18n } from "../i18n";
import ScrollReveal from "../components/ScrollReveal";
import PhoneMockup from "../components/PhoneMockup";

/* ═══════════════════════════ HERO ═══════════════════════════ */
function Hero() {
  const { t } = useI18n();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const subtitle = t.hero.subtitle
    .replace("{price}", `<strong class="text-brand-500">${t.hero.price}</strong>`);

  return (
    <section
      ref={ref}
      id="download"
      className="gradient-section relative min-h-screen flex items-center bg-white"
    >
      {/* Blobs */}
      <div className="pointer-events-none absolute -top-32 left-1/4 h-[500px] w-[500px] rounded-full bg-brand-100/50 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-lime-100/40 blur-3xl" />

      <div className="relative mx-auto max-w-7xl w-full px-6 pt-28 pb-16 md:pt-32 md:pb-24">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          {/* Copy */}
          <motion.div className="flex-1 text-center lg:text-left" style={{ opacity }}>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-block mb-5 rounded-full bg-lime-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-lime-700"
            >
              {t.hero.badge}
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-extrabold leading-[1.1] text-navy-700"
            >
              {t.hero.title}
              <br />
              <span className="text-brand-500">{t.hero.titleHighlight}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="mt-7 max-w-lg mx-auto lg:mx-0 text-lg text-slate-500 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: subtitle }}
            />

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="mt-9 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
            >
              <a href="https://apps.apple.com/app/ozly/id6743189469" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center hover:opacity-80 transition">
                <img src={`${import.meta.env.BASE_URL}app-store.svg`} alt="Download on App Store" className="h-14" />
              </a>
              <a href="https://play.google.com/store/apps/details?id=com.augusto.ozly" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center hover:opacity-80 transition">
                <img src={`${import.meta.env.BASE_URL}google-play.svg`} alt="Get it on Google Play" className="h-14" />
              </a>
            </motion.div>
          </motion.div>

          {/* Phone */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ y: phoneY }}
            className="flex-shrink-0"
          >
            <PhoneMockup>
              <div className="space-y-3">
                <div className="h-9 rounded-xl bg-brand-50 w-3/4 mx-auto" />
                <div className="h-28 rounded-2xl bg-gradient-to-br from-brand-100 to-lime-50" />
                <div className="h-5 rounded-lg bg-slate-100 w-2/3 mx-auto" />
                <div className="h-5 rounded-lg bg-slate-100 w-1/2 mx-auto" />
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="h-20 rounded-xl bg-brand-50" />
                  <div className="h-20 rounded-xl bg-lime-50" />
                  <div className="h-20 rounded-xl bg-lime-50" />
                  <div className="h-20 rounded-xl bg-brand-50" />
                </div>
              </div>
            </PhoneMockup>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator — clicks to below the fold */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block cursor-pointer"
        onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="w-6 h-10 rounded-full border-2 border-slate-300 flex justify-center pt-2"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ═══════════════════════ AUDIENCE BANNER ═══════════════════════ */
const audienceIcons = [
  { key: "cleaners", icon: SprayCan },
  { key: "tradies", icon: Wrench },
  { key: "delivery", icon: Bike },
  { key: "kitchen", icon: ChefHat },
  { key: "waitstaff", icon: Coffee },
  { key: "hospitality", icon: Sparkles },
  { key: "petsitting", icon: Heart },
  { key: "agedcare", icon: Users },
];

function AudienceBanner() {
  const { t } = useI18n();

  return (
    <section className="bg-white py-14 border-y border-slate-100">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <ScrollReveal>
          <p className="text-slate-900 font-semibold text-sm uppercase tracking-[0.2em] mb-7">
            {t.audience.title}
          </p>
        </ScrollReveal>
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
          {audienceIcons.map(({ key, icon: Icon }, i) => (
            <ScrollReveal key={key} delay={0.1 * i}>
              <span className="inline-flex items-center gap-2 text-slate-600 text-sm font-medium">
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

/* ═══════════════════ FEATURE SHOWCASE SECTIONS ═══════════════════ */

const featureSections = [
  {
    titleKey: "shifts",
    descKey: "shiftsDesc",
    icon: FileText,
    color: "brand",
    mockupVariant: "teal",
    screen: (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
            <FileText size={16} className="text-brand-600" />
          </div>
          <div className="h-4 rounded bg-slate-100 w-20" />
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-3 space-y-2">
          <div className="flex justify-between items-center">
            <div className="h-3 rounded bg-slate-200 w-20" />
            <div className="h-3 rounded bg-brand-100 w-14" />
          </div>
          <div className="h-px bg-slate-100" />
          <div className="space-y-1.5">
            <div className="h-2.5 rounded bg-slate-100 w-full" />
            <div className="h-2.5 rounded bg-slate-100 w-3/4" />
            <div className="h-2.5 rounded bg-slate-100 w-1/2" />
          </div>
          <div className="flex justify-end pt-1">
            <div className="h-4 rounded bg-brand-500 w-16" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-3 space-y-2">
          <div className="flex justify-between items-center">
            <div className="h-3 rounded bg-slate-200 w-24" />
            <div className="h-3 rounded bg-lime-100 w-14" />
          </div>
          <div className="h-px bg-slate-100" />
          <div className="space-y-1.5">
            <div className="h-2.5 rounded bg-slate-100 w-full" />
            <div className="h-2.5 rounded bg-slate-100 w-2/3" />
          </div>
        </div>
        <div className="h-10 rounded-xl bg-brand-500 flex items-center justify-center">
          <span className="text-[11px] font-bold text-white tracking-wide">SEND PDF</span>
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
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
            <Camera size={16} className="text-brand-600" />
          </div>
          <div className="h-4 rounded bg-slate-100 w-28" />
        </div>
        <div className="h-36 rounded-2xl bg-gradient-to-br from-brand-50 to-lime-50 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-28 rounded-lg bg-white shadow-lg border border-slate-200 flex flex-col items-center justify-center gap-1 p-2">
              <div className="h-2 rounded bg-slate-200 w-full" />
              <div className="h-2 rounded bg-slate-200 w-3/4" />
              <div className="h-2 rounded bg-slate-200 w-1/2" />
              <div className="mt-1 h-3 rounded bg-brand-200 w-full" />
            </div>
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white shadow-md border-2 border-brand-300 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-brand-400" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 rounded-lg bg-lime-50 p-2 text-center">
            <div className="text-[10px] font-bold text-lime-600">$42.50</div>
          </div>
          <div className="flex-1 rounded-lg bg-slate-50 p-2 text-center">
            <div className="text-[10px] font-bold text-slate-500">04 Mar</div>
          </div>
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
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-lime-100 flex items-center justify-center">
            <ClipboardCheck size={16} className="text-lime-600" />
          </div>
          <div className="h-4 rounded bg-slate-100 w-24" />
        </div>
        {/* Invoice status rows */}
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 rounded-xl bg-lime-50 p-3 border border-lime-100">
            <div className="w-2.5 h-2.5 rounded-full bg-lime-500" />
            <div className="flex-1">
              <div className="h-2.5 rounded bg-lime-200 w-3/4" />
            </div>
            <span className="text-[9px] font-bold text-lime-600 bg-lime-100 rounded-full px-2 py-0.5">PAID</span>
            <span className="text-[10px] font-bold text-lime-700">$320</span>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl bg-amber-50 p-3 border border-amber-100">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="flex-1">
              <div className="h-2.5 rounded bg-amber-200 w-2/3" />
            </div>
            <span className="text-[9px] font-bold text-amber-600 bg-amber-100 rounded-full px-2 py-0.5">PENDING</span>
            <span className="text-[10px] font-bold text-amber-700">$180</span>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl bg-red-50 p-3 border border-red-100">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="flex-1">
              <div className="h-2.5 rounded bg-red-200 w-1/2" />
            </div>
            <span className="text-[9px] font-bold text-red-500 bg-red-100 rounded-full px-2 py-0.5">OVERDUE</span>
            <span className="text-[10px] font-bold text-red-600">$250</span>
          </div>
        </div>
        {/* Summary bar */}
        <div className="rounded-xl bg-slate-50 p-3 flex justify-between items-center">
          <span className="text-[10px] font-semibold text-slate-500">Total</span>
          <span className="text-[13px] font-extrabold text-slate-700">$750</span>
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
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
            <TrendingUp size={16} className="text-brand-600" />
          </div>
          <div className="h-4 rounded bg-slate-100 w-28" />
        </div>
        {/* Revenue row */}
        <div className="rounded-xl bg-brand-50 p-3 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-semibold text-brand-400">Revenue</span>
            <span className="text-[13px] font-extrabold text-brand-600">$4,200</span>
          </div>
          <div className="h-2 rounded-full bg-brand-100 overflow-hidden">
            <div className="h-full w-full rounded-full bg-brand-400" />
          </div>
        </div>
        {/* Expenses row */}
        <div className="rounded-xl bg-slate-50 p-3 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-semibold text-slate-400">Expenses</span>
            <span className="text-[13px] font-extrabold text-slate-600">-$680</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full w-[16%] rounded-full bg-slate-400" />
          </div>
        </div>
        {/* Tax row */}
        <div className="rounded-xl bg-red-50 p-3 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-semibold text-red-400">Tax (ATO)</span>
            <span className="text-[13px] font-extrabold text-red-500">-$820</span>
          </div>
          <div className="h-2 rounded-full bg-red-100 overflow-hidden">
            <div className="h-full w-[20%] rounded-full bg-red-400" />
          </div>
        </div>
        {/* Net profit highlight */}
        <div className="rounded-2xl bg-gradient-to-r from-lime-400 to-lime-500 p-4 text-center">
          <div className="text-[10px] font-semibold text-lime-50 mb-0.5">
            <DollarSign size={10} className="inline -mt-0.5" /> Net Profit
          </div>
          <div className="text-2xl font-extrabold text-white">$2,700</div>
        </div>
      </div>
    ),
  },
];

const colorStyles = {
  lime: { icon: "bg-lime-100 text-lime-600" },
  brand: { icon: "bg-brand-100 text-brand-600" },
};

function FeatureShowcase({ feature, index }) {
  const { t } = useI18n();
  const isEven = index % 2 === 0;
  const { titleKey, descKey, icon: Icon, color, mockupVariant, screen } = feature;
  const moduleKey = `${titleKey}Module`;
  const cs = colorStyles[color];

  return (
    <section className="gradient-section bg-white py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className={`flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} items-center gap-16 lg:gap-24`}>
          {/* Text */}
          <div className="flex-1 text-center lg:text-left max-w-lg">
            <ScrollReveal>
              <div className="flex items-center gap-3 mb-6 justify-center lg:justify-start">
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${cs.icon}`}>
                  <Icon size={28} />
                </div>
                {t.features[moduleKey] && (
                  <span className="text-xs font-bold text-brand-600 bg-brand-50 border border-brand-200 rounded-full px-3 py-1 uppercase tracking-wide">
                    {t.features[moduleKey]}
                  </span>
                )}
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy-700 leading-tight">
                {t.features[titleKey]}
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <p className="mt-5 text-lg text-slate-500 leading-relaxed">
                {t.features[descKey]}
              </p>
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
    <section id="comparison" className="gradient-section-warm bg-white py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <ScrollReveal>
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-700">
              {t.comparison.title}{" "}
              <span className="text-brand-500">{t.comparison.titleHighlight}</span>
            </h2>
            <p className="mt-4 text-slate-500 max-w-xl mx-auto">{t.comparison.subtitle}</p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {comparisonKeys.map((key, i) => (
              <ScrollReveal key={key} delay={0.05 * i}>
                <div className="flex items-center gap-3 rounded-xl bg-white border border-slate-100 px-5 py-4 shadow-sm">
                  <CheckCircle size={20} className="text-brand-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-700">{t.comparison[key]}</span>
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
const featureMatrix = [
  //                           TFN    ABN    MAX
  { key: "shifts",             tfn: true,  abn: true,  max: true  },
  { key: "expensesOcr",        tfn: true,  abn: true,  max: true  },
  { key: "visaShield",         tfn: true,  abn: true,  max: true  },
  { key: "calendarSync",       tfn: true,  abn: true,  max: true  },
  { key: "taxAnalytics",       tfn: true,  abn: true,  max: true  },
  { key: "contractors",        tfn: false, abn: true,  max: true  },
  { key: "invoices",           tfn: false, abn: true,  max: true  },
  { key: "hoursComparison",    tfn: false, abn: true,  max: true  },
  { key: "multiBusinesses",    tfn: false, abn: true,  max: true  },
  { key: "toggleMode",         tfn: false, abn: false, max: true  },
];

function Pricing() {
  const { t } = useI18n();
  const p = t.pricing;

  const plans = [
    { id: "tfn", ...p.tfn, color: "brand",  highlight: false },
    { id: "abn", ...p.abn, color: "brand",  highlight: false },
    { id: "max", ...p.max, color: "amber",  highlight: true  },
  ];

  return (
    <section id="pricing" className="gradient-section bg-white py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal>
          <div className="text-center mb-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-700 mb-4">{p.title}</h2>
            <p className="text-slate-500 max-w-xl mx-auto">{p.subtitle}</p>
          </div>
          <div className="text-center mb-12">
            <span className="inline-block rounded-full bg-lime-100 px-5 py-2 text-sm font-bold text-lime-700">
              {p.trialBadge}
            </span>
          </div>
        </ScrollReveal>

        {/* ── Mobile: stacked cards ── */}
        <div className="flex flex-col gap-6 lg:hidden">
          {plans.map((plan, pi) => (
            <ScrollReveal key={plan.id} delay={0.1 * pi}>
              <div className={`relative rounded-3xl bg-white border-2 p-8 ${plan.highlight ? "border-amber-400 shadow-xl shadow-amber-500/10" : "border-slate-200 shadow-lg shadow-brand-500/5"}`}>
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-1 text-xs font-bold text-white shadow-md">
                    {p.bestValue}
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className={`text-2xl font-extrabold mb-1 ${plan.highlight ? "text-amber-500" : "text-brand-500"}`}>{plan.name}</h3>
                  <p className="text-slate-500 text-sm">{plan.desc}</p>
                  <div className="mt-4">
                    <span className={`text-5xl font-extrabold ${plan.highlight ? "text-amber-500" : "text-brand-500"}`}>{plan.price}</span>
                    <span className="text-lg font-semibold text-slate-400">{p.perWeek}</span>
                    {plan.priceNote && <span className="block text-sm font-medium text-slate-400 mt-2">{plan.priceNote}</span>}
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {featureMatrix.map(({ key, [plan.id]: has }) => (
                    <li key={key} className="flex items-center gap-3 text-sm">
                      {has
                        ? <CheckCircle size={16} className="text-lime-500 flex-shrink-0" />
                        : <XCircle size={16} className="text-slate-300 flex-shrink-0" />
                      }
                      <span className={has ? "text-slate-700" : "text-slate-400"}>{p.features[key]}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#download"
                  className={`flex items-center justify-center gap-2 rounded-full px-6 py-3.5 font-semibold transition shadow-lg ${
                    plan.highlight
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-white hover:from-amber-500 hover:to-amber-600 shadow-amber-500/25"
                      : "bg-brand-500 text-white hover:bg-brand-600 shadow-brand-500/25"
                  }`}
                >
                  {p.cta} <ChevronRight size={18} />
                </a>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* ── Desktop: comparison table ── */}
        <ScrollReveal delay={0.15} className="hidden lg:block">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-brand-500/5">
            {/* Header */}
            <div className="grid grid-cols-[1fr_repeat(3,220px)] items-end">
              <div className="p-6" />
              {plans.map((plan) => (
                <div key={plan.id} className={`relative p-6 text-center ${plan.highlight ? "bg-amber-50/50" : ""}`}>
                  {plan.highlight && (
                    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 rounded-b-lg bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                      {p.bestValue}
                    </div>
                  )}
                  <h3 className={`text-xl font-extrabold mb-1 ${plan.highlight ? "text-amber-500" : "text-brand-500"}`}>{plan.name}</h3>
                  <p className="text-slate-500 text-xs mb-3">{plan.desc}</p>
                  <div>
                    <span className={`text-3xl font-extrabold ${plan.highlight ? "text-amber-500" : "text-brand-500"}`}>{plan.price}</span>
                    <span className="text-sm font-semibold text-slate-400">{p.perWeek}</span>
                  </div>
                  {plan.priceNote && <span className="block text-xs font-medium text-slate-400 mt-1">{plan.priceNote}</span>}
                </div>
              ))}
            </div>

            {/* Feature rows */}
            {featureMatrix.map(({ key, tfn, abn, max }, i) => (
              <div key={key} className={`grid grid-cols-[1fr_repeat(3,220px)] items-center border-t border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                <div className="px-6 py-4 text-sm font-medium text-slate-700">{p.features[key]}</div>
                {[tfn, abn, max].map((has, ci) => (
                  <div key={ci} className={`px-6 py-4 flex justify-center ${plans[ci].highlight ? "bg-amber-50/30" : ""}`}>
                    {has
                      ? <CheckCircle size={20} className="text-lime-500" />
                      : <span className="text-slate-300">&mdash;</span>
                    }
                  </div>
                ))}
              </div>
            ))}

            {/* CTA row */}
            <div className="grid grid-cols-[1fr_repeat(3,220px)] items-center border-t border-slate-200 bg-slate-50/50">
              <div className="p-6" />
              {plans.map((plan) => (
                <div key={plan.id} className={`p-6 flex justify-center ${plan.highlight ? "bg-amber-50/30" : ""}`}>
                  <a
                    href="#download"
                    className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition shadow-md ${
                      plan.highlight
                        ? "bg-gradient-to-r from-amber-400 to-amber-500 text-white hover:from-amber-500 hover:to-amber-600 shadow-amber-500/20"
                        : "bg-brand-500 text-white hover:bg-brand-600 shadow-brand-500/20"
                    }`}
                  >
                    {p.cta} <ChevronRight size={14} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Footnotes */}
        <div className="mt-8 text-center space-y-1">
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
    <section className="bg-gradient-to-br from-navy-700 via-navy-600 to-navy-500 py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <ScrollReveal>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6">
            {t.bottomCta.title}
          </h2>
          <p className="text-brand-200 text-lg mb-10 max-w-xl mx-auto">
            {t.bottomCta.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
            <a href="https://apps.apple.com/app/ozly/id6743189469" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center hover:opacity-80 transition">
              <img src={`${import.meta.env.BASE_URL}app-store.svg`} alt="Download on App Store" className="h-14" />
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.augusto.ozly" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center hover:opacity-80 transition">
              <img src={`${import.meta.env.BASE_URL}google-play.svg`} alt="Get it on Google Play" className="h-14" />
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
    <section id="faq" className="gradient-section-warm bg-white py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <ScrollReveal>
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-700 mb-4">
              {t.homeFaq.title}
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">{t.homeFaq.subtitle}</p>
          </div>
        </ScrollReveal>

        <div className="space-y-3">
          {faqKeys.map((key, i) => (
            <ScrollReveal key={key} delay={0.05 * i}>
              <div className="border border-slate-200 rounded-2xl overflow-hidden hover:border-brand-200 transition">
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left bg-white hover:bg-slate-50/50 transition"
                >
                  <span className="font-semibold text-slate-900">{t.faq[key]}</span>
                  <ChevronDown
                    size={20}
                    className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${openIndex === i ? "rotate-180" : ""}`}
                  />
                </button>
                {openIndex === i && (
                  <div className="px-6 pb-5 text-slate-600 leading-relaxed bg-white">
                    {t.faq[key.replace("q", "a")]}
                  </div>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.3}>
          <div className="mt-14 text-center rounded-2xl bg-slate-50 border border-slate-200 p-10">
            <h3 className="text-2xl font-bold text-navy-700 mb-2">{t.homeFaq.stillQuestions}</h3>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">{t.homeFaq.stillQuestionsDesc}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="mailto:support@ozly.au"
                className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3.5 text-white font-semibold hover:bg-brand-600 transition shadow-lg shadow-brand-500/20"
              >
                <Mail size={18} />
                {t.homeFaq.contact}
              </a>
              <Link
                to="/guide"
                className="inline-flex items-center gap-2 rounded-full border-2 border-brand-500 px-6 py-3.5 text-brand-500 font-semibold hover:bg-brand-50 transition"
              >
                <BookOpen size={18} />
                {t.homeFaq.cta}
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
    <>
      <Hero />
      <AudienceBanner />
      <FeaturesShowcase />
      <Comparison />
      <Pricing />
      <HomeFaq />
      <BottomCta />
    </>
  );
}
