import { useState } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels, Title } from '@tremor/react';
import { OverviewTab } from './OverviewTab';
import { PaidTab } from './PaidTab';
import { OrganicTab } from './OrganicTab';
import { MessagingTab } from './MessagingTab';
import { SiteTab } from '../marketing/SiteTab';
import { StoresTab } from '../marketing/StoresTab';
import { AffiliatesPage } from '../ops/affiliates';
import { GROWTH_PERIODS, useGrowthPeriod } from './period';

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
 * Filtro de período global (7d/30d/90d/12m) URL-persistido em ?period=N.
 * Tabs time-bound (Overview, Affiliates) consomem; tabs sem tempo (Paid stubs,
 * Organic/Messaging current-state, Site/Stores com periodos próprios) ignoram.
 */

const TABS = [
  { key: 'overview', label: 'Overview', usesPeriod: true },
  { key: 'paid', label: 'Paid', usesPeriod: false },
  { key: 'organic', label: 'Organic', usesPeriod: false },
  { key: 'messaging', label: 'Messaging', usesPeriod: false },
  { key: 'site', label: 'Site', usesPeriod: false },
  { key: 'stores', label: 'Stores', usesPeriod: false },
  { key: 'affiliates', label: 'Affiliates', usesPeriod: false },
] as const;

export function GrowthPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const { period, setPeriod } = useGrowthPeriod();
  const periodIdx = GROWTH_PERIODS.findIndex((p) => p.days === period);
  const currentTab = TABS[tabIndex];
  const showPicker = currentTab?.usesPeriod ?? false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Title className="!text-navy-700">Growth</Title>
          <p className="mt-0.5 text-xs text-navy-300">
            Onde os novos pagantes vêm — e quanto custou cada um. Paid · Organic ·
            Messaging · Site · Stores · Affiliates.
          </p>
        </div>

        {showPicker && (
          <TabGroup
            index={periodIdx === -1 ? 1 : periodIdx}
            onIndexChange={(i) => {
              const next = GROWTH_PERIODS[i];
              if (next) setPeriod(next.days);
            }}
          >
            <TabList variant="solid">
              {GROWTH_PERIODS.map((p) => (
                <Tab key={p.days}>{p.label}</Tab>
              ))}
            </TabList>
          </TabGroup>
        )}
      </div>

      <TabGroup index={tabIndex} onIndexChange={setTabIndex}>
        <TabList className="!border-b !border-navy-50">
          {TABS.map((t) => (
            <Tab key={t.key}>{t.label}</Tab>
          ))}
        </TabList>
        <TabPanels>
          <TabPanel>
            <div className="mt-4">
              <OverviewTab period={period} />
            </div>
          </TabPanel>
          <TabPanel>
            <div className="mt-4">
              <PaidTab />
            </div>
          </TabPanel>
          <TabPanel>
            <div className="mt-4">
              <OrganicTab />
            </div>
          </TabPanel>
          <TabPanel>
            <div className="mt-4">
              <MessagingTab />
            </div>
          </TabPanel>
          <TabPanel>
            <div className="mt-4">
              <SiteTab />
            </div>
          </TabPanel>
          <TabPanel>
            <div className="mt-4">
              <StoresTab />
            </div>
          </TabPanel>
          <TabPanel>
            <div className="mt-4">
              <AffiliatesPage />
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
