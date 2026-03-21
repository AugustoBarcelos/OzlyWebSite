import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ArrowLeft, Mail, BookOpen } from "lucide-react";
import { useI18n } from "../i18n";

const faqKeys = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10", "q11", "q12", "q13", "q14"];

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden transition hover:border-brand-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left bg-white hover:bg-slate-50/50 transition"
      >
        <span className="font-semibold text-slate-900">{question}</span>
        <ChevronDown
          size={20}
          className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-5 text-slate-600 leading-relaxed bg-white">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function Support() {
  const { t } = useI18n();

  return (
    <section className="bg-[#F8FAFC] pt-28 pb-20 md:pt-36 md:pb-28 min-h-screen">
      <div className="mx-auto max-w-3xl px-5">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-500 transition mb-8"
        >
          <ArrowLeft size={16} />
          {t.faq.backHome}
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-700 mb-4">
            {t.faq.pageTitle}
          </h1>
          <p className="text-slate-500 max-w-xl mx-auto">{t.faq.pageSubtitle}</p>
        </div>

        {/* FAQ accordion */}
        <div className="space-y-3">
          {faqKeys.map((key) => (
            <FaqItem
              key={key}
              question={t.faq[key]}
              answer={t.faq[key.replace("q", "a")]}
            />
          ))}
        </div>

        {/* Contact + Guide CTA */}
        <div className="mt-16 text-center rounded-2xl bg-white border border-slate-200 p-10">
          <h2 className="text-2xl font-bold text-navy-700 mb-2">{t.homeFaq.stillQuestions}</h2>
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
      </div>
    </section>
  );
}
