import type { ChannelKind, TeamRole } from './auth';

/**
 * Catálogo de canais — usado pra renderizar a matriz de grants e a sidebar.
 *
 * Source-of-truth do enum vive no Postgres (`public.channel_kind`); aqui é
 * o display layer. Se adicionar um canal lá, adicionar aqui também — o
 * type-checker do TS pega via narrowing na key.
 */

export interface ChannelMeta {
  kind: ChannelKind;
  label: string;
  icon: string;
  group: 'organic' | 'paid' | 'messaging';
  /** Default permissions when granting via "preset role" — UX shortcut. */
  defaultPerms: {
    can_read: boolean;
    can_publish: boolean;
    can_edit: boolean;
    can_manage_budget: boolean;
  };
}

const FULL_OPS = {
  can_read: true,
  can_publish: true,
  can_edit: true,
  can_manage_budget: false,
} as const;

const FULL_BUDGET = {
  can_read: true,
  can_publish: true,
  can_edit: true,
  can_manage_budget: true,
} as const;

const READ_ONLY = {
  can_read: true,
  can_publish: false,
  can_edit: false,
  can_manage_budget: false,
} as const;

export const CHANNELS: ReadonlyArray<ChannelMeta> = [
  // Organic
  { kind: 'org_instagram', label: 'Instagram',  icon: '📸', group: 'organic',  defaultPerms: { ...FULL_OPS } },
  { kind: 'org_facebook',  label: 'Facebook',   icon: '📘', group: 'organic',  defaultPerms: { ...FULL_OPS } },
  { kind: 'org_tiktok',    label: 'TikTok',     icon: '🎵', group: 'organic',  defaultPerms: { ...FULL_OPS } },
  { kind: 'org_youtube',   label: 'YouTube',    icon: '▶️', group: 'organic',  defaultPerms: { ...FULL_OPS } },
  // org_linkedin: removido — LinkedIn Marketing API requer "approved partner"
  // status, raramente concedido a apps individuais. Posta-se manual.
  // Paid
  { kind: 'paid_google',   label: 'Google Ads', icon: '🎯', group: 'paid',     defaultPerms: { ...FULL_BUDGET } },
  { kind: 'paid_meta',     label: 'Meta Ads',   icon: '📘', group: 'paid',     defaultPerms: { ...FULL_BUDGET } },
  { kind: 'paid_asa',      label: 'Apple Search Ads', icon: '🍎', group: 'paid', defaultPerms: { ...FULL_BUDGET } },
  { kind: 'paid_tiktok',   label: 'TikTok Ads', icon: '🎵', group: 'paid',     defaultPerms: { ...FULL_BUDGET } },
  // Messaging
  { kind: 'msg_email',     label: 'Email (Resend)',   icon: '📧', group: 'messaging', defaultPerms: { ...FULL_OPS } },
  { kind: 'msg_whatsapp',  label: 'WhatsApp',         icon: '💬', group: 'messaging', defaultPerms: { ...FULL_OPS } },
  { kind: 'msg_sms',       label: 'SMS (Twilio)',     icon: '📱', group: 'messaging', defaultPerms: { ...READ_ONLY } },
];

export function channelsByGroup(group: ChannelMeta['group']): ChannelMeta[] {
  return CHANNELS.filter((c) => c.group === group);
}

/**
 * Preset bundles pra UX da tela de invite — admin escolhe role + canais
 * já vêm com permissions razoáveis.
 */
export const ROLE_PRESETS: Record<Exclude<TeamRole, 'admin'>, ChannelKind[]> = {
  content_creator: ['org_instagram', 'org_facebook', 'org_tiktok', 'org_youtube'],
  traffic_manager: ['paid_google', 'paid_meta', 'paid_asa', 'paid_tiktok'],
  messaging_manager: ['msg_email', 'msg_whatsapp'],
};

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  admin: 'Admin',
  content_creator: 'Content creator',
  traffic_manager: 'Traffic manager',
  messaging_manager: 'Messaging manager',
};
