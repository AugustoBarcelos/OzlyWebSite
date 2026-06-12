import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { useI18n } from "../i18n";

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="bg-navy-700 text-slate-400 py-10">
      {/* Global tax-advice disclaimer — required framing under the Tax Agent
          Services Act 2009: Ozly is not a registered tax agent. */}
      <div className="mx-auto max-w-7xl px-6 pb-8">
        <p className="text-xs leading-relaxed text-slate-500 text-center md:text-left border-b border-white/10 pb-6">
          {t.footer.disclaimer}
        </p>
      </div>
      <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}OSLY.svg`} alt="Ozly" width="32" height="32" className="h-8 brightness-0 invert" />
          <span className="text-lg font-bold text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>OZLY</span>
        </div>
        <p>{t.footer.copyright}</p>
        <div className="flex items-center gap-4">
          <a href="mailto:contact@ozly.com.au" className="inline-flex items-center gap-1.5 hover:text-white transition-colors">
            <Mail size={14} />
            contact@ozly.com.au
          </a>
        </div>
        <div className="flex gap-6">
          <Link to="/business" className="hover:text-white transition-colors">{t.footer.business}</Link>
          <Link to="/privacy-policy" className="hover:text-white transition-colors">{t.footer.privacy}</Link>
          <Link to="/terms-of-use" className="hover:text-white transition-colors">{t.footer.terms}</Link>
        </div>
      </div>
    </footer>
  );
}
