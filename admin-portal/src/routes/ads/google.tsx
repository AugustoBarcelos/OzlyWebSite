import { PageHeader } from '../marketing/_PageHeader';
import { ADS_PLATFORMS } from './_configs';
import { PaidChannelView } from './PaidChannelView';

export function GoogleAdsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Google Ads"
        description="Search + Display + YouTube Ads. Conversões e ROAS por campanha quando a API estiver plugada."
      />
      <PaidChannelView channel="paid_google" stubProps={ADS_PLATFORMS.google} />
    </div>
  );
}
