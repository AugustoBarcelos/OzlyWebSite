import { OrganicTab } from '../growth/OrganicTab';
import { PageHeader } from './_PageHeader';

export function MarketingChannelsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Canais Orgânicos"
        description="Métricas dos perfis sociais e canais próprios — followers, alcance, engajamento."
      />
      <OrganicTab />
    </div>
  );
}
