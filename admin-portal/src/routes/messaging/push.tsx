import { useState } from 'react';
import { PageHeader } from '../marketing/_PageHeader';
import { PushComposer } from './PushComposer';
import { PushBroadcastsTable } from './PushBroadcastsTable';

export function MessagingPushPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Push"
        description="Notificações push (FCM) — manda uma mensagem pra um segmento ou pra todos com o app instalado, agenda, e vê quantos abriram. Use pra avisar 'atualize o app', novidades, lembretes."
      />
      <PushComposer onCreated={() => setRefreshKey((k) => k + 1)} />
      <PushBroadcastsTable refreshKey={refreshKey} />
    </div>
  );
}
