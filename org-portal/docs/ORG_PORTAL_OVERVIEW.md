# Org Portal — Overview Completo

> **Status:** Documentação canônica do org-portal (web). Última revisão 2026-06-01.
> **Audiência:** Quem precisa entender o que o portal é antes de mexer em código,
> billing, deploy ou checklist de launch.
> **Em conflito com outros docs?** Esse aqui é a verdade atual. Se PR/issue
> divergir, atualize este primeiro.

---

## 0. O que o Org Portal NÃO é

Antes de explicar o que é, vamos cravar o que não é — pra evitar repetir os erros
históricos que custaram tempo no checklist de launch:

- ❌ **Não é "SaaS B2B simples"** tipo Notion/Slack. É um motor de entitlement
  multi-tenant que coordena Stripe (web) + RevenueCat (mobile) numa única
  invariante de sponsorship.
- ❌ **Não é o produto principal.** O produto é o app mobile dos sub-contractors.
  O portal existe pra dar às cleaning companies (orgs) uma janela do que os
  subs delas estão emitindo — é sidecar, não core.
- ❌ **Não é onde "se cria invoice".** Org owner NUNCA cria invoice — sub-contractor
  cria no app mobile e direciona pra org. Portal é READ-mostly + admin.
- ❌ **Não usa Stripe Connect** (V2/P0). Charges vão direto pra conta da Ozly via
  Stripe Billing simples. Connect entra em P2 quando shipar bulk payout
  (item #14 em LAUNCH_CHECKLIST.md).

---

## 1. O que o Org Portal É

**Resumo em 1 linha:** dashboard B2B pra owner/admin de cleaning company AU
acompanhar invoices que seus sub-contractors enviaram pra empresa, gerenciar
quem está coberto por subsídio Ozly, e (eventualmente) pagar em massa.

**Hospedagem:** `https://app.ozly.au` (Cloudflare Pages, projeto
`ozly-org-portal`).

**Stack:** React 19 + Vite 7 + Tailwind v4 + TypeScript strict. Supabase JS
(anon key only, RLS-enforced). Sem service-role no client — qualquer operação
sensível passa por edge function.

**Audiência primária:** Donos / admins de empresas de limpeza AU (5-100 subs
ativos típico). Não é pro sub-contractor — esse fica no mobile.

---

## 2. Fluxo Crítico — De Onde Vem o Valor

```
[Sub mobile app] ──┐
                   │ 1. Sub cria invoice no app
                   │ 2. Seleciona "Bill to" = a org dele
                   │ 3. Toggle "Send directly to org" ON
                   │ 4. Tap "Emit & Send"
                   ▼
            RPC org_deliver_invoice (Supabase)
                   │
                   ├─→ INSERT em invoices
                   ├─→ INSERT em org_received_invoices
                   │       (status tracking: sent / failed / bounced)
                   ├─→ Edge fn org-deliver-invoice
                   │       (Resend email pra org.billing_email)
                   └─→ Edge fn push-send
                           (notify org admins via FCM — APP4)

                   ▼
       [Org portal web — app.ozly.au]
                   │
                   ├─→ /inbox: lista invoices recebidas
                   ├─→ /invoices: filtra por sub, status, período
                   ├─→ /work: histórico de jobs (criados via app)
                   ├─→ Mark paid (→ DB update → trigger push → sub recebe notif)
                   └─→ /billing: ABA bulk export OU Stripe Connect (P2)
```

A **mecânica não-óbvia**: o portal **não cria invoice**. Apenas **recebe** o
que o sub mandou via mobile. Org owner faz curadoria, marca paid, vê
métricas. Edição direta de invoice é mínima (limited fields, audit-logged).

---

## 3. Modelo de Billing — Multi-Tenant Entitlement Engine

Aqui mora a complexidade real do portal. Tem **duas dimensões de billing
acontecendo em paralelo**:

### 3.1 Stripe (Org → Ozly) — Web

| Item | Detalhes |
|---|---|
| **Quem paga** | Cleaning company (org) |
| **Plataforma** | Stripe Billing (Checkout + Customer Portal + Subscriptions) |
| **Estrutura** | 1 Product `Ozly Org Subscription` + 8 Prices recurring per-seat |
| **Tiers** | Crew $14.99/seat (1-5), Squad $12.99 (6-15), Fleet $9.99 (16-30), Operation $7.99 (31-100), Custom (101+, sales-led) |
| **Anual** | Mesmas tiers × 10 (≈17% off, "2 months free" framing) |
| **Lookup keys** | `org_t1_monthly` ... `org_t4_annual` — código resolve em runtime via `tier-pricing.ts` |
| **Tier escala automático** | `stripe-sync-seats` edge fn ajusta tier quando seat count cruza boundary |
| **Webhook** | `stripe-webhook` edge fn — events: checkout.session.completed, customer.subscription.{created,updated,deleted}, invoice.payment_{succeeded,failed} |

### 3.2 RevenueCat (Sub → Ozly) — Mobile

| Item | Detalhes |
|---|---|
| **Quem paga** | Sub-contractor individual no mobile app |
| **Plataforma** | Apple App Store / Google Play IAP via RevenueCat |
| **Produtos solo** | TFN $9, ABN $15, PRO $19 (monthly subs) |
| **Top-ups (V2)** | `topup_abn_monthly` $5, `topup_pro_monthly` $9 — só pra restricted users |
| **Entitlements** | `tfn_access`, `abn_access`, `pro`, `topup_abn`, `topup_pro` |
| **Webhook** | `revenuecat-webhook` edge fn → atualiza `user_entitlements` table |

### 3.3 A Conexão Entre os Dois — Onde o Portal Brilha

Org pode **subsidiar** ABN/PRO dos seus subs:
1. Org assina Stripe ($14.99 × N seats)
2. `stripe-webhook` recebe `customer.subscription.created`
3. `sync-org-entitlement` edge fn faz **promo grant** no RevenueCat pra cada sub
4. Sub abre o app → vê ABN entitlement ativo (sem ter pago nada)
5. Push pro sub: "Acme Cleaning agora cobre teu ABN — não precisa pagar"

Quando org cancela ou downgrade:
1. `customer.subscription.updated` ou `.deleted` → webhook
2. `org-downgrade-notify` edge fn → revoga RC grant + email + push
3. Sub fica com **7 days grace** (sub pode pagar solo via RC antes de perder acesso)

### 3.4 Invariante Crítica: Single-Sponsor

Sub pode estar em **N orgs simultaneamente**, mas **só 1 org cobre o sponsorship
por entitlement type**. DB invariante:

```sql
CREATE UNIQUE INDEX org_entitlement_grants_active_unique
  ON org_entitlement_grants (user_id, entitlement)
  WHERE status = 'active';
```

Sub já coberto por Org A pra `abn_access`? Org B tenta cobrir o mesmo sub →
RPC retorna `error: already_sponsored_by_other_org`. UI mostra mensagem
"Maria is already covered by Acme Cleaning."

**Razão**: evita double-billing acidental + complica a contabilidade. Sub
escolhe qual org subsidia (pode trocar, com 7d grace pro org anterior).

---

## 4. Entitlement Union Resolver

Sub mobile app pergunta "o que esse user pode fazer?" via RPC
`me_entitlement_effective()`:

```
Priority 1: Solo RevenueCat full paid?  → grant full access
Priority 2: Org subsidy + RC topup?     → grant full access
Priority 3: Org subsidy only?            → grant restricted_to = [org_ids]
Priority 4: Nenhum?                      → none (mostra paywall)
```

**Restricted user UX:** sub-contractor coberto por Org Acme só consegue
faturar clientes que estão dentro da Acme (toggle "Bill to" só mostra
companies da Acme). Pra faturar fora, paga `+$5/mo ABN top-up` ou
`+$9/mo PRO top-up`. Os top-ups vivem **paralelos** ao org subsidy —
quando org cancela cover, top-ups continuam (e viram solo full access).

---

## 5. Rotas + Páginas do Portal

| Rota | Página | Função |
|---|---|---|
| `/login` | Login | Auth via Supabase magic link |
| `/signup` | Signup | Create new org workspace |
| `/dashboard` | Dashboard | KPIs (invoices in/out, paid/overdue), line chart, donut status, period filter |
| `/inbox` | Inbox | Invoices recém-recebidas dos subs (status: new/seen) |
| `/invoices` | Invoices list | Tabela completa, filtros, bulk select, ABA export, Xero CSV |
| `/work` | Work history | Jobs criados pelos subs (read-only) |
| `/members` | Members | Lista de subs no workspace + invite + compliance badges (ABN/insurance) |
| `/billing` | Billing | Current tier card, seats utilisation, upgrade/downgrade, Stripe Portal link |
| `/integrations` | Integrations | Job sources (ServiceM8/Tradify/etc), Accounting (Xero/MYOB), Stripe |
| `/settings` | Settings | Org profile, billing_email, notification prefs, theme |
| `/print/onboarding` | Onboarding PDF | 6-page A4 brochure pra novo cliente (print stylesheet) |

⌘K command palette global, 13 nav/action shortcuts.

---

## 6. Edge Functions — O Que Cada Uma Faz

| Edge Function | Trigger | O Que Faz |
|---|---|---|
| `send-org-invite` | Org owner clica "Invite member" | Cria invite token + email Resend |
| `org-deliver-invoice` | Sub envia invoice "Send to org" | Insert org_received_invoices + email Resend |
| `org-notify-email` | Generic notification | Send email via Resend (Day-1 onboarding, etc) |
| `stripe-checkout-session` | Org clica "Add payment" no /billing | Create Stripe Checkout session |
| `stripe-portal-session` | Org clica "Manage subscription" | Create Stripe Customer Portal session |
| `stripe-webhook` | Stripe webhook | Process checkout completed, sub created/updated/deleted, invoice paid/failed |
| `stripe-sync-seats` | Cron / manual | Sync seat count → adjust subscription tier price |
| `org-addon-activate` | Admin grants add-on | Activate addon on org_addons table |
| `org-addon-deactivate` | Admin revokes add-on | Deactivate addon |
| `org-update-tier` | Org changes plan | Stripe price swap + DB sync |
| `org-downgrade-notify` | Cron: org cancelled | Email + push to all subs being uncovered |
| `sync-org-entitlement` | Stripe webhook fires | Grant/revoke RC entitlements for org's subs |
| `push-send` | DB trigger / manual | Send FCM/APNs push via Firebase Admin SDK |
| `revenuecat-webhook` | RC webhook | Process IAP events from Apple/Google → user_entitlements |
| `marketing-reminders` | Cron | Send drip campaign emails (trial ending, etc) |
| `abn-verify` | Verify ABN | Call ABR API (mock by default; real when ABR_GUID set) |

**Auth model:** Edge functions usam service-role para DB writes (não exposto
ao client). Endpoints públicos validam JWT do user via `supabase.auth.getUser()`
antes de fazer service-role write.

---

## 7. V2 Sprint Status — O Que Está Onde

Pipeline de sprints, do mais recente pra trás. Status atual 2026-06-01:

| Sprint | Superfície | Δ | Status | Bloqueado por |
|---|---|---|---|---|
| **ORG1** | Org portal | Inbox + billing_email + member list | ✅ **DONE** (2026-05-31) | — |
| **ORG2** | Org portal | Tier seats UI + downgrade flow + exit interview | 🚧 **EM CÓDIGO** | Stripe LIVE prices (waiting AU activation) |
| **ORG3** | Org portal | Trial banner + mixed-billing badges + polish | ⏳ Pending ORG2 | — |
| **ADM1** | Admin portal | Org subscription health dashboard | ⏳ Pending ORG2 | — |
| **ADM2** | Admin portal | Downgrade alerts panel | ⏳ Pending ADM1 | — |
| **APP1** | Mobile app | EntitlementService union resolver | ⏳ Pending ORG2 merged | — |
| **APP2** | Mobile app | Paywall topups ($5 ABN, $9 PRO) | ⏳ Pending APP1 | Apple/Google IAP review (5-7 dias) |
| **APP3** | Mobile app | Send-direct invoice + org selection | ⏳ Pending APP2 approved | — |
| **APP4** 🔑 | Mobile + infra | FCM push templates + feature flag flip | ⏳ **GATING LAUNCH** | Firebase project + service account JSON |

**🔑 APP4 é o gate final do launch.** Sem Firebase, push não funciona, sub não
recebe inversão de info (org marcou pago, org cancelou cover, novo job).

---

## 8. Feature Flags do Mobile App

`AusClean/lib/config/feature_flags.dart`:

| Flag | Valor atual | Quando flipa | O que destrava |
|---|---|---|---|
| `kOrgMembershipsEnabled` | `false` | APP4 (V2 ready) | Org cover UI, send-direct invoice, restricted user banners |
| `kPushEnabled` | `false` | APP4 (Firebase live) | FCM token register, push notif handling |

**Importante:** essas flags estão `false` em produção *agora*. O usuário com
app instalado não vê nada de V2 até o flip. Isso é proposital — V2 é
ativado **server-side first** (orgs assinam Stripe → grants são criados),
depois client-side (flag flip → UI aparece).

---

## 9. Compliance + Constraints

**Não-negociáveis legais (AU + ATO):**

- **Sub-contractor language only.** Nunca "employee", "shift", "roster",
  "schedule" no mobile ou portal. Sempre "engagement", "invoice",
  "sub-contractor", "self-issued". Razão: Ozly não pode parecer empregadora
  por compliance ATO.
- **Org never issues sub's invoice.** Org só recebe — sub cria, sub envia,
  sub é o emissor legal da fatura. Org marca paid mas isso é tracking, não
  emissão.
- **ABN required pra ABN-mode features.** UI bloqueia até ABN preenchido.
  ABR API (real) verifica formato + status (mock até `ABR_GUID` setado).
- **GST 10% inclusive** nos preços Stripe. Tax category `txcd_10103000`
  (SaaS Australia).
- **App Store 3.1.1** — paywall não pode ser bypassed (test mode keeps test
  cards only, live keeps real cards only).

---

## 10. Por Que Push (FCM) Não É Polimento

Esse foi o maior erro do checklist anterior — calling push "polish" era
errado. Aqui está o porquê:

**Push é o ÚNICO canal real-time pra inverter info org → sub.**

Sem push:
- Sub manda invoice → email pra org chega (Resend)
- Org abre portal, marca paid → **sub não sabe** até next refresh
- Org cancela cover → **sub não sabe** até abrir app → vê "you've been uncovered"
- Org pede ajuste → **sub não sabe** até abrir app + checa /inbox

Com push:
- Org marca paid → **sub recebe push em 2-5s**: "Acme marked invoice #INV-001 paid"
- Org cancela cover → sub recebe push imediato: "Acme cancelled coverage. Pay $14.99/mo to keep coverage flowing — open Billing"
- Org pede ajuste → push: "Acme requested an edit on INV-002. Tap to review."

**Engagement metric:** sem push, sub abre app ~1×/dia. Com push, ~3×/dia
(industry benchmark Slack-style workflow tools).

**Engineering:** já tem `push-send` edge function deployada + `device_tokens`
table no Supabase. Falta:
1. Firebase project criado
2. Service account JSON (`FIREBASE_ADMIN_SDK_JSON`) no Supabase vault
3. APNs key gerado (Apple Developer Portal) + uploaded no Firebase iOS app
4. iOS bundle ID = `com.augusto.ozly` registrado
5. Android `google-services.json` baixado pro repo
6. Flutter `flutter_local_notifications` + Firebase SDK init no app
7. DB triggers: paid → push, cover cancel → push, job assigned → push (PUSH1 templates)

---

## 11. Launch Checklist Real (Por Severidade)

### P0 — Sem Isso Ninguém Paga / Recebe (BLOQUEIA LAUNCH)

| # | Item | Status | Notas |
|---|---|---|---|
| 1 | Resend email + domain `ozly.au` | ✅ | Verified, RESEND_API_KEY no vault, smoke test green |
| 2 | Stripe TEST setup (Products + Prices + Webhook + secrets) | ✅ | Configurado via CLI, sub teste validada com 4242 card |
| 3 | Stripe LIVE activation (ABN + bank + ID) | ⏳ | Submetido, "Review in progress" 2-3 dias |
| 4 | Stripe LIVE replicate (Products + Prices + Webhook em LIVE) | ⏳ | Após activation aprovar |
| 5 | Cloudflare Pages org-portal (app.ozly.au) | ✅ | Live, custom domain, auto-deploy |
| 6 | Supabase: STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET | ✅ TEST | Trocar pra LIVE quando aprovar |
| 7 | Domain consistency code (`ozly.au`) | ✅ | 21 arquivos purgados de `ozly.app` |
| 8 | 15 V2 edge functions deployadas | ✅ | abn-verify, org-addon-*, stripe-*, push-send, etc |
| 9 | 3 V2 migrations aplicadas + 144 legacy reverted | ✅ | DB live↔remote in sync |
| **10** | **Firebase project + FIREBASE_ADMIN_SDK_JSON** | ❌ | **P0 CRÍTICO — gates APP4 que gates launch** |

### P1 — Mobile Launch (Review Externo 5-7 Dias)

| # | Item | Status |
|---|---|---|
| 11 | App Store Connect: 2 IAPs (topup_abn_monthly, topup_pro_monthly) | ✅ Created + Submitted (com mockups) |
| 12 | Google Play Console: 2 subs (mesmo IDs) | ✅ Created |
| 13 | RevenueCat: link products + entitlements + webhook | ⏳ Pending Apple/Google approval |
| 14 | APNs key (Apple Developer Portal) → upload Firebase | ⏳ Pending Firebase project |
| 15 | google-services.json + GoogleService-Info.plist reais (não placeholder) | ⏳ Pending Firebase project |
| 16 | Mobile build com flags `true` → TestFlight + Play Internal | ⏳ Pending #10-15 |
| 17 | Smoke test top-up purchase com TestFlight + sandbox | ⏳ |
| 18 | Submit production build | ⏳ |

### P2 — Pós-Launch (Não Bloqueia)

| # | Item | Notas |
|---|---|---|
| 19 | ABR API real | edge fn `abn-verify` já existe, mock → real quando `ABR_GUID` setado |
| 20 | ServiceM8 / Xero / Tradify integrações | Hoje UI mock. P2 = OAuth real |
| 21 | Stripe Connect bulk payout | ABA export funciona hoje, Connect é upgrade |
| 22 | Notification cron triggers | overdue invoices, recurring jobs, monthly summary |
| 23 | Dispute flow real | Audit timeline existe, dispute UI faltando |

---

## 12. Glossário — Termos Que Importam

| Termo | Significado | Termo a evitar |
|---|---|---|
| **Sub-contractor** | ABN self-employed cleaner/tradie | ❌ employee, contractor (genérico) |
| **Engagement** | Relacionamento sub↔org (não emprego) | ❌ employment, hire |
| **Org** / **Workspace** | Cleaning company tenant | ❌ Tenant (interno), Account (Stripe term) |
| **Cover** / **Sponsorship** | Org paga RC entitlement pelo sub | ❌ Subscription on behalf |
| **Restricted user** | Sub coberto, só pode invoicer clientes da org | (no synonym) |
| **Entitlement** | RC grant (tfn_access / abn_access / pro / topup_*) | ❌ Feature flag (diferente) |
| **Top-up** | Add-on IAP $5/$9 pra restricted unlocks all clients | ❌ Add-on (genérico — addons são outra coisa em org-addons table) |
| **Single-sponsor invariant** | DB partial unique index garantindo 1 org cover por entitlement | (no synonym) |
| **Tier** (org) | Crew/Squad/Fleet/Operation/Custom — auto-escala por seat count | (no synonym) |
| **Member** | Sub aceito numa org (org_memberships.status='accepted') | ❌ Employee |
| **org_entitlement_grants** | DB table autoritativa de quem cobre quem | (table name canônico) |

---

## 13. Links Internos Úteis

- **Pricing spec V2:** [PRICING_V2_SPEC.md](./PRICING_V2_SPEC.md)
- **Mobile system overview:** `AusClean/docs/SYSTEM_DOCUMENTATION.md`
- **Sub→org workflow:** `AusClean/docs/WORKFLOWS.md` §5.1
- **V2 sprint pipeline (arquivo-por-arquivo):** `AusClean/docs/V2_CHANGE_MAP.md`
- **Launch playbook (org-portal específico):** `AusClean/docs/ORG_PORTAL_LAUNCH_PLAYBOOK.md`
- **Runbook (ops):** `AusClean/docs/ORG_PORTAL_RUNBOOK.md`
- **Launch checklist mestre:** `AusClean/docs/LAUNCH_CHECKLIST.md`
- **Brand voice (microcopy):** `AusClean/docs/BRAND_VOICE.md`

---

## 14. Quando Atualizar Esta Doc

- ✅ **Sempre** que adicionar/remover edge function tocando org-portal
- ✅ **Sempre** que muder tier pricing ou lookup_keys
- ✅ **Sempre** que feature flag mudar de estado em produção
- ✅ **Sempre** que sprint progredir (ORG2 → ORG3, APP1 → APP2, etc)
- ❌ **Não** atualizar pra mudanças puramente cosméticas
- ❌ **Não** atualizar pra dúvidas operacionais — essas vão no
  `ORG_PORTAL_RUNBOOK.md`
