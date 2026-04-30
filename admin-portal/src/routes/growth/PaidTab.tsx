import { Card, Text, Title } from '@tremor/react';
import { IntegrationStub } from '../marketing/PlaceholderCard';

/**
 * Paid — central de campanhas pagas multi-plataforma.
 *
 * Cada plataforma é um IntegrationStub colapsado por default (passos de
 * wiring escondidos até alguém clicar pra configurar). Quando uma API for
 * plugada, o stub é substituído por um card real com Spend / Conv / CPA /
 * ROAS, e a tabela do Overview puxa direto desses cards.
 *
 * YouTube Ads cai dentro de Google Ads (campanhas de vídeo são geridas no
 * Google Ads), então não tem stub separado pra YT Ads.
 */
export function PaidTab() {
  return (
    <div className="space-y-4">
      <Card>
        <Title>Como funciona</Title>
        <Text className="mt-2 text-sm text-navy-500">
          Cada provedor abaixo está como <strong>Pending</strong> — clica pra
          ver os passos de configuração. Quando você setar as credenciais
          (`.env` do edge fn ou Supabase secrets), o stub vira um painel com
          spend, conversões, CPA e ROAS. O Overview agrega tudo automaticamente.
        </Text>
        <Text className="mt-2 text-xs text-navy-400">
          Atribuição de conversão: cada conversão (trial → paid) é atribuída
          a uma campanha via UTM (web), IDFA/GAID (mobile) ou referral_code.
          Isso é o próximo trabalho pesado depois que pelo menos uma API ativa.
        </Text>
      </Card>

      <div className="space-y-3">
        <IntegrationStub
          icon="🎯"
          title="Google Ads (incl. YouTube Ads)"
          description="Spend, conversions, ROAS por campanha + keyword performance. YouTube video ads são gerenciados aqui."
          steps={[
            'ads.google.com/aw/apicenter — request Developer token (1-2 dias de espera)',
            'console.cloud.google.com → enable Google Ads API → criar OAuth client',
            'Gerar refresh_token via OAuth2 playground',
            'Me passa developer_token + customer_id + refresh_token — deploy edge fn google-ads-fetch',
          ]}
          envVars={[
            'GADS_DEVELOPER_TOKEN',
            'GADS_CUSTOMER_ID',
            'GADS_OAUTH_CLIENT_ID',
            'GADS_OAUTH_CLIENT_SECRET',
            'GADS_REFRESH_TOKEN',
          ]}
          ctaLabel="Abrir Google Ads"
          ctaHref="https://ads.google.com"
        />

        <IntegrationStub
          icon="📘"
          title="Meta Ads (Facebook + Instagram)"
          description="Spend, conversions, CTR por campanha + creative performance"
          steps={[
            'business.facebook.com → Business settings → System Users → criar admin',
            'Gerar long-lived access token (sem expiração) pro system user',
            'Adicionar ad account assets — grant System User com Ad Account Manage role',
            'Anotar ad_account_id (act_xxxxxxxxxxxxx)',
            'Me passa token + ad_account_id',
          ]}
          envVars={['META_ACCESS_TOKEN', 'META_AD_ACCOUNT_ID']}
          ctaLabel="Abrir Meta Business"
          ctaHref="https://business.facebook.com"
        />

        <IntegrationStub
          icon="🍎"
          title="Apple Search Ads"
          description="Keyword spend, CPI, CPA, conversion rate por campanha (App Store)"
          steps={[
            'searchads.apple.com → Settings → Account access → API → Create',
            'Criar par Public + Private key (RS256) — baixar ambos',
            'Anotar org_id (canto superior direito do dashboard)',
            'Me passa private key + org_id — deploy edge fn asa-fetch',
          ]}
          envVars={['ASA_ORG_ID', 'ASA_KEY_ID', 'ASA_TEAM_ID', 'ASA_PRIVATE_KEY']}
          ctaLabel="Abrir Search Ads"
          ctaHref="https://app.searchads.apple.com"
        />

        <IntegrationStub
          icon="🎵"
          title="TikTok Ads"
          description="Spend, CPI, install attribution por campanha"
          steps={[
            'business.tiktok.com → Tools → For Developers → criar app',
            'Configurar OAuth — pegar App ID + Secret',
            'Rodar OAuth flow uma vez pra pegar long-lived access token',
            'Anotar advertiser_id da URL do Ads Manager',
            'Me passa app_id + secret + access_token + advertiser_id',
          ]}
          envVars={[
            'TIKTOK_APP_ID',
            'TIKTOK_APP_SECRET',
            'TIKTOK_ACCESS_TOKEN',
            'TIKTOK_ADVERTISER_ID',
          ]}
          ctaLabel="Abrir TikTok Business"
          ctaHref="https://business.tiktok.com"
        />
      </div>
    </div>
  );
}
