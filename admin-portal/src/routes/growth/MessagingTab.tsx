import { ResendCard } from '../marketing/ResendCard';
import { IntegrationStub } from '../marketing/PlaceholderCard';

/**
 * Messaging — todos os canais 1:1 outbound num lugar só.
 *
 *   📧 Resend (Email)            — wired (broadcasts + transactional)
 *   💬 WhatsApp Cloud API        — pending (Business Verification em curso)
 *   📱 SMS / Twilio              — future (caso valha pena pro fluxo de Aussie)
 *
 * A intenção é "quanto chega? quanto abre? quanto responde?" — pra decidir
 * por qual canal mandar cada tipo de mensagem (welcome, trial-expiring,
 * invoice, reactivation).
 */
export function MessagingTab() {
  return (
    <div className="space-y-3">
      <ResendCard />

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

      <IntegrationStub
        icon="📱"
        title="SMS (Twilio)"
        description="Fallback pra usuários que não respondem email/WhatsApp — mais caro, opt-in obrigatório por compliance AU (Spam Act 2003)"
        steps={[
          'twilio.com → Console → criar conta + verificar domínio do remetente',
          'Comprar número AU (~$1/mês) ou usar Sender ID alfa (não permite respostas)',
          'Criar Messaging Service e linkar o número',
          'Gerar API Key (não use Account SID/Auth Token direto em prod)',
          'Submeter pro 10DLC se for mandar pra US, ou Sender ID review pra outros países',
          'Me passa account_sid + api_key + messaging_service_sid',
        ]}
        envVars={[
          'TWILIO_ACCOUNT_SID',
          'TWILIO_API_KEY_SID',
          'TWILIO_API_KEY_SECRET',
          'TWILIO_MESSAGING_SERVICE_SID',
        ]}
        ctaLabel="Abrir Twilio Console"
        ctaHref="https://console.twilio.com"
      />
    </div>
  );
}
