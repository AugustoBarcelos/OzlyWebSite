import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Text } from '@tremor/react';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';
import { ChevronDownIcon } from '@/components/Icons';
import {
  CHANNEL_ICONS,
  CHANNEL_LABELS,
  STATUS_LABELS,
  deleteMarketingPost,
  listMarketingPosts,
  updateMarketingVariant,
  type MarketingChannel,
  type MarketingPost,
  type MarketingPostStatus,
  type MarketingVariant,
  type MarketingVariantStatus,
} from '@/lib/marketing';
import { RpcError } from '@/lib/rpc';
import { PageHeader } from './_PageHeader';
import { ExternalPostsSection } from './ExternalPostsSection';

const PAGE_SIZE = 25;

const STATUS_OPTIONS: ReadonlyArray<{
  value: '' | MarketingPostStatus;
  label: string;
}> = [
  { value: '', label: 'Todos os status' },
  { value: 'draft', label: 'Rascunho' },
  { value: 'scheduled', label: 'Agendado' },
  { value: 'partial', label: 'Parcial' },
  { value: 'published', label: 'Publicado' },
  { value: 'archived', label: 'Arquivado' },
];

const CHANNEL_OPTIONS: ReadonlyArray<{
  value: '' | MarketingChannel;
  label: string;
}> = [
  { value: '', label: 'Todos os canais' },
  { value: 'org_instagram', label: '📸 Instagram' },
  { value: 'org_facebook', label: '📘 Facebook' },
  { value: 'org_tiktok', label: '🎵 TikTok' },
  { value: 'org_youtube', label: '▶️ YouTube' },
  { value: 'org_linkedin', label: '✈️ LinkedIn' },
  { value: 'msg_email', label: '📧 Email' },
];

function statusBadgeClass(
  s: MarketingPostStatus | MarketingVariantStatus,
): string {
  switch (s) {
    case 'published':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'scheduled':
      return 'bg-blue-50 text-blue-700 ring-blue-200';
    case 'partial':
      return 'bg-amber-50 text-amber-700 ring-amber-200';
    case 'failed':
      return 'bg-rose-50 text-rose-700 ring-rose-200';
    case 'archived':
      return 'bg-navy-50 text-navy-400 ring-navy-200';
    case 'skipped':
      return 'bg-navy-50 text-navy-500 ring-navy-200';
    default:
      return 'bg-navy-50 text-navy-600 ring-navy-200';
  }
}

function StatusBadge({
  status,
}: {
  status: MarketingPostStatus | MarketingVariantStatus;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ring-inset ${statusBadgeClass(status)}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function nextScheduled(post: MarketingPost): string | null {
  const dates = post.variants
    .map((v) => v.scheduled_at)
    .filter((d): d is string => Boolean(d))
    .sort();
  return dates[0] ?? null;
}

function isoToLocal(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      d.getFullYear() + '-' +
      pad(d.getMonth() + 1) + '-' +
      pad(d.getDate()) + 'T' +
      pad(d.getHours()) + ':' +
      pad(d.getMinutes())
    );
  } catch {
    return '';
  }
}

function localToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function MarketingPostsPage() {
  const [posts, setPosts] = useState<MarketingPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'' | MarketingPostStatus>('');
  const [channelFilter, setChannelFilter] = useState<'' | MarketingChannel>('');
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{
    variantId: string;
    channel: MarketingChannel;
    caption: string;
    hashtags: string;
    scheduledAt: string;
    saving: boolean;
  } | null>(null);
  const { toast } = useToast();

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listMarketingPosts({
        status: statusFilter || null,
        channel: channelFilter || null,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setPosts(res.posts);
      setTotal(res.total);
    } catch (err) {
      const msg = err instanceof RpcError ? err.message : 'Erro ao carregar posts';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, channelFilter, page]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleArchive = async (post: MarketingPost) => {
    if (!window.confirm(`Arquivar "${post.caption_master.slice(0, 60)}..."?`)) return;
    try {
      await deleteMarketingPost(post.id);
      toast({ title: 'Post arquivado', variant: 'success' });
      void fetchPosts();
    } catch (err) {
      toast({
        title: 'Falha ao arquivar',
        description: err instanceof RpcError ? err.message : 'Erro inesperado',
        variant: 'error',
      });
    }
  };

  const handleMarkPublished = async (variant: MarketingVariant) => {
    const url = window.prompt(
      `URL do post no ${CHANNEL_LABELS[variant.channel]} (opcional):`,
      variant.external_url ?? '',
    );
    if (url === null) return; // cancelado
    try {
      await updateMarketingVariant(variant.id, {
        status: 'published',
        external_url: url.trim() || undefined,
      });
      toast({ title: 'Variante marcada como publicada', variant: 'success' });
      void fetchPosts();
    } catch (err) {
      toast({
        title: 'Falha ao atualizar',
        description: err instanceof RpcError ? err.message : 'Erro inesperado',
        variant: 'error',
      });
    }
  };

  const handleMarkFailed = async (variant: MarketingVariant) => {
    if (!window.confirm(`Marcar variante ${CHANNEL_LABELS[variant.channel]} como falhou?`))
      return;
    try {
      await updateMarketingVariant(variant.id, { status: 'failed' });
      toast({ title: 'Variante marcada como falhou', variant: 'info' });
      void fetchPosts();
    } catch (err) {
      toast({
        title: 'Falha ao atualizar',
        description: err instanceof RpcError ? err.message : 'Erro inesperado',
        variant: 'error',
      });
    }
  };

  const openEdit = (variant: MarketingVariant) => {
    setEditing({
      variantId: variant.id,
      channel: variant.channel,
      caption: variant.caption,
      hashtags: variant.hashtags ?? '',
      scheduledAt: isoToLocal(variant.scheduled_at),
      saving: false,
    });
  };

  const closeEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing) return;
    setEditing({ ...editing, saving: true });
    try {
      await updateMarketingVariant(editing.variantId, {
        caption: editing.caption,
        hashtags: editing.hashtags.trim() || undefined,
        scheduled_at: editing.scheduledAt ? localToIso(editing.scheduledAt) : null,
      });
      toast({ title: 'Variante atualizada', variant: 'success' });
      setEditing(null);
      void fetchPosts();
    } catch (err) {
      setEditing((e) => (e ? { ...e, saving: false } : null));
      toast({
        title: 'Falha ao salvar',
        description: err instanceof RpcError ? err.message : 'Erro inesperado',
        variant: 'error',
      });
    }
  };

  const handleRevertToScheduled = async (variant: MarketingVariant) => {
    try {
      await updateMarketingVariant(variant.id, {
        status: variant.scheduled_at ? 'scheduled' : 'draft',
      });
      toast({ title: 'Status revertido', variant: 'info' });
      void fetchPosts();
    } catch (err) {
      toast({
        title: 'Falha ao reverter',
        description: err instanceof RpcError ? err.message : 'Erro inesperado',
        variant: 'error',
      });
    }
  };

  const showingStart = posts.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const showingEnd = page * PAGE_SIZE + posts.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Publicações"
          description="Tudo que foi publicado, agendado ou está em rascunho — com performance básica por variante."
        />
        <Link
          to="/marketing/composer"
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-600"
        >
          + Novo post
        </Link>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect
            label="Status"
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={(v) => {
              setStatusFilter(v as '' | MarketingPostStatus);
              setPage(0);
            }}
          />
          <FilterSelect
            label="Canal"
            value={channelFilter}
            options={CHANNEL_OPTIONS}
            onChange={(v) => {
              setChannelFilter(v as '' | MarketingChannel);
              setPage(0);
            }}
          />
          <div className="ml-auto text-xs text-navy-400">
            {total > 0 ? `${showingStart}–${showingEnd} de ${total}` : '0 posts'}
          </div>
        </div>
      </Card>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {error}
        </div>
      )}

      <Card className="!p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="md" />
          </div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center">
            <Text className="text-navy-400">Nenhum post encontrado.</Text>
            <Link
              to="/marketing/composer"
              className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline"
            >
              Criar o primeiro
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-navy-50 text-sm">
              <thead className="bg-navy-50/40 text-left text-[10px] font-semibold uppercase tracking-wide text-navy-400">
                <tr>
                  <th className="w-8 px-3 py-2"></th>
                  <th className="px-3 py-2">Caption mestre</th>
                  <th className="px-3 py-2">Canais</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Próximo</th>
                  <th className="px-3 py-2">Criado</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50 bg-white">
                {posts.map((post) => {
                  const isOpen = expanded.has(post.id);
                  return (
                    <PostRow
                      key={post.id}
                      post={post}
                      isOpen={isOpen}
                      onToggle={() => toggleExpanded(post.id)}
                      onArchive={() => void handleArchive(post)}
                      onMarkPublished={(v) => void handleMarkPublished(v)}
                      onMarkFailed={(v) => void handleMarkFailed(v)}
                      onRevert={(v) => void handleRevertToScheduled(v)}
                      onEdit={openEdit}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-navy-400">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-md border border-navy-100 bg-white px-3 py-1.5 disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span>
            Página {page + 1} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-md border border-navy-100 bg-white px-3 py-1.5 disabled:opacity-40"
          >
            Próxima →
          </button>
        </div>
      )}

      {/* Publicações reais nos canais (YT live; outros pendentes de token). */}
      <ExternalPostsSection channelFilter={channelFilter} />

      {editing && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={closeEdit}
            className="absolute inset-0 bg-navy-900/50"
          />
          <div className="relative z-10 w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <Text className="font-semibold text-navy-700">
                  Editar {CHANNEL_LABELS[editing.channel]}
                </Text>
                <Text className="mt-0.5 text-xs text-navy-400">
                  Caption, hashtags e horário desta variante.
                </Text>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                aria-label="Fechar"
                className="text-navy-300 hover:text-navy-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-navy-600">
                  Caption
                </label>
                <textarea
                  value={editing.caption}
                  onChange={(e) =>
                    setEditing({ ...editing, caption: e.target.value })
                  }
                  rows={4}
                  className="mt-1.5 w-full rounded-md border border-navy-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-navy-600">
                  Hashtags
                </label>
                <input
                  type="text"
                  value={editing.hashtags}
                  onChange={(e) =>
                    setEditing({ ...editing, hashtags: e.target.value })
                  }
                  placeholder="#abn #tradies"
                  className="mt-1.5 w-full rounded-md border border-navy-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-navy-600">
                  Agendar para
                </label>
                <input
                  type="datetime-local"
                  value={editing.scheduledAt}
                  onChange={(e) =>
                    setEditing({ ...editing, scheduledAt: e.target.value })
                  }
                  className="mt-1.5 w-full rounded-md border border-navy-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-navy-400">
                  Vazio = sem agendamento; status volta para rascunho na próxima leitura.
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeEdit}
                disabled={editing.saving}
                className="rounded-md border border-navy-100 bg-white px-3 py-2 text-sm text-navy-500 hover:bg-navy-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={editing.saving}
                className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
              >
                {editing.saving ? <Spinner size="sm" /> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PostRow({
  post,
  isOpen,
  onToggle,
  onArchive,
  onMarkPublished,
  onMarkFailed,
  onRevert,
  onEdit,
}: {
  post: MarketingPost;
  isOpen: boolean;
  onToggle: () => void;
  onArchive: () => void;
  onMarkPublished: (v: MarketingVariant) => void;
  onMarkFailed: (v: MarketingVariant) => void;
  onRevert: (v: MarketingVariant) => void;
  onEdit: (v: MarketingVariant) => void;
}) {
  const captionShort = useMemo(
    () =>
      post.caption_master.length > 80
        ? post.caption_master.slice(0, 80) + '…'
        : post.caption_master || '(sem caption)',
    [post.caption_master],
  );
  const next = nextScheduled(post);

  return (
    <>
      <tr className="hover:bg-navy-50/40">
        <td className="w-8 px-3 py-2 align-top">
          <button
            type="button"
            onClick={onToggle}
            aria-label={isOpen ? 'Fechar detalhes' : 'Abrir detalhes'}
            aria-expanded={isOpen}
            className="rounded-md p-1 text-navy-300 hover:bg-navy-100 hover:text-navy-700"
          >
            <ChevronDownIcon
              className={`h-3.5 w-3.5 transition-transform ${
                isOpen ? 'rotate-0' : '-rotate-90'
              }`}
            />
          </button>
        </td>
        <td className="px-3 py-2 align-top">
          <div className="flex items-start gap-2.5">
            {post.asset_url && post.asset_type === 'image' ? (
              <img
                src={post.asset_url}
                alt=""
                className="h-10 w-10 shrink-0 rounded object-cover ring-1 ring-navy-100"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-navy-50 text-base text-navy-300 ring-1 ring-navy-100">
                {post.asset_type === 'video' ? '🎬' :
                 post.asset_type === 'carousel' ? '🖼️' : '✏️'}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-medium text-navy-700">{captionShort}</div>
              {post.notes && (
                <div className="mt-0.5 text-[11px] italic text-navy-400">
                  {post.notes.slice(0, 100)}
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="px-3 py-2 align-top">
          <div className="flex flex-wrap gap-1">
            {post.variants.map((v) => (
              <span
                key={v.id}
                title={CHANNEL_LABELS[v.channel]}
                className="text-base"
              >
                {CHANNEL_ICONS[v.channel]}
              </span>
            ))}
          </div>
        </td>
        <td className="px-3 py-2 align-top">
          <StatusBadge status={post.status} />
        </td>
        <td className="px-3 py-2 align-top text-xs text-navy-500">
          {formatDate(next)}
        </td>
        <td className="px-3 py-2 align-top text-xs text-navy-400">
          {formatDate(post.created_at)}
        </td>
        <td className="px-3 py-2 align-top text-right">
          {post.status !== 'archived' && (
            <button
              type="button"
              onClick={onArchive}
              className="text-xs text-navy-400 hover:text-rose-600"
            >
              Arquivar
            </button>
          )}
        </td>
      </tr>
      {isOpen && (
        <tr className="bg-navy-50/20">
          <td colSpan={7} className="px-3 py-3">
            <div className="space-y-2">
              {post.variants.length === 0 ? (
                <Text className="text-xs italic text-navy-400">
                  Sem variantes — post mestre sem nenhum canal selecionado.
                </Text>
              ) : (
                post.variants.map((v) => (
                  <div
                    key={v.id}
                    className="flex flex-wrap items-start gap-3 rounded-md border border-navy-100 bg-white p-2.5 text-xs"
                  >
                    <div className="flex shrink-0 items-center gap-1.5 font-medium text-navy-700">
                      <span>{CHANNEL_ICONS[v.channel]}</span>
                      <span>{CHANNEL_LABELS[v.channel]}</span>
                    </div>
                    <div className="min-w-[200px] flex-1 text-navy-600">
                      {v.caption || (
                        <span className="italic text-navy-300">
                          (usa caption mestre)
                        </span>
                      )}
                      {v.hashtags && (
                        <div className="mt-0.5 text-[11px] text-brand-600">
                          {v.hashtags}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                      <StatusBadge status={v.status} />
                      <span className="text-[11px] text-navy-400">
                        {v.scheduled_at
                          ? `Agendado: ${formatDate(v.scheduled_at)}`
                          : 'Sem agendamento'}
                      </span>
                      {v.external_url && (
                        <a
                          href={v.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-brand-600 hover:underline"
                        >
                          Ver no canal ↗
                        </a>
                      )}
                      <div className="mt-1 flex flex-wrap justify-end gap-1.5">
                        {v.status !== 'published' && (
                          <>
                            <button
                              type="button"
                              onClick={() => onEdit(v)}
                              className="rounded-md border border-navy-200 bg-white px-2 py-0.5 text-[11px] font-medium text-navy-600 hover:bg-navy-50"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => onMarkPublished(v)}
                              className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
                            >
                              Marcar publicado
                            </button>
                          </>
                        )}
                        {v.status !== 'failed' && v.status !== 'published' && (
                          <button
                            type="button"
                            onClick={() => onMarkFailed(v)}
                            className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 hover:bg-rose-100"
                          >
                            Falhou
                          </button>
                        )}
                        {(v.status === 'published' ||
                          v.status === 'failed' ||
                          v.status === 'skipped') && (
                          <button
                            type="button"
                            onClick={() => onRevert(v)}
                            className="rounded-md border border-navy-200 bg-white px-2 py-0.5 text-[11px] font-medium text-navy-600 hover:bg-navy-50"
                          >
                            Reverter
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-navy-500">
      <span className="font-medium uppercase tracking-wide text-navy-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-navy-100 bg-white px-2 py-1 text-xs text-navy-700 focus:border-brand-500 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
