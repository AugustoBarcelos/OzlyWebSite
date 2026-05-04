import { useState } from 'react';
import { Spinner } from './Spinner';
import { SparklesIcon, XIcon } from './Icons';
import { generateContent, GeminiError, isGeminiConfigured } from '@/lib/gemini';
import { useToast } from './Toast';

interface AiSuggestButtonProps {
  /** Where the call originates (logged in ai_inference_log). */
  source: string;
  /** Channel context — affects voice + length cap. */
  channel: 'msg_email' | 'msg_whatsapp' | 'msg_sms';
  /** Optional segment / audience hint to bias tone (e.g. 'trial-expiring-3d'). */
  segmentHint?: string;
  /** Called with subject + body when AI returns successfully. Subject is null for sms/whatsapp. */
  onAccept: (result: { subject: string | null; body: string }) => void;
}

const CHANNEL_RULES: Record<AiSuggestButtonProps['channel'], string> = {
  msg_email:
    'Email broadcast. Subject ≤9 palavras pessoal e específico (NÃO clickbait, NÃO ALL CAPS). Body com saudação curta, 1-3 parágrafos curtos, 1 CTA óbvio. Assinatura "Augusto, Ozly".',
  msg_whatsapp:
    'WhatsApp Business template-friendly. Identifica como "Ozly" no início. Máx 3 linhas. Sem URL externa (Meta restringe). CTA com call-to-action verbal ("responde "INFO"" ou similar).',
  msg_sms: 'SMS ≤160 chars. Identifica "Ozly:" no início. CTA com link curto. Direto ao ponto.',
};

const BRAND_VOICE_SHORT = `Ozly = app pra trabalhadores autônomos / sole traders / ABN holders na Austrália. NUNCA usar emojis. NUNCA "sub-contractor" — usa tradie/sole trader/autônomo. Direto, Aussie-friendly, pragmático. Empático com migrante. Números reais ($14.99) não "preço acessível".`;

export function AiSuggestButton({ source, channel, segmentHint, onAccept }: AiSuggestButtonProps) {
  const { toast } = useToast();
  const configured = isGeminiConfigured();
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState('');
  const [language, setLanguage] = useState<'pt' | 'en' | 'es'>('pt');
  const [generating, setGenerating] = useState(false);

  if (!configured) {
    return (
      <div className="text-[11px] text-navy-400">
        AI assist desligado — adicione <code className="font-mono">ADMIN_PORTAL_GEMINI_KEY</code> nos secrets.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 transition-colors hover:bg-brand-100"
      >
        <SparklesIcon className="h-3 w-3" />
        Sugerir com AI
      </button>
    );
  }

  async function generate() {
    if (!brief.trim()) {
      toast({ variant: 'error', title: 'Conta o que você quer comunicar' });
      return;
    }
    setGenerating(true);
    const langLabel =
      language === 'pt' ? 'PT-BR' : language === 'en' ? 'Aussie English' : 'Espanhol LATAM';
    const includeSubject = channel === 'msg_email';
    const responseFormat = includeSubject
      ? 'Responda no formato exato:\n\nSUBJECT: <subject linha única>\n---\nBODY:\n<body completo>'
      : 'Responda APENAS com o body, sem labels.';

    const prompt = `Brief: ${brief.trim()}

Idioma: ${langLabel}
Canal: ${channel}
Audiência: ${segmentHint ?? 'ativa'}
Regras: ${CHANNEL_RULES[channel]}

${responseFormat}

Sem comentários extras, sem prefixos do tipo "Aqui está:".`;

    try {
      const r = await generateContent({
        source,
        model: 'gemini-1.5-flash',
        system: BRAND_VOICE_SHORT,
        prompt,
        config: { temperature: 0.7, maxOutputTokens: 600 },
      });
      const parsed = parseSubjectBody(r.text, includeSubject);
      onAccept(parsed);
      toast({
        variant: 'success',
        title: 'Sugestão aplicada',
        description: `${r.tokens_in}+${r.tokens_out} tokens · ${r.duration_ms}ms`,
      });
      setOpen(false);
      setBrief('');
    } catch (e) {
      toast({
        variant: 'error',
        title: 'Falha ao gerar',
        description: e instanceof GeminiError ? e.message : 'Erro inesperado',
      });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-md border border-brand-200 bg-brand-50/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-700">
          <SparklesIcon className="h-3.5 w-3.5" />
          AI assist
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setBrief('');
          }}
          className="rounded p-0.5 text-navy-400 hover:bg-navy-50 hover:text-navy-600"
        >
          <XIcon className="h-3 w-3" />
        </button>
      </div>
      <textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        rows={2}
        placeholder='ex: "Aviso de fim de trial pra quem vai expirar em 3 dias. Tom amigável, oferece help antes de cobrar."'
        className="mt-2 w-full rounded-md border border-navy-100 bg-white px-2 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="inline-flex rounded-md border border-navy-100 bg-white p-0.5 text-[10px]">
          {(
            [
              { v: 'pt', label: 'PT' },
              { v: 'en', label: 'EN' },
              { v: 'es', label: 'ES' },
            ] as const
          ).map((l) => (
            <button
              key={l.v}
              type="button"
              onClick={() => setLanguage(l.v)}
              className={
                language === l.v
                  ? 'rounded bg-brand-500 px-2 py-0.5 font-semibold text-white'
                  : 'rounded px-2 py-0.5 text-navy-500 hover:bg-navy-50'
              }
            >
              {l.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={generating || !brief.trim()}
          className="rounded-md bg-brand-500 px-3 py-1 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-50"
        >
          {generating ? (
            <span className="flex items-center gap-1">
              <Spinner size="sm" /> Gerando…
            </span>
          ) : (
            'Gerar'
          )}
        </button>
      </div>
    </div>
  );
}

function parseSubjectBody(
  text: string,
  includeSubject: boolean,
): { subject: string | null; body: string } {
  if (!includeSubject) {
    return { subject: null, body: text.trim() };
  }
  const subjectMatch = text.match(/^SUBJECT:\s*(.+?)$/im);
  const bodyMatch = text.match(/BODY:\s*([\s\S]+)$/im);
  if (subjectMatch?.[1] && bodyMatch?.[1]) {
    return { subject: subjectMatch[1].trim(), body: bodyMatch[1].trim() };
  }
  // Fallback: first line = subject, rest = body
  const lines = text.trim().split('\n');
  if (lines.length === 0 || !lines[0]) {
    return { subject: '', body: text.trim() };
  }
  const subject = lines[0].replace(/^(SUBJECT:|Subject:)\s*/i, '').trim();
  const body = lines.slice(1).join('\n').replace(/^(BODY:|---)\s*/i, '').trim();
  return { subject, body: body || text.trim() };
}
