import { useEffect, useState } from 'react';
import { IntegrationStub } from '../marketing/PlaceholderCard';
import { PageHeader } from '../marketing/_PageHeader';
import { InboxView } from './_InboxView';
import { callRpc } from '@/lib/rpc';

interface SecretRow {
  integration_id: string;
  key_name: string;
}

const REQUIRED_KEYS = ['app_id', 'app_secret', 'page_access_token', 'fb_page_id', 'webhook_verify_token'] as const;

export function MessagingMessengerPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    void callRpc<{ rows: SecretRow[] }>('admin_integration_secrets_list', {})
      .then((res) => {
        const meta = (res.rows ?? []).filter((r) => r.integration_id === 'meta_app');
        const have = new Set(meta.map((r) => r.key_name));
        setConfigured(REQUIRED_KEYS.every((k) => have.has(k)));
      })
      .catch(() => setConfigured(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messenger"
        description="Inbox Facebook Page (Messenger Platform). Janela de 24h pra texto livre; fora disso requer Message Tag."
      />
      {configured === null ? (
        <div className="rounded-lg border border-navy-100 bg-white p-6 text-sm text-navy-500">
          Verificando configuração…
        </div>
      ) : configured ? (
        <InboxView channel="messenger" emptyHint="Nenhuma conversa ainda — aguardando primeiro inbound." />
      ) : (
        <IntegrationStub
          icon="📨"
          title="Messenger — configurar credenciais"
          description="Vá em Settings → Integrations → Meta App pra colar App ID + Secret + Page Access Token + FB Page ID + Webhook Verify Token."
          steps={[
            'developers.facebook.com → criar app Business com use case "Gerenciar tudo na sua Página" + "Interagir no Messenger"',
            'Settings → Basic → copiar App ID + App Secret',
            'Graph API Explorer → Get Token → Page Access Token (Ozly Page) com scopes pages_messaging, pages_manage_posts, pages_read_engagement → trocar por long-lived (60d)',
            'About da FB Page → Page transparency → copiar Page ID',
            'Configurar webhook no app Meta: URL = https://<seu-projeto>.supabase.co/functions/v1/messenger-webhook · Verify Token = string aleatória que você define · Subscribe ao field "messages" da Page',
            'Settings → Integrations → Meta App → cole tudo: App ID, App Secret, Page Access Token, Page ID, Verify Token',
            'App Review (Meta): solicitar pages_messaging Advanced Access — screencast 60s mostrando uso. Aprovação 2-7 dias',
          ]}
          envVars={[
            'meta_app.app_id',
            'meta_app.app_secret',
            'meta_app.page_access_token',
            'meta_app.fb_page_id',
            'meta_app.webhook_verify_token',
          ]}
          ctaLabel="Abrir Meta for Developers"
          ctaHref="https://developers.facebook.com/apps"
        />
      )}
    </div>
  );
}
