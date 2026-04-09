import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ArrowLeft, Mail, BookOpen, Search } from "lucide-react";
import { useI18n } from "../i18n";

// Category → list of question keys (q1..q89). Each question belongs to exactly one category.
const CATEGORIES = [
  { key: "cat_general", questions: ["q1", "q7"] },
  { key: "cat_account", questions: ["q10", "q31", "q32", "q33", "q34", "q35"] },
  { key: "cat_setup", questions: ["q36", "q37", "q38"] },
  { key: "cat_dashboard", questions: ["q24", "q25", "q39", "q40", "q41", "q42"] },
  {
    key: "cat_jobs",
    questions: ["q13", "q14", "q16", "q43", "q44", "q45", "q46", "q47", "q48", "q49", "q50"],
  },
  { key: "cat_contractors", questions: ["q51", "q52", "q53", "q54"] },
  {
    key: "cat_invoices",
    questions: ["q6", "q21", "q55", "q56", "q57", "q58", "q59", "q60"],
  },
  { key: "cat_expenses", questions: ["q3", "q15", "q61", "q62", "q63", "q64"] },
  { key: "cat_tax", questions: ["q4", "q26", "q65", "q66", "q67", "q68", "q69"] },
  { key: "cat_visa", questions: ["q8", "q28", "q70"] },
  { key: "cat_reimbursements", questions: ["q18", "q19", "q71", "q72"] },
  { key: "cat_settings", questions: ["q5", "q73", "q74", "q75", "q76", "q77"] },
  { key: "cat_hustle", questions: ["q9", "q78", "q79"] },
  { key: "cat_notifications", questions: ["q80"] },
  {
    key: "cat_subscription",
    questions: ["q12", "q22", "q23", "q29", "q81", "q82", "q83"],
  },
  { key: "cat_sync", questions: ["q2", "q84", "q85"] },
  { key: "cat_legal", questions: ["q27", "q30"] },
  {
    key: "cat_support",
    questions: ["q11", "q17", "q20", "q86", "q87", "q88", "q89"],
  },
];

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden transition hover:border-brand-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left bg-white dark:bg-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-700 transition"
      >
        <span className="font-semibold text-slate-900 dark:text-slate-100">{question}</span>
        <ChevronDown
          size={20}
          className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-5 text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-800 whitespace-pre-line">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function Support() {
  const { t } = useI18n();
  const [activeCat, setActiveCat] = useState("all");
  const [query, setQuery] = useState("");

  // Build flat list of all questions, with their category, and apply filtering.
  const filteredCategories = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();

    const matchesQuery = (qKey) => {
      if (!normalisedQuery) return true;
      const q = (t.faq[qKey] || "").toLowerCase();
      const a = (t.faq[qKey.replace("q", "a")] || "").toLowerCase();
      return q.includes(normalisedQuery) || a.includes(normalisedQuery);
    };

    return CATEGORIES.map((cat) => {
      const questions = cat.questions.filter((qKey) => {
        if (activeCat !== "all" && cat.key !== activeCat) return false;
        return matchesQuery(qKey);
      });
      return { ...cat, questions };
    }).filter((cat) => cat.questions.length > 0);
  }, [activeCat, query, t]);

  const totalResults = filteredCategories.reduce(
    (sum, cat) => sum + cat.questions.length,
    0,
  );

  return (
    <section className="bg-[#F8FAFC] dark:bg-slate-950 pt-28 pb-20 md:pt-36 md:pb-28 min-h-screen">
      <div className="mx-auto max-w-4xl px-5">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-500 transition mb-8"
        >
          <ArrowLeft size={16} />
          {t.faq.backHome}
        </Link>

        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-700 dark:text-white mb-4">
            {t.faq.pageTitle}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            {t.faq.pageSubtitle}
          </p>
        </div>

        {/* Search bar */}
        <div className="relative mb-6">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.faq.searchPlaceholder}
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-900 transition"
          />
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-2 mb-10">
          <button
            onClick={() => setActiveCat("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              activeCat === "all"
                ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-brand-300"
            }`}
          >
            {t.faq.showAll}
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCat(cat.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeCat === cat.key
                  ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-brand-300"
              }`}
            >
              {t.faq[cat.key]}
            </button>
          ))}
        </div>

        {/* FAQ accordion grouped by category */}
        {totalResults === 0 ? (
          <div className="text-center py-16 px-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <p className="text-slate-500 dark:text-slate-400">{t.faq.noResults}</p>
          </div>
        ) : (
          <div className="space-y-10">
            {filteredCategories.map((cat) => (
              <div key={cat.key}>
                <h2 className="text-lg font-bold text-navy-700 dark:text-white mb-4 px-1">
                  {t.faq[cat.key]}
                  <span className="ml-2 text-sm font-normal text-slate-400">
                    ({cat.questions.length})
                  </span>
                </h2>
                <div className="space-y-3">
                  {cat.questions.map((qKey) => (
                    <FaqItem
                      key={qKey}
                      question={t.faq[qKey]}
                      answer={t.faq[qKey.replace("q", "a")]}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contact + Guide CTA */}
        <div className="mt-16 text-center rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-10">
          <h2 className="text-2xl font-bold text-navy-700 dark:text-white mb-2">
            {t.homeFaq.stillQuestions}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
            {t.homeFaq.stillQuestionsDesc}
          </p>
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
      </div>
    </section>
  );
}
