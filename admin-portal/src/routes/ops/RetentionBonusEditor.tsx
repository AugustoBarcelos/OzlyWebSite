import {
  formatMoneyCents,
  maxLifetimePayoutCents,
  type RetentionBonus,
} from './tierMath';

interface Props {
  baseCents: number;
  retention: RetentionBonus[];
  onChange: (next: RetentionBonus[]) => void;
  currency: string;
}

const MILESTONES: ReadonlyArray<{ months: 3 | 6 | 12; label: string }> = [
  { months: 3,  label: '3 meses' },
  { months: 6,  label: '6 meses' },
  { months: 12, label: '12 meses' },
];

/**
 * Retention Bonus Editor — pagos POR USER que mantém assinatura X meses.
 *
 * Mostra o total max payable por user (base + soma dos retention bonuses)
 * pra deixar claro que o cap é, p.ex., $25 sobre 1 ano.
 *
 * Cada milestone só pode ser pago UMA VEZ por user (gerenciado pela tabela
 * affiliate_milestone_payouts via cron — Phase 2).
 */
export function RetentionBonusEditor({
  baseCents,
  retention,
  onChange,
  currency,
}: Props) {
  function setMilestone(months: 3 | 6 | 12, cents: number) {
    const filtered = retention.filter((r) => r.months !== months);
    if (cents > 0) {
      onChange([...filtered, { months, bonus_cents: cents }].sort(
        (a, b) => a.months - b.months,
      ));
    } else {
      onChange(filtered);
    }
  }

  function getCents(months: 3 | 6 | 12): number {
    return retention.find((r) => r.months === months)?.bonus_cents ?? 0;
  }

  const max = maxLifetimePayoutCents(baseCents, retention);

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-navy-100 bg-navy-50/30">
        <div className="grid grid-cols-12 gap-2 border-b border-navy-100 bg-navy-50/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-navy-500">
          <span className="col-span-4">User retido por</span>
          <span className="col-span-4">Bonus pago</span>
          <span className="col-span-4">Total acumulado / user</span>
        </div>

        {MILESTONES.map(({ months, label }, idx) => {
          const cents = getCents(months);
          // Acumulado: base + retentions de até esse milestone
          const cumulative =
            baseCents +
            MILESTONES.slice(0, idx + 1).reduce(
              (sum, m) => sum + getCents(m.months),
              0,
            );
          return (
            <div
              key={months}
              className="grid grid-cols-12 items-center gap-2 border-b border-navy-50 px-3 py-2 text-xs last:border-0"
            >
              <div className="col-span-4 flex items-center gap-2">
                <span className="font-mono text-sm text-navy-600">{label}</span>
                <span className="text-[10px] text-navy-300">após signup</span>
              </div>
              <div className="col-span-4 flex items-center gap-1">
                <span className="text-navy-400">+$</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={(cents / 100).toFixed(2)}
                  onChange={(e) =>
                    setMilestone(months, Math.max(0, Math.round(Number(e.target.value) * 100)))
                  }
                  className="w-full rounded border border-navy-100 bg-white px-2 py-1 text-xs"
                />
              </div>
              <div className="col-span-4 font-medium tabular-nums text-emerald-700">
                {formatMoneyCents(cumulative, currency)}
                <span className="ml-1 text-[10px] text-navy-300">
                  (base + retenções até aqui)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-md bg-amber-50/60 px-3 py-2 text-xs text-amber-800">
        🎯 User que fica 12 meses paga{' '}
        <strong>{formatMoneyCents(max, currency)}</strong> total ao afiliado
        (base + 3 milestones). Se cliente churna antes, paga só até onde chegou.
      </div>

      <div className="rounded-md bg-emerald-50/60 px-3 py-2 text-[11px] text-emerald-700">
        ✅ <strong>Cron ativo</strong> — diário 03:00 UTC, detecta milestones
        automaticamente e cria payout entry. Você só precisa transferir o valor
        e marcar como pago no detail do afiliado.
      </div>
    </div>
  );
}
