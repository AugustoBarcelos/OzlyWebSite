// Full-screen audience gate on the home page — the "are you over 18?" of
// Ozly, but asking *who you are*: contractor (B2C, stays on the home) or
// business (B2B, → /business). The choice is stored in localStorage so a
// visitor only ever sees the gate once; returning visitors go straight to
// the content. Deliberately opened in an effect (never during render) so the
// build-time prerender ships clean HTML and people who already chose see no
// flash.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Building2, ChevronRight } from 'lucide-react';
import { useI18n } from '../i18n';

const STORAGE_KEY = 'ozly_audience'; // 'contractor' | 'business'

export default function AudienceGate() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let stored = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      /* private mode etc. — just show the gate */
    }
    if (!stored) setOpen(true);
  }, []);

  // Lock page scroll while the gate is up.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const choose = (audience) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, audience);
    } catch {
      /* best-effort persistence only */
    }
    setOpen(false);
    if (audience === 'business') navigate('/business');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-900/60 px-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={t.audienceGate.title}
    >
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-7 shadow-2xl sm:p-9 anim-fade-in-scale">
        <div className="flex items-center justify-center gap-2">
          <img src={`${import.meta.env.BASE_URL}OSLY.svg`} alt="Ozly" width="40" height="41" className="h-10" />
          <span className="text-2xl font-bold text-brand-500" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            OZLY
          </span>
        </div>

        <h2 className="mt-5 text-center text-xl font-extrabold text-navy-700 dark:text-white sm:text-2xl">
          {t.audienceGate.title}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          {t.audienceGate.subtitle}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => choose('contractor')}
            className="group rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-5 text-left transition-colors hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-900/20 cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/40">
              <User size={20} className="text-brand-500" />
            </div>
            <p className="mt-3 text-sm font-bold text-navy-700 dark:text-white">
              {t.audienceSplit.contractorTitle}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {t.audienceSplit.contractorBody}
            </p>
            <ChevronRight
              size={15}
              className="mt-3 text-brand-500 transition-transform group-hover:translate-x-0.5"
            />
          </button>

          <button
            type="button"
            onClick={() => choose('business')}
            className="group rounded-2xl border-2 border-brand-200 dark:border-brand-800 bg-brand-50/60 dark:bg-brand-900/20 p-5 text-left transition-colors hover:border-brand-500 cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-brand-900/40">
              <Building2 size={20} className="text-brand-600" />
            </div>
            <p className="mt-3 text-sm font-bold text-navy-700 dark:text-white">
              {t.audienceSplit.businessTitle}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {t.audienceSplit.businessBody}
            </p>
            <ChevronRight
              size={15}
              className="mt-3 text-brand-600 dark:text-brand-400 transition-transform group-hover:translate-x-0.5"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
