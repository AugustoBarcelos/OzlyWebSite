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
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const GRADIENTS = [
  "linear-gradient(135deg,#2BBB97,#1d8a6e)",
  "linear-gradient(135deg,#89c94e,#24a383)",
  "linear-gradient(135deg,#162431,#24a383)",
  "linear-gradient(135deg,#33c19e,#9DD760)",
  "linear-gradient(135deg,#1d8a6e,#162431)",
];
function gradientFor(slug = "") {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
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

// Remount on slug/language change so the inline-data read runs fresh.
export default function BlogPost() {
  const { slug } = useParams();
  const { lang } = useI18n();
  return <BlogPostInner key={`${slug}:${lang}`} slug={slug} lang={lang} />;
}

function BlogPostInner({ slug, lang }) {
  const { t } = useI18n();
  const lp = useLangPath();
  const tb = t.blog || {};
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
      <div className="bg-white pt-40 pb-28 min-h-screen">
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

  const tags = (post.tags || []).slice(0, 3);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero band */}
      <header className="relative overflow-hidden border-b border-slate-100">
        <div className="absolute inset-0 opacity-[0.07]" style={{ background: gradientFor(post.slug) }} />
        <div className="relative mx-auto max-w-3xl px-5 pt-28 pb-10 md:pt-36 md:pb-12">
          {/* Breadcrumb */}
          <nav className="mb-6 text-sm text-slate-400">
            <Link to={lp("/blog")} className="font-medium hover:text-brand-600">
              {tb.title || "Blog"}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-500">{tags[0] || (tb.read ? "" : "")}</span>
          </nav>

          {tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-700">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-3xl sm:text-[2.6rem] font-extrabold leading-[1.12] tracking-tight text-navy-700">
            {post.title}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-500">{post.description}</p>

          {/* Author / meta */}
          <div className="mt-7 flex items-center gap-3 border-t border-slate-100 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-sm font-extrabold text-white">
              O
            </div>
            <div className="text-sm">
              <div className="font-semibold text-navy-700">{post.author || "Ozly"}</div>
              <div className="flex items-center gap-2 text-slate-400">
                <span>{formatDate(post.date, lang)}</span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} /> {post.readingTime} {tb.read || "min read"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <article className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        <div className="prose-blog" dangerouslySetInnerHTML={{ __html: post.html }} />

        {/* Download CTA */}
        <div className="mt-14 overflow-hidden rounded-3xl bg-navy-700 p-8 text-center md:p-10">
          <h2 className="text-2xl font-extrabold text-white">{tb.ctaTitle || "Run your ABN the easy way"}</h2>
          <p className="mx-auto mt-2 max-w-md text-slate-300">
            {tb.ctaSubtitle || "Free invoicing and real-time tax estimates, built for Australian sole traders."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href={APP_STORE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 font-bold text-white transition hover:bg-brand-600"
            >
              App Store <ArrowRight size={16} />
            </a>
            <a
              href={PLAY_STORE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 font-bold text-white transition hover:bg-white/20"
            >
              Google Play <ArrowRight size={16} />
            </a>
          </div>
        </div>

        {/* Back */}
        <div className="mt-10 text-center">
          <Link to={lp("/blog")} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-brand-600">
            <ArrowLeft size={16} /> {tb.back || "All articles"}
          </Link>
        </div>
      </article>
    </div>
  );
}
