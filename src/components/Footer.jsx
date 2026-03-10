import { Link } from "react-router-dom";
import { useI18n } from "../i18n";

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="bg-navy-700 text-slate-400 py-10">
      <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}OSLY.svg`} alt="Ozly" className="h-8 brightness-0 invert" />
          <span className="text-lg font-bold text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>OZLY</span>
        </div>
        <p>{t.footer.copyright}</p>
        <div className="flex gap-6">
          <Link to="/privacy-policy" className="hover:text-white transition-colors">{t.footer.privacy}</Link>
          <Link to="/terms-of-use" className="hover:text-white transition-colors">{t.footer.terms}</Link>
        </div>
      </div>
    </footer>
  );
}
