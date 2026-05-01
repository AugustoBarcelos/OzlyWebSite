import { useState } from 'react';
import { ResendCard } from '../marketing/ResendCard';
import { PageHeader } from '../marketing/_PageHeader';
import { BroadcastComposer } from './BroadcastComposer';
import { BroadcastsTable } from './BroadcastsTable';

export function MessagingEmailPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email"
        description="Resend — broadcasts segmentados + transacional. Domínios verificados, opens, clicks, bounces."
      />
      <ResendCard />
      <BroadcastComposer
        channel="msg_email"
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
      <BroadcastsTable channel="msg_email" refreshKey={refreshKey} />
    </div>
  );
}
