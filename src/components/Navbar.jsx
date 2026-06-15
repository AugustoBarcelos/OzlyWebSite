import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Globe } from "lucide-react";
import { useI18n, supportedLangs, useLangPath, stripLangPrefix } from "../i18n";
import { trackEvent } from "../lib/track";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { lang, setLang, t } = useI18n();
  const location = useLocation();
  const lp = useLangPath();
  // Language-prefixed variants (/pt, /es/business, …) count as the same page.
  const barePath = stripLangPrefix(location.pathname);
  const isHome = barePath === "/";
  const isBusiness = barePath === "/business";

  // Audience switch (Personal | Business) — visible everywhere so visitors
  // can flip sides at any time; keeps the per-visit gate choice in sync.
  const rememberAudience = (audience) => {
    try {
      window.sessionStorage.setItem("ozly_audience", audience);
    } catch {
      /* best-effort only */
    }
    setOpen(false);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!langOpen) return;
    const close = () => setLangOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [langOpen]);

  const navLink = (href, label) =>
    isHome ? (
      <a href={href} className="hover:text-brand-500 transition-colors" onClick={() => setOpen(false)}>
        {label}
      </a>
    ) : (
      <Link to={`${lp("/")}${href}`} className="hover:text-brand-500 transition-colors" onClick={() => setOpen(false)}>
        {label}
      </Link>
    );

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "md:bg-white/90 md:dark:bg-slate-900/90 md:backdrop-blur-xl md:shadow-sm md:border-b md:border-slate-200/60 md:dark:border-slate-700/60"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
        {/* Logo — hidden on mobile when scrolled */}
        <Link
          to="/"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={`flex items-center gap-[5px] transition-all duration-300 ${
            scrolled ? "md:opacity-100 md:visible invisible w-0 md:w-auto overflow-hidden" : ""
          }`}
        >
          <img src={`${import.meta.env.BASE_URL}OSLY.svg`} alt="Ozly" width="47" height="48" className="h-12" />
          <span className="text-2xl font-bold text-brand-500" style={{ fontFamily: "'Montserrat', sans-serif" }}>OZLY</span>
        </Link>

        {/* Mobile hamburger — moves to left when logo hidden */}
        <button onClick={() => setOpen(!open)} className="md:hidden text-slate-700 dark:text-slate-200" aria-label="Menu">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
          {navLink("#features", t.nav.features)}
          {navLink("#comparison", t.nav.comparison)}
          {navLink("#pricing", t.nav.pricing)}
          {navLink("#faq", t.nav.support)}
          <Link to={lp("/blog")} className="hover:text-brand-500 transition-colors" onClick={() => setOpen(false)}>
            {t.nav.blog}
          </Link>

          {/* Personal | Business switch */}
          <div className="flex items-center rounded-full bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-semibold">
            <Link
              to={lp("/")}
              onClick={() => rememberAudience("contractor")}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                !isBusiness
                  ? "bg-white dark:bg-slate-600 text-navy-700 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-navy-700 dark:hover:text-white"
              }`}
            >
              {t.audienceSwitch.personal}
            </Link>
            <Link
              to={lp("/business")}
              onClick={() => rememberAudience("business")}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                isBusiness
                  ? "bg-white dark:bg-slate-600 text-navy-700 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-navy-700 dark:hover:text-white"
              }`}
            >
              {t.audienceSwitch.business}
            </Link>
          </div>

          {/* Lang switcher */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setLangOpen(!langOpen); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:border-brand-300 hover:text-brand-500 transition-colors"
            >
              <Globe size={14} />
              {lang.toUpperCase()}
            </button>
            {langOpen && (
              <div
                className="absolute right-0 mt-2 w-24 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                {supportedLangs.map(({ code, label }) => (
                  <button
                    key={code}
                    onClick={() => { setLang(code); setLangOpen(false); }}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-brand-50 dark:hover:bg-slate-700 transition-colors ${
                      code === lang ? "text-brand-500 font-bold" : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <a
            href="#download"
            onClick={() => trackEvent("cta_click", { cta: "nav_download", lang })}
            className="ml-2 inline-flex items-center gap-2 rounded-full bg-brand-800 px-5 py-2.5 text-white text-sm font-semibold hover:bg-brand-900 transition-colors shadow-lg shadow-brand-500/20"
          >
            {t.nav.download}
          </a>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-100 dark:border-slate-700 px-6 pb-5 space-y-3 text-sm font-medium text-slate-600 dark:text-slate-300">
          {/* Personal | Business switch */}
          <div className="flex items-center rounded-full bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-semibold mt-3">
            <Link
              to={lp("/")}
              onClick={() => rememberAudience("contractor")}
              className={`flex-1 rounded-full px-3 py-2 text-center transition-colors ${
                !isBusiness
                  ? "bg-white dark:bg-slate-600 text-navy-700 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {t.audienceSwitch.personal}
            </Link>
            <Link
              to={lp("/business")}
              onClick={() => rememberAudience("business")}
              className={`flex-1 rounded-full px-3 py-2 text-center transition-colors ${
                isBusiness
                  ? "bg-white dark:bg-slate-600 text-navy-700 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {t.audienceSwitch.business}
            </Link>
          </div>

          {isHome ? (
            <>
              <a href="#features" className="block py-2.5" onClick={() => setOpen(false)}>{t.nav.features}</a>
              <a href="#comparison" className="block py-2.5" onClick={() => setOpen(false)}>{t.nav.comparison}</a>
              <a href="#pricing" className="block py-2.5" onClick={() => setOpen(false)}>{t.nav.pricing}</a>
            </>
          ) : (
            <>
              <Link to={`${lp("/")}#features`} className="block py-2.5" onClick={() => setOpen(false)}>{t.nav.features}</Link>
              <Link to={`${lp("/")}#comparison`} className="block py-2.5" onClick={() => setOpen(false)}>{t.nav.comparison}</Link>
              <Link to={`${lp("/")}#pricing`} className="block py-2.5" onClick={() => setOpen(false)}>{t.nav.pricing}</Link>
            </>
          )}
          {isHome ? (
            <a href="#faq" className="block py-2.5" onClick={() => setOpen(false)}>{t.nav.support}</a>
          ) : (
            <Link to={`${lp("/")}#faq`} className="block py-2.5" onClick={() => setOpen(false)}>{t.nav.support}</Link>
          )}
          <Link to={lp("/blog")} className="block py-2.5" onClick={() => setOpen(false)}>{t.nav.blog}</Link>

          <div className="flex gap-2 py-2">
            {supportedLangs.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                  code === lang
                    ? "bg-brand-800 text-white border-brand-800"
                    : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-brand-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <a
            href="#download"
            className="block rounded-full bg-brand-800 px-5 py-2.5 text-center text-white font-semibold"
            onClick={() => { setOpen(false); trackEvent("cta_click", { cta: "nav_download_mobile", lang }); }}
          >
            {t.nav.download}
          </a>
        </div>
      )}
    </nav>
  );
}
