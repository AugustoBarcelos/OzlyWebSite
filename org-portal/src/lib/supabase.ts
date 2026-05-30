import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

// anon key only — RLS is the security boundary. Anything needing elevation
// goes through an Edge Function (send-org-invite) or a SECURITY DEFINER RPC.
//
// `storageKey` is intentionally distinct from the admin-portal's default so a
// session here never collides with an admin-portal session in the same browser
// (spec: org-portal session must be separate from admin).
export const supabase: SupabaseClient = createClient(
  env.supabaseUrl || 'https://invalid.local',
  env.supabaseAnonKey || 'invalid',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'ozly-org-portal-auth',
    },
    global: {
      headers: { 'X-Client-Info': 'ozly-org-portal' },
    },
  },
);
