import { SiteTab } from './SiteTab';
import { PageHeader } from './_PageHeader';

export function MarketingSeoPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="SEO & Site"
        description="GA4 + Search Console — tráfego do site, top páginas, queries orgânicas."
      />
      <SiteTab />
    </div>
  );
}
