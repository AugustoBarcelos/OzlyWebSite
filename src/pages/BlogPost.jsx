import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { useI18n, useLangPath } from "../i18n";

const APP_STORE = "https://apps.apple.com/app/ozly/id6760398649";
const PLAY_STORE = "https://play.google.com/store/apps/details?id=com.augusto.ozly";

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

/** The prerender hands React the post body inline so the first paint needs no
 *  fetch. Only valid for the post the page was server-rendered for. */
function readInline(slug, lang) {
  const el = document.getElementById("blog-post-data");
  if (!el) return null;
  try {
    const data = JSON.parse(el.textContent);
    if (data.slug === slug && data.lang === lang) return data;
  } catch {
    /* ignore malformed */
  }
  return null;
}

async function fetchPost(slug, lang) {
  const base = import.meta.env.BASE_URL;
  // Try the requested language first; fall back to whatever the post exists in.
  const direct = await fetch(`${base}blog-data/${slug}.${lang}.json`);
  if (direct.ok) return direct.json();
  const idx = await fetch(`${base}blog-data/index.json`);
  if (!idx.ok) throw new Error("not found");
  const entry = (await idx.json()).find((p) => p.slug === slug);
  if (!entry) throw new Error("not found");
  const fb = await fetch(`${base}blog-data/${slug}.${entry.langs[0]}.json`);
  if (!fb.ok) throw new Error("not found");
  return fb.json();
}

function applyMeta(post) {
  document.title = `${post.title} — Ozly`;
  const set = (sel, val) => document.querySelector(sel)?.setAttribute("content", val);
  set('meta[name="description"]', post.description);
  set('meta[property="og:title"]', `${post.title} — Ozly`);
  set('meta[property="og:description"]', post.description);
}

// Remount on slug/language change (via key) so the inline-data read in the
// initial state runs fresh each time and we never flash a stale post.
export default function BlogPost() {
  const { slug } = useParams();
  const { lang } = useI18n();
  return <BlogPostInner key={`${slug}:${lang}`} slug={slug} lang={lang} />;
}

function BlogPostInner({ slug, lang }) {
  const { t } = useI18n();
  const lp = useLangPath();
  const tb = t.blog || {};
  // Direct landings carry the body inline (prerendered) → render with no fetch.
  const [post, setPost] = useState(() => readInline(slug, lang));
  const [error, setError] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const inline = readInline(slug, lang);
    if (inline) {
      applyMeta(inline);
      return;
    }
    let active = true;
    fetchPost(slug, lang)
      .then((data) => {
        if (!active) return;
        setPost(data);
        applyMeta(data);
      })
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [slug, lang]);

  if (error) {
    return (
      <div className="bg-[#F8FAFC] pt-36 pb-28 min-h-screen">
        <div className="mx-auto max-w-2xl px-5 text-center">
          <p className="text-slate-500 mb-6">{tb.notFound || "This article isn't available."}</p>
          <Link to={lp("/blog")} className="inline-flex items-center gap-2 font-semibold text-brand-600">
            <ArrowLeft size={16} /> {tb.back || "All articles"}
          </Link>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] pt-28 pb-20 md:pt-36 md:pb-28 min-h-screen">
      <article className="mx-auto max-w-3xl px-5">
        <Link
          to={lp("/blog")}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-500 transition mb-8"
        >
          <ArrowLeft size={16} /> {tb.back || "All articles"}
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-700 mb-4 leading-tight">
            {post.title}
          </h1>
          <p className="text-lg text-slate-500 mb-4">{post.description}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
            <span>{post.author ? `${tb.by || "By"} ${post.author}` : ""}</span>
            <span>{formatDate(post.date, lang)}</span>
            <span className="inline-flex items-center gap-1">
              <Clock size={13} /> {post.readingTime} {tb.read || "min read"}
            </span>
          </div>
        </header>

        {post.cover && (
          <img
            src={post.cover}
            alt=""
            className="w-full rounded-2xl border border-slate-200 mb-8"
            loading="lazy"
          />
        )}

        <div className="prose-blog" dangerouslySetInnerHTML={{ __html: post.html }} />

        {/* Download CTA */}
        <div className="mt-12 rounded-2xl bg-navy-700 text-white p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">{tb.ctaTitle || "Run your ABN the easy way"}</h2>
          <p className="text-slate-300 mb-6">
            {tb.ctaSubtitle || "Free invoicing and real-time tax estimates, built for Australian sole traders."}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={APP_STORE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 font-semibold text-white hover:bg-brand-600 transition"
            >
              App Store <ArrowRight size={16} />
            </a>
            <a
              href={PLAY_STORE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 font-semibold text-white hover:bg-white/20 transition"
            >
              Google Play <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </article>
    </div>
  );
}
