import { useEffect, useState } from 'react';
import { callRpc, RpcError } from '@/lib/rpc';
import { callEdge } from '@/lib/edge';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/Spinner';
import { XIcon } from '@/components/Icons';
import { TierEditor } from './TierEditor';
import {
  DEFAULT_BASE_CENTS,
  DEFAULT_TIERS,
  type BonusPeriod,
  type BonusTier,
} from './tierMath';

const CURRENCIES = ['AUD', 'BRL', 'USD'] as const;
type Currency = (typeof CURRENCIES)[number];

/**
 * Affiliate modal — modo create OU edit.
 *
 * Em edit mode, `editing` é o affiliate atual; código fica readonly (imutável
 * por design pra preservar histórico de conversions). Tier rules,
 * commission, dados de contato, status: tudo editável.
 */

export interface AffiliateLike {
  id: string;
  code: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
  pay_id: string | null;
  commission_cents: number | null;
  currency: string;
  notes: string | null;
  active: boolean;
  bonus_tiers?: BonusTier[];
  bonus_period?: BonusPeriod;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Se passado, modal abre em edit mode pra esse afiliado. */
  editing?: AffiliateLike | null;
}

export function CreateAffiliateModal({ open, onClose, onSaved, editing }: Props) {
  const { toast } = useToast();
  const isEdit = !!editing;
  const [submitting, setSubmitting] = useState(false);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [payId, setPayId] = useState('');
  const [currency, setCurrency] = useState<Currency>('AUD');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);

  const [baseCents, setBaseCents] = useState<number>(DEFAULT_BASE_CENTS);
  const [bonusTiers, setBonusTiers] = useState<BonusTier[]>(DEFAULT_TIERS);
  const [bonusPeriod, setBonusPeriod] = useState<BonusPeriod>('monthly');

  // Reset/load when opening modal or switching editing target.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setCode(editing.code);
      setName(editing.name ?? '');
      setEmail(editing.email ?? '');
      setPhone(editing.phone ?? '');
      setPayId(editing.pay_id ?? '');
      setCurrency((['AUD', 'BRL', 'USD'].includes(editing.currency)
        ? editing.currency
        : 'AUD') as Currency);
      setNotes(editing.notes ?? '');
      setActive(editing.active);
      setBaseCents(editing.commission_cents ?? DEFAULT_BASE_CENTS);
      setBonusTiers(
        Array.isArray(editing.bonus_tiers) && editing.bonus_tiers.length > 0
          ? editing.bonus_tiers
          : DEFAULT_TIERS,
      );
      setBonusPeriod(editing.bonus_period ?? 'monthly');
    } else {
      setCode('');
      setName('');
      setEmail('');
      setPhone('');
      setPayId('');
      setCurrency('AUD');
      setNotes('');
      setActive(true);
      setBaseCents(DEFAULT_BASE_CENTS);
      setBonusTiers(DEFAULT_TIERS);
      setBonusPeriod('monthly');
    }
  }, [open, editing]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!isEdit) {
      const codeClean = code.trim().toUpperCase();
      if (!/^[A-Z0-9_-]{3,32}$/.test(codeClean)) {
        toast({
          variant: 'error',
          title: 'Código inválido',
          description: '3-32 caracteres, apenas letras, números, _ ou -',
        });
        return;
      }
    }
    if (!name.trim()) {
      toast({ variant: 'error', title: 'Nome é obrigatório' });
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && editing) {
        await callRpc<{ success: boolean }>('admin_update_affiliate', {
          p_id: editing.id,
          p_name: name.trim(),
          p_email: email.trim() || null,
          p_phone: phone.trim() || null,
          p_pay_id: payId.trim() || null,
          p_commission_cents: baseCents,
          p_currency: currency,
          p_active: active,
          p_notes: notes.trim() || null,
          p_bonus_tiers: bonusTiers,
          p_bonus_period: bonusPeriod,
        });
        toast({
          variant: 'success',
          title: `Afiliado ${editing.code} atualizado`,
        });
      } else {
        const codeClean = code.trim().toUpperCase();
        const created = await callRpc<{
          success: boolean;
          affiliate_id: string;
          code: string;
        }>('admin_create_affiliate', {
          p_code: codeClean,
          p_name: name.trim(),
          p_email: email.trim() || null,
          p_phone: phone.trim() || null,
          p_pay_id: payId.trim() || null,
          p_commission_cents: baseCents,
          p_currency: currency,
          p_notes: notes.trim() || null,
          p_bonus_tiers: bonusTiers,
          p_bonus_period: bonusPeriod,
        });

        const syncPromise = callEdge<{
          ok: boolean;
          project_name?: string;
          error?: string;
        }>('affiliate-sync-rc', {
          method: 'POST',
          body: { affiliate_id: created.affiliate_id },
        });

        toast({
          variant: 'success',
          title: `Afiliado ${codeClean} criado`,
          description: 'Sincronizando com RevenueCat...',
        });

        void syncPromise.then((r) => {
          if (r.ok && r.data.ok) {
            toast({
              variant: 'success',
              title: 'RC sync ✓',
              description: `Conectado ao projeto "${r.data.project_name}".`,
            });
          } else {
            const detail = r.ok
              ? r.data.error ?? 'erro desconhecido'
              : r.error ?? 'edge fn falhou';
            toast({
              variant: 'info',
              title: 'RC sync pendente',
              description: `Afiliado criado localmente. RC: ${detail}.`,
            });
          }
        });
      }

      onSaved();
      onClose();
    } catch (err) {
      const msg =
        err instanceof RpcError
          ? err.message
          : isEdit
            ? 'Falha ao atualizar afiliado'
            : 'Falha ao criar afiliado';
      toast({ variant: 'error', title: 'Erro', description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-navy-900/40"
      />

      <div className="relative z-10 my-8 w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-navy-50 px-5 py-3">
          <h2 className="text-base font-semibold text-navy-700">
            {isEdit ? `Editar afiliado · ${editing?.code}` : 'Novo afiliado'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-navy-400 hover:bg-navy-50 hover:text-navy-700"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3 p-5">
          {/* Code (only on create) */}
          {!isEdit && (
            <Field
              label="Código"
              required
              hint="MEMORÁVEL: ANALUIZA, VENDE01, JOAOQR (3-32 chars [A-Z0-9_-])"
            >
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={32}
                className="w-full rounded-md border border-navy-100 bg-white px-3 py-2 font-mono text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                placeholder="ANALUIZA"
                autoFocus
              />
            </Field>
          )}

          <Field label="Nome do afiliado" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              placeholder="Ana Luiza Silva"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                placeholder="ana@example.com"
              />
            </Field>
            <Field label="Telefone">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                placeholder="+61 4XX..."
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field
                label="PayID (AU)"
                hint="email, telefone ou ABN. Vazio se for outro país."
              >
                <input
                  type="text"
                  value={payId}
                  onChange={(e) => setPayId(e.target.value)}
                  className="w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  placeholder="email / +614… / ABN"
                />
              </Field>
            </div>
            <Field label="Moeda">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Tier editor */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-navy-600">
                Estrutura de comissão
              </span>
              <button
                type="button"
                onClick={() => {
                  setBaseCents(DEFAULT_BASE_CENTS);
                  setBonusTiers(DEFAULT_TIERS);
                  setBonusPeriod('monthly');
                }}
                className="text-[11px] text-brand-700 underline"
              >
                Restaurar default ($5 base + tiers $2/$5/$10)
              </button>
            </div>
            <TierEditor
              baseCents={baseCents}
              onBaseChange={setBaseCents}
              tiers={bonusTiers}
              onTiersChange={setBonusTiers}
              period={bonusPeriod}
              onPeriodChange={setBonusPeriod}
              currency={currency}
            />
          </div>

          {/* Notes + Active toggle (edit only) */}
          {isEdit && (
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-brand-500"
              />
              <span className="font-medium text-navy-600">
                Ativo (recebendo conversões)
              </span>
            </label>
          )}

          <Field label="Notas internas">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              placeholder="Como conheceu, contrato, vencimento..."
            />
          </Field>

          {!isEdit && (
            <div className="rounded-md bg-emerald-50/60 px-3 py-2 text-[11px] text-emerald-800">
              ✓ RevenueCat conectado. Após criar, edge fn{' '}
              <code>affiliate-sync-rc</code> verifica conexão e marca status no
              campo notes.
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-navy-50 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md border border-navy-100 bg-white px-4 py-2 text-sm font-medium text-navy-600 hover:bg-navy-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {submitting && <Spinner size="sm" />}
              {isEdit ? 'Salvar' : 'Criar afiliado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-xs font-medium text-navy-600">
        {label}
        {required && <span className="text-rose-600">*</span>}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-[11px] text-navy-300">{hint}</span>
      )}
    </label>
  );
}
