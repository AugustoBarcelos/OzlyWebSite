import { useState } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels, Title } from '@tremor/react';
import { ErrorsPage } from '../errors';
import { TechTab } from '../dashboard/TechTab';
import { useDashboardData } from '../dashboard/useDashboardData';
import { PERIODS, type Period } from '../dashboard/types';

/**
 * Reliability — "is the app working?"
 *
 * Merges the previous /errors (Sentry wrapper) with the previously-orphaned
 * Dashboard → Tech tab (DAU, error rate, DB health, top errors). One place
 * to triage incidents instead of bouncing between two screens.
 */

export function ReliabilityPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [period, setPeriod] = useState<Period>(30);
  const { data, loading } = useDashboardData(period);

  const periodIndex = PERIODS.findIndex((p) => p.days === period);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Title className="!text-navy-700">Reliability</Title>
          <p className="mt-0.5 text-xs text-navy-300">
            Errors · Tech health — uma só fonte de verdade pra triagem de incidentes.
          </p>
        </div>

        {tabIndex === 1 && (
          <TabGroup
            index={periodIndex === -1 ? 1 : periodIndex}
            onIndexChange={(i) => {
              const next = PERIODS[i];
              if (next) setPeriod(next.days);
            }}
          >
            <TabList variant="solid">
              {PERIODS.map((p) => (
                <Tab key={p.days}>{p.label}</Tab>
              ))}
            </TabList>
          </TabGroup>
        )}
      </div>

      <TabGroup index={tabIndex} onIndexChange={setTabIndex}>
        <TabList className="!border-b !border-navy-50">
          <Tab>Errors</Tab>
          <Tab>Tech</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <div className="mt-4">
              <ErrorsPage />
            </div>
          </TabPanel>
          <TabPanel>
            <div className="mt-4">
              <TechTab data={data} loading={loading} period={period} />
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
