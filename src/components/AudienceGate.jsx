// Full-screen audience gate on the home page — the "are you over 18?" of
// Ozly, but asking *who you are*: contractor (B2C, stays on the home) or
// business (B2B, → /business). The choice lives in sessionStorage: it holds
// for the current visit (no re-asking while navigating around) but every
// fresh visit asks again — founder's call, paired with the permanent
// Personal/Business switch in the navbar. Deliberately opened in an effect
// (never during render) so the build-time prerender ships clean HTML.
// Visual language: Apple-style sheet — bottom sheet on mobile, centered
// card on desktop, stacked borderless option rows.

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
      stored = window.sessionStorage.getItem(STORAGE_KEY);
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
      window.sessionStorage.setItem(STORAGE_KEY, audience);
    } catch {
      /* best-effort persistence only */
    }
    setOpen(false);
    if (audience === 'business') navigate('/business');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-xl sm:items-center sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.audienceGate.title}
    >
      <div className="w-full max-w-md rounded-t-[28px] bg-white px-6 pb-8 pt-9 shadow-2xl dark:bg-slate-900 sm:rounded-[28px] sm:px-10 sm:pb-10 anim-fade-in-scale">
        <img
          src={`${import.meta.env.BASE_URL}OSLY.svg`}
          alt="Ozly"
          width="36"
          height="37"
          className="mx-auto h-9"
        />

        <h2 className="mt-6 text-center text-[26px] font-semibold leading-tight tracking-tight text-navy-700 dark:text-white sm:text-[28px]">
          {t.audienceGate.title}
        </h2>
        <p className="mt-2 text-center text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
          {t.audienceGate.subtitle}
        </p>

        <div className="mt-8 space-y-3">
          <GateOption
            icon={User}
            title={t.audienceSplit.contractorTitle}
            body={t.audienceSplit.contractorBody}
            onClick={() => choose('contractor')}
          />
          <GateOption
            icon={Building2}
            title={t.audienceSplit.businessTitle}
            body={t.audienceSplit.businessBody}
            onClick={() => choose('business')}
          />
        </div>
      </div>
    </div>
  );
}

function GateOption({ icon: Icon, title, body, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-4 rounded-2xl bg-[#f5f5f7] p-4 text-left transition-colors hover:bg-[#ececee] dark:bg-slate-800 dark:hover:bg-slate-700/80 sm:p-5"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-700">
        <Icon size={19} className="text-brand-600 dark:text-brand-400" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold tracking-tight text-navy-700 dark:text-white">
          {title}
        </span>
        <span className="mt-0.5 block text-[13px] leading-snug text-slate-500 dark:text-slate-400">
          {body}
        </span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-slate-300 dark:text-slate-500" />
    </button>
  );
}
