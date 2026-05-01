import { PageHeader } from '../marketing/_PageHeader';
import { ADS_PLATFORMS } from './_configs';
import { PaidChannelView } from './PaidChannelView';

export function TikTokAdsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="TikTok Ads"
        description="Spend, CPI, install attribution por campanha."
      />
      <PaidChannelView channel="paid_tiktok" stubProps={ADS_PLATFORMS.tiktok} />
    </div>
  );
}
