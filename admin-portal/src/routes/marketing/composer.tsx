import { useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Text } from '@tremor/react';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';
import {
  CHANNEL_ICONS,
  CHANNEL_LABELS,
  MARKETING_CHANNELS,
  createMarketingPost,
  inferAssetTypeFromMime,
  uploadMarketingAsset,
  type MarketingAssetType,
  type MarketingChannel,
} from '@/lib/marketing';
import { RpcError } from '@/lib/rpc';
import { PageHeader } from './_PageHeader';

interface VariantState {
  caption: string;
  hashtags: string;
  scheduledAt: string;
}

const ASSET_TYPES: ReadonlyArray<{
  value: MarketingAssetType;
  label: string;
  emoji: string;
}> = [
  { value: 'text', label: 'Texto', emoji: '✏️' },
  { value: 'image', label: 'Imagem', emoji: '📷' },
  { value: 'video', label: 'Vídeo', emoji: '🎬' },
  { value: 'carousel', label: 'Carrossel', emoji: '🖼️' },
];

/**
 * datetime-local input dá uma string no formato "yyyy-MM-ddTHH:mm" (sem TZ).
 * O navegador interpreta como horário local — convertemos para ISO antes de
 * mandar à RPC pra evitar drift entre admins em fuso diferente.
 */
function localToIso(local: string): string | null {
  if (!local) return null;
  const dt = new Date(local);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function suggestScheduledAt(channel: MarketingChannel): string {
  // Sugere horário ótimo aproximado por canal — Sydney TZ (mas valor é local).
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const hourByChannel: Record<MarketingChannel, number> = {
    org_instagram: 19,
    org_facebook: 19,
    org_tiktok: 20,
    org_youtube: 12,
    msg_email: 10,
  };
  tomorrow.setHours(hourByChannel[channel], 0, 0, 0);
  // Converte para o formato datetime-local: yyyy-MM-ddTHH:mm
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    tomorrow.getFullYear() +
    '-' +
    pad(tomorrow.getMonth() + 1) +
    '-' +
    pad(tomorrow.getDate()) +
    'T' +
    pad(tomorrow.getHours()) +
    ':' +
    pad(tomorrow.getMinutes())
  );
}

export function MarketingComposerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date'); // pré-seleciona data quando vem do calendar
  const { toast } = useToast();

  const [assetType, setAssetType] = useState<MarketingAssetType>('text');
  const [assetUrl, setAssetUrl] = useState('');
  const [captionMaster, setCaptionMaster] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<Set<MarketingChannel>>(
    new Set(),
  );
  const [variants, setVariants] = useState<
    Partial<Record<MarketingChannel, VariantState>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const inferredType = inferAssetTypeFromMime(file.type);
      const { publicUrl } = await uploadMarketingAsset(file);
      setAssetUrl(publicUrl);
      if (inferredType !== 'text') setAssetType(inferredType);
      toast({ title: 'Asset enviado', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Falha no upload',
        description: err instanceof RpcError ? err.message : 'Erro inesperado',
        variant: 'error',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearAsset = () => {
    setAssetUrl('');
    setAssetType('text');
  };

  const toggleChannel = (channel: MarketingChannel) => {
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channel)) {
        next.delete(channel);
      } else {
        next.add(channel);
        setVariants((prevV) => {
          if (prevV[channel]) return prevV;
          return {
            ...prevV,
            [channel]: {
              caption: '',
              hashtags: '',
              scheduledAt: dateParam
                ? `${dateParam}T${suggestScheduledAt(channel).split('T')[1]}`
                : suggestScheduledAt(channel),
            },
          };
        });
      }
      return next;
    });
  };

  const updateVariant = (
    channel: MarketingChannel,
    patch: Partial<VariantState>,
  ) => {
    setVariants((prev) => ({
      ...prev,
      [channel]: {
        caption: prev[channel]?.caption ?? '',
        hashtags: prev[channel]?.hashtags ?? '',
        scheduledAt: prev[channel]?.scheduledAt ?? '',
        ...patch,
      },
    }));
  };

  const canSubmit = useMemo(
    () => captionMaster.trim().length > 0 && !submitting,
    [captionMaster, submitting],
  );

  const handleSubmit = async (mode: 'draft' | 'schedule') => {
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      const variantPayload = [...selectedChannels].map((channel) => {
        const v = variants[channel];
        const scheduledIso =
          mode === 'schedule' ? localToIso(v?.scheduledAt ?? '') : null;
        return {
          channel,
          caption: v?.caption?.trim() || captionMaster,
          hashtags: v?.hashtags?.trim() || undefined,
          scheduled_at: scheduledIso,
        };
      });

      const res = await createMarketingPost({
        asset_url: assetUrl.trim() || undefined,
        asset_type: assetType,
        caption_master: captionMaster.trim(),
        notes: notes.trim() || undefined,
        variants: variantPayload,
      });

      toast({
        title:
          mode === 'schedule'
            ? `Agendado em ${res.variants_count} canal(is)`
            : 'Salvo como rascunho',
        variant: 'success',
      });
      navigate('/marketing/posts');
    } catch (err) {
      toast({
        title: 'Falha ao salvar',
        description: err instanceof RpcError ? err.message : 'Erro inesperado',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Composer"
        description="Crie 1 post mestre → variantes por rede com captions e horários ajustáveis por canal."
      />

      {/* Master post */}
      <Card>
        <Text className="text-xs font-semibold uppercase tracking-wide text-navy-400">
          Post mestre
        </Text>

        <div className="mt-3 space-y-4">
          <div>
            <label className="text-xs font-medium text-navy-600">
              Tipo de asset
            </label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {ASSET_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setAssetType(t.value)}
                  className={[
                    'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors',
                    assetType === t.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-navy-100 bg-white text-navy-500 hover:border-navy-200',
                  ].join(' ')}
                >
                  <span>{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {assetType !== 'text' && (
            <div>
              <label className="text-xs font-medium text-navy-600">
                Asset
              </label>

              {assetUrl ? (
                <div className="mt-1.5 flex items-start gap-3 rounded-md border border-navy-100 bg-navy-50/40 p-2.5">
                  {assetType === 'image' ? (
                    <img
                      src={assetUrl}
                      alt="preview"
                      className="h-20 w-20 rounded object-cover ring-1 ring-navy-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded bg-navy-100 text-2xl">
                      {assetType === 'video' ? '🎬' : '🖼️'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <code className="block break-all text-[11px] text-navy-500">
                      {assetUrl}
                    </code>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-medium text-brand-600 hover:underline"
                      >
                        Trocar
                      </button>
                      <button
                        type="button"
                        onClick={clearAsset}
                        className="text-xs text-navy-400 hover:text-rose-600"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-1.5 space-y-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-navy-200 bg-white px-3 py-6 text-sm text-navy-500 hover:border-brand-400 hover:text-brand-700 disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <Spinner size="sm" /> <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <span>📤</span>
                        <span>Selecionar arquivo (até 50MB)</span>
                      </>
                    )}
                  </button>

                  <details className="text-[11px] text-navy-400">
                    <summary className="cursor-pointer hover:text-navy-600">
                      Ou colar URL pública
                    </summary>
                    <input
                      type="url"
                      value={assetUrl}
                      onChange={(e) => setAssetUrl(e.target.value)}
                      placeholder="https://cdn.exemplo.com/post.jpg"
                      className="mt-2 w-full rounded-md border border-navy-100 px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none"
                    />
                  </details>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
                onChange={(e) => void handleFileSelect(e)}
                className="hidden"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-navy-600">
              Caption mestre <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={captionMaster}
              onChange={(e) => setCaptionMaster(e.target.value)}
              rows={4}
              placeholder="Texto base do post. As variantes começam com isso e podem ser ajustadas por canal."
              className="mt-1.5 w-full rounded-md border border-navy-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-navy-600">
              Notas internas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Briefing, link da tarefa, contexto da campanha..."
              className="mt-1.5 w-full rounded-md border border-navy-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Channel selection */}
      <Card>
        <Text className="text-xs font-semibold uppercase tracking-wide text-navy-400">
          Canais
        </Text>
        <p className="mt-1 text-xs text-navy-400">
          Escolha pelo menos um canal. Cada um recebe variante editável abaixo.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {MARKETING_CHANNELS.map((ch) => {
            const checked = selectedChannels.has(ch);
            return (
              <button
                key={ch}
                type="button"
                onClick={() => toggleChannel(ch)}
                className={[
                  'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors',
                  checked
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-navy-100 bg-white text-navy-500 hover:border-navy-200',
                ].join(' ')}
              >
                <span className="text-base">{CHANNEL_ICONS[ch]}</span>
                <span>{CHANNEL_LABELS[ch]}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Per-channel variants */}
      {selectedChannels.size > 0 && (
        <div className="space-y-3">
          <Text className="text-xs font-semibold uppercase tracking-wide text-navy-400">
            Variantes por canal
          </Text>
          {[...selectedChannels].map((ch) => (
            <Card key={ch}>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-lg">{CHANNEL_ICONS[ch]}</span>
                <span className="font-medium text-navy-700">
                  {CHANNEL_LABELS[ch]}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-navy-600">
                    Caption (deixe vazio pra usar a mestre)
                  </label>
                  <textarea
                    value={variants[ch]?.caption ?? ''}
                    onChange={(e) =>
                      updateVariant(ch, { caption: e.target.value })
                    }
                    rows={3}
                    placeholder={captionMaster || 'Caption específica deste canal...'}
                    className="mt-1.5 w-full rounded-md border border-navy-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-navy-600">
                    Hashtags (opcional)
                  </label>
                  <input
                    type="text"
                    value={variants[ch]?.hashtags ?? ''}
                    onChange={(e) =>
                      updateVariant(ch, { hashtags: e.target.value })
                    }
                    placeholder="#abn #tradies #australia"
                    className="mt-1.5 w-full rounded-md border border-navy-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-navy-600">
                    Agendar para
                  </label>
                  <input
                    type="datetime-local"
                    value={variants[ch]?.scheduledAt ?? ''}
                    onChange={(e) =>
                      updateVariant(ch, { scheduledAt: e.target.value })
                    }
                    className="mt-1.5 w-full rounded-md border border-navy-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => navigate('/marketing/posts')}
          className="rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-500 hover:bg-navy-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit('draft')}
          disabled={!canSubmit}
          className="rounded-md border border-navy-200 bg-white px-3 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50 disabled:opacity-50"
        >
          {submitting ? <Spinner size="sm" /> : 'Salvar rascunho'}
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit('schedule')}
          disabled={!canSubmit || selectedChannels.size === 0}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
        >
          {submitting ? <Spinner size="sm" /> : 'Agendar tudo'}
        </button>
      </div>

      <Card className="bg-navy-50/50">
        <Text className="text-xs text-navy-500">
          <strong className="text-navy-700">v0 — manual publish.</strong> O
          composer salva o post + variantes agendadas. Na hora do post, você
          recebe lembrete (push/email) e publica manualmente em cada rede,
          marcando aqui depois como <em>publicado</em>.
        </Text>
        <Text className="mt-1.5 text-xs text-navy-500">
          v1 ligará auto-publish via edge function (Meta Graph + TikTok) —
          sem dependência paga, tudo self-hosted.
        </Text>
      </Card>
    </div>
  );
}
