import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Globe } from "lucide-react";
import { useI18n, supportedLangs } from "../i18n";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { lang, setLang, t } = useI18n();
  const location = useLocation();
  const isHome = location.pathname === "/";

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
      <Link to={`/${href}`} className="hover:text-brand-500 transition-colors" onClick={() => setOpen(false)}>
        {label}
      </Link>
    );

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-xl shadow-sm border-b border-slate-200/60"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
        {/* Logo — hidden on mobile when scrolled */}
        <Link
          to="/"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={`flex items-center gap-2 transition-all duration-300 ${
            scrolled ? "md:opacity-100 md:visible invisible w-0 md:w-auto overflow-hidden" : ""
          }`}
        >
          <img src={`${import.meta.env.BASE_URL}OSLY.svg`} alt="Ozly" className="h-36" />
          <span className="text-2xl font-bold text-brand-500" style={{ fontFamily: "'Montserrat', sans-serif" }}>OZLY</span>
        </Link>

        {/* Mobile hamburger — moves to left when logo hidden */}
        <button onClick={() => setOpen(!open)} className="md:hidden text-slate-700" aria-label="Menu">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          {navLink("#features", t.nav.features)}
          {navLink("#comparison", t.nav.comparison)}
          {navLink("#pricing", t.nav.pricing)}
          <Link to="/support" className="hover:text-brand-500 transition-colors">{t.nav.support}</Link>

          {/* Lang switcher */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setLangOpen(!langOpen); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-brand-300 hover:text-brand-500 transition-colors"
            >
              <Globe size={14} />
              {lang.toUpperCase()}
            </button>
            {langOpen && (
              <div
                className="absolute right-0 mt-2 w-24 rounded-xl bg-white border border-slate-200 shadow-xl py-1 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                {supportedLangs.map(({ code, label }) => (
                  <button
                    key={code}
                    onClick={() => { setLang(code); setLangOpen(false); }}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-brand-50 transition-colors ${
                      code === lang ? "text-brand-500 font-bold" : "text-slate-600"
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
            className="ml-2 inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-white text-sm font-semibold hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/20"
          >
            {t.nav.download}
          </a>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-100 px-6 pb-5 space-y-3 text-sm font-medium text-slate-600">
          {isHome ? (
            <>
              <a href="#features" className="block py-2.5" onClick={() => setOpen(false)}>{t.nav.features}</a>
              <a href="#comparison" className="block py-2.5" onClick={() => setOpen(false)}>{t.nav.comparison}</a>
              <a href="#pricing" className="block py-2.5" onClick={() => setOpen(false)}>{t.nav.pricing}</a>
            </>
          ) : (
            <>
              <Link to="/#features" className="block py-2.5" onClick={() => setOpen(false)}>{t.nav.features}</Link>
              <Link to="/#comparison" className="block py-2.5" onClick={() => setOpen(false)}>{t.nav.comparison}</Link>
              <Link to="/#pricing" className="block py-2.5" onClick={() => setOpen(false)}>{t.nav.pricing}</Link>
            </>
          )}
          <Link to="/support" className="block py-2.5" onClick={() => setOpen(false)}>{t.nav.support}</Link>

          <div className="flex gap-2 py-2">
            {supportedLangs.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                  code === lang
                    ? "bg-brand-500 text-white border-brand-500"
                    : "border-slate-200 text-slate-600 hover:border-brand-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <a
            href="#download"
            className="block rounded-full bg-brand-500 px-5 py-2.5 text-center text-white font-semibold"
            onClick={() => setOpen(false)}
          >
            {t.nav.download}
          </a>
        </div>
      )}
    </nav>
  );
}
