import { useState, useEffect, useCallback } from 'react';
import { Card } from '@tremor/react';
import { PageHeader } from './_PageHeader';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/Spinner';
import {
  fetchTopics,
  suggestMoreTopics,
  generatePost,
  reviewPost,
  applyFix,
  publishPost,
  type BlogTopic,
  type BlogPost,
  type LangCode,
  type ReviewLang,
} from '@/lib/blog';

type Step = 'pick' | 'generating' | 'edit';
const LANGS: LangCode[] = ['en', 'pt', 'es'];
const LANG_LABEL: Record<LangCode, string> = { en: 'EN', pt: 'PT', es: 'ES' };

const sevStyle: Record<string, string> = {
  HIGH: 'bg-red-50 text-red-700 border-red-200',
  MED: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-slate-50 text-slate-600 border-slate-200',
};

export function MarketingBlogPage() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('pick');
  const [topics, setTopics] = useState<BlogTopic[] | null>(null);
  const [selected, setSelected] = useState<BlogTopic | null>(null);
  const [custom, setCustom] = useState('');

  const [loadError, setLoadError] = useState(false);
  // Which audience column is currently fetching more ideas (null = none).
  const [suggesting, setSuggesting] = useState<'business' | 'consumer' | null>(null);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [lang, setLang] = useState<LangCode>('en');
  const [reviews, setReviews] = useState<Record<LangCode, ReviewLang> | null>(null);
  const [applyingIdx, setApplyingIdx] = useState<number | null>(null);
  const [applyingAll, setApplyingAll] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const loadTopics = useCallback(async () => {
    setLoadError(false);
    try {
      const { topics: list } = await fetchTopics();
      setTopics(list);
    } catch (e) {
      toast({ variant: 'error', title: 'Falha ao carregar temas', description: errMsg(e) });
      setTopics([]);
      setLoadError(true);
    }
  }, [toast]);

  const onSuggestMore = useCallback(async (audience: 'business' | 'consumer') => {
    setSuggesting(audience);
    try {
      const { topics: more } = await suggestMoreTopics(audience);
      // Force the requested audience on the results so they always land in the
      // right column even if the model mistags one.
      const tagged = more.map((t) => ({ ...t, audience }));
      setTopics((prev) => {
        const seen = new Set((prev ?? []).map((t) => t.slug));
        const fresh = tagged.filter((t) => !seen.has(t.slug));
        return [...(prev ?? []), ...fresh];
      });
      if (more.length === 0) {
        toast({ variant: 'info', title: 'A IA não trouxe novos temas', description: 'Tenta de novo ou use um tema próprio.' });
      }
    } catch (e) {
      toast({ variant: 'error', title: 'Falha ao sugerir temas', description: errMsg(e) });
    } finally {
      setSuggesting(null);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdmin) void loadTopics();
  }, [isAdmin, loadTopics]);

  if (!isAdmin) {
    return (
      <section className="space-y-6">
        <PageHeader title="Blog" description="Criar e publicar artigos do blog com IA." />
        <Card>
          <p className="text-sm text-navy-400">Só administradores podem criar posts do blog.</p>
        </Card>
      </section>
    );
  }

  const todo = (topics ?? []).filter((t) => !t.done);
  const done = (topics ?? []).filter((t) => t.done);
  const soleTraderTopics = todo.filter((t) => t.audience !== 'business');
  const orgTopics = todo.filter((t) => t.audience === 'business');

  async function onGenerate() {
    const topic = custom.trim() || selected?.title;
    if (!topic) return;
    const slug = custom.trim() ? undefined : selected?.slug;
    setStep('generating');
    try {
      const result = await generatePost(topic, slug);
      setPost(result);
      setReviews(null);
      setLang('en');
      setStep('edit');
    } catch (e) {
      toast({ variant: 'error', title: 'Falha ao gerar', description: errMsg(e) });
      setStep('pick');
    }
  }

  function updateField(field: keyof BlogPost['en'], value: string) {
    setPost((p) => (p ? { ...p, [lang]: { ...p[lang], [field]: value } } : p));
  }

  async function onFactCheck() {
    if (!post) return;
    setReviewing(true);
    try {
      setReviews(await reviewPost(post));
      toast({ variant: 'info', title: 'Fact-check pronto', description: 'Revise os apontamentos abaixo.' });
    } catch (e) {
      toast({ variant: 'error', title: 'Falha no fact-check', description: errMsg(e) });
    } finally {
      setReviewing(false);
    }
  }

  async function onApplyFix(idx: number, finding: string) {
    if (!post) return;
    setApplyingIdx(idx);
    try {
      // Apply the same fix to EVERY language (each rewritten in its own
      // language), so the 3 drafts stay in sync — not just the active tab.
      const codes = LANGS.filter((c) => post[c]?.title);
      const results = await Promise.all(
        codes.map(async (c) => {
          try {
            return [c, await applyFix(c, post[c], finding)] as const;
          } catch {
            return [c, null] as const;
          }
        }),
      );

      const next: BlogPost = { ...post };
      let anyChanged = false;
      let currentChanged = false;
      for (const [c, fixed] of results) {
        if (
          fixed &&
          (fixed.title !== post[c].title ||
            fixed.description !== post[c].description ||
            fixed.body !== post[c].body)
        ) {
          next[c] = fixed;
          anyChanged = true;
          if (c === lang) currentChanged = true;
        }
      }

      // The free AI sometimes returns the draft unchanged (vague finding /
      // truncated reply). If nothing changed anywhere, don't claim success and
      // don't drop the finding — otherwise the list looks clean while the text
      // is identical and the next fact-check re-flags it.
      if (!anyChanged) {
        toast({
          variant: 'error',
          title: 'A IA não alterou o texto',
          description: 'Tenta “Aplicar tudo”, ou edite o corpo à mão (o campo é editável).',
        });
        return;
      }

      setPost(next);
      // Drop the addressed finding from the current language's list.
      setReviews((prev) => {
        if (!prev?.[lang]) return prev;
        const cur = prev[lang];
        return { ...prev, [lang]: { ...cur, findings: cur.findings.filter((_, i) => i !== idx) } };
      });
      toast({
        variant: currentChanged ? 'success' : 'info',
        title: currentChanged ? 'Correção aplicada' : 'Aplicada nos outros idiomas',
        description: currentChanged
          ? 'O corpo foi atualizado nas 3 abas.'
          : `A IA não mexeu no ${LANG_LABEL[lang]} (provável que já estivesse ok), mas mudou outras abas.`,
      });
    } catch (e) {
      toast({ variant: 'error', title: 'Falha ao aplicar', description: errMsg(e) });
    } finally {
      setApplyingIdx(null);
    }
  }

  // Apply ALL findings of a language in a single AI call — far more reliable
  // than one-by-one (the free model echoes the draft when there's little to
  // change; with the whole list it actually rewrites).
  async function onApplyAll() {
    if (!post || !reviews) return;
    setApplyingAll(true);
    try {
      const codes = LANGS.filter((c) => post[c]?.title);
      const results = await Promise.all(
        codes.map(async (c) => {
          const findings = reviews[c]?.findings ?? [];
          if (findings.length === 0) return [c, null] as const;
          const combined =
            `Fix ALL of these problems in the draft (rewrite as needed):\n` +
            findings.map((f, i) => `${i + 1}. [${f.severity}] ${f.text}`).join('\n');
          try {
            return [c, await applyFix(c, post[c], combined)] as const;
          } catch {
            return [c, null] as const;
          }
        }),
      );

      const next: BlogPost = { ...post };
      const fixedLangs: LangCode[] = [];
      for (const [c, fixed] of results) {
        if (
          fixed &&
          (fixed.title !== post[c].title ||
            fixed.description !== post[c].description ||
            fixed.body !== post[c].body)
        ) {
          next[c] = fixed;
          fixedLangs.push(c);
        }
      }

      if (fixedLangs.length === 0) {
        toast({
          variant: 'error',
          title: 'A IA não alterou o texto',
          description: 'Edite o corpo à mão (o campo é editável) — o modelo grátis travou nesses apontamentos.',
        });
        return;
      }

      setPost(next);
      // Clear the findings of the languages we just rewrote — re-run the
      // fact-check to confirm.
      setReviews((prev) => {
        if (!prev) return prev;
        const copy = { ...prev };
        for (const c of fixedLangs) {
          if (copy[c]) copy[c] = { ...copy[c], findings: [] };
        }
        return copy;
      });
      toast({
        variant: 'success',
        title: 'Tudo aplicado',
        description: `Reescrevi ${fixedLangs.map((c) => LANG_LABEL[c]).join(', ')}. Confira o corpo e rode o Fact-check de novo.`,
      });
    } catch (e) {
      toast({ variant: 'error', title: 'Falha ao aplicar tudo', description: errMsg(e) });
    } finally {
      setApplyingAll(false);
    }
  }

  async function onPublish(draft: boolean) {
    if (!post) return;
    if (!draft && !window.confirm('Publicar este post ao vivo? Confirme que checou os números.')) return;
    setPublishing(true);
    try {
      const res = await publishPost(post, draft);
      toast({
        variant: 'success',
        title: draft ? 'Salvo como rascunho' : 'Publicado',
        description: `${res.committed.length} arquivo(s) gravado(s)${draft ? '' : ' — ao vivo em ~2 min.'}`,
      });
      if (!draft) {
        setStep('pick');
        setPost(null);
        void loadTopics();
      }
    } catch (e) {
      toast({ variant: 'error', title: 'Falha ao publicar', description: errMsg(e) });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader title="Blog" description="Gere um post com IA, revise (fact-check) e publique." />

      {/* PICK */}
      {step === 'pick' && (
        <Card className="space-y-5">
          {topics === null ? (
            <Spinner label="Carregando temas" />
          ) : (
            <>
              <div>
                <p className="mb-3 text-sm font-semibold text-navy-700">Temas sugeridos</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* ── Coluna 1: Sole trader (consumer) ── */}
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-sky-800">
                        🧑‍🔧 Sole trader
                      </span>
                      <button
                        type="button"
                        onClick={() => void onSuggestMore('consumer')}
                        disabled={suggesting !== null}
                        className="rounded-full border border-sky-300 px-2.5 py-1 text-xs font-bold text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
                      >
                        {suggesting === 'consumer' ? 'Gerando…' : '+ Sugerir (IA)'}
                      </button>
                    </div>
                    <p className="mb-2 text-xs text-sky-700/70">Autônomos: ABN, imposto, GST, deduções, visto.</p>
                    <div className="space-y-2">
                      {soleTraderTopics.map((t) => (
                        <button
                          key={t.slug}
                          type="button"
                          onClick={() => { setSelected(t); setCustom(''); }}
                          className={`block w-full rounded-xl border p-3 text-left transition ${
                            selected?.slug === t.slug && !custom
                              ? 'border-brand-400 bg-brand-50'
                              : 'border-slate-200 bg-white hover:border-brand-300'
                          }`}
                        >
                          <span className="block text-sm font-semibold text-navy-700">{t.title}</span>
                          <span className="block text-xs text-navy-300">{t.angle}</span>
                        </button>
                      ))}
                      {soleTraderTopics.length === 0 && (
                        <p className="text-xs text-navy-300">Sem temas — clique em “+ Sugerir (IA)”.</p>
                      )}
                    </div>
                  </div>

                  {/* ── Coluna 2: Organizations (business) ── */}
                  <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-violet-800">
                        🏢 Organizations
                      </span>
                      <button
                        type="button"
                        onClick={() => void onSuggestMore('business')}
                        disabled={suggesting !== null}
                        className="rounded-full border border-violet-300 px-2.5 py-1 text-xs font-bold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
                      >
                        {suggesting === 'business' ? 'Gerando…' : '+ Sugerir (IA)'}
                      </button>
                    </div>
                    <p className="mb-2 text-xs text-violet-700/70">Empresas: onboarding, retenção, sham-contracting, compliance.</p>
                    <div className="space-y-2">
                      {orgTopics.map((t) => (
                        <button
                          key={t.slug}
                          type="button"
                          onClick={() => { setSelected(t); setCustom(''); }}
                          className={`block w-full rounded-xl border p-3 text-left transition ${
                            selected?.slug === t.slug && !custom
                              ? 'border-brand-400 bg-brand-50'
                              : 'border-slate-200 bg-white hover:border-brand-300'
                          }`}
                        >
                          <span className="block text-sm font-semibold text-navy-700">{t.title}</span>
                          <span className="block text-xs text-navy-300">{t.angle}</span>
                        </button>
                      ))}
                      {orgTopics.length === 0 && (
                        <p className="text-xs text-navy-300">Sem temas — clique em “+ Sugerir (IA)”.</p>
                      )}
                    </div>
                  </div>
                </div>
                {loadError && (
                  <p className="mt-2 text-sm text-red-600">Não consegui carregar os temas. Recarregue a página ou tente “Sugerir”.</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-navy-700" htmlFor="custom-topic">
                  …ou um tema próprio
                </label>
                <input
                  id="custom-topic"
                  type="text"
                  value={custom}
                  onChange={(e) => {
                    setCustom(e.target.value);
                    if (e.target.value) setSelected(null);
                  }}
                  placeholder="ex: Como funciona o GST para motoristas de Uber"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
                />
              </div>

              {done.length > 0 && (
                <p className="text-xs text-navy-300">
                  Já publicados: {done.map((t) => t.title).join(' · ')}
                </p>
              )}

              <button
                type="button"
                disabled={!custom.trim() && !selected}
                onClick={() => void onGenerate()}
                className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-40"
              >
                Gerar com IA
              </button>
            </>
          )}
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
      {step === 'edit' && post && (
        <Card className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-navy-700" htmlFor="slug">
              Slug (URL)
            </label>
            <input
              id="slug"
              type="text"
              value={post.slug}
              onChange={(e) => setPost((p) => (p ? { ...p, slug: e.target.value } : p))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            />
            <p className="mt-1 text-xs text-navy-300">ozly.au/blog/{post.slug || '…'}</p>
          </div>

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
                {reviews?.[code] && (
                  <span className={reviews[code].verdict === 'PASS' ? ' text-lime-300' : ' text-amber-300'}>
                    {reviews[code].verdict === 'PASS' ? ' ✓' : ' !'}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-navy-700" htmlFor="f-title">Título</label>
            <input
              id="f-title"
              type="text"
              value={post[lang].title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-navy-700" htmlFor="f-desc">Descrição (meta)</label>
            <input
              id="f-desc"
              type="text"
              value={post[lang].description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-navy-700" htmlFor="f-body">Corpo (Markdown)</label>
            <textarea
              id="f-body"
              value={post[lang].body}
              onChange={(e) => updateField('body', e.target.value)}
              className="h-80 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs leading-relaxed focus:border-brand-400 focus:outline-none"
            />
          </div>

          {/* Fact-check findings */}
          {reviews?.[lang] && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-navy-700">
                  Fact-check ({LANG_LABEL[lang]}):{' '}
                  <span className={reviews[lang].verdict === 'PASS' ? 'text-lime-600' : 'text-amber-600'}>
                    {reviews[lang].verdict === 'PASS' ? 'sem problemas graves' : 'revisar antes de publicar'}
                  </span>
                </p>
                {reviews[lang].findings.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void onApplyAll()}
                    disabled={applyingAll || applyingIdx !== null}
                    className="shrink-0 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white transition hover:bg-brand-600 disabled:opacity-40"
                  >
                    {applyingAll ? 'Aplicando tudo…' : '✓ Aplicar tudo (3 idiomas)'}
                  </button>
                )}
              </div>
              <ul className="space-y-2">
                {reviews[lang].findings.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className={`shrink-0 rounded border px-1.5 py-0.5 font-bold ${sevStyle[f.severity] ?? sevStyle.LOW}`}>
                      {f.severity}
                    </span>
                    <span className="flex-1 text-navy-600">{f.text}</span>
                    <button
                      type="button"
                      onClick={() => void onApplyFix(i, f.text)}
                      disabled={applyingIdx !== null || applyingAll}
                      className="shrink-0 rounded-full border border-brand-300 px-2.5 py-0.5 font-bold text-brand-700 transition hover:bg-brand-50 disabled:opacity-40"
                    >
                      {applyingIdx === i ? 'Aplicando…' : 'Aplicar'}
                    </button>
                  </li>
                ))}
                {reviews[lang].findings.length === 0 && (
                  <li className="text-xs text-navy-400">Nenhum apontamento.</li>
                )}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            ⚠️ A IA grátis erra número fiscal. Sempre confira contra a{' '}
            <a className="underline" href="https://www.ato.gov.au/" target="_blank" rel="noopener noreferrer">ATO</a>{' '}
            antes de publicar.
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => void onFactCheck()}
              disabled={reviewing}
              className="rounded-full bg-navy-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-navy-800 disabled:opacity-50"
            >
              {reviewing ? 'Revisando…' : 'Fact-check com IA'}
            </button>
            <button
              type="button"
              onClick={() => void onPublish(true)}
              disabled={publishing}
              className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-bold text-navy-700 transition hover:bg-slate-200 disabled:opacity-50"
            >
              Salvar rascunho
            </button>
            <button
              type="button"
              onClick={() => void onPublish(false)}
              disabled={publishing}
              className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              {publishing ? 'Publicando…' : 'Publicar'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Descartar e começar de novo?')) {
                  setStep('pick');
                  setPost(null);
                  setReviews(null);
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
