import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// BRIEFING § 7-L7: anon key only. Service-role keys MUST NEVER ship to
// the browser — they bypass RLS. Use callEdge for anything that needs
// elevated DB access; the elevation lives server-side.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isDev = import.meta.env.DEV;

if (!url || !anonKey) {
  const msg =
    '[supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.';
  if (isDev) {
    throw new Error(msg);
  } else {
    // Production: warn but don't break boot — CF Pages may have different envs.
    // The first auth call will surface a real error to the user.
    console.warn(msg);
  }
}

export const supabase: SupabaseClient = createClient(
  url ?? 'https://invalid.local',
  anonKey ?? 'invalid',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Storage: default localStorage. BRIEFING § 4 bans localStorage for sensitive
      // PII — Supabase only stores the JWT here, which is short-lived (1h, § 7-L3).
      // Acceptable trade-off; revisit if we move to httpOnly cookies via a worker.
    },
    global: {
      headers: {
        'X-Client-Info': 'ozly-admin-portal',
      },
    },
  }
);
