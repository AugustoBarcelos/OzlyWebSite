import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { useI18n, useLangPath, useSeoMeta } from "../i18n";

/** Date → localized "15 Jun 2026" style, best-effort per language. */
function formatDate(iso, lang) {
  if (!iso) return "";
  try {
    const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es" : "en-AU";
    return new Date(iso + "T00:00:00").toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function Blog() {
  const { t, lang } = useI18n();
  const lp = useLangPath();
  useSeoMeta("blog");
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState(false);
  const tb = t.blog || {};

  useEffect(() => {
    window.scrollTo(0, 0);
    let active = true;
    fetch(`${import.meta.env.BASE_URL}blog-data/index.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => active && setPosts(data))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="bg-[#F8FAFC] pt-28 pb-20 md:pt-36 md:pb-28 min-h-screen">
      <div className="mx-auto max-w-3xl px-5">
        <Link
          to={lp("/")}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-500 transition mb-8"
        >
          <ArrowLeft size={16} /> {tb.backHome || "Home"}
        </Link>

        <header className="mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy-700 mb-4">
            {tb.title || "Ozly Blog"}
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl">{tb.intro}</p>
        </header>

        {error && (
          <p className="text-slate-500">{tb.empty || "No articles yet — check back soon."}</p>
        )}

        {posts && posts.length === 0 && (
          <p className="text-slate-500">{tb.empty || "No articles yet — check back soon."}</p>
        )}

        <div className="space-y-5">
          {(posts || []).map((post) => {
            const s = post.summaries[lang] || post.summaries[post.langs[0]];
            return (
              <Link
                key={post.slug}
                to={lp(`/blog/${post.slug}`)}
                className="group block rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-500/5 transition"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-400 mb-3">
                  <span>{formatDate(s.date, lang)}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} /> {s.readingTime} {tb.read || "min read"}
                  </span>
                  {!post.langs.includes(lang) && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 uppercase tracking-wide">
                      {post.langs[0]}
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-navy-700 group-hover:text-brand-600 transition mb-2">
                  {s.title}
                </h2>
                <p className="text-slate-500 leading-relaxed mb-4">{s.description}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
                  {tb.readMore || "Read"} <ArrowRight size={15} className="group-hover:translate-x-0.5 transition" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
