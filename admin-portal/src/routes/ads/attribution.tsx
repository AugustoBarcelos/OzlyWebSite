import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Text, Title } from '@tremor/react';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';
import {
  createUtmLink,
  deleteUtmLink,
  listUtmLinks,
  type UtmLink,
} from '@/lib/marketing';
import { RpcError } from '@/lib/rpc';
import { PageHeader } from '../marketing/_PageHeader';

const UTM_SOURCES = [
  'ig',
  'fb',
  'tt',
  'li',
  'yt',
  'x',
  'blog',
  'email',
  'google',
  'meta',
  'asa',
  'tiktok_ads',
] as const;

const UTM_MEDIUMS = ['organic', 'paid', 'email', 'referral', 'partnership'] as const;

const SHORT_LINK_BASE = 'https://ozly.app/go/';

function buildPreview(link: {
  destination_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign?: string | null;
  utm_content?: string | null;
}): string {
  try {
    const url = new URL(link.destination_url);
    url.searchParams.set('utm_source', link.utm_source);
    url.searchParams.set('utm_medium', link.utm_medium);
    if (link.utm_campaign) url.searchParams.set('utm_campaign', link.utm_campaign);
    if (link.utm_content) url.searchParams.set('utm_content', link.utm_content);
    return url.toString();
  } catch {
    return link.destination_url;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function AttributionPage() {
  const [slug, setSlug] = useState('');
  const [destUrl, setDestUrl] = useState('');
  const [source, setSource] = useState<string>(UTM_SOURCES[0]);
  const [medium, setMedium] = useState<string>(UTM_MEDIUMS[0]);
  const [campaign, setCampaign] = useState('');
  const [content, setContent] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [links, setLinks] = useState<UtmLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const { toast } = useToast();

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await listUtmLinks(100, 0);
      setLinks(res.links);
    } catch (err) {
      setListError(err instanceof RpcError ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLinks();
  }, [fetchLinks]);

  const previewUrl = useMemo(() => {
    if (!destUrl) return null;
    return buildPreview({
      destination_url: destUrl,
      utm_source: source,
      utm_medium: medium,
      utm_campaign: campaign || null,
      utm_content: content || null,
    });
  }, [destUrl, source, medium, campaign, content]);

  const canSubmit =
    slug.trim().length >= 2 && destUrl.trim().length > 0 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await createUtmLink({
        slug: slug.trim().toLowerCase(),
        destination_url: destUrl.trim(),
        utm_source: source,
        utm_medium: medium,
        utm_campaign: campaign.trim() || undefined,
        utm_content: content.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast({ title: 'Link UTM criado', variant: 'success' });
      setSlug('');
      setDestUrl('');
      setCampaign('');
      setContent('');
      setNotes('');
      void fetchLinks();
    } catch (err) {
      toast({
        title: 'Falha ao criar',
        description: err instanceof RpcError ? err.message : 'Erro inesperado',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copiado', variant: 'info' });
    } catch {
      toast({ title: 'Não foi possível copiar', variant: 'error' });
    }
  };

  const handleDelete = async (link: UtmLink) => {
    if (!window.confirm(`Apagar /go/${link.slug}?`)) return;
    try {
      await deleteUtmLink(link.id);
      toast({ title: 'Link removido', variant: 'success' });
      void fetchLinks();
    } catch (err) {
      toast({
        title: 'Falha ao remover',
        description: err instanceof RpcError ? err.message : 'Erro inesperado',
        variant: 'error',
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="UTM & Atribuição"
        description="De onde vieram os signups e os trials → paid. Gere links curtos com UTM, e o redirect /go/<slug> dispara o tracking."
      />

      {/* Generator */}
      <Card>
        <Title>Gerador de link curto</Title>
        <Text className="mt-1 text-xs text-navy-400">
          Cria um link <code>{SHORT_LINK_BASE}&lt;slug&gt;</code> que redireciona
          para a URL de destino com UTMs anexados — atribui sem expor parâmetros
          longos no canal.
        </Text>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-navy-600">
              Slug <span className="text-rose-500">*</span>
            </label>
            <div className="mt-1.5 flex items-center rounded-md border border-navy-100 focus-within:border-brand-500">
              <span className="px-2.5 py-2 text-xs text-navy-400">/go/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) =>
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9_-]/g, ''),
                  )
                }
                placeholder="2026-05-tax-tip"
                pattern="[a-z0-9][a-z0-9_-]{1,63}"
                minLength={2}
                maxLength={64}
                className="flex-1 rounded-r-md border-0 bg-transparent px-1 py-2 text-sm focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-navy-400">
              2-64 chars: a-z, 0-9, hífen, underline.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-navy-600">
              URL de destino <span className="text-rose-500">*</span>
            </label>
            <input
              type="url"
              value={destUrl}
              onChange={(e) => setDestUrl(e.target.value)}
              placeholder="https://ozly.au/landing/abn-tradies"
              className="mt-1.5 w-full rounded-md border border-navy-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-navy-600">
              utm_source
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              {UTM_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-navy-600">
              utm_medium
            </label>
            <select
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              {UTM_MEDIUMS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-navy-600">
              utm_campaign (opcional)
            </label>
            <input
              type="text"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder="2026-05-fy-end"
              className="mt-1.5 w-full rounded-md border border-navy-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-navy-600">
              utm_content (opcional)
            </label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="reel-a-vs-b"
              className="mt-1.5 w-full rounded-md border border-navy-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-medium text-navy-600">
              Notas internas (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reel sobre dedução de viagem, postar em IG + TT na semana do FY end"
              className="mt-1.5 w-full rounded-md border border-navy-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          {previewUrl && (
            <div className="md:col-span-2">
              <Text className="text-[11px] uppercase tracking-wide text-navy-400">
                Preview do link expandido
              </Text>
              <code className="mt-1 block break-all rounded-md bg-navy-50 px-3 py-2 text-[11px] text-navy-600">
                {previewUrl}
              </code>
            </div>
          )}

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
            >
              {submitting ? <Spinner size="sm" /> : 'Gerar link'}
            </button>
          </div>
        </form>
      </Card>

      {/* List */}
      <Card className="!p-0">
        <div className="flex items-center justify-between border-b border-navy-50 px-4 py-3">
          <Title>Links existentes</Title>
          <span className="text-xs text-navy-400">{links.length}</span>
        </div>

        {listError && (
          <div
            role="alert"
            className="mx-4 my-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          >
            {listError}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="md" />
          </div>
        ) : links.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Text className="text-sm text-navy-400">
              Nenhum link UTM ainda. Crie o primeiro acima.
            </Text>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-navy-50 text-sm">
              <thead className="bg-navy-50/40 text-left text-[10px] font-semibold uppercase tracking-wide text-navy-400">
                <tr>
                  <th className="px-3 py-2">Slug</th>
                  <th className="px-3 py-2">Source / Medium</th>
                  <th className="px-3 py-2">Campanha</th>
                  <th className="px-3 py-2 text-right">Cliques</th>
                  <th className="px-3 py-2">Criado</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50 bg-white">
                {links.map((l) => {
                  const shortUrl = SHORT_LINK_BASE + l.slug;
                  return (
                    <tr key={l.id} className="hover:bg-navy-50/40">
                      <td className="px-3 py-2 align-top">
                        <button
                          type="button"
                          onClick={() => void handleCopy(shortUrl)}
                          className="text-left font-mono text-xs text-brand-600 hover:underline"
                          title="Copiar"
                        >
                          /go/{l.slug}
                        </button>
                        {l.notes && (
                          <div className="mt-0.5 text-[11px] italic text-navy-400">
                            {l.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-xs">
                        <span className="font-mono text-navy-700">{l.utm_source}</span>
                        <span className="px-1 text-navy-300">/</span>
                        <span className="font-mono text-navy-500">{l.utm_medium}</span>
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-navy-600">
                        {l.utm_campaign ?? <span className="text-navy-300">—</span>}
                        {l.utm_content && (
                          <div className="text-[11px] text-navy-400">
                            content: {l.utm_content}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right align-top font-mono text-xs">
                        {l.click_count}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-navy-400">
                        {formatDate(l.created_at)}
                      </td>
                      <td className="px-3 py-2 align-top text-right">
                        <button
                          type="button"
                          onClick={() => void handleDelete(l)}
                          className="text-xs text-navy-400 hover:text-rose-600"
                        >
                          Apagar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="bg-navy-50/50">
        <Title className="!text-navy-700">Próximo passo (v1)</Title>
        <Text className="mt-2 text-sm text-navy-600">
          Falta a edge function <code className="rounded bg-white px-1">go-redirect</code>{' '}
          que recebe <code>/go/&lt;slug&gt;</code>, busca o link em{' '}
          <code>marketing_utm_links</code>, incrementa <code>click_count</code> + grava{' '}
          <code>last_click_at</code>, e responde <code>302</code> para o destino com
          os UTMs anexados.
        </Text>
        <Text className="mt-2 text-sm text-navy-600">
          Depois disso: dashboard de funil por canal (click → signup → trial → paid),
          cruzando <code>marketing_utm_links</code> com <code>app_events</code>.
          Atribuição last-touch primeiro; multi-touch (linear / time-decay) na sequência.
        </Text>
      </Card>
    </div>
  );
}
