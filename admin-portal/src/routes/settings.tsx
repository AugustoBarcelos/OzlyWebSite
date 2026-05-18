import { useEffect, useState } from 'react';
import { Card, Title, Text } from '@tremor/react';
import { RpcError } from '@/lib/rpc';
import { usePreferences, type Preferences } from '@/lib/preferences';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/lib/auth';

const TIMEZONES = [
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Perth',
  'Australia/Adelaide',
  'America/Sao_Paulo',
  'America/New_York',
  'Europe/London',
  'UTC',
] as const;

const PERIODS = [1, 7, 30, 90, 365] as const;

/**
 * /settings — preferências do admin (persistidas em admin_preferences via RPCs).
 *
 * Hoje:
 *   - Timezone (afeta formatação de datas no portal)
 *   - Default period pra cards de KPI (Growth, Dashboard)
 *   - Currency display
 *   - Email pra notificações
 */
export function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { prefs: globalPrefs, loading, update: persist } = usePreferences();

  const [prefs, setPrefs] = useState<Preferences>(globalPrefs);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setPrefs(globalPrefs);
  }, [globalPrefs]);

  async function save() {
    setSaving(true);
    try {
      await persist(prefs);
      setDirty(false);
      toast({
        variant: 'success',
        title: 'Preferências salvas',
      });
    } catch (e) {
      toast({
        variant: 'error',
        title: 'Falha ao salvar',
        description: e instanceof RpcError ? e.message : 'Unknown',
      });
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPrefs((p) => ({ ...p, [key]: value }));
    setDirty(true);
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-navy-700">Settings</h1>
        <p className="mt-0.5 text-sm text-navy-400">
          Preferências aplicadas a todo o portal pra você
          ({user?.email ?? '—'}).
        </p>
      </header>

      {loading ? (
        <Card>
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-navy-400">
            <Spinner size="sm" />
            Carregando...
          </div>
        </Card>
      ) : (
        <>
          {/* Timezone */}
          <Card>
            <Title className="!text-base">🌏 Timezone</Title>
            <Text className="mt-0.5 text-xs text-navy-300">
              Datas e horários são formatados nesse fuso. Afeta tabelas, audit
              log, etc.
            </Text>
            <div className="mt-3 max-w-md">
              <select
                value={prefs.timezone ?? 'Australia/Sydney'}
                onChange={(e) => update('timezone', e.target.value)}
                className="w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz} ({new Date().toLocaleTimeString('en-AU', { timeZone: tz, timeStyle: 'short' })})
                  </option>
                ))}
              </select>
            </div>
          </Card>

          {/* Default period */}
          <Card>
            <Title className="!text-base">📅 Default period</Title>
            <Text className="mt-0.5 text-xs text-navy-300">
              Período inicial nos cards de KPI (Growth, Dashboard).
            </Text>
            <div className="mt-3 inline-flex gap-1.5">
              {PERIODS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => update('default_period_days', d)}
                  className={
                    prefs.default_period_days === d
                      ? 'rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white'
                      : 'rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700'
                  }
                >
                  {d === 1 ? '24h' : d === 365 ? '12m' : `${d}d`}
                </button>
              ))}
            </div>
          </Card>

          {/* Currency display */}
          <Card>
            <Title className="!text-base">💰 Currency display</Title>
            <Text className="mt-0.5 text-xs text-navy-300">
              Moeda preferida em totais agregados (já que afiliados podem ter
              moedas diferentes, isso é só pra display).
            </Text>
            <div className="mt-3 inline-flex gap-1.5">
              {(['AUD', 'BRL', 'USD'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => update('currency_display', c)}
                  className={
                    prefs.currency_display === c
                      ? 'rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white'
                      : 'rounded-md border border-navy-100 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:border-brand-300 hover:text-brand-700'
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          </Card>

          {/* Notification email */}
          <Card>
            <Title className="!text-base">📧 Email de notificações</Title>
            <Text className="mt-0.5 text-xs text-navy-300">
              Email pra receber alertas (ações de risco alto, falhas de
              webhook, etc.). Default: o email da sua conta admin.
            </Text>
            <div className="mt-3 max-w-md">
              <input
                type="email"
                placeholder={user?.email ?? 'admin@example.com'}
                value={prefs.notification_email ?? ''}
                onChange={(e) => update('notification_email', e.target.value)}
                className="w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </Card>

          {/* Save bar */}
          <div className="sticky bottom-3 flex items-center justify-end gap-2 rounded-md border border-navy-100 bg-white p-2.5 shadow-sm">
            {!dirty && !saving && (
              <span className="text-xs text-navy-400">Tudo salvo ✓</span>
            )}
            {dirty && (
              <span className="text-xs text-amber-700">
                Mudanças não salvas
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                void save();
              }}
              disabled={!dirty || saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {saving && <Spinner size="sm" />}
              Salvar
            </button>
          </div>

          <div className="rounded-md bg-navy-50/60 px-3 py-2 text-[11px] text-navy-500">
            ⚙️ Phase 2 (futuro): consumir essas preferências em todos os
            componentes (date formatting, period selectors, currency totals).
            Hoje fica salvo, próximo passo é aplicar.
          </div>
        </>
      )}
    </section>
  );
}
