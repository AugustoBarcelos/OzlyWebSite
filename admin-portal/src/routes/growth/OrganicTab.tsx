import { Grid } from '@tremor/react';
import { IntegrationStub } from '../marketing/PlaceholderCard';
import { YoutubeCard } from '../marketing/YoutubeCard';
import { isYoutubeConfigured } from '@/lib/youtube';

/**
 * Organic — canais sociais (não-pagos). YT canal já está plugado, IG/FB/TikTok
 * em pending até as credenciais Meta/TikTok serem geradas.
 */
export function OrganicTab() {
  const ytConfigured = isYoutubeConfigured();

  return (
    <div className="space-y-4">
      {ytConfigured && <YoutubeCard />}

      <Grid numItemsLg={2} className="gap-3">
        <IntegrationStub
          icon="📸"
          title="Instagram (Business)"
          description="Followers, reach, impressions, top posts, story analytics"
          steps={[
            "Conta Instagram precisa ser 'Business' ou 'Creator', linkada a uma Page do Facebook",
            'business.facebook.com → conectar Instagram + grant page admin a System User',
            'Gerar Instagram Graph API token (subset do long-lived Meta token)',
            'Anotar IG Business Account ID (via /me/accounts endpoint)',
            'Cola token + ig_user_id — usa o mesmo Meta system user dos Ads',
          ]}
          envVars={['META_ACCESS_TOKEN', 'IG_BUSINESS_ACCOUNT_ID']}
          ctaLabel="Abrir IG Insights"
          ctaHref="https://business.facebook.com/latest/insights"
        />

        <IntegrationStub
          icon="📘"
          title="Facebook Page"
          description="Page likes, post reach, video views, engagement rate"
          steps={[
            'Mesmo Meta system user dos tabs Ads/Instagram',
            'Grant Pages Read Engagement scope no system user',
            'Anotar Page ID',
          ]}
          envVars={['META_ACCESS_TOKEN', 'FB_PAGE_ID']}
          ctaLabel="Abrir Page Insights"
          ctaHref="https://business.facebook.com/latest/insights"
        />

        <IntegrationStub
          icon="🎵"
          title="TikTok Business"
          description="Profile follows, video views, average watch time"
          steps={[
            'business.tiktok.com → Creator Hub → Conectar conta',
            'Mesmo TikTok app dos Ads + adicionar scope user.info.basic + video.list',
            'Anotar TikTok Open ID da conta conectada',
          ]}
          envVars={['TIKTOK_OPEN_ID', 'TIKTOK_ACCESS_TOKEN']}
          ctaLabel="Abrir TikTok Business"
          ctaHref="https://business.tiktok.com"
        />

        {!ytConfigured && (
          <IntegrationStub
            icon="▶️"
            title="YouTube (Channel)"
            description="Subs, views, watch time, top videos, demographics"
            steps={[
              'console.cloud.google.com → enable YouTube Data API v3',
              'Criar API key (read-only) — sem OAuth pra dados públicos do canal',
              'Anotar YouTube channel ID (UC...)',
              'Pra analytics privado (watchtime por demo), enable YouTube Analytics API + OAuth',
            ]}
            envVars={['VITE_YT_API_KEY', 'VITE_YT_CHANNEL_ID']}
            ctaLabel="Abrir YT Studio"
            ctaHref="https://studio.youtube.com"
          />
        )}

        <IntegrationStub
          icon="✈️"
          title="LinkedIn (Company Page)"
          description="Followers, post impressions, engagement (B2B angle)"
          steps={[
            'developer.linkedin.com → criar app linkado à Company Page',
            'Request Marketing Developer Platform access (1-2 semanas de review)',
            'OAuth flow → r_organization_social + r_ads_reporting scopes',
            'Pula se você não está postando no LinkedIn',
          ]}
          envVars={['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_ORG_ID']}
          ctaLabel="Abrir LinkedIn Dev"
          ctaHref="https://developer.linkedin.com"
        />
      </Grid>
    </div>
  );
}
