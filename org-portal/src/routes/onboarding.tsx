// Org owner first-run wizard. Triggered automatically on /signup completion
// (the OrgProvider bootstrap finishes, then auth context lands here when the
// org has 0 invited members AND billing_email is unset).
//
// 3 steps:
//   1. Confirm org name + ABN (with optional ABR verify)
//   2. Set billing inbox email
//   3. Invite first sub-contractor (deep-linked into /members modal)

import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/Spinner';
import { friendlyError } from '@/lib/errors';

type Step = 1 | 2 | 3;

export function OnboardingPage() {
  const navigate = useNavigate();
  const { currentOrg, refresh } = useOrg();
  const { notify } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState(currentOrg?.name ?? '');
  const [abn, setAbn] = useState(currentOrg?.abn ?? '');
  const [billingEmail, setBillingEmail] = useState(currentOrg?.billing_email ?? '');
  const [busy, setBusy] = useState(false);
  const [abnInfo, setAbnInfo] = useState<{ legal_name?: string; is_active?: boolean } | null>(null);

  if (!currentOrg) return <div className="flex justify-center py-16"><Spinner /></div>;

  async function verifyAbn() {
    if (!abn.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('abn-verify', { body: { abn } });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = data as any;
      if (r?.ok) {
        setAbnInfo({ legal_name: r.legal_name, is_active: r.is_active });
        notify(`Verified: ${r.legal_name}`, 'success');
      } else {
        setAbnInfo(null);
        notify(r?.error === 'invalid_abn' ? 'That ABN format is invalid.' : 'ABN not found on ABR.', 'error');
      }
    } catch (err) {
      notify(friendlyError(err, 'Could not verify ABN right now.'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function saveStep1(e: FormEvent) {
    e.preventDefault();
    if (!currentOrg) return;
    const trimmedAbn = abn.trim();
    if (trimmedAbn.length > 0 && !/^\d{11}$/.test(trimmedAbn.replace(/\s/g, ''))) {
      notify('ABN must be 11 digits or left blank.', 'error');
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from('organizations')
      .update({ name: name.trim(), abn: trimmedAbn || null })
      .eq('id', currentOrg.id);
    setBusy(false);
    if (error) { notify(friendlyError(error), 'error'); return; }
    await refresh();
    setStep(2);
  }

  async function saveStep2(e: FormEvent) {
    e.preventDefault();
    if (!currentOrg) return;
    const trimmed = billingEmail.trim();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      notify('Enter a valid email or leave blank.', 'error');
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from('organizations')
      .update({ billing_email: trimmed || null })
      .eq('id', currentOrg.id);
    setBusy(false);
    if (error) { notify(friendlyError(error), 'error'); return; }
    await refresh();
    setStep(3);
  }

  function goInviteFirstMember() {
    navigate('/members?invite=1');
  }

  function finish() {
    navigate('/invoices');
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-xl flex-col px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Setup · Step {step} of 3</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-navy-800">
          {step === 1 && 'Confirm your organisation'}
          {step === 2 && 'Where should invoices arrive?'}
          {step === 3 && 'Invite your first sub-contractor'}
        </h1>
        <div className="mt-4 flex gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-brand-500' : 'bg-navy-100'
              }`}
            />
          ))}
        </div>
      </header>

      {step === 1 && (
        <form onSubmit={saveStep1} className="space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-navy-700">Organisation name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-navy-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-navy-700">ABN (optional but recommended)</span>
            <div className="mt-1 flex gap-2">
              <input
                value={abn}
                onChange={(e) => { setAbn(e.target.value); setAbnInfo(null); }}
                placeholder="12 345 678 901"
                className="flex-1 rounded-md border border-navy-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <button
                type="button"
                onClick={() => void verifyAbn()}
                disabled={busy || !abn.trim()}
                className="rounded-md bg-navy-50 px-3 py-2 text-xs font-medium text-navy-700 hover:bg-navy-100 disabled:opacity-50"
              >
                Verify on ABR
              </button>
            </div>
            {abnInfo?.legal_name && (
              <p className="mt-1 text-[11px] text-brand-700">✓ {abnInfo.legal_name}{abnInfo.is_active === false ? ' (inactive)' : ''}</p>
            )}
          </label>
          <button type="submit" disabled={busy || !name.trim()} className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50">
            {busy ? 'Saving…' : 'Continue'}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={saveStep2} className="space-y-4">
          <p className="text-sm text-navy-600">
            When a sub-contractor sends you an invoice directly from the Ozly app, it arrives at this
            email — and also in the portal Inbox. Use a shared inbox if multiple admins should see it.
          </p>
          <label className="block">
            <span className="text-xs font-medium text-navy-700">Inbox email</span>
            <input
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              placeholder={currentOrg.admin_email}
              className="mt-1 w-full rounded-md border border-navy-100 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <span className="mt-1 block text-[11px] text-navy-400">Leave blank to skip — you can set it later in Settings.</span>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(3)} className="flex-1 rounded-md px-4 py-2.5 text-sm font-medium text-navy-600 ring-1 ring-navy-100 hover:bg-navy-50">
              Skip for now
            </button>
            <button type="submit" disabled={busy} className="flex-1 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50">
              {busy ? 'Saving…' : 'Continue'}
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-navy-600">
            The portal really comes alive once a sub-contractor accepts and starts sending you invoices.
            Invite your first one — they get a deep link by email or SMS.
          </p>
          <div className="flex gap-2">
            <button onClick={finish} className="flex-1 rounded-md px-4 py-2.5 text-sm font-medium text-navy-600 ring-1 ring-navy-100 hover:bg-navy-50">
              Maybe later
            </button>
            <button onClick={goInviteFirstMember} className="flex-1 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500">
              Invite a member →
            </button>
          </div>
        </div>
      )}

      <footer className="mt-auto pt-12 text-center text-[11px] text-navy-400">
        Need help? Email <a className="font-medium text-brand-600 hover:underline" href="mailto:augusto@ozly.au">augusto@ozly.au</a>
      </footer>
    </main>
  );
}
