# Briefing — Ozly Admin Portal

> **Versão:** v2 (locked decisions)
> **Para:** Dev web frontend
> **De:** Augusto (PO / fundador)
> **Filosofia:** Zero Trust + Defense in Depth. Toda camada falha *safe*. Nada confia em nada.
> **Premissa:** dados que tocamos = TFN, ABN, finanças, visa info → classificação **sensível** sob Privacy Act 1988 (AU) + LGPD. Vazamento = dano material aos users + multa regulatória + fim do produto.
> **Stack mobile/backend que o portal toca:** Flutter + Supabase + RevenueCat (já em produção)

---

## Decisões já travadas

| # | Decisão | Valor |
|---|---|---|
| D1 | Analytics provider | **PostHog Cloud EU** (free 1M events; migra pra self-host AU quando justificar) |
| D2 | Subdomain do portal | **`peixes.ozly.au`** |
| D3 | Identity provider Cloudflare Access | **Google Workspace** |
| D4 | Email provider (alerts admin) | **Resend** |
| D5 | Penetration test externo | **Pré go-live** do portal (não agora) |
| D6 | Supabase Pro | **Esperar** atingir ~200 MAU; free tier por enquanto |

---

## Índice

1. Contexto e objetivo
2. Modelo de ameaça
3. Filosofia de segurança
4. Stack obrigatório
5. Infraestrutura (1 projeto Supabase)
6. Estrutura do repo
7. As 9 camadas de defesa
8. Schema SQL (migration completa)
9. RPCs admin
10. Edge Functions
11. Telas — user stories + hardening por tela
12. CI/CD security pipeline
13. Monitoring, alerting, incident response
14. Compliance & legal
15. Critérios de "Done" (release gate)
16. Cronograma (5 semanas)
17. Decisões pendentes
18. Onde estão as coisas

---

## 1. Contexto e objetivo

**Ozly** é um app mobile (Flutter) pra subcontractors australianos gerenciarem jobs, invoices, taxas e horas de visa. Audiência: migrantes LATAM e sul-asiáticos. Backend: Supabase + RevenueCat. Site público em React (`OzlyWebSite`, hospedado no Cloudflare).

**Problema:** todas as operações de admin (suporte, refund, promo, monitorar funil) hoje são SQL bruto + curl no RevenueCat + dashboards separados. Insustentável e inseguro.

**Solução:** portal web admin único em **`peixes.ozly.au`**, com defesa em profundidade.

**Casos de uso por ordem de prioridade:**
1. **User 360** — buscar 1 user e ver tudo dele em 1 tela
2. **KPIs do produto** — dashboard de funil
3. **Ações operacionais** — grant promo, force resync, refund, ban (tudo auditado)
4. **Atalhos pra ferramentas externas** — embed/links pra PostHog, Sentry, Supabase, RevenueCat

**Definição de sucesso:**
- Tempo pra responder suporte cai de "abrir 5 ferramentas" pra "<30 segundos no portal"
- Zero incidente de segurança nos primeiros 12 meses
- Portal abre todo dia, não só em incidente

---

## 2. Modelo de ameaça

| Atacante | Capacidade | Vetores principais |
|---|---|---|
| Bot/scanner automático | Baixa | Recon de DNS, paths conhecidos, brute force |
| Atacante oportunista | Média | Phishing, credential stuffing, XSS |
| Atacante targeted | Alta | Zero-day, social engineering, supply chain |
| **Insider malicioso** | Alta + privilégio legítimo | Exfiltração silenciosa, abuso de role |
| Supply chain | Alta + difícil detectar | NPM package comprometido |

**Ativos protegidos** (criticidade alta → baixa):
1. **TFN** dos users (regulado AU — APP 11 do Privacy Act)
2. **Service role keys** + JWT secrets
3. **PII**: nome, email, endereço, telefone, visa type
4. **Dados financeiros**: jobs, invoices, expenses, ABN
5. **Audit log** (integridade > confidencialidade — não pode ser apagado)
6. **Disponibilidade** do app mobile (DDoS no portal **não pode** derrubar app)

**Vetores que devemos bloquear:**
- Acesso direto à DB sem passar pelas camadas
- Privilege escalation (user vira admin)
- Token theft (XSS, MITM, localStorage leak)
- CSRF / clickjacking
- SQL injection
- Supply chain (deps NPM maliciosas)
- Brute force login admin
- Vazamento via logs / errors / source maps
- DDoS ou flood do portal
- Insider exfiltration sem rastro

---

## 3. Filosofia de segurança (não-negociável)

1. **Zero Trust** — toda request é verificada em cada camada
2. **Defense in Depth** — múltiplas camadas independentes
3. **Princípio do Menor Privilégio** — só o mínimo necessário
4. **Fail Secure** — em dúvida, bloqueia (erro = 403, não 200)
5. **Auditável** — toda ação destrutiva ou leitura sensível é gravada
6. **Sem segredos no client** — `service_role` JAMAIS sai do servidor
7. **Defaults seguros** — toda config nasce restrita
8. **Crypto > custom** — usa primitivas conhecidas (Argon2, JWT-Supabase, TLS 1.3)
9. **Logs sanitizados** — TFN/email/tokens nunca em texto plano

---

## 4. Stack obrigatório

| Camada | Tech | Justificativa de segurança |
|---|---|---|
| Build | Vite 7 | Sem SSR (menor superfície); source maps off em prod |
| Linguagem | **TypeScript estrito** (`strict: true`) | Type-safety reduz CVEs |
| UI | React 19 + Tremor | React escapa HTML; Tremor sem `dangerouslySetInnerHTML` |
| Routing | React Router 7 | Sem auto-prefetch de rotas autenticadas |
| Validação | **Zod** | Runtime input validation |
| Auth | Supabase Auth + **WebAuthn/Passkey** + TOTP | Resistente a phishing |
| Edge auth | **Cloudflare Access (Zero Trust)** + Google Workspace | Login antes do app carregar |
| DB | Supabase Postgres + RLS + RPCs SECURITY DEFINER | Defesa no banco |
| Hosting | Cloudflare Pages | DDoS, edge global, WAF integrado |
| WAF | Cloudflare WAF (managed + custom rules) | OWASP Top 10 bloqueado na borda |
| Email alerts | **Resend** (API key escopada) | Alertas críticos |
| Secrets | Cloudflare env vars + Supabase Vault | Nunca em código |
| Monitoring | Sentry + Cloudflare Logpush + custom alerts | Detecção de anomalia |
| Analytics | **PostHog Cloud EU** (free 1M events) | Detectar uso anômalo do portal; migra pra self-host AU quando volume justificar |

**Banido explicitamente:**
- `dangerouslySetInnerHTML` em qualquer lugar
- `eval()`, `new Function()`, `setTimeout(string)`
- `localStorage` pra dados sensíveis (tokens, PII)
- Inline scripts (`<script>...</script>` no HTML)
- CDN externo sem SRI (Subresource Integrity)
- Service role key no frontend (auditável via grep no CI)
- `console.log` em produção (build strip via plugin)
- Source maps publicados (server-side only no Sentry)
- SMS como 2FA (vulnerável a SIM swap)

---

## 5. Infraestrutura — 1 projeto Supabase

```
                       ┌─────────────────────────────────┐
                       │  Supabase: ozly-prod            │
                       │  (1 único projeto)              │
                       │  Region: ap-southeast-2 (AU)    │
                       └──────────────┬──────────────────┘
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           │                          │                          │
   ┌───────▼────────┐       ┌─────────▼─────────┐       ┌───────▼────────┐
   │  App Mobile    │       │  Site Público     │       │  Admin Portal  │
   │  Flutter       │       │  ozly.au          │       │  peixes.ozly.au│
   │  iOS/Android   │       │  (estático)       │       │  ↑ NOVO        │
   │                │       │                   │       │                │
   │  anon key      │       │  não conecta      │       │  anon key      │
   │  RLS user      │       │                   │       │  RLS admin     │
   └────────────────┘       └───────────────────┘       │  +CF Access    │
                                                         └────────────────┘
```

**Por que 1 projeto:** auth/dados/edge functions/storage compartilhados; admin é só um user com `profiles.role='admin'`.

**Custo:** zero a mais até passar do free tier.

---

## 6. Estrutura do repo

Tudo dentro de **`OzlyWebSite/`**:

```
OzlyWebSite/
├── src/                          ← site público (NÃO MEXER)
├── admin-portal/                 ← portal admin (NOVO)
│   ├── package.json              ← deps independentes
│   ├── tsconfig.json             ← "strict": true
│   ├── vite.config.ts            ← plugins de hardening
│   ├── .env.example              ← SEM valores; só nomes
│   ├── public/
│   │   ├── _headers              ← CSP, HSTS, etc.
│   │   └── robots.txt            ← Disallow: /
│   └── src/
│       ├── lib/
│       │   ├── supabase.ts       ← anon key only
│       │   ├── rpc.ts            ← wrappers tipados
│       │   ├── auth.ts           ← guard de role + 2FA
│       │   ├── input-sanitize.ts ← Zod schemas
│       │   ├── audit-client.ts   ← marca início/fim de ação
│       │   └── posthog.ts        ← SDK do portal (separado do app)
│       ├── routes/
│       │   ├── login.tsx
│       │   ├── dashboard.tsx
│       │   ├── users/
│       │   │   ├── search.tsx
│       │   │   └── [id].tsx
│       │   ├── ops/
│       │   │   ├── grants.tsx
│       │   │   ├── audit.tsx
│       │   │   └── functions.tsx
│       │   ├── revenue.tsx
│       │   └── unauthorized.tsx
│       ├── components/
│       │   ├── KpiCard.tsx
│       │   ├── UserTimeline.tsx
│       │   ├── AuditTable.tsx
│       │   ├── DangerZone.tsx     ← actions destrutivas com double-confirm
│       │   └── MaskedField.tsx    ← TFN/email mascarados por default
│       └── App.tsx
└── (sem compartilhar deps com /src — separação total)
```

**Build output não pode conter:**
- Source maps
- Comments com TODO/FIXME
- Hash de senhas/keys
- Endpoints internos não documentados
- `.env` ou variáveis com valores reais

---

## 7. As 9 camadas de defesa

### L1 — Edge / Cloudflare

**Bloqueia tráfego malicioso antes do app.**

- [ ] **Cloudflare Access (Zero Trust)** ativo no `peixes.ozly.au`
  - Identity provider: **Google Workspace**
  - Session lifetime: **8 horas** (sem "remember me")
  - Country block: deixa só AU + BR
  - **Logpush** pra storage externo (R2/S3) — não confiar só no painel CF
- [ ] **WAF Managed Rules** (OWASP Core)
- [ ] **Custom WAF rules:**
  - Block User-Agent vazio ou de scanners (sqlmap, nikto, nmap, dirbuster)
  - Block paths: `*/.env`, `*/.git/*`, `*/wp-admin/*`, `*/phpmyadmin*`
  - Rate limit: **30 req/min/IP** geral; **5 req/min/IP** em login
  - Managed challenge em comportamento suspeito
- [ ] **DDoS protection:** padrão CF
- [ ] **Bot Management:** "Block likely automated" em rotas de auth
- [ ] **TLS 1.3 mandatory** (1.2 só fallback)
- [ ] **Always Use HTTPS** + **HSTS preload** (max-age=63072000)
- [ ] **Subdomain ofuscado** (`peixes.ozly.au`) — anti-noise

### L2 — Headers HTTP

Arquivo `public/_headers` (Cloudflare Pages):

```
/*
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.supabase.co; font-src 'self'; connect-src 'self' https://*.supabase.co https://eu.posthog.com; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; upgrade-insecure-requests
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Resource-Policy: same-origin
  Cache-Control: no-store, no-cache, must-revalidate, private
```

**Trade-off documentado:** `'unsafe-inline'` em `style-src` é necessário pro Tremor. Sem `'unsafe-eval'` em scripts. `connect-src` whitelista apenas Supabase + PostHog EU.

### L3 — Autenticação

- [ ] **Supabase Auth** com email + magic link OU email+senha
- [ ] **2FA OBRIGATÓRIO** pros admins:
  - Primário: **WebAuthn/Passkey** (resistente a phishing)
  - Fallback: TOTP (Google Authenticator)
  - 10 backup codes one-time (PDF baixado na criação)
  - **SMS não é aceito**
- [ ] **Política de senha** (se email+pass):
  - Min 14 caracteres
  - HaveIBeenPwned API check no signup (block senhas vazadas)
  - Sem expiração forçada (NIST 800-63B)
- [ ] **Brute force:**
  - Supabase Auth rate limit nativo (manter)
  - CF custom rule: 5 tentativas / 5 min / IP → challenge
  - Lockout temporário 15 min após 10 falhas
- [ ] **Session:**
  - Access token TTL: 1 hora
  - Refresh token rotation ativada
  - Refresh token TTL: 8 horas (alinhado CF Access)
  - Logout em todas sessions: ação disponível no portal

### L4 — Autorização

- [ ] Coluna `profiles.role` (default `'user'`, check in `('user','admin','affiliate','business')`)
  - `affiliate` e `business` são **placeholders** pra futuros portais derivados; não usados no v0
- [ ] Função `is_admin()` SECURITY DEFINER STABLE
- [ ] **Toda RPC admin** começa com `if not is_admin() then raise exception 'Forbidden'; end if;`
- [ ] **RLS em `admin_audit_log`:** só admin lê; ninguém escreve direto (só via RPC)
- [ ] **Frontend guards:** ProtectedRoute checa role após login; se != admin → signOut + redirect /unauthorized

### L5 — Aplicação (anti XSS/CSRF/injection)

- [ ] **Input validation:** todo input do user passa por **Zod schema** antes de ir pro backend
- [ ] **Output encoding:** React faz por default; banido `dangerouslySetInnerHTML`
- [ ] **CSRF:** Supabase usa JWT no Authorization header → não vulnerável a CSRF clássico. Forms POST nunca usados (só fetch com header).
- [ ] **Clickjacking:** `frame-ancestors 'none'` no CSP + `X-Frame-Options: DENY`
- [ ] **Open redirect:** todos os `redirect_to` são validados contra allowlist
- [ ] **JSON injection:** sempre usar `JSON.parse` com try/catch; nunca interpolar strings em JSON

### L6 — Database

- [ ] **RLS habilitado em TODAS as tabelas** (audit no CI: `select tablename from pg_tables where schemaname='public' and rowsecurity=false` deve retornar 0 linhas)
- [ ] **RPCs admin SECURITY DEFINER** com check `is_admin()` no primeiro statement
- [ ] **Inputs parametrizados** em RPCs (nunca concatenar string)
- [ ] **Soft delete** em vez de DELETE pra audit
- [ ] **Backups:** daily Supabase + GitHub Actions backup (já existe — manter)
- [ ] **Point-in-time recovery:** Supabase Pro ($25/mês) recomendado pra recovery granular (D6 = esperar 200 MAU)
- [ ] **Rate limit em RPCs sensíveis:** tabela `rpc_rate_limit (user_id, rpc_name, count, window_start)` com check no início da RPC
- [ ] **Database queries não tocam `auth.users` diretamente** do client — só via RPC

### L7 — Secrets management

- [ ] **Cloudflare Pages env vars** pra config do build (Supabase URL, anon key)
- [ ] **Supabase Vault** pra secrets server-side (RevenueCat API key, Resend key)
- [ ] **Service role key:** APENAS em Edge Functions, nunca em client
- [ ] **Rotation policy:** trimestral (calendar reminder); imediato se incidente
- [ ] **`.env.example`** committed sem valores; `.env` no `.gitignore`
- [ ] **CI scan:** `gitleaks` ou `trufflehog` no pipeline pra pegar secrets commitados acidentalmente

### L8 — Audit & Monitoring

- [ ] **`admin_audit_log`** com retenção 24 meses (anonimização após)
- [ ] **Audit em RPC, não em client** (client pode mentir)
- [ ] **Sentry** capturando erros do portal (com sanitização de PII via `beforeSend`)
- [ ] **Cloudflare Logpush** pra R2/S3 — logs de access externos ao CF
- [ ] **Alerts via email (Resend):**
  - Login falhou >5x mesmo IP em 5min
  - `grant_promo` > 30 dias
  - `refund` qualquer valor
  - `ban_user`, `soft_delete_user`
  - `bulk_action` ≥10 users
  - Mudança em `profiles.role` (alguém vira admin)
  - RPC retornou "Forbidden" (tentativa de privilege escalation)

### L9 — Incident Response

- [ ] **Kill switch:** env var `PORTAL_ENABLED=false` → portal mostra maintenance page
- [ ] **Rollback:** revert no Cloudflare Pages é 1 click
- [ ] **Runbook documentado** em `admin-portal/SECURITY.md`:
  - Suspeita de account takeover → revoke sessions + force password reset + notify user
  - Suspeita de leak de service_role → rotate todas as keys imediatamente
  - WAF começou a bloquear legítimo → modo "monitor only" temporário
- [ ] **Contato de emergência:** lista no SECURITY.md (Augusto + futuro on-call)

---

## 8. Schema SQL (migration completa)

Aplicar no Supabase via dashboard ou `supabase migration new admin_portal`:

```sql
-- ════════════════════════════════════════════════════════════
-- Migration: admin_portal_setup
-- ════════════════════════════════════════════════════════════

-- 1) Coluna role (com placeholders pra futuros portais derivados)
alter table profiles add column if not exists role text default 'user'
  check (role in ('user', 'admin', 'affiliate', 'business'));

create index if not exists idx_profiles_role on profiles(role)
  where role = 'admin';

-- 2) Helper de check
create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function is_admin() from public;
grant execute on function is_admin() to authenticated;

-- 3) Audit log (TAMPER-EVIDENT via hash chain)
create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) not null,
  action text not null,
  target_user_id uuid,
  payload jsonb,
  ip text,
  user_agent text,
  result text not null check (result in ('success', 'failed', 'forbidden')),
  notify_email_sent boolean default false,
  prev_hash text,
  row_hash text,
  created_at timestamptz default now()
);

create index idx_audit_target on admin_audit_log(target_user_id);
create index idx_audit_admin on admin_audit_log(admin_id, created_at desc);
create index idx_audit_action on admin_audit_log(action, created_at desc);
create index idx_audit_created on admin_audit_log(created_at desc);

-- RLS estrita: só admin lê; ninguém escreve direto
alter table admin_audit_log enable row level security;

create policy "admin_reads_audit_log"
  on admin_audit_log for select
  using (is_admin());

-- intencional: SEM policies de insert/update/delete
-- => só funções SECURITY DEFINER conseguem escrever

-- Trigger pra hash chain (tamper detection)
create or replace function audit_log_hash_trigger()
returns trigger
language plpgsql
as $$
declare
  prev text;
begin
  select row_hash into prev
    from admin_audit_log
    order by created_at desc
    limit 1;

  new.prev_hash := prev;
  new.row_hash := encode(
    digest(
      coalesce(prev, '') || new.id::text || new.admin_id::text ||
      new.action || coalesce(new.target_user_id::text, '') ||
      coalesce(new.payload::text, '') || new.created_at::text,
      'sha256'
    ),
    'hex'
  );
  return new;
end;
$$;

create trigger admin_audit_log_hash
  before insert on admin_audit_log
  for each row execute function audit_log_hash_trigger();

-- 4) Tabela de rate limit pra RPCs sensíveis
create table if not exists rpc_rate_limit (
  user_id uuid not null,
  rpc_name text not null,
  count int not null default 0,
  window_start timestamptz not null default now(),
  primary key (user_id, rpc_name)
);

create or replace function check_rpc_rate_limit(
  p_rpc text,
  p_max_per_minute int default 30
)
returns void
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  insert into rpc_rate_limit (user_id, rpc_name, count, window_start)
  values (auth.uid(), p_rpc, 1, now())
  on conflict (user_id, rpc_name) do update set
    count = case
      when rpc_rate_limit.window_start < now() - interval '1 minute' then 1
      else rpc_rate_limit.count + 1
    end,
    window_start = case
      when rpc_rate_limit.window_start < now() - interval '1 minute' then now()
      else rpc_rate_limit.window_start
    end
  returning count into v_count;

  if v_count > p_max_per_minute then
    raise exception 'Rate limit exceeded for %', p_rpc using errcode = 'P0001';
  end if;
end;
$$;

-- 5) Cron de retenção (anonimiza após 24 meses)
select cron.schedule('admin-audit-retention', '0 3 * * 0',
  $$update admin_audit_log
    set target_user_id = null,
        payload = '{"anonymized": true}'::jsonb,
        ip = null,
        user_agent = null
    where created_at < now() - interval '24 months'
      and (payload->>'anonymized') is null$$
);
```

---

## 9. RPCs admin

Todas seguem o template:
1. Check `is_admin()` no primeiro statement
2. Check `rpc_rate_limit` se aplicável
3. Validar inputs
4. Executar
5. Gravar `admin_audit_log` (com result)
6. Retornar JSON estruturado

| RPC | Args | Função | Rate limit |
|---|---|---|---|
| `admin_search_users` | `query text, limit int` | Busca user (email/code/id) | 60/min |
| `admin_get_user_360` | `target uuid` | Retorna profile + sub + counts + sync + referrals | 30/min |
| `admin_grant_promo` | `target uuid, entitlement text, days int` | Grant via RC | 10/min |
| `admin_force_resync` | `target uuid` | Marca flag `force_full_sync_at` | 30/min |
| `admin_soft_delete_user` | `target uuid, reason text` | Chama edge `delete-user` | 5/min |
| `admin_ban_user` | `target uuid, reason text` | Marca `is_banned=true` + revoga sessões | 5/min |
| `admin_kpi_dashboard` | `period_days int` | Counts agregados | 30/min |
| `admin_revenue_summary` | `period_days int` | MRR, novos pagantes, breakdown | 30/min |
| `admin_audit_list` | `limit int, offset int, filter jsonb` | Lê audit_log paginado | 60/min |

**Template de RPC:**

```sql
create or replace function admin_grant_promo(
  p_target_user_id uuid,
  p_entitlement text,
  p_days int
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log_id uuid;
begin
  -- 1) Authorization
  if not is_admin() then
    insert into admin_audit_log (admin_id, action, target_user_id, payload, result)
    values (auth.uid(), 'grant_promo_attempt', p_target_user_id,
            jsonb_build_object('entitlement', p_entitlement, 'days', p_days),
            'forbidden');
    raise exception 'Forbidden: admin only' using errcode = '42501';
  end if;

  -- 2) Rate limit
  perform check_rpc_rate_limit('admin_grant_promo', 10);

  -- 3) Input validation
  if p_entitlement not in ('tfn_access', 'abn_access', 'pro') then
    raise exception 'Invalid entitlement' using errcode = '22023';
  end if;
  if p_days < 1 or p_days > 365 then
    raise exception 'Days must be 1-365' using errcode = '22023';
  end if;
  if p_target_user_id is null then
    raise exception 'Target required' using errcode = '22023';
  end if;

  -- 4) Audit FIRST (so we have a log even if next step fails)
  insert into admin_audit_log (admin_id, action, target_user_id, payload, result)
  values (auth.uid(), 'grant_promo', p_target_user_id,
          jsonb_build_object('entitlement', p_entitlement, 'days', p_days),
          'success')
  returning id into v_log_id;

  -- 5) Enqueue edge function call (não chamar fetch direto da RPC)
  perform pg_notify('admin_action', json_build_object(
    'action', 'grant_promo',
    'audit_id', v_log_id,
    'target', p_target_user_id,
    'entitlement', p_entitlement,
    'days', p_days
  )::text);

  return json_build_object('success', true, 'audit_id', v_log_id);
end;
$$;

revoke all on function admin_grant_promo from public;
grant execute on function admin_grant_promo to authenticated;
```

---

## 10. Edge Functions (Deno)

| Function | Trigger | Função |
|---|---|---|
| `admin-grant-promo` | RPC via pg_notify (queue) | Bate em RevenueCat REST API |
| `admin-revoke-sessions` | RPC `admin_ban_user` | Revoga todas sessions Supabase do user |
| `notify-admin-action` | Trigger after insert no audit_log | Email Resend para ações críticas |
| `admin-export-user-data` | RPC | GDPR/Privacy export por user |

**Hardening de Edge Functions:**
- [ ] `deno.json` com permissions de net allowlistadas (`api.revenuecat.com`, `api.resend.com`)
- [ ] Validar JWT do caller (que veio da RPC) — não confiar em headers HTTP brutos
- [ ] Logs sanitizados (nunca dump do payload completo)
- [ ] Timeout: 10s max
- [ ] Retry com exponential backoff em chamadas externas

---

## 11. Telas — User Stories + hardening

### 11.1 Login (`/login`)
**Story:** Como admin, quero logar via Google Workspace OU magic link, pra acessar o portal.

**Hardening:**
- Cloudflare Access (Google Workspace) já gateou — Supabase auth é segunda camada
- Após auth, **valida `is_admin()` via RPC** antes de mostrar qualquer dashboard
- Se `role != 'admin'` → signOut + redirect /unauthorized + log evento
- 2FA setup forçado no first login (TOTP/Passkey)
- Falha de login → log no audit (com IP, UA)

### 11.2 Dashboard (`/`)
**Story:** Como admin, quero ver KPIs do produto agregados.

**Cards (Tremor):**
- Aquisição: signups hoje/7d/30d (line chart)
- Ativação: % com 1 job em 48h (gauge)
- Trial: ativos/iniciados/expirando 7d
- Revenue: subs ativas (TFN/ABN/PRO), MRR, novos 7d
- Churn: cancelamentos 7d/30d
- Referral: códigos compartilhados / signups via referral / rewards
- Saúde: link Sentry, Edge Function errors 24h

**Filtros:** 7d/30d/90d/custom

**Hardening:**
- KPI dashboard via materialized view `admin_kpi_snapshot` refresh 5min via pg_cron
- Sem PII no dashboard — só counts
- Performance: < 2s loading

### 11.3 User Search (`/users`)
**Story:** Como admin, quero buscar user por email/code/id.

**Hardening:**
- Input com **Zod validation** (max 100 chars, sem chars especiais)
- Debounce 300ms (anti-flood)
- Rate limit RPC: 60/min/admin
- Log no audit: `search_query` (mas não os results — privacy)
- Resultados em tabela: avatar, nome (parcial), email (mascarado), plano, signup
- **Email/nome completo** só visível ao clicar em "Reveal" (gera audit log de "PII viewed")

### 11.4 User 360 (`/users/:id`) — a tela mais importante
**Story:** Ver tudo do user numa tela, pra responder suporte em segundos.

**Tabs:**
1. **Profile:** avatar, nome, email, mode, visa type, language, criado em, último login
2. **Subscription:** plano, status, trial_ends_at, MRR, eventos RC (timeline), botão "abrir RevenueCat"
3. **Activity:** counts (jobs/invoices/expenses last 30d), totais
4. **Sync:** last_sync_at, status, devices, "Force resync"
5. **Referral:** referrer, referidos por ele, rewards
6. **Errors:** Sentry filtrado por user_id (link)
7. **Audit:** ações admin que tocaram esse user

**Action panel:** Grant promo / Force resync / Reset password / Soft delete / Ban

**Hardening:**
- **TFN nunca exibido** (só último 3 dígitos: `XXX-XXX-123`)
- Email e telefone mascarados; "Reveal" gera audit
- Toda ação destrutiva tem **double-confirm** (typing user email pra confirmar)
- Componente `<DangerZone>` com cor vermelha + confirmação textual
- Audit auto: simples view dessa tela já é logado (`viewed_user_360`)

### 11.5 Ops > Grants (`/ops/grants`)
Lista de promos ativos. Tabela: target, entitlement, granted_at, expires_at, granted_by, motivo. Filtros: ativo/expirado/entitlement.

### 11.6 Ops > Audit (`/ops/audit`)
Tabela paginada. Filtros: action, admin, user, período. **Export CSV** com audit log de quem exportou (meta-audit).

**Hardening:**
- Export CSV gera **novo registro** no audit
- CSV não inclui `payload` cru (só sumário)
- Limite: 10k rows por export (anti-exfiltration)

### 11.7 Ops > Functions (`/ops/functions`)
Lista das 7 Edge Functions, link pro log Supabase, última invocação, error rate, ATO Watchdog status.

### 11.8 Revenue (`/revenue`)
Snapshot local + iframe RevenueCat dashboard.

### 11.9 `/unauthorized` e `/maintenance`
Pages estáticas pra fail-secure (kill switch, role inválida).

---

## 12. CI/CD Security Pipeline

GitHub Actions (`admin-portal.yml`):

```yaml
name: admin-portal CI
on:
  push: { branches: [main], paths: ['admin-portal/**'] }
  pull_request: { paths: ['admin-portal/**'] }

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Secret scanning
        uses: trufflesecurity/trufflehog@main
        with: { path: ./admin-portal, base: ${{ github.event.repository.default_branch }} }

      - name: Dependency audit
        run: cd admin-portal && npm audit --audit-level=high

      - name: SAST com Semgrep
        uses: returntocorp/semgrep-action@v1
        with: { config: 'p/typescript p/react p/owasp-top-ten' }

      - name: Lint
        run: cd admin-portal && npm run lint

      - name: Type check
        run: cd admin-portal && npx tsc --noEmit

      - name: Test
        run: cd admin-portal && npm test

      - name: Verify no service_role in source
        run: |
          if grep -r "service_role\|SUPABASE_SERVICE" admin-portal/src/; then
            echo "service_role found in client code"
            exit 1
          fi

      - name: Verify no console.log in prod build
        run: cd admin-portal && npm run build && ! grep -r "console.log" dist/

  deploy:
    needs: security
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          projectName: ozly-admin-portal
          directory: admin-portal/dist
```

**Dependabot ativado** pra `admin-portal/package.json` (security updates auto-PR).

---

## 13. Monitoring, Alerting, Incident Response

### Monitoring
- **Sentry** capturando erros do portal
  - `beforeSend` filtra PII (email, TFN, tokens)
  - Source maps server-side only
- **PostHog Cloud EU** trackeando ações do admin (não eventos de produto — esses ficam no app)
- **Cloudflare Logpush** → R2 bucket (retenção 90 dias)
- **Supabase logs** acessíveis via portal (read-only)

### Alerting (via Resend → email)
| Evento | Severidade |
|---|---|
| Login falhou >5x mesmo IP em 5min | Médio |
| `grant_promo` > 30 dias | Médio |
| `refund` qualquer valor | Alto |
| `ban_user`, `soft_delete_user` | Alto |
| `bulk_action` ≥10 users | Alto |
| Mudança em `profiles.role` | **Crítico** |
| RPC retornou "Forbidden" | Alto |
| WAF bloqueou >100 req/h de IP único | Médio |
| Edge Function error rate > 5% | Médio |
| Backup diário falhou | Alto |

### Incident Response Runbook (`SECURITY.md`)
- **Account takeover suspeito:** revoke sessions + force password reset + notify user + audit revisão
- **Service role leak:** rotate todas as keys imediatamente; revisar audit últimas 24h
- **Portal flooding:** Cloudflare → "Under Attack Mode"
- **Insider abuse:** revoke role; auditar actions; preservar evidência; consultar legal
- **Kill switch:** env var `PORTAL_ENABLED=false` → maintenance page

---

## 14. Compliance & Legal

- [ ] **Privacy Act 1988 (AU):**
  - APP 11 — segurança de informação pessoal: cobertura via camadas L1-L9
  - APP 12 — acesso a info pessoal: portal tem export por user (Edge Function)
  - APP 13 — correção: portal permite editar profile do user
- [ ] **LGPD (BR):** mesmo princípios; export + delete já cobertos
- [ ] **Notification of Data Breach (NDB) AU:** runbook inclui notificar OAIC se breach > threshold
- [ ] **Privacy Policy** atualizada (no site público) referenciando role admin + audit
- [ ] **Termos de uso interno** assinado por qualquer admin (Augusto + futuros)
- [ ] **Annual security review:** revisar logs anômalos, rotacionar keys, atualizar runbook

---

## 15. Critérios de "Done" (release gate)

**Funcionais:**
- [ ] Login + 2FA funcionando
- [ ] Dashboard < 2s loading
- [ ] User Search < 500ms
- [ ] User 360 < 2s
- [ ] Todas ações destrutivas com double-confirm
- [ ] Audit log grava 100% das ações

**Segurança (cada item auditável):**
- [ ] **Zero `service_role`** no client (CI verifica via grep)
- [ ] Cloudflare Access ativo
- [ ] WAF rules + rate limit configurados
- [ ] Headers HTTP corretos (verificar com `securityheaders.com`)
- [ ] CSP estrita (sem `'unsafe-eval'`)
- [ ] HSTS preload submitted
- [ ] 2FA forçado pra admins
- [ ] RLS em 100% das tabelas (CI verifica)
- [ ] RPCs admin com `is_admin()` no primeiro statement (code review)
- [ ] Audit log com hash chain ativo
- [ ] Cron retenção (24m) ativo
- [ ] Email alerts testados (todos os triggers)
- [ ] Sentry com `beforeSend` filtrando PII
- [ ] Source maps **NÃO** publicados
- [ ] Console.log strippado em prod build
- [ ] Dependabot ativo
- [ ] Trufflehog/Semgrep verde no CI
- [ ] **Penetration test externo passou** (D5 — pré go-live, contratar antes da Semana 5)

**Operacional:**
- [ ] Kill switch testado (env var PORTAL_ENABLED=false)
- [ ] Rollback testado (CF Pages revert)
- [ ] Runbook escrito em `admin-portal/SECURITY.md`
- [ ] Backup do Supabase verificado (restore test)

---

## 16. Cronograma (5 semanas — 1 dev FT)

| Semana | Entregas |
|---|---|
| **1** | Setup repo + Vite + TS + Tailwind + Tremor; migration SQL; login + 2FA + role guard; Cloudflare Access (Google Workspace) configurado |
| **2** | Headers HTTP + WAF rules + rate limits; layout + sidebar; Dashboard KPI com materialized view; PostHog EU + Sentry plugados |
| **3** | User Search; User 360 (todas tabs); RPCs `admin_search_users`, `admin_get_user_360` |
| **4** | Ações: grant_promo, force_resync, soft_delete, ban; Edge Functions; email alerts (Resend); double-confirm UI |
| **5** | Audit log viewer; export CSV (com meta-audit); CI security pipeline; runbook SECURITY.md; **contratar pentest externo** (rodar em paralelo); deploy prod |

**v1 (depois de 30 dias):** cohort analysis, push broadcast, A/B test framework UI, referral leaderboard.

---

## 17. Decisões pendentes (mínimas — restam decisões finas)

1. **Materialized view do KPI:** refresh 5min OK ou precisa real-time? (recomendado 5min)
2. **Tema visual:** copiar tokens (cores, fonts) do OzlyWebSite ou usar default Tremor + tweaks?
3. **Geração de tipos do Supabase:** rodar `supabase gen types typescript` no CI?
4. **Quem terá `role='admin'` no v0?** (default: só Augusto)

---

## 18. Onde estão as coisas

- **App mobile (Flutter):** `/Users/augustoeamanda/Documents/GitHub/AusClean`
- **Site público + portal admin:** `/Users/augustoeamanda/Documents/OzlyWebSite`
  - Site público em `src/` (NÃO MEXER)
  - Portal admin em `admin-portal/` (este projeto)
- **Backend Supabase:** dashboard projeto Ozly (region AU `ap-southeast-2`)
- **RevenueCat:** dashboard com V1 secret key (Augusto fornece via Vault)
- **Cloudflare:** DNS + Access + Pages (Augusto fornece acesso)
- **Sentry / PostHog EU:** Augusto cria e fornece DSN/key
- **Resend:** Augusto cria conta + API key

---

## Roadmap derivado (futuro — não-implementar agora)

Mesma stack/arquitetura suportará portais derivados:

- **`partners.ozly.au`** ou similar — dashboard de afiliados/vendedores (`role='affiliate'`); reusa 80% deste portal
- **Empresas** — fica fora do escopo até haver sinal de demanda real (5+ empresas perguntando sem prospecção); quando vier, será produto separado por questões de compliance (labour hire, payment service)

Schema já preparado: coluna `profiles.role` aceita `'affiliate'` e `'business'` como valores futuros.

---

**Briefing pronto pra dev pegar e começar.** 4 decisões finas restantes (§ 17) podem ser respondidas em 1 conversa.
