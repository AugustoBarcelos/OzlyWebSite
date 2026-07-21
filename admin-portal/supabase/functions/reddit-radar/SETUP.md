# Reddit Radar — setup (admin portal)

Feature de marketing orgânico: descobre threads do Reddit onde a Ozly encaixa e
sugere um comentário dentro das regras. Aparece em **Marketing → Descoberta →
Reddit (radar)** (`/marketing/reddit`). Não posta nada — você abre o link, copia,
ajusta e cola no Reddit na mão.

## O que já está no código (deploya no merge da `main`)

- Tabela `marketing_reddit_threads` — migration `supabase/migrations/20260708000000_marketing_reddit_threads.sql`
- Edge function `reddit-radar` — `supabase/functions/reddit-radar/index.ts`
- Página + lib + rota + item de nav no admin portal

## Passo a passo (o que VOCÊ faz, ~5 min, uma vez)

### 1. Criar o app no Reddit (grátis)
1. https://www.reddit.com/prefs/apps → **create another app**
2. Tipo **script** · name `ozly-radar` · redirect uri `http://localhost:8080`
3. Copia o **client_id** (string embaixo do nome) e o **secret**

### 2. Aplicar a migration (cria a tabela)
```bash
cd admin-portal
supabase db push          # aplica a migration nova no projeto linkado
# ou cola o SQL no Supabase Studio → SQL Editor e roda
```

### 3. Setar os secrets do Reddit no Supabase
```bash
supabase secrets set \
  REDDIT_CLIENT_ID=xxxx \
  REDDIT_CLIENT_SECRET=yyyy \
  REDDIT_USER_AGENT="cloud:ozly-radar:1.0 (by /u/SEU_USER_DO_REDDIT)"
```
(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` já existem no projeto.)

### 4. Deployar a function
- **Automático:** merge na `main` (a Supabase observa `supabase/functions/*`).
- **Manual/na hora:** `supabase functions deploy reddit-radar`

### 5. Usar
Abre **admin.ozly.au → Marketing → Descoberta → Reddit (radar)**.
Na 1ª vez ela busca sozinha (~5–10s). Depois:
- Cada card = 1 thread. **Verde** "Pode citar Ozly" = pediram app (usa a disclosure, **sem link**). **Âmbar** = valor puro, não cite Ozly.
- **Copiar** → cola o comentário no Reddit (ajusta o tom se quiser).
- **Comentei ✓** / **Ignorar ✕** → some da lista.
- **Atualizar agora** → busca de novo.

## Ajustar o alvo
Tudo no topo de `index.ts`: `SEARCHES` (sub + query), `INCLUDE`/`EXCLUDE` (filtro),
`ARCHETYPES`/`TEMPLATES` (tipos de thread + comentário sugerido). Editou → redeploy.

## Opcional: atualização automática (cron)
Sem isso, o radar atualiza quando você abre a página (se >12h) ou clica no botão.
Se quiser que rode sozinho de 6/6h, no SQL Editor:
```sql
select cron.schedule('reddit-radar-refresh', '0 */6 * * *', $$
  select net.http_post(
    url     := 'https://SEU_PROJETO.supabase.co/functions/v1/reddit-radar?op=refresh',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_key'))
  );
$$);
```
(Requer a extensão `pg_net` e `app.service_key` setado. A function hoje exige admin
via JWT — pra cron, me avisa que eu adapto pra aceitar o service key também.)
