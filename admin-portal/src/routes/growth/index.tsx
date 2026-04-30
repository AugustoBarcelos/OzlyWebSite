import { useState } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels, Title } from '@tremor/react';
import { OverviewTab } from './OverviewTab';
import { PaidTab } from './PaidTab';
import { OrganicTab } from './OrganicTab';
import { MessagingTab } from './MessagingTab';
import { SiteTab } from '../marketing/SiteTab';
import { StoresTab } from '../marketing/StoresTab';
import { AffiliatesPage } from '../ops/affiliates';

/**
 * Growth — central única de aquisição.
 *
 * Estrutura por intenção (não por plataforma):
 *   - Overview     : KPIs blended (spend, conv, CAC, ROAS) + comparativo entre canais
 *   - Paid         : campanhas pagas multi-plataforma (Google Ads, Meta, ASA, TikTok)
 *   - Organic      : canais sociais (YT canal, IG, FB, TikTok, LinkedIn)
 *   - Messaging    : 1:1 outbound (Resend email, WhatsApp Cloud API, SMS Twilio)
 *   - Site         : GA4 + Search Console
 *   - Stores       : ASO (App Store / Play Store)
 *   - Affiliates   : programa de comissão (vendor payouts)
 *
 * Quando você decide "vou cortar campanha X", quer comparar com Y de outra
 * plataforma — então tudo paid vive junto. Quando olha "como meu YT tá indo
 * organicamente?", aí faz sentido isolar canal por canal.
 */

const TABS = [
  { key: 'overview', label: 'Overview', component: OverviewTab },
  { key: 'paid', label: 'Paid', component: PaidTab },
  { key: 'organic', label: 'Organic', component: OrganicTab },
  { key: 'messaging', label: 'Messaging', component: MessagingTab },
  { key: 'site', label: 'Site', component: SiteTab },
  { key: 'stores', label: 'Stores', component: StoresTab },
  { key: 'affiliates', label: 'Affiliates', component: AffiliatesPage },
] as const;

export function GrowthPage() {
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <div className="space-y-6">
      <div>
        <Title className="!text-navy-700">Growth</Title>
        <p className="mt-0.5 text-xs text-navy-300">
          Onde os novos pagantes vêm — e quanto custou cada um. Paid · Organic ·
          Messaging · Site · Stores · Affiliates.
        </p>
      </div>

      <TabGroup index={tabIndex} onIndexChange={setTabIndex}>
        <TabList className="!border-b !border-navy-50">
          {TABS.map((t) => (
            <Tab key={t.key}>{t.label}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {TABS.map((t) => {
            const C = t.component;
            return (
              <TabPanel key={t.key}>
                <div className="mt-4">
                  <C />
                </div>
              </TabPanel>
            );
          })}
        </TabPanels>
      </TabGroup>
    </div>
  );
}
