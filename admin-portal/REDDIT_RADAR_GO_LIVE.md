# Reddit Radar — pôr pra funcionar ✅

Runbook único: faça de cima pra baixo, marcando `[x]`. No fim, a página
**admin.ozly.au → Marketing → Descoberta → Reddit (radar)** lista threads do
Reddit onde a Ozly encaixa, com comentário sugerido pra você copiar e colar.
O radar **não posta nada** — só descobre.

> **O código já está pronto no repo.** O que falta é: criar o app no Reddit,
> aplicar a migration, setar 2 secrets, e deployar. ~5–10 min.

Projeto Supabase: **`jnhwgwnphlnhjlgygjql`** · Function: **`reddit-radar`**

---

## Pré-requisitos

- [x] Supabase CLI instalado (você tem a 2.75.0)
- [ ] Logado no CLI:
  ```bash
  supabase login
  ```
- [ ] Projeto linkado (roda uma vez, na pasta `admin-portal`):
  ```bash
  cd /Users/augustoeamanda/Documents/OzlyWebSite/admin-portal
  supabase link --project-ref jnhwgwnphlnhjlgygjql
  ```

---

## Passo 1 — Criar o app no Reddit (grátis, ~2 min)

O Reddit exige API oficial pra ler sem login. É de graça.

- [ ] Abre https://www.reddit.com/prefs/apps → **create another app**
- [ ] Preenche:
  - name: `ozly-radar`
  - tipo: **script**  ← importante
  - redirect uri: `http://localhost:8080` (não usa, mas o form exige)
- [ ] Clica **create app**
- [ ] Anota:
  - **client_id** = a string logo embaixo do nome do app (tipo `p3f9x...`)
  - **secret** = o campo `secret`

---

## Passo 2 — Criar a tabela no banco

Escolhe UMA das opções.

**Opção A — CLI (recomendada):**
- [ ] ```bash
  cd /Users/augustoeamanda/Documents/OzlyWebSite/admin-portal
  supabase db push
  ```
  (aplica `supabase/migrations/20260708000000_marketing_reddit_threads.sql`)

**Opção B — Studio (se preferir sem CLI):**
- [ ] Supabase Studio → **SQL Editor** → cola o conteúdo de
  `supabase/migrations/20260708000000_marketing_reddit_threads.sql` → **Run**

**Conferir que criou:**
- [ ] No SQL Editor: `select count(*) from marketing_reddit_threads;` → retorna `0` (sem erro)

---

## Passo 3 — Setar os secrets do Reddit

Troca `xxxx`/`yyyy`/`SEU_USER` pelos valores do Passo 1.

- [ ] ```bash
  supabase secrets set \
    REDDIT_CLIENT_ID=xxxx \
    REDDIT_CLIENT_SECRET=yyyy \
    REDDIT_USER_AGENT="cloud:ozly-radar:1.0 (by /u/SEU_USER)"
  ```
- [ ] Conferir: `supabase secrets list` → aparecem `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT`

> `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já existem no
> projeto — não precisa setar.

---

## Passo 4 — Deployar a edge function

- [ ] ```bash
  supabase functions deploy reddit-radar
  ```
  (ou, se preferir automático: **merge na `main`** — a Supabase observa `supabase/functions/*`)

**Conferir:** Studio → Edge Functions → `reddit-radar` aparece como deployed.

---

## Passo 5 — Deployar o frontend (a página no portal)

A página, rota e o item de menu já estão no código.

- [ ] **Fazer merge na `main`** → o Cloudflare Pages builda o admin portal e publica em `admin.ozly.au`.
- [ ] (Opcional, teste local antes) ```bash
  cd /Users/augustoeamanda/Documents/OzlyWebSite/admin-portal
  npm run build   # tem que passar sem erro (já validei o typecheck/lint)
  ```

---

## Passo 6 — Testar 🎉

- [ ] Abre **admin.ozly.au** → menu **Marketing → Descoberta → Reddit (radar)**
- [ ] Na 1ª vez ela busca sozinha (~5–10s) e lista os threads
- [ ] Cada card tem: badge (**verde** = pode citar Ozly / **âmbar** = valor puro), título linkado, comentário sugerido com **Copiar**, e **Comentei ✓ / Ignorar ✕**
- [ ] Conferir no banco: `select count(*) from marketing_reddit_threads;` → > 0

---

## Se der ruim (troubleshooting)

| Sintoma | Causa provável | Fix |
|---|---|---|
| Banner âmbar "Falta plugar a API do Reddit" | secrets não setados / nome errado | Refaz Passo 3, depois **redeploy** (Passo 4) |
| Erro `reddit_auth_401` / `403` | client_id/secret errado, ou app não é tipo **script** | Confere Passo 1 e Passo 3 |
| `Forbidden: admin only` (403) | teu `profiles.role` não é `admin` | Precisa logar com conta admin no portal |
| `Missing auth` (401) | não logado no portal | Faz login em admin.ozly.au |
| Lista vazia mesmo com secrets ok | sem thread nova na janela de 72h | Clica **Atualizar agora**; ou aumenta `MAX_AGE_HOURS` no `index.ts` e redeploy |
| Página não aparece no menu | frontend não deployou | Passo 5 (merge na main) |

---

## Resumo: o que deploya como

| Peça | Como vai pra produção |
|---|---|
| Migration (tabela) | **Manual** — Passo 2 (`supabase db push` ou Studio) |
| Secrets do Reddit | **Manual** — Passo 3 (`supabase secrets set`) |
| Edge function `reddit-radar` | Merge na `main` **ou** `supabase functions deploy` |
| Página / rota / menu | Merge na `main` (Cloudflare Pages builda o portal) |

Ou seja: **Passos 2 e 3 são sempre manuais** (banco + secrets). O resto sai no
merge da `main`.

---

## Opcional — atualização automática (cron 6/6h)

Sem isso, o radar atualiza **quando você abre a página** (se >12h) ou no botão
**Atualizar agora** — que já cobre o uso normal.

Se quiser que rode sozinho mesmo com a página fechada, tem um detalhe: a function
hoje exige admin via JWT, e o cron não tem esse login. **Me avisa que eu adapto a
function pra aceitar o service key do cron** e te passo o SQL do `cron.schedule`.

---

## Manutenção (mexer no alvo depois)

Tudo no topo de `supabase/functions/reddit-radar/index.ts`:
- `SEARCHES` — pares (subreddit, query) que ele busca
- `INCLUDE` / `EXCLUDE` — filtro de relevância
- `ARCHETYPES` / `TEMPLATES` — tipos de thread + comentário sugerido de cada

Editou → `supabase functions deploy reddit-radar` (ou merge na main).
