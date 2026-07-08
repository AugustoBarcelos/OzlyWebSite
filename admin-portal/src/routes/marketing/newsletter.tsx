import { useState, useEffect, useCallback } from 'react';
import { Card } from '@tremor/react';
import { PageHeader } from './_PageHeader';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/Spinner';
import {
  generateNewsletter,
  type Newsletter,
  type NewsletterLang,
  type LangCode,
} from '@/lib/newsletter';
import {
  createBroadcast,
  sendBroadcastNow,
  fetchAudienceCount,
} from '@/lib/messaging';

type Step = 'pick' | 'generating' | 'edit';
const LANGS: LangCode[] = ['en', 'pt', 'es'];
const LANG_LABEL: Record<LangCode, string> = { en: 'EN', pt: 'PT', es: 'ES' };

// The one compliant segment for a mass newsletter send (Spam Act) — mirrors
// what MESSAGING_SEGMENTS[0] documents and what the README prescribes.
const NEWSLETTER_SEGMENT = 'newsletter';

export function MarketingNewsletterPage() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('pick');
  const [custom, setCustom] = useState('');

  const [nl, setNl] = useState<Newsletter | null>(null);
  const [lang, setLang] = useState<LangCode>('en');
  const [sending, setSending] = useState(false);

  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [loadingAudience, setLoadingAudience] = useState(false);

  const loadAudience = useCallback(() => {
    setLoadingAudience(true);
    fetchAudienceCount(NEWSLETTER_SEGMENT)
      .then((r) => {
        setAudienceCount(r.count);
        setLoadingAudience(false);
      })
      .catch(() => {
        setAudienceCount(null);
        setLoadingAudience(false);
      });
  }, []);

  useEffect(() => {
    if (isAdmin) loadAudience();
  }, [isAdmin, loadAudience]);

  if (!isAdmin) {
    return (
      <section className="space-y-6">
        <PageHeader title="Newsletter" description="Gerar e enviar edições da newsletter com IA." />
        <Card>
          <p className="text-sm text-navy-400">Só administradores podem criar a newsletter.</p>
        </Card>
      </section>
    );
  }

  async function onGenerate() {
    const topic = custom.trim();
    if (!topic) return;
    setStep('generating');
    try {
      const result = await generateNewsletter(topic);
      setNl(result);
      setLang('en');
      setStep('edit');
    } catch (e) {
      toast({ variant: 'error', title: 'Falha ao gerar', description: errMsg(e) });
      setStep('pick');
    }
  }

  function updateField(field: keyof NewsletterLang, value: string) {
    setNl((p) => (p ? { ...p, [lang]: { ...p[lang], [field]: value } } : p));
  }

  async function onSend() {
    if (!nl) return;
    const draft = nl[lang];
    if (!draft.subject.trim() || !draft.body.trim()) {
      toast({ variant: 'error', title: 'Subject e corpo são obrigatórios' });
      return;
    }
    const count = audienceCount !== null ? `${audienceCount.toLocaleString()} destinatário(s)` : 'a audiência da newsletter';
    if (
      !window.confirm(
        `Enviar esta edição (${LANG_LABEL[lang]}) pra ${count}? Confira os números antes — o envio é near-real-time (≤1 min).`,
      )
    ) {
      return;
    }
    setSending(true);
    try {
      const created = await createBroadcast({
        channel: 'msg_email',
        segment: NEWSLETTER_SEGMENT,
        subject: draft.subject,
        body: draft.body,
      });
      await sendBroadcastNow(created.broadcast_id);
      toast({
        variant: 'success',
        title: 'Newsletter enviada',
        description: `${created.audience_count.toLocaleString()} destinatários (${LANG_LABEL[lang]}) — sai em ≤1 min.`,
      });
      setStep('pick');
      setNl(null);
      setCustom('');
      loadAudience();
    } catch (e) {
      toast({ variant: 'error', title: 'Falha ao enviar', description: errMsg(e) });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader title="Newsletter" description="Gere uma edição com IA (EN/PT/ES), revise e envie pra newsletter." />

      {/* Audience banner */}
      <Card className="flex items-center justify-between gap-3 py-3">
        <p className="text-sm text-navy-600">
          Segmento: <strong>Newsletter (consentidos)</strong> · opt-in de marketing + leads pré-signup.
        </p>
        <p className="text-sm text-navy-500">
          Audiência:{' '}
          <strong>
            {loadingAudience
              ? '…'
              : audienceCount !== null
                ? `${audienceCount.toLocaleString()} usuários`
                : '—'}
          </strong>
        </p>
      </Card>

      {/* PICK */}
      {step === 'pick' && (
        <Card className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-semibold text-navy-700" htmlFor="nl-topic">
              Tópico / brief da edição
            </label>
            <input
              id="nl-topic"
              type="text"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="ex: Novo ano fiscal — o que muda pra quem tem ABN"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            />
            <p className="mt-1 text-xs text-navy-300">
              A IA escreve subject, preheader e corpo em inglês, português e espanhol. Sem emoji; só fatos reais de imposto/ATO.
            </p>
          </div>

          <button
            type="button"
            disabled={!custom.trim()}
            onClick={() => void onGenerate()}
            className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-40"
          >
            Gerar com IA
          </button>
        </Card>
      )}

      {/* GENERATING */}
      {step === 'generating' && (
        <Card>
          <div className="flex items-center gap-3">
            <Spinner />
            <span className="text-sm text-navy-600">
              Escrevendo em inglês, português e espanhol… leva ~30–60s.
            </span>
          </div>
        </Card>
      )}

      {/* EDIT */}
      {step === 'edit' && nl && (
        <Card className="space-y-4">
          {/* Lang tabs */}
          <div className="flex gap-2">
            {LANGS.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
                  lang === code ? 'bg-navy-700 text-white' : 'bg-slate-100 text-navy-600 hover:bg-slate-200'
                }`}
              >
                {LANG_LABEL[code]}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-navy-700" htmlFor="f-subject">
              Subject
            </label>
            <input
              id="f-subject"
              type="text"
              value={nl[lang].subject}
              onChange={(e) => updateField('subject', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-navy-700" htmlFor="f-preheader">
              Preheader (prévia da caixa de entrada)
            </label>
            <input
              id="f-preheader"
              type="text"
              value={nl[lang].preheader}
              onChange={(e) => updateField('preheader', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-navy-700" htmlFor="f-body">
              Corpo
            </label>
            <textarea
              id="f-body"
              value={nl[lang].body}
              onChange={(e) => updateField('body', e.target.value)}
              className="h-72 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs leading-relaxed focus:border-brand-400 focus:outline-none"
            />
            <p className="mt-1 text-xs text-navy-300">
              O link de unsubscribe é adicionado automaticamente no envio.
            </p>
          </div>

          {/* Live preview */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="mb-2 text-sm font-bold text-navy-700">Prévia ({LANG_LABEL[lang]})</p>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-navy-800">{nl[lang].subject || '(sem subject)'}</p>
              <p className="text-xs text-navy-400">{nl[lang].preheader || '(sem preheader)'}</p>
              <hr className="my-3 border-slate-100" />
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-navy-700">
                {nl[lang].body || '(corpo vazio)'}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            ⚠️ A IA grátis erra número fiscal. Confira contra a{' '}
            <a className="underline" href="https://www.ato.gov.au/" target="_blank" rel="noopener noreferrer">ATO</a>{' '}
            antes de enviar.
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => void onSend()}
              disabled={sending || !nl[lang].subject.trim() || !nl[lang].body.trim()}
              className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              {sending ? 'Enviando…' : `Enviar pra Newsletter (${LANG_LABEL[lang]})`}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Descartar e começar de novo?')) {
                  setStep('pick');
                  setNl(null);
                }
              }}
              className="ml-auto text-sm font-medium text-navy-400 hover:text-navy-600"
            >
              ← Recomeçar
            </button>
          </div>
        </Card>
      )}
    </section>
  );
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Erro inesperado';
}
