import { PageHeader } from '../marketing/_PageHeader';
import { ADS_PLATFORMS } from './_configs';
import { PaidChannelView } from './PaidChannelView';

export function MetaAdsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Meta Ads"
        description="Facebook + Instagram. Spend, conversions, CTR por campanha + creative performance."
      />
      <PaidChannelView channel="paid_meta" stubProps={ADS_PLATFORMS.meta} />
    </div>
  );
}
