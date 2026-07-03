/**
 * Client for the newsletter AI-authoring Worker (ozly.au/admin/api/newsletter/*).
 *
 * Mirrors lib/blog.ts: auth = the admin's Supabase session JWT (no separate
 * password), same base URL, same timeout/abort handling. The Worker validates
 * the session via Supabase /auth/v1/user and requires an admin session.
 *
 * Generation only lives here — SENDING reuses lib/messaging.ts
 * (createBroadcast + sendBroadcastNow, channel `msg_email`, segment
 * `newsletter`). Do not reinvent dispatch here.
 */
import { supabase } from './supabase';

const BASE = 'https://ozly.au/admin/api';

export type LangCode = 'en' | 'pt' | 'es';

export interface NewsletterLang {
  subject: string;
  preheader: string;
  body: string;
}

export interface Newsletter {
  en: NewsletterLang;
  pt: NewsletterLang;
  es: NewsletterLang;
}

async function newsletterApi<T>(
  path: string,
  init: { method?: 'GET' | 'POST'; body?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sessão expirada — entre de novo.');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 60000);
  try {
    const reqInit: RequestInit = {
      method: init.method ?? 'GET',
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    };
    if (init.body !== undefined) {
      reqInit.body = JSON.stringify(init.body);
    }
    const res = await fetch(`${BASE}/${path}`, reqInit);
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    return data as T;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Tempo esgotado — tenta de novo (a IA grátis às vezes está cheia).');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** Draft a newsletter edition (EN/PT/ES) from a topic/brief via the Worker. */
export function generateNewsletter(topic: string) {
  return newsletterApi<Newsletter>('newsletter/generate', {
    method: 'POST',
    body: { topic },
    timeoutMs: 115000,
  });
}
