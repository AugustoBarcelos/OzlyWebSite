import { useState } from 'react';
import { callRpc, RpcError } from '@/lib/rpc';
import { callEdge } from '@/lib/edge';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/Spinner';
import { XIcon } from '@/components/Icons';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CURRENCIES = ['AUD', 'BRL', 'USD'] as const;
type Currency = (typeof CURRENCIES)[number];

/**
 * Modal "Create affiliate".
 *
 *   - Code: 3-32 chars [A-Za-z0-9_-]. Sugere o formato MEMORÁVEL (ex: ANALUIZA),
 *     não 6-chars aleatórios — diferenciar do referral user-to-user.
 *   - Commission: em CENTAVOS na moeda escolhida. Vazio = usa default global.
 *   - Currency: AUD (Aussie subs), BRL (BR), USD (US).
 *
 * Após criar, o trigger pg_notify dispara um edge fn opcional
 * `affiliate-sync-rc` que pode provisionar offer code no RevenueCat. Sem
 * RC_API_KEY nas Supabase secrets, o sync pula silenciosamente — o afiliado
 * funciona localmente via apply_referral_code(code) no signup.
 */
export function CreateAffiliateModal({ open, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [payId, setPayId] = useState('');
  const [commissionDollars, setCommissionDollars] = useState<string>('');
  const [currency, setCurrency] = useState<Currency>('AUD');
  const [notes, setNotes] = useState('');

  if (!open) return null;

  function reset() {
    setCode('');
    setName('');
    setEmail('');
    setPhone('');
    setPayId('');
    setCommissionDollars('');
    setCurrency('AUD');
    setNotes('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const codeClean = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,32}$/.test(codeClean)) {
      toast({
        variant: 'error',
        title: 'Código inválido',
        description: '3-32 caracteres, apenas letras, números, _ ou -',
      });
      return;
    }
    if (!name.trim()) {
      toast({ variant: 'error', title: 'Nome é obrigatório' });
      return;
    }

    // Convert commission dollars → cents. Empty = null (uses global default).
    let commissionCents: number | null = null;
    if (commissionDollars.trim()) {
      const dollars = Number(commissionDollars);
      if (!Number.isFinite(dollars) || dollars < 0) {
        toast({ variant: 'error', title: 'Comissão inválida' });
        return;
      }
      commissionCents = Math.round(dollars * 100);
    }

    setSubmitting(true);
    try {
      const created = await callRpc<{ success: boolean; affiliate_id: string; code: string }>(
        'admin_create_affiliate',
        {
          p_code: codeClean,
          p_name: name.trim(),
          p_email: email.trim() || null,
          p_phone: phone.trim() || null,
          p_pay_id: payId.trim() || null,
          p_commission_cents: commissionCents,
          p_currency: currency,
          p_notes: notes.trim() || null,
        },
      );

      // Fire-and-forget RC sync. Não bloqueia UI — modal fecha imediatamente
      // e a notificação do resultado vem por toast separado.
      const syncPromise = callEdge<{ ok: boolean; project_name?: string; error?: string }>(
        'affiliate-sync-rc',
        { method: 'POST', body: { affiliate_id: created.affiliate_id } },
      );

      toast({
        variant: 'success',
        title: `Afiliado ${codeClean} criado`,
        description: 'Sincronizando com RevenueCat...',
      });
      reset();
      onCreated();
      onClose();

      // Reporta resultado do RC sync após criar (não bloqueante)
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
            description: `Afiliado criado localmente, mas RC não respondeu: ${detail}. Funciona mesmo assim via apply_referral_code.`,
          });
        }
      });
    } catch (err) {
      const msg = err instanceof RpcError ? err.message : 'Falha ao criar afiliado';
      toast({ variant: 'error', title: 'Erro', description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-navy-900/40"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-navy-50 px-5 py-3">
          <h2 className="text-base font-semibold text-navy-700">Novo afiliado</h2>
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
          {/* Code */}
          <Field label="Código" required hint="MEMORÁVEL: ANALUIZA, VENDE01, JOAOQR (3-32 chars [A-Z0-9_-])">
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

          {/* Name */}
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

          {/* Email + Phone */}
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

          {/* PayID */}
          <Field label="PayID (AU)" hint="PayID = identificador AU instant payment (email, telefone ou ABN). Vazio se for outro país.">
            <input
              type="text"
              value={payId}
              onChange={(e) => setPayId(e.target.value)}
              className="w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              placeholder="email / +614… / ABN"
            />
          </Field>

          {/* Commission + currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label="Comissão por conversão" hint="Em $ (vazio = usa default global)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-navy-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={commissionDollars}
                    onChange={(e) => setCommissionDollars(e.target.value)}
                    className="w-full rounded-md border border-navy-100 bg-white py-2 pl-7 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    placeholder="5.00"
                  />
                </div>
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

          {/* Notes */}
          <Field label="Notas internas">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              placeholder="Como conheceu, contrato, vencimento..."
            />
          </Field>

          {/* Sync hint */}
          <div className="rounded-md bg-emerald-50/60 px-3 py-2 text-[11px] text-emerald-800">
            ✓ RevenueCat conectado (<code>REVENUECAT_SECRET_KEY</code> +{' '}
            <code>REVENUECAT_PROJECT_ID</code> nas Supabase secrets). Após
            criar, a edge fn <code>affiliate-sync-rc</code> verifica a conexão
            e marca o status no campo <em>notes</em> do afiliado. Atribuição
            no app continua via <code>apply_referral_code(code)</code> no signup.
          </div>

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
              Criar afiliado
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
      {hint && <span className="mt-1 block text-[11px] text-navy-300">{hint}</span>}
    </label>
  );
}
