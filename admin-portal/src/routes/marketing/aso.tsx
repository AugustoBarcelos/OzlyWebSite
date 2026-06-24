import { StoresTab } from './StoresTab';
import { PageHeader } from './_PageHeader';

export function MarketingAsoPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Lojas (ASO)"
        description="Apple App Store e Google Play SEPARADOS — installs por loja, rating, reviews, versão atual e usuários por versão."
      />
      <StoresTab />
    </div>
  );
}
