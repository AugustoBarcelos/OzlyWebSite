# Ozly — OG Worker

Cloudflare Worker que serve OG tags personalizadas pra crawlers em
`https://ozly.au/v/:code`. Tudo o resto passa transparente pro GitHub Pages.

## Por quê

Site público é GitHub Pages → HTML estático. Todo `/v/CODE` retorna o
mesmo `<meta og:*>` genérico. Quando alguém compartilha `ozly.au/v/JOAO`
no WhatsApp, o preview mostra título genérico "Ozly — Free Invoicing"
em vez de "João te indicou pro Ozly".

Este Worker entra na frente do GH Pages e:
- Para **crawlers sociais** (User-Agent contendo `facebookexternalhit`,
  `whatsapp`, `twitterbot`, etc.) → renderiza HTML com OG tags
  personalizadas usando o nome do afiliado fetched do Supabase.
- Para **navegadores reais** → faz pass-through pro GitHub Pages
  (UX inalterado).

Resultado: shares ganham preview tipo "🎁 João te indicou pro Ozly · Use
o código JOAO" com chance ~2x maior de clique.

## Deploy

### 1. Instalar deps locais
```bash
cd cloudflare-worker
npm install
```

### 2. Login no Cloudflare CLI
```bash
npx wrangler login
```
Abre o browser, autoriza no Cloudflare. Token fica salvo em
`~/.wrangler/config/default.toml`.

### 3. Deploy
```bash
npm run deploy
```

Wrangler vai criar o Worker `ozly-og-worker` e mapear no route
`ozly.au/v/*`. Primeira execução faz o link com a zona DNS — confirma
que `ozly.au` é uma zona Cloudflare na conta logada.

### 4. Testar

```bash
# Como crawler (deve voltar HTML com OG tags personalizadas):
curl -A "facebookexternalhit/1.1" https://ozly.au/v/SOME_REAL_CODE

# Como humano (deve voltar a SPA do GitHub Pages igual antes):
curl -A "Mozilla/5.0" https://ozly.au/v/SOME_REAL_CODE
```

A primeira deve ter `<meta property="og:title" content="...te indicou..."`,
a segunda deve ser o HTML padrão do site React.

### 5. Logs ao vivo

```bash
npm run tail
```
Mostra cada request que o Worker processa em real-time.

## Configuração

Vars públicas (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) já estão em
`wrangler.toml`. A anon key é segura em client (RLS protege tudo).

Se quiser trocar pra Secret encrypted:
```bash
npx wrangler secret put SUPABASE_ANON_KEY
# Cola o valor e remove de wrangler.toml
```

## Observabilidade

`observability.enabled = true` em `wrangler.toml` → logs aparecem em
**Cloudflare Dashboard → Workers & Pages → ozly-og-worker → Logs**.
Free tier dá 100k requests/dia — mais que suficiente.

## Custos

- **Free tier:** 100k req/dia, 10ms CPU por request — sobra muito.
- Cada request consome ~1ms CPU e faz 1 fetch ao Supabase. Com 100 shares
  e 5 previews cada → ~500 req/dia. Praticamente zero custo.

## Como reverter

```bash
npx wrangler delete
```
Remove o Worker e a route. A partir daí, `/v/*` volta a ser servido
diretamente pelo GH Pages (estado original).
