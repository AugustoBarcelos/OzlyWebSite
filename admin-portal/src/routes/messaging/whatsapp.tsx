import { useEffect, useState } from 'react';
import { IntegrationStub } from '../marketing/PlaceholderCard';
import { PageHeader } from '../marketing/_PageHeader';
import { InboxView } from './_InboxView';
import { callRpc } from '@/lib/rpc';

interface SecretRow {
  integration_id: string;
  key_name: string;
}

const REQUIRED_KEYS = ['access_token', 'phone_number_id', 'business_account_id', 'webhook_verify_token', 'app_secret'] as const;

export function MessagingWhatsAppPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    void callRpc<{ rows: SecretRow[] }>('admin_integration_secrets_list', {})
      .then((res) => {
        const wa = (res.rows ?? []).filter((r) => r.integration_id === 'whatsapp_business');
        const have = new Set(wa.map((r) => r.key_name));
        setConfigured(REQUIRED_KEYS.every((k) => have.has(k)));
      })
      .catch(() => setConfigured(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp"
        description="Inbox WhatsApp Cloud API + templates aprovados pra trial-expiring, welcome, support."
      />
      {configured === null ? (
        <div className="rounded-lg border border-navy-100 bg-white p-6 text-sm text-navy-500">
          Verificando configuração…
        </div>
      ) : configured ? (
        <InboxView channel="whatsapp" emptyHint="Nenhuma conversa ainda — aguardando primeiro inbound." />
      ) : (
        <IntegrationStub
          icon="💬"
          title="WhatsApp Cloud API — configurar credenciais"
          description="Vá em Settings → Integrations → WhatsApp Business pra colar Access Token + Phone Number ID + WABA ID + Verify Token."
          steps={[
            'business.facebook.com → Business Settings → criar WABA dentro do Business Manager',
            'Adicionar número de telefone dedicado — virtual ou portar. NÃO pode estar em uso no WhatsApp pessoal',
            'Iniciar Business Verification (CNPJ/ABN docs) — Meta review demora 3-7 dias',
            'System Users → criar admin → Generate Permanent Access Token (whatsapp_business_messaging + whatsapp_business_management)',
            'Configurar webhook: URL = https://<seu-projeto>.supabase.co/functions/v1/whatsapp-webhook · Verify Token = string aleatória que você define',
            'Subscrever campos: messages, message_status',
            'Settings → Integrations → WhatsApp Business → cole tudo: Access Token, Phone Number ID, WABA ID, Verify Token, App Secret',
            'Submeter templates pra approval no WA Manager: trial_expiring_v1, welcome_v1, support_reply_v1',
          ]}
          envVars={[
            'access_token (admin_integration_secrets)',
            'phone_number_id',
            'business_account_id',
            'webhook_verify_token',
            'app_secret',
          ]}
          ctaLabel="Abrir WhatsApp Manager"
          ctaHref="https://business.facebook.com/wa/manage"
        />
      )}
    </div>
  );
}
