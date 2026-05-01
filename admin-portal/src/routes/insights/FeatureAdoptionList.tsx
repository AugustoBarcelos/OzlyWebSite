import { Card, Text, Title } from '@tremor/react';
import { formatNumber } from '@/lib/format';

export interface FeatureAdoption {
  feature: string;
  users_used: number;
  pct: number;
}

interface Props {
  features: FeatureAdoption[] | null;
  activeUsers: number;
  loading?: boolean;
}

const FEATURE_LABELS: Record<string, string> = {
  jobs: '💼 Jobs',
  invoices: '🧾 Invoices',
  expenses: '💸 Expenses',
  contractors: '👤 Contractors',
  calendar: '📅 Calendar sync',
  exports: '📁 Exports',
  settings: '⚙️ Settings/perfil',
};

export function FeatureAdoptionList({ features, activeUsers, loading }: Props) {
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <Title>Adoção por feature</Title>
        <Text className="text-xs text-navy-400">
          base: {formatNumber(activeUsers)} active users
        </Text>
      </div>
      <Text className="mt-1 text-xs text-navy-300">
        % dos active users (≥1 session) que tocaram cada feature no período
      </Text>

      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 rounded bg-navy-50/60 animate-pulse" />
          ))}
        </div>
      ) : !features || features.length === 0 ? (
        <div className="mt-4 flex h-32 items-center justify-center rounded-md border border-dashed border-navy-100 bg-navy-50/30 text-sm text-navy-300">
          Sem dados
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {features.map((f) => {
            const pct = Math.max(0, Math.min(100, f.pct));
            const tone =
              pct >= 50 ? 'bg-emerald-400' : pct >= 20 ? 'bg-amber-400' : 'bg-rose-400';
            return (
              <li key={f.feature} className="flex items-center gap-3 text-sm">
                <span className="w-32 truncate text-navy-700">
                  {FEATURE_LABELS[f.feature] ?? f.feature}
                </span>
                <div className="relative h-6 flex-1 overflow-hidden rounded bg-navy-50">
                  <div
                    className={`h-full ${tone} opacity-80`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center pl-2 text-[11px] font-medium text-navy-700">
                    {pct.toFixed(1)}%
                  </span>
                </div>
                <span className="w-16 text-right text-xs tabular-nums text-navy-500">
                  {formatNumber(f.users_used)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
