import { IntegrationStub } from '../marketing/PlaceholderCard';
import { PageHeader } from '../marketing/_PageHeader';

export function MessagingWhatsAppPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp"
        description="WhatsApp Cloud API — alta taxa de abertura (~80%), ideal para trial-expiring, welcome e reactivation."
      />
      <IntegrationStub
        icon="💬"
        title="WhatsApp Cloud API"
        description="Mensagens automatizadas via Meta WhatsApp Business Platform — alta taxa de abertura (~80%), ideal pra trial-expiring, welcome e reactivation"
        steps={[
          'business.facebook.com → criar WABA (WhatsApp Business Account) dentro do Business Manager',
          'Adicionar número de telefone dedicado — virtual (~$10/ano) ou portar. NÃO pode ser número com WhatsApp pessoal/business app',
          'Iniciar Business Verification — Meta pede docs do CNPJ/ABN, leva 3-14 dias de review',
          'Após verificação: System Users → criar admin → gerar Permanent Access Token com scopes whatsapp_business_messaging + whatsapp_business_management',
          'Anotar Phone Number ID + Business Account ID (Meta Business Suite → WhatsApp Manager)',
          'Submeter templates de mensagem pra approval (24-48h Meta review): trial_expiring_v1, welcome_v1, invoice_ready_v1',
          'Me passa token + phone_number_id + business_account_id — deploy edge fn wa-send + webhook wa-receive',
        ]}
        envVars={[
          'WA_ACCESS_TOKEN',
          'WA_PHONE_NUMBER_ID',
          'WA_BUSINESS_ACCOUNT_ID',
          'WA_VERIFY_TOKEN',
          'WA_APP_SECRET',
        ]}
        ctaLabel="Abrir WhatsApp Manager"
        ctaHref="https://business.facebook.com/wa/manage"
      />
    </div>
  );
}
