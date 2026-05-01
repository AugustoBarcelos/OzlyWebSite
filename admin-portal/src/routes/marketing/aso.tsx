import { StoresTab } from './StoresTab';
import { PageHeader } from './_PageHeader';

export function MarketingAsoPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Lojas (ASO)"
        description="App Store + Play Store — rating, reviews, versão atual, estado da listagem."
      />
      <StoresTab />
    </div>
  );
}
