import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Mail, Menu, X } from "lucide-react";
import { useI18n } from "../i18n";
import GuideContentPt from "./GuideContentPt";
import GuideContentEn from "./GuideContentEn";
import GuideContentEs from "./GuideContentEs";

/* ═══════════ HELPER COMPONENTS ═══════════ */

function SectionCard({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 md:p-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-700 mb-6">{title}</h2>
        <div className="prose-guide">{children}</div>
      </div>
    </section>
  );
}

function SubSection({ title, children }) {
  return (
    <div className="mt-8 first:mt-0">
      <h3 className="text-lg sm:text-xl font-bold text-navy-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function StepList({ children }) {
  return <ol className="space-y-2 text-slate-600 leading-relaxed list-decimal list-inside marker:font-bold marker:text-brand-500">{children}</ol>;
}

function BulletList({ children }) {
  return <ul className="space-y-1.5 text-slate-600 leading-relaxed list-disc list-inside marker:text-brand-400">{children}</ul>;
}

function Tip({ children, label }) {
  return (
    <div className="mt-4 rounded-xl bg-lime-50 border border-lime-200 px-5 py-4 text-sm text-lime-800">
      <span className="font-bold">{label}</span> {children}
    </div>
  );
}

function InfoBox({ children }) {
  return (
    <div className="mt-4 rounded-xl bg-brand-50 border border-brand-200 px-5 py-4 text-sm text-brand-800">
      {children}
    </div>
  );
}

function SimpleTable({ headers, rows }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-600 font-semibold">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="text-slate-600">
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function P({ children }) {
  return <p className="text-slate-600 leading-relaxed mt-3 first:mt-0">{children}</p>;
}

function B({ children }) {
  return <strong className="text-slate-800">{children}</strong>;
}

/* ═══════════ COLLAPSIBLE FAQ ═══════════ */
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50/50 transition">
        <span className="font-semibold text-slate-800 text-sm">{q}</span>
        <ChevronDown size={18} className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{a}</div>}
    </div>
  );
}

/* ═══════════ CONTENT BY LANGUAGE ═══════════ */
const contentByLang = { pt: GuideContentPt, en: GuideContentEn, es: GuideContentEs };

/* ═══════════ MAIN GUIDE PAGE ═══════════ */
export default function Guide() {
  const { t, lang } = useI18n();

  // Wrap Tip so content components don't need to pass the label
  const TipWithLabel = ({ children }) => <Tip label={t.guide.tipLabel}>{children}</Tip>;
  const helpers = { SectionCard, SubSection, StepList, BulletList, Tip: TipWithLabel, InfoBox, SimpleTable, P, B, FaqItem };
  const [tocOpen, setTocOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  const tocSections = t.guide.tocSections;
  const ContentComponent = contentByLang[lang] || contentByLang.en;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-100px 0px -70% 0px" }
    );
    tocSections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [tocSections]);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setTocOpen(false);
  };

  return (
    <div className="bg-[#F8FAFC] pt-28 pb-20 md:pt-36 md:pb-28 min-h-screen">
      <div className="mx-auto max-w-7xl px-5">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-500 transition mb-8">
          <ArrowLeft size={16} /> {t.guide.backHome}
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy-700 mb-4">{t.guide.title}</h1>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg">{t.guide.subtitle}</p>
        </div>

        {/* Mobile ToC toggle */}
        <div className="lg:hidden mb-6">
          <button
            onClick={() => setTocOpen(!tocOpen)}
            className="w-full flex items-center justify-between gap-2 rounded-xl bg-white border border-slate-200 px-5 py-4 font-semibold text-slate-700"
          >
            <span className="flex items-center gap-2"><Menu size={18} /> {t.guide.toc}</span>
            {tocOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {tocOpen && (
            <div className="mt-2 rounded-xl bg-white border border-slate-200 p-4 space-y-1 max-h-80 overflow-y-auto">
              {tocSections.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className={`block w-full text-left text-sm px-3 py-2 rounded-lg transition ${activeSection === id ? "bg-brand-50 text-brand-600 font-semibold" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-8">
          {/* Desktop sidebar ToC */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-28 rounded-2xl bg-white border border-slate-200 p-5 max-h-[calc(100vh-8rem)] overflow-y-auto">
              <h3 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wider">{t.guide.toc}</h3>
              <nav className="space-y-0.5">
                {tocSections.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    className={`block w-full text-left text-[13px] px-3 py-1.5 rounded-lg transition ${activeSection === id ? "bg-brand-50 text-brand-600 font-semibold" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 space-y-6">
            <ContentComponent {...helpers} />

            {/* ─── CONTACT CTA ─── */}
            <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center">
              <h2 className="text-2xl font-bold text-navy-700 mb-2">{t.guide.contactTitle}</h2>
              <p className="text-slate-500 mb-6">{t.guide.contactSubtitle}</p>
              <a
                href="mailto:support@ozly.au"
                className="inline-flex items-center gap-2.5 rounded-full bg-brand-500 px-6 py-3.5 text-white font-semibold hover:bg-brand-600 transition shadow-lg shadow-brand-500/30"
              >
                <Mail size={18} />
                {t.guide.contactButton}
              </a>
            </div>

          </main>
        </div>

        {/* Back to top */}
        <div className="text-center mt-12">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-500 transition"
          >
            <ChevronUp size={16} /> {t.guide.backToTop}
          </button>
        </div>
      </div>
    </div>
  );
}
