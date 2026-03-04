import { useI18n } from "../i18n";

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="bg-navy-700 text-slate-400 py-10">
      <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
        <img src="/ozly_logo.svg" alt="Ozly" className="h-7 brightness-0 invert" />
        <p>{t.footer.copyright}</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-white transition-colors">{t.footer.privacy}</a>
          <a href="#" className="hover:text-white transition-colors">{t.footer.terms}</a>
        </div>
      </div>
    </footer>
  );
}
