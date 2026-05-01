import { PageHeader } from '../marketing/_PageHeader';
import { ADS_PLATFORMS } from './_configs';
import { PaidChannelView } from './PaidChannelView';

export function AppleSearchAdsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Apple Search Ads"
        description="App Store search. Keyword spend, CPI, CPA, conversion rate por campanha."
      />
      <PaidChannelView channel="paid_asa" stubProps={ADS_PLATFORMS.asa} />
    </div>
  );
}
