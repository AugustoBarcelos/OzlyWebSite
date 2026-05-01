import { Card, Text, Title } from '@tremor/react';
import { formatNumber } from '@/lib/format';

export interface TopAction {
  event_name: string;
  count: number;
  distinct_users: number;
}

interface Props {
  actions: TopAction[] | null;
  loading?: boolean;
}

const NICE_NAMES: Record<string, string> = {
  job_created: '➕ Job criado',
  job_updated: '✏️ Job editado',
  job_completed: '✅ Job concluído',
  job_cancelled: '✗ Job cancelado',
  job_deleted: '🗑️ Job apagado',
  invoice_created: '🧾 Invoice criada',
  invoice_sent: '📤 Invoice enviada',
  invoice_marked_paid: '💰 Invoice marcada paga',
  invoice_deleted: '🗑️ Invoice apagada',
  invoice_exported: '📄 Invoice exportada',
  expense_added: '💸 Expense adicionada',
  expense_deleted: '🗑️ Expense apagada',
  expense_filtered: '🔍 Expenses filtradas',
  expenses_exported: '📊 Expenses exportadas',
  contractor_created: '👤 Contractor criado',
  contractor_updated: '✏️ Contractor editado',
  contractor_deleted: '🗑️ Contractor apagado',
  calendar_synced: '📅 Calendar sync',
  profile_updated: '👤 Perfil editado',
  setting_changed: '⚙️ Setting mudada',
  password_reset: '🔐 Senha reset',
  signup: '✨ Signup',
  login: '🔑 Login',
  account_deleted: '❌ Conta deletada',
  dashboard_exported: '📊 Dashboard exportado',
  fiscal_year_exported: '📁 Ano fiscal exportado',
  all_invoices_exported: '📁 Invoices todas exportadas',
  error: '🐛 Erro',
  warning: '⚠️ Aviso',
};

function pretty(name: string): string {
  return NICE_NAMES[name] ?? name;
}

export function TopActionsList({ actions, loading }: Props) {
  return (
    <Card>
      <Title>Top ações</Title>
      <Text className="mt-1 text-xs text-navy-300">
        O que os users mais fazem · sem `screen_view` e `session_*`
      </Text>

      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 rounded bg-navy-50/60 animate-pulse" />
          ))}
        </div>
      ) : !actions || actions.length === 0 ? (
        <div className="mt-4 flex h-32 items-center justify-center rounded-md border border-dashed border-navy-100 bg-navy-50/30 text-sm text-navy-300">
          Sem eventos no período
        </div>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {actions.map((a) => {
            const top = actions[0]?.count ?? 0;
            const pct = top > 0 ? (a.count / top) * 100 : 0;
            return (
              <li key={a.event_name} className="flex items-center gap-2 text-sm">
                <span className="w-44 truncate text-navy-700">{pretty(a.event_name)}</span>
                <div className="relative h-5 flex-1 overflow-hidden rounded bg-navy-50">
                  <div
                    className="h-full bg-brand-400/70"
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                <span className="w-16 text-right text-xs tabular-nums text-navy-700">
                  {formatNumber(a.count)}
                </span>
                <span
                  className="w-12 text-right text-[10px] text-navy-400"
                  title={`${a.distinct_users} usuários únicos`}
                >
                  {formatNumber(a.distinct_users)}u
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
