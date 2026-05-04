import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Title } from '@tremor/react';
import { ExternalLinkIcon, SparklesIcon, XIcon } from '@/components/Icons';
import { Spinner } from '@/components/Spinner';
import { RawDataPanel } from '@/components/RawDataPanel';
import { useToast } from '@/components/Toast';
import {
  CHANNEL_ICONS,
  CHANNEL_LABELS,
  type MarketingChannel,
} from '@/lib/marketing';
import { generateContent, GeminiError, isGeminiConfigured } from '@/lib/gemini';

const VIDEO_MAX_INLINE_BYTES = 20 * 1024 * 1024; // 20 MB Gemini inline cap
const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/webm'];

type AiChannel =
  | 'org_instagram'
  | 'org_facebook'
  | 'org_tiktok'
  | 'org_youtube'
  | 'msg_email'
  | 'msg_whatsapp'
  | 'msg_sms';

const CHANNELS: ReadonlyArray<AiChannel> = [
  'org_instagram',
  'org_facebook',
  'org_tiktok',
  'org_youtube',
  'msg_email',
  'msg_whatsapp',
  'msg_sms',
];

/**
 * Per-channel guidance baked into each generation. Keep it tight — Gemini
 * gets the full guide, but giving each channel its own constraint reduces
 * hallucination/length-overrun.
 */
const CHANNEL_RULES: Record<AiChannel, string> = {
  org_instagram:
    'Instagram caption. Hook em ≤7 palavras na 1ª linha. 2-4 frases curtas (uma por linha). CTA clara no fim. 5-10 hashtags nichadas. SEM EMOJIS.',
  org_facebook:
    'Facebook post. 2-3 parágrafos curtos. Tom mais direto que Instagram. CTA com link. SEM EMOJIS.',
  org_tiktok:
    'TikTok caption + hook. Linha 1 = hook problem-agitation em ≤10 palavras. Linha 2-3 = body curto. CTA "Baixa Ozly, link na bio". 3-5 hashtags. SEM EMOJIS.',
  org_youtube:
    'YouTube Shorts metadata. Title ≤60 chars (com hook), description com 2 frases + CTA + 3 hashtags. SEM EMOJIS.',
  msg_email:
    'Email. Subject ≤9 palavras pessoal e específico (não clickbait). Body com saudação curta, 1-2 parágrafos, 1 CTA óbvio (botão). Assinatura "Augusto, Ozly". SEM EMOJIS.',
  msg_whatsapp:
    'WhatsApp Business template Meta-aprovado. Identifica como "Ozly" no início. ≤3 linhas. Variáveis {{1}} {{2}} se precisar. SEM EMOJIS. SEM URL externa (Meta restringe).',
  msg_sms:
    'SMS. ≤160 chars. Identifica "Ozly:" no início. CTA com link curto (link.ozly.au/x). SEM EMOJIS.',
};

const BRAND_VOICE = `# Ozly Brand Voice

QUEM SOMOS: app pra trabalhadores autônomos / sole traders / ABN holders na
Austrália gerenciarem trabalho, finanças, impostos sem dor de cabeça.

NUNCA usar: "sub-contractor" / "subcontratista" / "subcontratado" — eles não
se descrevem assim. Use: "tradie" (EN), "sole trader" (EN), "self-employed"
(EN), "trabajador independiente" (ES), "trabalhador autônomo" / "autônomo" /
"você" (PT), ou direto o ofício (encanador / pintor / motorista / plumber /
fontanero).

TONE OF VOICE:
1. Direto — sem corporativês, frase curta, um conceito por linha.
2. Aussie-friendly — usa "mate", "no worries" quando faz sentido. Não força.
3. Pragmático — fala em dinheiro, tempo, dor real. Não vende sonho.
4. Empático com migrante — sistema AU é confuso, especialmente em outra língua.
5. Confiante mas humilde — sabemos de impostos AU, mas não somos contadores.

NUNCA usar: emojis (NUNCA, em qualquer copy), "solução completa",
"empoderamento", "revolucionário", "plataforma" (use "app"), "usuário" (use
"você"). Sem ALL CAPS de urgência. Sem hashtags genéricas (#business —
prefere #tradie #abn #soletrader).

NÚMEROS REAIS quando houver: "$14.99 AUD/mês" não "preço acessível".

IDIOMA: detecte do brief. Suporte PT-BR, EN (Aussie English — "colour" não
"color"), ES (LATAM neutro, "ustedes" não "vosotros").`;

const SEO_VOICE_AMENDMENT = `# SEO mode (ativo)

Otimize a copy pra discovery orgânica em cada plataforma:

- **Hook com keyword na 1ª linha.** Exemplo IG/TikTok: "Como autônomo na
  Austrália economizar 4h/mês com BAS automático" (a keyword "BAS automático
  Austrália autônomo" está toda no hook).

- **YouTube title:** keyword principal nos primeiros 60 caracteres.
  Description: keyword nos primeiros 125 caracteres (limite do snippet).

- **Hashtags estratégicas (mix obrigatório):**
   1-2 high-volume (genéricas do nicho — ex: #abnaustralia)
   4-5 mid-volume (específicas — ex: #tradiebusiness #BASlodgement)
   2-3 niche/long-tail (ultra-específicas — ex: #AbnHolderTaxTips)
  Total 7-10 hashtags. Sem #business #entrepreneur genéricas demais.

- **Caption pattern pra Instagram/TikTok:**
   Hook (com keyword) + Pain (problema concreto) + Solution (Ozly) +
   CTA (Link na bio / Baixa Ozly) + Hashtags.

- **Long-tail keywords > short-tail.** "ABN tax calculator australia" >
  "tax calculator". Mostra intenção de busca clara.

- **Evita keyword stuffing.** Se a frase ficar artificial, prefere
  legibilidade. Google + Meta penalizam stuffing.

- **NUNCA quebre o brand voice.** SEO + brand voice convivem; SEO nunca
  vence brand voice.`;

function buildSeoBlock(keywords: string): string {
  const trimmed = keywords.trim();
  if (!trimmed) {
    return '\nSEO MODE ATIVO: aplique estratégia de SEO da seção "SEO mode" do system prompt. Pesquise mentalmente quais keywords seriam mais buscadas pelo público-alvo (autônomos AU) pra esse tema e use-as.\n';
  }
  return `\nSEO MODE ATIVO: aplique estratégia de SEO da seção "SEO mode" do system prompt.

Keywords-alvo (ordene por relevância, use a primeira no hook): ${trimmed}\n`;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('FileReader returned non-string'));
        return;
      }
      // strip "data:video/mp4;base64," prefix
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

interface VariantResult {
  channel: AiChannel;
  text: string;
  tokens_in: number;
  tokens_out: number;
  duration_ms: number;
  error?: string;
}

/**
 * /marketing/ai-composer — gera variações de copy por canal usando Gemini.
 *
 * Brief curto + canais selecionados → 1 chamada Gemini por canal (paralelo)
 * com brand voice no system prompt. Cada chamada loga em ai_inference_log
 * → /finance/cost-monitor mostra spend.
 */
export function AiComposerPage() {
  const { toast } = useToast();
  const configured = isGeminiConfigured();

  const [brief, setBrief] = useState('');
  const [language, setLanguage] = useState<'pt' | 'en' | 'es'>('pt');
  const [selected, setSelected] = useState<Set<AiChannel>>(new Set(['org_instagram', 'org_tiktok']));
  const [seoMode, setSeoMode] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [video, setVideo] = useState<{ file: File; base64: string; mimeType: string } | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<VariantResult[]>([]);
  const videoInputRef = useRef<HTMLInputElement>(null);

  function toggle(ch: AiChannel) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return next;
    });
  }

  async function handleVideoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_VIDEO_MIMES.includes(file.type)) {
      toast({
        variant: 'error',
        title: 'Tipo de vídeo não suportado',
        description: 'Use MP4, MOV (.mov) ou WebM.',
      });
      if (videoInputRef.current) videoInputRef.current.value = '';
      return;
    }
    if (file.size > VIDEO_MAX_INLINE_BYTES) {
      toast({
        variant: 'error',
        title: 'Vídeo passa do limite',
        description: `Inline máx 20 MB pro Gemini. Seu vídeo tem ${(file.size / 1024 / 1024).toFixed(1)} MB. Encurta ou faz trim antes.`,
      });
      if (videoInputRef.current) videoInputRef.current.value = '';
      return;
    }

    setVideoLoading(true);
    try {
      const base64 = await fileToBase64(file);
      setVideo({ file, base64, mimeType: file.type });
      toast({
        variant: 'success',
        title: 'Vídeo carregado',
        description: `${(file.size / 1024 / 1024).toFixed(1)} MB · pronto pra análise.`,
      });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Falha ao ler vídeo',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    } finally {
      setVideoLoading(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  }

  function clearVideo() {
    setVideo(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  }

  async function generate() {
    if (!configured) {
      toast({ variant: 'error', title: 'Gemini não configurado' });
      return;
    }
    if (!brief.trim() && !video) {
      toast({
        variant: 'error',
        title: 'Brief ou vídeo obrigatório',
        description: 'Adiciona um texto OU um vídeo (de preferência ambos pra melhor resultado).',
      });
      return;
    }
    if (selected.size === 0) {
      toast({ variant: 'error', title: 'Selecione pelo menos um canal' });
      return;
    }

    setGenerating(true);
    setResults([]);

    const targets = [...selected];
    const langLabel = language === 'pt' ? 'PT-BR' : language === 'en' ? 'Aussie English' : 'Espanhol LATAM';
    const seoBlock = seoMode ? buildSeoBlock(keywords) : '';
    const videoBlock = video
      ? `Você recebeu também um VÍDEO em anexo. Antes de gerar a copy:
1. Identifica o que está sendo mostrado/dito (visual + áudio se houver).
2. Tira o ponto principal — o "hook" é o primeiro segundo + o que fica memorável.
3. Use isso como base pra copy. A copy deve REFLETIR o conteúdo do vídeo, não inventar coisa que não tá lá.
`
      : '';

    const promises = targets.map(async (ch): Promise<VariantResult> => {
      const channelLabel = CHANNEL_LABELS[ch as MarketingChannel] ?? ch;
      const rules = CHANNEL_RULES[ch];
      const userPrompt = `${videoBlock}Brief: ${brief.trim() || '(use só o vídeo como referência)'}

Idioma: ${langLabel}
Canal: ${channelLabel}
Regras do canal: ${rules}
${seoBlock}
Gere a copy seguindo TODAS as regras do canal e o brand voice. Responda APENAS com a copy final, sem comentários, sem prefixos do tipo "Aqui está:" ou "Resposta:".`;

      try {
        // Use Pro for video analysis (Flash struggles with multi-modal nuance)
        const useVideoModel = video !== null;
        const r = await generateContent({
          source: 'admin_ai_composer',
          model: useVideoModel ? 'gemini-1.5-pro' : 'gemini-1.5-flash',
          system: seoMode ? `${BRAND_VOICE}\n\n${SEO_VOICE_AMENDMENT}` : BRAND_VOICE,
          prompt: userPrompt,
          ...(video
            ? { inlineData: [{ mimeType: video.mimeType, data: video.base64 }] }
            : {}),
          config: {
            temperature: seoMode ? 0.6 : 0.8,
            maxOutputTokens: 1000,
          },
        });
        return {
          channel: ch,
          text: r.text,
          tokens_in: r.tokens_in,
          tokens_out: r.tokens_out,
          duration_ms: r.duration_ms,
        };
      } catch (e) {
        return {
          channel: ch,
          text: '',
          tokens_in: 0,
          tokens_out: 0,
          duration_ms: 0,
          error: e instanceof GeminiError ? e.message : 'Erro inesperado',
        };
      }
    });

    const settled = await Promise.all(promises);
    setResults(settled);
    setGenerating(false);

    const ok = settled.filter((r) => !r.error).length;
    const fail = settled.length - ok;
    toast({
      variant: fail === 0 ? 'success' : 'error',
      title: `${ok}/${settled.length} variações geradas`,
      ...(fail > 0
        ? { description: `${fail} canal${fail === 1 ? '' : 'is'} falharam.` }
        : {}),
    });
  }

  const totalTokens = useMemo(
    () => results.reduce((s, r) => s + r.tokens_in + r.tokens_out, 0),
    [results],
  );

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast({ variant: 'success', title: 'Copiado' });
    } catch {
      toast({ variant: 'error', title: 'Falha ao copiar' });
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
            style={{
              background:
                'linear-gradient(135deg, var(--color-brand-500), var(--color-lime-400))',
            }}
          >
            <SparklesIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-navy-700">
              AI Composer
            </h1>
            <p className="mt-0.5 text-sm text-navy-400">
              Gera variações de copy por canal com Gemini Flash + brand voice Ozly.
            </p>
          </div>
        </div>
        <Link
          to="/marketing"
          className="self-start rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 transition-colors hover:border-brand-200 hover:text-brand-700 md:self-end"
        >
          ← Marketing Studio
        </Link>
      </header>

      {!configured && (
        <Card className="ozly-card border-amber-200 bg-amber-50/60">
          <Title className="!text-sm !font-semibold text-amber-900">
            Configuração pendente — Gemini API key
          </Title>
          <p className="mt-1 text-xs text-amber-800">
            A página tá pronta mas <code className="font-mono">VITE_GEMINI_API_KEY</code>{' '}
            não foi injetado no build. Pra ativar:
          </p>
          <ol className="mt-2 space-y-1 pl-5 text-xs text-amber-800 [list-style-type:decimal]">
            <li>
              Acessa{' '}
              <a
                href="https://github.com/AugustoBarcelos/OzlyWebSite/settings/secrets/actions"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 underline hover:text-amber-900"
              >
                Settings → Secrets → Actions <ExternalLinkIcon className="h-3 w-3" />
              </a>{' '}
              do repo OzlyWebSite.
            </li>
            <li>
              Clica em <strong>New repository secret</strong>.
            </li>
            <li>
              Name: <code className="font-mono">ADMIN_PORTAL_GEMINI_KEY</code>
            </li>
            <li>
              Value: o mesmo <code className="font-mono">GOOGLE_IA_KEY</code> que tá no
              .env do app Flutter (ou cria novo em{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 underline hover:text-amber-900"
              >
                aistudio.google.com/app/apikey{' '}
                <ExternalLinkIcon className="h-3 w-3" />
              </a>
              ).
            </li>
            <li>
              Após salvar, faça qualquer push pra <code className="font-mono">main</code>{' '}
              pra triggerar build novo (ou rerun manual no GitHub Actions).
            </li>
          </ol>
        </Card>
      )}

      {/* Form */}
      <Card className="ozly-card">
        <Title className="!text-sm !font-semibold text-navy-700">Brief</Title>

        <div className="mt-3 space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-navy-400">
              Conta o que você quer comunicar (ou só anexa o vídeo abaixo)
            </label>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={4}
              placeholder='ex: "Lançamento da feature de cálculo automático de GST. Diferencial: economiza 4h/mês. Audiência: tradies que cobram com ABN. CTA: baixar app grátis."'
              className="mt-1 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Video upload */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-navy-400">
              Vídeo (opcional — Gemini analisa o conteúdo)
            </label>
            {video ? (
              <div className="mt-1 flex items-center gap-3 rounded-md border border-navy-100 bg-navy-50/40 p-2.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-navy-100 text-2xl">
                  🎬
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-navy-700">
                    {video.file.name}
                  </div>
                  <div className="text-[11px] text-navy-400">
                    {(video.file.size / 1024 / 1024).toFixed(1)} MB ·{' '}
                    {video.mimeType.replace('video/', '')} · pronto
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearVideo}
                  className="rounded-md border border-navy-100 bg-white px-2 py-1 text-xs text-rose-600 hover:border-rose-300 hover:bg-rose-50"
                >
                  Remover
                </button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={videoLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border border-dashed border-navy-200 bg-white px-3 py-3 text-sm text-navy-500 hover:border-brand-400 hover:text-brand-700 disabled:opacity-50"
                >
                  {videoLoading ? (
                    <>
                      <Spinner size="sm" /> Lendo vídeo…
                    </>
                  ) : (
                    <>
                      <span className="text-base">🎬</span>
                      <span>Selecionar vídeo (até 20 MB · MP4/MOV/WebM)</span>
                    </>
                  )}
                </button>
              </div>
            )}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              onChange={(e) => void handleVideoSelect(e)}
              className="hidden"
            />
            <p className="mt-1 text-[10px] text-navy-400">
              Quando há vídeo, usamos Gemini Pro (analisa visual + áudio). Custo
              ~$0.001 por vídeo curto. Acima de 20 MB, dá trim primeiro — Gemini
              inline tem cap nesse tamanho.
            </p>
          </div>

          {/* SEO toggle + keywords */}
          <div className="rounded-md border border-navy-100 bg-white p-3">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={seoMode}
                onChange={(e) => setSeoMode(e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-brand-500"
              />
              <span className="flex-1">
                <span className="block text-sm font-medium text-navy-700">
                  Modo SEO
                </span>
                <span className="block text-[11px] text-navy-400">
                  Otimiza copy pra discovery orgânica: hook com keyword, hashtag mix
                  estratégico (high+mid+niche), title YouTube com keyword nos
                  primeiros 60 chars, description nos primeiros 125 chars.
                </span>
              </span>
            </label>
            {seoMode && (
              <div className="mt-3 pl-6">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-navy-400">
                  Keywords-alvo (opcional — separa por vírgula)
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="ex: BAS automático Australia, ABN tax calculator, tradie tax tips"
                  className="mt-1 w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-navy-400">
                  Se deixar vazio, Gemini infere as keywords mais relevantes do
                  brief/vídeo. Long-tail (ex: "ABN tax calculator australia")
                  funciona melhor que short-tail.
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-navy-400">
                Idioma
              </label>
              <div className="mt-1 inline-flex rounded-md border border-navy-100 bg-white p-0.5 text-xs">
                {(
                  [
                    { v: 'pt', label: 'PT-BR' },
                    { v: 'en', label: 'Aussie EN' },
                    { v: 'es', label: 'ES LATAM' },
                  ] as const
                ).map((l) => (
                  <button
                    key={l.v}
                    type="button"
                    onClick={() => setLanguage(l.v)}
                    className={
                      language === l.v
                        ? 'rounded bg-brand-500 px-2.5 py-1 font-semibold text-white'
                        : 'rounded px-2.5 py-1 text-navy-500 hover:bg-navy-50'
                    }
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-navy-400">
                Canais ({selected.size} selecionados)
              </label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {CHANNELS.map((ch) => {
                  const active = selected.has(ch);
                  const label = CHANNEL_LABELS[ch as MarketingChannel] ?? ch;
                  const icon = CHANNEL_ICONS[ch as MarketingChannel] ?? '•';
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => toggle(ch)}
                      className={[
                        'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                        active
                          ? 'border-brand-300 bg-brand-50 text-brand-700'
                          : 'border-navy-100 bg-white text-navy-500 hover:border-brand-200',
                      ].join(' ')}
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-[11px] text-navy-400">
              Cada chamada loga em{' '}
              <Link to="/finance/cost-monitor" className="text-brand-600 hover:underline">
                /finance/cost-monitor
              </Link>{' '}
              em tempo real (Gemini Flash ≈ $0.0001 por geração de 200 tokens).
            </p>
            <button
              type="button"
              onClick={() => void generate()}
              disabled={
                !configured ||
                generating ||
                (!brief.trim() && !video) ||
                selected.size === 0
              }
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" /> Gerando…
                </span>
              ) : (
                <span>Gerar variações</span>
              )}
            </button>
          </div>
        </div>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <>
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-navy-700">
              Variações geradas
            </h2>
            <div className="text-[11px] text-navy-400">
              {totalTokens.toLocaleString('en-AU')} tokens totais · model gemini-1.5-flash
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {results.map((r) => {
              const label = CHANNEL_LABELS[r.channel as MarketingChannel] ?? r.channel;
              const icon = CHANNEL_ICONS[r.channel as MarketingChannel] ?? '•';
              return (
                <Card
                  key={r.channel}
                  className={`ozly-card ${r.error ? 'border-rose-200 bg-rose-50/40' : ''}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{icon}</span>
                      <Title className="!text-sm !font-semibold text-navy-700">
                        {label}
                      </Title>
                    </div>
                    <div className="text-[10px] font-mono text-navy-400">
                      {r.tokens_in}+{r.tokens_out} tok · {r.duration_ms}ms
                    </div>
                  </div>
                  {r.error ? (
                    <p className="mt-3 text-sm text-rose-700">
                      <strong>Erro:</strong> {r.error}
                    </p>
                  ) : (
                    <>
                      <pre className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-navy-700">
                        {r.text}
                      </pre>
                      <div className="mt-3 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void copyText(r.text)}
                          className="rounded-md border border-navy-100 bg-white px-2 py-1 text-xs font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700"
                        >
                          Copiar
                        </button>
                        <Link
                          to={`/marketing/composer?prefill=${encodeURIComponent(r.text)}&channel=${r.channel}`}
                          className="rounded-md border border-navy-100 bg-white px-2 py-1 text-xs font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700"
                        >
                          Abrir no Composer
                        </Link>
                      </div>
                    </>
                  )}
                </Card>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setResults([])}
            className="mx-auto flex items-center gap-1 rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs text-navy-500 hover:border-rose-200 hover:text-rose-600"
          >
            <XIcon className="h-3 w-3" /> Limpar resultados
          </button>
        </>
      )}

      <RawDataPanel
        page="ai-composer"
        sources={[
          {
            rpc: video ? 'gemini-1.5-pro:generateContent' : 'gemini-1.5-flash:generateContent',
            params: {
              brief,
              language,
              channels: [...selected],
              seoMode,
              keywords: seoMode ? keywords : undefined,
              video: video
                ? { name: video.file.name, mime: video.mimeType, size_mb: Number((video.file.size / 1024 / 1024).toFixed(2)) }
                : null,
            },
            data: results,
            ...(configured ? {} : { note: 'Gemini key not configured' }),
          },
        ]}
      />
    </div>
  );
}
