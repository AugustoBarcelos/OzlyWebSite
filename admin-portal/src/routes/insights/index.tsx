import { useState } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels, Title } from '@tremor/react';
import { OverviewTab } from '../growth/OverviewTab';
import { UserActivityTab } from './UserActivityTab';
import { GROWTH_PERIODS, useGrowthPeriod } from '../growth/period';

/**
 * /insights — Crescimento + Atividade.
 *
 * Dois tabs:
 *  1. Overview      — KPIs blended (GA4 + revenue + signup) · aquisição
 *  2. User Activity — funnel + top actions + heatmap + feature adoption +
 *                     time-to-activation + retention · uso real do app
 *
 * Período é global (URL: ?period=N). 7 / 30 / 90 / 365 dias.
 */
export function InsightsPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const { period, setPeriod } = useGrowthPeriod();
  const periodIdx = GROWTH_PERIODS.findIndex((p) => p.days === period);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Title className="!text-navy-700">Crescimento</Title>
          <p className="mt-0.5 text-xs text-navy-300">
            Aquisição (Overview) e uso real do app (User Activity) — agregado e
            anônimo, direto do <code>app_events</code>.
          </p>
        </div>

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
      </div>

      <TabGroup index={tabIndex} onIndexChange={setTabIndex}>
        <TabList className="!border-b !border-navy-50">
          <Tab>Overview</Tab>
          <Tab>User Activity</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <div className="mt-4">
              <OverviewTab period={period} />
            </div>
          </TabPanel>
          <TabPanel>
            <div className="mt-4">
              <UserActivityTab period={period} />
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
