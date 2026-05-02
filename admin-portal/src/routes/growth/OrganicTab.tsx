import { Grid } from '@tremor/react';
import { IntegrationStub } from '../marketing/PlaceholderCard';
import { YoutubeCard } from '../marketing/YoutubeCard';
import { TiktokCard } from '../marketing/TiktokCard';
import { isYoutubeConfigured } from '@/lib/youtube';

/**
 * Organic — canais sociais (não-pagos).
 *
 * YT: API key, sempre on quando env configurado.
 * TikTok: card auto-suficiente — connect/reconnect/stats tudo dentro do
 *         próprio dropdown (não precisa ir em Marketing pra plugar).
 * IG/FB: stubs até as credenciais correspondentes existirem.
 */
export function OrganicTab() {
  const ytConfigured = isYoutubeConfigured();

  return (
    <div className="space-y-4">
      {ytConfigured && <YoutubeCard />}
      <TiktokCard />

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

      </Grid>
    </div>
  );
}
