import { XIcon } from '@/components/Icons';
import {
  BONUS_PERIODS,
  formatMoneyCents,
  type BonusPeriod,
  type BonusTier,
} from './tierMath';

interface Props {
  baseCents: number;
  onBaseChange: (cents: number) => void;
  tiers: BonusTier[];
  onTiersChange: (next: BonusTier[]) => void;
  period: BonusPeriod;
  onPeriodChange: (p: BonusPeriod) => void;
  currency: string;
}

/**
 * Editor visual da estrutura de comissão tiered:
 *
 *   - Base ($)
 *   - Janela (mensal/trimestral/anual/lifetime)
 *   - Lista de tiers: { threshold, bonus_cents }
 *   - Coluna calculada: total $ por conversão (base + bonus desse tier)
 *
 * Sortado por threshold ASC. Add/remove inline. Mostra preview de quanto
 * fica o "top tier" pra rapida sanidade.
 */
export function TierEditor({
  baseCents,
  onBaseChange,
  tiers,
  onTiersChange,
  period,
  onPeriodChange,
  currency,
}: Props) {
  const sortedTiers = [...tiers].sort((a, b) => a.threshold - b.threshold);
  const topTotalCents =
    sortedTiers.length > 0
      ? baseCents + (sortedTiers[sortedTiers.length - 1]?.bonus_cents ?? 0)
      : baseCents;

  function updateTier(idx: number, patch: Partial<BonusTier>) {
    const next = sortedTiers.map((t, i) => (i === idx ? { ...t, ...patch } : t));
    onTiersChange(next);
  }

  function removeTier(idx: number) {
    onTiersChange(sortedTiers.filter((_, i) => i !== idx));
  }

  function addTier() {
    const lastTh = sortedTiers[sortedTiers.length - 1]?.threshold ?? 0;
    onTiersChange([
      ...sortedTiers,
      { threshold: lastTh + 50, bonus_cents: 0 },
    ]);
  }

  return (
    <div className="space-y-3">
      {/* Base + period */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-navy-600">Comissão base</span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-navy-400">
              $
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={(baseCents / 100).toFixed(2)}
              onChange={(e) => onBaseChange(Math.round(Number(e.target.value) * 100))}
              className="w-full rounded-md border border-navy-100 bg-white py-2 pl-7 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <span className="text-[11px] text-navy-300">
            Sempre paga por conversão
          </span>
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-navy-600">Janela do bonus</span>
          <select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as BonusPeriod)}
            className="w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {BONUS_PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-navy-300">
            Quando o counter de conversões reseta
          </span>
        </label>
      </div>

      {/* Tiers table */}
      <div className="rounded-md border border-navy-100 bg-navy-50/30">
        <div className="grid grid-cols-12 gap-2 border-b border-navy-100 bg-navy-50/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-navy-500">
          <span className="col-span-3">Quando</span>
          <span className="col-span-3">Bonus por conv</span>
          <span className="col-span-4">Total / conv</span>
          <span className="col-span-2"></span>
        </div>

        {sortedTiers.length === 0 && (
          <div className="px-3 py-4 text-center text-xs text-navy-400">
            Sem tiers ainda. Click <strong>+ Adicionar tier</strong> abaixo.
          </div>
        )}

        {sortedTiers.map((t, idx) => {
          const total = baseCents + t.bonus_cents;
          return (
            <div
              key={idx}
              className="grid grid-cols-12 items-center gap-2 border-b border-navy-50 px-3 py-2 text-xs last:border-0"
            >
              <div className="col-span-3 flex items-center gap-1">
                <span className="text-navy-400">≥</span>
                <input
                  type="number"
                  min={1}
                  value={t.threshold}
                  onChange={(e) =>
                    updateTier(idx, { threshold: Math.max(1, Number(e.target.value)) })
                  }
                  className="w-full rounded border border-navy-100 bg-white px-2 py-1 text-xs"
                />
                <span className="text-[10px] text-navy-400">conv</span>
              </div>
              <div className="col-span-3 flex items-center gap-1">
                <span className="text-navy-400">+$</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={(t.bonus_cents / 100).toFixed(2)}
                  onChange={(e) =>
                    updateTier(idx, {
                      bonus_cents: Math.max(0, Math.round(Number(e.target.value) * 100)),
                    })
                  }
                  className="w-full rounded border border-navy-100 bg-white px-2 py-1 text-xs"
                />
              </div>
              <div className="col-span-4 font-medium tabular-nums text-navy-700">
                {formatMoneyCents(total, currency)}
                <span className="ml-1 text-[10px] text-navy-300">
                  ({formatMoneyCents(baseCents, currency)} + {formatMoneyCents(t.bonus_cents, currency)})
                </span>
              </div>
              <div className="col-span-2 text-right">
                <button
                  type="button"
                  onClick={() => removeTier(idx)}
                  aria-label="Remover tier"
                  className="rounded p-1 text-rose-500 hover:bg-rose-50"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        <div className="px-3 py-2">
          <button
            type="button"
            onClick={addTier}
            className="rounded-md border border-dashed border-navy-200 bg-white px-2.5 py-1 text-[11px] font-medium text-navy-500 hover:border-brand-300 hover:text-brand-700"
          >
            + Adicionar tier
          </button>
        </div>
      </div>

      {/* Top tier preview */}
      {sortedTiers.length > 0 && (
        <div className="rounded-md bg-emerald-50/60 px-3 py-2 text-xs text-emerald-800">
          🎯 No top tier (≥{sortedTiers[sortedTiers.length - 1]?.threshold} conv) o
          afiliado ganha <strong>{formatMoneyCents(topTotalCents, currency)}</strong> por conversão
          {topTotalCents !== 1500 && (
            <span className="ml-1 text-emerald-700">
              · default sugerido é {currency} 15.00
            </span>
          )}
        </div>
      )}
    </div>
  );
}
