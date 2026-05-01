import { IntegrationStub } from '../marketing/PlaceholderCard';
import { PageHeader } from '../marketing/_PageHeader';

export function MessagingSmsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="SMS"
        description="Fallback para usuários que não respondem email/WhatsApp — opt-in obrigatório (Spam Act 2003)."
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
