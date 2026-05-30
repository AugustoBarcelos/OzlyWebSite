// Per-page "saved view" presets backed by localStorage. Each page can opt
// in by passing a unique `scope` (e.g. 'invoices' / 'work'). The shape of
// the saved blob is page-specific — we just store/load JSON.
//
// Why localStorage and not the DB: presets are personal-and-disposable.
// Syncing them to Supabase would mean another table + RLS without much
// benefit. If the user clears storage, they recreate the preset — fair.

const KEY_PREFIX = 'ozly:presets:';

export interface Preset<T> {
  id: string;
  name: string;
  state: T;
  createdAt: number;
}

export function listPresets<T>(scope: string): Preset<T>[] {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + scope);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Preset<T>[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function savePreset<T>(scope: string, name: string, state: T): Preset<T> {
  const list = listPresets<T>(scope);
  const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const preset: Preset<T> = { id, name: name.trim().slice(0, 40), state, createdAt: Date.now() };
  const next = [preset, ...list].slice(0, 12); // cap so the dropdown stays useful
  try { localStorage.setItem(KEY_PREFIX + scope, JSON.stringify(next)); } catch { /* noop */ }
  return preset;
}

export function deletePreset<T>(scope: string, id: string): Preset<T>[] {
  const next = listPresets<T>(scope).filter((p) => p.id !== id);
  try { localStorage.setItem(KEY_PREFIX + scope, JSON.stringify(next)); } catch { /* noop */ }
  return next;
}
