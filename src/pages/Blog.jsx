import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
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

// Deterministic brand gradient per post (so cards look designed without needing
// cover images). Same slug → same gradient every render.
const GRADIENTS = [
  "linear-gradient(135deg,#2BBB97,#1d8a6e)",
  "linear-gradient(135deg,#89c94e,#24a383)",
  "linear-gradient(135deg,#162431,#24a383)",
  "linear-gradient(135deg,#33c19e,#9DD760)",
  "linear-gradient(135deg,#1d8a6e,#162431)",
];
function gradientFor(slug) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
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

  const empty = (error || (posts && posts.length === 0));

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-gradient-to-b from-brand-50/70 to-white border-b border-slate-100">
        <div className="mx-auto max-w-4xl px-5 pt-32 pb-12 md:pt-40 md:pb-16 text-center">
          <span className="inline-block text-xs font-extrabold uppercase tracking-[0.18em] text-brand-600 mb-4">
            {tb.eyebrow || "Ozly Blog"}
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-navy-700 tracking-tight mb-4">
            {tb.title || "Ozly Blog"}
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">{tb.intro}</p>
        </div>
      </div>

      {/* Posts */}
      <div className="mx-auto max-w-5xl px-5 py-14 md:py-20">
        {empty && (
          <p className="text-center text-slate-400 py-20">{tb.empty || "No articles yet — check back soon."}</p>
        )}

        <div className="grid gap-7 md:grid-cols-2">
          {(posts || []).map((post) => {
            const s = post.summaries[lang] || post.summaries[post.langs[0]];
            const tags = (s.tags || []).slice(0, 2);
            return (
              <Link
                key={post.slug}
                to={lp(`/blog/${post.slug}`)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-xl hover:shadow-brand-500/10"
              >
                {/* Gradient banner */}
                <div className="relative h-32 w-full" style={{ background: gradientFor(post.slug) }}>
                  {tags[0] && (
                    <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-navy-700">
                      {tags[0]}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400">
                    <span>{formatDate(s.date, lang)}</span>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock size={12} /> {s.readingTime} {tb.read || "min read"}
                    </span>
                    {!post.langs.includes(lang) && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 uppercase">{post.langs[0]}</span>
                    )}
                  </div>
                  <h2 className="mb-2 text-xl font-bold leading-snug text-navy-700 transition group-hover:text-brand-600">
                    {s.title}
                  </h2>
                  <p className="mb-5 flex-1 text-[15px] leading-relaxed text-slate-500 line-clamp-3">
                    {s.description}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600">
                    {tb.readMore || "Read article"}
                    <ArrowRight size={15} className="transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
