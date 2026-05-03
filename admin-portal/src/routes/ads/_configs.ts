import type { ComponentProps } from 'react';
import type { IntegrationStub } from '../marketing/PlaceholderCard';

type StubProps = ComponentProps<typeof IntegrationStub>;

/**
 * Configuração das 4 plataformas de tráfego pago. Mantida em um lugar só
 * para que `/ads` (overview) e cada `/ads/<plataforma>` rendam o mesmo stub
 * sem divergir.
 */
export const ADS_PLATFORMS: Record<'google' | 'meta' | 'asa' | 'tiktok', StubProps> = {
  google: {
    icon: '🎯',
    title: 'Google Ads (incl. YouTube Ads)',
    description:
      'Spend, conversions, ROAS por campanha + keyword performance. YouTube video ads são gerenciados aqui.',
    steps: [
      'ads.google.com/aw/apicenter — request Developer token (1-2 dias de espera)',
      'console.cloud.google.com → enable Google Ads API → criar OAuth client',
      'Gerar refresh_token via OAuth2 playground',
      'Me passa developer_token + customer_id + refresh_token — deploy edge fn google-ads-fetch',
    ],
    envVars: [
      'GADS_DEVELOPER_TOKEN',
      'GADS_CUSTOMER_ID',
      'GADS_OAUTH_CLIENT_ID',
      'GADS_OAUTH_CLIENT_SECRET',
      'GADS_REFRESH_TOKEN',
    ],
    ctaLabel: 'Abrir Google Ads',
    ctaHref: 'https://ads.google.com',
  },
  meta: {
    icon: '📘',
    title: 'Meta Ads (Facebook + Instagram)',
    description:
      'Spend, conversions, CTR por campanha + creative performance',
    steps: [
      'business.facebook.com → Business settings → System Users → criar admin',
      'Gerar long-lived access token (sem expiração) pro system user',
      'Adicionar ad account assets — grant System User com Ad Account Manage role',
      'Anotar ad_account_id (act_xxxxxxxxxxxxx)',
      'Me passa token + ad_account_id',
    ],
    envVars: ['META_ACCESS_TOKEN', 'META_AD_ACCOUNT_ID'],
    ctaLabel: 'Abrir Meta Business',
    ctaHref: 'https://business.facebook.com',
  },
  asa: {
    icon: '🍎',
    title: 'Apple Search Ads',
    description:
      'Pipeline operacional. Cron `:17` puxa /v5/reports/campaigns e popula paid_campaigns_snapshot. Métricas aparecem aqui automaticamente assim que a primeira campanha rodar.',
    steps: [
      'app.searchads.apple.com → All Campaigns → Create Campaign',
      'Configura budget, keywords, audience — ativa a campanha',
      'Aguarda até 1h: o cron roda em :17 de cada hora',
      'Recarrega esta página — KPIs e tabela de campanhas vão substituir este placeholder',
    ],
    envVars: [
      'APPLE_ADS_CLIENT_ID',
      'APPLE_ADS_TEAM_ID',
      'APPLE_ADS_KEY_ID',
      'APPLE_ADS_PRIVATE_KEY',
      'APPLE_ADS_ORG_ID',
    ],
    ctaLabel: 'Criar campanha no Apple Ads',
    ctaHref: 'https://app.searchads.apple.com',
    status: 'connected',
  },
  tiktok: {
    icon: '🎵',
    title: 'TikTok Ads',
    description: 'Spend, CPI, install attribution por campanha',
    steps: [
      'business.tiktok.com → Tools → For Developers → criar app',
      'Configurar OAuth — pegar App ID + Secret',
      'Rodar OAuth flow uma vez pra pegar long-lived access token',
      'Anotar advertiser_id da URL do Ads Manager',
      'Me passa app_id + secret + access_token + advertiser_id',
    ],
    envVars: [
      'TIKTOK_APP_ID',
      'TIKTOK_APP_SECRET',
      'TIKTOK_ACCESS_TOKEN',
      'TIKTOK_ADVERTISER_ID',
    ],
    ctaLabel: 'Abrir TikTok Business',
    ctaHref: 'https://business.tiktok.com',
  },
};
