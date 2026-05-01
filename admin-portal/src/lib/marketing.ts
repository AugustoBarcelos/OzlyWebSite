import { callRpc, RpcError } from './rpc';
import { supabase } from './supabase';

/**
 * Marketing Portal — typed wrappers for the marketing_* RPCs defined in
 * migration 20260501250000_marketing_portal_schema.sql.
 *
 * v0 é admin-only no backend. Frontend não checa role — confia no SECURITY
 * DEFINER + is_admin() gate da RPC.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type MarketingPostStatus =
  | 'draft'
  | 'scheduled'
  | 'partial'
  | 'published'
  | 'archived';

export type MarketingVariantStatus =
  | 'draft'
  | 'scheduled'
  | 'published'
  | 'failed'
  | 'skipped';

export type MarketingAssetType = 'image' | 'video' | 'carousel' | 'text';

/** Channels válidos para variants. Subset do enum channel_kind. */
export const MARKETING_CHANNELS = [
  'org_instagram',
  'org_facebook',
  'org_tiktok',
  'org_youtube',
  'org_linkedin',
  'msg_email',
] as const;

export type MarketingChannel = (typeof MARKETING_CHANNELS)[number];

export const CHANNEL_LABELS: Record<MarketingChannel, string> = {
  org_instagram: 'Instagram',
  org_facebook: 'Facebook',
  org_tiktok: 'TikTok',
  org_youtube: 'YouTube',
  org_linkedin: 'LinkedIn',
  msg_email: 'Email (broadcast)',
};

export const CHANNEL_ICONS: Record<MarketingChannel, string> = {
  org_instagram: '📸',
  org_facebook: '📘',
  org_tiktok: '🎵',
  org_youtube: '▶️',
  org_linkedin: '✈️',
  msg_email: '📧',
};

export const STATUS_LABELS: Record<
  MarketingPostStatus | MarketingVariantStatus,
  string
> = {
  draft: 'Rascunho',
  scheduled: 'Agendado',
  partial: 'Parcial',
  published: 'Publicado',
  archived: 'Arquivado',
  failed: 'Falhou',
  skipped: 'Pulado',
};

export interface MarketingVariant {
  id: string;
  channel: MarketingChannel;
  caption: string;
  hashtags: string | null;
  scheduled_at: string | null;
  status: MarketingVariantStatus;
  external_url: string | null;
  posted_at: string | null;
  failure_reason: string | null;
}

export interface MarketingPost {
  id: string;
  owner_id: string;
  asset_url: string | null;
  asset_type: MarketingAssetType;
  caption_master: string;
  notes: string | null;
  status: MarketingPostStatus;
  created_at: string;
  updated_at: string;
  variants: MarketingVariant[];
}

export interface CalendarItem {
  variant_id: string;
  post_id: string;
  channel: MarketingChannel;
  caption: string;
  scheduled_at: string;
  status: MarketingVariantStatus;
  external_url: string | null;
  asset_url: string | null;
  asset_type: MarketingAssetType;
}

export interface UtmLink {
  id: string;
  slug: string;
  destination_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string | null;
  utm_content: string | null;
  notes: string | null;
  click_count: number;
  last_click_at: string | null;
  created_at: string;
}

// ─── RPC wrappers ───────────────────────────────────────────────────────────

export interface CreatePostInput {
  asset_url?: string | undefined;
  asset_type: MarketingAssetType;
  caption_master: string;
  notes?: string | undefined;
  variants: ReadonlyArray<{
    channel: MarketingChannel;
    caption?: string | undefined;
    hashtags?: string | undefined;
    scheduled_at?: string | null | undefined;
  }>;
}

export async function createMarketingPost(input: CreatePostInput) {
  return callRpc<{ ok: boolean; post_id: string; variants_count: number }>(
    'marketing_create_post',
    {
      p_asset_url: input.asset_url ?? null,
      p_asset_type: input.asset_type,
      p_caption_master: input.caption_master,
      p_notes: input.notes ?? null,
      p_variants: input.variants,
    },
  );
}

export interface ListPostsInput {
  status?: MarketingPostStatus | null | undefined;
  channel?: MarketingChannel | null | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export async function listMarketingPosts(input: ListPostsInput = {}) {
  return callRpc<{
    posts: MarketingPost[];
    total: number;
    limit: number;
    offset: number;
  }>('marketing_list_posts', {
    p_status: input.status ?? null,
    p_channel: input.channel ?? null,
    p_limit: input.limit ?? 50,
    p_offset: input.offset ?? 0,
  });
}

export async function getMarketingPost(postId: string) {
  return callRpc<MarketingPost>('marketing_get_post', { p_post_id: postId });
}

export interface UpdatePostInput {
  caption_master?: string | undefined;
  notes?: string | undefined;
  status?: 'draft' | 'archived' | undefined;
}

export async function updateMarketingPost(postId: string, input: UpdatePostInput) {
  return callRpc<{ ok: boolean }>('marketing_update_post', {
    p_post_id: postId,
    p_caption_master: input.caption_master ?? null,
    p_notes: input.notes ?? null,
    p_status: input.status ?? null,
  });
}

export interface UpdateVariantInput {
  caption?: string | undefined;
  hashtags?: string | undefined;
  scheduled_at?: string | null | undefined;
  status?: MarketingVariantStatus | undefined;
  external_url?: string | undefined;
}

export async function updateMarketingVariant(
  variantId: string,
  input: UpdateVariantInput,
) {
  return callRpc<{ ok: boolean }>('marketing_update_variant', {
    p_variant_id: variantId,
    p_caption: input.caption ?? null,
    p_hashtags: input.hashtags ?? null,
    p_scheduled_at: input.scheduled_at ?? null,
    p_status: input.status ?? null,
    p_external_url: input.external_url ?? null,
  });
}

export async function deleteMarketingPost(postId: string) {
  return callRpc<{ ok: boolean }>('marketing_delete_post', {
    p_post_id: postId,
  });
}

export async function getMarketingCalendar(
  rangeStart: Date,
  rangeEnd: Date,
) {
  return callRpc<{ items: CalendarItem[] }>('marketing_calendar', {
    p_range_start: rangeStart.toISOString(),
    p_range_end: rangeEnd.toISOString(),
  });
}

export interface CreateUtmInput {
  slug: string;
  destination_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign?: string | undefined;
  utm_content?: string | undefined;
  notes?: string | undefined;
}

export async function createUtmLink(input: CreateUtmInput) {
  return callRpc<{ ok: boolean; id: string; slug: string }>(
    'marketing_create_utm',
    {
      p_slug: input.slug,
      p_destination_url: input.destination_url,
      p_utm_source: input.utm_source,
      p_utm_medium: input.utm_medium,
      p_utm_campaign: input.utm_campaign ?? null,
      p_utm_content: input.utm_content ?? null,
      p_notes: input.notes ?? null,
    },
  );
}

export async function listUtmLinks(limit = 100, offset = 0) {
  return callRpc<{ links: UtmLink[]; total: number }>('marketing_list_utm', {
    p_limit: limit,
    p_offset: offset,
  });
}

export async function deleteUtmLink(id: string) {
  return callRpc<{ ok: boolean }>('marketing_delete_utm', { p_id: id });
}

// ─── Storage ────────────────────────────────────────────────────────────────

export const MARKETING_ASSETS_BUCKET = 'marketing-assets';

const ALLOWED_ASSET_MIMES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const;

const MAX_ASSET_BYTES = 50 * 1024 * 1024; // 50 MB — alinhado com bucket policy

export interface UploadResult {
  path: string;
  publicUrl: string;
}

/**
 * Faz upload de um asset (imagem/vídeo) pro bucket marketing-assets e retorna
 * a public URL. Path é prefixado com YYYY-MM/ para organizar por mês.
 */
export async function uploadMarketingAsset(file: File): Promise<UploadResult> {
  if (file.size > MAX_ASSET_BYTES) {
    throw new RpcError(
      'storage_upload',
      `Arquivo passa de 50MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
    );
  }
  if (!ALLOWED_ASSET_MIMES.includes(file.type as never)) {
    throw new RpcError(
      'storage_upload',
      `Tipo não suportado: ${file.type || 'desconhecido'}`,
    );
  }

  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? 'bin';
  const now = new Date();
  const yyyymm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const random = window.crypto.randomUUID();
  const path = `${yyyymm}/${random}.${ext}`;

  const uploadOptions: { cacheControl: string; upsert: boolean; contentType?: string } = {
    cacheControl: '3600',
    upsert: false,
  };
  if (file.type) uploadOptions.contentType = file.type;

  const { error } = await supabase.storage
    .from(MARKETING_ASSETS_BUCKET)
    .upload(path, file, uploadOptions);

  if (error) {
    throw new RpcError('storage_upload', error.message);
  }

  const { data } = supabase.storage
    .from(MARKETING_ASSETS_BUCKET)
    .getPublicUrl(path);

  return { path, publicUrl: data.publicUrl };
}

/**
 * Heurística leve pra inferir asset_type a partir do MIME-type.
 * Carrossel é decisão manual (múltiplas imagens) — default pra image.
 */
export function inferAssetTypeFromMime(mime: string): MarketingAssetType {
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('image/')) return 'image';
  return 'text';
}
