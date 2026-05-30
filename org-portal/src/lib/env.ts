/**
 * Build-time env accessor. Public values only — everything here ships to the
 * browser. The service-role key must NEVER be referenced.
 */
const isDev = import.meta.env.DEV;

type EnvKey = 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY' | 'VITE_INVITE_BASE_URL';

function read(name: EnvKey): string | undefined {
  const v = (import.meta.env as Record<string, string | undefined>)[name];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function required(name: EnvKey): string {
  const v = read(name);
  if (!v) {
    const msg = `[env] Missing required env var: ${name}`;
    if (isDev) throw new Error(msg);
    console.warn(msg);
    return '';
  }
  return v;
}

export const env = {
  supabaseUrl: required('VITE_SUPABASE_URL'),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY'),
  inviteBaseUrl: (read('VITE_INVITE_BASE_URL') ?? 'https://ozly.app').replace(/\/+$/, ''),
} as const;
